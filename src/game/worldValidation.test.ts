import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  FLOOR_ELEVATIONS,
  LEVEL_SPAWNS,
  SCHOOL_FLOOR_PLANS,
  STAIR_FLIGHTS,
  ZONE_DEFINITIONS,
  computeMultiplayerSpawnPositions,
  findSafeSpawnFallback,
  getZoneAt,
  groundHeightAt,
  validateSpawnPoint,
} from './schoolBlueprint';
import { buildSchoolWorld } from './schoolWorld';
import { CAMPAIGN_LEVELS } from './campaignData';
import { resolvePlayerMovement } from './rules';
import type { ProceduralMaterialLibrary } from './proceduralAssets';

function createHeadlessMaterialLibrary(): ProceduralMaterialLibrary {
  const std = () => new THREE.MeshStandardMaterial();
  const phys = () => new THREE.MeshPhysicalMaterial();
  const lib: ProceduralMaterialLibrary = {
    plasterWall: std(),
    corridorTile: std(),
    woodFloor: std(),
    basementConcrete: std(),
    asphalt: std(),
    darkWood: std(),
    wornWood: std(),
    rustedMetal: std(),
    lockerSteel: std(),
    brass: std(),
    chalkboard: std(),
    glassPane: phys(),
    crtScreen: std(),
    emissiveTubeOn: std(),
    emissiveTubeOff: std(),
    exitSign: std(),
    paper: std(),
    fabric: std(),
    foliageDead: std(),
    setTextureAnisotropy: () => {},
    dispose: () => {},
  };
  return lib;
}

