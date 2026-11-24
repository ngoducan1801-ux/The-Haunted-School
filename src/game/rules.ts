import type {
  CharacterId,
  DynamicMusicState,
  FlashlightBrightness,
  GameSettings,
  GraphicsQuality,
  InventoryItem,
  LevelConfig,
  PlayableCharacterProfile,
  QuickInventorySlot,
  VoiceMode,
} from '../types/game';
import { CAMPAIGN_LEVELS } from './campaignData';

export const MAX_PLAYER_HP = 1000;
export const MONSTER_CONTACT_DAMAGE = 100;
export const DAMAGE_COOLDOWN_SECONDS = 1.6;
export const QUICK_SLOT_COUNT = 6;

export const DEFAULT_KEY_BINDINGS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  crouch: 'KeyC',
  jump: 'Space',
  flashlight: 'KeyF',
  brightness: 'KeyG',
  interact: 'KeyE',
  drop: 'KeyQ',
  useItem: 'KeyU',
  pushToTalk: 'KeyV',
  pause: 'KeyP',
};

export const DEFAULT_SETTINGS: GameSettings = {
  language: 'en',
  graphicsQuality: 'adaptive',
  resolutionScale: 1.0,
  shadowQuality: 'medium',
  textureQuality: 'high',
  lightingQuality: 'medium',
  effectsQuality: 'medium',
  antialiasing: true,
  viewDistance: 95,
  ambientOcclusion: true,
  motionBlur: false,
  vsync: true,
  fpsLimit: 90,
  mouseSensitivity: 1.0,
  mobileLookSensitivity: 1.0,
  mobileControlScale: 1.0,
  touchControlsMode: 'auto',
  masterVolume: 0.85,
  musicVolume: 0.7,
  ambienceVolume: 0.78,
  npcVolume: 0.9,
  monsterVolume: 0.95,
  voiceVolume: 0.9,
  voiceMode: 'radio',
  voiceInputDeviceId: 'default',
  uiVolume: 0.85,
  sfxVolume: 0.9,
  pushToTalk: false,
  micEnabled: false,
  muted: false,
  showFps: false,
  batteryDrainEnabled: true,
  walkSpeed: 3.4,
  sprintSpeed: 6.1,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
};

export type GraphicsPresetConfig = Pick<
  GameSettings,
  | 'resolutionScale'
  | 'shadowQuality'
  | 'textureQuality'
  | 'lightingQuality'
  | 'effectsQuality'
  | 'antialiasing'
  | 'viewDistance'
  | 'ambientOcclusion'
  | 'motionBlur'
  | 'vsync'
  | 'fpsLimit'
>;

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPresetConfig> = {
  very_low: {
    resolutionScale: 0.65,
    shadowQuality: 'off',
    textureQuality: 'low',
    lightingQuality: 'low',
    effectsQuality: 'low',
    antialiasing: false,
    viewDistance: 50,
    ambientOcclusion: false,
    motionBlur: false,
    vsync: false,
    fpsLimit: 90,
  },
  low: {
    resolutionScale: 0.75,
    shadowQuality: 'off',
    textureQuality: 'low',
    lightingQuality: 'low',
    effectsQuality: 'low',
    antialiasing: false,
    viewDistance: 65,
    ambientOcclusion: false,
    motionBlur: false,
    vsync: true,
    fpsLimit: 90,
  },
  medium: {
    resolutionScale: 0.9,
    shadowQuality: 'medium',
    textureQuality: 'medium',
    lightingQuality: 'medium',
    effectsQuality: 'medium',
    antialiasing: true,
    viewDistance: 85,
    ambientOcclusion: true,
    motionBlur: false,
    vsync: true,
    fpsLimit: 90,
  },
  high: {
    resolutionScale: 1.0,
    shadowQuality: 'high',
    textureQuality: 'high',
    lightingQuality: 'high',
    effectsQuality: 'high',
    antialiasing: true,
    viewDistance: 105,
    ambientOcclusion: true,
    motionBlur: true,
    vsync: true,
    fpsLimit: 90,
  },
  ultra: {
    resolutionScale: 1.0,
    shadowQuality: 'high',
    textureQuality: 'high',
    lightingQuality: 'high',
    effectsQuality: 'high',
    antialiasing: true,
    viewDistance: 120,
    ambientOcclusion: true,
    motionBlur: true,
    vsync: false,
    fpsLimit: 120,
  },
  adaptive: {
    resolutionScale: 0.95,
    shadowQuality: 'medium',
    textureQuality: 'high',
    lightingQuality: 'medium',
    effectsQuality: 'medium',
    antialiasing: true,
    viewDistance: 95,
    ambientOcclusion: true,
    motionBlur: false,
    vsync: true,
    fpsLimit: 90,
  },
};

