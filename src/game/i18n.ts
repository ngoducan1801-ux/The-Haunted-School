import type {
  CharacterId,
  InventoryItem,
  LanguageCode,
  LevelConfig,
  NoteDocument,
  NpcDialogueSession,
  PlayableCharacterProfile,
  PuzzleDefinition,
  RoomErrorCode,
} from '../types/game';

export interface UiDictionary {
  titleScreen: {
    gameTitleTop: string;
    gameTitleBottom: string;
    levelWord: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    singleplayer: string;
    singleplayerSub: string;
    multiplayer: string;
    multiplayerSub: string;
    settings: string;
    settingsSub: string;
    controlsHint: string;
    languageLabel: string;
  };
  charSelect: {
    headerTag: string;
    heading: string;
    backToTitle: string;
    selectedBadge: string;
    inspectionBadge: string;
    staminaStat: string;
    hpStat: string;
    slotsStat: string;
    personalityHeading: string;
    advantagesHeading: string;
    tradeoffLabel: string;
    confirmedPrefix: string;
    clickHint: string;
    confirmBtn: (codename: string) => string;
  };
  lobby: {
    heading: string;
    subtitleCreateJoin: string;
    roomPrefix: string;
    copyId: string;
    copiedId: string;
    leaveRoom: string;
    backToTitle: string;
    nameSubtitle: string;
    hostSquad: string;
    createRoomHeading: string;
    roomNameLabel: string;
    maxPlayersLabel: string;
    startingLevelLabel: string;
    createRoomBtn: string;
    enterCodeTag: string;
    joinRoomHeading: string;
    refresh: string;
    joinPlaceholder: string;
    joinBtn: string;
    openRooms: string;
    noRooms: string;
    inGame: string;
    full: string;
    chooseUnique: string;
    lockedPrefix: string;
    noCharSelected: string;
    youBadge: string;
    openBadge: string;
    hostBadge: string;
    readyBadge: string;
    waitBadge: string;
    markReady: string;
    readyDone: string;
    startMission: string;
    startTooltipReady: string;
    startTooltipWait: string;
    squadRoster: string;
    playersWord: string;
    spatialVoice: string;
    voiceRadioMode: string;
    voiceSpatialMode: string;
    voiceMicSelectLabel: string;
    voiceDefaultMic: string;
    voiceRefreshMics: string;
    voiceSpeaking: string;
    voiceReconnectPeer: string;
    voiceConnStates: Record<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed', string>;
    micOn: string;
    enableMic: string;
    pttLabel: string;
    openMicLabel: string;
    voiceVol: string;
    roomChat: string;
    emptyChat: string;
    chatPlaceholder: string;
    send: string;
    selecting: string;
    errNameRequired: string;
    errRoomIdDigits: string;
    muted: string;
    voice: string;
    retryBtn: string;
    backBtn: string;
    reconnectingLabel: string;
    offlineBadge: string;
    connectionLostBanner: string;
    hostNoticePrefix: string;
    connStatus: Record<'connecting' | 'connected' | 'reconnecting' | 'disconnected', string>;
    roomErrors: Record<RoomErrorCode, string>;
  };
  hud: {
    lvlShort: string;
    floorLabels: Record<number, string>;
    healthLabel: string;
    lowHealthAlert: string;
    downedStatus: string;
    revivingHint: string;
    chaseAlert: string;
    staminaLabel: string;
    nervousLabel: string;
    hidingStatus: string;
    crouchStatus: string;
    sprintStatus: string;
    noiseLabel: string;
    huntedLabel: string;
    sensedLabel: string;
    clearLabel: string;
    inventorySlotsLabel: string;
    useSlotBtn: string;
    dropSlotBtn: string;
    flashlightLabel: string;
    on: string;
    off: string;
    batteryLabel: string;
    spareLabel: string;
    mapBtn: string;
    clickLookHint: string;
    exitLockerPrompt: string;
    reviveTeammatePrompt: (name: string) => string;
    documentRecovered: string;
    namInsightTitle: string;
    hoaInsightTitle: string;
    closeBtn: string;
    leaveBtn: string;
    schoolEncounter: string;
    dissolvesText: string;
    emptySlot: string;
    quickUseHint: string;
  };
  puzzle: {
    mechanismTag: string;
    closeBtn: string;
    observedClues: string;
    namTag: string;
    hoaTag: string;
    revealHint: string;
    hintPrefix: string;
    placeholder: string;
    submit: string;
    selectedSeq: string;
    clickOrderHint: string;
    resetOrder: string;
    confirmOrder: string;
    wrongAnswer: string;
  };
  settings: {
    tag: string;
    title: string;
    done: string;
    tabs: {
      language: string;
      graphics: string;
      audio: string;
      controls: string;
    };
    languageTitle: string;
    languageDesc: string;
    graphicsPresetTitle: string;
    graphicsPresetDesc: string;
    presets: Record<'very_low' | 'low' | 'medium' | 'high' | 'ultra' | 'adaptive', string>;
    shadowQuality: string;
    textureQuality: string;
    lightingQuality: string;
    effectsQuality: string;
    fpsLimit: string;
    displayMode: string;
    fullscreenSwitch: string;
    windowedSwitch: string;
    resolutionScale: string;
    viewDistance: string;
    antialiasing: string;
    ambientOcclusion: string;
    motionBlur: string;
    vsync: string;
    showFps: string;
    batteryDrainEnabled: string;
    volumes: {
      masterVolume: string;
      musicVolume: string;
      ambienceVolume: string;
      npcVolume: string;
      monsterVolume: string;
      voiceVolume: string;
      uiVolume: string;
      sfxVolume: string;
    };
    pushToTalkMode: string;
    pushToTalkDesc: (key: string) => string;
    voiceModeTitle: string;
    voiceModeDesc: string;
    voiceRadioLabel: string;
    voiceSpatialLabel: string;
    voiceInputTitle: string;
    muteAll: string;
    mouseSensitivity: string;
    touchControlsModeTitle: string;
    touchModeAuto: string;
    touchModeOn: string;
    touchModeOff: string;
    mobileSensitivity: string;
    mobileScale: string;
    pressKey: string;
    resetDefaults: string;
    keyLabels: Record<string, string>;
  };
  pause: {
    tag: string;
    subtitle: string;
    resume: string;
    openMap: string;
    restart: string;
    settings: string;
    returnTitle: string;
  };
  loading: {
    entering: string;
    tip: string;
  };
  stageClear: {
    allClearedTag: string;
    levelClearedTag: string;
    defeatedTag: string;
    defeatedDesc: string;
    time: string;
    notes: string;
    secrets: string;
    puzzles: string;
    nextLevel: (next: number) => string;
    replay: string;
    returnTitle: string;
  };
  map: {
    title: string;
    subtitle: string;
    close: string;
    floors: string;
    legendYou: string;
    legendTeammate: string;
    legendStairs: string;
    legendRestroom: string;
    legendGate: string;
    legendParking: string;
    westWing: string;
    centerWing: string;
    eastWing: string;
    northWing: string;
    exteriorCourtyard: string;
  };
  mobile: {
    rotateTitle: string;
    rotateDesc: string;
    rotateBtn: string;
    jump: string;
    sprint: string;
    crouch: string;
    light: string;
    interact: string;
    use: string;
    map: string;
    lookArea: string;
  };
  banners: {
    outsideGateArrival: string;
    damageHit: (dmg: number, remaining: number) => string;
    lowHealth: string;
    monsterChasing: string;
    downedSingleplayer: string;
    downedMultiplayer: string;
    revivedSelf: string;
    revivedTeammate: (name: string) => string;
    healedAmount: (name: string, amount: number) => string;
    batteryLoaded: string;
    batteryFull: string;
    batteryDepleted: string;
    cannotDropEssential: string;
    droppedItem: (name: string) => string;
    lockedKey: string;
    lockedSwitch: string;
    lockedPuzzle: (title: string) => string;
    slotsFull: string;
    pickedUp: (name: string) => string;
    teammateKey: (name: string) => string;
    activatedSwitch: (name: string) => string;
    litLantern: (name: string, count: number) => string;
    alreadySolved: (title: string) => string;
    blackoutSurge: string;
    tyRelicNearby: (name: string) => string;
    noUsableItem: string;
    drawerEmpty: string;
    drawerClosed: string;
    witchHallwayWhisper: string;
    witchTurnAroundWhisper: string;
  };
  chatOverlay: {
    roomWord: string;
    micOff: string;
    pttLive: string;
    pttIdle: string;
    micLive: string;
    radioShort: string;
    spatialShort: string;
    speakingBadge: string;
    chatBtn: string;
    chatTitle: string;
    youTag: string;
    closeChat: string;
    openHint: string;
    proxOnly: string;
    hide: string;
    empty: string;
    placeholder: string;
    send: string;
    sizeCompact: string;
    sizeExpanded: string;
    dockLabel: string;
    unreadLabel: (count: number) => string;
  };
}