test('3D school world builds cleanly across all 8 elevations (B1, F1-F6, ROOF) with required architecture & interactables', () => {
  const scene = new THREE.Scene();
  const mats = createHeadlessMaterialLibrary();
  const world = buildSchoolWorld(scene, mats, true);

  try {
    // 1. Every elevation B1 (-4), F1..F6 (0..20), ROOF (24) has a dedicated populated floorGroup
    for (const elev of FLOOR_ELEVATIONS) {
      const grp = world.floorGroups.get(elev);
      assert.ok(grp, `Missing floorGroup for elevation y=${elev}`);
      assert.ok(grp.children.length >= 4, `Floor y=${elev} has too few objects (${grp.children.length})`);
    }

    // 2. Verify Main Entrance Door, F1 Security & Storage, Basement, Upper Floors F2-F6, F5 Secret, F6 Archive & Rooftop
    const requiredIds = [
      'door_main_entrance',
      'exit_south_reception',
      'door_security',
      'note_security',
      'door_f1_storage_w',
      'door_f1_storage_e',
      'door_f1_storage_e2',
      'door_f1_storage_n',
      'exit_basement_stair',
      'exit_rooftop_stair',
      'switch_library_book',
      'door_F2_wc',
      'door_F2_east_m',
      'door_F3_west',
      'door_F4_east_m',
      'door_F5_sec_c',
      'switch_f5_secret',
      'door_F6_north_w',
      'note_f6_archive',
      'switch_rooftop_beacon',
      'puzzle_l10_final',
      'exit_final_escape',
    ];
    for (const id of requiredIds) {
      const found = world.interactables.find((i) => i.id === id);
      assert.ok(found, `Missing required interactable "${id}" in 3D world`);
    }

    // 3. Verify Main Entrance Door is unlocked (so players can enter Reception smoothly from courtyard)
    const mainDoor = world.interactables.find((i) => i.id === 'door_main_entrance')!;
    assert.equal(mainDoor.lockedByKeyId, undefined);
    assert.equal(mainDoor.lockedBySwitchId, undefined);

    // 4. Verify secret switches use distinct valid closed/open X coordinates
    const libSwitch = world.interactables.find((i) => i.id === 'switch_library_book')!;
    const f5Switch = world.interactables.find((i) => i.id === 'switch_f5_secret')!;
    assert.equal(libSwitch.secretWallClosedX, -22.0);
    assert.equal(libSwitch.secretWallOpenX, -23.65);
    assert.equal(f5Switch.secretWallClosedX, -4.1);
    assert.equal(f5Switch.secretWallOpenX, -6.0);

    // 5. Verify no collider or mesh contains NaN positions
    for (const col of world.colliders) {
      assert.ok(
        Number.isFinite(col.minX) &&
          Number.isFinite(col.maxX) &&
          Number.isFinite(col.minY) &&
          Number.isFinite(col.maxY) &&
          Number.isFinite(col.minZ) &&
          Number.isFinite(col.maxZ),
        `Non-finite collider bounds on ${col.id}`
      );
      assert.ok(col.minX <= col.maxX && col.minY <= col.maxY && col.minZ <= col.maxZ, `Inverted collider ${col.id}`);
    }

    // 6. All 10 campaign spawns match LEVEL_SPAWNS, are grounded cleanly, and have zero collider overlap
    for (const lvl of CAMPAIGN_LEVELS) {
      assert.deepEqual(lvl.spawn, LEVEL_SPAWNS[lvl.level], `Level ${lvl.level} spawn mismatch with blueprint`);
      const check = validateSpawnPoint(lvl.spawn, world.colliders, world.groundHeightAt);
      assert.equal(check.valid, true, `Level ${lvl.level} spawn invalid: ${check.reason}`);
      const zone = world.getZoneAt(lvl.spawn.x, lvl.spawn.y, lvl.spawn.z);
      assert.notEqual(zone.name, 'Abandoned Wing', `Level ${lvl.level} spawn fell outside named zones`);
    }

    // 7. Walk through Level 1 entrance gate -> Main Entrance Door -> Reception -> East Wing corridor
    let pos = { x: 0, y: 0, z: 55 };
    for (let step = 0; step < 38; step++) {
      pos = { ...resolvePlayerMovement(pos, { dx: 0, dz: -0.95 }, 0.36, world.colliders), y: 0 };
    }
    // Should smoothly pass open Entrance Gate at z=50 and stop cleanly just outside closed Main Entrance Door at z=20
    assert.ok(pos.z > 20.3 && pos.z < 21.5, `Expected stop just outside closed Main Door z=20, got z=${pos.z}`);

    // Open Main Entrance Door -> collider deactivates -> player enters Reception Hall
    const doorCol = world.colliders.find((c) => c.id === mainDoor.colliderId)!;
    doorCol.active = false;
    for (let step = 0; step < 8; step++) {
      pos = { ...resolvePlayerMovement(pos, { dx: 0, dz: -0.95 }, 0.36, world.colliders), y: 0 };
    }
    assert.ok(pos.z < 18.0 && pos.z > 12.0, `Expected player inside Reception Hall, got z=${pos.z}`);
    assert.equal(getZoneAt(pos.x, 0, pos.z).name, 'Reception Hall & Main Entrance');
  } finally {
    world.dispose();
  }
});

