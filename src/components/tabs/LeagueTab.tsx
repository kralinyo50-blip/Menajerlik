import React, { useState } from 'react';
import { GameState } from '../../types/game';

interface LeagueTabProps {
  gameState: GameState;
}

export const LeagueTab: React.FC<LeagueTabProps> = ({ gameState }) => {
  const [showTransferNews, setShowTransferNews] = useState(false);
  
  const sortedLeague = [...gameState.league].sort((a, b) => 
    b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  );

  const userPosition = sortedLeague.findIndex(t => t.isUser) + 1;
  const userTeam = gameState.league.find(t => t.isUser);
  const userOvr = userTeam?.ovr || 0;

  // Transfer haberleri filtrele
  const transferNews = gameState.news.filter(n => 
    n.includes('transfer') || n.includes('Transfer') || n.includes('📰') || n.includes('🔥')
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Lig Tablosu</h2>
            <p className="text-slate-400">Lig {gameState.leagueLevel} • Hafta {gameState.week}/18</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTransferNews(!showTransferNews)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showTransferNews 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              📰 Transfer Haberleri
            </button>
            <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 text-sm">Sıralamanız:</span>
              <span className={`font-bold ml-2 ${
                userPosition <= 3 ? 'text-emerald-400' : userPosition >= 8 ? 'text-red-400' : 'text-white'
              }`}>{userPosition}. Sıra</span>
            </div>
          </div>
        </div>

        {/* Transfer News Panel */}
        {showTransferNews && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
            <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
              📰 Son Transfer Haberleri
            </h3>
            {transferNews.length > 0 ? (
              <div className="space-y-2">
                {transferNews.slice(0, 5).map((news, i) => (
                  <div key={i} className="bg-slate-800/50 p-3 rounded-lg text-sm text-slate-300">
                    {news}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Henüz transfer haberi yok.</p>
            )}
          </div>
        )}

        {/* Transfer Window Warning */}
        {(gameState.week === 8 || gameState.week === 17) && (
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <div className="text-amber-400 font-bold">Transfer Dönemi Yaklaşıyor!</div>
              <div className="text-amber-300 text-sm">
                Gelecek hafta transfer dönemi kapanıyor. Rakipler güçlenebilir!
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span className="text-slate-400">Üst Lige Yükselme</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-slate-400">Alt Lige Düşme</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">▲</span>
            <span className="text-slate-400">Senden güçsüz</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">▼</span>
            <span className="text-slate-400">Senden güçlü</span>
          </div>
        </div>

        {/* League Table */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="text-left py-4 px-4 text-xs text-emerald-400 font-bold">#</th>
                <th className="text-left py-4 px-4 text-xs text-emerald-400 font-bold">KULÜP</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">OVR</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">O</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">G</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">B</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">M</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">AG</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">YG</th>
                <th className="text-center py-4 px-2 text-xs text-slate-400">AV</th>
                <th className="text-center py-4 px-4 text-xs text-amber-400 font-bold">P</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeague.map((team, index) => {
                const position = index + 1;
                const isUser = team.isUser;
                const goalDiff = team.gf - team.ga;
                const ovrDiff = team.ovr - userOvr;
                
                let rowBg = '';
                if (isUser) rowBg = 'bg-emerald-500/10';
                else if (position <= 3) rowBg = 'bg-emerald-500/5';
                else if (position >= 8) rowBg = 'bg-red-500/5';

                let positionBadge = '';
                if (position === 1) positionBadge = 'bg-amber-500 text-black';
                else if (position <= 3) positionBadge = 'bg-emerald-500/30 text-emerald-400';
                else if (position >= 8) positionBadge = 'bg-red-500/30 text-red-400';
                else positionBadge = 'bg-slate-700/50 text-slate-300';

                // OVR karşılaştırma rengi
                let ovrColor = 'text-slate-400';
                let ovrIcon = '';
                if (!isUser) {
                  if (ovrDiff < -5) { ovrColor = 'text-red-400'; ovrIcon = '🔥'; }
                  else if (ovrDiff < 0) { ovrColor = 'text-orange-400'; ovrIcon = '▼'; }
                  else if (ovrDiff > 5) { ovrColor = 'text-emerald-400'; ovrIcon = '✓'; }
                  else if (ovrDiff > 0) { ovrColor = 'text-emerald-400'; ovrIcon = '▲'; }
                  else { ovrColor = 'text-yellow-400'; ovrIcon = '='; }
                }

                return (
                  <tr 
                    key={team.name} 
                    className={`border-b border-slate-700/30 ${rowBg} ${isUser ? 'font-bold' : ''} hover:bg-slate-700/20 transition-colors`}
                  >
                    <td className="py-4 px-4">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${positionBadge}`}>
                        {position}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{team.logo}</span>
                        <div>
                          <div className={`${isUser ? 'text-emerald-400' : 'text-white'}`}>
                            {team.name}
                            {isUser && <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">SEN</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div className={`font-bold ${isUser ? 'text-emerald-400' : ovrColor}`}>
                        {team.ovr}
                        {!isUser && ovrIcon && (
                          <span className="ml-1 text-xs">{ovrIcon}</span>
                        )}
                      </div>
                      {!isUser && ovrDiff !== 0 && (
                        <div className={`text-xs ${ovrDiff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {ovrDiff > 0 ? '-' : '+'}{Math.abs(ovrDiff)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-2 text-center text-slate-300">{team.o}</td>
                    <td className="py-4 px-2 text-center text-emerald-400">{team.g}</td>
                    <td className="py-4 px-2 text-center text-slate-400">{team.b}</td>
                    <td className="py-4 px-2 text-center text-red-400">{team.m}</td>
                    <td className="py-4 px-2 text-center text-slate-300">{team.gf}</td>
                    <td className="py-4 px-2 text-center text-slate-300">{team.ga}</td>
                    <td className={`py-4 px-2 text-center ${goalDiff > 0 ? 'text-emerald-400' : goalDiff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {goalDiff > 0 ? '+' : ''}{goalDiff}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-lg font-black text-amber-400">{team.p}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* OVR Comparison Chart */}
        <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-sm font-bold text-white mb-4">📊 Güç Karşılaştırması</h3>
          <div className="space-y-2">
            {sortedLeague.slice(0, 5).map((team) => {
              const maxOvr = Math.max(...sortedLeague.map(t => t.ovr));
              const percentage = (team.ovr / maxOvr) * 100;
              const isUser = team.isUser;
              
              return (
                <div key={team.name} className="flex items-center gap-3">
                  <span className="text-lg w-8">{team.logo}</span>
                  <span className={`w-32 text-sm truncate ${isUser ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                    {team.name}
                  </span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isUser ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className={`w-12 text-right font-bold ${isUser ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {team.ovr}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Season Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-bold text-emerald-400 mb-2">🎯 Sezon Hedefi</h3>
            <p className="text-white">{gameState.seasonObjective}</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-bold text-amber-400 mb-2">📅 Transfer Dönemleri</h3>
            <p className="text-slate-300 text-sm">
              Hafta 9: Ara transfer • Hafta 18: Yaz transfer
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-bold text-blue-400 mb-2">📊 Sezon Sonu</h3>
            <p className="text-slate-300 text-sm">
              İlk 3: Yükselme • Son 3: Düşme
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
