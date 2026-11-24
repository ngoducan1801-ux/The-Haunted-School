import * as THREE from 'three';
import type { MonsterAiState, MonsterType } from '../types/game';
import { countWallsBetween, resolvePlayerMovement, type ColliderBox } from './rules';

export interface MonsterWaypoint {
  x: number;
  y: number;
  z: number;
}

export interface MonsterInstance {
  id: string;
  type: MonsterType;
  name: string;
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  aiState: MonsterAiState;
  waypoints: MonsterWaypoint[];
  waypointIndex: number;
  investigateTarget: MonsterWaypoint | null;
  stateTimer: number;
  vanishCooldown: number;
  cueCooldown: number;
  animTime: number;
  baseSpeed: number;
  chaseSpeed: number;
  disappeared: boolean;
}

/**
 * Pure noise calculation for sound-reactive Monster AI (Crawler, Hallway Stalker).
 */
export function computePlayerNoiseLevel(
  isMoving: boolean,
  isSprinting: boolean,
  isCrouching: boolean,
  isHiding: boolean
): number {
  if (isHiding) return 0;
  if (!isMoving) return 0.06;
  if (isCrouching) return 0.18;
  if (isSprinting) return 0.96;
  return 0.48;
}

export function hasLineOfSight(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  colliders: ColliderBox[]
): boolean {
  if (Math.abs(a.y - b.y) > 2.8) return false;
  return countWallsBetween(a, b, colliders) === 0;
}

export interface AiStepInput {
  type: MonsterType;
  currentState: MonsterAiState;
  distanceToPlayer: number;
  hasLineOfSight?: boolean;
  playerNoise: number;
  playerFlashlightOn: boolean;
  playerHiding: boolean;
  stateTimer: number;
  vanishCooldown: number;
}

export interface AiStepOutput {
  nextState: MonsterAiState;
  shouldPlayCue: boolean;
  alertFactor: number; // 0..1
}

/**
 * Pure state-machine transition helper for all 4 monster archetypes.
 */
export function stepMonsterAiDecision(input: AiStepInput): AiStepOutput {
  const {
    type,
    currentState,
    distanceToPlayer,
    hasLineOfSight: los = true,
    playerNoise,
    playerFlashlightOn,
    playerHiding,
    stateTimer,
    vanishCooldown,
  } = input;

  if (type === 'shadow_walker') {
    if (currentState === 'vanished') {
      return {
        nextState: vanishCooldown <= 0 ? 'observe' : 'vanished',
        shouldPlayCue: false,
        alertFactor: 0,
      };
    }
    if (distanceToPlayer < 4.8 && los) {
      return { nextState: 'vanished', shouldPlayCue: true, alertFactor: 0.4 };
    }
    return {
      nextState: 'observe',
      shouldPlayCue: los && distanceToPlayer < 13 && stateTimer <= 0,
      alertFactor: los && distanceToPlayer < 15 ? 0.32 : 0.08,
    };
  }

  if (type === 'silent_student') {
    if (currentState === 'vanished') {
      return {
        nextState: vanishCooldown <= 0 ? 'mimic' : 'vanished',
        shouldPlayCue: false,
        alertFactor: 0,
      };
    }
    if (distanceToPlayer < 2.2 && los) {
      return { nextState: 'vanished', shouldPlayCue: true, alertFactor: 0.35 };
    }
    return {
      nextState: 'mimic',
      shouldPlayCue: false,
      alertFactor: los && distanceToPlayer < 9 ? 0.25 : 0,
    };
  }

  // Player hiding breaks chase cleanly into search/patrol so lockers genuinely protect!
  if (playerHiding) {
    if (currentState === 'chase') {
      return { nextState: 'search', shouldPlayCue: false, alertFactor: 0.45 };
    }
    if (currentState === 'search' && stateTimer <= 0) {
      return { nextState: 'patrol', shouldPlayCue: false, alertFactor: 0.1 };
    }
    return { nextState: currentState, shouldPlayCue: false, alertFactor: 0.22 };
  }

  if (type === 'crawler') {
    // Reacts strongly to footsteps/sprinting noise even around corners, but walls block visual aggro
    const hearRange = playerNoise > 0.7 ? 17 : playerNoise > 0.35 ? 10 : 3.2;
    if ((distanceToPlayer < 5.5 && playerNoise > 0.3 && los) || (distanceToPlayer < 2.4 && playerNoise > 0.55)) {
      return {
        nextState: 'chase',
        shouldPlayCue: currentState !== 'chase',
        alertFactor: 0.92,
      };
    }
    if (distanceToPlayer <= hearRange && playerNoise > 0.35) {
      return {
        nextState: 'investigate',
        shouldPlayCue: currentState === 'patrol',
        alertFactor: 0.65,
      };
    }
    if (currentState === 'investigate' && stateTimer <= 0) {
      return { nextState: 'patrol', shouldPlayCue: false, alertFactor: 0.15 };
    }
    if (currentState === 'chase' && (!los || distanceToPlayer > 14 || playerNoise < 0.2)) {
      return { nextState: 'search', shouldPlayCue: false, alertFactor: 0.5 };
    }
    if (currentState === 'search' && stateTimer <= 0) {
      return { nextState: 'patrol', shouldPlayCue: false, alertFactor: 0.12 };
    }
    return { nextState: currentState, shouldPlayCue: false, alertFactor: currentState === 'chase' ? 0.9 : 0.18 };
  }

  // Hallway Stalker: requires Line of Sight (never sees through walls) or loud noise nearby
  const sightRange = los ? (playerFlashlightOn ? 15.0 : 7.0) : 0;
  const hearRange = playerNoise > 0.7 ? 13 : 6.5;
  if ((los && distanceToPlayer <= sightRange * 0.72) || (distanceToPlayer < 6.5 && playerNoise > 0.75 && los)) {
    return {
      nextState: 'chase',
      shouldPlayCue: currentState !== 'chase',
      alertFactor: 0.98,
    };
  }
  if ((los && distanceToPlayer <= sightRange) || (playerNoise > 0.45 && distanceToPlayer <= hearRange)) {
    return {
      nextState: currentState === 'chase' && !los ? 'search' : 'investigate',
      shouldPlayCue: currentState === 'patrol',
      alertFactor: 0.68,
    };
  }
  if ((currentState === 'chase' || currentState === 'investigate') && (!los || stateTimer <= 0)) {
    return { nextState: 'search', shouldPlayCue: false, alertFactor: 0.4 };
  }
  if (currentState === 'search' && stateTimer <= 0) {
    return { nextState: 'patrol', shouldPlayCue: false, alertFactor: 0.1 };
  }
  return {
    nextState: currentState,
    shouldPlayCue: false,
    alertFactor: currentState === 'chase' ? 0.95 : 0.15,
  };
}

