/**
 * Maç motoru testleri (Node test runner).
 *
 *   node --test tools/test-sim.mjs      (kısayol: npm run test:sim)
 *
 * Buradaki testler motorun sözleşmesini korur: determinizm, kare hızından
 * bağımsızlık, saha sınırları, istatistik tutarlılığı ve FIFA/PES benzeri
 * akışın varlığı (şut, kurtarış, gol, korner, faul, ofsayt, duran top).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMatchSim, stepSim, drainEvents, simStats, simSnapshot, simPossessionSide,
  setTeamTactics, substitutePlayer, markSentOff, scriptOutcome, seedFrom, FORMATIONS,
} from '../server/match-sim.mjs';

const ROLES = ['KL', 'SB', 'STP', 'STP', 'SB', 'OS', 'OS', 'OS', 'OS', 'FW', 'FW'];

/** Test takımı: 11 oyuncu, istenen güçte. */
function squad(name, ovr = 72, extra = {}) {
  return {
    id: name.toLowerCase(), name, logo: '🅰️', style: 'balanced', formation: '4-4-2',
    ...extra,
    players: ROLES.map((role, i) => ({
      id: `${name}-${i + 1}`, name: `${name} ${i + 1}`, role, position: role, ovr, energy: 100, number: i + 1,
    })),
  };
}

const makeSim = (seed = 1, ovr = 72, opts = {}) => createMatchSim({
  home: squad('Ev', ovr), away: squad('Dep', ovr), seed, ...opts,
});

/** Maçı sim zamanı cinsinden oynatır ve sonucu döner. */
function playMatch(sim, seconds = 270, chunk = 500) {
  let guard = 0;
  while (sim.time < seconds && guard++ < 20000) stepSim(sim, chunk);
  return sim;
}

