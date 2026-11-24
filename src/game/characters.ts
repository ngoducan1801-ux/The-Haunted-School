import * as THREE from 'three';
import type { CharacterId, FlashlightBrightness, PlayerAnimState } from '../types/game';
import { getCharacterProfile, getFlashlightBeamConfig } from './rules';

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  flashlightCone: THREE.Mesh;
  flashlightLight: THREE.SpotLight | null;
  flashlightTarget: THREE.Object3D;
  animTime: number;
}

/**
 * Builds a composite 12+ part procedural 3D character model (bottom-center pivoted at y=0)
 * tailored to each of the 5 playable characters: TY, NAM, HOA, HAI, PHUONG.
 */
export function createCharacterModel(
  characterId: CharacterId,
  withSpotLight = false,
  beamTexture?: THREE.Texture | null
): CharacterRig {
  const profile = getCharacterProfile(characterId);
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: profile.colors.skin,
    roughness: 0.72,
    metalness: 0.02,
  });
  const primaryMat = new THREE.MeshStandardMaterial({
    color: profile.colors.primary,
    roughness: 0.78,
    metalness: 0.04,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: profile.colors.secondary,
    roughness: 0.84,
    metalness: 0.02,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color:
      characterId === 'ty'
        ? '#2b2623'
        : characterId === 'nam'
          ? '#1e242c'
          : characterId === 'hoa'
            ? '#232422'
            : characterId === 'hai'
              ? '#2b3036'
              : '#1b1d24',
    roughness: 0.86,
    metalness: 0.02,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: profile.colors.accent,
    roughness: characterId === 'ty' || characterId === 'nam' ? 0.25 : 0.65,
    metalness: characterId === 'ty' || characterId === 'nam' ? 0.8 : 0.12,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: profile.colors.hair,
    roughness: 0.88,
    metalness: 0.02,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x16171a,
    roughness: 0.52,
    metalness: 0.15,
  });

  // Character-specific body proportions
  const isTy = characterId === 'ty';
  const isHai = characterId === 'hai';
  const isPhuong = characterId === 'phuong';
  const isHoa = characterId === 'hoa';
  const isNam = characterId === 'nam';

  const torsoWidth = isTy ? 0.44 : isHai ? 0.39 : isPhuong || isHoa ? 0.31 : 0.34;
  const torsoDepth = isTy ? 0.29 : isHai ? 0.23 : 0.2;
  const legSpread = isTy ? 0.12 : 0.095;

  const hips = new THREE.Group();
  hips.position.set(0, 0.86, 0);
  root.add(hips);

  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(torsoWidth * 0.92, 0.16, torsoDepth * 0.9),
    pantsMat
  );
  pelvis.castShadow = true;
  hips.add(pelvis);

  // Legs (left & right hip pivots)
  const makeLeg = (xOff: number): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, -0.04, 0);
    const legW = isTy ? 0.145 : 0.12;
    const legUpperMat = isPhuong ? skinMat : pantsMat;
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(legW, 0.42, legW), legUpperMat);
    thigh.position.set(0, -0.22, 0);
    thigh.castShadow = true;
    const shin = new THREE.Mesh(
      new THREE.BoxGeometry(legW * 0.92, 0.38, legW * 0.92),
      isPhuong ? skinMat : pantsMat
    );
    shin.position.set(0, -0.58, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(legW * 1.02, 0.09, 0.22), shoeMat);
    shoe.position.set(0, -0.78, -0.04);
    legPivot.add(thigh, shin, shoe);
    return legPivot;
  };
  const leftLeg = makeLeg(-legSpread);
  const rightLeg = makeLeg(legSpread);
  hips.add(leftLeg, rightLeg);

  // Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.08, 0);
  hips.add(torso);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(torsoWidth, 0.48, torsoDepth),
    primaryMat
  );
  chest.position.set(0, 0.24, 0);
  chest.castShadow = true;
  torso.add(chest);

  // Character-distinct torso accents
  if (isTy) {
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 12, 10),
      primaryMat
    );
    belly.scale.set(1.1, 0.9, 0.78);
    belly.position.set(0, 0.16, -0.05);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), shirtMat);
    collar.position.set(0, 0.47, -0.01);
    torso.add(belly, collar);
  } else if (isNam) {
    const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.03), shirtMat);
    shirtFront.position.set(0, 0.28, -(torsoDepth / 2 + 0.005));
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.04), hairMat);
    tie.position.set(0, 0.26, -(torsoDepth / 2 + 0.015));
    torso.add(shirtFront, tie);
  } else if (isHoa) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, torsoDepth + 0.04), accentMat);
    strap.rotation.z = 0.55;
    strap.position.set(0, 0.24, 0);
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.22), accentMat);
    satchel.position.set(-torsoWidth / 2 - 0.04, 0.04, 0.02);
    torso.add(strap, satchel);
  } else if (isHai) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(torsoWidth + 0.015, 0.06, torsoDepth + 0.015),
      accentMat
    );
    stripe.position.set(0, 0.36, 0);
    torso.add(stripe);
  } else if (isPhuong) {
    const blouse = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.03), shirtMat);
    blouse.position.set(0, 0.26, -(torsoDepth / 2 + 0.005));
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(torsoWidth * 0.52, torsoWidth * 0.72, 0.36, 12),
      pantsMat
    );
    skirt.position.set(0, -0.14, 0);
    torso.add(blouse, skirt);
  }

  // Head & Face
  const head = new THREE.Group();
  head.position.set(0, 0.52, 0);
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.1, 8), skinMat);
  neck.position.set(0, 0.04, 0);
  const skull = new THREE.Mesh(
    new THREE.BoxGeometry(isTy ? 0.23 : 0.2, 0.23, isTy ? 0.22 : 0.2),
    skinMat
  );
  skull.position.set(0, 0.19, 0);
  skull.castShadow = true;
  head.add(neck, skull);

  // Eyes (facing -Z local forward)
  const eyeGeo = new THREE.BoxGeometry(0.032, 0.024, 0.02);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.2 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.045, 0.2, -0.102);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.045, 0.2, -0.102);
  head.add(eyeL, eyeR);

  // Distinct Hair & Facial Accessories
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.09, 0.225), hairMat);
  hairTop.position.set(0, 0.3, 0.005);
  const hairBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, isPhuong ? 0.26 : isHoa ? 0.18 : 0.12, 0.08),
    hairMat
  );
  hairBack.position.set(0, isPhuong ? 0.18 : 0.22, 0.085);
  head.add(hairTop, hairBack);

  if (isNam) {
    const lensGeo = new THREE.BoxGeometry(0.062, 0.042, 0.014);
    const glassL = new THREE.Mesh(lensGeo, accentMat);
    glassL.position.set(-0.048, 0.2, -0.115);
    const glassR = new THREE.Mesh(lensGeo, accentMat);
    glassR.position.set(0.048, 0.2, -0.115);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.012), accentMat);
    bridge.position.set(0, 0.205, -0.115);
    head.add(glassL, glassR, bridge);
  }
  if (isPhuong) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), accentMat);
    clip.position.set(0.09, 0.27, -0.05);
    head.add(clip);
  }

  // Arms
  const makeArm = (xOff: number, isRight: boolean): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOff, 0.44, 0);
    const sleeveMat = isTy ? shirtMat : primaryMat;
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), sleeveMat);
    armMesh.position.set(0, -0.18, 0);
    armMesh.castShadow = true;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.085), skinMat);
    hand.position.set(0, -0.42, 0);
    armPivot.add(armMesh, hand);

    if (isRight && isTy) {
      const watch = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.03, 0.095), accentMat);
      watch.position.set(0, -0.35, 0);
      armPivot.add(watch);
    }
    if (isHai) {
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.05, 0.096), accentMat);
      tape.position.set(0, -0.36, 0);
      armPivot.add(tape);
    }
    return armPivot;
  };

  const leftArm = makeArm(-(torsoWidth / 2 + 0.065), false);
  const rightArm = makeArm(torsoWidth / 2 + 0.065, true);
  torso.add(leftArm, rightArm);

  // Flashlight in Right Hand: points down arm's -Y axis so raising arm (+rotation.x) aims forward (-Z)!
  const flashBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.026, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x22252a, metalness: 0.7, roughness: 0.35 })
  );
  flashBody.position.set(0, -0.49, 0);
  const flashLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.02, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfff3d4,
      emissive: 0xffe4a8,
      emissiveIntensity: 1.4,
    })
  );
  flashLens.position.set(0, -0.585, 0);
  rightArm.add(flashBody, flashLens);

  // Volumetric beam cone extending forward along -Y from the flashlight lens
  const defaultBeam = getFlashlightBeamConfig(2);
  const coneGeo = new THREE.ConeGeometry(defaultBeam.coneRadius, defaultBeam.coneLength, 24, 1, true);
  coneGeo.translate(0, -defaultBeam.coneLength / 2, 0);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c9,
    transparent: true,
    opacity: defaultBeam.coneOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flashlightCone = new THREE.Mesh(coneGeo, coneMat);
  flashlightCone.position.set(0, -0.59, 0);
  rightArm.add(flashlightCone);

  let flashlightLight: THREE.SpotLight | null = null;
  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, -10, 0);
  rightArm.add(flashlightTarget);

  if (withSpotLight) {
    flashlightLight = new THREE.SpotLight(
      0xfff1d6,
      defaultBeam.intensity * 0.72,
      defaultBeam.distance * 0.78,
      defaultBeam.spotAngleRad,
      defaultBeam.penumbra,
      defaultBeam.decay
    );
    if (beamTexture) {
      flashlightLight.map = beamTexture;
    }
    flashlightLight.position.set(0, -0.59, 0);
    flashlightLight.target = flashlightTarget;
    rightArm.add(flashlightLight);
  }

  return {
    root,
    hips,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    flashlightCone,
    flashlightLight,
    flashlightTarget,
    animTime: Math.random() * 10,
  };
}

