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

let slotRet = 0, wheelRet = 0, rouletteRet = 0;
for (let i = 0; i < N; i++) {
  slotRet += spinSlots() * BET;
  wheelRet += pick(WHEEL_POOL).mult * BET;
  const n = Math.floor(Math.random() * 37);
  if (n !== 0 && RED.has(n)) rouletteRet += 2 * BET; // kırmızı bahsi
}

console.log(`Slot  RTP: %${((slotRet / (N * BET)) * 100).toFixed(1)}  (hedef ≈%89.5)`);
console.log(`Çark  RTP: %${((wheelRet / (N * BET)) * 100).toFixed(1)}  (hedef ≈%97.5)`);
console.log(`Rulet RTP: %${((rouletteRet / (N * BET)) * 100).toFixed(1)}  (hedef ≈%97.3)`);
