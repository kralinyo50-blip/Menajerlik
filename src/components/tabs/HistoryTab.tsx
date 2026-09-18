import React from 'react';
import { GameState } from '../../types/game';
import { ROLE_NAMES, PHILOSOPHIES } from '../../data/constants';

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
    <div className="h-full relative overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Season header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Kulüp İstatistikleri</h2>
            <p className="text-slate-400 text-sm">Sezon {gameState.season || 1} • Lig {gameState.leagueLevel}</p>
          </div>
          <div className="flex gap-2 text-xs">
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
          <h2 className="text-xl font-black tracking-tight text-white mb-4">📋 Maç Geçmişi</h2>
          <div className="bg-slate-800/70 backdrop-blur-xl backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden">
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
                        <div className="bg-slate-700/50 px-4 py-2 rounded-2xl">
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
            <h2 className="text-xl font-black tracking-tight text-white mb-4">⚽ Gol Krallığı</h2>
            <div className="bg-slate-800/70 backdrop-blur-xl backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden">
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
                        <div className="text-xs text-slate-400 leading-relaxed">{ROLE_NAMES[player.role]}</div>
                      </div>
                      <div className="text-xl font-black tracking-tight text-amber-400">⚽ {player.goals}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight text-white mb-4">🅰️ Asist Krallığı</h2>
            <div className="bg-slate-800/70 backdrop-blur-xl backdrop-blur-xl rounded-2xl border border-slate-700/60 shadow-xl overflow-hidden">
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
                        <div className="text-xs text-slate-400 leading-relaxed">{ROLE_NAMES[player.role]}</div>
                      </div>
                      <div className="text-xl font-black tracking-tight text-blue-400">🅰️ {player.assists}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kulüp Kimliği Özeti + Müze Rafı — 3D */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/60 p-5 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.08),transparent_60%),radial-gradient(ellipse_at_bottom,_rgba(139,92,246,0.08),transparent_60%)] pointer-events-none" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">🏛️ Kulüp Müzesi & Kimlik <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] px-2 py-1 rounded-full tracking-widest">3D VİTRİN</span></h2>
              {(() => {
                const phil = PHILOSOPHIES.find(p=> p.id=== (gameState.clubPhilosophy as any));
                const happy = (gameState as any).ultrasHappiness ?? 65;
                return (
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2">
                    <span className="bg-slate-900/60 border border-slate-700/50 px-2.5 py-1 rounded-full">Felsefe: {phil ? `${phil.icon} ${phil.name}` : '— Seçilmedi (Ofis’ten seç)'}</span>
                    <span className={`px-2.5 py-1 rounded-full border text-xs ${happy>=70?'bg-red-500/15 border-red-500/30 text-red-300': happy>=50?'bg-amber-500/15 border-amber-500/30 text-amber-300':'bg-slate-700 border-slate-600 text-slate-300'}`}>Ultras: %{happy} {happy>=70?'🔥':' • ' + (happy>=50?'dengede':'homurdanıyor')}</span>
                    <span className="bg-slate-900/60 border border-slate-700/50 px-2.5 py-1 rounded-full">Müze: {(gameState.museum||[]).length} sezon</span>
                  </div>
                );
              })()}
            </div>
            <div className="text-right text-xs text-slate-400">
              <div className="font-bold text-white">{gameState.teamLogo} {gameState.teamName}</div>
              <div>Sezon {gameState.season} • Lig {gameState.leagueLevel} • {gameState.trophies.length} kupa</div>
            </div>
          </div>

          {/* Ahşap raf */}
          <div className="relative mt-5">
            <div className="h-[118px] rounded-[18px] bg-gradient-to-b from-amber-900/40 via-amber-800/30 to-amber-950/50 border border-amber-900/40 shadow-inner flex items-end justify-center gap-3 px-4 pb-3 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize:"18px 18px"}} />
              {/* Işık */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[70%] h-10 bg-amber-300/20 blur-2xl rounded-full pointer-events-none" />
              {gameState.trophies.length === 0 ? (
                <div className="text-amber-200/70 text-sm py-8">Henüz kupa yok — ilk şampiyonluğu müzeye koy! 🏆</div>
              ) : (
                gameState.trophies.map((tr, i) => (
                  <div key={i} className="relative flex flex-col items-center">
                    <div className="text-4xl sm:text-5xl drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)] animate-bounce" style={{animationDelay:`${i*90}ms`, animationDuration:"2.6s"}}>{tr}</div>
                    <div className="w-10 h-1.5 bg-black/30 blur-[2px] rounded-full mt-1" />
                    <div className="text-[9px] text-amber-200/60 mt-1">#{i+1}</div>
                  </div>
                ))
              )}
            </div>
            <div className="h-3 mx-4 -mt-1 rounded-b-xl bg-gradient-to-b from-amber-950/60 to-black/40 border-x border-b border-amber-900/30 shadow-xl" />
            <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
              <span>Toplam {gameState.clubStats.leagueTitles} Lig • {gameState.clubStats.cupWins} Kupa</span>
              <span className="hidden sm:inline">Işıklandırılmış vitrin — her sezonun kartı müzede saklanır</span>
            </div>
          </div>

          {/* Sezon şeridi */}
          <div className="mt-4">
            <div className="text-[11px] tracking-widest font-bold text-slate-500 mb-2">SEZON ŞERİDİ — MÜZE KAYDI</div>
            {(gameState.museum||[]).length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-4 text-sm text-slate-400 flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <span>İlk sezon bitince buraya <b className="text-white">sezon kartı</b> düşecek — konum, kupalar, gol kralı ve bütçe ile birlikte. Şu an <b className="text-amber-300">Sezon {gameState.season} Hafta {gameState.week}</b> oynanıyor.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...(gameState.museum||[])].slice().reverse().map(entry => (
                  <div key={entry.season} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-3 flex gap-3 hover:border-amber-500/30 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-violet-500/20 border border-amber-500/20 flex flex-col items-center justify-center">
                      <div className="text-[10px] text-amber-300 tracking-widest">SEZON</div>
                      <div className="text-xl font-black text-white leading-none">{entry.season}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm flex flex-wrap items-center gap-1.5">
                        <span className={`${entry.position===1?'text-amber-300': entry.position<=3?'text-emerald-300':'text-slate-300'}`}>#{entry.position}.</span> Lig {entry.leagueLevel}
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 text-xs">{entry.trophies.length ? entry.trophies.join(' ') : '— kupa yok'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{entry.topScorer ? `Gol kralı: ${entry.topScorer.name} (${entry.topScorer.goals}⚽)` : 'Gol kralı yok'} • Bütçe ${entry.budget.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Trophies: {entry.trophies.join(' ') || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Mevcut sezon önizleme */}
            <div className="mt-3 bg-slate-800/40 border border-dashed border-slate-600/40 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-lg">⏳</div>
              <div className="text-xs">
                <div className="font-bold text-white">Şu an: Sezon {gameState.season} • Hafta {gameState.week}/18 • {gameState.leagueLevel}. Lig</div>
                <div className="text-slate-400">Sezon bitince otomatik müzeye eklenecek — şampiyonluk, kupa ve gol kralı ile birlikte.</div>
              </div>
              <div className="ml-auto hidden sm:flex gap-1">
                {gameState.trophies.slice(-3).map((t,i)=><span key={i} className="text-xl opacity-60">{t}</span>)}
              </div>
            </div>
          </div>
        </div>

      </div>
          <div className="mt-6 text-center text-[10px] text-slate-500 flex items-center justify-center gap-2 opacity-60">
        <span className="kaan-watermark text-[10px]">Made by Kaan</span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span>☀️ Bütün Yaz Boyunca Geliştirildi</span>
      </div>
    </div>
  );
};
