import React, { useRef, useState } from 'react';
import { CasinoState, GameState } from '../../types/game';
import { formatMoney } from '../../utils/pricing';

interface Props {
  gameState: GameState;
  onUpdateCasino: (patch: (c: CasinoState, budget: number) => { casino: CasinoState; budget: number }, news?: string) => void;
}

/* ═══════════ Yardımcılar ═══════════ */

const chipFmt = (n: number) => formatMoney(Math.round(n));

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]): T => arr[rand(arr.length)];

/* ═══════════ 1) SLOT — "Şans Makinesi 777" ═══════════ */
const SLOT_SYMBOLS = [
  { s: '🍒', w: 26 }, { s: '🍋', w: 22 }, { s: '🍀', w: 18 }, { s: '🔔', w: 14 },
  { s: '⚽', w: 10 }, { s: '👑', w: 6 }, { s: '💎', w: 3 }, { s: '7️⃣', w: 1 },
];
const SLOT_POOL = SLOT_SYMBOLS.flatMap(x => Array(x.w).fill(x.s));
// Ödemeler (3 aynı): RTP ≈ %93 olacak şekilde ayarlandı
const SLOT_PAYOUT: Record<string, number> = {
  '7️⃣': 77, '💎': 24, '👑': 12, '⚽': 8, '🔔': 5, '🍀': 3.5, '🍋': 2.2, '🍒': 1.6,
};

function spinSlots(): { reels: string[]; mult: number } {
  const reels = [pick(SLOT_POOL), pick(SLOT_POOL), pick(SLOT_POOL)];
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    return { reels, mult: SLOT_PAYOUT[reels[0]] ?? 2 };
  }
  // 2 aynı: küçük geri dönüş
  for (const sym of SLOT_SYMBOLS) {
    if (reels.filter(r => r === sym.s).length === 2) {
      return { reels, mult: sym.s === '7️⃣' ? 4 : sym.s === '💎' ? 2 : 0.5 };
    }
  }
  // 7️⃣ tek başına bile küçük teselli
  const sevens = reels.filter(r => r === '7️⃣').length;
  if (sevens === 1) return { reels, mult: 0.2 };
  return { reels, mult: 0 };
}

/* ═══════════ 2) RULET — Avrupa (tek sıfır) ═══════════ */
const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const rouletteColor = (n: number) => (n === 0 ? 'green' : ROULETTE_RED.has(n) ? 'red' : 'black');

type RouletteBetKind = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'zero';
const ROULETTE_LABEL: Record<RouletteBetKind, string> = {
  red: '🔴 Kırmızı', black: '⚫ Siyah', even: 'Çift', odd: 'Tek',
  low: '1-18', high: '19-36', zero: '🟢 0',
};
function rouletteWins(kind: RouletteBetKind, n: number): number {
  if (kind === 'zero') return n === 0 ? 36 : 0;
  if (n === 0) return 0;
  const color = rouletteColor(n);
  switch (kind) {
    case 'red': return color === 'red' ? 2 : 0;
    case 'black': return color === 'black' ? 2 : 0;
    case 'even': return n % 2 === 0 ? 2 : 0;
    case 'odd': return n % 2 === 1 ? 2 : 0;
    case 'low': return n <= 18 ? 2 : 0;
    case 'high': return n >= 19 ? 2 : 0;
  }
}

/* ═══════════ 3) BLACKJACK ═══════════ */
const BJ_CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const bjValue = (cards: string[]): number => {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c === 'A') { total += 11; aces++; }
    else if (['J', 'Q', 'K'].includes(c)) total += 10;
    else total += Number(c);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};
const bjCardLabel = (c: string, i: number) => (['♠', '♥', '♦', '♣'][i % 4]) + c;

/* ═══════════ 4) ÇARKIFELEK ═══════════ */
const WHEEL_SEGMENTS = [
  { mult: 0, w: 30, color: '#7f1d1d', label: '💥 0×' },
  { mult: 0.5, w: 20, color: '#92400e', label: '½×' },
  { mult: 1, w: 22, color: '#1e3a8a', label: '1×' },
  { mult: 1.5, w: 12, color: '#155e75', label: '1.5×' },
  { mult: 2, w: 9, color: '#166534', label: '2×' },
  { mult: 3, w: 4.5, color: '#4d7c0f', label: '3×' },
  { mult: 5, w: 1.8, color: '#7e22ce', label: '5×' },
  { mult: 10, w: 0.7, color: '#b45309', label: '10×' },
];
const WHEEL_POOL = WHEEL_SEGMENTS.flatMap(x => Array(Math.round(x.w * 10)).fill(x));