/**
 * Builds distinct composite 3D monster meshes for each archetype.
 */
export function createMonsterMesh(type: MonsterType): {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
} {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  root.add(body);

  if (type === 'shadow_walker') {
    const shadowMat = new THREE.MeshStandardMaterial({
      color: 0x050608,
      roughness: 0.95,
      emissive: 0x080b10,
      emissiveIntensity: 0.4,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xdbeafe });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.35, 0.24), shadowMat);
    torso.position.set(0, 1.35, 0);
    body.add(torso);

    // Tattered coat tails
    for (let i = -1; i <= 1; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.72, 0.04), shadowMat);
      strip.position.set(i * 0.13, 0.42, 0.1);
      body.add(strip);
    }

    head.position.set(0, 2.08, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.24), shadowMat);
    skull.position.set(0, 0.16, 0);
    const eL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.02), eyeMat);
    eL.position.set(-0.05, 0.18, -0.125);
    const eR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.02), eyeMat);
    eR.position.set(0.05, 0.18, -0.125);
    head.add(skull, eL, eR);
    body.add(head);

    const armGeo = new THREE.BoxGeometry(0.09, 0.95, 0.09);
    leftArm.position.set(-0.28, 1.85, 0);
    const la = new THREE.Mesh(armGeo, shadowMat);
    la.position.set(0, -0.45, 0);
    leftArm.add(la);
    rightArm.position.set(0.28, 1.85, 0);
    const ra = new THREE.Mesh(armGeo, shadowMat);
    ra.position.set(0, -0.45, 0);
    rightArm.add(ra);
    body.add(leftArm, rightArm);

    const legGeo = new THREE.BoxGeometry(0.12, 0.75, 0.12);
    leftLeg.position.set(-0.11, 0.72, 0);
    const ll = new THREE.Mesh(legGeo, shadowMat);
    ll.position.set(0, -0.36, 0);
    leftLeg.add(ll);
    rightLeg.position.set(0.11, 0.72, 0);
    const rl = new THREE.Mesh(legGeo, shadowMat);
    rl.position.set(0, -0.36, 0);
    rightLeg.add(rl);
    body.add(leftLeg, rightLeg);
  } else if (type === 'hallway_stalker') {
    const fleshMat = new THREE.MeshStandardMaterial({ color: 0x3b3532, roughness: 0.88 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0x9c9286, roughness: 0.72 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.88, 0.24), fleshMat);
    spine.position.set(0, 1.25, 0);
    spine.rotation.x = 0.18;
    body.add(spine);

    for (let r = 0; r < 3; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.26), boneMat);
      rib.position.set(0, 1.12 + r * 0.15, -0.02);
      body.add(rib);
    }

    head.position.set(0, 1.72, -0.1);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.24), boneMat);
    skull.position.set(0, 0.14, 0);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), fleshMat);
    jaw.position.set(0, -0.02, -0.02);
    const eL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.02), eyeMat);
    eL.position.set(-0.05, 0.16, -0.125);
    const eR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.02), eyeMat);
    eR.position.set(0.05, 0.16, -0.125);
    head.add(skull, jaw, eL, eR);
    body.add(head);

    const armGeo = new THREE.BoxGeometry(0.09, 0.92, 0.09);
    leftArm.position.set(-0.26, 1.56, -0.05);
    const la = new THREE.Mesh(armGeo, fleshMat);
    la.position.set(0, -0.44, 0);
    leftArm.add(la);
    rightArm.position.set(0.26, 1.56, -0.05);
    const ra = new THREE.Mesh(armGeo, fleshMat);
    ra.position.set(0, -0.44, 0);
    rightArm.add(ra);
    body.add(leftArm, rightArm);

    const legGeo = new THREE.BoxGeometry(0.13, 0.85, 0.13);
    leftLeg.position.set(-0.12, 0.85, 0);
    const ll = new THREE.Mesh(legGeo, fleshMat);
    ll.position.set(0, -0.42, 0);
    leftLeg.add(ll);
    rightLeg.position.set(0.12, 0.85, 0);
    const rl = new THREE.Mesh(legGeo, fleshMat);
    rl.position.set(0, -0.42, 0);
    rightLeg.add(rl);
    body.add(leftLeg, rightLeg);
  } else if (type === 'crawler') {
    const paleMat = new THREE.MeshStandardMaterial({ color: 0x7a746e, roughness: 0.82 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x262426, roughness: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // Low horizontal quadruped posture
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.72), darkMat);
    torso.position.set(0, 0.44, 0);
    body.add(torso);

    head.position.set(0, 0.48, -0.42);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24), paleMat);
    skull.position.set(0, 0.05, -0.08);
    const eL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02), eyeMat);
    eL.position.set(-0.05, 0.07, -0.2);
    const eR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02), eyeMat);
    eR.position.set(0.05, 0.07, -0.2);
    head.add(skull, eL, eR);
    body.add(head);

    const limbGeo = new THREE.BoxGeometry(0.08, 0.48, 0.08);
    leftArm.position.set(-0.22, 0.44, -0.25);
    const la = new THREE.Mesh(limbGeo, paleMat);
    la.position.set(0, -0.22, 0);
    leftArm.add(la);
    rightArm.position.set(0.22, 0.44, -0.25);
    const ra = new THREE.Mesh(limbGeo, paleMat);
    ra.position.set(0, -0.22, 0);
    rightArm.add(ra);
    leftLeg.position.set(-0.2, 0.44, 0.25);
    const ll = new THREE.Mesh(limbGeo, paleMat);
    ll.position.set(0, -0.22, 0);
    leftLeg.add(ll);
    rightLeg.position.set(0.2, 0.44, 0.25);
    const rl = new THREE.Mesh(limbGeo, paleMat);
    rl.position.set(0, -0.22, 0);
    rightLeg.add(rl);
    body.add(leftArm, rightArm, leftLeg, rightLeg);
  } else {
    // Silent Student: looks like an old 1998 student uniform
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1d2536, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc2b8ae, roughness: 0.78 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.88 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.2), jacketMat);
    torso.position.set(0, 1.12, 0);
    body.add(torso);

    head.position.set(0, 1.4, 0);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.23, 0.2), skinMat);
    skull.position.set(0, 0.14, 0);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.22), pantMat);
    hair.position.set(0, 0.24, 0);
    head.add(skull, hair);
    body.add(head);

    const armGeo = new THREE.BoxGeometry(0.09, 0.44, 0.09);
    leftArm.position.set(-0.22, 1.32, 0);
    const la = new THREE.Mesh(armGeo, jacketMat);
    la.position.set(0, -0.2, 0);
    leftArm.add(la);
    rightArm.position.set(0.22, 1.32, 0);
    const ra = new THREE.Mesh(armGeo, jacketMat);
    ra.position.set(0, -0.2, 0);
    rightArm.add(ra);
    body.add(leftArm, rightArm);

    const legGeo = new THREE.BoxGeometry(0.11, 0.82, 0.11);
    leftLeg.position.set(-0.09, 0.86, 0);
    const ll = new THREE.Mesh(legGeo, pantMat);
    ll.position.set(0, -0.41, 0);
    leftLeg.add(ll);
    rightLeg.position.set(0.09, 0.86, 0);
    const rl = new THREE.Mesh(legGeo, pantMat);
    rl.position.set(0, -0.41, 0);
    rightLeg.add(rl);
    body.add(leftLeg, rightLeg);
  }

  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg };
}

