import { useCallback, useEffect, useRef, useState } from 'react';
import { SchoolHorrorEngine } from './game/engine';
import {
  DEFAULT_SETTINGS,
  MAX_PLAYER_HP,
  createEmptyQuickSlots,
  getCharacterProfile,
  getLevelConfig,
} from './game/rules';
import { getUiStrings, localizeLevel } from './game/i18n';
import { MultiplayerClient } from './game/multiplayerClient';
import { ProximityVoiceManager } from './game/voiceChat';
import {
  mergeChatHistory,
  mergeChatMessage,
  shouldTriggerChatNotification,
} from './game/chatUtils';
import type {
  CharacterId,
  ChatMessage,
  GameMode,
  GameSettings,
  GameState,
  HudSnapshot,
  MultiplayerRoomState,
  RoomErrorCode,
  StageClearStats,
  VoiceAudioDevice,
  VoiceDiagnosticsSnapshot,
} from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { MultiplayerLobbyScreen } from './components/MultiplayerLobbyScreen';
import { GameHUD } from './components/GameHUD';
import { ChatVoiceOverlay } from './components/ChatVoiceOverlay';
import { PauseMenu } from './components/PauseMenu';
import { SettingsModal } from './components/SettingsModal';
import { LoadingScreen } from './components/LoadingScreen';
import { StageClearModal } from './components/StageClearModal';
import { SchoolMapModal } from './components/SchoolMapModal';
import { MobileControls } from './components/MobileControls';
import { OrientationGuard } from './components/OrientationGuard';

const SETTINGS_STORAGE_KEY = 'haunted_school_settings_v1';
const PROGRESS_STORAGE_KEY = 'haunted_school_highest_level_v1';
const NAME_STORAGE_KEY = 'haunted_school_display_name_v1';

function loadSavedSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keyBindings: {
        ...DEFAULT_SETTINGS.keyBindings,
        ...(parsed.keyBindings ?? {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadHighestLevel(): number {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1;
  } catch {
    return 1;
  }
}

function loadDisplayName(): string {
  try {
    const raw = localStorage.getItem(NAME_STORAGE_KEY);
    return raw && raw.trim().length > 0 ? raw.trim().slice(0, 18) : 'Survivor';
  } catch {
    return 'Survivor';
  }
}

function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia?.('(pointer: coarse)').matches ?? false) || navigator.maxTouchPoints > 0;
}

const DEFAULT_PROFILE = getCharacterProfile('ty');
const INITIAL_CFG = getLevelConfig(1);

