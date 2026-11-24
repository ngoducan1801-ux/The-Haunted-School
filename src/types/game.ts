export type GameState = 'title' | 'character_select' | 'lobby' | 'loading' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'singleplayer' | 'multiplayer';

export type LanguageCode = 'en' | 'vi';

export type GraphicsQuality = 'very_low' | 'low' | 'medium' | 'high' | 'ultra' | 'adaptive';

export type QualityTier = 'low' | 'medium' | 'high';

export type ShadowQualityTier = 'off' | 'low' | 'medium' | 'high';

export type TouchControlsMode = 'auto' | 'on' | 'off';

export type VoiceMode = 'radio' | 'spatial';

export type VoicePeerConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface VoiceAudioDevice {
  deviceId: string;
  label: string;
}

export interface PeerVoiceTelemetry {
  playerId: string;
  connectionState: VoicePeerConnectionState;
  speaking: boolean;
  audioLevel: number;
  distanceMeters: number;
  wallsBetween: number;
  muted: boolean;
  receivingAudio: boolean;
}

export interface VoiceDiagnosticsSnapshot {
  localMicLevel: number;
  localSpeaking: boolean;
  voiceMode: VoiceMode;
  activeInputDeviceId: string;
  peers: Record<string, PeerVoiceTelemetry>;
}

export type DynamicMusicState =
  | 'exploration'
  | 'suspicion'
  | 'npc_encounter'
  | 'danger'
  | 'chase'
  | 'escape'
  | 'silence';

export type JumpScareType =
  | 'corridor_shadow'
  | 'door_slam'
  | 'window_figure'
  | 'witch_apparition'
  | 'beam_silhouette'
  | 'disappearing_figure'
  | 'room_anomaly';

export type FlashlightBrightness = 1 | 2 | 3; // 1 = Low, 2 = Medium, 3 = High

export type CharacterId = 'ty' | 'nam' | 'hoa' | 'hai' | 'phuong';

export type PlayerAnimState = 'idle' | 'walk' | 'sprint' | 'crouch' | 'hide' | 'downed';

export type MonsterType = 'shadow_walker' | 'hallway_stalker' | 'crawler' | 'silent_student';

export type MonsterAiState =
  | 'patrol'
  | 'observe'
  | 'investigate'
  | 'search'
  | 'chase'
  | 'vanished'
  | 'mimic';

export type PuzzleKind =
  | 'math'
  | 'logic'
  | 'pattern'
  | 'sequence'
  | 'word'
  | 'symbol'
  | 'memory'
  | 'order'
  | 'code'
  | 'multistep';

export type InteractableType =
  | 'door'
  | 'drawer'
  | 'cabinet'
  | 'desk'
  | 'computer'
  | 'book'
  | 'note'
  | 'key'
  | 'battery'
  | 'healing'
  | 'hidden_object'
  | 'puzzle'
  | 'circuit'
  | 'candle_light'
  | 'container'
  | 'secret_switch'
  | 'hiding_spot'
  | 'npc'
  | 'exit';

export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  sprint: string;
  crouch: string;
  jump: string;
  flashlight: string;
  brightness: string;
  interact: string;
  drop: string;
  useItem: string;
  pushToTalk: string;
  pause: string;
}

export interface GameSettings {
  language: LanguageCode;
  graphicsQuality: GraphicsQuality;
  resolutionScale: number; // 0.6 to 1.0
  shadowQuality: ShadowQualityTier;
  textureQuality: QualityTier;
  lightingQuality: QualityTier;
  effectsQuality: QualityTier;
  antialiasing: boolean;
  viewDistance: number; // 45 to 120
  ambientOcclusion: boolean;
  motionBlur: boolean;
  vsync: boolean;
  fpsLimit: 0 | 60 | 90 | 120;
  mouseSensitivity: number; // 0.2 to 2.5
  mobileLookSensitivity: number; // 0.4 to 2.5
  mobileControlScale: number; // 0.8 to 1.3
  touchControlsMode: TouchControlsMode;
  masterVolume: number; // 0 to 1
  musicVolume: number; // 0 to 1
  ambienceVolume: number; // 0 to 1
  npcVolume: number; // 0 to 1
  monsterVolume: number; // 0 to 1
  voiceVolume: number; // 0 to 1
  voiceMode: VoiceMode;
  voiceInputDeviceId: string;
  uiVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  pushToTalk: boolean;
  micEnabled: boolean;
  muted: boolean;
  showFps: boolean;
  batteryDrainEnabled: boolean;
  walkSpeed: number;
  sprintSpeed: number;
  keyBindings: KeyBindings;
}