export function applyGraphicsPreset(
  settings: GameSettings,
  preset: GraphicsQuality
): GameSettings {
  return {
    ...settings,
    graphicsQuality: preset,
    ...GRAPHICS_PRESETS[preset],
  };
}

export function selectDynamicAudioState(params: {
  level: number;
  monsterAlertLevel: number;
  isChased: boolean;
  npcDialogueOpen: boolean;
  exitUnlocked: boolean;
  inSilenceWindow: boolean;
}): DynamicMusicState {
  if (params.inSilenceWindow) return 'silence';
  if (params.isChased || params.monsterAlertLevel >= 0.72) return 'chase';
  if (params.monsterAlertLevel >= 0.42) return 'danger';
  if (params.npcDialogueOpen) return 'npc_encounter';
  if (params.exitUnlocked && params.level >= 7) return 'escape';
  if (params.monsterAlertLevel >= 0.16) return 'suspicion';
  return 'exploration';
}

/**
 * Five balanced playable characters with distinct personalities, advantages, and trade-offs.
 */
export const CHARACTER_PROFILES: PlayableCharacterProfile[] = [
  {
    id: 'ty',
    codename: 'TY',
    title: 'Wealthy Collector',
    personality: [
      'Slightly overweight',
      'Wealthy family background',
      'Drawn to valuable antiques',
      'Occasionally grumbles under pressure',
    ],
    specialAbility: 'RESOURCE ADVANTAGE',
    advantages: [
      '+2 inventory slots & +1 starting spare battery',
      'Spots hidden valuable relics at extended range',
      'Efficient D-Cell battery management',
    ],
    tradeoff: 'Lower sprint endurance (88 Max Stamina, +12% sprint drain)',
    maxHp: MAX_PLAYER_HP,
    maxStamina: 88,
    staminaDrainMult: 1.12,
    staminaRecoveryMult: 0.96,
    nervousRecoveryMult: 1.0,
    speedMult: 0.96,
    inventoryCapacity: 7,
    startingSpareBatteries: 2,
    interactRange: 3.0,
    batteryEfficiency: 1.1,
    colors: {
      primary: '#7c2d2d', // Burgundy sweater vest
      secondary: '#d6cbb5', // Cream shirt sleeves
      accent: '#d4af37', // Gold watch / cuff
      skin: '#dfb694',
      hair: '#1c1816',
    },
  },
  {
    id: 'nam',
    codename: 'NAM',
    title: 'Logical Analyst',
    personality: [
      'Exceptionally intelligent',
      'Methodical logical thinker',
      'Easily startled by paranormal events',
      'Becomes nervous during flickers',
    ],
    specialAbility: 'ANALYTICAL THINKING',
    advantages: [
      'Decodes hidden cipher patterns & numeric codes on notes',
      'Receives extra puzzle logic hints on terminals',
      'Clearer insight on locked mechanisms',
    ],
    tradeoff: 'Slower stamina recovery while frightened during paranormal events',
    maxHp: MAX_PLAYER_HP,
    maxStamina: 98,
    staminaDrainMult: 1.0,
    staminaRecoveryMult: 1.0,
    nervousRecoveryMult: 0.7,
    speedMult: 1.0,
    inventoryCapacity: 5,
    startingSpareBatteries: 1,
    interactRange: 3.0,
    batteryEfficiency: 1.0,
    colors: {
      primary: '#2c3540', // Charcoal blazer
      secondary: '#dce1e6', // Crisp white shirt
      accent: '#8a9ba8', // Silver glasses frame
      skin: '#e5c1a1',
      hair: '#14161a',
    },
  },
  {
    id: 'hoa',
    codename: 'HOA',
    title: 'Sharp Investigator',
    personality: [
      'Quick thinker',
      'Highly intelligent & perceptive',
      'Notices tiny environmental anomalies',
      'Calm problem solver',
    ],
    specialAbility: 'QUICK ANALYSIS',
    advantages: [
      'Extended object inspection range (3.5m)',
      'Reveals hidden clue annotations on objects & notes',
      'Detects secret switches & solves mechanisms faster',
    ],
    tradeoff: 'Standard physical endurance & base carry capacity',
    maxHp: MAX_PLAYER_HP,
    maxStamina: 95,
    staminaDrainMult: 1.02,
    staminaRecoveryMult: 1.02,
    nervousRecoveryMult: 0.95,
    speedMult: 1.01,
    inventoryCapacity: 5,
    startingSpareBatteries: 1,
    interactRange: 3.55,
    batteryEfficiency: 1.05,
    colors: {
      primary: '#3f4a3c', // Olive trench coat
      secondary: '#262423', // Dark turtleneck
      accent: '#8a623c', // Leather satchel strap
      skin: '#e7c3a3',
      hair: '#1a1514',
    },
  },
  {
    id: 'hai',
    codename: 'HAI',
    title: 'Varsity Sprinter',
    personality: [
      'Agile & physically strong',
      'Fastest runner in the group',
      'High stamina reserve',
      'Protective under chase pressure',
    ],
    specialAbility: 'ATHLETIC ADVANTAGE',
    advantages: [
      'Highest sprint endurance (125 Max Stamina)',
      '+28% faster stamina recovery & +10% movement speed',
      'Quickest physical door & barricade interactions',
    ],
    tradeoff: 'No puzzle/dialogue bonus & standard flashlight efficiency',
    maxHp: MAX_PLAYER_HP,
    maxStamina: 125,
    staminaDrainMult: 0.88,
    staminaRecoveryMult: 1.28,
    nervousRecoveryMult: 1.05,
    speedMult: 1.1,
    inventoryCapacity: 5,
    startingSpareBatteries: 1,
    interactRange: 2.9,
    batteryEfficiency: 0.95,
    colors: {
      primary: '#233b4d', // Track jacket navy
      secondary: '#363b3e', // Cargo pants
      accent: '#d97724', // Track stripe / wrist tape
      skin: '#d4a682',
      hair: '#18181b',
    },
  },
  {
    id: 'phuong',
    codename: 'PHUONG',
    title: 'Empathic Communicator',
    personality: [
      'Deeply understands emotions',
      'Playful & teasing even in tense halls',
      'Skilled communicator',
      'Socially confident under stress',
    ],
    specialAbility: 'EMOTIONAL INTELLIGENCE',
    advantages: [
      'Reads NPC emotional cues & detects deceptive statements',
      'Unlocks exclusive dialogue options with school spirits/NPCs',
      'Maintains composure during electrical & paranormal shocks',
    ],
    tradeoff: 'Slightly lower carrying capacity compared to Ty',
    maxHp: MAX_PLAYER_HP,
    maxStamina: 102,
    staminaDrainMult: 0.98,
    staminaRecoveryMult: 1.06,
    nervousRecoveryMult: 1.15,
    speedMult: 1.02,
    inventoryCapacity: 5,
    startingSpareBatteries: 1,
    interactRange: 3.1,
    batteryEfficiency: 1.0,
    colors: {
      primary: '#57364c', // Plum knit cardigan
      secondary: '#cfd1d4', // Collared blouse
      accent: '#c9a66b', // Brass hair clip / ribbon
      skin: '#ebd0b7',
      hair: '#241916',
    },
  },
];