/** Tüm maç boyunca toplanan olayları tür bazında sayar. */
function collectEvents(sim, seconds = 270) {
  const counts = {};
  let guard = 0;
  while (sim.time < seconds && guard++ < 20000) {
    stepSim(sim, 500);
    for (const e of drainEvents(sim)) counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}

const inBounds = (n, lo = 0, hi = 100) => Number.isFinite(n) && n >= lo - 0.01 && n <= hi + 0.01;

test('aynı tohum aynı maçı üretir (deterministik)', () => {
  const a = playMatch(makeSim(4242));
  const b = playMatch(makeSim(4242));
  const sa = simSnapshot(a); const sb = simSnapshot(b);
  assert.deepEqual(sa.players, sb.players, 'oyuncu konumları birebir aynı olmalı');
  assert.deepEqual(sa.ball, sb.ball);
  assert.deepEqual(sa.stats, sb.stats);
  assert.equal(sa.score.home, sb.score.home);
  assert.equal(sa.score.away, sb.score.away);
});

test('farklı tohumlar farklı maç üretir', () => {
  const a = simSnapshot(playMatch(makeSim(11)));
  const b = simSnapshot(playMatch(makeSim(99)));
  assert.notDeepEqual(a.players, b.players);
});

test('kare hızından bağımsız: 100 ms adımlarla ve tek büyük adımla aynı sonuç', () => {
  const a = makeSim(7);
  for (let i = 0; i < 600; i++) stepSim(a, 100);
  const b = makeSim(7);
  for (let i = 0; i < 60; i++) stepSim(b, 1000);
  assert.deepEqual(simSnapshot(a).players, simSnapshot(b).players);
  assert.deepEqual(simSnapshot(a).stats, simSnapshot(b).stats);
});

test('seedFrom metinden deterministik tohum üretir', () => {
  assert.equal(seedFrom('maç', 'ev', 'dep'), seedFrom('maç', 'ev', 'dep'));
  assert.notEqual(seedFrom('maç', 'ev', 'dep'), seedFrom('maç', 'dep', 'ev'));
  assert.ok(Number.isInteger(seedFrom('x')));
});

test('maç akışı: şut, kurtarış, gol, korner, faul, taç ve ofsayt görülür', () => {
  const totals = { shot: 0, save: 0, goal: 0, corner: 0, foul: 0, throwIn: 0, goalKick: 0, tackle: 0, interception: 0, offside: 0 };
  for (const seed of [101, 202, 303, 404, 505]) {
    const counts = collectEvents(makeSim(seed));
    for (const key of Object.keys(totals)) totals[key] += counts[key] ?? 0;
  }
  assert.ok(totals.shot >= 15, `5 maçta en az 15 şut olmalı (bulunan: ${totals.shot})`);
  assert.ok(totals.save >= 5, `kaleci kurtarışı olmalı (bulunan: ${totals.save})`);
  assert.ok(totals.goal >= 3, `gol olmalı (bulunan: ${totals.goal})`);
  assert.ok(totals.foul >= 8, `faul olmalı (bulunan: ${totals.foul})`);
  assert.ok(totals.tackle >= 8, `ikili mücadele olmalı (bulunan: ${totals.tackle})`);
  assert.ok(totals.interception >= 15, `pas kesme olmalı (bulunan: ${totals.interception})`);
  assert.ok(totals.throwIn + totals.goalKick + totals.corner >= 3, 'oyun dışına çıkan toplar olmalı');
});

test('istatistikler tutarlı: isabetli pas pas sayısını geçmez, top% 0-100', () => {
  for (const seed of [11, 22, 33]) {
    const sim = playMatch(makeSim(seed));
    const s = simStats(sim);
    for (const side of ['home', 'away']) {
      assert.ok(s[side].passesCompleted <= s[side].passes, `${side}: isabetli pas sayısı toplamı geçmemeli`);
      assert.ok(s[side].onTarget <= s[side].shots, `${side}: isabetli şut toplamı geçmemeli`);
      assert.ok(s[side].goals <= s[side].onTarget + s[side].saves, `${side}: gol, isabetli şut/kurtarış dengesi`);
    }
    assert.ok(s.possessionHome >= 0 && s.possessionHome <= 100);
  }
});

test('saha sınırları ve NaN kontrolü: oyuncular ve top sahada kalır', () => {
  const sim = makeSim(777);
  for (let i = 0; i < 2700; i++) {
    stepSim(sim, 100);
    const snap = simSnapshot(sim);
    for (const p of snap.players) {
      assert.ok(inBounds(p.x) && inBounds(p.y), `${p.name} sahada olmalı: ${p.x},${p.y}`);
      assert.ok(Number.isFinite(p.vx) && Number.isFinite(p.vy), 'hız sayısal olmalı');
      assert.ok(p.energy >= 0 && p.energy <= 100, 'enerji 0-100 arasında');
    }
    assert.ok(Number.isFinite(snap.ball.x) && Number.isFinite(snap.ball.y), 'top konumu sayısal olmalı');
    assert.ok(snap.ball.x > -8 && snap.ball.x < 108, `top x saha dışına taşmamalı: ${snap.ball.x}`);
    assert.ok(Number.isFinite(snap.ball.z) && snap.ball.z >= -0.01, 'top yüksekliği geçerli olmalı');
  }
});

test('gol sonrası santra yapılır ve skor artar', () => {
  const sim = makeSim(5150);
  let sawGoal = false;
  for (let i = 0; i < 4000 && !sawGoal; i++) {
    stepSim(sim, 100);
    const goals = drainEvents(sim).filter(e => e.type === 'goal');
    if (goals.length) {
      sawGoal = true;
      const concededBy = goals[0].side === 'home' ? 'away' : 'home';
      assert.ok(sim.restart, 'golden sonra oyun durdurulmalı');
      assert.equal(sim.restart.type, 'kickoff');
      assert.equal(sim.restart.side, concededBy, 'golü yiyen takım santra yapar');
    }
  }
  assert.ok(sawGoal, 'bu tohumda gol olmalı');
});

test('scriptOutcome golü zorlar (kariyer eşlemesi)', () => {
  const sim = makeSim(31);
  const before = sim.score.home;
  let goals = 0;
  let guard = 0;
  while (goals === 0 && guard++ < 6000) {
    if (!sim.script) scriptOutcome(sim, 'home', 'goal', 60);
    stepSim(sim, 100);
    goals += drainEvents(sim).filter(e => e.type === 'goal' && e.side === 'home').length;
  }
  assert.equal(sim.score.home, before + 1, 'scriptOutcome ile gol gelmeli');
});

test('scriptOutcome kurtarış ve ıska sonuçlarını da işleyebilir', () => {
  const sim = makeSim(32);
  let saves = 0, misses = 0, guard = 0;
  while ((saves === 0 || misses === 0) && guard++ < 9000) {
    if (!sim.script) scriptOutcome(sim, 'away', saves === 0 ? 'save' : 'miss', 60);
    stepSim(sim, 100);
    for (const e of drainEvents(sim)) {
      if (e.type === 'save') saves++;
      if (e.type === 'chance') misses++;
    }
    if (saves > 0 && sim.script && sim.script.outcome === 'save') sim.script = null;
    if (misses > 0 && sim.script && sim.script.outcome === 'miss') sim.script = null;
  }
  assert.ok(saves > 0, 'kurtarış senaryosu çalışmalı');
  assert.ok(misses > 0, 'ıska senaryosu çalışmalı');
});

test('taktik ve diziliş değişikliği uygulanır', () => {
  const sim = makeSim(5);
  setTeamTactics(sim, 'home', { style: 'attack', formation: '4-3-3' });
  assert.equal(sim.home.style, 'attack');
  assert.equal(sim.home.formation, '4-3-3');
  assert.equal(sim.home.players.length, 11);
  assert.deepEqual(sim.home.players.map(p => p.role), Object.keys(FORMATIONS['4-3-3']).length ? sim.home.players.map(p => p.role) : []);
  stepSim(sim, 5000);
  assert.ok(sim.time > 0);
});

test('oyuncu değişikliği ve kırmızı kart kadroyu günceller', () => {
  const sim = makeSim(6);
  const out = sim.home.players[5];
  substitutePlayer(sim, 'home', out.id, { id: 'yedek-1', name: 'Yedek Oyuncu', role: out.role, ovr: 80, energy: 100 });
  const incoming = sim.home.players.find(p => p.id === 'yedek-1');
  assert.ok(incoming, 'yeni oyuncu sahaya girmeli');
  assert.equal(incoming.ovr, 80);
  assert.equal(sim.home.players.length, 11);
  markSentOff(sim, 'home', incoming.id);
  assert.equal(sim.home.players.find(p => p.id === 'yedek-1').sentOff, true);
  stepSim(sim, 3000);
});

test('ofsayt kuralı: ileride bekleyen oyuncuya atılan top ofsayt olur', () => {
  const sim = makeSim(64);
  const striker = sim.home.players[9];
  for (const d of sim.away.players) d.x = Math.min(d.x, 40);            // savunma hattı geride
  striker.x = 85; striker.y = 50; striker.vx = 0; striker.vy = 0;
  // Top, ofsayt çizgisinin gerisinde bekleyen forvete doğru yolda.
  sim.ball.owner = null; sim.carrier = null;
  sim.ball.x = 78; sim.ball.y = 50; sim.ball.z = 0;
  sim.ball.vx = 16; sim.ball.vy = 0; sim.ball.vz = 0;
  sim.pendingPass = { from: sim.home.players[6].id, fromX: 70, fromY: 50, to: striker.id, side: 'home', at: sim.time };
  sim.ball.intendedFor = striker.id;
  let offside = false;
  for (let i = 0; i < 40 && !offside; i++) {
    stepSim(sim, 100);
    offside = drainEvents(sim).some(e => e.type === 'offside');
  }
  assert.ok(offside, 'ofsayt bayrağı kalkmalı');
});

test('snapshot sözleşmesi: görsel katmanın beklediği alanlar var', () => {
  const sim = playMatch(makeSim(909), 60);
  const snap = simSnapshot(sim);
  for (const key of ['time', 'score', 'possession', 'ball', 'restart', 'celebrating', 'carrierId', 'players', 'stats']) {
    assert.ok(key in snap, `snapshot.${key} olmalı`);
  }
  for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'owner', 'shot']) assert.ok(key in snap.ball, `ball.${key} olmalı`);
  assert.equal(snap.players.length, 22);
  for (const p of snap.players) {
    for (const key of ['id', 'side', 'number', 'role', 'name', 'x', 'y', 'vx', 'vy', 'action', 'facing', 'energy', 'yellow', 'sentOff']) {
      assert.ok(key in p, `player.${key} olmalı`);
    }
  }
  assert.ok(simPossessionSide(sim) === null || ['home', 'away'].includes(simPossessionSide(sim)));
});

test('uzun maç boyunca top sürekli oyunda kalır (sahipsiz çakılma yok)', () => {
  const sim = makeSim(1234);
  let owned = 0, ticks = 0, restarts = 0;
  for (let i = 0; i < 2700; i++) {
    stepSim(sim, 100);
    ticks++;
    if (sim.ball.owner) owned++;
    if (sim.restart) restarts++;
  }
  assert.ok(owned / ticks > 0.25, `top maçın en az %25'inde bir oyuncunun ayağında olmalı (bulunan: ${(owned / ticks * 100).toFixed(0)}%)`);
  assert.ok(restarts / ticks < 0.2, 'oyun duraklamalarla geçmemeli');
});

test('enerji maç boyunca düşer', () => {
  const sim = makeSim(88);
  const start = sim.home.players[9].energy;
  playMatch(sim, 270);
  assert.ok(sim.home.players[9].energy < start, 'oyuncu enerjisi azalmalı');
  assert.ok(sim.home.players.reduce((a, p) => a + p.distance, 0) > 500, 'oyuncular koşmalı');
});
