import React, { useCallback, useEffect, useState } from 'react';
import { getUiStrings, localizeCharacter, localizeLevel } from '../game/i18n';
import { getMultiplayerApiBaseUrl } from '../game/multiplayerClient';
import type {
  CharacterId,
  ChatMessage,
  GameSettings,
  MultiplayerRoomState,
  RoomErrorCode,
  VoiceAudioDevice,
  VoiceDiagnosticsSnapshot,
  VoiceMode,
} from '../types/game';
import {
  CHARACTER_PROFILES,
  getCharacterProfile,
  isValidRoomCode,
  LEVEL_CONFIGS,
} from '../game/rules';
import { CharacterPortrait } from './CharacterPortrait';
import { CharacterPreviewCanvas } from './CharacterPreviewCanvas';

interface PublicRoomSummary {
  roomId: string;
  roomName: string;
  playerCount: number;
  maxPlayers: number;
  level: number;
  status: string;
}

interface MultiplayerLobbyScreenProps {
  displayName: string;
  onChangeDisplayName: (name: string) => void;
  localPlayerId: string | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  room: MultiplayerRoomState | null;
  chatMessages: ChatMessage[];
  errorBanner: string | null;
  errorCode?: RoomErrorCode | null;
  settings: GameSettings;
  micActive: boolean;
  micError: string | null;
  mutedPeers: Record<string, boolean>;
  voiceDiagnostics: VoiceDiagnosticsSnapshot;
  audioInputDevices: VoiceAudioDevice[];
  onCreateRoom: (roomName: string, maxPlayers: 2 | 3 | 4 | 5, level: number) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onSelectCharacter: (charId: CharacterId) => void;
  onToggleReady: (ready: boolean) => void;
  onSelectLevel: (level: number) => void;
  onStartGame: () => void;
  onSendChat: (text: string) => void;
  onToggleMic: () => void;
  onTogglePushToTalk: () => void;
  onVoiceModeChange: (mode: VoiceMode) => void;
  onSelectMicDevice: (deviceId: string) => void;
  onRefreshMicDevices: () => void;
  onVoiceVolumeChange: (vol: number) => void;
  onTogglePeerMute: (playerId: string) => void;
  onReconnectPeerVoice: (playerId: string) => void;
  onRetryConnection: () => void;
  onBackToTitle: () => void;
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const MultiplayerLobbyScreen: React.FC<MultiplayerLobbyScreenProps> = ({
  displayName,
  onChangeDisplayName,
  localPlayerId,
  connectionStatus,
  room,
  chatMessages,
  errorBanner,
  errorCode,
  settings,
  micActive,
  micError,
  mutedPeers,
  voiceDiagnostics,
  audioInputDevices,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSelectCharacter,
  onToggleReady,
  onSelectLevel,
  onStartGame,
  onSendChat,
  onToggleMic,
  onTogglePushToTalk,
  onVoiceModeChange,
  onSelectMicDevice,
  onRefreshMicDevices,
  onVoiceVolumeChange,
  onTogglePeerMute,
  onReconnectPeerVoice,
  onRetryConnection,
  onBackToTitle,
}) => {
  const t = getUiStrings(settings.language);
  const [roomNameInput, setRoomNameInput] = useState('Midnight East Wing');
  const [maxPlayersInput, setMaxPlayersInput] = useState<2 | 3 | 4 | 5>(5);
  const [levelInput, setLevelInput] = useState<number>(1);
  const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [inspectedChar, setInspectedChar] = useState<CharacterId>('ty');
  const [chatInput, setChatInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const fetchPublicRooms = useCallback(async () => {
    try {
      const apiBase = getMultiplayerApiBaseUrl();
      const res = await fetch(`${apiBase}/api/rooms`);
      if (!res.ok) return;
      const data = (await res.json()) as { rooms?: PublicRoomSummary[] };
      setPublicRooms(data.rooms ?? []);
    } catch {
      // transient poll errors handled via WebSocket connection status
    }
  }, []);

  useEffect(() => {
    if (room) return;
    void fetchPublicRooms();
    const timer = window.setInterval(() => void fetchPublicRooms(), 4000);
    return () => window.clearInterval(timer);
  }, [room, fetchPublicRooms]);

  const localPlayer = room?.players.find((p) => p.playerId === localPlayerId) ?? null;
  const activeInspectId = localPlayer?.characterId ?? inspectedChar;
  const inspectedProfile = localizeCharacter(getCharacterProfile(activeInspectId), settings.language);

  const handleCopyRoomId = () => {
    if (!room) return;
    void navigator.clipboard?.writeText(room.roomId).catch(() => {});
    setCopiedId(true);
    window.setTimeout(() => setCopiedId(false), 1800);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!displayName.trim()) {
      setLocalError(t.lobby.errNameRequired);
      return;
    }
    onCreateRoom(roomNameInput.trim() || 'Night Watch', maxPlayersInput, levelInput);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!displayName.trim()) {
      setLocalError(t.lobby.errNameRequired);
      return;
    }
    if (!isValidRoomCode(joinRoomIdInput)) {
      setLocalError(t.lobby.errRoomIdDigits);
      return;
    }
    onJoinRoom(joinRoomIdInput.trim());
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const connectedPlayers = room?.players.filter((p) => p.connected) ?? [];
  const allPlayers = room?.players ?? [];
  const allHaveChar = connectedPlayers.length > 0 && connectedPlayers.every((p) => Boolean(p.characterId));
  const nonHostsReady = connectedPlayers.every((p) => p.isHost || p.ready);
  const canHostStart = Boolean(room && localPlayer?.isHost && allHaveChar && nonHostsReady);
  const resolvedRemoteError =
    errorCode && t.lobby.roomErrors[errorCode]
      ? t.lobby.roomErrors[errorCode]
      : errorBanner;
  const displayError = localError ?? resolvedRemoteError;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#040508]/92 p-3 md:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl bg-[#0a0c11] border border-zinc-800 text-zinc-100 flex flex-col max-h-[94vh]">
        {/* Lobby Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-800 bg-[#07090d]">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-mono uppercase tracking-[0.2em]">
              <span className="text-[#ef4444]">{t.lobby.heading}</span>
              <span className="text-zinc-600">·</span>
              <span
                data-testid="lobby-connection-status"
                className={
                  connectionStatus === 'connected'
                    ? 'text-emerald-400'
                    : connectionStatus === 'disconnected'
                      ? 'text-red-400'
                      : 'text-amber-400'
                }
              >
                {t.lobby.connStatus[connectionStatus]}
              </span>
              {connectionStatus !== 'connected' && (
                <button
                  type="button"
                  data-testid="retry-connection-btn"
                  onClick={() => {
                    setLocalError(null);
                    onRetryConnection();
                    void fetchPublicRooms();
                  }}
                  className="px-2 py-0.5 bg-[#1b2232] hover:bg-[#273247] border border-zinc-600 text-[10px] font-mono uppercase text-amber-200"
                >
                  {t.lobby.retryBtn}
                </button>
              )}
            </div>
            <h1 className="text-xl font-serif font-bold tracking-wide text-zinc-100">
              {room
                ? `${room.roomName} — ${t.lobby.roomPrefix} #${room.roomId}`
                : t.lobby.subtitleCreateJoin}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {room ? (
              <>
                <button
                  type="button"
                  data-testid="copy-room-id-btn"
                  onClick={handleCopyRoomId}
                  className="px-3.5 py-2 bg-[#141822] hover:bg-[#1e2432] border border-zinc-700 text-xs font-mono text-amber-300"
                >
                  {copiedId ? t.lobby.copiedId : `ID: ${room.roomId} · ${t.lobby.copyId}`}
                </button>
                <button
                  type="button"
                  data-testid="leave-room-btn"
                  onClick={onLeaveRoom}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase tracking-wider text-zinc-200"
                >
                  {t.lobby.leaveRoom}
                </button>
              </>
            ) : (
              <button
                type="button"
                data-testid="lobby-back-to-title-btn"
                onClick={onBackToTitle}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase tracking-wider text-zinc-200"
              >
                {t.lobby.backToTitle}
              </button>
            )}
          </div>
        </div>

        {displayError && (
          <div
            data-testid="lobby-error-banner"
            className="px-5 py-2 bg-[#2b0f12] border-b border-red-900 flex items-center justify-between gap-3 text-xs font-mono text-red-200"
          >
            <span>{displayError}</span>
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                onRetryConnection();
                void fetchPublicRooms();
              }}
              className="px-2.5 py-1 bg-[#45151a] hover:bg-[#5b1d24] border border-red-700 text-[10px] font-mono uppercase text-red-100 shrink-0"
            >
              {t.lobby.retryBtn}
            </button>
          </div>
        )}

        {room?.hostNotice && (
          <div
            data-testid="lobby-host-notice"
            className="px-5 py-2 bg-[#1e170a] border-b border-amber-800/80 text-xs font-mono text-amber-200"
          >
            {t.lobby.hostNoticePrefix} {room.hostNotice}
          </div>
        )}

        {/* NO ACTIVE ROOM VIEW: Display Name + Create Room + Join Room */}
        {!room && (
          <div className="p-5 md:p-6 overflow-y-auto space-y-5">
            <div className="bg-[#07090e] border border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.18em] text-amber-300">
                  {t.titleScreen.displayNameLabel}
                </div>
                <div className="text-xs text-zinc-400">{t.lobby.nameSubtitle}</div>
              </div>
              <input
                type="text"
                aria-label={t.titleScreen.displayNameLabel}
                data-testid="lobby-display-name-input"
                maxLength={18}
                value={displayName}
                onChange={(e) => onChangeDisplayName(e.target.value)}
                placeholder={t.titleScreen.displayNamePlaceholder}
                className="w-full sm:w-64 bg-[#10141d] border border-zinc-700 px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-[#dc2626]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Room Form */}
              <form
                onSubmit={handleCreateSubmit}
                className="bg-[#07090e] border border-zinc-800 p-5 space-y-4"
              >
                <div className="border-b border-zinc-800 pb-2">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ef4444]">
                    {t.lobby.hostSquad}
                  </div>
                  <h2 className="text-lg font-serif font-bold">{t.lobby.createRoomHeading}</h2>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
                    {t.lobby.roomNameLabel}
                  </label>
                  <input
                    type="text"
                    data-testid="create-room-name-input"
                    maxLength={28}
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    className="w-full bg-[#10141d] border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-[#dc2626]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      {t.lobby.maxPlayersLabel}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([2, 3, 4, 5] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          data-testid={`max-players-${n}`}
                          onClick={() => setMaxPlayersInput(n)}
                          className={`py-2 text-xs font-mono border ${
                            maxPlayersInput === n
                              ? 'bg-[#7f1d1d] border-[#dc2626] text-white font-semibold'
                              : 'bg-[#10141d] border-zinc-700 text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          {n}P
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      {t.lobby.startingLevelLabel}
                    </label>
                    <select
                      aria-label={t.lobby.startingLevelLabel}
                      value={levelInput}
                      onChange={(e) => setLevelInput(Number(e.target.value))}
                      className="w-full bg-[#10141d] border border-zinc-700 px-3 py-2 text-xs font-mono text-zinc-100"
                    >
                      {LEVEL_CONFIGS.map((l) => {
                        const loc = localizeLevel(l, settings.language);
                        return (
                          <option key={l.level} value={l.level}>
                            {t.hud.lvlShort} {String(l.level).padStart(2, '0')} — {loc.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  data-testid="create-room-submit"
                  className="w-full py-3 bg-[#881b1b] hover:bg-[#a32222] border border-[#dc2626]/70 text-xs font-mono uppercase tracking-[0.2em] text-white font-semibold"
                >
                  {t.lobby.createRoomBtn}
                </button>
              </form>

              {/* Join Room by ID & Active Room Browser */}
              <div className="bg-[#07090e] border border-zinc-800 p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">
                      {t.lobby.enterCodeTag}
                    </div>
                    <h2 className="text-lg font-serif font-bold">{t.lobby.joinRoomHeading}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchPublicRooms()}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono uppercase tracking-wider text-zinc-300"
                  >
                    {t.lobby.refresh}
                  </button>
                </div>

                <form onSubmit={handleJoinSubmit} className="flex flex-wrap sm:flex-nowrap gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    data-testid="join-room-id-input"
                    maxLength={6}
                    value={joinRoomIdInput}
                    onChange={(e) => setJoinRoomIdInput(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.lobby.joinPlaceholder}
                    className="flex-1 min-w-[140px] bg-[#10141d] border border-zinc-700 px-3.5 py-2 text-sm font-mono tracking-[0.2em] text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    data-testid="join-room-submit"
                    className="px-5 py-2 bg-[#1a2232] hover:bg-[#253047] border border-zinc-600 text-xs font-mono uppercase tracking-[0.16em] text-zinc-100"
                  >
                    {t.lobby.joinBtn}
                  </button>
                  <button
                    type="button"
                    data-testid="join-back-btn"
                    onClick={onBackToTitle}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono uppercase tracking-wider text-zinc-300"
                  >
                    {t.lobby.backBtn}
                  </button>
                </form>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2">
                    {t.lobby.openRooms} ({publicRooms.length})
                  </div>
                  {publicRooms.length === 0 ? (
                    <div className="p-4 border border-zinc-800/80 bg-[#05070b] text-xs text-zinc-500 font-mono">
                      {t.lobby.noRooms}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {publicRooms.map((r) => (
                        <div
                          key={r.roomId}
                          className="flex items-center justify-between gap-3 px-3 py-2 bg-[#0b0e16] border border-zinc-800"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-100 truncate">
                              {r.roomName}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400">
                              ID #{r.roomId} · {t.hud.lvlShort} {r.level} · {r.playerCount}/
                              {r.maxPlayers} {t.lobby.playersWord}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={r.playerCount >= r.maxPlayers || r.status !== 'lobby'}
                            onClick={() => {
                              setLocalError(null);
                              onJoinRoom(r.roomId);
                            }}
                            className="px-3 py-1.5 bg-[#1b2230] hover:bg-[#273247] disabled:opacity-40 border border-zinc-700 text-[11px] font-mono uppercase text-zinc-100"
                          >
                            {r.status !== 'lobby'
                              ? t.lobby.inGame
                              : r.playerCount >= r.maxPlayers
                                ? t.lobby.full
                                : t.lobby.joinBtn}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE ROOM LOBBY VIEW */}
        {room && (
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
            {/* Left/Center: 5 Character Locking + 3D Preview + Details */}
            <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col">
              <div className="p-4 border-b border-zinc-800 bg-[#07090e]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-300">
                    {t.lobby.chooseUnique}
                  </span>
                  <span className="text-[11px] font-mono text-amber-300">
                    {localPlayer?.characterId
                      ? `${t.lobby.lockedPrefix} ${getCharacterProfile(localPlayer.characterId).codename}`
                      : t.lobby.noCharSelected}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {CHARACTER_PROFILES.map((char) => {
                    const owner = room.players.find((p) => p.characterId === char.id);
                    const isMine = owner?.playerId === localPlayerId;
                    const lockedByOther = Boolean(owner && !isMine);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        data-testid={`lobby-char-${char.id}`}
                        disabled={lockedByOther}
                        onClick={() => {
                          setInspectedChar(char.id);
                          onSelectCharacter(char.id);
                        }}
                        className={`p-2 border text-left transition-colors flex flex-col items-center gap-1.5 ${
                          isMine
                            ? 'bg-[#2b1013] border-[#dc2626]'
                            : lockedByOther
                              ? 'bg-[#090a0e] border-zinc-800 opacity-50 cursor-not-allowed'
                              : 'bg-[#0d1018] border-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        <CharacterPortrait characterId={char.id} className="w-12 h-12" />
                        <div className="text-[11px] font-serif font-bold text-zinc-100">
                          {char.codename}
                        </div>
                        <div className="text-[9px] font-mono uppercase text-center truncate w-full text-zinc-400">
                          {isMine
                            ? t.lobby.youBadge
                            : lockedByOther
                              ? `${owner!.displayName.slice(0, 7)}`
                              : t.lobby.openBadge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3D Preview + Active Character Abilities */}
              <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[280px] bg-[#06070b]">
                <div className="md:col-span-5 relative border-b md:border-b-0 md:border-r border-zinc-800/80 min-h-[260px]">
                  <CharacterPreviewCanvas characterId={inspectedProfile.id} />
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 px-2.5 py-1 bg-[#07090d]/85 border border-zinc-800 text-[10px] font-mono flex justify-between">
                    <span className="text-zinc-400">{inspectedProfile.codename}</span>
                    <span className="text-amber-300">{inspectedProfile.specialAbility}</span>
                  </div>
                </div>

                <div className="md:col-span-7 p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ef4444]">
                        {inspectedProfile.specialAbility} · {inspectedProfile.maxHp} {t.charSelect.hpStat}
                      </div>
                      <h3 className="text-lg font-serif font-bold text-zinc-100">
                        {inspectedProfile.codename} — {inspectedProfile.title}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {inspectedProfile.personality.join(' · ')}
                    </p>
                    <ul className="space-y-1 text-xs text-zinc-200">
                      {inspectedProfile.advantages.map((adv) => (
                        <li key={adv} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-mono">+</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="text-[11px] text-red-300/90 bg-[#120a0c] border border-red-950 px-2.5 py-1.5">
                      {inspectedProfile.tradeoff}
                    </div>
                  </div>

                  {/* Host Level & Ready / Start Controls */}
                  <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
                    {localPlayer?.isHost ? (
                      <select
                        aria-label={t.lobby.startingLevelLabel}
                        value={room.level}
                        onChange={(e) => onSelectLevel(Number(e.target.value))}
                        className="bg-[#10141d] border border-zinc-700 px-2.5 py-2 text-xs font-mono text-zinc-100"
                      >
                        {LEVEL_CONFIGS.map((l) => {
                          const loc = localizeLevel(l, settings.language);
                          return (
                            <option key={l.level} value={l.level}>
                              {t.hud.lvlShort} {String(l.level).padStart(2, '0')} — {loc.name}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="text-xs font-mono text-zinc-400">
                        {t.titleScreen.levelWord} {String(room.level).padStart(2, '0')} —{' '}
                        {localizeLevel(LEVEL_CONFIGS[room.level - 1] ?? LEVEL_CONFIGS[0], settings.language).name}
                      </div>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        data-testid="lobby-ready-btn"
                        disabled={!localPlayer?.characterId}
                        onClick={() => onToggleReady(!localPlayer?.ready)}
                        className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border disabled:opacity-40 ${
                          localPlayer?.ready
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                            : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                        }`}
                      >
                        {localPlayer?.ready ? t.lobby.readyDone : t.lobby.markReady}
                      </button>

                      {localPlayer?.isHost && (
                        <button
                          type="button"
                          data-testid="lobby-start-game-btn"
                          disabled={!canHostStart}
                          onClick={onStartGame}
                          title={canHostStart ? t.lobby.startTooltipReady : t.lobby.startTooltipWait}
                          className="px-5 py-2 bg-[#881b1b] hover:bg-[#a32222] disabled:opacity-40 border border-[#dc2626] text-xs font-mono uppercase tracking-[0.16em] text-white font-semibold"
                        >
                          {t.lobby.startMission}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Squad Roster + Voice Chat + Shared Room Text Chat */}
            <div className="lg:col-span-5 flex flex-col bg-[#080a0f] min-h-0">
              {/* Squad Roster */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-400 mb-2.5">
                  <span>{t.lobby.squadRoster}</span>
                  <span className="text-amber-300 tabular-nums">
                    {connectedPlayers.length} / {room.maxPlayers} {t.lobby.playersWord}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {allPlayers.map((p) => {
                    const isSelf = p.playerId === localPlayerId;
                    const peerMuted = Boolean(mutedPeers[p.playerId]);
                    const peerDiag = voiceDiagnostics.peers[p.playerId];
                    const isSpeaking = isSelf
                      ? voiceDiagnostics.localSpeaking
                      : Boolean(peerDiag?.speaking);
                    const rtcState = peerDiag?.connectionState ?? 'idle';
                    return (
                      <div
                        key={p.playerId}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border text-xs transition-colors ${
                          !p.connected
                            ? 'bg-[#0c0d12] border-amber-900/50 opacity-75'
                            : isSpeaking
                              ? 'bg-[#0c1a15] border-emerald-500/80'
                              : 'bg-[#0e121b] border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {p.characterId ? (
                            <CharacterPortrait characterId={p.characterId} className="w-7 h-7 shrink-0" />
                          ) : (
                            <div className="w-7 h-7 bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-500">
                              ?
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-100 truncate flex items-center gap-1.5">
                              <span className="truncate">
                                {p.displayName} {isSelf ? `(${t.lobby.youBadge})` : ''}
                              </span>
                              {isSpeaking && (
                                <span className="px-1 py-0.2 bg-emerald-950 border border-emerald-500 text-[8px] font-mono uppercase text-emerald-300 shrink-0">
                                  {t.lobby.voiceSpeaking}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                              <span>
                                {p.isHost ? `${t.lobby.hostBadge} · ` : ''}
                                {p.characterId
                                  ? getCharacterProfile(p.characterId).codename
                                  : t.lobby.selecting}
                              </span>
                              {!isSelf && p.connected && (
                                <span
                                  className={`${
                                    rtcState === 'connected'
                                      ? 'text-emerald-400'
                                      : rtcState === 'failed'
                                        ? 'text-red-400'
                                        : 'text-amber-300'
                                  }`}
                                >
                                  · {t.lobby.voiceConnStates[rtcState]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isSelf && p.connected && rtcState === 'failed' && (
                            <button
                              type="button"
                              onClick={() => onReconnectPeerVoice(p.playerId)}
                              title={t.lobby.voiceReconnectPeer}
                              className="px-1.5 py-0.5 text-[10px] font-mono border bg-amber-950/80 border-amber-600 text-amber-200 hover:bg-amber-900"
                            >
                              ↻
                            </button>
                          )}
                          {!isSelf && p.connected && (
                            <button
                              type="button"
                              onClick={() => onTogglePeerMute(p.playerId)}
                              className={`px-2 py-0.5 text-[10px] font-mono border ${
                                peerMuted
                                  ? 'bg-red-950 border-red-700 text-red-200'
                                  : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {peerMuted ? t.lobby.muted : t.lobby.voice}
                            </button>
                          )}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase border ${
                              !p.connected
                                ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                                : p.ready || p.isHost
                                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                                  : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                            }`}
                          >
                            {!p.connected
                              ? t.lobby.reconnectingLabel
                              : p.isHost
                                ? t.lobby.hostBadge
                                : p.ready
                                  ? t.lobby.readyBadge
                                  : t.lobby.waitBadge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Voice Chat Bar (WebRTC Vocal Clarity + Radio/Spatial + Mic Meter & Device Select) */}
              <div className="px-4 py-3 border-b border-zinc-800 bg-[#07090d] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400">
                    {t.lobby.spatialVoice}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="lobby-voice-mode-toggle"
                      onClick={() =>
                        onVoiceModeChange(settings.voiceMode === 'radio' ? 'spatial' : 'radio')
                      }
                      className={`px-2 py-1 text-[10px] font-mono uppercase border ${
                        settings.voiceMode === 'radio'
                          ? 'bg-sky-950/80 border-sky-500 text-sky-200'
                          : 'bg-purple-950/80 border-purple-500 text-purple-200'
                      }`}
                    >
                      {settings.voiceMode === 'radio'
                        ? t.lobby.voiceRadioMode
                        : t.lobby.voiceSpatialMode}
                    </button>
                    <button
                      type="button"
                      data-testid="lobby-mic-toggle"
                      onClick={onToggleMic}
                      className={`px-2.5 py-1 text-[10px] font-mono uppercase border ${
                        micActive
                          ? 'bg-emerald-950 border-emerald-600 text-emerald-200'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {micActive ? t.lobby.micOn : t.lobby.enableMic}
                    </button>
                    <button
                      type="button"
                      onClick={onTogglePushToTalk}
                      className={`px-2.5 py-1 text-[10px] font-mono uppercase border ${
                        settings.pushToTalk
                          ? 'bg-amber-950 border-amber-600 text-amber-200'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {settings.pushToTalk ? t.lobby.pttLabel : t.lobby.openMicLabel}
                    </button>
                  </div>
                </div>

                {/* Live Mic Input Level Meter + Mic Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-[10px] font-mono text-zinc-400">
                  <div className="sm:col-span-7 flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0">{t.lobby.voiceMicSelectLabel}</span>
                    <select
                      aria-label={t.lobby.voiceMicSelectLabel}
                      data-testid="lobby-mic-device-select"
                      value={settings.voiceInputDeviceId}
                      onChange={(e) => onSelectMicDevice(e.target.value)}
                      className="flex-1 min-w-0 bg-[#10141d] border border-zinc-700 px-2 py-1 text-[10px] text-zinc-200 truncate"
                    >
                      <option value="default">{t.lobby.voiceDefaultMic}</option>
                      {audioInputDevices.map((dev) => (
                        <option key={dev.deviceId} value={dev.deviceId}>
                          {dev.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={onRefreshMicDevices}
                      title={t.lobby.voiceRefreshMics}
                      className="px-1.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0"
                    >
                      ↻
                    </button>
                  </div>

                  <div className="sm:col-span-5 flex items-center gap-2">
                    <span className="shrink-0">TX</span>
                    <div className="flex-1 h-2 bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 ${
                          voiceDiagnostics.localSpeaking ? 'bg-emerald-400' : 'bg-emerald-700'
                        }`}
                        style={{
                          width: `${
                            micActive ? Math.max(4, Math.round(voiceDiagnostics.localMicLevel * 100)) : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                  <span>{t.lobby.voiceVol}</span>
                  <input
                    type="range"
                    aria-label={t.lobby.voiceVol}
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.voiceVolume}
                    onChange={(e) => onVoiceVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 accent-[#dc2626]"
                  />
                  <span className="tabular-nums text-amber-300">
                    {Math.round(settings.voiceVolume * 100)}%
                  </span>
                </div>
                {micError && <div className="text-[11px] font-mono text-red-400">{micError}</div>}
              </div>

              {/* Room Text Chat */}
              <div className="flex-1 flex flex-col min-h-[190px] p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 mb-2">
                  {t.lobby.roomChat}
                </div>
                <div
                  data-testid="lobby-chat-log"
                  className="flex-1 bg-[#05070b] border border-zinc-800 p-2.5 overflow-y-auto space-y-1.5 max-h-48 mb-2.5 text-xs"
                >
                  {chatMessages.length === 0 ? (
                    <div className="text-zinc-600 font-mono text-[11px]">{t.lobby.emptyChat}</div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="leading-snug">
                        <span className="text-[10px] font-mono text-zinc-600 mr-1.5">
                          {formatClock(msg.timestamp)}
                        </span>
                        <span className="font-semibold text-amber-300 mr-1.5">
                          {msg.senderName}
                          {msg.characterId ? ` (${msg.characterId.toUpperCase()})` : ''}:
                        </span>
                        <span className="text-zinc-200">{msg.text}</span>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    data-testid="lobby-chat-input"
                    maxLength={240}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.lobby.chatPlaceholder}
                    className="flex-1 bg-[#10141d] border border-zinc-700 px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400"
                  />
                  <button
                    type="submit"
                    data-testid="lobby-chat-send"
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-mono uppercase text-zinc-100"
                  >
                    {t.lobby.send}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
