/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Shield, Coins, Download, RefreshCw, Crosshair, ChevronLeft } from 'lucide-react';
import { useGameStore, WEAPONS } from './store';
import { Game } from './components/Game';
import { MobileControls } from './components/MobileControls';
import { playSound } from './utils/audio';

function StoreMenu({ onClose }: { onClose: () => void }) {
  const coins = useGameStore(state => state.coins);
  const ownedWeapons = useGameStore(state => state.ownedWeapons);
  const currentWeaponId = useGameStore(state => state.currentWeaponId);
  const buyWeapon = useGameStore(state => state.buyWeapon);
  const selectWeapon = useGameStore(state => state.selectWeapon);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 bg-zinc-950/98 backdrop-blur-md z-[100] flex flex-col items-center p-4 md:p-12 overflow-y-auto"
    >
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8 md:mb-12 border-b-2 border-amber-600/50 pb-4 shadow-[0_4px_20px_-10px_rgba(245,158,11,0.3)]">
          <h2 className="text-2xl md:text-4xl font-black italic text-white tracking-widest uppercase flex items-center gap-3">
            <Shield className="w-6 h-6 md:w-10 md:h-10 text-amber-500" />
            GUDANG SENJATA
          </h2>
          <div className="flex items-center gap-3">
            <div className="bg-amber-600/20 border border-amber-600/50 px-2 md:px-4 py-1 flex items-center gap-2 rounded-sm shadow-[0_0_10px_rgba(245,158,11,0.1)]">
              <Coins className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
              <span className="text-amber-500 font-black text-xs md:text-base">{coins.toLocaleString()}</span>
            </div>
            <button 
              onClick={onClose}
              className="px-4 md:px-6 py-1 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all font-black uppercase tracking-tighter text-xs md:text-sm rounded-sm flex items-center gap-1 active:scale-95"
            >
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" /> KEMBALI
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-20">
          {WEAPONS.map((weapon, index) => {
            const isOwned = ownedWeapons.includes(weapon.id);
            const isEquipped = currentWeaponId === weapon.id;
            const canAfford = coins >= weapon.price;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={weapon.id} 
                className={`relative group p-4 md:p-6 border-l-4 transition-all duration-300 rounded-r-md overflow-hidden ${
                  isEquipped 
                    ? 'bg-gradient-to-r from-amber-600/20 to-zinc-900/50 border-amber-500 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]' 
                    : 'bg-zinc-900/50 hover:bg-zinc-800 border-zinc-700 hover:border-amber-600/50'
                }`}
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white italic tracking-wider group-hover:text-amber-400 transition-colors">{weapon.name}</h3>
                    <div className="flex gap-2 mt-1 items-center">
                      <div className="w-3 h-3 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: weapon.laserColor, color: weapon.laserColor }} />
                      <span className="text-[8px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Type-S Laser Gen-3</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {!isOwned && (
                      <div className={`text-base md:text-lg font-black italic flex items-center justify-end gap-1 ${canAfford ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'text-red-500'}`}>
                        <Coins className="w-3 h-3 md:w-4 md:h-4" />
                        {weapon.price.toLocaleString()} <span className="text-[8px] uppercase">PTS</span>
                      </div>
                    )}
                    {isEquipped && (
                      <div className="text-amber-500 text-[8px] md:text-[10px] font-black uppercase border border-amber-500/50 px-2 py-0.5 rounded-sm bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]">EQUIPPED</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] text-zinc-500 font-black tracking-widest uppercase">
                      <span>POWER</span>
                      <span className="text-zinc-300">{weapon.damage}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 w-full rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(weapon.damage/100)*100}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] text-zinc-500 font-black tracking-widest uppercase">
                      <span>CAPACITY</span>
                      <span className="text-zinc-300">{weapon.maxAmmo}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 w-full rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(weapon.maxAmmo/100)*100}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" 
                      />
                    </div>
                  </div>
                </div>

                {isOwned ? (
                  <button
                    disabled={isEquipped}
                    onClick={() => {
                      selectWeapon(weapon.id);
                      playSound('reload');
                    }}
                    className={`relative z-10 w-full py-2 md:py-3 font-black uppercase transition-all tracking-widest italic text-xs md:text-sm rounded-sm ${
                      isEquipped 
                        ? 'bg-amber-600/10 text-amber-500 border border-amber-500/30 cursor-default' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white shadow-lg active:scale-[0.98]'
                    }`}
                  >
                    {isEquipped ? 'SEDANG DIGUNAKAN' : 'GUNAKAN SENJATA'}
                  </button>
                ) : (
                  <button
                    disabled={!canAfford}
                    onClick={() => buyWeapon(weapon.id)}
                    className={`relative z-10 w-full py-2 md:py-3 font-black uppercase transition-all tracking-widest italic text-xs md:text-sm rounded-sm ${
                      canAfford 
                        ? 'bg-amber-600 hover:bg-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-white active:scale-[0.98]' 
                        : 'bg-zinc-800/80 text-zinc-600 cursor-not-allowed border border-zinc-800'
                    }`}
                  >
                    BELI SENJATA
                  </button>
                )}
                
                {/* Decorative background element */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-zinc-800/20 rotate-45 pointer-events-none group-hover:bg-zinc-800/40 transition-colors" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function HUD() {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const timeLeft = useGameStore(state => state.timeLeft);
  const playerState = useGameStore(state => state.playerState);
  const otherPlayers = useGameStore(state => state.otherPlayers);
  const events = useGameStore(state => state.events);
  const leaveGame = useGameStore(state => state.leaveGame);
  const playerHp = useGameStore(state => state.playerHp);
  const maxPlayerHp = useGameStore(state => state.maxPlayerHp);
  const lastDamageTime = useGameStore(state => state.lastDamageTime);
  const lastHitMarkerTime = useGameStore(state => state.lastHitMarkerTime);
  const ammo = useGameStore(state => state.ammo);
  const maxAmmo = useGameStore(state => state.maxAmmo);
  const isReloading = useGameStore(state => state.isReloading);
  const isTargetingBot = useGameStore(state => state.isTargetingBot);
  const personalBest = useGameStore(state => state.personalBest);
  const socket = useGameStore(state => state.socket);
  const coins = useGameStore(state => state.coins);
  const isMobile = useIsMobile();

  // Pulse damage overlay based on last hit
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  useEffect(() => {
    if (lastDamageTime > 0) {
      setShowDamageFlash(true);
      playSound('damage');
      const timer = setTimeout(() => setShowDamageFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [lastDamageTime]);

  const [showHitMarker, setShowHitMarker] = useState(false);
  useEffect(() => {
    if (lastHitMarkerTime > 0) {
      setShowHitMarker(true);
      const timer = setTimeout(() => setShowHitMarker(false), 150);
      return () => clearTimeout(timer);
    }
  }, [lastHitMarkerTime]);

  const leaderboard = useMemo(() => {
    const players = [
      { id: 'TNI (YOU)', score: score, isMe: true },
      ...Object.values(otherPlayers).map(p => ({
        id: p.name,
        score: p.score,
        isMe: false
      }))
    ];
    return players.sort((a, b) => b.score - a.score);
  }, [score, otherPlayers]);

  // Global escape key listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        // If we are playing, just make sure menu options are visible if we were to show a pause menu
        // For now, let's just make sure the user knows they can leave
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [gameState]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <div className={`w-6 h-6 border-2 ${playerState === 'disabled' ? 'border-red-600' : isTargetingBot ? 'border-red-500' : 'border-amber-500/50'}`} />
          <div className={`absolute w-1 h-1 rounded-full ${playerState === 'disabled' ? 'bg-red-600' : isTargetingBot ? 'bg-red-500' : 'bg-amber-400'}`} />
          {/* Hitmarker element */}
          {showHitMarker && (
            <div className="absolute w-8 h-8 flex items-center justify-center opacity-80" style={{ transform: 'rotate(45deg)' }}>
              <div className="absolute w-[2px] h-3 bg-white top-0" />
              <div className="absolute w-[2px] h-3 bg-white bottom-0" />
              <div className="absolute w-3 h-[2px] bg-white left-0" />
              <div className="absolute w-3 h-[2px] bg-white right-0" />
            </div>
          )}
        </div>
      </div>

      {/* HUD Left - Score */}
      <div className="absolute top-2 md:top-4 left-2 md:left-4 flex flex-col gap-2 pointer-events-none z-[9999]">
        <div className="hud-element flex items-center gap-1 md:gap-2 p-1.5 md:p-3 text-sm md:text-base inline-flex">
          <div className="text-amber-500 font-black italic md:text-xl tracking-tighter">
            {score.toString().padStart(6, '0')}
          </div>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold uppercase italic">PTS</div>
        </div>
      </div>
      
      {/* HUD Right - Mission Control */}
      <div className="absolute top-2 md:top-4 right-2 md:right-4 flex flex-col items-end gap-1.5 md:gap-2 pointer-events-auto z-[9999]">
        <div className="flex gap-1.5 md:gap-2 items-center">
          <div className="hud-element flex items-center gap-1 bg-amber-600/20 border-amber-600/50 p-1 md:p-2">
            <span className="text-amber-500 font-black text-xs md:text-sm">C</span>
            <span className="text-amber-500 font-bold text-[8px] md:text-[10px]">{coins.toLocaleString()}</span>
          </div>
          <div className={`text-[7px] md:text-[9px] font-black px-1.5 py-0.5 rounded border ${socket ? 'text-green-500 border-green-500/30' : 'text-zinc-500 border-zinc-500/30'} uppercase transition-colors bg-black/40`}>
            {socket ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            leaveGame();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="hud-element text-[8px] md:text-[10px] font-black uppercase hover:text-red-500 hover:border-red-500 transition-all select-none cursor-pointer bg-red-600/20 border-red-500/50 px-2 py-1 md:px-4 md:py-2"
        >
          KELUAR GAME
        </button>
        {!isMobile && (
          <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter bg-black/20 px-1">Tekan ESC untuk kursor</span>
        )}
      </div>

      {/* Player HP Bar and Ammo - Bottom Center */}
      <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none w-56 md:w-96 gap-1">
        <div className="flex justify-between w-full px-1 items-end">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-amber-500 italic uppercase">DEFLECTOR PLATING</span>
            <span className="text-[10px] font-black text-amber-500/70 italic uppercase leading-none">{Math.ceil(playerHp)}%</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-amber-500 italic uppercase">MAGAZINE</span>
            <span className={`text-xl md:text-2xl font-black italic shadow-black drop-shadow-md leading-none ${isReloading ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
              {isReloading ? 'RELOADING' : `${ammo} / ${maxAmmo}`}
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden p-[2px]">
          <div 
            className={`h-full transition-all duration-300 ${playerHp > 50 ? 'bg-amber-500' : playerHp > 25 ? 'bg-orange-500' : 'bg-red-600'}`} 
            style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
          />
        </div>
      </div>

      {/* Damage Overlay */}
      {showDamageFlash && (
        <div className="absolute inset-0 bg-red-600/10 pointer-events-none border-[12px] border-red-600/20" />
      )}

      {playerState === 'disabled' && (
        <div className="absolute inset-0 bg-red-500/20 pointer-events-none flex items-center justify-center">
          <div className="text-red-500 text-4xl md:text-6xl font-black tracking-widest drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse text-center">
            SYSTEM DISABLED
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {isMobile && gameState === 'playing' && <MobileControls />}
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return uaMatch || coarsePointer || window.innerWidth < 768;
  });

  useEffect(() => {
    const check = () => {
      const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setIsMobile(uaMatch || coarsePointer || window.innerWidth < 768);
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

export default function App() {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const personalBest = useGameStore(state => state.personalBest);
  const coins = useGameStore(state => state.coins);
  const socket = useGameStore(state => state.socket);
  const deferredPrompt = useGameStore(state => state.deferredPrompt);
  const setDeferredPrompt = useGameStore(state => state.setDeferredPrompt);
  const startGame = useGameStore(state => state.startGame);
  const isMobile = useIsMobile();

  const [showStore, setShowStore] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [setDeferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('start') === 'true' && gameState === 'menu') {
      startGame();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [gameState, startGame]);

  useEffect(() => {
    const handleGesture = () => {
      playSound('hit'); // Dummy sound to trigger context
      if (isMobile && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn("Fullscreen request failed:", err);
        });
      }
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
    window.addEventListener('click', handleGesture);
    window.addEventListener('touchstart', handleGesture);
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [isMobile]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#0a0a0c] overflow-hidden font-mono select-none flex items-center justify-center">
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,20,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,20,0.5)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Landscape Warning for Mobile */}
      {isMobile && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-8 landscape:hidden">
          <div className="w-20 h-20 border-2 border-amber-600 rounded-lg flex items-center justify-center animate-bounce mb-4 text-amber-600">
            <svg className="w-12 h-12 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-amber-600 font-black text-center tracking-[0.3em] text-lg uppercase italic">MIRINGKAN HP</p>
          <p className="text-amber-600/50 text-[10px] mt-2 text-center font-bold">MIRINGKAN PERANGKAT UNTUK VISUAL MAKSIMAL</p>
        </div>
      )}

      {/* Screen Container */}
      <div 
        className={`relative w-full h-full transition-all duration-700 ease-out flex items-center justify-center 
          ${isMobile ? 'p-0' : 'p-4 md:p-8'}`}
      >
        <div 
          className={`relative bg-black transition-all duration-1000 overflow-hidden
            ${isMobile ? 'w-full h-full' : 'w-full h-full max-w-[1920px] aspect-video ring-2 ring-zinc-700 shadow-2xl rounded'}
          `}
        >
          {/* 3D Canvas */}
          <div className="absolute inset-0">
            <Game />
          </div>

          {/* Environmental Overlay */}
          <div className="absolute inset-0 pointer-events-none z-[5] overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />
          </div>

          {/* UI Overlay */}
          {gameState === 'playing' && <HUD />}

          {/* Menus */}
          <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 pointer-events-auto overflow-y-auto p-2 md:p-8"
            >
              <div className="flex flex-col items-center max-h-full py-4 min-h-min justify-center w-full">
                <motion.div 
                  initial={{ scale: 0.9, y: -20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="relative mb-2 md:mb-12 shrink-0"
                >
                  <h1 className="text-4xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] text-center leading-none">
                    FREE <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]">FIRE</span>
                  </h1>
                  <div className="absolute -bottom-1 md:-bottom-2 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
                </motion.div>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-zinc-500 mb-4 md:mb-12 text-center px-4 max-w-lg uppercase tracking-[0.4em] text-[7px] md:text-[10px] font-black italic shrink-0 hidden sm:block"
                >
                  BATTLE ROYALE ARENA<br/>
                  <span className="text-amber-500/60 mt-1 md:mt-2 block">SURVIVAL OF THE FITTEST</span>
                  {personalBest > 0 && (
                    <span className="text-amber-600 mt-2 md:mt-4 block text-[8px] md:text-xs border border-amber-600/30 py-1 md:px-3 bg-gradient-to-r from-transparent via-amber-600/10 to-transparent">
                      PERSONAL BEST :: {personalBest.toString().padStart(6, '0')}
                    </span>
                  )}
                </motion.p>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-2 md:gap-4 w-full max-w-[280px] md:max-w-xl shrink-0"
                >
                  <button
                    onClick={() => {
                      if (isMobile && document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(() => {});
                      }
                      startGame();
                    }}
                    className="group relative w-full px-4 md:px-8 py-2.5 md:py-6 bg-gradient-to-b from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 transition-all active:scale-95 border-b-2 md:border-b-4 border-amber-900 flex items-center justify-center overflow-hidden rounded-sm shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)]"
                  >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                    <div className="relative text-white text-lg md:text-2xl font-black tracking-widest italic uppercase flex items-center gap-2 drop-shadow-md">
                      <Crosshair className="w-5 h-5 md:w-8 md:h-8" />
                      MULAI MISI
                    </div>
                  </button>

                  <div className="grid grid-cols-2 gap-2 md:gap-4 w-full">
                    <button
                      onClick={() => setShowStore(true)}
                      className="group relative px-2 md:px-8 py-2 md:py-4 bg-zinc-800 hover:bg-zinc-700 transition-all active:scale-95 border-b-2 md:border-b-4 border-zinc-950 flex flex-col items-center justify-center rounded-sm outline outline-1 outline-zinc-700 hover:outline-amber-600/50"
                    >
                      <div className="relative text-amber-500 text-[10px] md:text-sm font-black tracking-widest italic uppercase flex items-center gap-1.5 md:gap-2 text-center leading-tight">
                        <Target className="w-3.5 h-3.5" />
                        TOKO SENJATA
                      </div>
                      <div className="text-[7px] md:text-[10px] text-zinc-400 uppercase font-bold tracking-widest mt-0.5 md:mt-1 flex items-center gap-1">
                        <Coins className="w-2.5 h-2.5 text-amber-600" />
                        {coins.toLocaleString()}
                      </div>
                    </button>

                    {deferredPrompt ? (
                      <button
                        onClick={handleInstallClick}
                        className="group relative px-2 md:px-8 py-2 md:py-4 bg-zinc-800 hover:bg-zinc-700 transition-all active:scale-95 border-b-2 md:border-b-4 border-zinc-950 flex flex-col items-center justify-center rounded-sm outline outline-1 outline-zinc-700"
                      >
                        <div className="relative text-cyan-500 text-[10px] md:text-sm font-black tracking-widest italic uppercase flex items-center gap-1.5 md:gap-2 text-center leading-tight">
                          <Download className="w-3.5 h-3.5" />
                          INSTAL GAME
                        </div>
                        <div className="text-[6px] md:text-[8px] text-zinc-500 uppercase font-black mt-0.5 md:mt-1">MAIN OFFLINE</div>
                      </button>
                    ) : (
                      <div className="flex flex-col justify-center items-center text-center text-[6px] md:text-[8px] text-zinc-500 font-bold uppercase tracking-widest bg-zinc-900/50 py-1.5 md:py-0 rounded-sm border border-zinc-800 h-full">
                        LAT: 4.21S / LON: 101.44E<br/>
                        <span className="text-green-500/80 mt-1 flex items-center justify-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="hidden sm:inline">STATUS:</span> ONLINE
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
              
              <AnimatePresence>
                {showStore && <StoreMenu onClose={() => setShowStore(false)} />}
              </AnimatePresence>
            </motion.div>
          )}
          </AnimatePresence>

          <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center z-10 pointer-events-auto p-4 overflow-y-auto"
            >
              <div className="flex flex-col items-center max-h-full py-4 min-h-min justify-center w-full">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="shrink-0 flex flex-col items-center"
                >
                  <h1 className="text-5xl md:text-9xl font-black text-white mb-1 md:mb-2 italic tracking-tighter text-center leading-none drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                    MISI <span className="text-red-500 animate-pulse">GAGAL</span>
                  </h1>
                  <div className="h-0.5 md:h-1 w-32 md:w-64 bg-gradient-to-r from-transparent via-white/40 to-transparent mb-4 md:mb-12" />
                </motion.div>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg md:text-2xl text-amber-500 mb-6 md:mb-12 font-black italic tracking-widest uppercase bg-black/60 px-6 md:px-12 py-2 md:py-4 border-y border-amber-600/50 flex flex-col items-center hover:bg-black/80 transition-colors shrink-0 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                >
                  <span className="text-[7px] md:text-[10px] text-zinc-400">PANGKAT AKHIR</span>
                  <span className="text-2xl md:text-5xl drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] leading-tight">{score.toString().padStart(6, '0')}</span>
                  {score >= personalBest && score > 0 && (
                    <span className="text-[6px] md:text-[10px] text-green-400 animate-bounce mt-1 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/30">NEW PRESTASI!</span>
                  )}
                </motion.div>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 gap-2 md:gap-4 shrink-0 w-full max-w-[280px] md:max-w-xl"
                >
                  <button
                    onClick={() => {
                      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(err => console.log(err));
                      }
                      startGame();
                    }}
                    className="w-full px-2 md:px-12 py-3 md:py-6 bg-white text-black text-xs md:text-xl font-black italic tracking-tighter hover:bg-zinc-200 transition-all active:scale-95 leading-none shadow-[0_0_20px_rgba(255,255,255,0.2)] rounded-sm flex items-center justify-center gap-1.5 md:gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 md:w-6 md:h-6" />
                    COBA LAGI
                  </button>
                  <button
                    onClick={() => setShowStore(true)}
                    className="w-full px-2 md:px-12 py-3 md:py-6 bg-amber-600 text-white text-xs md:text-xl font-black italic tracking-tighter hover:bg-amber-500 transition-all active:scale-95 leading-none shadow-[0_0_20px_rgba(245,158,11,0.3)] rounded-sm flex items-center justify-center gap-1.5 md:gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 md:w-6 md:h-6" />
                    TOKO SENJATA
                  </button>
                </motion.div>
              </div>

              <AnimatePresence>
                {showStore && <StoreMenu onClose={() => setShowStore(false)} />}
              </AnimatePresence>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Outer Shell Details */}
      <div className="hidden lg:block absolute bottom-4 left-8 text-[10px] text-cyan-500/30 pointer-events-none uppercase tracking-widest">
        SYSTEM: LASER_TAG_OS v2.4.0 // CONNECTED_CLIENTS: {useGameStore.getState().otherPlayers ? Object.keys(useGameStore.getState().otherPlayers).length + 1 : 1}
      </div>
      <div className="hidden lg:block absolute bottom-4 right-8 text-[10px] text-cyan-500/30 pointer-events-none uppercase tracking-widest">
        HARDWARE_ACCELERATION: ENABLED // ENCRYPTION: 256bit_AES
      </div>
    </div>
  );
}
