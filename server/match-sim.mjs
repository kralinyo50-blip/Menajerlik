// Gerçek futbol simülasyonu — 2D ve 3D sahaların tek ortak kaynağı.
//
// Neden ayrı bir motor: eski gösterim topu sinüs/noise ile salındırıyor, oyuncuları
// formasyon noktasının etrafında titretiyordu. Şut, kurtarış, korner yalnızca yazı olarak
// düşüyordu; oyun "maç gibi" görünmüyordu. Bu motorda top gerçekten taşınır, pas atılır,
// şut çekilir, kaleci uzanır, top taça/kornere gider — olaylar bu fizikten doğar.
//
// Sözleşmeler:
// - Koordinatlar 0..100. x: uzunluk (ev sahibi +x yönüne oynar), y: genişlik.
//   Ev golü x=0, deplasman golü x=100. 1 x-birimi ≈ 1.05 m, 1 y-birimi ≈ 0.68 m.
// - `stepSim` sabit alt adımlarla ilerler; aynı tohum + aynı adım dizisi = aynı maç.
//   Sunucu (online) ve tarayıcı (kariyer) aynı motoru kullanır.
// - Motor DOM bilmez, ağ bilmez, saat bilmez: saf ve deterministik fonksiyonlar.

/** Sabit simülasyon adımı (ms). Dışarıdan gelen süre bunun katlarına bölünür. */
export const SIM_DT = 100;
/** Kale yarı genişliği (y birimi) ve direk yüksekliği (z birimi). */
const GOAL_HALF_WIDTH = 5.4;
const GOAL_HEIGHT = 2.44;
/** Ceza sahası / altı pas ölçüleri (x ve y birimi). */
const BOX_DEPTH = 15.7;
const BOX_HALF_WIDTH = 29.6;
const SIX_DEPTH = 5.2;

// Futbol hızları (birim/saniye): 1 x-birimi ≈ 1.05 m olduğundan ~1 birim/s ≈ 1 m/s.
const SPEED = {
  jog: 5.0, run: 7.2, sprint: 8.6,
  pass: 21, long: 24, shot: 30, cross: 18, throwIn: 12,
};
const GRAVITY = 22;         // z ekseninde yerçekimi
const GROUND_FRICTION = 12;  // yerdeki yavaşlama (birim/s²)
const AIR_DRAG = 0.25;      // havadaki direnç (1/s)

export const FORMATIONS = {
  '4-4-2': [[8,50],[25,17],[22,39],[22,61],[25,83],[48,16],[44,39],[44,61],[48,84],[70,37],[70,63]],
  '4-3-3': [[8,50],[25,17],[22,39],[22,61],[25,83],[43,30],[40,50],[43,70],[67,18],[72,50],[67,82]],
  '3-5-2': [[8,50],[23,27],[20,50],[23,73],[48,12],[42,32],[39,50],[42,68],[48,88],[71,37],[71,63]],
};
const ROLES = ['KL', 'STP', 'SB', 'OS', 'FW'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round2 = n => Math.round(n * 100) / 100;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const attackDir = key => (key === 'home' ? 1 : -1);
const targetGoalX = key => (key === 'home' ? 100 : 0);
const ownGoalX = key => (key === 'home' ? 0 : 100);
const other = key => (key === 'home' ? 'away' : 'home');

const STYLE = {
  balanced: { shoot: 1, press: 1, passRate: 0.8, width: 1 },
  attack: { shoot: 1.32, press: 1.02, passRate: 0.74, width: 1.05 },
  defense: { shoot: 0.8, press: 1.12, passRate: 0.85, width: 0.92 },
  possession: { shoot: 0.92, press: 0.96, passRate: 0.88, width: 1.08 },
};
const ROLE_PACE = { KL: 0.82, STP: 0.93, SB: 1.0, OS: 0.98, FW: 1.05 };
const ROLE_PUSH = { KL: 0, STP: 5, SB: 6, OS: 9, FW: 13 };

/** Deterministik RNG (xorshift32): aynı tohum, aynı maç. */
/** xorshift32 adımı: durum sayı olarak tutulur (kaydedilip geri yüklenebilir). */
function nextRandom(sim) {
  let x = sim.rngState | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  sim.rngState = x >>> 0;
  return sim.rngState / 4294967296;
}
/**
 * Aynı girdilerden aynı tohumu üretir (oda kodu + hafta + maç kimliği gibi).
 * Saf JS (FNV-1a) olduğu için hem sunucuda hem tarayıcıda aynı sonucu verir.
 */
export function seedFrom(...parts) {
  const text = parts.join(':');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) || 1;
}

function blankStats() {
  return {
    shots: 0, onTarget: 0, goals: 0, saves: 0, corners: 0, throwIns: 0, fouls: 0, offsides: 0,
    passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0, clearances: 0, crosses: 0, woodwork: 0, blocks: 0,
  };
}

function buildTeam(spec, key) {
  const formation = FORMATIONS[spec.formation] ? spec.formation : '4-4-2';
  const anchors = FORMATIONS[formation];
  const players = (spec.players || []).slice(0, 11).map((p, i) => {
    const [ax, ay] = anchors[i] || anchors[anchors.length - 1];
    const x = key === 'home' ? ax : 100 - ax;
    const y = key === 'home' ? ay : 100 - ay;
    return {
      id: p.id, name: p.name, role: ROLES.includes(p.role) ? p.role : 'OS', ovr: clamp(p.ovr ?? 70, 20, 99),
      number: i + 1, side: key, baseAnchor: { x, y }, anchor: { x, y },
      x, y, vx: 0, vy: 0, facing: key === 'home' ? 0 : Math.PI,
      action: 'idle', actionT: 0, decisionIn: 0,
      energy: clamp(p.energy ?? 100, 1, 100), yellow: 0, sentOff: false, distance: 0,
      moving: false, sprinting: false, touches: 0, tackleCooldown: 0,
    };
  });
  const style = STYLE[spec.style] ? spec.style : 'balanced';
  return {
    key, memberId: spec.id, name: spec.name, logo: spec.logo, style, formation, players,
    intentions: { shoot: STYLE[style].shoot, press: STYLE[style].press, passRate: STYLE[style].passRate },
    stats: blankStats(),
  };
}

/**
 * Maçı kurar.
 * `home`/`away`: { id, name, logo, style, formation, players: [{id,name,role,ovr,energy}] }
 */
export function createMatchSim({ home, away, seed = 1, homeAdvantage = 0.05 } = {}) {
  const sim = {
    rngState: (seed >>> 0) || 0x9e3779b9, seed, homeAdvantage,
    home: buildTeam(home, 'home'), away: buildTeam(away, 'away'),
    ball: {
      x: 50, y: 50, z: 0, vx: 0, vy: 0, vz: 0, spin: 0,
      owner: null, lastTouchId: null, lastTouchSide: 'home', intendedFor: null,
      shot: null, crossing: false, lofted: false,
    },
    score: { home: 0, away: 0 },
    time: 0, accumulator: 0,
    possessionMs: { home: 0, away: 0 },
    events: [], eventCursor: 0, eventSeq: 0,
    restart: null, celebrationUntil: 0, shieldUntil: 0,
    carrier: null, pendingPass: null, script: null, bias: null,
  };
  emit(sim, 'kickoff', { text: 'İlk düdük!' });
  setupKickoff(sim, 'home', 1.2);
  return sim;
}

const teamOf = (sim, key) => (key === 'home' ? sim.home : sim.away);

function emit(sim, type, data = {}) {
  const event = {
    seq: ++sim.eventSeq, type, t: round2(sim.time),
    side: data.side ?? null, playerId: data.playerId ?? null,
    text: data.text ?? '', x: round2(data.x ?? sim.ball.x), y: round2(data.y ?? sim.ball.y),
  };
  sim.events.push(event);
  return event;
}

/**
 * Birikmiş olayları döndürür ve imleci ilerletir (her karede bir kez çağrılır).
 * Uzun maçlarda olay listesi budanırken imleç de kaydırılır — aksi hâlde 200.
 * olaydan sonraki tüm olaylar sessizce kayboluyordu.
 */
export function drainEvents(sim) {
  const out = sim.events.slice(sim.eventCursor);
  sim.eventCursor = sim.events.length;
  if (sim.events.length > 400) {
    const drop = sim.events.length - 200;
    sim.events.splice(0, drop);
    sim.eventCursor = Math.max(0, sim.eventCursor - drop);
  }
  return out;
}

const rnd = (sim, scale = 1) => nextRandom(sim) * scale;
const chance = (sim, p) => nextRandom(sim) < p;
const rand = (sim, min, max) => min + nextRandom(sim) * (max - min);

// ---------------------------------------------------------------------------
// Oyuncu hareketi ve takım şekli
// ---------------------------------------------------------------------------
function maxSpeed(sim, player, sprinting) {
  const fitness = 0.84 + (player.energy / 100) * 0.16;
  const skill = 0.95 + (player.ovr - 70) * 0.0022;
  const home = player.side === 'home' ? 1 + sim.homeAdvantage : 1;
  return (sprinting ? SPEED.sprint : SPEED.run) * (ROLE_PACE[player.role] ?? 1) * fitness * skill * home;
}

function steer(sim, player, targetX, targetY, sprinting, dt) {
  const speed = maxSpeed(sim, player, sprinting);
  const dx = targetX - player.x, dy = targetY - player.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.3) {
    player.vx *= 0.55; player.vy *= 0.55;
    player.moving = Math.hypot(player.vx, player.vy) > 1.2;
    return;
  }
  const accel = 16 * dt;
  player.vx += clamp((dx / d) * speed - player.vx, -accel, accel);
  player.vy += clamp((dy / d) * speed - player.vy, -accel, accel);
  const v = Math.hypot(player.vx, player.vy);
  if (v > speed) { player.vx = (player.vx / v) * speed; player.vy = (player.vy / v) * speed; }
  player.facing = Math.atan2(dy, dx);
  player.moving = v > 1.2;
  player.sprinting = sprinting && v > 4.6;
}

/** Oyuncuları hızlarına göre ilerletir; koşu mesafesi enerjiyi tüketir. */
function integratePlayers(sim, dt) {
  for (const key of ['home', 'away']) {
    for (const p of teamOf(sim, key).players) {
      if (p.sentOff) continue;
      p.x = clamp(p.x + p.vx * dt, 1, 99);
      p.y = clamp(p.y + p.vy * dt, 1, 99);
      const travelled = Math.hypot(p.vx, p.vy) * dt;
      p.distance += travelled;
      p.energy = clamp(p.energy - travelled * (p.sprinting ? 0.05 : 0.025) * (0.9 + (100 - p.energy) / 250), 8, 100);
    }
  }
}

function inShootingRange(sim, player) {
  const gx = targetGoalX(player.side);
  const d = dist(player.x, player.y, gx, 50);
  return d < 28 && Math.abs(player.y - 50) < 26;
}
function inOwnBox(sim, x, y, key) {
  return Math.abs(x - ownGoalX(key)) < BOX_DEPTH && Math.abs(y - 50) < BOX_HALF_WIDTH;
}
const inOpponentBox = (x, y, key) => Math.abs(x - targetGoalX(key)) < BOX_DEPTH && Math.abs(y - 50) < BOX_HALF_WIDTH;

/**
 * Topun "kimin" olduğu: sürükleyen varsa o, yoksa pasın hedefi, yoksa topa en
 * yakın oyuncunun takımı. Takım dizilişi buna göre kurulur — sahipsiz topta iki
 * takımın da kendi kalesine yığılmasını engeller.
 */