/**
 * Builds the detailed supernatural Witch NPC model (cloak, crooked hat, veil, glowing ember charm).
 */
export function createWitchModel(): THREE.Group {
  const g = new THREE.Group();
  const cloakMat = new THREE.MeshStandardMaterial({ color: 0x16121b, roughness: 0.9 });
  const shawlMat = new THREE.MeshStandardMaterial({ color: 0x2e1f2d, roughness: 0.84 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb7b0a8, roughness: 0.78 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });

  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 1.25, 12), cloakMat);
  robe.position.set(0, 0.63, 0);
  const shawl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.38, 10), shawlMat);
  shawl.position.set(0, 1.22, 0);
  const charm = new THREE.Mesh(new THREE.OctahedronGeometry(0.055), emberMat);
  charm.position.set(0, 1.18, -0.23);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.2), skinMat);
  head.position.set(0, 1.54, 0);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.03, 14), cloakMat);
  brim.position.set(0, 1.67, 0);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.44, 12), cloakMat);
  cone.position.set(0, 1.88, 0.02);
  cone.rotation.x = 0.14;

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), emberMat);
  eyeL.position.set(-0.045, 1.55, -0.105);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), emberMat);
  eyeR.position.set(0.045, 1.55, -0.105);

  g.add(robe, shawl, charm, head, brim, cone, eyeL, eyeR);
  return g;
}