export function getCharacterProfile(id: CharacterId | null | undefined): PlayableCharacterProfile {
  return CHARACTER_PROFILES.find((c) => c.id === id) ?? CHARACTER_PROFILES[0];
}

/**
 * Ten connected campaign levels spanning the entire abandoned school (Very Easy -> Maximum).
 */
export const LEVEL_CONFIGS: LevelConfig[] = CAMPAIGN_LEVELS;

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  active?: boolean;
}

export interface StaminaState {
  stamina: number;
  maxStamina: number;
  exhaustedCooldown: number;
}

export function updateStamina(
  state: StaminaState,
  wantsSprint: boolean,
  isMoving: boolean,
  isCrouching: boolean,
  dt: number,
  opts?: {
    drainMult?: number;
    recoveryMult?: number;
    isNervous?: boolean;
    nervousRecoveryMult?: number;
  }
): { state: StaminaState; canSprint: boolean } {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);
  let { stamina, maxStamina, exhaustedCooldown } = state;

  if (exhaustedCooldown > 0) {
    exhaustedCooldown = Math.max(0, exhaustedCooldown - clampedDt);
  }

  const actuallySprinting =
    wantsSprint && isMoving && !isCrouching && exhaustedCooldown <= 0 && stamina > 0.5;

  if (actuallySprinting) {
    const drainMult = opts?.drainMult ?? 1.0;
    stamina = Math.max(0, stamina - 24 * drainMult * clampedDt);
    if (stamina <= 0.5) {
      stamina = 0;
      exhaustedCooldown = 1.6;
    }
  } else {
    const baseRate = isMoving ? 13 : 21;
    const recMult =
      (opts?.recoveryMult ?? 1.0) *
      (opts?.isNervous ? opts.nervousRecoveryMult ?? 1.0 : 1.0);
    stamina = Math.min(maxStamina, stamina + baseRate * recMult * clampedDt);
  }

  return {
    state: { stamina, maxStamina, exhaustedCooldown },
    canSprint: actuallySprinting,
  };
}

