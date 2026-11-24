import * as THREE from 'three';

export interface ProceduralMaterialLibrary {
  plasterWall: THREE.MeshStandardMaterial;
  corridorTile: THREE.MeshStandardMaterial;
  woodFloor: THREE.MeshStandardMaterial;
  basementConcrete: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  darkWood: THREE.MeshStandardMaterial;
  wornWood: THREE.MeshStandardMaterial;
  rustedMetal: THREE.MeshStandardMaterial;
  lockerSteel: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  chalkboard: THREE.MeshStandardMaterial;
  glassPane: THREE.MeshPhysicalMaterial;
  crtScreen: THREE.MeshStandardMaterial;
  emissiveTubeOn: THREE.MeshStandardMaterial;
  emissiveTubeOff: THREE.MeshStandardMaterial;
  exitSign: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  foliageDead: THREE.MeshStandardMaterial;
  setTextureAnisotropy: (anisotropy: number) => void;
  dispose: () => void;
}

function makeCanvasTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  size: number,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createMaterialLibrary(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): ProceduralMaterialLibrary {
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const trackTex = (t: THREE.Texture) => {
    textures.push(t);
    return t;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // 1. Aged cracked institutional plaster wall + lower wainscot dado
  const plasterColor = trackTex(
    makeCanvasTexture(
      (ctx, w, h) => {
        // Upper faded institutional plaster
        ctx.fillStyle = '#4e544d';
        ctx.fillRect(0, 0, w, h * 0.62);
        // Lower darker painted wainscot
        ctx.fillStyle = '#2d3330';
        ctx.fillRect(0, h * 0.62, w, h * 0.38);
        // Chair rail trim
        ctx.fillStyle = '#1f2321';
        ctx.fillRect(0, h * 0.61, w, 6);

        // Damp grime gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(12, 14, 14, 0.45)');
        grad.addColorStop(0.5, 'rgba(25, 28, 26, 0.08)');
        grad.addColorStop(1, 'rgba(10, 12, 11, 0.65)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Fine vertical water stains and grime streaks
        for (let i = 0; i < 85; i++) {
          const sx = Math.random() * w;
          const sy = Math.random() * h * 0.6;
          const sw = 1 + Math.random() * 4;
          const sh = 14 + Math.random() * 55;
          ctx.fillStyle = i % 3 === 0 ? 'rgba(16, 18, 16, 0.22)' : 'rgba(92, 98, 90, 0.1)';
          ctx.fillRect(sx, sy, sw, sh);
        }

        // Subtle fine plaster grain
        for (let i = 0; i < 400; i++) {
          const v = 35 + Math.floor(Math.random() * 65);
          ctx.fillStyle = `rgba(${v},${v + 2},${v},0.14)`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }

        // Hairline cracks
        ctx.strokeStyle = 'rgba(16, 17, 15, 0.5)';
        ctx.lineWidth = 1.1;
        for (let c = 0; c < 10; c++) {
          let cx = Math.random() * w;
          let cy = Math.random() * h;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          for (let s = 0; s < 5; s++) {
            cx += (Math.random() - 0.5) * 26;
            cy += (Math.random() - 0.5) * 26;
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }
      },
      256,
      true,
      3,
      1,
      maxAnisotropy
    )
  );

  const plasterBump = trackTex(
    makeCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 240; i++) {
          const v = 90 + Math.floor(Math.random() * 75);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 14, 4 + Math.random() * 14);
        }
      },
      256,
      false,
      3,
      1.5,
      maxAnisotropy
    )
  );

  // 2. Scuffed school corridor terrazzo/linoleum tile
  const tileColor = trackTex(
    makeCanvasTexture(
      (ctx, w, h) => {
        const tiles = 4;
        const step = w / tiles;
        for (let y = 0; y < tiles; y++) {
          for (let x = 0; x < tiles; x++) {
            const alt = (x + y) % 2 === 0;
            ctx.fillStyle = alt ? '#4f5350' : '#3a3e3c';
            ctx.fillRect(x * step, y * step, step, step);
            ctx.strokeStyle = '#232524';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * step, y * step, step, step);
          }
        }
        // Scuffs and grime
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = 'rgba(20, 20, 18, 0.22)';
          ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 18, 2 + Math.random() * 10);
        }
      },
      256,
      true,
      6,
      6,
      maxAnisotropy
    )
  );

  // 3. Weathered classroom wood plank floor
  const woodColor = trackTex(
    makeCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#473324';
        ctx.fillRect(0, 0, w, h);
        const planks = 6;
        const ph = h / planks;
        for (let p = 0; p < planks; p++) {
          ctx.fillStyle = p % 2 === 0 ? '#4e3726' : '#3e2b1d';
          ctx.fillRect(0, p * ph, w, ph - 2);
          ctx.fillStyle = '#1f140d';
          ctx.fillRect(0, (p + 1) * ph - 2, w, 2);
          for (let g = 0; g < 18; g++) {
            ctx.fillStyle = 'rgba(22, 13, 8, 0.22)';
            ctx.fillRect(0, p * ph + Math.random() * (ph - 4), w, 1.5);
          }
        }
      },
      256,
      true,
      4,
      4,
      maxAnisotropy
    )
  );

  // 4. Concrete basement & exterior asphalt
  const concreteColor = trackTex(
    makeCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#36393b';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 220; i++) {
          const v = 35 + Math.floor(Math.random() * 35);
          ctx.fillStyle = `rgba(${v},${v + 2},${v + 3},0.32)`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 4 + Math.random() * 16, 4 + Math.random() * 16);
        }
      },
      256,
      true,
      5,
      5,
      maxAnisotropy
    )
  );

  const plasterWall = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: plasterColor,
      bumpMap: plasterBump,
      bumpScale: 0.035,
      roughness: 0.88,
      metalness: 0.04,
    })
  );

  const corridorTile = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tileColor,
      bumpMap: plasterBump,
      bumpScale: 0.015,
      roughness: 0.42,
      metalness: 0.08,
    })
  );

  const woodFloor = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodColor,
      bumpMap: woodColor,
      bumpScale: 0.025,
      roughness: 0.68,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const basementConcrete = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: concreteColor,
      bumpMap: plasterBump,
      bumpScale: 0.04,
      roughness: 0.92,
      metalness: 0.05,
    })
  );

  const asphalt = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7c8288,
      map: concreteColor,
      bumpMap: plasterBump,
      bumpScale: 0.05,
      roughness: 0.94,
      metalness: 0.02,
    })
  );

  const darkWood = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b2619,
      roughness: 0.62,
      metalness: 0.06,
    })
  );

  const wornWood = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x61442c,
      roughness: 0.72,
      metalness: 0.04,
    })
  );

  const rustedMetal = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x4b433d,
      roughness: 0.58,
      metalness: 0.68,
    })
  );

  const lockerSteel = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3f4c52,
      roughness: 0.44,
      metalness: 0.62,
    })
  );

  const brass = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb89347,
      roughness: 0.24,
      metalness: 0.88,
    })
  );

  const chalkTex = trackTex(
    makeCanvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#18241d';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(215, 225, 212, 0.25)';
        for (let i = 0; i < 40; i++) {
          ctx.fillRect(Math.random() * w, Math.random() * h, 12 + Math.random() * 45, 2);
        }
        ctx.font = 'bold 20px serif';
        ctx.fillStyle = 'rgba(226, 232, 224, 0.65)';
        ctx.fillText('ROOM 102 - DO NOT STAY', 16, 60);
        ctx.fillText('CHECK THE LIBRARY', 28, 120);
        ctx.fillText('BASEMENT LOCKED', 24, 175);
      },
      256,
      true,
      1,
      1,
      maxAnisotropy
    )
  );

  const chalkboard = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: chalkTex,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  const glassPane = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x9bb3c2,
      roughness: 0.14,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.9,
      ior: 1.5,
      thickness: 0.15,
    })
  );

  const crtScreen = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0e241b,
      emissive: 0x1b6643,
      emissiveIntensity: 0.85,
      roughness: 0.18,
      metalness: 0.1,
    })
  );

  const emissiveTubeOn = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9e6ea,
      emissive: 0xcbe4ec,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    })
  );

  const emissiveTubeOff = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x454a4d,
      emissive: 0x000000,
      roughness: 0.45,
    })
  );

  const exitSign = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e5e32,
      emissive: 0x29a34c,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    })
  );

  const paper = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9cfb8,
      roughness: 0.92,
      metalness: 0.0,
    })
  );

  const fabric = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x565c59,
      roughness: 0.95,
      metalness: 0.0,
    })
  );

  const foliageDead = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2c241e,
      roughness: 0.92,
      metalness: 0.02,
    })
  );

  return {
    plasterWall,
    corridorTile,
    woodFloor,
    basementConcrete,
    asphalt,
    darkWood,
    wornWood,
    rustedMetal,
    lockerSteel,
    brass,
    chalkboard,
    glassPane,
    crtScreen,
    emissiveTubeOn,
    emissiveTubeOff,
    exitSign,
    paper,
    fabric,
    foliageDead,
    setTextureAnisotropy: (anisotropy: number) => {
      const clamped = Math.max(1, anisotropy);
      textures.forEach((t) => {
        t.anisotropy = clamped;
        t.needsUpdate = true;
      });
    },
    dispose: () => {
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

/**
 * Generates a high-resolution circular radial beam cookie texture for SpotLight.map.
 * Fades smoothly to #000000 inside the inscribed circle so no square/polygonal boundary can appear.
 */
export function createFlashlightBeamTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  const c = size / 2;
  const maxR = size * 0.485;
  const grad = ctx.createRadialGradient(c, c, size * 0.02, c, c, maxR);
  grad.addColorStop(0.0, 'rgba(255, 254, 248, 1.0)');
  grad.addColorStop(0.45, 'rgba(255, 250, 238, 0.98)');
  grad.addColorStop(0.7, 'rgba(255, 246, 224, 0.85)');
  grad.addColorStop(0.86, 'rgba(255, 238, 206, 0.48)');
  grad.addColorStop(0.95, 'rgba(248, 224, 186, 0.16)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, maxR, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Composite 5-part Hinged Door with Wall Frame Jambs, Handle, Kickplate & Transom Window
 */
export function createDoorAssembly(
  mats: ProceduralMaterialLibrary,
  isMetalDoor = false,
  isExit = false
): { group: THREE.Group; hingePivot: THREE.Group; hitMesh: THREE.Mesh } {
  const group = new THREE.Group();
  const doorMat = isMetalDoor ? mats.lockerSteel : mats.darkWood;

  // Frame Jambs (left, right, top)
  const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.55, 0.24), mats.wornWood);
  leftJamb.position.set(-0.67, 1.275, 0);
  const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.55, 0.24), mats.wornWood);
  rightJamb.position.set(0.67, 1.275, 0);
  const topJamb = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.15, 0.24), mats.wornWood);
  topJamb.position.set(0, 2.475, 0);
  group.add(leftJamb, rightJamb, topJamb);

  // Hinge pivot positioned at left inner edge
  const hingePivot = new THREE.Group();
  hingePivot.position.set(-0.58, 0, 0);

  // Door leaf
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.38, 0.08), doorMat);
  leaf.position.set(0.58, 1.19, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;

  // Kickplate
  const kickplate = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.22, 0.095), mats.rustedMetal);
  kickplate.position.set(0.58, 0.12, 0);

  // Window inset
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.092), mats.glassPane);
  glass.position.set(0.58, 1.72, 0);

  // Brass lever handle (front & back)
  const handleF = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.16), mats.brass);
  handleF.position.set(1.03, 1.05, 0);

  hingePivot.add(leaf, kickplate, glass, handleF);
  group.add(hingePivot);

  if (isExit) {
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.1), mats.exitSign);
    signBox.position.set(0, 2.72, 0.08);
    group.add(signBox);
  }

  return { group, hingePivot, hitMesh: leaf };
}

