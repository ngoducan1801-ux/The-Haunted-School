import {
  GAME_PROTOCOL_VERSION,
  type CharacterId,
  type ChatMessage,
  type FlashlightBrightness,
  type MultiplayerRoomState,
  type NetworkPlayerState,
  type NpcSyncState,
  type PlayerAnimState,
  type RoomErrorCode,
  type WorldMutationPayload,
} from '../src/types/game.ts';
import {
  computeMultiplayerSpawnPositions,
  getLevelSpawnPoint,
} from '../src/game/schoolBlueprint.ts';

export const VALID_CHARACTER_IDS: CharacterId[] = ['ty', 'nam', 'hoa', 'hai', 'phuong'];
export const LOBBY_ROOM_TTL_MS = 45 * 60 * 1000;
export const ACTIVE_ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export function sanitizeText(input: unknown, maxLen: number, fallback = ''): string {
  if (typeof input !== 'string') return fallback;
  const cleaned = input.replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
  return cleaned.slice(0, maxLen) || fallback;
}

export function isValidSixDigitRoomId(id: unknown): id is string {
  return typeof id === 'string' && /^\d{6}$/.test(id.trim());
}

export function clampMaxPlayers(val: unknown): 2 | 3 | 4 | 5 {
  const n = Number(val);
  if (n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 5;
}

export interface RoomActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  errorCode?: RoomErrorCode;
  data?: T;
}

export class AuthoritativeRoomManager {
  private rooms = new Map<string, MultiplayerRoomState>();
  private expiredRoomIds = new Map<string, number>();
  private rng: () => number;
  private chatSeq = 0;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  public pruneExpiredRooms(now = Date.now()): string[] {
    const expiredNow: string[] = [];
    for (const [roomId, room] of this.rooms) {
      const ttl = room.status === 'playing' ? ACTIVE_ROOM_TTL_MS : LOBBY_ROOM_TTL_MS;
      if (now >= room.expiresAt || now - room.lastActivityAt > ttl) {
        this.rooms.delete(roomId);
        this.expiredRoomIds.set(roomId, now);
        expiredNow.push(roomId);
      }
    }
    for (const [roomId, ts] of this.expiredRoomIds) {
      if (now - ts > ACTIVE_ROOM_TTL_MS) {
        this.expiredRoomIds.delete(roomId);
      }
    }
    return expiredNow;
  }

