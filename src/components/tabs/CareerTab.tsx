import React from 'react';
import { GameState, Mission, SkillId } from '../../types/game';
import { SKILLS, managerLevelTitle, xpForLevel } from '../../utils/progression';

interface CareerTabProps {
  gameState: GameState;
  onSpendSkillPoint: (skillId: SkillId) => void;
}

const MISSION_TYPE_LABEL: Record<Mission['type'], { label: string; icon: string; accent: string }> = {
  weekly: { label: 'Haftalık Görevler', icon: '📅', accent: 'text-sky-400' },
  season: { label: 'Sezon Görevleri', icon: '🏁', accent: 'text-amber-400' },
  career: { label: 'Kariyer  <span className="kaan-watermark text-[10px] ml-2 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">MADE BY KAAN</span> Görevleri', icon: '👑', accent: 'text-purple-400' },
};

const MissionRow: React.FC<{ mission: Mission; week: number }> = ({ mission, week }) => {
  const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
  const weeksLeft = mission.expiresWeek ? mission.expiresWeek - week : null;
  return (
    <div className={`rounded-2xl p-3 border ${mission.completed ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-700/40 border-transparent'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>{mission.icon}</span>
            <span className="truncate">{mission.title}</span>
            {mission.completed && <span className="text-emerald-400 text-xs">✓</span>}
          </div>
          <div className="text-[11px] text-slate-400">{mission.description}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-amber-400 font-bold">${mission.rewardBudget.toLocaleString()}</div>
          <div className="text-[10px] text-violet-300">+{mission.rewardXp} XP{mission.rewardTokens ? ` • +${mission.rewardTokens} 🎮` : ''}</div>
          {weeksLeft !== null && weeksLeft > 0 && <div className="text-[10px] text-slate-500">{weeksLeft} hafta kaldı</div>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${mission.completed ? 'bg-emerald-500' : 'bg-sky-500'}`}
            style={{ width: `${Math.max(3, pct)}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-300 w-16 text-right">
          {Math.min(mission.progress, mission.target).toLocaleString()} / {mission.target.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export const CareerTab: React.FC<CareerTabProps> = ({ gameState, onSpendSkillPoint }) => {
  const level = gameState.managerLevel || 1;
  const xp = gameState.managerXp || 0;
  const xpNeed = xpForLevel(level);
  const xpPct = Math.min(100, Math.round((xp / xpNeed) * 100));
  const points = gameState.skillPoints || 0;
  const missions = gameState.missions || [];
  const cs = gameState.clubStats;
  const played = (cs.totalWins || 0) + (cs.totalDraws || 0) + (cs.totalLosses || 0);

  return (
    <div className="h-full relative overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Menajer profili */}
        <div className="bg-gradient-to-r from-violet-900/50 to-slate-800/60 rounded-2xl border border-violet-500/30 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex flex-col items-center justify-center font-black text-white">
                <span className="text-[9px] leading-none">SEVİYE</span>
                <span className="text-xl leading-none">{level}</span>
              </div>
              <div>
                <div className="text-white font-bold text-lg">{managerLevelTitle(level)}</div>
                <div className="text-xs text-slate-300">
                  İtibar: {gameState.managerRep} • Sezon {gameState.season} • {played} maç
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-300">Yetenek Puanı</div>
              <div className={`text-2xl font-black ${points > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                🧠 {points}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
              <span>Seviye {level} → {level + 1}</span>
              <span>{xp} / {xpNeed} XP</span>
            </div>
            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: `${Math.max(2, xpPct)}%` }} />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              XP: galibiyet 25 • beraberlik 10 • gol başına +1 • görev ödülleri • günlük giriş
            </div>
          </div>
        </div>

        {/* Beceri ağacı */}
        <div className="bg-slate-800/70 backdrop-blur-xl backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-emerald-400">🧠 Menajer Becerileri</h3>
            {points > 0 && <span className="text-[11px] text-amber-300">Harcanmayı bekleyen {points} puan var!</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SKILLS.map(skill => {
              const lvl = gameState.skills?.[skill.id] ?? 0;
              const maxed = lvl >= skill.max;
              const canBuy = points > 0 && !maxed;
              return (
                <div key={skill.id} className={`rounded-2xl p-3 border ${maxed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700/60 bg-slate-700/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl">{skill.icon}</div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: skill.max }).map((_, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${i < lvl ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-white font-bold text-sm mt-1">{skill.name}</div>
                  <div className="text-[10px] text-slate-400">{skill.desc}</div>
                  <div className="text-[10px] text-sky-300 mt-1">{skill.effectPerLevel}</div>
                  <button
                    disabled={!canBuy}
                    onClick={() => onSpendSkillPoint(skill.id)}
                    className={`w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      maxed ? 'bg-emerald-600/30 text-emerald-300 cursor-default'
                      : canBuy ? 'bg-violet-600 hover:bg-violet-500 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {maxed ? 'MAKSİMUM' : canBuy ? 'Geliştir (1 puan)' : 'Puan yok'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Görevler */}
        <div className="space-y-3">
          {(['weekly', 'season', 'career'] as const).map(type => {
            const list = missions.filter(m => m.type === type);
            if (list.length === 0) return null;
            const meta = MISSION_TYPE_LABEL[type];
            const doneCount = list.filter(m => m.completed).length;
            return (
              <div key={type} className="bg-slate-800/70 backdrop-blur-xl backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
                <h3 className={`text-sm font-bold mb-3 ${meta.accent} flex items-center justify-between`}>
                  <span>{meta.icon} {meta.label}</span>
                  <span className="text-[11px] text-slate-400">{doneCount}/{list.length} tamamlandı</span>
                </h3>
                <div className="space-y-2">
                  {list.map(m => <MissionRow key={m.id} mission={m} week={gameState.week} />)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Kariyer istatistikleri */}
        <div className="bg-slate-800/70 backdrop-blur-xl backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-3">📊 Kariyer Kaydı</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-center text-xs">
            {[
              { label: 'Galibiyet', value: cs.totalWins || 0, color: 'text-emerald-400' },
              { label: 'Beraberlik', value: cs.totalDraws || 0, color: 'text-slate-300' },
              { label: 'Mağlubiyet', value: cs.totalLosses || 0, color: 'text-red-400' },
              { label: 'Atılan Gol', value: cs.totalGoals || 0, color: 'text-amber-400' },
              { label: 'Clean Sheet', value: cs.cleanSheets || 0, color: 'text-blue-400' },
              { label: 'MOTM Ödülü', value: cs.motmAwards || 0, color: 'text-purple-400' },
              { label: 'Toplam Seyirci', value: (cs.totalAttendance || 0).toLocaleString(), color: 'text-cyan-400' },
              { label: 'Transfer', value: cs.transfers || 0, color: 'text-lime-400' },
              { label: 'Altyapı Çıkışı', value: cs.youthPromoted || 0, color: 'text-green-400' },
              { label: 'Penaltı Zaferi', value: cs.penaltyWins || 0, color: 'text-orange-400' },
              { label: 'Kırmızı Kart', value: cs.redCards || 0, color: 'text-rose-400' },
              { label: 'Kupa', value: `${cs.leagueTitles || 0}L / ${cs.cupWins || 0}K`, color: 'text-amber-300' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-800/70 backdrop-blur-xl backdrop-blur-xl border border-slate-700/60 shadow-xl backdrop-blur rounded-2xl p-3 border border-slate-700/40 shadow-sm">
                <div className="text-slate-400 text-[10px]">{stat.label}</div>
                <div className={`font-black text-base ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
          {gameState.trophies.length > 0 && (
            <div className="text-center text-2xl mt-3">{gameState.trophies.join(' ')}</div>
          )}
        </div>
      </div>
    </div>
  );
};
