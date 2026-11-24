import * as THREE from 'three';
import type { ColliderBox } from './rules';
import type {
  InteractableType,
  InventoryItem,
  NoteDocument,
  NpcDialogueSession,
} from '../types/game';
import { createWitchModel } from './monsters';
import {
  FLOOR_ELEVATIONS,
  SCHOOL_FLOOR_PLANS,
  STAIR_FLIGHTS,
  ZONE_DEFINITIONS,
  getZoneAt,
  groundHeightAt,
  type BlueprintRoom,
  type FloorBlueprint,
  type ZoneBounds,
} from './schoolBlueprint';
import {
  createBicycleRackAssembly,
  createBookshelfAssembly,
  createCafeteriaTable,
  createComputerStation,
  createDeadTree,
  createDoorAssembly,
  createEntranceGateAssembly,
  createFilingCabinet,
  createHospitalBed,
  createLabBenchAssembly,
  createLockerAssembly,
  createParkedVehicleMesh,
  createPickupMesh,
  createPlaygroundSwing,
  createSchoolDeskAssembly,
  createStorageRackAssembly,
  type ProceduralMaterialLibrary,
} from './proceduralAssets';

export { SCHOOL_FLOOR_PLANS, type BlueprintRoom, type FloorBlueprint, type ZoneBounds };

export interface InteractableObject {
  id: string;
  type: InteractableType;
  label: string;
  sublabel?: string;
  mesh: THREE.Object3D;
  hitTarget: THREE.Object3D;
  worldPos: THREE.Vector3;
  isOpen?: boolean;
  targetAngle?: number;
  currentAngle?: number;
  hingePivot?: THREE.Group;
  colliderId?: string;
  lockedByKeyId?: string;
  lockedBySwitchId?: string;
  consumed?: boolean;
  item?: InventoryItem;
  note?: NoteDocument;
  npcDialogue?: NpcDialogueSession;
  puzzleId?: string;
  candleLight?: THREE.PointLight;
  candleFlame?: THREE.Mesh;
  hideCameraPos?: THREE.Vector3;
  hideLookYaw?: number;
  exitLevelId?: string;
  secretWallColliderId?: string;
  secretWallGroup?: THREE.Object3D;
  secretWallClosedX?: number;
  secretWallOpenX?: number;
  flickerGroup?: THREE.PointLight;
}

export interface FlickerLight {
  light: THREE.PointLight;
  tubeMesh: THREE.Mesh;
  baseIntensity: number;
  seed: number;
  malfunctioning: boolean;
  floorY: number;
}

export interface SwayingCurtain {
  mesh: THREE.Mesh;
  baseRotZ: number;
  seed: number;
}

export interface CullablePropGroup {
  group: THREE.Object3D;
  center: THREE.Vector3;
  radius: number;
}

export interface SchoolWorld {
  worldGroup: THREE.Group;
  floorGroups: Map<number, THREE.Group>;
  colliders: ColliderBox[];
  interactables: InteractableObject[];
  hitTargets: THREE.Object3D[];
  flickerLights: FlickerLight[];
  curtains: SwayingCurtain[];
  cullGroups: CullablePropGroup[];
  scareApparition: THREE.Group;
  anomalyProp: THREE.Group;
  zones: ZoneBounds[];
  dustPoints: THREE.Points;
  groundHeightAt: (x: number, z: number, currentY: number) => number;
  getZoneAt: (x: number, y: number, z: number) => { name: string; isOutdoor: boolean };
  relocateWitch: (level: number, visible: boolean) => void;
  setNpcDisappeared: (npcId: string, disappeared: boolean) => void;
  dispose: () => void;
}

const NOTES: Record<string, NoteDocument> = {
  note_reception: {
    id: 'note_reception',
    title: 'Caretaker Log — October 14',
    author: 'Arthur Vance, Night Caretaker',
    body: 'The fluorescent ballasts in the East Corridor failed again at 02:15. Nobody has been enrolled here since 1998, yet the classroom bells still ring faintly behind locked doors. I left the Courtyard Key inside the Teacher Offices before locking up.',
    analyticalHint: 'Code Pattern: Timestamp 02:15 aligns with the 1st door north off the East Corridor.',
    quickClue: 'Quick Clue: Follow the Central Corridor straight ahead, turn right into the East Wing, and enter the first left door.',
  },
  note_security: {
    id: 'note_security',
    title: 'Security Gate & CCTV Watch Log',
    author: 'Night Guard Desk #1',
    body: 'Front entrance doors unbolted for inspection, but upper floors F2 through F6 remain dark. Motion sensors tripped near the Grand Central Stairwell Shaft A on Floor 2 and Floor 5 Secret Corridor.',
    analyticalHint: 'Access Layout: Grand Central Stairwell connects F1 -> F2 -> F3 -> F4 -> F5 -> F6 -> Rooftop via alternating North and South landings.',
    quickClue: 'Quick Clue: Enter Central Hall and take the East stairwell arch up through all 6 floors.',
  },
  note_classroom: {
    id: 'note_classroom',
    title: 'Torn Detention Slip',
    author: 'Room 102',
    body: 'We heard footsteps pacing above the ceiling tiles during third period. The Principal confiscated the master keys and locked himself in his office across the West Corridor. If the lights flicker rapidly, hide inside a metal locker until it passes.',
    analyticalHint: 'Pattern: Flicker intervals accelerate before electrical surges.',
    quickClue: 'Quick Clue: A metal hiding locker sits against the south wall of Classroom 102.',
  },
  note_principal: {
    id: 'note_principal',
    title: 'Sealed Notice — Board of Education',
    author: 'Principal H. Mercer',
    body: 'Effective immediately, the School Library stacks are restricted. A structural void was discovered behind the far western shelves. Missing Student Dossier: Linh Tran — Class 1998 vanished near the Library stacks during the October blackout. Only the tilted crimson ledger releases the counterweighted passage.',
    analyticalHint: 'Mechanism Logic: Western shelf counterweight triggers from the front-row ledger. Archive password ties to TRAN + 1998.',
    quickClue: 'Quick Clue: Look along the first bookshelf row inside the Library for the protruding switch.',
  },
  note_library: {
    id: 'note_library',
    title: 'Archivist Margin Note',
    author: 'Unknown',
    body: 'The basement tunnels run beneath the library to the sub-level boiler room. Whoever cut the emergency power pulled the Main Breaker down there. Keep spare batteries—your flashlight beam fades fastest at High brightness.',
    analyticalHint: 'Power Route: Main Breaker connects the sub-level boiler hall to the Courtyard Hatch.',
    quickClue: 'Quick Clue: Use the Basement Stairwell off the Central Corridor to descend.',
  },
  note_lab: {
    id: 'note_lab',
    title: 'Chemistry Incident Report',
    author: 'Dr. S. Kael',
    body: 'Cold draft coming from the ventilation shaft above the Chemistry fume hood. The Infirmary Key was dropped near the back bench when the power went out. Do not linger in the dark hallways.',
    analyticalHint: 'Lab Log: Key dropped beside the rear glassware bench.',
    quickClue: 'Quick Clue: Check the northernmost bench inside the Chemistry Laboratory.',
  },
  note_basement: {
    id: 'note_basement',
    title: 'Maintenance Warning',
    author: 'Sub-Level Crew',
    body: 'The steam pipes knock on their own every few minutes. When the Main Breaker is restored, the Courtyard Gate and upper stairwell ascent to the Rooftop can finally be reached.',
    analyticalHint: 'Circuit Note: Restoring the Breaker unlocks the East Sub-Level Hatch.',
    quickClue: 'Quick Clue: Follow the narrow concrete loop east after flipping the Main Breaker.',
  },
  note_f6_archive: {
    id: 'note_f6_archive',
    title: 'Hidden Floor 6 Inspection Dossier',
    author: 'District Inspector',
    body: 'Floor 6 was sealed shortly after the 1998 evacuation. The Mystery Room and Forgotten Hallways retain chalk equations matching Classroom 102 and the Final Rooftop Override Hatch.',
    analyticalHint: 'Final Cipher Link: Pair Classroom 102 sequence (30) with evacuation year (1998).',
    quickClue: 'Quick Clue: Climb Shaft B from Floor 6 North Landing to reach the Rooftop Deck.',
  },
};