function ballSideKey(sim) {
  if (sim.carrier) return sim.carrier.side;
  const aimed = sim.ball.intendedFor;
  if (aimed) {
    if (sim.home.players.some(p => p.id === aimed)) return 'home';
    if (sim.away.players.some(p => p.id === aimed)) return 'away';
  }
  let best = null, bestD = Infinity;
  for (const key of ['home', 'away']) {
    for (const p of teamOf(sim, key).players) {
      if (p.sentOff || p.role === 'KL') continue;
      const d = dist(p.x, p.y, sim.ball.x, sim.ball.y);
      if (d < bestD) { bestD = d; best = key; }
    }
  }
  return best;
}

function updatePositions(sim, dt) {
  const ball = sim.ball;
  for (const key of ['home', 'away']) {
    const team = teamOf(sim, key);
    const dir = attackDir(key);
    const onBall = ballSideKey(sim);
    const possessing = onBall === key || (sim.restart && sim.restart.side === key && sim.restart.type !== 'goal-kick');
    const restType = sim.restart?.type;
    const ballProgress = key === 'home' ? ball.x : 100 - ball.x;   // 0 = kendi kalesi, 100 = rakip kale
    const lineHeight = possessing ? 6 : 1;
    for (const player of team.players) {
      if (player.sentOff || player === sim.carrier) continue;
      if (player.action === 'dive' && player.actionT > 0) { player.actionT -= dt; continue; }
      const isKeeper = player.role === 'KL';
      let tx, ty;
      if (isKeeper) continue;                                       // kaleci ayrı güncellenir
      if (sim.restart && sim.restart.takerId === player.id) {
        // Set-piece kullanacak oyuncu topun başına gider.
        steer(sim, player, sim.restart.x, sim.restart.y, true, dt);
        player.action = 'walk';
        continue;
      }
      if (restType === 'penalty' && !possessing) {
        // Penaltıda savunma oyuncuları ceza sahası dışında bekler.
        tx = ownGoalX(key) + dir * 22; ty = clamp(38 + player.number * 2, 26, 74);
      } else if (restType === 'corner' && !possessing) {
        // Kornerde savunma kalesinin önünde toplanır (adam adama).
        tx = ownGoalX(key) + dir * rand(sim, 4, 10); ty = 36 + player.number * 2.6;
      } else if (restType === 'corner' && possessing) {
        // Korner atan takım ceza sahasına yüklenir.
        tx = targetGoalX(key) - dir * rand(sim, 4, 12); ty = 38 + player.number * 2.4;
      } else if (possessing) {
        if (player.runner && player.runTo) { steer(sim, player, player.runTo.x, player.runTo.y, true, dt); if (player.actionT <= 0) player.action = 'sprint'; continue; }
        // Hücum şekli doğrudan TOPA göre kurulur: savunma topun 22-26 m gerisinde,
        // orta saha topun hizasında, forvetler önde. Böylece ileri pas seçeneği hep
        // doğar ve top kaleye yürür (eski diziliş topun 20 m gerisinde kalıyordu).
        const ballX = ball.x;
        const offset = player.role === 'FW' ? 12 : player.role === 'OS' ? 1 : player.role === 'SB' ? -20 : -25;
        tx = ballX + dir * (offset + lineHeight * 0.4);
        if (player.role === 'FW' || player.role === 'OS') {
          // Ofsayta düşmeden savunma hattını geri iter.
          const line = defensiveLineX(sim, key);
          const limit = line + dir * (player.role === 'FW' ? 2.5 : -1);
          tx = dir > 0 ? Math.min(tx, limit) : Math.max(tx, limit);
          if (player.role === 'FW') tx = dir > 0 ? Math.max(tx, ballX + dir * 7) : Math.min(tx, ballX + dir * 7);
        }
        // Kanatlar sahaya yayılır; top bir kanattaysa karşı kanat daha da açar.
        const spread = player.role === 'SB' ? 10 : player.role === 'OS' ? 8 : 0;
        ty = player.anchor.y + (ball.y - 50) * (player.role === 'OS' ? 0.35 : 0.28);
        ty += (ty >= 50 ? 1 : -1) * spread;
        if ((player.role === 'FW' || player.role === 'OS') && ballProgress > 62) ty *= 0.92;
        if (player.role === 'FW') ty += (player.number % 2 === 0 ? 1 : -1) * 5;
      } else {
        // Savunma: top ile kendi kalesi arasında kal, hat halinde kay.
        const lineX = clamp(ball.x - dir * clamp(6 + ballProgress * 0.16, 6, 20), 6, 94);
        tx = player.role === 'FW' ? lineX + dir * 12 : lineX + dir * (player.role === 'OS' ? 7 : 2.5);
        ty = player.anchor.y + (ball.y - player.anchor.y) * 0.55;
        if (player.role === 'FW' || player.role === 'OS') ty = clamp(ty, 12, 88);
        // Adam adama markaj: eşleştiği koşucunun kale tarafında kalır.
        if (player.markingId) {
          const runner = [...sim.home.players, ...sim.away.players].find(p => p.id === player.markingId);
          if (runner && !runner.sentOff) {
            tx = runner.x - dir * 1.7;
            ty = runner.y + (runner.y >= 50 ? -1 : 1) * 0.6;
          }
        }
      }
      tx = clamp(tx ?? player.anchor.x, 3, 97);
      ty = clamp(ty ?? player.anchor.y, 3, 97);
      // Kale direği dibinde yığılmayı önle: takım arkadaşı çok yakınsa yana kay.
      for (const mate of team.players) {
        if (mate === player || mate.sentOff || mate.role === 'KL') continue;
        const d = dist(tx, ty, mate.x, mate.y);
        if (d < 3.4) { ty += (ty >= mate.y ? 1 : -1) * (3.4 - d) * 0.6; }
      }
      const chasing = !possessing && cornerPress(sim, key, player);
      steer(sim, player, tx, clamp(ty, 3, 97), chasing, dt);
      if (player.actionT > 0) continue;
      player.action = player.actionT > 0 ? player.action : player.sprinting ? 'sprint' : player.moving ? 'run' : 'idle';
    }
  }
}

/** Baskı kurmaya en yakın iki oyuncu topa gider; diğerleri alanı kapatır. */
function applyPressing(sim, dt) {
  if (!sim.carrier || sim.restart) return;
  const defending = teamOf(sim, other(sim.carrier.side));
  const chasers = defending.players
    .filter(p => !p.sentOff && p.role !== 'KL')
    .map(p => ({ p, d: dist(p.x, p.y, sim.carrier.x, sim.carrier.y) }))
    .sort((a, b) => a.d - b.d);
  const pressCount = defending.intentions.press > 1.05 ? 3 : 2;
  for (const { p } of chasers.slice(0, pressCount)) {
    steer(sim, p, sim.carrier.x + sim.carrier.vx * 0.25, sim.carrier.y + sim.carrier.vy * 0.25, true, dt);
    if (p.actionT <= 0) p.action = 'press';
  }
}
const cornerPress = (sim, key, player) => sim.carrier && sim.carrier.side !== key && dist(player.x, player.y, sim.carrier.x, sim.carrier.y) < 20;

// ---------------------------------------------------------------------------
// Top fiziği
// ---------------------------------------------------------------------------
function kickBall(sim, player, targetX, targetY, speed, vz = 0) {
  const ball = sim.ball;
  ball.owner = null;
  ball.lastTouchId = player.id; ball.lastTouchSide = player.side;
  ball.intendedFor = null; ball.crossing = false;
  const dx = targetX - ball.x, dy = targetY - ball.y;
  const d = Math.max(0.2, Math.hypot(dx, dy));
  ball.vx = (dx / d) * speed; ball.vy = (dy / d) * speed;
  ball.vz = vz;
  ball.z = Math.max(ball.z, 0.05);
  ball.lofted = vz > 1.4;
  player.action = speed >= SPEED.shot * 0.9 ? 'shoot' : 'pass';
  player.actionT = 0.28;
  player.touches++;
}

function updateBall(sim, dt) {
  const ball = sim.ball;
  ball.prevX = ball.x; ball.prevY = ball.y;
  if (ball.owner) {
    const o = ball.owner;
    const ahead = o.moving ? 1.7 : 0.95;
    ball.x = clamp(o.x + Math.cos(o.facing) * ahead, 0.3, 99.7);
    ball.y = clamp(o.y + Math.sin(o.facing) * ahead, 0.3, 99.7);
    ball.z = 0; ball.vx = o.vx; ball.vy = o.vy; ball.vz = 0; ball.spin = Math.hypot(o.vx, o.vy) / 12;
    return;
  }
  if (ball.z > 0.02 || ball.vz !== 0) {
    ball.vz -= GRAVITY * dt;
    const drag = 1 - AIR_DRAG * dt;
    ball.vx *= drag; ball.vy *= drag; ball.vz *= drag;
  } else {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0.05) {
      const next = Math.max(0, speed - GROUND_FRICTION * dt);
      ball.vx = (ball.vx / speed) * next; ball.vy = (ball.vy / speed) * next;
    } else { ball.vx = 0; ball.vy = 0; }
  }
  ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt;
  if (ball.z <= 0) { ball.z = 0; ball.vz = ball.vz < -2.5 ? -ball.vz * 0.45 : 0; }
  ball.spin = clamp(Math.hypot(ball.vx, ball.vy) / 22, 0, 1.4);
  if (ball.z < 0.4 && Math.abs(ball.vz) < 0.4) ball.lofted = false;
}

/** Serbest topun önümüzdeki 6 saniyedeki yolu (fizik motoruyla aynı hesap). */
function ballPath(sim, steps = 60) {
  const ball = sim.ball;
  let { x, y, z, vx, vy, vz } = ball;
  const dt = SIM_DT / 1000;
  const path = [];
  for (let i = 0; i < steps; i++) {
    if (z <= 0.02 && vz <= 0 && Math.hypot(vx, vy) < 0.5) {
      while (path.length < steps) path.push({ x, y, z: 0 });
      break;
    }
    if (z > 0.02 || vz !== 0) {
      vz -= GRAVITY * dt;
      const drag = 1 - AIR_DRAG * dt; vx *= drag; vy *= drag; vz *= drag;
    } else {
      const speed = Math.hypot(vx, vy);
      if (speed > 0) { const next = Math.max(0, speed - GROUND_FRICTION * dt); vx = (vx / speed) * next; vy = (vy / speed) * next; }
    }
    x += vx * dt; y += vy * dt; z += vz * dt;
    if (z <= 0) { z = 0; if (vz < -2.5) vz = -vz * 0.45; else vz = 0; }
    path.push({ x, y, z });
  }
  return path;
}

/** Serbest topun duracağı/ineceği nokta (yedek hedef). */
function predictBallStop(sim) {
  if (sim.ball.owner) return { x: sim.ball.x, y: sim.ball.y };
  const path = ballPath(sim, 120);
  const end = path[path.length - 1];
  return { x: clamp(end.x, 0, 100), y: clamp(end.y, 0, 100) };
}

/**
 * Oyuncunun topu karşılayacağı nokta: "top nerede duracak" değil,
 * "ben koşarsam hangi anda topa yetişirim" hesabı. Top boşta kalmıyor.
 */
function interceptTarget(sim, player) {
  const path = ballPath(sim, 60);
  const speed = maxSpeed(sim, player, true);
  const dt = SIM_DT / 1000;
  for (let i = 0; i < path.length; i++) {
    const t = (i + 1) * dt;
    const p = path[i];
    const reach = speed * t + 1.9 + (player.role === 'KL' ? 1.2 : 0);
    if (dist(player.x, player.y, p.x, p.y) <= reach) return { x: p.x, y: p.y, t, z: p.z };
  }
  const end = path[path.length - 1];
  return { x: end.x, y: end.y, t: 6, z: 0 };
}

