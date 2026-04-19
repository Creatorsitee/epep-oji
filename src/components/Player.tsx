/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, CapsuleCollider } from '@react-three/rapier';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { playSound } from '../utils/audio';

const SPEED = 12;
const MAX_LASER_DIST = 100;

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { rapier, world } = useRapier();
  
  const playerState = useGameStore(state => state.playerState);
  const gameState = useGameStore(state => state.gameState);
  const addLaser = useGameStore(state => state.addLaser);
  const hitEnemy = useGameStore(state => state.hitEnemy);
  const addParticles = useGameStore(state => state.addParticles);

  const keys = useRef({ 
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    space: false, shift: false, r: false
  });
  const lastEmitTime = useRef(0);
  const lastShootTime = useRef(0);

  const gunGroupRef = useRef<THREE.Group>(null);
  const gunVisualRef = useRef<THREE.Group>(null);
  const gunBarrelRef = useRef<THREE.Group>(null);
  const muzzleFlashRef = useRef<THREE.Mesh>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null);
  const bobbing = useRef(0);

  // More robust mobile detection (checks for touch support)
  const isTouchDevice = useRef(false);
  useEffect(() => {
    isTouchDevice.current = window.matchMedia('(pointer: coarse)').matches || 
                           'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const reload = useGameStore.getState().reload;

      let key = e.key.toLowerCase();
      if (e.code === 'Space') key = 'space';
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') key = 'shift';
      if (key === 'r') {
        key = 'r';
        reload();
      }

      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      let key = e.key.toLowerCase();
      if (e.code === 'Space') key = 'space';
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') key = 'shift';
      if (key === 'r') key = 'r';

      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    // Set standar rotasi FPS (Yaw -> Pitch -> No Roll)
    camera.rotation.order = 'YXZ';
  }, [camera]);

  const updatePlayerPosition = useGameStore(state => state.updatePlayerPosition);

  // Shooting logic function
  const shoot = () => {
    if (gameState !== 'playing' || playerState !== 'active') return;
    
    // Rate limit shooting
    const now = Date.now();
    if (now - lastShootTime.current < 200) return;

    const { consumeAmmo, isReloading, reload } = useGameStore.getState();
    if (isReloading) return;
    
    // Consume ammo
    if (!consumeAmmo()) {
      reload(); // Auto-reload if empty
      return;
    }

    lastShootTime.current = now;
    playSound('shoot');

    // Raycast from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Start raycast slightly ahead of the camera to avoid hitting the player's own collider
    const rayStart = camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(0.8));
    const ray = new rapier.Ray(rayStart, raycaster.ray.direction);
    const hit = world.castRay(ray, MAX_LASER_DIST, true);
    
    // Check if hitting bot for crosshair feedback
    let isTargeting = false;
    if (hit) {
      const collider = hit.collider;
      const rb = collider.parent();
      if (rb && rb.userData) {
        const userData = rb.userData as { name?: string };
        if (userData.name?.startsWith('bot-')) {
          isTargeting = true;
        }
      }
    }
    useGameStore.getState().setTargetingBot(isTargeting);

    const startPosVec = new THREE.Vector3();
    if (gunBarrelRef.current) {
      gunBarrelRef.current.getWorldPosition(startPosVec);
    } else {
      startPosVec.copy(camera.position);
    }
    const startPos: [number, number, number] = [startPosVec.x, startPosVec.y, startPosVec.z];

    // Apply recoil and muzzle flash
    if (gunVisualRef.current) {
      // Recoil disabled per request
    }
    
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.visible = true;
      muzzleFlashRef.current.scale.setScalar(1 + Math.random() * 0.5);
      muzzleFlashRef.current.rotation.z = Math.random() * Math.PI;
    }
    if (muzzleLightRef.current) {
      muzzleLightRef.current.intensity = 2;
    }

    let endPos: [number, number, number];

    if (hit) {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      endPos = [hitPoint.x, hitPoint.y, hitPoint.z];
      
      const collider = hit.collider;
      const rb = collider.parent();
      if (rb && rb.userData) {
        const userData = rb.userData as { name?: string };
        const name = userData.name;
        
        if (name) {
          // Check if it's a bot
          if (name.startsWith('bot-')) {
            hitEnemy(name, true);
          } 
          // Check if it's another player (socket ID)
          else if (name !== 'player' && useGameStore.getState().otherPlayers[name]) {
            hitEnemy(name, true);
          }
        }
      }
      
      addParticles(endPos, '#ffaa00');
    } else {
      endPos = [
        camera.position.x + raycaster.ray.direction.x * MAX_LASER_DIST,
        camera.position.y + raycaster.ray.direction.y * MAX_LASER_DIST,
        camera.position.z + raycaster.ray.direction.z * MAX_LASER_DIST
      ];
    }

    addLaser(startPos, endPos, '#ffcc00');
  };

  useFrame((_, delta) => {
    if (!body.current || gameState !== 'playing') return;

    const mobileInput = useGameStore.getState().mobileInput;

    // Handle Mobile Shooting
    if (mobileInput.shooting) {
      shoot();
    }

    // Movement
    const velocity = body.current.linvel();
    
    const k = keys.current;
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    // Combine keyboard and joystick input
    // Joystick Y is inverted (up is negative), so we negate it for forward movement
    // Actually, in Joystick component: Up is negative Y.
    // Forward movement should be positive.
    // Let's assume Joystick Up -> y < 0.
    // We want moveZ to be negative for forward.
    // So if joystick.y is -1, moveZ should be -1.
    // So we add joystick.y directly?
    // Wait, standard WASD: W -> moveZ = -1 (forward in Threejs is -Z usually? No, camera looks down -Z).
    // Yes, forward is -Z.
    // W key: moveZ = -1.
    // Joystick Up (y < 0): moveZ should be negative.
    // So we add mobileInput.move.y.
    
    const moveZ = (k.w ? 1 : 0) - (k.s ? 1 : 0) + (mobileInput.move.y * -1); // Invert joystick Y to match W/S logic (W is +1 in my logic below? No wait)
    
    // Original logic:
    // const moveZ = (k.w ? 1 : 0) - (k.s ? 1 : 0);
    // const direction = new THREE.Vector3();
    // direction.addScaledVector(forward, moveZ);
    
    // If I press W, moveZ is 1.
    // forward vector points in camera direction.
    // If I add scaled vector (forward * 1), I move forward.
    // So W -> 1 is correct.
    
    // Joystick Up -> y is negative (e.g. -1).
    // We want to move forward (1).
    // So we need -y.
    const joyMoveZ = -mobileInput.move.y;
    
    // Joystick Right -> x is positive.
    // D key -> moveX = 1.
    // We want moveX = 1.
    const joyMoveX = mobileInput.move.x;

    const combinedMoveZ = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + joyMoveZ;
    const combinedMoveX = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + joyMoveX;

    const direction = new THREE.Vector3();
    direction.addScaledVector(forward, combinedMoveZ);
    direction.addScaledVector(right, combinedMoveX);
    
    // Sprint logic
    const currentSpeed = k.shift ? SPEED * 1.5 : SPEED;

    if (direction.lengthSq() > 0) {
      // Clamp length to 1 to prevent faster diagonal movement
      if (direction.lengthSq() > 1) direction.normalize();
      direction.multiplyScalar(currentSpeed);
    }

    // Jump logic
    let jumpImpulse = 0;
    const bodyPos = body.current.translation();
    // VERY simple grounded check using y velocity (could be improved with raycast)
    const isGrounded = Math.abs(velocity.y) < 0.1 && bodyPos.y < 3; 
    if ((k.space || mobileInput.jumping) && isGrounded) {
       jumpImpulse = 8;
       playSound('jump');
       // Consume the jump input so we don't fly
       k.space = false;
       useGameStore.getState().setMobileInput({ jumping: false });
    }

    body.current.setLinvel({ x: direction.x, y: jumpImpulse > 0 ? jumpImpulse : velocity.y, z: direction.z }, true);

    // Mobile Look Rotation (Trackpad Style)
    if (Math.abs(mobileInput.look.x) > 0.001 || Math.abs(mobileInput.look.y) > 0.001) {
      // Sensitivity for trackpad - Adjusted for better responsiveness
      const sensitivity = 0.012;
      
      // Yaw (Kiri/Kanan)
      camera.rotation.y -= mobileInput.look.x * sensitivity;
      
      // Pitch (Atas/Bawah)
      camera.rotation.x -= mobileInput.look.y * sensitivity;
      
      // Batasi Pitch agar tidak terbalik
      camera.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, camera.rotation.x));
      
      // Reset look delta setelah digunakan agar tidak terus berputar
      useGameStore.getState().setMobileInput({ look: { x: 0, y: 0 } });
    }

    // Update camera position to follow rigid body
    const pos = body.current.translation();
    camera.position.set(pos.x, pos.y + 1.6, pos.z); // Eye level (raised from 0.8)

    // Sync gun to camera
    // Gun bobbing and sway
    const isMoving = velocity.x ** 2 + velocity.z ** 2 > 0.1;
    if (isMoving) {
      bobbing.current += delta * 10;
    } else {
      bobbing.current = THREE.MathUtils.lerp(bobbing.current, 0, delta * 5);
    }
    
    // Hitung bobbing
    const bobY = Math.sin(bobbing.current) * 0.015;
    const bobX = Math.cos(bobbing.current * 0.5) * 0.01;
    
    // Target posisi senjata (Base + Sway)
    const targetBasePos = new THREE.Vector3(0.4 + bobX, -0.3 + bobY, -0.6);

    if (gunGroupRef.current) {
      gunGroupRef.current.position.copy(camera.position);
      gunGroupRef.current.quaternion.copy(camera.quaternion);
    }
    
    // Recover/Smooth posisi senjata
    // Kurangi nilai lerp (delta * 15 -> delta * 8) untuk gerakan yang lebih malas/halus
    if (gunVisualRef.current) {
      gunVisualRef.current.position.z = THREE.MathUtils.lerp(gunVisualRef.current.position.z, targetBasePos.z, delta * 8);
      gunVisualRef.current.position.x = THREE.MathUtils.lerp(gunVisualRef.current.position.x, targetBasePos.x, delta * 8);
      gunVisualRef.current.position.y = THREE.MathUtils.lerp(gunVisualRef.current.position.y, targetBasePos.y, delta * 8);
      
      // Rotary smoothing
      gunVisualRef.current.rotation.x = THREE.MathUtils.lerp(gunVisualRef.current.rotation.x, 0, delta * 8);
    }
    if (muzzleFlashRef.current && muzzleFlashRef.current.visible) {
      if (Date.now() - lastShootTime.current > 50) {
        muzzleFlashRef.current.visible = false;
      }
    }
    if (muzzleLightRef.current && muzzleLightRef.current.intensity > 0) {
      muzzleLightRef.current.intensity = THREE.MathUtils.lerp(muzzleLightRef.current.intensity, 0, delta * 20);
    }

    // Emit position to server
    const now = Date.now();
    if (now - lastEmitTime.current > 50) {
      updatePlayerPosition([pos.x, pos.y, pos.z], camera.rotation.y);
      lastEmitTime.current = now;
    }
  });

  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement && gameState === 'playing' && playerState === 'active') {
        shoot();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [gameState, playerState, camera, world, rapier, hitEnemy, addParticles, addLaser]);

  return (
    <>
      {!isTouchDevice.current && <PointerLockControls />}
      <RigidBody
        ref={body}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, 2, 0]}
        enabledRotations={[false, false, false]}
        userData={{ name: 'player' }}
        friction={0}
      >
        <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} friction={0} />
      </RigidBody>

      {/* First Person Gun */}
      <group ref={gunGroupRef}>
        <group ref={gunVisualRef} position={[0.4, -0.3, -0.6]}>
          {/* Main body: Rugged Steel */}
          <mesh position={[0, 0, 0.2]} castShadow>
            <boxGeometry args={[0.08, 0.18, 0.4]} />
            <meshStandardMaterial color="#2d2d2d" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Grip */}
          <mesh position={[0, -0.12, 0.28]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.07, 0.2, 0.08]} />
            <meshStandardMaterial color="#1a1a1a" roughness={1} />
          </mesh>
          {/* Rail/Top */}
          <mesh position={[0, 0.1, 0.2]}>
            <boxGeometry args={[0.06, 0.04, 0.35]} />
            <meshStandardMaterial color="#222" metalness={1} roughness={0.1} />
          </mesh>
          {/* Barrel: Industrial Heat-tinted steel */}
          <mesh position={[0, 0.05, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 12]} />
            <meshStandardMaterial color="#151515" metalness={1} roughness={0.05} />
          </mesh>
          {/* Muzzle Brake */}
          <mesh position={[0, 0.05, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.08, 6]} />
            <meshStandardMaterial color="#333" metalness={0.8} />
          </mesh>
          {/* Tactical Light/Laser Housing */}
          <mesh position={[0.05, 0, 0.1]}>
            <boxGeometry args={[0.03, 0.06, 0.15]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0.05, 0, 0.02]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial color="#ff3300" emissive="#ff0000" emissiveIntensity={2} />
          </mesh>
          {/* Barrel Tip Reference and Muzzle Flash */}
          <group ref={gunBarrelRef} position={[0, 0.05, -0.35]}>
            <mesh ref={muzzleFlashRef} visible={false} position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.3, 0.3]} />
              <meshBasicMaterial color="#ffcc00" transparent opacity={0.8} />
            </mesh>
            <pointLight ref={muzzleLightRef} color="#ffcc00" intensity={0} distance={5} decay={2} />
          </group>
        </group>
      </group>
    </>
  );
}
