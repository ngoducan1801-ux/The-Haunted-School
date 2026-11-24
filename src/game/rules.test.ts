import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_PROFILES,
  LEVEL_CONFIGS,
  computeVoiceAttenuation,
  countWallsBetween,
  cycleFlashlightBrightness,
  generateRoomCode,
  getAdaptiveResolutionScale,
  getCharacterProfile,
  getLevelConfig,
  isValidRoomCode,
  resolvePlayerMovement,
  updateFlashlight,
  updateStamina,
} from './rules';

test('ten connected levels scale difficulty progressively from 1 to 10', () => {
  assert.equal(LEVEL_CONFIGS.length, 10);
  const lvl1 = getLevelConfig(1);
  const lvl10 = getLevelConfig(10);
  assert.ok(lvl1.supernaturalEventRate < lvl10.supernaturalEventRate);
  assert.ok(lvl1.batteryDrainMultiplier < lvl10.batteryDrainMultiplier);
});

test('five balanced playable characters have distinct abilities and trade-offs', () => {
  assert.equal(CHARACTER_PROFILES.length, 5);
  const ids = CHARACTER_PROFILES.map((c) => c.id);
  assert.deepEqual(ids, ['ty', 'nam', 'hoa', 'hai', 'phuong']);

  const hai = getCharacterProfile('hai');
  const ty = getCharacterProfile('ty');
  assert.ok(hai.maxStamina > ty.maxStamina);
  assert.ok(ty.inventoryCapacity > hai.inventoryCapacity);
  assert.ok(getCharacterProfile('hoa').interactRange > hai.interactRange);
});

test('stamina respects character athletic advantage and nervous recovery penalty', () => {
  const hai = getCharacterProfile('hai');
  const nam = getCharacterProfile('nam');

  const haiSprint = updateStamina(
    { stamina: hai.maxStamina, maxStamina: hai.maxStamina, exhaustedCooldown: 0 },
    true,
    true,
    false,
    0.05,
    { drainMult: hai.staminaDrainMult }
  );
  assert.equal(haiSprint.canSprint, true);

  const namCalm = updateStamina(
    { stamina: 50, maxStamina: nam.maxStamina, exhaustedCooldown: 0 },
    false,
    false,
    false,
    0.05,
    { isNervous: false, nervousRecoveryMult: nam.nervousRecoveryMult }
  );
  const namNervous = updateStamina(
    { stamina: 50, maxStamina: nam.maxStamina, exhaustedCooldown: 0 },
    false,
    false,
    false,
    0.05,
    { isNervous: true, nervousRecoveryMult: nam.nervousRecoveryMult }
  );
  assert.ok(namNervous.state.stamina < namCalm.state.stamina);
});

test('flashlight cycles brightness 1 -> 2 -> 3 -> 1 and drains battery when enabled', () => {
  assert.equal(cycleFlashlightBrightness(1), 2);
  assert.equal(cycleFlashlightBrightness(2), 3);
  assert.equal(cycleFlashlightBrightness(3), 1);

  const fl = updateFlashlight(
    { on: true, brightness: 3, battery: 50, flickerTimer: 0, flickerIntensity: 1 },
    true,
    1.0,
    0.05
  );
  assert.ok(fl.battery < 50);
});

test('player collision slides cleanly along walls', () => {
  const colliders = [
    { id: 'wall', minX: -2, maxX: 2, minY: 0, maxY: 3.5, minZ: -1, maxZ: 0, active: true },
  ];
  const res = resolvePlayerMovement({ x: 0, y: 0, z: 0.35 }, { dx: 0.1, dz: -0.2 }, 0.38, colliders);
  assert.ok(res.z >= 0.379);
  assert.ok(res.x > 0.05);
});

test('proximity voice attenuates by distance and wall occlusion', () => {
  const nearClear = computeVoiceAttenuation(2, 0, 1.0);
  const farClear = computeVoiceAttenuation(18, 0, 1.0);
  const nearBehindWall = computeVoiceAttenuation(2, 2, 1.0);

  assert.ok(nearClear.gain > farClear.gain);
  assert.ok(nearClear.gain > nearBehindWall.gain);
  assert.ok(nearBehindWall.lowpassHz < nearClear.lowpassHz);
  assert.equal(computeVoiceAttenuation(30, 0, 1.0).gain, 0);

  const wallHits = countWallsBetween(
    { x: -3, y: 0, z: 0 },
    { x: 3, y: 0, z: 0 },
    [{ id: 'w1', minX: -0.5, maxX: 0.5, minY: 0, maxY: 3.5, minZ: -4, maxZ: 4, active: true }]
  );
  assert.equal(wallHits, 1);
});

