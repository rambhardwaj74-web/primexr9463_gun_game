import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WeaponDef, WeaponSkin } from '../types/game';
import { WEAPONS_CATALOG, SKINS_CATALOG } from '../data/weapons';
import { buildDetailedWeapon, BuiltWeaponModel } from '../engine/WeaponModelBuilder';
import { audioEngine } from '../audio/RealisticAudioEngine';

interface SkinsStudioModalProps {
  isOpen: boolean;
  money: number;
  unlockedSkins: string[];
  equippedSkins: Record<number, string>;
  initialWeaponIdx: number;
  onClose: () => void;
  onBuySkin: (skinId: string, cost: number) => void;
  onEquipSkin: (weaponId: number, skinId: string) => void;
}

export const SkinsStudioModal: React.FC<SkinsStudioModalProps> = ({
  isOpen,
  money,
  unlockedSkins,
  equippedSkins,
  initialWeaponIdx,
  onClose,
  onBuySkin,
  onEquipSkin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState<number>(initialWeaponIdx);
  const [previewSkinId, setPreviewSkinId] = useState<string>('default');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentModelRef = useRef<BuiltWeaponModel | null>(null);
  const rotRef = useRef({ x: 0.15, y: -0.65 });
  const zoomRef = useRef(1.35);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setSelectedWeaponIdx(initialWeaponIdx);
    setPreviewSkinId(equippedSkins[initialWeaponIdx] || 'default');
  }, [initialWeaponIdx, equippedSkins]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    // Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    camera.position.set(0, 0, zoomRef.current);
    cameraRef.current = camera;

    // Studio 3-point lighting rig
    const amb = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0x00ffcc, 1.4);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xff0088, 0.9);
    fillLight.position.set(-4, -2, -3);
    scene.add(fillLight);

    const topRim = new THREE.DirectionalLight(0xffffff, 1.1);
    topRim.position.set(0, 5, 0);
    scene.add(topRim);

    // Initial Model Build
    const wep = WEAPONS_CATALOG[selectedWeaponIdx];
    const model = buildDetailedWeapon(wep, previewSkinId, false);
    scene.add(model.root);
    currentModelRef.current = model;

    // Render Loop
    let animId = 0;
    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      if (model.root) {
        model.root.rotation.x = rotRef.current.x;
        model.root.rotation.y = rotRef.current.y;
      }
      // Pulse emissive if present
      model.root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.material && (mesh.material as any).userData?.pulseSkin) {
          const base = (mesh.material as any).userData.baseEmissiveInt || 0.4;
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
            base * (0.7 + 0.3 * Math.sin(time * 0.004));
        }
      });
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(render);

    // Mouse Controls
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      rotRef.current.y += dx * 0.012;
      rotRef.current.x += dy * 0.012;
      rotRef.current.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotRef.current.x));
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(0.65, Math.min(2.2, zoomRef.current + e.deltaY * 0.0015));
      if (cameraRef.current) {
        cameraRef.current.position.z = zoomRef.current;
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, [isOpen]);

  // Update model when weapon or skin changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    if (currentModelRef.current) {
      scene.remove(currentModelRef.current.root);
    }
    const wep = WEAPONS_CATALOG[selectedWeaponIdx];
    const model = buildDetailedWeapon(wep, previewSkinId, false);
    scene.add(model.root);
    currentModelRef.current = model;
  }, [selectedWeaponIdx, previewSkinId]);

  if (!isOpen) return null;

  const currentWep = WEAPONS_CATALOG[selectedWeaponIdx];
  const activeEquippedSkin = equippedSkins[selectedWeaponIdx] || 'default';
  const previewSkinDef = SKINS_CATALOG.find((s) => s.id === previewSkinId) || SKINS_CATALOG[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070d]/95 backdrop-blur-xl p-6 text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-cyan-500/30">
        <div>
          <h2 className="text-xl md:text-2xl font-black font-chakra tracking-wider text-cyan-400">
            WEAPON SKINS STUDIO & PHYSICAL SHADERS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time physical rendering inspector with anisotropic metals, emissive veins, and optical lenses.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-lg px-4 py-1.5 text-amber-400 font-black text-sm">
            ${money.toLocaleString()} COMBAT FUNDS
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-cyan-300 transition-all cursor-pointer shadow-lg shadow-cyan-400/20"
          >
            Done / Return
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex flex-col lg:flex-row flex-1 gap-6 mt-4 overflow-hidden">
        {/* 3D Preview Box */}
        <div className="relative flex-1 bg-gradient-to-b from-[#131c2d] to-[#080c14] border border-cyan-500/20 rounded-xl overflow-hidden flex items-center justify-center min-h-[320px]">
          <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />

          {/* Interactive instruction watermark */}
          <div className="absolute bottom-4 left-4 bg-slate-950/80 border-l-2 border-cyan-400 px-3 py-2 rounded text-[11px] text-slate-300 pointer-events-none">
            <div>
              <span className="font-bold text-cyan-400">[DRAG]</span> 360° Inspect ·{' '}
              <span className="font-bold text-cyan-400">[SCROLL]</span> Zoom
            </div>
            <div className="text-white font-bold mt-0.5">
              {currentWep.name} — {previewSkinDef.icon} {previewSkinDef.name}
            </div>
          </div>
        </div>

        {/* Controls & Skins Selection Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Weapon Selector */}
          <div>
            <label className="text-[11px] font-bold tracking-wider text-amber-400 block mb-1 uppercase">
              Select Weapon Platform:
            </label>
            <select
              value={selectedWeaponIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedWeaponIdx(idx);
                setPreviewSkinId(equippedSkins[idx] || 'default');
              }}
              className="w-full bg-slate-900 border border-cyan-500/50 text-cyan-400 text-xs font-bold rounded-lg p-2.5 outline-none"
            >
              {WEAPONS_CATALOG.map((w, idx) => (
                <option key={w.id} value={idx}>
                  {w.name} ({w.cat.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Available Skins Grid */}
          <div>
            <div className="text-[11px] font-bold tracking-wider text-amber-400 uppercase mb-2">
              Available Custom Skins:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {SKINS_CATALOG.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isEquipped = activeEquippedSkin === skin.id;
                const isPreviewing = previewSkinId === skin.id;

                return (
                  <div
                    key={skin.id}
                    onClick={() => setPreviewSkinId(skin.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isPreviewing
                        ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/15'
                        : isEquipped
                        ? 'border-cyan-400 bg-cyan-400/5'
                        : 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-black text-white">
                        <span className="flex items-center gap-1.5">
                          <span>{skin.icon}</span>
                          <span>{skin.name}</span>
                        </span>
                        {isEquipped && (
                          <span className="text-[10px] text-cyan-400 font-bold bg-cyan-400/20 px-2 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {skin.desc}
                      </p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {isEquipped ? (
                        <div className="w-full py-1.5 text-center text-[10px] font-bold text-cyan-400 bg-slate-800/80 rounded-md">
                          EQUIPPED ✓
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEquipSkin(selectedWeaponIdx, skin.id);
                            audioEngine.init();
                          }}
                          className="w-full py-1.5 text-center text-[10px] font-black uppercase text-black bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors cursor-pointer"
                        >
                          Equip Skin
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBuySkin(skin.id, skin.cost);
                            audioEngine.init();
                          }}
                          disabled={money < skin.cost}
                          className={`w-full py-1.5 text-center text-[10px] font-black uppercase rounded-md transition-colors ${
                            money >= skin.cost
                              ? 'text-black bg-amber-400 hover:bg-amber-300 cursor-pointer shadow-md shadow-amber-400/20'
                              : 'text-slate-500 bg-slate-800 cursor-not-allowed'
                          }`}
                        >
                          Unlock (${skin.cost.toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