/**
 * Composite 7-part School Desk & Chair (bottom-center pivoted at y=0)
 */
export function createSchoolDeskAssembly(
  mats: ProceduralMaterialLibrary,
  toppled = false
): THREE.Group {
  const group = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8);
  const offsets: [number, number][] = [
    [-0.32, -0.22],
    [0.32, -0.22],
    [-0.32, 0.22],
    [0.32, 0.22],
  ];
  offsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, mats.rustedMetal);
    leg.position.set(lx, 0.36, lz);
    group.add(leg);
  });

  const desktop = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.045, 0.52), mats.wornWood);
  desktop.position.set(0, 0.74, 0);
  desktop.castShadow = true;
  desktop.receiveShadow = true;

  const bookBox = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.42), mats.darkWood);
  bookBox.position.set(0, 0.65, 0);

  // Attached chair behind desk
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.4), mats.wornWood);
  seat.position.set(0, 0.44, 0.52);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.04), mats.wornWood);
  back.position.set(0, 0.72, 0.7);

  group.add(desktop, bookBox, seat, back);

  if (toppled) {
    group.rotation.z = Math.PI * 0.44;
    group.position.y = 0.36;
  }
  return group;
}

/**
 * Composite 6-part Hiding Locker (door swings open cleanly so camera can hide inside)
 */
