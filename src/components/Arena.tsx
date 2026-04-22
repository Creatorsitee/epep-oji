/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RigidBody } from '@react-three/rapier';
import { Grid, Stars, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

import { useGameStore } from '../store';

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

// Seeded PRNG for consistent multiplayer obstacle generation
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function Arena() {
  const isMobile = useIsMobile();
  const currentMap = useGameStore(state => state.currentMap);
  
  const obstacles = useMemo(() => {
    const count = isMobile ? 80 : 250; // Increased counts
    const rngLocal = mulberry32(currentMap === 'city' ? 12345 : 98765);
    
    return Array.from({ length: count }).map(() => {
      const x = (rngLocal() - 0.5) * 180;
      const z = (rngLocal() - 0.5) * 180;
      
      // Clear spawn area
      if (Math.abs(x) < 15 && Math.abs(z) < 15) return null;

      if (currentMap === 'city') {
        const type = 'box';
        const height = rngLocal() * 30 + 10; // Tall buildings
        const width = rngLocal() * 10 + 5;
        const depth = rngLocal() * 10 + 5;
        
        // Realistic city materials (concrete, asphalt colors)
        const cityColors = ["#2f3136", "#3f4249", "#4a4d54", "#1a1b1e", "#333333"];
        const color = cityColors[Math.floor(rngLocal() * cityColors.length)];

        return { type, position: [x, height / 2 - 0.5, z], size: [width, height, depth], rotation: [0, rngLocal() > 0.5 ? Math.PI/2 : 0, 0], color, obstacleKind: 'building' };
      } else {
        // Forest Map
        const isTree = rngLocal() > 0.3; // 70% trees, 30% rocks
        if (isTree) {
          const type = 'cylinder';
          const height = rngLocal() * 15 + 8; // Trees
          const radius = rngLocal() * 1.5 + 0.5;
          const color = '#3d2817'; // Bark color
          return { type, position: [x, height / 2 - 0.5, z], size: [radius, height, radius], rotation: [0, 0, 0], color, obstacleKind: 'tree', treeRadius: radius * 3 };
        } else {
          // Rocks
          const type = 'box';
          const height = rngLocal() * 4 + 1;
          const width = rngLocal() * 6 + 2;
          const depth = rngLocal() * 6 + 2;
          const rockColors = ["#4d4b4a", "#5e5c5b", "#363534", "#706d6b"];
          const color = rockColors[Math.floor(rngLocal() * rockColors.length)];
          return { type, position: [x, height / 2 - 0.5, z], size: [width, height, depth], rotation: [0, rngLocal() * Math.PI, 0], color, obstacleKind: 'rock' };
        }
      }
    }).filter(Boolean);
  }, [isMobile, currentMap]);

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" name="floor" friction={0}>
        <mesh receiveShadow={!isMobile} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial 
            color={currentMap === 'city' ? "#1a1a1f" : "#2f4f2f"} 
            roughness={1} 
            metalness={0} 
          />
        </mesh>
      </RigidBody>

      {/* Atmosphere */}
      {!isMobile && currentMap === 'city' && (
        <Stars radius={200} depth={50} count={100} factor={1} saturation={0} fade speed={0.1} />
      )}

      {/* Walls */}
      <Wall name="wall-n" position={[0, 5, -100]} rotation={[0, 0, 0]} isMobile={isMobile} map={currentMap} />
      <Wall name="wall-s" position={[0, 5, 100]} rotation={[0, Math.PI, 0]} isMobile={isMobile} map={currentMap} />
      <Wall name="wall-e" position={[100, 5, 0]} rotation={[0, -Math.PI / 2, 0]} isMobile={isMobile} map={currentMap} />
      <Wall name="wall-w" position={[-100, 5, 0]} rotation={[0, Math.PI / 2, 0]} isMobile={isMobile} map={currentMap} />

      {/* Particles */}
      <AmbientParticles />

      {/* Obstacles */}
      {obstacles.map((obs, i) => {
        if (!obs) return null;
        return (
          <RigidBody 
            key={i} 
            type="fixed" 
            colliders="hull"
            name={`obstacle-${i}`}
            position={obs.position as [number, number, number]}
            rotation={obs.rotation as [number, number, number]}
          >
            <mesh receiveShadow={!isMobile} castShadow={!isMobile}>
              {obs.type === 'box' ? (
                <boxGeometry args={obs.size as [number, number, number]} />
              ) : (
                <cylinderGeometry args={[obs.size[0]/2, obs.size[0]/2, obs.size[1], 16]} />
              )}
              <meshStandardMaterial 
                color={obs.color} 
                roughness={1} 
                metalness={0} 
              />
            </mesh>
            
            {/* God's Creation: Leaves for trees */}
            {'obstacleKind' in obs && obs.obstacleKind === 'tree' && obs.treeRadius && (
              <mesh position={[0, obs.size[1]/2, 0]} castShadow={!isMobile}>
                 <boxGeometry args={[obs.treeRadius, obs.size[1]*0.8, obs.treeRadius]} />
                 <meshStandardMaterial color="#1f4d1f" roughness={1} />
              </mesh>
            )}
            
            {/* Realism touch: windows on buildings */}
            {'obstacleKind' in obs && obs.obstacleKind === 'building' && !isMobile && (
              <mesh position={[0, 0.1, obs.size[2]/2 + 0.05]}>
                <planeGeometry args={[obs.size[0] * 0.8, obs.size[1] * 0.9]} />
                <meshBasicMaterial color="#000000" />
                <mesh position={[0, 0, 0.01]}>
                  {/* Pseudo-windows grid overlay */}
                  <planeGeometry args={[obs.size[0] * 0.8, obs.size[1] * 0.9]} />
                  <meshBasicMaterial 
                    color="#4a6572" 
                    alphaMap={new THREE.TextureLoader().load("https://grainy-gradients.vercel.app/noise.svg")} 
                    transparent 
                    opacity={0.3} 
                    blending={THREE.AdditiveBlending} 
                  />
                </mesh>
              </mesh>
            )}
          </RigidBody>
        );
      })}
    </group>
  );
}

