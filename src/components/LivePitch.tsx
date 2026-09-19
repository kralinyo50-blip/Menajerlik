import React, { useMemo, useState, useEffect } from 'react';
import { MatchEvent, Player, Weather, Tactics } from '../types/game';
import { FORMATIONS } from '../data/constants';

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
  paused?: boolean;
  slowMo?: boolean;
  tactics?: Tactics;
  /** Saha motoru karesi: 2D saha oyuncuları/topu bu kareden sürülür. */
  simRef?: React.RefObject<import('../utils/matchSim').SimSnapshot | null>;
}

/** Formasyona göre rakip diziliş — zonal marking ile */
function getAwayShape(formation: string) {
  const f = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  // Ters çevir — rakip üst kaleye
  return f.map(pos => ({ t: 100 - pos.t, l: pos.l, r: pos.r }));
}

const ATTACK_TYPES: MatchEvent['type'][] = ['goal', 'penalty', 'chance', 'save', 'corner'];

export const LivePitch: React.FC<LivePitchProps> = ({
  minute, possession, events, homeLogo, awayLogo, homeName, awayName,
  isHome, lineup, sentOff, phase, weather = 'sunny', paused = false, slowMo = false, tactics, simRef
}) => {
  const [tick, setTick] = useState(0);
  const isWet = weather === 'rain' || weather === 'storm';
  const isSnow = weather === 'snow';
  const isFog = weather === 'fog';
  const isWind = weather === 'wind';
  const [slipId, setSlipId] = useState<number | null>(null);

  const defensiveLine = tactics?.defensiveLine ?? 50;
  const width = tactics?.width ?? 50;
  const pressingIntensity = tactics?.pressingIntensity ?? 50;

  useEffect(() => {
    if (paused) return;
    if (phase === 'pre' || phase === 'half' || phase === 'done' || phase === 'pens') return;
    const id = setInterval(() => setTick(t => t + 1), slowMo ? 1150 : 380);
    return () => clearInterval(id);
  }, [phase, paused, slowMo]);

  useEffect(() => {
    if (paused) return;
    if ((!isWet && !isSnow) || phase === 'pre' || phase === 'half' || phase === 'done' || phase === 'pens') return;
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
  }, [isWet, isSnow, phase, lineup, sentOff, paused]);

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

  const fatigueFactor = useMemo(() => {
    if (minute <= 58) return 1;
    if (minute <= 90) return Math.max(0.58, 1 - (minute - 58) / 32 * 0.42);
    return Math.max(0.42, 0.58 - (minute - 90) / 30 * 0.16);
  }, [minute]);

  const effectiveEnergy = (p: Player) => Math.max(10, Math.min(100, p.energy - minute * 0.42 - (phase === 'et' ? 10 : 0)));
  const motionMs = (base: number) => Math.round(base * (slowMo ? 2.8 : 1));

  // Zonal marking — oyuncular formasyon pozisyonunu korur, sadece topa göre kayar
  const zonalShift = (baseT: number, baseL: number, role: string) => {
    // Defans çizgisi: yüksekse tüm takım öne çıkar
    const dlShift = (defensiveLine - 50) * 0.18; // -9 to +9
    // Genişlik: yüksekse kanatlar açılır
    const wShift = (width - 50) * 0.12;
    let t = baseT + dlShift;
    let l = baseL;
    if (role === 'SB') l += (baseL > 50 ? 1 : -1) * wShift * 0.5;
    if (role === 'OS' || role === 'FW') l += (baseL > 50 ? 1 : -1) * wShift * 0.3;
    // Forvetler defans çizgisi yüksekse daha önde
    if (role === 'FW') t += dlShift * 0.5;
    return { t: Math.max(5, Math.min(95, t)), l: Math.max(5, Math.min(95, l)) };
  };

  // ── Saha motoru karesi (varsa) ──
  // 2D saha artık hesaplanmış tahminlerle değil, motorun gerçek oyuncu/top
  // konumlarıyla çizilir: pas, şut, kurtarış ve diziliş birebir aynıdır.
  const simFrame = simRef?.current ?? null;
  const simUserSide: 'home' | 'away' = isHome ? 'home' : 'away';
  const simToPitch = (x: number, y: number) => (simUserSide === 'home' ? { t: 100 - x, l: y } : { t: x, l: y });
  const simMap = useMemo(() => {
    const map = new Map<string, { t: number; l: number; action: string; sentOff: boolean }>();
    if (!simFrame) return map;
    for (const s of simFrame.players) {
      const p = simToPitch(s.x, s.y);
      map.set(s.id, { ...p, action: s.action, sentOff: s.sentOff });
    }
    return map;
  }, [simFrame, simUserSide]);

  const ball = useMemo(() => {
    if (simFrame) {
      const { t, l } = simToPitch(simFrame.ball.x, simFrame.ball.y);
      return { x: Math.max(2, Math.min(98, l)), y: Math.max(2, Math.min(98, t)) };
    }
    let x = 50 + (possession - 50) * 0.38;
    let y = 50;

    if (lastAttack) {
      const isUserAttack = lastAttack.team === 'home';
      const deep = lastAttack.type === 'goal' || lastAttack.type === 'penalty';
      const age = minute - lastAttack.minute;
      const fade = Math.max(0, 1 - age * 0.35);
      if (isUserAttack) {
        y = deep ? 6 : 22 + Math.random() * 16;
        x = 28 + Math.random() * 44;
        y = y * fade + 50 * (1 - fade);
        x = x * fade + (50 + (possession - 50) * 0.38) * (1 - fade);
      } else {
        y = deep ? 94 : 64 + Math.random() * 16;
        x = 28 + Math.random() * 44;
        y = y * fade + 50 * (1 - fade);
        x = x * fade + (50 + (possession - 50) * 0.38) * (1 - fade);
      }
    }
    const jitterAmp = 3.2 * fatigueFactor + 0.6;
    const jx = Math.sin(tick * 0.85) * jitterAmp + Math.cos(minute * 1.1 + tick * 0.3) * (1.6 * fatigueFactor);
    const jy = Math.cos(tick * 0.62) * (2.8 * fatigueFactor) + Math.sin(minute * 0.9) * 1.4;
    x += jx;
    y += jy;
    x += Math.sin(tick * 0.45 + minute) * (1.2 * fatigueFactor);
    // Rüzgar etkisi
    if (isWind) x += Math.sin(tick * 0.3) * 2.5;
    return { x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) };
  }, [lastAttack, possession, minute, tick, fatigueFactor, isWind]);

  const carrierId = useMemo(() => {
    const simCarrier = simFrame && simFrame.carrierId ? simFrame.carrierId.replace(/^u-/, '') : null;
    if (simCarrier) {
      const id = Number(simCarrier);
      if (Number.isFinite(id) && lineup.some(p => p.id === id)) return id;
    }
    if (simFrame) return null;
    let best: number | null = null;
    let bestDist = 999;
    for (const p of lineup) {
      if (sentOff.includes(p.id) || p.injured) continue;
      const pt = p.t ?? 50, pl = p.l ?? 50;
      const zoned = zonalShift(pt, pl, p.role);
      const d = Math.hypot(zoned.t - ball.y, zoned.l - ball.x);
      if (d < bestDist) { bestDist = d; best = p.id; }
    }
    return best;
  }, [lineup, ball, sentOff, defensiveLine, width, simFrame]);

  const avgEnergy = useMemo(() => {
    const avail = lineup.filter(p => !sentOff.includes(p.id) && !p.injured);
    if (!avail.length) return 50;
    return Math.round(avail.reduce((a, b) => a + effectiveEnergy(b), 0) / avail.length);
  }, [lineup, sentOff, minute, phase]);

  const tempoLabel = fatigueFactor > 0.88 ? 'TEMPO: YÜKSEK ⚡' : fatigueFactor > 0.66 ? 'TEMPO: ORTA' : fatigueFactor > 0.5 ? 'TEMPO: DÜŞÜK 🥵' : 'TEMPO: BİTTİLER 🥵';
  const tempoColor = fatigueFactor > 0.88 ? 'text-emerald-400' : fatigueFactor > 0.66 ? 'text-amber-400' : 'text-orange-400';

  const awayBallInfluence = useMemo(() => {
    const userHasBall = possession > 52 || (lastAttack?.team === 'home' && minute - (lastAttack?.minute ?? 99) <= 1);
    return userHasBall ? -1 : 1;
  }, [possession, lastAttack, minute]);

  const recent = events.slice(-4).reverse();

  const eventColor = (t: MatchEvent['type']) =>
    t === 'goal' || t === 'penalty' ? 'text-emerald-400'
      : t === 'offside' ? 'text-purple-300'
      : t === 'tackle' ? 'text-cyan-300'
      : t === 'interception' ? 'text-blue-300'
      : t === 'corner' ? 'text-amber-300'
      : t === 'foul' || t === 'freekick' ? 'text-orange-300'
      : t === 'card' ? 'text-yellow-400'
      : t === 'injury' ? 'text-orange-400'
      : t === 'substitution' ? 'text-blue-400'
      : 'text-slate-300';

  const lastEvent = events[events.length - 1];
  const managerReaction = useMemo(() => {
    if (!lastEvent || phase === 'pre' || phase === 'half') return { emoji: '🧑‍💼', label: 'izliyor', anim: '' };
    const age = minute - lastEvent.minute;
    if (age > 1) return { emoji: '🧑‍💼', label: isWet ? 'ıslanıyor ☔' : isSnow ? 'üşüyor ❄️' : avgEnergy < 35 ? 'su içiyor 🥤' : 'yön veriyor', anim: '' };
    if (lastEvent.type === 'goal' && lastEvent.team === 'home') return { emoji: '🙌', label: 'GOL! zıplıyor!', anim: 'animate-bounce' };
    if (lastEvent.type === 'goal' && lastEvent.team === 'away') return { emoji: '😫', label: 'başını tutuyor', anim: 'animate-pulse' };
    if (lastEvent.type === 'offside') return { emoji: '🤦', label: 'ofsayt!', anim: '' };
    if (lastEvent.type === 'tackle') return { emoji: '👏', label: 'müdahale!', anim: '' };
    if (lastEvent.type === 'chance' || lastEvent.type === 'save') return { emoji: '😬', label: 'gergin', anim: 'animate-pulse' };
    if (lastEvent.type === 'card') return { emoji: '🤬', label: 'hakeme itiraz!', anim: '' };
    if (lastEvent.type === 'substitution') return { emoji: '👏', label: 'alkışlıyor', anim: '' };
    return { emoji: '🧑‍💼', label: 'izliyor', anim: '' };
  }, [lastEvent, minute, phase, isWet, isSnow, avgEnergy]);

  const awayShape = useMemo(() => getAwayShape(tactics?.formation || '4-3-3'), [tactics?.formation]);

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1 px-1">
        <span className="flex items-center gap-1 truncate"><span className="text-base">{awayLogo}</span> {awayName} <span className="text-red-400/80">▲ üst kale</span></span>
        <span className="text-slate-500">2D SAHA • {tactics?.formation || '4-3-3'} • DL {defensiveLine} • G {width} • Pr {pressingIntensity}</span>
        <span className="flex items-center gap-1 truncate"><span className="text-emerald-400/80">alt kale ▼</span> {homeName} <span className="text-base">{homeLogo}</span></span>
      </div>

      <div className={`relative w-full h-52 sm:h-60 lg:h-[300px] xl:h-[340px] rounded-xl overflow-hidden border-2 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] ${lastGoal ? 'animate-goal-flash border-emerald-400/60 shadow-[0_0_32px_rgba(16,185,129,0.5)]' : paused ? 'border-sky-400/70' : slowMo ? 'border-amber-400/70' : 'border-white/30'}`}
        style={{
          background: isSnow
            ? 'repeating-linear-gradient(0deg, #e0f2fe 0px, #e0f2fe 22px, #f0f9ff 22px, #f0f9ff 44px)'
            : isWet
            ? 'repeating-linear-gradient(0deg, #14532d 0px, #14532d 22px, #166534 22px, #166534 44px)'
            : 'repeating-linear-gradient(0deg, #15803d 0px, #15803d 22px, #16a34a 22px, #16a34a 44px)',
        }}
      >
        {/* Işık */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{ background: 'radial-gradient(800px circle at 50% 0%, white, transparent 70%)' }} />
        {/* Çizgiler */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-14 border-2 border-t-0 border-white/40" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 border-2 border-t-0 border-white/40" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-14 border-2 border-b-0 border-white/40" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-7 border-2 border-b-0 border-white/40" />
          {/* Ofsayt çizgisi — defans çizgisine göre */}
          <div className="absolute left-0 right-0 h-[1px] bg-sky-400/60 border-dashed" style={{ top: `${Math.max(12, Math.min(38, 28 - (defensiveLine - 50) * 0.28))}%` }} />
          <div className="absolute left-0 right-0 h-[1px] bg-red-400/50 border-dashed" style={{ bottom: `${Math.max(12, Math.min(38, 28 + (defensiveLine - 50) * 0.22))}%` }} />
        </div>

        {/* Hava overlayleri — sahada belli olsun */}
        {isWet && (
          <>
            <div className="absolute inset-0 pointer-events-none opacity-40 rounded-xl" style={{ background: 'linear-gradient(180deg, rgba(148,163,184,0.22) 0%, transparent 42%, rgba(14,165,233,0.18) 100%)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-20">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="absolute w-[1px] h-6 bg-sky-200/60" style={{ left: `${(i * 7 + tick * 2) % 100}%`, top: `${(i * 13 + tick * 5) % 100}%`, transform: 'rotate(18deg)', animation: 'rainFall 400ms linear infinite' }} />
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-800/50 to-transparent pointer-events-none" />
            <div className="absolute top-1 right-2 bg-sky-900/80 backdrop-blur px-1.5 py-0.5 rounded-full text-[8px] font-bold text-sky-100 border border-sky-700/40">🌧️ ZEMİN ISLAK — KAYGAN + FAUL RİSKİ</div>
          </>
        )}
        {isSnow && (
          <>
            <div className="absolute inset-0 pointer-events-none opacity-50 rounded-xl" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(186,230,253,0.25) 100%)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-30">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={{ left: `${(i * 11 + tick) % 100}%`, top: `${(i * 17 + tick * 0.7) % 100}%`, animation: `snowFall ${2 + i % 3}s linear infinite` }} />
              ))}
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: 'radial-gradient(300px circle at 30% 20%, white, transparent)' }} />
            <div className="absolute top-1 right-2 bg-slate-100/90 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-slate-700 border">❄️ KARLI SAHA — TOP SEKMİYOR</div>
          </>
        )}
        {isFog && (
          <>
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-gradient-to-b from-slate-200/30 via-white/20 to-slate-200/30 blur-[1px]" />
            <div className="absolute top-1 right-2 bg-slate-600/70 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-slate-100">🌫️ SİS — GÖRÜŞ DÜŞÜK</div>
          </>
        )}
        {isWind && (
          <div className="absolute top-1 right-2 bg-amber-900/60 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-amber-100">💨 RÜZGARLI — UZUN TOP RİSKLİ</div>
        )}

        {/* Menajer */}
        <div className="absolute bottom-0 right-[4%] flex flex-col items-center pointer-events-none z-10">
          <div className="mb-0.5 bg-white text-black text-[7px] font-bold px-1.5 py-0.5 rounded-full border border-slate-300 shadow whitespace-nowrap">{managerReaction.label}</div>
          <div className={`w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow flex items-center justify-center text-[13px] ${managerReaction.anim}`}><span>{managerReaction.emoji}</span></div>
          <div className="text-[6px] font-black text-white bg-black/60 px-1 rounded -mt-0.5">HOCA</div>
          <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-white/80" />
        </div>

        {/* Rakip — zonal marking */}
        {awayShape.map((p, i) => {
          const isKeeper = i === 0;
          const simAway0Dive = i === 0 && simMap.get('o-1')?.action === 'dive';
          const chase = (0.12 + (i > 7 ? 0.18 : 0)) * (0.55 + fatigueFactor * 0.45);
          const keeperSave = !!simAway0Dive || (lastAttack && (lastAttack.type === 'save' || lastAttack.type === 'chance') && minute - lastAttack.minute <= 1);
          const simAway = simMap.get(`o-${i + 1}`);
          const tgtY = simAway ? simAway.t : isKeeper ? 7 + Math.max(0, Math.min(9, (ball.y - 6) * 0.12)) : p.t + awayBallInfluence * 2.5 + (ball.y - 50) * chase * 0.22;
          const tgtX = simAway ? simAway.l : isKeeper ? 50 + (ball.x - 50) * 0.16 : p.l + (ball.x - 50) * chase * 0.18 + Math.sin(tick * 0.55 + i) * 0.9 * fatigueFactor;
          return (
            <div key={`away-${i}`} className={`absolute ${isKeeper ? 'w-6 h-6 lg:w-7 lg:h-7 bg-red-800 border-2 border-amber-300 text-[10px]' : 'w-4 h-4 lg:w-5 lg:h-5 bg-red-600 border border-white/80 text-[7px]'} rounded-full shadow flex items-center justify-center font-bold text-white ${isKeeper && keeperSave ? 'animate-keeper-save' : ''}`}
              style={{ top: `${Math.max(6, Math.min(94, tgtY))}%`, left: `${Math.max(8, Math.min(92, tgtX))}%`, transform: 'translate(-50%, -50%)', transition: `all ${motionMs(420 + (1 - fatigueFactor) * 180)}ms ease-out` }}>
              {isKeeper ? '🧤' : i + 1}
            </div>
          );
        })}

        {/* Bizim takım — zonal marking ile formasyon korunur */}
        {lineup.map(p => {
          const isOff = sentOff.includes(p.id);
          if (isOff) return null;
          const isKeeper = p.role === 'KL';
          const simGK = simMap.get(`u-${p.id}`);
          const keeperSave = (isKeeper && simGK?.action === 'dive') || (isKeeper && lastAttack?.team === 'away' && (lastAttack.type === 'save' || lastAttack.type === 'chance') && minute - lastAttack.minute <= 1);
          const isCarrier = carrierId === p.id && possession > 38 && phase !== 'half';
          const isSlipping = slipId === p.id;
          const simP = simMap.get(`u-${p.id}`);
          const base = simP ?? zonalShift(p.t ?? 50, p.l ?? 50, p.role);
          const eEff = effectiveEnergy(p);
          const tired = eEff < 42 || minute > 76;
          const chaseBase = isCarrier ? 0.42 : p.role === 'FW' ? 0.18 : p.role === 'OS' ? 0.15 : p.role === 'SB' ? 0.10 : 0.07;
          const chase = chaseBase * (0.55 + fatigueFactor * 0.45) * (isWet ? 0.88 : 1) * (pressingIntensity > 70 ? 1.15 : 1);
          const jitter = (isCarrier ? 1.6 : 0.9) * fatigueFactor * (isWet ? 1.18 : 1);
          const dynT = simP ? simP.t : isKeeper ? 93 - Math.max(0, Math.min(8, (94 - ball.y) * 0.10)) : base.t * (1 - chase) + ball.y * chase + Math.sin(tick * 0.7 + p.id * 0.4) * jitter;
          const dynL = simP ? simP.l : isKeeper ? 50 + (ball.x - 50) * 0.16 : base.l * (1 - chase) + ball.x * chase + Math.cos(tick * 0.6 + p.id * 0.5) * jitter;
          const clampedT = Math.max(7, Math.min(93, dynT));
          const clampedL = Math.max(7, Math.min(93, dynL));
          const energyPct = Math.max(0, Math.min(100, eEff));
          const energyColor = energyPct > 58 ? 'bg-emerald-400' : energyPct > 32 ? 'bg-amber-400' : 'bg-red-500';
          return (
            <div key={`home-${p.id}`} className="absolute" style={{ top: `${clampedT}%`, left: `${clampedL}%`, transform: `translate(-50%, -50%) ${isSlipping ? 'rotate(72deg) scale(0.92)' : ''}`, transition: isSlipping ? 'transform 260ms ease' : undefined }}>
              <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border shadow flex items-center justify-center text-[8px] font-black ${p.injured ? 'bg-orange-500 text-black border-white' : isSlipping ? 'bg-sky-200 text-sky-900 border-sky-400' : keeperSave ? 'bg-amber-400 text-black border-white scale-125' : isKeeper ? 'bg-amber-500 text-black border-white' : isCarrier ? 'bg-white text-emerald-700 border-emerald-400 scale-110' : tired ? 'bg-emerald-300/90 text-black border-white/80' : 'bg-emerald-400 text-black border-white'}`}
                style={{ transition: isCarrier ? `all ${motionMs(320)}ms cubic-bezier(0.34,1.2,0.64,1)` : isSlipping ? `all ${motionMs(260)}ms ease` : `all ${motionMs(520 + (1 - fatigueFactor) * 220)}ms ease-out`, boxShadow: isSlipping ? '0 0 0 2px rgba(125,211,252,0.8)' : isCarrier ? '0 0 10px rgba(16,185,129,0.9)' : tired ? '0 0 6px rgba(251,146,60,0.35)' : undefined, opacity: isSlipping ? 1 : tired ? 0.92 : 1 }}
                title={`${p.name} (${p.role}) • ⚡${Math.round(energyPct)}%${isSlipping ? ' — kaydı! 💦' : isCarrier ? ' — top sürüyor' : tired ? ' — yorgun' : ''}`}>
                {isSlipping ? '💦' : keeperSave ? '🧤' : isKeeper ? 'K' : isCarrier ? '●' : p.ovr > 84 ? '★' : ''}
              </div>
              {(minute > 68 || isCarrier || energyPct < 48) && (
                <div className="absolute left-1/2 -translate-x-1/2 top-[22px] lg:top-[26px] w-8 h-[3px] bg-black/55 rounded-full overflow-hidden border border-white/20">
                  <div className={`h-full ${energyColor}`} style={{ width: `${energyPct}%`, transition: 'width 600ms ease' }} />
                </div>
              )}
            </div>
          );
        })}

        <div className="absolute w-3.5 h-3.5 rounded-full bg-white border border-slate-800 shadow-lg flex items-center justify-center text-[8px]"
          style={{ top: `${ball.y}%`, left: `${ball.x}%`, transform: 'translate(-50%, -50%)', transition: isWet ? `all ${motionMs(560)}ms cubic-bezier(0.22,0.9,0.36,1)` : `all ${motionMs(380)}ms cubic-bezier(0.22,1,0.36,1)`, boxShadow: isWet ? '0 2px 10px rgba(0,0,0,0.35), 0 0 0 2px rgba(125,211,252,0.9)' : '0 2px 8px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.9)', animation: !paused && phase !== 'half' && phase !== 'pre' ? `ballBounce ${motionMs(380)}ms ease ${tick % 2 ? '0ms' : '80ms'} infinite alternate` : undefined }}>
          ⚽
        </div>
        <div className="absolute w-2 h-2 rounded-full bg-white/55 border border-white/60 pointer-events-none" style={{ top: `${ball.y}%`, left: `${ball.x}%`, transform: `translate(-50%, -50%) translate(${Math.sin(tick) * 2}px, ${Math.cos(tick) * 1.5}px) scale(0.7)`, transition: `all ${motionMs(520)}ms ease-out`, opacity: paused ? 0.2 : 0.45 }} />
        <div className="absolute top-1 right-1 bg-black/50 rounded px-1.5 py-0.5 text-[9px] text-white font-bold">{isHome ? 'EV' : 'DEP'} • {Math.max(0, 11 - sentOff.length)} kişi</div>
        <div className="absolute bottom-1 left-1 bg-black/50 rounded px-1.5 py-0.5 text-[9px] text-white font-mono">{minute}'</div>
        {phase === 'half' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">⏸️ Devre arası</div>}
        {paused && phase !== 'half' && <div className="absolute inset-0 z-20 bg-sky-950/45 backdrop-blur-[1.5px] flex flex-col items-center justify-center gap-1 pointer-events-none"><div className="bg-sky-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg">⏸️ SİMÜLASYON DONDURULDU</div></div>}
        {slowMo && !paused && phase !== 'half' && <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 45%, rgba(245,158,11,0.22) 100%)' }}><div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[10px] font-black px-2.5 py-1 rounded-full shadow animate-pulse">🐢 YAVAŞ ÇEKİM — KART</div></div>}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-emerald-400 font-bold w-10 text-right">%{Math.round(possession)}</span>
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${possession}%` }} />
          <div className="bg-red-500 h-full transition-all" style={{ width: `${100 - possession}%` }} />
        </div>
        <span className="text-[10px] text-red-400 font-bold w-10">%{Math.round(100 - possession)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-black tracking-wide ${tempoColor}`}>{tempoLabel} • {minute}' • Zonal Marking Aktif</span>
        <span className="text-[10px] text-slate-400 flex items-center gap-1"><span className={`inline-block w-1.5 h-1.5 rounded-full ${avgEnergy > 58 ? 'bg-emerald-400' : avgEnergy > 32 ? 'bg-amber-400 animate-pulse' : 'bg-red-500 animate-pulse'}`} />Ort. ⚡ %{avgEnergy}</span>
      </div>

      <div className="mt-1 space-y-0.5">
        {recent.map((e, i) => (
          <div key={i} className={`text-[10px] truncate ${eventColor(e.type)} ${i === 0 ? 'font-bold' : 'opacity-70'}`}>
            <span className="text-slate-500">[{e.minute}']</span> {e.description} {e.xg ? <span className="text-[9px] text-slate-500">xG {e.xg.toFixed(2)}</span> : null}
          </div>
        ))}
      </div>
      <style>{`@keyframes keeperSave{0%{transform:translate(-50%,-50%) scale(1)}45%{transform:translate(-65%,-50%) rotate(-18deg) scale(1.28)}100%{transform:translate(-50%,-50%) scale(1)}} @keyframes ballBounce{0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-58%) scale(1.05)}} @keyframes rainFall{0%{transform:translateY(-10px) rotate(18deg)}100%{transform:translateY(20px) rotate(18deg)}} @keyframes snowFall{0%{transform:translateY(-10px) translateX(0)}50%{transform:translateY(50px) translateX(10px)}100%{transform:translateY(100px) translateX(-5px)}} .animate-keeper-save{animation:keeperSave 900ms ease-in-out}`}</style>
    </div>
  );
};
