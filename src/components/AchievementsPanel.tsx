import React from 'react';
import { Achievement } from '../types/game';

interface AchievementsPanelProps {
  achievements: Achievement[];
  onClose: () => void;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ achievements, onClose }) => {
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const pct = Math.round((unlocked / total) * 100);

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-amber-500/40 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-amber-400">🏅 Başarımlar</h2>
            <p className="text-sm text-slate-400">{unlocked}/{total} açıldı (%{pct})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-3">
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map(a => (
            <div
              key={a.id}
              className={`rounded-xl p-4 border transition-all ${
                a.unlocked
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-slate-700/30 border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`text-3xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm ${a.unlocked ? 'text-amber-300' : 'text-slate-400'}`}>
                    {a.title}
                    {a.unlocked && <span className="ml-1 text-emerald-400">✓</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.description}</div>
                  {a.reward && (
                    <div className="text-xs text-amber-400/80 mt-1">
                      Ödül: ${a.reward.toLocaleString()}
                    </div>
                  )}
                  {a.unlocked && a.unlockedWeek && (
                    <div className="text-[10px] text-slate-500 mt-1">Hafta {a.unlockedWeek}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
