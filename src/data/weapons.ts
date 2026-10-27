import { WeaponDef, WeaponSkin } from '../types/game';

export const WEAPONS_CATALOG: WeaponDef[] = [
  // PISTOLS
  { id: 0, name: "Pulse Pistol", cost: 0, dmg: 26, rate: 220, mag: 12, color: 0x00ffcc, recoil: 0.024, scopeType: 'none', zoomFov: 62, cat: "pistol", muzzleVelocity: 390, gravityScale: 1.0, spread: 0.012, recoilKick: 0.04 },
  { id: 1, name: "Desert Viper .50", cost: 350, dmg: 52, rate: 360, mag: 7, color: 0xe0e0e0, recoil: 0.055, scopeType: 'none', zoomFov: 60, cat: "pistol", muzzleVelocity: 470, gravityScale: 0.9, spread: 0.010, recoilKick: 0.06 },
  { id: 2, name: "Dual Enforcers", cost: 500, dmg: 42, rate: 190, mag: 14, color: 0xffaa00, recoil: 0.045, scopeType: 'none', zoomFov: 62, cat: "pistol", muzzleVelocity: 410, gravityScale: 1.0, spread: 0.018, recoilKick: 0.045 },
  { id: 3, name: "Energy Magnum", cost: 750, dmg: 68, rate: 420, mag: 6, color: 0x00d2ff, recoil: 0.068, scopeType: 'none', zoomFov: 58, cat: "pistol", muzzleVelocity: 550, gravityScale: 0.7, spread: 0.008, recoilKick: 0.065 },

  // SMGS
  { id: 4, name: "Vector-X SMG", cost: 800, dmg: 20, rate: 75, mag: 36, color: 0xff0055, recoil: 0.018, scopeType: 'none', zoomFov: 55, cat: "smg", muzzleVelocity: 460, gravityScale: 1.0, spread: 0.022, recoilKick: 0.035 },
  { id: 5, name: "Cyber Uzi", cost: 950, dmg: 22, rate: 68, mag: 32, color: 0x5a6577, recoil: 0.022, scopeType: 'none', zoomFov: 56, cat: "smg", muzzleVelocity: 440, gravityScale: 1.0, spread: 0.025, recoilKick: 0.038 },
  { id: 6, name: "Neon Spectre", cost: 1100, dmg: 25, rate: 85, mag: 30, color: 0x00ff88, recoil: 0.020, scopeType: 'none', zoomFov: 54, cat: "smg", muzzleVelocity: 500, gravityScale: 0.9, spread: 0.018, recoilKick: 0.035 },
  { id: 7, name: "Plasma PDW", cost: 1300, dmg: 27, rate: 95, mag: 30, color: 0x9370db, recoil: 0.024, scopeType: 'none', zoomFov: 54, cat: "smg", muzzleVelocity: 540, gravityScale: 0.8, spread: 0.016, recoilKick: 0.04 },

  // ASSAULT RIFLES
  { id: 8, name: "Vortex Carbine", cost: 1500, dmg: 32, rate: 120, mag: 30, color: 0x00ffcc, recoil: 0.028, scopeType: 'tactical', zoomFov: 36, cat: "rifle", muzzleVelocity: 740, gravityScale: 0.7, spread: 0.009, recoilKick: 0.05 },
  { id: 9, name: "AK-99 Cyber", cost: 1800, dmg: 40, rate: 140, mag: 30, color: 0xff6600, recoil: 0.040, scopeType: 'tactical', zoomFov: 36, cat: "rifle", muzzleVelocity: 710, gravityScale: 0.75, spread: 0.011, recoilKick: 0.058 },
  { id: 10, name: "M4-Neon Operator", cost: 2000, dmg: 35, rate: 110, mag: 30, color: 0x00bfff, recoil: 0.028, scopeType: 'tactical', zoomFov: 35, cat: "rifle", muzzleVelocity: 780, gravityScale: 0.65, spread: 0.008, recoilKick: 0.048 },
  { id: 11, name: "Arc Pulsar", cost: 2300, dmg: 38, rate: 130, mag: 28, color: 0x7fff00, recoil: 0.030, scopeType: 'tactical', zoomFov: 35, cat: "rifle", muzzleVelocity: 800, gravityScale: 0.6, spread: 0.007, recoilKick: 0.05 },
  { id: 12, name: "Plasma Repeater", cost: 2600, dmg: 44, rate: 150, mag: 25, color: 0xff00aa, recoil: 0.034, scopeType: 'tactical', zoomFov: 34, cat: "rifle", muzzleVelocity: 820, gravityScale: 0.55, spread: 0.007, recoilKick: 0.052 },
  { id: 13, name: "Apex Commando", cost: 3000, dmg: 50, rate: 120, mag: 30, color: 0xffd700, recoil: 0.032, scopeType: 'tactical', zoomFov: 32, cat: "rifle", muzzleVelocity: 840, gravityScale: 0.5, spread: 0.006, recoilKick: 0.05 },

  // SHOTGUNS
  { id: 14, name: "Scatter Cannon", cost: 1200, dmg: 14, rate: 580, mag: 6, color: 0x777777, recoil: 0.080, scopeType: 'none', zoomFov: 60, cat: "shotgun", muzzleVelocity: 420, gravityScale: 1.2, pellets: 8, spread: 0.065, recoilKick: 0.07 },
  { id: 15, name: "Heavy Tactical Pump", cost: 1600, dmg: 18, rate: 720, mag: 5, color: 0x333333, recoil: 0.095, scopeType: 'none', zoomFov: 60, cat: "shotgun", muzzleVelocity: 440, gravityScale: 1.1, pellets: 8, spread: 0.055, recoilKick: 0.08 },
  { id: 16, name: "Auto Sweeper 12G", cost: 2200, dmg: 12, rate: 260, mag: 10, color: 0x8b0000, recoil: 0.060, scopeType: 'none', zoomFov: 60, cat: "shotgun", muzzleVelocity: 410, gravityScale: 1.2, pellets: 7, spread: 0.075, recoilKick: 0.06 },
  { id: 17, name: "Double Doom Super", cost: 3200, dmg: 22, rate: 820, mag: 2, color: 0x556b2f, recoil: 0.130, scopeType: 'none', zoomFov: 60, cat: "shotgun", muzzleVelocity: 450, gravityScale: 1.1, pellets: 12, spread: 0.080, recoilKick: 0.10 },

  // SNIPER RIFLES
  { id: 18, name: "Apex Long-Range Sniper", cost: 2500, dmg: 125, rate: 820, mag: 5, color: 0x00ffcc, recoil: 0.095, scopeType: 'sniper', zoomFov: 14, cat: "sniper", muzzleVelocity: 940, gravityScale: 0.35, spread: 0.001, recoilKick: 0.08 },
  { id: 19, name: "Sentinel Marksman .338", cost: 3500, dmg: 145, rate: 740, mag: 6, color: 0x00aaff, recoil: 0.105, scopeType: 'sniper', zoomFov: 12, cat: "sniper", muzzleVelocity: 970, gravityScale: 0.30, spread: 0.0008, recoilKick: 0.085 },
  { id: 20, name: "Void Railgun", cost: 4800, dmg: 195, rate: 1020, mag: 4, color: 0x00ffff, recoil: 0.130, scopeType: 'sniper', zoomFov: 10, cat: "sniper", muzzleVelocity: 1200, gravityScale: 0.15, spread: 0.0005, recoilKick: 0.09 },
  { id: 21, name: "Anti-Material .50 BMG", cost: 6500, dmg: 235, rate: 1200, mag: 5, color: 0x4b5320, recoil: 0.170, scopeType: 'sniper', zoomFov: 9, cat: "sniper", muzzleVelocity: 1050, gravityScale: 0.25, spread: 0.0005, recoilKick: 0.11 },
  { id: 22, name: "Dragon Breath .50", cost: 8500, dmg: 310, rate: 1100, mag: 3, color: 0xff4500, recoil: 0.190, scopeType: 'sniper', zoomFov: 8, cat: "sniper", muzzleVelocity: 1100, gravityScale: 0.20, spread: 0.0004, recoilKick: 0.12 },

  // HEAVY & PROTOTYPES
  { id: 23, name: "Rocket Pod Launcher", cost: 5000, dmg: 195, rate: 920, mag: 4, color: 0xb8860b, recoil: 0.135, scopeType: 'none', zoomFov: 50, cat: "heavy", muzzleVelocity: 260, gravityScale: 0.6, spread: 0.005, recoilKick: 0.08 },
  { id: 24, name: "Plasma Minigun Vulcan", cost: 6500, dmg: 28, rate: 45, mag: 100, color: 0x1f242e, recoil: 0.018, scopeType: 'none', zoomFov: 55, cat: "heavy", muzzleVelocity: 680, gravityScale: 0.7, spread: 0.024, recoilKick: 0.02 },
  { id: 25, name: "Gauss Field Cannon", cost: 8000, dmg: 245, rate: 880, mag: 5, color: 0x2f4f4f, recoil: 0.140, scopeType: 'tactical', zoomFov: 28, cat: "heavy", muzzleVelocity: 1150, gravityScale: 0.2, spread: 0.002, recoilKick: 0.09 },
  { id: 26, name: "Singularity Beam Prototype", cost: 10000, dmg: 350, rate: 1000, mag: 3, color: 0x9370db, recoil: 0.150, scopeType: 'sniper', zoomFov: 10, cat: "heavy", muzzleVelocity: 1400, gravityScale: 0.1, spread: 0.0003, recoilKick: 0.10 },
  { id: 27, name: "Golden Obliterator", cost: 15000, dmg: 999, rate: 260, mag: 10, color: 0xffd700, recoil: 0.075, scopeType: 'sniper', zoomFov: 8, cat: "heavy", muzzleVelocity: 1500, gravityScale: 0.05, spread: 0.0001, recoilKick: 0.06 }
];

