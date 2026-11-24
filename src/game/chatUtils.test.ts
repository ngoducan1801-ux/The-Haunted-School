import test from 'node:test';
import assert from 'node:assert/strict';
import type { ChatMessage } from '../types/game';
import {
  filterVisibleChatMessages,
  formatChatPreview,
  formatChatTimestamp,
  mergeChatHistory,
  mergeChatMessage,
  shouldTriggerChatNotification,
} from './chatUtils';

function makeMsg(overrides: Partial<ChatMessage> & { id: string }): ChatMessage {
  return {
    playerId: 'p1',
    senderName: 'Alice',
    characterId: 'ty',
    text: 'Hello squad',
    timestamp: 1700000000000,
    proximity: false,
    senderPos: { x: 0, y: 0, z: 0 },
    ...overrides,
  };
}

test('mergeChatMessage deduplicates identical IDs and preserves chronological order', () => {
  const m1 = makeMsg({ id: 'm1', timestamp: 1000, text: 'First' });
  const m2 = makeMsg({ id: 'm2', timestamp: 2000, text: 'Second' });
  const m3 = makeMsg({ id: 'm3', timestamp: 1500, text: 'Middle' });

  let list = mergeChatMessage([], m1);
  list = mergeChatMessage(list, m2);
  list = mergeChatMessage(list, m1); // duplicate
  list = mergeChatMessage(list, m3); // slightly out of order arrival

  assert.equal(list.length, 3);
  assert.deepEqual(
    list.map((m) => m.id),
    ['m1', 'm3', 'm2']
  );
});

test('mergeChatMessage and mergeChatHistory cap stored messages cleanly', () => {
  const existing = Array.from({ length: 78 }, (_, idx) =>
    makeMsg({ id: `old_${idx}`, timestamp: 1000 + idx })
  );
  const incoming = [
    makeMsg({ id: 'old_77', timestamp: 1077 }), // overlap
    makeMsg({ id: 'new_1', timestamp: 2001 }),
    makeMsg({ id: 'new_2', timestamp: 2002 }),
    makeMsg({ id: 'new_3', timestamp: 2003 }),
  ];

  const merged = mergeChatHistory(existing, incoming, 80);
  assert.equal(merged.length, 80);
  assert.equal(merged[merged.length - 1].id, 'new_3');
});

test('shouldTriggerChatNotification suppresses own messages, open chat, and non-playing states', () => {
  const ownMsg = makeMsg({ id: 'm1', playerId: 'me' });
  const peerMsg = makeMsg({ id: 'm2', playerId: 'peer' });

  assert.equal(shouldTriggerChatNotification(ownMsg, 'me', false, 'playing'), false);
  assert.equal(shouldTriggerChatNotification(peerMsg, 'me', true, 'playing'), false);
  assert.equal(shouldTriggerChatNotification(peerMsg, 'me', false, 'lobby'), false);
  assert.equal(shouldTriggerChatNotification(peerMsg, 'me', false, 'paused'), false);
  assert.equal(shouldTriggerChatNotification(peerMsg, 'me', false, 'playing'), true);
});

test('formatChatPreview handles Vietnamese text cleanly and formatChatTimestamp renders HH:MM', () => {
  const vn = 'Hãy chạy lên tầng 3 ngay, con quái vật đang ở hành lang phía đông!';
  const preview = formatChatPreview(vn, 32);
  assert.ok(preview.endsWith('…'));
  assert.ok(preview.length <= 32);
  assert.ok(preview.includes('tầng'));

  const tsText = formatChatTimestamp(new Date(2026, 0, 1, 9, 5).getTime());
  assert.equal(tsText, '09:05');
});

test('filterVisibleChatMessages filters proximity messages beyond 22m while keeping global messages', () => {
  const nearProx = makeMsg({ id: 'a', proximity: true, senderPos: { x: 4, y: 0, z: 0 } });
  const farProx = makeMsg({ id: 'b', proximity: true, senderPos: { x: 40, y: 0, z: 0 } });
  const farGlobal = makeMsg({ id: 'c', proximity: false, senderPos: { x: 40, y: 0, z: 0 } });

  const localPos = { x: 0, y: 0, z: 0 };
  assert.equal(filterVisibleChatMessages([nearProx, farProx, farGlobal], false, localPos).length, 3);
  assert.deepEqual(
    filterVisibleChatMessages([nearProx, farProx, farGlobal], true, localPos).map((m) => m.id),
    ['a', 'c']
  );
});