/**
 * Updates individual character limb animations for idle, walk, sprint, crouch, hide & flashlight aim.
 */
export function animateCharacterRig(
  rig: CharacterRig,
  dt: number,
  animState: PlayerAnimState,
  pitch: number,
  flashlightOn: boolean,
  flashlightBrightness: FlashlightBrightness = 2
): void {
  const speed =
    animState === 'sprint'
      ? 11.5
      : animState === 'walk'
        ? 7.0
        : animState === 'crouch'
          ? 4.6
          : 2.1;
  rig.animTime += dt * speed;

  const isMoving = animState === 'walk' || animState === 'sprint';
  const amp = animState === 'sprint' ? 0.72 : animState === 'walk' ? 0.45 : 0;

  // Leg swing
  rig.leftLeg.rotation.x = Math.sin(rig.animTime) * amp;
  rig.rightLeg.rotation.x = -Math.sin(rig.animTime) * amp;

  // Left arm counter-swing, right arm aims flashlight directly forward along teammate yaw + pitch
  rig.leftArm.rotation.x = -Math.sin(rig.animTime) * amp * 0.85;
  const armSway = isMoving ? Math.sin(rig.animTime * 0.5) * 0.02 : 0;
  rig.rightArm.rotation.x = Math.PI * 0.5 + pitch * 0.85 + armSway;

  // Crouch / breathing vertical offset
  const targetHipsY = animState === 'crouch' || animState === 'hide' ? 0.56 : 0.86;
  const bob = isMoving ? Math.abs(Math.sin(rig.animTime)) * 0.045 : Math.sin(rig.animTime) * 0.014;
  rig.hips.position.y = THREE.MathUtils.damp(rig.hips.position.y, targetHipsY + bob, 10, dt);

  rig.torso.rotation.x = animState === 'crouch' ? 0.22 : animState === 'sprint' ? 0.12 : 0;
  rig.head.rotation.x = pitch * 0.65;

  const beam = getFlashlightBeamConfig(flashlightBrightness);
  const coneMat = rig.flashlightCone.material as THREE.MeshBasicMaterial;
  rig.flashlightCone.visible = flashlightOn && animState !== 'hide';
  if (rig.flashlightCone.visible) {
    const scaleFactor = flashlightBrightness === 1 ? 0.82 : flashlightBrightness === 3 ? 1.18 : 1.0;
    rig.flashlightCone.scale.set(scaleFactor, scaleFactor, scaleFactor);
    coneMat.opacity = beam.coneOpacity;
  }

  if (rig.flashlightLight) {
    rig.flashlightLight.angle = beam.spotAngleRad;
    rig.flashlightLight.distance = beam.distance * 0.78;
    rig.flashlightLight.penumbra = beam.penumbra;
    rig.flashlightLight.decay = beam.decay;
    rig.flashlightLight.intensity = flashlightOn && animState !== 'hide' ? beam.intensity * 0.72 : 0;
  }
}

