/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

import { playSound } from './utils/audio';

export type GameState = 'menu' | 'playing' | 'gameover';
export type EntityState = 'active' | 'disabled';

export interface EnemyData {
  id: string;
  position: [number, number, number];
  state: EntityState;
  disabledUntil: number;
  hp: number;
  maxHp: number;
}

export interface PlayerData {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  state: EntityState;
  disabledUntil: number;
  score: number;
  color: string;
}

export interface LaserData {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  timestamp: number;
  color: string;
}

export interface ParticleData {
  id: string;
  position: [number, number, number];
  timestamp: number;
  color: string;
}

export interface PickupData {
  id: string;
  type: 'health' | 'ammo';
  position: [number, number, number];
  active: boolean;
}

export interface GameEvent {
  id: string;
  message: string;
  timestamp: number;
}

export interface Weapon {
  id: string;
  name: string;
  price: number;
  damage: number;
  fireRate: number;
  maxAmmo: number;
  color: string;
  laserColor: string;
  soundPitch: number;
  modelScale: [number, number, number];
}

export const WEAPONS: Weapon[] = [
  { 
    id: 'default', 
    name: 'M4A1-GEN', 
    price: 0, 
    damage: 25, 
    fireRate: 0.1, 
    maxAmmo: 30, 
    color: '#3f3f46', 
    laserColor: '#f59e0b', 
    soundPitch: 1,
    modelScale: [1, 1, 1]
  },
  { 
    id: 'plasma', 
    name: 'PLASMA RIFLE', 
    price: 50, 
    damage: 35, 
    fireRate: 0.15, 
    maxAmmo: 25, 
    color: '#0891b2', 
    laserColor: '#22d3ee', 
    soundPitch: 1.5,
    modelScale: [1.2, 0.9, 1.1]
  },
  { 
    id: 'heavy', 
    name: 'HEAVY GATLING', 
    price: 150, 
    damage: 40, 
    fireRate: 0.08, 
    maxAmmo: 100, 
    color: '#b91c1c', 
    laserColor: '#ef4444', 
    soundPitch: 0.7,
    modelScale: [1.5, 1.2, 1.5]
  },
  { 
    id: 'gold', 
    name: 'GOLDEN VESTIGE', 
    price: 500, 
    damage: 100, 
    fireRate: 0.12, 
    maxAmmo: 50, 
    color: '#fbbf24', 
    laserColor: '#fcd34d', 
    soundPitch: 1.2,
    modelScale: [1.1, 1.1, 1.1]
  }
];

interface GameStore {
  gameState: GameState;
  score: number;
  timeLeft: number;
  playerState: EntityState;
  playerDisabledUntil: number;
  playerHp: number;
  maxPlayerHp: number;
  lastDamageTime: number;
  lastHitMarkerTime: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  isTargetingBot: boolean;
  enemies: EnemyData[];
  lasers: LaserData[];
  particles: ParticleData[];
  pickups: PickupData[];
  events: GameEvent[];
  
  // Economy & Store
  coins: number;
  ownedWeapons: string[];
  currentWeaponId: string;
  buyWeapon: (weaponId: string) => void;
  selectWeapon: (weaponId: string) => void;
  
  // High Score & PWA
  personalBest: number;
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
  updatePersonalBest: () => void;
  
  // Multiplayer
  socket: Socket | null;
  otherPlayers: Record<string, PlayerData>;

  startGame: () => void;
  endGame: () => void;
  leaveGame: () => void;
  updateTime: (delta: number) => void;
  hitPlayer: () => void;
  healPlayer: (amount: number) => void;
  addAmmo: (amount: number) => void;
  addPickup: (pickup: PickupData) => void;
  consumePickup: (id: string) => void;
  hitEnemy: (id: string, byPlayer?: boolean) => void;
  addLaser: (start: [number, number, number], end: [number, number, number], color: string) => void;
  addParticles: (position: [number, number, number], color: string) => void;
  addEvent: (message: string) => void;
  updateEnemies: (time: number) => void;
  cleanupEffects: (time: number) => void;
  setPlayerState: (state: EntityState) => void;
  
