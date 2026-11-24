import {
  GAME_PROTOCOL_VERSION,
  type CharacterId,
  type ChatMessage,
  type FlashlightBrightness,
  type MultiplayerRoomState,
  type PlayerAnimState,
  type RoomErrorCode,
  type WorldMutationPayload,
  type WorldSyncState,
} from '../types/game';

export interface PlayerDeltaPacket {
  playerId: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  animState: PlayerAnimState;
  isCrouching: boolean;
  isHiding: boolean;
  flashlightOn: boolean;
  flashlightBrightness: FlashlightBrightness;
  hp?: number;
  maxHp?: number;
  isDowned?: boolean;
}

export interface WorldSyncedPacket {
  worldSync: WorldSyncState;
  mutation: Record<string, unknown>;
  actorId: string;
}

export interface MultiplayerClientHandlers {
  onSessionHello: (playerId: string) => void;
  onRoomState: (room: MultiplayerRoomState) => void;
  onGameStarted: (room: MultiplayerRoomState) => void;
  onPlayerDelta: (delta: PlayerDeltaPacket) => void;
  onWorldSynced: (packet: WorldSyncedPacket) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onRtcSignal: (fromPlayerId: string, signal: unknown) => void;
  onRoomLeft: () => void;
  onError: (message: string, code: RoomErrorCode) => void;
  onConnectionChange: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
}

const SESSION_STORAGE_KEY = 'haunted_school_mp_session_v1';

interface StoredSession {
  roomId: string;
  playerId: string;
  reconnectToken: string;
  displayName: string;
}

export function getMultiplayerApiBaseUrl(): string {
  const envApi = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_MULTIPLAYER_API_URL;
  if (envApi && envApi.trim().length > 0) {
    return envApi.trim().replace(/\/+$/, '');
  }
  return '';
}