const EN_DICT: UiDictionary = {
  titleScreen: {
    gameTitleTop: 'THE HAUNTED',
    gameTitleBottom: 'SCHOOL',
    levelWord: 'Level',
    displayNameLabel: 'Survivor Display Name',
    displayNamePlaceholder: 'Enter name...',
    singleplayer: 'Singleplayer',
    singleplayerSub: 'SURVIVORS',
    multiplayer: 'Multiplayer',
    multiplayerSub: '2–5 CO-OP',
    settings: 'Settings',
    settingsSub: 'CONFIG',
    controlsHint:
      'WASD Move · Shift Sprint · C Crouch · Space Jump · F Flashlight · G Brightness · E Interact · 1–6 Slots · U Use · Tab Map',
    languageLabel: 'Language',
  },
  charSelect: {
    headerTag: 'Singleplayer',
    heading: 'Select Your Survivor',
    backToTitle: 'Back to Title',
    selectedBadge: 'Selected',
    inspectionBadge: '3D Inspection',
    staminaStat: 'STAMINA',
    hpStat: 'HP',
    slotsStat: 'SLOTS',
    personalityHeading: 'Personality Profile',
    advantagesHeading: 'Gameplay Advantages',
    tradeoffLabel: 'Trade-off:',
    confirmedPrefix: 'Confirmed:',
    clickHint: 'Click a character card or Confirm below',
    confirmBtn: (codename) => `Confirm ${codename} & Enter`,
  },
  lobby: {
    heading: 'Multiplayer Reception Lobby',
    subtitleCreateJoin: 'Co-op Squad Setup (2–5 Players)',
    roomPrefix: 'Room',
    copyId: 'Copy',
    copiedId: 'Copied ID!',
    leaveRoom: 'Leave Room',
    backToTitle: 'Back to Title',
    nameSubtitle: 'Visible above your character and in room chat',
    hostSquad: 'Host Squad',
    createRoomHeading: 'Create New Room',
    roomNameLabel: 'Room Name',
    maxPlayersLabel: 'Max Players',
    startingLevelLabel: 'Starting Level',
    createRoomBtn: 'Create Room & Generate 6-Digit ID',
    enterCodeTag: 'Enter Code',
    joinRoomHeading: 'Join Existing Room',
    refresh: 'Refresh',
    joinPlaceholder: '6-Digit Room ID (e.g. 482910)',
    joinBtn: 'Join',
    openRooms: 'Open Rooms',
    noRooms: 'No active rooms yet. Create one to receive a 6-digit Room ID.',
    inGame: 'In Game',
    full: 'Full',
    chooseUnique: 'Choose Unique Survivor (Authoritative Lock)',
    lockedPrefix: 'Locked:',
    noCharSelected: 'No character selected',
    youBadge: 'YOU',
    openBadge: 'OPEN',
    hostBadge: 'HOST',
    readyBadge: 'READY',
    waitBadge: 'WAIT',
    markReady: 'Mark Ready',
    readyDone: 'Ready ✓',
    startMission: 'Start Mission',
    startTooltipReady: 'Enter the Haunted School',
    startTooltipWait: 'All players must pick a character and teammates must be Ready',
    squadRoster: 'Squad Roster',
    playersWord: 'Players',
    spatialVoice: 'Voice Comms (WebRTC)',
    voiceRadioMode: 'Squad Radio',
    voiceSpatialMode: '3D Spatial',
    voiceMicSelectLabel: 'Mic Input',
    voiceDefaultMic: 'System Default Microphone',
    voiceRefreshMics: 'Scan Mics',
    voiceSpeaking: 'SPEAKING',
    voiceReconnectPeer: 'Reconnect Voice',
    voiceConnStates: {
      idle: 'Idle',
      connecting: 'Connecting',
      connected: 'Voice Live',
      reconnecting: 'Reconnecting',
      failed: 'ICE Failed',
    },
    micOn: 'Mic ON',
    enableMic: 'Enable Mic',
    pttLabel: 'PTT [V]',
    openMicLabel: 'Open Mic',
    voiceVol: 'Voice Vol',
    roomChat: 'Room Text Chat',
    emptyChat: 'Room channel open. Coordinate character roles before entering...',
    chatPlaceholder: 'Message squad...',
    send: 'Send',
    selecting: 'Selecting...',
    errNameRequired: 'Enter your display name first.',
    errRoomIdDigits: 'Room ID must be exactly 6 numeric digits.',
    muted: 'Muted',
    voice: 'Voice',
    retryBtn: 'Retry',
    backBtn: 'Back',
    reconnectingLabel: 'RECONNECTING',
    offlineBadge: 'Offline',
    connectionLostBanner: 'Connection lost — attempting to rejoin your room...',
    hostNoticePrefix: 'Host Update:',
    connStatus: {
      connecting: 'Connecting...',
      connected: 'Online · Connected',
      reconnecting: 'Reconnecting...',
      disconnected: 'Disconnected',
    },
    roomErrors: {
      invalid_room_id: 'Invalid Room ID. Please enter a 6-digit numeric Room ID.',
      room_not_found: 'Room does not exist or has already closed.',
      room_full: 'This room has reached maximum player capacity.',
      room_started: 'This match has already started. Join another open room.',
      room_expired: 'This room expired after inactivity. Create a new room.',
      host_disconnected: 'The host disconnected. Leadership transferred or room awaiting return.',
      version_mismatch: 'Your game version does not match the room. Refresh the page to update.',
      already_in_room: 'You are already in another active room. Leave it before joining a new one.',
      invalid_room_name: 'Enter a valid room name.',
      rate_limited: 'Too many requests too quickly. Wait a moment and retry.',
      server_unavailable: 'Multiplayer server is currently unreachable. Click Retry to reconnect.',
      internet_unavailable: 'Internet connection is offline. Check your connection and retry.',
      connection_failed: 'Unable to establish online connection. Click Retry.',
      auth_failed: 'Session verification failed. Refresh or click Retry.',
      unknown: 'An unexpected multiplayer error occurred.',
    },
  },
  hud: {
    lvlShort: 'LVL',
    floorLabels: {
      [-1]: 'B1',
      1: 'F1',
      2: 'F2',
      3: 'F3',
      4: 'F4',
      5: 'F5',
      6: 'F6',
      7: 'ROOF',
    },
    healthLabel: 'Health',
    lowHealthAlert: 'Your health is low.',
    downedStatus: 'INCAPACITATED — Awaiting Teammate Revive [E]',
    revivingHint: 'Revive downed teammate nearby',
    chaseAlert: 'The monster is chasing you!',
    staminaLabel: 'Stamina',
    nervousLabel: 'NERVOUS',
    hidingStatus: 'HIDING',
    crouchStatus: 'CROUCH',
    sprintStatus: 'SPRINT',
    noiseLabel: 'Noise',
    huntedLabel: 'HUNTED',
    sensedLabel: 'SENSED',
    clearLabel: 'CLEAR',
    inventorySlotsLabel: 'QUICK SLOTS [1–6]',
    useSlotBtn: 'Use [U]',
    dropSlotBtn: 'Drop [Q]',
    flashlightLabel: 'Flashlight [F]',
    on: 'ON',
    off: 'OFF',
    batteryLabel: 'Battery',
    spareLabel: 'Spare [R]',
    mapBtn: 'Map [Tab]',
    clickLookHint: 'Click or Drag Viewport to Look',
    exitLockerPrompt: 'Exit Locker',
    reviveTeammatePrompt: (name) => `Revive ${name}`,
    documentRecovered: 'Document Recovered',
    namInsightTitle: 'Nam — Analytical Thinking',
    hoaInsightTitle: 'Hoa — Quick Analysis',
    closeBtn: 'Close [E / Esc]',
    leaveBtn: 'Leave [E / Esc]',
    schoolEncounter: 'School Encounter',
    dissolvesText: 'The figure dissolves into the corridor mist...',
    emptySlot: 'Empty',
    quickUseHint: '1–6 Select · U Use · Q Drop',
  },
  puzzle: {
    mechanismTag: 'Mechanism',
    closeBtn: 'Close [Esc]',
    observedClues: 'Observed Clues',
    namTag: '[Nam · Analytical Thinking]',
    hoaTag: '[Hoa · Quick Analysis]',
    revealHint: 'Reveal Guidance Hint',
    hintPrefix: 'Hint:',
    placeholder: 'Enter code or answer...',
    submit: 'Submit',
    selectedSeq: 'Selected Sequence',
    clickOrderHint: 'Click items below in exact order...',
    resetOrder: 'Reset Order',
    confirmOrder: 'Confirm Order',
    wrongAnswer: 'Incorrect response — inspect the clues and try again.',
  },
  settings: {
    tag: 'Configuration',
    title: 'Game Settings',
    done: 'Done',
    tabs: {
      language: 'Language',
      graphics: 'Graphics',
      audio: 'Audio',
      controls: 'Controls',
    },
    languageTitle: 'Game Language / Ngôn ngữ',
    languageDesc: 'Switch all menus, HUD, clues, dialogues & alerts immediately.',
    graphicsPresetTitle: 'Graphics Quality Preset',
    graphicsPresetDesc:
      'Presets tune shadows, lighting budget, view distance & Adaptive 90 FPS scaling',
    presets: {
      very_low: 'Very Low',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      ultra: 'Ultra',
      adaptive: 'Adaptive (90 FPS Target)',
    },
    shadowQuality: 'Shadow Quality',
    textureQuality: 'Texture Quality',
    lightingQuality: 'Lighting Quality',
    effectsQuality: 'Effects Quality',
    fpsLimit: 'FPS Limit',
    displayMode: 'Display Window Mode',
    fullscreenSwitch: 'Fullscreen (Switch to Windowed)',
    windowedSwitch: 'Windowed (Enter Fullscreen)',
    resolutionScale: 'Resolution Scale',
    viewDistance: 'View Distance',
    antialiasing: 'Anti-Aliasing',
    ambientOcclusion: 'Ambient Occlusion',
    motionBlur: 'Motion Blur',
    vsync: 'VSync Frame Pacing',
    showFps: 'Show FPS & Perf Stats',
    batteryDrainEnabled: 'Flashlight Battery Drain',
    volumes: {
      masterVolume: 'Master Volume',
      musicVolume: 'Background Music',
      ambienceVolume: 'Environmental Sounds & Wind',
      npcVolume: 'NPC Voices & Whispers',
      monsterVolume: 'Monster Sounds & Scares',
      voiceVolume: 'Multiplayer Voice Chat',
      uiVolume: 'Interface Sounds',
      sfxVolume: 'Footsteps & Door SFX',
    },
    pushToTalkMode: 'Push-to-Talk Voice Mode',
    pushToTalkDesc: (key) => `Hold [${key}] to transmit microphone audio`,
    voiceModeTitle: 'Multiplayer Voice Audio Mode',
    voiceModeDesc: 'Squad Radio stays crystal-clear on all 6 floors; 3D Spatial attenuates with walls.',
    voiceRadioLabel: 'Squad Radio (Clear)',
    voiceSpatialLabel: '3D Spatial (Walls)',
    voiceInputTitle: 'Microphone Input Device',
    muteAll: 'Mute All Audio',
    mouseSensitivity: 'Mouse Sensitivity',
    touchControlsModeTitle: 'Mobile Touch Controls',
    touchModeAuto: 'Auto (Touch Devices)',
    touchModeOn: 'Always On',
    touchModeOff: 'Off (Desktop)',
    mobileSensitivity: 'Touch Look Sensitivity',
    mobileScale: 'Touch Button Scale',
    pressKey: 'Press Key...',
    resetDefaults: 'Reset Defaults',
    keyLabels: {
      forward: 'Walk Forward',
      backward: 'Walk Backward',
      left: 'Strafe Left',
      right: 'Strafe Right',
      sprint: 'Sprint',
      crouch: 'Crouch',
      jump: 'Jump',
      flashlight: 'Toggle Flashlight',
      brightness: 'Cycle Brightness',
      interact: 'Interact / Hide',
      drop: 'Drop Item',
      useItem: 'Use Quick Slot Item',
      pushToTalk: 'Push-to-Talk Voice',
      pause: 'Pause Menu',
    },
  },
  pause: {
    tag: 'Simulation Paused',
    subtitle: 'Press Esc or Resume to return to the abandoned school.',
    resume: 'Resume',
    openMap: 'School Blueprint Map [Tab]',
    restart: 'Restart Level',
    settings: 'Settings',
    returnTitle: 'Return to Main Menu',
  },
  loading: {
    entering: 'Entering Level',
    tip: 'Check your flashlight battery. Listen to the halls.',
  },
  stageClear: {
    allClearedTag: 'All 10 Levels Survived',
    levelClearedTag: 'Level Cleared',
    defeatedTag: 'Incapacitated in the Dark',
    defeatedDesc: 'Your health reached 0 HP. Regroup and watch the corridors carefully.',
    time: 'Time',
    notes: 'Notes',
    secrets: 'Secrets',
    puzzles: 'Puzzles',
    nextLevel: (next) => `Proceed to Level ${next}`,
    replay: 'Replay Level',
    returnTitle: 'Return to Main Menu',
  },
  map: {
    title: 'School Architectural Blueprint',
    subtitle: '6-Floor Campus · 3 Wings · Basement · Exterior Grounds',
    close: 'Close Map [Tab / Esc]',
    floors: 'Floors',
    legendYou: 'You',
    legendTeammate: 'Teammate',
    legendStairs: 'Stairwell',
    legendRestroom: 'Restrooms',
    legendGate: 'Main Gate',
    legendParking: 'Parking',
    westWing: 'West Wing',
    centerWing: 'Center Wing',
    eastWing: 'East Wing',
    northWing: 'North Wing',
    exteriorCourtyard: 'Exterior Gate & Courtyard',
  },
  mobile: {
    rotateTitle: 'Rotate Device to Landscape',
    rotateDesc: 'THE HAUNTED SCHOOL uses dual-stick landscape controls for optimal 3D exploration.',
    rotateBtn: 'Lock Landscape Mode',
    jump: 'JUMP',
    sprint: 'RUN',
    crouch: 'CROUCH',
    light: 'LIGHT',
    interact: 'ACT',
    use: 'USE',
    map: 'MAP',
    lookArea: 'Drag to Look',
  },
  banners: {
    outsideGateArrival: 'You stand outside the Abandoned School Gate. Enter the courtyard and Reception Hall.',
    damageHit: (dmg, remaining) => `Struck by Entity! -${dmg} HP (${remaining} HP left)`,
    lowHealth: 'Your health is low.',
    monsterChasing: 'The monster is chasing you!',
    downedSingleplayer: 'Your health dropped to 0 HP...',
    downedMultiplayer: 'Incapacitated! Await a teammate with [E] to revive you.',
    revivedSelf: 'Teammate revived you! (+350 HP)',
    revivedTeammate: (name) => `Revived ${name}!`,
    healedAmount: (name, amount) => `Used ${name} (+${amount} HP)`,
    batteryLoaded: 'Battery Replaced (+60%)',
    batteryFull: 'Flashlight battery is already full',
    batteryDepleted: 'Flashlight battery depleted — Press [R] or Use a Battery slot',
    cannotDropEssential: 'Essential keys cannot be dropped',
    droppedItem: (name) => `Dropped ${name}`,
    lockedKey: 'Locked — Find the required key',
    lockedSwitch: 'Mechanism unpowered — Activate the switch first',
    lockedPuzzle: (title) => `Locked — Solve ${title} first`,
    slotsFull: 'All 6 quick slots are full — Press [Q] to drop an item',
    pickedUp: (name) => `Picked up ${name}`,
    teammateKey: (name) => `Teammate secured ${name}`,
    activatedSwitch: (name) => `Activated: ${name}`,
    litLantern: (name, count) => `Lit ${name} (${count}/2)`,
    alreadySolved: (title) => `${title} already solved`,
    blackoutSurge: 'Electrical Surge — Wing Power Lost',
    tyRelicNearby: (name) => `Ty Instinct: Valuable ${name} nearby`,
    noUsableItem: 'Selected slot has no usable consumable',
    drawerEmpty: 'Drawer empty',
    drawerClosed: 'Closed drawer',
    witchHallwayWhisper: '“The hallway remembers what you tried to hide...”',
    witchTurnAroundWhisper: '“Don’t turn around in the corridor...”',
  },
  chatOverlay: {
    roomWord: 'ROOM',
    micOff: 'MIC OFF',
    pttLive: 'PTT LIVE',
    pttIdle: 'PTT [V]',
    micLive: 'MIC LIVE',
    radioShort: 'RADIO',
    spatialShort: '3D',
    speakingBadge: 'TALKING',
    chatBtn: 'Chat [Enter]',
    chatTitle: 'Live Squad Chat',
    youTag: 'You',
    closeChat: 'Close [Esc]',
    openHint: 'Enter / T',
    proxOnly: 'Proximity Only (22m)',
    hide: 'Close',
    empty: 'No messages yet. Coordinate with your squad...',
    placeholder: 'Message squad... [Enter]',
    send: 'Send',
    sizeCompact: 'Compact',
    sizeExpanded: 'Large',
    dockLabel: 'Move',
    unreadLabel: (count) => `${count} unread`,
  },
};

