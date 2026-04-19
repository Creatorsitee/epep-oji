/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  className?: string;
  label?: string;
}

function Joystick({ onMove, className, label }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const origin = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    origin.current = { x: centerX, y: centerY };
    isDragging.current = true;
    containerRef.current.setPointerCapture(e.pointerId);
    
    // Process initial touch immediately
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const maxDist = 30; // Reduced from 40 for smaller joystick
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let x = dx;
    let y = dy;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      x = Math.cos(angle) * maxDist;
      y = Math.sin(angle) * maxDist;
    }

    setPosition({ x, y });
    
    // Normalize output -1 to 1
    // Invert Y because screen Y is down, but usually joystick up is -1 or 1 depending on convention.
    // In 3D: Forward is -Z.
    // Screen Up (negative Y) -> Forward (-Z).
    // Screen Down (positive Y) -> Backward (+Z).
    // So we can pass raw normalized values and handle mapping in Player.tsx.
    onMove(x / maxDist, y / maxDist);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-24 h-24 bg-white/10 rounded-full flex items-center justify-center touch-none select-none backdrop-blur-sm ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Base */}
      <div className="absolute w-full h-full rounded-full border-2 border-white/20" />
      
      {/* Stick */}
      <div 
        className="absolute w-8 h-8 bg-cyan-400/50 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      />
      
      {label && (
        <div className="absolute -bottom-6 text-white/50 text-[10px] font-bold uppercase tracking-widest pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}

export function MobileControls() {
  const setMobileInput = useGameStore(state => state.setMobileInput);
  const [shooting, setShooting] = useState(false);
  const lastTouch = useRef({ x: 0, y: 0 });
  const isTouchingTrackpad = useRef(false);

  useEffect(() => {
    setMobileInput({ shooting });
  }, [shooting, setMobileInput]);

  const handleTrackpadPointerDown = (e: React.PointerEvent) => {
    isTouchingTrackpad.current = true;
    lastTouch.current = { x: e.clientX, y: e.clientY };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleTrackpadPointerMove = (e: React.PointerEvent) => {
    if (!isTouchingTrackpad.current) return;
    
    // Calculate delta for rotation
    const dx = e.clientX - lastTouch.current.x;
    const dy = e.clientY - lastTouch.current.y;
    
    // Increased sensitivity for a more responsive feel
    // dx and dy are in pixels, so we scale them appropriately
    setMobileInput({ 
      look: { x: dx * 1.5, y: dy * 1.5 } 
    });
    
    lastTouch.current = { x: e.clientX, y: e.clientY };
  };

  const handleTrackpadPointerUp = (e: React.PointerEvent) => {
    isTouchingTrackpad.current = false;
    setMobileInput({ look: { x: 0, y: 0 } });
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex select-none overflow-hidden touch-none">
      {/* Left Area - Movement Joystick */}
      <div className="w-2/5 h-full flex items-end justify-start p-4 md:p-12 pointer-events-auto pb-6 md:pb-12">
        <Joystick 
          label="Gerak"
          onMove={(x, y) => setMobileInput({ move: { x, y } })} 
        />
      </div>

      {/* Right Area - Trackpad Look & Shoot Area */}
      <div 
        className="w-3/5 h-full relative pointer-events-auto bg-black/0 touch-none"
        onPointerDown={handleTrackpadPointerDown}
        onPointerMove={handleTrackpadPointerMove}
        onPointerUp={handleTrackpadPointerUp}
        onPointerCancel={handleTrackpadPointerUp}
        onPointerLeave={handleTrackpadPointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Actions Container (Lower Right) */}
        <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 flex items-end gap-3 pointer-events-none pb-2 pr-2">
          
          <div className="flex flex-col gap-3">
             <button
              className="pointer-events-auto w-12 h-12 rounded-full border-2 border-cyan-500 bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.5)] flex items-center justify-center active:scale-90 transition-all touch-none"
              onPointerDown={(e) => {
                e.stopPropagation();
                useGameStore.getState().setMobileInput({ jumping: true });
              }}
            >
              <span className="font-black text-cyan-500 text-[10px]">LOMPAT</span>
            </button>

            <button
              className="pointer-events-auto w-12 h-12 rounded-full border-2 border-amber-500 bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center justify-center active:scale-90 transition-all touch-none"
              onPointerDown={(e) => {
                e.stopPropagation();
                useGameStore.getState().reload();
              }}
            >
              <span className="font-black text-amber-500 text-[8px]">RELOAD</span>
            </button>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <button
              className={`pointer-events-auto w-24 h-24 rounded-full border-4 border-fuchsia-500 flex items-center justify-center active:scale-95 transition-all touch-none ${shooting ? 'bg-fuchsia-500/50 scale-110' : 'bg-fuchsia-500/20'}`}
              onPointerDown={(e) => {
                e.stopPropagation(); // Avoid tracking look when shooting
                e.currentTarget.setPointerCapture(e.pointerId);
                setShooting(true);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                e.currentTarget.releasePointerCapture(e.pointerId);
                setShooting(false);
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                e.currentTarget.releasePointerCapture(e.pointerId);
                setShooting(false);
              }}
            >
              <div className="w-16 h-16 bg-fuchsia-500 rounded-full shadow-[0_0_20px_rgba(232,121,249,1)] flex items-center justify-center font-black text-white text-[10px] tracking-tighter">
                TEMBAK
              </div>
            </button>
            <div className="text-[8px] text-fuchsia-400 font-bold uppercase tracking-widest opacity-50 pointer-events-none">Geser Untuk Melihat</div>
          </div>
        </div>
      </div>
    </div>
  );
}
