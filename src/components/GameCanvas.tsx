import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { WeaponDef, HumanoidBot, BuildingBox, JumpPad, LootItem } from '../types/game';
import { WEAPONS_CATALOG } from '../data/weapons';
import { BallisticsEngine } from '../engine/BallisticsEngine';
import { buildDetailedWeapon, BuiltWeaponModel } from '../engine/WeaponModelBuilder';
import {
  getTerrainHeight,
  createTerrainShaderMaterial,
  createBuildingTexture,
  createWoodTexture,
  createCamoTexture,
} from '../engine/TerrainShaders';
import { audioEngine } from '../audio/RealisticAudioEngine';

interface GameCanvasProps {
  gameActive: boolean;
  isSpectating: boolean;
  selectedMapType: number;
  inventorySlots: number[];
  currentSlotIdx: number;
  equippedSkins: Record<number, string>;
  wood: number;
  medkits: number;
  buildMode: boolean;
  isReloading: boolean;
  isHealing: boolean;
  onUpdateHUD: (data: {
    hp: number;
    shield: number;
    kills: number;
    aliveCount: number;
    clipAmmo: number;
    reserveAmmo: number;
    zoneTimer: number;
    reloadProgress: number;
    healProgress: number;
    spectateTimer: number;
    killerName: string;
    isNearClimbable: boolean;
    damageFlash: boolean;
    hitmarkerVisible: boolean;
    adsProgress: number;
    currentYaw: number;
    spreadBloom: number;
  }) => void;
  onLootCollected: (type: 'ammo' | 'money' | 'wood' | 'medkit') => void;
  onBotKilled: (botName: string) => void;
  onPlayerDied: (killerName: string) => void;
  onGameOver: (isWin: boolean) => void;
  onWoodUsed: (amount: number) => void;
  onMedkitConsumed: () => void;
}

