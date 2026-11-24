import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthoritativeRoomManager, isValidSixDigitRoomId } from './roomManager';

test('room creation generates unique 6-digit room IDs and respects maxPlayers 2-5', () => {
  const mgr = new AuthoritativeRoomManager();
  const created = new Set<string>();

  for (let i = 0; i < 40; i++) {
    const res = mgr.createRoom({
      roomName: `Hallway ${i}`,
      maxPlayers: (i % 4) + 2,
      hostPlayerId: `host_${i}`,
      hostDisplayName: `Host ${i}`,
    });
    assert.equal(res.ok, true);
    assert.ok(res.data);
    assert.equal(isValidSixDigitRoomId(res.data.roomId), true);
    assert.equal(created.has(res.data.roomId), false);
    created.add(res.data.roomId);
  }
});

test('authoritative character locking prevents duplicates and releases on change or disconnect', () => {
  const mgr = new AuthoritativeRoomManager();
  const roomRes = mgr.createRoom({
    roomName: 'East Wing Run',
    maxPlayers: 3,
    hostPlayerId: 'p1',
    hostDisplayName: 'Alice',
  });
  const roomId = roomRes.data!.roomId;

  const joinRes = mgr.joinRoom({ roomId, playerId: 'p2', displayName: 'Bob' });
  assert.equal(joinRes.ok, true);

  // p1 locks TY
  const p1Select = mgr.selectCharacter(roomId, 'p1', 'ty');
  assert.equal(p1Select.ok, true);
  assert.deepEqual(p1Select.data!.lockedCharacters, ['ty']);

  // p2 cannot select TY
  const p2Duplicate = mgr.selectCharacter(roomId, 'p2', 'ty');
  assert.equal(p2Duplicate.ok, false);

  // p2 selects NAM
  const p2Select = mgr.selectCharacter(roomId, 'p2', 'nam');
  assert.equal(p2Select.ok, true);

  // p1 switches from TY -> HOA, releasing TY
  const p1Switch = mgr.selectCharacter(roomId, 'p1', 'hoa');
  assert.equal(p1Switch.ok, true);
  assert.equal(p1Switch.data!.lockedCharacters.includes('ty'), false);

  // Now p2 can select TY!
  const p2TakeTy = mgr.selectCharacter(roomId, 'p2', 'ty');
  assert.equal(p2TakeTy.ok, true);

  // When p2 disconnects, TY is released
  const afterDc = mgr.disconnectPlayer(roomId, 'p2', true);
  assert.ok(afterDc);
  assert.equal(afterDc.lockedCharacters.includes('ty'), false);
});