export type InventoryItemKind =
  | 'key'
  | 'battery'
  | 'healing'
  | 'fuse'
  | 'relic'
  | 'tool'
  | 'document'
  | 'access_card'
  | 'book'
  | 'component';

export interface InventoryItem {
  id: string;
  name: string;
  kind: InventoryItemKind;
  description: string;
  droppable: boolean;
  consumable?: boolean;
  healAmount?: number;
  sharedQuest?: boolean;
}

export interface QuickInventorySlot {
  item: InventoryItem;
  quantity: number;
}

export interface NoteDocument {
  id: string;
  title: string;
  author: string;
  body: string;
  analyticalHint?: string; // Unlocked by NAM
  quickClue?: string; // Unlocked by HOA
}

export interface PuzzleDefinition {
  id: string;
  level: number;
  kind: PuzzleKind;
  title: string;
  prompt: string;
  clues: string[];
  hint: string;
  analyticalHint?: string; // Unlocked by NAM
  quickHint?: string; // Unlocked by HOA
  inputMode: 'input' | 'choice' | 'sequence_order';
  options?: string[];
  optionLabels?: Record<string, string>;
  answer: string; // Normalized match; for sequence_order, comma-joined exact order
  rewardItem?: InventoryItem;
  rewardSwitchId?: string;
  unlockDoorId?: string;
  objectiveId?: string;
  solvedText: string;
}

export interface NpcDialogueOption {
  id: string;
  label: string;
  requiresCharacter?: CharacterId;
  requiredItemId?: string;
  requiresMemoryFlag?: string;
  hideIfMemoryFlag?: string;
  setsMemoryFlag?: string;
  disappearsAfter?: boolean;
  rewardItem?: InventoryItem;
  objectiveId?: string;
  response: string;
  revealsLie?: string;
}

export interface NpcDialogueSession {
  npcId: string;
  npcName: string;
  role: 'witch' | 'student' | 'guard' | 'archivist';
  greeting: string;
  conditionalGreetings?: Array<{ flag: string; text: string }>;
  emotionalRead?: string; // Unlocked by PHUONG
  truthful: boolean;
  contradictionNote?: string;
  options: NpcDialogueOption[];
}

export interface LevelObjectiveItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface HudSnapshot {
  level: number;
  levelName: string;
  difficultyLabel: string;
  zoneName: string;
  currentFloor: number; // -1 = B1, 1..6 = Floors 1..6, 7 = Rooftop
  playerPos: { x: number; y: number; z: number; yaw: number };
  objectiveText: string;
  objectives: LevelObjectiveItem[];
  characterId: CharacterId;
  characterName: string;
  specialAbilityName: string;
  hp: number;
  maxHp: number;
  isDowned: boolean;
  damageFlashActive: boolean;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  isCrouching: boolean;
  isHiding: boolean;
  flashlightOn: boolean;
  flashlightBrightness: FlashlightBrightness;
  battery: number; // 0 - 100
  batteryReserves: number;
  fps: number;
  promptText: string | null;
  promptSubtext: string | null;
  heldItem: InventoryItem | null;
  inventory: InventoryItem[];
  quickSlots: Array<QuickInventorySlot | null>;
  selectedSlotIndex: number;
  maxInventory: number;
  notesFound: number;
  secretsFound: number;
  elapsedSeconds: number;
  pointerLocked: boolean;
  statusBanner: string | null;
  witchWhisper: string | null;
  playerNoiseLevel: number;
  monsterAlertLevel: number;
  isChased: boolean;
  activeNote: NoteDocument | null;
  activeNpcDialogue: NpcDialogueSession | null;
  activePuzzle: PuzzleDefinition | null;
  npcMemoryFlags: string[];
  isNervous: boolean;
  audioState: DynamicMusicState;
  distortionIntensity: number;
  jumpScareActive: boolean;
  perfStats: {
    drawCalls: number;
    activeLights: number;
    totalLights: number;
    culledGroups: number;
  };
}

export interface StageClearStats {
  level: number;
  levelName: string;
  clearTimeSeconds: number;
  notesFound: number;
  secretsFound: number;
  batteriesUsed: number;
  puzzlesSolved: number;
  completedAll: boolean;
  defeated?: boolean;
}

