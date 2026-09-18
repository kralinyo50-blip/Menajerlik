import React, { useMemo, useState, useEffect } from 'react';
import { MatchEvent, Player, Weather } from '../types/game';

interface LivePitchProps {
  minute: number;
  possession: number;
  events: MatchEvent[];
  homeLogo: string;
  awayLogo: string;
  homeName: string;
  awayName: string;
  isHome: boolean;
  lineup: Player[];
  sentOff: number[];
  phase: string;
  weather?: Weather;
  /** ⏸️ Simülasyon donduruldu (ör. oyuncu değişikliği yapılırken) — sahadaki her şey durur */
  paused?: boolean;
  /** 🐢 Kart sonrası yavaş çekim — animasyonlar ağırlaşır */
  slowMo?: boolean;
}

/** Rakip diziliş şablonu (kullanıcı takımı üst kaleye hücum eder) */
const AWAY_SHAPE = [
  { t: 10, l: 50 }, { t: 28, l: 14 }, { t: 26, l: 38 }, { t: 26, l: 62 }, { t: 28, l: 86 },
  { t: 50, l: 22 }, { t: 48, l: 50 }, { t: 50, l: 78 },
  { t: 72, l: 20 }, { t: 78, l: 50 }, { t: 72, l: 80 },
];

const ATTACK_TYPES: MatchEvent['type'][] = ['goal', 'penalty', 'chance', 'save'];

