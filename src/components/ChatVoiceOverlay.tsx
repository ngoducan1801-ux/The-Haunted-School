import React, { useEffect, useRef, useState } from 'react';
import { getUiStrings } from '../game/i18n';
import {
  filterVisibleChatMessages,
  formatChatPreview,
  formatChatTimestamp,
} from '../game/chatUtils';
import type {
  ChatMessage,
  GameSettings,
  MultiplayerRoomState,
  VoiceDiagnosticsSnapshot,
} from '../types/game';

type ChatDockPosition = 'top-right' | 'bottom-right' | 'top-left';
type ChatPanelSize = 'compact' | 'large';

const CHAT_DOCK_STORAGE_KEY = 'haunted_school_chat_dock_v1';
const CHAT_SIZE_STORAGE_KEY = 'haunted_school_chat_size_v1';

function loadChatDock(): ChatDockPosition {
  try {
    const val = localStorage.getItem(CHAT_DOCK_STORAGE_KEY);
    if (val === 'top-right' || val === 'bottom-right' || val === 'top-left') return val;
  } catch {
    // ignore storage errors
  }
  return 'top-right';
}

function loadChatSize(): ChatPanelSize {
  try {
    const val = localStorage.getItem(CHAT_SIZE_STORAGE_KEY);
    if (val === 'compact' || val === 'large') return val;
  } catch {
    // ignore storage errors
  }
  return 'compact';
}

interface ChatVoiceOverlayProps {
  room: MultiplayerRoomState;
  localPlayerId: string | null;
  localPosition: { x: number; y: number; z: number };
  chatMessages: ChatMessage[];
  unreadCount: number;
  chatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
  notification: ChatMessage | null;
  onDismissNotification: () => void;
  modalBlocked: boolean;
  isTouchMode: boolean;
  settings: GameSettings;
  micActive: boolean;
  pttHeld: boolean;
  mutedPeers: Record<string, boolean>;
  voiceDiagnostics: VoiceDiagnosticsSnapshot;
  onMarkRead: () => void;
  onSendChat: (text: string, proximity: boolean) => void;
  onToggleMic: () => void;
  onToggleVoiceMode: () => void;
  onTogglePeerMute: (playerId: string) => void;
  onChatFocusChange: (focused: boolean) => void;
}