const RANDOM_BOT_NAMES = [
  'Viper', 'Shadow', 'Blaze', 'Hunter', 'Ghost', 'Rogue', 'Rex', 'Spike', 'Titan', 'Falcon', 'CyberSlayer', 'Warlock'
];

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameActive,
  isSpectating,
  selectedMapType,
  inventorySlots,
  currentSlotIdx,
  equippedSkins,
  wood,
  medkits,
  buildMode,
  isReloading,
  isHealing,
  onUpdateHUD,
  onLootCollected,
  onBotKilled,
  onPlayerDied,
  onGameOver,
  onWoodUsed,
  onMedkitConsumed,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Engine state refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ballisticsRef = useRef<BallisticsEngine | null>(null);

  const gunViewModelRef = useRef<BuiltWeaponModel | null>(null);
  const medkitGroupRef = useRef<THREE.Group | null>(null);
  const ghostWallRef = useRef<THREE.Mesh | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const zoneMeshRef = useRef<THREE.Mesh | null>(null);

  // Player physics
  const playerRef = useRef({
    hp: 100,
    shield: 100,
    x: 0,
    y: 1.7,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    onGround: true,
    kills: 0,
  });

  const lookRef = useRef({
    rawYaw: 0,
    rawPitch: 0,
    currentYaw: 0,
    currentPitch: 0,
    cameraRoll: 0,
    targetCameraRoll: 0,
  });

  const recoilSpringRef = useRef({
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    rot: new THREE.Vector3(),
    rotVel: new THREE.Vector3(),
  });

  const cameraPunchRef = useRef({ pitch: 0, yaw: 0, pitchVel: 0, yawVel: 0 });
  const slideKickOffsetRef = useRef(0);
  const barrelHeatRef = useRef(0);

  // Ammo & Timers
  const slotClipsRef = useRef<number[]>([12, 30, 5]);
  const slotReservesRef = useRef<number[]>([90, 120, 25]);
  const lastShootRef = useRef(0);
  const reloadTimerRef = useRef(0);
  const healTimerRef = useRef(0);
  const reloadAudioStagesRef = useRef([false, false, false]);
  const adsProgressRef = useRef(0);
  const isRightMouseDownRef = useRef(false);
  const bobTimerRef = useRef(0);
  const footstepTimerRef = useRef(0);
  const damageFlashTimerRef = useRef(0);
  const hitmarkerTimerRef = useRef(0);

  // Spectator state
  const spectateTimerRef = useRef(5.0);
  const killerBotRef = useRef<HumanoidBot | null>(null);
  const spectateCamAngleRef = useRef(0);

  // World objects
  const botsRef = useRef<HumanoidBot[]>([]);
  const buildingsRef = useRef<BuildingBox[]>([]);
  const placedWallsRef = useRef<BuildingBox[]>([]);
  const jumpPadsRef = useRef<JumpPad[]>([]);
  const lootItemsRef = useRef<LootItem[]>([]);
  const sceneryPropsRef = useRef<THREE.Object3D[]>([]);

  // Safe zone
  const zoneCenterRef = useRef(new THREE.Vector2(0, 0));
  const zoneRadiusRef = useRef(95);
  const zoneTargetRadiusRef = useRef(95);
  const zoneTimerRef = useRef(45);

  const keysRef = useRef<Record<string, boolean>>({});

  // 1. Initialize Three.js Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Detect software WebGL
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    let isSoftwareGl = false;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03060f);
    scene.fog = new THREE.FogExp2(0x03060f, 0.0095);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 650);
    scene.add(camera);
    cameraRef.current = camera;

    // Atmospheric Starfield
    const starGeo = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 1400; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 420;
      starPositions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xa8dcff,
      size: 1.8,
      transparent: true,
      opacity: 0.85,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Studio & Battlefield Lighting
    scene.add(new THREE.AmbientLight(0x182035, 0.6));
    const hemi = new THREE.HemisphereLight(0x385c96, 0x090c14, 0.55);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0x00ffcc, 1.15);
    sun.position.set(65, 140, 55);
    if (!isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 320;
      sun.shadow.camera.left = -130;
      sun.shadow.camera.right = 130;
      sun.shadow.camera.top = 130;
      sun.shadow.camera.bottom = -130;
      sun.shadow.bias = -0.0005;
    }
    scene.add(sun);

    const fillRim = new THREE.DirectionalLight(0xff3388, 0.32);
    fillRim.position.set(-45, 35, -65);
    scene.add(fillRim);

    // Ballistics Engine
    const ballistics = new BallisticsEngine(scene);
    ballisticsRef.current = ballistics;

    // Safe Zone Storm Mesh
    const zoneGeo = new THREE.CylinderGeometry(zoneRadiusRef.current, zoneRadiusRef.current, 95, 64, 1, true);
    const zoneMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    zoneMesh.position.y = 47.5;
    scene.add(zoneMesh);
    zoneMeshRef.current = zoneMesh;

    // Ghost Wall for Fortifications
    const ghostGeo = new THREE.BoxGeometry(3.5, 2.8, 0.35);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.42,
    });
    const ghostWall = new THREE.Mesh(ghostGeo, ghostMat);
    ghostWall.visible = false;
    scene.add(ghostWall);
    ghostWallRef.current = ghostWall;

    // Medkit Viewmodel
    const medkitGroup = new THREE.Group();
    const stimBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.24, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a2130, metalness: 0.8, roughness: 0.25 })
    );
    stimBody.rotation.x = Math.PI / 3;
    medkitGroup.add(stimBody);
    const fluidChamber = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.95 })
    );
    stimBody.add(fluidChamber);
    medkitGroup.position.set(0, -0.6, -0.4);
    medkitGroup.visible = false;
    camera.add(medkitGroup);
    medkitGroupRef.current = medkitGroup;

    // Resize Handler
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // 2. Build or Update First-Person Weapon Model on Slot / Skin change
  useEffect(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;

    // Remove existing weapon
    if (gunViewModelRef.current) {
      camera.remove(gunViewModelRef.current.root);
    }

    const activeGunId = inventorySlots[currentSlotIdx] ?? 0;
    const activeGun = WEAPONS_CATALOG[activeGunId] || WEAPONS_CATALOG[0];
    const skinId = equippedSkins[activeGunId] || 'default';

    const viewModel = buildDetailedWeapon(activeGun, skinId, true);
    camera.add(viewModel.root);
    gunViewModelRef.current = viewModel;

    // Ensure initial clip capacity is configured
    if (slotClipsRef.current[currentSlotIdx] === undefined) {
      slotClipsRef.current[currentSlotIdx] = activeGun.mag;
    }
  }, [currentSlotIdx, inventorySlots, equippedSkins]);

  // 3. Map Generation
  const generateMap = () => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Clean previous objects
    buildingsRef.current.forEach((b) => scene.remove(b.mesh));
    placedWallsRef.current.forEach((w) => scene.remove(w.mesh));
    jumpPadsRef.current.forEach((j) => scene.remove(j.mesh));
    sceneryPropsRef.current.forEach((p) => scene.remove(p));
    lootItemsRef.current.forEach((l) => scene.remove(l.mesh));
    botsRef.current.forEach((b) => scene.remove(b.mesh));

    buildingsRef.current = [];
    placedWallsRef.current = [];
    jumpPadsRef.current = [];
    sceneryPropsRef.current = [];
    lootItemsRef.current = [];
    botsRef.current = [];

    // Terrain Plane
    if (terrainMeshRef.current) scene.remove(terrainMeshRef.current);
    const terrainGeo = new THREE.PlaneGeometry(340, 340, 160, 160);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getTerrainHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = createTerrainShaderMaterial();
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // Pines & Boulders
    for (let i = 0; i < 48; i++) {
      const rx = (Math.random() - 0.5) * 230;
      const rz = (Math.random() - 0.5) * 230;
      if (Math.hypot(rx, rz) < 18) continue;
      const tree = createPineTree(rx, rz);
      scene.add(tree);
      sceneryPropsRef.current.push(tree);
    }
    for (let i = 0; i < 38; i++) {
      const rx = (Math.random() - 0.5) * 230;
      const rz = (Math.random() - 0.5) * 230;
      if (Math.hypot(rx, rz) < 16) continue;
      const rock = createBoulder(rx, rz);
      scene.add(rock);
      sceneryPropsRef.current.push(rock);
    }

    // Buildings & Structures
    let count = 8;
    let minH = 4;
    let maxH = 8;
    let widthRange = 5;
    if (selectedMapType === 0) {
      count = 10;
      minH = 4;
      maxH = 9;
      widthRange = 5;
    } else if (selectedMapType === 1) {
      count = 52;
      minH = 18;
      maxH = 44;
      widthRange = 10;
    } else if (selectedMapType === 2) {
      count = 28;
      minH = 8;
      maxH = 22;
      widthRange = 7;
    }

    const bTex = createBuildingTexture();
    const bMat = new THREE.MeshStandardMaterial({
      map: bTex,
      roughness: 0.28,
      metalness: 0.45,
      envMapIntensity: 1.15,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.75,
    });
    const ladderMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffaa00,
      emissiveIntensity: 0.45,
      metalness: 0.8,
      roughness: 0.3,
    });

    for (let i = 0; i < count; i++) {
      const w = 5 + Math.random() * widthRange;
      const h = minH + Math.random() * (maxH - minH);
      const d = 5 + Math.random() * widthRange;
      const bx = (Math.random() - 0.5) * 180;
      const bz = (Math.random() - 0.5) * 180;
      if (Math.hypot(bx, bz) < 16) continue;

      const groundBaseY = getTerrainHeight(bx, bz);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      mesh.position.set(bx, groundBaseY + h / 2, bz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const topGlow = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.25, d + 0.1), windowMat);
      topGlow.position.set(0, h / 2, 0);
      mesh.add(topGlow);

      const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.85, h, 0.1), ladderMat);
      ladder.position.set(0, 0, d / 2 + 0.05);
      mesh.add(ladder);

      buildingsRef.current.push({
        mesh,
        xMin: bx - w / 2,
        xMax: bx + w / 2,
        zMin: bz - d / 2,
        zMax: bz + d / 2,
        baseY: groundBaseY,
        height: groundBaseY + h,
      });

      // Jump Pads on tall structures
      if (h > 12 && Math.random() > 0.4) {
        const padMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16),
          new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        const px = bx + (Math.random() > 0.5 ? w / 2 + 2.2 : -w / 2 - 2.2);
        const pz = bz + (Math.random() > 0.5 ? d / 2 + 2.2 : -d / 2 - 2.2);
        const py = getTerrainHeight(px, pz) + 0.1;
        padMesh.position.set(px, py, pz);
        scene.add(padMesh);
        jumpPadsRef.current.push({ mesh: padMesh, x: px, z: pz, y: py });
      }
    }

    // 9 Humanoid Combat AI Bots
    for (let i = 0; i < 9; i++) {
      const name = RANDOM_BOT_NAMES[i % RANDOM_BOT_NAMES.length];
      const bot = createHumanoidBotMesh(name);
      const rx = (Math.random() - 0.5) * 150;
      const rz = (Math.random() - 0.5) * 150;
      const ry = getTerrainHeight(rx, rz);
      bot.mesh.position.set(rx, ry, rz);
      scene.add(bot.mesh);
      botsRef.current.push(bot);
    }

    // Loot pickups
    for (let i = 0; i < 26; i++) {
      const r = Math.random();
      let type: 'ammo' | 'money' | 'wood' | 'medkit' = 'ammo';
      let color = 0x00ffcc;
      if (r < 0.35) {
        type = 'money';
        color = 0xffd700;
      } else if (r < 0.7) {
        type = 'wood';
        color = 0xe69138;
      } else if (r < 0.85) {
        type = 'medkit';
        color = 0x00ff88;
      }
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), new THREE.MeshBasicMaterial({ color }));
      const lx = (Math.random() - 0.5) * 160;
      const lz = (Math.random() - 0.5) * 160;
      const ly = getTerrainHeight(lx, lz) + 0.45;
      mesh.position.set(lx, ly, lz);
      scene.add(mesh);
      lootItemsRef.current.push({ mesh, type });
    }
  };

  // 4. Start / Reset Match Lifecycle
  useEffect(() => {
    if (!gameActive) return;

    generateMap();
    if (ballisticsRef.current) ballisticsRef.current.clear();

    playerRef.current = {
      hp: 100,
      shield: 100,
      x: 0,
      y: getTerrainHeight(0, 0) + 1.7,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      onGround: true,
      kills: 0,
    };

    lookRef.current = {
      rawYaw: 0,
      rawPitch: 0,
      currentYaw: 0,
      currentPitch: 0,
      cameraRoll: 0,
      targetCameraRoll: 0,
    };

    slotClipsRef.current = inventorySlots.map((id) => WEAPONS_CATALOG[id]?.mag || 30);
    slotReservesRef.current = [90, 120, 25];

    zoneRadiusRef.current = 95;
    zoneTargetRadiusRef.current = 95;
    zoneTimerRef.current = 45;

    // Request pointer lock
    document.body.requestPointerLock?.();
  }, [gameActive, selectedMapType]);

  // 5. Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      audioEngine.init();
      if (e.button === 0 && gameActive && !isSpectating) {
        if (buildMode) {
          tryPlaceFortification();
        } else {
          executeFirearmShot();
        }
      }
      if (e.button === 2 && gameActive && !isSpectating && !buildMode) {
        isRightMouseDownRef.current = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDownRef.current = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === document.body && gameActive && !isSpectating) {
        const activeGunId = inventorySlots[currentSlotIdx] || 0;
        const gun = WEAPONS_CATALOG[activeGunId] || WEAPONS_CATALOG[0];
        const adsSensFactor = 1.0 - adsProgressRef.current * (gun.scopeType === 'sniper' ? 0.75 : 0.45);
        const sens = 0.0022 * adsSensFactor;

        lookRef.current.rawYaw -= e.movementX * sens;
        lookRef.current.rawPitch -= e.movementY * sens;
        lookRef.current.rawPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, lookRef.current.rawPitch));
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameActive, isSpectating, buildMode, currentSlotIdx, inventorySlots]);

  // 6. Weapon Shot Execution with authentic audio & physical ballistics
  const executeFirearmShot = () => {
    if (isReloading || isHealing || buildMode || !cameraRef.current) return;
    const now = performance.now();
    const activeGunId = inventorySlots[currentSlotIdx] || 0;
    const gun = WEAPONS_CATALOG[activeGunId] || WEAPONS_CATALOG[0];

    const currentClip = slotClipsRef.current[currentSlotIdx] ?? gun.mag;
    if (currentClip <= 0) return;
    if (now - lastShootRef.current < gun.rate) return;

    lastShootRef.current = now;
    slotClipsRef.current[currentSlotIdx] = currentClip - 1;

    // Authentic Procedural Web Audio Sound
    audioEngine.playWeaponShot(gun.cat, gun.scopeType === 'sniper');

    // Recoil spring kickback
    recoilSpringRef.current.vel.z += gun.recoil * 3.4;
    recoilSpringRef.current.vel.y += gun.recoil * 0.95;
    recoilSpringRef.current.rotVel.x += gun.recoil * 3.2;
    recoilSpringRef.current.rotVel.z += (Math.random() - 0.5) * gun.recoil * 1.6;

    cameraPunchRef.current.pitchVel += gun.recoil * 0.48;
    cameraPunchRef.current.yawVel += (Math.random() - 0.5) * gun.recoil * 0.28;

    // Mechanical Slide / Bolt blowback kick
    slideKickOffsetRef.current = gun.recoilKick;
    barrelHeatRef.current = Math.min(1.0, barrelHeatRef.current + 0.14);

    // Muzzle Flash
    if (gunViewModelRef.current) {
      (gunViewModelRef.current.muzzleFlash.material as THREE.Material).opacity = 1;
      gunViewModelRef.current.muzzleLight.intensity = 3.5;
      setTimeout(() => {
        if (gunViewModelRef.current) {
          (gunViewModelRef.current.muzzleFlash.material as THREE.Material).opacity = 0;
          gunViewModelRef.current.muzzleLight.intensity = 0;
        }
      }, 45);
    }

    // Eject Spent Brass Shell Casing
    if (ballisticsRef.current) {
      const camPos = new THREE.Vector3();
      cameraRef.current.getWorldPosition(camPos);
      const shellPos = camPos.clone().add(new THREE.Vector3(0.2, -0.14, -0.32));
      ballisticsRef.current.spawnSpentShell(shellPos, lookRef.current.currentYaw);
    }

    // Ballistic Projectile Spawning
    const camPos = new THREE.Vector3();
    cameraRef.current.getWorldPosition(camPos);
    const camDir = new THREE.Vector3();
    cameraRef.current.getWorldDirection(camDir);

    const muzzleOrigin = camPos.clone().addScaledVector(camDir, 0.45);

    // ADS dynamic spread modifier (ADS tightens spread by 70%)
    const spreadMod = (1.0 - adsProgressRef.current * 0.72) * gun.spread;

    if (ballisticsRef.current) {
      if (gun.cat === 'shotgun' && gun.pellets) {
        for (let p = 0; p < gun.pellets; p++) {
          ballisticsRef.current.spawnProjectile({
            origin: muzzleOrigin,
            direction: camDir,
            muzzleVelocity: gun.muzzleVelocity * (0.95 + Math.random() * 0.1),
            gravityScale: gun.gravityScale,
            damage: gun.dmg,
            color: gun.color,
            isBot: false,
            ownerName: 'YOU',
            spread: gun.spread,
            pellet: true,
          });
        }
      } else {
        ballisticsRef.current.spawnProjectile({
          origin: muzzleOrigin,
          direction: camDir,
          muzzleVelocity: gun.muzzleVelocity,
          gravityScale: gun.gravityScale,
          damage: gun.dmg,
          color: gun.color,
          isBot: false,
          ownerName: 'YOU',
          spread: spreadMod,
        });
      }
    }
  };

  // 7. Fortification Building
  const tryPlaceFortification = () => {
    if (wood < 10 || !ghostWallRef.current || !sceneRef.current) return;
    onWoodUsed(10);
    audioEngine.playBuildWall();

    const wTex = createWoodTexture();
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.8, 0.35),
      new THREE.MeshStandardMaterial({ map: wTex, roughness: 0.62, metalness: 0.18 })
    );
    wallMesh.position.copy(ghostWallRef.current.position);
    wallMesh.rotation.copy(ghostWallRef.current.rotation);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    sceneRef.current.add(wallMesh);

    const wallBox: BuildingBox = {
      mesh: wallMesh,
      hp: 200,
      maxHp: 200,
      xMin: wallMesh.position.x - 1.75,
      xMax: wallMesh.position.x + 1.75,
      zMin: wallMesh.position.z - 1.75,
      zMax: wallMesh.position.z + 1.75,
      baseY: wallMesh.position.y - 1.4,
      height: wallMesh.position.y + 1.4,
    };
    placedWallsRef.current.push(wallBox);
    buildingsRef.current.push(wallBox);
  };

  // 8. Main 60fps Game Simulation Loop
  useEffect(() => {
    if (!gameActive) return;
    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent frame lag spikes
      lastTime = now;

      const player = playerRef.current;
      const look = lookRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const ballistics = ballisticsRef.current;

      if (!camera || !renderer || !scene) return;

      // Handle Spectator or Player Physics
      if (isSpectating) {
        spectateTimerRef.current -= dt;
        spectateCamAngleRef.current += dt * 0.95;

        let targetPos = new THREE.Vector3(player.x, player.y, player.z);
        if (killerBotRef.current && !killerBotRef.current.isDead) {
          targetPos.copy(killerBotRef.current.mesh.position);
        } else {
          const aliveBot = botsRef.current.find((b) => !b.isDead);
          if (aliveBot) targetPos.copy(aliveBot.mesh.position);
        }

        const cx = targetPos.x + Math.sin(spectateCamAngleRef.current) * 4.4;
        const cz = targetPos.z + Math.cos(spectateCamAngleRef.current) * 4.4;
        camera.position.lerp(new THREE.Vector3(cx, targetPos.y + 2.4, cz), 0.12);
        camera.lookAt(targetPos.x, targetPos.y + 1.2, targetPos.z);

        if (spectateTimerRef.current <= 0) {
          onGameOver(false);
        }
      } else {
        // Player look smoothing
        look.currentYaw += (look.rawYaw - look.currentYaw) * Math.min(1.0, 38.0 * dt);
        look.currentPitch += (look.rawPitch - look.currentPitch) * Math.min(1.0, 38.0 * dt);

        // Recoil camera recovery
        const punch = cameraPunchRef.current;
        punch.pitchVel += (-120.0 * punch.pitch - 16.0 * punch.pitchVel) * dt;
        punch.pitch += punch.pitchVel * dt;
        punch.yawVel += (-120.0 * punch.yaw - 16.0 * punch.yawVel) * dt;
        punch.yaw += punch.yawVel * dt;

        // Player WASD Movement
        const targetSpeed = keysRef.current['ShiftLeft'] ? 12.0 : 7.8;
        let moveX = 0;
        let moveZ = 0;
        if (keysRef.current['KeyW']) moveZ -= 1;
        if (keysRef.current['KeyS']) moveZ += 1;
        if (keysRef.current['KeyA']) moveX -= 1;
        if (keysRef.current['KeyD']) moveX += 1;

        let wishVx = 0;
        let wishVz = 0;
        if (moveX !== 0 || moveZ !== 0) {
          const len = Math.hypot(moveX, moveZ);
          moveX /= len;
          moveZ /= len;
          const sinY = Math.sin(look.currentYaw);
          const cosY = Math.cos(look.currentYaw);
          wishVx = (moveX * cosY + moveZ * sinY) * targetSpeed;
          wishVz = (moveZ * cosY - moveX * sinY) * targetSpeed;
        }

        const accel = player.onGround ? 55.0 : 14.0;
        const friction = player.onGround ? 12.0 : 1.5;

        if (moveX !== 0 || moveZ !== 0) {
          player.vx += (wishVx - player.vx) * Math.min(1.0, accel * dt);
          player.vz += (wishVz - player.vz) * Math.min(1.0, accel * dt);
        } else {
          player.vx -= player.vx * Math.min(1.0, friction * dt);
          player.vz -= player.vz * Math.min(1.0, friction * dt);
        }

        player.x += player.vx * dt;
        player.z += player.vz * dt;

        // Camera Banking
        const localVx = player.vx * Math.cos(look.currentYaw) - player.vz * Math.sin(look.currentYaw);
        look.targetCameraRoll = -localVx * 0.0045;
        look.cameraRoll += (look.targetCameraRoll - look.cameraRoll) * Math.min(1.0, 10.0 * dt);

        camera.rotation.set(
          look.currentPitch + punch.pitch,
          look.currentYaw + punch.yaw,
          look.cameraRoll,
          'YXZ'
        );

        // Footsteps
        const horizSpeed = Math.hypot(player.vx, player.vz);
        if (player.onGround && horizSpeed > 1.0) {
          footstepTimerRef.current += dt * horizSpeed;
          if (footstepTimerRef.current > 3.8) {
            audioEngine.playFootstep();
            footstepTimerRef.current = 0;
          }
        }

        // Multi-Elevation Ground & Obstacle Check
        let groundY = getTerrainHeight(player.x, player.z) + 1.7;
        let nearClimbable = false;

        buildingsRef.current.forEach((b) => {
          const nearX = player.x >= b.xMin - 0.8 && player.x <= b.xMax + 0.8;
          const nearZ = player.z >= b.zMin - 0.8 && player.z <= b.zMax + 0.8;
          if (nearX && nearZ && player.y < b.height + 1.7) {
            nearClimbable = true;
            if (keysRef.current['KeyW'] || keysRef.current['Space']) {
              player.vy = 8.5;
              player.onGround = false;
            }
          }
          if (player.x >= b.xMin && player.x <= b.xMax && player.z >= b.zMin && player.z <= b.zMax) {
            if (player.y >= b.height + 1.2) groundY = Math.max(groundY, b.height + 1.7);
          }
        });

        // Jump Pads
        jumpPadsRef.current.forEach((jp) => {
          if (Math.hypot(player.x - jp.x, player.z - jp.z) < 1.8 && player.onGround) {
            player.vy = 22.0;
            player.onGround = false;
          }
        });

        if (keysRef.current['Space'] && player.onGround) {
          player.vy = 7.0;
          player.onGround = false;
        }
        player.vy -= 18.5 * dt;
        player.y += player.vy * dt;

        if (player.y <= groundY) {
          player.y = groundY;
          player.vy = 0;
          player.onGround = true;
        }
        camera.position.set(player.x, player.y, player.z);

        // Loot Collection
        lootItemsRef.current.forEach((l, idx) => {
          if (Math.hypot(player.x - l.mesh.position.x, player.z - l.mesh.position.z) < 1.6) {
            audioEngine.playCollect();
            onLootCollected(l.type);
            scene.remove(l.mesh);
            lootItemsRef.current.splice(idx, 1);
          }
        });

        // ADS Zoom & Viewmodel Positioning
        const activeGunId = inventorySlots[currentSlotIdx] || 0;
        const gun = WEAPONS_CATALOG[activeGunId] || WEAPONS_CATALOG[0];

        const targetAds =
          isRightMouseDownRef.current && !isReloading && !isHealing && !buildMode ? 1.0 : 0.0;
        adsProgressRef.current += (targetAds - adsProgressRef.current) * Math.min(1.0, 14.0 * dt);

        const targetFov = 75 + (gun.zoomFov - 75) * adsProgressRef.current;
        camera.fov = targetFov;
        camera.updateProjectionMatrix();

        // Viewmodel Bob & Slide Recoil
        const bobScale = (1.0 - adsProgressRef.current * 0.85) * Math.min(1.5, horizSpeed / 8.0);
        bobTimerRef.current += dt * (player.onGround && horizSpeed > 0.5 ? horizSpeed * 1.5 : 1.2);
        const bobX = Math.cos(bobTimerRef.current * 0.5) * 0.012 * bobScale;
        const bobY = Math.sin(bobTimerRef.current) * 0.015 * bobScale;
        const bobRotZ = Math.cos(bobTimerRef.current * 0.5) * 0.018 * bobScale;

        // Recoil Spring Physics
        const kSpring = 180.0;
        const dSpring = 18.0;
        const spr = recoilSpringRef.current;
        spr.vel.z += (-kSpring * spr.pos.z - dSpring * spr.vel.z) * dt;
        spr.pos.z += spr.vel.z * dt;
        spr.vel.y += (-kSpring * spr.pos.y - dSpring * spr.vel.y) * dt;
        spr.pos.y += spr.vel.y * dt;
        spr.rotVel.x += (-kSpring * spr.rot.x - dSpring * spr.rotVel.x) * dt;
        spr.rot.x += spr.rotVel.x * dt;
        spr.rotVel.z += (-kSpring * spr.rot.z - dSpring * spr.rotVel.z) * dt;
        spr.rot.z += spr.rotVel.z * dt;

        // Slide Blowback spring recovery
        slideKickOffsetRef.current = Math.max(0, slideKickOffsetRef.current - dt * 0.8);
        barrelHeatRef.current = Math.max(0, barrelHeatRef.current - dt * 0.3);

        const hipPos = new THREE.Vector3(0.24, -0.2, -0.45);
        const adsPos =
          gun.scopeType === 'sniper' || gun.scopeType === 'tactical'
            ? new THREE.Vector3(0.0, -0.16, -0.32)
            : new THREE.Vector3(0.0, -0.14, -0.36);

        if (gunViewModelRef.current && !isReloading && !isHealing && !buildMode) {
          const model = gunViewModelRef.current;
          model.gunGroup.position.x =
            hipPos.x * (1 - adsProgressRef.current) + adsPos.x * adsProgressRef.current + bobX;
          model.gunGroup.position.y =
            hipPos.y * (1 - adsProgressRef.current) + adsPos.y * adsProgressRef.current + bobY + spr.pos.y;
          model.gunGroup.position.z =
            hipPos.z * (1 - adsProgressRef.current) + adsPos.z * adsProgressRef.current + spr.pos.z;

          model.gunGroup.rotation.x = spr.rot.x;
          model.gunGroup.rotation.z = bobRotZ + spr.rot.z;

          // Animate reciprocating slide/bolt carrier
          if (model.movingSlide) {
            model.movingSlide.position.z = slideKickOffsetRef.current;
          }

          // In 8X sniper ADS, hide weapon mesh so optic reticle is clear
          model.root.visible = gun.scopeType === 'sniper' ? adsProgressRef.current < 0.88 : true;
        }

        // Ghost Wall positioning in Build Mode
        if (ghostWallRef.current && buildMode) {
          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward);
          const targetGhost = new THREE.Vector3(player.x, player.y - 0.3, player.z).addScaledVector(forward, 3.8);
          ghostWallRef.current.position.copy(targetGhost);
          ghostWallRef.current.rotation.y = look.currentYaw;
          ghostWallRef.current.visible = true;
        } else if (ghostWallRef.current) {
          ghostWallRef.current.visible = false;
        }

        // Tactical Reload Animation & Audio Stages
        let reloadProg = 0;
        if (isReloading) {
          reloadTimerRef.current += dt;
          reloadProg = Math.min(1.0, reloadTimerRef.current / 1.6);

          if (reloadProg < 0.35 && !reloadAudioStagesRef.current[0]) {
            audioEngine.playReloadMagOut();
            reloadAudioStagesRef.current[0] = true;
          } else if (reloadProg >= 0.55 && reloadProg < 0.7 && !reloadAudioStagesRef.current[1]) {
            audioEngine.playReloadMagIn();
            reloadAudioStagesRef.current[1] = true;
          } else if (reloadProg >= 0.7 && !reloadAudioStagesRef.current[2]) {
            audioEngine.playReloadBolt();
            reloadAudioStagesRef.current[2] = true;
          }

          // Animate dropping magazine
          if (gunViewModelRef.current?.magazine) {
            if (reloadProg < 0.4) {
              gunViewModelRef.current.magazine.position.y = -0.15 - reloadProg * 0.4;
            } else if (reloadProg < 0.75) {
              gunViewModelRef.current.magazine.position.y = -0.3 + (reloadProg - 0.4) * 0.8;
            } else {
              gunViewModelRef.current.magazine.position.y = -0.12;
            }
          }

          if (reloadProg >= 1.0) {
            const needed = gun.mag - (slotClipsRef.current[currentSlotIdx] || 0);
            const transfer = Math.min(needed, slotReservesRef.current[currentSlotIdx] || 0);
            slotClipsRef.current[currentSlotIdx] = (slotClipsRef.current[currentSlotIdx] || 0) + transfer;
            slotReservesRef.current[currentSlotIdx] = (slotReservesRef.current[currentSlotIdx] || 0) - transfer;
            reloadAudioStagesRef.current = [false, false, false];
            reloadTimerRef.current = 0;
          }
        }

        // Nano-Medkit Stim Healing Animation
        let healProg = 0;
        if (isHealing) {
          healTimerRef.current += dt;
          healProg = Math.min(1.0, healTimerRef.current / 2.5);
          if (medkitGroupRef.current) {
            medkitGroupRef.current.visible = true;
            medkitGroupRef.current.position.y = -0.3 + Math.sin(healProg * Math.PI) * 0.15;
          }
          if (gunViewModelRef.current) gunViewModelRef.current.root.visible = false;

          if (healProg >= 1.0) {
            player.hp = 100;
            player.shield = Math.min(100, player.shield + 50);
            onMedkitConsumed();
            healTimerRef.current = 0;
            if (medkitGroupRef.current) medkitGroupRef.current.visible = false;
            if (gunViewModelRef.current) gunViewModelRef.current.root.visible = true;
          }
        }
      }

      // 9. Update Ballistics Engine (Physical Projectiles with Gravity Drop & Drag)
      if (ballistics) {
        ballistics.update(
          dt,
          new THREE.Vector3(player.x, player.y, player.z),
          camera,
          botsRef.current,
          buildingsRef.current,
          (bot, damage, isHeadshot) => {
            bot.hp -= damage;
            hitmarkerTimerRef.current = 0.1;
            updateBotNameSprite(bot);

            if (bot.hp <= 0 && !bot.isDead) {
              bot.isDead = true;
              player.kills++;
              player.hp = Math.min(100, player.hp + 35);
              player.shield = Math.min(100, player.shield + 35);
              onBotKilled(bot.name);

              if (botsRef.current.filter((b) => !b.isDead).length === 0) {
                onGameOver(true);
              }
            }
          },
          (damage) => {
            damageFlashTimerRef.current = 0.2;
            if (player.shield > 0) {
              player.shield = Math.max(0, player.shield - damage);
            } else {
              player.hp = Math.max(0, player.hp - damage);
            }
            if (player.hp <= 0 && !isSpectating) {
              onPlayerDied('ENEMY OPERATOR');
            }
          },
          (wall, damage) => {
            if (wall.hp !== undefined) {
              wall.hp -= damage;
              if (wall.hp <= 0) {
                scene.remove(wall.mesh);
                buildingsRef.current = buildingsRef.current.filter((b) => b !== wall);
                placedWallsRef.current = placedWallsRef.current.filter((w) => w !== wall);
              }
            }
          }
        );
      }

      // 10. Update AI Bots (Movement, Terrain Conformation & Spatial Gunfire)
      botsRef.current.forEach((b) => {
        if (b.isDead) {
          if (b.deathProgress < 1.0) {
            b.deathProgress += dt * 3.0;
            b.mesh.rotation.x = (-Math.PI / 2) * Math.min(1.0, b.deathProgress);
            b.mesh.position.y = Math.max(
              getTerrainHeight(b.mesh.position.x, b.mesh.position.z) + 0.15,
              b.mesh.position.y - dt * 2.5
            );
            b.nameSprite.visible = false;
          }
          return;
        }

        const terrainGroundY = getTerrainHeight(b.mesh.position.x, b.mesh.position.z);
        b.mesh.position.y = terrainGroundY;

        const dist = Math.hypot(player.x - b.mesh.position.x, player.z - b.mesh.position.z);
        b.nameSprite.quaternion.copy(camera.quaternion);

        if (dist < 52 && !isSpectating) {
          b.mesh.lookAt(player.x, terrainGroundY, player.z);
          if (dist > 9) {
            b.mesh.translateZ(3.4 * dt);
            b.walkCycle += dt * 8.0;
            b.leftLeg.rotation.x = Math.sin(b.walkCycle) * 0.6;
            b.rightLeg.rotation.x = -Math.sin(b.walkCycle) * 0.6;
          } else if (now - b.lastShoot > 1100) {
            b.lastShoot = now;

            // Spatial Gunshot Sound
            audioEngine.playSpatialBotGunshot(
              b.mesh.position,
              { x: player.x, y: player.y, z: player.z },
              look.currentYaw
            );

            // Muzzle flash
            (b.bFlash.material as THREE.Material).opacity = 1;
            setTimeout(() => {
              (b.bFlash.material as THREE.Material).opacity = 0;
            }, 50);

            // Spawn Physical Ballistic Projectile from Bot towards Player!
            if (ballistics) {
              const botMuzzle = b.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
              const botShootDir = new THREE.Vector3(player.x, player.y + 1.2, player.z)
                .sub(botMuzzle)
                .normalize();

              ballistics.spawnProjectile({
                origin: botMuzzle,
                direction: botShootDir,
                muzzleVelocity: 520,
                gravityScale: 0.8,
                damage: 9,
                color: 0xff0055,
                isBot: true,
                ownerName: b.name,
                spread: 0.035, // Inaccuracy so near misses occur for supersonic flybys!
              });
            }
          }
        }
      });

      // 11. Safe Zone Storm Logic
      zoneTimerRef.current -= dt;
      if (zoneTimerRef.current <= 0) {
        zoneTimerRef.current = 30;
        zoneTargetRadiusRef.current = Math.max(10, zoneRadiusRef.current - 25);
      }
      if (zoneRadiusRef.current > zoneTargetRadiusRef.current) {
        zoneRadiusRef.current -= 2.0 * dt;
        if (zoneMeshRef.current) {
          zoneMeshRef.current.scale.set(zoneRadiusRef.current / 95, 1, zoneRadiusRef.current / 95);
        }
      }

      if (!isSpectating) {
        const distFromCenter = Math.hypot(
          player.x - zoneCenterRef.current.x,
          player.z - zoneCenterRef.current.y
        );
        if (distFromCenter > zoneRadiusRef.current) {
          player.hp -= 3.0 * dt;
          damageFlashTimerRef.current = 0.1;
          if (player.hp <= 0) {
            onPlayerDied('SAFE ZONE STORM');
          }
        }
      }

      // Flash timers
      damageFlashTimerRef.current = Math.max(0, damageFlashTimerRef.current - dt);
      hitmarkerTimerRef.current = Math.max(0, hitmarkerTimerRef.current - dt);

      // Animate terrain cyber grid shader
      if (terrainMeshRef.current && (terrainMeshRef.current.material as any).uniforms) {
        (terrainMeshRef.current.material as any).uniforms.time.value = now * 0.001;
      }

      // Calculate dynamic crosshair spread bloom
      const horizSpd = Math.hypot(player.vx, player.vz);
      const spreadBloom = horizSpd * 0.006 + (gunViewModelRef.current ? slideKickOffsetRef.current * 0.3 : 0);

      // Push telemetry to React HUD
      onUpdateHUD({
        hp: player.hp,
        shield: player.shield,
        kills: player.kills,
        aliveCount: botsRef.current.filter((b) => !b.isDead).length + 1,
        clipAmmo: slotClipsRef.current[currentSlotIdx] || 0,
        reserveAmmo: slotReservesRef.current[currentSlotIdx] || 0,
        zoneTimer: zoneTimerRef.current,
        reloadProgress: isReloading ? reloadTimerRef.current / 1.6 : 0,
        healProgress: isHealing ? healTimerRef.current / 2.5 : 0,
        spectateTimer: spectateTimerRef.current,
        killerName: killerBotRef.current?.name || 'ZONE STORM',
        isNearClimbable: false,
        damageFlash: damageFlashTimerRef.current > 0,
        hitmarkerVisible: hitmarkerTimerRef.current > 0,
        adsProgress: adsProgressRef.current,
        currentYaw: look.currentYaw,
        spreadBloom,
      });

      // Render Tactical Minimap Radar
      renderMinimapRadar(player.x, player.z, zoneRadiusRef.current);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameActive, isSpectating, selectedMapType, isReloading, isHealing, buildMode, currentSlotIdx]);

  // Minimap Radar Rendering
  const renderMinimapRadar = (px: number, pz: number, zRadius: number) => {
    if (!minimapCanvasRef.current) return;
    const ctx = minimapCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 130, 130);

    // Player central beacon
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(65, 65, 4, 0, Math.PI * 2);
    ctx.fill();

    // Safe zone boundary
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      65 + (zoneCenterRef.current.x - px) * 0.45,
      65 + (zoneCenterRef.current.y - pz) * 0.45,
      zRadius * 0.45,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Enemy bot blips
    ctx.fillStyle = '#ff0055';
    botsRef.current.forEach((b) => {
      if (b.isDead) return;
      const bx = 65 + (b.mesh.position.x - px) * 0.45;
      const bz = 65 + (b.mesh.position.z - pz) * 0.45;
      if (bx > 0 && bx < 130 && bz > 0 && bz < 130) {
        ctx.beginPath();
        ctx.arc(bx, bz, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
      {/* Circular Minimap Radar */}
      <canvas
        ref={minimapCanvasRef}
        width={130}
        height={130}
        className="absolute top-5 right-5 rounded-full border-2 border-cyan-400/80 bg-slate-950/90 shadow-xl shadow-black/60 pointer-events-none z-20"
      />
    </div>
  );
};

// --- PROCEDURAL PROP HELPERS ---
function createPineTree(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(x, z);
  group.position.set(x, y, z);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2714, roughness: 0.9, metalness: 0.05 });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x1b382b,
    roughness: 0.65,
    metalness: 0.08,
    emissive: 0x0a1a12,
    emissiveIntensity: 0.15,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.5, 8), trunkMat);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  group.add(trunk);

  [
    { r: 1.8, h: 2.2, y: 2.6 },
    { r: 1.4, h: 1.9, y: 3.8 },
    { r: 0.9, h: 1.6, y: 4.8 },
  ].forEach((tier) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(tier.r, tier.h, 7), foliageMat);
    cone.position.y = tier.y;
    cone.castShadow = true;
    group.add(cone);
  });

  return group;
}

