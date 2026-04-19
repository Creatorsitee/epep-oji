/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { useGameStore, EnemyData } from '../store';
import { Text } from '@react-three/drei';

const ENEMY_SPEED = 2.5; // Slightly slower
const CHASE_DIST = 15;
const SHOOT_DIST = 15;
const SHOOT_COOLDOWN = 3500; // Increased from 2000 for less aggressive shooting

export function Enemy({ data }: { data: EnemyData }) {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { world, rapier } = useRapier();
  
  const gameState = useGameStore(state => state.gameState);
  const playerState = useGameStore(state => state.playerState);
  const hitPlayer = useGameStore(state => state.hitPlayer);
  const addLaser = useGameStore(state => state.addLaser);
  const addParticles = useGameStore(state => state.addParticles);

  const lastShootTime = useRef(0);
  const patrolTarget = useRef(new THREE.Vector3());
  const lastPatrolChange = useRef(0);
  const state = useRef<'patrol' | 'chase'>('patrol');

  const groupRef = useRef<THREE.Group>(null);

  // Initialize patrol target
  useMemo(() => {
    patrolTarget.current.set(
      data.position[0] + (Math.random() - 0.5) * 10,
      data.position[1],
      data.position[2] + (Math.random() - 0.5) * 10
    );
  }, [data.position]);

  useFrame((state_fiber) => {
    if (!body.current || gameState !== 'playing' || data.state === 'disabled') {
      if (body.current) {
        body.current.setLinvel({ x: 0, y: body.current.linvel().y, z: 0 }, true);
      }
      return;
    }

    const pos = body.current.translation();
    const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    
    let closestTargetPos: THREE.Vector3 | null = null;
    let closestDist = CHASE_DIST;

    // Check player
    if (playerState === 'active') {
      const playerPos = camera.position.clone();
      playerPos.y = pos.y; // Ignore height difference for distance
      const distToPlayer = currentPos.distanceTo(playerPos);
      if (distToPlayer < closestDist) {
        closestDist = distToPlayer;
        closestTargetPos = playerPos;
      }
    }

    // Check other enemies
    const allEnemies = useGameStore.getState().enemies;
    allEnemies.forEach(e => {
      if (e.id !== data.id && e.state === 'active') {
        const ePos = new THREE.Vector3(e.position[0], pos.y, e.position[2]);
        const distToEnemy = currentPos.distanceTo(ePos);
        if (distToEnemy < closestDist) {
          closestDist = distToEnemy;
          closestTargetPos = ePos;
        }
      }
    });

    // AI Logic
    if (closestTargetPos) {
      state.current = 'chase';
    } else if (state.current === 'chase') {
      state.current = 'patrol';
      patrolTarget.current.set(
        currentPos.x + (Math.random() - 0.5) * 40,
        currentPos.y,
        currentPos.z + (Math.random() - 0.5) * 40
      );
      lastPatrolChange.current = Date.now();
    }

    const direction = new THREE.Vector3();

    if (state.current === 'chase' && closestTargetPos) {
      direction.subVectors(closestTargetPos, currentPos).normalize();
      
      // Shooting logic
      const now = Date.now();
      if (closestDist < SHOOT_DIST && now - lastShootTime.current > SHOOT_COOLDOWN) {
        // Raycast to check line of sight
        const rayDir = new THREE.Vector3().subVectors(closestTargetPos, currentPos).normalize();
        
        // Add random spread so they miss sometimes
        const spread = 0.15;
        rayDir.x += (Math.random() - 0.5) * spread;
        rayDir.y += (Math.random() - 0.5) * spread;
        rayDir.z += (Math.random() - 0.5) * spread;
        rayDir.normalize();
        
        // Offset start position to avoid hitting self
        const startPos = new THREE.Vector3(currentPos.x, currentPos.y + 0.5, currentPos.z);
        startPos.add(rayDir.clone().multiplyScalar(1.5));

        const ray = new rapier.Ray(startPos, rayDir);
        const hit = world.castRay(ray, SHOOT_DIST, true);

        if (hit) {
          const collider = hit.collider;
          const rb = collider.parent();
          if (rb && rb.userData) {
            const userData = rb.userData as { name?: string };
            const hitPoint = ray.pointAt(hit.timeOfImpact);
            
            if (userData.name === 'player') {
              hitPlayer();
              addParticles([camera.position.x, camera.position.y, camera.position.z], '#ff5500');
              addLaser([startPos.x, startPos.y, startPos.z], [camera.position.x, camera.position.y, camera.position.z], '#ffaa00');
              lastShootTime.current = now;
            } else {
              if (userData.name?.startsWith('bot-')) {
                useGameStore.getState().hitEnemy(userData.name);
              }
              addParticles([hitPoint.x, hitPoint.y, hitPoint.z], '#ffaa00');
              addLaser([startPos.x, startPos.y, startPos.z], [hitPoint.x, hitPoint.y, hitPoint.z], '#ff8800');
              lastShootTime.current = now;
            }
          } else {
            const hitPoint = ray.pointAt(hit.timeOfImpact);
            addParticles([hitPoint.x, hitPoint.y, hitPoint.z], '#ffaa00');
            addLaser([startPos.x, startPos.y, startPos.z], [hitPoint.x, hitPoint.y, hitPoint.z], '#ff8800');
            lastShootTime.current = now;
          }
        }
      }
    } else {
      // Patrol
      const now = Date.now();
      // Change target if reached or if stuck for 4 seconds
      if (currentPos.distanceTo(patrolTarget.current) < 2 || now - lastPatrolChange.current > 4000) {
        patrolTarget.current.set(
          currentPos.x + (Math.random() - 0.5) * 60,
          currentPos.y,
          currentPos.z + (Math.random() - 0.5) * 60
        );
        lastPatrolChange.current = now;
      }
      direction.subVectors(patrolTarget.current, currentPos).normalize();
    }

    // Apply movement
    const velocity = body.current.linvel();
    body.current.setLinvel({
      x: direction.x * ENEMY_SPEED,
      y: velocity.y,
      z: direction.z * ENEMY_SPEED
    }, true);

  // Rotate to face direction
    if (groupRef.current && direction.lengthSq() > 0.1) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = groupRef.current.rotation.y;
      let diff = targetRotation - currentRotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.1;
    }

    // Death animation
    if (groupRef.current) {
      const isDead = (data.state as string) === 'disabled';
      if (isDead) {
        // Fall down
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -Math.PI / 2, 0.1);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -0.8, 0.1);
      } else {
        // Reset rotation and position
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, Math.sin(Date.now() / 300) * 0.2, 0.1);
      }
    }
  });

  // Tentukan variasi drone berdasarkan ID (e.g., bot-1)
  const droneVariation = useMemo(() => {
    const idNum = parseInt(data.id.split('-')[1] || '0');
    // Variasi bentuk: 0:Box, 1:Cylinder, 2:Sphere, 3:Pyramid
    const shape = idNum % 4;
    // Variasi warna:
    const baseColors = ['#d1d1d1', '#a0c0e0', '#e0c0a0', '#c0e0a0'];
    const accentColors = ['#ff4400', '#00ffcc', '#ff00ff', '#ffff00'];
    
    return {
      shape,
      color: baseColors[idNum % baseColors.length],
      accent: accentColors[idNum % accentColors.length]
    };
  }, [data.id]);

  const color = data.state === 'disabled' ? '#222' : droneVariation.color;
  const accentColor = data.state === 'disabled' ? '#111' : droneVariation.accent;
  const glowColor = data.state === 'disabled' ? '#000' : droneVariation.accent;

  return (
    <RigidBody
      ref={body}
      colliders={false}
      mass={1}
      type="dynamic"
      position={data.position}
      enabledRotations={[false, false, false]}
      userData={{ name: data.id }}
    >
      <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} />
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Drone Main Body based on shape */}
        <mesh castShadow position={[0, 1.2, 0]}>
          {droneVariation.shape === 0 && <boxGeometry args={[0.8, 0.6, 0.8]} />}
          {droneVariation.shape === 1 && <cylinderGeometry args={[0.4, 0.4, 0.6, 16]} />}
          {droneVariation.shape === 2 && <sphereGeometry args={[0.4, 16, 16]} />}
          {droneVariation.shape === 3 && <coneGeometry args={[0.4, 0.8, 4]} />}
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
        </mesh>
        
        {/* Drone Core/Eye with pulse */}
        <mesh position={[0, 1.2, 0.41]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1]} />
          <meshStandardMaterial color={accentColor} emissive={glowColor} emissiveIntensity={5} />
        </mesh>

        {/* Thrusters / Rotors with subtle hover emission */}
        <mesh castShadow position={[0.5, 1.2, 0.5]}>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
          <meshStandardMaterial color="#222" emissive={glowColor} emissiveIntensity={0.5} />
        </mesh>
        <mesh castShadow position={[-0.5, 1.2, 0.5]}>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
          <meshStandardMaterial color="#222" emissive={glowColor} emissiveIntensity={0.5} />
        </mesh>
        <mesh castShadow position={[0.5, 1.2, -0.5]}>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
          <meshStandardMaterial color="#222" emissive={glowColor} emissiveIntensity={0.5} />
        </mesh>
        <mesh castShadow position={[-0.5, 1.2, -0.5]}>
          <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
          <meshStandardMaterial color="#222" emissive={glowColor} emissiveIntensity={0.5} />
        </mesh>

        {/* Username Label */}
        <Text
          position={[0, 2.0, 0]}

          fontSize={0.3}
          color={data.state === 'active' ? '#ffaa00' : '#666666'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {data.id}
        </Text>

        {/* HP Bar */}
        {data.state === 'active' && (
          <group position={[0, 2.4, 0]}>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[1.2, 0.15]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.5} />
            </mesh>
            <mesh position={[(data.hp / data.maxHp - 1) * 0.6, 0, 0.01]}>
              <planeGeometry args={[(data.hp / data.maxHp) * 1.2, 0.15]} />
              <meshBasicMaterial color={data.hp > 50 ? "#00ff00" : data.hp > 25 ? "#ffff00" : "#ff0000"} />
            </mesh>
          </group>
        )}
      </group>
    </RigidBody>
  );
}
