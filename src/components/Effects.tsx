/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import * as THREE from 'three';
import { useRef, useMemo, useEffect } from 'react';

export function Effects() {
  const lasers = useGameStore(state => state.lasers);
  const particles = useGameStore(state => state.particles);
  const pickups = useGameStore(state => state.pickups);

  return (
    <>
      {lasers.map(laser => (
        <Laser key={laser.id} start={laser.start} end={laser.end} color={laser.color} />
      ))}
      {particles.map(p => (
        <ParticleBurst key={p.id} position={p.position} color={p.color} />
      ))}
      {pickups.map(p => (
        <PickupVisual key={p.id} data={p} />
      ))}
    </>
  );
}

function PickupVisual({ data }: { data: any }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.02;
      ref.current.position.y = data.position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  return (
    <group ref={ref} position={data.position}>
      {data.type === 'health' ? (
        <mesh>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#22c55e" metalness={0.2} roughness={0.5} />
          {/* Medical Cross */}
          <mesh position={[0, 0, 0.31]}>
            <boxGeometry args={[0.1, 0.4, 0.02]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, 0.31]}>
            <boxGeometry args={[0.4, 0.1, 0.02]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </mesh>
      ) : (
        <mesh>
          <boxGeometry args={[0.7, 0.4, 0.5]} />
          <meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.2} />
          {/* Ammo Symbol */}
          <mesh position={[0, 0.21, 0]}>
            <boxGeometry args={[0.3, 0.02, 0.1]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </mesh>
      )}
      <pointLight color={data.type === 'health' ? '#22c55e' : '#eab308'} intensity={0.5} distance={3} />
    </group>
  );
}

function Laser({ start, end, color }: { start: [number, number, number], end: [number, number, number], color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  
  const { position, rotation, length } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const length = s.distanceTo(e);
    const position = s.clone().lerp(e, 0.5);
    
    const direction = e.clone().sub(s).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction
    );
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    
    return { position, rotation, length };
  }, [start, end]);

  useFrame((_, delta) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, mat.opacity - delta * 4);
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <boxGeometry args={[0.2, 0.2, length]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={1} />
    </mesh>
  );
}

function ParticleBurst({ position, color }: { position: [number, number, number], color: string }) {
  const group = useRef<THREE.Group>(null);
  
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      )
    }));
  }, []);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.children.forEach((child, i) => {
        child.position.addScaledVector(particles[i].velocity, delta);
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, mat.opacity - delta * 3);
        child.scale.setScalar(Math.max(0.001, child.scale.x - delta * 2));
      });
    }
  });

  return (
    <group ref={group} position={position}>
      {particles.map((_, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshBasicMaterial color={color} transparent opacity={1} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