  public generateUniqueRoomId(): string {
    for (let attempt = 0; attempt < 500; attempt++) {
      const code = String(Math.floor(100000 + this.rng() * 900000));
      if (!this.rooms.has(code) && !this.expiredRoomIds.has(code)) return code;
    }
    for (let n = 100000; n <= 999999; n++) {
      const code = String(n);
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('No room IDs available');
  }

  public createRoom(params: {
    roomName: string;
    maxPlayers: number;
    hostPlayerId: string;
    hostDisplayName: string;
    level?: number;
    version?: string;
    now?: number;
  }): RoomActionResult<MultiplayerRoomState> {
    const now = params.now ?? Date.now();
    this.pruneExpiredRooms(now);

    if (params.version && params.version !== GAME_PROTOCOL_VERSION) {
      return {
        ok: false,
        errorCode: 'version_mismatch',
        error: `Incompatible game version (${params.version}). Expected ${GAME_PROTOCOL_VERSION}.`,
      };
    }

    const roomName = sanitizeText(params.roomName, 32);
    if (roomName.length < 2) {
      return {
        ok: false,
        errorCode: 'invalid_room_name',
        error: 'Room name must be at least 2 characters.',
      };
    }
    const displayName = sanitizeText(params.hostDisplayName, 20, 'Player 1');
    const maxPlayers = clampMaxPlayers(params.maxPlayers);
    const roomId = this.generateUniqueRoomId();

    const startLevel = Math.max(1, Math.min(10, Math.floor(params.level ?? 1)));
    const levelSpawn = getLevelSpawnPoint(startLevel);
    const [hostSpawnPos] = computeMultiplayerSpawnPositions(levelSpawn, 1);

    const hostPlayer: NetworkPlayerState = {
      playerId: params.hostPlayerId,
      displayName,
      characterId: null,
      isHost: true,
      ready: false,
      connected: true,
      hp: 1000,
      maxHp: 1000,
      isDowned: false,
      position: hostSpawnPos,
      yaw: levelSpawn.yaw,
      pitch: 0,
      animState: 'idle',
      isCrouching: false,
      isHiding: false,
      flashlightOn: true,
      flashlightBrightness: 3,
    };

    const room: MultiplayerRoomState = {
      roomId,
      roomName,
      hostPlayerId: params.hostPlayerId,
      level: startLevel,
      maxPlayers,
      status: 'lobby',
      version: GAME_PROTOCOL_VERSION,
      players: [hostPlayer],
      lockedCharacters: [],
      worldSync: {
        doors: {},
        consumedItems: [],
        activatedSwitches: [],
        solvedPuzzles: [],
        completedObjectives: [],
        npcMemoryFlags: [],
        litCandles: [],
        completedObjective: false,
        npcs: createInitialNpcStates(),
      },
      chatHistory: [],
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + LOBBY_ROOM_TTL_MS,
    };

    this.rooms.set(roomId, room);
    return { ok: true, data: room };
  }

  public joinRoom(params: {
    roomId: string;
    playerId: string;
    displayName: string;
    version?: string;
    currentRoomId?: string | null;
    now?: number;
  }): RoomActionResult<MultiplayerRoomState> {
    const now = params.now ?? Date.now();
    this.pruneExpiredRooms(now);

    if (params.version && params.version !== GAME_PROTOCOL_VERSION) {
      return {
        ok: false,
        errorCode: 'version_mismatch',
        error: `Incompatible game version (${params.version}). Expected ${GAME_PROTOCOL_VERSION}.`,
      };
    }

    const id = typeof params.roomId === 'string' ? params.roomId.trim() : '';
    if (!isValidSixDigitRoomId(id)) {
      return {
        ok: false,
        errorCode: 'invalid_room_id',
        error: 'Room ID must be exactly 6 digits.',
      };
    }

    if (params.currentRoomId && params.currentRoomId !== id && this.rooms.has(params.currentRoomId)) {
      return {
        ok: false,
        errorCode: 'already_in_room',
        error: `You are already in room #${params.currentRoomId}. Leave your current room first.`,
      };
    }

    if (this.expiredRoomIds.has(id)) {
      return {
        ok: false,
        errorCode: 'room_expired',
        error: `Room ${id} has expired.`,
      };
    }

    const room = this.rooms.get(id);
    if (!room) {
      return {
        ok: false,
        errorCode: 'room_not_found',
        error: `Room ${id} does not exist.`,
      };
    }

    if (room.version !== GAME_PROTOCOL_VERSION) {
      return {
        ok: false,
        errorCode: 'version_mismatch',
        error: 'Incompatible game version.',
      };
    }

    const existing = room.players.find((p) => p.playerId === params.playerId);
    const cleanName = sanitizeText(params.displayName, 20, 'Survivor');
    if (existing) {
      existing.connected = true;
      existing.displayName = cleanName;
      room.lastActivityAt = now;
      room.expiresAt = now + (room.status === 'playing' ? ACTIVE_ROOM_TTL_MS : LOBBY_ROOM_TTL_MS);
      this.recomputeLockedCharacters(room);
      return { ok: true, data: room };
    }

    if (room.status !== 'lobby') {
      return {
        ok: false,
        errorCode: 'room_started',
        error: `Room ${id} has already started and does not allow joining mid-game.`,
      };
    }

    const activeCapacityCount = room.players.length;
    if (activeCapacityCount >= room.maxPlayers) {
      return {
        ok: false,
        errorCode: 'room_full',
        error: `Room ${id} is full (${room.maxPlayers}/${room.maxPlayers}).`,
      };
    }

    const joinLevelSpawn = getLevelSpawnPoint(room.level);
    const joinSpawns = computeMultiplayerSpawnPositions(joinLevelSpawn, room.players.length + 1);
    const joinPos = joinSpawns[room.players.length];
    room.players.push({
      playerId: params.playerId,
      displayName: cleanName,
      characterId: null,
      isHost: false,
      ready: false,
      connected: true,
      hp: 1000,
      maxHp: 1000,
      isDowned: false,
      position: joinPos,
      yaw: joinLevelSpawn.yaw,
      pitch: 0,
      animState: 'idle',
      isCrouching: false,
      isHiding: false,
      flashlightOn: true,
      flashlightBrightness: 3,
    });

    room.lastActivityAt = now;
    room.expiresAt = now + LOBBY_ROOM_TTL_MS;
    return { ok: true, data: room };
  }

  public selectCharacter(
    roomId: string,
    playerId: string,
    characterId: CharacterId | null
  ): RoomActionResult<MultiplayerRoomState> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, errorCode: 'room_not_found', error: 'Room not found.' };

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) return { ok: false, errorCode: 'unknown', error: 'Player not in room.' };

    if (characterId !== null) {
      if (!VALID_CHARACTER_IDS.includes(characterId)) {
        return { ok: false, errorCode: 'unknown', error: 'Invalid character.' };
      }
      const takenByOther = room.players.some(
        (p) => p.playerId !== playerId && p.characterId === characterId
      );
      if (takenByOther) {
        return {
          ok: false,
          errorCode: 'unknown',
          error: `${characterId.toUpperCase()} is already locked by another player.`,
        };
      }
    }

    player.characterId = characterId;
    if (characterId === null) {
      player.ready = false;
    }
    room.lastActivityAt = Date.now();
    this.recomputeLockedCharacters(room);
    return { ok: true, data: room };
  }

  public setReady(
    roomId: string,
    playerId: string,
    ready: boolean
  ): RoomActionResult<MultiplayerRoomState> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, errorCode: 'room_not_found', error: 'Room not found.' };
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) return { ok: false, errorCode: 'unknown', error: 'Player not in room.' };
    if (ready && !player.characterId) {
      return { ok: false, errorCode: 'unknown', error: 'Select a character before marking ready.' };
    }
    player.ready = Boolean(ready);
    room.lastActivityAt = Date.now();
    return { ok: true, data: room };
  }

  public setLevel(
    roomId: string,
    playerId: string,
    level: number
  ): RoomActionResult<MultiplayerRoomState> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, errorCode: 'room_not_found', error: 'Room not found.' };
    if (room.hostPlayerId !== playerId) {
      return { ok: false, errorCode: 'unknown', error: 'Only the host can change the level.' };
    }
    room.level = Math.max(1, Math.min(10, Math.floor(level)));
    room.lastActivityAt = Date.now();
    return { ok: true, data: room };
  }

  public startGame(roomId: string, playerId: string): RoomActionResult<MultiplayerRoomState> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, errorCode: 'room_not_found', error: 'Room not found.' };
    if (room.hostPlayerId !== playerId) {
      return { ok: false, errorCode: 'unknown', error: 'Only the host can start the game.' };
    }
    const activePlayers = room.players.filter((p) => p.connected);
    if (activePlayers.some((p) => !p.characterId)) {
      return { ok: false, errorCode: 'unknown', error: 'All connected players must choose a character first.' };
    }
    if (activePlayers.some((p) => !p.isHost && !p.ready)) {
      return { ok: false, errorCode: 'unknown', error: 'All teammates must be Ready before starting.' };
    }
    const now = Date.now();
    room.status = 'playing';
    room.lastActivityAt = now;
    room.expiresAt = now + ACTIVE_ROOM_TTL_MS;
    const levelSpawn = getLevelSpawnPoint(room.level);
    const spawnPositions = computeMultiplayerSpawnPositions(levelSpawn, room.players.length);
    room.players.forEach((p, idx) => {
      p.hp = 1000;
      p.maxHp = 1000;
      p.isDowned = false;
      p.position = { ...spawnPositions[idx] };
      p.yaw = levelSpawn.yaw;
    });
    room.worldSync = {
      doors: {},
      consumedItems: [],
      activatedSwitches: [],
      solvedPuzzles: [],
      completedObjectives: [],
      npcMemoryFlags: [],
      litCandles: [],
      completedObjective: false,
      npcs: createInitialNpcStates(),
      lastHorrorEvent: undefined,
    };
    return { ok: true, data: room };
  }

  public updatePlayerTransform(
    roomId: string,
    playerId: string,
    payload: {
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
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) return false;

    if (
      Number.isFinite(payload.position?.x) &&
      Number.isFinite(payload.position?.y) &&
      Number.isFinite(payload.position?.z)
    ) {
      player.position = {
        x: Math.max(-90, Math.min(90, payload.position.x)),
        y: Math.max(-10, Math.min(35, payload.position.y)),
        z: Math.max(-90, Math.min(90, payload.position.z)),
      };
    }
    if (Number.isFinite(payload.yaw)) player.yaw = payload.yaw;
    if (Number.isFinite(payload.pitch)) player.pitch = payload.pitch;
    player.animState = payload.animState;
    player.isCrouching = Boolean(payload.isCrouching);
    player.isHiding = Boolean(payload.isHiding);
    player.flashlightOn = Boolean(payload.flashlightOn);
    player.flashlightBrightness = payload.flashlightBrightness;
    if (typeof payload.maxHp === 'number' && Number.isFinite(payload.maxHp)) {
      player.maxHp = Math.max(100, Math.min(2000, Math.round(payload.maxHp)));
    }
    if (typeof payload.hp === 'number' && Number.isFinite(payload.hp)) {
      player.hp = Math.max(0, Math.min(player.maxHp, Math.round(payload.hp)));
    }
    if (typeof payload.isDowned === 'boolean') {
      player.isDowned = payload.isDowned;
    }
    const now = Date.now();
    room.lastActivityAt = now;
    room.expiresAt = now + (room.status === 'playing' ? ACTIVE_ROOM_TTL_MS : LOBBY_ROOM_TTL_MS);
    return true;
  }

  public applyWorldMutation(
    roomId: string,
    mutation: WorldMutationPayload
  ): RoomActionResult<MultiplayerRoomState> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, errorCode: 'room_not_found', error: 'Room not found.' };
    if (room.status !== 'playing') {
      return { ok: false, errorCode: 'unknown', error: 'World mutations require an active game.' };
    }
    if (!mutation || typeof mutation !== 'object') {
      return { ok: false, errorCode: 'unknown', error: 'Invalid mutation payload.' };
    }

    if (mutation.kind === 'door') {
      const id = sanitizeText(mutation.id, 64);
      if (!id) return { ok: false, errorCode: 'unknown', error: 'Invalid door ID.' };
      room.worldSync.doors[id] = Boolean(mutation.isOpen);
    } else if (mutation.kind === 'pickup') {
      const id = sanitizeText(mutation.id, 64);
      if (!id) return { ok: false, errorCode: 'unknown', error: 'Invalid item ID.' };
      if (room.worldSync.consumedItems.includes(id)) {
        return { ok: false, errorCode: 'unknown', error: 'Item already picked up.' };
      }
      room.worldSync.consumedItems.push(id);
    } else if (mutation.kind === 'switch') {
      const id = sanitizeText(mutation.id, 64);
      if (!id) return { ok: false, errorCode: 'unknown', error: 'Invalid switch ID.' };
      if (!room.worldSync.activatedSwitches.includes(id)) {
        room.worldSync.activatedSwitches.push(id);
      }
    } else if (mutation.kind === 'puzzle_solve') {
      const puzzleId = sanitizeText(mutation.puzzleId, 64);
      if (!puzzleId) return { ok: false, errorCode: 'unknown', error: 'Invalid puzzle ID.' };
      if (!room.worldSync.solvedPuzzles.includes(puzzleId)) {
        room.worldSync.solvedPuzzles.push(puzzleId);
      }
      const objId = mutation.objectiveId ? sanitizeText(mutation.objectiveId, 64) : '';
      if (objId && !room.worldSync.completedObjectives.includes(objId)) {
        room.worldSync.completedObjectives.push(objId);
      }
    } else if (mutation.kind === 'objective_complete') {
      const objId = sanitizeText(mutation.objectiveId, 64);
      if (!objId) return { ok: false, errorCode: 'unknown', error: 'Invalid objective ID.' };
      if (!room.worldSync.completedObjectives.includes(objId)) {
        room.worldSync.completedObjectives.push(objId);
      }
    } else if (mutation.kind === 'npc_talk') {
      const npcId = sanitizeText(mutation.npcId, 64);
      const npc = room.worldSync.npcs.find((n) => n.id === npcId);
      const mood = mutation.mood;
      if (npc && (mood === 'calm' || mood === 'nervous' || mood === 'guarded' || mood === 'hostile')) {
        npc.mood = mood;
      }
    } else if (mutation.kind === 'npc_memory') {
      const cleanFlag = sanitizeText(mutation.flag, 48);
      if (cleanFlag && !room.worldSync.npcMemoryFlags.includes(cleanFlag)) {
        room.worldSync.npcMemoryFlags.push(cleanFlag);
      }
      const npcId = mutation.npcId ? sanitizeText(mutation.npcId, 64) : '';
      if (npcId && mutation.disappeared) {
        const npc = room.worldSync.npcs.find((n) => n.id === npcId);
        if (npc) npc.disappeared = true;
      }
    } else if (mutation.kind === 'candle_light') {
      const id = sanitizeText(mutation.id, 64);
      if (!id) return { ok: false, errorCode: 'unknown', error: 'Invalid lantern ID.' };
      if (!room.worldSync.litCandles.includes(id)) {
        room.worldSync.litCandles.push(id);
      }
    } else if (mutation.kind === 'horror_event') {
      const eventType = mutation.eventType;
      if (
        eventType !== 'corridor_shadow' &&
        eventType !== 'door_slam' &&
        eventType !== 'window_figure' &&
        eventType !== 'witch_apparition' &&
        eventType !== 'beam_silhouette' &&
        eventType !== 'disappearing_figure' &&
        eventType !== 'room_anomaly' &&
        eventType !== 'blackout'
      ) {
        return { ok: false, errorCode: 'unknown', error: 'Invalid horror event type.' };
      }
      const targetDoorId = mutation.targetDoorId ? sanitizeText(mutation.targetDoorId, 64) : undefined;
      room.worldSync.lastHorrorEvent = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        eventType,
        targetDoorId: targetDoorId || undefined,
        x: Number.isFinite(mutation.x) ? Math.max(-90, Math.min(90, Number(mutation.x))) : 0,
        y: Number.isFinite(mutation.y) ? Math.max(-10, Math.min(35, Number(mutation.y))) : 0,
        z: Number.isFinite(mutation.z) ? Math.max(-90, Math.min(90, Number(mutation.z))) : 0,
        timestamp: Date.now(),
      };
      if (eventType === 'door_slam' && targetDoorId) {
        room.worldSync.doors[targetDoorId] = false;
      }
    } else if (mutation.kind === 'player_revive') {
      const targetId = sanitizeText(mutation.targetPlayerId, 64);
      const target = room.players.find((p) => p.playerId === targetId);
      if (target) {
        target.hp = Math.max(350, Math.min(target.maxHp, Number(mutation.hp) || 350));
        target.isDowned = false;
      }
    } else if (mutation.kind === 'objective_clear') {
      room.worldSync.completedObjective = true;
    } else {
      return { ok: false, errorCode: 'unknown', error: 'Unsupported world mutation.' };
    }

    const now = Date.now();
    room.lastActivityAt = now;
    room.expiresAt = now + (room.status === 'playing' ? ACTIVE_ROOM_TTL_MS : LOBBY_ROOM_TTL_MS);
    return { ok: true, data: room };
  }

  public addChatMessage(
    roomId: string,
    playerId: string,
    text: string,
    proximity: boolean
  ): RoomActionResult<ChatMessage> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, errorCode: 'room_not_found', error: 'Room not found.' };
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player || !player.connected) {
      return { ok: false, errorCode: 'unknown', error: 'Player not active in room.' };
    }

    const clean = sanitizeText(text, 240);
    if (!clean) return { ok: false, errorCode: 'unknown', error: 'Empty message.' };

    this.chatSeq += 1;
    const msg: ChatMessage = {
      id: `${Date.now()}_${this.chatSeq}_${Math.random().toString(36).slice(2, 7)}`,
      playerId,
      senderName: player.displayName,
      characterId: player.characterId,
      text: clean,
      timestamp: Date.now(),
      proximity,
      senderPos: { ...player.position },
    };

    room.chatHistory.push(msg);
    if (room.chatHistory.length > 80) {
      room.chatHistory.shift();
    }
    const now = Date.now();
    room.lastActivityAt = now;
    room.expiresAt = now + (room.status === 'playing' ? ACTIVE_ROOM_TTL_MS : LOBBY_ROOM_TTL_MS);
    return { ok: true, data: msg };
  }

  public disconnectPlayer(
    roomId: string,
    playerId: string,
    permanent = true
  ): MultiplayerRoomState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const leavingPlayer = room.players.find((p) => p.playerId === playerId);
    const wasHost = leavingPlayer?.playerId === room.hostPlayerId;
    const leavingName = leavingPlayer?.displayName ?? 'Host';

    if (permanent) {
      room.players = room.players.filter((p) => p.playerId !== playerId);
    } else if (leavingPlayer) {
      leavingPlayer.connected = false;
      // Only release unstarted lobby character on temporary drop if not in active game;
      // keep active-game character & HP intact for seamless reconnection
      if (room.status === 'lobby') {
        leavingPlayer.ready = false;
      }
    }

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    const active = room.players.filter((p) => p.connected);
    if (permanent && active.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // Reassign host if host disconnected and another connected player is available
    if (wasHost && active.length > 0 && !active.some((p) => p.playerId === room.hostPlayerId)) {
      if (leavingPlayer) leavingPlayer.isHost = false;
      active[0].isHost = true;
      room.hostPlayerId = active[0].playerId;
      room.hostNotice = `${leavingName} disconnected — ${active[0].displayName} is now Host.`;
    } else if (wasHost && !permanent) {
      room.hostNotice = `${leavingName} lost connection (waiting to reconnect...).`;
    } else {
      room.hostNotice = undefined;
    }

    this.recomputeLockedCharacters(room);
    return room;
  }

  public getRoom(roomId: string): MultiplayerRoomState | undefined {
    this.pruneExpiredRooms();
    return this.rooms.get(roomId);
  }

  public isRoomExpired(roomId: string): boolean {
    this.pruneExpiredRooms();
    return this.expiredRoomIds.has(roomId);
  }

  public listPublicRooms(): Array<{
    roomId: string;
    roomName: string;
    playerCount: number;
    maxPlayers: number;
    status: string;
    level: number;
  }> {
    this.pruneExpiredRooms();
    return Array.from(this.rooms.values()).map((r) => ({
      roomId: r.roomId,
      roomName: r.roomName,
      playerCount: r.players.filter((p) => p.connected).length,
      maxPlayers: r.maxPlayers,
      status: r.status,
      level: r.level,
    }));
  }

  private recomputeLockedCharacters(room: MultiplayerRoomState): void {
    const locked: CharacterId[] = [];
    for (const p of room.players) {
      if (p.characterId && !locked.includes(p.characterId)) {
        locked.push(p.characterId);
      }
    }
    room.lockedCharacters = locked;
  }
}

export function createInitialNpcStates(): NpcSyncState[] {
  return [
    {
      id: 'npc_caretaker_echo',
      name: 'Stranded Night Guard',
      position: { x: 4.8, y: 0, z: 3.0 },
      yaw: -Math.PI / 2,
      mood: 'guarded',
      truthful: false,
    },
    {
      id: 'npc_librarian_shade',
      name: 'Archive Witness',
      position: { x: -10.5, y: 0, z: -6.5 },
      yaw: 0,
      mood: 'nervous',
      truthful: true,
    },
    {
      id: 'npc_deceptive_student',
      name: 'Lingering Student',
      position: { x: 13.8, y: 0, z: 3.1 },
      yaw: Math.PI,
      mood: 'guarded',
      truthful: false,
    },
    {
      id: 'npc_witch',
      name: 'The Pale Witch',
      position: { x: -13.6, y: 0, z: -6.0 },
      yaw: 0.4,
      mood: 'guarded',
      truthful: false,
    },
  ];
}