test('server validates room capacity, 6-digit IDs, world mutations, and chat', () => {
  const mgr = new AuthoritativeRoomManager();
  const badJoin = mgr.joinRoom({ roomId: '123', playerId: 'p1', displayName: 'Test' });
  assert.equal(badJoin.ok, false);

  const r = mgr.createRoom({
    roomName: 'Basement Squad',
    maxPlayers: 2,
    hostPlayerId: 'p1',
    hostDisplayName: 'Host',
  });
  const roomId = r.data!.roomId;

  assert.equal(mgr.joinRoom({ roomId, playerId: 'p2', displayName: 'Teammate' }).ok, true);
  assert.equal(mgr.joinRoom({ roomId, playerId: 'p3', displayName: 'Extra' }).ok, false);

  assert.equal(mgr.selectCharacter(roomId, 'p1', 'ty').ok, true);
  assert.equal(mgr.selectCharacter(roomId, 'p2', 'hoa').ok, true);
  assert.equal(mgr.setReady(roomId, 'p2', true).ok, true);
  assert.equal(mgr.startGame(roomId, 'p1').ok, true);

  // Item pickup idempotency / exclusivity
  assert.equal(mgr.applyWorldMutation(roomId, { kind: 'pickup', id: 'key_courtyard' }).ok, true);
  assert.equal(mgr.applyWorldMutation(roomId, { kind: 'pickup', id: 'key_courtyard' }).ok, false);

  // Chat sanitization
  const msg = mgr.addChatMessage(roomId, 'p1', '<script>hello</script>', true);
  assert.equal(msg.ok, true);
  assert.equal(msg.data!.text, 'scripthello/script');

  // Part 3 synchronized puzzles, objectives, NPC memory & candles
  const puz = mgr.applyWorldMutation(roomId, {
    kind: 'puzzle_solve',
    puzzleId: 'puzzle_l1_circuit',
    objectiveId: 'obj_l1_key',
  });
  assert.equal(puz.ok, true);
  assert.deepEqual(puz.data!.worldSync.solvedPuzzles, ['puzzle_l1_circuit']);
  assert.deepEqual(puz.data!.worldSync.completedObjectives, ['obj_l1_key']);

  const mem = mgr.applyWorldMutation(roomId, {
    kind: 'npc_memory',
    flag: 'witch_caught_lie',
    npcId: 'npc_witch',
    disappeared: true,
  });
  assert.equal(mem.ok, true);
  assert.ok(mem.data!.worldSync.npcMemoryFlags.includes('witch_caught_lie'));
  assert.equal(
    mem.data!.worldSync.npcs.find((n) => n.id === 'npc_witch')?.disappeared,
    true
  );

  const candle = mgr.applyWorldMutation(roomId, { kind: 'candle_light', id: 'candle_reception' });
  assert.equal(candle.ok, true);
  assert.deepEqual(candle.data!.worldSync.litCandles, ['candle_reception']);

  // Part 4 synchronized horror_event (door_slam closes door state & records lastHorrorEvent)
  mgr.applyWorldMutation(roomId, { kind: 'door', id: 'door_c101', isOpen: true });
  assert.equal(mgr.getRoom(roomId)!.worldSync.doors['door_c101'], true);
  const slam = mgr.applyWorldMutation(roomId, {
    kind: 'horror_event',
    eventType: 'door_slam',
    targetDoorId: 'door_c101',
  });
  assert.equal(slam.ok, true);
  assert.equal(slam.data!.worldSync.doors['door_c101'], false);
  assert.equal(slam.data!.worldSync.lastHorrorEvent?.eventType, 'door_slam');
});

test('Part 6 multiplayer 1000 HP syncs across damage and teammate revive restores 350 HP', () => {
  const mgr = new AuthoritativeRoomManager();
  const res = mgr.createRoom({
    roomName: 'Medical Wing',
    maxPlayers: 2,
    hostPlayerId: 'p1',
    hostDisplayName: 'Nam',
  });
  const roomId = res.data!.roomId;
  mgr.joinRoom({ roomId, playerId: 'p2', displayName: 'Hoa' });
  mgr.selectCharacter(roomId, 'p1', 'nam');
  mgr.selectCharacter(roomId, 'p2', 'hoa');
  mgr.setReady(roomId, 'p2', true);
  const started = mgr.startGame(roomId, 'p1');
  assert.equal(started.ok, true);

  const p2Start = started.data!.players.find((p) => p.playerId === 'p2')!;
  assert.equal(p2Start.hp, 1000);
  assert.equal(p2Start.maxHp, 1000);
  assert.equal(p2Start.isDowned, false);

  // Teammate loses all HP and becomes downed
  mgr.updatePlayerTransform(roomId, 'p2', {
    position: { x: 1, y: 0, z: 20 },
    yaw: 0,
    pitch: 0,
    animState: 'downed',
    isCrouching: false,
    isHiding: false,
    flashlightOn: false,
    flashlightBrightness: 1,
    hp: 0,
    maxHp: 1000,
    isDowned: true,
  });
  const p2Down = mgr.getRoom(roomId)!.players.find((p) => p.playerId === 'p2')!;
  assert.equal(p2Down.hp, 0);
  assert.equal(p2Down.isDowned, true);

  // p1 revives p2 via authoritative world mutation
  const reviveRes = mgr.applyWorldMutation(roomId, {
    kind: 'player_revive',
    targetPlayerId: 'p2',
    hp: 350,
  });
  assert.equal(reviveRes.ok, true);
  const p2Revived = reviveRes.data!.players.find((p) => p.playerId === 'p2')!;
  assert.equal(p2Revived.hp, 350);
  assert.equal(p2Revived.isDowned, false);
});

