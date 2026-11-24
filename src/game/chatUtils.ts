import type { ChatMessage, GameState } from '../types/game';

export const MAX_CHAT_HISTORY = 80;

/**
 * Inserts a single incoming chat message idempotently by `id`,
 * maintaining chronological order and capping memory to `maxMessages`.
 */
export function mergeChatMessage(
  prev: ChatMessage[],
  incoming: ChatMessage,
  maxMessages = MAX_CHAT_HISTORY
): ChatMessage[] {
  if (!incoming || !incoming.id) return prev;
  if (prev.some((m) => m.id === incoming.id)) {
    return prev;
  }
  const next = [...prev, incoming];
  next.sort((a, b) => a.timestamp - b.timestamp);
  if (next.length > maxMessages) {
    return next.slice(next.length - maxMessages);
  }
  return next;
}

/**
 * Merges an authoritative room chat history snapshot with existing local messages
 * without duplicating or reordering existing entries.
 */
export function mergeChatHistory(
  prev: ChatMessage[],
  incomingHistory: ChatMessage[],
  maxMessages = MAX_CHAT_HISTORY
): ChatMessage[] {
  if (!incomingHistory || incomingHistory.length === 0) return prev;
  const byId = new Map<string, ChatMessage>();
  for (const m of prev) {
    if (m?.id) byId.set(m.id, m);
  }
  for (const m of incomingHistory) {
    if (m?.id) byId.set(m.id, m);
  }
  const merged = Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
  if (merged.length > maxMessages) {
    return merged.slice(merged.length - maxMessages);
  }
  return merged;
}

/**
 * Determines whether an arriving chat message should increment unread count,
 * show the compact HUD toast, and play the subtle notification cue.
 */
export function shouldTriggerChatNotification(
  msg: ChatMessage,
  localPlayerId: string | null,
  isChatOpen: boolean,
  gameState: GameState
): boolean {
  if (gameState !== 'playing') return false;
  if (isChatOpen) return false;
  if (localPlayerId && msg.playerId === localPlayerId) return false;
  return true;
}

export function formatChatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatChatPreview(text: string, maxLen = 48): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLen - 1))}…`;
}

export function filterVisibleChatMessages(
  messages: ChatMessage[],
  proximityOnly: boolean,
  localPos: { x: number; y: number; z: number },
  maxDistanceMeters = 22
): ChatMessage[] {
  if (!proximityOnly) return messages;
  return messages.filter((msg) => {
    if (!msg.proximity) return true;
    const dist = Math.hypot(
      msg.senderPos.x - localPos.x,
      msg.senderPos.y - localPos.y,
      msg.senderPos.z - localPos.z
    );
    return dist <= maxDistanceMeters;
  });
}
