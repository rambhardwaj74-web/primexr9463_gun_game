import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { WeaponDef, CareerStats, SavePayload } from './types/game';
import { WEAPONS_CATALOG, SKINS_CATALOG } from './data/weapons';
import { audioEngine } from './audio/RealisticAudioEngine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { SkinsStudioModal } from './components/SkinsStudioModal';

const SAVE_STORAGE_KEY = 'CYBER_ZONE_RUSH_SAVE_V5';

export default function App() {
  // Persistent Save State
  const [money, setMoney] = useState<number>(1500);
  const [wood, setWood] = useState<number>(60);
  const [medkits, setMedkits] = useState<number>(2);
  const [ownedGuns, setOwnedGuns] = useState<number[]>([0, 8, 18]);
  const [inventorySlots, setInventorySlots] = useState<number[]>([0, 8, 18]);
  const [currentSlotIdx, setCurrentSlotIdx] = useState<number>(0);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(['default']);
  const [equippedSkins, setEquippedSkins] = useState<Record<number, string>>({});
  const [selectedMapType, setSelectedMapType] = useState<number>(1);
  const [careerStats, setCareerStats] = useState<CareerStats>({
    kills: 0,
    wins: 0,
    matchesPlayed: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
  });

  // Game active & UI state
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [isSpectating, setIsSpectating] = useState<boolean>(false);
  const [skinsStudioOpen, setSkinsStudioOpen] = useState<boolean>(false);
  const [buildMode, setBuildMode] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [gameOverResult, setGameOverResult] = useState<{ isWin: boolean; open: boolean }>({
    isWin: false,
    open: false,
  });

  // HUD telemetry state
  const [hudData, setHudData] = useState({
    hp: 100,
    shield: 100,
    kills: 0,
    aliveCount: 10,
    clipAmmo: 12,
    reserveAmmo: 90,
    zoneTimer: 45,
    reloadProgress: 0,
    healProgress: 0,
    spectateTimer: 5.0,
    killerName: '',
    isNearClimbable: false,
    damageFlash: false,
    hitmarkerVisible: false,
    adsProgress: 0,
    currentYaw: 0,
    spreadBloom: 0,
  });

  // Killfeed list
  const [killFeed, setKillFeed] = useState<{ id: number; killer: string; victim: string; isPlayer: boolean }[]>([]);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) {
        const data: SavePayload = JSON.parse(raw);
        if (typeof data.money === 'number') setMoney(data.money);
        if (typeof data.wood === 'number') setWood(data.wood);
        if (typeof data.medkits === 'number') setMedkits(data.medkits);
        if (Array.isArray(data.ownedGuns)) setOwnedGuns(data.ownedGuns);
        if (Array.isArray(data.inventorySlots)) setInventorySlots(data.inventorySlots);
        if (Array.isArray(data.unlockedSkins)) setUnlockedSkins(data.unlockedSkins);
        if (data.equippedSkins) setEquippedSkins(data.equippedSkins);
        if (typeof data.selectedMapType === 'number') setSelectedMapType(data.selectedMapType);
        if (data.careerStats) setCareerStats(data.careerStats);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save Helper
  const persistSave = (overrides?: Partial<SavePayload>, notify: boolean = false) => {
    const payload: SavePayload = {
      money: overrides?.money ?? money,
      wood: overrides?.wood ?? wood,
      medkits: overrides?.medkits ?? medkits,
      ownedGuns: overrides?.ownedGuns ?? ownedGuns,
      inventorySlots: overrides?.inventorySlots ?? inventorySlots,
      unlockedSkins: overrides?.unlockedSkins ?? unlockedSkins,
      equippedSkins: overrides?.equippedSkins ?? equippedSkins,
      selectedMapType: overrides?.selectedMapType ?? selectedMapType,
      careerStats: overrides?.careerStats ?? careerStats,
      version: '5.0',
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      if (notify) showToast('💾 PROFILE SAVED SUCCESSFULLY');
    } catch {
      if (notify) showToast('❌ FAILED TO SAVE PROFILE');
    }
  };

  // Keyboard Shortcuts in Gameplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameActive || isSpectating) return;

      if (e.code === 'Digit1') {
        setCurrentSlotIdx(0);
        setBuildMode(false);
      } else if (e.code === 'Digit2') {
        setCurrentSlotIdx(1);
        setBuildMode(false);
      } else if (e.code === 'Digit3') {
        setCurrentSlotIdx(2);
        setBuildMode(false);
      } else if (e.code === 'Digit4' || e.code === 'KeyH') {
        triggerMedkitUse();
      } else if (e.code === 'KeyQ') {
        setBuildMode((prev) => !prev);
      } else if (e.code === 'KeyR') {
        triggerReload();
      } else if (e.code === 'KeyM') {
        const muted = audioEngine.toggleMute();
        showToast(muted ? '🔇 AUDIO MUTED' : '🔊 AUDIO UNMUTED');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive, isSpectating, medkits, isHealing, isReloading, buildMode]);

  // Actions
  const triggerReload = () => {
    if (isReloading || isHealing || buildMode) return;
    setIsReloading(true);
    setTimeout(() => {
      setIsReloading(false);
    }, 1600);
  };

  const triggerMedkitUse = () => {
    if (isHealing || isReloading || medkits <= 0) return;
    if (hudData.hp >= 100 && hudData.shield >= 100) {
      showToast('⚠️ HEALTH & SHIELD FULL');
      return;
    }
    setIsHealing(true);
    audioEngine.playMedkitUse();
    setBuildMode(false);
    setTimeout(() => {
      setIsHealing(false);
    }, 2500);
  };

  const handleStartMatch = () => {
    audioEngine.init();
    setCareerStats((prev) => {
      const next = { ...prev, matchesPlayed: prev.matchesPlayed + 1 };
      persistSave({ careerStats: next });
      return next;
    });
    setGameActive(true);
    setIsSpectating(false);
    setGameOverResult({ isWin: false, open: false });
    setBuildMode(false);
    setIsReloading(false);
    setIsHealing(false);
  };

  const handleBuyWeapon = (gun: WeaponDef) => {
    if (money >= gun.cost) {
      const nextMoney = money - gun.cost;
      const nextOwned = [...ownedGuns, gun.id];
      const nextSlots = [gun.id, inventorySlots[1], inventorySlots[2]];
      setMoney(nextMoney);
      setOwnedGuns(nextOwned);
      setInventorySlots(nextSlots);
      persistSave({ money: nextMoney, ownedGuns: nextOwned, inventorySlots: nextSlots });
      showToast(`🔫 PURCHASED ${gun.name.toUpperCase()}`);
    } else {
      showToast('❌ INSUFFICIENT COMBAT FUNDS');
    }
  };

  const handleEquipSlot = (slotIdx: number, weaponId: number) => {
    const nextSlots = [...inventorySlots];
    nextSlots[slotIdx] = weaponId;
    setInventorySlots(nextSlots);
    persistSave({ inventorySlots: nextSlots });
    showToast(`EQUIPPED ${WEAPONS_CATALOG[weaponId].name} TO SLOT ${slotIdx + 1}`);
  };

  const handleBuySkin = (skinId: string, cost: number) => {
    if (money >= cost) {
      const nextMoney = money - cost;
      const nextSkins = [...unlockedSkins, skinId];
      setMoney(nextMoney);
      setUnlockedSkins(nextSkins);
      persistSave({ money: nextMoney, unlockedSkins: nextSkins });
      showToast(`🎨 UNLOCKED ${skinId.toUpperCase()} SKIN`);
    }
  };

  const handleEquipSkin = (weaponId: number, skinId: string) => {
    const nextEquipped = { ...equippedSkins, [weaponId]: skinId };
    setEquippedSkins(nextEquipped);
    persistSave({ equippedSkins: nextEquipped });
    showToast(`✨ EQUIPPED ${skinId.toUpperCase()} ON WEAPON`);
  };

  const handleBotKilled = (botName: string) => {
    setMoney((m) => {
      const n = m + 450;
      persistSave({ money: n });
      return n;
    });
    setWood((w) => w + 30);
    if (Math.random() > 0.4) {
      setMedkits((med) => Math.min(5, med + 1));
    }
    setCareerStats((c) => {
      const n = { ...c, kills: c.kills + 1 };
      persistSave({ careerStats: n });
      return n;
    });

    const feedItem = { id: Date.now(), killer: 'YOU', victim: botName, isPlayer: true };
    setKillFeed((prev) => [feedItem, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setKillFeed((prev) => prev.filter((i) => i.id !== feedItem.id));
    }, 4000);
  };

  const handlePlayerDied = (killerName: string) => {
    setIsSpectating(true);
    const feedItem = { id: Date.now(), killer: killerName, victim: 'YOU', isPlayer: false };
    setKillFeed((prev) => [feedItem, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setKillFeed((prev) => prev.filter((i) => i.id !== feedItem.id));
    }, 4000);
  };

  const handleGameOver = (isWin: boolean) => {
    setGameActive(false);
    setIsSpectating(false);
    document.exitPointerLock?.();

    if (isWin) {
      confetti({
        particleCount: 160,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#00ffcc', '#ffd700', '#ff00aa', '#ffffff'],
      });
      setMoney((m) => {
        const n = m + 1800;
        persistSave({ money: n });
        return n;
      });
      setCareerStats((c) => {
        const n = { ...c, wins: c.wins + 1 };
        persistSave({ careerStats: n });
        return n;
      });
    }

    setGameOverResult({ isWin, open: true });
  };

  const handleLoot = (type: 'ammo' | 'money' | 'wood' | 'medkit') => {
    if (type === 'money') {
      setMoney((m) => {
        const n = m + 500;
        persistSave({ money: n });
        return n;
      });
      showToast('💰 +$500 COMBAT FUNDS');
    } else if (type === 'wood') {
      setWood((w) => w + 35);
      showToast('🧱 +35 WOOD MATERIALS');
    } else if (type === 'medkit') {
      setMedkits((m) => Math.min(5, m + 1));
      showToast('➕ +1 NANO-MEDKIT');
    } else {
      showToast('⚡ +45 AMMUNITION RESERVES');
    }
  };

  const handleExportProfile = () => {
    persistSave(undefined, false);
    const payload: SavePayload = {
      money,
      wood,
      medkits,
      ownedGuns: [...ownedGuns],
      inventorySlots: [...inventorySlots],
      unlockedSkins: [...unlockedSkins],
      equippedSkins: { ...equippedSkins },
      selectedMapType,
      careerStats: { ...careerStats },
      version: '5.0',
      savedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `cyber_zone_rush_save_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('📥 EXPORTED PROFILE TO FILE');
  };

  const handleImportProfile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data: SavePayload = JSON.parse(evt.target?.result as string);
        if (typeof data.money === 'number' && Array.isArray(data.ownedGuns)) {
          setMoney(data.money);
          setWood(data.wood ?? 60);
          setMedkits(data.medkits ?? 2);
          setOwnedGuns(data.ownedGuns);
          setInventorySlots(data.inventorySlots ?? [0, 8, 18]);
          setUnlockedSkins(data.unlockedSkins ?? ['default']);
          setEquippedSkins(data.equippedSkins ?? {});
          setSelectedMapType(data.selectedMapType ?? 1);
          if (data.careerStats) setCareerStats(data.careerStats);
          persistSave(data, false);
          showToast('📤 IMPORTED PROFILE SUCCESSFULLY');
        }
      } catch {
        showToast('❌ INVALID JSON PROFILE FILE');
      }
    };
    reader.readAsText(file);
  };

  const handleResetProfile = () => {
    if (confirm('⚠️ Reset all combat funds, unlocked weapons, and statistics?')) {
      localStorage.removeItem(SAVE_STORAGE_KEY);
      setMoney(1500);
      setWood(60);
      setMedkits(2);
      setOwnedGuns([0, 8, 18]);
      setInventorySlots([0, 8, 18]);
      setCurrentSlotIdx(0);
      setUnlockedSkins(['default']);
      setEquippedSkins({});
      setSelectedMapType(1);
      setCareerStats({
        kills: 0,
        wins: 0,
        matchesPlayed: 0,
        shotsFired: 0,
        shotsHit: 0,
        headshots: 0,
      });
      showToast('⚠️ PROFILE RESET TO DEFAULT');
    }
  };

  const activeGunId = inventorySlots[currentSlotIdx] || 0;
  const currentGun = WEAPONS_CATALOG[activeGunId] || WEAPONS_CATALOG[0];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020308] select-none font-sans">
      {/* Save / Feedback Toast */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-cyan-400 text-cyan-300 px-6 py-2.5 rounded-full font-black text-xs tracking-widest shadow-2xl shadow-cyan-400/50 pointer-events-none transition-all">
          {toastMsg}
        </div>
      )}

      {/* Kill Feed (Top Right) */}
      <div className="fixed top-24 right-6 z-20 flex flex-col gap-1.5 pointer-events-none">
        {killFeed.map((item) => (
          <div
            key={item.id}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-lg animate-kill ${
              item.isPlayer
                ? 'bg-slate-950/90 text-cyan-300 border-l-4 border-cyan-400'
                : 'bg-slate-950/90 text-white border-l-4 border-rose-500'
            }`}
          >
            🎯 {item.killer} eliminated {item.victim}
          </div>
        ))}
      </div>

      {/* 3D Simulation Canvas */}
      <GameCanvas
        gameActive={gameActive}
        isSpectating={isSpectating}
        selectedMapType={selectedMapType}
        inventorySlots={inventorySlots}
        currentSlotIdx={currentSlotIdx}
        equippedSkins={equippedSkins}
        wood={wood}
        medkits={medkits}
        buildMode={buildMode}
        isReloading={isReloading}
        isHealing={isHealing}
        onUpdateHUD={(data) => setHudData(data)}
        onLootCollected={handleLoot}
        onBotKilled={handleBotKilled}
        onPlayerDied={handlePlayerDied}
        onGameOver={handleGameOver}
        onWoodUsed={(amt) => setWood((w) => Math.max(0, w - amt))}
        onMedkitConsumed={() => setMedkits((m) => Math.max(0, m - 1))}
      />

      {/* In-Game HUD Overlays */}
      {gameActive && (
        <HUD
          playerHp={hudData.hp}
          playerShield={hudData.shield}
          playerKills={hudData.kills}
          aliveCount={hudData.aliveCount}
          wood={wood}
          money={money}
          zoneTimer={hudData.zoneTimer}
          currentGun={currentGun}
          clipAmmo={hudData.clipAmmo}
          reserveAmmo={hudData.reserveAmmo}
          inventorySlots={inventorySlots}
          currentSlotIdx={currentSlotIdx}
          medkits={medkits}
          buildMode={buildMode}
          isReloading={isReloading}
          reloadProgress={hudData.reloadProgress}
          isHealing={isHealing}
          healProgress={hudData.healProgress}
          isSpectating={isSpectating}
          spectateTimer={hudData.spectateTimer}
          killerName={hudData.killerName}
          isNearClimbable={hudData.isNearClimbable}
          damageFlash={hudData.damageFlash}
          hitmarkerVisible={hudData.hitmarkerVisible}
          adsProgress={hudData.adsProgress}
          currentYaw={hudData.currentYaw}
          spreadBloom={hudData.spreadBloom}
        />
      )}

      {/* Main Menu & Weapon Armory Shop */}
      {!gameActive && !skinsStudioOpen && !gameOverResult.open && (
        <MainMenu
          money={money}
          wood={wood}
          careerStats={careerStats}
          ownedGuns={ownedGuns}
          inventorySlots={inventorySlots}
          equippedSkins={equippedSkins}
          selectedMapType={selectedMapType}
          onSelectMap={(mapId) => {
            setSelectedMapType(mapId);
            persistSave({ selectedMapType: mapId });
          }}
          onBuyWeapon={handleBuyWeapon}
          onEquipSlot={handleEquipSlot}
          onOpenSkinsStudio={() => setSkinsStudioOpen(true)}
          onStartGame={handleStartMatch}
          onSaveProfile={() => persistSave(undefined, true)}
          onLoadProfile={() => {
            try {
              const raw = localStorage.getItem(SAVE_STORAGE_KEY);
              if (raw) {
                const data: SavePayload = JSON.parse(raw);
                setMoney(data.money);
                setWood(data.wood);
                setMedkits(data.medkits);
                setOwnedGuns(data.ownedGuns);
                setInventorySlots(data.inventorySlots);
                setUnlockedSkins(data.unlockedSkins);
                setEquippedSkins(data.equippedSkins);
                setSelectedMapType(data.selectedMapType);
                setCareerStats(data.careerStats);
                showToast('📂 LOADED PROFILE');
              }
            } catch {
              showToast('❌ LOAD FAILED');
            }
          }}
          onExportProfile={handleExportProfile}
          onImportProfile={handleImportProfile}
          onResetProfile={handleResetProfile}
        />
      )}

      {/* 3D Skins Studio Modal */}
      <SkinsStudioModal
        isOpen={skinsStudioOpen}
        money={money}
        unlockedSkins={unlockedSkins}
        equippedSkins={equippedSkins}
        initialWeaponIdx={inventorySlots[currentSlotIdx] || 0}
        onClose={() => setSkinsStudioOpen(false)}
        onBuySkin={handleBuySkin}
        onEquipSkin={handleEquipSkin}
      />

      {/* Match Over Modal */}
      {gameOverResult.open && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6 text-white select-none">
          <div className="max-w-md w-full bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-8 text-center shadow-2xl shadow-cyan-500/20">
            <h2
              className={`text-3xl md:text-5xl font-black font-chakra tracking-widest uppercase ${
                gameOverResult.isWin ? 'text-cyan-400 drop-shadow-[0_0_20px_#00ffcc]' : 'text-rose-500'
              }`}
            >
              {gameOverResult.isWin ? 'VICTORY ROYALE!' : 'MATCH TERMINATED'}
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-bold tracking-wider">
              {gameOverResult.isWin
                ? 'All rival combat operators eliminated. +$1,800 Combat Bounty awarded!'
                : 'You were eliminated in the tactical combat zone.'}
            </p>

            <div className="my-6 py-4 bg-slate-950/80 rounded-xl border border-slate-800 flex justify-around text-center">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Match Kills</div>
                <div className="text-2xl font-black font-chakra text-cyan-400">{hudData.kills}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Bounty Earned</div>
                <div className="text-2xl font-black font-chakra text-yellow-400">
                  {gameOverResult.isWin ? '+$1,800' : '+$0'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setGameOverResult({ isWin: false, open: false });
                setGameActive(false);
              }}
              className="w-full py-3.5 bg-cyan-400 text-black font-black text-sm uppercase tracking-widest rounded-xl hover:bg-cyan-300 transition-all cursor-pointer shadow-lg shadow-cyan-400/30"
            >
              Return to Armory & Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
