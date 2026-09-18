/* Maç 3D sahnesini Node'da çalıştırır: kurulum + tam maç güncelleme döngüsü.
   Amaç: tarayıcıda "stadyum yükleniyor → donuyor → çöküyor" hatasının JS tarafını yakalamak. */
import './canvas-polyfill'; // eslint-disable-line
import * as THREE from 'three';
import { buildMatchScene } from '../src/components/match3d/scene';
import { homeVenue, awayVenue, opponentKit, hashText } from '../src/components/match3d/venue';
import { defaultStadium } from '../src/data/stadium';
import { FORMATIONS } from '../src/data/constants';
import { stadiumCapacity } from '../src/utils/stadium';
import type { ShapeSlot } from '../src/components/match3d/scene';
import type { GameState } from '../src/types/game';

const fmt = (ms: number) => `${ms.toFixed(1)}ms`;

function shapeFromFormation(key: string): ShapeSlot[] {
  const keys = Object.keys(FORMATIONS);
  const f = FORMATIONS[key] ?? FORMATIONS[keys[hashText(key) % keys.length]];
  const nums: Record<string, number[]> = { KL: [1], SB: [2, 3], STP: [4, 5], OS: [6, 8, 10], FW: [7, 9, 11] };
  const used: Record<string, number> = {};
  return f.map(slot => {
    const pool = nums[slot.r] ?? [6, 8, 10];
    const i = used[slot.r] ?? 0;
    used[slot.r] = i + 1;
    return { t: slot.t, l: slot.l, n: pool[i % pool.length] };
  });
}

interface Scenario {
  label: string;
  userIsHome: boolean;
  opponent: string;
  weather: string;
  week: number;
  season: number;
  capacityOverride?: number;
  events?: { atMin: number; ev: { key: number; type: string; team: 'home' | 'away'; minute: number; text?: string } }[];
}

const scenarios: Scenario[] = [
  { label: 'EV • gündüz • güneşli (34k)', userIsHome: true, opponent: 'Kızıl Yıldız', weather: 'sunny', week: 3, season: 1 },
  { label: 'EV • gece • fırtına (46k, projektör)', userIsHome: true, opponent: 'Kızıl Yıldız', weather: 'storm', week: 4, season: 1 },
  { label: 'EV • gece • kar (60k bowl)', userIsHome: true, opponent: 'Boğaz SK', weather: 'snow', week: 5, season: 2, capacityOverride: 60000 },
  { label: 'EV • sis • kapasite 8k (min rows)', userIsHome: true, opponent: 'Sanayispor', weather: 'fog', week: 2, season: 1, capacityOverride: 8000 },
  { label: 'DEPLASMAN • Denizli Spor', userIsHome: false, opponent: 'Denizli Spor', weather: 'rain', week: 6, season: 1 },
  { label: 'DEPLASMAN • rastgele 12 rakip taraması', userIsHome: false, opponent: 'SWEEP', weather: 'sunny', week: 7, season: 1 },
];

// Tüm olay türlerini yayınayan tipik bir maç senaryosu
const fullMatchEvents: Scenario['events'] = [
  { atMin: 5, ev: { key: 1, type: 'chance', team: 'home', minute: 5, text: 'şut' } },
  { atMin: 12, ev: { key: 2, type: 'save', team: 'away', minute: 12, text: 'savunma araya girdi' } },
  { atMin: 18, ev: { key: 3, type: 'foul', team: 'home', minute: 18, text: 'faul' } },
  { atMin: 23, ev: { key: 4, type: 'card', team: 'home', minute: 23, text: '🟨 sarı kart gördü.' } },
  { atMin: 31, ev: { key: 5, type: 'goal', team: 'home', minute: 31, text: 'GOOOL' } },
  { atMin: 38, ev: { key: 6, type: 'injury', team: 'home', minute: 38, text: 'sakatlandı' } },
  { atMin: 44, ev: { key: 7, type: 'substitution', team: 'home', minute: 44 } },
  { atMin: 52, ev: { key: 8, type: 'penalty', team: 'away', minute: 52, text: 'penaltı' } },
  { atMin: 60, ev: { key: 9, type: 'corner', team: 'home', minute: 60 } },
  { atMin: 66, ev: { key: 10, type: 'card', team: 'home', minute: 66, text: '🟥 kırmızı kart!' } },
  { atMin: 71, ev: { key: 11, type: 'card', team: 'home', minute: 71, text: '🟥 kırmızı kart!' } },
  { atMin: 74, ev: { key: 12, type: 'card', team: 'home', minute: 74, text: '🟥 kırmızı kart!' } },
  { atMin: 77, ev: { key: 13, type: 'goal', team: 'away', minute: 77, text: 'rakip gol' } },
  { atMin: 84, ev: { key: 14, type: 'goal', team: 'home', minute: 84, text: 'GOOOL' } },
  { atMin: 90, ev: { key: 15, type: 'goal', team: 'home', minute: 90, text: 'son dakika!' } },
];