const VI_DICT: UiDictionary = {
  titleScreen: {
    gameTitleTop: 'NGÔI TRƯỜNG',
    gameTitleBottom: 'MA ÁM',
    levelWord: 'Màn',
    displayNameLabel: 'Tên Người Chơi',
    displayNamePlaceholder: 'Nhập tên của bạn...',
    singleplayer: 'Chơi Đơn',
    singleplayerSub: 'SINH TỒN',
    multiplayer: 'Chơi Mạng',
    multiplayerSub: '2–5 NGƯỜI',
    settings: 'Cài Đặt',
    settingsSub: 'TÙY CHỈNH',
    controlsHint:
      'WASD Di chuyển · Shift Chạy · C Ngồi · Space Nhảy · F Đèn pin · G Độ sáng · E Tương tác · 1–6 Túi đồ · U Dùng · Tab Bản đồ',
    languageLabel: 'Ngôn ngữ',
  },
  charSelect: {
    headerTag: 'Chơi Đơn',
    heading: 'Chọn Nhân Vật Sinh Tồn',
    backToTitle: 'Về Màn Hình Chính',
    selectedBadge: 'Đã Chọn',
    inspectionBadge: 'Mô Hình 3D',
    staminaStat: 'THỂ LỰC',
    hpStat: 'MÁU',
    slotsStat: 'Ô TÚI',
    personalityHeading: 'Tính Cách Nhân Vật',
    advantagesHeading: 'Lợi Thế Sinh Tồn',
    tradeoffLabel: 'Hạn chế:',
    confirmedPrefix: 'Đã xác nhận:',
    clickHint: 'Chọn một thẻ nhân vật rồi nhấn Xác Nhận bên dưới',
    confirmBtn: (codename) => `Xác Nhận ${codename} & Vào Trường`,
  },
  lobby: {
    heading: 'Phòng Chờ Chơi Mạng',
    subtitleCreateJoin: 'Tổ Đội Sinh Tồn (2–5 Người Chơi)',
    roomPrefix: 'Phòng',
    copyId: 'Sao chép',
    copiedId: 'Đã chép ID!',
    leaveRoom: 'Rời Phòng',
    backToTitle: 'Về Màn Hình Chính',
    nameSubtitle: 'Hiển thị trên đầu nhân vật và trong khung chat',
    hostSquad: 'Tạo Tổ Đội',
    createRoomHeading: 'Tạo Phòng Mới',
    roomNameLabel: 'Tên Phòng',
    maxPlayersLabel: 'Số Người Tối Đa',
    startingLevelLabel: 'Màn Bắt Đầu',
    createRoomBtn: 'Tạo Phòng & Lấy Mã 6 Số',
    enterCodeTag: 'Nhập Mã',
    joinRoomHeading: 'Vào Phòng Có Sẵn',
    refresh: 'Làm mới',
    joinPlaceholder: 'Mã Phòng 6 Số (vd: 482910)',
    joinBtn: 'Tham Gia',
    openRooms: 'Danh Sách Phòng Đang Mở',
    noRooms: 'Chưa có phòng nào. Hãy tạo phòng để nhận Mã 6 Số.',
    inGame: 'Đang chơi',
    full: 'Đầy',
    chooseUnique: 'Chọn Nhân Vật Riêng Biệt (Khóa Theo Phòng)',
    lockedPrefix: 'Đã khóa:',
    noCharSelected: 'Chưa chọn nhân vật',
    youBadge: 'BẠN',
    openBadge: 'TRỐNG',
    hostBadge: 'CHỦ PHÒNG',
    readyBadge: 'SẴN SÀNG',
    waitBadge: 'ĐANG CHỜ',
    markReady: 'Sẵn Sàng',
    readyDone: 'Đã Sẵn Sàng ✓',
    startMission: 'Bắt Đầu Vào Trường',
    startTooltipReady: 'Bước vào Ngôi Trường Ma Ám',
    startTooltipWait: 'Tất cả người chơi phải chọn nhân vật và nhấn Sẵn Sàng',
    squadRoster: 'Thành Viên Tổ Đội',
    playersWord: 'Người chơi',
    spatialVoice: 'Thoại Đội Nhóm (WebRTC)',
    voiceRadioMode: 'Bộ Đàm Rõ',
    voiceSpatialMode: 'Âm Thanh 3D',
    voiceMicSelectLabel: 'Nguồn Micro',
    voiceDefaultMic: 'Micro Mặc Định Hệ Thống',
    voiceRefreshMics: 'Quét Mic',
    voiceSpeaking: 'ĐANG NÓI',
    voiceReconnectPeer: 'Kết Nối Lại Thoại',
    voiceConnStates: {
      idle: 'Chờ',
      connecting: 'Đang nối',
      connected: 'Đã nối thoại',
      reconnecting: 'Đang nối lại',
      failed: 'Lỗi ICE',
    },
    micOn: 'Mic ĐANG BẬT',
    enableMic: 'Bật Micro',
    pttLabel: 'Giữ [V] Nói',
    openMicLabel: 'Mic Tự Do',
    voiceVol: 'Âm Lượng Thoại',
    roomChat: 'Trò Chuyện Phòng',
    emptyChat: 'Kênh phòng đã mở. Hãy phân công nhân vật trước khi bắt đầu...',
    chatPlaceholder: 'Nhắn tin cho đội...',
    send: 'Gửi',
    selecting: 'Đang chọn...',
    errNameRequired: 'Vui lòng nhập tên người chơi trước.',
    errRoomIdDigits: 'Mã phòng phải gồm đúng 6 chữ số.',
    muted: 'Đã tắt tiếng',
    voice: 'Âm thoại',
    retryBtn: 'Thử lại',
    backBtn: 'Quay lại',
    reconnectingLabel: 'ĐANG KẾT NỐI LẠI',
    offlineBadge: 'Mất kết nối',
    connectionLostBanner: 'Mất kết nối mạng — đang thử vào lại phòng của bạn...',
    hostNoticePrefix: 'Thông báo chủ phòng:',
    connStatus: {
      connecting: 'Đang kết nối...',
      connected: 'Trực tuyến · Đã kết nối',
      reconnecting: 'Đang kết nối lại...',
      disconnected: 'Ngắt kết nối',
    },
    roomErrors: {
      invalid_room_id: 'Mã phòng không hợp lệ. Vui lòng nhập đúng mã gồm 6 chữ số.',
      room_not_found: 'Phòng không tồn tại hoặc đã đóng.',
      room_full: 'Phòng đã đủ số lượng người chơi tối đa.',
      room_started: 'Trận đấu trong phòng này đã bắt đầu. Hãy chọn phòng khác.',
      room_expired: 'Phòng đã hết hạn do không hoạt động. Hãy tạo phòng mới.',
      host_disconnected: 'Chủ phòng đã mất kết nối. Quyền chủ phòng đang được chuyển tiếp.',
      version_mismatch: 'Phiên bản trò chơi không khớp với phòng. Hãy tải lại trang để cập nhật.',
      already_in_room: 'Bạn đang ở trong một phòng khác. Hãy rời phòng hiện tại trước.',
      invalid_room_name: 'Vui lòng nhập tên phòng hợp lệ.',
      rate_limited: 'Thao tác quá nhanh. Vui lòng đợi giây lát rồi thử lại.',
      server_unavailable: 'Không thể kết nối tới máy chủ chơi mạng. Nhấn Thử lại.',
      internet_unavailable: 'Không có kết nối Internet. Kiểm tra mạng và nhấn Thử lại.',
      connection_failed: 'Kết nối máy chủ thất bại. Nhấn Thử lại để kết nối.',
      auth_failed: 'Xác thực phiên không thành công. Nhấn Thử lại.',
      unknown: 'Đã xảy ra lỗi kết nối chơi mạng.',
    },
  },
  hud: {
    lvlShort: 'MÀN',
    floorLabels: {
      [-1]: 'HẦM B1',
      1: 'TẦNG 1',
      2: 'TẦNG 2',
      3: 'TẦNG 3',
      4: 'TẦNG 4',
      5: 'TẦNG 5',
      6: 'TẦNG 6',
      7: 'SÂN THƯỢNG',
    },
    healthLabel: 'Máu',
    lowHealthAlert: 'Máu của bạn đang thấp.',
    downedStatus: 'GỤC NGÃ — Chờ đồng đội hồi sinh [E]',
    revivingHint: 'Có đồng đội gục ngã gần đây',
    chaseAlert: 'Con quái vật đang đuổi theo bạn!',
    staminaLabel: 'Thể Lực',
    nervousLabel: 'HOẢNG LOẠN',
    hidingStatus: 'ĐANG TRỐN',
    crouchStatus: 'NGỒI THẤP',
    sprintStatus: 'CHẠY NHANH',
    noiseLabel: 'Tiếng Ồn',
    huntedLabel: 'BỊ TRUY ĐUỔI',
    sensedLabel: 'BỊ PHÁT HIỆN',
    clearLabel: 'AN TOÀN',
    inventorySlotsLabel: 'TÚI NHANH [1–6]',
    useSlotBtn: 'Dùng [U]',
    dropSlotBtn: 'Bỏ [Q]',
    flashlightLabel: 'Đèn Pin [F]',
    on: 'BẬT',
    off: 'TẮT',
    batteryLabel: 'Pin',
    spareLabel: 'Pin dự phòng [R]',
    mapBtn: 'Bản đồ [Tab]',
    clickLookHint: 'Chạm hoặc Kéo Màn Hình Để Nhìn',
    exitLockerPrompt: 'Ra Khỏi Tủ',
    reviveTeammatePrompt: (name) => `Hồi sinh ${name}`,
    documentRecovered: 'Tài Liệu Thu Thập Được',
    namInsightTitle: 'Nam — Tư Duy Phân Tích',
    hoaInsightTitle: 'Hoa — Phân Tích Nhanh',
    closeBtn: 'Đóng [E / Esc]',
    leaveBtn: 'Rời đi [E / Esc]',
    schoolEncounter: 'Chạm Trán Trong Trường',
    dissolvesText: 'Bóng người tan biến vào màn sương hành lang...',
    emptySlot: 'Trống',
    quickUseHint: '1–6 Chọn · U Dùng · Q Bỏ',
  },
  puzzle: {
    mechanismTag: 'Cơ Chế Giải Đố',
    closeBtn: 'Đóng [Esc]',
    observedClues: 'Manh Mối Quan Sát Được',
    namTag: '[Nam · Tư Duy Phân Tích]',
    hoaTag: '[Hoa · Phân Tích Nhanh]',
    revealHint: 'Xem Gợi Ý',
    hintPrefix: 'Gợi ý:',
    placeholder: 'Nhập mật mã hoặc đáp án...',
    submit: 'Xác Nhận',
    selectedSeq: 'Thứ Tự Đã Chọn',
    clickOrderHint: 'Nhấn các mục bên dưới theo đúng thứ tự...',
    resetOrder: 'Chọn Lại',
    confirmOrder: 'Xác Nhận Thứ Tự',
    wrongAnswer: 'Đáp án chưa chính xác — hãy kiểm tra lại manh mối.',
  },
  settings: {
    tag: 'Cấu Hình Hệ Thống',
    title: 'Cài Đặt Trò Chơi',
    done: 'Xong',
    tabs: {
      language: 'Ngôn Ngữ',
      graphics: 'Đồ Họa',
      audio: 'Âm Thanh',
      controls: 'Điều Khiển',
    },
    languageTitle: 'Ngôn Ngữ / Language',
    languageDesc: 'Chuyển đổi ngay lập tức toàn bộ menu, HUD, câu đố, hội thoại và cảnh báo.',
    graphicsPresetTitle: 'Chất Lượng Đồ Họa',
    graphicsPresetDesc:
      'Tối ưu bóng đổ, đèn động, tầm nhìn và tự động giữ mượt 90 FPS',
    presets: {
      very_low: 'Rất Thấp',
      low: 'Thấp',
      medium: 'Trung Bình',
      high: 'Cao',
      ultra: 'Cực Cao',
      adaptive: 'Tự Động (Mục tiêu 90 FPS)',
    },
    shadowQuality: 'Chất Lượng Bóng',
    textureQuality: 'Chất Lượng Bề Mặt',
    lightingQuality: 'Chất Lượng Ánh Sáng',
    effectsQuality: 'Hiệu Ứng Hình Ảnh',
    fpsLimit: 'Giới Hạn FPS',
    displayMode: 'Chế Độ Màn Hình',
    fullscreenSwitch: 'Toàn Màn Hình (Thu về Cửa sổ)',
    windowedSwitch: 'Cửa Sổ (Mở Toàn Màn Hình)',
    resolutionScale: 'Độ Phân Giải Nội Bộ',
    viewDistance: 'Tầm Nhìn Xa',
    antialiasing: 'Khử Răng Cưa',
    ambientOcclusion: 'Bóng Góc Tường (AO)',
    motionBlur: 'Làm Mờ Chuyển Động',
    vsync: 'Đồng Bộ Dọc (VSync)',
    showFps: 'Hiện Chỉ Số FPS & Hiệu Năng',
    batteryDrainEnabled: 'Hao Pin Đèn Pin',
    volumes: {
      masterVolume: 'Âm Lượng Tổng',
      musicVolume: 'Nhạc Nền Kinh Dị',
      ambienceVolume: 'Âm Thanh Môi Trường & Gió',
      npcVolume: 'Giọng Nói NPC & Thì Thầm',
      monsterVolume: 'Tiếng Quái Vật & Hù Dọa',
      voiceVolume: 'Thoại Đội Nhóm',
      uiVolume: 'Âm Thanh Giao Diện',
      sfxVolume: 'Tiếng Bước Chân & Cửa',
    },
    pushToTalkMode: 'Chế Độ Giữ Nút Để Nói',
    pushToTalkDesc: (key) => `Giữ phím [${key}] để truyền giọng nói qua micro`,
    voiceModeTitle: 'Chế Độ Thoại Đội Nhóm',
    voiceModeDesc: 'Bộ Đàm Rõ nghe cực nét xuyên 6 tầng; Âm Thanh 3D giảm âm theo tường và khoảng cách.',
    voiceRadioLabel: 'Bộ Đàm Rõ (Toàn Trường)',
    voiceSpatialLabel: 'Âm Thanh 3D (Xuyên Tường)',
    voiceInputTitle: 'Thiết Bị Micro Đầu Vào',
    muteAll: 'Tắt Toàn Bộ Âm Thanh',
    mouseSensitivity: 'Độ Nhạy Chuột',
    touchControlsModeTitle: 'Điều Khiển Cảm Ứng Di Động',
    touchModeAuto: 'Tự Động (Thiết bị cảm ứng)',
    touchModeOn: 'Luôn Bật',
    touchModeOff: 'Tắt (Máy tính)',
    mobileSensitivity: 'Độ Nhạy Xoay Camera Di Động',
    mobileScale: 'Kích Thước Nút Cảm Ứng',
    pressKey: 'Nhấn phím bất kỳ...',
    resetDefaults: 'Khôi Phục Mặc Định',
    keyLabels: {
      forward: 'Đi Tới',
      backward: 'Đi Lùi',
      left: 'Đi Trái',
      right: 'Đi Phải',
      sprint: 'Chạy Nhanh',
      crouch: 'Ngồi Thấp',
      jump: 'Nhảy',
      flashlight: 'Bật / Tắt Đèn Pin',
      brightness: 'Đổi Độ Sáng Đèn',
      interact: 'Tương Tác / Trốn',
      drop: 'Vứt Vật Phẩm',
      useItem: 'Dùng Vật Phẩm Đang Chọn',
      pushToTalk: 'Giữ Nói (PTT)',
      pause: 'Tạm Dừng',
    },
  },
  pause: {
    tag: 'Trò Chơi Đang Tạm Dừng',
    subtitle: 'Nhấn Esc hoặc Tiếp Tục để quay lại ngôi trường bị bỏ hoang.',
    resume: 'Tiếp Tục',
    openMap: 'Mở Bản Đồ Trường Học [Tab]',
    restart: 'Chơi Lại Màn Này',
    settings: 'Cài Đặt',
    returnTitle: 'Về Màn Hình Chính',
  },
  loading: {
    entering: 'Đang Tiến Vào Màn',
    tip: 'Kiểm tra pin đèn pin và lắng nghe tiếng động ngoài hành lang.',
  },
  stageClear: {
    allClearedTag: 'Đã Sống Sót Qua Cả 10 Màn Chơi',
    levelClearedTag: 'Hoàn Thành Màn Chơi',
    defeatedTag: 'Gục Ngã Trong Bóng Tối',
    defeatedDesc: 'Máu của bạn đã về 0 HP. Hãy cẩn trọng quan sát hành lang khi thử lại.',
    time: 'Thời gian',
    notes: 'Ghi chú',
    secrets: 'Bí mật',
    puzzles: 'Câu đố',
    nextLevel: (next) => `Tiếp Tục Sang Màn ${next}`,
    replay: 'Chơi Lại Màn Này',
    returnTitle: 'Về Màn Hình Chính',
  },
  map: {
    title: 'Bản Đồ Kiến Trúc Ngôi Trường',
    subtitle: '6 Tầng Lầu · 3 Khu Cánh · Tầng Hầm · Sân & Bãi Xe',
    close: 'Đóng Bản Đồ [Tab / Esc]',
    floors: 'Các Tầng',
    legendYou: 'Vị trí bạn',
    legendTeammate: 'Đồng đội',
    legendStairs: 'Cầu thang',
    legendRestroom: 'Nhà vệ sinh',
    legendGate: 'Cổng chính',
    legendParking: 'Bãi đỗ xe',
    westWing: 'Cánh Tây',
    centerWing: 'Khu Trung Tâm',
    eastWing: 'Cánh Đông',
    northWing: 'Cánh Bắc',
    exteriorCourtyard: 'Cổng Trường & Sân Ngoài',
  },
  mobile: {
    rotateTitle: 'Xoay Ngang Màn Hình',
    rotateDesc:
      'NGÔI TRƯỜNG MA ÁM sử dụng cần gạt kép màn hình ngang để điều khiển 3D mượt mà nhất.',
    rotateBtn: 'Chuyển Sang Màn Hình Ngang',
    jump: 'NHẢY',
    sprint: 'CHẠY',
    crouch: 'NGỒI',
    light: 'ĐÈN',
    interact: 'LẤY/MỞ',
    use: 'DÙNG',
    map: 'BẢN ĐỒ',
    lookArea: 'Vuốt Để Xoay Nhìn',
  },
  banners: {
    outsideGateArrival:
      'Bạn đang đứng ngoài Cổng Trường Bỏ Hoang. Hãy bước qua cổng vào sân và Khu Lễ Tân.',
    damageHit: (dmg, remaining) => `Bị quái vật tấn công! -${dmg} HP (Còn ${remaining} HP)`,
    lowHealth: 'Máu của bạn đang thấp.',
    monsterChasing: 'Con quái vật đang đuổi theo bạn!',
    downedSingleplayer: 'Máu đã cạn về 0 HP...',
    downedMultiplayer: 'Bạn đã gục ngã! Chờ đồng đội đến gần nhấn [E] để hồi sinh.',
    revivedSelf: 'Đồng đội đã hồi sinh bạn! (+350 HP)',
    revivedTeammate: (name) => `Đã hồi sinh ${name}!`,
    healedAmount: (name, amount) => `Đã dùng ${name} (+${amount} HP)`,
    batteryLoaded: 'Đã thay pin mới (+60%)',
    batteryFull: 'Pin đèn pin đã đầy',
    batteryDepleted: 'Hết pin đèn pin — Nhấn [R] hoặc dùng Pin trong túi đồ',
    cannotDropEssential: 'Không thể vứt chìa khóa nhiệm vụ',
    droppedItem: (name) => `Đã bỏ ${name}`,
    lockedKey: 'Cửa bị khóa — Hãy tìm đúng chìa khóa',
    lockedSwitch: 'Mất điện — Hãy kích hoạt công tắc trước',
    lockedPuzzle: (title) => `Bị khóa — Giải câu đố "${title}" trước`,
    slotsFull: 'Cả 6 ô túi đều đầy — Nhấn [Q] để bỏ bớt vật phẩm',
    pickedUp: (name) => `Đã nhặt ${name}`,
    teammateKey: (name) => `Đồng đội đã nhặt ${name}`,
    activatedSwitch: (name) => `Đã kích hoạt: ${name}`,
    litLantern: (name, count) => `Đã thắp ${name} (${count}/2)`,
    alreadySolved: (title) => `${title} đã được giải`,
    blackoutSurge: 'Quá Tải Điện — Mất Ánh Sáng Hành Lang',
    tyRelicNearby: (name) => `Bản năng Ty: Phát hiện cổ vật ${name} gần đây`,
    noUsableItem: 'Ô đang chọn không thể sử dụng trực tiếp',
    drawerEmpty: 'Ngăn kéo trống rỗng',
    drawerClosed: 'Đã đóng ngăn kéo',
    witchHallwayWhisper: '“Hành lang này vẫn nhớ những gì ngươi định che giấu...”',
    witchTurnAroundWhisper: '“Đừng quay đầu lại giữa hành lang...”',
  },
  chatOverlay: {
    roomWord: 'PHÒNG',
    micOff: 'MIC TẮT',
    pttLive: 'ĐANG NÓI',
    pttIdle: 'GIỮ [V]',
    micLive: 'MIC BẬT',
    radioShort: 'BỘ ĐÀM',
    spatialShort: '3D',
    speakingBadge: 'ĐANG NÓI',
    chatBtn: 'Chat [Enter]',
    chatTitle: 'Chat Trực Tiếp Đội',
    youTag: 'Bạn',
    closeChat: 'Đóng [Esc]',
    openHint: 'Enter / T',
    proxOnly: 'Chỉ gần nhau (22m)',
    hide: 'Đóng',
    empty: 'Chưa có tin nhắn. Hãy trao đổi cùng đồng đội...',
    placeholder: 'Nhắn tin cho đội... [Enter]',
    send: 'Gửi',
    sizeCompact: 'Gọn',
    sizeExpanded: 'Lớn',
    dockLabel: 'Đổi góc',
    unreadLabel: (count) => `${count} mới`,
  },
};