export interface FlashlightState {
  on: boolean;
  brightness: FlashlightBrightness;
  battery: number;
  flickerTimer: number;
  flickerIntensity: number;
}

export interface FlashlightBeamConfig {
  brightness: FlashlightBrightness;
  fullBeamAngleDeg: number;
  spotAngleRad: number; // Three.js SpotLight half-angle in radians (33..39.5 deg => 66..79 deg full circular cone)
  intensity: number;
  distance: number;
  penumbra: number;
  decay: number;
  coneRadius: number;
  coneLength: number;
  coneOpacity: number;
}

export function getFlashlightBeamConfig(brightness: FlashlightBrightness): FlashlightBeamConfig {
  if (brightness === 1) {
    // ~68 deg circular beam: softer stealth illumination without clipping or square edges
    return {
      brightness: 1,
      fullBeamAngleDeg: 68,
      spotAngleRad: (34 * Math.PI) / 180,
      intensity: 12.0,
      distance: 38,
      penumbra: 0.78,
      decay: 0.92,
      coneRadius: 0.85,
      coneLength: 3.4,
      coneOpacity: 0.048,
    };
  }
  if (brightness === 3) {
    // 80 deg maximum circular floodlight: bright central core, huge coverage, smooth outer falloff
    return {
      brightness: 3,
      fullBeamAngleDeg: 80,
      spotAngleRad: (40 * Math.PI) / 180,
      intensity: 34.0,
      distance: 64,
      penumbra: 0.82,
      decay: 0.76,
      coneRadius: 1.32,
      coneLength: 5.0,
      coneOpacity: 0.088,
    };
  }
  // Brightness 2: ~75 deg wide circular flashlight beam
  return {
    brightness: 2,
    fullBeamAngleDeg: 75,
    spotAngleRad: (37.5 * Math.PI) / 180,
    intensity: 21.0,
    distance: 50,
    penumbra: 0.8,
    decay: 0.84,
    coneRadius: 1.08,
    coneLength: 4.2,
    coneOpacity: 0.068,
  };
}

/**
 * Computes a flashlight origin slightly offset from the player's camera while pulling back
 * if an active wall/door collider is in front so the spotlight never clips past a solid wall.
 */