export const SKINS_CATALOG: WeaponSkin[] = [
  { id: 'default', name: 'Default Carbon Cyber', icon: '🔷', cost: 0, desc: 'Aviation carbon composite weave with cyan circuit tracing.', metalness: 0.85, roughness: 0.25, emissive: 0x000000, emissiveIntensity: 0.0 },
  { id: 'magma', name: 'Inferno Magma', icon: '🔥', cost: 2500, desc: 'Volcanic obsidian chassis with pulsating molten magma cracks.', metalness: 0.35, roughness: 0.55, emissive: 0xff2200, emissiveIntensity: 0.75 },
  { id: 'gold', name: 'Hyperion 24K Gold', icon: '👑', cost: 5000, desc: 'Mirror-polished 24-karat gold with Damascene hand engravings.', metalness: 0.96, roughness: 0.12, emissive: 0x000000, emissiveIntensity: 0.0 },
  { id: 'nebula', name: 'Void Nebula Stellar', icon: '🌌', cost: 7500, desc: 'Deep galactic indigo coating with cosmic dust and nebula flares.', metalness: 0.72, roughness: 0.28, emissive: 0x8a2be2, emissiveIntensity: 0.55 },
  { id: 'toxic', name: 'Toxic Biohazard', icon: '☣️', cost: 3500, desc: 'Industrial matte olive with radioactive acid chevron caution bands.', metalness: 0.40, roughness: 0.48, emissive: 0x39ff14, emissiveIntensity: 0.40 },
  { id: 'frost', name: 'Arctic Cryo Frost', icon: '❄️', cost: 4500, desc: 'Sub-zero crystalline polygon camo with frosted steel trim.', metalness: 0.55, roughness: 0.20, emissive: 0x00ffff, emissiveIntensity: 0.25 }
];
