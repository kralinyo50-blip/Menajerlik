import React from 'react';
import { GameState } from '../../types/game';

interface CupTabProps {
  gameState: GameState;
  onPlayCupMatch: () => void;
}

export const CupTab: React.FC<CupTabProps> = ({ gameState, onPlayCupMatch }) => {
  const rounds = [
    { name: '1. Tur', icon: '🏟️' },
    { name: 'Çeyrek Final', icon: '⚔️' },
    { name: 'Yarı Final', icon: '🔥' },
    { name: 'Final', icon: '🏆' }
  ];

  const currentRound = gameState.cupMatches.findIndex(m => !m.played);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-2">
            🏆 TÜRKİYE KUPASI
          </h2>
          <p className="text-slate-400">
            {gameState.cupEliminated 
              ? 'Bu sezon kupadan elendiniz.' 
              : 'Kupayı kazanmak için 4 maç kazanmanız gerekiyor.'}
          </p>
        </div>

        {/* Tournament Bracket */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/50 to-transparent"></div>

          <div className="space-y-8">
            {gameState.cupMatches.map((match, index) => {
              const isPlayed = match.played;
              const isCurrent = index === currentRound && !gameState.cupEliminated;
              const isLocked = index > currentRound || gameState.cupEliminated;
              const isWon = isPlayed && match.userScore !== undefined && match.oppScore !== undefined && match.userScore > match.oppScore;
              const isLost = isPlayed && match.userScore !== undefined && match.oppScore !== undefined && match.userScore < match.oppScore;

              return (
                <div 
                  key={index}
                  className={`relative flex items-center gap-8 ${
                    isLocked ? 'opacity-50' : ''
                  }`}
                >
                  {/* Round Info */}
                  <div className="w-32 text-right flex-shrink-0">
                    <div className="text-2xl mb-1">{rounds[index].icon}</div>
                    <div className={`font-bold ${
                      isCurrent ? 'text-amber-400' : isPlayed ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {rounds[index].name}
                    </div>
                  </div>

                  {/* Match Card */}
                  <div className={`flex-1 bg-slate-800/50 rounded-2xl p-6 border-2 transition-all ${
                    isCurrent 
                      ? 'border-amber-500 shadow-lg shadow-amber-500/20' 
                      : isWon 
                      ? 'border-emerald-500/50' 
                      : isLost 
                      ? 'border-red-500/50'
                      : 'border-slate-700/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      {/* Teams */}
                      <div className="flex items-center gap-8 flex-1">
                        {/* User Team */}
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{gameState.teamLogo}</span>
                          <span className="font-bold text-white">{gameState.teamName}</span>
                        </div>

                        {/* Score or VS */}
                        <div className="flex-1 text-center">
                          {isPlayed ? (
                            <div className="flex items-center justify-center gap-4">
                              <span className={`text-3xl font-black ${isWon ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {match.userScore}
                              </span>
                              <span className="text-slate-500">-</span>
                              <span className={`text-3xl font-black ${isLost ? 'text-red-400' : 'text-slate-400'}`}>
                                {match.oppScore}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-bold">VS</span>
                          )}
                        </div>

                        {/* Opponent */}
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white">{match.opponent.name}</span>
                          <span className="text-3xl">{match.opponent.logo}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isCurrent && (
                        <button
                          onClick={onPlayCupMatch}
                          className="ml-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/30"
                        >
                          ⚽ Oyna
                        </button>
                      )}

                      {isPlayed && (
                        <div className={`ml-6 px-4 py-2 rounded-xl font-bold ${
                          isWon 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isWon ? '✓ Kazandın' : '✗ Kaybettin'}
                        </div>
                      )}

                      {isLocked && !isPlayed && (
                        <div className="ml-6 px-4 py-2 bg-slate-700/50 rounded-xl text-slate-500 font-medium">
                          🔒 Kilitli
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trophy Section */}
        {gameState.cupMatches.every(m => m.played) && !gameState.cupEliminated && (
          <div className="mt-12 text-center py-12 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl border border-amber-500/30">
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h3 className="text-3xl font-black text-amber-400 mb-2">TEBRİKLER!</h3>
            <p className="text-xl text-amber-300">Türkiye Kupası Şampiyonu Oldunuz!</p>
          </div>
        )}

        {/* Prize Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {rounds.map((round, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-1">{round.name} Ödülü</div>
              <div className="text-lg font-bold text-amber-400">
                ${((i + 1) * 150000).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
