import React, { useMemo } from 'react';
import { MatchEvent, Player } from '../types/game';

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
  isHome, lineup, sentOff, phase
}) => {
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

  // Top pozisyonu: son hücum olayına ve top hakimiyetine göre
  const ball = useMemo(() => {
    let x = 50 + (possession - 50) * 0.35;
    let y = 50;

    if (lastAttack) {
      const isUserAttack = lastAttack.team === 'home';
      const deep = lastAttack.type === 'goal' || lastAttack.type === 'penalty';
      if (isUserAttack) {
        y = deep ? 6 : 20 + Math.random() * 18;
        x = 25 + Math.random() * 50;
      } else {
        y = deep ? 94 : 62 + Math.random() * 18;
        x = 25 + Math.random() * 50;
      }
    }
    return { x: Math.max(4, Math.min(96, x)), y: Math.max(4, Math.min(96, y)) };
  }, [lastAttack, possession, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  const recent = events.slice(-3).reverse();

  const eventColor = (t: MatchEvent['type']) =>
    t === 'goal' || t === 'penalty' ? 'text-emerald-400'
      : t === 'card' ? 'text-yellow-400'
      : t === 'injury' ? 'text-orange-400'
      : t === 'substitution' ? 'text-blue-400'
      : 'text-slate-300';

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

      {/* Saha */}
      <div className={`relative w-full h-40 lg:h-52 rounded-xl overflow-hidden border-2 border-white/30 ${lastGoal ? 'animate-goal-flash' : ''}`}
        style={{
          background:
            'repeating-linear-gradient(0deg, #15803d 0px, #15803d 22px, #16a34a 22px, #16a34a 44px)',
        }}
      >
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

        {/* Rakip oyuncular */}
        {AWAY_SHAPE.map((p, i) => (
          <div
            key={`away-${i}`}
            className="absolute w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-red-600 border border-white/80 shadow flex items-center justify-center text-[7px] font-bold text-white"
            style={{ top: `${p.t}%`, left: `${p.l}%`, transform: 'translate(-50%, -50%)', transition: 'all 1.2s ease-in-out' }}
          >
            {i + 1}
          </div>
        ))}

        {/* Bizim oyuncular */}
        {lineup.map(p => {
          const isOff = sentOff.includes(p.id);
          if (isOff) return null;
          return (
            <div
              key={`home-${p.id}`}
              className={`absolute w-5 h-5 lg:w-6 lg:h-6 rounded-full border shadow flex items-center justify-center text-[8px] font-black ${p.injured ? 'bg-orange-500 text-black' : 'bg-emerald-400 text-black'} border-white`}
              style={{ top: `${p.t ?? 50}%`, left: `${p.l ?? 50}%`, transform: 'translate(-50%, -50%)', transition: 'all 1.2s ease-in-out' }}
              title={`${p.name} (${p.role})`}
            >
              {p.ovr > 84 ? '★' : p.role === 'KL' ? 'K' : ''}
            </div>
          );
        })}

        {/* Top */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white border border-slate-800 shadow-lg flex items-center justify-center text-[8px]"
          style={{ top: `${ball.y}%`, left: `${ball.x}%`, transform: 'translate(-50%, -50%)', transition: 'all 0.7s ease-out' }}
        >
          ⚽
        </div>

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
      </div>

      {/* Top hakimiyeti barı */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-emerald-400 font-bold w-10 text-right">%{Math.round(possession)}</span>
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${possession}%` }} />
          <div className="bg-red-500 h-full transition-all" style={{ width: `${100 - possession}%` }} />
        </div>
        <span className="text-[10px] text-red-400 font-bold w-10">%{Math.round(100 - possession)}</span>
      </div>

      {/* Son olaylar */}
      <div className="mt-1 space-y-0.5">
        {recent.map((e, i) => (
          <div key={i} className={`text-[10px] truncate ${eventColor(e.type)} ${i === 0 ? 'font-bold' : 'opacity-70'}`}>
            <span className="text-slate-500">[{e.minute}']</span> {e.description}
          </div>
        ))}
      </div>
    </div>
  );
};