export function createLockerAssembly(
  mats: ProceduralMaterialLibrary
): { group: THREE.Group; doorPivot: THREE.Group; hitMesh: THREE.Mesh } {
  const group = new THREE.Group();

  // Back, sides, top, bottom forming hollow interior
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.15, 0.05), mats.lockerSteel);
  back.position.set(0, 1.075, -0.35);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.15, 0.75), mats.lockerSteel);
  left.position.set(-0.405, 1.075, 0);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.15, 0.75), mats.lockerSteel);
  right.position.set(0.405, 1.075, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 0.75), mats.lockerSteel);
  top.position.set(0, 2.12, 0);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 0.75), mats.lockerSteel);
  bottom.position.set(0, 0.03, 0);

  group.add(back, left, right, top, bottom);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.38, 0, 0.36);

  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.76, 2.04, 0.04), mats.lockerSteel);
  doorLeaf.position.set(0.38, 1.05, 0);
  doorLeaf.castShadow = true;

  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.07), mats.brass);
  latch.position.set(0.68, 1.05, 0.02);

  // Louvered vent trim
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.055), mats.rustedMetal);
  vent.position.set(0.38, 1.72, 0.01);

  doorPivot.add(doorLeaf, latch, vent);
  group.add(doorPivot);

  return { group, doorPivot, hitMesh: doorLeaf };
}