test('stairwell groundHeightAt supports continuous B1 <-> F1 <-> F2 <-> F3 <-> F4 <-> F5 <-> F6 <-> ROOF traversal without snaps', () => {
  // Walk up each ascending flight F1->F2->F3->F4->F5->F6->ROOF
  const ascending = STAIR_FLIGHTS.filter((f) => f.shaft !== 'basement');
  for (const flight of ascending) {
    let curY = flight.fromY;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const z = flight.startZ + (flight.endZ - flight.startZ) * t;
      const nextY = groundHeightAt(flight.cx, z, curY);
      assert.ok(
        Math.abs(nextY - curY) <= 0.45,
        `Unexpected vertical jump on ${flight.id} at t=${t}: ${curY} -> ${nextY}`
      );
      curY = nextY;
    }
    assert.ok(Math.abs(curY - flight.toY) < 0.05, `${flight.id} ended at ${curY}, expected ${flight.toY}`);

    // Descending back down the same flight
    for (let i = 20; i >= 0; i--) {
      const t = i / 20;
      const z = flight.startZ + (flight.endZ - flight.startZ) * t;
      const nextY = groundHeightAt(flight.cx, z, curY);
      assert.ok(
        Math.abs(nextY - curY) <= 0.45,
        `Unexpected downward vertical jump on ${flight.id} at t=${t}: ${curY} -> ${nextY}`
      );
      curY = nextY;
    }
    assert.ok(Math.abs(curY - flight.fromY) < 0.05, `${flight.id} descent ended at ${curY}, expected ${flight.fromY}`);
  }

  // Basement descent F1 (0) -> B1 (-4) and return
  const bFlight = STAIR_FLIGHTS.find((f) => f.shaft === 'basement')!;
  let curBY = 0;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const z = bFlight.startZ + (bFlight.endZ - bFlight.startZ) * t;
    const nextY = groundHeightAt(bFlight.cx, z, curBY);
    assert.ok(Math.abs(nextY - curBY) <= 0.45);
    curBY = nextY;
  }
  assert.ok(Math.abs(curBY - -4) < 0.05);

  // Exterior positions never float at upper floors
  assert.equal(groundHeightAt(0, 35, 12), 0);
  assert.equal(groundHeightAt(-30, 0, 20), 0);

  // Rooftop Shaft A closed slab keeps y=24 solid instead of snapping into F6 shaft
  assert.equal(groundHeightAt(4.0, -9, 24), 24);
});

test('blueprint floor plans cover B1..F6..ROOF completely and fallback/multiplayer spawns never collide', () => {
  assert.equal(SCHOOL_FLOOR_PLANS.length, 8);
  assert.deepEqual(
    SCHOOL_FLOOR_PLANS.map((f) => f.elevationY),
    [...FLOOR_ELEVATIONS]
  );

  // Security & Storage on F1 and Secret Corridor on F5 exist in map blueprint
  const f1Rooms = SCHOOL_FLOOR_PLANS.find((f) => f.floorId === 1)!.rooms;
  assert.ok(f1Rooms.some((r) => r.labelEn === 'Security Room'));
  assert.ok(f1Rooms.some((r) => r.labelEn === '1F West Storage'));
  assert.ok(f1Rooms.some((r) => r.labelEn === '1F Supply Storage'));
  assert.ok(f1Rooms.some((r) => r.labelEn === '1F Archive Storage'));

  const f5Rooms = SCHOOL_FLOOR_PLANS.find((f) => f.floorId === 5)!.rooms;
  assert.ok(f5Rooms.some((r) => r.labelEn === 'Secret Corridor'));
  assert.ok(f5Rooms.some((r) => r.labelEn === 'Hidden Room 598'));

  // All 12+ rooms on F2..F6 exist cleanly in SCHOOL_FLOOR_PLANS with finite non-zero dimensions
  for (const floorId of [2, 3, 4, 5, 6]) {
    const plan = SCHOOL_FLOOR_PLANS.find((f) => f.floorId === floorId)!;
    assert.ok(plan.rooms.length >= 19, `Floor ${floorId} expected >=19 rooms, got ${plan.rooms.length}`);
    for (const r of plan.rooms) {
      assert.ok(r.w > 0 && r.d > 0, `Invalid dimensions for ${r.id}`);
    }
  }

  // Fallback resolves smoothly when an intended spawn is inside an obstacle collider
  const scene = new THREE.Scene();
  const world = buildSchoolWorld(scene, createHeadlessMaterialLibrary(), true);
  try {
    const blocked = findSafeSpawnFallback({ x: -3.8, y: 0, z: 11.5 }, world.colliders, world.groundHeightAt);
    assert.equal(blocked.fallbackUsed, true);
    assert.equal(validateSpawnPoint(blocked.pos, world.colliders, world.groundHeightAt).valid, true);

    // 5-player staggered spawns are all unique, >= 0.9m apart, and unobstructed on Levels 1, 5, and 10
    for (const lvl of [1, 5, 10]) {
      const spawns = computeMultiplayerSpawnPositions(LEVEL_SPAWNS[lvl], 5);
      assert.equal(spawns.length, 5);
      for (let i = 0; i < spawns.length; i++) {
        assert.equal(
          validateSpawnPoint(spawns[i], world.colliders, world.groundHeightAt).valid,
          true,
          `MP slot ${i} on level ${lvl} collides or ungrounded`
        );
        for (let j = i + 1; j < spawns.length; j++) {
          const dist = Math.hypot(spawns[i].x - spawns[j].x, spawns[i].z - spawns[j].z);
          assert.ok(dist >= 0.9, `MP players ${i} & ${j} overlapped on level ${lvl} (dist=${dist})`);
        }
      }
    }
  } finally {
    world.dispose();
  }

  assert.ok(ZONE_DEFINITIONS.length >= 30);
});