test('5-player room assigns distinct non-overlapping spawn points matched to selected campaign level', () => {
  const mgr = new AuthoritativeRoomManager();
  const roomRes = mgr.createRoom({
    roomName: 'Rooftop Escape Squad',
    maxPlayers: 5,
    hostPlayerId: 'p1',
    hostDisplayName: 'Ty',
    level: 10,
  });
  const roomId = roomRes.data!.roomId;
  const ids = ['p2', 'p3', 'p4', 'p5'];
  const chars = ['nam', 'hoa', 'hai', 'phuong'] as const;

  mgr.selectCharacter(roomId, 'p1', 'ty');
  ids.forEach((pid, i) => {
    assert.equal(mgr.joinRoom({ roomId, playerId: pid, displayName: `P${i + 2}` }).ok, true);
    assert.equal(mgr.selectCharacter(roomId, pid, chars[i]).ok, true);
    assert.equal(mgr.setReady(roomId, pid, true).ok, true);
  });

  const started = mgr.startGame(roomId, 'p1');
  assert.equal(started.ok, true);
  const players = started.data!.players;
  assert.equal(players.length, 5);
  for (let i = 0; i < players.length; i++) {
    assert.equal(players[i].position.y, 24);
    for (let j = i + 1; j < players.length; j++) {
      const dist = Math.hypot(
        players[i].position.x - players[j].position.x,
        players[i].position.z - players[j].position.z
      );
      assert.ok(dist >= 0.9, `Players ${i} and ${j} spawned too close: ${dist}`);
    }
  }
});

test('in-game live chat isolates rooms, enforces authoritative sender names, and preserves Vietnamese text', () => {
  const mgr = new AuthoritativeRoomManager();
  const roomA = mgr.createRoom({
    roomName: 'Alpha Squad',
    maxPlayers: 3,
    hostPlayerId: 'pA1',
    hostDisplayName: 'Minh',
  }).data!;
  const roomB = mgr.createRoom({
    roomName: 'Beta Squad',
    maxPlayers: 3,
    hostPlayerId: 'pB1',
    hostDisplayName: 'Lan',
  }).data!;

  mgr.joinRoom({ roomId: roomA.roomId, playerId: 'pA2', displayName: 'Tuan' });

  // Non-member cannot post into Room A
  const outsider = mgr.addChatMessage(roomA.roomId, 'pB1', 'Intruder message', false);
  assert.equal(outsider.ok, false);

  // Room A chat preserves Vietnamese UTF-8 and stamps authoritative sender name
  const vnMsg = mgr.addChatMessage(
    roomA.roomId,
    'pA2',
    'Quái vật đang ở hành lang tầng 2!',
    false
  );
  assert.equal(vnMsg.ok, true);
  assert.equal(vnMsg.data!.senderName, 'Tuan');
  assert.equal(vnMsg.data!.text, 'Quái vật đang ở hành lang tầng 2!');

  // Room B remains isolated with zero messages from Room A
  assert.equal(mgr.getRoom(roomA.roomId)!.chatHistory.length, 1);
  assert.equal(mgr.getRoom(roomB.roomId)!.chatHistory.length, 0);

  // Disconnected player cannot post
  mgr.disconnectPlayer(roomA.roomId, 'pA2', false);
  const dcMsg = mgr.addChatMessage(roomA.roomId, 'pA2', 'Ghost chat', false);
  assert.equal(dcMsg.ok, false);
});

