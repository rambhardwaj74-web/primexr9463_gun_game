import * as THREE from 'three';
import { WeaponDef } from '../types/game';
import { SKINS_CATALOG } from '../data/weapons';
import { getSkinTexture } from './TerrainShaders';

export interface BuiltWeaponModel {
  root: THREE.Group;
  gunGroup: THREE.Group;
  movingSlide: THREE.Mesh | THREE.Group | null;
  magazine: THREE.Mesh | THREE.Group | null;
  muzzleFlash: THREE.Mesh;
  muzzleLight: THREE.PointLight;
  muzzlePosition: THREE.Vector3;
  ejectionPortPos: THREE.Vector3;
  barrelSmokeAnchor: THREE.Object3D;
  leftArm: THREE.Group | null;
  rightArm: THREE.Group | null;
}

/**
 * Builds high-fidelity 10-14 part procedural firearm assemblies
 * Includes receivers, fluted barrels, picatinny rails, rifled muzzle brakes,
 * reciprocating bolt/slide carrier assemblies, tactical optics, and trigger assemblies.
 */
export function buildDetailedWeapon(
  wep: WeaponDef,
  skinId: string = 'default',
  isViewModel: boolean = true
): BuiltWeaponModel {
  const root = new THREE.Group();
  const gunGroup = new THREE.Group();
  root.add(gunGroup);

  const skinDef = SKINS_CATALOG.find((s) => s.id === skinId) || SKINS_CATALOG[0];
  const skinTex = getSkinTexture(skinId);

  // Materials with physical contrast
  const skinMat = new THREE.MeshStandardMaterial({
    map: skinTex,
    metalness: skinDef.metalness,
    roughness: skinDef.roughness,
    emissive: skinDef.emissive,
    emissiveIntensity: skinDef.emissiveIntensity,
    envMapIntensity: 1.25,
  });
  if (skinId === 'magma' || skinId === 'toxic' || skinId === 'nebula' || skinId === 'frost') {
    skinMat.userData = { pulseSkin: skinId, baseEmissiveInt: skinDef.emissiveIntensity };
  }

  const darkGunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x0c0f18,
    metalness: 0.95,
    roughness: 0.22,
    envMapIntensity: 1.3,
  });

  const steelBoltMat = new THREE.MeshStandardMaterial({
    color: 0x9099a8,
    metalness: 0.98,
    roughness: 0.15,
  });

  const energyAccentMat = new THREE.MeshStandardMaterial({
    color: wep.color,
    emissive: wep.color,
    emissiveIntensity: 1.2,
  });

  const picatinnyRailMat = new THREE.MeshStandardMaterial({
    color: 0x181e2b,
    metalness: 0.8,
    roughness: 0.38,
  });

  const tacticalGripMat = new THREE.MeshStandardMaterial({
    color: 0x080a0e,
    metalness: 0.05,
    roughness: 0.92,
  });

  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    transmission: 0.6,
    ior: 1.5,
  });

  const isPistol = wep.cat === 'pistol';
  const isSMG = wep.cat === 'smg';
  const isRifle = wep.cat === 'rifle';
  const isShotgun = wep.cat === 'shotgun';
  const isSniper = wep.cat === 'sniper';
  const isHeavy = wep.cat === 'heavy';

  let bodyLen = 0.44;
  let bodyH = 0.095;
  let bodyW = 0.068;
  let barrelLen = 0.38;
  let barrelR = 0.022;

  if (isPistol) {
    bodyLen = 0.22;
    bodyH = 0.07;
    bodyW = 0.048;
    barrelLen = 0.16;
    barrelR = 0.016;
  } else if (isSMG) {
    bodyLen = 0.32;
    bodyH = 0.085;
    bodyW = 0.062;
    barrelLen = 0.24;
    barrelR = 0.019;
  } else if (isRifle) {
    bodyLen = 0.46;
    bodyH = 0.098;
    bodyW = 0.068;
    barrelLen = 0.40;
    barrelR = 0.022;
  } else if (isShotgun) {
    bodyLen = 0.48;
    bodyH = 0.11;
    bodyW = 0.082;
    barrelLen = 0.38;
    barrelR = 0.034;
  } else if (isSniper) {
    bodyLen = 0.58;
    bodyH = 0.105;
    bodyW = 0.072;
    barrelLen = 0.64;
    barrelR = 0.025;
  } else if (isHeavy) {
    bodyLen = 0.54;
    bodyH = 0.14;
    bodyW = 0.12;
    barrelLen = 0.48;
    barrelR = 0.042;
  }

  // 1. Lower Receiver & Fire Control Group
  const lowerReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW, bodyH * 0.55, bodyLen * 0.95),
    darkGunMetalMat
  );
  lowerReceiver.castShadow = true;
  gunGroup.add(lowerReceiver);

  // 2. Upper Receiver / Main Chassis (with Custom Skin)
  const upperReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW * 0.94, bodyH * 0.5, bodyLen),
    skinMat
  );
  upperReceiver.position.set(0, bodyH * 0.48, -bodyLen * 0.02);
  upperReceiver.castShadow = true;
  gunGroup.add(upperReceiver);

  // 3. Reciprocating Slide / Bolt Carrier (Blows back on each shot)
  let movingSlide: THREE.Mesh | THREE.Group | null = null;
  if (isPistol) {
    // Entire top slide moves back
    const slide = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.96, bodyH * 0.48, bodyLen * 0.98),
      skinMat
    );
    slide.position.set(0, bodyH * 0.48, -bodyLen * 0.01);

    // Ejection port cutout on slide
    const ejectPort = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.4, 0.024, 0.06),
      darkGunMetalMat
    );
    ejectPort.position.set(bodyW * 0.32, 0.012, 0.02);
    slide.add(ejectPort);

    // Iron sights
    const frontSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.016, 0.012),
      energyAccentMat
    );
    frontSight.position.set(0, bodyH * 0.26, -bodyLen * 0.45);
    slide.add(frontSight);

    const rearSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, 0.014, 0.012),
      darkGunMetalMat
    );
    rearSight.position.set(0, bodyH * 0.25, bodyLen * 0.42);
    slide.add(rearSight);

    gunGroup.add(slide);
    movingSlide = slide;
  } else {
    // Internal bolt carrier / charging handle that reciprocates
    const boltGroup = new THREE.Group();
    const boltCarrier = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.42, bodyH * 0.35, bodyLen * 0.4),
      steelBoltMat
    );
    boltCarrier.position.set(bodyW * 0.25, bodyH * 0.42, 0.02);
    boltGroup.add(boltCarrier);

    // Cocking / charging handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.045, 8),
      darkGunMetalMat
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(bodyW * 0.52, bodyH * 0.48, -0.05);
    boltGroup.add(handle);

    gunGroup.add(boltGroup);
    movingSlide = boltGroup;
  }

  // 4. Picatinny Tactical Rails
  const topRail = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW * 0.72, 0.016, bodyLen * 0.8),
    picatinnyRailMat
  );
  topRail.position.set(0, bodyH * 0.76, -bodyLen * 0.05);
  gunGroup.add(topRail);

  // 5. Fluted Match-Grade Barrel & Rifled Crown
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(barrelR, barrelR, barrelLen, 16),
    darkGunMetalMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, bodyH * 0.24, -bodyLen / 2 - barrelLen / 2);
  barrel.castShadow = true;
  gunGroup.add(barrel);

  // Barrel Fluting / Heat Ribs
  if (isRifle || isSniper) {
    for (let r = 0; r < 4; r++) {
      const flute = new THREE.Mesh(
        new THREE.BoxGeometry(0.006, barrelLen * 0.7, 0.006),
        darkGunMetalMat
      );
      const angle = (r * Math.PI) / 2;
      flute.position.set(
        Math.cos(angle) * (barrelR + 0.001),
        bodyH * 0.24 + Math.sin(angle) * (barrelR + 0.001),
        -bodyLen / 2 - barrelLen / 2
      );
      flute.rotation.x = Math.PI / 2;
      gunGroup.add(flute);
    }
  }

  // 6. Tactical Vented Handguard / Barrel Shroud
  if (!isPistol) {
    const shroudLen = barrelLen * 0.65;
    const shroud = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 1.06, bodyH * 0.78, shroudLen),
      skinMat
    );
    shroud.position.set(0, bodyH * 0.24, -bodyLen / 2 - shroudLen / 2);
    gunGroup.add(shroud);

    // M-LOK Cooling Vents with subtle inner energy glow
    const vents = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 1.09, 0.016, shroudLen * 0.75),
      energyAccentMat
    );
    vents.position.set(0, bodyH * 0.24, -bodyLen / 2 - shroudLen / 2);
    gunGroup.add(vents);
  }

  // 7. Multi-Port Muzzle Brake / Flash Compensator
  const brakeLen = isSniper ? 0.12 : 0.08;
  const brakeR = barrelR * 1.45;
  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(brakeR, brakeR, brakeLen, 12),
    darkGunMetalMat
  );
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, bodyH * 0.24, -bodyLen / 2 - barrelLen - brakeLen / 2);
  gunGroup.add(muzzleBrake);

  // Lateral gas dispersion ports on muzzle brake
  const gasPort1 = new THREE.Mesh(
    new THREE.BoxGeometry(brakeR * 2.1, 0.016, brakeLen * 0.5),
    darkGunMetalMat
  );
  gasPort1.position.copy(muzzleBrake.position);
  gunGroup.add(gasPort1);

  // 8. Tactical Ergonomic Grip & Trigger Guard
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW * 0.68, 0.17, 0.068),
    tacticalGripMat
  );
  grip.rotation.x = -0.32;
  grip.position.set(0, -bodyH * 0.72, bodyLen * 0.22);
  gunGroup.add(grip);

  // Trigger Guard & Trigger
  const triggerGuard = new THREE.Mesh(
    new THREE.TorusGeometry(0.038, 0.005, 8, 16, Math.PI),
    darkGunMetalMat
  );
  triggerGuard.rotation.y = Math.PI / 2;
  triggerGuard.position.set(0, -bodyH * 0.35, bodyLen * 0.12);
  gunGroup.add(triggerGuard);

  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.032, 0.012),
    steelBoltMat
  );
  trigger.rotation.x = 0.25;
  trigger.position.set(0, -bodyH * 0.35, bodyLen * 0.11);
  gunGroup.add(trigger);

  // 9. Stock / Telescopic Buffer Tube
  if (isRifle || isSniper || isShotgun || isHeavy) {
    const bufferTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.019, 0.24, 12),
      darkGunMetalMat
    );
    bufferTube.rotation.x = Math.PI / 2;
    bufferTube.position.set(0, bodyH * 0.22, bodyLen / 2 + 0.11);
    gunGroup.add(bufferTube);

    const stockPlate = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.88, 0.17, 0.08),
      skinMat
    );
    stockPlate.position.set(0, bodyH * 0.06, bodyLen / 2 + 0.24);
    gunGroup.add(stockPlate);

    const cheekRest = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.75, 0.04, 0.14),
      tacticalGripMat
    );
    cheekRest.position.set(0, bodyH * 0.32, bodyLen / 2 + 0.15);
    gunGroup.add(cheekRest);
  }

  // 10. Optics (8X Sniper Scope or Holographic Sight)
  if (wep.scopeType === 'sniper') {
    const scopeGroup = new THREE.Group();
    scopeGroup.position.set(0, bodyH * 0.82 + 0.05, -0.04);

    // Main Tube
    const scopeTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.36, 16),
      darkGunMetalMat
    );
    scopeTube.rotation.x = Math.PI / 2;
    scopeGroup.add(scopeTube);

    // Objective Bell (Front)
    const objBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.026, 0.11, 16),
      skinMat
    );
    objBell.rotation.x = Math.PI / 2;
    objBell.position.z = -0.19;
    scopeGroup.add(objBell);

    // Ocular Bell (Rear eyepiece)
    const eyeBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.034, 0.09, 16),
      skinMat
    );
    eyeBell.rotation.x = Math.PI / 2;
    eyeBell.position.z = 0.18;
    scopeGroup.add(eyeBell);

    // Glass Lenses
    const objLens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 16), lensGlassMat);
    objLens.position.z = -0.245;
    scopeGroup.add(objLens);

    // Elevation & Windage Turrets
    const elevTurret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.028, 12),
      darkGunMetalMat
    );
    elevTurret.position.set(0, 0.035, -0.01);
    scopeGroup.add(elevTurret);

    const windTurret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.028, 12),
      darkGunMetalMat
    );
    windTurret.rotation.z = Math.PI / 2;
    windTurret.position.set(0.035, 0, -0.01);
    scopeGroup.add(windTurret);

    // Scope Mount Rings
    [-0.09, 0.08].forEach((zPos) => {
      const ring = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 0.75, 0.07, 0.03),
        picatinnyRailMat
      );
      ring.position.set(0, -0.02, zPos);
      scopeGroup.add(ring);
    });

    gunGroup.add(scopeGroup);
  } else if (wep.scopeType === 'tactical' || isRifle) {
    const holoGroup = new THREE.Group();
    holoGroup.position.set(0, bodyH * 0.82 + 0.035, -0.06);

    const holoBase = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.82, 0.025, 0.17),
      picatinnyRailMat
    );
    holoGroup.add(holoBase);

    const holoHood = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.78, 0.055, 0.13),
      skinMat
    );
    holoHood.position.set(0, 0.035, 0);
    holoGroup.add(holoHood);

    // Reflex Reticle Glass
    const sightGlass = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.65, 0.045, 0.008),
      lensGlassMat
    );
    sightGlass.position.set(0, 0.035, -0.01);
    holoGroup.add(sightGlass);

    gunGroup.add(holoGroup);
  }

  // 11. Magazine Assembly (Drops during tactical reload)
  let magH = 0.24;
  let magW = bodyW * 0.72;
  let magD = 0.085;
  if (isPistol) {
    magH = 0.15;
    magD = 0.052;
  }
  const magMesh = new THREE.Mesh(
    new THREE.BoxGeometry(magW, magH, magD),
    darkGunMetalMat
  );
  magMesh.position.set(0, -magH * 0.52, 0.02);
  magMesh.rotation.x = 0.18;
  gunGroup.add(magMesh);

  // Magazine Baseplate
  const magBase = new THREE.Mesh(
    new THREE.BoxGeometry(magW * 1.15, 0.018, magD * 1.15),
    picatinnyRailMat
  );
  magBase.position.set(0, -magH * 0.5, 0);
  magMesh.add(magBase);

  // 12. Muzzle Flash Cone & Point Light
  const flashGeo = new THREE.ConeGeometry(0.095, 0.28, 8);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffff44,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  const muzzleZ = -bodyLen / 2 - barrelLen - brakeLen - 0.14;
  muzzleFlash.position.set(0, bodyH * 0.24, muzzleZ);
  gunGroup.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight(0xffbb33, 0, 18);
  muzzleFlash.add(muzzleLight);

  const muzzlePosition = new THREE.Vector3(0, bodyH * 0.24, muzzleZ);
  const ejectionPortPos = new THREE.Vector3(bodyW * 0.45, bodyH * 0.45, 0.02);

  const barrelSmokeAnchor = new THREE.Object3D();
  barrelSmokeAnchor.position.copy(muzzlePosition);
  gunGroup.add(barrelSmokeAnchor);

  // 13. First-Person Tactical Arms & Sleeves
  let leftArm: THREE.Group | null = null;
  let rightArm: THREE.Group | null = null;

  if (isViewModel) {
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x141a26,
      roughness: 0.72,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x090c12,
      roughness: 0.65,
      metalness: 0.15,
    });

    rightArm = new THREE.Group();
    const rForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.062, 0.44, 12),
      sleeveMat
    );
    rForearm.position.set(0.14, -0.16, 0.16);
    rForearm.rotation.set(0.6, -0.3, 0.4);
    rightArm.add(rForearm);

    const rHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.078, 0.11),
      gloveMat
    );
    rHand.position.set(0.02, -0.02, 0.02);
    rightArm.add(rHand);
    gunGroup.add(rightArm);

    leftArm = new THREE.Group();
    const lForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.062, 0.48, 12),
      sleeveMat
    );
    lForearm.position.set(-0.22, -0.22, -0.05);
    lForearm.rotation.set(0.7, 0.4, -0.5);
    leftArm.add(lForearm);

    const lHand = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.078, 0.11),
      gloveMat
    );
    lHand.position.set(-0.02, -0.02, -0.16);
    leftArm.add(lHand);
    gunGroup.add(leftArm);

    // Initial hip fire position
    gunGroup.position.set(0.24, -0.20, -0.45);
  }

  return {
    root,
    gunGroup,
    movingSlide,
    magazine: magMesh,
    muzzleFlash,
    muzzleLight,
    muzzlePosition,
    ejectionPortPos,
    barrelSmokeAnchor,
    leftArm,
    rightArm,
  };
}
