import React from 'react';
import { GameState, Sponsor } from '../types/game';
import { SPONSOR_OFFERS } from '../data/constants';

interface SidebarProps {
  gameState: GameState;
  onPlayMatch: () => void;
  onSave: () => void;
  onSignSponsor: (sponsor: Sponsor) => void;
  onOpenAchievements?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ gameState, onPlayMatch, onSave, onSignSponsor, onOpenAchievements }) => {
  const [showSponsorModal, setShowSponsorModal] = React.useState(false);
  
  const avgOvr = gameState.team11.length > 0 
    ? Math.floor(gameState.team11.reduce((acc, p) => acc + p.ovr, 0) / gameState.team11.length)
    : 0;

  const avgEnergy = gameState.team11.length > 0
    ? Math.floor(gameState.team11.reduce((acc, p) => acc + p.energy, 0) / gameState.team11.length)
    : 0;

  const avgMorale = gameState.team11.length > 0
    ? Math.floor(gameState.team11.reduce((acc, p) => acc + p.morale, 0) / gameState.team11.length)
    : 0;

  const nextOpponent = gameState.fixture[gameState.week - 1];
  const weeklyWages = [...gameState.team11, ...gameState.bench].reduce((acc, p) => acc + p.wage, 0);

  const getEnergyColor = (energy: number) => {
    if (energy >= 70) return 'text-emerald-400';
    if (energy >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMoraleIcon = (morale: number) => {
    if (morale >= 80) return '😊';
    if (morale >= 50) return '😐';
    return '😟';
  };

  return (
    <>
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 xl:p-6 border border-slate-700/50 h-full flex flex-col overflow-y-auto">
        {/* Club Info */}
        <div className="text-center mb-4 pb-4 border-b border-slate-700/50">
          <div className="text-5xl xl:text-6xl mb-2 drop-shadow-lg">{gameState.teamLogo}</div>
          <h2 className="text-lg xl:text-xl font-bold text-emerald-400 truncate">{gameState.teamName}</h2>
          <div className="text-xs text-slate-400 mt-1">
            Lig {gameState.leagueLevel} • Sezon {gameState.season || 1}
            {gameState.difficulty && (
              <span className="ml-1 text-amber-400/80">
                • {gameState.difficulty === 'easy' ? '😊' : gameState.difficulty === 'hard' ? '😰' : gameState.difficulty === 'legend' ? '🔥' : '⚖️'}
              </span>
            )}
          </div>
        </div>

        {/* Budget */}
        <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-xl p-3 mb-3 border border-amber-500/30">
          <div className="text-xs text-amber-300 font-medium mb-1">KULÜP KASASI</div>
          <div className="text-xl xl:text-2xl font-black text-amber-400">
            ${gameState.budget.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-300/70 mt-1">
            Maaş (5 haftada bir): ${(weeklyWages * 5).toLocaleString()}
          </div>
          {gameState.week % 5 >= 3 && (
            <div className="text-[10px] text-red-400 mt-1">
              ⏰ {5 - (gameState.week % 5)} maç sonra maaş günü
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-700/30 rounded-lg p-2">
            <div className="text-[10px] text-slate-400">Takım Gücü</div>
            <div className="text-lg font-bold text-emerald-400">⭐ {avgOvr}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2">
            <div className="text-[10px] text-slate-400">Hafta</div>
            <div className="text-lg font-bold text-white">📅 {gameState.week}/18</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2">
            <div className="text-[10px] text-slate-400">Enerji</div>
            <div className={`text-lg font-bold ${getEnergyColor(avgEnergy)}`}>⚡ %{avgEnergy}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2">
            <div className="text-[10px] text-slate-400">Moral</div>
            <div className="text-lg font-bold text-white">{getMoraleIcon(avgMorale)} %{avgMorale}</div>
          </div>
        </div>

        {/* Stadium + Fan meters */}
        <div className="bg-slate-700/30 rounded-lg p-2 mb-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[10px] text-slate-400">🏟️ Stadyum</span>
            <span className="font-bold text-white text-xs">{(gameState.stadiumLvl * 5000).toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div className="text-center">
              <div className="text-slate-500">Taraftar</div>
              <div className={`font-bold ${(gameState.fanHappiness || 60) >= 60 ? 'text-emerald-400' : 'text-orange-400'}`}>
                📣 {gameState.fanHappiness || 60}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-500">Kimya</div>
              <div className={`font-bold ${(gameState.teamChemistry || 55) >= 60 ? 'text-blue-400' : 'text-slate-300'}`}>
                🤝 {gameState.teamChemistry || 55}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-500">Yönetim</div>
              <div className={`font-bold ${(gameState.boardConfidence || 50) >= 50 ? 'text-purple-400' : 'text-red-400'}`}>
                👔 {gameState.boardConfidence || 50}
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-cyan-300/80 bg-cyan-500/10 rounded py-1">
            🎮 Mini oyunlar maç içinde & olaylarda
          </div>
        </div>

        {/* Next Match */}
        <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-xl p-4 mb-4 border border-slate-600/50">
          <div className="text-xs text-emerald-400 font-medium mb-2">SIRADAKİ MAÇI</div>
          {nextOpponent ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{nextOpponent.logo}</span>
                <div>
                  <div className="font-bold text-white">{nextOpponent.name}</div>
                  <div className={`text-sm font-bold ${
                    avgOvr > nextOpponent.ovr ? 'text-emerald-400' : 
                    avgOvr < nextOpponent.ovr ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    OVR: {nextOpponent.ovr}
                    {avgOvr !== nextOpponent.ovr && (
                      <span className="ml-1">
                        ({avgOvr > nextOpponent.ovr ? '+' : ''}{avgOvr - nextOpponent.ovr})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Match Prediction */}
              <div className={`text-xs p-2 rounded-lg text-center font-medium ${
                avgOvr > nextOpponent.ovr + 5 ? 'bg-emerald-500/20 text-emerald-400' :
                avgOvr > nextOpponent.ovr ? 'bg-emerald-500/10 text-emerald-300' :
                avgOvr < nextOpponent.ovr - 5 ? 'bg-red-500/20 text-red-400' :
                avgOvr < nextOpponent.ovr ? 'bg-red-500/10 text-red-300' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {avgOvr > nextOpponent.ovr + 5 ? '🔥 Büyük favori sensin!' :
                 avgOvr > nextOpponent.ovr ? '👍 Favori sensin' :
                 avgOvr < nextOpponent.ovr - 5 ? '😰 Çok zor maç!' :
                 avgOvr < nextOpponent.ovr ? '⚠️ Rakip favori' :
                 '⚖️ Dengeli maç'}
              </div>
            </>
          ) : (
            <div className="text-slate-400">Sezon Sonu</div>
          )}
        </div>

        {/* Active Sponsor */}
        {gameState.activeSponsor && (
          <div className="bg-purple-500/20 rounded-xl p-3 mb-4 border border-purple-500/30">
            <div className="text-xs text-purple-300 font-medium">AKTİF SPONSOR</div>
            <div className="text-sm text-white font-bold mt-1">{gameState.activeSponsor.name}</div>
            <div className="text-xs text-purple-300">
              ${gameState.activeSponsor.income.toLocaleString()}/hafta • {gameState.activeSponsor.weeksLeft} hafta kaldı
            </div>
          </div>
        )}

        {/* Trophies */}
        {gameState.trophies.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 justify-center">
            {gameState.trophies.map((trophy, i) => (
              <span key={i} className="text-2xl drop-shadow-lg" style={{ animationDelay: `${i * 100}ms` }}>
                {trophy}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto space-y-2">
          <button
            onClick={onPlayMatch}
            disabled={gameState.week > 18}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-slate-600 disabled:to-slate-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/40 transition-all duration-300 disabled:shadow-none animate-cta-ring tracking-wide"
          >
            ⚽ MAÇA ÇIK
            {gameState.week <= 18 && (
              <span className="block text-[10px] font-medium text-emerald-100/80 mt-0.5">
                Oyun içi anlar seni bekliyor
              </span>
            )}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowSponsorModal(true)}
              disabled={!!gameState.activeSponsor}
              className="py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white font-medium rounded-lg transition-all text-xs"
            >
              🤝
            </button>
            <button
              onClick={onSave}
              className="py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all text-xs"
            >
              💾
            </button>
            <button
              onClick={onOpenAchievements}
              className="py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-all text-xs"
            >
              🏅
            </button>
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-amber-400">Sponsorluk Anlaşmaları</h3>
              <button onClick={() => setShowSponsorModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {SPONSOR_OFFERS.map((sponsor, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSignSponsor(sponsor);
                    setShowSponsorModal(false);
                  }}
                  className="bg-slate-700/50 hover:bg-slate-600/50 p-4 rounded-xl border border-slate-600 hover:border-purple-500 transition-all text-left"
                >
                  <div className="text-2xl mb-2">{sponsor.icon}</div>
                  <div className="font-bold text-white text-sm">{sponsor.name}</div>
                  <div className="text-emerald-400 font-bold">${sponsor.income.toLocaleString()}/hafta</div>
                  <div className="text-xs text-slate-400 mt-1">{sponsor.duration} hafta • {sponsor.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
