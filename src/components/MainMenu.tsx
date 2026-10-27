import React, { useRef } from 'react';
import { WeaponDef, CareerStats } from '../types/game';
import { WEAPONS_CATALOG, SKINS_CATALOG } from '../data/weapons';
import { audioEngine } from '../audio/RealisticAudioEngine';

interface MainMenuProps {
  money: number;
  wood: number;
  careerStats: CareerStats;
  ownedGuns: number[];
  inventorySlots: number[];
  equippedSkins: Record<number, string>;
  selectedMapType: number;
  onSelectMap: (mapType: number) => void;
  onBuyWeapon: (weapon: WeaponDef) => void;
  onEquipSlot: (slotIdx: number, weaponId: number) => void;
  onOpenSkinsStudio: () => void;
  onStartGame: () => void;
  onSaveProfile: () => void;
  onLoadProfile: () => void;
  onExportProfile: () => void;
  onImportProfile: (file: File) => void;
  onResetProfile: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  money,
  careerStats,
  ownedGuns,
  inventorySlots,
  equippedSkins,
  selectedMapType,
  onSelectMap,
  onBuyWeapon,
  onEquipSlot,
  onOpenSkinsStudio,
  onStartGame,
  onSaveProfile,
  onLoadProfile,
  onExportProfile,
  onImportProfile,
  onResetProfile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProfile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#03060f]/95 backdrop-blur-md p-4 text-white select-none">
      {/* Title Lockup */}
      <div className="text-center mb-1">
        <h1 className="text-3xl md:text-5xl font-black font-chakra tracking-widest text-cyan-400 drop-shadow-[0_0_25px_rgba(0,255,204,0.4)] uppercase">
          CYBER INFINITE: ZONE RUSH
        </h1>
        <p className="text-xs md:text-sm text-slate-400 font-semibold tracking-wider mt-1">
          REALISTIC MIL-SPEC BALLISTICS · 5-LAYER PROCEDURAL AUDIO · DYNAMIC DESTRUCTION
        </p>
      </div>

      {/* Funds & Career Stats Banner */}
      <div className="flex flex-wrap items-center justify-center gap-4 my-2 text-xs">
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-lg px-4 py-1.5 font-bold text-amber-400 shadow-md">
          COMBAT FUNDS: <span className="text-white font-chakra text-sm">${money.toLocaleString()}</span>
        </div>
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-lg px-4 py-1.5 font-bold text-cyan-400 shadow-md">
          CAREER KILLS: <span className="text-white font-chakra text-sm">{careerStats.kills}</span>
        </div>
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-lg px-4 py-1.5 font-bold text-emerald-400 shadow-md">
          VICTORIES: <span className="text-white font-chakra text-sm">{careerStats.wins}</span>
        </div>
      </div>

      {/* Save & Profile Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-center bg-slate-950/80 border border-cyan-500/30 rounded-xl p-2 mb-3">
        <button
          onClick={onSaveProfile}
          className="px-3 py-1 bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          💾 Save Profile
        </button>
        <button
          onClick={onLoadProfile}
          className="px-3 py-1 bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          📂 Load Profile
        </button>
        <button
          onClick={onExportProfile}
          className="px-3 py-1 bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          📥 Export .JSON
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 bg-slate-900 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          📤 Import .JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={onResetProfile}
          className="px-3 py-1 bg-slate-900 hover:bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          ⚠️ Reset
        </button>
      </div>

      {/* Battlefield Territory Selector */}
      <div className="w-full max-w-4xl mb-2">
        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5 text-center">
          Select Deployment Territory:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {[
            {
              id: 0,
              name: '1. Rugged Highlands',
              desc: 'High ridges, natural valleys, steep sniper perches, and pine groves.',
            },
            {
              id: 1,
              name: '2. Cyber City Valley',
              desc: 'Dense skyscrapers, elevated cyber towers, and close-quarters corridors.',
            },
            {
              id: 2,
              name: '3. Mountain Outpost',
              desc: 'Tactical base structures with jump pads and steep rock escarpments.',
            },
          ].map((map) => {
            const isSelected = selectedMapType === map.id;
            return (
              <div
                key={map.id}
                onClick={() => {
                  onSelectMap(map.id);
                  audioEngine.init();
                }}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-400/20 shadow-lg shadow-cyan-400/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/40'
                }`}
              >
                <div className="text-xs font-black text-white">{map.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{map.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 28 Weapon Armory & Shop Grid */}
      <div className="w-full max-w-4xl h-[34vh] overflow-y-auto bg-slate-950/90 border border-cyan-500/30 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
        {WEAPONS_CATALOG.map((gun, idx) => {
          const isOwned = ownedGuns.includes(idx);
          const activeSkinId = equippedSkins[idx] || 'default';
          const skin = SKINS_CATALOG.find((s) => s.id === activeSkinId) || SKINS_CATALOG[0];

          let scopeBadge = '';
          if (gun.scopeType === 'sniper') scopeBadge = '🔭 8X SCOPE';
          else if (gun.scopeType === 'tactical') scopeBadge = '🎯 3.5X ACOG';

          return (
            <div
              key={gun.id}
              className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                isOwned
                  ? 'border-cyan-500/40 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-black text-white">
                  <span className="truncate">{gun.name}</span>
                  {scopeBadge && (
                    <span className="text-[9px] text-amber-400 font-bold shrink-0">{scopeBadge}</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                  <div>
                    Skin: <span className="text-cyan-400 font-bold">{skin.icon} {skin.name}</span>
                  </div>
                  <div>
                    Velocity: <span className="text-yellow-400 font-bold">{gun.muzzleVelocity} m/s</span> · Drop:{' '}
                    <span className="text-slate-300 font-bold">{gun.gravityScale}x</span>
                  </div>
                  <div>
                    Damage:{' '}
                    <span className="text-rose-400 font-bold">
                      {gun.dmg === 999 ? 'INSTA-KILL' : gun.dmg}
                    </span>{' '}
                    · Mag: <span className="text-white font-bold">{gun.mag}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5">
                {isOwned ? (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((slotIdx) => {
                      const inThisSlot = inventorySlots[slotIdx] === idx;
                      return (
                        <button
                          key={slotIdx}
                          onClick={() => {
                            onEquipSlot(slotIdx, idx);
                            audioEngine.init();
                          }}
                          className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition-colors cursor-pointer ${
                            inThisSlot
                              ? 'bg-cyan-400 text-black shadow-sm shadow-cyan-400/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          S{slotIdx + 1}
                          {inThisSlot ? ' ✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onBuyWeapon(gun);
                      audioEngine.init();
                    }}
                    disabled={money < gun.cost}
                    className={`w-full py-1.5 text-center text-[10px] font-black uppercase rounded transition-colors ${
                      money >= gun.cost
                        ? 'bg-amber-400 text-black hover:bg-amber-300 cursor-pointer shadow-md shadow-amber-400/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Buy (${gun.cost.toLocaleString()})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Action CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => {
            audioEngine.init();
            onStartGame();
          }}
          className="px-10 py-3.5 bg-cyan-400 text-black font-black text-sm md:text-base uppercase tracking-widest rounded-full hover:bg-cyan-300 hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,204,0.5)] cursor-pointer"
        >
          DEPLOY MATCH (ENTER / SPACE)
        </button>
        <button
          onClick={() => {
            audioEngine.init();
            onOpenSkinsStudio();
          }}
          className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-sm md:text-base uppercase tracking-widest rounded-full hover:brightness-110 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,0,128,0.5)] cursor-pointer"
        >
          🎨 SKINS STUDIO
        </button>
      </div>
    </div>
  );
};