test('adaptive resolution and 6-digit room codes work as expected', () => {
  assert.ok(getAdaptiveResolutionScale(1.0, 35, 90) < 1.0);
  const code = generateRoomCode(() => 0.5);
  assert.equal(isValidRoomCode(code), true);
});

import {
  CAMPAIGN_LEVELS,
  PUZZLE_DEFINITIONS,
  buildControlledNpcDialogue,
  validatePuzzleAnswer,
} from './campaignData';
import { computePlayerNoiseLevel, stepMonsterAiDecision } from './monsters';

test('all 10 campaign levels have progressive difficulty labels, objectives, puzzles, and monster escalation', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 10);
  assert.equal(CAMPAIGN_LEVELS[0].difficultyLabel, 'Very Easy');
  assert.equal(CAMPAIGN_LEVELS[9].difficultyLabel, 'Maximum');
  assert.equal(CAMPAIGN_LEVELS[9].activeMonsters.length, 4);
  for (let i = 0; i < 10; i++) {
    assert.equal(CAMPAIGN_LEVELS[i].level, i + 1);
    assert.ok(CAMPAIGN_LEVELS[i].objectives.length >= 3);
    assert.ok(CAMPAIGN_LEVELS[i].requiredPuzzleId);
  }
});

test('all 10 puzzle definitions validate normalized answers and reject wrong guesses', () => {
  const keys = Object.keys(PUZZLE_DEFINITIONS);
  assert.equal(keys.length, 10);
  for (const key of keys) {
    const p = PUZZLE_DEFINITIONS[key];
    assert.equal(validatePuzzleAnswer(p, p.answer.toLowerCase()), true);
    assert.equal(validatePuzzleAnswer(p, 'WRONG_ANSWER_XYZ'), false);
  }
});

test('controlled NPC & Witch dialogue remembers flags and respects inventory items', () => {
  const witchInitial = buildControlledNpcDialogue('npc_witch', 3, [], []);
  assert.equal(
    witchInitial.options.some((o) => o.id === 'witch_give_seal'),
    false
  );

  const witchWithRelic = buildControlledNpcDialogue('npc_witch', 7, ['relic_seal'], ['witch_met']);
  assert.equal(
    witchWithRelic.options.some((o) => o.id === 'witch_give_seal'),
    true
  );

  const witchAfterSeal = buildControlledNpcDialogue(
    'npc_witch',
    7,
    [],
    ['witch_received_seal']
  );
  assert.equal(witchAfterSeal.truthful, true);
  assert.equal(
    witchAfterSeal.options.some((o) => o.id === 'witch_request_task'),
    false
  );
});

test('monster AI reacts to sound, flashlight, hiding lockers, and Shadow Walker vanish', () => {
  const quietNoise = computePlayerNoiseLevel(true, false, true, false);
  const sprintNoise = computePlayerNoiseLevel(true, true, false, false);
  assert.ok(sprintNoise > quietNoise);
  assert.equal(computePlayerNoiseLevel(true, true, false, true), 0);

  // Crawler hears sprinting from afar and chases when close with noise
  const crawlerChase = stepMonsterAiDecision({
    type: 'crawler',
    currentState: 'patrol',
    distanceToPlayer: 4.5,
    playerNoise: sprintNoise,
    playerFlashlightOn: false,
    playerHiding: false,
    stateTimer: 2,
    vanishCooldown: 0,
  });
  assert.equal(crawlerChase.nextState, 'chase');

  // Hiding inside a locker breaks chase into search
  const stalkerBroken = stepMonsterAiDecision({
    type: 'hallway_stalker',
    currentState: 'chase',
    distanceToPlayer: 3.0,
    playerNoise: 0,
    playerFlashlightOn: false,
    playerHiding: true,
    stateTimer: 2,
    vanishCooldown: 0,
  });
  assert.equal(stalkerBroken.nextState, 'search');

  // Shadow Walker vanishes when approached closely
  const shadowVanish = stepMonsterAiDecision({
    type: 'shadow_walker',
    currentState: 'observe',
    distanceToPlayer: 3.5,
    playerNoise: quietNoise,
    playerFlashlightOn: true,
    playerHiding: false,
    stateTimer: 2,
    vanishCooldown: 0,
  });
  assert.equal(shadowVanish.nextState, 'vanished');
});