export function computeSafeFlashlightOrigin(
  camPos: { x: number; y: number; z: number },
  forward: { x: number; y: number; z: number },
  right: { x: number; y: number; z: number },
  colliders: ColliderBox[]
): { x: number; y: number; z: number } {
  const targetX = camPos.x + right.x * 0.12 + forward.x * 0.16;
  const targetY = camPos.y - 0.11 + forward.y * 0.16;
  const targetZ = camPos.z + right.z * 0.12 + forward.z * 0.16;

  // Check intermediate points along ray from camera eye to desired flashlight emitter position
  const steps = 4;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const px = camPos.x + (targetX - camPos.x) * t;
    const py = camPos.y + (targetY - camPos.y) * t;
    const pz = camPos.z + (targetZ - camPos.z) * t;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (box.active === false) continue;
      if (py < box.minY || py > box.maxY) continue;
      if (
        px >= box.minX - 0.06 &&
        px <= box.maxX + 0.06 &&
        pz >= box.minZ - 0.06 &&
        pz <= box.maxZ + 0.06
      ) {
        // Pull back behind the collision boundary so light stays on the player's side of the wall
        const safeT = Math.max(0, (s - 1.5) / steps);
        return {
          x: camPos.x + (targetX - camPos.x) * safeT - forward.x * 0.04,
          y: camPos.y - 0.08,
          z: camPos.z + (targetZ - camPos.z) * safeT - forward.z * 0.04,
        };
      }
    }
  }

  return { x: targetX, y: targetY, z: targetZ };
}

export function cycleFlashlightBrightness(
  current: FlashlightBrightness
): FlashlightBrightness {
  if (current === 1) return 2;
  if (current === 2) return 3;
  return 1;
}

export function updateFlashlight(
  state: FlashlightState,
  drainEnabled: boolean,
  levelDrainMult: number,
  dt: number,
  efficiencyMult = 1.0
): FlashlightState {
  const clampedDt = Math.min(Math.max(dt, 0), 0.05);
  let { on, brightness, battery, flickerTimer, flickerIntensity } = state;

  if (on && drainEnabled) {
    const brightnessMult = brightness === 1 ? 0.45 : brightness === 2 ? 0.85 : 1.45;
    battery = Math.max(
      0,
      battery - (0.65 * brightnessMult * levelDrainMult * clampedDt) / Math.max(0.5, efficiencyMult)
    );
    if (battery <= 0) {
      battery = 0;
      on = false;
    }
  }

  if (flickerTimer > 0) {
    flickerTimer = Math.max(0, flickerTimer - clampedDt);
    flickerIntensity = flickerTimer > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(flickerTimer * 42)) : 1;
  } else if (on && battery < 8) {
    // Subtle low-battery dim warning only below 8% without jarring strobing
    flickerIntensity = 0.82 + 0.18 * Math.sin(performance.now() * 0.012);
  } else {
    flickerIntensity = 1;
  }

  return { on, brightness, battery, flickerTimer, flickerIntensity };
}

/**
 * Resolves 2D circle-vs-AABB collision on the active vertical slice so player glides smoothly along walls.
 */
export function resolvePlayerMovement(
  pos: { x: number; y: number; z: number },
  moveDelta: { dx: number; dz: number },
  radius: number,
  colliders: ColliderBox[]
): { x: number; z: number } {
  let x = pos.x;
  let z = pos.z;
  const footMinY = pos.y + 0.25;
  const headMaxY = pos.y + 1.55;

  const distTotal = Math.hypot(moveDelta.dx, moveDelta.dz);
  const subSteps = Math.max(1, Math.min(16, Math.ceil(distTotal / 0.14)));
  const stepDx = moveDelta.dx / subSteps;
  const stepDz = moveDelta.dz / subSteps;

  for (let step = 0; step < subSteps; step++) {
    x += stepDx;
    z += stepDz;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < colliders.length; i++) {
        const box = colliders[i];
        if (box.active === false) continue;
        if (box.maxY <= footMinY || box.minY >= headMaxY) continue;

        const closestX = Math.max(box.minX, Math.min(x, box.maxX));
        const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));

        const distX = x - closestX;
        const distZ = z - closestZ;
        const distSq = distX * distX + distZ * distZ;

        if (distSq < radius * radius) {
          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            x += (distX / dist) * overlap;
            z += (distZ / dist) * overlap;
          } else {
            const penLeft = Math.abs(x - box.minX);
            const penRight = Math.abs(box.maxX - x);
            const penFront = Math.abs(z - box.minZ);
            const penBack = Math.abs(box.maxZ - z);
            const minPen = Math.min(penLeft, penRight, penFront, penBack);
            if (minPen === penLeft) x = box.minX - radius;
            else if (minPen === penRight) x = box.maxX + radius;
            else if (minPen === penFront) z = box.minZ - radius;
            else z = box.maxZ + radius;
          }
        }
      }
    }
  }

  return { x, z };
}

