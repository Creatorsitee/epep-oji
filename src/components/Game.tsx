/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Arena } from './Arena';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { OtherPlayer } from './OtherPlayer';
import { Effects } from './Effects';
import { useGameStore } from '../store';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { useShallow } from 'zustand/react/shallow';
import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
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

function GameLoop() {
  const updateTime = useGameStore(state => state.updateTime);
  const updateEnemies = useGameStore(state => state.updateEnemies);
  const cleanupEffects = useGameStore(state => state.cleanupEffects);

  useFrame((_, delta) => {
    const now = Date.now();
    updateTime(delta);
    updateEnemies(now);
    cleanupEffects(now);
  });
  return null;
}

export function Game() {
  const enemies = useGameStore(state => state.enemies);
  const otherPlayerIds = useGameStore(
    useShallow(state => Object.keys(state.otherPlayers))
  );
  const isMobile = useIsMobile();

  return (
    <Canvas 
      shadows={!isMobile} 
      camera={{ fov: 75 }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
    >
      <color attach="background" args={['#8fb6e5']} />
      <fog attach="fog" args={['#8fb6e5', 50, 200]} />
      
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={1.5} 
        castShadow={!isMobile} 
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight intensity={0.5} groundColor="#444444" color="#ffffff" />
      
      
      <Physics gravity={[0, -20, 0]}>
        <GameLoop />
        <Arena />
        <Player />
        {enemies.map(enemy => (
          <Enemy key={enemy.id} data={enemy} />
        ))}
        {otherPlayerIds.map(id => (
          <OtherPlayer key={id} id={id} />
        ))}
        <Effects />
      </Physics>

      {/* Bloom can be heavy on mobile, disable or simplify */}
      {!isMobile && (
        <EffectComposer>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1} />
          <ChromaticAberration 
            offset={new THREE.Vector2(0.002, 0.002)} 
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
