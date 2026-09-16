import React, { useState } from 'react';
import { Player, GameState } from '../../types/game';
import { ROLE_NAMES } from '../../data/constants';
import { playerStatusBadge, isUnavailable } from '../../utils/lineup';
import { renewalCost, renewalWage } from '../../utils/contract';

interface SquadTabProps {
  gameState: GameState;
  onSwapPlayers: (id1: number, id2: number) => void;
  onSellPlayer: (id: number, isBench: boolean) => void;
  onUpdatePlayer: (id: number, updates: Partial<Player>, isBench: boolean) => void;
  onSetCaptain: (playerId: number | null) => void;
  onRenewContract: (playerId: number, years: number) => void;
}

export const SquadTab: React.FC<SquadTabProps> = ({
  gameState, onSwapPlayers, onSellPlayer, onSetCaptain, onRenewContract
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<{ id: number; isBench: boolean } | null>(null);
  const [renewYears, setRenewYears] = useState(2);

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

  const getFormColor = (form?: number) => {
    const f = form ?? 5;
    if (f >= 8) return 'text-emerald-400';
    if (f >= 6) return 'text-lime-400';
    if (f >= 4) return 'text-amber-400';
    return 'text-red-400';
  };

  const handleDragStart = (player: Player, isBench: boolean) => {
    setDraggedPlayer({ id: player.id, isBench });
  };

  const handleDrop = (targetPlayer: Player, targetIsBench: boolean) => {
    if (draggedPlayer && draggedPlayer.id !== targetPlayer.id) {
      if (draggedPlayer.isBench !== targetIsBench) onSwapPlayers(draggedPlayer.id, targetPlayer.id);
    }
    setDraggedPlayer(null);
  };

  const PlayerCard: React.FC<{ player: Player; isBench?: boolean }> = ({ player, isBench = false }) => {
    const badge = playerStatusBadge(player);
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(player, isBench)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop(player, isBench)}
        onClick={() => setSelectedPlayer(player)}
        className={`cursor-pointer transition-all duration-200 hover:scale-105 ${isUnavailable(player) ? 'opacity-60' : ''}`}
        style={!isBench ? {
          position: 'absolute',
          top: `${player.t}%`,
          left: `${player.l}%`,
          transform: 'translate(-50%, -50%)'
        } : undefined}
      >
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${
            isUnavailable(player) ? 'from-red-600 to-red-800' : 'from-amber-400 to-amber-600'
          } flex items-center justify-center font-black text-black text-sm shadow-lg border-2 ${
            gameState.captainId === player.id ? 'border-amber-300' : 'border-white'
          } relative`}>
            {player.ovr}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getEnergyColor(player.energy)} border-2 border-white text-[8px] flex items-center justify-center`}>
              {player.injured ? '🏥' : (player.suspension ?? 0) > 0 ? '🟥' : ''}
            </div>
            {gameState.captainId === player.id && (
              <div className="absolute -top-1 -left-2 text-[10px]">🎽</div>
            )}
          </div>
          <div className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg mt-1 text-center min-w-[100px]">
            <div className="text-[10px] font-bold text-emerald-400 flex items-center justify-center gap-1">
              {player.role}
              <span className={getFormColor(player.form)}>●{player.form ?? 5}</span>
            </div>
            <div className="text-[9px] text-white truncate max-w-[95px]">{player.name}</div>
            {badge && <div className="text-[8px] text-red-300">{badge.text}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 lg:gap-4 overflow-hidden">
      {/* Sağlık bandı */}
      <div className="flex-1 min-h-[300px] lg:min-h-0 flex flex-col gap-2">
        {gameState.team11.some(isUnavailable) && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-xl px-3 py-2 text-[11px] text-red-200">
            ⚠️ İlk 11'de sakat/cezalı oyuncu var. Maça çıkarken otomatik olarak yedeklerle değiştirilir:
            {' '}
            {gameState.team11.filter(isUnavailable).map(p => p.name).join(', ')}
          </div>
        )}
        {/* Football Pitch */}
        <div className="flex-1 relative bg-gradient-to-b from-emerald-600 to-emerald-700 rounded-xl lg:rounded-2xl overflow-hidden border-3 lg:border-4 border-white/80 shadow-2xl">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/60"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/60 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/60 rounded-full"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-24 border-2 border-t-0 border-white/60"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-t-0 border-white/60"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-60 h-24 border-2 border-b-0 border-white/60"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-b-0 border-white/60"></div>
          </div>

          {gameState.team11.map(player => (
            <PlayerCard key={player.id} player={player} />
          ))}

          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium">
            {gameState.tactics.formation}
          </div>
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white font-medium">
            ⭐ {Math.floor(gameState.team11.reduce((a, p) => a + p.ovr, 0) / Math.max(1, gameState.team11.length))} OVR
          </div>
        </div>
      </div>

      {/* Bench Column */}
      <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 bg-slate-800/50 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-slate-700/50 overflow-y-auto max-h-[250px] lg:max-h-none">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-emerald-400">Yedek Kulübesi</h3>
          <span className="text-xs text-slate-400">{gameState.bench.length} oyuncu</span>
        </div>

        <div className="space-y-2">
          {gameState.bench.map(player => {
            const badge = playerStatusBadge(player);
            return (
              <div
                key={player.id}
                draggable
                onDragStart={() => handleDragStart(player, true)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(player, true)}
                onClick={() => setSelectedPlayer(player)}
                className={`bg-slate-700/50 hover:bg-slate-600/50 rounded-xl p-3 cursor-pointer transition-all border-l-4 ${
                  isUnavailable(player) ? 'border-red-500 opacity-70' : 'border-amber-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                    isUnavailable(player) ? 'from-red-600 to-red-800' : 'from-amber-400 to-amber-600'
                  } flex items-center justify-center font-bold text-black text-sm`}>
                    {player.ovr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate flex items-center gap-1">
                      {player.name}
                      {gameState.captainId === player.id && <span className="text-[10px]">🎽</span>}
                      {player.wantsOut && <span className="text-[10px]" title="Kulüpten ayrılmak istiyor">😠</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-emerald-400">{ROLE_NAMES[player.role]}</span>
                      <span>•</span>
                      <span className={player.energy < 40 ? 'text-red-400' : player.energy < 70 ? 'text-yellow-400' : 'text-emerald-400'}>
                        ⚡ {player.energy}%
                      </span>
                      <span className={getFormColor(player.form)}>● {player.form ?? 5}</span>
                    </div>
                    {badge && <div className="text-[10px] text-red-300 mt-0.5">{badge.text}</div>}
                  </div>
                  <div className="text-lg">{getMoraleEmoji(player.morale)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-slate-700/30 rounded-xl">
          <p className="text-xs text-slate-400 text-center">
            💡 Oyuncuları sürükleyerek değiştir • Detay için tıkla
          </p>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-2xl">
                  {selectedPlayer.ovr}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedPlayer.name}
                    {gameState.captainId === selectedPlayer.id && <span className="text-sm">🎽</span>}
                  </h3>
                  <div className="text-emerald-400 font-medium text-sm">
                    {ROLE_NAMES[selectedPlayer.role]} • {selectedPlayer.age} yaş
                    <span className={`ml-2 ${getFormColor(selectedPlayer.form)}`}>Form ●{selectedPlayer.form ?? 5}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            {playerStatusBadge(selectedPlayer) && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 mb-4 text-sm">
                <span className="text-red-300 font-medium">{playerStatusBadge(selectedPlayer)!.text}</span>
                {(selectedPlayer.suspension ?? 0) > 0 && (
                  <span className="text-slate-300 text-xs ml-2">→ Gelecek {selectedPlayer.suspension} maçta oynayamaz</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Potansiyel</div>
                <div className="text-lg font-bold text-emerald-400">{selectedPlayer.potential}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Enerji / Moral</div>
                <div className={`text-lg font-bold ${selectedPlayer.energy < 40 ? 'text-red-400' : 'text-emerald-400'}`}>
                  %{selectedPlayer.energy} / {getMoraleEmoji(selectedPlayer.morale)}{selectedPlayer.morale}
                </div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Sezon Golleri</div>
                <div className="text-lg font-bold text-white">⚽ {selectedPlayer.goals} • 🅰️ {selectedPlayer.assists}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400">Maç / Kart</div>
                <div className="text-lg font-bold text-white">
                  {selectedPlayer.matchesPlayed ?? 0} • 🟨 {selectedPlayer.yellowCards ?? 0}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-amber-500/20 p-3 rounded-xl mb-4">
              <div>
                <div className="text-xs text-amber-300">Piyasa Değeri</div>
                <div className="text-base font-bold text-amber-400">${selectedPlayer.value.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-amber-300">Maaş / Sözleşme</div>
                <div className="text-base font-bold text-amber-400">
                  ${selectedPlayer.wage.toLocaleString()}/h • {selectedPlayer.contract} yıl
                </div>
              </div>
            </div>

            {/* Sözleşme yenileme */}
            <div className="bg-slate-700/40 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-sky-300 font-bold">📝 Sözleşme Yenile</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(y => (
                    <button
                      key={y}
                      onClick={() => setRenewYears(y)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${renewYears === y ? 'bg-sky-500 text-white' : 'bg-slate-600 text-slate-300'}`}
                    >
                      {y}y
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-2">
                <span>İmza parası: ${renewalCost(selectedPlayer, renewYears).toLocaleString()}</span>
                <span>Yeni maaş: ${renewalWage(selectedPlayer, renewYears).toLocaleString()}/h</span>
              </div>
              <button
                disabled={gameState.budget < renewalCost(selectedPlayer, renewYears)}
                onClick={() => {
                  onRenewContract(selectedPlayer.id, renewYears);
                  setSelectedPlayer(null);
                }}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-bold rounded-lg text-sm transition-all"
              >
                🤝 {renewYears} Yıl Uzat
              </button>
            </div>

            <button
              onClick={() => { onSetCaptain(selectedPlayer.id); setSelectedPlayer(null); }}
              className={`w-full py-2.5 mb-2 font-bold rounded-xl transition-all text-sm ${
                gameState.captainId === selectedPlayer.id
                  ? 'bg-amber-500/30 text-amber-200'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              🎽 {gameState.captainId === selectedPlayer.id ? 'Kaptan (Görevi Bırak: Ofis)' : 'Kaptan Yap'}
            </button>

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
              💰 Oyuncuyu Sat (${Math.floor(selectedPlayer.value * 0.8).toLocaleString()})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