/**
 * Counts how many wall colliders sit between two 3D points on the horizontal plane
 * to attenuate and muffle proximity voice chat behind school walls.
 */
export function countWallsBetween(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  colliders: ColliderBox[]
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const steps = 10;
  let hits = 0;
  const hitIds = new Set<string>();
  const midY = (a.y + b.y) * 0.5 + 1.0;

  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    const sx = a.x + dx * t;
    const sz = a.z + dz * t;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (box.active === false || hitIds.has(box.id)) continue;
      if (box.maxY < midY || box.minY > midY) continue;
      if (sx >= box.minX && sx <= box.maxX && sz >= box.minZ && sz <= box.maxZ) {
        hitIds.add(box.id);
        hits += 1;
      }
    }
  }
  return hits;
}

/**
 * Computes spatial proximity gain and lowpass cutoff frequency for voice chat.
 */
export function computeVoiceAttenuation(
  distanceMeters: number,
  wallCount: number,
  masterVoiceVolume: number
): { gain: number; lowpassHz: number } {
  const maxDist = 28;
  if (distanceMeters >= maxDist) {
    return { gain: 0, lowpassHz: 450 };
  }
  const distFactor = Math.pow(Math.max(0, 1 - distanceMeters / maxDist), 1.65);
  const wallAtten = Math.pow(0.52, Math.min(4, wallCount));
  const gain = Math.max(0, Math.min(1, distFactor * wallAtten * masterVoiceVolume));
  const lowpassHz =
    wallCount > 0
      ? Math.max(480, 2600 / (1 + wallCount * 1.4))
      : Math.max(1800, 16000 - distanceMeters * 450);
  return { gain, lowpassHz };
}

/**
 * Deterministic WebRTC Perfect Negotiation polarity check.
 */
export function isPoliteVoicePeer(localId: string, remoteId: string): boolean {
  return localId > remoteId;
}

/**
 * Selects crisp squad-wide Radio comms or 3D Spatial wall-occluded voice attenuation.
 */
export function computeVoiceModeMix(
  voiceMode: VoiceMode,
  distanceMeters: number,
  wallCount: number,
  masterVoiceVolume: number
): { gain: number; lowpassHz: number } {
  const clampedVol = Math.max(0, Math.min(1, masterVoiceVolume));
  if (voiceMode === 'radio') {
    return { gain: clampedVol, lowpassHz: 14000 };
  }
  return computeVoiceAttenuation(distanceMeters, wallCount, clampedVol);
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

/**
 * Parses optional VITE_WEBRTC_ICE_SERVERS_JSON while keeping multi-STUN fallback resilient.
 */
export function parseIceServersConfig(jsonStr?: string): RTCIceServer[] {
  if (!jsonStr || !jsonStr.trim()) {
    return DEFAULT_ICE_SERVERS.map((s) => ({ ...s }));
  }
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (item): item is RTCIceServer =>
          Boolean(item) &&
          typeof item === 'object' &&
          'urls' in item &&
          (typeof (item as RTCIceServer).urls === 'string' ||
            Array.isArray((item as RTCIceServer).urls))
      );
      if (valid.length > 0) return valid;
    }
  } catch {
    // Fall back to default multi-STUN list on malformed JSON
  }
  return DEFAULT_ICE_SERVERS.map((s) => ({ ...s }));
}

export function getLevelConfig(level: number): LevelConfig {
  const idx = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, Math.floor(level) - 1));
  return LEVEL_CONFIGS[idx];
}