/** Maçın canlı 2D saha görünümü — top, diziliş ve son olaylar */
export const LivePitch: React.FC<LivePitchProps> = ({
  minute, possession, events, homeLogo, awayLogo, homeName, awayName,
  isHome, lineup, sentOff, phase, weather = 'sunny', paused = false, slowMo = false
}) => {
  const [tick, setTick] = useState(0);
  const isWet = weather === 'rain' || weather === 'storm' || weather === 'snow';
  const [slipId, setSlipId] = useState<number | null>(null);
  // Canlılık tick'i — ⏸️ dondurulunca tamamen durur, 🐢 yavaş çekimde ağırlaşır
  useEffect(() => {
    if (paused) return;
    if (phase === 'pre' || phase === 'half' || phase === 'done' || phase === 'pens') return;
    const id = setInterval(() => setTick(t => t + 1), slowMo ? 1150 : 380);
    return () => clearInterval(id);
  }, [phase, paused, slowMo]);

  // Yağmurda kayma — her 7-11 tick’te bir oyuncu kayar (hafif, 900ms)
  useEffect(() => {
    if (paused) return;
    if (!isWet || phase === 'pre' || phase === 'half' || phase === 'done' || phase === 'pens') return;
    const id = setInterval(() => {
      if (Math.random() < 0.38) {
        const pool = lineup.filter(p => !sentOff.includes(p.id) && !p.injured);
        if (pool.length) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          setSlipId(pick.id);
          setTimeout(() => setSlipId(null), 900);
        }
      }
    }, 2600);
    return () => clearInterval(id);
  }, [isWet, phase, lineup, sentOff, paused]);

  const lastAttack = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (ATTACK_TYPES.includes(events[i].type)) return events[i];
    }
    return undefined;
  }, [events]);

  const lastGoal = useMemo(() => {
    const last = events[events.length - 1];
    return last && (last.type === 'goal' || last.type === 'penalty') && minute - last.minute <= 1 ? last : undefined;
  }, [events, minute]);

  // Yorgunluk — 60 sonrası ağırlaşma
  const fatigueFactor = useMemo(() => {
    if (minute <= 58) return 1;
    if (minute <= 90) return Math.max(0.58, 1 - (minute - 58) / 32 * 0.42);
    return Math.max(0.42, 0.58 - (minute - 90) / 30 * 0.16);
  }, [minute]);
  const effectiveEnergy = (p: Player) => Math.max(10, Math.min(100, p.energy - minute * 0.42 - (phase === 'et' ? 10 : 0)));

  // 🐢 Yavaş çekim: hareket süreleri uzar, her şey ağırlaşır (⏸️ dondurmada tick zaten durur)
  const motionMs = (base: number) => Math.round(base * (slowMo ? 2.8 : 1));

  // Sürekli top sürme — possession + son atak + tick jitter
  const ball = useMemo(() => {
    let x = 50 + (possession - 50) * 0.38;
    let y = 50;

    if (lastAttack) {
      const isUserAttack = lastAttack.team === 'home';
      const deep = lastAttack.type === 'goal' || lastAttack.type === 'penalty';
      const age = minute - lastAttack.minute;
      const fade = Math.max(0, 1 - age * 0.35); // 2-3 dkda solar
      if (isUserAttack) {
        y = deep ? 6 : 22 + Math.random() * 16;
        x = 28 + Math.random() * 44;
        // fade ile merkeze dön
        y = y * fade + 50 * (1 - fade);
        x = x * fade + (50 + (possession - 50) * 0.38) * (1 - fade);
      } else {
        y = deep ? 94 : 64 + Math.random() * 16;
        x = 28 + Math.random() * 44;
        y = y * fade + 50 * (1 - fade);
        x = x * fade + (50 + (possession - 50) * 0.38) * (1 - fade);
      }
    }
    // dribbling jitter — sürekli hafif salınım, yorgunlukla yavaşlar
    const jitterAmp = 3.2 * fatigueFactor + 0.6;
    const jx = Math.sin(tick * 0.85) * jitterAmp + Math.cos(minute * 1.1 + tick * 0.3) * (1.6 * fatigueFactor);
    const jy = Math.cos(tick * 0.62) * (2.8 * fatigueFactor) + Math.sin(minute * 0.9) * 1.4;
    x += jx;
    y += jy;
    // top sürme kanatlara kayma — yorgunken daha az
    x += Math.sin(tick * 0.45 + minute) * (1.2 * fatigueFactor);
    return { x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) };
  }, [lastAttack, possession, minute, tick, fatigueFactor]);

  // Topu süren oyuncu — topa en yakın bizden biri (görsel dribbling)
  const carrierId = useMemo(() => {
    let best: number | null = null;
    let bestDist = 999;
    for (const p of lineup) {
      if (sentOff.includes(p.id) || p.injured) continue;
      const pt = p.t ?? 50, pl = p.l ?? 50;
      const d = Math.hypot(pt - ball.y, pl - ball.x);
      if (d < bestDist) { bestDist = d; best = p.id; }
    }
    return best;
  }, [lineup, ball, sentOff]);

  const avgEnergy = useMemo(() => {
    const avail = lineup.filter(p => !sentOff.includes(p.id) && !p.injured);
    if (!avail.length) return 50;
    return Math.round(avail.reduce((a, b) => a + effectiveEnergy(b), 0) / avail.length);
  }, [lineup, sentOff, minute, phase]);
  const tempoLabel = fatigueFactor > 0.88 ? 'TEMPO: YÜKSEK ⚡' : fatigueFactor > 0.66 ? 'TEMPO: ORTA' : fatigueFactor > 0.5 ? 'TEMPO: DÜŞÜK 🥵' : 'TEMPO: BİTTİLER 🥵';
  const tempoColor = fatigueFactor > 0.88 ? 'text-emerald-400' : fatigueFactor > 0.66 ? 'text-amber-400' : 'text-orange-400';

  // Amaç: away de topa göre hafif kaysın
  const awayBallInfluence = useMemo(() => {
    // top bizdeyse away geriye, rakipte ise ileri
    const userHasBall = possession > 52 || (lastAttack?.team === 'home' && minute - (lastAttack?.minute ?? 99) <= 1);
    return userHasBall ? -1 : 1;
  }, [possession, lastAttack, minute]);

  const recent = events.slice(-3).reverse();

  const eventColor = (t: MatchEvent['type']) =>
    t === 'goal' || t === 'penalty' ? 'text-emerald-400'
      : t === 'card' ? 'text-yellow-400'
      : t === 'injury' ? 'text-orange-400'
      : t === 'substitution' ? 'text-blue-400'
      : 'text-slate-300';

  // Kenarda menajer tepkisi — son olaya göre
  const lastEvent = events[events.length - 1];
  const managerReaction = useMemo(() => {
    if (!lastEvent || phase === 'pre' || phase === 'half') return { emoji: '🧑‍💼', label: 'izliyor', anim: '' };
    const age = minute - lastEvent.minute;
    if (age > 1) return { emoji: '🧑‍💼', label: isWet ? 'ıslanıyor ☔' : avgEnergy < 35 ? 'su içiyor 🥤' : 'yön veriyor', anim: '' };
    if (lastEvent.type === 'goal' && lastEvent.team === 'home') return { emoji: '🙌', label: 'GOL! zıplıyor!', anim: 'animate-bounce' };
    if (lastEvent.type === 'goal' && lastEvent.team === 'away') return { emoji: '😫', label: 'başını tutuyor', anim: 'animate-pulse' };
    if (lastEvent.type === 'chance' || lastEvent.type === 'save') return { emoji: '😬', label: 'gergin', anim: 'animate-pulse' };
    if (lastEvent.type === 'card') return { emoji: '🤬', label: 'hakeme itiraz!', anim: '' };
    if (lastEvent.type === 'substitution') return { emoji: '👏', label: 'alkışlıyor', anim: '' };
    if (lastEvent.description?.includes('💦') || lastEvent.description?.includes('kay')) return { emoji: '🤸', label: 'aman kaydı!', anim: '' };
    if (lastEvent.description?.includes('🥵')) return { emoji: '🥤', label: 'su veriyor', anim: '' };
    if (lastEvent.type === 'info' && lastEvent.team === 'home') return { emoji: '👏', label: 'hadi!', anim: '' };
    return { emoji: '🧑‍💼', label: 'izliyor', anim: '' };
  }, [lastEvent, minute, phase, isWet, avgEnergy]);

  return (
    <div>
      {/* Takım şeritleri */}
      <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1 px-1">
        <span className="flex items-center gap-1 truncate">
          <span className="text-base">{awayLogo}</span> {awayName}
          <span className="text-red-400/80">▲ üst kale</span>
        </span>
        <span className="text-slate-500">2D SAHA</span>
        <span className="flex items-center gap-1 truncate">
          <span className="text-emerald-400/80">alt kale ▼</span> {homeName} <span className="text-base">{homeLogo}</span>
        </span>
      </div>

      {/* Saha - kompakt: ekranda daha az yer kaplar, premium ışık korunur */}
      <div className={`relative w-full h-52 sm:h-60 lg:h-[300px] xl:h-[340px] rounded-xl overflow-hidden border-2 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] ${lastGoal ? 'animate-goal-flash border-emerald-400/60 shadow-[0_0_32px_rgba(16,185,129,0.5)]' : paused ? 'border-sky-400/70' : slowMo ? 'border-amber-400/70' : 'border-white/30'}`}
        style={{
          background:
            'repeating-linear-gradient(0deg, #15803d 0px, #15803d 22px, #16a34a 22px, #16a34a 44px)',
        }}
      >
        {/* stadyum ışığı - üstten yansıma */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{ background: 'radial-gradient(800px circle at 50% 0%, white, transparent 70%)' }} />
        {/* Saha çizgileri */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full" />
          {/* Üst ceza sahası (rakip) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-14 border-2 border-t-0 border-white/40" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 border-2 border-t-0 border-white/40" />
          {/* Alt ceza sahası (biz) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-14 border-2 border-b-0 border-white/40" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-7 border-2 border-b-0 border-white/40" />
        </div>
        {/* Islak zemin hissi — parlak şerit + çamur */}
        {isWet && (
          <div className="absolute inset-0 pointer-events-none opacity-35 rounded-xl" style={{ background: weather === 'snow' ? 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(186,230,253,0.14) 100%)' : 'linear-gradient(180deg, rgba(148,163,184,0.18) 0%, transparent 42%, rgba(14,165,233,0.13) 100%)' }} />
        )}
        {isWet && (
          <div className="absolute top-1 right-2 bg-sky-900/70 backdrop-blur px-1.5 py-0.5 rounded-full text-[8px] font-bold text-sky-100 border border-sky-700/40 pointer-events-none">
            {weather === 'snow' ? '❄️ ZEMİN KAYGAN' : weather === 'storm' ? '⛈️ KAYGAN + RÜZGAR' : '🌧️ ZEMİN KAYGAN — FAUL RİSKİ ↑'}
          </div>
        )}
        {/* Kenarda menajer — reaksiyon */}
        <div className="absolute bottom-0 right-[4%] flex flex-col items-center pointer-events-none z-10">
          {/* konuşma balonu */}
          <div className="mb-0.5 bg-white text-black text-[7px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 shadow whitespace-nowrap">
            {managerReaction.label}
          </div>
          <div className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow flex items-center justify-center text-[13px] ${managerReaction.anim}`} style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
            <span className={managerReaction.anim}>{managerReaction.emoji}</span>
          </div>
          <div className="text-[6px] font-black text-white bg-black/60 px-1 rounded -mt-0.5">HOCA</div>
          {/* Teknik alan çizgisi */}
          <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-white/80" />
        </div>

        {/* Rakip oyuncular — topa göre hafif pres / geri çekilme + dribble jitter */}
        {AWAY_SHAPE.map((p, i) => {
          const isKeeper = i === 0;
          const chase = (0.12 + (i > 7 ? 0.18 : 0)) * (0.55 + fatigueFactor * 0.45);
          // Kaleci çizgiye bağlı kalır; topa bakıp hareketsiz kalmaz, ancak
          // stoper gibi sahanın içine de çıkmaz.
          const keeperSave = lastAttack && (lastAttack.type === 'save' || lastAttack.type === 'chance') && minute - lastAttack.minute <= 1;
          const tgtY = isKeeper
            ? 7 + Math.max(0, Math.min(9, (ball.y - 6) * 0.12))
            : p.t + awayBallInfluence * 2.5 + (ball.y - 50) * chase * 0.22;
          const tgtX = isKeeper
            ? 50 + (ball.x - 50) * 0.16
            : p.l + (ball.x - 50) * chase * 0.18 + Math.sin(tick * 0.55 + i) * 0.9 * fatigueFactor;
          return (
            <div
              key={`away-${i}`}
              className={`absolute ${isKeeper ? 'w-6 h-6 lg:w-7 lg:h-7 bg-red-800 border-2 border-amber-300 text-[10px]' : 'w-4 h-4 lg:w-5 lg:h-5 bg-red-600 border border-white/80 text-[7px]'} rounded-full shadow flex items-center justify-center font-bold text-white ${isKeeper && keeperSave ? 'animate-keeper-save' : ''}`}
              style={{ top: `${Math.max(6, Math.min(94, tgtY))}%`, left: `${Math.max(8, Math.min(92, tgtX))}%`, transform: 'translate(-50%, -50%)', transition: `all ${motionMs(420 + (1 - fatigueFactor) * 180)}ms ease-out` }}
            >
              {isKeeper ? '🧤' : i + 1}
            </div>
          );
        })}

        {/* Bizim oyuncular — dribbling + yorgunluk + kayma */}
        {lineup.map(p => {
          const isOff = sentOff.includes(p.id);
          if (isOff) return null;
          const isKeeper = p.role === 'KL';
          const keeperSave = isKeeper && lastAttack?.team === 'away' && (lastAttack.type === 'save' || lastAttack.type === 'chance') && minute - lastAttack.minute <= 1;
          const isCarrier = carrierId === p.id && possession > 38 && phase !== 'half';
          const isSlipping = slipId === p.id;
          const baseT = p.t ?? 50, baseL = p.l ?? 50;
          const eEff = effectiveEnergy(p);
          const tired = eEff < 42 || minute > 76;
          const chaseBase = isCarrier ? 0.92 : p.role === 'FW' ? 0.28 : p.role === 'OS' ? 0.24 : p.role === 'SB' ? 0.18 : 0.14;
          const chase = chaseBase * (0.52 + fatigueFactor * 0.48) * (isWet ? 0.88 : 1);
          // dribbling gecikmesi: topun peşinden 300ms geriden gel — yorgunlukla daha geriden, kayganda daha savruk
          const jitter = (isCarrier ? 1.6 : 0.9) * fatigueFactor * (isWet ? 1.18 : 1);
          const dynT = isKeeper
            ? 93 - Math.max(0, Math.min(8, (94 - ball.y) * 0.10))
            : baseT * (1 - chase * 0.32) + ball.y * chase * 0.32 + Math.sin(tick * 0.7 + p.id * 0.4) * jitter;
          const dynL = isKeeper
            ? 50 + (ball.x - 50) * 0.16
            : baseL * (1 - chase * 0.32) + ball.x * chase * 0.32 + Math.cos(tick * 0.6 + p.id * 0.5) * jitter;
          const clampedT = Math.max(7, Math.min(93, dynT));
          const clampedL = Math.max(7, Math.min(93, dynL));
          const energyPct = Math.max(0, Math.min(100, eEff));
          const energyColor = energyPct > 58 ? 'bg-emerald-400' : energyPct > 32 ? 'bg-amber-400' : 'bg-red-500';
          return (
            <div key={`home-${p.id}`} className="absolute" style={{ top: `${clampedT}%`, left: `${clampedL}%`, transform: `translate(-50%, -50%) ${isSlipping ? 'rotate(72deg) scale(0.92)' : ''}`, transition: isSlipping ? 'transform 260ms ease' : undefined }}>
              <div
                className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border shadow flex items-center justify-center text-[8px] font-black ${p.injured ? 'bg-orange-500 text-black border-white' : isSlipping ? 'bg-sky-200 text-sky-900 border-sky-400' : keeperSave ? 'bg-amber-400 text-black border-white scale-125' : isKeeper ? 'bg-amber-500 text-black border-white' : isCarrier ? 'bg-white text-emerald-700 border-emerald-400 scale-110' : tired ? 'bg-emerald-300/90 text-black border-white/80' : 'bg-emerald-400 text-black border-white'}`}
                style={{
                  transition: isCarrier ? `all ${motionMs(320)}ms cubic-bezier(0.34,1.2,0.64,1)` : isSlipping ? `all ${motionMs(260)}ms ease` : `all ${motionMs(520 + (1 - fatigueFactor) * 220)}ms ease-out`,
                  boxShadow: isSlipping ? '0 0 0 2px rgba(125,211,252,0.8), 0 2px 10px rgba(0,0,0,0.3)' : isCarrier ? '0 0 10px rgba(16,185,129,0.9), 0 2px 8px rgba(0,0,0,0.35)' : tired ? '0 0 6px rgba(251,146,60,0.35)' : undefined,
                  opacity: isSlipping ? 1 : tired ? 0.92 : 1,
                }}
                title={`${p.name} (${p.role}) • ⚡${Math.round(energyPct)}%${isSlipping ? ' — kaydı! 💦' : isCarrier ? ' — top sürüyor' : tired ? ' — yorgun' : ''}`}
              >
                {isSlipping ? '💦' : keeperSave ? '🧤' : isKeeper ? 'K' : isCarrier ? '●' : p.ovr > 84 ? '★' : ''}
              </div>
              {/* ⚡ enerji barı — 70'ten sonra veya carrier/yorgunlarda her zaman */}
              {(minute > 68 || isCarrier || energyPct < 48) && (
                <div className="absolute left-1/2 -translate-x-1/2 top-[22px] lg:top-[26px] w-8 h-[3px] bg-black/55 rounded-full overflow-hidden border border-white/20">
                  <div className={`h-full ${energyColor}`} style={{ width: `${energyPct}%`, transition: 'width 600ms ease' }} />
                </div>
              )}
              {tired && !isCarrier && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 text-[7px] leading-none pointer-events-none">💦</div>
              )}
            </div>
          );
        })}

        {/* Top — dribbling izi + zıplama — kayganda daha uzun kayar */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white border border-slate-800 shadow-lg flex items-center justify-center text-[8px]"
          style={{
            top: `${ball.y}%`,
            left: `${ball.x}%`,
            transform: 'translate(-50%, -50%)',
            transition: isWet ? `all ${motionMs(560)}ms cubic-bezier(0.22,0.9,0.36,1)` : `all ${motionMs(380)}ms cubic-bezier(0.22,1,0.36,1)`,
            boxShadow: isWet ? '0 2px 10px rgba(0,0,0,0.35), 0 0 0 2px rgba(125,211,252,0.9)' : '0 2px 8px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.9)',
            animation: !paused && phase !== 'half' && phase !== 'pre' ? `ballBounce ${motionMs(380)}ms ease ${tick % 2 ? '0ms' : '80ms'} infinite alternate` : undefined,
          }}
        >
          ⚽
        </div>
        {/* Top izi — 2 hayalet */}
        <div className="absolute w-2 h-2 rounded-full bg-white/55 border border-white/60 pointer-events-none" style={{ top: `${ball.y}%`, left: `${ball.x}%`, transform: `translate(-50%, -50%) translate(${Math.sin(tick)*2}px, ${Math.cos(tick)*1.5}px) scale(0.7)`, transition: `all ${motionMs(520)}ms ease-out`, opacity: paused ? 0.2 : 0.45 }} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-white/35 pointer-events-none" style={{ top: `${ball.y}%`, left: `${ball.x}%`, transform: `translate(-50%, -50%) translate(${Math.cos(tick*0.8)*3}px, ${Math.sin(tick*0.7)*2}px) scale(0.6)`, transition: `all ${motionMs(650)}ms ease-out`, opacity: paused ? 0.12 : 0.3 }} />

        {/* Ev sahibi / deplasman etiketi */}
        <div className="absolute top-1 right-1 bg-black/50 rounded px-1.5 py-0.5 text-[9px] text-white font-bold">
          {isHome ? 'EV' : 'DEP'} • {Math.max(0, 11 - sentOff.length)} kişi
        </div>
        <div className="absolute bottom-1 left-1 bg-black/50 rounded px-1.5 py-0.5 text-[9px] text-white font-mono">
          {minute}'
        </div>
        {phase === 'half' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
            ⏸️ Devre arası
          </div>
        )}
        {/* ⏸️ Simülasyon donduruldu — sen değişiklik yaparken saha tamamen durur */}
        {paused && phase !== 'half' && (
          <div className="absolute inset-0 z-20 bg-sky-950/45 backdrop-blur-[1.5px] flex flex-col items-center justify-center gap-1 pointer-events-none">
            <div className="bg-sky-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
              ⏸️ SİMÜLASYON DONDURULDU
            </div>
            <div className="text-[10px] text-sky-100 font-bold">Değişikliğini yap — bitince maç kaldığı yerden devam eder</div>
          </div>
        )}
        {/* 🐢 Kart yavaş çekimi — hafif amber ton + köşe karartması */}
        {slowMo && !paused && phase !== 'half' && (
          <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 45%, rgba(245,158,11,0.22) 100%)' }}>
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[10px] font-black px-2.5 py-1 rounded-full shadow animate-pulse">
              🐢 YAVAŞ ÇEKİM — KART
            </div>
          </div>
        )}
      </div>

      {/* Top hakimiyeti barı + tempo/yorgunluk */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-emerald-400 font-bold w-10 text-right">%{Math.round(possession)}</span>
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${possession}%` }} />
          <div className="bg-red-500 h-full transition-all" style={{ width: `${100 - possession}%` }} />
        </div>
        <span className="text-[10px] text-red-400 font-bold w-10">%{Math.round(100 - possession)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-black tracking-wide ${tempoColor}`}>{tempoLabel} • {minute}'</span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${avgEnergy > 58 ? 'bg-emerald-400' : avgEnergy > 32 ? 'bg-amber-400 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
          Ort. ⚡ %{avgEnergy}
          {minute > 75 && <span className="text-orange-300">• değişiklik düşün!</span>}
        </span>
      </div>

      {/* Son olaylar */}
      <div className="mt-1 space-y-0.5">
        {recent.map((e, i) => (
          <div key={i} className={`text-[10px] truncate ${eventColor(e.type)} ${i === 0 ? 'font-bold' : 'opacity-70'}`}>
            <span className="text-slate-500">[{e.minute}']</span> {e.description}
          </div>
        ))}
      </div>
      <style>{`@keyframes keeperSave{0%{transform:translate(-50%,-50%) scale(1)}45%{transform:translate(-65%,-50%) rotate(-18deg) scale(1.28)}100%{transform:translate(-50%,-50%) scale(1)}} @keyframes ballBounce{0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-58%) scale(1.05)}} .animate-keeper-save{animation:keeperSave 900ms ease-in-out}`}</style>
    </div>
  );
};