function Wall({ name, position, rotation, isMobile, map }: { name: string, position: [number, number, number], rotation: [number, number, number], isMobile: boolean, map: 'city' | 'forest' }) {
  const [wallTexture, setWallTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    // Gunakan standar TextureLoader daripada useTexture(Drei) yang melempar Suspense Error saat gagal (offline)
    const loader = new THREE.TextureLoader();
    
    // City gets the concrete texture, forest gets no texture (just dark green basic wall)
    if (map === 'city') {
      loader.load(
        "https://cyzxfxkszavvotjjcsba.supabase.co/storage/v1/object/public/photos/uploads/1776581289126-58yr9.jpg",
        (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          // Dinding panjangnya 200, tingginya 20. Kita atur tekstur agar tidak melebar jelek.
          // 10 kali pengulangan secara horisontal agar pas proporsinya.
          texture.repeat.set(10, 1);
          texture.needsUpdate = true;
          setWallTexture(texture);
        },
        undefined,
        (err) => {
          console.warn("Gagal memuat tekstur gambar, kembali menggunakan material dinding default. (Mode Offline)");
        }
      );
    } else {
      setWallTexture(null); // Forest maps have basic solid walls
    }
  }, [map]);

  return (
    <RigidBody type="fixed" name={name} position={position} rotation={rotation}>
      {/* Solid Wall */}
      <mesh receiveShadow={!isMobile}>
        <boxGeometry args={[200, 20, 2]} />
        <meshStandardMaterial 
          map={wallTexture || undefined} 
          color={map === 'city' ? (wallTexture ? "#ffffff" : "#444") : "#1b381b"} 
          roughness={0.9} 
          metalness={0.1} 
          shadowSide={THREE.DoubleSide} 
        />
      </mesh>
    </RigidBody>
  );
}

function AmbientParticles() {
  const count = 1500;
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      sizes[i] = Math.random() * 0.8 + 0.4; // Smaller particles
    }
    return [positions, sizes];
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffffff') } // White color
  }), []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vec3 pos = position;
            // Slow upward drift and wobble
            pos.y += uTime * 0.5;
            pos.x += sin(uTime * 0.2 + pos.y) * 2.0;
            pos.z += cos(uTime * 0.2 + pos.y) * 2.0;
            
            // Wrap around Y
            pos.y = mod(pos.y, 40.0);
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            // Size attenuation
            gl_PointSize = aSize * (300.0 / -mvPosition.z);
            
            // Fade out near top and bottom
            vAlpha = smoothstep(0.0, 5.0, pos.y) * smoothstep(40.0, 35.0, pos.y);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            // Distance from center of point
            float d = length(gl_PointCoord - vec2(0.5));
            // Soft circle using smoothstep
            float alpha = smoothstep(0.5, 0.1, d) * 0.5 * vAlpha;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(uColor, alpha);
          }
        `}
      />
    </points>
  );
}