export function getUiStrings(lang: LanguageCode): UiDictionary {
  return lang === 'vi' ? VI_DICT : EN_DICT;
}

const VI_LEVEL_TEXT: Record<
  number,
  {
    name: string;
    subtitle: string;
    difficultyLabel: string;
    startingZone: string;
    objectiveDescription: string;
    objectives: Record<string, string>;
  }
> = {
  1: {
    name: 'Khu Lễ Tân Trống Rỗng',
    subtitle: 'Cổng Trường Bỏ Hoang, Sân & Khu Lễ Tân',
    difficultyLabel: 'Rất Dễ',
    startingZone: 'Ngoài Cổng Chính Trường Học',
    objectiveDescription:
      'Đi qua Cổng Chính vào Khu Lễ Tân, đọc Nhật Ký Bảo Vệ, khôi phục Cầu Dao B, tìm Chìa Khóa Sân Trong ở Văn Phòng Giáo Viên và mở Cửa Thoát Hiểm Nam.',
    objectives: {
      obj_l1_note: 'Tìm ghi chú bí ẩn đầu tiên trên bàn lễ tân',
      obj_l1_key: 'Tìm Chìa Khóa Sân Trong & khôi phục mạch điện Lễ Tân (Breaker B)',
      obj_l1_exit: 'Mở khóa Cửa Thoát Hiểm Nam',
    },
  },
  2: {
    name: 'Lớp Học Bị Lãng Quên',
    subtitle: 'Dãy Lớp Cánh Đông & Phòng Chứa Đồ',
    difficultyLabel: 'Dễ',
    startingZone: 'Hành Lang Cánh Đông',
    objectiveDescription:
      'Thu thập đồ thất lạc trong lớp học, giải mã khóa bảng đen, lấy Chìa Khóa Khu Hiệu Trưởng và mở Lối Ra Cầu Thang Đông.',
    objectives: {
      obj_l2_items: 'Kiểm tra Lớp 101/102 tìm đồ vật và manh mối bảng đen',
      obj_l2_puzzle: 'Giải mật mã tủ khóa lớp học (Câu đố)',
      obj_l2_exit: 'Mở Lối Ra Hành Lang Cánh Đông',
    },
  },
  3: {
    name: 'Thư Viện Tĩnh Lặng',
    subtitle: 'Giá Sách Cao, Phòng Đọc & Phòng Mật',
    difficultyLabel: 'Dễ đến Trung Bình',
    startingZone: 'Thư Viện Trường Học',
    objectiveDescription:
      'Trò chuyện với Phù Thủy giữa dãy giá sách, xếp 3 cuốn sổ lịch sử đúng thứ tự và mở lối đi bí mật.',
    objectives: {
      obj_l3_witch: 'Gặp Phù Thủy & tìm Ghi Chú Thủ Thư',
      obj_l3_puzzle: 'Sắp xếp 3 cuốn sổ theo thứ tự thời gian (Câu đố)',
      obj_l3_exit: 'Kéo cuốn sổ nghiêng bí mật & thoát qua Lối Đi Ẩn',
    },
  },
  4: {
    name: 'Phòng Thí Nghiệm Khoa Học',
    subtitle: 'Khu Khoa Học & Hóa Học (Quái Vật Nhạy Tiếng Động)',
    difficultyLabel: 'Trung Bình',
    startingZone: 'Phòng Thí Nghiệm Khoa Học',
    objectiveDescription:
      'Di chuyển khẽ qua Bò Sát nhạy tiếng ồn, tìm báo cáo hóa chất, giải khóa van hóa chất và khôi phục nguồn điện.',
    objectives: {
      obj_l4_doc: 'Tìm Báo Cáo Sự Cố Hóa Học & cuộn đồng thí nghiệm',
      obj_l4_puzzle: 'Giải Bảng Van Phòng Thí Nghiệm (Câu đố)',
      obj_l4_exit: 'Bật cầu dao tổng phòng máy & mở Lối Ra Khu Khoa Học',
    },
  },
  5: {
    name: 'Đêm Phong Tỏa Phòng Máy',
    subtitle: 'Phòng Máy Tính, Văn Phòng Hiệu Trưởng & Thư Viện',
    difficultyLabel: 'Trung Bình đến Khó',
    startingZone: 'Phòng Máy Tính',
    objectiveDescription:
      'Đối chiếu lời khai NPC với hồ sơ Văn Phòng Hiệu Trưởng, giải mật khẩu Phòng Máy Tính, lấy Chìa Khóa Thư Viện và mở Cửa Bắc Thư Viện.',
    objectives: {
      obj_l5_docs: 'Kiểm tra Máy Chủ Hiệu Trưởng & tra tên nữ sinh mất tích Trần Linh',
      obj_l5_puzzle: 'Giải Mật Khẩu Máy Tính Phòng Tin Học (Câu đố)',
      obj_l5_exit: 'Lấy Chìa Khóa Chính Thư Viện & mở Cửa Bắc',
    },
  },
  6: {
    name: 'Tầng Hầm Ngầm',
    subtitle: 'Phòng Lò Hơi & Đường Hầm Chật Hẹp',
    difficultyLabel: 'Khó',
    startingZone: 'Tầng Hầm Ngầm B1',
    objectiveDescription:
      'Kiểm soát ánh sáng đèn pin trước Kẻ Rình Rập Hành Lang, cân bằng bảng điện tầng hầm và mở Cửa Sân Hầm.',
    objectives: {
      obj_l6_note: 'Đọc Cảnh Báo Bảo Trì trong đường hầm lò hơi',
      obj_l6_puzzle: 'Cân bằng tải cầu dao tầng hầm bị hỏng (Câu đố)',
      obj_l6_exit: 'Gạt Cầu Dao Chính & mở Cửa Sân Dưới Hầm',
    },
  },
  7: {
    name: 'Lãnh Địa Của Phù Thủy',
    subtitle: 'Nghi Lễ Cổ, Lời Nói Dối & Cổ Vật Ẩn',
    difficultyLabel: 'Rất Khó',
    startingZone: 'Nhà Ăn Trường Học',
    objectiveDescription:
      'Phát hiện mâu thuẫn trong lời Phù Thủy, tìm Ấn Đồng Trường 1998, giải Câu Đố Biểu Tượng và mở Lối Ra Phòng Y Tế.',
    objectives: {
      obj_l7_witch: 'Đối chất Phù Thủy & kiểm chứng lời nói thật/dối của NPC',
      obj_l7_puzzle: 'Giải Câu Đố Suy Luận Biểu Tượng Nghi Lễ (Câu đố)',
      obj_l7_exit: 'Tìm Chìa Khóa Phòng Y Tế & mở Lối Ra Nhà Ăn',
    },
  },
  8: {
    name: 'Ngôi Trường Không Ánh Sáng',
    subtitle: 'Bóng Tối Bao Trùm & Quái Vật Săn Đuổi',
    difficultyLabel: 'Cực Khó',
    startingZone: 'Khu Lễ Tân Tối Đen',
    objectiveDescription:
      'Thắp sáng đèn dầu khẩn cấp giữa màn đêm đặc quánh, giải mã lưới điện dự phòng và mở Cổng Tầng Hầm.',
    objectives: {
      obj_l8_lights: 'Thắp sáng 2 đèn dầu khẩn cấp xua tan bóng tối',
      obj_l8_puzzle: 'Giải Mật Mã Lưới Điện Khẩn Cấp (Câu đố)',
      obj_l8_exit: 'Tìm Chìa Khóa Cổng Hầm & xuống Cầu Thang Hầm',
    },
  },
  9: {
    name: 'Sự Thật Bị Lãng Quên',
    subtitle: 'Điều Tra Đa Tầng & Hồ Sơ Thảm Kịch 1998',
    difficultyLabel: 'Cực Khó',
    startingZone: 'Sân Trường Ngoài Trời',
    objectiveDescription:
      'Khôi phục trình tự thảm kịch năm 1998 từ các tài liệu rải rác và mở Cửa Lên Sân Thượng.',
    objectives: {
      obj_l9_evidence: 'Thu thập hồ sơ lịch sử năm 1998 ở sân trường',
      obj_l9_puzzle: 'Sắp xếp Trình Tự Sự Kiện 1998 (Câu đố)',
      obj_l9_exit: 'Lấy Chìa Khóa Sân Thượng & mở Cửa Cầu Thang Lên Trên',
    },
  },
  10: {
    name: 'Đêm Cuối Cùng',
    subtitle: 'Toàn Bộ 6 Tầng Kết Nối — Cuộc Tẩu Thoát Cuối',
    difficultyLabel: 'Cực Đại',
    startingZone: 'Sân Thượng Tầng 6',
    objectiveDescription:
      'Toàn bộ quái vật và Phù Thủy cùng truy lùng khắp trường. Kích hoạt Đèn Hiệu Sân Thượng, giải Mật Mã Cuối và thoát thân.',
    objectives: {
      obj_l10_beacon: 'Bật công tắc Đèn Hiệu Khẩn Cấp trên sân thượng',
      obj_l10_puzzle: 'Giải Mật Mã Tổng Ngôi Trường (Câu đố)',
      obj_l10_exit: 'Mở Cửa Sập Thoát Hiểm Cuối Cùng',
    },
  },
};

