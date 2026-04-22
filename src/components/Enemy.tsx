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
import { playSound } from '../utils/audio';

export function Enemy({ data }: { data: EnemyData }) {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { world, rapier } = useRapier();

  const { 
    speed, 
    chaseDist, 
    shootDist, 
    shootCooldown 
  } = useMemo(() => {
    switch(data.type) {
      case 'runner': return { speed: 5.0, chaseDist: 25, shootDist: 10, shootCooldown: 1500 };
      case 'brute': return { speed: 1.5, chaseDist: 20, shootDist: 25, shootCooldown: 4000 };
      case 'grunt':
      default: return { speed: 2.5, chaseDist: 15, shootDist: 15, shootCooldown: 3000 };
    }
  }, [data.type]);
  
  const gameState = useGameStore(state => state.gameState);
  const playerState = useGameStore(state => state.playerState);
  const hitPlayer = useGameStore(state => state.hitPlayer);
  const addLaser = useGameStore(state => state.addLaser);
  const addParticles = useGameStore(state => state.addParticles);

  const lastShootTime = useRef(0);
  const patrolTarget = useRef(new THREE.Vector3());
  const lastPatrolChange = useRef(0);
  const state = useRef<'patrol' | 'chase'>('patrol');
  
  // Advanced AI refs
  const lastTargetPos = useRef<THREE.Vector3 | null>(null);
  const targetVelocity = useRef(new THREE.Vector3());
  const strafeDir = useRef(Math.random() > 0.5 ? 1 : -1);
  const lastStrafeChange = useRef(Date.now());
  const lastSteeringChange = useRef(0);

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
    const now = Date.now();
    
    let closestTargetPos: THREE.Vector3 | null = null;
    let closestDist = chaseDist;

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

    // Calculate target velocity for leading shots
    if (closestTargetPos) {
      if (lastTargetPos.current) {
        // Simplified velocity estimation
        targetVelocity.current.subVectors(closestTargetPos, lastTargetPos.current).multiplyScalar(0.5);
      } else {
        targetVelocity.current.set(0, 0, 0);
      }
      lastTargetPos.current = closestTargetPos.clone();
    } else {
      lastTargetPos.current = null;
    }

    // State Machine
    if (closestTargetPos) {
      state.current = 'chase';
    } else if (state.current === 'chase') {
      state.current = 'patrol';
      patrolTarget.current.set(
        currentPos.x + (Math.random() - 0.5) * 40,
        currentPos.y,
        currentPos.z + (Math.random() - 0.5) * 40
      );
      lastPatrolChange.current = now;
    }

    const direction = new THREE.Vector3();

    if (state.current === 'chase' && closestTargetPos) {
      direction.subVectors(closestTargetPos, currentPos).normalize();
      
      // Proximity Behaviors
      if (closestDist < 4) {
        // Overly close: Evasive maneuvers (back up quickly and optionally jump)
        direction.negate().multiplyScalar(1.5);
      } else if (closestDist < 10) {
        // Combat range: Strafe around the target (within 10 units)
        if (now - lastStrafeChange.current > 1000 + Math.random() * 1500) {
          strafeDir.current *= -1;
          lastStrafeChange.current = now;
        }
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(strafeDir.current);
        // Blend movement: 20% towards target, 80% strafing sidewards
        direction.multiplyScalar(0.2).add(perpendicular.multiplyScalar(0.8)).normalize();
      }
      
      // Shooting logic
      if (closestDist < shootDist && now - lastShootTime.current > shootCooldown) {
        
        // Lead the target: predict future position based on velocity and distance
        const bulletTravelTime = closestDist / 40; 
        const predictedPos = closestTargetPos.clone().add(targetVelocity.current.clone().multiplyScalar(bulletTravelTime));
        
        const rayDir = new THREE.Vector3().subVectors(predictedPos, currentPos).normalize();
        
        // Add random spread based on distance (closer = more accurate)
        const spread = Math.min(0.15, closestDist * 0.008);
        rayDir.x += (Math.random() - 0.5) * spread;
        rayDir.y += (Math.random() - 0.5) * spread;
        rayDir.z += (Math.random() - 0.5) * spread;
        rayDir.normalize();
        
        // Offset start position to avoid hitting self
        const startPos = new THREE.Vector3(currentPos.x, currentPos.y + 0.5, currentPos.z);
        startPos.add(rayDir.clone().multiplyScalar(1.5));

        const ray = new rapier.Ray(startPos, rayDir);
        const hit = world.castRay(ray, shootDist, true);

        if (hit) {
          const collider = hit.collider;
          const rb = collider.parent();
          
          let targetIsPlayer = false;
          
          if (rb && rb.userData) {
            const userData = rb.userData as { name?: string };
            const hitPoint = ray.pointAt(hit.timeOfImpact);
            
            if (userData.name === 'player') {
              hitPlayer();
              targetIsPlayer = true;
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
          
          if (targetIsPlayer) {
            playSound('enemyShoot');
          }
        }
      }
    } else {
      // Patrol: Dynamic pathing
      // Change target if reached, stuck for 3 seconds, or randomly exploring a new sector
      if (currentPos.distanceTo(patrolTarget.current) < 2 || now - lastPatrolChange.current > 3000) {
        
        // Randomly pick between long-range patrol or short-range wandering
        const patrolRadius = Math.random() > 0.5 ? 20 : 50;
        
        patrolTarget.current.set(
          currentPos.x + (Math.random() - 0.5) * patrolRadius,
          currentPos.y,
          currentPos.z + (Math.random() - 0.5) * patrolRadius
        );
        lastPatrolChange.current = now;
      }
      direction.subVectors(patrolTarget.current, currentPos).normalize();
    }

    // Raycast Obstacle Avoidance (Steering)
    if (direction.lengthSq() > 0.01) {
      const avoidDist = 3.5;
      const avoidRayStart = new THREE.Vector3(currentPos.x, currentPos.y + 0.5, currentPos.z);
      const avoidRay = new rapier.Ray(avoidRayStart, direction);
      const hit = world.castRay(avoidRay, avoidDist, true);
      
      // If we hit something that is NOT a player or another bot (e.g. wall/obstacle)
      if (hit && hit.collider && hit.collider.parent()?.userData) {
        const uName = (hit.collider.parent()?.userData as { name?: string })?.name;
        if (uName !== 'player' && !uName?.startsWith('bot-')) {
          // Adjust steering direction perpendicularly
          if (now - lastSteeringChange.current > 1000) {
             strafeDir.current = Math.random() > 0.5 ? 1 : -1;
             lastSteeringChange.current = now;
          }
          const steerRight = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(strafeDir.current);
          direction.add(steerRight.multiplyScalar(2.0)).normalize();
        }
      }
    }

    // Apply movement
    const velocity = body.current.linvel();
    body.current.setLinvel({
      x: direction.x * speed,
      y: velocity.y,
      z: direction.z * speed
    }, true);

  // Rotate to face direction
    if (groupRef.current && direction.lengthSq() > 0.1) {
      const targetRotation = Math.atan2(-direction.z, direction.x);
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

  const charVariation = useMemo(() => {
    switch (data.type) {
      case 'runner':
        return {
          color: '#eab308', // Yellow
          visorColor: '#ffffff',
          scale: [0.8, 0.9, 0.8] as [number, number, number],
          label: 'RUNNER'
        };
      case 'brute':
        return {
          color: '#ef4444', // Red
          visorColor: '#000000',
          scale: [1.5, 1.2, 1.5] as [number, number, number],
          label: 'BRUTE'
        };
      case 'grunt':
      default:
        return {
          color: '#3b82f6', // Blue
          visorColor: '#96E0F4',
          scale: [1, 1, 1] as [number, number, number],
          label: 'GRUNT'
        };
    }
  }, [data.type]);

  const color = data.state === 'disabled' ? '#222' : charVariation.color;

  return (
    <RigidBody
      ref={body}
      colliders={false}
      mass={data.type === 'brute' ? 5 : 1}
      type="dynamic"
      position={data.position}
      enabledRotations={[false, false, false]}
      userData={{ name: data.id }}
    >
      <CapsuleCollider args={[0.5 * charVariation.scale[0], 0.5 * charVariation.scale[1]]} position={[0, 1 * charVariation.scale[1], 0]} />
      <group ref={groupRef} position={[0, 0, 0]} visible={data.state === 'active'} scale={charVariation.scale}>
        {/* Character Body */}
        <mesh castShadow position={[0, 1.0, 0]}>
          <capsuleGeometry args={[0.5, 0.8, 4, 8]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
        </mesh>
        
        {/* Visor / Eyes */}
        <mesh position={[0.4, 1.2, 0]}>
          <capsuleGeometry args={[0.2, 0.4, 4, 8]} />
          <meshStandardMaterial color={charVariation.visorColor} roughness={0.1} metalness={0.9} emissive={data.type === 'runner' ? charVariation.color : '#000000'} emissiveIntensity={0.5} />
        </mesh>

        {/* Backpack */}
        <mesh position={[-0.3, 1.0, 0]}>
          <boxGeometry args={[0.3, 0.5, 0.4]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Weapons/Accessories based on type */}
        {data.type === 'runner' && (
           <mesh position={[0.4, 0.8, 0.3]} rotation={[0, 0, Math.PI / 4]}>
             <boxGeometry args={[0.1, 0.4, 0.05]} />
             <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.1} />
           </mesh>
        )}
        {data.type === 'brute' && (
           <mesh position={[0.5, 1.0, 0.4]} rotation={[Math.PI/2, 0, 0]}>
             <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
             <meshStandardMaterial color="#333" metalness={0.8} />
           </mesh>
        )}

        {/* Username Label */}
        <Text
          position={[0, 2.0, 0]}
          fontSize={0.3}
          color={data.state === 'active' ? (data.type === 'brute' ? '#ef4444' : '#ffaa00') : '#666666'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {charVariation.label}
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