/**
 * Generates level-appropriate monster spawn + patrol routes that never block spawn or exit doorways.
 */
export function buildMonstersForLevel(level: number, activeTypes: MonsterType[]): MonsterInstance[] {
  const routes: Record<MonsterType, MonsterWaypoint[]> = {
    shadow_walker: [
      { x: 0, y: 0, z: -8 },
      { x: 11, y: 0, z: 3 },
      { x: -11, y: 0, z: 3 },
      { x: 0, y: 0, z: -17 },
    ],
    hallway_stalker: [
      { x: 0, y: 0, z: -16 },
      { x: 13, y: 0, z: 3 },
      { x: -13, y: 0, z: 3 },
      { x: -14, y: -4, z: -16 },
    ],
    crawler: [
      { x: 16, y: 0, z: -24 },
      { x: 7, y: 0, z: -24 },
      { x: -6, y: 0, z: -24 },
      { x: -16, y: -4, z: -18 },
    ],
    silent_student: [
      { x: 8.5, y: 0, z: 9.5 },
      { x: -10, y: 0, z: -6 },
      { x: 16, y: 0, z: -7 },
      { x: -6, y: 0, z: 26 },
    ],
  };

  // Level 6 focuses basement stalker/crawler cleanly on y=-4
  return activeTypes.map((type, idx) => {
    const meshRig = createMonsterMesh(type);
    const baseRoute = routes[type];
    const startWp =
      level === 6 && (type === 'hallway_stalker' || type === 'crawler')
        ? { x: -12, y: -4, z: -17 }
        : level === 10 && idx === 0
          ? { x: 8, y: 24.0, z: -10 }
          : baseRoute[0];

    meshRig.root.position.set(startWp.x, startWp.y, startWp.z);

    const names: Record<MonsterType, string> = {
      shadow_walker: 'The Shadow Walker',
      hallway_stalker: 'The Hallway Stalker',
      crawler: 'The Crawler',
      silent_student: 'The Silent Student',
    };

    return {
      id: `monster_${type}`,
      type,
      name: names[type],
      ...meshRig,
      aiState:
        type === 'shadow_walker'
          ? 'observe'
          : type === 'silent_student'
            ? 'mimic'
            : 'patrol',
      waypoints: baseRoute,
      waypointIndex: 0,
      investigateTarget: null,
      stateTimer: 4,
      vanishCooldown: 0,
      cueCooldown: 2,
      animTime: idx * 2.1,
      baseSpeed: type === 'crawler' ? 2.1 : type === 'hallway_stalker' ? 1.85 : 0.9,
      chaseSpeed: type === 'crawler' ? 3.8 : type === 'hallway_stalker' ? 3.55 : 1.1,
      disappeared: false,
    };
  });
}

