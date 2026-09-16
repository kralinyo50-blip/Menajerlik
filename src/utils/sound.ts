/* Basit WebAudio ses motoru — harici dosya gerekmez */

let ctx: AudioContext | null = null;
let enabled = true;

type Ctor = typeof AudioContext;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC: Ctor | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function isSoundEnabled() {
  return enabled;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.06, delay = 0) {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0.0001, ac.currentTime + delay);
  vol.gain.linearRampToValueAtTime(gain, ac.currentTime + delay + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + delay + duration);
  osc.connect(vol);
  vol.connect(ac.destination);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

function noise(duration: number, gain = 0.05, delay = 0) {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const frames = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ac.createBufferSource();
  const vol = ac.createGain();
  vol.gain.value = gain;
  src.buffer = buffer;
  src.connect(vol);
  vol.connect(ac.destination);
  src.start(ac.currentTime + delay);
}

export const sfx = {
  click: () => tone(520, 0.06, 'triangle', 0.04),
  whistle: () => {
    tone(1750, 0.18, 'square', 0.05);
    tone(1900, 0.22, 'square', 0.04, 0.12);
  },
  goal: () => {
    tone(523, 0.18, 'triangle', 0.07);
    tone(659, 0.18, 'triangle', 0.07, 0.14);
    tone(784, 0.3, 'triangle', 0.08, 0.28);
    noise(0.5, 0.04, 0.1);
  },
  conceded: () => {
    tone(320, 0.25, 'sawtooth', 0.05);
    tone(220, 0.35, 'sawtooth', 0.05, 0.2);
  },
  card: () => tone(880, 0.12, 'square', 0.05),
  save: () => tone(300, 0.12, 'triangle', 0.05),
  injury: () => tone(200, 0.3, 'sine', 0.05),
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, i * 0.13));
  },
  lose: () => {
    [440, 370, 294].forEach((f, i) => tone(f, 0.3, 'sine', 0.06, i * 0.16));
  },
  coin: () => {
    tone(1046, 0.08, 'square', 0.05);
    tone(1568, 0.16, 'square', 0.05, 0.07);
  },
  levelUp: () => {
    [440, 554, 659, 880].forEach((f, i) => tone(f, 0.2, 'triangle', 0.06, i * 0.1));
  }
};

/** İlk kullanıcı etkileşiminde AudioContext'i uyandır (tarayıcı politikası) */
export function primeAudio() {
  getCtx();
}