/**
 * Composite 8-part Bookshelf with books
 */
export function createBookshelfAssembly(
  mats: ProceduralMaterialLibrary
): THREE.Group {
  const group = new THREE.Group();
  const sideGeo = new THREE.BoxGeometry(0.06, 2.35, 0.45);
  const left = new THREE.Mesh(sideGeo, mats.darkWood);
  left.position.set(-0.87, 1.175, 0);
  const right = new THREE.Mesh(sideGeo, mats.darkWood);
  right.position.set(0.87, 1.175, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.35, 0.04), mats.darkWood);
  back.position.set(0, 1.175, -0.205);
  group.add(left, right, back);

  const shelfGeo = new THREE.BoxGeometry(1.72, 0.05, 0.42);
  const bookColors = [0x5e2b2b, 0x2b4538, 0x2d3c57, 0x5c4a2b, 0x3b3545];
  for (let s = 0; s < 4; s++) {
    const sy = 0.25 + s * 0.62;
    const shelf = new THREE.Mesh(shelfGeo, mats.wornWood);
    shelf.position.set(0, sy, 0);
    shelf.receiveShadow = true;
    group.add(shelf);

    // Cluster of books on each shelf
    for (let b = 0; b < 5; b++) {
      const bookMat = new THREE.MeshStandardMaterial({
        color: bookColors[(s + b) % bookColors.length],
        roughness: 0.82,
      });
      const bh = 0.24 + ((b * 37) % 10) * 0.01;
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.08, bh, 0.24), bookMat);
      book.position.set(-0.62 + b * 0.28, sy + bh * 0.5 + 0.025, 0.04);
      group.add(book);
    }
  }
  return group;
}

