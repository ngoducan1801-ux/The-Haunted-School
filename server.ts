import express from 'express';
import crypto from 'crypto';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { AuthoritativeRoomManager, isValidSixDigitRoomId } from './server/roomManager.ts';
import {
  GAME_PROTOCOL_VERSION,
  type CharacterId,
  type FlashlightBrightness,
  type PlayerAnimState,
  type RoomErrorCode,
} from './src/types/game.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const RECONNECT_GRACE_MS = 35_000;
const WS_HEARTBEAT_INTERVAL_MS = 25_000;
const MAX_WS_PER_IP = 25;
const VALID_ANIM_STATES: ReadonlySet<string> = new Set([
  'idle',
  'walk',
  'sprint',
  'crouch',
  'hide',
  'downed',
]);

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const roomManager = new AuthoritativeRoomManager();

interface SocketClientMeta {
  playerId: string;
  reconnectToken: string;
  roomId: string | null;
  ws: WebSocket;
  ip: string;
  isAlive: boolean;
  chatTimestamps: number[];
  roomOpTimestamps: number[];
  transformTimestamps: number[];
  mutateTimestamps: number[];
  rtcTimestamps: number[];
}

const clientsByPlayerId = new Map<string, SocketClientMeta>();
const reconnectTokensByPlayerId = new Map<string, string>();
const disconnectGraceTimers = new Map<string, NodeJS.Timeout>();
const httpRateMap = new Map<string, number[]>();
const wsCountByIp = new Map<string, number>();

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function getClientIp(req: http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function sendJson(ws: WebSocket, type: string, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function sendError(ws: WebSocket, code: RoomErrorCode, message: string): void {
  sendJson(ws, 'error', { code, message });
}

function broadcastRoom(roomId: string, type: string, payload: unknown, excludePlayerId?: string): void {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  for (const player of room.players) {
    if (!player.connected) continue;
    if (excludePlayerId && player.playerId === excludePlayerId) continue;
    const client = clientsByPlayerId.get(player.playerId);
    if (client && client.roomId === roomId) {
      sendJson(client.ws, type, payload);
    }
  }
}

function checkRateLimit(timestamps: number[], windowMs: number, maxCount: number): boolean {
  const now = Date.now();
  while (timestamps.length > 0 && now - timestamps[0] >= windowMs) {
    timestamps.shift();
  }
  if (timestamps.length >= maxCount) {
    return false;
  }
  timestamps.push(now);
  return true;
}

app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  const ip = req.ip || getClientIp(req);
  let bucket = httpRateMap.get(ip);
  if (!bucket) {
    bucket = [];
    httpRateMap.set(ip, bucket);
  }
  if (!checkRateLimit(bucket, 30_000, 90)) {
    res.status(429).json({ ok: false, code: 'rate_limited', error: 'Too many requests.' });
    return;
  }
  if (httpRateMap.size > 2000) {
    const now = Date.now();
    for (const [k, v] of httpRateMap) {
      if (v.length === 0 || now - v[v.length - 1] > 60_000) {
        httpRateMap.delete(k);
      }
    }
  }
  next();
});

// REST Endpoints for room validation, online readiness & lobby browsing
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    version: GAME_PROTOCOL_VERSION,
    rooms: roomManager.listPublicRooms().length,
    serverTime: Date.now(),
  });
});

app.get('/api/rooms', (_req, res) => {
  res.json({
    version: GAME_PROTOCOL_VERSION,
    rooms: roomManager.listPublicRooms(),
  });
});

