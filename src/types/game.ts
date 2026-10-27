import * as THREE from 'three';

export type WeaponCategory = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'heavy';
export type ScopeType = 'none' | 'tactical' | 'sniper';

export interface WeaponDef {
  id: number;
  name: string;
  cost: number;
  dmg: number;
  rate: number; // ms between shots
  mag: number;
  color: number;
  recoil: number;
  scopeType: ScopeType;
  zoomFov: number;
  cat: WeaponCategory;
  muzzleVelocity: number; // m/s
  gravityScale: number; // bullet drop multiplier
  pellets?: number; // shotgun pellet count
  spread: number; // base spread angle in radians
  recoilKick: number; // slide/bolt blowback distance
}

export interface WeaponSkin {
  id: string;
  name: string;
  icon: string;
  cost: number;
  desc: string;
  metalness: number;
  roughness: number;
  emissive: number;
  emissiveIntensity: number;
}

export interface CareerStats {
  kills: number;
  wins: number;
  matchesPlayed: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
}

export interface SavePayload {
  money: number;
  wood: number;
  medkits: number;
  ownedGuns: number[];
  inventorySlots: number[];
  unlockedSkins: string[];
  equippedSkins: Record<number, string>;
  selectedMapType: number;
  careerStats: CareerStats;
  version: string;
  savedAt: string;
}

export interface Projectile {
  mesh: THREE.Mesh | THREE.Line;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  vel: THREE.Vector3;
  gravity: number;
  drag: number;
  damage: number;
  color: number;
  isBot: boolean;
  ownerName: string;
  lifetime: number;
  pellet?: boolean;
}

export interface SpentShell {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  life: number;
  bounces: number;
}

export interface ParticleEffect {
  mesh: THREE.Mesh | THREE.Points;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleStart: number;
  scaleEnd: number;
  color?: THREE.Color;
}

export interface DamagePopup {
  sprite: THREE.Sprite;
  vy: number;
  alpha: number;
  life: number;
}

export interface HumanoidBot {
  mesh: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  torso: THREE.Mesh;
  bFlash: THREE.Mesh;
  muzzleLight?: THREE.PointLight;
  nameSprite: THREE.Sprite;
  nameCtx: CanvasRenderingContext2D;
  nameTexture: THREE.CanvasTexture;
  name: string;
  hp: number;
  maxHp: number;
  lastShoot: number;
  walkCycle: number;
  isDead: boolean;
  deathProgress: number;
}

export interface BuildingBox {
  mesh: THREE.Mesh;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  baseY: number;
  height: number;
  hp?: number;
  maxHp?: number;
}

export interface JumpPad {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  y: number;
}

export interface LootItem {
  mesh: THREE.Mesh;
  type: 'ammo' | 'money' | 'wood' | 'medkit';
}