/**
 * Composite 6-part Lab Bench with Glassware
 */
export function createLabBenchAssembly(mats: ProceduralMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.84, 0.86), mats.darkWood);
  base.position.set(0, 0.42, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.07, 0.94), mats.basementConcrete);
  top.position.set(0, 0.875, 0);
  top.castShadow = true;
  top.receiveShadow = true;

  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 8), mats.brass);
  faucet.position.set(-0.85, 1.05, -0.25);

  const beaker1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.22, 12), mats.glassPane);
  beaker1.position.set(0.25, 1.02, 0.08);

  const flask = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 12), mats.glassPane);
  flask.position.set(0.55, 1.03, -0.05);

  group.add(base, top, faucet, beaker1, flask);
  return group;
}

/**
 * Composite 6-part CRT Computer Station
 */
export function createComputerStation(
  mats: ProceduralMaterialLibrary
): { group: THREE.Group; hitMesh: THREE.Mesh } {
  const group = new THREE.Group();
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.78), mats.wornWood);
  desk.position.set(0, 0.74, 0);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.72), mats.rustedMetal);
  legL.position.set(-0.62, 0.37, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.72), mats.rustedMetal);
  legR.position.set(0.62, 0.37, 0);

  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.48, 0.46), mats.lockerSteel);
  tower.position.set(0.45, 1.01, -0.05);

  const monitorBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.4), mats.paper);
  monitorBody.position.set(-0.1, 0.98, -0.08);

  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.02), mats.crtScreen);
  screen.position.set(-0.1, 0.99, 0.125);

  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.025, 0.16), mats.paper);
  kb.position.set(-0.1, 0.785, 0.22);

  group.add(desk, legL, legR, tower, monitorBody, screen, kb);
  return { group, hitMesh: monitorBody };
}

/**
 * Composite 5-part Filing Cabinet / Drawer Unit
 */
export function createFilingCabinet(
  mats: ProceduralMaterialLibrary
): { group: THREE.Group; topDrawer: THREE.Mesh; hitMesh: THREE.Mesh } {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.38, 0.64), mats.lockerSteel);
  body.position.set(0, 0.69, 0);
  body.castShadow = true;

  const topDrawer = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.56), mats.rustedMetal);
  topDrawer.position.set(0, 1.12, 0.06);

  const drawer2 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.04), mats.rustedMetal);
  drawer2.position.set(0, 0.74, 0.33);
  const drawer3 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.32, 0.04), mats.rustedMetal);
  drawer3.position.set(0, 0.36, 0.33);

  const pull = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), mats.brass);
  pull.position.set(0, 0.02, 0.29);
  topDrawer.add(pull);

  group.add(body, topDrawer, drawer2, drawer3);
  return { group, topDrawer, hitMesh: topDrawer };
}

/**
 * Composite 5-part Infirmary Hospital Bed
 */