import { PUZZLE_DEFINITIONS } from './campaignData';
import { localizeItem, localizeLevel, localizeNote, localizePuzzle } from './i18n';

test('all 10 campaign exits, keys, switches, puzzles, notes, and items align with 3D world and Vietnamese localization', () => {
  const scene = new THREE.Scene();
  const world = buildSchoolWorld(scene, createHeadlessMaterialLibrary(), true);

  try {
    const interactableIds = new Set(world.interactables.map((i) => i.id));
    const itemIds = new Set(world.interactables.map((i) => i.item?.id).filter(Boolean) as string[]);

    for (const lvl of CAMPAIGN_LEVELS) {
      assert.ok(interactableIds.has(lvl.exitId), `Missing exitId "${lvl.exitId}" for Level ${lvl.level}`);
      if (lvl.requiredKeyId) {
        assert.ok(itemIds.has(lvl.requiredKeyId), `Missing key "${lvl.requiredKeyId}" for Level ${lvl.level}`);
      }
      if (lvl.requiredSwitchId) {
        assert.ok(
          interactableIds.has(lvl.requiredSwitchId),
          `Missing switch "${lvl.requiredSwitchId}" for Level ${lvl.level}`
        );
      }
      assert.ok(lvl.requiredPuzzleId, `Missing requiredPuzzleId for Level ${lvl.level}`);
      const puzzleId = lvl.requiredPuzzleId;
      assert.ok(PUZZLE_DEFINITIONS[puzzleId], `Missing puzzle "${puzzleId}"`);

      const lvlVi = localizeLevel(lvl, 'vi');
      assert.notEqual(lvlVi.name, lvl.name);
      assert.notEqual(lvlVi.objectiveDescription, lvl.objectiveDescription);

      const puzzleEn = PUZZLE_DEFINITIONS[puzzleId];
      const puzzleVi = localizePuzzle(puzzleEn, 'vi');
      assert.notEqual(puzzleVi.title, puzzleEn.title);
      if (puzzleEn.inputMode === 'sequence_order') {
        assert.ok(puzzleVi.optionLabels, `Missing Vietnamese optionLabels on ${puzzleEn.id}`);
        for (const opt of puzzleEn.options ?? []) {
          assert.ok(puzzleVi.optionLabels?.[opt], `Missing optionLabel for "${opt}" on ${puzzleEn.id}`);
        }
      }
    }

    for (const inter of world.interactables) {
      if (inter.note) {
        const viNote = localizeNote(inter.note, 'vi');
        assert.notEqual(viNote.title, inter.note.title, `Note "${inter.note.id}" missing Vietnamese title`);
        assert.notEqual(viNote.body, inter.note.body, `Note "${inter.note.id}" missing Vietnamese body`);
      }
      if (inter.item) {
        const viItem = localizeItem(inter.item, 'vi');
        assert.notEqual(viItem.name, inter.item.name, `Item "${inter.item.id}" missing Vietnamese name`);
      }
    }
  } finally {
    world.dispose();
  }
});