export interface LevelConfig {
  level: number;
  name: string;
  subtitle: string;
  difficultyLabel: string;
  startingZone: string;
  objectiveDescription: string;
  objectives: Array<{ id: string; label: string }>;
  spawn: { x: number; y: number; z: number; yaw: number };
  requiredKeyId: string | null;
  requiredSwitchId: string | null;
  requiredPuzzleId: string | null;
  exitId: string;
  ambientIntensity: number;
  fogDensity: number;
  flickerChance: number;
  supernaturalEventRate: number;
  batteryDrainMultiplier: number;
  activeMonsters: MonsterType[];
  witchActive: boolean;
}

export interface PlayableCharacterProfile {
  id: CharacterId;
  codename: string;
  title: string;
  personality: string[];
  specialAbility: string;
  advantages: string[];
  tradeoff: string;
  maxHp: number;
  maxStamina: number;
  staminaDrainMult: number;
  staminaRecoveryMult: number;
  nervousRecoveryMult: number;
  speedMult: number;
  inventoryCapacity: number;
  startingSpareBatteries: number;
  interactRange: number;
  batteryEfficiency: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    skin: string;
    hair: string;
  };
}

export const GAME_PROTOCOL_VERSION = '1.0.0';

export type RoomErrorCode =
  | 'invalid_room_id'
  | 'room_not_found'
  | 'room_full'
  | 'room_started'
  | 'room_expired'
  | 'host_disconnected'
  | 'version_mismatch'
  | 'already_in_room'
  | 'invalid_room_name'
  | 'rate_limited'
  | 'server_unavailable'
  | 'internet_unavailable'
  | 'connection_failed'
  | 'auth_failed'
  | 'unknown';

export interface NetworkPlayerState {
  playerId: string;
  displayName: string;
  characterId: CharacterId | null;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  hp: number;
  maxHp: number;
  isDowned: boolean;
  position: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  animState: PlayerAnimState;
  isCrouching: boolean;
  isHiding: boolean;
  flashlightOn: boolean;
  flashlightBrightness: FlashlightBrightness;
}

export interface NpcSyncState {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  yaw: number;
  mood: 'calm' | 'nervous' | 'guarded' | 'hostile';
  truthful: boolean;
  disappeared?: boolean;
}

export interface WorldSyncState {
  doors: Record<string, boolean>;
  consumedItems: string[];
  activatedSwitches: string[];
  solvedPuzzles: string[];
  completedObjectives: string[];
  npcMemoryFlags: string[];
  litCandles: string[];
  completedObjective: boolean;
  npcs: NpcSyncState[];
  lastHorrorEvent?: {
    id: string;
    eventType: JumpScareType | 'blackout';
    targetDoorId?: string;
    x?: number;
    y?: number;
    z?: number;
    timestamp: number;
  };
}

export interface ChatMessage {
  id: string;
  playerId: string;
  senderName: string;
  characterId: CharacterId | null;
  text: string;
  timestamp: number;
  proximity: boolean;
  senderPos: { x: number; y: number; z: number };
}

export interface MultiplayerRoomState {
  roomId: string;
  roomName: string;
  hostPlayerId: string;
  level: number;
  maxPlayers: 2 | 3 | 4 | 5;
  status: 'lobby' | 'playing';
  version: string;
  players: NetworkPlayerState[];
  lockedCharacters: CharacterId[];
  worldSync: WorldSyncState;
  chatHistory: ChatMessage[];
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  hostNotice?: string;
}

export type WorldMutationPayload =
  | { kind: 'door'; id: string; isOpen: boolean }
  | { kind: 'pickup'; id: string; sharedQuest?: boolean }
  | { kind: 'switch'; id: string }
  | { kind: 'puzzle_solve'; puzzleId: string; objectiveId?: string; rewardItemId?: string }
  | { kind: 'objective_complete'; objectiveId: string }
  | { kind: 'npc_talk'; npcId: string; mood: NpcSyncState['mood'] }
  | { kind: 'npc_memory'; flag: string; npcId?: string; disappeared?: boolean }
  | { kind: 'candle_light'; id: string }
  | { kind: 'player_revive'; targetPlayerId: string; hp: number }
  | { kind: 'horror_event'; eventType: JumpScareType | 'blackout'; targetDoorId?: string; x?: number; y?: number; z?: number }
  | { kind: 'objective_clear' };