export function createHospitalBed(mats: ProceduralMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 2.05), mats.rustedMetal);
  frame.position.set(0, 0.42, 0);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.18, 1.96), mats.fabric);
  mattress.position.set(0, 0.56, 0);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.32), mats.paper);
  pillow.position.set(0, 0.69, -0.72);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.85, 0.06), mats.lockerSteel);
  head.position.set(0, 0.48, -1.02);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.62, 0.06), mats.lockerSteel);
  foot.position.set(0, 0.36, 1.02);

  group.add(frame, mattress, pillow, head, foot);
  return group;
}

/**
 * Composite 4-part Cafeteria Table
 */
export function createCafeteriaTable(mats: ProceduralMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.9), mats.paper);
  top.position.set(0, 0.76, 0);
  const benchL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.32), mats.wornWood);
  benchL.position.set(0, 0.44, -0.66);
  const benchR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.32), mats.wornWood);
  benchR.position.set(0, 0.44, 0.66);
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 1.4), mats.rustedMetal);
  leg1.position.set(-0.9, 0.375, 0);
  const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 1.4), mats.rustedMetal);
  leg2.position.set(0.9, 0.375, 0);

  group.add(top, benchL, benchR, leg1, leg2);
  return group;
}

/**
 * Composite Playground Swing Set & Twisted Dead Tree for Outdoor Courtyard
 */
export function createPlaygroundSwing(mats: ProceduralMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 10), mats.rustedMetal);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(0, 2.8, 0);

  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.1, 8);
  const legs = [
    [-2.0, 1.4, -0.65, 0.22],
    [-2.0, 1.4, 0.65, -0.22],
    [2.0, 1.4, -0.65, 0.22],
    [2.0, 1.4, 0.65, -0.22],
  ];
  legs.forEach(([x, y, z, rx]) => {
    const l = new THREE.Mesh(legGeo, mats.rustedMetal);
    l.position.set(x, y, z);
    l.rotation.x = rx;
    group.add(l);
  });

  // Hanging chains + seats
  [-0.85, 0.85].forEach((sx) => {
    const chainL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.1, 6), mats.brass);
    chainL.position.set(sx - 0.22, 1.75, 0);
    const chainR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.1, 6), mats.brass);
    chainR.position.set(sx + 0.22, 1.75, 0);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.22), mats.darkWood);
    seat.position.set(sx, 0.7, 0);
    group.add(chainL, chainR, seat);
  });

  group.add(topBar);
  return group;
}

export function createDeadTree(mats: ProceduralMaterialLibrary, seed = 1): THREE.Group {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 4.4, 8), mats.foliageDead);
  trunk.position.set(0, 2.2, 0);
  trunk.rotation.z = (seed % 2 === 0 ? 1 : -1) * 0.06;
  group.add(trunk);

  for (let b = 0; b < 4; b++) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 2.1, 6), mats.foliageDead);
    branch.position.set(Math.cos(b * 1.6 + seed) * 0.6, 3.8 + b * 0.22, Math.sin(b * 1.6 + seed) * 0.6);
    branch.rotation.z = Math.cos(b * 1.6) * 0.72;
    branch.rotation.x = Math.sin(b * 1.6) * 0.55;
    group.add(branch);
  }
  return group;
}

/**
 * Composite Key / Battery / Note Pickups
 */