export function localizeLevel(cfg: LevelConfig, lang: LanguageCode): LevelConfig {
  if (lang === 'en') return cfg;
  const vi = VI_LEVEL_TEXT[cfg.level];
  if (!vi) return cfg;
  return {
    ...cfg,
    name: vi.name,
    subtitle: vi.subtitle,
    difficultyLabel: vi.difficultyLabel,
    startingZone: vi.startingZone,
    objectiveDescription: vi.objectiveDescription,
    objectives: cfg.objectives.map((o) => ({
      ...o,
      label: vi.objectives[o.id] ?? o.label,
    })),
  };
}

const VI_CHARACTER_TEXT: Record<
  CharacterId,
  {
    title: string;
    personality: string[];
    specialAbility: string;
    advantages: string[];
    tradeoff: string;
  }
> = {
  ty: {
    title: 'Công Tử Sưu Tầm',
    personality: [
      'Hơi thừa cân',
      'Xuất thân gia đình giàu có',
      'Thích săn tìm cổ vật quý giá',
      'Thỉnh thoảng phàn nàn khi gặp nguy hiểm',
    ],
    specialAbility: 'LỢI THẾ TÀI NGUYÊN',
    advantages: [
      'Mang được nhiều vật phẩm hơn (+2 ô) & thêm pin dự phòng',
      'Dễ dàng phát hiện cổ vật quý ẩn giấu từ xa',
      'Quản lý pin đèn pin tiết kiệm hơn',
    ],
    tradeoff: 'Thể lực chạy nước rút thấp hơn (88 Thể Lực tối đa, hao nhanh +12%)',
  },
  nam: {
    title: 'Nhà Phân Tích Logic',
    personality: [
      'Cực kỳ thông minh',
      'Giỏi suy luận logic và quy luật',
      'Dễ hoảng sợ khi có hiện tượng siêu nhiên',
      'Thường lo lắng khi đèn chớp tắt bất thường',
    ],
    specialAbility: 'TƯ DUY PHÂN TÍCH',
    advantages: [
      'Giải mã ký hiệu ẩn & quy luật số học trên ghi chú',
      'Nhận thêm gợi ý phân tích chuyên sâu ở các câu đố',
      'Nhìn rõ cơ chế khóa điện tử & mật mã',
    ],
    tradeoff: 'Hồi phục thể lực chậm hơn khi bị hoảng sợ trước hiện tượng ma quái',
  },
  hoa: {
    title: 'Thám Tử Nhanh Nhẹn',
    personality: [
      'Suy nghĩ cực nhanh',
      'Thông minh và quan sát tinh tường',
      'Nhận ra chi tiết bất thường nhỏ nhất',
      'Bình tĩnh giải quyết tình huống khó',
    ],
    specialAbility: 'PHÂN TÍCH NHANH',
    advantages: [
      'Tầm quan sát & tương tác vật thể xa hơn (3.55m)',
      'Hiện chú thích ẩn trên ghi chú và công tắc mật',
      'Phát hiện cơ quan bí mật & giải cơ chế nhanh hơn',
    ],
    tradeoff: 'Thể lực và sức chứa túi đồ ở mức tiêu chuẩn',
  },
  hai: {
    title: 'Vận Động Viên Tốc Độ',
    personality: [
      'Nhanh nhẹn và thể chất vượt trội',
      'Chạy nhanh nhất trong cả nhóm',
      'Nguồn thể lực dồi dào',
      'Luôn bảo vệ đồng đội khi bị truy đuổi',
    ],
    specialAbility: 'LỢI THẾ THỂ CHẤT',
    advantages: [
      'Thể lực chạy cao nhất nhóm (125 Thể Lực tối đa)',
      'Hồi thể lực nhanh hơn +28% & chạy nhanh hơn +10%',
      'Mở đóng cửa vật lý nhanh hơn khi chạy trốn',
    ],
    tradeoff: 'Không có gợi ý giải đố hay hội thoại đặc biệt',
  },
  phuong: {
    title: 'Chuyên Gia Tâm Lý',
    personality: [
      'Thấu hiểu sâu sắc cảm xúc người khác',
      'Hay trêu đùa ngay cả trong hành lang đáng sợ',
      'Khả năng giao tiếp thuyết phục',
      'Giữ bình tĩnh tốt dưới áp lực tâm lý',
    ],
    specialAbility: 'TRÍ TUỆ CẢM XÚC',
    advantages: [
      'Đọc vị cảm xúc NPC & phát hiện ngay lời nói dối',
      'Mở khóa lựa chọn đối thoại độc quyền với các linh hồn/NPC',
      'Ít bị ảnh hưởng tinh thần khi đèn nhấp nháy hoặc chạm trán ma quái',
    ],
    tradeoff: 'Sức chứa vật phẩm ít hơn Ty',
  },
};