test('online room lifecycle validates version, started rooms, already-in-room, TTL expiry, and seamless reconnect', () => {
  const mgr = new AuthoritativeRoomManager();
  const t0 = 1_000_000;

  // Version mismatch rejected on create and join
  const badVerCreate = mgr.createRoom({
    roomName: 'Old Client',
    maxPlayers: 4,
    hostPlayerId: 'h1',
    hostDisplayName: 'OldHost',
    version: '0.1.0',
    now: t0,
  });
  assert.equal(badVerCreate.ok, false);
  assert.equal(badVerCreate.errorCode, 'version_mismatch');

  const roomRes = mgr.createRoom({
    roomName: 'Global Wing',
    maxPlayers: 3,
    hostPlayerId: 'p1',
    hostDisplayName: 'Host',
    now: t0,
  });
  assert.equal(roomRes.ok, true);
  const roomId = roomRes.data!.roomId;

  const badVerJoin = mgr.joinRoom({
    roomId,
    playerId: 'p2',
    displayName: 'Bob',
    version: '0.1.0',
    now: t0 + 1000,
  });
  assert.equal(badVerJoin.ok, false);
  assert.equal(badVerJoin.errorCode, 'version_mismatch');

  // Joining a second room while already active in one fails with already_in_room
  const room2 = mgr.createRoom({
    roomName: 'Second Wing',
    maxPlayers: 3,
    hostPlayerId: 'other_h',
    hostDisplayName: 'Other',
    now: t0 + 1000,
  }).data!;
  const alreadyRes = mgr.joinRoom({
    roomId: room2.roomId,
    playerId: 'p1',
    displayName: 'Host',
    currentRoomId: roomId,
    now: t0 + 1500,
  });
  assert.equal(alreadyRes.ok, false);
  assert.equal(alreadyRes.errorCode, 'already_in_room');

  // Join & start game -> new outsiders get room_started error
  assert.equal(mgr.joinRoom({ roomId, playerId: 'p2', displayName: 'Bob', now: t0 + 2000 }).ok, true);
  mgr.selectCharacter(roomId, 'p1', 'ty');
  mgr.selectCharacter(roomId, 'p2', 'hoa');
  mgr.setReady(roomId, 'p2', true);
  assert.equal(mgr.startGame(roomId, 'p1').ok, true);

  const lateJoin = mgr.joinRoom({ roomId, playerId: 'p3', displayName: 'Late', now: t0 + 3000 });
  assert.equal(lateJoin.ok, false);
  assert.equal(lateJoin.errorCode, 'room_started');

  // Temporary disconnect preserves slot, character, and HP, allowing seamless reconnect even while playing
  mgr.updatePlayerTransform(roomId, 'p2', {
    position: { x: 2, y: 0, z: 18 },
    yaw: 0.4,
    pitch: 0,
    animState: 'walk',
    isCrouching: false,
    isHiding: false,
    flashlightOn: true,
    flashlightBrightness: 3,
    hp: 800,
    maxHp: 1000,
    isDowned: false,
  });
  const tempDc = mgr.disconnectPlayer(roomId, 'p2', false);
  assert.ok(tempDc);
  const p2Offline = tempDc.players.find((p) => p.playerId === 'p2')!;
  assert.equal(p2Offline.connected, false);
  assert.equal(p2Offline.characterId, 'hoa');
  assert.equal(p2Offline.hp, 800);

  const rejoined = mgr.joinRoom({ roomId, playerId: 'p2', displayName: 'Bob', now: t0 + 5000 });
  assert.equal(rejoined.ok, true);
  assert.equal(rejoined.data!.players.length, 2);
  const p2Online = rejoined.data!.players.find((p) => p.playerId === 'p2')!;
  assert.equal(p2Online.connected, true);
  assert.equal(p2Online.characterId, 'hoa');
  assert.equal(p2Online.hp, 800);

  // Expired rooms return room_expired after TTL passes
  const expiredJoin = mgr.joinRoom({
    roomId: room2.roomId,
    playerId: 'p9',
    displayName: 'Wanderer',
    now: t0 + 50 * 60 * 1000,
  });
  assert.equal(expiredJoin.ok, false);
  assert.equal(expiredJoin.errorCode, 'room_expired');
});

test('applyWorldMutation rejects lobby-phase mutations and malformed kinds safely', () => {
  const mgr = new AuthoritativeRoomManager();
  const room = mgr.createRoom({
    roomName: 'Security Check',
    maxPlayers: 3,
    hostPlayerId: 'p1',
    hostDisplayName: 'Host',
  }).data!;

  // Cannot mutate world while still in lobby
  const lobbyAttempt = mgr.applyWorldMutation(room.roomId, {
    kind: 'pickup',
    id: 'key_courtyard',
  });
  assert.equal(lobbyAttempt.ok, false);

  mgr.selectCharacter(room.roomId, 'p1', 'ty');
  assert.equal(mgr.startGame(room.roomId, 'p1').ok, true);

  // Unknown mutation kind is rejected
  const invalidAttempt = mgr.applyWorldMutation(room.roomId, {
    kind: 'evil_override' as 'door',
    id: 'door_1',
    isOpen: true,
  });
  assert.equal(invalidAttempt.ok, false);
});