export const ChatVoiceOverlay: React.FC<ChatVoiceOverlayProps> = ({
  room,
  localPlayerId,
  localPosition,
  chatMessages,
  unreadCount,
  chatOpen,
  onChatOpenChange,
  notification,
  onDismissNotification,
  modalBlocked,
  isTouchMode,
  settings,
  micActive,
  pttHeld,
  mutedPeers,
  voiceDiagnostics,
  onMarkRead,
  onSendChat,
  onToggleMic,
  onToggleVoiceMode,
  onTogglePeerMute,
  onChatFocusChange,
}) => {
  const t = getUiStrings(settings.language);
  const [proximityFilter, setProximityFilter] = useState(false);
  const [draft, setDraft] = useState('');
  const [dockPos, setDockPos] = useState<ChatDockPosition>(loadChatDock);
  const [panelSize, setPanelSize] = useState<ChatPanelSize>(loadChatSize);
  const [viewportBox, setViewportBox] = useState(() => ({
    width: typeof window !== 'undefined' ? window.visualViewport?.width ?? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.visualViewport?.height ?? window.innerHeight : 900,
    offsetTop: typeof window !== 'undefined' ? window.visualViewport?.offsetTop ?? 0 : 0,
  }));

  const inputRef = useRef<HTMLInputElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const onChatFocusChangeRef = useRef(onChatFocusChange);
  onChatFocusChangeRef.current = onChatFocusChange;

  const focusChatInput = () => {
    onChatFocusChange(true);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 25);
  };

  const openChat = (focusInput: boolean) => {
    onChatOpenChange(true);
    onMarkRead();
    onDismissNotification();
    if (focusInput) {
      focusChatInput();
    }
  };

  const closeChat = () => {
    inputRef.current?.blur();
    onChatFocusChange(false);
    onChatOpenChange(false);
  };

  // Track mobile visualViewport so soft keyboard never pushes chat input off-screen
  useEffect(() => {
    const updateViewport = () => {
      const vv = window.visualViewport;
      setViewportBox({
        width: vv ? vv.width : window.innerWidth,
        height: vv ? vv.height : window.innerHeight,
        offsetTop: vv ? vv.offsetTop : 0,
      });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);

  // ENTER or T opens & focuses chat during gameplay; ESC closes without sending
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const activeTag = activeEl?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        if (e.code === 'Escape' && chatOpen) {
          e.preventDefault();
          closeChat();
        }
        return;
      }

      if (modalBlocked) return;

      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyT') {
        e.preventDefault();
        openChat(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chatOpen, modalBlocked]);

  // Keep newest messages visible at bottom when opened or receiving messages
  useEffect(() => {
    if (chatOpen && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [chatMessages.length, chatOpen]);

  // Safety cleanup strictly on unmount
  useEffect(() => {
    return () => {
      onChatFocusChangeRef.current(false);
    };
  }, []);

  const visibleMessages = filterVisibleChatMessages(
    chatMessages,
    proximityFilter,
    localPosition,
    22
  );

  const teammates = room.players.filter((p) => p.connected && p.playerId !== localPlayerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim();
    if (clean) {
      onSendChat(clean, proximityFilter);
      setDraft('');
    }
    inputRef.current?.blur();
    onChatFocusChange(false);
  };

  const cycleDockPosition = () => {
    const order: ChatDockPosition[] = ['top-right', 'bottom-right', 'top-left'];
    const next = order[(order.indexOf(dockPos) + 1) % order.length];
    setDockPos(next);
    try {
      localStorage.setItem(CHAT_DOCK_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const togglePanelSize = () => {
    const next: ChatPanelSize = panelSize === 'compact' ? 'large' : 'compact';
    setPanelSize(next);
    try {
      localStorage.setItem(CHAT_SIZE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const keyboardLikelyOpen = isTouchMode && viewportBox.height < 310;
  const mobileLandscape = isTouchMode && viewportBox.width >= 560 && viewportBox.height < 520;

  const mobilePanelStyle: React.CSSProperties | undefined = isTouchMode
    ? keyboardLikelyOpen
      ? {
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          top: `${Math.max(6, viewportBox.offsetTop + 6)}px`,
          maxHeight: `${Math.max(145, viewportBox.height - 12)}px`,
          width: 'min(92vw, 380px)',
          zIndex: 30,
        }
      : mobileLandscape
        ? {
            position: 'fixed',
            right: viewportBox.width >= 760 ? '248px' : '240px',
            top: `${Math.max(62, viewportBox.offsetTop + 62)}px`,
            maxHeight: `${Math.max(165, Math.min(222, viewportBox.height - 168))}px`,
            width:
              viewportBox.width >= 760
                ? 'min(334px, calc(100vw - 510px))'
                : 'min(300px, calc(100vw - 375px))',
            zIndex: 30,
          }
        : {
            position: 'fixed',
            right: '12px',
            top: `${Math.max(62, viewportBox.offsetTop + 62)}px`,
            maxHeight: `${Math.max(180, viewportBox.height - 180)}px`,
            width: 'min(92vw, 344px)',
            zIndex: 30,
          }
    : undefined;

  const desktopDockClass =
    dockPos === 'top-left'
      ? 'left-4 md:left-6 top-36 md:top-40 items-start'
      : dockPos === 'bottom-right'
        ? 'right-4 md:right-7 bottom-28 md:bottom-32 items-end flex-col-reverse'
        : 'right-4 md:right-7 top-16 md:top-20 items-end';

  const containerClass = isTouchMode
    ? 'fixed right-3 sm:right-5 top-[62px] z-[25] flex flex-col items-end gap-1.5 pointer-events-none'
    : `fixed ${desktopDockClass} z-[25] flex flex-col gap-2 pointer-events-none`;

  const desktopWidthClass =
    panelSize === 'large' ? 'w-80 md:w-[390px]' : 'w-72 md:w-80';
  const desktopDrawerWidthClass =
    panelSize === 'large' ? 'w-80 md:w-[390px]' : 'w-72 md:w-80';

  return (
    <div
      data-testid="ingame-chat-overlay"
      className={containerClass}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Floating Squad Voice & Chat Bar (hidden on mobile while chat drawer is open) */}
      {!(isTouchMode && chatOpen) && (
        <div
          data-testid="ingame-chat-bar"
          className={`${
            isTouchMode ? 'w-auto max-w-[260px]' : desktopWidthClass
          } bg-[#07090d]/84 border border-zinc-800/90 px-2.5 py-1.5 text-[10px] font-mono pointer-events-auto`}
        >
          <div className="flex items-center justify-between gap-2">
            {!isTouchMode && (
              <span className="text-zinc-300 uppercase tracking-wider whitespace-nowrap shrink-0 tabular-nums">
                #{room.roomId} · {teammates.length + 1}/{room.maxPlayers}
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto pointer-events-auto">
              {!isTouchMode && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="ingame-voice-mode-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleVoiceMode();
                  }}
                  className={`pointer-events-auto px-1.5 py-0.5 border whitespace-nowrap ${
                    settings.voiceMode === 'radio'
                      ? 'bg-sky-950/80 border-sky-600 text-sky-200'
                      : 'bg-purple-950/80 border-purple-600 text-purple-200'
                  }`}
                >
                  {settings.voiceMode === 'radio'
                    ? t.chatOverlay.radioShort
                    : t.chatOverlay.spatialShort}
                </button>
              )}

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMic();
                }}
                className={`${
                  isTouchMode ? 'min-h-[34px] px-2.5' : 'px-2 py-0.5'
                } border whitespace-nowrap flex items-center gap-1 ${
                  micActive
                    ? settings.pushToTalk && !pttHeld
                      ? 'bg-amber-950 border-amber-600 text-amber-200'
                      : voiceDiagnostics.localSpeaking
                        ? 'bg-emerald-900 border-emerald-400 text-white'
                        : 'bg-emerald-950 border-emerald-600 text-emerald-200'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                }`}
              >
                {micActive && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      voiceDiagnostics.localSpeaking ? 'bg-emerald-300 animate-pulse' : 'bg-emerald-600'
                    }`}
                  />
                )}
                <span>
                  {!micActive
                    ? t.chatOverlay.micOff
                    : settings.pushToTalk
                      ? pttHeld
                        ? t.chatOverlay.pttLive
                        : t.chatOverlay.pttIdle
                      : t.chatOverlay.micLive}
                </span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="ingame-chat-toggle"
                aria-expanded={chatOpen}
                aria-label={chatOpen ? t.chatOverlay.closeChat : t.chatOverlay.chatBtn}
                onClick={(e) => {
                  e.currentTarget.blur();
                  if (chatOpen) {
                    closeChat();
                  } else {
                    openChat(!isTouchMode);
                  }
                }}
                className={`${
                  isTouchMode ? 'min-h-[34px] px-3 text-[11px]' : 'px-2.5 py-0.5 text-[10px]'
                } border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  chatOpen
                    ? 'bg-[#2a1215] border-[#dc2626] text-white'
                    : unreadCount > 0
                      ? 'bg-[#221216] hover:bg-[#32181d] border-[#ef4444]/80 text-amber-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
              >
                <span>{isTouchMode ? 'Chat' : t.chatOverlay.chatBtn}</span>
                {unreadCount > 0 && !chatOpen && (
                  <span
                    data-testid="ingame-chat-unread-badge"
                    className="px-1.5 py-0.2 bg-[#dc2626] text-white font-semibold tabular-nums text-[10px]"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {!isTouchMode && teammates.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {teammates.map((tm) => {
                const muted = Boolean(mutedPeers[tm.playerId]);
                const pDiag = voiceDiagnostics.peers[tm.playerId];
                const speaking = Boolean(pDiag?.speaking) && !muted;
                const live = pDiag?.connectionState === 'connected';
                return (
                  <button
                    key={tm.playerId}
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTogglePeerMute(tm.playerId);
                    }}
                    title={tm.displayName}
                    className={`px-1.5 py-0.5 border text-[9px] flex items-center gap-1 ${
                      muted
                        ? 'bg-red-950/70 border-red-800 text-red-300'
                        : speaking
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-100'
                          : 'bg-zinc-900/90 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        muted
                          ? 'bg-red-500'
                          : speaking
                            ? 'bg-emerald-300 animate-pulse'
                            : live
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                      }`}
                    />
                    <span>
                      {tm.displayName.slice(0, 10)} {muted ? '×' : speaking ? '🔊' : '♪'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Compact Non-Intrusive Notification Preview When Chat Is Closed */}
      {!chatOpen && notification && (
        <div
          data-testid="ingame-chat-notification"
          className="pointer-events-auto max-w-[260px] bg-[#07090d]/90 border border-zinc-700/90 px-2.5 py-1.5 text-left shadow-lg flex items-start gap-2"
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              openChat(!isTouchMode);
            }}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
              <span className="text-amber-300 font-semibold truncate">
                {notification.senderName}
              </span>
              {unreadCount > 0 && (
                <span className="text-red-300 tabular-nums shrink-0">
                  {t.chatOverlay.unreadLabel(unreadCount)}
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-200 truncate mt-0.5">
              {formatChatPreview(notification.text, 46)}
            </div>
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t.chatOverlay.hide}
            onClick={(e) => {
              e.currentTarget.blur();
              onDismissNotification();
            }}
            className="text-zinc-500 hover:text-zinc-200 text-xs leading-none px-1 py-0.5 shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* In-Game Live Chat Window */}
      {chatOpen && (
        <section
          aria-label={t.chatOverlay.chatTitle}
          data-testid="ingame-chat-panel"
          style={mobilePanelStyle}
          className={`${
            isTouchMode ? 'p-2 gap-1.5' : `${desktopDrawerWidthClass} p-2.5 gap-2`
          } pointer-events-auto bg-[#07090d]/88 border border-zinc-700/85 flex flex-col shadow-2xl`}
        >
          {/* Header with Proximity toggle, Desktop Dock/Size controls, and Close button */}
          <div className="flex items-center justify-between gap-1.5 border-b border-zinc-800/90 pb-1 text-[10px] font-mono text-zinc-300 shrink-0">
            <span className="font-semibold uppercase tracking-wider text-zinc-200 truncate">
              {t.chatOverlay.chatTitle}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {!isTouchMode && (
                <>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="ingame-chat-size-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      togglePanelSize();
                    }}
                    className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
                    title={panelSize === 'compact' ? t.chatOverlay.sizeExpanded : t.chatOverlay.sizeCompact}
                  >
                    {panelSize === 'compact' ? t.chatOverlay.sizeExpanded : t.chatOverlay.sizeCompact}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="ingame-chat-dock-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      cycleDockPosition();
                    }}
                    className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
                    title={t.chatOverlay.dockLabel}
                  >
                    {t.chatOverlay.dockLabel}
                  </button>
                </>
              )}
              <button
                type="button"
                tabIndex={-1}
                data-testid="ingame-chat-close"
                aria-label={t.chatOverlay.closeChat}
                onClick={(e) => {
                  e.currentTarget.blur();
                  closeChat();
                }}
                className={`${
                  isTouchMode ? 'min-h-[30px] px-2.5' : 'px-1.5 py-0.5'
                } bg-zinc-900 hover:bg-[#7f1d1d] border border-zinc-700 text-zinc-200`}
              >
                {t.chatOverlay.hide}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 shrink-0">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={proximityFilter}
                onChange={(e) => setProximityFilter(e.target.checked)}
                className="accent-[#dc2626]"
              />
              <span>{t.chatOverlay.proxOnly}</span>
            </label>
            {!isTouchMode && (
              <span className="text-zinc-500 hidden sm:inline">{t.chatOverlay.openHint}</span>
            )}
          </div>

          {/* Scrollable Message History */}
          <div
            ref={logRef}
            data-testid="ingame-chat-log"
            className={`${
              isTouchMode
                ? 'flex-1 min-h-[48px]'
                : panelSize === 'large'
                  ? 'h-60'
                  : 'h-40'
            } overflow-y-auto space-y-1.5 text-[11px] bg-[#04060a]/90 border border-zinc-800/90 p-2`}
          >
            {visibleMessages.length === 0 ? (
              <div className="text-zinc-500 font-mono text-[10px]">{t.chatOverlay.empty}</div>
            ) : (
              visibleMessages.map((msg) => {
                const isOwn = Boolean(localPlayerId && msg.playerId === localPlayerId);
                return (
                  <div
                    key={msg.id}
                    data-testid={isOwn ? 'chat-msg-own' : 'chat-msg-peer'}
                    className={`px-2 py-1 border ${
                      isOwn
                        ? 'ml-4 bg-[#221014]/85 border-[#7f1d1d]/75'
                        : 'mr-4 bg-[#0c111b]/88 border-zinc-800/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <span
                        className={`font-semibold truncate ${
                          isOwn ? 'text-red-300' : 'text-amber-300'
                        }`}
                      >
                        {msg.senderName}
                        {isOwn
                          ? ` · ${t.chatOverlay.youTag}`
                          : msg.characterId
                            ? ` [${msg.characterId.toUpperCase()}]`
                            : ''}
                      </span>
                      <span className="text-[9px] text-zinc-500 tabular-nums shrink-0">
                        {formatChatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-100 leading-snug break-words mt-0.5">
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input + Send Row */}
          <form onSubmit={handleSubmit} className="flex gap-1.5 shrink-0">
            <input
              ref={inputRef}
              type="text"
              data-testid="ingame-chat-input"
              aria-label={t.chatOverlay.placeholder}
              maxLength={220}
              value={draft}
              onFocus={() => onChatFocusChange(true)}
              onBlur={() => onChatFocusChange(false)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.code === 'Escape') {
                  e.preventDefault();
                  closeChat();
                }
              }}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.chatOverlay.placeholder}
              className={`flex-1 min-w-0 bg-[#10141d] border border-zinc-700 px-2.5 text-zinc-100 focus:outline-none focus:border-zinc-400 ${
                isTouchMode ? 'h-9 text-sm' : 'h-8 text-xs'
              }`}
            />
            <button
              type="submit"
              tabIndex={-1}
              data-testid="ingame-chat-send"
              onMouseDown={(e) => {
                // Keep focus lifecycle clean on submit click
                e.preventDefault();
              }}
              className={`bg-[#7f1d1d] hover:bg-[#991b1b] border border-[#dc2626]/70 font-mono uppercase tracking-wider text-white font-semibold shrink-0 ${
                isTouchMode ? 'h-9 px-3.5 text-xs' : 'h-8 px-3 text-[10px]'
              }`}
            >
              {t.chatOverlay.send}
            </button>
          </form>
        </section>
      )}
    </div>
  );
};