function createBoulder(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const y = getTerrainHeight(x, z);
  group.position.set(x, y - 0.2, z);

  const rockGeo = new THREE.DodecahedronGeometry(1.2 + Math.random() * 0.8, 1);
  const pos = rockGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) * (0.8 + Math.random() * 0.4),
      pos.getY(i) * (0.8 + Math.random() * 0.4),
      pos.getZ(i) * (0.8 + Math.random() * 0.4)
    );
  }
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x222a38,
    roughness: 0.85,
    metalness: 0.18,
  });
  const mesh = new THREE.Mesh(rockGeo, rockMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function createHumanoidBotMesh(name: string): HumanoidBot {
  const root = new THREE.Group();
  const camoTex = createCamoTexture();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a882, roughness: 0.65 });
  const suitMat = new THREE.MeshStandardMaterial({ map: camoTex, roughness: 0.5 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x1a2130, metalness: 0.4, roughness: 0.35 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.6 });
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, metalness: 0.9, roughness: 0.1 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x14161d, metalness: 0.8, roughness: 0.25 });

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.25), suitMat);
  pelvis.position.y = 0.88;
  pelvis.castShadow = true;
  root.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.28), suitMat);
  torso.position.y = 1.22;
  torso.castShadow = true;
  root.add(torso);

  const tacticalVest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.32), vestMat);
  torso.add(tacticalVest);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.72;
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.18, 0.31), armorMat);
  helmet.position.set(0, 0.08, -0.01);
  headGroup.add(helmet);
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.06), visorMat);
  goggles.position.set(0, 0.03, 0.14);
  headGroup.add(goggles);
  root.add(headGroup);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.14, 0.85, 0);
  const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.18), suitMat);
  leftThigh.position.y = -0.22;
  leftLeg.add(leftThigh);
  const leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.16), suitMat);
  leftShin.position.y = -0.58;
  leftLeg.add(leftShin);
  root.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.14, 0.85, 0);
  const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.18), suitMat);
  rightThigh.position.y = -0.22;
  rightLeg.add(rightThigh);
  const rightShin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.16), suitMat);
  rightShin.position.y = -0.58;
  rightLeg.add(rightShin);
  root.add(rightLeg);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.32, 1.42, 0);
  const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), suitMat);
  leftArmMesh.position.y = -0.26;
  leftArm.add(leftArmMesh);
  root.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.32, 1.42, 0);
  const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), suitMat);
  rightArmMesh.position.set(0, -0.22, -0.1);
  rightArmMesh.rotation.x = -Math.PI / 2.8;
  rightArm.add(rightArmMesh);

  const botGun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.58), gunMat);
  botGun.position.set(0, -0.2, -0.42);
  rightArm.add(botGun);

  const bFlash = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.18, 6),
    new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0 })
  );
  bFlash.rotation.x = -Math.PI / 2;
  bFlash.position.set(0, 0, -0.34);
  botGun.add(bFlash);
  root.add(rightArm);

  // Floating Name / Health Banner Sprite
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 70;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,14,24,0.85)';
  ctx.fillRect(0, 0, 256, 70);
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 66);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(name, 128, 30);
  ctx.fillStyle = '#222222';
  ctx.fillRect(20, 42, 216, 16);
  ctx.fillStyle = '#ff0055';
  ctx.fillRect(20, 42, 216, 16);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const nameSprite = new THREE.Sprite(spriteMat);
  nameSprite.scale.set(1.9, 0.52, 1);
  nameSprite.position.y = 2.3;
  root.add(nameSprite);

  return {
    mesh: root,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    headGroup,
    torso,
    bFlash,
    nameSprite,
    nameCtx: ctx,
    nameTexture: texture,
    name,
    hp: 100,
    maxHp: 100,
    lastShoot: 0,
    walkCycle: Math.random() * 10,
    isDead: false,
    deathProgress: 0,
  };
}

function updateBotNameSprite(bot: HumanoidBot): void {
  const ctx = bot.nameCtx;
  ctx.fillStyle = 'rgba(10,14,24,0.85)';
  ctx.fillRect(0, 0, 256, 70);
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 66);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(bot.name, 128, 30);
  ctx.fillStyle = '#222222';
  ctx.fillRect(20, 42, 216, 16);
  ctx.fillStyle = '#ff0055';
  const hpW = Math.max(0, (bot.hp / bot.maxHp) * 216);
  ctx.fillRect(20, 42, hpW, 16);
  bot.nameTexture.needsUpdate = true;
}