export function createPickupMesh(
  kind: 'key' | 'battery' | 'note' | 'switch' | 'relic' | 'healing',
  mats: ProceduralMaterialLibrary
): THREE.Group {
  const group = new THREE.Group();
  if (kind === 'key') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16), mats.brass);
    ring.rotation.x = Math.PI / 2;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), mats.brass);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.14, 0, 0);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.04), mats.brass);
    tooth.position.set(0.2, 0, 0.025);
    group.add(ring, shaft, tooth);
  } else if (kind === 'battery') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.14, 12), mats.lockerSteel);
    body.position.set(0, 0.07, 0);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), mats.brass);
    cap.position.set(0, 0.15, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.04, 12), mats.exitSign);
    band.position.set(0, 0.1, 0);
    group.add(body, cap, band);
  } else if (kind === 'healing') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.2), mats.paper);
    box.position.set(0, 0.06, 0);
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0x450a0a,
      emissiveIntensity: 0.45,
      roughness: 0.45,
    });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.036), crossMat);
    crossH.position.set(0, 0.12, 0);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.015, 0.12), crossMat);
    crossV.position.set(0, 0.12, 0);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.02), mats.rustedMetal);
    latch.position.set(0, 0.07, 0.105);
    group.add(box, crossH, crossV, latch);
  } else if (kind === 'note') {
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.008, 0.32), mats.paper);
    sheet.position.set(0, 0.01, 0);
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.04), mats.wornWood);
    fold.position.set(0, 0.014, -0.06);
    group.add(sheet, fold);
  } else if (kind === 'switch') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.12), mats.rustedMetal);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.06), mats.brass);
    lever.position.set(0, 0.04, 0.08);
    lever.rotation.x = -0.45;
    group.add(box, lever);
  } else {
    const base = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), mats.brass);
    base.position.set(0, 0.12, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 8, 16), mats.crtScreen);
    ring.position.set(0, 0.12, 0);
    group.add(base, ring);
  }
  return group;
}

/**
 * Abandoned School Main Entrance Gate Archway (open wrought-iron wings so player walks right through)
 */
export function createEntranceGateAssembly(mats: ProceduralMaterialLibrary): THREE.Group {
  const group = new THREE.Group();

  // Left and right brick/concrete gate columns
  const colGeo = new THREE.BoxGeometry(0.95, 3.6, 0.95);
  const capGeo = new THREE.BoxGeometry(1.15, 0.24, 1.15);
  [-3.4, 3.4].forEach((px) => {
    const col = new THREE.Mesh(colGeo, mats.basementConcrete);
    col.position.set(px, 1.8, 0);
    col.castShadow = true;
    col.receiveShadow = true;
    const cap = new THREE.Mesh(capGeo, mats.darkWood);
    cap.position.set(px, 3.7, 0);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), mats.emissiveTubeOff);
    lantern.position.set(px, 3.97, 0);
    group.add(col, cap, lantern);
  });

  // Overhead iron arch beam
  const arch = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.32, 0.22), mats.rustedMetal);
  arch.position.set(0, 3.5, 0);
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 0.14), mats.darkWood);
  plaque.position.set(0, 3.88, 0);
  group.add(arch, plaque);

  // Open iron gate leaves angled slightly inward
  [-1, 1].forEach((side) => {
    const leaf = new THREE.Group();
    leaf.position.set(side * 2.9, 0, 0);
    leaf.rotation.y = side * -1.18;
    const barGeo = new THREE.BoxGeometry(0.06, 2.35, 0.06);
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(barGeo, mats.rustedMetal);
      bar.position.set(-side * (0.25 + i * 0.42), 1.25, 0);
      leaf.add(bar);
    }
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.08), mats.rustedMetal);
    railTop.position.set(-side * 1.25, 2.35, 0);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.08), mats.rustedMetal);
    railBot.position.set(-side * 1.25, 0.35, 0);
    leaf.add(railTop, railBot);
    group.add(leaf);
  });

  return group;
}

/**
 * Abandoned Parked School Vehicle (Sedan or Utility Van)
 */
