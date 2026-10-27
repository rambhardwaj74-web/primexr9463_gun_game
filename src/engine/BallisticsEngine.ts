import * as THREE from 'three';
import { Projectile, SpentShell, ParticleEffect, DamagePopup, HumanoidBot, BuildingBox } from '../types/game';
import { audioEngine } from '../audio/RealisticAudioEngine';
import { getTerrainHeight } from './TerrainShaders';

export class BallisticsEngine {
  private scene: THREE.Scene;
  public projectiles: Projectile[] = [];
  public shells: SpentShell[] = [];
  public particles: ParticleEffect[] = [];
  public damagePopups: DamagePopup[] = [];

  // Reusable math objects to prevent garbage collection in 60fps loop
  private _raycaster = new THREE.Raycaster();
  private _rayOrigin = new THREE.Vector3();
  private _rayDir = new THREE.Vector3();
  private _tempVec = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Spawns a physical ballistic projectile with caliber velocity and gravity drop
   */
  public spawnProjectile(params: {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    muzzleVelocity: number;
    gravityScale: number;
    damage: number;
    color: number;
    isBot: boolean;
    ownerName: string;
    spread: number;
    pellet?: boolean;
  }): void {
    const spreadDir = params.direction.clone();
    if (params.spread > 0) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * params.spread;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), params.direction)
      );
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), params.direction)
      );
      spreadDir.addScaledVector(right, Math.cos(theta) * r);
      spreadDir.addScaledVector(up, Math.sin(theta) * r);
      spreadDir.normalize();
    }

    // Glowing tracer line/capsule mesh
    const tracerLen = params.pellet ? 0.35 : 0.85;
    const tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, tracerLen, 6);
    tracerGeo.rotateX(Math.PI / 2);
    const tracerMat = new THREE.MeshBasicMaterial({
      color: params.color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(tracerGeo, tracerMat);
    mesh.position.copy(params.origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), spreadDir);
    this.scene.add(mesh);

    const vel = spreadDir.multiplyScalar(params.muzzleVelocity);

    this.projectiles.push({
      mesh,
      pos: params.origin.clone(),
      prevPos: params.origin.clone(),
      vel,
      gravity: 16.5 * params.gravityScale, // Tuned for tactical 50m-150m ballistics
      drag: 0.0008,
      damage: params.damage,
      color: params.color,
      isBot: params.isBot,
      ownerName: params.ownerName,
      lifetime: 3.5,
      pellet: params.pellet,
    });
  }

  /**
   * Ejects spent brass casing with realistic physics and terrain bounces
   */
  public spawnSpentShell(pos: THREE.Vector3, cameraYaw: number): void {
    const shellGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.042, 8);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.22,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.position.copy(pos);
    this.scene.add(shellMesh);

    // Eject to the right and slightly backward/upward
    const cosY = Math.cos(cameraYaw);
    const sinY = Math.sin(cameraYaw);
    const rightX = cosY;
    const rightZ = -sinY;
    const backX = -sinY;
    const backZ = -cosY;

    const ejectSpeed = 2.4 + Math.random() * 1.2;
    const vx = rightX * ejectSpeed + backX * (Math.random() * 0.8);
    const vy = 2.2 + Math.random() * 1.5;
    const vz = rightZ * ejectSpeed + backZ * (Math.random() * 0.8);

    this.shells.push({
      mesh: shellMesh,
      vx,
      vy,
      vz,
      rotX: 12 + Math.random() * 18,
      rotY: 10 + Math.random() * 16,
      life: 2.2,
      bounces: 0,
    });
  }

  /**
   * Spawns physical impact sparks, dirt plumes, or wood splinters
   */
  public spawnImpactEffect(point: THREE.Vector3, normal: THREE.Vector3, type: 'dirt' | 'metal' | 'wood' | 'blood'): void {
    const count = type === 'blood' ? 8 : 12;
    for (let i = 0; i < count; i++) {
      const size = 0.025 + Math.random() * 0.035;
      let color = 0x00ffcc;
      if (type === 'dirt') color = 0x6e5239;
      else if (type === 'metal') color = 0xffaa00;
      else if (type === 'wood') color = 0x8b5a2b;
      else if (type === 'blood') color = 0xff0044;

      const pGeo = new THREE.BoxGeometry(size, size, size);
      const pMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(point);
      this.scene.add(pMesh);

      const scatter = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();
      scatter.addScaledVector(normal, 1.2).normalize();

      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        mesh: pMesh,
        vel: scatter.multiplyScalar(speed),
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.5,
        scaleStart: 1.0,
        scaleEnd: 0.1,
      });
    }
  }

  /**
   * Spawns floating damage text
   */
  public spawnDamagePopup(pos: THREE.Vector3, damage: number, isHeadshot: boolean = false): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = isHeadshot ? '#ffd700' : '#ff0055';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(`-${damage}`, 64, 45);
    ctx.fillText(`-${damage}`, 64, 45);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.4, 0.7, 1);
    sprite.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.2, (Math.random() - 0.5) * 0.4));
    this.scene.add(sprite);

    this.damagePopups.push({
      sprite,
      vy: 1.9,
      alpha: 1.0,
      life: 0.85,
    });
  }

  /**
   * Update loop: simulates gravity drop, flight time, segmented raycasts, and impact checks
   */
  public update(
    dt: number,
    playerPos: THREE.Vector3,
    camera: THREE.Camera,
    bots: HumanoidBot[],
    buildings: BuildingBox[],
    onBotHit: (bot: HumanoidBot, damage: number, isHeadshot: boolean, hitPoint: THREE.Vector3) => void,
    onPlayerHit: (damage: number) => void,
    onWallHit: (wall: BuildingBox, damage: number) => void
  ): void {
    // 1. Projectiles Simulation
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime -= dt;

      p.prevPos.copy(p.pos);

      // Apply aerodynamic drag and parabolic gravity drop
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(1 - p.drag);

      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);

      // Orient tracer along current velocity vector
      const speed = p.vel.length();
      if (speed > 0.001) {
        this._tempVec.copy(p.vel).normalize();
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), this._tempVec);
      }

      // Check Supersonic Flyby Near Miss (if bot bullet whizzes close past player)
      if (p.isBot) {
        const headPos = playerPos.clone();
        headPos.y += 1.6;
        const distToPlayer = p.pos.distanceTo(headPos);
        if (distToPlayer < 2.2 && p.lifetime > 0.1) {
          // Calculate stereo pan relative to camera view
          const camDir = new THREE.Vector3();
          camera.getWorldDirection(camDir);
          const toBullet = p.pos.clone().sub(headPos).normalize();
          const pan = toBullet.x;
          audioEngine.playSupersonicFlyby(pan);
        }
      }

      // Sub-step segmented collision detection between prevPos and pos
      const stepVec = p.pos.clone().sub(p.prevPos);
      const stepDist = stepVec.length();

      if (stepDist > 0.001) {
        this._rayOrigin.copy(p.prevPos);
        this._rayDir.copy(stepVec).normalize();
        this._raycaster.set(this._rayOrigin, this._rayDir);
        this._raycaster.far = stepDist;

        let hitOccurred = false;

        // Check collision against Player (if fired by bot)
        if (p.isBot) {
          const pMin = new THREE.Vector3(playerPos.x - 0.45, playerPos.y, playerPos.z - 0.45);
          const pMax = new THREE.Vector3(playerPos.x + 0.45, playerPos.y + 1.8, playerPos.z + 0.45);
          const box = new THREE.Box3(pMin, pMax);
          const ray = new THREE.Ray(p.prevPos, this._rayDir);
          const intersect = ray.intersectBox(box, new THREE.Vector3());
          if (intersect && p.prevPos.distanceTo(intersect) <= stepDist) {
            hitOccurred = true;
            this.spawnImpactEffect(intersect, new THREE.Vector3(0, 1, 0), 'blood');
            onPlayerHit(p.damage);
          }
        }

        // Check collision against Bots (if fired by player)
        if (!hitOccurred && !p.isBot) {
          for (const bot of bots) {
            if (bot.isDead) continue;
            const bPos = bot.mesh.position;
            const botBox = new THREE.Box3(
              new THREE.Vector3(bPos.x - 0.4, bPos.y, bPos.z - 0.4),
              new THREE.Vector3(bPos.x + 0.4, bPos.y + 1.9, bPos.z + 0.4)
            );
            const ray = new THREE.Ray(p.prevPos, this._rayDir);
            const intersect = ray.intersectBox(botBox, new THREE.Vector3());
            if (intersect && p.prevPos.distanceTo(intersect) <= stepDist) {
              hitOccurred = true;
              const isHeadshot = intersect.y > bPos.y + 1.55;
              const finalDmg = isHeadshot ? Math.round(p.damage * 1.85) : p.damage;

              this.spawnImpactEffect(intersect, new THREE.Vector3(0, 1, 0), 'blood');
              this.spawnDamagePopup(intersect, finalDmg, isHeadshot);
              audioEngine.playHitConfirmed(isHeadshot);
              onBotHit(bot, finalDmg, isHeadshot, intersect);
              break;
            }
          }
        }

        // Check collision against Fortifications & Buildings
        if (!hitOccurred) {
          for (const b of buildings) {
            if (
              p.pos.x >= b.xMin &&
              p.pos.x <= b.xMax &&
              p.pos.z >= b.zMin &&
              p.pos.z <= b.zMax &&
              p.pos.y >= b.baseY &&
              p.pos.y <= b.height
            ) {
              hitOccurred = true;
              const isWood = b.hp !== undefined;
              this.spawnImpactEffect(p.pos, new THREE.Vector3(0, 1, 0), isWood ? 'wood' : 'metal');
              if (isWood) {
                audioEngine.playWoodImpact();
                onWallHit(b, p.damage);
              }
              break;
            }
          }
        }

        // Check collision against Terrain Ground
        if (!hitOccurred) {
          const groundY = getTerrainHeight(p.pos.x, p.pos.z);
          if (p.pos.y <= groundY) {
            hitOccurred = true;
            p.pos.y = groundY;
            this.spawnImpactEffect(p.pos, new THREE.Vector3(0, 1, 0), 'dirt');
          }
        }

        if (hitOccurred || p.lifetime <= 0) {
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }

    // 2. Spent Brass Casings Physics
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= dt;

      s.mesh.position.x += s.vx * dt;
      s.mesh.position.z += s.vz * dt;
      s.vy -= 9.81 * dt;
      s.mesh.position.y += s.vy * dt;

      s.mesh.rotation.x += s.rotX * dt;
      s.mesh.rotation.y += s.rotY * dt;

      const floorY = getTerrainHeight(s.mesh.position.x, s.mesh.position.z);
      if (s.mesh.position.y <= floorY + 0.02) {
        s.mesh.position.y = floorY + 0.02;
        if (s.bounces < 3 && Math.abs(s.vy) > 0.5) {
          s.vy = -s.vy * 0.42;
          s.vx *= 0.65;
          s.vz *= 0.65;
          s.bounces++;
          audioEngine.playSpentShellCasing('dirt');
        } else {
          s.vx = 0;
          s.vy = 0;
          s.vz = 0;
        }
      }

      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shells.splice(i, 1);
      }
    }

    // 3. Impact Particles Physics
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.life -= dt;
      part.vel.y -= 7.5 * dt;
      part.mesh.position.addScaledVector(part.vel, dt);

      const progress = Math.max(0, part.life / part.maxLife);
      const scale = part.scaleStart * progress + part.scaleEnd * (1 - progress);
      part.mesh.scale.set(scale, scale, scale);

      if (part.life <= 0) {
        this.scene.remove(part.mesh);
        this.particles.splice(i, 1);
      }
    }

    // 4. Floating Damage Popups
    for (let i = this.damagePopups.length - 1; i >= 0; i--) {
      const f = this.damagePopups[i];
      f.life -= dt;
      f.sprite.position.y += f.vy * dt;
      f.sprite.material.opacity = Math.max(0, f.life / 0.85);
      f.sprite.quaternion.copy(camera.quaternion);

      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        this.damagePopups.splice(i, 1);
      }
    }
  }

  public clear(): void {
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.shells.forEach((s) => this.scene.remove(s.mesh));
    this.particles.forEach((part) => this.scene.remove(part.mesh));
    this.damagePopups.forEach((f) => this.scene.remove(f.sprite));
    this.projectiles = [];
    this.shells = [];
    this.particles = [];
    this.damagePopups = [];
  }
}