export function localizeCharacter(
  profile: PlayableCharacterProfile,
  lang: LanguageCode
): PlayableCharacterProfile {
  if (lang === 'en') return profile;
  const vi = VI_CHARACTER_TEXT[profile.id];
  if (!vi) return profile;
  return { ...profile, ...vi };
}

const VI_PUZZLES: Record<
  string,
  {
    title: string;
    prompt: string;
    clues: string[];
    hint: string;
    analyticalHint?: string;
    quickHint?: string;
    optionLabels?: Record<string, string>;
    solvedText: string;
  }
> = {
  puzzle_l1_circuit: {
    title: 'Kiểm Tra Cầu Dao Khu Lễ Tân',
    prompt:
      'Bảng điện Lễ Tân có 3 cầu dao: BREAKER A (Đèn Sân Ngoài), BREAKER B (Đèn Khẩn Cấp Hành Lang Đông), BREAKER C (Chuông Trường Bỏ Hoang). Để thắp sáng lối vào Lớp 101 mà KHÔNG làm rung chuông báo động thu hút quái vật, bạn phải bật cầu dao nào?',
    clues: [
      'Bảng thông báo: "TUYỆT ĐỐI KHÔNG bật BREAKER C — tiếng chuông sẽ gọi thứ gì đó tới."',
      'Nhật ký bảo vệ: "Đèn Hành Lang Đông mất điện lúc 02:15."',
    ],
    hint: 'Chọn cầu dao gắn với đèn Hành Lang Đông.',
    analyticalHint: 'Loại bỏ A (ngoài sân) và C (chuông báo động); chỉ còn B cấp điện hành lang.',
    quickHint: 'Phân Tích Nhanh: Vết cháy xém nằm ngay cạnh công tắc BREAKER B.',
    solvedText: 'Đã đóng mạch — Đèn khẩn cấp Hành Lang Đông đã sáng lại.',
  },
  puzzle_l2_cabinet: {
    title: 'Ổ Khóa Số Tủ Lớp 102',
    prompt:
      'Trên bảng đen vỡ ở Lớp 102 còn khoanh tròn dãy số phấn trắng: 2, 6, 12, 20, __ . Nhập số tiếp theo trong quy luật để mở tủ giáo viên.',
    clues: [
      'Hiệu số giữa các số liên tiếp: +4, +6, +8...',
      'Ghi chú bên lề bảng: "Mỗi bước cộng thêm 2 đơn vị."',
    ],
    hint: 'Mỗi lần tăng thêm +4, +6, +8... vậy bước tiếp theo cộng bao nhiêu?',
    analyticalHint: 'Công thức n×(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, tiếp theo là 5×6.',
    quickHint: 'Phân Tích Nhanh: Lấy 20 cộng thêm bước chẵn kế tiếp (+10).',
    solvedText: 'Chốt khóa tủ bật mở nhẹ nhàng.',
  },
  puzzle_l3_books: {
    title: 'Sắp Xếp Sổ Lưu Trữ Thư Viện',
    prompt:
      'Sắp xếp 3 cuốn sổ lưu trữ theo thứ tự từ CŨ NHẤT đến MỚI NHẤT để mở chốt giá sách bí mật.',
    clues: [
      'Hiến Chương Thành Lập đóng dấu Tháng 5/1974.',
      'Sổ Kiểm Tra Lò Hơi đóng dấu Mùa Đông 1989.',
      'Sổ Điểm Danh Cuối đóng dấu Tháng 10/1998.',
    ],
    hint: 'Nhấn chọn theo thứ tự năm tăng dần từ 1974 đến 1998.',
    analyticalHint: '1974 < 1989 < 1998.',
    quickHint: 'Phân Tích Nhanh: Bắt đầu với Hiến Chương 1974.',
    optionLabels: {
      'Founding Charter (1974)': 'Hiến Chương Thành Lập (1974)',
      'Boiler Ledger (1989)': 'Sổ Kiểm Tra Lò Hơi (1989)',
      'Final Attendance (1998)': 'Sổ Điểm Danh Cuối (1998)',
    },
    solvedText: 'Bên trong giá sách vang tiếng lách cách — cuốn sổ nghiêng bí mật đã sẵn sàng.',
  },
  puzzle_l4_lab: {
    title: 'Khóa Van Tủ Hút Khí Hóa Học',
    prompt:
      'Ba van (B = Xanh Dương, A = Hổ Phách, R = Đỏ) điều khiển chốt điện phòng thí nghiệm. Quy tắc khắc trên bàn đá: (1) B KHÔNG đứng đầu. (2) R mở ngay SAU A. Nhập chuỗi 3 chữ cái thứ tự mở van (ví dụ XYZ bằng B, A, R).',
    clues: [
      'Quy tắc 1: B không ở vị trí số 1.',
      'Quy tắc 2: A luôn đứng ngay trước R (AR).',
      'Quy tắc 3: Van cuối cùng KHÔNG phải R.',
    ],
    hint: 'Nếu AR đi liền nhau và R không được đứng thứ 3 thì AR phải ở vị trí nào?',
    analyticalHint: 'Chỉ vị trí 1–2 cho phép AR mà R không đứng thứ 3, còn lại vị trí 3 là B.',
    quickHint: 'Phân Tích Nhanh: Van A có vết cờ-lê xước mới nhất ở vị trí đầu.',
    solvedText: 'Khóa tủ hút khí mở ra kèm luồng hơi lạnh.',
  },
  puzzle_l5_password: {
    title: 'Mật Khẩu Máy Tính Phòng Tin Học',
    prompt:
      'Hệ thống yêu cầu HỌ viết hoa không dấu + NĂM tốt nghiệp (viết liền) của học sinh mất tích năm 1998. Hồ sơ ghi: "Học sinh L. TRAN mất tích trong sự cố mất điện tháng 10/1998."',
    clues: [
      'Ghi chú Hiệu Trưởng: "Linh Tran — Khóa 1998."',
      'Định dạng trên viền màn hình: SURNAMEYYYY',
    ],
    hint: 'Ghép họ "TRAN" và năm 4 chữ số viết liền không dấu cách.',
    analyticalHint: 'Định dạng: 4 chữ cái viết hoa + 4 chữ số = 8 ký tự.',
    quickHint: 'Phân Tích Nhanh: Tờ giấy nhớ dưới bàn phím ghi "TRAN + năm mất điện".',
    solvedText: 'Truy cập được chấp nhận — Danh mục Khu Cấm đã mở.',
  },
  puzzle_l6_breaker: {
    title: 'Cân Bằng Tải Tủ Điện Tầng Hầm',
    prompt:
      'Bảng điện tầng hầm cần đúng 24 Ampe qua 3 cuộn rơ-le nguyên vẹn. Các cuộn hiện có: 5A, 7A, 9A, 10A, 13A. Nhập 3 giá trị cần dùng cách nhau bằng dấu gạch ngang (ví dụ 4-6-8).',
    clues: [
      'Biển bảo trì: "Không sử dụng cuộn 13A đã bị gỉ."',
      'Cần tổng đúng 24A từ 3 trong 4 cuộn {5, 7, 9, 10}.',
    ],
    hint: 'Loại 13A; kiểm tra 3 số nào trong {5, 7, 9, 10} cộng lại bằng 24.',
    analyticalHint: 'Tổng {5,7,9,10} là 31; 31 - 24 = 7, vậy bỏ số 7!',
    quickHint: 'Phân Tích Nhanh: Rơ-le 7A bị đứt dây đồng.',
    solvedText: 'Tủ phụ hoạt động ổn định — Nguồn điện đã dẫn về Cầu Dao Chính.',
  },
  puzzle_l7_symbols: {
    title: 'Ấn Ký Lời Khai Mâu Thuẫn Của Phù Thủy',
    prompt:
      'Ba giọng nói khẳng định nơi giấu chìa khóa ấn ký (dưới MOON, EYE, hoặc BELL), và chỉ CÓ DUY NHẤT MỘT người nói thật: Bảo Vệ Đêm nói "Ấn ký nằm dưới MOON." Nhân Chứng Lưu Trữ thì thầm "Nó KHÔNG nằm dưới MOON." Phù Thủy mỉm cười "Nó KHÔNG nằm dưới BELL." Biểu tượng nào phá giải ấn ký?',
    clues: [
      'Trong 3 lời khai chỉ có ĐÚNG 1 câu là thật.',
      'Bảo vệ: "Nằm dưới MOON." · Nhân chứng: "KHÔNG nằm dưới MOON."',
      'Phù Thủy: "KHÔNG nằm dưới BELL."',
    ],
    hint: 'Bảo vệ và Nhân chứng nói hoàn toàn trái ngược nhau, nên chắc chắn 1 trong 2 người đó là người duy nhất nói thật.',
    analyticalHint:
      'Vì Bảo vệ và Nhân chứng đối lập nên một người nói thật -> Phù Thủy CHẮC CHẮN nói dối ("KHÔNG dưới BELL" là sai => đáp án là BELL).',
    quickHint: 'Phân Tích Nhanh: Vết cào mới khắc quanh biểu tượng BELL.',
    solvedText: 'Vòng tròn phấn trắng tan biến — Lời dối trá bị phơi bày.',
  },
  puzzle_l8_blackout: {
    title: 'Mật Mã Lưới Điện Khẩn Cấp',
    prompt:
      'Bảng điện phụ nhấp nháy mã 4 chữ cái ghép từ chữ cái đầu (tiếng Anh) của 4 khu vực tối đen: Reception, Library, Chemistry, Basement. Nhập mã 4 chữ cái.',
    clues: [
      'Ký hiệu sơn trên tường: "R -> L -> C -> B vòng khẩn cấp."',
      'Lấy chữ cái đầu của từng tên khu vực theo đúng thứ tự.',
    ],
    hint: 'Ghép 4 chữ cái đầu của Reception, Library, Chemistry, Basement.',
    analyticalHint: '4 chữ cái viết hoa liền nhau: R, L, C, B.',
    quickHint: 'Phân Tích Nhanh: Nét khắc mờ trên nắp cầu dao phủ bụi.',
    solvedText: 'Các rơ-le dự phòng hành lang đã đóng mạch mờ nhạt.',
  },
  puzzle_l9_timeline: {
    title: 'Trình Tự Thảm Kịch Năm 1998',
    prompt:
      'Sắp xếp đúng 4 bước xảy ra sự kiện tháng 10/1998 khiến ngôi trường bị bỏ hoang mãi mãi.',
    clues: [
      'Ban đầu xảy ra rò rỉ và cháy hóa chất dưới trục Hóa Học / Tầng Hầm.',
      'Nữ sinh Trần Linh mất tích khi quay lại Thư Viện lấy hồ sơ.',
      'Hiệu trưởng niêm phong toàn bộ chìa khóa tổng vào két sắt văn phòng.',
      'Sáng hôm sau Hội đồng trường ra lệnh sơ tán vĩnh viễn.',
    ],
    hint: 'Sự cố hỏa hoạn xảy ra đầu tiên, tiếp đến vụ mất tích, giấu chìa khóa và cuối cùng là sơ tán.',
    analyticalHint: 'Cháy hóa chất -> Mất tích -> Niêm phong chìa khóa -> Sơ tán.',
    quickHint: 'Phân Tích Nhanh: Theo đúng trình tự ngày 12 -> 13 -> 14 -> 15 tháng 10.',
    optionLabels: {
      'Chemical Surge & Fire': 'Rò Rỉ & Cháy Hóa Chất (12/10)',
      'Student Vanished in Library': 'Nữ Sinh Mất Tích Ở Thư Viện (13/10)',
      'Keys Sealed by Principal': 'Hiệu Trưởng Niêm Phong Chìa Khóa (14/10)',
      'Permanent Evacuation': 'Sơ Tán Vĩnh Viễn (15/10)',
    },
    solvedText: 'Hồ sơ lịch sử khớp hoàn toàn — Khóa Lên Sân Thượng đã xác nhận.',
  },
  puzzle_l10_final: {
    title: 'Mật Mã Tổng Kết Thúc Đêm Kinh Hoàng',
    prompt:
      'Kết hợp hai chân lý xuyên suốt 6 tầng để mở Cửa Thoát Hiểm Sân Thượng: [Đáp án dãy số Lớp 102 (2 chữ số)] + [Năm xảy ra thảm kịch (4 chữ số)] — Nhập mật mã 6 chữ số.',
    clues: [
      'Từ Lớp 102 (Màn 2): 2, 6, 12, 20, [?]',
      'Từ hồ sơ Màn 3/5/9: Trường bị bỏ hoang vào tháng 10 năm [????]',
    ],
    hint: 'Đặt đáp án 2 chữ số của Lớp 102 ngay trước năm 1998.',
    analyticalHint: 'Số 30 ghép liền trước 1998.',
    quickHint: 'Phân Tích Nhanh: Gồm 6 chữ số khắc bên trong vòng quay cửa sập.',
    solvedText: 'MẬT MÃ CUỐI ĐƯỢC CHẤP NHẬN — Cửa Sập Thoát Hiểm Đã Mở!',
  },
};