import {
  DEFAULT_SETTINGS,
  GRAPHICS_PRESETS,
  applyGraphicsPreset,
  selectDynamicAudioState,
} from './rules';

test('Part 4 graphics presets apply all 11 settings cleanly across 6 tiers', () => {
  assert.equal(Object.keys(GRAPHICS_PRESETS).length, 6);
  const vLow = applyGraphicsPreset(DEFAULT_SETTINGS, 'very_low');
  const ultra = applyGraphicsPreset(DEFAULT_SETTINGS, 'ultra');
  const adaptive = applyGraphicsPreset(DEFAULT_SETTINGS, 'adaptive');

  assert.equal(vLow.shadowQuality, 'off');
  assert.equal(vLow.lightingQuality, 'low');
  assert.ok(vLow.viewDistance < ultra.viewDistance);
  assert.equal(ultra.shadowQuality, 'high');
  assert.equal(ultra.fpsLimit, 120);
  assert.equal(adaptive.fpsLimit, 90);
});

test('Part 4 dynamic horror audio state machine selects all 7 states cleanly', () => {
  assert.equal(
    selectDynamicAudioState({
      level: 1,
      monsterAlertLevel: 0,
      isChased: false,
      npcDialogueOpen: false,
      exitUnlocked: false,
      inSilenceWindow: true,
    }),
    'silence'
  );
  assert.equal(
    selectDynamicAudioState({
      level: 5,
      monsterAlertLevel: 0.8,
      isChased: true,
      npcDialogueOpen: true,
      exitUnlocked: false,
      inSilenceWindow: false,
    }),
    'chase'
  );
  assert.equal(
    selectDynamicAudioState({
      level: 4,
      monsterAlertLevel: 0.5,
      isChased: false,
      npcDialogueOpen: false,
      exitUnlocked: false,
      inSilenceWindow: false,
    }),
    'danger'
  );
  assert.equal(
    selectDynamicAudioState({
      level: 3,
      monsterAlertLevel: 0.1,
      isChased: false,
      npcDialogueOpen: true,
      exitUnlocked: false,
      inSilenceWindow: false,
    }),
    'npc_encounter'
  );
  assert.equal(
    selectDynamicAudioState({
      level: 9,
      monsterAlertLevel: 0.1,
      isChased: false,
      npcDialogueOpen: false,
      exitUnlocked: true,
      inSilenceWindow: false,
    }),
    'escape'
  );
  assert.equal(
    selectDynamicAudioState({
      level: 2,
      monsterAlertLevel: 0.25,
      isChased: false,
      npcDialogueOpen: false,
      exitUnlocked: false,
      inSilenceWindow: false,
    }),
    'suspicion'
  );
  assert.equal(
    selectDynamicAudioState({
      level: 1,
      monsterAlertLevel: 0,
      isChased: false,
      npcDialogueOpen: false,
      exitUnlocked: false,
      inSilenceWindow: false,
    }),
    'exploration'
  );
});

import {
  MAX_PLAYER_HP,
  MONSTER_CONTACT_DAMAGE,
  QUICK_SLOT_COUNT,
  addItemToQuickSlots,
  applyPlayerDamage,
  applyPlayerHeal,
  consumeQuickSlot,
  createEmptyQuickSlots,
} from './rules';
import { getUiStrings, localizeCharacter, localizeLevel } from './i18n';
import { hasLineOfSight } from './monsters';

test('Part 6 player health starts at 1000 HP, takes -100 damage with cooldown, and heals safely', () => {
  assert.equal(MAX_PLAYER_HP, 1000);
  for (const c of CHARACTER_PROFILES) {
    assert.equal(c.maxHp, 1000);
  }

  // First contact applies 100 damage and starts 1.6s cooldown
  const hit1 = applyPlayerDamage(MAX_PLAYER_HP, MONSTER_CONTACT_DAMAGE, 0);
  assert.equal(hit1.hp, 900);
  assert.equal(hit1.appliedDamage, 100);
  assert.equal(hit1.isDowned, false);
  assert.ok(hit1.nextCooldown > 0);

  // During active cooldown, repeated frame contact deals 0 damage
  const blocked = applyPlayerDamage(hit1.hp, MONSTER_CONTACT_DAMAGE, hit1.nextCooldown);
  assert.equal(blocked.hp, 900);
  assert.equal(blocked.appliedDamage, 0);

  // Lethal hit drops HP to 0 and triggers downed state
  const lethal = applyPlayerDamage(100, MONSTER_CONTACT_DAMAGE, 0);
  assert.equal(lethal.hp, 0);
  assert.equal(lethal.isDowned, true);

  // Healing restores HP without exceeding 1000, and cannot self-heal when downed at 0 HP
  const healed = applyPlayerHeal(750, MAX_PLAYER_HP, 300);
  assert.equal(healed.hp, 1000);
  assert.equal(healed.healed, 250);
  const downedHeal = applyPlayerHeal(0, MAX_PLAYER_HP, 300);
  assert.equal(downedHeal.hp, 0);
  assert.equal(downedHeal.healed, 0);
});