const INITIAL_HUD: HudSnapshot = {
  level: 1,
  levelName: INITIAL_CFG.name,
  difficultyLabel: INITIAL_CFG.difficultyLabel,
  zoneName: INITIAL_CFG.startingZone,
  currentFloor: 1,
  playerPos: { x: 0, y: 0, z: 55, yaw: 0 },
  objectiveText: INITIAL_CFG.objectiveDescription,
  objectives: INITIAL_CFG.objectives.map((o) => ({ ...o, completed: false })),
  characterId: DEFAULT_PROFILE.id,
  characterName: DEFAULT_PROFILE.codename,
  specialAbilityName: DEFAULT_PROFILE.specialAbility,
  hp: MAX_PLAYER_HP,
  maxHp: MAX_PLAYER_HP,
  isDowned: false,
  damageFlashActive: false,
  stamina: DEFAULT_PROFILE.maxStamina,
  maxStamina: DEFAULT_PROFILE.maxStamina,
  isSprinting: false,
  isCrouching: false,
  isHiding: false,
  flashlightOn: true,
  flashlightBrightness: 3,
  battery: 100,
  batteryReserves: DEFAULT_PROFILE.startingSpareBatteries,
  fps: 60,
  promptText: null,
  promptSubtext: null,
  heldItem: null,
  inventory: [],
  quickSlots: createEmptyQuickSlots(),
  selectedSlotIndex: 0,
  maxInventory: DEFAULT_PROFILE.inventoryCapacity,
  notesFound: 0,
  secretsFound: 0,
  elapsedSeconds: 0,
  pointerLocked: false,
  statusBanner: null,
  witchWhisper: null,
  playerNoiseLevel: 0.06,
  monsterAlertLevel: 0,
  isChased: false,
  activeNote: null,
  activeNpcDialogue: null,
  activePuzzle: null,
  npcMemoryFlags: [],
  isNervous: false,
  audioState: 'exploration',
  distortionIntensity: 0,
  jumpScareActive: false,
  perfStats: {
    drawCalls: 0,
    activeLights: 0,
    totalLights: 6,
    culledGroups: 0,
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SchoolHorrorEngine | null>(null);
  const mpClientRef = useRef<MultiplayerClient | null>(null);
  const voiceRef = useRef<ProximityVoiceManager | null>(null);

  const [settings, setSettings] = useState<GameSettings>(loadSavedSettings);
  const [displayName, setDisplayName] = useState<string>(loadDisplayName);
  const [gameState, setGameState] = useState<GameState>('title');
  const [gameMode, setGameMode] = useState<GameMode>('singleplayer');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('ty');
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState<number>(loadHighestLevel);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [stageClearStats, setStageClearStats] = useState<StageClearStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(detectTouchCapability);
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );

  // Multiplayer & Voice state
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  >('disconnected');
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatNotification, setChatNotification] = useState<ChatMessage | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpErrorCode, setMpErrorCode] = useState<RoomErrorCode | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [pttHeld, setPttHeld] = useState(false);
  const [mutedPeers, setMutedPeers] = useState<Record<string, boolean>>({});
  const [audioInputDevices, setAudioInputDevices] = useState<VoiceAudioDevice[]>([]);
  const [voiceDiagnostics, setVoiceDiagnostics] = useState<VoiceDiagnosticsSnapshot>({
    localMicLevel: 0,
    localSpeaking: false,
    voiceMode: settings.voiceMode,
    activeInputDeviceId: settings.voiceInputDeviceId,
    peers: {},
  });
  const [chatFocused, setChatFocused] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const roomRef = useRef(room);
  roomRef.current = room;
  const localPlayerIdRef = useRef(localPlayerId);
  localPlayerIdRef.current = localPlayerId;
  const showMapRef = useRef(showMap);
  showMapRef.current = showMap;
  const showSettingsRef = useRef(showSettings);
  showSettingsRef.current = showSettings;
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;
  const chatNotifyTimerRef = useRef<number | null>(null);

  const showTouchControls =
    settings.touchControlsMode === 'on' ||
    (settings.touchControlsMode === 'auto' && isTouchDevice);

  // Track viewport orientation & coarse pointer changes for mobile landscape enforcement
  useEffect(() => {
    const updateViewportFlags = () => {
      setIsTouchDevice(detectTouchCapability());
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    updateViewportFlags();
    window.addEventListener('resize', updateViewportFlags);
    window.addEventListener('orientationchange', updateViewportFlags);
    return () => {
      window.removeEventListener('resize', updateViewportFlags);
      window.removeEventListener('orientationchange', updateViewportFlags);
    };
  }, []);

  const handleChatOpenChange = useCallback((open: boolean) => {
    setChatOpen(open);
    chatOpenRef.current = open;
    if (open) {
      setUnreadChatCount(0);
      setChatNotification(null);
      if (chatNotifyTimerRef.current !== null) {
        window.clearTimeout(chatNotifyTimerRef.current);
        chatNotifyTimerRef.current = null;
      }
    } else {
      setChatFocused(false);
      engineRef.current?.setInputSuppressed(showMapRef.current);
    }
  }, []);

  const dismissChatNotification = useCallback(() => {
    setChatNotification(null);
    if (chatNotifyTimerRef.current !== null) {
      window.clearTimeout(chatNotifyTimerRef.current);
      chatNotifyTimerRef.current = null;
    }
  }, []);

  const handleChatFocusChange = useCallback((focused: boolean) => {
    setChatFocused(focused);
    engineRef.current?.setInputSuppressed(focused || showMapRef.current);
  }, []);

  useEffect(() => {
    if (
      gameState === 'playing' &&
      gameMode === 'multiplayer' &&
      (connectionStatus !== 'connected' || Boolean(mpError))
    ) {
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore exitPointerLock errors
        }
      }
    }
  }, [gameState, gameMode, connectionStatus, mpError]);

  const startLevel = useCallback(
    (level: number, characterId: CharacterId, syncRoom?: MultiplayerRoomState) => {
      setSelectedLevel(level);
      setSelectedCharacter(characterId);
      setStageClearStats(null);
      setShowSettings(false);
      setShowMap(false);
      setChatOpen(false);
      chatOpenRef.current = false;
      setChatFocused(false);
      setGameState('loading');
      document.body.dataset.state = 'loading';

      window.setTimeout(() => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.setInputSuppressed(false);
        engine.setMultiplayerMode(Boolean(syncRoom));
        engine.startLevel(level, characterId);
        if (syncRoom) {
          engine.syncRemotePlayers(syncRoom.players, localPlayerIdRef.current);
          engine.applyFullWorldSync(syncRoom.worldSync);
        } else {
          engine.clearRemotePlayers();
        }
      }, 240);
    },
    []
  );

  const refreshMicDevices = useCallback(async () => {
    const devices = await voiceRef.current?.getAudioInputDevices();
    if (devices) setAudioInputDevices(devices);
  }, []);

  const ensureMultiplayerInitialized = useCallback(() => {
    if (!voiceRef.current) {
      voiceRef.current = new ProximityVoiceManager(
        (targetId, signal) => mpClientRef.current?.sendRtcSignal(targetId, signal),
        (enabled, err) => {
          setMicActive(enabled);
          setMicError(err ?? null);
          if (enabled) {
            void refreshMicDevices();
          }
        },
        (diag) => setVoiceDiagnostics(diag)
      );
      voiceRef.current.setPushToTalkMode(settingsRef.current.pushToTalk);
      voiceRef.current.setVoiceVolume(settingsRef.current.voiceVolume);
      voiceRef.current.setVoiceMode(settingsRef.current.voiceMode);
      void voiceRef.current.setInputDevice(settingsRef.current.voiceInputDeviceId);
      void refreshMicDevices();
    }

    if (!mpClientRef.current) {
      mpClientRef.current = new MultiplayerClient({
        onSessionHello: (pid) => {
          setLocalPlayerId(pid);
          localPlayerIdRef.current = pid;
        },
        onRoomState: (nextRoom) => {
          setMpError(null);
          setMpErrorCode(null);
          setRoom(nextRoom);
          setChatMessages((prev) => mergeChatHistory(prev, nextRoom.chatHistory ?? []));
          const myId = localPlayerIdRef.current ?? mpClientRef.current?.getPlayerId() ?? '';
          voiceRef.current?.syncPeers(myId, nextRoom.players);
          if (gameStateRef.current === 'playing') {
            engineRef.current?.syncRemotePlayers(nextRoom.players, myId);
          }
        },
        onGameStarted: (startedRoom) => {
          setMpError(null);
          setMpErrorCode(null);
          setRoom(startedRoom);
          setChatMessages((prev) => mergeChatHistory(prev, startedRoom.chatHistory ?? []));
          setUnreadChatCount(0);
          setGameMode('multiplayer');
          const myId = localPlayerIdRef.current ?? mpClientRef.current?.getPlayerId() ?? '';
          const me = startedRoom.players.find((p) => p.playerId === myId);
          const charId: CharacterId = me?.characterId ?? 'ty';
          voiceRef.current?.syncPeers(myId, startedRoom.players);
          startLevel(startedRoom.level, charId, startedRoom);
        },
        onPlayerDelta: (delta) => {
          engineRef.current?.applyRemotePlayerDelta(delta);
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.playerId === delta.playerId ? { ...p, ...delta } : p
              ),
            };
          });
        },
        onWorldSynced: (packet) => {
          if (
            packet.mutation?.kind === 'player_revive' &&
            packet.mutation.targetPlayerId === localPlayerIdRef.current
          ) {
            engineRef.current?.reviveLocalPlayer(Number(packet.mutation.hp) || 350);
          }
          engineRef.current?.applyFullWorldSync(packet.worldSync);
        },
        onChatMessage: (msg) => {
          setChatMessages((prev) => mergeChatMessage(prev, msg));
          const myId = localPlayerIdRef.current ?? mpClientRef.current?.getPlayerId() ?? null;
          if (
            shouldTriggerChatNotification(
              msg,
              myId,
              chatOpenRef.current,
              gameStateRef.current
            )
          ) {
            setUnreadChatCount((c) => c + 1);
            setChatNotification(msg);
            if (chatNotifyTimerRef.current !== null) {
              window.clearTimeout(chatNotifyTimerRef.current);
            }
            chatNotifyTimerRef.current = window.setTimeout(() => {
              setChatNotification(null);
              chatNotifyTimerRef.current = null;
            }, 8000);
            engineRef.current?.playChatNotification();
          }
        },
        onRtcSignal: (fromId, signal) => {
          void voiceRef.current?.handleSignal(fromId, signal);
        },
        onRoomLeft: () => {
          setRoom(null);
          setChatMessages([]);
          setUnreadChatCount(0);
          setChatOpen(false);
          chatOpenRef.current = false;
          setChatFocused(false);
          dismissChatNotification();
          engineRef.current?.clearRemotePlayers();
        },
        onError: (message, code) => {
          setMpError(message);
          setMpErrorCode(code);
        },
        onConnectionChange: (status) => {
          setConnectionStatus(status);
          if (status === 'connected') {
            setMpError(null);
            setMpErrorCode(null);
          }
        },
      });
    }

    mpClientRef.current.connect();
  }, [dismissChatNotification, startLevel]);

  // Mount Three.js School Engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    document.body.dataset.state = 'title';
    const engine = new SchoolHorrorEngine(mount, settingsRef.current, {
      onHudUpdate: (snap) => setHud(snap),
      onStateChange: (nextState) => setGameState(nextState),
      onWorldMutate: (mutation) => {
        if (gameModeRef.current === 'multiplayer' && roomRef.current) {
          mpClientRef.current?.sendWorldMutation(mutation);
        }
      },
      onEscapePressed: () => {
        if (showSettingsRef.current) {
          setShowSettings(false);
          return true;
        }
        if (showMapRef.current) {
          setShowMap(false);
          engineRef.current?.setInputSuppressed(false);
          return true;
        }
        if (chatOpenRef.current) {
          setChatOpen(false);
          chatOpenRef.current = false;
          setChatFocused(false);
          engineRef.current?.setInputSuppressed(false);
          return true;
        }
        return false;
      },
      onStageClear: (stats) => {
        setShowMap(false);
        setChatOpen(false);
        chatOpenRef.current = false;
        setChatFocused(false);
        setStageClearStats(stats);
        if (!stats.defeated) {
          setHighestUnlockedLevel((prev) => {
            const next = Math.min(10, Math.max(prev, stats.level + 1));
            try {
              localStorage.setItem(PROGRESS_STORAGE_KEY, String(next));
            } catch {
              // ignore storage errors
            }
            return next;
          });
        }
      },
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const lvlParam = Number(params.get('level') || '1');
      const level = Number.isFinite(lvlParam) ? Math.max(1, Math.min(10, Math.floor(lvlParam))) : 1;
      const charParam = (params.get('char') as CharacterId | null) ?? 'ty';
      const validChar: CharacterId = ['ty', 'nam', 'hoa', 'hai', 'phuong'].includes(charParam)
        ? charParam
        : 'ty';
      setSelectedLevel(level);
      setSelectedCharacter(validChar);
      engine.setMultiplayerMode(false);
      engine.startLevel(level, validChar);
    }

    return () => {
      if (chatNotifyTimerRef.current !== null) {
        window.clearTimeout(chatNotifyTimerRef.current);
        chatNotifyTimerRef.current = null;
      }
      mpClientRef.current?.dispose();
      mpClientRef.current = null;
      voiceRef.current?.dispose();
      voiceRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // 15Hz delta-throttled multiplayer transform & HP sync + spatial proximity voice attenuation loop
  const lastTransformSigRef = useRef<string>('');
  const lastTransformTimeRef = useRef<number>(0);

  useEffect(() => {
    if (gameMode !== 'multiplayer' || !room) return;
    const interval = window.setInterval(() => {
      const engine = engineRef.current;
      const activeRoom = roomRef.current;
      if (!engine || !activeRoom) return;

      if (gameStateRef.current === 'playing') {
        const pkt = engine.getPlayerTransformPacket();
        const sig = `${pkt.position.x},${pkt.position.y},${pkt.position.z},${pkt.yaw},${pkt.pitch},${pkt.animState},${pkt.isCrouching},${pkt.isHiding},${pkt.flashlightOn},${pkt.flashlightBrightness},${pkt.hp},${pkt.maxHp},${pkt.isDowned}`;
        const now = performance.now();
        if (sig !== lastTransformSigRef.current || now - lastTransformTimeRef.current >= 900) {
          lastTransformSigRef.current = sig;
          lastTransformTimeRef.current = now;
          mpClientRef.current?.sendPlayerUpdate(pkt);
        }
        voiceRef.current?.updateSpatialAudio(
          engine.getPlayerPosition(),
          activeRoom.players,
          engine.getWorldColliders(),
          false
        );
      } else if (gameStateRef.current === 'lobby') {
        voiceRef.current?.updateSpatialAudio(
          engine.getPlayerPosition(),
          activeRoom.players,
          [],
          true
        );
      }
    }, 66);

    return () => window.clearInterval(interval);
  }, [gameMode, room]);

  const setMapOpen = useCallback((open: boolean) => {
    setShowMap(open);
    engineRef.current?.setInputSuppressed(open);
    if (!open && gameStateRef.current === 'playing') {
      engineRef.current?.requestLockIfAllowed();
    }
  }, []);

  // Global Mute [M], Blueprint Map [Tab], & Push-to-Talk [V] listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.code === 'Tab' && (gameState === 'playing' || gameState === 'paused')) {
        if (!showSettings && !hud.activeNote && !hud.activeNpcDialogue && !hud.activePuzzle) {
          e.preventDefault();
          const next = !showMapRef.current;
          setMapOpen(next);
        }
        return;
      }

      if (e.code === 'Escape' && showMapRef.current) {
        e.preventDefault();
        setMapOpen(false);
        return;
      }

      if (e.code === 'KeyM' && (gameState === 'playing' || gameState === 'paused')) {
        setSettings((prev) => {
          const next = { ...prev, muted: !prev.muted };
          engineRef.current?.updateSettings(next);
          return next;
        });
      }

      if (e.code === settingsRef.current.keyBindings.pushToTalk && settingsRef.current.pushToTalk) {
        setPttHeld(true);
        voiceRef.current?.setPushToTalkHeld(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === settingsRef.current.keyBindings.pushToTalk) {
        setPttHeld(false);
        voiceRef.current?.setPushToTalkHeld(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameState, showSettings, hud.activeNote, hud.activeNpcDialogue, hud.activePuzzle, setMapOpen]);

  const handleDisplayNameChange = useCallback((name: string) => {
    const clean = name.slice(0, 18);
    setDisplayName(clean);
    try {
      localStorage.setItem(NAME_STORAGE_KEY, clean);
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleSettingsChange = useCallback((next: GameSettings) => {
    setSettings(next);
    engineRef.current?.updateSettings(next);
    voiceRef.current?.setPushToTalkMode(next.pushToTalk);
    voiceRef.current?.setVoiceVolume(next.voiceVolume);
    voiceRef.current?.setVoiceMode(next.voiceMode);
    if (next.voiceInputDeviceId !== settingsRef.current.voiceInputDeviceId) {
      void voiceRef.current?.setInputDevice(next.voiceInputDeviceId);
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    handleSettingsChange({ ...settingsRef.current, muted: !settingsRef.current.muted });
  }, [handleSettingsChange]);

  const handleToggleMic = useCallback(async () => {
    ensureMultiplayerInitialized();
    const nextEnabled = !micActive;
    await voiceRef.current?.setMicrophoneEnabled(nextEnabled);
  }, [ensureMultiplayerInitialized, micActive]);

  const handleSelectMicDevice = useCallback(
    async (deviceId: string) => {
      ensureMultiplayerInitialized();
      handleSettingsChange({ ...settingsRef.current, voiceInputDeviceId: deviceId });
      await voiceRef.current?.setInputDevice(deviceId);
    },
    [ensureMultiplayerInitialized, handleSettingsChange]
  );

  const handleReconnectPeerVoice = useCallback((peerId: string) => {
    voiceRef.current?.reconnectPeer(peerId);
  }, []);

  const handleTogglePeerMute = useCallback((peerId: string) => {
    setMutedPeers((prev) => {
      const nextMuted = !prev[peerId];
      voiceRef.current?.setPeerMuted(peerId, nextMuted);
      return { ...prev, [peerId]: nextMuted };
    });
  }, []);

  const handleOpenSingleplayer = useCallback((level: number) => {
    setSelectedLevel(level);
    setGameMode('singleplayer');
    engineRef.current?.setMultiplayerMode(false);
    engineRef.current?.clearRemotePlayers();
    engineRef.current?.setGameState('character_select');
  }, []);

  const handleOpenMultiplayer = useCallback(() => {
    setGameMode('multiplayer');
    setMpError(null);
    setMpErrorCode(null);
    ensureMultiplayerInitialized();
    engineRef.current?.setGameState('lobby');
  }, [ensureMultiplayerInitialized]);

  const handlePause = useCallback(() => {
    setShowMap(false);
    setChatOpen(false);
    chatOpenRef.current = false;
    setChatFocused(false);
    engineRef.current?.setInputSuppressed(false);
    engineRef.current?.setGameState('paused');
  }, []);

  const handleResume = useCallback(() => {
    setShowSettings(false);
    setShowMap(false);
    engineRef.current?.setInputSuppressed(false);
    engineRef.current?.setGameState('playing');
    engineRef.current?.requestLockIfAllowed();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setStageClearStats(null);
    setShowSettings(false);
    setShowMap(false);
    setChatOpen(false);
    chatOpenRef.current = false;
    setChatFocused(false);
    setMpError(null);
    setMpErrorCode(null);
    dismissChatNotification();
    engineRef.current?.setInputSuppressed(false);
    engineRef.current?.setMultiplayerMode(false);
    if (roomRef.current) {
      mpClientRef.current?.leaveRoom();
      setRoom(null);
    }
    engineRef.current?.clearRemotePlayers();
    engineRef.current?.setGameState('title');
  }, [dismissChatNotification]);

  const t = getUiStrings(settings.language);
  const activeCfg = localizeLevel(getLevelConfig(selectedLevel), settings.language);
  const selectedSlot = hud.quickSlots[hud.selectedSlotIndex] ?? null;
  const canUseSelectedItem = Boolean(
    selectedSlot && (selectedSlot.item.kind === 'healing' || selectedSlot.item.kind === 'battery')
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050608]">
      {/* Isolated WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        data-testid="game-viewport"
        className="absolute inset-0 w-full h-full"
      />

      {gameState === 'title' && (
        <TitleScreen
          language={settings.language}
          onChangeLanguage={(lang) =>
            handleSettingsChange({ ...settingsRef.current, language: lang })
          }
          displayName={displayName}
          onChangeDisplayName={handleDisplayNameChange}
          selectedLevel={selectedLevel}
          highestUnlockedLevel={highestUnlockedLevel}
          onSelectLevel={setSelectedLevel}
          onOpenSingleplayer={handleOpenSingleplayer}
          onOpenMultiplayer={handleOpenMultiplayer}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {gameState === 'character_select' && (
        <CharacterSelectScreen
          language={settings.language}
          level={selectedLevel}
          levelName={activeCfg.name}
          initialInspected={selectedCharacter}
          onConfirmCharacter={(charId) => startLevel(selectedLevel, charId)}
          onBack={() => engineRef.current?.setGameState('title')}
        />
      )}

      {gameState === 'lobby' && (
        <MultiplayerLobbyScreen
          displayName={displayName}
          onChangeDisplayName={handleDisplayNameChange}
          localPlayerId={localPlayerId}
          connectionStatus={connectionStatus}
          room={room}
          chatMessages={chatMessages}
          errorBanner={mpError}
          errorCode={mpErrorCode}
          settings={settings}
          micActive={micActive}
          micError={micError}
          mutedPeers={mutedPeers}
          voiceDiagnostics={voiceDiagnostics}
          audioInputDevices={audioInputDevices}
          onCreateRoom={(roomName, maxPlayers, level) => {
            ensureMultiplayerInitialized();
            mpClientRef.current?.createRoom(roomName, maxPlayers, displayName, level);
          }}
          onJoinRoom={(roomId) => {
            ensureMultiplayerInitialized();
            mpClientRef.current?.joinRoom(roomId, displayName);
          }}
          onLeaveRoom={() => {
            mpClientRef.current?.leaveRoom();
          }}
          onSelectCharacter={(charId) => {
            setSelectedCharacter(charId);
            mpClientRef.current?.selectCharacter(charId);
          }}
          onToggleReady={(ready) => mpClientRef.current?.setReady(ready)}
          onSelectLevel={(level) => mpClientRef.current?.setLevel(level)}
          onStartGame={() => mpClientRef.current?.startGame()}
          onSendChat={(text) => mpClientRef.current?.sendChat(text, false)}
          onToggleMic={() => void handleToggleMic()}
          onTogglePushToTalk={() =>
            handleSettingsChange({ ...settings, pushToTalk: !settings.pushToTalk })
          }
          onVoiceModeChange={(voiceMode) =>
            handleSettingsChange({ ...settingsRef.current, voiceMode })
          }
          onSelectMicDevice={(deviceId) => void handleSelectMicDevice(deviceId)}
          onRefreshMicDevices={() => void refreshMicDevices()}
          onVoiceVolumeChange={(vol) => handleSettingsChange({ ...settings, voiceVolume: vol })}
          onTogglePeerMute={handleTogglePeerMute}
          onReconnectPeerVoice={handleReconnectPeerVoice}
          onRetryConnection={() => {
            setMpError(null);
            setMpErrorCode(null);
            mpClientRef.current?.retryConnect();
          }}
          onBackToTitle={handleReturnToTitle}
        />
      )}

      {gameState === 'loading' && (
        <LoadingScreen
          language={settings.language}
          level={selectedLevel}
          levelName={activeCfg.name}
        />
      )}

      {gameState === 'playing' && (
        <>
          <GameHUD
            hud={hud}
            settings={settings}
            isTouchMode={showTouchControls}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onOpenMap={() => setMapOpen(true)}
            onSelectQuickSlot={(idx) => engineRef.current?.selectQuickSlot(idx)}
            onUseQuickSlot={(idx) => engineRef.current?.useQuickSlot(idx)}
            onDropSlot={() => engineRef.current?.dropHeldItem()}
            onCloseNote={() => engineRef.current?.closeNote()}
            onCloseNpcDialogue={() => engineRef.current?.closeNpcDialogue()}
            onSelectNpcOption={(opt) => engineRef.current?.chooseNpcOption(opt)}
            onSubmitPuzzle={(puzzleId, ans) =>
              engineRef.current?.submitPuzzleAnswer(puzzleId, ans) ?? false
            }
            onClosePuzzle={() => engineRef.current?.closePuzzle()}
          />
          {showTouchControls &&
            !showMap &&
            !showSettings &&
            !hud.activeNote &&
            !hud.activeNpcDialogue &&
            !hud.activePuzzle && (
              <MobileControls
                language={settings.language}
                scale={settings.mobileControlScale}
                flashlightOn={hud.flashlightOn}
                isCrouching={hud.isCrouching}
                canInteract={Boolean(hud.promptText)}
                canUseSelected={canUseSelectedItem}
                onMoveVector={(x, z) => engineRef.current?.setVirtualMoveVector(x, z)}
                onLookDelta={(dx, dy) => engineRef.current?.applyVirtualLookDelta(dx, dy)}
                onSprintChange={(active) => engineRef.current?.setVirtualSprint(active)}
                onJump={() => engineRef.current?.triggerVirtualJump()}
                onCrouch={() => engineRef.current?.triggerVirtualCrouch()}
                onFlashlight={() => engineRef.current?.triggerVirtualFlashlight()}
                onInteract={() => engineRef.current?.triggerVirtualInteract()}
                onUseItem={() => engineRef.current?.useQuickSlot()}
                onOpenMap={() => setMapOpen(true)}
              />
            )}
          {gameMode === 'multiplayer' && room && (
            <ChatVoiceOverlay
              room={room}
              localPlayerId={localPlayerId}
              localPosition={hud.playerPos}
              chatMessages={chatMessages}
              unreadCount={unreadChatCount}
              chatOpen={chatOpen}
              onChatOpenChange={handleChatOpenChange}
              notification={chatNotification}
              onDismissNotification={dismissChatNotification}
              modalBlocked={Boolean(
                showMap ||
                  showSettings ||
                  hud.activeNote ||
                  hud.activeNpcDialogue ||
                  hud.activePuzzle
              )}
              isTouchMode={showTouchControls}
              settings={settings}
              micActive={micActive}
              pttHeld={pttHeld}
              mutedPeers={mutedPeers}
              voiceDiagnostics={voiceDiagnostics}
              onMarkRead={() => setUnreadChatCount(0)}
              onSendChat={(text, prox) => mpClientRef.current?.sendChat(text, prox)}
              onToggleMic={() => void handleToggleMic()}
              onToggleVoiceMode={() =>
                handleSettingsChange({
                  ...settingsRef.current,
                  voiceMode: settingsRef.current.voiceMode === 'radio' ? 'spatial' : 'radio',
                })
              }
              onTogglePeerMute={handleTogglePeerMute}
              onChatFocusChange={handleChatFocusChange}
            />
          )}
          {gameMode === 'multiplayer' && (connectionStatus !== 'connected' || mpError) && (
            <div
              data-testid="mp-connection-banner"
              className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] bg-[#1a0a0c]/95 border border-red-700/80 px-3.5 py-2 flex items-center gap-3 text-xs font-mono text-red-100 pointer-events-auto shadow-xl"
            >
              <span>
                {mpErrorCode && t.lobby.roomErrors[mpErrorCode]
                  ? t.lobby.roomErrors[mpErrorCode]
                  : mpError ?? t.lobby.connectionLostBanner}
              </span>
              <button
                type="button"
                data-testid="mp-ingame-retry-btn"
                onClick={() => {
                  setMpError(null);
                  setMpErrorCode(null);
                  mpClientRef.current?.retryConnect();
                }}
                className="px-2.5 py-1 bg-[#7f1d1d] hover:bg-[#991b1b] border border-red-500 text-[11px] uppercase text-white"
              >
                {t.lobby.retryBtn}
              </button>
              <button
                type="button"
                data-testid="mp-ingame-menu-btn"
                onClick={handleReturnToTitle}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] uppercase text-zinc-200"
              >
                {t.pause.returnTitle}
              </button>
            </div>
          )}
        </>
      )}

      {gameState === 'paused' && !showSettings && !showMap && (
        <PauseMenu
          language={settings.language}
          level={hud.level}
          levelName={hud.levelName}
          onResume={handleResume}
          onOpenMap={() => setMapOpen(true)}
          onRestart={() =>
            startLevel(hud.level, selectedCharacter, gameMode === 'multiplayer' ? room ?? undefined : undefined)
          }
          onOpenSettings={() => setShowSettings(true)}
          onReturnToTitle={handleReturnToTitle}
        />
      )}

      {showMap && (gameState === 'playing' || gameState === 'paused') && (
        <SchoolMapModal
          language={settings.language}
          currentFloor={hud.currentFloor}
          playerPos={hud.playerPos}
          teammates={room?.players}
          localPlayerId={localPlayerId}
          zoneName={hud.zoneName}
          objectiveText={hud.objectiveText}
          onClose={() => setMapOpen(false)}
        />
      )}

      {gameState === 'gameover' && stageClearStats && (
        <StageClearModal
          language={settings.language}
          stats={stageClearStats}
          onNextLevel={() => startLevel(Math.min(10, stageClearStats.level + 1), selectedCharacter)}
          onReplay={() =>
            startLevel(
              stageClearStats.level,
              selectedCharacter,
              gameMode === 'multiplayer' ? room ?? undefined : undefined
            )
          }
          onReturnToTitle={handleReturnToTitle}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          audioInputDevices={audioInputDevices}
          onRefreshMicDevices={() => void refreshMicDevices()}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {isTouchDevice && isPortrait && <OrientationGuard language={settings.language} />}

      {/* Subtle safeguard attribute for chat focus state */}
      {chatFocused && <span className="sr-only" data-chat-focused="true" />}
    </main>
  );
}
