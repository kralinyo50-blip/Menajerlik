/**
 * 🎰 Kumarhane oyunlarının oyuncuya dönüş (RTP) denetimi.
 * CasinoTab'taki formüllerin birebir kopyası ile Monte-Carlo yapar.
 *   npm run sim:casino
 * Beklenen: slot ≈%89.5, rulet ≈%97.3, çark ≈%97.5 (blackjack stratejiye göre %95-99)
 */
const BET = 1000;
const N = 2_000_000;

/* ── SLOT ── */
const SLOT_SYMBOLS = [
  { s: '🍒', w: 26 }, { s: '🍋', w: 22 }, { s: '🍀', w: 18 }, { s: '🔔', w: 14 },
  { s: '⚽', w: 10 }, { s: '👑', w: 6 }, { s: '💎', w: 3 }, { s: '7️⃣', w: 1 },
];
const SLOT_POOL = SLOT_SYMBOLS.flatMap(x => Array(x.w).fill(x.s));
const SLOT_PAYOUT = { '7️⃣': 250, '💎': 110, '👑': 60, '⚽': 35, '🔔': 22, '🍀': 15, '🍋': 10, '🍒': 8 };
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function spinSlots() {
  const reels = [pick(SLOT_POOL), pick(SLOT_POOL), pick(SLOT_POOL)];
  if (reels[0] === reels[1] && reels[1] === reels[2]) return SLOT_PAYOUT[reels[0]] ?? 2;
  for (const sym of SLOT_SYMBOLS) {
    if (reels.filter(r => r === sym.s).length === 2) {
      return sym.s === '7️⃣' ? 6 : sym.s === '💎' ? 3 : 1;
    }
  }
  if (reels.filter(r => r === '7️⃣').length === 1) return 0.3;
  return 0;
}

/* ── ÇARK ── */
const WHEEL = [
  { mult: 0, w: 30 }, { mult: 0.5, w: 20 }, { mult: 1, w: 22 }, { mult: 1.5, w: 12 },
  { mult: 2, w: 9 }, { mult: 3, w: 4.5 }, { mult: 5, w: 1.8 }, { mult: 10, w: 0.7 },
];
const WHEEL_POOL = WHEEL.flatMap(x => Array(Math.round(x.w * 10)).fill(x));

/* ── RULET (Avrupa) ── */
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/* ── CRASH: patlama dağılımı P(>= t) = 0.97/t; sim stratejisi: 2×'te otomatik çekil ── */
const rollCrash = () => Math.max(1, Math.floor((0.97 / (1 - Math.random())) * 100) / 100);
const crashSim = () => {
  const target = 2;
  return rollCrash() >= target ? target : 0;
};
// Ayrıca 1.5× ve 5× stratejileri de kontrol edilsin (her stratejide RTP aynı kalmalı)
const crashSim15 = () => (rollCrash() >= 1.5 ? 1.5 : 0);
const crashSim5 = () => (rollCrash() >= 5 ? 5 : 0);

/* ── MINES: 25 kutu / 3 mayın; strateji: 5 elma topla, sonra çek ── */
const MN_TILES = 25, MN_MINES = 3;
const minesMult = k => {
  let m = 0.97;
  for (let i = 0; i < k; i++) m *= (MN_TILES - i) / (MN_TILES - MN_MINES - i);
  return Math.floor(m * 100) / 100;
};
const minesSim = () => {
  let rem = MN_TILES;
  for (let i = 0; i < 5; i++) {
    if (Math.random() < MN_MINES / rem) return 0;
    rem--;
  }
  return minesMult(5);
};
// 10 elma stratejisi
const minesSim10 = () => {
  let rem = MN_TILES;
  for (let i = 0; i < 10; i++) {
    if (Math.random() < MN_MINES / rem) return 0;
    rem--;
  }
  return minesMult(10);
};

/* ── PLINKO: 12 sıra, 13 kova ── */
const PLINKO_PAYOUTS = [23, 7, 2.1, 1.45, 1.1, 0.82, 0.5, 0.82, 1.1, 1.45, 2.1, 7, 23];
const plinkoSim = () => {
  let r = 0;
  for (let i = 0; i < 12; i++) if (Math.random() < 0.5) r++;
  return PLINKO_PAYOUTS[r];
};

let slotRet = 0, wheelRet = 0, rouletteRet = 0, crashRet = 0, crash15 = 0, crash5 = 0, minesRet = 0, mines10 = 0, plinkoRet = 0;
for (let i = 0; i < N; i++) {
  slotRet += spinSlots() * BET;
  wheelRet += pick(WHEEL_POOL).mult * BET;
  const n = Math.floor(Math.random() * 37);
  if (n !== 0 && RED.has(n)) rouletteRet += 2 * BET; // kırmızı bahsi
  crashRet += crashSim() * BET;
  crash15 += crashSim15() * BET;
  crash5 += crashSim5() * BET;
  minesRet += minesSim() * BET;
  mines10 += minesSim10() * BET;
  plinkoRet += plinkoSim() * BET;
}

console.log(`Slot  RTP: %${((slotRet / (N * BET)) * 100).toFixed(1)}  (hedef ≈%89.5)`);
console.log(`Çark  RTP: %${((wheelRet / (N * BET)) * 100).toFixed(1)}  (hedef ≈%97.5)`);
console.log(`Rulet RTP: %${((rouletteRet / (N * BET)) * 100).toFixed(1)}  (hedef ≈%97.3)`);
console.log(`Crash RTP (2× / 1.5× / 5× strateji): %${((crashRet / (N * BET)) * 100).toFixed(1)} / %${((crash15 / (N * BET)) * 100).toFixed(1)} / %${((crash5 / (N * BET)) * 100).toFixed(1)}  (hedef ≈%97)`);
console.log(`Mines RTP (5 / 10 elma): %${((minesRet / (N * BET)) * 100).toFixed(1)} / %${((mines10 / (N * BET)) * 100).toFixed(1)}  (hedef ≈%97)`);
console.log(`Plinko RTP: %${((plinkoRet / (N * BET)) * 100).toFixed(1)}  (hedef ≈%97.1)`);