app.get('/api/rooms/validate/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  if (!isValidSixDigitRoomId(roomId)) {
    res.status(400).json({ ok: false, code: 'invalid_room_id', error: 'Room ID must be 6 digits.' });
    return;
  }
  if (roomManager.isRoomExpired(roomId)) {
    res.status(410).json({ ok: false, code: 'room_expired', error: 'Room has expired.' });
    return;
  }
  const room = roomManager.getRoom(roomId);
  if (!room) {
    res.status(404).json({ ok: false, code: 'room_not_found', error: 'Room not found.' });
    return;
  }
  if (room.status !== 'lobby') {
    res.status(409).json({
      ok: false,
      code: 'room_started',
      error: 'Game already started.',
    });
    return;
  }
  const connectedCount = room.players.filter((p) => p.connected).length;
  if (room.players.length >= room.maxPlayers) {
    res.status(409).json({ ok: false, code: 'room_full', error: 'Room is full.' });
    return;
  }
  res.json({
    ok: true,
    room: {
      roomId: room.roomId,
      roomName: room.roomName,
      playerCount: connectedCount,
      maxPlayers: room.maxPlayers,
      status: room.status,
      version: room.version,
    },
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 32 * 1024,
});

// Periodic cleanup for idle/expired rooms
const pruneInterval = setInterval(() => {
  roomManager.pruneExpiredRooms();
}, 60_000);
pruneInterval.unref();

// WebSocket Ping/Pong heartbeat keeps Cloud Run & mobile carrier NAT sockets healthy
const wsHeartbeatInterval = setInterval(() => {
  for (const client of clientsByPlayerId.values()) {
    if (!client.isAlive) {
      client.ws.terminate();
      continue;
    }
    client.isAlive = false;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.ping();
    }
  }
}, WS_HEARTBEAT_INTERVAL_MS);
wsHeartbeatInterval.unref();