test('Part 6 quick inventory supports 6 slots, stacks consumables, and protects keys', () => {
  let slots = createEmptyQuickSlots();
  assert.equal(slots.length, QUICK_SLOT_COUNT);

  const battery = {
    id: 'bat_starter',
    name: 'D-Cell Battery',
    kind: 'battery' as const,
    description: 'Restores charge',
    droppable: true,
    consumable: true,
  };
  const key = {
    id: 'key_courtyard',
    name: 'Reception Key',
    kind: 'key' as const,
    description: 'Essential key',
    droppable: false,
  };

  const b1 = addItemToQuickSlots(slots, battery);
  slots = b1.slots;
  const b2 = addItemToQuickSlots(slots, battery);
  slots = b2.slots;
  assert.equal(b1.slotIndex, 0);
  assert.equal(b2.slotIndex, 0);
  assert.equal(slots[0]?.quantity, 2);

  const k1 = addItemToQuickSlots(slots, key);
  slots = k1.slots;
  assert.equal(k1.slotIndex, 1);

  // Keys are never consumed or dropped by consumeQuickSlot
  const tryKeyConsume = consumeQuickSlot(slots, 1);
  assert.equal(tryKeyConsume.consumedItem, null);
  assert.equal(tryKeyConsume.slots[1]?.item.id, 'key_courtyard');
});

test('Part 6 wall-aware LOS breaks monster chase into search and spawns Level 1 outside gate', () => {
  assert.equal(CAMPAIGN_LEVELS[0].spawn.z, 55);
  assert.equal(CAMPAIGN_LEVELS[0].spawn.y, 0);
  assert.equal(CAMPAIGN_LEVELS[9].spawn.y, 24);

  const wallColliders = [
    { id: 'w1', minX: -4, maxX: 4, minY: 0, maxY: 4, minZ: -0.2, maxZ: 0.2, active: true },
  ];
  assert.equal(hasLineOfSight({ x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: -3 }, wallColliders), false);
  assert.equal(hasLineOfSight({ x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: 1 }, wallColliders), true);

  const lostSight = stepMonsterAiDecision({
    type: 'hallway_stalker',
    currentState: 'chase',
    distanceToPlayer: 5,
    hasLineOfSight: false,
    playerNoise: 0.18,
    playerFlashlightOn: false,
    playerHiding: false,
    stateTimer: 1,
    vanishCooldown: 0,
  });
  assert.equal(lostSight.nextState, 'search');
});

test('Part 6 Vietnamese localization translates UI, levels, and characters cleanly', () => {
  const vi = getUiStrings('vi');
  assert.ok(vi.hud.chaseAlert.length > 5);
  assert.ok(vi.map.title.length > 5);
  const lvl1Vi = localizeLevel(CAMPAIGN_LEVELS[0], 'vi');
  assert.notEqual(lvl1Vi.name, CAMPAIGN_LEVELS[0].name);
  const tyVi = localizeCharacter(getCharacterProfile('ty'), 'vi');
  assert.notEqual(tyVi.title, getCharacterProfile('ty').title);
});

import { computeSafeFlashlightOrigin, getFlashlightBeamConfig } from './rules';

test('wide circular flashlight config scales cleanly between 65° and 80° across brightness levels', () => {
  const b1 = getFlashlightBeamConfig(1);
  const b2 = getFlashlightBeamConfig(2);
  const b3 = getFlashlightBeamConfig(3);

  for (const cfg of [b1, b2, b3]) {
    assert.ok(cfg.fullBeamAngleDeg >= 65 && cfg.fullBeamAngleDeg <= 80);
    assert.ok(cfg.penumbra >= 0.75 && cfg.penumbra <= 0.95);
    assert.ok(Math.abs((cfg.spotAngleRad * 2 * 180) / Math.PI - cfg.fullBeamAngleDeg) < 0.5);
  }
  assert.ok(b1.intensity < b2.intensity && b2.intensity < b3.intensity);
  assert.ok(b1.distance < b2.distance && b2.distance < b3.distance);
});

