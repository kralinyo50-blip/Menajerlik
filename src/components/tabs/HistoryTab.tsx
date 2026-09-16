import React from 'react';
import { GameState } from '../../types/game';
import { ROLE_NAMES } from '../../data/constants';

interface HistoryTabProps {
  gameState: GameState;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ gameState }) => {
  // Calculate top scorers
  const allPlayers = [...gameState.team11, ...gameState.bench, ...gameState.academyPlayers];
  const topScorers = [...allPlayers]
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10);

  const topAssisters = [...allPlayers]
    .filter(p => p.assists > 0)
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 10);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Season header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold text-white">Kulüp İstatistikleri</h2>
            <p className="text-slate-400 text-sm">Sezon {gameState.season || 1} • Lig {gameState.leagueLevel}</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="bg-slate-700/50 px-3 py-1.5 rounded-lg text-slate-300">
              🏅 {(gameState.achievements || []).filter(a => a.unlocked).length}/{(gameState.achievements || []).length} başarım
            </span>
            <span className="bg-slate-700/50 px-3 py-1.5 rounded-lg text-slate-300">
              🎮 {gameState.clubStats.minigamesWon || 0} mini oyun
            </span>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl p-4 border border-emerald-500/30 text-center">
            <div className="text-3xl font-black text-emerald-400">{gameState.clubStats.totalWins}</div>
            <div className="text-xs text-emerald-300">Galibiyet</div>
          </div>
          <div className="bg-gradient-to-br from-slate-500/20 to-slate-600/20 rounded-2xl p-4 border border-slate-500/30 text-center">
            <div className="text-3xl font-black text-slate-400">{gameState.clubStats.totalDraws}</div>
            <div className="text-xs text-slate-300">Beraberlik</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl p-4 border border-red-500/30 text-center">
            <div className="text-3xl font-black text-red-400">{gameState.clubStats.totalLosses}</div>
            <div className="text-xs text-red-300">Mağlubiyet</div>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl p-4 border border-amber-500/30 text-center">
            <div className="text-3xl font-black text-amber-400">{gameState.clubStats.totalGoals}</div>
            <div className="text-xs text-amber-300">Toplam Gol</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl p-4 border border-blue-500/30 text-center">
            <div className="text-3xl font-black text-blue-400">{gameState.clubStats.cleanSheets || 0}</div>
            <div className="text-xs text-blue-300">Clean Sheet</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl p-4 border border-purple-500/30 text-center">
            <div className="text-3xl font-black text-purple-400">{gameState.managerRep}</div>
            <div className="text-xs text-purple-300">İtibar</div>
          </div>
        </div>

        {/* Match History */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">📋 Maç Geçmişi</h2>
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            {gameState.matchHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="text-4xl block mb-2">📅</span>
                Henüz maç oynanmadı
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {[...gameState.matchHistory].reverse().map((match, i) => {
                  const isWin = match.homeScore > match.awayScore;
                  const isDraw = match.homeScore === match.awayScore;
                  const resultColor = isWin ? 'bg-emerald-500' : isDraw ? 'bg-slate-500' : 'bg-red-500';
                  const resultText = isWin ? 'G' : isDraw ? 'B' : 'M';

                  return (
                    <div key={i} className="flex items-center p-4 hover:bg-slate-700/30 transition-all">
                      <div className="w-16 text-center">
                        <span className="text-slate-400 text-sm">Hafta</span>
                        <div className="font-bold text-white">{match.week}</div>
                        <span className={`text-[9px] font-black px-1 rounded ${match.isHome ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {match.isHome ? 'EV' : 'DEP'}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-4">
                        <div className="text-right flex-1">
                          <span className="text-lg">{gameState.teamLogo}</span>
                          <span className="ml-2 font-medium text-white">{gameState.teamName}</span>
                        </div>
                        <div className="bg-slate-700/50 px-4 py-2 rounded-xl">
                          <span className="text-2xl font-black text-white">{match.homeScore}</span>
                          <span className="text-slate-400 mx-2">-</span>
                          <span className="text-2xl font-black text-white">{match.awayScore}</span>
                        </div>
                        <div className="text-left flex-1">
                          <span className="text-lg">{match.opponentLogo}</span>
                          <span className="ml-2 font-medium text-white">{match.opponent}</span>
                        </div>
                      </div>
                      <div className="w-20 text-center">
                        <span className={`${resultColor} w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white mx-auto`}>
                          {resultText}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-1">
                          {match.attendance ? `${(match.attendance / 1000).toFixed(1)}K` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top Scorers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">⚽ Gol Krallığı</h2>
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              {topScorers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Henüz gol atılmadı
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {topScorers.map((player, i) => (
                    <div key={player.id} className="flex items-center p-3 hover:bg-slate-700/30">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-3 ${
                        i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-xs text-slate-400">{ROLE_NAMES[player.role]}</div>
                      </div>
                      <div className="text-xl font-bold text-amber-400">⚽ {player.goals}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4">🅰️ Asist Krallığı</h2>
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              {topAssisters.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Henüz asist yapılmadı
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {topAssisters.map((player, i) => (
                    <div key={player.id} className="flex items-center p-3 hover:bg-slate-700/30">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-3 ${
                        i === 0 ? 'bg-blue-500 text-white' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-blue-700 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-xs text-slate-400">{ROLE_NAMES[player.role]}</div>
                      </div>
                      <div className="text-xl font-bold text-blue-400">🅰️ {player.assists}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trophies */}
        {gameState.trophies.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">🏆 Kupa Dolabı</h2>
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-2xl p-6 border border-amber-500/30">
              <div className="flex flex-wrap gap-4 justify-center">
                {gameState.trophies.map((trophy, i) => (
                  <div key={i} className="text-5xl animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                    {trophy}
                  </div>
                ))}
              </div>
              <div className="text-center mt-4 text-amber-300">
                Toplam {gameState.clubStats.leagueTitles} Lig Şampiyonluğu • {gameState.clubStats.cupWins} Kupa
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
