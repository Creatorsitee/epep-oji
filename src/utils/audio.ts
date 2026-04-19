const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playSound = (type: 'shoot' | 'hit' | 'damage' | 'reload' | 'jump') => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'shoot') {
    // Punchy noise-like burst for a gunshot
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  } else if (type === 'hit') {
    // Very short high-pitched click for hitmarker
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1200, t + 0.02);
    
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.start(t);
    osc.stop(t + 0.05);
  } else if (type === 'damage') {
    // Deep thud for taking damage
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);
  } else if (type === 'reload') {
    // Click-clack mechanical sound
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.setValueAtTime(400, t + 0.1);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.setValueAtTime(0, t + 0.05);
    gain.gain.setValueAtTime(0.2, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.start(t);
    osc.stop(t + 0.2);
  } else if (type === 'jump') {
    // Quick ascending whoosh for jumping
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.start(t);
    osc.stop(t + 0.15);
  }
};