test('computeSafeFlashlightOrigin pulls emitter back behind solid walls to prevent light bleed', () => {
  const wallColliders = [
    { id: 'thin_wall', minX: -2, maxX: 2, minY: 0, maxY: 3.5, minZ: -0.1, maxZ: 0.1, active: true },
  ];
  const unobstructed = computeSafeFlashlightOrigin(
    { x: 0, y: 1.65, z: 2.0 },
    { x: 0, y: 0, z: -1 },
    { x: 1, y: 0, z: 0 },
    wallColliders
  );
  assert.ok(unobstructed.z < 2.0);
  assert.ok(unobstructed.x > 0);

  // Camera pressed very close to wall at z=0.18 facing -Z: emitter must NOT cross z=0.10 into adjacent room
  const pressedToWall = computeSafeFlashlightOrigin(
    { x: 0, y: 1.65, z: 0.18 },
    { x: 0, y: 0, z: -1 },
    { x: 1, y: 0, z: 0 },
    wallColliders
  );
  assert.ok(pressedToWall.z >= 0.14, `Expected origin to stay on player side of wall, got z=${pressedToWall.z}`);
});

import {
  computeVoiceModeMix,
  isPoliteVoicePeer,
  parseIceServersConfig,
} from './rules';

test('WebRTC Perfect Negotiation polarity is strictly asymmetric for distinct peers', () => {
  assert.notEqual(isPoliteVoicePeer('peer_a', 'peer_b'), isPoliteVoicePeer('peer_b', 'peer_a'));
  assert.equal(isPoliteVoicePeer('p2', 'p1'), true);
  assert.equal(isPoliteVoicePeer('p1', 'p2'), false);
});

test('Voice mode mixing keeps Squad Radio clear across 6 floors while 3D Spatial attenuates with walls', () => {
  const radioFar = computeVoiceModeMix('radio', 42, 4, 0.9);
  assert.equal(radioFar.gain, 0.9);
  assert.equal(radioFar.lowpassHz, 14000);

  const spatialNear = computeVoiceModeMix('spatial', 2, 0, 0.9);
  const spatialFar = computeVoiceModeMix('spatial', 20, 2, 0.9);
  assert.ok(spatialNear.gain > spatialFar.gain);
  assert.ok(spatialFar.lowpassHz < radioFar.lowpassHz);
});

test('parseIceServersConfig parses custom TURN/STUN JSON and safely falls back on invalid JSON', () => {
  const defaults = parseIceServersConfig('');
  assert.ok(defaults.length >= 3);
  assert.ok(String(defaults[0].urls).startsWith('stun:'));

  const custom = parseIceServersConfig(
    JSON.stringify([{ urls: 'turn:relay.example.com:3478', username: 'u', credential: 'p' }])
  );
  assert.equal(custom.length, 1);
  assert.equal(custom[0].urls, 'turn:relay.example.com:3478');

  const fallback = parseIceServersConfig('{not-valid-json');
  assert.ok(fallback.length >= 3);
});

test('puzzle_l6_breaker avoids answer spoilers and normalizes 3-relay amperage order/separators', () => {
  const p6 = PUZZLE_DEFINITIONS.puzzle_l6_breaker;
  assert.equal(p6.prompt.includes('5-9-10'), false);
  assert.equal(validatePuzzleAnswer(p6, '5-9-10'), true);
  assert.equal(validatePuzzleAnswer(p6, '10, 5, 9'), true);
  assert.equal(validatePuzzleAnswer(p6, '5A 9A 10A'), true);
  assert.equal(validatePuzzleAnswer(p6, '5-7-13'), false);
});

test('puzzle_l7_symbols has a clean unique deduction without developer scratchpad text', () => {
  const p7 = PUZZLE_DEFINITIONS.puzzle_l7_symbols;
  assert.equal(p7.prompt.includes('Wait:'), false);
  assert.equal(p7.hint.includes('Wait:'), false);
  assert.equal(validatePuzzleAnswer(p7, 'BELL'), true);
  assert.equal(validatePuzzleAnswer(p7, 'MOON'), false);
  assert.equal(validatePuzzleAnswer(p7, 'EYE'), false);
});