export function drawNameplateCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  characterName: string,
  hp: number,
  maxHp: number,
  isDowned: boolean
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(7, 9, 13, 0.82)';
  ctx.fillRect(28, 12, 456, 108);
  ctx.strokeStyle = isDowned ? 'rgba(239, 68, 68, 0.75)' : 'rgba(212, 212, 216, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 12, 456, 108);

  ctx.font = 'bold 30px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f4f5';
  ctx.fillText(name.slice(0, 16), 256, 46);

  ctx.font = '20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = isDowned ? '#f87171' : '#fbbf24';
  const hpLabel = isDowned ? `${characterName} · DOWNED (0 HP)` : `${characterName} · ${Math.max(0, Math.round(hp))}/${maxHp}`;
  ctx.fillText(hpLabel, 256, 74);

  // Compact health bar beneath label
  const barX = 64;
  const barY = 86;
  const barW = 384;
  const barH = 16;
  ctx.fillStyle = '#18181b';
  ctx.fillRect(barX, barY, barW, barH);
  const pct = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  ctx.fillStyle = pct > 0.55 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  if (pct > 0) {
    ctx.fillRect(barX + 2, barY + 2, Math.max(4, (barW - 4) * pct), barH - 4);
  }
}

/**
 * Creates a crisp floating player display-name & health bar sprite positioned above a teammate's head.
 */
export function createNameplateSprite(
  name: string,
  characterName: string,
  hp = 1000,
  maxHp = 1000,
  isDowned = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 132;
  drawNameplateCanvas(canvas, name, characterName, hp, maxHp, isDowned);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.55, 0.4, 1);
  sprite.position.set(0, 2.2, 0);
  sprite.userData = { canvas, name, characterName, lastHp: hp, lastDowned: isDowned };
  return sprite;
}

export function updateNameplateHealth(
  sprite: THREE.Sprite,
  hp: number,
  maxHp: number,
  isDowned: boolean
): void {
  const ud = sprite.userData as {
    canvas?: HTMLCanvasElement;
    name?: string;
    characterName?: string;
    lastHp?: number;
    lastDowned?: boolean;
  };
  if (!ud.canvas || (ud.lastHp === hp && ud.lastDowned === isDowned)) return;
  ud.lastHp = hp;
  ud.lastDowned = isDowned;
  drawNameplateCanvas(ud.canvas, ud.name ?? '', ud.characterName ?? '', hp, maxHp, isDowned);
  const mat = sprite.material as THREE.SpriteMaterial;
  if (mat.map) mat.map.needsUpdate = true;
}

