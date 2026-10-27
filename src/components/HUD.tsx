import React, { useRef } from 'react';
import { WeaponDef } from '../types/game';
import { WEAPONS_CATALOG } from '../data/weapons';

interface HUDProps {
  playerHp: number;
  playerShield: number;
  playerKills: number;
  aliveCount: number;
  wood: number;
  money: number;
  zoneTimer: number;
  currentGun: WeaponDef;
  clipAmmo: number;
  reserveAmmo: number;
  inventorySlots: number[];
  currentSlotIdx: number;
  medkits: number;
  buildMode: boolean;
  isReloading: boolean;
  reloadProgress: number;
  isHealing: boolean;
  healProgress: number;
  isSpectating: boolean;
  spectateTimer: number;
  killerName: string;
  isNearClimbable: boolean;
  damageFlash: boolean;
  hitmarkerVisible: boolean;
  adsProgress: number;
  currentYaw: number;
  spreadBloom: number;
}

export const HUD: React.FC<HUDProps> = ({
  playerHp,
  playerShield,
  playerKills,
  aliveCount,
  wood,
  money,
  zoneTimer,
  currentGun,
  clipAmmo,
  reserveAmmo,
  inventorySlots,
  currentSlotIdx,
  medkits,
  buildMode,
  isReloading,
  reloadProgress,
  isHealing,
  healProgress,
  isSpectating,
  spectateTimer,
  killerName,
  isNearClimbable,
  damageFlash,
  hitmarkerVisible,
  adsProgress,
  currentYaw,
  spreadBloom,
}) => {
  const compassRibbonRef = useRef<HTMLDivElement | null>(null);

  // Compass Degree Math
  let deg = Math.round((currentYaw * (180 / Math.PI)) % 360);
  if (deg < 0) deg += 360;
  const compassOffset = -(deg / 15) * 45;

  const isSniperActive = currentGun.scopeType === 'sniper';
  const isTacticalActive = currentGun.scopeType === 'tactical';

  // Dynamic crosshair spread in pixels
  const spreadPx = Math.max(0, Math.min(26, Math.round(spreadBloom * 160)));

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
      {/* Cinematic Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 55%, rgba(1, 3, 8, 0.65) 100%)',
        }}
      />

      {/* Low Health Blood Vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: playerHp < 35 && !isSpectating ? (35 - playerHp) / 35 : 0,
          background: 'radial-gradient(circle at center, transparent 40%, rgba(200, 0, 20, 0.45) 80%, rgba(130, 0, 0, 0.85) 100%)',
        }}
      />

      {/* Healing Green Vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHealing ? 0.75 : 0,
          background: 'radial-gradient(circle at center, transparent 50%, rgba(0, 255, 140, 0.25) 85%, rgba(0, 200, 100, 0.6) 100%)',
        }}
      />

      {/* Directional Damage Flash Ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border-4 border-rose-500 pointer-events-none transition-opacity duration-150"
        style={{ opacity: damageFlash ? 0.9 : 0 }}
      />

      {/* Hitmarker Cross */}
      {hitmarkerVisible && <div className="hitmarker-cross" />}

      {/* Compass Ribbon */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-80 h-9 bg-slate-950/85 border border-cyan-400/40 rounded-lg overflow-hidden flex items-center justify-center shadow-lg shadow-black/60">
        <div
          ref={compassRibbonRef}
          className="flex absolute whitespace-nowrap font-mono text-[11px] font-black text-slate-400 transition-transform duration-75"
          style={{ transform: `translateX(${compassOffset - 360}px)` }}
        >
          {Array.from({ length: 3 }).flatMap((_, loopIdx) =>
            Array.from({ length: 24 }).map((_, stepIdx) => {
              const d = stepIdx * 15;
              let label = d.toString().padStart(3, '0');
              if (d === 0) label = 'N';
              else if (d === 45) label = 'NE';
              else if (d === 90) label = 'E';
              else if (d === 135) label = 'SE';
              else if (d === 180) label = 'S';
              else if (d === 225) label = 'SW';
              else if (d === 270) label = 'W';
              else if (d === 315) label = 'NW';
              return (
                <span
                  key={`${loopIdx}-${stepIdx}`}
                  className={`inline-block w-[45px] text-center ${
                    label === 'N' || label === 'E' || label === 'S' || label === 'W'
                      ? 'text-cyan-400 font-extrabold'
                      : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              );
            })
          )}
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-cyan-400 shadow-[0_0_8px_#00ffcc]" />
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-cyan-400 font-mono font-bold">
          {deg.toString().padStart(3, '0')}°
        </div>
      </div>

      {/* Top Match Stats Bar */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 max-w-4xl w-[92vw] flex justify-between items-center bg-slate-950/85 border border-cyan-400/30 rounded-xl px-6 py-2.5 shadow-xl shadow-black/50">
        <div className="text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Remaining</div>
          <div className="text-lg md:text-xl font-black text-cyan-400 font-chakra">{aliveCount}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Confirmed Kills</div>
          <div className="text-lg md:text-xl font-black text-cyan-400 font-chakra">{playerKills}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Wood Mat</div>
          <div className="text-lg md:text-xl font-black text-amber-400 font-chakra">{wood}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">Combat Funds</div>
          <div className="text-lg md:text-xl font-black text-yellow-400 font-chakra">${money.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Safe Zone</div>
          <div className="text-lg md:text-xl font-black text-rose-400 font-chakra">
            00:{Math.max(0, Math.floor(zoneTimer)).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Action Prompts */}
      {isNearClimbable && (
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-400/20 border border-cyan-400 text-cyan-300 px-5 py-2 rounded-full font-black text-xs tracking-wider animate-climb shadow-lg shadow-cyan-400/20">
          HOLD [W] OR [SPACE] TO CLIMB WALL / ELEVATION
        </div>
      )}

      {buildMode && (
        <div className="absolute top-[64%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 border border-amber-500 text-amber-400 px-6 py-2 rounded-xl font-black text-xs tracking-wider shadow-xl shadow-amber-500/20">
          [LEFT CLICK] PLACE FORTIFICATION (10 WOOD) · [Q] EXIT BUILD MODE
        </div>
      )}

      {/* Reloading Bar */}
      {isReloading && (
        <div className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 border border-amber-400 text-amber-400 px-6 py-3 rounded-xl font-black text-xs tracking-widest text-center shadow-xl shadow-amber-400/20">
          <div>RELOADING CYBER WEAPON...</div>
          <div className="w-36 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-75"
              style={{ width: `${Math.min(100, reloadProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Healing Stim Bar */}
      {isHealing && (
        <div className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 border border-emerald-400 text-emerald-400 px-6 py-3 rounded-xl font-black text-xs tracking-widest text-center shadow-xl shadow-emerald-400/20">
          <div>APPLYING NANO-STIM MEDKIT...</div>
          <div className="w-40 h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
              style={{ width: `${Math.min(100, healProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Dynamic Hip-Fire Crosshair */}
      {!buildMode && !isSpectating && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 pointer-events-none transition-opacity duration-150"
          style={{ opacity: Math.max(0, 1.0 - adsProgress * 2.4) }}
        >
          {/* Top Line */}
          <div
            className="absolute left-[19px] w-0.5 h-2 bg-cyan-400 rounded-sm shadow-[0_0_5px_#00ffcc] transition-transform duration-75"
            style={{ top: 0, transform: `translateY(-${spreadPx}px)` }}
          />
          {/* Bottom Line */}
          <div
            className="absolute left-[19px] w-0.5 h-2 bg-cyan-400 rounded-sm shadow-[0_0_5px_#00ffcc] transition-transform duration-75"
            style={{ bottom: 0, transform: `translateY(${spreadPx}px)` }}
          />
          {/* Left Line */}
          <div
            className="absolute top-[19px] h-0.5 w-2 bg-cyan-400 rounded-sm shadow-[0_0_5px_#00ffcc] transition-transform duration-75"
            style={{ left: 0, transform: `translateX(-${spreadPx}px)` }}
          />
          {/* Right Line */}
          <div
            className="absolute top-[19px] h-0.5 w-2 bg-cyan-400 rounded-sm shadow-[0_0_5px_#00ffcc] transition-transform duration-75"
            style={{ right: 0, transform: `translateX(${spreadPx}px)` }}
          />
          {/* Center Point */}
          <div className="absolute top-[19px] left-[19px] w-0.5 h-0.5 bg-yellow-400 rounded-full shadow-[0_0_4px_#ffd700]" />
        </div>
      )}

      {/* 8X Optical Sniper Scope Overlay */}
      {isSniperActive && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: adsProgress > 0.6 ? (adsProgress - 0.6) / 0.4 : 0,
            background: 'radial-gradient(circle at center, transparent 24%, rgba(0,0,0,0.94) 48%, #000 100%)',
          }}
        >
          <div className="absolute top-12 left-1/2 -translate-x-1/2 text-cyan-400 font-mono font-bold text-xs tracking-widest">
            8X LONG-RANGE BALLISTIC OPTICS // HIGH VELOCITY
          </div>
          {/* Vertical Stadia */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-cyan-400/80" />
          {/* Horizontal Stadia */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-cyan-400/80" />
          {/* Outer Reticle Ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] border-2 border-cyan-400 rounded-full shadow-[0_0_20px_rgba(0,255,204,0.3)]" />
          {/* Mil-Dots for Bullet Drop Compensation */}
          {[0.44, 0.38, 0.56, 0.62].map((yP, i) => (
            <div
              key={`dot-v-${i}`}
              className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${yP * 100}%`, left: '50%' }}
            />
          ))}
          {[0.44, 0.38, 0.56, 0.62].map((xP, i) => (
            <div
              key={`dot-h-${i}`}
              className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ top: '50%', left: `${xP * 100}%` }}
            />
          ))}
        </div>
      )}

      {/* 3.5X Tactical Holographic Scope Overlay */}
      {isTacticalActive && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: adsProgress > 0.5 ? (adsProgress - 0.5) / 0.5 : 0,
            background: 'radial-gradient(circle at center, transparent 38%, rgba(2,6,12,0.85) 75%, rgba(0,0,0,0.98) 100%)',
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-cyan-400/50 rounded-full flex items-center justify-center shadow-[inset_0_0_25px_rgba(0,255,204,0.2)]">
            <div className="w-3.5 h-3.5 border border-cyan-400 rounded-full relative flex items-center justify-center">
              <div className="w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_6px_#ffd700]" />
            </div>
            {/* Holographic Chevron */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-cyan-400" />
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-cyan-400" />
            <div className="absolute top-1/2 left-9 -translate-y-1/2 w-8 h-0.5 bg-cyan-400" />
            <div className="absolute top-1/2 right-9 -translate-y-1/2 w-8 h-0.5 bg-cyan-400" />
          </div>
          <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 text-cyan-400 font-mono text-[11px] font-bold tracking-widest">
            TACTICAL ACOG 3.5X // TARGET LOCK ON
          </div>
        </div>
      )}

      {/* Spectator Overlay */}
      {isSpectating && (
        <div className="absolute inset-0 bg-rose-950/40 flex flex-col justify-between items-center p-12 pointer-events-none">
          <div className="bg-slate-950/95 border-2 border-rose-500 rounded-2xl px-12 py-4 text-center shadow-2xl shadow-rose-500/50">
            <div className="text-xs font-black tracking-widest text-rose-500 uppercase">
              ☠️ ELIMINATED BY ENEMY OPERATOR
            </div>
            <div className="text-3xl md:text-4xl font-black text-white font-chakra mt-1">{killerName}</div>
            <div className="text-[11px] text-slate-400 tracking-widest mt-1">SPECTATING COMBAT CAM</div>
          </div>

          <div className="bg-slate-950/90 border border-slate-700 rounded-full px-8 py-3 text-center">
            <div className="text-sm font-bold text-yellow-400 font-chakra">
              RETURNING TO BATTLEFIELD IN {Math.max(0, spectateTimer).toFixed(1)}S
            </div>
            <div className="w-52 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-75"
                style={{ width: `${Math.max(0, spectateTimer / 5.0) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Perimeter HUD Bar */}
      <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
        {/* Health & Shield Cluster */}
        <div className="w-64 bg-slate-950/80 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <div className="flex justify-between text-[11px] font-black tracking-wider text-slate-400">
            <span>HEALTH</span>
            <span className="text-white font-chakra">{Math.round(playerHp)}%</span>
          </div>
          <div className="w-full h-3 bg-black/70 rounded-full mt-1 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-150"
              style={{ width: `${Math.max(0, playerHp)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-black tracking-wider text-slate-400 mt-2">
            <span>TACTICAL SHIELD</span>
            <span className="text-cyan-400 font-chakra">{Math.round(playerShield)}%</span>
          </div>
          <div className="w-full h-3 bg-black/70 rounded-full mt-1 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-150"
              style={{ width: `${Math.max(0, playerShield)}%` }}
            />
          </div>
        </div>

        {/* Inventory Slots (Primary, Secondary, Special, Medkit, Build) */}
        <div className="flex gap-2 bg-slate-950/80 border border-cyan-500/30 rounded-xl p-2 shadow-xl backdrop-blur-md">
          {[0, 1, 2].map((slotIdx) => {
            const wepId = inventorySlots[slotIdx];
            const isActive = currentSlotIdx === slotIdx && !buildMode;
            return (
              <div
                key={slotIdx}
                className={`min-w-[95px] px-3 py-1.5 rounded-lg border text-center transition-all ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-400/20 shadow-md shadow-cyan-400/20'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="text-[10px] font-black text-amber-400">[{slotIdx + 1}] SLOT</div>
                <div className="text-[11px] font-bold text-white truncate max-w-[90px]">
                  {wepId !== undefined ? WEAPONS_CATALOG[wepId]?.name : 'Empty'}
                </div>
              </div>
            );
          })}

          {/* Medkit Slot */}
          <div
            className={`min-w-[90px] px-3 py-1.5 rounded-lg border text-center transition-all ${
              isHealing
                ? 'border-emerald-400 bg-emerald-400/20 shadow-md shadow-emerald-400/20'
                : 'border-emerald-500/40 bg-slate-900/60'
            }`}
          >
            <div className="text-[10px] font-black text-emerald-400">[4] MEDKIT</div>
            <div className="text-[11px] font-bold text-white">x{medkits} ➕</div>
          </div>

          {/* Build Slot */}
          <div
            className={`min-w-[90px] px-3 py-1.5 rounded-lg border text-center transition-all ${
              buildMode
                ? 'border-amber-400 bg-amber-400/25 shadow-md shadow-amber-400/20'
                : 'border-amber-500/40 bg-slate-900/60'
            }`}
          >
            <div className="text-[10px] font-black text-amber-400">[Q] FORTIFY</div>
            <div className="text-[11px] font-bold text-white">WALL 🧱</div>
          </div>
        </div>

        {/* Ammo & Active Firearm Readout */}
        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl px-5 py-3 text-right shadow-xl backdrop-blur-md min-w-[190px]">
          <div className="text-xs font-black tracking-wider text-cyan-400 uppercase truncate">
            {currentGun.name}
          </div>
          <div className="text-2xl md:text-3xl font-black font-chakra text-yellow-400">
            <span>{clipAmmo}</span>
            <span className="text-slate-500 text-lg font-normal"> / {reserveAmmo}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
            [R] Reload · [R-Click] {currentGun.scopeType === 'sniper' ? '8X Scope' : 'Aim Sights'}
          </div>
        </div>
      </div>
    </div>
  );
};
