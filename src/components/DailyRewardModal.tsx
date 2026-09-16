import React from 'react';
import { sfx } from '../utils/sound';

interface DailyRewardModalProps {
  day: number;
  budget: number;
  tokens: number;
  loginStreak: number;
  onClose: () => void;
}

const TABLE = [
  { day: 1, budget: 40000, tokens: 0, icon: '💵' },
  { day: 2, budget: 60000, tokens: 0, icon: '💵' },
  { day: 3, budget: 90000, tokens: 1, icon: '🎮' },
  { day: 4, budget: 120000, tokens: 1, icon: '🎮' },
  { day: 5, budget: 180000, tokens: 1, icon: '💰' },
  { day: 6, budget: 250000, tokens: 2, icon: '💰' },
  { day: 7, budget: 400000, tokens: 3, icon: '🎁' },
];

/** Günlük giriş ödülü — seri arttıkça ödül büyür */
export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ day, budget, tokens, loginStreak, onClose }) => {
  const idx = Math.min(day, 7) - 1;

  return (
    <div className="fixed inset-0 bg-black/85 z-[78] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-amber-900/60 to-slate-900 rounded-3xl border border-amber-500/40 p-5">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2 animate-float">🎁</div>
          <h2 className="text-2xl font-black text-amber-400">GÜNLÜK ÖDÜL</h2>
          <p className="text-slate-300 text-xs mt-1">
            {loginStreak > 1
              ? `🔥 ${loginStreak} günlük seri! Yarın daha büyük ödül seni bekliyor.`
              : 'Her gün giriş yap, seriyi büyüt, ödülü katla!'}
          </p>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {TABLE.map((row, i) => {
            const isToday = i === idx;
            const isPast = i < idx;
            return (
              <div
                key={row.day}
                className={`rounded-lg p-1.5 text-center border text-[9px] ${
                  isToday ? 'bg-amber-500/30 border-amber-400 text-white animate-pulse'
                  : isPast ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-700/40 border-transparent text-slate-400'
                }`}
              >
                <div className="font-black text-[10px]">{row.day}. Gün</div>
                <div className="text-base">{row.icon}</div>
                <div>${(row.budget / 1000).toFixed(0)}K</div>
                {row.tokens > 0 && <div className="text-violet-300">+{row.tokens}🎮</div>}
              </div>
            );
          })}
        </div>

        <div className="bg-slate-800/70 rounded-2xl p-4 text-center mb-4">
          <div className="text-xs text-slate-400">Bugünün ödülü ({day}. gün)</div>
          <div className="text-3xl font-black text-emerald-400">+${budget.toLocaleString()}</div>
          {tokens > 0 && <div className="text-sm text-violet-300 font-bold mt-1">+{tokens} mini oyun jetonu 🎮</div>}
        </div>

        <button
          onClick={() => { sfx.coin(); onClose(); }}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-white font-black rounded-xl"
        >
          ÖDÜLÜ AL ✅
        </button>
      </div>
    </div>
  );
};