wss.on('connection', (ws, req) => {
  const clientIp = getClientIp(req);
  const currentIpCount = wsCountByIp.get(clientIp) ?? 0;
  if (currentIpCount >= MAX_WS_PER_IP) {
    sendError(ws, 'rate_limited', 'Too many active connections from this network.');
    ws.close(1013, 'Too many connections');
    return;
  }
  wsCountByIp.set(clientIp, currentIpCount + 1);

  const initialPlayerId = `p_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const initialToken = crypto.randomBytes(16).toString('hex');
  reconnectTokensByPlayerId.set(initialPlayerId, initialToken);

  const meta: SocketClientMeta = {
    playerId: initialPlayerId,
    reconnectToken: initialToken,
    roomId: null,
    ws,
    ip: clientIp,
    isAlive: true,
    chatTimestamps: [],
    roomOpTimestamps: [],
    transformTimestamps: [],
    mutateTimestamps: [],
    rtcTimestamps: [],
  };
  clientsByPlayerId.set(meta.playerId, meta);
  ws.on('pong', () => {
    meta.isAlive = true;
  });

  sendJson(ws, 'session:hello', {
    playerId: meta.playerId,
    reconnectToken: meta.reconnectToken,
    version: GAME_PROTOCOL_VERSION,
  });

  ws.on('message', (raw) => {
    meta.isAlive = true;
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      sendError(ws, 'unknown', 'Malformed packet.');
      return;
    }
    if (!isPlainObject(parsed)) {
      sendError(ws, 'unknown', 'Malformed packet.');
      return;
    }

    const type = typeof parsed.type === 'string' ? parsed.type : '';
    const p = isPlainObject(parsed.payload) ? parsed.payload : {};

    if (type === 'room:create') {
      if (!checkRateLimit(meta.roomOpTimestamps, 30_000, 6)) {
        sendError(ws, 'rate_limited', 'Too many room requests. Please wait a moment and retry.');
        return;
      }
      if (meta.roomId) {
        const prev = roomManager.disconnectPlayer(meta.roomId, meta.playerId, true);
        if (prev) broadcastRoom(meta.roomId, 'room:state', prev);
        meta.roomId = null;
      }
      const res = roomManager.createRoom({
        roomName: String(p.roomName ?? ''),
        maxPlayers: Number(p.maxPlayers ?? 5),
        hostPlayerId: meta.playerId,
        hostDisplayName: String(p.displayName ?? 'Host'),
        level: Number(p.level ?? 1),
        version: typeof p.version === 'string' ? p.version : undefined,
      });
      if (!res.ok || !res.data) {
        sendError(ws, res.errorCode ?? 'unknown', res.error ?? 'Could not create room.');
        return;
      }
      meta.roomId = res.data.roomId;
      sendJson(ws, 'room:state', res.data);
      return;
    }

    if (type === 'room:join') {
      if (!checkRateLimit(meta.roomOpTimestamps, 30_000, 15)) {
        sendError(ws, 'rate_limited', 'Too many join attempts. Please wait a few seconds and retry.');
        return;
      }
      const requestedId = String(p.roomId ?? '').trim();
      const reconnectPlayerId =
        typeof p.reconnectPlayerId === 'string' ? p.reconnectPlayerId.trim() : null;
      const providedToken =
        typeof p.reconnectToken === 'string' ? p.reconnectToken.trim() : null;

      if (reconnectPlayerId && reconnectPlayerId !== meta.playerId) {
        const expectedToken = reconnectTokensByPlayerId.get(reconnectPlayerId);
        if (expectedToken && providedToken && expectedToken === providedToken) {
          const pendingTimer = disconnectGraceTimers.get(reconnectPlayerId);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            disconnectGraceTimers.delete(reconnectPlayerId);
          }
          clientsByPlayerId.delete(meta.playerId);
          reconnectTokensByPlayerId.delete(meta.playerId);
          meta.playerId = reconnectPlayerId;
          meta.reconnectToken = expectedToken;
          clientsByPlayerId.set(meta.playerId, meta);
        }
      }

      const res = roomManager.joinRoom({
        roomId: requestedId,
        playerId: meta.playerId,
        displayName: String(p.displayName ?? 'Survivor'),
        version: typeof p.version === 'string' ? p.version : undefined,
        currentRoomId: meta.roomId,
      });
      if (!res.ok || !res.data) {
        sendError(ws, res.errorCode ?? 'unknown', res.error ?? 'Failed to join room.');
        return;
      }
      meta.roomId = res.data.roomId;
      sendJson(ws, 'session:hello', {
        playerId: meta.playerId,
        reconnectToken: meta.reconnectToken,
        version: GAME_PROTOCOL_VERSION,
      });
      broadcastRoom(meta.roomId, 'room:state', res.data);
      return;
    }

    if (type === 'room:leave') {
      if (!meta.roomId) return;
      const oldRoom = meta.roomId;
      meta.roomId = null;
      const pendingTimer = disconnectGraceTimers.get(meta.playerId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        disconnectGraceTimers.delete(meta.playerId);
      }
      const updated = roomManager.disconnectPlayer(oldRoom, meta.playerId, true);
      if (updated) broadcastRoom(oldRoom, 'room:state', updated);
      sendJson(ws, 'room:left', { roomId: oldRoom });
      return;
    }

    if (!meta.roomId) {
      sendError(ws, 'unknown', 'Not currently in a room.');
      return;
    }

    if (type === 'room:select_character') {
      if (!checkRateLimit(meta.roomOpTimestamps, 10_000, 20)) return;
      const charId = (p.characterId as CharacterId | null) ?? null;
      const res = roomManager.selectCharacter(meta.roomId, meta.playerId, charId);
      if (!res.ok || !res.data) {
        sendError(ws, res.errorCode ?? 'unknown', res.error ?? 'Character unavailable.');
        sendJson(ws, 'room:state', roomManager.getRoom(meta.roomId));
        return;
      }
      broadcastRoom(meta.roomId, 'room:state', res.data);
      return;
    }

    if (type === 'room:ready') {
      if (!checkRateLimit(meta.roomOpTimestamps, 10_000, 20)) return;
      const res = roomManager.setReady(meta.roomId, meta.playerId, Boolean(p.ready));
      if (!res.ok || !res.data) {
        sendError(ws, res.errorCode ?? 'unknown', res.error ?? 'Cannot change ready state.');
        return;
      }
      broadcastRoom(meta.roomId, 'room:state', res.data);
      return;
    }

    if (type === 'room:set_level') {
      if (!checkRateLimit(meta.roomOpTimestamps, 10_000, 20)) return;
      const res = roomManager.setLevel(meta.roomId, meta.playerId, Number(p.level ?? 1));
      if (res.ok && res.data) {
        broadcastRoom(meta.roomId, 'room:state', res.data);
      }
      return;
    }

    if (type === 'room:start') {
      if (!checkRateLimit(meta.roomOpTimestamps, 10_000, 6)) return;
      const res = roomManager.startGame(meta.roomId, meta.playerId);
      if (!res.ok || !res.data) {
        sendError(ws, res.errorCode ?? 'unknown', res.error ?? 'Cannot start game yet.');
        return;
      }
      broadcastRoom(meta.roomId, 'game:started', res.data);
      return;
    }

    if (type === 'player:update') {
      if (!checkRateLimit(meta.transformTimestamps, 1000, 60)) return;
      const rawPos = isPlainObject(p.position) ? p.position : {};
      const pos = {
        x: Number.isFinite(Number(rawPos.x)) ? Math.max(-90, Math.min(90, Number(rawPos.x))) : 0,
        y: Number.isFinite(Number(rawPos.y)) ? Math.max(-10, Math.min(35, Number(rawPos.y))) : 0,
        z: Number.isFinite(Number(rawPos.z)) ? Math.max(-90, Math.min(90, Number(rawPos.z))) : 55,
      };
      const yaw = Number.isFinite(Number(p.yaw)) ? Number(p.yaw) : 0;
      const pitch = Number.isFinite(Number(p.pitch))
        ? Math.max(-Math.PI / 2, Math.min(Math.PI / 2, Number(p.pitch)))
        : 0;
      const animState: PlayerAnimState =
        typeof p.animState === 'string' && VALID_ANIM_STATES.has(p.animState)
          ? (p.animState as PlayerAnimState)
          : 'idle';
      const isCrouching = Boolean(p.isCrouching);
      const isHiding = Boolean(p.isHiding);
      const flashlightOn = Boolean(p.flashlightOn);
      const rawBright = Number(p.flashlightBrightness ?? 2);
      const flashlightBrightness: FlashlightBrightness =
        rawBright === 1 || rawBright === 3 ? rawBright : 2;
      const hp = typeof p.hp === 'number' && Number.isFinite(p.hp) ? Number(p.hp) : undefined;
      const maxHp =
        typeof p.maxHp === 'number' && Number.isFinite(p.maxHp) ? Number(p.maxHp) : undefined;
      const isDowned = typeof p.isDowned === 'boolean' ? Boolean(p.isDowned) : undefined;

      const ok = roomManager.updatePlayerTransform(meta.roomId, meta.playerId, {
        position: pos,
        yaw,
        pitch,
        animState,
        isCrouching,
        isHiding,
        flashlightOn,
        flashlightBrightness,
        hp,
        maxHp,
        isDowned,
      });
      if (ok) {
        const room = roomManager.getRoom(meta.roomId);
        const authoritativePlayer = room?.players.find((pl) => pl.playerId === meta.playerId);
        broadcastRoom(
          meta.roomId,
          'player:delta',
          {
            playerId: meta.playerId,
            position: pos,
            yaw,
            pitch,
            animState,
            isCrouching,
            isHiding,
            flashlightOn,
            flashlightBrightness,
            hp: authoritativePlayer?.hp ?? hp,
            maxHp: authoritativePlayer?.maxHp ?? maxHp,
            isDowned: authoritativePlayer?.isDowned ?? isDowned,
          },
          meta.playerId
        );
      }
      return;
    }

    if (type === 'world:mutate') {
      if (!checkRateLimit(meta.mutateTimestamps, 3000, 30)) {
        sendError(ws, 'rate_limited', 'World actions sent too quickly.');
        return;
      }
      const res = roomManager.applyWorldMutation(
        meta.roomId,
        p as Parameters<AuthoritativeRoomManager['applyWorldMutation']>[1]
      );
      if (res.ok && res.data) {
        broadcastRoom(meta.roomId, 'world:synced', {
          worldSync: res.data.worldSync,
          mutation: p,
          actorId: meta.playerId,
        });
        if (p.kind === 'player_revive') {
          broadcastRoom(meta.roomId, 'room:state', res.data);
        }
      } else if (!res.ok) {
        sendError(ws, res.errorCode ?? 'unknown', res.error ?? 'Action rejected.');
      }
      return;
    }

    if (type === 'chat:send') {
      if (typeof p.text !== 'string') {
        return;
      }
      if (!checkRateLimit(meta.chatTimestamps, 3000, 8)) {
        sendError(ws, 'rate_limited', 'Sending chat messages too quickly.');
        return;
      }
      const res = roomManager.addChatMessage(
        meta.roomId,
        meta.playerId,
        p.text,
        Boolean(p.proximity)
      );
      if (res.ok && res.data) {
        broadcastRoom(meta.roomId, 'chat:message', res.data);
      }
      return;
    }

    if (type === 'rtc:signal') {
      if (!checkRateLimit(meta.rtcTimestamps, 5000, 50)) return;
      if (!isPlainObject(p.signal)) return;
      const targetId = typeof p.targetPlayerId === 'string' ? p.targetPlayerId : '';
      const targetClient = clientsByPlayerId.get(targetId);
      if (targetClient && targetClient.roomId === meta.roomId) {
        sendJson(targetClient.ws, 'rtc:signal', {
          fromPlayerId: meta.playerId,
          signal: p.signal,
        });
      }
    }
  });

  ws.on('close', () => {
    const remaining = Math.max(0, (wsCountByIp.get(meta.ip) ?? 1) - 1);
    if (remaining === 0) {
      wsCountByIp.delete(meta.ip);
    } else {
      wsCountByIp.set(meta.ip, remaining);
    }

    const activeClient = clientsByPlayerId.get(meta.playerId);
    if (activeClient && activeClient.ws === ws) {
      clientsByPlayerId.delete(meta.playerId);
    }

    if (meta.roomId) {
      const disconnectedRoomId = meta.roomId;
      const disconnectedPlayerId = meta.playerId;
      meta.roomId = null;

      // Mark player temporarily disconnected during reconnect grace window
      const tempState = roomManager.disconnectPlayer(disconnectedRoomId, disconnectedPlayerId, false);
      if (tempState) {
        broadcastRoom(disconnectedRoomId, 'room:state', tempState);
      }

      const existingTimer = disconnectGraceTimers.get(disconnectedPlayerId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        disconnectGraceTimers.delete(disconnectedPlayerId);
        // Only permanently evict if they did not reconnect within the grace period
        if (!clientsByPlayerId.has(disconnectedPlayerId)) {
          reconnectTokensByPlayerId.delete(disconnectedPlayerId);
          const finalState = roomManager.disconnectPlayer(
            disconnectedRoomId,
            disconnectedPlayerId,
            true
          );
          if (finalState) {
            broadcastRoom(disconnectedRoomId, 'room:state', finalState);
          }
        }
      }, RECONNECT_GRACE_MS);
      timer.unref();
      disconnectGraceTimers.set(disconnectedPlayerId, timer);
    } else {
      reconnectTokensByPlayerId.delete(meta.playerId);
    }
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint not found.' });
});

async function bootstrap() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '1h',
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`THE HAUNTED SCHOOL server listening on http://0.0.0.0:${PORT}`);
  });
}

const shutdown = () => {
  clearInterval(pruneInterval);
  clearInterval(wsHeartbeatInterval);
  wss.close(() => {
    server.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 4000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

void bootstrap();
