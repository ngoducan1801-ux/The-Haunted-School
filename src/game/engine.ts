import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  CharacterId,
  DynamicMusicState,
  FlashlightBrightness,
  GameSettings,
  GameState,
  HudSnapshot,
  InventoryItem,
  JumpScareType,
  LevelObjectiveItem,
  NetworkPlayerState,
  NoteDocument,
  NpcDialogueOption,
  NpcDialogueSession,
  PlayableCharacterProfile,
  PlayerAnimState,
  PuzzleDefinition,
  QuickInventorySlot,
  StageClearStats,
  WorldMutationPayload,
  WorldSyncState,
} from '../types/game';
import {
  DAMAGE_COOLDOWN_SECONDS,
  MAX_PLAYER_HP,
  MONSTER_CONTACT_DAMAGE,
  QUICK_SLOT_COUNT,
  addItemToQuickSlots,
  applyPlayerDamage,
  applyPlayerHeal,
  computeSafeFlashlightOrigin,
  consumeQuickSlot,
  createEmptyQuickSlots,
  cycleFlashlightBrightness,
  flattenQuickSlots,
  getAdaptiveResolutionScale,
  getCharacterProfile,
  getFlashlightBeamConfig,
  getLevelConfig,
  resolvePlayerMovement,
  selectDynamicAudioState,
  updateFlashlight,
  updateStamina,
  type ColliderBox,
  type FlashlightState,
  type StaminaState,
} from './rules';
import {
  PUZZLE_DEFINITIONS,
  buildControlledNpcDialogue,
  validatePuzzleAnswer,
} from './campaignData';
import {
  buildMonstersForLevel,
  computePlayerNoiseLevel,
  hasLineOfSight,
  stepMonsterAiDecision,
  updateMonsterMotion,
  type MonsterInstance,
} from './monsters';
import {
  createFlashlightBeamTexture,
  createMaterialLibrary,
  type ProceduralMaterialLibrary,
} from './proceduralAssets';
import {
  buildSchoolWorld,
  type InteractableObject,
  type SchoolWorld,
} from './schoolWorld';
import { FLOOR_ELEVATIONS, findSafeSpawnFallback } from './schoolBlueprint';
import { HorrorAudioEngine } from './audioEngine';
import {
  animateCharacterRig,
  createCharacterModel,
  createNameplateSprite,
  updateNameplateHealth,
  type CharacterRig,
} from './characters';
import {
  getUiStrings,
  localizeCharacter,
  localizeItem,
  localizeLevel,
  localizePuzzle,
  localizeZoneName,
} from './i18n';
import type { PlayerDeltaPacket } from './multiplayerClient';

// Pre-allocated scratch math helpers (zero GC inside render loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _ndcCenter = new THREE.Vector2(0, 0);

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

interface RemotePlayerEntry {
  playerId: string;
  characterId: CharacterId;
  displayName: string;
  rig: CharacterRig;
  nameplate: THREE.Sprite;
  targetPos: THREE.Vector3;
  targetYaw: number;
  targetPitch: number;
  animState: PlayerAnimState;
  isCrouching: boolean;
  isHiding: boolean;
  flashlightOn: boolean;
  flashlightBrightness: FlashlightBrightness;
  hp: number;
  maxHp: number;
  isDowned: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onStageClear: (stats: StageClearStats) => void;
  onStateChange: (state: GameState) => void;
  onWorldMutate?: (mutation: WorldMutationPayload) => void;
  onEscapePressed?: () => boolean;
}

