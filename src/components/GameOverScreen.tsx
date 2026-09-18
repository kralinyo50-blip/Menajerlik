import React from 'react';
import { GameState } from '../types/game';

interface GameOverScreenProps {
  gameState: GameState;
  onNewCareer: () => void;
  onLoadSave: () => void;
}

/** Yönetim kurulu güvenini kaybettiğinde gösterilen kariyer sonu ekranı */
export const GameOverScreen: React.FC<GameOverScreenProps> = ({ gameState, onNewCareer, onLoadSave }) => {
  const stats = gameState.clubStats;
  const played = stats.totalWins + stats.totalDraws + stats.totalLosses;
  const winRate = played > 0 ? Math.round((stats.totalWins / played) * 100) : 0;
  const bestPlayers = [...gameState.team11, ...gameState.bench]
    .sort((a, b) => b.goals + b.assists - (a.goals + a.assists))
    .slice(0, 3);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[80] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-gradient-to-b from-red-900/60 to-slate-900 rounded-3xl border border-red-500/40 p-6 my-auto premium-border shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">📉</div>
          <h1 className="text-3xl font-black text-red-400">KOVULDUN!</h1>
          <p className="text-slate-300 mt-2 text-sm">
            {gameState.careerOverReason || 'Yönetim kurulu sözleşmeni feshetti.'}
          </p>
        </div>

        <div className="bg-slate-800/60 rounded-2xl p-4 mb-5">
          <div className="text-center mb-3">
            <div className="text-2xl">{gameState.teamLogo}</div>
            <div className="text-white font-bold">{gameState.teamName}</div>
            <div className="text-slate-400 text-xs">
              Sezon {gameState.season} • Lig {gameState.leagueLevel} • {gameState.week}. hafta
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-slate-700/40 rounded-lg p-2">
              <div className="text-slate-400">Maç</div>
              <div className="text-white font-bold text-lg">{played}</div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2">
              <div className="text-slate-400">Galibiyet %</div>
              <div className="text-emerald-400 font-bold text-lg">{winRate}</div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2">
              <div className="text-slate-400">Kupa</div>
              <div className="text-amber-400 font-bold text-lg">{stats.cupWins}</div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2">
              <div className="text-slate-400">İtibar</div>
              <div className="text-purple-400 font-bold text-lg">{gameState.managerRep}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[11px] mt-2">
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-slate-400">Toplam Seyirci</div>
              <div className="text-white font-bold">{(stats.totalAttendance || 0).toLocaleString()}</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-slate-400">Maçın Adamı</div>
              <div className="text-white font-bold">{stats.motmAwards || 0}</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-slate-400">Kupalar</div>
              <div className="text-white font-bold">
                {gameState.trophies.length > 0 ? gameState.trophies.join(' ') : '—'}
              </div>
            </div>
          </div>

          {bestPlayers.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-slate-400 mb-1">En etkili oyuncuların</div>
              {bestPlayers.map(p => (
                <div key={p.id} className="flex justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
                  <span className="text-white">{p.name}</span>
                  <span className="text-slate-400">⚽ {p.goals} • 🅰️ {p.assists}</span>
                </div>
              ))}
            </div>
          )}

          {gameState.trophies.length > 0 && (
            <div className="text-center mt-3 text-2xl">
              {gameState.trophies.join(' ')}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={onNewCareer}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 shimmer"
          >
            🚀 Yeni Kariyer Başlat
          </button>
          <button
            onClick={onLoadSave}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
          >
            💾 Kayıtlı Oyuna Dön
          </button>
        </div>
        <div className="text-center mt-5 text-[10px] text-slate-500 flex items-center justify-center gap-1.5 opacity-60">
          <span className="kaan-watermark text-[10px]">Made by Kaan</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span>☀️ Bütün Yaz Boyunca Geliştirildi</span>
        </div>
      </div>
    </div>
  );
};