export function getMultiplayerWebSocketUrl(): string {
  const envWs = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_MULTIPLAYER_WS_URL;
  if (envWs && envWs.trim().length > 0) {
    let url = envWs.trim();
    if (window.location.protocol === 'https:' && url.startsWith('ws://')) {
      url = `wss://${url.slice(5)}`;
    }
    return url;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private handlers: MultiplayerClientHandlers;
  private playerId: string | null = null;
  private reconnectToken: string | null = null;
  private currentRoomId: string | null = null;
  private currentDisplayName = 'Survivor';
  private intentionallyClosed = false;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private pendingQueue: Array<{ type: string; payload: unknown }> = [];
  private cleanupWindowListeners: () => void;

  constructor(handlers: MultiplayerClientHandlers) {
    this.handlers = handlers;

    const restored = this.readStoredSession();
    if (restored) {
      this.playerId = restored.playerId;
      this.reconnectToken = restored.reconnectToken;
      this.currentRoomId = restored.roomId;
      this.currentDisplayName = restored.displayName;
    }

    const onOffline = () => {
      if (this.reconnectTimer !== null) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.ws) {
        const stale = this.ws;
        this.ws = null;
        stale.onopen = null;
        stale.onmessage = null;
        stale.onerror = null;
        stale.onclose = null;
        try {
          stale.close();
        } catch {
          // ignore close failure
        }
      }
      this.handlers.onConnectionChange('disconnected');
      this.handlers.onError('Internet connection unavailable.', 'internet_unavailable');
    };
    const onOnline = () => {
      if (!this.intentionallyClosed) {
        this.retryConnect();
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    this.cleanupWindowListeners = () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }

  private readStoredSession(): StoredSession | null {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (parsed.roomId && parsed.playerId && parsed.reconnectToken) {
        return {
          roomId: parsed.roomId,
          playerId: parsed.playerId,
          reconnectToken: parsed.reconnectToken,
          displayName: parsed.displayName || 'Survivor',
        };
      }
    } catch {
      // ignore storage errors
    }
    return null;
  }

  private saveStoredSession(): void {
    try {
      if (this.currentRoomId && this.playerId && this.reconnectToken) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            roomId: this.currentRoomId,
            playerId: this.playerId,
            reconnectToken: this.reconnectToken,
            displayName: this.currentDisplayName,
          })
        );
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  public getPlayerId(): string | null {
    return this.playerId;
  }

  public retryConnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
    this.intentionallyClosed = false;
    if (this.ws) {
      const stale = this.ws;
      this.ws = null;
      stale.onopen = null;
      stale.onmessage = null;
      stale.onerror = null;
      stale.onclose = null;
      try {
        stale.close();
      } catch {
        // ignore close failure
      }
    }
    this.connect();
  }

  public connect(): void {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.handlers.onConnectionChange('disconnected');
      this.handlers.onError('Internet connection unavailable.', 'internet_unavailable');
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.intentionallyClosed = false;
    this.handlers.onConnectionChange(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(getMultiplayerWebSocketUrl());
    } catch {
      this.handlers.onConnectionChange('disconnected');
      this.handlers.onError('Unable to reach multiplayer server.', 'server_unavailable');
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.handlers.onConnectionChange('connected');
      if (this.currentRoomId) {
        this.sendRaw('room:join', {
          roomId: this.currentRoomId,
          displayName: this.currentDisplayName,
          reconnectPlayerId: this.playerId,
          reconnectToken: this.reconnectToken,
          version: GAME_PROTOCOL_VERSION,
        });
      }
      while (this.pendingQueue.length > 0) {
        const next = this.pendingQueue.shift()!;
        this.sendRaw(next.type, next.payload);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as { type: string; payload: unknown };
        switch (msg.type) {
          case 'session:hello': {
            const p = msg.payload as { playerId: string; reconnectToken?: string };
            this.playerId = p.playerId;
            if (p.reconnectToken) {
              this.reconnectToken = p.reconnectToken;
            }
            this.saveStoredSession();
            this.handlers.onSessionHello(p.playerId);
            break;
          }
          case 'room:state': {
            const room = msg.payload as MultiplayerRoomState;
            this.currentRoomId = room.roomId;
            this.saveStoredSession();
            this.handlers.onRoomState(room);
            break;
          }
          case 'game:started': {
            const room = msg.payload as MultiplayerRoomState;
            this.currentRoomId = room.roomId;
            this.saveStoredSession();
            this.handlers.onGameStarted(room);
            break;
          }
          case 'player:delta':
            this.handlers.onPlayerDelta(msg.payload as PlayerDeltaPacket);
            break;
          case 'world:synced':
            this.handlers.onWorldSynced(msg.payload as WorldSyncedPacket);
            break;
          case 'chat:message':
            this.handlers.onChatMessage(msg.payload as ChatMessage);
            break;
          case 'rtc:signal': {
            const p = msg.payload as { fromPlayerId: string; signal: unknown };
            this.handlers.onRtcSignal(p.fromPlayerId, p.signal);
            break;
          }
          case 'room:left':
            this.currentRoomId = null;
            this.saveStoredSession();
            this.handlers.onRoomLeft();
            break;
          case 'error': {
            const p = msg.payload as { message?: string; code?: RoomErrorCode };
            const code = p.code ?? 'unknown';
            if (
              (code === 'room_not_found' || code === 'room_expired' || code === 'room_started') &&
              this.currentRoomId
            ) {
              this.currentRoomId = null;
              this.saveStoredSession();
            }
            this.handlers.onError(p.message ?? 'Network error', code);
            break;
          }
        }
      } catch {
        // ignore invalid message
      }
    };

    ws.onclose = () => {
      this.ws = null;
      if (this.intentionallyClosed) {
        this.handlers.onConnectionChange('disconnected');
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.handlers.onConnectionChange('disconnected');
        this.handlers.onError('Internet connection unavailable.', 'internet_unavailable');
        return;
      }
      this.handlers.onConnectionChange('reconnecting');
      const delay = Math.min(8000, 650 * Math.pow(1.6, this.reconnectAttempt));
      this.reconnectAttempt += 1;
      if (this.reconnectAttempt >= 3) {
        this.handlers.onError('Server unavailable — attempting to reconnect...', 'server_unavailable');
      }
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    };

    ws.onerror = () => {
      if (this.reconnectAttempt === 0) {
        this.handlers.onError('Unable to reach multiplayer server.', 'connection_failed');
      }
    };
  }

  private sendRaw(type: string, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      if (this.pendingQueue.length < 24 && type !== 'player:update') {
        this.pendingQueue.push({ type, payload });
      }
      if (!this.ws && !this.intentionallyClosed) {
        this.connect();
      }
    }
  }

  public createRoom(roomName: string, maxPlayers: 2 | 3 | 4 | 5, displayName: string, level = 1): void {
    this.currentDisplayName = displayName;
    this.sendRaw('room:create', {
      roomName,
      maxPlayers,
      displayName,
      level,
      version: GAME_PROTOCOL_VERSION,
    });
  }

  public joinRoom(roomId: string, displayName: string): void {
    this.currentDisplayName = displayName;
    this.sendRaw('room:join', {
      roomId,
      displayName,
      version: GAME_PROTOCOL_VERSION,
    });
  }

  public leaveRoom(): void {
    this.currentRoomId = null;
    this.saveStoredSession();
    this.sendRaw('room:leave', {});
  }

  public selectCharacter(characterId: CharacterId | null): void {
    this.sendRaw('room:select_character', { characterId });
  }

  public setReady(ready: boolean): void {
    this.sendRaw('room:ready', { ready });
  }

  public setLevel(level: number): void {
    this.sendRaw('room:set_level', { level });
  }

  public startGame(): void {
    this.sendRaw('room:start', {});
  }

  public sendPlayerUpdate(payload: Omit<PlayerDeltaPacket, 'playerId'>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'player:update', payload }));
  }

  public sendWorldMutation(mutation: WorldMutationPayload): void {
    this.sendRaw('world:mutate', mutation);
  }

  public sendChat(text: string, proximity: boolean): void {
    this.sendRaw('chat:send', { text, proximity });
  }

  public sendRtcSignal(targetPlayerId: string, signal: unknown): void {
    this.sendRaw('rtc:signal', { targetPlayerId, signal });
  }

  public dispose(): void {
    this.intentionallyClosed = true;
    this.cleanupWindowListeners();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
