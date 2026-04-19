/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo } from 'react';
import { Game } from './components/Game';
import { MobileControls } from './components/MobileControls';
import { useGameStore } from './store';
import { playSound } from './utils/audio';

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
      playSound('hit');
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

  return (
    <>
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
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
        <button
          onClick={leaveGame}
          className="hud-element text-[10px] font-black uppercase hover:text-red-500 hover:border-red-500 transition-all"
        >
          KELUAR GAME
        </button>
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
    </>
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
  const startGame = useGameStore(state => state.startGame);
  const isMobile = useIsMobile();

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
          <p className="text-amber-600 font-black text-center tracking-[0.3em] text-lg uppercase italic">POSISI TEMPUR</p>
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
            <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center z-10 pointer-events-auto">
              <div className="relative mb-12">
                <h1 className="text-6xl md:text-9xl font-black text-white italic tracking-tighter drop-shadow-lg">
                  FREE <span className="text-amber-500">FIRE</span>
                </h1>
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              </div>
              
              <p className="text-zinc-500 mb-12 text-center px-4 max-w-lg uppercase tracking-[0.4em] text-[10px] font-black italic">
                BATTLE ROYALE ARENA<br/>
                <span className="text-amber-500/50 mt-2 block">SURVIVAL OF THE FITTEST</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl px-8">
                <button
                  onClick={() => {
                    if (isMobile && document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                    startGame();
                  }}
                  className="group relative px-12 py-5 bg-amber-600 hover:bg-amber-500 transition-all active:scale-95 border-b-4 border-amber-800"
                >
                  <div className="relative text-white text-xl font-black tracking-widest italic flex items-center justify-center gap-3">
                    MULAI MISI
                  </div>
                </button>
                <div className="hidden md:flex flex-col justify-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest border-l border-zinc-800 pl-4">
                  LATITUDE: 4.21S<br/>
                  LONGITUDE: 101.44E<br/>
                  STATUS: PERANG TOTAL
                </div>
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center z-10 pointer-events-auto">
              <h1 className="text-7xl md:text-9xl font-black text-white mb-2 italic tracking-tighter">
                MISI <span className="text-red-500 animate-pulse">GAGAL</span>
              </h1>
              <div className="h-1 w-64 bg-white/20 mb-12" />
              
              <div className="text-2xl text-amber-500 mb-12 font-black italic tracking-widest uppercase bg-black/40 px-12 py-3 border border-amber-600/30">
                PANGKAT AKHIR :: {score.toString().padStart(6, '0')}
              </div>
              
              <button
                onClick={() => startGame()}
                className="px-16 py-6 bg-white text-black text-2xl font-black italic tracking-tighter hover:bg-zinc-200 transition-all active:scale-95"
              >
                COBA LAGI
              </button>
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