export function localizePuzzle(puzzle: PuzzleDefinition, lang: LanguageCode): PuzzleDefinition {
  if (lang === 'en') return puzzle;
  const vi = VI_PUZZLES[puzzle.id];
  if (!vi) return puzzle;
  return {
    ...puzzle,
    ...vi,
  };
}

const VI_ITEM_MAP: Record<string, { name: string; description: string }> = {
  bat_starter: { name: 'Pin Đèn Pin D-Cell', description: 'Hồi +60% năng lượng đèn pin' },
  bat_1: { name: 'Pin Đèn Pin (D-Cell)', description: 'Hồi +60% năng lượng đèn pin' },
  bat_2: { name: 'Pin Đèn Pin (D-Cell)', description: 'Hồi +60% năng lượng đèn pin' },
  bat_3: { name: 'Pin Đèn Pin (D-Cell)', description: 'Hồi +60% năng lượng đèn pin' },
  bat_4: { name: 'Pin Đèn Pin (D-Cell)', description: 'Hồi +60% năng lượng đèn pin' },
  bat_f2: { name: 'Pin Đèn Pin (D-Cell)', description: 'Hồi +60% năng lượng đèn pin' },
  heal_bandage_1: { name: 'Cuộn Băng Y Tế', description: 'Vật phẩm hồi phục (+200 HP)' },
  heal_tonic_1: { name: 'Nước Thảo Mộc Y Tế', description: 'Dung dịch hồi phục (+300 HP)' },
  heal_kit_1: { name: 'Hộp Sơ Cứu Y Tế', description: 'Bộ sơ cứu hoàn chỉnh (+400 HP)' },
  heal_f2_bandage_item: { name: 'Cuộn Băng Y Tế', description: 'Vật phẩm hồi phục (+200 HP)' },
  heal_f3_tonic_item: { name: 'Nước Thảo Mộc Y Tế', description: 'Dung dịch hồi phục (+300 HP)' },
  heal_f4_kit_item: { name: 'Hộp Sơ Cứu Y Tế', description: 'Bộ sơ cứu hoàn chỉnh (+400 HP)' },
  heal_f5_bandage_item: { name: 'Cuộn Băng Y Tế', description: 'Vật phẩm hồi phục (+200 HP)' },
  heal_f6_kit_item: { name: 'Hộp Sơ Cứu Y Tế', description: 'Bộ sơ cứu hoàn chỉnh (+400 HP)' },
  key_courtyard: { name: 'Chìa Khóa Sân Trong', description: 'Mở Cửa Thoát Hiểm Nam ở Lễ Tân' },
  key_principal: { name: 'Chìa Khóa Khu Hiệu Trưởng', description: 'Mở Cầu Thang Đông & Hồ Sơ' },
  key_library: { name: 'Chìa Khóa Tổng Thư Viện', description: 'Mở Cửa Bắc Thư Viện' },
  key_infirmary: { name: 'Chìa Khóa Phòng Y Tế', description: 'Mở Hành Lang Nhà Ăn & Phòng Y Tế' },
  key_basement: { name: 'Chìa Khóa Cổng Tầng Hầm', description: 'Mở Cầu Thang Xuống Tầng Hầm' },
  key_rooftop: { name: 'Chìa Khóa Sân Thượng', description: 'Mở Cửa Lên Sân Thượng Tầng 6' },
  relic_seal: { name: 'Ấn Đồng Trường Học 1998', description: 'Cổ vật đồng khắc ẩn sau giá sách thư viện' },
  item_chalk: { name: 'Hộp Phấn Đánh Số', description: 'Phấn Lớp 101 ghi quy luật +4, +6, +8' },
  item_compass: { name: 'Com-pa Đồng Kỹ Thuật', description: 'Dụng cụ hình học tìm thấy ở Lớp 102' },
  item_copper_coil: { name: 'Cuộn Dây Đồng Rơ-le', description: 'Linh kiện thay thế bảng điện thí nghiệm' },
};

export function localizeItem(item: InventoryItem, lang: LanguageCode): InventoryItem {
  if (lang === 'en') return item;
  const vi = VI_ITEM_MAP[item.id];
  if (!vi) return item;
  return { ...item, name: vi.name, description: vi.description };
}

const VI_NOTES: Record<string, Partial<NoteDocument>> = {
  note_reception: {
    title: 'Nhật Ký Bảo Vệ — Ngày 14 Tháng 10',
    author: 'Arthur Vance, Bảo Vệ Đêm',
    body: 'Đèn huỳnh quang ở Hành Lang Đông lại hỏng lúc 02:15. Không còn học sinh nào từ năm 1998, nhưng chuông lớp vẫn rung khẽ sau những cánh cửa khóa. Tôi để Chìa Khóa Sân Trong trong Văn Phòng Giáo Viên trước khi khóa cửa.',
    analyticalHint: 'Quy luật: Mốc 02:15 trùng với cánh cửa ĐẦU TIÊN phía bắc Hành Lang Đông.',
    quickClue: 'Manh mối nhanh: Đi thẳng Hành Lang Trung Tâm, rẽ phải vào Cánh Đông, vào cửa đầu tiên bên trái.',
  },
  note_security: {
    title: 'Nhật Ký Cổng Bảo Vệ & Camera CCTV',
    author: 'Bàn Trực Bảo Vệ Số 1',
    body: 'Cửa chính đã tháo chốt để kiểm tra, nhưng các tầng trên từ Tầng 2 đến Tầng 6 vẫn tối om. Cảm biến chuyển động liên tục báo động gần Giếng Thang Trung Tâm A ở Tầng 2 và Hành Lang Bí Mật Tầng 5.',
    analyticalHint: 'Cấu trúc cầu thang: Giếng Thang Trung Tâm nối thông T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> Sân Thượng theo các chiếu nghỉ Bắc/Nam xen kẽ.',
    quickClue: 'Manh mối nhanh: Đi vào Sảnh Trung Tâm rồi rẽ vào vòm cầu thang phía Đông để lên hết 6 tầng.',
  },
  note_classroom: {
    title: 'Giấy Phạt Bị Xé Nát',
    author: 'Phòng 102',
    body: 'Chúng tôi nghe tiếng bước chân đi qua lại trên trần nhà suốt tiết ba. Hiệu trưởng đã tịch thu toàn bộ chìa khóa tổng và tự khóa mình trong văn phòng ở Cánh Tây. Nếu đèn chớp liên hồi, hãy trốn vào tủ sắt ngay lập tức.',
    analyticalHint: 'Quy luật: Tần suất nhấp nháy tăng nhanh trước khi sự cố điện xảy ra.',
    quickClue: 'Manh mối nhanh: Tủ sắt ẩn nấp đặt sát bức tường nam của Lớp 102.',
  },
  note_principal: {
    title: 'Thông Báo Niêm Phong — Hội Đồng Giáo Dục',
    author: 'Hiệu Trưởng H. Mercer',
    body: 'Có hiệu lực ngay lập tức: Khu vực Thư Viện bị phong tỏa. Một khoảng trống bí ẩn được phát hiện phía sau dãy giá sách phía tây. Hồ sơ học sinh mất tích: Linh Tran — Khóa 1998 mất tích gần dãy giá sách Thư Viện trong đêm mất điện tháng 10. Chỉ khi kéo cuốn sổ đỏ đặt nghiêng mới mở được lối đi đối trọng.',
    analyticalHint: 'Cơ chế: Đối trọng tường tây kích hoạt từ cuốn sổ ở dãy đầu tiên. Mật khẩu máy tính gắn với TRAN + 1998.',
    quickClue: 'Manh mối nhanh: Kiểm tra hàng giá sách đầu tiên trong Thư Viện để tìm công tắc nghiêng.',
  },
  note_library: {
    title: 'Ghi Chú Bên Lề Của Thủ Thư',
    author: 'Ẩn danh',
    body: 'Đường hầm tầng hầm chạy bên dưới thư viện tới phòng lò hơi. Ai đó đã ngắt Cầu Dao Chính dưới hầm. Hãy giữ pin dự phòng — đèn pin ở mức Sáng Cao hao pin nhanh nhất.',
    analyticalHint: 'Đường điện: Cầu Dao Chính nối phòng lò hơi tầng hầm với Cửa Sân Hầm.',
    quickClue: 'Manh mối nhanh: Dùng Cầu Thang Tầng Hầm cạnh Hành Lang Trung Tâm để đi xuống.',
  },
  note_lab: {
    title: 'Báo Cáo Sự Cố Phòng Hóa Học',
    author: 'Tiến Sĩ S. Kael',
    body: 'Luồng gió lạnh thổi ra từ ống thông hơi phía trên tủ hút khí hóa chất. Chìa Khóa Phòng Y Tế bị rơi gần bàn thí nghiệm cuối phòng khi mất điện. Đừng nán lại hành lang tối.',
    analyticalHint: 'Nhật ký phòng lab: Chìa khóa rơi cạnh dãy bàn thủy tinh phía bắc.',
    quickClue: 'Manh mối nhanh: Kiểm tra chiếc bàn ở cuối phía bắc Phòng Hóa Học.',
  },
  note_basement: {
    title: 'Cảnh Báo Đội Bảo Trì',
    author: 'Tổ Bảo Trì Tầng Hầm',
    body: 'Đường ống hơi tự gõ nhịp cách vài phút một lần. Khi khôi phục Cầu Dao Chính, cuối cùng mới mở được Cổng Sân Hầm và lối lên Sân Thượng.',
    analyticalHint: 'Mạch điện: Khôi phục Cầu Dao sẽ mở Cửa Thoát Hầm phía đông.',
    quickClue: 'Manh mối nhanh: Đi theo vòng hành lang bê tông về phía đông sau khi bật Cầu Dao Chính.',
  },
  note_f6_archive: {
    title: 'Hồ Sơ Thanh Tra Niêm Phong Tầng 6',
    author: 'Thanh Tra Học Khu',
    body: 'Tầng 6 bị đóng cửa ngay sau cuộc sơ tán năm 1998. Phòng Bí Ẩn và các hành lang bỏ quên vẫn lưu lại những phép tính phấn trùng khớp với Lớp 102 và Cửa Sập Thoát Hiểm Sân Thượng.',
    analyticalHint: 'Mật mã cuối: Ghép đáp án dãy số Lớp 102 (30) với năm sơ tán (1998).',
    quickClue: 'Manh mối nhanh: Leo Giếng Thang B từ chiếu nghỉ Bắc Tầng 6 để lên Sân Thượng.',
  },
  doc_1998_fire: {
    title: 'Biên Niên Sử Sự Cố 1998',
    author: 'Lưu Trữ Học Khu',
    body: '12/10: Sự cố hóa chất & hỏa hoạn dưới Cánh Hóa Học. 13/10: Nữ sinh Trần Linh mất tích trong Thư Viện. 14/10: Hiệu Trưởng Mercer niêm phong két chìa khóa. 15/10: Lệnh sơ tán vĩnh viễn.',
    analyticalHint: 'Nhắc nhở: Thứ tự đúng là Cháy -> Mất tích -> Niêm phong chìa khóa -> Sơ tán.',
    quickClue: 'Manh mối nhanh: Đối chiếu trực tiếp với Bảng Tưởng Niệm 1998 ngay bên cạnh.',
  },
  comp_log_teacher: {
    title: 'Máy Trạm Nội Bộ Giáo Viên',
    author: 'HỆ THỐNG // 14-10-1998',
    body: 'CẢNH BÁO: Khóa cửa thoát hiểm phía Nam đã kích hoạt. Chìa Khóa Sân Trong được ghi nhận nằm tại bàn Văn Phòng Giáo Viên.',
  },
};

