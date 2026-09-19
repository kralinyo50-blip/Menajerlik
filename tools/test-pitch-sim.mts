/* 3D sahanın SAHA MOTORU ile sürülmesini doğrular: oyuncular, top ve kaleci
   dalışı gerçekten motorun karesinden mi geliyor? (Tarayıcı gerekmez.) */
import './canvas-polyfill'; // eslint-disable-line
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMatchScene } from '../src/components/match3d/scene';
import { homeVenue } from '../src/components/match3d/venue';
import { defaultStadium } from '../src/data/stadium';
import * as sim from '../server/match-sim.mjs';
import type { ShapeSlot } from '../src/components/match3d/scene';
import type { GameState } from '../src/types/game';

const ROLES = ['KL', 'SB', 'STP', 'STP', 'SB', 'OS', 'OS', 'OS', 'OS', 'FW', 'FW'];

function shape(formation: '4-4-2' | '4-3-3'): ShapeSlot[] {
  // src/data/constants FORMATIONS ile aynı düzen: t = kendi kalesinden uzaklık (%),
  // yani kaleci t≈90 (kendi kalesi), forvetler t≈18.
  const rows: Record<string, { t: number; l: number }[]> = {
    '4-4-2': [
      { t: 90, l: 50 },
      { t: 72, l: 15 }, { t: 72, l: 35 }, { t: 72, l: 65 }, { t: 72, l: 85 },
      { t: 48, l: 15 }, { t: 45, l: 38 }, { t: 45, l: 62 }, { t: 48, l: 85 },
      { t: 18, l: 35 }, { t: 18, l: 65 },
    ],
    '4-3-3': [
      { t: 90, l: 50 },
      { t: 72, l: 15 }, { t: 72, l: 35 }, { t: 72, l: 65 }, { t: 72, l: 85 },
      { t: 48, l: 25 }, { t: 45, l: 50 }, { t: 48, l: 75 },
      { t: 20, l: 20 }, { t: 15, l: 50 }, { t: 20, l: 80 },
    ],
  };
  const nums: Record<string, number[]> = { KL: [1], SB: [2, 3], STP: [4, 5], OS: [6, 8, 10], FW: [7, 9, 11] };
  const used: Record<string, number> = {};
  return rows[formation].map((slot, i) => {
    const role = ROLES[i];
    const pool = nums[role];
    const k = used[role] ?? 0;
    used[role] = k + 1;
    return { ...slot, n: pool[k % pool.length], name: `${role}${i + 1}` };
  });
}

function squad(name: string, ovr = 72) {
  return {
    id: name.toLowerCase(), name, formation: '4-4-2', style: 'balanced',
    players: ROLES.map((role, i) => ({ id: `${name}-${i + 1}`, name: `${name} ${i + 1}`, role, ovr, energy: 100, number: i + 1 })),
  };
}

const HL = 52.5;    // scene.ts ile aynı saha ölçüsü
const toWorldX = (x: number) => ((x - 50) / 50) * (HL - 1);

const fakeState = { teamName: 'Anadolu Spor', season: 1, week: 3, stadiumLvl: 2, stadium: { design: defaultStadium().design, level: 2 } } as unknown as GameState;
const venue = homeVenue({ teamName: fakeState.teamName, design: fakeState.stadium.design, capacity: 34000, night: false });

const bundle = buildMatchScene({
  venue,
  homeKit: { shirt: '#1d4ed8', shorts: '#1d4ed8', socks: '#1d4ed8', gk: '#f59e0b', shoes: '#111827' },
  awayKit: { shirt: '#dc2626', shorts: '#991b1b', socks: '#dc2626', gk: '#22c55e', shoes: '#111827' },
  weather: 'sunny',
  night: false,
  lowPerf: false,
  homeShape: shape('4-4-2'),
  awayShape: shape('4-3-3'),
  homeName: 'Anadolu Spor',
  awayName: 'Kızıl Yıldız',
  sponsorText: 'TEST • ',
  logo: '🦁',
} as Parameters<typeof buildMatchScene>[0]);