export function createParkedVehicleMesh(
  mats: ProceduralMaterialLibrary,
  variant: 'sedan' | 'van' = 'sedan'
): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = variant === 'van' ? mats.paper : mats.lockerSteel;
  const length = variant === 'van' ? 4.5 : 4.1;
  const bodyH = variant === 'van' ? 1.35 : 0.72;

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, bodyH, length), bodyMat);
  chassis.position.set(0, 0.35 + bodyH / 2, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  if (variant === 'sedan') {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.62, 2.05), bodyMat);
    cabin.position.set(0, 1.32, -0.15);
    group.add(cabin);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.46, 2.1), mats.glassPane);
    windshield.position.set(0, 1.32, -0.15);
    group.add(windshield);
  } else {
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.56, 0.08), mats.glassPane);
    windshield.position.set(0, 1.35, length * 0.5 + 0.01);
    group.add(windshield);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = mats.foliageDead;
  const wz = length * 0.33;
  [
    [-0.95, 0.34, -wz],
    [0.95, 0.34, -wz],
    [-0.95, 0.34, wz],
    [0.95, 0.34, wz],
  ].forEach(([wx, wy, zz]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, wy, zz);
    group.add(w);
  });

  return group;
}

/**
 * Student Bicycle Parking Canopy, Rack & 3 Abandoned Bicycles
 */
export function createBicycleRackAssembly(mats: ProceduralMaterialLibrary): THREE.Group {
  const group = new THREE.Group();

  // Corrugated metal canopy supported by 4 steel posts
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.1, 3.6), mats.rustedMetal);
  roof.position.set(0, 2.5, 0);
  roof.rotation.x = 0.08;
  group.add(roof);

  const postGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.5, 8);
  [
    [-3.5, 1.25, -1.5],
    [3.5, 1.25, -1.5],
    [-3.5, 1.25, 1.5],
    [3.5, 1.25, 1.5],
  ].forEach(([px, py, pz]) => {
    const post = new THREE.Mesh(postGeo, mats.lockerSteel);
    post.position.set(px, py, pz);
    group.add(post);
  });

  // Low steel wheel rack rail
  const rackRail = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.08, 0.55), mats.rustedMetal);
  rackRail.position.set(0, 0.14, 0);
  group.add(rackRail);

  // 3 simplified student bicycles parked in slots
  const wheelGeo = new THREE.TorusGeometry(0.32, 0.035, 6, 14);
  wheelGeo.rotateY(Math.PI / 2);
  [-2.0, 0.2, 2.1].forEach((bx, idx) => {
    const bike = new THREE.Group();
    bike.position.set(bx, 0, 0);
    bike.rotation.y = (idx - 1) * 0.08;

    const wheelF = new THREE.Mesh(wheelGeo, mats.foliageDead);
    wheelF.position.set(0, 0.34, 0.45);
    const wheelB = new THREE.Mesh(wheelGeo, mats.foliageDead);
    wheelB.position.set(0, 0.34, -0.45);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.92), mats.lockerSteel);
    frame.position.set(0, 0.62, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6), mats.rustedMetal);
    stem.position.set(0, 0.68, 0.36);
    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.04), mats.rustedMetal);
    handlebar.position.set(0, 0.96, 0.36);
    bike.add(wheelF, wheelB, frame, stem, handlebar);
    group.add(bike);
  });

  return group;
}

/**
 * Composite Metal Storage Shelving & Crates (grounded at y=0)
 */
export function createStorageRackAssembly(mats: ProceduralMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.06, 2.05, 0.06);
  [
    [-0.95, -0.3],
    [0.95, -0.3],
    [-0.95, 0.3],
    [0.95, 0.3],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, mats.rustedMetal);
    post.position.set(px, 1.025, pz);
    group.add(post);
  });

  const shelfGeo = new THREE.BoxGeometry(1.96, 0.04, 0.66);
  [0.24, 0.92, 1.62].forEach((sy, idx) => {
    const shelf = new THREE.Mesh(shelfGeo, mats.lockerSteel);
    shelf.position.set(0, sy, 0);
    shelf.receiveShadow = true;
    group.add(shelf);

    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.38, 0.44),
      idx % 2 === 0 ? mats.wornWood : mats.darkWood
    );
    crate.position.set(-0.42 + (idx % 2) * 0.78, sy + 0.21, 0);
    crate.castShadow = true;
    group.add(crate);
  });
  return group;
}

