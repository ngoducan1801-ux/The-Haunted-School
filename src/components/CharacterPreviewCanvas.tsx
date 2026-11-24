import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { CharacterId } from '../types/game';
import { animateCharacterRig, createCharacterModel, type CharacterRig } from '../game/characters';

interface CharacterPreviewCanvasProps {
  characterId: CharacterId;
}

function isSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const CharacterPreviewCanvas: React.FC<CharacterPreviewCanvasProps> = ({ characterId }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const sw = isSoftwareWebGL();
    let disposed = false;
    let frameId = 0;

    const renderer = new THREE.WebGLRenderer({
      antialias: !sw,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: sw,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(sw ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 320, mount.clientHeight || 420, false);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();

    const w = mount.clientWidth || 320;
    const h = mount.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 20);
    camera.position.set(0, 1.18, 3.25);
    camera.lookAt(0, 0.96, 0);

    // Three-point horror studio lighting
    const hemi = new THREE.HemisphereLight(0x8aa4c2, 0x161210, 0.7);
    const keyLight = new THREE.DirectionalLight(0xffe6c7, 1.85);
    keyLight.position.set(2.4, 3.2, 3.0);
    const rimLight = new THREE.DirectionalLight(0x8c2d2d, 1.35);
    rimLight.position.set(-2.5, 2.2, -2.5);
    scene.add(hemi, keyLight, rimLight);

    // Dark pedestal ring
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.78, 0.12, 24),
      new THREE.MeshStandardMaterial({ color: 0x13161e, roughness: 0.72, metalness: 0.25 })
    );
    pedestal.position.y = -0.06;
    scene.add(pedestal);

    const rig = createCharacterModel(characterId, false);
    rig.root.rotation.y = Math.PI * 0.88; // Face front-3/4 toward camera (model faces -Z)
    scene.add(rig.root);
    rigRef.current = rig;

    const onResize = () => {
      if (!mount || disposed) return;
      const rw = mount.clientWidth || 320;
      const rh = mount.clientHeight || 420;
      renderer.setSize(rw, rh, false);
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    let lastMs = performance.now();
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 140);
        }
      };
      frameId = window.setTimeout(poll, 6);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastMs) / 1000));
      lastMs = now;

      if (rigRef.current) {
        rigRef.current.root.rotation.y += dt * 0.42;
        animateCharacterRig(rigRef.current, dt, 'idle', 0, true);
      }
      renderer.render(scene, camera);
      if (sw) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    renderer.render(scene, camera);
    if (sw) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Swap 3D character rig seamlessly when inspecting another character
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rigRef.current) {
      scene.remove(rigRef.current.root);
    }
    const nextRig = createCharacterModel(characterId, false);
    nextRig.root.rotation.y = Math.PI * 0.88;
    scene.add(nextRig.root);
    rigRef.current = nextRig;
  }, [characterId]);

  return (
    <div
      ref={mountRef}
      data-testid="character-3d-preview"
      className="w-full h-full min-h-[280px]"
    />
  );
};