const match = sim.createMatchSim({ home: squad('Anadolu'), away: squad('Kizil'), seed: 4242, homeAdvantage: 0.05 });
const matchSeconds = Number(process.env.MATCH_SECONDS ?? 420);
const framesPerSecondWall = 60;
const SIM_PER_FRAME = 260;              // kariyer hızı: kare başına ~260 ms simülasyon
let updates = 0;
let sawDive = false;
let sawCelebrate = false;
let sawKick = false;
let maxActorsOff = 0;
let closeActorFrames = 0;
let actorFrames = 0;
let maxBallOff = 0;
let ballFrames = 0;
let closeBallFrames = 0;
let nanCount = 0;

const actorPos = (team: 'home' | 'away', i: number) => bundle.group.getObjectByName(`actor-${team}-${i}`) as THREE.Object3D | undefined;

while (match.time < matchSeconds) {
  sim.stepSim(match, SIM_PER_FRAME);
  const frame = sim.simSnapshot(match);
  sim.drainEvents(match);
  bundle.update(updates / framesPerSecondWall, 1 / framesPerSecondWall, {
    phase: 'first', minute: Math.floor(match.time / 4.67), possession: frame.possession, timeScale: 1,
    scoreHome: frame.score.home, scoreAway: frame.score.away, homeOnPitch: 11, awayOnPitch: 11, energy: 80,
    sim: frame,
  });
  updates++;

  for (const side of ['home', 'away'] as const) {
    const list = frame.players.filter(p => p.side === side);
    list.forEach((p, i) => {
      if (p.action === 'dive') sawDive = true;
      if (p.action === 'celebrate') sawCelebrate = true;
      if (p.action === 'kick') sawKick = true;
      const obj = actorPos(side, i);
      if (!obj) return;
      const expectedX = toWorldX(p.x);
      const off = Math.abs(obj.position.x - expectedX);
      if (!Number.isFinite(obj.position.x) || !Number.isFinite(obj.position.z)) nanCount++;
      // Motor sürücüsü: konum motordan gelir. Kaleci dalışı sırasında yana kayma olabilir.
      if (!(p.action === 'dive') && p.action !== 'celebrate' && !p.sentOff) {
        maxActorsOff = Math.max(maxActorsOff, off);
        if (match.time > 8) {
          actorFrames++;
          if (off < 0.6) closeActorFrames++;
        }
      }
    });
  }
  const ball = bundle.group.getObjectByName('match-ball');
  if (ball) {
    const ballOff = Math.abs(ball.position.x - toWorldX(frame.ball.x));
    if (!Number.isFinite(ball.position.x)) nanCount++;
    maxBallOff = Math.max(maxBallOff, ballOff);
    if (match.time > 8) {
      ballFrames++;
      if (ballOff < 0.25) closeBallFrames++;
    }
  }
}

const actorShare = closeActorFrames / Math.max(1, actorFrames);
const ballShare = closeBallFrames / Math.max(1, ballFrames);
console.log([
  `kare: ${updates} • sim süresi ${match.time.toFixed(0)} sn`,
  `oyuncu sapması (maks): ${maxActorsOff.toFixed(3)} m`,
  `top sapması (maks): ${maxBallOff.toFixed(3)} m`,
  `dalış: ${sawDive ? '✅' : '❌'} • şut vuruşu: ${sawKick ? '✅' : '❌'} • kutlama: ${sawCelebrate ? '✅' : '❌'}`,
  `motor konumunda oyuncu karesi: %${(actorShare * 100).toFixed(1)}`,
  `motor konumunda top karesi: %${(ballShare * 100).toFixed(1)}`,
  `NaN kare: ${nanCount}`,
].join(' • '));

assert.ok(updates > 400, 'yeterli kare işlendi');
assert.equal(nanCount, 0, 'NaN konum olmamalı');
assert.ok(actorShare > 0.9, `oyuncular motor konumunda kalmalı (%${(actorShare * 100).toFixed(1)})`);
assert.ok(ballShare > 0.9, `top motor konumunda kalmalı (%${(ballShare * 100).toFixed(1)})`);
assert.ok(maxActorsOff < 75 && maxBallOff < 75, `sinematik dışı sapma saha dışına taşmamalı (${maxActorsOff.toFixed(1)} / ${maxBallOff.toFixed(1)} m)`);
assert.ok(sawKick, 'şut vuruşu animasyonu tetiklenmeli');
assert.ok(sawDive || sawCelebrate, 'kaleci dalışı ya da gol sevinci görülmeli');

bundle.dispose();
console.log('✅ 3D saha motor karesiyle sürülüyor');
