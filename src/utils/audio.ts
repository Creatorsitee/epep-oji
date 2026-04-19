let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

const createNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

export const playSound = (type: 'shoot' | 'hit' | 'damage' | 'reload' | 'jump' | 'zombie' | 'gameover' | 'victory' | 'step' | 'enemyShoot', pitch = 1) => {
  if (typeof window === 'undefined') return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive'
    });
    noiseBuffer = createNoiseBuffer(audioCtx);
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const t = audioCtx.currentTime;

  if (type === 'shoot' || type === 'enemyShoot') {
    // High-quality gunshot using Noise + Sine for punch
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    // Noise component (The "Crack")
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(400 * pitch, t + 0.1);
    
    gain.gain.setValueAtTime(type === 'shoot' ? 0.6 : 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start(t);
    noise.stop(t + 0.12);

    // Sine component (The "Thump")
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(40 * pitch, t + 0.08);
    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.08);

  } else {
    // Standard oscillator setup for other sounds
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'step') {
      // Short crisp thud
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.03);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.start(t);
      osc.stop(t + 0.03);
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
    } else if (type === 'zombie') {
      // Low, gritty sound for zombie
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.linearRampToValueAtTime(60, t + 0.3);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === 'gameover') {
      // Descending sad tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(100, t + 0.8);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.8);
    } else if (type === 'victory') {
      // Ascending cheerful sequence
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.setValueAtTime(600, t + 0.1);
      osc.frequency.setValueAtTime(800, t + 0.2);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }
};
