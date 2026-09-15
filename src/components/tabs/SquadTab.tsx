import React, { useState } from 'react';
import { Player, GameState } from '../../types/game';
import { ROLE_NAMES } from '../../data/constants';

interface SquadTabProps {
  gameState: GameState;
  onSwapPlayers: (id1: number, id2: number) => void;
  onSellPlayer: (id: number, isBench: boolean) => void;
  onUpdatePlayer: (id: number, updates: Partial<Player>, isBench: boolean) => void;
}

export const SquadTab: React.FC<SquadTabProps> = ({ gameState, onSwapPlayers, onSellPlayer }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<{ id: number; isBench: boolean } | null>(null);

  const getEnergyColor = (energy: number) => {
    if (energy >= 70) return 'bg-emerald-500';
    if (energy >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMoraleEmoji = (morale: number) => {
    if (morale >= 80) return '😊';
    if (morale >= 50) return '😐';
    return '😟';
  };

  const handleDragStart = (player: Player, isBench: boolean) => {
    setDraggedPlayer({ id: player.id, isBench });
  };

  const handleDrop = (targetPlayer: Player, targetIsBench: boolean) => {
    if (draggedPlayer && draggedPlayer.id !== targetPlayer.id) {
      if (draggedPlayer.isBench !== targetIsBench) {
        onSwapPlayers(draggedPlayer.id, targetPlayer.id);
      }
    }
    setDraggedPlayer(null);
  };

  const PlayerCard: React.FC<{ player: Player; isBench?: boolean }> = ({ player, isBench = false }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(player, isBench)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleDrop(player, isBench)}
      onClick={() => setSelectedPlayer(player)}
      className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
        player.injured ? 'opacity-60' : ''
      }`}
      style={!isBench ? {
        position: 'absolute',
        top: `${player.t}%`,
        left: `${player.l}%`,
        transform: 'translate(-50%, -50%)'
      } : undefined}
    >
      <div className="flex flex-col items-center">
        {/* Player Icon */}
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
          player.injured ? 'from-red-600 to-red-800' : 'from-amber-400 to-amber-600'
        } flex items-center justify-center font-black text-black text-sm shadow-lg border-2 border-white relative`}>
          {player.ovr}
          {/* Energy Indicator */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getEnergyColor(player.energy)} border-2 border-white text-[8px] flex items-center justify-center`}>
            {player.injured ? '🏥' : ''}
          </div>
        </div>
        {/* Player Label */}
        <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg mt-1 text-center min-w-[100px]">
          <div className="text-[10px] font-bold text-emerald-400">{player.role}</div>
          <div className="text-[9px] text-white truncate max-w-[95px]">{player.name}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 lg:gap-4 overflow-hidden">
      {/* Football Pitch */}
      <div className="flex-1 min-h-[300px] lg:min-h-0 relative bg-gradient-to-b from-emerald-600 to-emerald-700 rounded-xl lg:rounded-2xl overflow-hidden border-3 lg:border-4 border-white/80 shadow-2xl">
        {/* Pitch Lines */}
        <div className="absolute inset-0">
          {/* Center Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60"></div>
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/60 rounded-full"></div>
          {/* Center Dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/60 rounded-full"></div>
          {/* Top Penalty Box */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-24 border-2 border-t-0 border-white/60"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-t-0 border-white/60"></div>
          {/* Bottom Penalty Box */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-60 h-24 border-2 border-b-0 border-white/60"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-b-0 border-white/60"></div>
        </div>

        {/* Players */}
        {gameState.team11.map(player => (
          <PlayerCard key={player.id} player={player} />
        ))}

        {/* Formation Label */}
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium">
          {gameState.tactics.formation}
        </div>
      </div>

      {/* Bench Column */}
      <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 bg-slate-800/50 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-slate-700/50 overflow-y-auto max-h-[250px] lg:max-h-none">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-emerald-400">Yedek Kulübesi</h3>
          <span className="text-xs text-slate-400">{gameState.bench.length} oyuncu</span>
        </div>

        <div className="space-y-2">
          {gameState.bench.map(player => (
            <div
              key={player.id}
              draggable
              onDragStart={() => handleDragStart(player, true)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(player, true)}
              onClick={() => setSelectedPlayer(player)}
              className={`bg-slate-700/50 hover:bg-slate-600/50 rounded-xl p-3 cursor-pointer transition-all border-l-4 ${
                player.injured ? 'border-red-500 opacity-60' : 'border-amber-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                  player.injured ? 'from-red-600 to-red-800' : 'from-amber-400 to-amber-600'
                } flex items-center justify-center font-bold text-black text-sm`}>
                  {player.ovr}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{player.name}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-emerald-400">{ROLE_NAMES[player.role]}</span>
                    <span>•</span>
                    <span className={player.energy < 40 ? 'text-red-400' : player.energy < 70 ? 'text-yellow-400' : 'text-emerald-400'}>
                      ⚡ {player.energy}%
                    </span>
                    {player.injured && <span className="text-red-400">🏥 {player.injuryWeeks}h</span>}
                  </div>
                </div>
                <div className="text-lg">{getMoraleEmoji(player.morale)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-slate-700/30 rounded-xl">
          <p className="text-xs text-slate-400 text-center">
            💡 Oyuncuları sürükleyerek değişiklik yapabilirsiniz
          </p>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-2xl">
                  {selectedPlayer.ovr}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedPlayer.name}</h3>
                  <div className="text-emerald-400 font-medium">{ROLE_NAMES[selectedPlayer.role]}</div>
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Yaş</div>
                <div className="text-lg font-bold text-white">{selectedPlayer.age}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Potansiyel</div>
                <div className="text-lg font-bold text-emerald-400">{selectedPlayer.potential}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Enerji</div>
                <div className={`text-lg font-bold ${selectedPlayer.energy < 40 ? 'text-red-400' : selectedPlayer.energy < 70 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  %{selectedPlayer.energy}
                </div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Moral</div>
                <div className="text-lg font-bold text-white">{getMoraleEmoji(selectedPlayer.morale)} %{selectedPlayer.morale}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Goller</div>
                <div className="text-lg font-bold text-white">⚽ {selectedPlayer.goals}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Asistler</div>
                <div className="text-lg font-bold text-white">🅰️ {selectedPlayer.assists}</div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-amber-500/20 p-3 rounded-xl mb-4">
              <div>
                <div className="text-xs text-amber-300">Piyasa Değeri</div>
                <div className="text-lg font-bold text-amber-400">${selectedPlayer.value.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-amber-300">Maaş</div>
                <div className="text-lg font-bold text-amber-400">${selectedPlayer.wage.toLocaleString()}/hafta</div>
              </div>
            </div>

            {selectedPlayer.injured && (
              <div className="bg-red-500/20 p-3 rounded-xl mb-4 border border-red-500/30">
                <div className="text-red-400 font-medium">🏥 Sakatlık: {selectedPlayer.injuryWeeks} hafta kaldı</div>
              </div>
            )}

            <button
              onClick={() => {
                const isBench = gameState.bench.some(p => p.id === selectedPlayer.id);
                if (confirm(`${selectedPlayer.name} oyuncusunu $${Math.floor(selectedPlayer.value * 0.8).toLocaleString()} karşılığında satmak istiyor musunuz?`)) {
                  onSellPlayer(selectedPlayer.id, isBench);
                  setSelectedPlayer(null);
                }
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
            >
              💰 Oyuncuyu Sat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