/** Top sahipsizken en yakın oyuncular topa (veya ineceği noktaya) koşar. */
function chaseLooseBall(sim, dt) {
  const ball = sim.ball;
  if (ball.owner || sim.restart) return;
  const intendedSide = ball.intendedFor ? (sim.home.players.some(p => p.id === ball.intendedFor) ? 'home' : 'away') : null;
  for (const key of ['home', 'away']) {
    const team = teamOf(sim, key);
    if (key === intendedSide) {
      // Pasın hedefi topu karşılamaya koşar; diğerleri (yanlışlıkla pası çalmasınlar diye) şekilde kalır.
      const receiver = team.players.find(p => p.id === ball.intendedFor);
      if (receiver && !receiver.sentOff) {
        const meet = interceptTarget(sim, receiver);
        steer(sim, receiver, meet.x, meet.y, true, dt);
        if (receiver.actionT <= 0) receiver.action = 'sprint';
      }
      // Topa en yakın takım arkadaşı da kısa mesafede yardıma koşar (ıskalanan pas sahipsiz kalmasın).
      const helper = team.players
        .filter(p => !p.sentOff && p.role !== 'KL' && p.id !== ball.intendedFor)
        .map(p => ({ p, d: dist(p.x, p.y, ball.x, ball.y) }))
        .sort((a, b) => a.d - b.d)[0];
      if (helper && helper.d < 12) {
        const meet = interceptTarget(sim, helper.p);
        steer(sim, helper.p, meet.x, meet.y, true, dt);
        if (helper.p.actionT <= 0) helper.p.action = 'sprint';
      }
      const gk = team.players[0];
      const stop = predictBallStop(sim);
      if (gk && !gk.sentOff && inOwnBox(sim, stop.x, stop.y, key) && dist(gk.x, gk.y, stop.x, stop.y) < 24) {
        const meet = interceptTarget(sim, gk);
        steer(sim, gk, meet.x, meet.y, true, dt);
        if (gk.actionT <= 0) gk.action = 'rush';
      }
      continue;
    }
    // Rakip: topu en erken karşılayabilecek 3 oyuncu koşar.
    const ranked = team.players
      .filter(p => !p.sentOff && p.role !== 'KL')
      .map(p => ({ p, meet: interceptTarget(sim, p) }))
      .map(c => ({ ...c, t: c.meet.t }))
      .sort((a, b) => a.t - b.t);
    const chasers = ranked.slice(0, 4);
    for (const [index, { p, meet }] of chasers.entries()) {
      // En yakın iki oyuncu her koşulda topa gider; uzaktakiler ancak yetişebilecekse.
      if (index >= 2 && meet.t > 3.6) continue;
      steer(sim, p, meet.x, meet.y, true, dt);
      if (p.actionT <= 0) p.action = 'sprint';
    }
    const gk = team.players[0];
    const stop = predictBallStop(sim);
    if (gk && !gk.sentOff && inOwnBox(sim, stop.x, stop.y, key) && dist(gk.x, gk.y, stop.x, stop.y) < 22) {
      const meet = interceptTarget(sim, gk);
      steer(sim, gk, meet.x, meet.y, true, dt);
      if (gk.actionT <= 0) gk.action = 'rush';
    }
  }
}

// ---------------------------------------------------------------------------
// Karar: pas / sürüş / şut / orta / uzaklaştırma
// ---------------------------------------------------------------------------
/** Noktanın doğru parçasına uzaklığı: hızlı topun oyuncuyu ıskalamasını (tünelleme) engeller. */
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return Math.hypot(px - x1, py - y1);
  const u = clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1);
  return Math.hypot(px - (x1 + dx * u), py - (y1 + dy * u));
}

function pressureOn(sim, player) {
  const opponents = teamOf(sim, other(player.side)).players;
  let pressure = 0, closest = Infinity;
  for (const o of opponents) {
    if (o.sentOff || o.role === 'KL') continue;
    const d = dist(o.x, o.y, player.x, player.y);
    if (d < 5.5) pressure += 1 - d / 5.5;
    if (d < closest) closest = d;
  }
  return { pressure: clamp(pressure, 0, 2.4), closest };
}