export function localizeNote(note: NoteDocument, lang: LanguageCode): NoteDocument {
  if (lang === 'en') return note;
  const vi = VI_NOTES[note.id];
  if (!vi) return note;
  return { ...note, ...vi };
}

const VI_NPC_SESSIONS: Record<
  string,
  {
    npcName: string;
    greeting: string;
    emotionalRead?: string;
    options: Record<string, { label: string; response: string; revealsLie?: string }>;
  }
> = {
  npc_witch: {
    npcName: 'Bóng Ma Phù Thủy',
    greeting:
      'Ngươi đang tìm đường lên tầng trên sao? Hãy cẩn thận... kẻo biến mất giống những người trước.',
    emotionalRead:
      'Đọc Vị (Phuong): Giọng bà ta lẫn lộn giữa nỗi đau thật sự về năm 1998 và sự đánh lạc hướng có chủ đích.',
    options: {
      witch_ask_way: {
        label: 'Hỏi vị trí chìa khóa hoặc lối thoát của màn hiện tại',
        response:
          'Đừng tin tất cả những gì viết trên tường. Hãy thử kiểm tra hành lang bên trái... hoặc bên phải? Đi theo ánh đèn chớp tắt mà tìm.',
        revealsLie:
          'Phát hiện nói dối: Nhịp giọng bà ta thay đổi mỗi khi nhắc hướng đi — chỉ dẫn hướng bị cố tình đảo ngược.',
      },
      witch_request_task: {
        label: 'Hỏi điều kiện để biết sự thật năm 1998',
        response:
          'Hãy mang cho ta Ấn Đồng Trường Học 1998 giấu sau giá sách Thư Viện, ta sẽ kể kẻ nào đã khóa chặt các cánh cửa.',
      },
      witch_give_seal: {
        label: 'Trao lại Cổ Vật Ấn Đồng Trường Học 1998',
        response:
          'Đồng lạnh mà vẫn vương mùi khói cũ... Nghe đây: thảm kịch bắt đầu từ trục Hóa Học năm 1998, và Hiệu trưởng đã khóa hầm két trước khi ai kịp thoát.',
      },
      witch_confront_phuong: {
        label: '[Phuong] Bình tĩnh vạch trần lời nói dối và hỏi lý do bà canh giữ hành lang',
        response:
          'Hừ... con nhóc này tinh mắt thật. Đừng tin Học Sinh Im Lặng ở Cánh Đông — nó chỉ bắt chước người sống thôi.',
      },
    },
  },
  npc_deceptive_student: {
    npcName: 'Bóng Học Sinh 1998',
    greeting:
      'Cậu đang tìm hồ sơ mật à? Thầy Hiệu trưởng ném hết chìa khóa ra ngoài bãi xích đu sân trường rồi!',
    emotionalRead:
      'Đọc Vị (Phuong): Giọng nói đều đều như học thuộc, phù hiệu trên áo ghi tháng 10/1998. Hắn đang cố tình lừa bạn.',
    options: {
      student_press: {
        label: 'Đối chất lời khai với hồ sơ Văn Phòng Hiệu Trưởng',
        response:
          'Khoan... không, có lẽ ở Phòng Máy Tính... cậu không nên đứng yên một chỗ quá lâu đâu.',
        revealsLie:
          'Phát hiện nói dối: Hoàn toàn sai sự thật — chìa khóa và mật khẩu gắn với Văn Phòng Hiệu Trưởng và Phòng Máy Tính.',
      },
      student_phuong: {
        label: '[Phuong] Nhận ra bộ đồng phục cũ và hỏi hắn thuộc niên khóa nào',
        response: '...Khóa 1998. Chẳng ai bước ra khỏi tháng Mười năm ấy cả.',
      },
    },
  },
  npc_caretaker_echo: {
    npcName: 'Bảo Vệ Đêm Bị Mắc Kẹt',
    greeting:
      'Đừng lang thang ở Cánh Đông lúc nửa đêm... Không có chìa khóa nào trong Văn Phòng Giáo Viên đâu. Quay ra sân đi!',
    emotionalRead:
      'Đọc Vị (Phuong): Hơi thở gấp và mắt liếc liên tục về phía cửa Văn Phòng Giáo Viên — ông ấy đang giấu sự thật vì sợ hãi.',
    options: {
      ask_exit: {
        label: 'Hỏi về lối thoát hiểm và mạch điện bị khóa',
        response: 'Ổ khóa rỉ sét nhiều năm rồi. Quanh mấy bàn làm việc chẳng có chìa khóa nào đâu.',
        revealsLie:
          'Phát hiện nói dối: Ông ấy giật mình khi nhắc tới bàn Văn Phòng Giáo Viên — chìa khóa CHẮC CHẮN ở đó.',
      },
      phuong_tease: {
        label: '[Phuong] Trấn an nhẹ nhàng và nói đùa để ông bớt căng thẳng',
        response:
          'Heh... được rồi cô bé gan dạ thật. Nói thật nhé: Chìa Khóa Sân Trong nằm ngay trên bàn máy tính Văn Phòng Giáo Viên, còn mạch điện hành lang là BREAKER B.',
      },
    },
  },
  npc_librarian_shade: {
    npcName: 'Nhân Chứng Lưu Trữ',
    greeting:
      'Nói khẽ thôi giữa các giá sách. Bức tường phía tây sẽ trượt mở khi bạn xếp đúng 3 cuốn sổ và kéo cuốn sổ đỏ đặt nghiêng.',
    emotionalRead:
      'Đọc Vị (Phuong): Kiệt sức nhưng hoàn toàn thành thật. Mọi chi tiết đều khớp với sổ sách thực tế.',
    options: {
      ask_basement: {
        label: 'Hỏi về quái vật và đường hầm tầng hầm',
        response:
          'Con Crawler ở phòng thí nghiệm săn theo tiếng bước chân — hãy ngồi thấp khi nó bò gần. Còn Kẻ Rình Rập dưới hầm đuổi theo ánh đèn pin sáng gắt.',
      },
      phuong_comfort: {
        label: '[Phuong] Hỏi cách phân biệt ai đang nói thật',
        response:
          'Luôn đối chiếu lời NPC với ghi chú vật lý. Phù Thủy trộn lẫn thật giả, còn Học Sinh Im Lặng luôn chỉ vào ngõ cụt.',
      },
    },
  },
};

export function localizeNpcDialogue(
  session: NpcDialogueSession,
  lang: LanguageCode
): NpcDialogueSession {
  if (lang === 'en') return session;
  const vi = VI_NPC_SESSIONS[session.npcId];
  if (!vi) return session;
  return {
    ...session,
    npcName: vi.npcName,
    greeting: vi.greeting,
    emotionalRead: vi.emotionalRead ?? session.emotionalRead,
    options: session.options.map((o) => {
      const vo = vi.options[o.id];
      return vo
        ? {
            ...o,
            label: vo.label,
            response: vo.response,
            revealsLie: vo.revealsLie ?? o.revealsLie,
          }
        : o;
    }),
  };
}

const VI_ZONE_NAMES: Record<string, string> = {
  'School Entrance Gate (Exterior)': 'Cổng Trường Bỏ Hoang (Ngoài Trời)',
  'Student Bicycle Parking': 'Bãi Đỗ Xe Đạp Học Sinh',
  'Vehicle Parking Area': 'Bãi Đỗ Ô Tô & Xe Máy',
  'Outdoor Courtyard & Playground': 'Sân Trường & Khu Xích Đu',
  'Reception Hall & Main Entrance': 'Sảnh Lễ Tân & Lối Vào Chính',
  'Security Room': 'Phòng Bảo Vệ',
  '1F West Storage Room': 'Kho Tây Tầng 1',
  '1F East Storage Rooms': 'Kho Vật Tư & Dụng Cụ Tầng 1',
  'Classroom 101': 'Phòng Học 101',
  'Classroom 102': 'Phòng Học 102',
  'Teacher Offices': 'Văn Phòng Giáo Viên',
  '1F Archive Storage': 'Kho Lưu Trữ Tầng 1',
  'Computer Room': 'Phòng Máy Tính',
  'Principal’s Office': 'Phòng Hiệu Trưởng',
  '1F Restrooms': 'Nhà Vệ Sinh Tầng 1',
  '1F Restrooms & Storage': 'Nhà Vệ Sinh & Kho Tầng 1',
  'Hidden Secret Room': 'Phòng Bí Mật Bị Niêm Phong',
  'School Library': 'Thư Viện Trường',
  'Science Laboratory': 'Phòng Thí Nghiệm Khoa Học',
  'Chemistry Laboratory': 'Phòng Hóa Học',
  'Medical Room (Infirmary)': 'Phòng Y Tế',
  'Kitchen & Pantry': 'Nhà Bếp & Kho',
  'School Cafeteria': 'Nhà Ăn Trường Học',
  'Underground Basement & Tunnels': 'Tầng Hầm & Đường Hầm B1',
  'East Corridor (F1)': 'Hành Lang Đông (Tầng 1)',
  'West Corridor (F1)': 'Hành Lang Tây (Tầng 1)',
  'Central Corridor (F1)': 'Hành Lang Trung Tâm (Tầng 1)',
  'Floor 2 — Restrooms': 'Tầng 2 — Nhà Vệ Sinh',
  'Floor 2 — Computer Room': 'Tầng 2 — Phòng Máy Tính',
  'Floor 2 — Classrooms & Offices': 'Tầng 2 — Khu Phòng Học & Văn Phòng',
  'Floor 2 — West & East Wings': 'Tầng 2 — Cánh Tây & Cánh Đông',
  'Floor 3 — Restrooms': 'Tầng 3 — Nhà Vệ Sinh',
  'Floor 3 — Main Library & Reading': 'Tầng 3 — Thư Viện Chính & Phòng Đọc',
  'Floor 3 — Upper Library & Archive': 'Tầng 3 — Thư Viện & Lưu Trữ',
  'Floor 4 — Restrooms': 'Tầng 4 — Nhà Vệ Sinh',
  'Floor 4 — Science & Chemistry Labs': 'Tầng 4 — Phòng Thí Nghiệm & Hóa Học',
  'Floor 4 — Science & Equipment Wing': 'Tầng 4 — Khu Khoa Học & Thiết Bị',
  'Floor 5 — Restrooms': 'Tầng 5 — Nhà Vệ Sinh',
  'Floor 5 — Secret Corridor': 'Tầng 5 — Hành Lang Bí Mật',
  'Floor 5 — Hidden Room 598': 'Tầng 5 — Phòng Bí Ẩn 598',
  'Floor 5 — Restricted Admin Wing': 'Tầng 5 — Khu Hành Chính Cấm',
  'Floor 6 — Restrooms': 'Tầng 6 — Nhà Vệ Sinh',
  'Floor 6 — Mysterious Archive': 'Tầng 6 — Kho Lưu Trữ Bí Ẩn',
  'School Rooftop': 'Sân Thượng Ngôi Trường',
  'School Grounds': 'Khuôn Viên Ngôi Trường',
};

export function localizeZoneName(zoneName: string, lang: LanguageCode): string {
  if (lang === 'en') return zoneName;
  return VI_ZONE_NAMES[zoneName] ?? zoneName;
}