export class SchoolHorrorEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private settings: GameSettings;

  public readonly isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mats: ProceduralMaterialLibrary;
  private world: SchoolWorld;
  private audio: HorrorAudioEngine;

  // Lighting
  private hemiLight: THREE.HemisphereLight;
  private moonLight: THREE.DirectionalLight;
  private flashlight: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;
  private flashlightTexture: THREE.CanvasTexture;

  // Game & Character State
  private gameState: GameState = 'title';
  private currentLevel = 1;
  private activeCharacterId: CharacterId = 'ty';
  private activeProfile: PlayableCharacterProfile = getCharacterProfile('ty');
  private frameId = 0;
  private lastTimeMs = performance.now();
  private disposed = false;

  // Player Physics & Camera
  private playerPos = new THREE.Vector3(0, 0, 16);
  private velocityY = 0;
  private isGrounded = true;
  private yaw = 0;
  private pitch = 0;
  private eyeHeight = 1.68;
  private walkDistance = 0;
  private stepDistAccum = 0;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private currentAnimState: PlayerAnimState = 'idle';

  // Player States (1000 HP + Stamina + Flashlight)
  private hp = MAX_PLAYER_HP;
  private maxHp = MAX_PLAYER_HP;
  private isDowned = false;
  private damageCooldown = 0;
  private damageFlashTimer = 0;
  private lowHealthWarned = false;
  private isMultiplayerMode = false;
  private defeatTriggered = false;

  private staminaState: StaminaState = { stamina: 100, maxStamina: 100, exhaustedCooldown: 0 };
  private flashlightState: FlashlightState = {
    on: true,
    brightness: 3,
    battery: 100,
    flickerTimer: 0,
    flickerIntensity: 1,
  };
  private isCrouching = false;
  private isHiding = false;
  private activeHidingSpot: InteractableObject | null = null;
  private preHidePos = new THREE.Vector3();
  private preHideYaw = 0;

  // Progression, 6-Slot Inventory, Puzzles, Monsters & Dialogue
  private quickSlots: Array<QuickInventorySlot | null> = createEmptyQuickSlots();
  private selectedSlotIndex = 0;
  private inventory: InventoryItem[] = [];
  private batteryReserves = 1;
  private batteriesUsed = 0;
  private activatedSwitches = new Set<string>();
  private notesFound = new Set<string>();
  private secretsFound = new Set<string>();
  private solvedPuzzles = new Set<string>();
  private completedObjectives = new Set<string>();
  private npcMemoryFlags = new Set<string>();
  private litCandles = new Set<string>();
  private activeNote: NoteDocument | null = null;
  private activeNpcDialogue: NpcDialogueSession | null = null;
  private activePuzzle: PuzzleDefinition | null = null;
  private monsters: MonsterInstance[] = [];
  private playerNoiseLevel = 0.06;
  private monsterAlertLevel = 0;
  private isChasedNow = false;
  private witchWhisper: string | null = null;
  private witchWhisperTimer = 0;
  private statusBanner: string | null = null;
  private statusBannerTimer = 0;
  private levelElapsedSeconds = 0;
  private supernaturalTimer = 6;
  private tyRelicHintCooldown = 0;

  // Part 4 Audio, Jump Scares, Environmental Horror & Perf Telemetry
  private maxAnisotropy = 1;
  private currentAudioState: DynamicMusicState = 'exploration';
  private silenceTimer = 0;
  private nextSilenceCheckTime = 24;
  private blackoutTimer = 0;
  private jumpScareCooldown = 16;
  private scareApparitionTimer = 0;
  private jumpScareFlashTimer = 0;
  private cameraShakeAmount = 0;
  private distortionIntensity = 0;
  private breathCooldown = 0;
  private leftReceptionOnce = false;
  private lastAppliedHorrorEventId: string | null = null;
  private activeLightsCount = 0;
  private culledGroupsCount = 0;
  private lastRenderTimeMs = 0;

  // Multiplayer Remote Players & Mobile Virtual Input
  private remotePlayers = new Map<string, RemotePlayerEntry>();
  private inputSuppressed = false;
  private virtualMoveX = 0;
  private virtualMoveZ = 0;
  private virtualSprint = false;

  // Input
  private keysHeld = new Set<string>();
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerLocked = false;
  private raycaster = new THREE.Raycaster();
  private lookedAt: InteractableObject | null = null;

  // Performance & Adaptive Resolution
  private fpsSamples: number[] = [];
  private currentFps = 60;
  private adaptiveScale = 1.0;
  private lastHudEmitMs = 0;
  private lastAdaptiveCheckMs = 0;
  private titleTourTime = 0;

  // Event listeners cleanup
  private cleanupListeners: (() => void)[] = [];

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.settings = initialSettings;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.audio = new HorrorAudioEngine(initialSettings);

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialSettings.antialiasing,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.isSoftwareGl,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled =
      !this.isSoftwareGl &&
      initialSettings.shadowQuality !== 'off' &&
      initialSettings.graphicsQuality !== 'low' &&
      initialSettings.graphicsQuality !== 'very_low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyRendererResolution();

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    const bgColor = new THREE.Color(0x05070a);
    this.scene.background = bgColor;
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.042);

    // 3. Studio Environment Reflections (PMREM + RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = initialSettings.ambientOcclusion ? 0.26 : 0.12;
    pmrem.dispose();

    // 4. Camera (First-person only)
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.08, Math.max(45, initialSettings.viewDistance));
    this.camera.rotation.order = 'YXZ';

    // 5. Lighting: Cool Moonlit Hemisphere + Directional Key + Player Flashlight
    this.hemiLight = new THREE.HemisphereLight(0x2e4159, 0x0a0908, 0.22);
    this.scene.add(this.hemiLight);

    this.moonLight = new THREE.DirectionalLight(0x6c88ad, 0.55);
    this.moonLight.position.set(18, 28, 32);
    if (!this.isSoftwareGl) {
      this.moonLight.castShadow = true;
      this.moonLight.shadow.mapSize.set(1024, 1024);
      this.moonLight.shadow.camera.near = 2;
      this.moonLight.shadow.camera.far = 75;
      const d = 28;
      this.moonLight.shadow.camera.left = -d;
      this.moonLight.shadow.camera.right = d;
      this.moonLight.shadow.camera.top = d;
      this.moonLight.shadow.camera.bottom = -d;
      this.moonLight.shadow.bias = -0.0005;
      this.moonLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.moonLight);

    // Player Flashlight SpotLight (wide circular beam with smooth radial falloff texture)
    const initialBeam = getFlashlightBeamConfig(this.flashlightState.brightness);
    this.flashlightTexture = createFlashlightBeamTexture(512);
    this.flashlight = new THREE.SpotLight(
      0xfff2dc,
      initialBeam.intensity,
      initialBeam.distance,
      initialBeam.spotAngleRad,
      initialBeam.penumbra,
      initialBeam.decay
    );
    this.flashlight.map = this.flashlightTexture;
    this.flashlight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.flashlight.shadow.mapSize.set(1024, 1024);
      this.flashlight.shadow.camera.near = 0.12;
      this.flashlight.shadow.camera.far = initialBeam.distance;
      this.flashlight.shadow.focus = 1;
      this.flashlight.shadow.bias = -0.00025;
      this.flashlight.shadow.normalBias = 0.02;
    }
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    // 6. Materials & School World
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.mats = createMaterialLibrary(this.maxAnisotropy, this.isSoftwareGl);
    this.world = buildSchoolWorld(this.scene, this.mats, this.isSoftwareGl);
    this.validateWorldReadiness();
    this.applyGraphicsSettings(initialSettings);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.raycaster.far = 3.0;
    this.bindInputListeners();
    this.applyLevelAtmosphere(1);
    this.startLoop();
  }

  private applyRendererResolution(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    let baseRatio = this.isSoftwareGl ? 0.6 : Math.min(window.devicePixelRatio, 2);
    if (!this.isSoftwareGl) {
      if (this.settings.graphicsQuality === 'very_low') baseRatio = Math.min(baseRatio, 0.85);
      else if (this.settings.graphicsQuality === 'low') baseRatio = Math.min(baseRatio, 1.0);
      else if (this.settings.graphicsQuality === 'medium') baseRatio = Math.min(baseRatio, 1.35);
      const scale =
        this.settings.graphicsQuality === 'adaptive'
          ? this.adaptiveScale * this.settings.resolutionScale
          : this.settings.resolutionScale;
      baseRatio = Math.max(0.6, baseRatio * scale);
    }
    this.renderer.setPixelRatio(baseRatio);
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.world && this.scene && this.camera) {
      this.update(0.001, performance.now());
      this.renderer.render(this.scene, this.camera);
    }
  }

  private applyGraphicsSettings(next: GameSettings): void {
    const shadowsEnabled =
      !this.isSoftwareGl &&
      next.shadowQuality !== 'off' &&
      next.graphicsQuality !== 'very_low' &&
      next.graphicsQuality !== 'low';
    this.renderer.shadowMap.enabled = shadowsEnabled;
    this.moonLight.castShadow = shadowsEnabled;
    this.flashlight.castShadow = shadowsEnabled;

    if (shadowsEnabled) {
      const sz = next.shadowQuality === 'high' ? 1536 : next.shadowQuality === 'medium' ? 1024 : 512;
      if (this.flashlight.shadow.mapSize.x !== sz) {
        this.flashlight.shadow.mapSize.set(sz, sz);
        this.flashlight.shadow.map?.dispose();
        this.flashlight.shadow.map = null;
        this.moonLight.shadow.mapSize.set(sz, sz);
        this.moonLight.shadow.map?.dispose();
        this.moonLight.shadow.map = null;
      }
    }

    const aniso =
      next.textureQuality === 'low'
        ? 1
        : next.textureQuality === 'medium'
          ? Math.min(4, this.maxAnisotropy)
          : this.maxAnisotropy;
    this.mats.setTextureAnisotropy(aniso);

    this.scene.environmentIntensity = next.ambientOcclusion ? 0.26 : 0.12;
    this.camera.far = Math.max(45, Math.min(130, next.viewDistance));
    this.camera.updateProjectionMatrix();
    this.world.dustPoints.visible = next.effectsQuality !== 'low';
  }

  public updateSettings(next: GameSettings): void {
    this.settings = next;
    this.audio.applySettings(next);
    this.applyGraphicsSettings(next);
    this.applyLevelAtmosphere(this.currentLevel);
    this.applyRendererResolution();
  }

  public playUiClick(): void {
    this.audio.init();
    this.audio.playUiClick();
  }

  public playChatNotification(): void {
    this.audio.playChatNotification();
  }

  public setInputSuppressed(suppressed: boolean): void {
    this.inputSuppressed = suppressed;
    if (suppressed) {
      this.keysHeld.clear();
      this.isDraggingLook = false;
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
    }
  }

  public setGameState(state: GameState): void {
    this.gameState = state;
    document.body.dataset.state = state;
    const inLobbyOrTitle = state === 'title' || state === 'character_select' || state === 'lobby';
    this.audio.setLobbyMode(inLobbyOrTitle);

    if (state !== 'playing') {
      this.keysHeld.clear();
      this.isDraggingLook = false;
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
    }
    this.callbacks.onStateChange(state);
    this.emitHudSnapshot(true);
  }

  public setMultiplayerMode(enabled: boolean): void {
    this.isMultiplayerMode = enabled;
  }

  public reviveLocalPlayer(restoredHp = 350): void {
    if (!this.isDowned) return;
    this.isDowned = false;
    this.hp = Math.max(350, Math.min(this.maxHp, restoredHp));
    this.damageCooldown = DAMAGE_COOLDOWN_SECONDS;
    this.lowHealthWarned = this.hp <= 300;
    this.currentAnimState = 'idle';
    const t = getUiStrings(this.settings.language);
    this.audio.playPickup('battery');
    this.showBanner(t.banners.revivedSelf, 2.8);
    this.emitHudSnapshot(true);
  }

  public setVirtualMoveVector(x: number, z: number): void {
    this.virtualMoveX = Math.max(-1, Math.min(1, x));
    this.virtualMoveZ = Math.max(-1, Math.min(1, z));
  }

  public setVirtualSprint(active: boolean): void {
    this.virtualSprint = active;
  }

  public applyVirtualLookDelta(dx: number, dy: number): void {
    if (
      this.gameState !== 'playing' ||
      this.activeNote ||
      this.activeNpcDialogue ||
      this.activePuzzle ||
      this.inputSuppressed
    ) {
      return;
    }
    const sens = 0.0042 * this.settings.mobileLookSensitivity;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const maxPitch = this.isHiding ? 0.35 : Math.PI * 0.46;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    if (this.isHiding && this.activeHidingSpot?.hideLookYaw !== undefined) {
      const baseYaw = this.activeHidingSpot.hideLookYaw;
      const diff = Math.atan2(Math.sin(this.yaw - baseYaw), Math.cos(this.yaw - baseYaw));
      this.yaw = baseYaw + Math.max(-0.45, Math.min(0.45, diff));
    }
  }

  public triggerVirtualJump(): void {
    if (this.gameState === 'playing' && !this.isDowned) {
      this.audio.init();
      this.jumpBufferTimer = 0.14;
    }
  }

  public triggerVirtualCrouch(): void {
    if (this.gameState === 'playing' && !this.isHiding && !this.isDowned) {
      this.audio.init();
      this.isCrouching = !this.isCrouching;
      this.emitHudSnapshot(true);
    }
  }

  public triggerVirtualFlashlight(): void {
    if (this.gameState !== 'playing') return;
    this.audio.init();
    const t = getUiStrings(this.settings.language);
    if (this.flashlightState.battery > 0 || !this.settings.batteryDrainEnabled) {
      this.flashlightState.on = !this.flashlightState.on;
      this.audio.playFlashlightClick();
      this.emitHudSnapshot(true);
    } else {
      this.audio.playFlashlightClick();
      this.showBanner(t.banners.batteryDepleted, 2.0);
    }
  }

  public triggerVirtualBrightness(): void {
    if (this.gameState !== 'playing') return;
    this.audio.init();
    this.flashlightState.brightness = cycleFlashlightBrightness(this.flashlightState.brightness);
    this.audio.playFlashlightClick();
    this.emitHudSnapshot(true);
  }

  public triggerVirtualInteract(): void {
    if (this.gameState !== 'playing') return;
    this.audio.init();
    this.triggerInteract();
  }

  public selectQuickSlot(index: number): void {
    if (index < 0 || index >= QUICK_SLOT_COUNT) return;
    this.selectedSlotIndex = index;
    this.audio.playUiClick();
    this.emitHudSnapshot(true);
  }

  public useQuickSlot(index = this.selectedSlotIndex): void {
    if (this.gameState !== 'playing' || this.isDowned) return;
    if (index < 0 || index >= QUICK_SLOT_COUNT) return;
    const t = getUiStrings(this.settings.language);
    const slot = this.quickSlots[index];
    if (!slot || !slot.item) {
      this.showBanner(t.banners.noUsableItem, 1.8);
      return;
    }

    if (slot.item.kind === 'healing') {
      const healRes = applyPlayerHeal(this.hp, this.maxHp, slot.item.healAmount ?? 250);
      if (healRes.healed <= 0) {
        this.showBanner(`${this.hp}/${this.maxHp} HP`, 1.6);
        return;
      }
      this.hp = healRes.hp;
      this.lowHealthWarned = this.hp <= 300;
      const res = consumeQuickSlot(this.quickSlots, index);
      this.quickSlots = res.slots;
      this.syncInventoryFromQuickSlots();
      const loc = localizeItem(slot.item, this.settings.language);
      this.audio.playPickup('battery');
      this.showBanner(t.banners.healedAmount(loc.name, healRes.healed), 2.2);
      this.emitHudSnapshot(true);
      return;
    }

    if (slot.item.kind === 'battery') {
      if (this.flashlightState.battery >= 98) {
        this.showBanner(t.banners.batteryFull, 1.8);
        return;
      }
      const res = consumeQuickSlot(this.quickSlots, index);
      this.quickSlots = res.slots;
      this.syncInventoryFromQuickSlots();
      this.batteriesUsed += 1;
      this.flashlightState.battery = Math.min(100, this.flashlightState.battery + 60);
      this.flashlightState.on = true;
      this.audio.playPickup('battery');
      this.showBanner(t.banners.batteryLoaded, 2.0);
      this.emitHudSnapshot(true);
      return;
    }

    this.showBanner(t.banners.noUsableItem, 1.8);
  }

  private syncInventoryFromQuickSlots(): void {
    this.inventory = flattenQuickSlots(this.quickSlots);
    let spare = 0;
    for (let i = 0; i < this.quickSlots.length; i++) {
      const sl = this.quickSlots[i];
      if (sl && sl.item.kind === 'battery') spare += sl.quantity;
    }
    this.batteryReserves = spare;
  }

  public startLevel(levelNumber: number, characterId: CharacterId = 'ty'): void {
    if (navigator.userActivation?.isActive) {
      this.audio.init();
    }
    this.currentLevel = Math.max(1, Math.min(10, levelNumber));
    this.activeCharacterId = characterId;
    this.activeProfile = getCharacterProfile(characterId);
    const cfg = getLevelConfig(this.currentLevel);
    const locCfg = localizeLevel(cfg, this.settings.language);
    const t = getUiStrings(this.settings.language);

    // Validate world readiness & level spawn before entering gameplay
    const safeSpawn = findSafeSpawnFallback(
      cfg.spawn,
      this.world.colliders,
      this.world.groundHeightAt
    );
    if (safeSpawn.fallbackUsed) {
      console.warn(
        `[SchoolHorrorEngine] Spawn fallback activated for Level ${this.currentLevel}: ${safeSpawn.reason}`
      );
    }
    this.playerPos.set(safeSpawn.pos.x, safeSpawn.pos.y, safeSpawn.pos.z);
    this.yaw = cfg.spawn.yaw;
    this.pitch = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.eyeHeight = 1.68;
    this.isCrouching = false;
    this.isHiding = false;
    this.activeHidingSpot = null;
    this.activeNote = null;
    this.activeNpcDialogue = null;
    this.activePuzzle = null;
    this.inputSuppressed = false;
    this.currentAnimState = 'idle';
    this.hp = this.activeProfile.maxHp;
    this.maxHp = this.activeProfile.maxHp;
    this.isDowned = false;
    this.damageCooldown = 0;
    this.damageFlashTimer = 0;
    this.lowHealthWarned = false;
    this.defeatTriggered = false;
    this.isChasedNow = false;
    this.virtualMoveX = 0;
    this.virtualMoveZ = 0;
    this.virtualSprint = false;

    this.staminaState = {
      stamina: this.activeProfile.maxStamina,
      maxStamina: this.activeProfile.maxStamina,
      exhaustedCooldown: 0,
    };
    this.flashlightState = {
      on: true,
      brightness: 3,
      battery: 100,
      flickerTimer: 0,
      flickerIntensity: 1,
    };

    this.quickSlots = createEmptyQuickSlots();
    this.selectedSlotIndex = 0;
    for (let b = 0; b < this.activeProfile.startingSpareBatteries; b++) {
      const added = addItemToQuickSlots(
        this.quickSlots,
        {
          id: 'bat_starter',
          name: 'D-Cell Battery',
          kind: 'battery',
          description: 'Restores +60% flashlight charge',
          droppable: true,
          consumable: true,
        },
        QUICK_SLOT_COUNT
      );
      this.quickSlots = added.slots;
    }
    this.syncInventoryFromQuickSlots();
    this.batteriesUsed = 0;
    this.activatedSwitches.clear();
    this.notesFound.clear();
    this.secretsFound.clear();
    this.solvedPuzzles.clear();
    this.completedObjectives.clear();
    this.npcMemoryFlags.clear();
    this.litCandles.clear();
    this.witchWhisper = null;
    this.witchWhisperTimer = 0;
    this.playerNoiseLevel = 0.06;
    this.monsterAlertLevel = 0;
    this.levelElapsedSeconds = 0;
    this.supernaturalTimer = 8 - cfg.supernaturalEventRate * 4;
    this.tyRelicHintCooldown = 0;
    this.currentAudioState = 'exploration';
    this.silenceTimer = 0;
    this.nextSilenceCheckTime = 24;
    this.blackoutTimer = 0;
    this.jumpScareCooldown = Math.max(12, 22 - this.currentLevel * 1.1);
    this.scareApparitionTimer = 0;
    this.jumpScareFlashTimer = 0;
    this.cameraShakeAmount = 0;
    this.distortionIntensity = 0;
    this.breathCooldown = 0;
    this.leftReceptionOnce = false;
    this.lastAppliedHorrorEventId = null;
    this.world.scareApparition.visible = false;
    this.world.anomalyProp.visible = false;
    this.raycaster.far = this.activeProfile.interactRange;
    this.keysHeld.clear();

    // Reset world interactables (doors closed, pickups restored, secret passages closed, candles unlit)
    for (const item of this.world.interactables) {
      if (item.type === 'door' || item.type === 'exit' || item.type === 'hiding_spot') {
        item.isOpen = false;
        item.targetAngle = 0;
        item.currentAngle = 0;
        if (item.hingePivot) item.hingePivot.rotation.y = 0;
        if (item.colliderId) {
          const col = this.world.colliders.find((c) => c.id === item.colliderId);
          if (col && item.type !== 'hiding_spot') col.active = true;
        }
      } else if (item.type === 'candle_light') {
        item.consumed = false;
        item.isOpen = false;
        item.mesh.visible = true;
        if (item.candleLight) item.candleLight.visible = false;
        if (item.candleFlame) item.candleFlame.visible = false;
      } else {
        item.consumed = false;
        item.mesh.visible = true;
        if (item.secretWallGroup) {
          item.secretWallGroup.position.x = item.secretWallClosedX ?? -22;
        }
        if (item.secretWallColliderId) {
          const col = this.world.colliders.find((c) => c.id === item.secretWallColliderId);
          if (col) col.active = true;
        }
      }
    }

    // Relocate Witch & set NPC presence for this level
    this.world.relocateWitch(this.currentLevel, cfg.witchActive);
    this.world.setNpcDisappeared('npc_deceptive_student', this.currentLevel < 2);

    // Rebuild Monster instances for this level
    for (const oldMonster of this.monsters) {
      this.world.worldGroup.remove(oldMonster.root);
    }
    this.monsters = buildMonstersForLevel(this.currentLevel, cfg.activeMonsters);
    for (const monster of this.monsters) {
      this.world.worldGroup.add(monster.root);
    }

    this.applyLevelAtmosphere(this.currentLevel);
    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.eyeHeight, this.playerPos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.updateSceneCulling();
    this.showBanner(
      this.currentLevel === 1
        ? t.banners.outsideGateArrival
        : `${t.hud.lvlShort} ${locCfg.level}: ${locCfg.name.toUpperCase()} — ${this.activeProfile.codename}`,
      3.8
    );
    this.setGameState('playing');
    this.requestLockIfAllowed();
  }

  private validateWorldReadiness(): void {
    const missingFloors = FLOOR_ELEVATIONS.filter((elev) => !this.world.floorGroups.has(elev));
    const hasMainDoor = this.world.interactables.some((d) => d.id === 'door_main_entrance');
    const hasRooftopSwitch = this.world.interactables.some((d) => d.id === 'switch_rooftop_beacon');
    if (missingFloors.length > 0 || this.world.colliders.length === 0 || !hasMainDoor || !hasRooftopSwitch) {
      console.error('[SchoolHorrorEngine] World readiness check reported incomplete structures:', {
        missingFloors,
        colliders: this.world.colliders.length,
        hasMainDoor,
        hasRooftopSwitch,
      });
    }
  }

  private applyLevelAtmosphere(level: number): void {
    const cfg = getLevelConfig(level);
    const aoFactor = this.settings.ambientOcclusion ? 1.0 : 0.72;
    this.hemiLight.intensity = cfg.ambientIntensity * aoFactor;
    const beamCfg = getFlashlightBeamConfig(this.flashlightState.brightness);
    this.flashlight.angle = beamCfg.spotAngleRad;
    this.flashlight.distance = beamCfg.distance;
    this.flashlight.penumbra = beamCfg.penumbra;
    this.flashlight.decay = beamCfg.decay;
    if (this.scene.fog instanceof THREE.FogExp2) {
      const distFactor = this.settings.viewDistance < 75 ? 1.25 : 1.0;
      this.scene.fog.density = cfg.fogDensity * distFactor;
    }
    this.supernaturalTimer = 10 + (1 - cfg.supernaturalEventRate) * 14;
  }

  public requestLockIfAllowed(): void {
    try {
      if (
        this.gameState === 'playing' &&
        !this.activeNote &&
        !this.activeNpcDialogue &&
        !this.activePuzzle &&
        !this.inputSuppressed &&
        navigator.userActivation?.isActive &&
        document.pointerLockElement !== this.renderer.domElement
      ) {
        const res = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      }
    } catch {
      // Headless or iframe fallback uses drag-look smoothly
    }
  }

  public closeNote(): void {
    this.activeNote = null;
    this.emitHudSnapshot(true);
    this.requestLockIfAllowed();
  }

  public closeNpcDialogue(): void {
    this.activeNpcDialogue = null;
    this.emitHudSnapshot(true);
    this.requestLockIfAllowed();
  }

  public closePuzzle(): void {
    this.activePuzzle = null;
    this.emitHudSnapshot(true);
    this.requestLockIfAllowed();
  }

  public submitPuzzleAnswer(puzzleId: string, answer: string): boolean {
    const puzzle = PUZZLE_DEFINITIONS[puzzleId];
    if (!puzzle) return false;
    if (!validatePuzzleAnswer(puzzle, answer)) {
      this.audio.playPuzzleFeedback(false);
      return false;
    }

    this.solvedPuzzles.add(puzzleId);
    if (puzzle.objectiveId) {
      if (puzzle.objectiveId === 'obj_l1_key') {
        if (this.inventory.some((i) => i.id === 'key_courtyard')) {
          this.completedObjectives.add('obj_l1_key');
        }
      } else {
        this.completedObjectives.add(puzzle.objectiveId);
      }
    }
    if (puzzle.rewardItem && !this.inventory.some((i) => i.id === puzzle.rewardItem!.id)) {
      const added = addItemToQuickSlots(this.quickSlots, puzzle.rewardItem, QUICK_SLOT_COUNT);
      this.quickSlots = added.slots;
      this.syncInventoryFromQuickSlots();
    }
    const target = this.world.interactables.find((i) => i.id === puzzleId);
    if (target) {
      target.consumed = true;
      target.sublabel = 'Solved';
    }
    this.audio.playPuzzleFeedback(true);
    const locPuz = localizePuzzle(puzzle, this.settings.language);
    this.showBanner(locPuz.solvedText, 3.0);
    this.callbacks.onWorldMutate?.({
      kind: 'puzzle_solve',
      puzzleId,
      objectiveId: puzzle.objectiveId,
      rewardItemId: puzzle.rewardItem?.id,
    });
    this.activePuzzle = null;
    this.emitHudSnapshot(true);
    this.requestLockIfAllowed();
    return true;
  }

  public chooseNpcOption(option: NpcDialogueOption): void {
    const npcId = this.activeNpcDialogue?.npcId;
    if (!npcId) return;

    if (option.setsMemoryFlag) {
      this.npcMemoryFlags.add(option.setsMemoryFlag);
    }
    if (option.objectiveId) {
      this.markObjective(option.objectiveId);
    }
    if (npcId === 'npc_witch' && option.id === 'witch_give_seal') {
      for (let s = 0; s < this.quickSlots.length; s++) {
        if (this.quickSlots[s]?.item.id === 'relic_seal') {
          this.quickSlots[s] = null;
        }
      }
      this.syncInventoryFromQuickSlots();
    }
    if (npcId === 'npc_witch' && this.currentLevel === 3) {
      this.markObjective('obj_l3_witch');
    }
    if (npcId === 'npc_witch' && this.currentLevel === 7) {
      this.markObjective('obj_l7_witch');
    }

    if (option.disappearsAfter) {
      this.world.setNpcDisappeared(npcId, true);
      this.audio.playWitchChime(true);
      this.witchWhisper = getUiStrings(this.settings.language).banners.witchHallwayWhisper;
      this.witchWhisperTimer = 4.2;
    } else if (npcId === 'npc_witch') {
      this.audio.playWitchChime(false);
    } else {
      this.audio.playPickup('note');
    }

    if (option.setsMemoryFlag || option.disappearsAfter) {
      this.callbacks.onWorldMutate?.({
        kind: 'npc_memory',
        flag: option.setsMemoryFlag ?? `${npcId}_${option.id}`,
        npcId,
        disappeared: Boolean(option.disappearsAfter),
      });
    }
    this.emitHudSnapshot(true);
  }

  private markObjective(objectiveId: string): void {
    if (this.completedObjectives.has(objectiveId)) return;
    this.completedObjectives.add(objectiveId);
    this.callbacks.onWorldMutate?.({ kind: 'objective_complete', objectiveId });
  }

  public reloadBattery(): void {
    const t = getUiStrings(this.settings.language);
    if (this.flashlightState.battery >= 98) {
      this.showBanner(t.banners.batteryFull, 1.8);
      return;
    }
    const batIdx = this.quickSlots.findIndex((s) => s?.item.kind === 'battery');
    if (batIdx === -1) return;
    const res = consumeQuickSlot(this.quickSlots, batIdx);
    this.quickSlots = res.slots;
    this.syncInventoryFromQuickSlots();
    this.batteriesUsed += 1;
    this.flashlightState.battery = Math.min(100, this.flashlightState.battery + 60);
    this.flashlightState.on = true;
    this.audio.playPickup('battery');
    this.showBanner(t.banners.batteryLoaded, 2.0);
    this.emitHudSnapshot(true);
  }

  public dropHeldItem(): void {
    const t = getUiStrings(this.settings.language);
    let dropIdx = -1;
    const selected = this.quickSlots[this.selectedSlotIndex];
    if (selected && selected.item.droppable) {
      dropIdx = this.selectedSlotIndex;
    } else {
      dropIdx = this.quickSlots.findIndex((s) => Boolean(s?.item.droppable));
    }

    if (dropIdx === -1) {
      this.showBanner(t.banners.cannotDropEssential, 1.8);
      return;
    }

    const res = consumeQuickSlot(this.quickSlots, dropIdx);
    const dropped = res.consumedItem;
    this.quickSlots = res.slots;
    this.syncInventoryFromQuickSlots();
    if (!dropped) return;

    const match = this.world.interactables.find((it) => it.item?.id === dropped.id);
    if (match) {
      const dropX = this.playerPos.x - Math.sin(this.yaw) * 0.9;
      const dropZ = this.playerPos.z - Math.cos(this.yaw) * 0.9;
      const dropY = this.world.groundHeightAt(dropX, dropZ, this.playerPos.y);
      match.consumed = false;
      match.mesh.position.set(dropX, dropY + 0.05, dropZ);
      match.mesh.visible = true;
      match.hitTarget.position.set(dropX, dropY + 0.2, dropZ);
      match.worldPos.set(dropX, dropY + 0.2, dropZ);
    }
    this.audio.playPickup('other');
    const loc = localizeItem(dropped, this.settings.language);
    this.showBanner(t.banners.droppedItem(loc.name), 1.8);
    this.emitHudSnapshot(true);
  }

  private showBanner(msg: string, seconds = 2.4): void {
    this.statusBanner = msg;
    this.statusBannerTimer = seconds;
  }

  // =========================================================================
  // MULTIPLAYER REMOTE PLAYERS & WORLD SYNC
  // =========================================================================

  public clearRemotePlayers(): void {
    for (const [, entry] of this.remotePlayers) {
      this.scene.remove(entry.rig.root);
      const spriteMat = entry.nameplate.material as THREE.SpriteMaterial;
      spriteMat.map?.dispose();
      spriteMat.dispose();
    }
    this.remotePlayers.clear();
  }

  public syncRemotePlayers(players: NetworkPlayerState[], localPlayerId: string | null): void {
    const activeIds = new Set<string>();
    for (const p of players) {
      if (!p.connected || p.playerId === localPlayerId || !p.characterId) continue;
      activeIds.add(p.playerId);

      const existing = this.remotePlayers.get(p.playerId);
      if (existing && existing.characterId !== p.characterId) {
        // Recreate rig if character changed
        this.scene.remove(existing.rig.root);
        const spriteMat = existing.nameplate.material as THREE.SpriteMaterial;
        spriteMat.map?.dispose();
        spriteMat.dispose();
        this.remotePlayers.delete(p.playerId);
      }

      if (!this.remotePlayers.has(p.playerId)) {
        const profile = getCharacterProfile(p.characterId);
        const allowRemoteBeam =
          !this.isSoftwareGl &&
          this.remotePlayers.size < 4 &&
          this.settings.lightingQuality !== 'low';
        const rig = createCharacterModel(p.characterId, allowRemoteBeam, this.flashlightTexture);
        rig.root.position.set(p.position.x, p.position.y, p.position.z);
        rig.root.rotation.y = p.yaw;

        const nameplate = createNameplateSprite(
          p.displayName,
          profile.codename,
          p.hp ?? MAX_PLAYER_HP,
          p.maxHp ?? MAX_PLAYER_HP,
          Boolean(p.isDowned)
        );
        rig.root.add(nameplate);
        this.scene.add(rig.root);

        this.remotePlayers.set(p.playerId, {
          playerId: p.playerId,
          characterId: p.characterId,
          displayName: p.displayName,
          rig,
          nameplate,
          targetPos: new THREE.Vector3(p.position.x, p.position.y, p.position.z),
          targetYaw: p.yaw,
          targetPitch: p.pitch,
          animState: p.animState,
          isCrouching: p.isCrouching,
          isHiding: p.isHiding,
          flashlightOn: p.flashlightOn,
          flashlightBrightness: p.flashlightBrightness ?? 2,
          hp: p.hp ?? MAX_PLAYER_HP,
          maxHp: p.maxHp ?? MAX_PLAYER_HP,
          isDowned: Boolean(p.isDowned),
        });
      } else {
        const entry = this.remotePlayers.get(p.playerId)!;
        entry.targetPos.set(p.position.x, p.position.y, p.position.z);
        entry.targetYaw = p.yaw;
        entry.targetPitch = p.pitch;
        entry.animState = p.animState;
        entry.isCrouching = p.isCrouching;
        entry.isHiding = p.isHiding;
        entry.flashlightOn = p.flashlightOn;
        entry.flashlightBrightness = p.flashlightBrightness ?? entry.flashlightBrightness;
        const nextHp = p.hp ?? entry.hp;
        const nextMax = p.maxHp ?? entry.maxHp;
        const nextDowned = Boolean(p.isDowned);
        if (nextHp !== entry.hp || nextMax !== entry.maxHp || nextDowned !== entry.isDowned) {
          entry.hp = nextHp;
          entry.maxHp = nextMax;
          entry.isDowned = nextDowned;
          updateNameplateHealth(entry.nameplate, entry.hp, entry.maxHp, entry.isDowned);
        }
      }
    }

    for (const [id, entry] of this.remotePlayers) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.rig.root);
        const spriteMat = entry.nameplate.material as THREE.SpriteMaterial;
        spriteMat.map?.dispose();
        spriteMat.dispose();
        this.remotePlayers.delete(id);
      }
    }
  }

  public applyRemotePlayerDelta(delta: PlayerDeltaPacket): void {
    const entry = this.remotePlayers.get(delta.playerId);
    if (!entry) return;
    entry.targetPos.set(delta.position.x, delta.position.y, delta.position.z);
    entry.targetYaw = delta.yaw;
    entry.targetPitch = delta.pitch;
    entry.animState = delta.animState;
    entry.isCrouching = delta.isCrouching;
    entry.isHiding = delta.isHiding;
    entry.flashlightOn = delta.flashlightOn;
    entry.flashlightBrightness = delta.flashlightBrightness ?? entry.flashlightBrightness;
    if (
      typeof delta.hp === 'number' ||
      typeof delta.maxHp === 'number' ||
      typeof delta.isDowned === 'boolean'
    ) {
      const nextHp = delta.hp ?? entry.hp;
      const nextMax = delta.maxHp ?? entry.maxHp;
      const nextDowned = delta.isDowned ?? entry.isDowned;
      if (nextHp !== entry.hp || nextMax !== entry.maxHp || nextDowned !== entry.isDowned) {
        entry.hp = nextHp;
        entry.maxHp = nextMax;
        entry.isDowned = nextDowned;
        updateNameplateHealth(entry.nameplate, entry.hp, entry.maxHp, entry.isDowned);
      }
    }
  }

  public applyFullWorldSync(worldSync: WorldSyncState): void {
    const t = getUiStrings(this.settings.language);
    // Sync doors
    for (const [doorId, isOpen] of Object.entries(worldSync.doors)) {
      const target = this.world.interactables.find((i) => i.id === doorId);
      if (target && (target.type === 'door' || target.type === 'exit')) {
        target.isOpen = isOpen;
        target.targetAngle = isOpen ? -Math.PI * 0.48 : 0;
        if (target.colliderId) {
          const col = this.world.colliders.find((c) => c.id === target.colliderId);
          if (col) col.active = !isOpen;
        }
      }
    }

    // Sync consumed items (keys shared across teammates so no soft-lock)
    for (const itemId of worldSync.consumedItems) {
      const target = this.world.interactables.find((i) => i.id === itemId);
      if (target && !target.consumed) {
        target.consumed = true;
        target.mesh.visible = false;
        if (
          target.type === 'key' &&
          target.item &&
          !this.inventory.some((inv) => inv.id === target.item!.id)
        ) {
          const added = addItemToQuickSlots(this.quickSlots, target.item, QUICK_SLOT_COUNT);
          this.quickSlots = added.slots;
          this.syncInventoryFromQuickSlots();
          const loc = localizeItem(target.item, this.settings.language);
          this.showBanner(t.banners.teammateKey(loc.name), 2.4);
        } else if (target.type === 'hidden_object') {
          this.secretsFound.add(target.id);
        }
      }
    }

    // Sync switches
    for (const switchId of worldSync.activatedSwitches) {
      if (!this.activatedSwitches.has(switchId)) {
        this.activatedSwitches.add(switchId);
        this.secretsFound.add(switchId);
        const target = this.world.interactables.find((i) => i.id === switchId);
        if (target) {
          if (target.secretWallColliderId) {
            const col = this.world.colliders.find((c) => c.id === target.secretWallColliderId);
            if (col) col.active = false;
          }
          if (target.secretWallGroup) {
            target.secretWallGroup.position.x = target.secretWallOpenX ?? -23.65;
          }
        }
      }
    }

    // Sync solved puzzles, completed objectives, NPC memory & candles
    for (const puzzleId of worldSync.solvedPuzzles ?? []) {
      if (!this.solvedPuzzles.has(puzzleId)) {
        this.solvedPuzzles.add(puzzleId);
        const target = this.world.interactables.find((i) => i.id === puzzleId);
        if (target) {
          target.consumed = true;
          target.sublabel = 'Solved';
        }
      }
    }
    for (const objId of worldSync.completedObjectives ?? []) {
      if (objId === 'obj_l1_key') {
        if (
          this.solvedPuzzles.has('puzzle_l1_circuit') &&
          this.inventory.some((inv) => inv.id === 'key_courtyard')
        ) {
          this.completedObjectives.add(objId);
        }
      } else {
        this.completedObjectives.add(objId);
      }
    }
    if (
      this.solvedPuzzles.has('puzzle_l1_circuit') &&
      this.inventory.some((inv) => inv.id === 'key_courtyard')
    ) {
      this.completedObjectives.add('obj_l1_key');
    }
    for (const flag of worldSync.npcMemoryFlags ?? []) {
      this.npcMemoryFlags.add(flag);
    }
    for (const npc of worldSync.npcs ?? []) {
      if (npc.disappeared) {
        this.world.setNpcDisappeared(npc.id, true);
      }
    }
    for (const candleId of worldSync.litCandles ?? []) {
      if (!this.litCandles.has(candleId)) {
        this.litCandles.add(candleId);
        const target = this.world.interactables.find((i) => i.id === candleId);
        if (target) {
          target.consumed = true;
          if (target.candleLight) target.candleLight.visible = true;
          if (target.candleFlame) target.candleFlame.visible = true;
        }
      }
    }

    if (worldSync.lastHorrorEvent && worldSync.lastHorrorEvent.id !== this.lastAppliedHorrorEventId) {
      this.lastAppliedHorrorEventId = worldSync.lastHorrorEvent.id;
      if (worldSync.lastHorrorEvent.eventType === 'blackout') {
        this.triggerBlackout(false);
      } else {
        this.executeJumpScare(
          worldSync.lastHorrorEvent.eventType,
          false,
          worldSync.lastHorrorEvent.targetDoorId
        );
      }
    }

    if (worldSync.completedObjective && this.gameState === 'playing') {
      this.completeCurrentLevel(true);
    }
    this.emitHudSnapshot(false);
  }

  public getPlayerTransformPacket(): Omit<PlayerDeltaPacket, 'playerId'> {
    return {
      position: {
        x: Number(this.playerPos.x.toFixed(3)),
        y: Number(this.playerPos.y.toFixed(3)),
        z: Number(this.playerPos.z.toFixed(3)),
      },
      yaw: Number(this.yaw.toFixed(4)),
      pitch: Number(this.pitch.toFixed(4)),
      animState: this.currentAnimState,
      isCrouching: this.isCrouching,
      isHiding: this.isHiding,
      flashlightOn: this.flashlightState.on,
      flashlightBrightness: this.flashlightState.brightness,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      isDowned: this.isDowned,
    };
  }

  public getPlayerPosition(): { x: number; y: number; z: number } {
    return { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z };
  }

  public getWorldColliders(): ColliderBox[] {
    return this.world.colliders;
  }

  // =========================================================================
  // INPUT LISTENERS
  // =========================================================================

  private bindInputListeners(): void {
    const onResize = () => this.applyRendererResolution();
    window.addEventListener('resize', onResize);

    const onBlur = () => {
      this.keysHeld.clear();
      this.isDraggingLook = false;
    };
    window.addEventListener('blur', onBlur);

    const onVisibility = () => {
      if (document.hidden) {
        this.keysHeld.clear();
        this.isDraggingLook = false;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
      this.emitHudSnapshot(true);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    const onMouseDown = (e: MouseEvent) => {
      if (
        this.gameState !== 'playing' ||
        this.activeNote ||
        this.activeNpcDialogue ||
        this.activePuzzle ||
        this.inputSuppressed
      ) {
        return;
      }
      if (e.target !== this.renderer.domElement) return;
      this.audio.init();
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.requestLockIfAllowed();
    };

    const onMouseUp = () => {
      this.isDraggingLook = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (
        this.gameState !== 'playing' ||
        this.activeNote ||
        this.activeNpcDialogue ||
        this.activePuzzle ||
        this.inputSuppressed
      ) {
        return;
      }
      const sens = 0.0021 * this.settings.mouseSensitivity;
      if (this.pointerLocked) {
        this.yaw -= e.movementX * sens;
        this.pitch -= e.movementY * sens;
      } else if (this.isDraggingLook) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.yaw -= dx * sens * 1.4;
        this.pitch -= dy * sens * 1.4;
      }
      const maxPitch = this.isHiding ? 0.35 : Math.PI * 0.46;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
      if (this.isHiding && this.activeHidingSpot?.hideLookYaw !== undefined) {
        const baseYaw = this.activeHidingSpot.hideLookYaw;
        const diff = Math.atan2(Math.sin(this.yaw - baseYaw), Math.cos(this.yaw - baseYaw));
        this.yaw = baseYaw + Math.max(-0.45, Math.min(0.45, diff));
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (
        this.gameState !== 'playing' ||
        this.activeNote ||
        this.activeNpcDialogue ||
        this.activePuzzle ||
        this.inputSuppressed
      ) {
        return;
      }
      if (Math.abs(e.deltaY) > 4) {
        this.flashlightState.brightness = cycleFlashlightBrightness(
          this.flashlightState.brightness
        );
        this.audio.playFlashlightClick();
        this.emitHudSnapshot(true);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const kb = this.settings.keyBindings;
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || this.inputSuppressed) {
        return;
      }

      if (e.code === 'Escape' || e.code === kb.pause) {
        if (e.code === 'Escape' && this.callbacks.onEscapePressed?.()) {
          e.preventDefault();
          return;
        }
        if (this.activePuzzle) {
          this.closePuzzle();
          return;
        }
        if (this.activeNote) {
          this.closeNote();
          return;
        }
        if (this.activeNpcDialogue) {
          this.closeNpcDialogue();
          return;
        }
        if (this.gameState === 'playing') {
          this.setGameState('paused');
          return;
        }
      }

      if (this.gameState !== 'playing') return;

      if (this.activePuzzle) {
        return;
      }

      if (this.activeNote) {
        if (e.code === kb.interact || e.code === 'Space' || e.code === 'Enter') {
          this.closeNote();
        }
        return;
      }

      if (this.activeNpcDialogue) {
        if (e.code === kb.interact) {
          this.closeNpcDialogue();
        }
        return;
      }

      const wasHeld = this.keysHeld.has(e.code);
      this.keysHeld.add(e.code);

      if (!wasHeld) {
        this.audio.init();
        const t = getUiStrings(this.settings.language);
        if (e.code === 'Digit1') {
          this.selectQuickSlot(0);
        } else if (e.code === 'Digit2') {
          this.selectQuickSlot(1);
        } else if (e.code === 'Digit3') {
          this.selectQuickSlot(2);
        } else if (e.code === 'Digit4') {
          this.selectQuickSlot(3);
        } else if (e.code === 'Digit5') {
          this.selectQuickSlot(4);
        } else if (e.code === 'Digit6') {
          this.selectQuickSlot(5);
        } else if (e.code === kb.useItem) {
          this.useQuickSlot(this.selectedSlotIndex);
        } else if (e.code === kb.crouch) {
          if (!this.isHiding && !this.isDowned) this.isCrouching = !this.isCrouching;
        } else if (e.code === kb.jump) {
          if (!this.isDowned) this.jumpBufferTimer = 0.12;
        } else if (e.code === kb.flashlight) {
          if (this.flashlightState.battery > 0 || !this.settings.batteryDrainEnabled) {
            this.flashlightState.on = !this.flashlightState.on;
            this.audio.playFlashlightClick();
            this.emitHudSnapshot(true);
          } else {
            this.audio.playFlashlightClick();
            this.showBanner(t.banners.batteryDepleted, 2.0);
          }
        } else if (e.code === kb.brightness) {
          this.flashlightState.brightness = cycleFlashlightBrightness(
            this.flashlightState.brightness
          );
          this.audio.playFlashlightClick();
          this.emitHudSnapshot(true);
        } else if (e.code === 'KeyR') {
          this.reloadBattery();
        } else if (e.code === kb.drop) {
          this.dropHeldItem();
        } else if (e.code === kb.interact) {
          e.preventDefault();
          this.triggerInteract();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysHeld.delete(e.code);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.cleanupListeners.push(() => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    });
  }

  private getNearestDownedTeammate(): RemotePlayerEntry | null {
    let best: RemotePlayerEntry | null = null;
    let bestDist = 2.6;
    for (const [, entry] of this.remotePlayers) {
      if (!entry.isDowned) continue;
      const d = entry.rig.root.position.distanceTo(this.playerPos);
      if (d <= bestDist) {
        bestDist = d;
        best = entry;
      }
    }
    return best;
  }

  private triggerInteract(): void {
    const t = getUiStrings(this.settings.language);
    if (this.isDowned) return;

    if (this.isHiding && this.activeHidingSpot) {
      this.isHiding = false;
      this.playerPos.copy(this.preHidePos);
      this.yaw = this.preHideYaw;
      this.activeHidingSpot.isOpen = false;
      this.activeHidingSpot.targetAngle = 0;
      this.activeHidingSpot = null;
      this.audio.playDoorCreak(false);
      this.emitHudSnapshot(true);
      return;
    }

    // Priority: Revive downed teammate nearby in multiplayer
    const downedTeammate = this.getNearestDownedTeammate();
    if (downedTeammate) {
      downedTeammate.isDowned = false;
      downedTeammate.hp = 350;
      updateNameplateHealth(
        downedTeammate.nameplate,
        downedTeammate.hp,
        downedTeammate.maxHp,
        false
      );
      this.audio.playPickup('battery');
      this.showBanner(t.banners.revivedTeammate(downedTeammate.displayName), 2.5);
      this.callbacks.onWorldMutate?.({
        kind: 'player_revive',
        targetPlayerId: downedTeammate.playerId,
        hp: 350,
      });
      this.emitHudSnapshot(true);
      return;
    }

    const target = this.lookedAt;
    if (!target || target.consumed) return;

    if (target.type === 'hiding_spot' && target.hideCameraPos) {
      this.preHidePos.copy(this.playerPos);
      this.preHideYaw = this.yaw;
      this.isHiding = true;
      this.isCrouching = false;
      this.activeHidingSpot = target;
      target.isOpen = false;
      target.targetAngle = -0.18;
      if (target.hideLookYaw !== undefined) {
        this.yaw = target.hideLookYaw;
      }
      this.pitch = 0;
      this.audio.playDoorCreak(true);
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'npc') {
      const collectedIds = this.inventory.map((i) => i.id);
      const dialogue = buildControlledNpcDialogue(
        target.id,
        this.currentLevel,
        collectedIds,
        Array.from(this.npcMemoryFlags)
      );
      this.activeNpcDialogue = dialogue;
      this.audio.playNpcVoiceCue(dialogue.role);
      if (target.id === 'npc_witch') {
        if (this.currentLevel === 3) this.markObjective('obj_l3_witch');
        if (this.currentLevel === 7) this.markObjective('obj_l7_witch');
      }
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
      this.callbacks.onWorldMutate?.({
        kind: 'npc_talk',
        npcId: target.id,
        mood: dialogue.truthful ? 'calm' : 'nervous',
      });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'puzzle' || target.type === 'circuit') {
      const t = getUiStrings(this.settings.language);
      const pId = target.puzzleId ?? target.id;
      const puzzle = PUZZLE_DEFINITIONS[pId];
      if (!puzzle) return;
      const locPuz = localizePuzzle(puzzle, this.settings.language);
      if (this.solvedPuzzles.has(pId)) {
        this.showBanner(t.banners.alreadySolved(locPuz.title), 2.0);
        return;
      }
      this.activePuzzle = puzzle;
      this.audio.playPickup('note');
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'candle_light') {
      if (this.litCandles.has(target.id)) return;
      const t = getUiStrings(this.settings.language);
      this.litCandles.add(target.id);
      target.consumed = true;
      if (target.candleLight) target.candleLight.visible = true;
      if (target.candleFlame) target.candleFlame.visible = true;
      this.audio.playPickup('other');
      this.showBanner(t.banners.litLantern(target.label, this.litCandles.size), 2.4);
      if (this.litCandles.size >= 2) {
        this.markObjective('obj_l8_lights');
      }
      this.callbacks.onWorldMutate?.({ kind: 'candle_light', id: target.id });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'door' || target.type === 'exit') {
      const t = getUiStrings(this.settings.language);
      // Allow Grand Central Stairwell door freely when exploring Floors 1-6 outside Level 9's key objective
      const enforceKeyLock =
        Boolean(target.lockedByKeyId) &&
        (target.id !== 'exit_rooftop_stair' || this.currentLevel === 9);
      if (enforceKeyLock && target.lockedByKeyId) {
        const hasKey = this.inventory.some((i) => i.id === target.lockedByKeyId);
        if (!hasKey) {
          this.audio.playLockedRattle();
          this.showBanner(t.banners.lockedKey, 2.2);
          return;
        }
      }
      if (target.lockedBySwitchId && !this.activatedSwitches.has(target.lockedBySwitchId)) {
        this.audio.playLockedRattle();
        this.showBanner(t.banners.lockedSwitch, 2.4);
        return;
      }

      const cfg = getLevelConfig(this.currentLevel);
      if (target.id === cfg.exitId) {
        if (cfg.requiredPuzzleId && !this.solvedPuzzles.has(cfg.requiredPuzzleId)) {
          const pDef = PUZZLE_DEFINITIONS[cfg.requiredPuzzleId];
          const locPuz = pDef ? localizePuzzle(pDef, this.settings.language) : null;
          this.audio.playLockedRattle();
          this.showBanner(t.banners.lockedPuzzle(locPuz?.title ?? 'puzzle'), 2.8);
          return;
        }
        this.audio.playDoorCreak(true);
        this.completeCurrentLevel(false);
        return;
      }

      target.isOpen = !target.isOpen;
      target.targetAngle = target.isOpen ? -Math.PI * 0.48 : 0;
      if (target.colliderId) {
        const col = this.world.colliders.find((c) => c.id === target.colliderId);
        if (col) col.active = !target.isOpen;
      }
      this.audio.playDoorCreak(Boolean(target.isOpen));
      this.callbacks.onWorldMutate?.({
        kind: 'door',
        id: target.id,
        isOpen: Boolean(target.isOpen),
      });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'note' || target.type === 'computer') {
      if (target.note) {
        this.notesFound.add(target.note.id);
        this.activeNote = target.note;
        if (target.id === 'note_reception') this.markObjective('obj_l1_note');
        if (target.id === 'note_classroom') this.markObjective('obj_l2_items');
        if (target.id === 'note_library') this.markObjective('obj_l3_witch');
        if (target.id === 'note_lab') this.markObjective('obj_l4_doc');
        if (target.id === 'comp_principal') this.markObjective('obj_l5_docs');
        if (target.id === 'note_basement') this.markObjective('obj_l6_note');
        if (target.id === 'doc_1998_fire') this.markObjective('obj_l9_evidence');
        this.audio.playPickup('note');
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock?.();
        }
        this.emitHudSnapshot(true);
      }
      return;
    }

    if (target.type === 'key' && target.item) {
      const t = getUiStrings(this.settings.language);
      const added = addItemToQuickSlots(this.quickSlots, target.item, QUICK_SLOT_COUNT);
      if (!added.added) {
        this.showBanner(t.banners.slotsFull, 2.4);
        return;
      }
      target.consumed = true;
      target.mesh.visible = false;
      this.quickSlots = added.slots;
      this.selectedSlotIndex = added.slotIndex;
      this.syncInventoryFromQuickSlots();
      if (target.id === 'key_courtyard' && this.solvedPuzzles.has('puzzle_l1_circuit')) {
        this.markObjective('obj_l1_key');
      }
      if (target.id === 'key_principal') this.markObjective('obj_l2_exit');
      if (target.id === 'key_library') this.markObjective('obj_l5_exit');
      if (target.id === 'key_infirmary') this.markObjective('obj_l7_exit');
      if (target.id === 'key_basement') this.markObjective('obj_l8_exit');
      if (target.id === 'key_rooftop') this.markObjective('obj_l9_exit');
      this.audio.playPickup('key');
      const loc = localizeItem(target.item, this.settings.language);
      this.showBanner(t.banners.pickedUp(loc.name), 2.5);
      this.callbacks.onWorldMutate?.({ kind: 'pickup', id: target.id, sharedQuest: true });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'battery') {
      const t = getUiStrings(this.settings.language);
      const batItem: InventoryItem = target.item ?? {
        id: 'bat_starter',
        name: 'D-Cell Battery',
        kind: 'battery',
        description: 'Restores +60% flashlight charge',
        droppable: true,
        consumable: true,
      };
      const added = addItemToQuickSlots(
        this.quickSlots,
        { ...batItem, id: 'bat_starter' },
        QUICK_SLOT_COUNT
      );
      if (!added.added) {
        this.showBanner(t.banners.slotsFull, 2.4);
        return;
      }
      target.consumed = true;
      target.mesh.visible = false;
      this.quickSlots = added.slots;
      this.selectedSlotIndex = added.slotIndex;
      this.syncInventoryFromQuickSlots();
      this.audio.playPickup('battery');
      const loc = localizeItem(batItem, this.settings.language);
      this.showBanner(t.banners.pickedUp(loc.name), 2.5);
      this.callbacks.onWorldMutate?.({ kind: 'pickup', id: target.id, sharedQuest: false });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'healing' && target.item) {
      const t = getUiStrings(this.settings.language);
      const added = addItemToQuickSlots(this.quickSlots, target.item, QUICK_SLOT_COUNT);
      if (!added.added) {
        this.showBanner(t.banners.slotsFull, 2.4);
        return;
      }
      target.consumed = true;
      target.mesh.visible = false;
      this.quickSlots = added.slots;
      this.selectedSlotIndex = added.slotIndex;
      this.syncInventoryFromQuickSlots();
      this.audio.playPickup('battery');
      const loc = localizeItem(target.item, this.settings.language);
      this.showBanner(t.banners.pickedUp(loc.name), 2.5);
      this.callbacks.onWorldMutate?.({ kind: 'pickup', id: target.id, sharedQuest: false });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'hidden_object' && target.item) {
      const t = getUiStrings(this.settings.language);
      const added = addItemToQuickSlots(this.quickSlots, target.item, QUICK_SLOT_COUNT);
      if (!added.added) {
        this.showBanner(t.banners.slotsFull, 2.4);
        return;
      }
      target.consumed = true;
      target.mesh.visible = false;
      this.quickSlots = added.slots;
      this.selectedSlotIndex = added.slotIndex;
      this.syncInventoryFromQuickSlots();
      this.secretsFound.add(target.id);
      if (target.id === 'item_chalk' || target.id === 'item_compass') {
        this.markObjective('obj_l2_items');
      }
      if (target.id === 'item_copper_coil') {
        this.markObjective('obj_l4_doc');
      }
      this.audio.playPickup('key');
      const loc = localizeItem(target.item, this.settings.language);
      this.showBanner(t.banners.pickedUp(loc.name), 2.8);
      this.callbacks.onWorldMutate?.({ kind: 'pickup', id: target.id, sharedQuest: false });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'secret_switch') {
      if (this.activatedSwitches.has(target.id)) return;
      const t = getUiStrings(this.settings.language);
      this.activatedSwitches.add(target.id);
      this.secretsFound.add(target.id);
      this.audio.playSecretMechanism();
      if (target.secretWallColliderId) {
        const col = this.world.colliders.find((c) => c.id === target.secretWallColliderId);
        if (col) col.active = false;
      }
      if (target.secretWallGroup) {
        target.secretWallGroup.position.x =
          target.secretWallOpenX ?? target.secretWallGroup.position.x - 1.65;
      }
      if (target.id === 'switch_library_book') {
        this.npcMemoryFlags.add('library_switch_pulled');
        this.markObjective('obj_l3_exit');
      }
      if (target.id === 'switch_computer_override') this.markObjective('obj_l4_exit');
      if (target.id === 'switch_basement_breaker') this.markObjective('obj_l6_exit');
      if (target.id === 'switch_rooftop_beacon') this.markObjective('obj_l10_beacon');
      this.showBanner(t.banners.activatedSwitch(target.label), 2.8);
      this.callbacks.onWorldMutate?.({ kind: 'switch', id: target.id });
      this.emitHudSnapshot(true);
      return;
    }

    if (target.type === 'cabinet' || target.type === 'drawer') {
      const t = getUiStrings(this.settings.language);
      target.isOpen = !target.isOpen;
      target.mesh.position.z += target.isOpen ? 0.16 : -0.16;
      this.audio.playDoorCreak(Boolean(target.isOpen));
      this.showBanner(target.isOpen ? t.banners.drawerEmpty : t.banners.drawerClosed, 1.6);
    }
  }

  private triggerDefeatState(): void {
    if (this.defeatTriggered) return;
    this.defeatTriggered = true;
    const cfg = getLevelConfig(this.currentLevel);
    const locCfg = localizeLevel(cfg, this.settings.language);
    const stats: StageClearStats = {
      level: this.currentLevel,
      levelName: locCfg.name,
      clearTimeSeconds: Math.round(this.levelElapsedSeconds),
      notesFound: this.notesFound.size,
      secretsFound: this.secretsFound.size,
      batteriesUsed: this.batteriesUsed,
      puzzlesSolved: this.solvedPuzzles.size,
      completedAll: false,
      defeated: true,
    };
    this.setGameState('gameover');
    this.callbacks.onStageClear(stats);
  }

  private completeCurrentLevel(fromRemoteSync = false): void {
    const cfg = getLevelConfig(this.currentLevel);
    cfg.objectives.forEach((o) => this.completedObjectives.add(o.id));
    const locCfg = localizeLevel(cfg, this.settings.language);
    const stats: StageClearStats = {
      level: this.currentLevel,
      levelName: locCfg.name,
      clearTimeSeconds: Math.round(this.levelElapsedSeconds),
      notesFound: this.notesFound.size,
      secretsFound: this.secretsFound.size,
      batteriesUsed: this.batteriesUsed,
      puzzlesSolved: this.solvedPuzzles.size,
      completedAll: this.currentLevel >= 10,
      defeated: false,
    };
    this.audio.playStageClearMusic(this.currentLevel, stats.completedAll);
    if (!fromRemoteSync) {
      this.callbacks.onWorldMutate?.({ kind: 'objective_clear' });
    }
    this.setGameState('gameover');
    this.callbacks.onStageClear(stats);
  }

  private triggerBlackout(broadcast: boolean): void {
    const t = getUiStrings(this.settings.language);
    this.blackoutTimer = 4.5;
    this.cameraShakeAmount = Math.max(this.cameraShakeAmount, 0.14);
    if (this.flashlightState.on) {
      this.flashlightState.flickerTimer = 2.0;
    }
    this.audio.playBlackoutSurge();
    this.showBanner(t.banners.blackoutSurge, 2.4);
    if (broadcast) {
      this.callbacks.onWorldMutate?.({ kind: 'horror_event', eventType: 'blackout' });
    }
  }

  private executeJumpScare(
    type: JumpScareType,
    broadcast: boolean,
    explicitDoorId?: string
  ): void {
    this.audio.playJumpScare(type);
    this.jumpScareFlashTimer = 0.35;
    this.cameraShakeAmount = Math.max(this.cameraShakeAmount, 0.28);

    if (type === 'door_slam') {
      const openDoor = explicitDoorId
        ? this.world.interactables.find((i) => i.id === explicitDoorId)
        : this.world.interactables.find(
            (i) => i.type === 'door' && i.isOpen && i.worldPos.distanceTo(this.playerPos) < 16
          );
      if (openDoor) {
        openDoor.isOpen = false;
        openDoor.targetAngle = 0;
        if (openDoor.colliderId) {
          const col = this.world.colliders.find((c) => c.id === openDoor.colliderId);
          if (col) col.active = true;
        }
      }
    } else if (type === 'witch_apparition') {
      this.witchWhisper = getUiStrings(this.settings.language).banners.witchTurnAroundWhisper;
      this.witchWhisperTimer = 3.2;
    } else if (type === 'room_anomaly') {
      this.world.anomalyProp.visible = true;
    } else {
      // Place subtle silhouette down the corridor or window view
      const dist = type === 'beam_silhouette' ? 6.5 : 10.0;
      const sx = this.playerPos.x - Math.sin(this.yaw) * dist;
      const sz = this.playerPos.z - Math.cos(this.yaw) * dist;
      const sy = this.world.groundHeightAt(sx, sz, this.playerPos.y);
      this.world.scareApparition.position.set(sx, sy, sz);
      this.world.scareApparition.rotation.y = this.yaw;
      this.world.scareApparition.visible = true;
      this.scareApparitionTimer = type === 'disappearing_figure' ? 1.15 : 1.5;
    }

    if (broadcast) {
      this.callbacks.onWorldMutate?.({
        kind: 'horror_event',
        eventType: type,
      });
    }
  }

  private updateSceneCulling(): void {
    const camPos = this.camera.position;

    // 6-Floor Architectural Visibility Culling (only render nearby floors for high FPS)
    for (const [floorY, floorGrp] of this.world.floorGroups) {
      floorGrp.visible = Math.abs(floorY - camPos.y) <= 7.0;
    }

    const maxLightDist =
      this.settings.lightingQuality === 'low'
        ? 18
        : this.settings.lightingQuality === 'medium'
          ? 26
          : 36;
    const maxLights =
      this.blackoutTimer > 0
        ? 0
        : this.settings.lightingQuality === 'low'
          ? 2
          : this.settings.lightingQuality === 'medium'
            ? 4
            : 6;

    // Sort interior flicker lights by squared distance so only the closest N remain enabled
    const ranked = this.world.flickerLights
      .map((fl, idx) => ({
        idx,
        fl,
        d2: fl.light.position.distanceToSquared(camPos),
      }))
      .sort((a, b) => a.d2 - b.d2);

    let enabled = 0;
    const maxD2 = maxLightDist * maxLightDist;
    for (let i = 0; i < ranked.length; i++) {
      const { fl, d2 } = ranked[i];
      const onFloor = Math.abs(fl.floorY - camPos.y) <= 7.0;
      const on = onFloor && enabled < maxLights && d2 <= maxD2;
      fl.light.visible = on;
      if (on) enabled++;
    }
    this.activeLightsCount = enabled + (this.flashlight.intensity > 0 ? 1 : 0);

    // Distance cull distant decorative groups beyond viewDistance * 0.72
    const propDist = Math.max(28, this.settings.viewDistance * 0.72);
    let culled = 0;
    for (let i = 0; i < this.world.cullGroups.length; i++) {
      const cg = this.world.cullGroups[i];
      if (cg.group === this.world.dustPoints && this.settings.effectsQuality === 'low') {
        cg.group.visible = false;
        culled++;
        continue;
      }
      const d = cg.center.distanceTo(camPos);
      const vis = d - cg.radius <= propDist;
      cg.group.visible = vis;
      if (!vis) culled++;
    }
    this.culledGroupsCount = culled;
  }

  private startLoop(): void {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 75);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.disposed) return;
      const nowMs = performance.now();

      // Respect real FPS limiter when set on hardware GPU
      if (!this.isSoftwareGl && this.settings.fpsLimit > 0) {
        const minInterval = 1000 / this.settings.fpsLimit;
        if (nowMs - this.lastRenderTimeMs < minInterval * 0.92) {
          this.frameId = requestAnimationFrame(tick);
          return;
        }
      }
      this.lastRenderTimeMs = nowMs;

      const rawDt = (nowMs - this.lastTimeMs) / 1000;
      this.lastTimeMs = nowMs;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const obscuredModal =
        this.isSoftwareGl &&
        (this.gameState === 'character_select' || this.gameState === 'lobby');

      if (!obscuredModal) {
        this.update(dt, nowMs);
        this.updateSceneCulling();
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        if (obscuredModal) {
          this.frameId = window.setTimeout(tick, 320);
        } else {
          afterDraw(tick);
        }
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    // Render initial frame immediately so Title screen shows live 3D world on first paint
    this.update(0.016, performance.now());
    this.updateSceneCulling();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private update(dt: number, nowMs: number): void {
    // FPS tracking
    if (dt > 0) {
      const instantFps = 1 / dt;
      this.fpsSamples.push(instantFps);
      if (this.fpsSamples.length > 30) this.fpsSamples.shift();
      this.currentFps = Math.round(
        this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length
      );
    }

    // Adaptive resolution check every 2 seconds on GPU
    if (
      !this.isSoftwareGl &&
      this.settings.graphicsQuality === 'adaptive' &&
      nowMs - this.lastAdaptiveCheckMs > 2000
    ) {
      this.lastAdaptiveCheckMs = nowMs;
      const nextScale = getAdaptiveResolutionScale(this.adaptiveScale, this.currentFps, 90);
      if (nextScale !== this.adaptiveScale) {
        this.adaptiveScale = nextScale;
        this.applyRendererResolution();
      }
    }

    // Animate doors smoothly (Hai opens physical doors slightly faster)
    const doorSpeed = this.activeProfile.id === 'hai' ? 14 : 9;
    for (let i = 0; i < this.world.interactables.length; i++) {
      const item = this.world.interactables[i];
      if (item.hingePivot && item.targetAngle !== undefined && item.currentAngle !== undefined) {
        if (Math.abs(item.targetAngle - item.currentAngle) > 0.002) {
          item.currentAngle = THREE.MathUtils.damp(
            item.currentAngle,
            item.targetAngle,
            doorSpeed,
            dt
          );
          item.hingePivot.rotation.y = item.currentAngle;
        }
      }
    }

    // Subtle floating dust motion & swaying window curtains
    if (this.world.dustPoints.visible) {
      this.world.dustPoints.rotation.y += dt * 0.015;
    }
    if (this.settings.effectsQuality !== 'low') {
      for (let i = 0; i < this.world.curtains.length; i++) {
        const c = this.world.curtains[i];
        c.mesh.rotation.z =
          c.baseRotZ + Math.sin(nowMs * 0.0018 + c.seed) * 0.075;
      }
    }

    // Flickering fluorescent tubes
    const cfg = getLevelConfig(this.currentLevel);
    for (let i = 0; i < this.world.flickerLights.length; i++) {
      const fl = this.world.flickerLights[i];
      if (this.blackoutTimer > 0) {
        fl.light.intensity = 0;
        const mat = fl.tubeMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.05;
      } else if (fl.malfunctioning || Math.random() < cfg.flickerChance * 0.03) {
        const wave = Math.sin(nowMs * 0.014 + fl.seed) * Math.sin(nowMs * 0.043 + fl.seed);
        const drop = wave > 0.62 ? 0.15 : 1.0;
        fl.light.intensity = fl.baseIntensity * drop;
        const mat = fl.tubeMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = drop > 0.5 ? 1.5 : 0.18;
      }
    }

    // Update remote multiplayer rigs & nameplates
    for (const [, remote] of this.remotePlayers) {
      remote.rig.root.position.lerp(remote.targetPos, 1 - Math.exp(-12 * dt));
      const yawDiff = Math.atan2(
        Math.sin(remote.targetYaw - remote.rig.root.rotation.y),
        Math.cos(remote.targetYaw - remote.rig.root.rotation.y)
      );
      remote.rig.root.rotation.y += yawDiff * (1 - Math.exp(-12 * dt));
      animateCharacterRig(
        remote.rig,
        dt,
        remote.animState,
        remote.targetPitch,
        remote.flashlightOn,
        remote.flashlightBrightness
      );

      // Hide nameplate when teammate is hiding or beyond 22m
      const distToPlayer = remote.rig.root.position.distanceTo(this.playerPos);
      const showPlate = !remote.isHiding && distToPlayer <= 22;
      remote.nameplate.visible = showPlate;
      if (showPlate) {
        const mat = remote.nameplate.material as THREE.SpriteMaterial;
        mat.opacity = distToPlayer > 16 ? Math.max(0, 1 - (distToPlayer - 16) / 6) : 0.92;
      }
    }

    if (
      this.gameState === 'title' ||
      this.gameState === 'character_select' ||
      this.gameState === 'lobby'
    ) {
      // Live World Camera Tour looking down the moonlit Reception Hall & Central Corridor
      this.titleTourTime += dt;
      const panZ = 16.4 - Math.sin(this.titleTourTime * 0.18) * 1.6;
      const panX = -0.4 + Math.sin(this.titleTourTime * 0.22) * 0.9;
      const targetX = 0.5 + Math.sin(this.titleTourTime * 0.14) * 0.6;
      this.camera.position.set(panX, 1.72, panZ);
      this.camera.lookAt(targetX, 1.32, 2.5);
      this.hemiLight.intensity = 0.44;
      this.flashlight.position.copy(this.camera.position);
      this.flashlightTarget.position.set(targetX, 1.25, panZ - 9.0);
      this.flashlight.angle = (40 * Math.PI) / 180;
      this.flashlight.penumbra = 0.82;
      this.flashlight.distance = 58;
      this.flashlight.decay = 0.78;
      this.flashlight.intensity = 28.0;
      this.audio.tickLobbyAmbience(nowMs);
      return;
    }

    if (this.gameState !== 'playing') return;

    this.levelElapsedSeconds += dt;
    if (this.statusBannerTimer > 0) {
      this.statusBannerTimer -= dt;
      if (this.statusBannerTimer <= 0) this.statusBanner = null;
    }
    if (this.witchWhisperTimer > 0) {
      this.witchWhisperTimer -= dt;
      if (this.witchWhisperTimer <= 0) this.witchWhisper = null;
    }
    if (this.damageCooldown > 0) {
      this.damageCooldown = Math.max(0, this.damageCooldown - dt);
    }
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    }
    if (this.tyRelicHintCooldown > 0) {
      this.tyRelicHintCooldown -= dt;
    }
    if (this.blackoutTimer > 0) {
      this.blackoutTimer = Math.max(0, this.blackoutTimer - dt);
    }
    if (this.jumpScareFlashTimer > 0) {
      this.jumpScareFlashTimer = Math.max(0, this.jumpScareFlashTimer - dt);
    }
    if (this.scareApparitionTimer > 0) {
      this.scareApparitionTimer -= dt;
      if (this.scareApparitionTimer <= 0) {
        this.world.scareApparition.visible = false;
      }
    }
    if (this.cameraShakeAmount > 0) {
      this.cameraShakeAmount = Math.max(0, this.cameraShakeAmount - dt * 0.85);
    }
    if (this.breathCooldown > 0) {
      this.breathCooldown -= dt;
    }

    // Track if player left Reception and returned for subtle familiar-room anomaly
    if (this.playerPos.z < 4) {
      this.leftReceptionOnce = true;
    }

    // Rare Level 4+ electrical blackout event (normal flashlight stays steady without random spam flicker)
    this.supernaturalTimer -= dt;
    if (this.supernaturalTimer <= 0) {
      this.supernaturalTimer = 14 + Math.random() * (18 - cfg.supernaturalEventRate * 8);
      if (this.currentLevel >= 4 && Math.random() < 0.24) {
        this.triggerBlackout(true);
      }
    }

    // Gameplay-triggered selective Jump Scare scheduler (never spammy)
    this.jumpScareCooldown -= dt;
    if (this.jumpScareCooldown <= 0 && !this.isHiding && !this.activePuzzle && !this.activeNpcDialogue) {
      this.jumpScareCooldown = Math.max(22, 42 - this.currentLevel * 1.9);
      const pool: JumpScareType[] = [
        'corridor_shadow',
        'door_slam',
        'window_figure',
        'beam_silhouette',
        'disappearing_figure',
      ];
      if (this.currentLevel >= 3) pool.push('witch_apparition');
      if (this.leftReceptionOnce && this.playerPos.z > 9) pool.push('room_anomaly');
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.executeJumpScare(pick, true);
    }

    const isNervous = this.activeProfile.id === 'nam' && this.flashlightState.flickerTimer > 0;

    // Ty Resource Advantage: spot hidden valuable objects nearby
    if (this.activeProfile.id === 'ty' && this.tyRelicHintCooldown <= 0) {
      for (const obj of this.world.interactables) {
        if (
          obj.type === 'hidden_object' &&
          !obj.consumed &&
          obj.worldPos.distanceTo(this.playerPos) < 9.5
        ) {
          const t = getUiStrings(this.settings.language);
          const locName = obj.item ? localizeItem(obj.item, this.settings.language).name : obj.label;
          this.showBanner(t.banners.tyRelicNearby(locName), 2.6);
          this.tyRelicHintCooldown = 14;
          break;
        }
      }
    }

    const kb = this.settings.keyBindings;
    let isMovingNow = false;
    let isSprintingNow = false;

    if (!this.activeNote && !this.activeNpcDialogue && !this.activePuzzle && !this.isHiding && !this.isDowned) {
      if (!this.inputSuppressed) {
        if (this.keysHeld.has('ArrowLeft')) this.yaw += 1.9 * dt;
        if (this.keysHeld.has('ArrowRight')) this.yaw -= 1.9 * dt;
      }

      let moveZ = this.virtualMoveZ;
      let moveX = this.virtualMoveX;
      if (!this.inputSuppressed) {
        if (this.keysHeld.has(kb.forward) || this.keysHeld.has('ArrowUp')) moveZ += 1;
        if (this.keysHeld.has(kb.backward) || this.keysHeld.has('ArrowDown')) moveZ -= 1;
        if (this.keysHeld.has(kb.left)) moveX -= 1;
        if (this.keysHeld.has(kb.right)) moveX += 1;
      }
      moveX = Math.max(-1, Math.min(1, moveX));
      moveZ = Math.max(-1, Math.min(1, moveZ));

      const isMoving = Math.hypot(moveX, moveZ) > 0.08;
      isMovingNow = isMoving;
      const wantsSprint =
        !this.inputSuppressed &&
        (this.virtualSprint || this.keysHeld.has(kb.sprint) || this.keysHeld.has('ShiftRight'));

      const stamRes = updateStamina(
        this.staminaState,
        wantsSprint,
        isMoving,
        this.isCrouching,
        dt,
        {
          drainMult: this.activeProfile.staminaDrainMult,
          recoveryMult: this.activeProfile.staminaRecoveryMult,
          isNervous,
          nervousRecoveryMult: this.activeProfile.nervousRecoveryMult,
        }
      );
      this.staminaState = stamRes.state;
      isSprintingNow = stamRes.canSprint && isMoving && !this.isCrouching;

      this.currentAnimState = !isMoving
        ? this.isCrouching
          ? 'crouch'
          : 'idle'
        : this.isCrouching
          ? 'crouch'
          : stamRes.canSprint
            ? 'sprint'
            : 'walk';

      const speedMult = this.activeProfile.speedMult;
      const targetSpeed = !isMoving
        ? 0
        : this.isCrouching
          ? this.settings.walkSpeed * speedMult * 0.56
          : stamRes.canSprint
            ? this.settings.sprintSpeed * speedMult
            : this.settings.walkSpeed * speedMult;

      if (isMoving) {
        const len = Math.hypot(moveX, moveZ);
        const nx = moveX / len;
        const nz = moveZ / len;

        _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        const dx = (_forward.x * nz + _right.x * nx) * targetSpeed * dt;
        const dz = (_forward.z * nz + _right.z * nx) * targetSpeed * dt;

        const resolved = resolvePlayerMovement(
          this.playerPos,
          { dx, dz },
          0.36,
          this.world.colliders
        );
        const stepDist = Math.hypot(
          resolved.x - this.playerPos.x,
          resolved.z - this.playerPos.z
        );
        this.playerPos.x = resolved.x;
        this.playerPos.z = resolved.z;

        this.walkDistance += stepDist;
        this.stepDistAccum += stepDist;
        const stepInterval = stamRes.canSprint ? 1.55 : this.isCrouching ? 1.05 : 1.3;
        if (this.isGrounded && this.stepDistAccum >= stepInterval) {
          this.stepDistAccum = 0;
          const zone = this.world.getZoneAt(this.playerPos.x, this.playerPos.y, this.playerPos.z);
          this.audio.playFootstep(
            stamRes.canSprint,
            this.isCrouching,
            zone.isOutdoor ? 'gravel' : this.playerPos.y < -1 ? 'concrete' : 'tile'
          );
        }
      }

      const floorY = this.world.groundHeightAt(
        this.playerPos.x,
        this.playerPos.z,
        this.playerPos.y
      );
      if (this.isGrounded) {
        this.coyoteTimer = 0.1;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }
      if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer -= dt;
        if (this.coyoteTimer > 0 && !this.isCrouching) {
          this.velocityY = 4.6;
          this.isGrounded = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
        }
      }

      this.velocityY -= 13.5 * dt;
      this.playerPos.y += this.velocityY * dt;
      if (this.playerPos.y <= floorY) {
        this.playerPos.y = floorY;
        this.velocityY = 0;
        this.isGrounded = true;
      } else if (this.playerPos.y > floorY + 0.08) {
        this.isGrounded = false;
      }

      const targetEye = this.isCrouching ? 0.96 : 1.68;
      this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 12, dt);
      const bobOffset =
        isMoving && this.isGrounded
          ? Math.sin(this.walkDistance * 2.4) * (stamRes.canSprint ? 0.052 : 0.028)
          : 0;

      this.camera.position.set(
        this.playerPos.x,
        this.playerPos.y + this.eyeHeight + bobOffset,
        this.playerPos.z
      );
    } else if (this.isHiding && this.activeHidingSpot?.hideCameraPos) {
      this.currentAnimState = 'hide';
      this.camera.position.lerp(this.activeHidingSpot.hideCameraPos, 1 - Math.exp(-10 * dt));
    }

    // Heavy breathing cue when stamina drops low
    if (this.staminaState.stamina < this.staminaState.maxStamina * 0.22 && this.breathCooldown <= 0) {
      this.breathCooldown = 1.35;
      this.audio.playBreathExertion(this.staminaState.exhaustedCooldown > 0);
    }

    // Camera micro-shake + dynamic FOV tension during chases/scares
    const shakeScale = this.settings.effectsQuality === 'low' ? 0 : this.cameraShakeAmount;
    const shakeX = shakeScale > 0 ? Math.sin(nowMs * 0.09) * shakeScale * 0.04 : 0;
    const shakeY = shakeScale > 0 ? Math.cos(nowMs * 0.11) * shakeScale * 0.04 : 0;
    this.camera.rotation.set(this.pitch + shakeY, this.yaw + shakeX, 0, 'YXZ');

    const targetFov =
      this.settings.effectsQuality === 'low'
        ? 72
        : this.monsterAlertLevel >= 0.7
          ? 75.5
          : this.jumpScareFlashTimer > 0
            ? 74.5
            : 72;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    // Update Monster AI & Player Noise Reactivity
    this.playerNoiseLevel = computePlayerNoiseLevel(
      isMovingNow,
      isSprintingNow,
      this.isCrouching,
      this.isHiding
    );
    let maxAlert = 0;
    let anyChasing = false;
    const t = getUiStrings(this.settings.language);
    for (let i = 0; i < this.monsters.length; i++) {
      const m = this.monsters[i];
      m.stateTimer = Math.max(0, m.stateTimer - dt);
      m.cueCooldown = Math.max(0, m.cueCooldown - dt);

      const distToPlayer = m.root.position.distanceTo(this.playerPos);
      const lineOfSight = hasLineOfSight(m.root.position, this.playerPos, this.world.colliders);
      const decision = stepMonsterAiDecision({
        type: m.type,
        currentState: m.aiState,
        distanceToPlayer: distToPlayer,
        playerNoise: this.playerNoiseLevel,
        playerFlashlightOn: this.flashlightState.on,
        playerHiding: this.isHiding,
        hasLineOfSight: lineOfSight,
        stateTimer: m.stateTimer,
        vanishCooldown: m.vanishCooldown,
      });

      if (decision.nextState !== m.aiState) {
        m.aiState = decision.nextState;
        if (m.aiState === 'vanished') {
          m.vanishCooldown = 7.0;
        } else if (m.aiState === 'investigate') {
          m.stateTimer = 5.0;
          m.investigateTarget = {
            x: this.playerPos.x,
            y: this.playerPos.y,
            z: this.playerPos.z,
          };
        } else if (m.aiState === 'search') {
          m.stateTimer = 5.0;
        }
      }

      if (lineOfSight && (m.aiState === 'chase' || m.aiState === 'investigate')) {
        m.investigateTarget = {
          x: this.playerPos.x,
          y: this.playerPos.y,
          z: this.playerPos.z,
        };
      }

      if (m.aiState === 'chase') anyChasing = true;

      if (decision.shouldPlayCue && m.cueCooldown <= 0) {
        this.audio.playMonsterCue(m.type);
        m.cueCooldown = 4.5;
      }

      maxAlert = Math.max(maxAlert, decision.alertFactor);

      // Monster Physical Contact Damage: -100 HP with 1.6s damage cooldown
      if (
        m.aiState !== 'vanished' &&
        distToPlayer < 1.15 &&
        Math.abs(m.root.position.y - this.playerPos.y) < 1.7 &&
        !this.isHiding &&
        !this.isDowned
      ) {
        const dmgRes = applyPlayerDamage(this.hp, MONSTER_CONTACT_DAMAGE, this.damageCooldown);
        if (dmgRes.appliedDamage > 0) {
          this.hp = dmgRes.hp;
          this.damageCooldown = dmgRes.nextCooldown;
          this.damageFlashTimer = 0.48;
          this.cameraShakeAmount = 0.38;
          this.audio.playMonsterCue(m.type);

          if (dmgRes.isDowned) {
            this.isDowned = true;
            this.currentAnimState = 'downed';
            if (!this.isMultiplayerMode) {
              this.showBanner(t.banners.downedSingleplayer, 2.5);
              this.triggerDefeatState();
            } else {
              this.showBanner(t.banners.downedMultiplayer, 4.0);
            }
          } else if (this.hp <= 300 && !this.lowHealthWarned) {
            this.lowHealthWarned = true;
            this.showBanner(t.banners.lowHealth, 2.6);
          } else {
            this.showBanner(t.banners.damageHit(dmgRes.appliedDamage, this.hp), 2.2);
          }
          this.emitHudSnapshot(true);
        }
      }

      updateMonsterMotion(
        m,
        dt,
        this.playerPos,
        this.world.colliders,
        this.world.groundHeightAt
      );
    }
    if (anyChasing && !this.isChasedNow) {
      this.showBanner(t.banners.monsterChasing, 2.6);
    }
    this.isChasedNow = anyChasing;
    this.monsterAlertLevel = maxAlert;

    // Screen distortion / fear vignette intensity (subtle & readable)
    const rawDistortion =
      this.settings.effectsQuality === 'low'
        ? 0
        : Math.min(
            1,
            this.monsterAlertLevel * 0.65 +
              (this.blackoutTimer > 0 ? 0.35 : 0) +
              (this.jumpScareFlashTimer > 0 ? 0.55 : 0)
          );
    this.distortionIntensity = THREE.MathUtils.damp(this.distortionIntensity, rawDistortion, 8, dt);

    // Update Flashlight with wide circular beam configuration & wall-safe origin
    this.flashlightState = updateFlashlight(
      this.flashlightState,
      this.settings.batteryDrainEnabled,
      cfg.batteryDrainMultiplier,
      dt,
      this.activeProfile.batteryEfficiency
    );

    const beamCfg = getFlashlightBeamConfig(this.flashlightState.brightness);
    this.flashlight.intensity = this.flashlightState.on
      ? beamCfg.intensity * this.flashlightState.flickerIntensity
      : 0;
    this.flashlight.angle = beamCfg.spotAngleRad;
    this.flashlight.penumbra = beamCfg.penumbra;
    this.flashlight.decay = beamCfg.decay;
    if (this.flashlight.distance !== beamCfg.distance) {
      this.flashlight.distance = beamCfg.distance;
      if (!this.isSoftwareGl && this.flashlight.shadow.camera.far !== beamCfg.distance) {
        this.flashlight.shadow.camera.far = beamCfg.distance;
        this.flashlight.shadow.camera.updateProjectionMatrix();
      }
    }

    _forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    _right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const safeOrigin = computeSafeFlashlightOrigin(
      this.camera.position,
      _forward,
      _right,
      this.world.colliders
    );
    this.flashlight.position.set(safeOrigin.x, safeOrigin.y, safeOrigin.z);
    this.flashlightTarget.position
      .copy(this.camera.position)
      .addScaledVector(_forward, 14);

    // Raycast interactables from center screen
    this.raycaster.setFromCamera(_ndcCenter, this.camera);
    const hits = this.raycaster.intersectObjects(this.world.hitTargets, false);
    let nextLooked: InteractableObject | null = null;
    if (hits.length > 0) {
      const candidate = hits[0].object.userData.interactable as InteractableObject | undefined;
      if (candidate && !candidate.consumed) {
        nextLooked = candidate;
      }
    }
    this.lookedAt = nextLooked;

    // Sudden silence window trigger on Levels 7 & 10
    if (this.silenceTimer > 0) {
      this.silenceTimer = Math.max(0, this.silenceTimer - dt);
    } else if (
      (this.currentLevel === 7 || this.currentLevel === 10) &&
      this.levelElapsedSeconds > this.nextSilenceCheckTime &&
      !anyChasing
    ) {
      this.nextSilenceCheckTime = this.levelElapsedSeconds + 32;
      this.silenceTimer = 4.5;
    }

    const exitUnlocked = !cfg.requiredPuzzleId || this.solvedPuzzles.has(cfg.requiredPuzzleId);
    this.currentAudioState = selectDynamicAudioState({
      level: this.currentLevel,
      monsterAlertLevel: this.monsterAlertLevel,
      isChased: anyChasing,
      npcDialogueOpen: Boolean(this.activeNpcDialogue),
      exitUnlocked,
      inSilenceWindow: this.silenceTimer > 0,
    });

    // Level-specific horror soundscape + dynamic state transition
    const zone = this.world.getZoneAt(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    this.audio.tickAmbience(
      nowMs,
      this.currentLevel,
      cfg.supernaturalEventRate,
      zone.isOutdoor,
      this.currentAudioState
    );

    // Throttled HUD updates (10Hz max)
    if (nowMs - this.lastHudEmitMs >= 100) {
      this.lastHudEmitMs = nowMs;
      this.emitHudSnapshot(false);
    }
  }

  private emitHudSnapshot(force: boolean): void {
    if (force) this.lastHudEmitMs = performance.now();
    const cfg = getLevelConfig(this.currentLevel);
    const locCfg = localizeLevel(cfg, this.settings.language);
    const t = getUiStrings(this.settings.language);
    const zone = this.world.getZoneAt(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    const kb = this.settings.keyBindings;
    const interactKey = kb.interact.replace('Key', '');

    const currentFloor =
      this.playerPos.y <= -2.0
        ? -1
        : this.playerPos.y >= 22.0
          ? 7
          : Math.max(1, Math.min(6, Math.round(this.playerPos.y / 4) + 1));

    let promptText: string | null = null;
    let promptSubtext: string | null = null;

    const downedTeammate = this.getNearestDownedTeammate();
    if (this.isHiding) {
      promptText = `[${interactKey}] ${t.hud.exitLockerPrompt}`;
    } else if (downedTeammate) {
      promptText = `[${interactKey}] ${t.hud.reviveTeammatePrompt(downedTeammate.displayName)}`;
      promptSubtext = t.hud.revivingHint;
    } else if (this.lookedAt) {
      promptText = `[${interactKey}] ${this.lookedAt.label}`;
      if (this.activeProfile.id === 'hoa' && (this.lookedAt.type === 'secret_switch' || this.lookedAt.type === 'puzzle')) {
        promptSubtext = t.hud.hoaInsightTitle;
      } else if (this.activeProfile.id === 'ty' && this.lookedAt.type === 'hidden_object') {
        promptSubtext = 'Ty: Rare School Relic';
      } else {
        promptSubtext = this.lookedAt.sublabel ?? null;
      }
    }

    const wantsSprint =
      !this.inputSuppressed &&
      (this.virtualSprint || this.keysHeld.has(kb.sprint) || this.keysHeld.has('ShiftRight'));

    const objectives: LevelObjectiveItem[] = locCfg.objectives.map((o) => ({
      id: o.id,
      label: o.label,
      completed: this.completedObjectives.has(o.id),
    }));

    const locChar = localizeCharacter(this.activeProfile, this.settings.language);
    this.callbacks.onHudUpdate({
      level: this.currentLevel,
      levelName: locCfg.name,
      difficultyLabel: locCfg.difficultyLabel,
      zoneName: localizeZoneName(zone.name, this.settings.language),
      currentFloor,
      playerPos: {
        x: Number(this.playerPos.x.toFixed(2)),
        y: Number(this.playerPos.y.toFixed(2)),
        z: Number(this.playerPos.z.toFixed(2)),
        yaw: Number(this.yaw.toFixed(3)),
      },
      objectiveText: locCfg.objectiveDescription,
      objectives,
      characterId: this.activeProfile.id,
      characterName: locChar.codename,
      specialAbilityName: locChar.specialAbility,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      isDowned: this.isDowned,
      damageFlashActive: this.damageFlashTimer > 0,
      stamina: Math.round(this.staminaState.stamina),
      maxStamina: this.staminaState.maxStamina,
      isSprinting: wantsSprint && this.staminaState.stamina > 1 && !this.isCrouching && !this.isDowned,
      isCrouching: this.isCrouching,
      isHiding: this.isHiding,
      flashlightOn: this.flashlightState.on,
      flashlightBrightness: this.flashlightState.brightness,
      battery: Math.round(this.flashlightState.battery),
      batteryReserves: this.batteryReserves,
      fps: this.currentFps,
      promptText,
      promptSubtext,
      heldItem: this.quickSlots[this.selectedSlotIndex]?.item ?? this.inventory[this.inventory.length - 1] ?? null,
      inventory: [...this.inventory],
      quickSlots: this.quickSlots.map((s) => (s ? { item: s.item, quantity: s.quantity } : null)),
      selectedSlotIndex: this.selectedSlotIndex,
      maxInventory: QUICK_SLOT_COUNT,
      notesFound: this.notesFound.size,
      secretsFound: this.secretsFound.size,
      elapsedSeconds: Math.round(this.levelElapsedSeconds),
      pointerLocked: this.pointerLocked,
      statusBanner: this.statusBanner,
      witchWhisper: this.witchWhisper,
      playerNoiseLevel: this.playerNoiseLevel,
      monsterAlertLevel: this.monsterAlertLevel,
      isChased: this.isChasedNow,
      activeNote: this.activeNote,
      activeNpcDialogue: this.activeNpcDialogue,
      activePuzzle: this.activePuzzle,
      npcMemoryFlags: Array.from(this.npcMemoryFlags),
      isNervous: this.activeProfile.id === 'nam' && this.flashlightState.flickerTimer > 0,
      audioState: this.currentAudioState,
      distortionIntensity: Number(this.distortionIntensity.toFixed(2)),
      jumpScareActive: this.jumpScareFlashTimer > 0,
      perfStats: {
        drawCalls: this.renderer.info.render.calls,
        activeLights: this.activeLightsCount,
        totalLights: this.world.flickerLights.length,
        culledGroups: this.culledGroupsCount,
      },
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.clearRemotePlayers();
    this.cleanupListeners.forEach((fn) => fn());
    this.flashlightTexture.dispose();
    this.world.dispose();
    this.mats.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