function nearestOpponent(sim, player, within = 99) {
  let best = null, bestD = within;
  for (const o of teamOf(sim, other(player.side)).players) {
    if (o.sentOff || o.role === 'KL') continue;
    const d = dist(o.x, o.y, player.x, player.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

/** Pas hattının açıklığı: 1 = boş, 0 = kapalı. Hatta yakın savunmacılar hattı kapatır. */
function laneOpenness(sim, fromX, fromY, toX, toY, sideKey, lofted = false) {
  const opponents = teamOf(sim, other(sideKey)).players;
  const dx = toX - fromX, dy = toY - fromY;
  const len2 = Math.max(0.01, dx * dx + dy * dy);
  let openness = 1;
  const blockR = lofted ? 3 : 4.4;   // havadan oynanan topu yalnızca dibindeki adam kesebilir
  for (const o of opponents) {
    if (o.sentOff || o.role === 'KL') continue;
    const t = clamp(((o.x - fromX) * dx + (o.y - fromY) * dy) / len2, 0, 1);
    const d = dist(o.x, o.y, fromX + dx * t, fromY + dy * t);
    if (d < blockR) openness -= (1 - d / blockR) * 0.62;
  }
  return clamp(openness, 0, 1);
}

function passOptions(sim, carrier) {
  const team = teamOf(sim, carrier.side);
  const dir = attackDir(carrier.side);
  const options = [];
  for (const mate of team.players) {
    if (mate === carrier || mate.sentOff) continue;
    const d = dist(carrier.x, carrier.y, mate.x, mate.y);
    if (d < 4 || d > 48) continue;
    const lofted = d > 26 && mate.role !== 'KL';
    const forward = (mate.x - carrier.x) * dir;
    const lane = laneOpenness(sim, carrier.x, carrier.y, mate.x, mate.y, carrier.side, lofted);
    const matePressure = pressureOn(sim, mate).pressure;
    options.push({
      mate, d, forward, lane, matePressure, lofted,
      progress: dir > 0 ? mate.x : 100 - mate.x,
    });
  }
  return options;
}

/**
 * Futbol mantığıyla pas seçimi.
 * `intent`: 'keep' topu koru (kısa, güvenli), 'advance' topu ileri taşı,
 * 'box' ceza sahasına oyna. Amaç niyete göre ağırlıklandırılır — böylece takım
 * topu yana çevirmek yerine kaleye doğru ilerletir.
 */
function pickPass(sim, carrier, options, intent = 'keep') {
  const laneGate = intent === 'box' ? 0.28 : 0.45;
  const open = options.filter(o => o.lane > laneGate && o.matePressure < (intent === 'box' ? 2.1 : 1.6));
  const pool = open.length ? open : options.filter(o => o.lane > 0.24);
  if (!pool.length) return null;
  const scored = pool.map(o => {
    let value = o.lane * 4.2 - o.matePressure * 2.2 - o.d * 0.03;
    if (o.mate.role === 'KL') value -= 20;
    if (intent === 'keep') value += o.forward * 0.25 + o.progress * 0.04;
    else if (intent === 'advance') value += o.forward * 0.95 + o.progress * 0.16 + (o.lofted ? 0.4 : 0);
    else value += o.progress * 0.3 + (o.mate.role === 'FW' ? 1.4 : 0) + (o.mate.role === 'OS' ? 0.6 : 0);
    return { o, value };
  }).sort((a, b) => b.value - a.value);
  const { pressure } = pressureOn(sim, carrier);
  if (pressure > 1.6 && scored.length > 1 && chance(sim, 0.4)) return scored[1].o;
  return scored[0].o;
}

/** Kendi yarısında sıkışınca uzun top: forvetler topa koşar. */
function longBall(sim, carrier) {
  const dir = attackDir(carrier.side);
  const team = teamOf(sim, carrier.side);
  const targets = team.players.filter(p => !p.sentOff && (p.role === 'FW' || p.role === 'OS'));
  const target = targets.length ? targets[Math.floor(rnd(sim, targets.length))] : team.players[5];
  // Top forvetin önüne, savunma hattının arkasına atılır; forvet onu kovalar.
  const line = defensiveLineX(sim, carrier.side);
  const deepX = clamp(Math.max(target.x + dir * 12, line + dir * 8), 10, 90);
  kickBall(sim, carrier, deepX, clamp(target.y + rand(sim, -11, 11), 6, 94), SPEED.long, 12);
  sim.ball.intendedFor = target.id;
  sim.pendingPass = { from: carrier.id, fromX: carrier.x, fromY: carrier.y, to: target.id, side: carrier.side, at: sim.time, aerial: true };
  team.stats.passes++;
  emit(sim, 'longball', { side: carrier.side, playerId: carrier.id, text: `${target.name} ileri uzanıyor, uzun top!`, x: carrier.x, y: carrier.y });
}

/** Hücum eden tarafın karşısındaki savunma hattının x'i (ikinci son savunmacı). */
function defensiveLineX(sim, attackingSide) {
  const xs = teamOf(sim, other(attackingSide)).players.filter(p => !p.sentOff).map(p => p.x).sort((a, b) => a - b);
  if (xs.length < 2) return attackingSide === 'home' ? 99 : 1;
  return attackingSide === 'home' ? xs[xs.length - 2] : xs[1];
}

/**
 * Topsuz koşular ve markaj: hücum eden takımda topla en yakın iki oyuncu ileri
 * kaçar, savunma da onları adam adama takip eder. Koşu -> ara pası -> kanat -> orta
 * -> şut zinciri böylece kendiliğinden kurulur.
 */
/**
 * Hücum modu: top hücum üçte birine girdiğinde takım kalabalık hücuma geçer.
 * Kanat oyuncusu ortayı açar, forvetler ön/arka direğe koşar, bir oyuncu ceza
 * sahası yayına yerleşir. FIFA/PES'teki "hücum" anları böyle doğar.
 */
function updateAttackMode(sim) {
  const carrier = sim.carrier;
  const progress = carrier ? (carrier.side === 'home' ? carrier.x : 100 - carrier.x) : 50;
  if (!carrier || sim.restart || sim.time < sim.celebrationUntil) { sim.attackMode = null; return; }
  if (carrier.side === sim.attackMode?.side) {
    if (progress < 46) sim.attackMode = null;
    return;
  }
  if (progress > 52) sim.attackMode = { side: carrier.side, since: sim.time };
}

/** Ceza sahası koşu noktaları (ön direk / arka direk / yay). */
function boxSpots(side) {
  const dir = attackDir(side);
  const gx = targetGoalX(side);
  return [
    { x: clamp(gx - dir * 6.5, 2, 98), y: 43.5 },   // ön direk
    { x: clamp(gx - dir * 9.5, 2, 98), y: 56.5 },   // arka direk
    { x: clamp(gx - dir * 19, 2, 98), y: 50 },      // yay / geri pas noktası
  ];
}

function assignRunners(sim) {
  for (const key of ['home', 'away']) {
    for (const p of teamOf(sim, key).players) { p.runner = false; p.markingId = null; }
  }
  const carrier = sim.carrier;
  if (!carrier || sim.restart || sim.time < sim.celebrationUntil) return;
  const key = carrier.side, dir = attackDir(key);
  const team = teamOf(sim, key);
  const defence = teamOf(sim, other(key));
  const line = defensiveLineX(sim, key);

  const carrierProgress = key === 'home' ? carrier.x : 100 - carrier.x;
  const wideBall = carrier.y < 26 || carrier.y > 74;
  const attacking = sim.attackMode?.side === key || (!!sim.attackMode && carrierProgress > 62) || carrierProgress > 58 || (wideBall && carrierProgress > 48);
  const staging = !attacking && carrierProgress > 42;      // top orta sahaya geçti: koşu hazırlığı
  const runners = team.players
    .filter(p => p !== carrier && !p.sentOff && p.role !== 'KL' && (p.role === 'FW' || p.role === 'OS' || p.role === 'SB'))
    .map(p => ({ p, d: dist(p.x, p.y, carrier.x, carrier.y) }))
    .filter(c => c.d < 46)
    .sort((a, b) => a.d - b.d)
    .slice(0, attacking || staging ? 3 : 2);

  const spots = attacking ? boxSpots(key) : null;
  runners.forEach(({ p }, index) => {
    p.runner = true;
    if (attacking && spots) {
      // Kale önüne koşu: ön direk, arka direk, yay.
      p.runTo = spots[index % spots.length];
    } else if (staging) {
      // Hazırlık koşusu: savunma hattının hizasında bekler, top yaklaşınca ceza sahasına dalar.
      const lane = [43, 57, 50][index % 3];
      p.runTo = { x: clamp(Math.min(line + dir * 1.5, 76), 12, 88), y: clamp(lane + (p.anchor.y - 50) * 0.2, 20, 80) };
      if (carrierProgress > 70) p.runTo = boxSpots(key)[index % 3];
    } else {
      const laneY = clamp(p.y + (p.y < 50 ? -4 : 4) + (p.anchor.y - 50) * 0.25, 9, 91);
      const beyond = (p.x - line) * dir;
      const targetX = beyond > 3 ? p.x + dir * 3 : clamp(Math.max(p.x + dir * 9, carrier.x + dir * 13), 8, 92);
      p.runTo = { x: clamp(targetX, 6, 94), y: laneY };
    }
    const marker = defence.players
      .filter(o => !o.sentOff && o.role !== 'KL' && !o.markingId)
      .map(o => ({ o, d: dist(o.x, o.y, p.x, p.y) }))
      .filter(c => c.d < 18)
      .sort((a, b) => a.d - b.d)[0];
    if (marker) { marker.o.markingId = p.id; p.markedBy = marker.o.id; }
  });
}

/** Ara pası: savunma hattının arkasına kaçan arkadaşını topla buluşturur. */
function throughBallOption(sim, carrier) {
  const dir = attackDir(carrier.side);
  const team = teamOf(sim, carrier.side);
  const line = defensiveLineX(sim, carrier.side);
  for (const mate of team.players) {
    if (!mate.runner || !mate.runTo || mate.sentOff || mate.role === 'KL') continue;
    if ((mate.x - line) * dir > 3.5) continue;      // arkada kaldıysa ara pası ofsayt olur
    const d = dist(carrier.x, carrier.y, mate.runTo.x, mate.runTo.y);
    if (d < 9 || d > 34) continue;
    const space = teamOf(sim, other(carrier.side)).players
      .filter(o => !o.sentOff)
      .reduce((best, o) => Math.min(best, dist(o.x, o.y, mate.runTo.x, mate.runTo.y)), 99);
    if (space < 9) continue;
    return { mate, target: mate.runTo, d, space };
  }
  return null;
}

function playThroughBall(sim, carrier, option) {
  const { mate, target } = option;
  const dir = attackDir(carrier.side);
  const error = 1 + (1 - clamp((carrier.ovr - 62) / 40, 0, 1)) * 2.6;
  const speed = clamp(option.d * 1.5 + 6, 18, SPEED.pass);
  kickBall(sim, carrier, clamp(target.x + dir * 3, 2, 98), clamp(target.y + rand(sim, -error, error), 2, 98), speed, 6);
  sim.ball.intendedFor = mate.id;
  sim.pendingPass = { from: carrier.id, fromX: carrier.x, fromY: carrier.y, to: mate.id, side: carrier.side, at: sim.time, through: true };
  teamOf(sim, carrier.side).stats.passes++;
  emit(sim, 'through', { side: carrier.side, playerId: carrier.id, text: `${carrier.name} arkaya ara pası attı!`, x: carrier.x, y: carrier.y });
}

function chooseAction(sim, carrier) {
  // DEBUG-DECISION
  const D = (sim.dbg = sim.dbg ?? { dec: 0, shotRange: 0, shot: 0, pass: 0, back: 0, noOpt: 0, dump: 0, finalThird: 0, box: 0, optAhead: 0, backRestart: 0, fwdSum: 0, progSum: 0, matesAhead: 0, matessum: 0 });
  D.dec++;
  D.finalThirdTop = (D.finalThirdTop ?? 0); D.boxTop = (D.boxTop ?? 0); D.crossTry = D.crossTry ?? 0; D.wide = D.wide ?? 0; D.boxRunnerSeen = D.boxRunnerSeen ?? 0;
  { const _d = attackDir(carrier.side); const _prog = _d > 0 ? carrier.x : 100 - carrier.x; if (_prog > 66) D.finalThirdTop++; if (Math.abs(carrier.x - targetGoalX(carrier.side)) < 16.5 && Math.abs(carrier.y - 50) < 20) D.boxTop++; }
  const team = teamOf(sim, carrier.side);
  const dir = attackDir(carrier.side);
  const { pressure, closest } = pressureOn(sim, carrier);
  const goalDist = dist(carrier.x, carrier.y, targetGoalX(carrier.side), 50);
  const progress = dir > 0 ? carrier.x : 100 - carrier.x;
  const wide = carrier.y < 26 || carrier.y > 74;
  const inBox = dir > 0 ? carrier.x > 82 : carrier.x < 18;
  const finalThird = progress > 66;

  // Kariyer yönlendirmesi: maç olay motoru sonucu sahiplenir, saha onu oynar.
  // Sonuç bekleyen taraf top kaleye yakınken şut çeker; uzaktaysa kaleye sürer.
  if (sim.script && sim.script.side === carrier.side) {
    if (goalDist < 38) {
      const forced = sim.script.outcome;
      sim.script = null;
      takeShot(sim, carrier, forced);
      return;
    }
    if (progress > 42) { driveAtGoal(sim, carrier); return; }
  }

  // ── HÜCUM PLANI ──
  // Top kendi yarısından çıkarken (kuruluş) kısa pas, orta sahada ileri pas/ara pas,
  // hücum üçte birinde şut-orta-ara pası. Yana pas ancak ileri seçenek yoksa atılır;
  // böylece top kalenin dibinde amaçsızca dönmez, kaleye gider.
  const plan = sim.plan && sim.plan.side === carrier.side
    ? sim.plan
    : { side: carrier.side, steps: 0, attackSince: 0, lastProgress: progress };
  sim.plan = plan;
  if (plan.attackSince && sim.time - plan.attackSince > 5.5 && finalThird && goalDist < 34) {
    // Hücum tıkandı: baskı yoksa uzaktan denenir (devre sonu / kalabalık savunma anları).
    plan.attackSince = sim.time;
    if (pressure < 1.35) { takeShot(sim, carrier); return; }
  }
  if (progress > 58 && !plan.attackSince) plan.attackSince = sim.time;

  // 1) ŞUT: kaleye yakın her oyuncu şut çeker; mesafe arttıkça istek düşer.
  if (goalDist < 30 && Math.abs(carrier.y - 50) < 27) {
    D.shotRange++;   // DEBUG-DECISION
    const banded = goalDist < 13 ? 0.98 : goalDist < 19 ? 0.95 : goalDist < 25 ? 0.88 : 0.74;
    const shootChance = clamp((inBox ? Math.max(banded, 0.93) : banded) * team.intentions.shoot - pressure * 0.1, 0.2, 0.97);
    if (chance(sim, shootChance)) { D.shot++; takeShot(sim, carrier); return; }
  }

  // 2) Kaleye sürme: son üçte birde alan varsa kaleye gidilir.
  if (finalThird && goalDist < 40 && pressure < 1.5 && closest > 3.2) { driveAtGoal(sim, carrier); return; }
  if (progress > 48 && pressure < 1.2 && closest > 4.5) { driveAtGoal(sim, carrier); return; }

  // Top sürme kararı bir süre korunur: oyuncu topu ayağında taşır, her 0,1 sn'de karar değişmez.
  if (sim.time < (carrier.dribbleUntil ?? 0) && pressure < 1.7) { D.dump++; dribble(sim, carrier); return; }

  // 3) KANAT ORTASI: hücum üçte birinde kanattan ceza sahasına orta.
  const boxRunner = team.players.some(m => m.runner && (dir > 0 ? m.x > 76 : m.x < 24) && Math.abs(m.y - 50) < 24);
  if (boxRunner) D.boxRunnerSeen++;   // DEBUG-DECISION
  if (wide) D.wide++;                 // DEBUG-DECISION
  if (finalThird && (wide || boxRunner)) {
    D.crossTry++;                       // DEBUG-DECISION
    const chance2 = boxRunner ? (wide ? 0.85 : 0.45) : progress > 82 ? 0.5 : 0.22;
    if (chance(sim, chance2)) { cross(sim, carrier); return; }
  }

  // 4) ARA PASI: savunma hattının arkasına kaçan arkadaş varsa top önüne atılır.
  const through = throughBallOption(sim, carrier);
  if (through) {
    const wantThrough = finalThird ? 0.3 : progress > 45 ? 0.14 : 0.05;
    if (chance(sim, wantThrough)) { playThroughBall(sim, carrier, through); return; }
  }

  // 5) Cut-back: ceza sahasına giren kanat oyuncusu topu yaya çıkarır.
  if (finalThird && wide && chance(sim, 0.4)) {
    const edge = team.players
      .filter(m => m !== carrier && !m.sentOff && m.role !== 'KL' && Math.abs((dir > 0 ? m.x : 100 - m.x) - 72) < 12 && Math.abs(m.y - 50) < 22)
      .map(m => ({ m, d: dist(m.x, m.y, carrier.x, carrier.y) }))
      .filter(c => c.d > 6 && c.d < 30)
      .sort((a, b) => a.d - b.d)[0];
    if (edge) {
      kickBall(sim, carrier, edge.m.x, edge.m.y, clamp(edge.d * 1.1 + 6, 10, SPEED.pass), 1.2);
      sim.ball.intendedFor = edge.m.id;
      sim.pendingPass = { from: carrier.id, fromX: carrier.x, fromY: carrier.y, to: edge.m.id, side: carrier.side, at: sim.time };
      team.stats.passes++; team.stats.crosses += 0;
      emit(sim, 'cutback', { side: carrier.side, playerId: carrier.id, text: `${carrier.name} topu yaya çıkardı.`, x: carrier.x, y: carrier.y });
      carrier.decisionIn = 0.5;
      return;
    }
  }

  // 6) PAS: plana göre ileri oyuncu aranır; ileri seçenek yoksa yana/geriye dönülür.
  const options = passOptions(sim, carrier);
  // Niyet: kendi yarısında ve baskı altında topu koru, orta sahada ileri taşı,
  // hücum üçte birinde ceza sahasını hedefle.
  const intent = finalThird ? 'box' : (progress < 38 && pressure > 1.2) || plan.steps >= 3 ? 'keep' : 'advance';
  // İleri seçenek varsa geriye pas yasak: top kaleye doğru oynanır.
  const wanted = intent === 'box' ? -4 : intent === 'advance' ? -2 : -10;
  const filtered = options.filter(o => o.forward >= wanted);
  if (filtered.length) D.optAhead++;   // DEBUG-DECISION
  const pick = pickPass(sim, carrier, filtered.length ? filtered : options, intent);
  if (pick) {
    D.pass++; if (pick.forward <= 0) D.back++;   // DEBUG-DECISION
    if (inOpponentBox(pick.mate.x, pick.mate.y, carrier.side)) D.passToBox = (D.passToBox ?? 0) + 1;   // DEBUG-DECISION
    D.fwdSum += pick.forward; D.progSum += pick.progress - progress; D.matessum += options.filter(o => o.forward > 4).length;
    if (pick.forward <= 0 && sim.restart) D.backRestart++;   // DEBUG-DECISION
    plan.steps = pick.forward > 2 ? 1 : plan.steps + 1;
    playPass(sim, carrier, pick);
    return;
  }
  D.noOpt++;   // DEBUG-DECISION

  // 7) Kendi yarısında sıkıştıysa uzun top (forvet topa koşar), yoksa top sürülür.
  if (progress < 42 && pressure > 1.5 && chance(sim, 0.7)) { longBall(sim, carrier); return; }
  dribble(sim, carrier);
}

function driveAtGoal(sim, carrier) {
  const dir = attackDir(carrier.side);
  const gx = targetGoalX(carrier.side);
  const nearest = nearestOpponent(sim, carrier, 10);
  let targetX = gx - dir * clamp(Math.hypot(carrier.x - gx, carrier.y - 50) * 0.35, 5, 12);
  let targetY = 50 + (carrier.y - 50) * 0.35;
  if (nearest) {
    const ax = carrier.x - nearest.x, ay = carrier.y - nearest.y;
    const alen = Math.max(0.8, Math.hypot(ax, ay));
    targetX += (ax / alen) * 3;
    targetY += (ay / alen) * 5;
  }
  steer(sim, carrier, clamp(targetX, 4, 96), clamp(targetY, 6, 94), true, SIM_DT / 1000);
  carrier.action = 'sprint';
  carrier.dribbleUntil = sim.time + rand(sim, 0.4, 0.8);
}

function dribble(sim, carrier) {
  const dir = attackDir(carrier.side);
  const nearest = nearestOpponent(sim, carrier, 12);
  const nd = nearest ? dist(nearest.x, nearest.y, carrier.x, carrier.y) : 99;
  let targetX = carrier.x + dir * 9, targetY = carrier.y;
  if (nearest && nd < 7) {
    // Rakibin tersine, kaleye doğru kaç: yan/ileri yönlendirme.
    const ax = carrier.x - nearest.x, ay = carrier.y - nearest.y;
    const alen = Math.max(0.8, Math.hypot(ax, ay));
    targetX = carrier.x + dir * 7 + (ax / alen) * 4;
    targetY = carrier.y + (ay / alen) * 6;
  } else {
    targetY = carrier.y + (50 - carrier.y) * 0.05;
  }
  // Sınıra yaklaşırsa içe kır.
  if (carrier.y < 12) targetY = carrier.y + 8;
  if (carrier.y > 88) targetY = carrier.y - 8;
  steer(sim, carrier, clamp(targetX, 4, 96), clamp(targetY, 5, 95), nd > 8, SIM_DT / 1000);
  carrier.action = carrier.sprinting ? 'sprint' : 'dribble';
  carrier.dribbleUntil = sim.time + rand(sim, 0.5, 1.1);
}

function playPass(sim, carrier, option) {
  const mate = option.mate;
  const d = option.d;
  const dir = attackDir(carrier.side);
  const { pressure } = pressureOn(sim, carrier);
  // Alan pası: alıcının koşu yoluna, markajdan uzağa oynanır.
  const speedDir = Math.hypot(mate.vx, mate.vy);
  let tx = mate.x, ty = mate.y;
  if (speedDir > 1.2) {
    const leadDist = d > 18 ? 6.5 : 3.6;
    tx += (mate.vx / speedDir) * leadDist;
    ty += (mate.vy / speedDir) * leadDist;
  } else {
    tx += dir * 2.2;
  }
  const marker = nearestOpponent(sim, mate, 5);
  if (marker) {
    const away = Math.max(0.8, dist(mate.x, mate.y, marker.x, marker.y));
    tx += ((mate.x - marker.x) / away) * 2.4;
    ty += ((mate.y - marker.y) / away) * 2.4;
  }
  const error = (1 - clamp((carrier.ovr - 58) / 45, 0, 1)) * 2.2 + pressure * 0.9;
  tx += rand(sim, -error, error);
  ty += rand(sim, -error, error);
  const speed = clamp(5 + d * 0.74, 10, SPEED.pass);
  kickBall(sim, carrier, tx, ty, speed, option.lofted ? 7 : 0);
  sim.ball.intendedFor = mate.id;
  sim.pendingPass = { from: carrier.id, fromX: carrier.x, fromY: carrier.y, to: mate.id, side: carrier.side, at: sim.time, aerial: !!option.lofted };
  teamOf(sim, carrier.side).stats.passes++;
}

function cross(sim, carrier) {
  const dir = attackDir(carrier.side);
  const mates = teamOf(sim, carrier.side).players.filter(m => m.runner && !m.sentOff);
  const spot = mates.length ? mates[Math.floor(rnd(sim, mates.length))].runTo : null;
  const aim = spot ?? { x: targetGoalX(carrier.side) - dir * rand(sim, 7, 12), y: clamp(50 + rand(sim, -6, 6), 36, 64) };
  const target = { x: clamp(aim.x + rand(sim, -2, 2), 2, 98), y: clamp(aim.y + rand(sim, -2.5, 2.5), 8, 92) };
  kickBall(sim, carrier, target.x, target.y, SPEED.cross * rand(sim, 0.9, 1.1), 13);
  sim.ball.crossing = true;
  sim.ball.crossSide = carrier.side;
  sim.pendingPass = { from: carrier.id, fromX: carrier.x, fromY: carrier.y, to: null, side: carrier.side, at: sim.time, aerial: true };
  teamOf(sim, carrier.side).stats.crosses++;
  emit(sim, 'cross', { side: carrier.side, playerId: carrier.id, text: `${carrier.name} ortasını yaptı.` });
}

/** Şut yolda bir savunmacıya çarptı: blok + yön değişimi (bazen korner). */
function shotBlocked(sim, shot, defender) {
  shot.resolved = true;
  sim.ball.shot = null;
  const dir = attackDir(shot.side);
  teamOf(sim, defender.side).stats.blocks = (teamOf(sim, defender.side).stats.blocks || 0) + 1;
  emit(sim, 'block', { side: shot.side, playerId: defender.id, text: `🧱 ${defender.name} şutu blokladı!`, x: defender.x, y: defender.y });
  if (chance(sim, 0.55)) {
    // Blok topu dışarı: korner veya taç.
    const corner = chance(sim, 0.75);
    sim.ball.x = clamp(defender.x, 1, 99);
    sim.ball.y = corner ? (defender.y > 50 ? 101 : -1) : 101;
    if (!corner) sim.ball.x = clamp(defender.x + rand(sim, -6, 6), 1, 99);
    sim.ball.vx = 0; sim.ball.vy = 0; sim.ball.vz = 0; sim.ball.z = 0; sim.ball.owner = null;
    sim.ball.lastTouchId = defender.id; sim.ball.lastTouchSide = defender.side;
  } else {
    sim.ball.vx = -dir * rand(sim, 4, 10);
    sim.ball.vy = rand(sim, -10, 10);
    sim.ball.vz = rand(sim, 1, 3.5);
    sim.ball.owner = null;
    sim.ball.lastTouchId = defender.id; sim.ball.lastTouchSide = defender.side;
  }
}

/** Kafa şutu: kaleye yakın mesafeden, kaleci kurtarışı zor. */
function headerShot(sim, header) {
  const team = teamOf(sim, header.side);
  const gx = targetGoalX(header.side);
  const d = dist(header.x, header.y, gx, 50);
  const side = chance(sim, 0.5) ? -1 : 1;
  const aimY = 50 + side * rand(sim, 0.5, GOAL_HALF_WIDTH - 0.6);
  const aimZ = rand(sim, 0.4, 2.0);
  const err = 2.6;
  const targetY = aimY + rand(sim, -err, err);
  const targetZ = aimZ + rnd(sim, 1.4);
  team.stats.shots++;
  kickBall(sim, header, gx, targetY, SPEED.shot * 0.62, targetZ);
  const onTarget = Math.abs(targetY - 50) < GOAL_HALF_WIDTH + 0.4 && targetZ < GOAL_HEIGHT + 0.35;
  sim.ball.shot = {
    side: header.side, shooterId: header.id, fromX: header.x, fromY: header.y,
    onTarget, d, power: SPEED.shot * 0.62, aimY, placement: 0.45, forcedOutcome: null, resolved: false, header: true,
  };
}

function takeShot(sim, shooter, forcedOutcome = null) {
  const team = teamOf(sim, shooter.side);
  const gx = targetGoalX(shooter.side);
  const d = dist(shooter.x, shooter.y, gx, 50);
  const { pressure } = pressureOn(sim, shooter);
  // Nişan kalenin içinden seçilir; beceri ıskayı (aut/direk) belirler.
  const skill = clamp((shooter.ovr - 55) / 40, 0, 1);
  const placement = clamp(0.45 + skill * 0.35 - pressure * 0.12, 0.2, 0.92);
  const side = chance(sim, 0.5) ? -1 : 1;
  const aimOffset = side * rand(sim, 0.6, GOAL_HALF_WIDTH - 0.5);
  const aimY = 50 + aimOffset;
  const aimZ = rand(sim, 0.4, GOAL_HEIGHT - 0.35);
  const range = 1 + d / 24;
  const spreadY = (1 - placement) * 4.6 * range;
  const spreadZ = (1 - placement) * 1.6 * range;
  const targetY = aimY + rand(sim, -spreadY, spreadY);
  const targetZ = aimZ + rand(sim, 0, spreadZ);
  const power = SPEED.shot * clamp(0.82 + (shooter.ovr - 65) / 160, 0.75, 1.15);
  kickBall(sim, shooter, gx, targetY, power, targetZ);
  team.stats.shots++;
  // Kaleyi bulan şut: top, direklerin arasına ve üst direğin altına gidiyorsa isabetlidir.
  const onTarget = Math.abs(targetY - 50) < GOAL_HALF_WIDTH + 0.4 && targetZ < GOAL_HEIGHT + 0.35;
  sim.ball.shot = {
    side: shooter.side, shooterId: shooter.id, fromX: shooter.x, fromY: shooter.y,
    onTarget, d, power, aimY, aimOffset, placement, forcedOutcome, resolved: false,
  };
  emit(sim, 'shot', { side: shooter.side, playerId: shooter.id, text: `${shooter.name} şutunu çekti!`, x: shooter.x, y: shooter.y });
}

function updateKeeper(sim, dt) {
  for (const key of ['home', 'away']) {
    const gk = teamOf(sim, key).players[0];
    if (!gk || gk.sentOff) continue;
    const gx = ownGoalX(key);
    const dir = attackDir(key);
    const shot = sim.ball.shot && sim.ball.shot.side !== key && !sim.ball.shot.resolved ? sim.ball.shot : null;
    if (gk.actionT > 0) { gk.actionT -= dt; }
    if (shot && Math.abs(sim.ball.x - gx) < 34) {
      // Şut gelirken kaleci köşeye uzanır; erişimi OVR + enerji belirler.
      const travel = Math.abs(sim.ball.x - gx) / Math.max(6, Math.abs(sim.ball.vx) || 6);
      const reach = 3.4 + gk.ovr * 0.05 + gk.energy * 0.004;
      const predicted = clamp(sim.ball.y + sim.ball.vy * travel * 0.65, 50 - reach, 50 + reach);
      steer(sim, gk, gx + dir * 0.9, predicted, true, dt);
      if (gk.actionT <= 0) { gk.action = 'dive'; gk.actionT = 0.45; }
      continue;
    }
    if (sim.carrier && sim.carrier.side !== key && dist(sim.carrier.x, sim.carrier.y, gx, 50) < 15 && chance(sim, 0.35)) {
      steer(sim, gk, clamp(sim.carrier.x - dir * 1.4, 2, 98), clamp(sim.carrier.y, 42, 58), true, dt);
      if (gk.actionT <= 0) gk.action = 'rush';
      continue;
    }
    const ballNear = key === 'home' ? sim.ball.x < 34 : sim.ball.x > 66;
    const targetX = gx + dir * clamp(1.6 + (34 - Math.abs(sim.ball.x - gx)) * 0.06, 1.6, 4.2);
    const targetY = clamp(50 + (sim.ball.y - 50) * 0.32, 42, 58);
    steer(sim, gk, targetX, targetY, ballNear, dt);
    if (gk.actionT <= 0) gk.action = ballNear ? 'guard' : 'idle';
  }
}

function resolveShot(sim, shot) {
  const attacker = teamOf(sim, shot.side);
  const defenderKey = other(shot.side);
  const gk = teamOf(sim, defenderKey).players[0];
  let outcome = shot.forcedOutcome;
  if (!outcome) {
    if (!shot.onTarget) outcome = 'miss';
    else {
      // Uzak köşe / yakın mesafe kalecinin işini zorlaştırır; uzak mesafe ve güçlü şut kalecinin lehinedir.
      const placement = clamp(shot.placement ?? 0.5, 0, 1);
      const keeperSkill = clamp((gk?.ovr ?? 60) / 100, 0.35, 0.95) * (gk ? 0.86 + gk.energy / 480 : 1);
      const closeRange = 1 - clamp(shot.d / 26, 0, 1);
      const power = clamp(shot.power / 34, 0.5, 1.2);
      const saveChance = clamp(
        0.86 - placement * 0.32 - closeRange * 0.34 - (power - 0.9) * 0.4 + (keeperSkill - 0.72) * 0.8,
        0.1, 0.85,
      );
      if (chance(sim, saveChance)) outcome = 'save';
      else if (chance(sim, 0.06)) outcome = 'woodwork';
      else outcome = 'goal';
    }
  }
  attacker.stats.onTarget += outcome === 'miss' ? 0 : 1;
  sim.ball.shot = null;
  if (outcome === 'goal') {
    attacker.stats.goals++;
    sim.score[shot.side]++;
    emit(sim, 'goal', { side: shot.side, playerId: shot.shooterId, text: `GOL! ${attacker.name} — ${nameOf(attacker, shot.shooterId)}`, x: targetGoalX(shot.side), y: shot.aimY });
    sim.celebrationUntil = sim.time + 3;
    setupKickoff(sim, defenderKey, 2.6);
    return;
  }
  if (outcome === 'save') {
    sim.statsSaves = (sim.statsSaves ?? 0) + 1;
    teamOf(sim, defenderKey).stats.saves++;
    emit(sim, 'save', { side: shot.side, playerId: gk?.id ?? null, text: `🧤 ${gk ? gk.name : 'Kaleci'} şutu kurtardı!`, x: targetGoalX(shot.side) - attackDir(shot.side) * 1.5, y: clamp(sim.ball.y, 42, 58) });
    // Kurtarış topu genelde oyun alanında kalır; bazen kornere gider.
    if (chance(sim, 0.7)) {
      // Kale direği dibinden çelen kaleci topu kornere gönderir.
      sim.ball.x = shot.side === 'home' ? 100.6 : -0.6;
      sim.ball.y = clamp(sim.ball.y, 6, 94);
      sim.ball.vx = 0; sim.ball.vy = 0; sim.ball.vz = 0; sim.ball.z = 0;
    } else {
      sim.ball.vx = -attackDir(shot.side) * rand(sim, 5, 11);
      sim.ball.vy = rand(sim, -8, 8); sim.ball.vz = rand(sim, 1.5, 4); sim.ball.owner = null;
      sim.ball.lastTouchId = gk?.id ?? null; sim.ball.lastTouchSide = defenderKey;
    }
    return;
  }
  if (outcome === 'woodwork') {
    attacker.stats.woodwork++;
    emit(sim, 'woodwork', { side: shot.side, playerId: shot.shooterId, text: `😱 ${nameOf(attacker, shot.shooterId)} direği buldu!`, x: targetGoalX(shot.side) - attackDir(shot.side) * 0.6, y: shot.aimY });
    sim.ball.vx = -attackDir(shot.side) * rand(sim, 6, 12);
    sim.ball.vy = rand(sim, -10, 10); sim.ball.vz = rand(sim, 1, 3);
    sim.ball.lastTouchId = gk?.id ?? null; sim.ball.lastTouchSide = defenderKey;
    return;
  }
  emit(sim, 'chance', { side: shot.side, playerId: shot.shooterId, text: `${nameOf(attacker, shot.shooterId)} şutunda top auta gitti.`, x: targetGoalX(shot.side), y: shot.aimY });
  setupRestart(sim, 'goal-kick', defenderKey, ownGoalX(defenderKey) + attackDir(defenderKey) * SIX_DEPTH, 44 + rnd(sim, 12), 1.5);
}

const nameOf = (team, id) => team.players.find(p => p.id === id)?.name ?? 'Oyuncu';

// ---------------------------------------------------------------------------
// Kurallar: taç, korner, kale vuruşu, ofsayt, faul, penaltı, serbest vuruş
// ---------------------------------------------------------------------------
function setupRestart(sim, type, sideKey, x, y, waitSeconds, takerId = null) {
  sim.ball.owner = null; sim.carrier = null;
  sim.ball.vx = 0; sim.ball.vy = 0; sim.ball.vz = 0; sim.ball.z = 0; sim.ball.shot = null;
  sim.ball.intendedFor = null; sim.ball.crossing = false; sim.ball.lofted = false;
  if (x !== undefined) sim.ball.x = clamp(x, 0.6, 99.4);
  if (y !== undefined) sim.ball.y = clamp(y, 0.6, 99.4);
  sim.pendingPass = null;
  sim.restart = { type, side: sideKey, x: sim.ball.x, y: sim.ball.y, waitUntil: sim.time + waitSeconds, takerId };
}

function setupKickoff(sim, sideKey, waitSeconds) {
  sim.ball.x = 50; sim.ball.y = 50; sim.ball.z = 0;
  sim.ball.vx = 0; sim.ball.vy = 0; sim.ball.vz = 0; sim.ball.owner = null; sim.ball.shot = null;
  sim.carrier = null; sim.pendingPass = null;
  for (const key of ['home', 'away']) {
    for (const p of teamOf(sim, key).players) {
      p.x = p.baseAnchor.x; p.y = p.baseAnchor.y; p.vx = 0; p.vy = 0; p.action = 'idle'; p.actionT = 0;
    }
  }
  sim.restart = { type: 'kickoff', side: sideKey, x: 50, y: 50, waitUntil: sim.time + waitSeconds, takerId: null };
}

function pickTaker(sim, team, nearX, nearY, prefer = []) {
  let best = null, bestScore = -Infinity;
  for (const p of team.players) {
    if (p.sentOff || p.role === 'KL') continue;
    let score = -dist(p.x, p.y, nearX, nearY) + (prefer.includes(p.role) ? 12 : 0) + p.ovr * 0.05;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best || team.players.find(p => !p.sentOff);
}

function executeRestart(sim) {
  const r = sim.restart;
  if (!r || sim.time < r.waitUntil) return;
  const team = teamOf(sim, r.side);
  if (r.type === 'kickoff') {
    const taker = pickTaker(sim, team, 50, 50, ['OS', 'FW']);
    const mate = team.players.filter(p => p !== taker && p.role !== 'KL')
      .sort((a, b) => dist(taker.x, taker.y, a.x, a.y) - dist(taker.x, taker.y, b.x, b.y))[0];
    sim.ball.x = 50; sim.ball.y = 50;
    if (taker) kickBall(sim, taker, mate ? mate.x : 50 + attackDir(r.side) * 8, mate ? mate.y : 50, SPEED.pass * 0.7, 0);
    if (mate) sim.ball.intendedFor = mate.id;
    sim.restart = null;
    return;
  }
  if (r.type === 'throw-in') {
    const taker = pickTaker(sim, team, r.x, r.y, ['SB', 'OS']);
    const dir = attackDir(r.side);
    // Taç: en yakın arkadaşa atılır; rakip yakınsa ileriye uzun atış.
    let bestMate = null, bestD = Infinity;
    for (const mate of team.players) {
      if (mate === taker || mate.sentOff || mate.role === 'KL') continue;
      const d = dist(r.x, r.y, mate.x, mate.y);
      if (d < bestD) { bestD = d; bestMate = mate; }
    }
    const long = chance(sim, 0.45);
    if (taker) {
      const tx = long ? clamp(r.x + dir * 22, 2, 98) : bestMate?.x ?? r.x + dir * 6;
      const ty = long ? clamp(r.y + rand(sim, 16, 34) * (r.y < 50 ? 1 : -1), 6, 94) : bestMate?.y ?? r.y;
      kickBall(sim, taker, tx, ty, SPEED.throwIn, long ? 8 : 6.5);
      team.stats.passes++;
      sim.pendingPass = { from: taker.id, fromX: r.x, fromY: r.y, to: long ? null : bestMate?.id ?? null, side: r.side, at: sim.time, aerial: true };
      sim.ball.intendedFor = long ? null : bestMate?.id ?? null;
    }
    emit(sim, 'throw-in', { side: r.side, playerId: taker?.id ?? null, text: `${taker ? taker.name : team.name} taç atışı kullandı.` });
    sim.restart = null;
    return;
  }
  if (r.type === 'corner') {
    const taker = pickTaker(sim, team, r.x, r.y, ['OS', 'SB']);
    const dir = attackDir(r.side);
    const target = { x: targetGoalX(r.side) - dir * rand(sim, 4, 10), y: rand(sim, 40, 60) };
    if (taker) kickBall(sim, taker, target.x, target.y, SPEED.cross * rand(sim, 0.95, 1.1), 12.5);
    team.stats.passes++;
    team.stats.crosses = (team.stats.crosses || 0) + 1;
    sim.ball.crossing = true; sim.ball.crossSide = r.side;
    sim.pendingPass = { from: taker?.id ?? null, fromX: r.x, fromY: r.y, to: null, side: r.side, at: sim.time, aerial: true };
    emit(sim, 'corner', { side: r.side, playerId: taker?.id ?? null, text: `${team.name} korner kullanıyor.`, x: r.x, y: r.y });
    sim.restart = null;
    return;
  }
  if (r.type === 'goal-kick') {
    const gk = team.players[0];
    const dir = attackDir(r.side);
    const long = chance(sim, 0.55);
    const mates = team.players.filter(p => p.role === (long ? 'FW' : 'STP') || p.role === (long ? 'OS' : 'SB'));
    const mate = mates.length ? mates[Math.floor(rnd(sim, mates.length))] : team.players[1];
    kickBall(sim, gk, mate ? mate.x : 50 + dir * 25, mate ? mate.y : 50, long ? SPEED.long * 0.95 : SPEED.pass * 0.8, long ? 10.5 : 2.5);
    if (mate) sim.ball.intendedFor = mate.id;
    emit(sim, 'goal-kick', { side: r.side, playerId: gk?.id ?? null, text: `${gk ? gk.name : 'Kaleci'} topu oyuna soktu.` });
    sim.restart = null;
    return;
  }
  if (r.type === 'free-kick') {
    const taker = pickTaker(sim, team, r.x, r.y, ['OS', 'FW']);
    const gx = targetGoalX(r.side);
    const d = dist(r.x, r.y, gx, 50);
    const dir = attackDir(r.side);
    if (taker && d < 26 && Math.abs(r.y - 50) < 22 && chance(sim, 0.55)) {
      // Baraj kurulur, doğrudan şut denenir.
      const wall = teamOf(sim, other(r.side)).players
        .filter(p => !p.sentOff && p.role !== 'KL')
        .sort((a, b) => dist(a.x, a.y, r.x, r.y) - dist(b.x, b.y, r.x, r.y)).slice(0, 4);
      wall.forEach((w, i) => { w.x = r.x + dir * 3.4; w.y = clamp(r.y + (i - 1.5) * 1.1, 38, 62); });
      const aimY = 50 + (chance(sim, 0.5) ? -1 : 1) * rand(sim, 1.5, 4.4);
      const aimZ = rand(sim, 0.5, 2.4);
      kickBall(sim, taker, gx, aimY, SPEED.shot * 0.95, aimZ);
      team.stats.shots++;
      sim.ball.shot = { side: r.side, shooterId: taker.id, fromX: r.x, fromY: r.y, onTarget: Math.abs(aimY - 50) < GOAL_HALF_WIDTH + 0.4 && aimZ < GOAL_HEIGHT, d, power: 27, aimY, placement: 0.6, forcedOutcome: null, resolved: false };
      emit(sim, 'freekick', { side: r.side, playerId: taker.id, text: `${taker.name} serbest vuruşu kaleye gönderdi.` });
    } else {
      const mate = taker ? passOptions(sim, { ...taker, x: r.x, y: r.y, side: r.side })[0] : null;
      if (taker) kickBall(sim, taker, mate ? mate.mate.x : r.x + dir * 12, mate ? mate.mate.y : r.y, SPEED.pass, 2);
      team.stats.passes++;
      sim.pendingPass = { from: taker?.id ?? null, fromX: r.x, fromY: r.y, to: mate?.mate.id ?? null, side: r.side, at: sim.time };
      emit(sim, 'freekick', { side: r.side, playerId: taker?.id ?? null, text: `${taker ? taker.name : team.name} serbest vuruşu kullandı.` });
    }
    sim.restart = null;
    return;
  }
  if (r.type === 'penalty') {
    const taker = pickTaker(sim, team, targetGoalX(r.side), 50, ['FW', 'OS']);
    const gk = teamOf(sim, other(r.side)).players[0];
    const scored = chance(sim, clamp(0.78 - ((gk?.ovr ?? 70) - 68) * 0.006, 0.62, 0.87));
    team.stats.shots++;
    if (scored) {
      team.stats.onTarget++; team.stats.goals++; sim.score[r.side]++;
      emit(sim, 'goal', { side: r.side, playerId: taker?.id ?? null, text: `⚽ PENALTI GOLÜ! ${taker ? taker.name : team.name}`, x: targetGoalX(r.side), y: 50, penalty: true });
      sim.celebrationUntil = sim.time + 3;
      setupKickoff(sim, other(r.side), 2.4);
      return;
    }
    teamOf(sim, other(r.side)).stats.saves++;
    emit(sim, 'penalty-miss', { side: r.side, playerId: taker?.id ?? null, text: `🧤 Penaltıyı ${gk ? gk.name : 'kaleci'} kurtardı!`, x: targetGoalX(r.side), y: 50 });
    const dir = attackDir(r.side);
    sim.ball.vx = -dir * 9; sim.ball.vy = rand(sim, -12, 12); sim.ball.vz = 3;
    sim.restart = null;
    return;
  }
  sim.restart = null;
}

function isOffside(sim, receiver, pass) {
  const defenders = teamOf(sim, other(pass.side)).players.filter(p => !p.sentOff);
  if (defenders.length < 2) return false;
  const dir = attackDir(pass.side);
  const xs = defenders.map(p => p.x).sort((a, b) => a - b);
  // Ev sahibi +x'e oynar: ofsayt çizgisi en gerideki ikinci savunmacı.
  const line = dir > 0 ? xs[xs.length - 2] : xs[1];
  const beyond = dir > 0 ? receiver.x > line + 0.8 : receiver.x < line - 0.8;
  const inOppHalf = dir > 0 ? receiver.x > 50 : receiver.x < 50;
  const forwardPass = dir > 0 ? receiver.x > pass.fromX + 1.5 : receiver.x < pass.fromX - 1.5;
  return beyond && inOppHalf && forwardPass;
}

function contestBall(sim, dt) {
  const ball = sim.ball;
  if (!ball.owner) {
    // Uçan topu en yakın oyuncu kontrol eder; kaleci ceza sahasında önceliklidir.
    const candidates = [];
    for (const key of ['home', 'away']) {
      for (const p of teamOf(sim, key).players) {
        if (p.sentOff || p.action === 'dive') continue;
        const speed = Math.hypot(ball.vx, ball.vy);
        const sx = ball.prevX ?? ball.x, sy = ball.prevY ?? ball.y;
        const fast = speed > 8;
        // Hızlı topta oyuncunun topun *yoluna* olan uzaklığı ölçülür (tünelleme olmaz).
        const d = fast ? segDist(p.x, p.y, sx, sy, ball.x, ball.y) : dist(p.x, p.y, ball.x, ball.y);
        const receiver = sim.pendingPass && sim.pendingPass.to === p.id;
        const isShot = !!ball.shot && !ball.shot.resolved;
        // Şutör (veya arkadaşı) kendi şutunu anında "yakalayamaz"; top gitmesi gereken yola gider.
        if (isShot && p.side === ball.shot.side && speed > 8) continue;
        const maxZ = p.role === 'KL' ? 3.4 : sim.pendingPass?.aerial ? 3.6 : 2.6;
        if (ball.z > maxZ) continue;
        const base = ball.z < 1.2 ? 2.8 : ball.z < 2.6 ? 2.4 : 3.6;
        // Erişim: pasın hedefi geniş, kaleci en geniş; hattın dibinde olmayan oyuncu
        // hızlı pası/şutu kesemez (gerçek futbolda da kesemez).
        let reach;
        if (p.role === 'KL') reach = isShot ? 2.9 : inOwnBox(sim, ball.x, ball.y, p.side) ? 4.6 : 3.2;
        else if (isShot) reach = 1.35;
        else if (receiver) reach = base + 1.5;
        else if (fast) reach = clamp(0.55 - speed / 26, 0.22, 0.55);
        else reach = base;
        if (d < reach) {
          // Hızlı topu hattın dibindeki herkes kesemez: savunmacı ya topun
          // yolunu okur ve keser ya da arkasından bakar. Bu yüzden temas anında
          // tek bir "okuma" zarı atılır — pas trafiği gerçekçi kalır.
          if (fast && !receiver && p.role !== 'KL' && !chance(sim, 0.3 + (p.ovr - 70) * 0.006)) continue;
          candidates.push({ p, d, receiver: !!receiver });
        }
      }
    }
    candidates.sort((a, b) => (a.receiver === b.receiver ? a.d - b.d : a.receiver ? -1 : 1));
    for (const { p, receiver, d } of candidates.slice(0, 3)) {
      const distancePenalty = clamp((d - 1) * 0.16, 0, 0.5);
      const control = clamp(0.72 + (p.ovr - 62) / 90 - (ball.z > 1.5 ? 0.3 : 0) - distancePenalty + (receiver ? 0.3 : 0) - (sim.pendingPass && !receiver ? 0.4 : 0), 0.1, 0.97);
      if (!chance(sim, control * (dt * 10))) continue;
      // Şut yolda birine çarptı: kaleci kurtarır, savunmacı bloklar.
      if (ball.shot && !ball.shot.resolved && p.side !== ball.shot.side) {
        if (p.role === 'KL') {
          ball.shot.forcedOutcome = 'save';
          ball.shot.resolved = true;
          resolveShot(sim, ball.shot);
        } else {
          shotBlocked(sim, ball.shot, p);
        }
        return;
      }
      if (sim.pendingPass && sim.pendingPass.side === p.side && sim.pendingPass.to === p.id && isOffside(sim, p, sim.pendingPass)) {
        teamOf(sim, p.side).stats.offsides++;
        emit(sim, 'offside', { side: p.side, playerId: p.id, text: `🚫 ${p.name} ofsayt!`, x: p.x, y: p.y });
        setupRestart(sim, 'free-kick', other(p.side), p.x, p.y, 1.1, pickTaker(sim, teamOf(sim, other(p.side)), p.x, p.y)?.id ?? null);
        return;
      }
      // Hücum oyuncusunun kafası: ceza sahasındaki orta kafa şutuna dönüşür.
      if (sim.pendingPass?.aerial && sim.pendingPass.side === p.side && p.role !== 'KL'
        && inOpponentBox(ball.x, ball.y, p.side) && ball.z > 1.2) {
        sim.pendingPass = null;
        teamOf(sim, p.side).stats.shots += 0;
        emit(sim, 'header', { side: p.side, playerId: p.id, text: `💥 ${p.name} kafayı vurdu!`, x: p.x, y: p.y });
        headerShot(sim, p);
        return;
      }
      if (sim.pendingPass && sim.pendingPass.aerial && sim.pendingPass.side !== p.side) {
        teamOf(sim, p.side).stats.clearances++;
        emit(sim, 'heading', { side: p.side, playerId: p.id, text: `💪 ${p.name} kafayla uzaklaştırdı.`, x: p.x, y: p.y });
        // Baskı altındaki savunmacı topu çoğu zaman kornere/kendi yarı alanına gönderir.
        if (inOwnBox(sim, p.x, p.y, p.side) && chance(sim, 0.7)) {
          sim.ball.x = p.side === 'home' ? -0.6 : 100.6;
          sim.ball.y = clamp(p.y, 6, 94);
          sim.ball.vx = 0; sim.ball.vy = 0; sim.ball.vz = 0; sim.ball.z = 0;
          sim.ball.owner = null;
          sim.ball.lastTouchId = p.id; sim.ball.lastTouchSide = p.side;
          return;
        }
        kickBall(sim, p, 50 + attackDir(p.side) * rand(sim, 10, 30), clamp(p.y + rand(sim, -20, 20), 6, 94), SPEED.long * 0.8, 8);
        return;
      }
      if (sim.pendingPass && sim.pendingPass.side !== p.side) {
        teamOf(sim, p.side).stats.interceptions++;
        emit(sim, 'interception', { side: p.side, playerId: p.id, text: `🛡️ ${p.name} pası kesti.`, x: p.x, y: p.y });
      } else if (sim.pendingPass && sim.pendingPass.side === p.side) {
        // Arkadaşlarından biri kontrol ettiyse pas isabetli sayılır.
        teamOf(sim, p.side).stats.passesCompleted++;
        if (sim.pendingPass.to === p.id) emit(sim, 'receive', { side: p.side, playerId: p.id, x: p.x, y: p.y });
      }
      sim.pendingPass = null;
      ball.owner = p; sim.carrier = p; ball.shot = null;
      sim.shieldUntil = sim.time + 0.15;
      p.decisionIn = 0.22 + rnd(sim, 0.3);
      if (p.actionT <= 0) { p.action = 'control'; p.actionT = 0.15; }
      return;
    }
    return;
  }
  // Top bir oyuncudaysa rakipler ikili mücadeleye girer; her oyuncunun bir "dalma"
  // hakkı vardır ve kazanan taraf kısa süre korunur (üst üste mücadele fırtınası olmaz).
  const carrier = ball.owner;
  if (sim.restart || sim.time < (sim.shieldUntil ?? 0)) return;
  if (sim.time < (sim.nextDuelAt ?? 0)) return;      // mücadeleler seyrek ve anlamlıdır
  for (const d of teamOf(sim, other(carrier.side)).players) {
    if (d.sentOff || d.role === 'KL') continue;
    if ((d.tackleCooldown ?? 0) > 0) continue;
    if (dist(d.x, d.y, carrier.x, carrier.y) > 3.2) continue;
    d.tackleCooldown = rand(sim, 2.5, 5);
    sim.nextDuelAt = sim.time + rand(sim, 3.5, 7);
    const attack = d.ovr * (0.72 + d.energy / 340) * rand(sim, 0.82, 1.12);
    const hold = carrier.ovr * (0.86 + carrier.energy / 300) * (carrier.sprinting ? 0.9 : 1) * rand(sim, 0.95, 1.1);
    const winsBall = attack > hold;
    // Topu kazanamayan müdahale ya temiz kalır ya da faul olur.
    if (!winsBall && !chance(sim, 0.66)) continue;
    if (chance(sim, clamp(winsBall ? 0.3 - (d.ovr - 70) * 0.004 : 0.5, 0.15, 0.6))) {
      teamOf(sim, d.side).stats.fouls++;
      emit(sim, 'foul', { side: d.side, playerId: d.id, text: `${d.name} faul yaptı.`, x: carrier.x, y: carrier.y });
      const card = nextRandom(sim);
      if (card < 0.16) {
        d.yellow++;
        if (d.yellow >= 2) {
          d.sentOff = true;
          emit(sim, 'red', { side: d.side, playerId: d.id, text: `${d.name} ikinci sarıdan kırmızı kart!`, x: carrier.x, y: carrier.y });
        } else {
          emit(sim, 'yellow', { side: d.side, playerId: d.id, text: `${d.name} sarı kart gördü.`, x: carrier.x, y: carrier.y });
        }
      }
      const penaltySpot = inOpponentBox(carrier.x, carrier.y, d.side);
      if (penaltySpot) {
        emit(sim, 'penalty', { side: carrier.side, playerId: carrier.id, text: `⚽ Penaltı! ${carrier.name} yerde kaldı.`, x: carrier.x, y: carrier.y });
        setupRestart(sim, 'penalty', carrier.side, targetGoalX(carrier.side) - attackDir(carrier.side) * 10.5, 50, 2.4, carrier.id);
      } else {
        setupRestart(sim, 'free-kick', carrier.side, carrier.x, carrier.y, 1.2, carrier.id);
      }
      return;
    }
    teamOf(sim, d.side).stats.tackles++;
    emit(sim, 'tackle', { side: d.side, playerId: d.id, text: `${d.name} topu kazandı.`, x: carrier.x, y: carrier.y });
    ball.owner = d; sim.carrier = d; ball.shot = null; sim.pendingPass = null; sim.shieldUntil = sim.time + 0.35;
    d.decisionIn = 0.25 + rnd(sim, 0.3);
    if (d.actionT <= 0) { d.action = 'tackle'; d.actionT = 0.3; }
    return;
  }
}

function checkOutOfPlay(sim) {
  const ball = sim.ball;
  if (ball.owner || sim.restart) return;
  // Top oyun alanından çıktıysa uçan şut da sonuçlanır (aksi hâlde istatistik tutmuyordu).
  if (ball.shot && !ball.shot.resolved) {
    ball.shot.resolved = true;
    resolveShot(sim, ball.shot);
    if (sim.restart) return;
  }
  if (ball.y < 0 || ball.y > 100) {
    const taker = other(ball.lastTouchSide);
    teamOf(sim, taker).stats.throwIns++;
    setupRestart(sim, 'throw-in', taker, clamp(ball.x, 2, 98), ball.y < 0 ? 0.6 : 99.4, 1.4);
    emit(sim, 'out', { side: taker, text: 'Top taça çıktı.', x: ball.x, y: ball.y < 0 ? 0 : 100 });
    return;
  }
  if (ball.x < 0 || ball.x > 100) {
    const attacking = ball.x > 100 ? 'home' : 'away';      // hangi takımın hücum ettiği kale
    const defending = other(attacking);
    const attackerTouchedLast = ball.lastTouchSide === attacking;
    if (attackerTouchedLast) {
      // Hücum eden takım auta attı: kale vuruşu.
      emit(sim, 'out', { side: defending, text: 'Top auta gitti, kale vuruşu.', x: ball.x > 100 ? 100 : 0, y: ball.y });
      setupRestart(sim, 'goal-kick', defending, ownGoalX(defending) + attackDir(defending) * SIX_DEPTH, clamp(44 + rnd(sim, 12), 40, 60), 1.5);
    } else {
      // Savunma son dokundu: korner.
      teamOf(sim, attacking).stats.corners++;
      emit(sim, 'out', { side: attacking, text: 'Savunmadan çıktı, korner.', x: ball.x > 100 ? 100 : 0, y: ball.y });
      setupRestart(sim, 'corner', attacking, ball.x > 100 ? 99.4 : 0.6, ball.y <= 50 ? 0.6 : 99.4, 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Ana döngü
// ---------------------------------------------------------------------------
function substep(sim, dt) {
  sim.time += dt;
  if (sim.script && sim.time > sim.script.until) sim.script = null;
  if (sim.celebrationUntil > sim.time) { updatePositions(sim, dt); updateKeeper(sim, dt); return; }
  executeRestart(sim);
  if (sim.restart) {
    updatePositions(sim, dt); updateKeeper(sim, dt); updateBall(sim, dt);
    return;
  }
  const carrier = sim.ball.owner && !sim.ball.owner.sentOff ? sim.ball.owner : null;
  sim.carrier = carrier;
  sim.ball.lofted = sim.ball.z > 1.2;
  if (carrier) {
    sim.possessionMs[carrier.side] += dt * 1000;
    carrier.decisionIn -= dt;
    if (carrier.decisionIn <= 0) {
      carrier.decisionIn = 0.22 + rnd(sim, 0.35);
      chooseAction(sim, carrier);
    } else if (sim.ball.owner === carrier) {
      if (carrier.actionT <= 0) {
        // Karar beklerken topu ayağında tutar, baskı yoksa birkaç adım ilerler.
        const { pressure } = pressureOn(sim, carrier);
        const target = pressure > 0.8
          ? { x: carrier.x, y: carrier.y }
          : { x: clamp(carrier.x + attackDir(carrier.side) * 5, 4, 96), y: clamp(carrier.y + (50 - carrier.y) * 0.12, 5, 95) };
        steer(sim, carrier, target.x, target.y, pressure > 1.2, dt);
        carrier.action = pressure > 1.2 ? 'sprint' : carrier.moving ? 'dribble' : 'idle';
      }
    }
  }
  if (sim.ball.shot && !sim.ball.shot.resolved) {
    const shot = sim.ball.shot;
    const reached = shot.side === 'home' ? sim.ball.x > 98.4 : sim.ball.x < 1.6;
    if (reached) { shot.resolved = true; resolveShot(sim, shot); }
  }
  updateAttackMode(sim);
  for (const key of ['home', 'away']) for (const p of teamOf(sim, key).players) {
    if (p.actionT > 0) p.actionT = Math.max(0, p.actionT - dt);
    if (p.tackleCooldown > 0) p.tackleCooldown = Math.max(0, p.tackleCooldown - dt);
  }
  // Sıra önemli: takım şekli hedef belirler, baskı ve boş top koşusu bunu geçersiz kılar,
  // sonra herkes hızıyla ilerler. Böylece top kimin ayağındaysa oyun ona göre akar.
  assignRunners(sim);
  updatePositions(sim, dt);
  applyPressing(sim, dt);
  chaseLooseBall(sim, dt);
  updateKeeper(sim, dt);
  integratePlayers(sim, dt);
  contestBall(sim, dt);
  updateBall(sim, dt);
  if (sim.ball.shot && !sim.ball.shot.resolved) sim.ball.shot.power = Math.hypot(sim.ball.vx, sim.ball.vy);
  checkOutOfPlay(sim);
}

/** Motora `dtMs` kadar ilerletir (sabit alt adımlarla: kare hızından bağımsız). */
export function stepSim(sim, dtMs) {
  sim.accumulator += Math.max(0, dtMs);
  let guard = 0;
  while (sim.accumulator >= SIM_DT && guard++ < 600) {
    sim.accumulator -= SIM_DT;
    substep(sim, SIM_DT / 1000);
  }
  return sim;
}

/** Skor + top hakimiyeti + istatistikler (sunucu ve kariyer aynı biçimi kullanır). */
export function simStats(sim) {
  const total = sim.possessionMs.home + sim.possessionMs.away;
  const home = total ? Math.round((sim.possessionMs.home / total) * 100) : 50;
  return { possessionHome: clamp(home, 25, 75), home: { ...sim.home.stats }, away: { ...sim.away.stats } };
}

/** Görsel katmanın çizdiği tek kare (2D ve 3D aynı veriyi kullanır). */
export function simSnapshot(sim) {
  const stats = simStats(sim);
  return {
    time: round2(sim.time),
    score: { ...sim.score },
    possession: stats.possessionHome,
    ball: {
      x: round2(sim.ball.x), y: round2(sim.ball.y), z: round2(sim.ball.z),
      vx: round2(sim.ball.vx), vy: round2(sim.ball.vy), vz: round2(sim.ball.vz),
      spin: round2(sim.ball.spin), owner: sim.ball.owner?.id ?? null,
      shot: sim.ball.shot ? { side: sim.ball.shot.side, shooterId: sim.ball.shot.shooterId } : null,
      crossing: sim.ball.crossing,
    },
    restart: sim.restart ? { type: sim.restart.type, side: sim.restart.side, x: round2(sim.restart.x), y: round2(sim.restart.y) } : null,
    celebrating: sim.celebrationUntil > sim.time,
    carrierId: sim.carrier?.id ?? null,
    players: [...sim.home.players, ...sim.away.players].map(p => ({
      id: p.id, side: p.side, number: p.number, role: p.role, name: p.name, ovr: p.ovr,
      x: round2(p.x), y: round2(p.y), vx: round2(p.vx), vy: round2(p.vy),
      action: p.action, facing: round2(p.facing), energy: Math.round(p.energy),
      yellow: p.yellow, sentOff: p.sentOff,
    })),
    stats: { home: stats.home, away: stats.away },
  };
}

// ---------------------------------------------------------------------------
// Dışarıdan müdahale: taktik, oyuncu değişikliği, kariyer yönlendirmesi
// ---------------------------------------------------------------------------
export function setTeamTactics(sim, key, { style, formation } = {}) {
  const team = teamOf(sim, key);
  if (style && STYLE[style]) {
    team.style = style;
    team.intentions = { shoot: STYLE[style].shoot, press: STYLE[style].press, passRate: STYLE[style].passRate };
  }
  if (formation && FORMATIONS[formation]) {
    team.formation = formation;
    const anchors = FORMATIONS[formation];
    team.players.forEach((p, i) => {
      const [ax, ay] = anchors[i] || anchors[anchors.length - 1];
      p.baseAnchor = { x: key === 'home' ? ax : 100 - ax, y: key === 'home' ? ay : 100 - ay };
      p.anchor = { ...p.baseAnchor };
    });
  }
}

/** Oyuncu değişikliği: giren oyuncu çıkanın sahasındaki yerini ve rolünü alır. */
export function substitutePlayer(sim, key, outId, incoming) {
  const team = teamOf(sim, key);
  const index = team.players.findIndex(p => p.id === outId);
  if (index < 0 || !incoming) return false;
  const previous = team.players[index];
  const next = {
    ...previous, id: incoming.id, name: incoming.name, role: incoming.role,
    ovr: clamp(incoming.ovr ?? previous.ovr, 20, 99), energy: clamp(incoming.energy ?? 90, 1, 100),
    yellow: 0, sentOff: false, action: 'idle', actionT: 0, decisionIn: 0, touches: 0,
  };
  team.players[index] = next;
  if (sim.ball.owner === previous) sim.ball.owner = next;
  if (sim.carrier === previous) sim.carrier = next;
  return true;
}

export function markSentOff(sim, key, playerId) {
  const p = teamOf(sim, key).players.find(x => x.id === playerId);
  if (p) p.sentOff = true;
}

/**
 * Kariyer (offline) motoru için: sıradaki hücumun sonucunu dışarıdan belirler.
 * `outcome`: 'goal' | 'save' | 'miss' | 'woodwork'. Böylece offline olay motoru skoru
 * belirlerken sahadaki futbol yine gerçek oynanır.
 */
export function scriptOutcome(sim, key, outcome, seconds = 22) {
  sim.script = { side: key, outcome, until: sim.time + seconds };
}

/** Topu şu an oynayan taraf (görsel katman ve kariyer eşlemesi için). */
export const simPossessionSide = sim => sim.carrier?.side ?? sim.ball.lastTouchSide;
export { SPEED as SIM_SPEEDS, GOAL_HALF_WIDTH, BOX_DEPTH, BOX_HALF_WIDTH };