function phaseFor(min: number): string {
  if (min === 0) return 'pre';
  if (min < 45) return 'first';
  if (min < 46) return 'half';
  if (min <= 90) return 'second';
  return 'et';
}

function runScenario(s: Scenario) {
  const fakeState = {
    teamName: 'Anadolu Spor',
    season: s.season,
    week: s.week,
    stadiumLvl: 2,
    stadium: { design: defaultStadium().design, level: 2 },
  } as unknown as GameState;

  const capacity = s.capacityOverride ?? stadiumCapacity(fakeState);
  const evening = hashText(`${s.opponent}|${s.season}|${s.week}`) % 10 < 5;
  const venue = s.userIsHome
    ? homeVenue({ teamName: fakeState.teamName, design: fakeState.stadium.design, capacity, night: evening })
    : awayVenue(s.opponent, s.season * 31 + s.week);

  const userKit = opponentKit('USER-KIT-FIX', 1);
  const oppKit = opponentKit(s.opponent === 'SWEEP' ? 'X' : s.opponent, s.season, userKit.shirt);
  const homeKit = s.userIsHome ? userKit : oppKit;
  const awayKit = s.userIsHome ? oppKit : userKit;

  const t0 = performance.now();
  const bundle = buildMatchScene({
    venue,
    homeKit, awayKit,
    weather: s.weather,
    night: venue.night,
    lowPerf: false,
    homeShape: shapeFromFormation('4-3-3'),
    awayShape: shapeFromFormation('4-4-2'),
    homeName: s.userIsHome ? 'Anadolu Spor' : s.opponent,
    awayName: s.userIsHome ? s.opponent : 'Anadolu Spor',
    sponsorText: 'TEST SPONSOR • ',
    logo: '🦁',
  });
  const buildMs = performance.now() - t0;

  // ~60 fps sabit adım; dakika = simT / 1.333 (oyundaki gibi)
  const STEP = 1 / 60;
  const TOTAL = 125 * 1.333 + 6; // 125 dk'lık maç süresi + tam zaman
  let maxFrame = 0;
  let slowFrames = 0;
  let sum = 0;
  let evIdx = 0;
  const evs = s.events ?? fullMatchEvents;
  let lastEventGiven: ReturnType<typeof Object> | null = null;

  const t1 = performance.now();
  let i = 0;
  for (let t = 0; t < TOTAL; t += STEP, i++) {
    const minute = Math.floor(t / 1.333);
    while (evIdx < evs.length && evs[evIdx].atMin <= minute) {
      lastEventGiven = evs[evIdx].ev;
      evIdx++;
    }
    let onPitchHome = 11, onPitchAway = 11;
    if (minute > 66) onPitchHome = 9;     // 2 kırmızı
    if (minute > 74) onPitchHome = 8;     // 3 kırmızı

    const f0 = performance.now();
    bundle.update(t, STEP, {
      phase: phaseFor(Math.min(minute, 92)),
      minute,
      possession: 55,
      timeScale: 1,
      scoreHome: minute > 30 ? 1 : 0,
      scoreAway: minute > 76 ? 1 : 0,
      homeOnPitch: s.userIsHome ? onPitchHome : 11,
      awayOnPitch: s.userIsHome ? 11 : onPitchHome,
      energy: 70,
      event: lastEventGiven as never,
    });
    const f = performance.now() - f0;
    sum += f;
    if (f > maxFrame) maxFrame = f;
    if (f > 40) slowFrames++;
  }
  const updateMs = performance.now() - t1;
  const avgFrame = sum / i;
  bundle.dispose();
  const status = `${fmt(buildMs)} kurulum • ortalama kare ${fmt(avgFrame)} • en kötü kare ${fmt(maxFrame)}${slowFrames ? ` • ${slowFrames} yavaş kare` : ''}`;
  console.log(`${status.startsWith('0.0') ? '' : ''}✅ ${s.label} → ${status}`);
}

let failures = 0;
for (const s of scenarios) {
  const t0 = performance.now();
  try {
    if (s.opponent === 'SWEEP') {
      const names = ['Fener', 'Kartal', 'Kırmızı Şimşek', 'Mavi Deniz', 'Yeşilada', 'Güneş SK', 'Demir Spur', 'Yıldırım', 'Rüzgar FK', 'Toprak SK', 'Alev SK', 'Bulut SK'];
      for (const n of names) {
        try { runScenario({ ...s, opponent: n, label: `DEPLASMAN • ${n}` }); } catch (e) { failures++; console.log(`❌ DEPLASMAN • ${n} → ${(e as Error).message}`); }
      }
    } else {
      runScenario(s);
    }
  } catch (e) {
    failures++;
    console.log(`❌ ${s.label} → ${(e as Error).stack || (e as Error).message}`);
  }
  console.log(`   (toplam ${(performance.now() - t0).toFixed(0)}ms)`);
}
console.log(failures ? `\n❌ ${failures} senaryo çöktü` : '\n✅ Tüm senaryolar sorunsuz');
process.exit(failures ? 1 : 0);
