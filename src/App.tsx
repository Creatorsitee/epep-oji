/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo } from 'react';
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
    <div className="absolute inset-0 bg-zinc-950/98 z-[100] flex flex-col items-center p-4 md:p-12 overflow-y-auto">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8 md:mb-12 border-b-2 border-amber-600/50 pb-4">
          <h2 className="text-2xl md:text-4xl font-black italic text-white tracking-widest uppercase">GUDANG SENJATA</h2>
          <div className="flex items-center gap-3">
            <div className="bg-amber-600/20 border border-amber-600/50 px-2 md:px-4 py-1 flex items-center gap-2">
              <span className="text-amber-500 font-black text-xs md:text-base">COIN: {coins}</span>
            </div>
            <button 
              onClick={onClose}
              className="px-4 md:px-6 py-1 bg-zinc-800 text-zinc-400 hover:text-white transition-colors font-black uppercase tracking-tighter text-xs md:text-sm"
            >
              KEMBALI
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-20">
          {WEAPONS.map((weapon) => {
            const isOwned = ownedWeapons.includes(weapon.id);
            const isEquipped = currentWeaponId === weapon.id;
            const canAfford = coins >= weapon.price;

            return (
              <div 
                key={weapon.id} 
                className={`relative group p-4 md:p-6 border-l-4 transition-all ${isEquipped ? 'bg-amber-600/10 border-amber-600' : 'bg-zinc-900/50 border-zinc-800'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white italic">{weapon.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <div className="w-3 h-3" style={{ backgroundColor: weapon.laserColor }} />
                      <span className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Type-S Laser Gen-3</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {!isOwned && (
                      <div className={`text-base md:text-lg font-black italic ${canAfford ? 'text-amber-500' : 'text-red-500'}`}>
                        {weapon.price} <span className="text-[10px] uppercase">COINS</span>
                      </div>
                    )}
                    {isEquipped && (
                      <div className="text-amber-500 text-[8px] md:text-[10px] font-black uppercase border border-amber-500/50 px-2 py-0.5">ESTABLISHED</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] text-zinc-500 font-black tracking-widest uppercase">
                      <span>DAMAGE</span>
                      <span className="text-zinc-300">{weapon.damage}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 w-full rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${(weapon.damage/100)*100}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] text-zinc-500 font-black tracking-widest uppercase">
                      <span>CAPACITY</span>
                      <span className="text-zinc-300">{weapon.maxAmmo}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 w-full rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${(weapon.maxAmmo/100)*100}%` }} />
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
                    className={`w-full py-2 md:py-3 font-black uppercase transition-all tracking-widest italic text-xs md:text-sm ${
                      isEquipped 
                        ? 'bg-amber-600 text-white cursor-default opacity-50' 
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {isEquipped ? 'SEDANG DIGUNAKAN' : 'GUNAKAN SENJATA'}
                  </button>
                ) : (
                  <button
                    disabled={!canAfford}
                    onClick={() => buyWeapon(weapon.id)}
                    className={`w-full py-2 md:py-3 font-black uppercase transition-all tracking-widest italic text-xs md:text-sm ${
                      canAfford 
                        ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    BELI SENJATA
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="hud-element flex items-center gap-2">
          <div className="text-amber-500 font-black italic text-xl tracking-tighter">
            {score.toString().padStart(6, '0')}
          </div>
          <div className="text-[10px] text-zinc-400 font-bold uppercase italic">PTS</div>
        </div>
      </div>
      
      {/* HUD Right - Mission Control */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto z-[9999]">
        <div className="flex gap-2">
          <div className="hud-element flex items-center gap-1 bg-amber-600/20 border-amber-600/50">
            <span className="text-amber-500 font-black text-xs">C</span>
            <span className="text-amber-500 font-bold text-[10px]">{coins.toLocaleString()}</span>
          </div>
          <div className={`text-[9px] font-black px-2 py-0.5 rounded border ${socket ? 'text-green-500 border-green-500/30' : 'text-zinc-500 border-zinc-500/30'} uppercase transition-colors bg-black/40`}>
            {socket ? 'Multiplayer Online' : 'Solo Mode Offline'}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            leaveGame();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="hud-element text-[10px] font-black uppercase hover:text-red-500 hover:border-red-500 transition-all select-none cursor-pointer bg-red-600/20 border-red-500/50 px-4 py-2"
        >
          KELUAR GAME
        </button>
        {!isMobile && (
          <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter bg-black/20 px-1">Tekan ESC untuk kursor</span>
        )}
      </div>

      {/* Player HP Bar and Ammo - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none w-64 md:w-96 gap-1">
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
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
    window.addEventListener('click', handleGesture);
    window.addEventListener('touchstart', handleGesture);
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-[#0a0a0c] relative overflow-hidden font-mono select-none flex items-center justify-center">
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
          {gameState === 'menu' && (
            <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-start md:justify-center z-10 pointer-events-auto overflow-y-auto p-4 md:p-8 pt-8 md:pt-0">
              <div className="relative mb-6 md:mb-12 mt-auto md:mt-0 shrink-0">
                <h1 className="text-5xl md:text-9xl font-black text-white italic tracking-tighter drop-shadow-lg text-center leading-none">
                  FREE <span className="text-amber-500">FIRE</span>
                </h1>
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              </div>
              
              <p className="text-zinc-500 mb-6 md:mb-12 text-center px-4 max-w-lg uppercase tracking-[0.4em] text-[8px] md:text-[10px] font-black italic shrink-0">
                BATTLE ROYALE ARENA<br/>
                <span className="text-amber-500/50 mt-1 md:mt-2 block">SURVIVAL OF THE FITTEST</span>
                {personalBest > 0 && (
                  <span className="text-amber-600 mt-2 md:mt-4 block text-[10px] md:text-xs border border-amber-600/30 py-1 md:px-3 bg-amber-600/5">
                    PERSONAL BEST :: {personalBest.toString().padStart(6, '0')}
                  </span>
                )}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl md:px-8 pb-8 md:pb-0 mb-auto md:mb-0 shrink-0">
                <button
                  onClick={() => {
                    if (isMobile && document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                    startGame();
                  }}
                  className="group relative px-6 md:px-8 py-3 md:py-5 bg-amber-600 hover:bg-amber-500 transition-all active:scale-95 border-b-4 border-amber-800 flex items-center justify-center col-span-1 md:col-span-2"
                >
                  <div className="relative text-white text-lg md:text-xl font-black tracking-widest italic uppercase">
                    MULAI MISI
                  </div>
                </button>

                <button
                  onClick={() => setShowStore(true)}
                  className="group relative px-6 md:px-8 py-3 md:py-4 bg-zinc-800 hover:bg-zinc-700 transition-all active:scale-95 border-b-4 border-zinc-950 flex flex-col items-center justify-center"
                >
                  <div className="relative text-amber-500 text-xs md:text-sm font-black tracking-widest italic uppercase">
                    TOKO SENJATA
                  </div>
                  <div className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-black tracking-widest">{coins} COINS AVAIL</div>
                </button>

                {deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="group relative px-6 md:px-8 py-3 md:py-4 bg-zinc-800 hover:bg-zinc-700 transition-all active:scale-95 border-b-4 border-zinc-950 flex flex-col items-center justify-center gap-1"
                  >
                    <div className="relative text-amber-500 text-xs md:text-sm font-black tracking-widest italic uppercase">
                      INSTAL GAME
                    </div>
                    <div className="text-[6px] md:text-[8px] text-zinc-500 uppercase font-black">Mainkan Offline</div>
                  </button>
                ) : (
                  <div className="flex flex-col justify-center text-[8px] text-zinc-600 font-bold uppercase tracking-widest border-l border-zinc-800 pl-4 py-2">
                    LATITUDE: 4.21S<br/>
                    LONGITUDE: 101.44E<br/>
                    STATUS: PERANG TOTAL
                  </div>
                )}
              </div>
              
              {showStore && <StoreMenu onClose={() => setShowStore(false)} />}
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-start md:justify-center z-10 pointer-events-auto p-4 overflow-y-auto pt-8 md:pt-0">
              <div className="mt-auto md:mt-0 shrink-0 flex flex-col items-center">
                <h1 className="text-5xl md:text-9xl font-black text-white mb-2 italic tracking-tighter text-center leading-none">
                  MISI <span className="text-red-500 animate-pulse">GAGAL</span>
                </h1>
                <div className="h-1 w-48 md:w-64 bg-white/20 mb-6 md:mb-12" />
              </div>
              
              <div className="text-xl md:text-2xl text-amber-500 mb-6 md:mb-12 font-black italic tracking-widest uppercase bg-black/40 px-8 md:px-12 py-2 md:py-3 border border-amber-600/30 flex flex-col items-center gap-1 shrink-0">
                <span className="text-[8px] md:text-[10px] text-zinc-500">PANGKAT AKHIR</span>
                <span>{score.toString().padStart(6, '0')}</span>
                {score >= personalBest && score > 0 && (
                  <span className="text-[6px] md:text-[8px] text-green-500 animate-bounce mt-1">NEW PERSONAL BEST!</span>
                )}
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-auto md:mb-0 pb-8 md:pb-0 shrink-0 w-full max-w-sm md:max-w-none">
                <button
                  onClick={() => startGame()}
                  className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 bg-white text-black text-lg md:text-xl font-black italic tracking-tighter hover:bg-zinc-200 transition-all active:scale-95 leading-none"
                >
                  COBA LAGI
                </button>
                <button
                  onClick={() => setShowStore(true)}
                  className="w-full md:w-auto px-8 md:px-12 py-4 md:py-5 bg-amber-600 text-white text-lg md:text-xl font-black italic tracking-tighter hover:bg-amber-500 transition-all active:scale-95 leading-none"
                >
                  TOKO SENJATA
                </button>
              </div>

              {showStore && <StoreMenu onClose={() => setShowStore(false)} />}
            </div>
          )}
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