  // Multiplayer actions
  updatePlayerPosition: (position: [number, number, number], rotation: number) => void;
  setTargetingBot: (isTargeting: boolean) => void;
  reload: () => void;
  consumeAmmo: () => boolean;

  // Mobile Controls
  mobileInput: {
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
    jumping: boolean;
  };
  setMobileInput: (input: Partial<{
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
    jumping: boolean;
  }>) => void;
}

const INITIAL_ENEMIES: EnemyData[] = [
  { id: 'bot-1', position: [40, 1, 40], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-2', position: [-40, 1, 40], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-3', position: [40, 1, -40], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-4', position: [-40, 1, -40], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-5', position: [0, 1, -50], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-6', position: [60, 1, 0], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-7', position: [-60, 1, 0], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-8', position: [0, 1, 50], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-9', position: [30, 1, 70], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
  { id: 'bot-10', position: [-70, 1, -30], state: 'active', disabledUntil: 0, hp: 100, maxHp: 100 },
];

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: 'menu',
      score: 0,
      timeLeft: 300, // 5 minutes
      playerState: 'active',
      playerDisabledUntil: 0,
      playerHp: 100,
      maxPlayerHp: 100,
      lastDamageTime: 0,
      lastHitMarkerTime: 0,
      ammo: 30,
      maxAmmo: 30,
      isReloading: false,
      isTargetingBot: false,
      enemies: [],
      lasers: [],
      particles: [],
      pickups: [],
      events: [],
      
      // Economy & Store
      coins: 0,
      ownedWeapons: ['default'],
      currentWeaponId: 'default',
      
      buyWeapon: (weaponId) => {
        const { coins, ownedWeapons } = get();
        const weapon = WEAPONS.find(w => w.id === weaponId);
        if (weapon && !ownedWeapons.includes(weaponId) && coins >= weapon.price) {
          set({
            coins: coins - weapon.price,
            ownedWeapons: [...ownedWeapons, weaponId],
            currentWeaponId: weaponId
          });
          get().addEvent(`DBELİ: ${weapon.name}`);
          playSound('victory'); // Reuse sound for success
        }
      },
      
      selectWeapon: (weaponId) => {
        const { ownedWeapons } = get();
        if (ownedWeapons.includes(weaponId)) {
          set({ currentWeaponId: weaponId });
          get().addEvent(`DIPILIH: ${weaponId.toUpperCase()}`);
        }
      },

      // PWA & Personal Best
      personalBest: 0,
      deferredPrompt: null,
      setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
      updatePersonalBest: () => {
        const { score, personalBest } = get();
        if (score > personalBest) {
          set({ personalBest: score });
        }
      },
      
      socket: null,
      otherPlayers: {},

  mobileInput: {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    shooting: false,
    jumping: false
  },

  setMobileInput: (input) => set((state) => ({
    mobileInput: { ...state.mobileInput, ...input }
  })),

  startGame: () => {
    const { socket } = get();
    
    if (socket) {
      socket.disconnect();
    }

    // Reset base state first for immediate UI response
    const currentWeapon = WEAPONS.find(w => w.id === get().currentWeaponId) || WEAPONS[0];
    
    set({
      gameState: 'playing',
      score: 0,
      timeLeft: 300,
      playerState: 'active',
      playerDisabledUntil: 0,
      playerHp: 100,
      maxPlayerHp: 100,
      lastDamageTime: 0,
      lastHitMarkerTime: 0,
      ammo: currentWeapon.maxAmmo,
      maxAmmo: currentWeapon.maxAmmo,
      isReloading: false,
      enemies: INITIAL_ENEMIES.map(e => ({ ...e, state: 'active', disabledUntil: 0 })),
      lasers: [],
      particles: [],
      events: [],
      socket: null,
      otherPlayers: {},
    });

    // Cek koneksi internet
    const isOffline = !navigator.onLine;

    if (isOffline) {
      get().addEvent("MODE SOLO: BERMAIN OFFLINE");
      return;
    }

    // Initialize multiplayer
    let newSocket: Socket | null = null;
    try {
      newSocket = io(window.location.origin, {
        timeout: 5000,
        reconnectionAttempts: 2
      });
      
      newSocket.on('connect_error', () => {
        if (!get().socket) { // Only log if we haven't successfully connected
          console.warn("Socket connection failed. Staying in solo mode...");
          get().addEvent("KONEKSI GAGAL: MODE SOLO");
        }
      });

      newSocket.on('connect', () => {
        newSocket!.emit('joinGame');
        set({ socket: newSocket });
      });

      newSocket.on('gameJoined', (players: Record<string, PlayerData>) => {
        const otherPlayers = { ...players };
        const currentWeapon = WEAPONS.find(w => w.id === get().currentWeaponId) || WEAPONS[0];

        if (newSocket?.id) delete otherPlayers[newSocket.id];
        set({ 
          otherPlayers,
          gameState: 'playing',
          timeLeft: 300,
          score: 0,
          ammo: currentWeapon.maxAmmo,
          maxAmmo: currentWeapon.maxAmmo,
          isReloading: false,
          enemies: INITIAL_ENEMIES.map(e => ({ ...e, state: 'active', disabledUntil: 0 }))
        });
        get().addEvent("TERHUBUNG KE SERVER");
      });

      newSocket.on('playerJoined', (player: PlayerData) => {
        set(state => ({
          otherPlayers: { ...state.otherPlayers, [player.id]: player },
          events: [...state.events, { id: Math.random().toString(), message: `${player.name} joined`, timestamp: Date.now() }]
        }));
      });

      newSocket.on('playerMoved', (data: { id: string, position: [number, number, number], rotation: number }) => {
        set(state => {
          if (!state.otherPlayers[data.id]) return state;
          return {
            otherPlayers: {
              ...state.otherPlayers,
              [data.id]: {
                ...state.otherPlayers[data.id],
                position: data.position,
                rotation: data.rotation
              }
            }
          };
        });
      });

      newSocket.on('playerShot', (data: { id: string, start: [number, number, number], end: [number, number, number], color: string }) => {
        set(state => ({
          lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start: data.start, end: data.end, timestamp: Date.now(), color: data.color }],
          particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position: data.end, timestamp: Date.now(), color: data.color }]
        }));
      });

      newSocket.on('playerHit', (data: { targetId: string, shooterId: string, targetDisabledUntil: number, shooterScore: number }) => {
        set(state => {
          const now = Date.now();
          const isLocalShooter = data.shooterId === newSocket!.id;
          const isLocalTarget = data.targetId === newSocket!.id;
          
          const shooterName = isLocalShooter ? 'You' : (state.otherPlayers[data.shooterId]?.name || 'Unknown');
          const targetName = isLocalTarget ? 'You' : (state.otherPlayers[data.targetId]?.name || 'Unknown');
          const eventMsg = `${shooterName} tagged ${targetName}`;
          const newEvent = { id: Math.random().toString(), message: eventMsg, timestamp: now };

          let newState: Partial<GameStore> = {
            events: [...state.events, newEvent]
          };

          if (isLocalTarget) {
            newState.playerState = 'disabled';
            newState.playerDisabledUntil = data.targetDisabledUntil;
          }

          if (isLocalShooter) {
            newState.score = data.shooterScore;
          }

          // Update other players' states
          const players = { ...state.otherPlayers };
          let playersChanged = false;

          if (!isLocalTarget && players[data.targetId]) {
            players[data.targetId] = {
              ...players[data.targetId],
              state: 'disabled',
              disabledUntil: data.targetDisabledUntil
            };
            playersChanged = true;
          }

          if (!isLocalShooter && players[data.shooterId]) {
            players[data.shooterId] = {
              ...players[data.shooterId],
              score: data.shooterScore
            };
            playersChanged = true;
          }

          if (playersChanged) {
            newState.otherPlayers = players;
          }

          return newState;
        });
      });

      newSocket.on('playerLeft', (id: string) => {
        set(state => {
          const players = { ...state.otherPlayers };
          const playerName = players[id]?.name || 'Unknown';
          delete players[id];
          return { 
            otherPlayers: players,
            events: [...state.events, { id: Math.random().toString(), message: `${playerName} left`, timestamp: Date.now() }]
          };
        });
      });
    } catch (e) {
      console.warn("Socket initialization error:", e);
      get().addEvent("ERROR KONEKSI: MODE SOLO");
    }
  },

  endGame: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ gameState: 'gameover', socket: null });
    get().updatePersonalBest();
  },

  leaveGame: () => {
    console.log("Leaving game...");
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    
    // Explicitly release pointer lock when leaving
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Explicitly exit fullscreen mode when returning to menu
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.log(err));
    }

    set({
      gameState: 'menu',
      socket: null,
      otherPlayers: {},
      enemies: [],
      lasers: [],
      particles: [],
      events: [],
      score: 0,
      timeLeft: 300,
      playerState: 'active'
    });
  },

  updateTime: (delta) => set((state) => {
    if (state.gameState !== 'playing') return state;
    return { timeLeft: state.timeLeft + delta }; // Count up or just ignore
  }),

  hitPlayer: () => set((state) => {
    if (state.playerState === 'disabled' || state.gameState !== 'playing') return state;
    
    const damage = 20;
    const newHp = Math.max(0, state.playerHp - damage);
    
    if (newHp <= 0) {
      playSound('gameover');
      
      // Explicitly exit fullscreen mode when game over
      if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log('Fullscreen exit error:', err));
      }
      
      // Release pointer lock
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        document.exitPointerLock();
      }

      return {
        playerHp: 0,
        gameState: 'gameover',
        playerState: 'disabled',
        playerDisabledUntil: Date.now() + 5000,
        score: Math.max(0, state.score - 50),
        lastDamageTime: Date.now()
      };
    }
    
    return {
      playerHp: newHp,
      lastDamageTime: Date.now(),
      score: Math.max(0, state.score - 5),
    };
  }),

  healPlayer: (amount) => set((state) => ({
    playerHp: Math.min(state.maxPlayerHp, state.playerHp + amount)
  })),

  addAmmo: (amount: number) => set((state) => {
    return {
      ammo: Math.min(state.maxAmmo, state.ammo + amount),
      events: [...state.events, { id: Math.random().toString(), message: `Picked up AMMO (+${amount})`, timestamp: Date.now() }]
    };
  }),

  addPickup: (pickup: PickupData) => set((state) => {
    return { pickups: [...state.pickups, pickup] };
  }),

  consumePickup: (id: string) => set((state) => {
    return {
      pickups: state.pickups.filter(p => p.id !== id)
    };
  }),

  hitEnemy: (id, byPlayer = false) => set((state) => {
    if (state.gameState !== 'playing') return state;
    
    // Check if it's a multiplayer player
    if (state.socket && state.otherPlayers[id]) {
      state.socket.emit('hitPlayer', id);
      return { lastHitMarkerTime: byPlayer ? Date.now() : state.lastHitMarkerTime };
    }

    let enemyWasKilled = false;
    const currentWeapon = WEAPONS.find(w => w.id === state.currentWeaponId) || WEAPONS[0];

    const enemies = state.enemies.map(e => {
      if (e.id === id && e.state === 'active') {
        const newHp = Math.max(0, e.hp - currentWeapon.damage);
        if (newHp === 0) {
          enemyWasKilled = true;
          playSound('zombie'); // Suara kematian bot (zombie style)
          
          // Spawn drop (60% chance for ammo, 40% chance for health)
          const isHealth = Math.random() > 0.6;
          get().addPickup({
            id: Math.random().toString(),
            type: isHealth ? 'health' : 'ammo',
            position: [e.position[0], e.position[1] + 1, e.position[2]], // Float slightly above ground
            active: true
          });

          return { 
            ...e, 
            hp: 0, 
            state: 'disabled' as EntityState, 
            disabledUntil: Date.now() + 5000 
          };
        }
        return { ...e, hp: newHp };
      }
      return e;
    });

    return {
      enemies,
      lastHitMarkerTime: byPlayer ? Date.now() : state.lastHitMarkerTime,
      score: byPlayer && enemyWasKilled ? state.score + 100 : state.score,
      coins: byPlayer && enemyWasKilled ? state.coins + 5 : state.coins,
      events: byPlayer && enemyWasKilled 
        ? [...state.events, { id: Math.random().toString(), message: `You eliminated ${id} (+5 COINS)`, timestamp: Date.now() }] 
        : state.events
    };
  }),

  addLaser: (start, end, color) => {
    const { socket } = get();
    if (socket) {
      socket.emit('shoot', { start, end, color });
    }
    set((state) => ({
      lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start, end, timestamp: Date.now(), color }]
    }));
  },

  addParticles: (position, color) => set((state) => ({
    particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position, timestamp: Date.now(), color }]
  })),

  reload: () => set((state) => {
    const currentWeapon = WEAPONS.find(w => w.id === state.currentWeaponId) || WEAPONS[0];
    if (state.ammo === currentWeapon.maxAmmo || state.isReloading || state.playerState !== 'active') return state;
    
    playSound('reload');

    // Simulate async 1.5s reload
    setTimeout(() => {
      const { currentWeaponId } = useGameStore.getState();
      const gun = WEAPONS.find(w => w.id === currentWeaponId) || WEAPONS[0];
      useGameStore.setState({ ammo: gun.maxAmmo, isReloading: false });
    }, 1500);

    return { isReloading: true };
  }),

  consumeAmmo: () => {
    const state = get();
    if (state.ammo > 0 && !state.isReloading) {
      set({ ammo: state.ammo - 1 });
      return true;
    }
    return false;
  },

  addEvent: (message) => set((state) => ({
    events: [...state.events, { id: Math.random().toString(), message, timestamp: Date.now() }]
  })),

  updateEnemies: (time) => set((state) => {
    let changed = false;
    
    // Auto-health regen
    let playerHp = state.playerHp;
    const now = Date.now();
    if (state.playerState === 'active' && now - state.lastDamageTime > 4000) {
      if (playerHp < state.maxPlayerHp) {
        playerHp = Math.min(state.maxPlayerHp, playerHp + 0.1);
        changed = true;
      }
    }

    const enemies = state.enemies.map(e => {
      if (e.state === 'disabled' && time > e.disabledUntil) {
        changed = true;
        // Respawn at a random position
        const randomPos: [number, number, number] = [
          (Math.random() - 0.5) * 160,
          1,
          (Math.random() - 0.5) * 160
        ];
        return { ...e, state: 'active' as EntityState, hp: e.maxHp, position: randomPos };
      }
      return e;
    });
    
    // Also update other players' states
    let otherPlayers = state.otherPlayers;
    let playersChanged = false;
    Object.values(state.otherPlayers).forEach(p => {
      if (p.state === 'disabled' && time > p.disabledUntil) {
        if (!playersChanged) {
          otherPlayers = { ...state.otherPlayers };
          playersChanged = true;
        }
        otherPlayers[p.id] = { ...p, state: 'active' };
      }
    });

    if (state.playerState === 'disabled' && time > state.playerDisabledUntil) {
      return { enemies, playerState: 'active', playerHp: state.maxPlayerHp, otherPlayers: playersChanged ? otherPlayers : state.otherPlayers };
    }
    return (changed || playersChanged) ? { enemies, playerHp, otherPlayers } : state;
  }),

  cleanupEffects: (time) => set((state) => {
    const lasers = state.lasers.filter(l => time - l.timestamp < 200); // Lasers last 200ms
    const particles = state.particles.filter(p => time - p.timestamp < 500); // Particles last 500ms
    const events = state.events.filter(e => time - e.timestamp < 5000); // Events last 5s
    if (lasers.length !== state.lasers.length || particles.length !== state.particles.length || events.length !== state.events.length) {
      return { lasers, particles, events };
    }
    return state;
  }),

  setPlayerState: (playerState) => set({ playerState }),

  updatePlayerPosition: (position, rotation) => {
    const { socket } = get();
    if (socket) {
      socket.emit('updatePosition', { position, rotation });
    }
  },
  setTargetingBot: (isTargeting) => set({ isTargetingBot: isTargeting })
    }),
    {
      name: 'free-fire-storage',
      partialize: (state) => ({ 
        personalBest: state.personalBest,
        coins: state.coins,
        ownedWeapons: state.ownedWeapons,
        currentWeaponId: state.currentWeaponId
      }),
    }
  )
);
