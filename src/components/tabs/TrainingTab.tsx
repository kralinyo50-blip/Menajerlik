import React, { useState } from 'react';
import { GameState, Player } from '../../types/game';
import { ROLE_NAMES } from '../../data/constants';

interface TrainingTabProps {
  gameState: GameState;
  onTrainPlayer: (playerId: number, attribute: string) => void;
}

export const TrainingTab: React.FC<TrainingTabProps> = ({ gameState, onTrainPlayer }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const allPlayers = [...gameState.team11, ...gameState.bench].filter(p => !p.injured);
  
  const trainingCost = 25000;
  const canAfford = gameState.budget >= trainingCost;

  const getTrainingEffect = (player: Player) => {
    // Younger players improve more
    const ageFactor = player.age < 23 ? 2 : player.age < 28 ? 1 : 0.5;
    // Training facility bonus
    const facilityBonus = gameState.trainingLvl * 0.3;
    return Math.max(1, Math.round(ageFactor + facilityBonus));
  };

  const handleTrain = (attribute: string) => {
    if (selectedPlayer && canAfford) {
      onTrainPlayer(selectedPlayer.id, attribute);
      setSelectedPlayer(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🏋️ Antrenman Merkezi
              </h2>
              <p className="text-slate-400 mt-1">
                Oyuncularınızı bireysel olarak geliştirin. Tesis Seviyesi: {gameState.trainingLvl}
              </p>
            </div>
            <div className="bg-slate-800/50 px-4 py-2 rounded-xl">
              <span className="text-amber-300 text-sm">Antrenman Maliyeti:</span>
              <span className="text-amber-400 font-bold ml-2">${trainingCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm text-emerald-200">
            <strong>İpucu:</strong> Genç oyuncular (&lt;23 yaş) antrenmanlardan daha fazla fayda görür. 
            Antrenman tesislerini geliştirmek tüm antrenmanların etkisini artırır.
          </div>
        </div>

        {/* Player Grid */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Oyuncu Seçin</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allPlayers.map(player => {
              const effect = getTrainingEffect(player);
              const canGrow = player.ovr < player.potential;
              
              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  disabled={!canGrow}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPlayer?.id === player.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : canGrow
                      ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-500'
                      : 'bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-black">
                      {player.ovr}
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{player.name.split(' ')[1]}</div>
                      <div className="text-xs text-emerald-400">{ROLE_NAMES[player.role]}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-700/30 px-2 py-1 rounded">
                      <span className="text-slate-400">Yaş:</span>
                      <span className="text-white ml-1">{player.age}</span>
                    </div>
                    <div className="bg-slate-700/30 px-2 py-1 rounded">
                      <span className="text-slate-400">Pot:</span>
                      <span className="text-blue-400 ml-1">{player.potential}</span>
                    </div>
                  </div>
                  {canGrow && (
                    <div className="mt-2 text-xs text-emerald-400">
                      +{effect} OVR potansiyel
                    </div>
                  )}
                  {!canGrow && (
                    <div className="mt-2 text-xs text-slate-500">
                      Maksimum potansiyele ulaştı
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Training Modal */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-xl">
                    {selectedPlayer.ovr}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedPlayer.name}</h3>
                    <div className="text-emerald-400">{ROLE_NAMES[selectedPlayer.role]} • {selectedPlayer.age} yaş</div>
                  </div>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
              </div>

              <div className="bg-slate-700/30 p-4 rounded-xl mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Mevcut OVR</span>
                  <span className="text-2xl font-bold text-white">{selectedPlayer.ovr}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-400">Potansiyel</span>
                  <span className="text-2xl font-bold text-blue-400">{selectedPlayer.potential}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-400">Gelişim Payı</span>
                  <span className="text-emerald-400 font-bold">+{getTrainingEffect(selectedPlayer)} OVR</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleTrain('overall')}
                  disabled={!canAfford}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${
                    canAfford
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  🏋️ Genel Antrenman - ${trainingCost.toLocaleString()}
                </button>
              </div>

              {!canAfford && (
                <div className="mt-4 text-center text-red-400 text-sm">
                  Yeterli bütçe yok
                </div>
              )}
            </div>
          </div>
        )}

        {/* Training Stats */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="font-bold text-white mb-4">📊 Antrenman İstatistikleri</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {allPlayers.filter(p => p.age < 23).length}
              </div>
              <div className="text-xs text-slate-400">Genç Yetenek</div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">
                {allPlayers.filter(p => p.ovr < p.potential).length}
              </div>
              <div className="text-xs text-slate-400">Gelişebilir</div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-400">
                {gameState.trainingLvl}
              </div>
              <div className="text-xs text-slate-400">Tesis Seviyesi</div>
            </div>
            <div className="bg-slate-700/30 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                +{Math.round(gameState.trainingLvl * 0.3 * 10) / 10}
              </div>
              <div className="text-xs text-slate-400">Bonus Etki</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