export function getAdaptiveResolutionScale(
  currentScale: number,
  avgFps: number,
  targetFps = 90
): number {
  if (avgFps < targetFps * 0.6) {
    return Math.max(0.65, Number((currentScale - 0.08).toFixed(2)));
  }
  if (avgFps > targetFps * 0.92 && currentScale < 1.0) {
    return Math.min(1.0, Number((currentScale + 0.04).toFixed(2)));
  }
  return currentScale;
}

export function generateRoomCode(rng: () => number = Math.random): string {
  const n = Math.floor(100000 + rng() * 900000);
  return String(n);
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function applyPlayerDamage(
  currentHp: number,
  damage: number,
  cooldownRemaining: number
): { hp: number; appliedDamage: number; isDowned: boolean; nextCooldown: number } {
  if (cooldownRemaining > 0 || currentHp <= 0) {
    return {
      hp: Math.max(0, currentHp),
      appliedDamage: 0,
      isDowned: currentHp <= 0,
      nextCooldown: Math.max(0, cooldownRemaining),
    };
  }
  const nextHp = Math.max(0, currentHp - Math.max(0, damage));
  return {
    hp: nextHp,
    appliedDamage: currentHp - nextHp,
    isDowned: nextHp <= 0,
    nextCooldown: DAMAGE_COOLDOWN_SECONDS,
  };
}

export function applyPlayerHeal(
  currentHp: number,
  maxHp: number,
  healAmount: number
): { hp: number; healed: number } {
  if (currentHp <= 0 || currentHp >= maxHp || healAmount <= 0) {
    return { hp: Math.max(0, Math.min(maxHp, currentHp)), healed: 0 };
  }
  const nextHp = Math.min(maxHp, currentHp + healAmount);
  return { hp: nextHp, healed: nextHp - currentHp };
}

export function createEmptyQuickSlots(): Array<QuickInventorySlot | null> {
  return Array.from({ length: QUICK_SLOT_COUNT }, () => null);
}

export function addItemToQuickSlots(
  slots: Array<QuickInventorySlot | null>,
  item: InventoryItem,
  maxStack = 5
): { slots: Array<QuickInventorySlot | null>; added: boolean; slotIndex: number } {
  const next = slots.map((s) => (s ? { item: s.item, quantity: s.quantity } : null));
  const stackable =
    item.kind === 'battery' || item.kind === 'healing' || item.kind === 'component';
  if (stackable) {
    const existingIdx = next.findIndex(
      (s) => s !== null && s.item.kind === item.kind && s.item.name === item.name && s.quantity < maxStack
    );
    if (existingIdx !== -1 && next[existingIdx]) {
      next[existingIdx] = {
        item: next[existingIdx]!.item,
        quantity: next[existingIdx]!.quantity + 1,
      };
      return { slots: next, added: true, slotIndex: existingIdx };
    }
  }
  const emptyIdx = next.findIndex((s) => s === null);
  if (emptyIdx === -1) {
    return { slots: next, added: false, slotIndex: -1 };
  }
  next[emptyIdx] = { item, quantity: 1 };
  return { slots: next, added: true, slotIndex: emptyIdx };
}

export function consumeQuickSlot(
  slots: Array<QuickInventorySlot | null>,
  slotIndex: number
): { slots: Array<QuickInventorySlot | null>; consumedItem: InventoryItem | null } {
  if (slotIndex < 0 || slotIndex >= slots.length) {
    return { slots, consumedItem: null };
  }
  const entry = slots[slotIndex];
  if (!entry) return { slots, consumedItem: null };
  if (entry.item.kind === 'key' || entry.item.kind === 'access_card') {
    return { slots, consumedItem: null };
  }
  const next = slots.map((s) => (s ? { item: s.item, quantity: s.quantity } : null));
  if (entry.quantity > 1) {
    next[slotIndex] = { item: entry.item, quantity: entry.quantity - 1 };
  } else {
    next[slotIndex] = null;
  }
  return { slots: next, consumedItem: entry.item };
}

export function flattenQuickSlots(slots: Array<QuickInventorySlot | null>): InventoryItem[] {
  const result: InventoryItem[] = [];
  for (const s of slots) {
    if (s) result.push(s.item);
  }
  return result;
}