export function buildSchoolWorld(
  scene: THREE.Scene,
  mats: ProceduralMaterialLibrary,
  isSoftwareGl: boolean
): SchoolWorld {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const floorGroups = new Map<number, THREE.Group>();
  const getFloorGroup = (floorElevationY: number): THREE.Group => {
    let g = floorGroups.get(floorElevationY);
    if (!g) {
      g = new THREE.Group();
      worldGroup.add(g);
      floorGroups.set(floorElevationY, g);
    }
    return g;
  };
  FLOOR_ELEVATIONS.forEach((y) => getFloorGroup(y));

  const colliders: ColliderBox[] = [];
  const interactables: InteractableObject[] = [];
  const hitTargets: THREE.Object3D[] = [];
  const flickerLights: FlickerLight[] = [];
  const curtains: SwayingCurtain[] = [];
  const cullGroups: CullablePropGroup[] = [];
  const zones: ZoneBounds[] = [...ZONE_DEFINITIONS];
  const geometries: THREE.BufferGeometry[] = [];
  const boxGeoCache = new Map<string, THREE.BoxGeometry>();

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const getBoxGeo = (w: number, h: number, d: number): THREE.BoxGeometry => {
    const k = `${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`;
    let g = boxGeoCache.get(k);
    if (!g) {
      g = trackGeo(new THREE.BoxGeometry(w, h, d));
      boxGeoCache.set(k, g);
    }
    return g;
  };

  const addBoxMesh = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    colliderId?: string,
    castShadow = false,
    receiveShadow = true,
    targetGroup: THREE.Object3D = worldGroup
  ): THREE.Mesh => {
    const geo = getBoxGeo(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    targetGroup.add(mesh);

    if (colliderId) {
      colliders.push({
        id: colliderId,
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        active: true,
      });
    }
    return mesh;
  };

  const addWall = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    baseY: number,
    height: number,
    thickness: number,
    doorCenterT?: number,
    doorWidth = 1.48,
    doorHeight = 2.55,
    idPrefix = 'wall',
    targetGroup?: THREE.Object3D
  ) => {
    const grp = targetGroup ?? getFloorGroup(Math.round(baseY / 4) * 4);
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const horizontal = Math.abs(dx) >= Math.abs(dz);
    const wallCastShadow = !isSoftwareGl;

    if (doorCenterT === undefined) {
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      addBoxMesh(
        cx,
        baseY + height / 2,
        cz,
        horizontal ? len : thickness,
        height,
        horizontal ? thickness : len,
        mats.plasterWall,
        `${idPrefix}_${colliders.length}`,
        wallCastShadow,
        true,
        grp
      );
      return;
    }

    const doorCenterDist = doorCenterT * len;
    const seg1Len = Math.max(0.2, doorCenterDist - doorWidth / 2);
    const seg2Len = Math.max(0.2, len - (doorCenterDist + doorWidth / 2));

    if (horizontal) {
      const dir = Math.sign(dx) || 1;
      const z = (z1 + z2) / 2;
      if (seg1Len > 0.25) {
        addBoxMesh(
          x1 + dir * (seg1Len / 2),
          baseY + height / 2,
          z,
          seg1Len,
          height,
          thickness,
          mats.plasterWall,
          `${idPrefix}_a_${colliders.length}`,
          wallCastShadow,
          true,
          grp
        );
      }
      if (seg2Len > 0.25) {
        addBoxMesh(
          x2 - dir * (seg2Len / 2),
          baseY + height / 2,
          z,
          seg2Len,
          height,
          thickness,
          mats.plasterWall,
          `${idPrefix}_b_${colliders.length}`,
          wallCastShadow,
          true,
          grp
        );
      }
      const doorX = x1 + dir * doorCenterDist;
      const headerH = height - doorHeight;
      if (headerH > 0.1) {
        addBoxMesh(
          doorX,
          baseY + doorHeight + headerH / 2,
          z,
          doorWidth,
          headerH,
          thickness,
          mats.plasterWall,
          `${idPrefix}_hdr_${colliders.length}`,
          wallCastShadow,
          true,
          grp
        );
      }
    } else {
      const dir = Math.sign(dz) || 1;
      const x = (x1 + x2) / 2;
      if (seg1Len > 0.25) {
        addBoxMesh(
          x,
          baseY + height / 2,
          z1 + dir * (seg1Len / 2),
          thickness,
          height,
          seg1Len,
          mats.plasterWall,
          `${idPrefix}_a_${colliders.length}`,
          wallCastShadow,
          true,
          grp
        );
      }
      if (seg2Len > 0.25) {
        addBoxMesh(
          x,
          baseY + height / 2,
          z2 - dir * (seg2Len / 2),
          thickness,
          height,
          seg2Len,
          mats.plasterWall,
          `${idPrefix}_b_${colliders.length}`,
          wallCastShadow,
          true,
          grp
        );
      }
      const doorZ = z1 + dir * doorCenterDist;
      const headerH = height - doorHeight;
      if (headerH > 0.1) {
        addBoxMesh(
          x,
          baseY + doorHeight + headerH / 2,
          doorZ,
          thickness,
          headerH,
          doorWidth,
          mats.plasterWall,
          `${idPrefix}_hdr_${colliders.length}`,
          wallCastShadow,
          true,
          grp
        );
      }
    }
  };

  const registerInteractable = (item: InteractableObject) => {
    item.hitTarget.userData.interactable = item;
    interactables.push(item);
    hitTargets.push(item.hitTarget);
  };

  const addDoor = (
    id: string,
    label: string,
    x: number,
    y: number,
    z: number,
    rotY: number,
    isMetal = false,
    isExit = false,
    lockedByKeyId?: string,
    lockedBySwitchId?: string,
    exitLevelId?: string,
    targetGroup?: THREE.Object3D
  ) => {
    const grp = targetGroup ?? getFloorGroup(Math.round(y / 4) * 4);
    const { group, hingePivot, hitMesh } = createDoorAssembly(mats, isMetal, isExit);
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    grp.add(group);

    const colliderId = `door_col_${id}`;
    const rotated = Math.abs(Math.sin(rotY)) > 0.5;
    colliders.push({
      id: colliderId,
      minX: x - (rotated ? 0.12 : 0.65),
      maxX: x + (rotated ? 0.12 : 0.65),
      minY: y,
      maxY: y + 2.5,
      minZ: z - (rotated ? 0.65 : 0.12),
      maxZ: z + (rotated ? 0.65 : 0.12),
      active: true,
    });

    registerInteractable({
      id,
      type: isExit ? 'exit' : 'door',
      label,
      sublabel: lockedByKeyId
        ? 'Locked — Requires Key'
        : lockedBySwitchId
          ? 'Power Offline — Requires Switch'
          : isExit
            ? 'Emergency Exit'
            : 'Open / Close',
      mesh: group,
      hitTarget: hitMesh,
      worldPos: new THREE.Vector3(x, y + 1.2, z),
      isOpen: false,
      targetAngle: 0,
      currentAngle: 0,
      hingePivot,
      colliderId,
      lockedByKeyId,
      lockedBySwitchId,
      exitLevelId,
    });
  };

  const addFlickerLight = (
    x: number,
    y: number,
    z: number,
    colorHex = 0xc5dce6,
    intensity = 2.6,
    distance = 13,
    malfunctioning = false,
    createPointLight = true,
    floorY = 0
  ) => {
    const grp = getFloorGroup(floorY);
    const fixture = new THREE.Mesh(getBoxGeo(1.3, 0.08, 0.24), mats.rustedMetal);
    fixture.position.set(x, y, z);
    const tube = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 1.15, 8)),
      mats.emissiveTubeOn.clone()
    );
    tube.rotation.z = Math.PI / 2;
    tube.position.set(x, y - 0.05, z);
    grp.add(fixture, tube);

    if (createPointLight) {
      const light = new THREE.PointLight(colorHex, intensity, distance, 1.7);
      light.position.set(x, y - 0.25, z);
      grp.add(light);
      flickerLights.push({
        light,
        tubeMesh: tube,
        baseIntensity: intensity,
        seed: x * 3.1 + z * 1.7 + floorY,
        malfunctioning,
        floorY,
      });
    }
  };

  const addPickup = (
    id: string,
    type: 'key' | 'battery' | 'note' | 'hidden_object' | 'secret_switch' | 'healing',
    label: string,
    x: number,
    y: number,
    z: number,
    opts?: {
      item?: InventoryItem;
      note?: NoteDocument;
      secretWallColliderId?: string;
      secretWallGroup?: THREE.Object3D;
      secretWallClosedX?: number;
      secretWallOpenX?: number;
      floorGroup?: THREE.Object3D;
    }
  ) => {
    const grp =
      opts?.floorGroup ??
      getFloorGroup(Math.max(-4, Math.min(24, Math.floor((y + 0.5) / 4) * 4)));
    const meshKind =
      type === 'key'
        ? 'key'
        : type === 'battery'
          ? 'battery'
          : type === 'healing'
            ? 'healing'
            : type === 'note'
              ? 'note'
              : type === 'secret_switch'
                ? 'switch'
                : 'relic';
    const prop = createPickupMesh(meshKind, mats);
    prop.position.set(x, y, z);
    grp.add(prop);

    const hitProxy = new THREE.Mesh(
      getBoxGeo(0.58, 0.48, 0.58),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitProxy.position.set(x, y + 0.15, z);
    grp.add(hitProxy);

    registerInteractable({
      id,
      type,
      label,
      sublabel:
        type === 'healing' && opts?.item?.healAmount
          ? `+${opts.item.healAmount} HP`
          : undefined,
      mesh: prop,
      hitTarget: hitProxy,
      worldPos: new THREE.Vector3(x, y + 0.15, z),
      consumed: false,
      item: opts?.item,
      note: opts?.note,
      secretWallColliderId: opts?.secretWallColliderId,
      secretWallGroup: opts?.secretWallGroup,
      secretWallClosedX: opts?.secretWallClosedX,
      secretWallOpenX: opts?.secretWallOpenX,
    });
  };

  const addHidingLocker = (
    id: string,
    x: number,
    y: number,
    z: number,
    rotY: number,
    targetGroup?: THREE.Object3D
  ) => {
    const grp = targetGroup ?? getFloorGroup(Math.round(y / 4) * 4);
    const { group, doorPivot, hitMesh } = createLockerAssembly(mats);
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    grp.add(group);

    colliders.push({
      id: `col_locker_${id}`,
      minX: x - 0.45,
      maxX: x + 0.45,
      minY: y,
      maxY: y + 2.15,
      minZ: z - 0.42,
      maxZ: z + 0.42,
      active: true,
    });

    registerInteractable({
      id,
      type: 'hiding_spot',
      label: 'Metal Locker',
      sublabel: 'Hide inside',
      mesh: group,
      hitTarget: hitMesh,
      hingePivot: doorPivot,
      worldPos: new THREE.Vector3(x, y + 1.1, z),
      hideCameraPos: new THREE.Vector3(x, y + 1.48, z),
      hideLookYaw: rotY,
      isOpen: false,
      currentAngle: 0,
      targetAngle: 0,
    });
  };

  // =========================================================================
  // 1. OUTDOOR TERRAIN, GROUND FLOOR SLAB (F1) & UPPER SLABS (F2..F6 + ROOF)
  // =========================================================================
  const f1Group = getFloorGroup(0);

  const terrain = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(190, 190)), mats.asphalt);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(0, -0.04, 10);
  terrain.receiveShadow = true;
  worldGroup.add(terrain);

  // Ground Floor Slab (F1, x: -26..24, z: -34..20, split cleanly around Basement Stairwell)
  addBoxMesh(-15.9, -0.06, -7, 20.2, 0.12, 54, mats.corridorTile, undefined, false, true, f1Group);
  addBoxMesh(10.8, -0.06, -7, 26.4, 0.12, 54, mats.corridorTile, undefined, false, true, f1Group);
  addBoxMesh(-4.1, -0.06, 8, 3.4, 0.12, 24, mats.corridorTile, undefined, false, true, f1Group);
  addBoxMesh(-4.1, -0.06, -24, 3.4, 0.12, 20, mats.corridorTile, undefined, false, true, f1Group);

  const addFloorInlay = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    mat: THREE.Material,
    grp: THREE.Object3D = worldGroup
  ) => {
    const m = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(w, d)), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y + 0.025, z);
    m.receiveShadow = true;
    grp.add(m);
  };
  addFloorInlay(8, 0, 9, 7.6, 7.6, mats.woodFloor, f1Group);
  addFloorInlay(17, 0, 9, 9.6, 7.6, mats.woodFloor, f1Group);
  addFloorInlay(-11, 0, 9, 9.6, 7.6, mats.woodFloor, f1Group);
  addFloorInlay(-14, 0, -7, 15.6, 15.6, mats.woodFloor, f1Group);

  // Structural Floor/Ceiling Slabs (F2..F6 + ROOF)
  // Leaves opening for Grand Central Stairwell (x: 2.4..9.0, z: -14..-4) on F2..F6,
  // and covers Shaft A (2.4..5.7) cleanly on ROOF (y=24) so players cannot fall off roof into F6!
  const addSchoolFloorSlab = (slabY: number, grp: THREE.Object3D) => {
    addBoxMesh(-11.8, slabY - 0.12, -7, 28.4, 0.24, 54, mats.basementConcrete, `slab_w_${slabY}`, false, true, grp);
    addBoxMesh(16.5, slabY - 0.12, -7, 15.0, 0.24, 54, mats.basementConcrete, `slab_e_${slabY}`, false, true, grp);
    addBoxMesh(5.7, slabY - 0.12, 8, 6.6, 0.24, 24, mats.basementConcrete, `slab_ms_${slabY}`, false, true, grp);
    addBoxMesh(5.7, slabY - 0.12, -24, 6.6, 0.24, 20, mats.basementConcrete, `slab_mn_${slabY}`, false, true, grp);
    if (slabY === 24) {
      // Close unused Shaft A half at rooftop level (only Shaft B exits onto ROOF)
      addBoxMesh(4.05, slabY - 0.12, -9, 3.3, 0.24, 10.0, mats.basementConcrete, `slab_roof_shaftA`, false, true, grp);
    }
  };
  [4, 8, 12, 16, 20, 24].forEach((elev) => {
    addSchoolFloorSlab(elev, getFloorGroup(elev));
  });

  // =========================================================================
  // 1B. SIX-STORY EXTERIOR ARCHITECTURAL FACADE (Visible from Courtyard at all times)
  // =========================================================================
  // Corner & bay structural concrete pilasters across y = 0..24.2
  const columnCoords: Array<[number, number]> = [
    [-22.1, 20.1], [-12.0, 20.1], [-7.0, 20.1], [7.0, 20.1], [12.0, 20.1], [22.1, 20.1],
    [-22.1, -32.1], [24.1, -32.1], [-22.1, 0], [22.1, 0], [-22.1, -16], [24.1, -16],
  ];
  columnCoords.forEach(([cx, cz], idx) => {
    addBoxMesh(cx, 12.1, cz, 0.55, 24.4, 0.55, mats.basementConcrete, `ext_col_${idx}`, false, true, worldGroup);
  });

  // Exterior South Courtyard Facade Window Bays & Floor Cornice Trim (F1..F6)
  const windowXPositions = [-19, -14.5, -9.5, 9.5, 14.5, 19];
  for (let floor = 0; floor < 6; floor++) {
    const fy = floor * 4;
    // Horizontal concrete belt course across south facade
    addBoxMesh(0, fy + 3.92, 20.16, 44.6, 0.22, 0.18, mats.basementConcrete, undefined, false, false, worldGroup);
    // Exterior facade spandrel panels & dark glass windows for F2..F6 so silhouette reads cleanly from yard
    if (floor >= 1) {
      addBoxMesh(0, fy + 1.9, 20.1, 44.2, 3.76, 0.16, mats.plasterWall, undefined, false, false, worldGroup);
    }
    windowXPositions.forEach((wx) => {
      addBoxMesh(wx, fy + 2.0, 20.2, 2.2, 1.55, 0.08, mats.glassPane, undefined, false, false, worldGroup);
      addBoxMesh(wx, fy + 1.18, 20.24, 2.36, 0.1, 0.14, mats.wornWood, undefined, false, false, worldGroup);
    });
  }
  // Rooftop perimeter cornice visible from ground
  addBoxMesh(0, 24.55, 20.12, 44.8, 0.9, 0.3, mats.basementConcrete, undefined, false, false, worldGroup);
  addBoxMesh(-22.12, 24.55, -6, 0.3, 0.9, 52.4, mats.basementConcrete, undefined, false, false, worldGroup);
  addBoxMesh(22.12, 24.55, -6, 0.3, 0.9, 52.4, mats.basementConcrete, undefined, false, false, worldGroup);

  // Main School Building Entrance Portico & Front Steps (z = 20..22.6)
  addBoxMesh(0, 0.04, 21.3, 4.6, 0.1, 2.4, mats.basementConcrete, undefined, false, true, worldGroup);
  addBoxMesh(0, 3.55, 21.3, 5.0, 0.24, 2.6, mats.darkWood, undefined, false, true, worldGroup);
  addBoxMesh(0, 3.85, 22.6, 3.6, 0.42, 0.14, mats.paper, undefined, false, false, worldGroup);
  addBoxMesh(-2.2, 1.8, 22.3, 0.42, 3.6, 0.42, mats.basementConcrete, 'portico_col_w', false, true, worldGroup);
  addBoxMesh(2.2, 1.8, 22.3, 0.42, 3.6, 0.42, mats.basementConcrete, 'portico_col_e', false, true, worldGroup);

  // =========================================================================
  // 2. MAIN ENTRANCE, RECEPTION HALL, SECURITY ROOM, STORAGE & CENTRAL CORRIDOR (F1)
  // =========================================================================
  addWall(-7, 20, -0.74, 20, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'rec_s_w', f1Group);
  addWall(0.74, 20, 7, 20, 0, 3.8, 0.25, 0.71, 1.48, 2.55, 'reception_south', f1Group);
  addBoxMesh(0, 3.175, 20, 1.48, 1.25, 0.25, mats.plasterWall, 'rec_s_hdr', false, true, f1Group);
  addDoor('door_main_entrance', 'Main School Entrance Door', 0, 0, 20, 0, false, false, undefined, undefined, undefined, f1Group);
  addDoor('exit_south_reception', 'South Emergency Exit', 5.2, 0, 20, 0, true, true, 'key_courtyard', undefined, undefined, f1Group);

  // South Wing Side Rooms (Security Room + West Storage + East Storage A/B)
  addWall(-22, 20, -7, 20, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'f1_ext_sw', f1Group);
  addWall(-22, 13, -22, 20, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'f1_ext_w_sw', f1Group);
  addWall(-16, 13, -16, 20, 0, 3.8, 0.22, 0.5, 1.48, 2.55, 'f1_sec_div', f1Group);
  addDoor('door_f1_storage_w', '1F West Storage Door', -16, 0, 16.5, Math.PI / 2, false, false, undefined, undefined, undefined, f1Group);

  addWall(7, 20, 22, 20, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'f1_ext_se', f1Group);
  addWall(22, 13, 22, 20, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'f1_ext_e_se', f1Group);
  addWall(14.5, 13, 14.5, 20, 0, 3.8, 0.22, 0.5, 1.48, 2.55, 'f1_stor_e_div', f1Group);
  addDoor('door_f1_storage_e2', 'Custodian Storage Door', 14.5, 0, 16.5, Math.PI / 2, false, false, undefined, undefined, undefined, f1Group);

  // Reception West & East Walls (with doors to Security Room and Supply Storage)
  addWall(-7, 6, -7, 20, 0, 3.8, 0.25, 0.75, 1.48, 2.55, 'rec_w', f1Group);
  addWall(7, 6, 7, 20, 0, 3.8, 0.25, 0.75, 1.48, 2.55, 'rec_e', f1Group);
  addDoor('door_security', 'Security Room Door', -7, 0, 16.5, Math.PI / 2, true, false, undefined, undefined, undefined, f1Group);
  addDoor('door_f1_storage_e', '1F Supply Storage Door', 7, 0, 16.5, Math.PI / 2, false, false, undefined, undefined, undefined, f1Group);

  addWall(-7, 6, -2.2, 6, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'rec_nw', f1Group);
  addWall(2.2, 6, 7, 6, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'rec_ne', f1Group);

  // Security Room Props (Monitors, Note, Storage Racks)
  const secMon1 = createComputerStation(mats);
  secMon1.group.position.set(-10.5, 0, 18.2);
  secMon1.group.rotation.y = Math.PI;
  f1Group.add(secMon1.group);
  const secMon2 = createComputerStation(mats);
  secMon2.group.position.set(-12.5, 0, 18.2);
  secMon2.group.rotation.y = Math.PI;
  f1Group.add(secMon2.group);
  addPickup('note_security', 'note', 'Security Watch Log', -10.5, 0.78, 18.0, { note: NOTES.note_security, floorGroup: f1Group });
  const storRackW = createStorageRackAssembly(mats);
  storRackW.position.set(-19.0, 0, 18.6);
  f1Group.add(storRackW);
  const storRackE1 = createStorageRackAssembly(mats);
  storRackE1.position.set(11.0, 0, 18.6);
  f1Group.add(storRackE1);
  const storRackE2 = createStorageRackAssembly(mats);
  storRackE2.position.set(18.5, 0, 18.6);
  f1Group.add(storRackE2);

  // Reception Desk + Side Medical Table
  addBoxMesh(-3.8, 0.52, 11.5, 0.72, 1.04, 3.8, mats.darkWood, 'rec_desk_1', false, true, f1Group);
  addBoxMesh(-3.8, 1.07, 11.5, 0.86, 0.06, 3.92, mats.wornWood, undefined, false, true, f1Group);
  addBoxMesh(-2.5, 0.52, 13.1, 2.4, 1.04, 0.72, mats.darkWood, 'rec_desk_2', false, true, f1Group);
  addBoxMesh(-2.5, 1.07, 13.1, 2.52, 0.06, 0.86, mats.wornWood, undefined, false, true, f1Group);
  addBoxMesh(-1.55, 1.14, 13.0, 0.14, 0.08, 0.14, mats.brass, undefined, false, true, f1Group);
  addPickup('note_reception', 'note', 'Caretaker Log', -2.6, 1.11, 13.0, { note: NOTES.note_reception, floorGroup: f1Group });
  addPickup('bat_reception', 'battery', 'Flashlight Battery', -3.7, 1.11, 10.6, {
    item: { id: 'bat_1', name: 'D-Cell Battery', kind: 'battery', description: 'Restores +60% flashlight charge', droppable: true, consumable: true },
    floorGroup: f1Group,
  });

  addBoxMesh(4.4, 0.38, 12.6, 1.1, 0.76, 0.8, mats.wornWood, 'rec_med_tbl', false, true, f1Group);
  addPickup('heal_f1_bandage', 'healing', 'Bandage Roll', 4.4, 0.78, 12.6, {
    item: {
      id: 'heal_bandage_1',
      name: 'Bandage Roll',
      kind: 'healing',
      description: 'Restores +200 HP',
      droppable: true,
      consumable: true,
      healAmount: 200,
    },
    floorGroup: f1Group,
  });

  // Central Corridor West & East Walls (x = -2.2 and x = 2.2, z: -15..1)
  // Opening at z=-2.2 (t=0.8) leads into Stair Vestibule -> framed Grand Stairwell door at z=-4.1
  addWall(2.2, -15, 2.2, 1, 0, 3.8, 0.25, 0.8, 2.4, 2.8, 'central_east_stair', f1Group);
  addWall(-2.2, -15, -2.2, 1, 0, 3.8, 0.25, 0.8, 2.4, 2.8, 'central_west_stair', f1Group);

  // =========================================================================
  // 3. EAST WING (F1): CLASSROOMS 101 & 102, TEACHER OFFICES, ARCHIVE STORAGE, COMPUTER ROOM
  // =========================================================================
  addWall(2.2, 5, 12, 5, 0, 3.8, 0.25, 0.58, 1.48, 2.55, 'e_corr_s1', f1Group);
  addWall(12, 5, 22, 5, 0, 3.8, 0.25, 0.45, 1.48, 2.55, 'e_corr_s2', f1Group);
  addWall(2.2, 1, 12, 1, 0, 3.8, 0.25, 0.5, 1.48, 2.55, 'e_corr_n1', f1Group);
  addWall(12, 1, 22, 1, 0, 3.8, 0.25, 0.4, 1.48, 2.55, 'e_corr_n2', f1Group);

  addWall(22, -15, 22, 13, 0, 3.8, 0.25, 0.64, 1.48, 2.55, 'east_ext', f1Group);
  addDoor('exit_east_wing', 'East Stairwell Exit', 22, 0, 3, Math.PI / 2, true, true, 'key_principal', undefined, undefined, f1Group);

  addWall(12, 5, 12, 13, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'c101_div', f1Group);
  addWall(4, 5, 4, 13, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'c101_w', f1Group);
  addWall(4, 13, 22, 13, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'c101_s', f1Group);

  addDoor('door_c101', 'Classroom 101 Door', 7.9, 0, 5, 0, false, false, undefined, undefined, undefined, f1Group);
  addDoor('door_c102', 'Classroom 102 Door', 16.5, 0, 5, 0, false, false, undefined, undefined, undefined, f1Group);

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const desk = createSchoolDeskAssembly(mats, r === 1 && c === 1);
      desk.position.set(6.2 + c * 2.6, 0, 7.8 + r * 2.4);
      f1Group.add(desk);
    }
  }
  const board101 = new THREE.Mesh(getBoxGeo(3.4, 1.3, 0.08), mats.chalkboard);
  board101.position.set(8, 1.85, 12.82);
  f1Group.add(board101);

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const desk = createSchoolDeskAssembly(mats, r === 0 && c === 2);
      desk.position.set(14.0 + c * 2.5, 0, 7.8 + r * 2.4);
      f1Group.add(desk);
    }
  }
  const board102 = new THREE.Mesh(getBoxGeo(4.0, 1.35, 0.08), mats.chalkboard);
  board102.position.set(17, 1.85, 12.82);
  f1Group.add(board102);

  addPickup('key_principal', 'key', 'Principal Wing Key', 19.2, 0.78, 10.2, {
    item: { id: 'key_principal', name: 'Principal Wing Key', kind: 'key', description: 'Unlocks the East Stairwell & Principal Archive', droppable: false, sharedQuest: true },
    floorGroup: f1Group,
  });
  addPickup('note_classroom', 'note', 'Detention Slip', 16.5, 0.78, 7.8, { note: NOTES.note_classroom, floorGroup: f1Group });
  addHidingLocker('locker_c102', 13.0, 0, 12.4, Math.PI, f1Group);

  // Teacher Offices & F1 North Archive Storage (behind z=-7)
  addWall(6.0, -15, 6.0, 1, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'teach_w', f1Group);
  addWall(12, -15, 12, 1, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'teach_e', f1Group);
  addWall(6.0, -7, 12, -7, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'teach_n', f1Group);
  addDoor('door_teachers', 'Teacher Offices Door', 7.1, 0, 1, 0, false, false, undefined, undefined, undefined, f1Group);
  addDoor('door_computer', 'Computer Room Door', 16.0, 0, 1, 0, false, false, undefined, undefined, undefined, f1Group);

  // Framed F1 North Storage & Grand Stairwell Enclosure
  addWall(2.2, -4.1, 6.0, -4.1, 0, 3.8, 0.22, 0.474, 1.48, 2.55, 'f1_stair_frame', f1Group);
  addWall(2.2, -15, 6.0, -15, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'f1_stair_n', f1Group);
  addWall(6.0, -15, 12.0, -15, 0, 3.8, 0.22, 0.58, 1.48, 2.55, 'f1_arch_stor_n', f1Group);
  addDoor('door_f1_storage_n', '1F Archive Storage Door', 9.48, 0, -15, 0, false, false, undefined, undefined, undefined, f1Group);
  const f1ArchRack = createStorageRackAssembly(mats);
  f1ArchRack.position.set(9.0, 0, -10.5);
  f1Group.add(f1ArchRack);

  const teacherComp = createComputerStation(mats);
  teacherComp.group.position.set(8.2, 0, -4.5);
  f1Group.add(teacherComp.group);
  registerInteractable({
    id: 'comp_teacher',
    type: 'computer',
    label: 'Faculty Terminal',
    sublabel: 'Check faculty logs',
    mesh: teacherComp.group,
    hitTarget: teacherComp.hitMesh,
    worldPos: new THREE.Vector3(8.2, 1.0, -4.5),
    note: {
      id: 'comp_log_teacher',
      title: 'Faculty Email Terminal',
      author: 'SYSTEM // 1998-10-14',
      body: 'ALERT: South Emergency Exit lock engaged. Courtyard Key logged in Teacher Office cabinet. Night watchman reports unusual electrical interference in Wing B.',
    },
  });

  const teacherCab = createFilingCabinet(mats);
  teacherCab.group.position.set(6.9, 0, -5.8);
  f1Group.add(teacherCab.group);
  registerInteractable({
    id: 'cab_teacher',
    type: 'cabinet',
    label: 'Filing Cabinet',
    sublabel: 'Search drawer',
    mesh: teacherCab.group,
    hitTarget: teacherCab.hitMesh,
    worldPos: new THREE.Vector3(6.9, 1.1, -5.8),
  });

  addPickup('key_courtyard', 'key', 'Courtyard Exit Key', 8.7, 0.78, -4.3, {
    item: { id: 'key_courtyard', name: 'Courtyard Exit Key', kind: 'key', description: 'Unlocks the South Emergency Exit', droppable: false, sharedQuest: true },
    floorGroup: f1Group,
  });

  for (let i = 0; i < 3; i++) {
    const cs = createComputerStation(mats);
    cs.group.position.set(14.5 + i * 2.5, 0, -5.5);
    f1Group.add(cs.group);
    const cs2 = createComputerStation(mats);
    cs2.group.position.set(14.5 + i * 2.5, 0, -10.5);
    cs2.group.rotation.y = Math.PI;
    f1Group.add(cs2.group);
  }
  addPickup('switch_computer_override', 'secret_switch', 'Lab Power Override Switch', 21.6, 1.35, -8.0, { floorGroup: f1Group });
  addPickup('bat_computer', 'battery', 'Flashlight Battery', 17.0, 0.78, -5.4, {
    item: { id: 'bat_2', name: 'D-Cell Battery', kind: 'battery', description: 'Restores +60% flashlight charge', droppable: true, consumable: true },
    floorGroup: f1Group,
  });

  // =========================================================================
  // 4. WEST WING (F1): PRINCIPAL'S OFFICE, RESTROOMS, LIBRARY & SECRET ARCHIVE
  // =========================================================================
  addWall(-22, 5, -6, 5, 0, 3.8, 0.25, 0.65, 1.48, 2.55, 'w_corr_s1', f1Group);
  addWall(-22, 5, -22, 13, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'wc_w', f1Group);
  addWall(-16, 5, -16, 13, 0, 3.8, 0.22, 0.5, 1.48, 2.55, 'toilet_door', f1Group);
  addWall(-22, 13, -6, 13, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'wc_s', f1Group);
  addWall(-6, 5, -6, 13, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'prin_e', f1Group);

  addDoor('door_principal', 'Principal’s Office Door', -11.6, 0, 5, 0, false, false, undefined, undefined, undefined, f1Group);
  addDoor('door_toilets', '1F Restrooms Door', -16, 0, 9, Math.PI / 2, false, false, undefined, undefined, undefined, f1Group);

  addBoxMesh(-19.5, 1.0, 7.2, 2.4, 2.0, 0.1, mats.lockerSteel, 'wc_f1_s1', false, true, f1Group);
  addBoxMesh(-19.5, 1.0, 10.2, 2.4, 2.0, 0.1, mats.lockerSteel, 'wc_f1_s2', false, true, f1Group);

  const prinComp = createComputerStation(mats);
  prinComp.group.position.set(-10.5, 0, 10.2);
  prinComp.group.rotation.y = Math.PI;
  f1Group.add(prinComp.group);
  registerInteractable({
    id: 'comp_principal',
    type: 'computer',
    label: 'Principal’s Terminal',
    sublabel: 'Read sealed archive',
    mesh: prinComp.group,
    hitTarget: prinComp.hitMesh,
    worldPos: new THREE.Vector3(-10.5, 1.0, 10.2),
    note: NOTES.note_principal,
  });
  addPickup('key_library', 'key', 'Library Master Key', -11.1, 0.78, 10.0, {
    item: { id: 'key_library', name: 'Library Master Key', kind: 'key', description: 'Unlocks the North Library Wing Exit', droppable: false, sharedQuest: true },
    floorGroup: f1Group,
  });
  addHidingLocker('locker_toilets', -21.2, 0, 11.8, Math.PI / 2, f1Group);

  addWall(-22, 1, -6, 1, 0, 3.8, 0.25, 0.62, 1.48, 2.55, 'lib_south', f1Group);
  addWall(-6, -15, -6, 1, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'lib_e', f1Group);
  addWall(-22, -15, -6, -15, 0, 3.8, 0.25, 0.85, 1.48, 2.55, 'lib_north', f1Group);
  addDoor('door_library', 'School Library Door', -12.1, 0, 1, 0, false, false, undefined, undefined, undefined, f1Group);
  addDoor('exit_north_library', 'North Library Exit', -8.4, 0, -15, 0, true, true, 'key_library', undefined, undefined, f1Group);

  addWall(-22, -15, -22, 1, 0, 3.8, 0.25, 0.375, 1.6, 2.6, 'lib_west_secret', f1Group);
  const secretBookcase = createBookshelfAssembly(mats);
  secretBookcase.position.set(-22, 0, -9);
  secretBookcase.rotation.y = Math.PI / 2;
  f1Group.add(secretBookcase);
  colliders.push({
    id: 'col_secret_bookshelf',
    minX: -22.3,
    maxX: -21.7,
    minY: 0,
    maxY: 2.5,
    minZ: -9.9,
    maxZ: -8.1,
    active: true,
  });

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bs = createBookshelfAssembly(mats);
      bs.position.set(-18.5 + col * 4.0, 0, -4.0 - row * 5.2);
      f1Group.add(bs);
      colliders.push({
        id: `col_bs_${row}_${col}`,
        minX: -18.5 + col * 4.0 - 0.9,
        maxX: -18.5 + col * 4.0 + 0.9,
        minY: 0,
        maxY: 2.4,
        minZ: -4.0 - row * 5.2 - 0.24,
        maxZ: -4.0 - row * 5.2 + 0.24,
        active: true,
      });
    }
  }

  addPickup('switch_library_book', 'secret_switch', 'Tilted Secret Ledger', -18.5, 1.25, -3.7, {
    secretWallColliderId: 'col_secret_bookshelf',
    secretWallGroup: secretBookcase,
    secretWallClosedX: -22.0,
    secretWallOpenX: -23.65,
    floorGroup: f1Group,
  });
  addPickup('note_library', 'note', 'Archivist Note', -14.5, 0.85, -9.0, { note: NOTES.note_library, floorGroup: f1Group });

  addWall(-26, -15, -26, -5, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'sec_w', f1Group);
  addWall(-26, -5, -22, -5, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'sec_s', f1Group);
  addWall(-26, -15, -22, -15, 0, 3.8, 0.25, 0.5, 1.48, 2.55, 'secret_exit_wall', f1Group);
  addDoor('exit_secret_archive', 'Hidden Passage Exit', -24, 0, -15, 0, true, true, undefined, 'switch_library_book', undefined, f1Group);
  addPickup('relic_secret', 'hidden_object', '1998 School Seal Relic', -24.2, 0.2, -9.0, {
    item: { id: 'relic_seal', name: 'Brass School Seal', kind: 'relic', description: 'An engraved relic hidden behind the library walls', droppable: true },
    floorGroup: f1Group,
  });

  // =========================================================================
  // 5. NORTH WING (F1): SCIENCE LAB, CHEMISTRY LAB, CAFETERIA, KITCHEN, INFIRMARY
  // =========================================================================
  addWall(-6, -15, -2.2, -15, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'nc_w', f1Group);
  addWall(12, -15, 22, -15, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'nc_e', f1Group);
  addWall(-22, -19, -12, -19, 0, 3.8, 0.25, 0.65, 1.48, 2.55, 'infirmary_wall', f1Group);
  addWall(-12, -19, 2, -19, 0, 3.8, 0.25, 0.55, 2.6, 2.8, 'cafeteria_arch', f1Group);
  addWall(2, -19, 13, -19, 0, 3.8, 0.25, 0.55, 1.48, 2.55, 'science_wall', f1Group);
  addWall(13, -19, 24, -19, 0, 3.8, 0.25, 0.5, 1.48, 2.55, 'chem_wall', f1Group);

  addWall(-22, -32, 24, -32, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'n_ext', f1Group);
  addWall(-22, -32, -22, -15, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'nw_ext', f1Group);
  addWall(24, -32, 24, -15, 0, 3.8, 0.25, undefined, 1.48, 2.55, 'ne_ext', f1Group);
  addWall(-12, -32, -12, -19, 0, 3.8, 0.22, 0.45, 2.0, 2.6, 'kitchen_pass', f1Group);
  addWall(-22, -23, -12, -23, 0, 3.8, 0.22, 0.5, 1.48, 2.55, 'inf_div', f1Group);
  addWall(2, -32, 2, -19, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'sci_div', f1Group);
  addWall(13, -32, 13, -19, 0, 3.8, 0.22, undefined, 1.48, 2.55, 'chem_div', f1Group);

  addDoor('door_infirmary', 'Medical Room Door', -15.5, 0, -19, 0, false, false, undefined, undefined, undefined, f1Group);
  addDoor('door_science', 'Science Lab Door', 8.0, 0, -19, 0, false, false, undefined, undefined, undefined, f1Group);
  addDoor('door_chem', 'Chemistry Lab Door', 18.5, 0, -19, 0, false, false, undefined, undefined, undefined, f1Group);

  addDoor('exit_science_hall', 'Science Corridor Exit', 2, 0, -17, Math.PI / 2, true, true, undefined, 'switch_computer_override', undefined, f1Group);
  addDoor('exit_cafeteria_corridor', 'Cafeteria Corridor Exit', -12, 0, -17, Math.PI / 2, true, true, 'key_infirmary', undefined, undefined, f1Group);

  for (let i = 0; i < 2; i++) {
    const lb1 = createLabBenchAssembly(mats);
    lb1.position.set(7.5, 0, -23.5 - i * 4.2);
    f1Group.add(lb1);
    const lb2 = createLabBenchAssembly(mats);
    lb2.position.set(18.5, 0, -23.5 - i * 4.2);
    f1Group.add(lb2);
  }
  addPickup('key_infirmary', 'key', 'Infirmary Key', 19.3, 0.94, -27.7, {
    item: { id: 'key_infirmary', name: 'Infirmary Key', kind: 'key', description: 'Unlocks the Cafeteria & Infirmary Corridor', droppable: false, sharedQuest: true },
    floorGroup: f1Group,
  });
  addPickup('note_lab', 'note', 'Chemistry Incident Report', 17.8, 0.94, -23.5, { note: NOTES.note_lab, floorGroup: f1Group });
  addPickup('bat_chem', 'battery', 'Flashlight Battery', 8.0, 0.94, -27.7, {
    item: { id: 'bat_3', name: 'D-Cell Battery', kind: 'battery', description: 'Restores +60% flashlight charge', droppable: true, consumable: true },
    floorGroup: f1Group,
  });

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const ct = createCafeteriaTable(mats);
      ct.position.set(-8.0 + c * 5.2, 0, -23.5 - r * 4.5);
      f1Group.add(ct);
    }
  }
  addPickup('heal_f1_tonic', 'healing', 'Herbal Tonic', -8.0, 0.79, -23.5, {
    item: {
      id: 'heal_tonic_1',
      name: 'Herbal Tonic',
      kind: 'healing',
      description: 'Restores +300 HP',
      droppable: true,
      consumable: true,
      healAmount: 300,
    },
    floorGroup: f1Group,
  });
  addHidingLocker('locker_kitchen', -20.8, 0, -29.5, Math.PI / 2, f1Group);

  const bed1 = createHospitalBed(mats);
  bed1.position.set(-19.5, 0, -20.8);
  bed1.rotation.y = Math.PI / 2;
  f1Group.add(bed1);
  addPickup('key_basement', 'key', 'Basement Gate Key', -17.5, 0.72, -21.0, {
    item: { id: 'key_basement', name: 'Basement Gate Key', kind: 'key', description: 'Unlocks the Underground Basement Stairwell', droppable: false, sharedQuest: true },
    floorGroup: f1Group,
  });
  addPickup('heal_f1_kit', 'healing', 'First Aid Kit', -15.0, 0.72, -21.2, {
    item: {
      id: 'heal_kit_1',
      name: 'First Aid Kit',
      kind: 'healing',
      description: 'Restores +400 HP',
      droppable: true,
      consumable: true,
      healAmount: 400,
    },
    floorGroup: f1Group,
  });

  // =========================================================================
  // 6. BASEMENT (B1, y=-4), SIX-FLOOR GRAND STAIRWELLS & UPPER FLOORS (F2..F6)
  // =========================================================================
  const b1Group = getFloorGroup(-4);
  for (let s = 0; s < 16; s++) {
    const t = (s + 0.5) / 16;
    const stepZ = -4 - t * 10;
    const stepY = -4.0 * t;
    addBoxMesh(-4.1, stepY - 0.15, stepZ, 3.2, 0.3, 0.68, mats.basementConcrete, undefined, false, true, b1Group);
  }
  addWall(-5.8, -14, -5.8, -4, -4.2, 8.2, 0.25, undefined, 1.48, 2.55, 'bstair_w', b1Group);
  addWall(-2.4, -14, -2.4, -4, -4.2, 8.2, 0.25, undefined, 1.48, 2.55, 'bstair_e', b1Group);
  addDoor('exit_basement_stair', 'Basement Stairwell Gate', -4.1, 0, -4.1, 0, true, true, 'key_basement', undefined, undefined, f1Group);

  const basementFloor = new THREE.Mesh(getBoxGeo(30, 0.2, 32), mats.basementConcrete);
  basementFloor.position.set(-12, -4.1, -10);
  basementFloor.receiveShadow = true;
  b1Group.add(basementFloor);

  addWall(-25, -24, -2, -24, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_n', b1Group);
  addWall(-25, -24, -25, 6, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_w', b1Group);
  addWall(-2, -24, -2, -14, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_e', b1Group);
  addWall(-25, 6, 4, 6, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_s', b1Group);
  addWall(-19, -12, -6, -12, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_in', b1Group);
  addWall(-19, -12, -19, 2, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_iw', b1Group);
  addWall(-19, 2, 4, 2, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_is', b1Group);
  addWall(4, 2, 4, 6, -4.0, 3.7, 0.3, undefined, 1.48, 2.55, 'b1_ie', b1Group);

  addPickup('switch_basement_breaker', 'secret_switch', 'Main Electrical Breaker', -22.5, -2.6, -19.0, { floorGroup: b1Group });
  addPickup('note_basement', 'note', 'Maintenance Warning', -14.0, -3.95, -18.0, { note: NOTES.note_basement, floorGroup: b1Group });
  addDoor('exit_courtyard_gate', 'Sub-Level Courtyard Hatch', 3.8, -4.0, 4.0, Math.PI / 2, true, true, undefined, 'switch_basement_breaker', undefined, b1Group);

  // Connected Six-Floor Grand Central Staircases (F1 -> F2 -> F3 -> F4 -> F5 -> F6 -> ROOF)
  STAIR_FLIGHTS.filter((f) => f.shaft !== 'basement').forEach((fl) => {
    const grp = getFloorGroup(fl.floorGrpY);
    for (let s = 0; s < 16; s++) {
      const t = (s + 0.5) / 16;
      const stepZ = fl.startZ + (fl.endZ - fl.startZ) * t;
      const stepY = fl.fromY + (fl.toY - fl.fromY) * t;
      addBoxMesh(fl.cx, stepY - 0.14, stepZ, 3.0, 0.28, 0.68, mats.basementConcrete, undefined, false, true, grp);
    }
    // Handrail divider between Shaft A and Shaft B (with solid collider)
    addBoxMesh(
      5.7,
      (fl.fromY + fl.toY) / 2 + 0.55,
      -9,
      0.16,
      1.15,
      10.0,
      mats.rustedMetal,
      `col_stair_div_${fl.id}`,
      false,
      true,
      grp
    );
  });

  addDoor('exit_rooftop_stair', 'Grand Stairwell & Rooftop Access', 4.0, 0, -4.1, 0, true, true, 'key_rooftop', undefined, undefined, f1Group);

  // Build Upper Floors F2 (y=4), F3 (y=8), F4 (y=12), F5 (y=16), F6 (y=20)
  // Full partitioned layout matching SCHOOL_FLOOR_PLANS on every floor!
  const upperFloorSpecs: Array<{
    elev: number;
    floorNum: number;
    code: string;
    swRoomTitle: string;
    swFrontWTitle: string;
    swFrontETitle: string;
    seMidWTitle: string;
    seMidETitle: string;
    seFrontWTitle: string;
    seFrontETitle: string;
    westMidTitle: string;
    eastMidTitle: string;
    northWTitle: string;
    northCTitle: string;
    northETitle: string;
    healId: string;
    healName: string;
    healAmount: number;
    healX: number;
    healZ: number;
    theme: 'classrooms' | 'library' | 'science' | 'restricted' | 'abandoned';
  }> = [
    {
      elev: 4,
      floorNum: 2,
      code: 'F2',
      swRoomTitle: 'Teacher Office 2A',
      swFrontWTitle: '2F West Storage',
      swFrontETitle: 'Teacher Office 2B',
      seMidWTitle: 'Classroom 201',
      seMidETitle: 'Classroom 202',
      seFrontWTitle: 'Classroom 203',
      seFrontETitle: '2F East Storage',
      westMidTitle: 'Classroom 204',
      eastMidTitle: '2F Computer Room',
      northWTitle: 'Classroom 205',
      northCTitle: '2F Study Hall',
      northETitle: '2F Faculty Room',
      healId: 'heal_f2_bandage',
      healName: 'Bandage Roll',
      healAmount: 200,
      healX: -18.2,
      healZ: 8.8,
      theme: 'classrooms',
    },
    {
      elev: 8,
      floorNum: 3,
      code: 'F3',
      swRoomTitle: 'Study Room 3A',
      swFrontWTitle: 'Book Storage',
      swFrontETitle: 'Study Room 3B',
      seMidWTitle: 'Classroom 301',
      seMidETitle: 'Reading Room',
      seFrontWTitle: 'Classroom 302',
      seFrontETitle: 'Book Bindery Storage',
      westMidTitle: 'Main Upper Library',
      eastMidTitle: 'Archive Room',
      northWTitle: 'Rare Book Archive',
      northCTitle: 'Quiet Reading Hall',
      northETitle: 'Librarian Workroom',
      healId: 'heal_f3_tonic',
      healName: 'Herbal Tonic',
      healAmount: 300,
      healX: -14.0,
      healZ: -8.0,
      theme: 'library',
    },
    {
      elev: 12,
      floorNum: 4,
      code: 'F4',
      swRoomTitle: 'Prep Room 4A',
      swFrontWTitle: 'Equipment Storage',
      swFrontETitle: 'Physics Lab',
      seMidWTitle: 'Classroom 401',
      seMidETitle: 'Classroom 402',
      seFrontWTitle: 'Prep Room 4B',
      seFrontETitle: 'Glassware Storage',
      westMidTitle: 'Lab Equipment Storage',
      eastMidTitle: '4F Science Lab',
      northWTitle: '4F Chemistry Lab',
      northCTitle: 'Biology Research Lab',
      northETitle: 'Specimen Storage',
      healId: 'heal_f4_kit',
      healName: 'First Aid Kit',
      healAmount: 400,
      healX: 8.0,
      healZ: -23.5,
      theme: 'science',
    },
    {
      elev: 16,
      floorNum: 5,
      code: 'F5',
      swRoomTitle: 'Admin Office 5A',
      swFrontWTitle: 'Sealed Records Room',
      swFrontETitle: 'Executive Office',
      seMidWTitle: 'Restricted Room 501',
      seMidETitle: 'Abandoned Office 502',
      seFrontWTitle: 'Restricted Storage',
      seFrontETitle: 'Director Suite',
      westMidTitle: 'Admin Vault',
      eastMidTitle: 'Quarantine Office',
      northWTitle: 'Hidden Room 598',
      northCTitle: 'Restricted Hall',
      northETitle: 'Abandoned Boardroom',
      healId: 'heal_f5_bandage',
      healName: 'Bandage Roll',
      healAmount: 200,
      healX: 15.0,
      healZ: -5.5,
      theme: 'restricted',
    },
    {
      elev: 20,
      floorNum: 6,
      code: 'F6',
      swRoomTitle: 'Abandoned Class 601',
      swFrontWTitle: 'Old Storage 6A',
      swFrontETitle: 'Forgotten Class 602',
      seMidWTitle: 'Abandoned Class 603',
      seMidETitle: 'Forgotten Room 604',
      seFrontWTitle: 'Old Storage 6B',
      seFrontETitle: 'Dusty Archive',
      westMidTitle: 'Mysterious Archive',
      eastMidTitle: 'Mystery Room 605',
      northWTitle: 'Hidden Documents Vault',
      northCTitle: 'Forgotten Assembly Hall',
      northETitle: 'Rooftop Access Prep',
      healId: 'heal_f6_kit',
      healName: 'First Aid Kit',
      healAmount: 400,
      healX: 17.0,
      healZ: -8.0,
      theme: 'abandoned',
    },
  ];

  upperFloorSpecs.forEach((spec) => {
    const y = spec.elev;
    const grp = getFloorGroup(y);
    const oddUpper = spec.floorNum % 2 === 1;

    // 1. Outer Perimeter Shell (x: -22..24, z: -32..20)
    addWall(-22, 20, 22, 20, y, 3.8, 0.25, undefined, 1.48, 2.55, `${spec.code}_ext_s`, grp);
    addWall(-22, -32, 24, -32, y, 3.8, 0.25, undefined, 1.48, 2.55, `${spec.code}_ext_n`, grp);
    addWall(-22, -32, -22, 20, y, 3.8, 0.25, undefined, 1.48, 2.55, `${spec.code}_ext_w`, grp);
    addWall(22, -15, 22, 20, y, 3.8, 0.25, undefined, 1.48, 2.55, `${spec.code}_ext_e1`, grp);
    addWall(24, -32, 24, -15, y, 3.8, 0.25, undefined, 1.48, 2.55, `${spec.code}_ext_e2`, grp);

    // 2. Central Corridor Spine (-2.2 and +2.2) + Stairwell Enclosures & Safety Guardrails
    addWall(-2.2, -15, -2.2, 1, y, 3.8, 0.25, spec.theme === 'restricted' ? 0.5 : undefined, 1.48, 2.55, `${spec.code}_cc_w`, grp);
    addWall(-2.2, 5, -2.2, 20, y, 3.8, 0.25, 0.767, 1.48, 2.55, `${spec.code}_cc_sw`, grp);
    addWall(2.2, 5, 2.2, 20, y, 3.8, 0.25, 0.767, 1.48, 2.55, `${spec.code}_cc_se`, grp);

    // Stairwell West & East Walls (x=2.2 and x=9.1) prevent falling off side of stairwell and enclose East Mid room
    addWall(2.2, -14, 2.2, -4, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_stair_w`, grp);
    addWall(9.1, -15, 9.1, 1, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_stair_e`, grp);

    // Landing Guardrails across unused shaft opening (Even: close South z=-4; Odd: close North z=-14)
    if (oddUpper) {
      addBoxMesh(5.65, y + 0.55, -14.05, 6.9, 1.12, 0.16, mats.rustedMetal, `${spec.code}_stair_guard_n`, false, true, grp);
    } else {
      addBoxMesh(5.65, y + 0.55, -3.95, 6.9, 1.12, 0.16, mats.rustedMetal, `${spec.code}_stair_guard_s`, false, true, grp);
    }

    // 3. South-West Strip: Restrooms, SW Room, SW Front West Storage & SW Front East Room
    addWall(-22, 5, -16, 5, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_wc_corr`, grp);
    addWall(-16, 5, -2.2, 5, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_sw_corr`, grp);
    addWall(-16, 5, -16, 13, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_wc_div`, grp);
    addWall(-22, 13, -12, 13, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_wc_s`, grp);
    addWall(-12, 13, -2.2, 13, y, 3.8, 0.22, 0.5, 1.48, 2.55, `${spec.code}_sw_mid_s`, grp);
    addWall(-12, 13, -12, 20, y, 3.8, 0.22, 0.5, 1.48, 2.55, `${spec.code}_sw_f_div`, grp);

    addDoor(`door_${spec.code}_wc`, `${spec.code} Restrooms Door`, -19, y, 5, 0, false, false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_sw`, `${spec.swRoomTitle} Door`, -9.1, y, 5, 0, false, false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_sw_fe`, `${spec.swFrontETitle} Door`, -2.2, y, 16.5, Math.PI / 2, false, false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_sw_fw`, `${spec.swFrontWTitle} Door`, -12, y, 16.5, Math.PI / 2, false, false, undefined, undefined, undefined, grp);

    addBoxMesh(-19.5, y + 1.0, 7.2, 2.2, 2.0, 0.1, mats.lockerSteel, `${spec.code}_stall_1`, false, true, grp);
    addBoxMesh(-19.5, y + 1.0, 10.2, 2.2, 2.0, 0.1, mats.lockerSteel, `${spec.code}_stall_2`, false, true, grp);

    // 4. South-East Strip: 4 Distinct Rooms
    addWall(2.2, 5, 12, 5, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_se_w_n`, grp);
    addWall(12, 5, 22, 5, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_se_e_n`, grp);
    addWall(12, 5, 12, 13, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_se_div`, grp);
    addWall(2.2, 13, 22, 13, y, 3.8, 0.22, 0.75, 1.48, 2.55, `${spec.code}_se_s`, grp);
    addWall(12, 13, 12, 20, y, 3.8, 0.22, 0.5, 1.48, 2.55, `${spec.code}_se_f_div`, grp);

    addDoor(`door_${spec.code}_se_w`, `${spec.seMidWTitle} Door`, 7.1, y, 5, 0, false, false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_se_e`, `${spec.seMidETitle} Door`, 17.0, y, 5, 0, false, false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_se_fw`, `${spec.seFrontWTitle} Door`, 2.2, y, 16.5, Math.PI / 2, false, false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_se_fe`, `${spec.seFrontETitle} Door`, 12, y, 16.5, Math.PI / 2, false, false, undefined, undefined, undefined, grp);

    // 5. West Wing Middle (-22..-2.2, z: -15..1) & Floor 5 Secret Corridor
    if (spec.theme === 'restricted') {
      addWall(-22, 1, -6, 1, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_w_s`, grp);
      addWall(-22, -15, -6, -15, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_w_n`, grp);
      addWall(-6, -15, -6, 1, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_sec_div`, grp);
      addWall(-6, 1, -2.2, 1, y, 3.8, 0.25, undefined, 1.48, 2.55, `${spec.code}_sec_s`, grp);
      addWall(-6, -15, -2.2, -15, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_sec_n`, grp);
      addDoor(`door_${spec.code}_west`, `${spec.westMidTitle} Door`, -14.0, y, 1, 0, true, false, undefined, undefined, undefined, grp);
      addDoor(`door_${spec.code}_sec_c`, 'Secret Corridor Door', -2.2, y, -7, Math.PI / 2, true, false, undefined, undefined, undefined, grp);

      // Secret sliding panel leading from Secret Corridor into Hidden Room 598!
      const f5SecretPanel = createBookshelfAssembly(mats);
      f5SecretPanel.position.set(-4.1, y, -15);
      grp.add(f5SecretPanel);
      colliders.push({
        id: 'col_f5_secret_panel',
        minX: -5.0,
        maxX: -3.2,
        minY: y,
        maxY: y + 2.5,
        minZ: -15.3,
        maxZ: -14.7,
        active: true,
      });
      addPickup('switch_f5_secret', 'secret_switch', 'F5 Secret Archive Latch', -5.6, y + 1.35, -13.5, {
        secretWallColliderId: 'col_f5_secret_panel',
        secretWallGroup: f5SecretPanel,
        secretWallClosedX: -4.1,
        secretWallOpenX: -6.0,
        floorGroup: grp,
      });
    } else {
      addWall(-22, 1, -2.2, 1, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_w_s`, grp);
      addWall(-22, -15, -2.2, -15, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_w_n`, grp);
      addDoor(`door_${spec.code}_west`, `${spec.westMidTitle} Door`, -12.1, y, 1, 0, false, false, undefined, undefined, undefined, grp);
    }

    // 6. East Wing Middle (9.1..22, z: -15..1)
    addWall(9.1, 1, 22, 1, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_e_s`, grp);
    addWall(9.1, -15, 22, -15, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_e_n`, grp);
    addDoor(`door_${spec.code}_east_m`, `${spec.eastMidTitle} Door`, 15.55, y, 1, 0, spec.theme === 'restricted', false, undefined, undefined, undefined, grp);

    // 7. North Wing 3 Divided Rooms (z: -32..-19)
    addWall(-22, -19, -6, -19, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_nw_s`, grp);
    addWall(-6, -19, 10, -19, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_nc_s`, grp);
    addWall(10, -19, 24, -19, y, 3.8, 0.25, 0.5, 1.48, 2.55, `${spec.code}_ne_s`, grp);
    addWall(-6, -32, -6, -19, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_nw_div`, grp);
    addWall(10, -32, 10, -19, y, 3.8, 0.22, undefined, 1.48, 2.55, `${spec.code}_ne_div`, grp);

    addDoor(`door_${spec.code}_north_w`, `${spec.northWTitle} Door`, -14.0, y, -19, 0, spec.theme === 'restricted', false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_north_c`, `${spec.northCTitle} Door`, 2.0, y, -19, 0, false, false, undefined, undefined, undefined, grp);
    addDoor(`door_${spec.code}_north_e`, `${spec.northETitle} Door`, 17.0, y, -19, 0, false, false, undefined, undefined, undefined, grp);

    // 8. Grounded Floor Inlays & Theme-Matched Furniture Props
    addFloorInlay(-14, y, -7, 15.2, 15.2, mats.woodFloor, grp);
    addFloorInlay(7.1, y, 9, 9.2, 7.2, mats.woodFloor, grp);
    addFloorInlay(17.0, y, 9, 9.2, 7.2, mats.woodFloor, grp);

    // Storage racks in storage corners
    const rackSW = createStorageRackAssembly(mats);
    rackSW.position.set(-18.5, y, 17.8);
    grp.add(rackSW);
    const rackSE = createStorageRackAssembly(mats);
    rackSE.position.set(18.5, y, 17.8);
    grp.add(rackSE);

    // Desks in classrooms
    for (let c = 0; c < 3; c++) {
      const desk = createSchoolDeskAssembly(mats, spec.theme === 'abandoned' && c >= 1);
      desk.position.set(13.5 + c * 2.8, y, 9.2);
      grp.add(desk);
    }

    if (spec.theme === 'library' || spec.theme === 'abandoned') {
      for (let b = 0; b < 3; b++) {
        const bs = createBookshelfAssembly(mats);
        bs.position.set(-18.5 + b * 4.2, y, -6.5);
        grp.add(bs);
      }
      const nRack = createBookshelfAssembly(mats);
      nRack.position.set(-14.0, y, -25.0);
      grp.add(nRack);
    }
    if (spec.theme === 'classrooms') {
      for (let c = 0; c < 3; c++) {
        const comp = createComputerStation(mats);
        comp.group.position.set(12.5 + c * 3.0, y, -6.5);
        grp.add(comp.group);
      }
    }
    if (spec.theme === 'science') {
      for (let b = 0; b < 2; b++) {
        const lb = createLabBenchAssembly(mats);
        lb.position.set(14.5, y, -5.0 - b * 4.5);
        grp.add(lb);
        const lbN = createLabBenchAssembly(mats);
        lbN.position.set(-14.0 + b * 14.0, y, -25.5);
        grp.add(lbN);
      }
    }
    if (spec.theme === 'restricted') {
      const admComp = createComputerStation(mats);
      admComp.group.position.set(-9.5, y, 9.5);
      grp.add(admComp.group);
      const vaultCab = createFilingCabinet(mats);
      vaultCab.group.position.set(-16.0, y, -25.0);
      grp.add(vaultCab.group);
    }
    if (spec.theme === 'abandoned') {
      addPickup('note_f6_archive', 'note', 'Floor 6 Secret Inspection Dossier', -14.0, y + 0.78, -24.5, {
        note: NOTES.note_f6_archive,
        floorGroup: grp,
      });
    }

    addHidingLocker(`locker_${spec.code}`, 21.1, y, 11.8, -Math.PI / 2, grp);

    addPickup(spec.healId, 'healing', spec.healName, spec.healX, y + 0.04, spec.healZ, {
      item: {
        id: `${spec.healId}_item`,
        name: spec.healName,
        kind: 'healing',
        description: `Restores +${spec.healAmount} HP`,
        droppable: true,
        consumable: true,
        healAmount: spec.healAmount,
      },
      floorGroup: grp,
    });

    // Subtle Per-Floor Emergency Corridor PointLights (culled per floor so <= 6 active lights!)
    addFlickerLight(0, y + 3.65, -1.5, 0xb8d0db, 1.85, 13, spec.floorNum >= 5, true, y);
    addFlickerLight(-12, y + 3.65, 3, 0xb8d0db, 1.65, 12, false, true, y);
    addFlickerLight(14, y + 3.65, 3, 0xb8d0db, 1.65, 12, spec.floorNum >= 4, true, y);
    addFlickerLight(0, y + 3.65, -17, 0xb8d0db, 1.55, 12, true, true, y);
  });

  // =========================================================================
  // 6B. SCHOOL ROOFTOP (ROOF, y = 24.0)
  // =========================================================================
  const roofGroup = getFloorGroup(24);
  addWall(-18, -22, 18, -22, 24.0, 1.35, 0.3, undefined, 1.48, 2.55, 'roof_n', roofGroup);
  addWall(-18, 4, 18, 4, 24.0, 1.35, 0.3, undefined, 1.48, 2.55, 'roof_s', roofGroup);
  addWall(-18, -22, -18, 4, 24.0, 1.35, 0.3, undefined, 1.48, 2.55, 'roof_w', roofGroup);
  addWall(18, -22, 18, 4, 24.0, 1.35, 0.3, undefined, 1.48, 2.55, 'roof_e', roofGroup);

  // Stairwell safety railing on Roof around Shaft B opening x: 5.7..9.1, z: -14..-4 (south edge z=-4 open!)
  addBoxMesh(5.7, 24.55, -9, 0.16, 1.1, 10, mats.rustedMetal, 'roof_rail_w', false, true, roofGroup);
  addBoxMesh(9.1, 24.55, -9, 0.16, 1.1, 10, mats.rustedMetal, 'roof_rail_e', false, true, roofGroup);
  addBoxMesh(7.4, 24.55, -14.1, 3.5, 1.1, 0.16, mats.rustedMetal, 'roof_rail_n', false, true, roofGroup);

  addBoxMesh(-8, 24.8, -14, 3.2, 1.6, 2.2, mats.lockerSteel, 'roof_hvac_1', true, true, roofGroup);
  addBoxMesh(11, 24.8, -12, 2.8, 1.6, 2.4, mats.lockerSteel, 'roof_hvac_2', true, true, roofGroup);
  addPickup('switch_rooftop_beacon', 'secret_switch', 'Rooftop Emergency Beacon', -6.2, 24.9, -14.0, { floorGroup: roofGroup });
  addDoor('exit_final_escape', 'Emergency Escape Hatch', 15.5, 24.0, -18.0, 0, true, true, undefined, 'switch_rooftop_beacon', undefined, roofGroup);
  addFlickerLight(7.4, 26.8, -4.0, 0xfca5a5, 1.9, 16, true, true, 24);

  // =========================================================================
  // 7. OUTDOOR SCHOOL GROUNDS: ENTRANCE GATE (z=50), PARKING LOTS & PLAYGROUND
  // =========================================================================
  addFloorInlay(0, 0, 39, 5.2, 38, mats.basementConcrete, worldGroup);

  const gateAssembly = createEntranceGateAssembly(mats);
  gateAssembly.position.set(0, 0, 50);
  worldGroup.add(gateAssembly);
  colliders.push(
    { id: 'gate_pillar_w', minX: -3.9, maxX: -2.9, minY: 0, maxY: 3.8, minZ: 49.5, maxZ: 50.5, active: true },
    { id: 'gate_pillar_e', minX: 2.9, maxX: 3.9, minY: 0, maxY: 3.8, minZ: 49.5, maxZ: 50.5, active: true }
  );

  for (let fx = -26; fx <= 26; fx += 4) {
    if (Math.abs(fx) < 3.6) continue;
    addBoxMesh(fx, 1.1, 50, 0.14, 2.2, 0.14, mats.rustedMetal, `fence_s_${fx}`);
  }
  addBoxMesh(-15, 1.1, 50, 22, 0.08, 0.08, mats.rustedMetal);
  addBoxMesh(15, 1.1, 50, 22, 0.08, 0.08, mats.rustedMetal);

  addFloorInlay(18, 0, 40, 14, 15, mats.basementConcrete, worldGroup);
  for (let px = 12; px <= 24; px += 4) {
    addBoxMesh(px, 0.015, 40, 0.12, 0.02, 7.5, mats.paper);
  }
  const sedan = createParkedVehicleMesh(mats, 'sedan');
  sedan.position.set(14.5, 0, 40);
  sedan.rotation.y = 0.06;
  worldGroup.add(sedan);
  colliders.push({ id: 'col_parked_sedan', minX: 13.4, maxX: 15.6, minY: 0, maxY: 1.8, minZ: 37.8, maxZ: 42.2, active: true });

  const van = createParkedVehicleMesh(mats, 'van');
  van.position.set(20.5, 0, 39.5);
  van.rotation.y = -0.05;
  worldGroup.add(van);
  colliders.push({ id: 'col_parked_van', minX: 19.4, maxX: 21.6, minY: 0, maxY: 2.0, minZ: 37.1, maxZ: 41.9, active: true });

  addFloorInlay(-17, 0, 40, 10, 7, mats.basementConcrete, worldGroup);
  const bikeParking = createBicycleRackAssembly(mats);
  bikeParking.position.set(-17, 0, 40);
  worldGroup.add(bikeParking);
  colliders.push({ id: 'col_bike_rack', minX: -20.5, maxX: -13.5, minY: 0, maxY: 1.4, minZ: 38.8, maxZ: 41.2, active: true });

  const swing = createPlaygroundSwing(mats);
  swing.position.set(-8.5, 0, 30);
  swing.rotation.y = 0.25;
  worldGroup.add(swing);

  const treePositions: [number, number][] = [
    [-16, 26],
    [14, 27],
    [-25, 36],
    [25, 34],
    [-10, 46],
    [9, 46],
  ];
  treePositions.forEach(([tx, tz], i) => {
    const tree = createDeadTree(mats, i + 1);
    tree.position.set(tx, 0, tz);
    worldGroup.add(tree);
  });

  addPickup('key_rooftop', 'key', 'Rooftop Hatch Key', -8.5, 0.04, 30.0, {
    item: { id: 'key_rooftop', name: 'Rooftop Hatch Key', kind: 'key', description: 'Unlocks the Rooftop Access Door', droppable: false, sharedQuest: true },
    floorGroup: worldGroup,
  });
  addPickup('bat_courtyard', 'battery', 'Flashlight Battery', 6.5, 0.04, 27.5, {
    item: { id: 'bat_4', name: 'D-Cell Battery', kind: 'battery', description: 'Restores +60% flashlight charge', droppable: true, consumable: true },
    floorGroup: worldGroup,
  });

  // =========================================================================
  // 7B. INDEPENDENT SCHOOL NPCs
  // =========================================================================
  const addSchoolNpc = (
    id: string,
    name: string,
    x: number,
    y: number,
    z: number,
    rotY: number,
    shirtHex: number,
    dialogue: NpcDialogueSession
  ) => {
    const grp = getFloorGroup(Math.round(y / 4) * 4);
    const npcGroup = new THREE.Group();
    npcGroup.position.set(x, y, z);
    npcGroup.rotation.y = rotY;
    const coatMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.85 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.88 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xb9aa9c, roughness: 0.78 });

    const legs = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.82, 0.2)), legMat);
    legs.position.set(0, 0.41, 0);
    const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.56, 0.24)), coatMat);
    torso.position.set(0, 1.1, 0);
    const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.24, 0.22)), headMat);
    head.position.set(0, 1.54, 0);
    npcGroup.add(legs, torso, head);
    grp.add(npcGroup);

    const hitProxy = new THREE.Mesh(
      getBoxGeo(0.75, 1.85, 0.75),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitProxy.position.set(x, y + 0.95, z);
    grp.add(hitProxy);

    registerInteractable({
      id,
      type: 'npc',
      label: `Speak to ${name}`,
      sublabel: 'School Witness',
      mesh: npcGroup,
      hitTarget: hitProxy,
      worldPos: new THREE.Vector3(x, y + 1.4, z),
      npcDialogue: dialogue,
    });
  };

  addSchoolNpc('npc_caretaker_echo', 'Stranded Night Guard', 4.8, 0, 3.0, -Math.PI / 2, 0x2c363b, {
    npcId: 'npc_caretaker_echo',
    npcName: 'Stranded Night Guard',
    role: 'guard',
    greeting: 'You shouldn’t be wandering the East Wing after midnight... Nobody left any keys in the Teacher Offices. Go back to the courtyard!',
    emotionalRead: 'Emotional Read (Phuong): His breathing is shallow and his eyes dart toward the Teacher Offices door—he is hiding something out of fear.',
    truthful: false,
    options: [
      {
        id: 'ask_exit',
        label: 'Ask about the South Emergency Exit',
        response: 'The padlock jammed years ago. You won’t find a key anywhere near the desks.',
        revealsLie: 'Deception Detected: He flinches when mentioning the desks—the Courtyard Key IS inside the Teacher Offices.',
      },
      {
        id: 'phuong_tease',
        label: '[Phuong] Reassure him gently and crack a joke about the dark',
        requiresCharacter: 'phuong',
        response: 'Heh... alright, kid. You’ve got nerve. Fine—the Courtyard Key is sitting right on the Teacher Office computer desk.',
      },
    ],
  });

  addSchoolNpc('npc_librarian_shade', 'Archive Witness', -10.5, 0, -6.5, 0, 0x3b312d, {
    npcId: 'npc_librarian_shade',
    npcName: 'Archive Witness',
    role: 'archivist',
    greeting: 'Keep your voice down between the stacks. The western wall slides open when you pull the tilted crimson ledger.',
    emotionalRead: 'Emotional Read (Phuong): Genuinely terrified but sincere. No signs of deception.',
    truthful: true,
    options: [
      {
        id: 'ask_basement',
        label: 'Ask where the maintenance tunnels lead',
        response: 'Down the stairwell off the Central Corridor. Flip the Main Breaker down there if you ever want the Courtyard Gate powered.',
      },
      {
        id: 'phuong_comfort',
        label: '[Phuong] Ask how they survived alone in the stacks',
        requiresCharacter: 'phuong',
        response: 'Metal lockers, mostly. And watching the fluorescents—when they start rapid-flickering, something is moving nearby.',
      },
    ],
  });

  addSchoolNpc('npc_deceptive_student', 'Lingering Student', 13.8, 0, 3.1, Math.PI, 0x1d2536, {
    npcId: 'npc_deceptive_student',
    npcName: 'Lingering Student',
    role: 'student',
    greeting: 'Are you looking for the restricted records? The Principal threw every key out into the Courtyard playground!',
    emotionalRead: 'Emotional Read (Phuong): Flat, rehearsed cadence. Their badge reads October 1998.',
    truthful: false,
    options: [],
  });

  const witchMesh = createWitchModel();
  witchMesh.position.set(-15.5, 0, -6.2);
  worldGroup.add(witchMesh);
  const witchHit = new THREE.Mesh(
    getBoxGeo(0.95, 2.05, 0.95),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  witchHit.position.set(-15.5, 1.05, -6.2);
  worldGroup.add(witchHit);
  const witchInteractable: InteractableObject = {
    id: 'npc_witch',
    type: 'npc',
    label: 'Speak to The Pale Witch',
    sublabel: 'Mysterious Apparition',
    mesh: witchMesh,
    hitTarget: witchHit,
    worldPos: new THREE.Vector3(-15.5, 1.35, -6.2),
    npcDialogue: {
      npcId: 'npc_witch',
      npcName: 'The Pale Witch',
      role: 'witch',
      greeting: 'Are you looking for the library? You should go upstairs... unless you want to disappear.',
      truthful: false,
      options: [],
    },
  };
  registerInteractable(witchInteractable);

  // =========================================================================
  // 7C. PART 3 PUZZLE CONSOLES, COLLECTIBLES & EMERGENCY CANDLES
  // =========================================================================
  const puzzlePanelMat = new THREE.MeshStandardMaterial({ color: 0x1e242e, roughness: 0.55, metalness: 0.45 });
  const puzzleLedMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

  const addPuzzleStation = (
    puzzleId: string,
    label: string,
    sublabel: string,
    x: number,
    y: number,
    z: number,
    grp: THREE.Object3D = f1Group
  ) => {
    const pgrp = new THREE.Group();
    pgrp.position.set(x, y, z);
    const housing = new THREE.Mesh(getBoxGeo(0.42, 0.52, 0.16), puzzlePanelMat);
    const dial = new THREE.Mesh(getBoxGeo(0.24, 0.16, 0.04), puzzleLedMat);
    dial.position.set(0, 0.08, 0.09);
    pgrp.add(housing, dial);
    grp.add(pgrp);

    const hitProxy = new THREE.Mesh(
      getBoxGeo(0.75, 0.85, 0.75),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitProxy.position.set(x, y, z);
    grp.add(hitProxy);

    registerInteractable({
      id: puzzleId,
      type: 'puzzle',
      puzzleId,
      label,
      sublabel,
      mesh: pgrp,
      hitTarget: hitProxy,
      worldPos: new THREE.Vector3(x, y, z),
    });
  };

  addPuzzleStation('puzzle_l1_circuit', 'Reception Circuit Panel', 'Solve Level 1 Electrical Puzzle', -6.65, 1.35, 14.8, f1Group);
  addPuzzleStation('puzzle_l2_cabinet', 'Locked Supply Cabinet', 'Solve Level 2 Sequence Lock', 20.6, 1.15, 11.4, f1Group);
  addPuzzleStation('puzzle_l3_books', 'Chronology Book Rack', 'Solve Level 3 Book Order', -14.5, 1.18, -4.45, f1Group);
  addPuzzleStation('puzzle_l4_lab', 'Fume-Hood Valve Console', 'Solve Level 4 Reagent Logic', 18.6, 1.12, -23.5, f1Group);
  addPuzzleStation('puzzle_l5_password', 'Restricted Archive Login', 'Solve Level 5 Terminal Cipher', 17.2, 1.08, -6.2, f1Group);
  addPuzzleStation('puzzle_l6_breaker', 'Damaged Sub-Panel Relays', 'Solve Level 6 Load Balance', -21.0, -2.6, -18.2, b1Group);
  addPuzzleStation('puzzle_l7_symbols', 'Chalk Ritual Altar', 'Solve Level 7 Contradiction Seal', -5.4, 0.95, -23.5, f1Group);
  addPuzzleStation('puzzle_l8_blackout', 'Auxiliary Blackout Box', 'Solve Level 8 Grid Cipher', -1.92, 1.35, 0.2, f1Group);
  addPuzzleStation('puzzle_l9_timeline', '1998 Memorial Board', 'Solve Level 9 Timeline Sequence', 3.8, 1.28, 25.5, worldGroup);
  addPuzzleStation('puzzle_l10_final', 'Master Override Console', 'Solve Level 10 Final Cipher', 13.8, 24.95, -17.5, roofGroup);

  addPickup('item_chalk', 'hidden_object', 'Numbered Chalk Box', 6.2, 0.78, 7.8, {
    item: { id: 'item_chalk', name: 'Chalk Clue Box', kind: 'component', description: 'Classroom 101 chalk marked +4, +6, +8', droppable: true },
    floorGroup: f1Group,
  });
  addPickup('item_compass', 'hidden_object', 'Brass Drafting Compass', 16.5, 0.78, 10.2, {
    item: { id: 'item_compass', name: 'Drafting Compass', kind: 'component', description: 'Recovered Classroom 102 geometry tool', droppable: true },
    floorGroup: f1Group,
  });
  addPickup('item_copper_coil', 'hidden_object', 'Lab Copper Coil', 7.5, 0.94, -23.5, {
    item: { id: 'item_copper_coil', name: 'Copper Relay Coil', kind: 'component', description: 'Laboratory electrical replacement coil', droppable: true },
    floorGroup: f1Group,
  });
  addPickup('doc_1998_fire', 'note', '1998 Evacuation Ledger', 1.8, 0.25, 25.5, {
    note: {
      id: 'doc_1998_fire',
      title: '1998 Incident Chronicle',
      author: 'District Archive',
      body: 'Oct 12: Chemical surge & fire beneath Chemistry Wing. Oct 13: Student Linh Tran vanished in the Library stacks. Oct 14: Principal Mercer sealed the vault keys. Oct 15: Permanent evacuation ordered.',
      analyticalHint: 'Code Reminder: Order is Fire -> Vanished -> Keys Sealed -> Evacuation.',
      quickClue: 'Quick Clue: Compare this ledger with the Memorial Board right beside it.',
    },
    floorGroup: worldGroup,
  });

  const waxMat = new THREE.MeshStandardMaterial({ color: 0xe7dfd1, roughness: 0.7 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xfdba74 });
  const addEmergencyCandle = (id: string, label: string, x: number, y: number, z: number, grp: THREE.Object3D = f1Group) => {
    const cgrp = new THREE.Group();
    cgrp.position.set(x, y, z);
    const holder = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.08, 10)), mats.brass);
    const stick = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.05, 0.24, 10)), waxMat);
    stick.position.y = 0.14;
    const flame = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.035, 0.09, 8)), flameMat);
    flame.position.y = 0.31;
    flame.visible = false;
    const light = new THREE.PointLight(0xffb454, 2.3, 12, 1.6);
    light.position.set(0, 0.48, 0);
    light.visible = false;
    cgrp.add(holder, stick, flame, light);
    grp.add(cgrp);

    const hitProxy = new THREE.Mesh(
      getBoxGeo(0.65, 0.75, 0.65),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitProxy.position.set(x, y + 0.25, z);
    grp.add(hitProxy);

    registerInteractable({
      id,
      type: 'candle_light',
      label,
      sublabel: 'Ignite Emergency Lantern',
      mesh: cgrp,
      hitTarget: hitProxy,
      worldPos: new THREE.Vector3(x, y + 0.25, z),
      isOpen: false,
      candleLight: light,
      candleFlame: flame,
    });
  };

  addEmergencyCandle('candle_reception', 'Reception Emergency Lantern', 2.4, 0, 12.2, f1Group);
  addEmergencyCandle('candle_central', 'Central Hall Lantern', 1.4, 0, 1.5, f1Group);
  addEmergencyCandle('candle_library', 'Library Reading Lantern', -11.0, 0, -1.5, f1Group);
  addEmergencyCandle('candle_basement', 'Basement Tunnel Lantern', -16.0, -4.0, -14.0, b1Group);

  // =========================================================================
  // 8. LIGHTING: SPARSE FLICKERING FLUORESCENTS (F1, B1, plus upper floors culled)
  // =========================================================================
  addFlickerLight(0, 3.65, 13, 0xc3d9e2, 2.8, 15, false, true, 0);
  addFlickerLight(0, 3.65, -2, 0xb8d0db, 2.2, 14, true, true, 0);
  addFlickerLight(10, 3.65, 3, 0xb8d0db, 2.0, 12, true, true, 0);
  addFlickerLight(-12, 3.65, 3, 0xb8d0db, 1.9, 12, false, true, 0);
  addFlickerLight(0, 3.65, -17, 0xb8d0db, 2.1, 13, true, true, 0);
  addFlickerLight(-14, -0.55, -18, 0xd49664, 2.0, 14, true, true, -4);

  addFlickerLight(0, 3.65, -10, 0xb8d0db, 0, 0, false, false, 0);
  addFlickerLight(16, 3.65, -7, 0xb8d0db, 0, 0, false, false, 0);
  addFlickerLight(-14, 3.65, -7, 0xb8d0db, 0, 0, false, false, 0);
  addFlickerLight(-4, 3.65, -24, 0xb8d0db, 0, 0, false, false, 0);
  addFlickerLight(16, 3.65, -24, 0xb8d0db, 0, 0, false, false, 0);

  // =========================================================================
  // 9. FLOATING DUST PARTICLES IN AIR
  // =========================================================================
  const dustCount = isSoftwareGl ? 180 : 420;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 46;
    dustPos[i * 3 + 1] = Math.random() * 24.0 - 2.0;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 78;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xc2d0d8,
    size: 0.045,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  worldGroup.add(dustPoints);

  const relocateWitch = (level: number, visible: boolean) => {
    const spots: Record<number, { x: number; y: number; z: number; yaw: number }> = {
      3: { x: -13.6, y: 0, z: -6.0, yaw: 0.4 },
      5: { x: 14.2, y: 0, z: -4.2, yaw: -0.6 },
      7: { x: -8.5, y: 0, z: -24.5, yaw: 0.9 },
      8: { x: -4.8, y: 0, z: 12.2, yaw: 0.8 },
      9: { x: -4.5, y: 0, z: 26.5, yaw: -0.3 },
      10: { x: -3.5, y: 24.0, z: -12.5, yaw: 0.5 },
    };
    const spot = spots[level] ?? { x: -13.6, y: 0, z: -6.0, yaw: 0.4 };
    witchMesh.position.set(spot.x, spot.y, spot.z);
    witchMesh.rotation.y = spot.yaw;
    witchHit.position.set(spot.x, spot.y + 1.05, spot.z);
    witchInteractable.worldPos.set(spot.x, spot.y + 1.35, spot.z);
    witchInteractable.consumed = !visible;
    witchMesh.visible = visible;
  };

  const setNpcDisappeared = (npcId: string, disappeared: boolean) => {
    const target = interactables.find((i) => i.id === npcId && i.type === 'npc');
    if (!target) return;
    target.consumed = disappeared;
    target.mesh.visible = !disappeared;
  };

  // =========================================================================
  // 10. MOVING CURTAINS, SPECULAR PUDDLES, JUMP-SCARE APPARITION & ANOMALIES
  // =========================================================================
  const curtainGeo = trackGeo(new THREE.BoxGeometry(0.68, 2.05, 0.04));
  curtainGeo.translate(0, -1.02, 0);
  const curtainSpots: Array<[number, number, number, number]> = [
    [-6.78, 2.9, 13.0, Math.PI / 2],
    [6.78, 2.9, 13.0, Math.PI / 2],
    [8.0, 2.9, 12.75, 0],
    [17.0, 2.9, 12.75, 0],
    [-11.0, 2.9, 12.75, 0],
    [-21.75, 2.9, -20.5, Math.PI / 2],
  ];
  curtainSpots.forEach(([cx, cy, cz, ry], idx) => {
    const cMesh = new THREE.Mesh(curtainGeo, mats.fabric);
    cMesh.position.set(cx, cy, cz);
    cMesh.rotation.y = ry;
    f1Group.add(cMesh);
    curtains.push({ mesh: cMesh, baseRotZ: 0, seed: idx * 1.9 + 0.4 });
  });

  const puddleMat = new THREE.MeshStandardMaterial({
    color: 0x0b1116,
    roughness: 0.08,
    metalness: 0.78,
    transparent: true,
    opacity: 0.72,
  });
  const puddleCoords: Array<[number, number, number, number, THREE.Object3D]> = [
    [2.5, 0.015, 28.0, 1.4, worldGroup],
    [-4.5, 0.015, 34.5, 1.8, worldGroup],
    [-16.5, -3.98, -16.0, 1.3, b1Group],
    [-18.0, 0.032, -20.2, 0.9, f1Group],
  ];
  puddleCoords.forEach(([px, py, pz, r, grp]) => {
    const pMesh = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(r, 16)), puddleMat);
    pMesh.rotation.x = -Math.PI / 2;
    pMesh.position.set(px, py, pz);
    pMesh.matrixAutoUpdate = false;
    pMesh.updateMatrix();
    grp.add(pMesh);
  });

  const scareApparition = new THREE.Group();
  scareApparition.visible = false;
  const scareBodyMat = new THREE.MeshStandardMaterial({
    color: 0x090b0f,
    roughness: 0.9,
    transparent: true,
    opacity: 0.88,
  });
  const scareEyeMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const scareTorso = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.34, 1.65, 10)), scareBodyMat);
  scareTorso.position.y = 0.85;
  const scareHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.17, 10, 8)), scareBodyMat);
  scareHead.position.y = 1.82;
  const scareEyeL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 6, 6)), scareEyeMat);
  scareEyeL.position.set(-0.055, 1.85, 0.14);
  const scareEyeR = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 6, 6)), scareEyeMat);
  scareEyeR.position.set(0.055, 1.85, 0.14);
  scareApparition.add(scareTorso, scareHead, scareEyeL, scareEyeR);
  worldGroup.add(scareApparition);

  const anomalyProp = createSchoolDeskAssembly(mats, true);
  anomalyProp.position.set(2.2, 0.36, 9.2);
  anomalyProp.rotation.y = 0.8;
  anomalyProp.visible = false;
  f1Group.add(anomalyProp);

  cullGroups.push(
    { group: swing, center: new THREE.Vector3(-8.5, 1.4, 30), radius: 6 },
    { group: bikeParking, center: new THREE.Vector3(-17, 1.2, 40), radius: 6 },
    { group: sedan, center: new THREE.Vector3(14.5, 1.0, 40), radius: 4 },
    { group: van, center: new THREE.Vector3(20.5, 1.2, 39.5), radius: 4.5 },
    { group: dustPoints, center: new THREE.Vector3(0, 10, -6), radius: 75 },
    { group: bed1, center: new THREE.Vector3(-19.5, 0.5, -20.8), radius: 5 },
    { group: secretBookcase, center: new THREE.Vector3(-22, 1.2, -9), radius: 5 }
  );

  return {
    worldGroup,
    floorGroups,
    colliders,
    interactables,
    hitTargets,
    flickerLights,
    curtains,
    cullGroups,
    scareApparition,
    anomalyProp,
    zones,
    dustPoints,
    groundHeightAt,
    getZoneAt,
    relocateWitch,
    setNpcDisappeared,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      dustMat.dispose();
      puzzlePanelMat.dispose();
      puzzleLedMat.dispose();
      waxMat.dispose();
      flameMat.dispose();
      puddleMat.dispose();
      scareBodyMat.dispose();
      scareEyeMat.dispose();
      scene.remove(worldGroup);
    },
  };
}