/**
 * Advances monster kinematics, wall-sliding collision, and procedural limb animation.
 */
export function updateMonsterMotion(
  m: MonsterInstance,
  dt: number,
  playerPos: { x: number; y: number; z: number },
  colliders: ColliderBox[],
  groundHeightAt: (x: number, z: number, curY: number) => number
): void {
  if (m.aiState === 'vanished') {
    m.root.visible = false;
    m.vanishCooldown = Math.max(0, m.vanishCooldown - dt);
    return;
  }
  m.root.visible = true;

  if (m.type === 'shadow_walker' || m.type === 'silent_student') {
    // Watch player silently with slight head tilt
    const dx = playerPos.x - m.root.position.x;
    const dz = playerPos.z - m.root.position.z;
    m.root.rotation.y = Math.atan2(-dx, -dz);
    m.animTime += dt * 1.8;
    m.head.rotation.z = Math.sin(m.animTime * 0.7) * (m.type === 'shadow_walker' ? 0.16 : 0.06);
    m.leftArm.rotation.x = Math.sin(m.animTime * 0.5) * 0.05;
    m.rightArm.rotation.x = -Math.sin(m.animTime * 0.5) * 0.05;
    return;
  }

  let target = m.waypoints[m.waypointIndex];
  if (m.aiState === 'chase') {
    target = { x: playerPos.x, y: playerPos.y, z: playerPos.z };
  } else if ((m.aiState === 'investigate' || m.aiState === 'search') && m.investigateTarget) {
    target = m.investigateTarget;
  }

  // Keep patrol on compatible elevation when far away
  const dx = target.x - m.root.position.x;
  const dz = target.z - m.root.position.z;
  const dist2d = Math.hypot(dx, dz);

  if (dist2d < 0.7 && m.aiState === 'patrol') {
    m.waypointIndex = (m.waypointIndex + 1) % m.waypoints.length;
  }

  const speed = m.aiState === 'chase' ? m.chaseSpeed : m.baseSpeed;
  if (dist2d > 0.15) {
    const stepX = (dx / dist2d) * speed * dt;
    const stepZ = (dz / dist2d) * speed * dt;
    const resolved = resolvePlayerMovement(
      { x: m.root.position.x, y: m.root.position.y, z: m.root.position.z },
      { dx: stepX, dz: stepZ },
      0.34,
      colliders
    );
    m.root.position.x = resolved.x;
    m.root.position.z = resolved.z;
    m.root.position.y = groundHeightAt(resolved.x, resolved.z, m.root.position.y);
    m.root.rotation.y = Math.atan2(-dx, -dz);
  }

  // Distinct movement animations
  m.animTime += dt * (m.aiState === 'chase' ? 11.5 : 6.0);
  if (m.type === 'crawler') {
    m.leftArm.rotation.x = Math.sin(m.animTime) * 0.75;
    m.rightArm.rotation.x = -Math.sin(m.animTime) * 0.75;
    m.leftLeg.rotation.x = -Math.sin(m.animTime) * 0.75;
    m.rightLeg.rotation.x = Math.sin(m.animTime) * 0.75;
    m.body.rotation.z = Math.sin(m.animTime * 0.5) * 0.12;
  } else {
    // Hallway Stalker menacing lurch
    m.leftLeg.rotation.x = Math.sin(m.animTime) * 0.58;
    m.rightLeg.rotation.x = -Math.sin(m.animTime) * 0.58;
    m.leftArm.rotation.x = -Math.sin(m.animTime) * 0.45 + (m.aiState === 'chase' ? 0.65 : 0);
    m.rightArm.rotation.x = Math.sin(m.animTime) * 0.45 + (m.aiState === 'chase' ? 0.65 : 0);
    m.head.rotation.z = Math.sin(m.animTime * 0.45) * 0.22;
  }
}