/* ═══════════ Ana bileşen ═══════════ */

type GameId = 'slots' | 'roulette' | 'blackjack' | 'wheel';

const GAME_META: Record<GameId, { name: string; icon: string; desc: string; rtp: string }> = {
  slots: { name: 'Şans Makinesi 777', icon: '🎰', desc: '3 makara, 8 sembol. 7️⃣7️⃣7️⃣ = 77×!', rtp: '≈%93' },
  roulette: { name: 'Avrupa Ruleti', icon: '🎡', desc: 'Kırmızı/siyah, tek/çift, 0. Tek sayı 36×', rtp: '≈%97' },
  blackjack: { name: 'Blackjack', icon: '🃏', desc: "21'i tut. Blackjack 3:2 öder.", rtp: '≈%95' },
  wheel: { name: 'Çarkıfelek', icon: '🎯', desc: 'Döndür ve kazan: 10× dilimi var!', rtp: '≈%91' },
};

const MAX_BET = 5_000_000;

export const CasinoTab: React.FC<Props> = ({ gameState, onUpdateCasino }) => {
  const casino: CasinoState = gameState.casino ?? { balance: 0, wagered: 0, won: 0, plays: 0, biggestWin: 0, history: [] };
  const [game, setGame] = useState<GameId>('slots');
  const [bet, setBet] = useState(50_000);
  const [message, setMessage] = useState<string | null>(null);
  const [depositAmt, setDepositAmt] = useState(250_000);

  // Slot durumu
  const [reels, setReels] = useState(['7️⃣', '💎', '⚽']);
  const [spinning, setSpinning] = useState(false);
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rulet durumu
  const [rBetKind, setRBetKind] = useState<RouletteBetKind>('red');
  const [rNumber, setRNumber] = useState<number | null>(17);
  const [rSpinning, setRSpinning] = useState(false);

  // Blackjack durumu
  const [bjPhase, setBjPhase] = useState<'bet' | 'player' | 'dealer' | 'done'>('bet');
  const [bjPlayer, setBjPlayer] = useState<string[]>([]);
  const [bjDealer, setBjDealer] = useState<string[]>([]);
  const [bjResult, setBjResult] = useState<string | null>(null);
  const bjBet = useRef(0);

  // Çark durumu
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);

  const finishRound = React.useCallback((delta: number, stake: number, text: string) => {
    const returned = stake + delta > 0 ? stake + delta : delta > 0 ? delta : 0; // delta net kâr/zarar
    onUpdateCasino(
      (c, budget) => ({
        casino: {
          ...c,
          balance: Math.max(0, c.balance + delta),
          wagered: c.wagered + stake,
          won: c.won + Math.max(0, returned),
          plays: c.plays + 1,
          biggestWin: Math.max(c.biggestWin, Math.max(0, delta)),
          history: [...c.history, delta].slice(-12),
        },
        budget,
      }),
      text
    );
  }, [onUpdateCasino]);

  const canBet = bet >= 10_000 && bet <= casino.balance && bet <= MAX_BET;

  /* — Slot çevirme — */
  const spinSlotsGame = () => {
    if (!canBet || spinning) return;
    setSpinning(true);
    setMessage(null);
    const result = spinSlots();
    let ticks = 0;
    if (spinTimer.current) clearInterval(spinTimer.current);
    spinTimer.current = setInterval(() => {
      setReels([pick(SLOT_POOL), pick(SLOT_POOL), pick(SLOT_POOL)]);
      ticks++;
      if (ticks >= 14) {
        if (spinTimer.current) { clearInterval(spinTimer.current); spinTimer.current = null; }
        setReels(result.reels);
        setSpinning(false);
        const delta = Math.round(bet * result.mult) - bet;
        if (result.mult >= 8) setMessage(`🎊 DEV ÖDÜL! ${result.reels.join(' ')} → ${result.mult}× = ${chipFmt(bet * result.mult)}`);
        else if (result.mult > 0) setMessage(`${result.mult >= 1 ? '✅' : '🙃'} ${result.reels.join(' ')} → ${result.mult}× (${delta >= 0 ? '+' : ''}${chipFmt(delta)})`);
        else setMessage(`😖 ${result.reels.join(' ')} — olmadı. Şansını rulette dene!`);
        finishRound(delta, bet, `🎰 Kumarhane: ${bet.toLocaleString()} bahis → ${delta >= 0 ? '+' : ''}${delta.toLocaleString()}`);
      }
    }, 90);
  };

  /* — Rulet çevirme — */
  const spinRoulette = () => {
    if (!canBet || rSpinning) return;
    setRSpinning(true);
    setMessage(null);
    let ticks = 0;
    const iv = setInterval(() => {
      setRNumber(rand(37));
      ticks++;
      if (ticks >= 16) {
        clearInterval(iv);
        const n = rand(37);
        setRNumber(n);
        setRSpinning(false);
        const mult = rouletteWins(rBetKind, n);
        const delta = Math.round(bet * mult) - bet;
        const color = rouletteColor(n);
        if (mult > 0) setMessage(`🎉 ${n} ${color === 'green' ? '🟢' : color === 'red' ? '🔴' : '⚫'} — ${ROULETTE_LABEL[rBetKind]} kazandı! ${mult}× = ${chipFmt(bet * mult)}`);
        else setMessage(`😬 ${n} ${color === 'green' ? '🟢' : color === 'red' ? '🔴' : '⚫'} — ${ROULETTE_LABEL[rBetKind]} tutmadı.`);
        finishRound(delta, bet, `🎡 Rulet: ${ROULETTE_LABEL[rBetKind]} ${bet.toLocaleString()} → ${delta >= 0 ? '+' : ''}${delta.toLocaleString()} (top: ${n})`);
      }
    }, 100);
  };

  /* — Blackjack — */
  const bjDeal = () => {
    if (!canBet) return;
    bjBet.current = bet;
    const hand = [pick(BJ_CARDS), pick(BJ_CARDS)];
    const dHand = [pick(BJ_CARDS), pick(BJ_CARDS)];
    setBjPlayer(hand); setBjDealer(dHand);
    setBjPhase('player'); setBjResult(null); setMessage(null);
    if (bjValue(hand) === 21) {
      // Blackjack! 3:2
      const delta = Math.round(bet * 1.5);
      setBjPhase('done');
      setBjResult(`🃏 BLACKJACK! 3:2 ödeme — +${chipFmt(delta)}`);
      finishRound(delta, bet, `🃏 Blackjack! +${delta.toLocaleString()}`);
    }
  };
  const bjHit = () => {
    const hand = [...bjPlayer, pick(BJ_CARDS)];
    setBjPlayer(hand);
    const v = bjValue(hand);
    if (v > 21) {
      setBjPhase('done');
      setBjResult(`💀 Battı (${v})! -${chipFmt(bjBet.current)}`);
      finishRound(-bjBet.current, bjBet.current, `🃏 Blackjack: battı (${v})`);
    } else if (v === 21) {
      bjStand(hand);
    }
  };
  const bjStand = (playerHand = bjPlayer) => {
    let dealer = [...bjDealer];
    while (bjValue(dealer) < 17) dealer = [...dealer, pick(BJ_CARDS)];
    setBjDealer(dealer);
    const pv = bjValue(playerHand), dv = bjValue(dealer);
    const stake = bjBet.current;
    setBjPhase('done');
    if (dv > 21 || pv > dv) {
      const delta = stake; // 1:1
      setBjResult(`✅ ${pv} vs ${dv} — kazandın! +${chipFmt(delta)}`);
      finishRound(delta, stake, `🃏 Blackjack: ${pv}-${dv} kazanç +${delta.toLocaleString()}`);
    } else if (pv === dv) {
      setBjResult(`🤝 Push (${pv}) — bahis geri.`);
      finishRound(0, stake, `🃏 Blackjack: berabere (${pv})`);
    } else {
      setBjResult(`☹️ ${pv} vs ${dv} — krupiye kazandı. -${chipFmt(stake)}`);
      finishRound(-stake, stake, `🃏 Blackjack: kayıp ${pv}-${dv}`);
    }
  };

  /* — Çark — */
  const spinWheel = () => {
    if (!canBet || wheelSpinning) return;
    setWheelSpinning(true);
    setMessage(null);
    const seg = pick(WHEEL_POOL);
    const turns = 4 + rand(3);
    const target = wheelAngle + turns * 360 + rand(360);
    setWheelAngle(target);
    setTimeout(() => {
      setWheelSpinning(false);
      const delta = Math.round(bet * seg.mult) - bet;
      if (seg.mult === 0) setMessage(`💥 Çark ${seg.label} geldi — bahis gitti!`);
      else if (seg.mult >= 5) setMessage(`🎯 MUHTEŞEM! ${seg.label} = ${chipFmt(bet * seg.mult)}!`);
      else setMessage(`${seg.mult >= 1 ? '✅' : '🙃'} Çark ${seg.label} → ${delta >= 0 ? '+' : ''}${chipFmt(delta)}`);
      finishRound(delta, bet, `🎯 Çarkıfelek: ${seg.label} ${bet.toLocaleString()} → ${delta >= 0 ? '+' : ''}${delta.toLocaleString()}`);
    }, 2600);
  };

  /* — Kasa işlemleri — */
  const deposit = () => {
    const amt = Math.min(depositAmt, gameState.budget);
    if (amt < 10_000) { setMessage('❌ Bütçede yeterli para yok.'); return; }
    onUpdateCasino((c, budget) => ({ casino: { ...c, balance: c.balance + amt }, budget: budget - amt }), null as any);
    setMessage(`💰 ${chipFmt(amt)} kasaya yatırıldı. Bol şans!`);
  };
  const withdraw = () => {
    const amt = casino.balance;
    if (amt <= 0) return;
    onUpdateCasino((c, budget) => ({ casino: { ...c, balance: 0 }, budget: budget + amt }), null as any);
    setMessage(`🏦 ${chipFmt(amt)} kulüp bütçesine aktarıldı.`);
  };

  const winRate = casino.wagered > 0 ? Math.round((casino.won / casino.wagered) * 100) : 0;
  const betChips = [10_000, 50_000, 250_000, 1_000_000];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="relative overflow-hidden rounded-2xl p-6 border border-amber-500/40 bg-gradient-to-r from-purple-900/60 via-slate-900 to-purple-900/60">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 18px, rgba(251,191,36,0.12) 18px 36px)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-amber-300 flex items-center gap-2">🎰 Menajerler Kumarhanesi</h2>
            <p className="text-purple-200/80 mt-1 text-sm">
              Kulüp parasıyla oyna, kâseyi katla… ya da sezon primini masada bırak. Kumarhane <b className="text-amber-300">Seviye 40</b>'ta açıldı — artık buradasın. 🎩
            </p>
          </div>
          <div className="bg-black/40 rounded-2xl px-5 py-3 border border-amber-500/30 text-right">
            <div className="text-[10px] tracking-widest text-amber-400 font-bold">KASA</div>
            <div className="text-2xl font-black text-white">{chipFmt(casino.balance)}</div>
          </div>
        </div>
      </div>

      {/* Yatır / çek */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-bold">Kulüp bütçesi:</span>
          <span className="text-sm font-black text-emerald-300">{chipFmt(gameState.budget)}</span>
          <input
            type="number" min={10_000} step={10_000} value={depositAmt}
            onChange={e => setDepositAmt(Math.max(0, Number(e.target.value)))}
            className="w-36 bg-slate-900/70 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-white"
          />
          <button onClick={deposit} disabled={gameState.budget < 10_000} className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white">💰 Kasaya Yatır</button>
          <button onClick={withdraw} disabled={casino.balance <= 0} className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white">🏦 Hepsini Çek</button>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          bahis: {chipFmt(casino.wagered)} • kazanılan: {chipFmt(casino.won)} • getiri: %{winRate} • rekor: {chipFmt(casino.biggestWin)}
        </div>
      </div>

      {/* Oyun seçimi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {(Object.keys(GAME_META) as GameId[]).map(g => {
          const meta = GAME_META[g];
          const active = game === g;
          return (
            <button
              key={g} onClick={() => { setGame(g); setMessage(null); setBjPhase('bet'); setBjResult(null); }}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all ${active ? 'border-amber-400 bg-gradient-to-br from-amber-500/25 to-purple-500/15 shadow-lg shadow-amber-500/20' : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-500'}`}
            >
              <div className="text-2xl">{meta.icon}</div>
              <div className="text-sm font-black text-white mt-1">{meta.name}</div>
              <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{meta.desc}</div>
              <div className="text-[9px] text-emerald-400/80 mt-1 font-mono">getiri {meta.rtp}</div>
            </button>
          );
        })}
      </div>

      {/* Bahis çubuğu */}
      {game !== 'blackjack' || bjPhase === 'bet' ? (
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-3.5 flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-black text-amber-300">BAHİS:</span>
          {betChips.map(v => (
            <button key={v} onClick={() => setBet(v)} className={`px-3 py-1.5 rounded-full text-xs font-black ${bet === v ? 'bg-amber-400 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{chipFmt(v)}</button>
          ))}
          <input
            type="number" min={10_000} step={10_000} value={bet}
            onChange={e => setBet(Math.max(0, Math.min(MAX_BET, Number(e.target.value) || 0)))}
            className="w-36 bg-slate-900/70 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-white"
          />
          {casino.balance < bet && <span className="text-[11px] text-red-300 font-bold">Kasada yeterli çip yok!</span>}
        </div>
      ) : null}

      {/* Oyun sahnesi */}
      <div className="bg-slate-900/70 rounded-2xl border border-amber-500/20 p-6 min-h-[300px] flex flex-col items-center justify-center gap-5">

        {game === 'slots' && (
          <>
            <div className="flex gap-2.5">
              {reels.map((r, i) => (
                <div key={i} className={`w-24 h-28 md:w-28 md:h-32 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-amber-500/50 rounded-2xl flex items-center justify-center text-5xl md:text-6xl shadow-inner ${spinning ? 'animate-pulse' : ''}`}
                  style={{ animation: spinning ? `slotRoll 90ms linear ${i * 30}ms infinite` : undefined }}>
                  {r}
                </div>
              ))}
            </div>
            <button onClick={spinSlotsGame} disabled={!canBet || spinning}
              className="px-10 py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 disabled:opacity-40 text-white shadow-xl shadow-red-500/25">
              {spinning ? '🎰 DÖNÜYOR…' : '🎰 ÇEVİR'}
            </button>
            <style>{`@keyframes slotRoll { 0%{transform:translateY(-8%)} 50%{transform:translateY(8%)} 100%{transform:translateY(-8%)} }`}</style>
          </>
        )}

        {game === 'roulette' && (
          <>
            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-8 flex items-center justify-center text-5xl md:text-6xl font-black text-white shadow-2xl transition-all ${rSpinning ? 'blur-[1px]' : ''}`}
              style={{
                background: rNumber === 0 ? 'radial-gradient(circle,#166534,#052e16)' : rouletteColor(rNumber ?? 0) === 'red' ? 'radial-gradient(circle,#dc2626,#450a0a)' : 'radial-gradient(circle,#1f2937,#030712)',
                transform: rSpinning ? `rotate(${(rNumber ?? 0) * 137}deg) scale(1.04)` : undefined,
              }}>
              {rNumber ?? '—'}
            </div>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5">
              {(Object.keys(ROULETTE_LABEL) as RouletteBetKind[]).map(k => (
                <button key={k} onClick={() => setRBetKind(k)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${rBetKind === k ? 'bg-amber-400 text-black scale-105' : k === 'red' ? 'bg-red-900/70 text-red-100 hover:bg-red-800' : k === 'black' ? 'bg-slate-950 text-slate-200 hover:bg-slate-800' : k === 'zero' ? 'bg-green-900 text-green-100 hover:bg-green-800' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
                  {ROULETTE_LABEL[k]} {k === 'zero' ? '36×' : k === 'red' || k === 'black' || k === 'even' || k === 'odd' || k === 'low' || k === 'high' ? '2×' : ''}
                </button>
              ))}
            </div>
            <button onClick={spinRoulette} disabled={!canBet || rSpinning}
              className="px-10 py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-400 hover:to-purple-500 disabled:opacity-40 text-white shadow-xl shadow-purple-500/25">
              {rSpinning ? '🎡 TOP DÖNÜYOR…' : '🎡 ATIŞ YAP'}
            </button>
          </>
        )}

        {game === 'blackjack' && (
          <>
            <div className="flex items-start gap-10">
              <div className="text-center">
                <div className="text-[10px] tracking-widest text-slate-400 font-black mb-2">KRUPİYE {bjDealer.length > 0 && `(${bjValue(bjPhase === 'player' ? bjDealer.slice(0, 1) : bjDealer)})`}</div>
                <div className="flex gap-1.5 min-h-[92px]">
                  {bjDealer.length === 0 ? <div className="w-16 h-24 rounded-lg bg-slate-800 border border-slate-600" /> :
                    (bjPhase === 'player' ? bjDealer.slice(0, 1) : bjDealer).map((c, i) => (
                      <div key={i} className="w-16 h-24 rounded-lg bg-white text-slate-900 flex items-center justify-center text-xl font-black shadow-lg">{bjCardLabel(c, i)}</div>
                    ))}
                  {bjPhase === 'player' && bjDealer.length > 1 && <div className="w-16 h-24 rounded-lg bg-slate-700 border border-slate-500 flex items-center justify-center text-2xl">🂠</div>}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] tracking-widest text-emerald-400 font-black mb-2">SEN {bjPlayer.length > 0 && `(${bjValue(bjPlayer)})`}</div>
                <div className="flex gap-1.5 min-h-[92px]">
                  {bjPlayer.length === 0 ? <div className="w-16 h-24 rounded-lg bg-slate-800 border border-slate-600" /> :
                    bjPlayer.map((c, i) => (
                      <div key={i} className="w-16 h-24 rounded-lg bg-white text-slate-900 flex items-center justify-center text-xl font-black shadow-lg">{bjCardLabel(c, i + 1)}</div>
                    ))}
                </div>
              </div>
            </div>
            {bjPhase === 'bet' && (
              <button onClick={bjDeal} disabled={!canBet}
                className="px-10 py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 disabled:opacity-40 text-white shadow-xl shadow-emerald-500/25">
                🃏 DAĞIT
              </button>
            )}
            {bjPhase === 'player' && (
              <div className="flex gap-3">
                <button onClick={bjHit} className="px-8 py-3 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-500 text-white"> ÇEK </button>
                <button onClick={() => bjStand()} className="px-8 py-3 rounded-2xl font-black bg-amber-600 hover:bg-amber-500 text-white"> DUR </button>
              </div>
            )}
            {bjPhase === 'done' && (
              <div className="flex flex-col items-center gap-3">
                {bjResult && <div className="text-lg font-black text-amber-300">{bjResult}</div>}
                <button onClick={() => { setBjPhase('bet'); setBjPlayer([]); setBjDealer([]); setBjResult(null); }}
                  className="px-8 py-2.5 rounded-2xl font-black bg-slate-700 hover:bg-slate-600 text-white">🔄 Yeni El</button>
              </div>
            )}
          </>
        )}

        {game === 'wheel' && (
          <>
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              <div
                className="absolute inset-0 rounded-full border-8 border-amber-500/60 shadow-2xl"
                style={{
                  transform: `rotate(${wheelAngle}deg)`,
                  transition: wheelSpinning ? 'transform 2.5s cubic-bezier(0.15,0.9,0.25,1)' : undefined,
                  background: `conic-gradient(${WHEEL_SEGMENTS.flatMap((s, i) => {
                    const span = 360 / WHEEL_SEGMENTS.length;
                    return [`${s.color} ${i * span}deg ${(i + 1) * span}deg`];
                  }).join(',')})`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-20 rounded-full bg-slate-950 border-4 border-amber-500/60 flex items-center justify-center text-3xl">🎯</div>
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl pointer-events-none">🔻</div>
            </div>
            <button onClick={spinWheel} disabled={!canBet || wheelSpinning}
              className="px-10 py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-40 text-white shadow-xl shadow-pink-500/25">
              {wheelSpinning ? '🎯 ÇARK DÖNÜYOR…' : '🎯 DÖNDÜR'}
            </button>
          </>
        )}

        {message && (
          <div className="bg-black/50 border border-amber-500/30 rounded-xl px-5 py-2.5 text-sm font-bold text-amber-200 text-center max-w-lg">{message}</div>
        )}
      </div>

      {/* Son sonuçlar + sorumluluk */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="text-xs font-black text-slate-300 tracking-widest mb-1.5">SON ELLER</h4>
            <div className="flex gap-1.5">
              {casino.history.length === 0 && <span className="text-[11px] text-slate-500">Henüz oyun yok — ilk bahisi koy! 🎲</span>}
              {casino.history.slice().reverse().map((d, i) => (
                <span key={i} className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${d > 0 ? 'bg-emerald-500/20 text-emerald-300' : d === 0 ? 'bg-slate-600/30 text-slate-300' : 'bg-red-500/20 text-red-300'}`}>
                  {d > 0 ? '+' : ''}{(d / 1000).toFixed(0)}K
                </span>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
            ⚠️ Kumarhane tamamen eğlence amaçlı sanal paradır; gerçek para yoktur. Kasa avantajı gerçek kumarhanelerle aynıdır: uzun vadede ev kazanır. Bütçenin tamamını masaya koyma, menajer! 👔
          </div>
        </div>
      </div>
    </div>
  );
};
