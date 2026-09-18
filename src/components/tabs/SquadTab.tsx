import React, { useState } from 'react';
import { Player, GameState } from '../../types/game';
import { ROLE_NAMES } from '../../data/constants';
import { playerStatusBadge, isUnavailable } from '../../utils/lineup';
import { renewalCost, renewalWage } from '../../utils/contract';
import { TIER_INFO } from '../../data/stars';
import { formatMoney } from '../../utils/pricing';
import { generateLoanOutOffers } from '../../utils/loan';
import { LoanOutOffer } from '../../types/game';
import { adaptationInfo, adaptationPct } from '../../utils/adaptation';

interface SquadTabProps {
  gameState: GameState;
  onSwapPlayers: (id1: number, id2: number) => void;
  onSellPlayer: (id: number, isBench: boolean) => void;
  onUpdatePlayer: (id: number, updates: Partial<Player>, isBench: boolean) => void;
  onSetCaptain: (playerId: number | null) => void;
  onRenewContract: (playerId: number, years: number) => void;
  onAutoPick?: () => void;
  onSendOnLoan: (offer: LoanOutOffer) => void;
  onExerciseLoanOption: (playerId: number) => void;
  onReturnLoanEarly: (playerId: number) => void;
}

export const SquadTab: React.FC<SquadTabProps> = ({
  gameState, onSwapPlayers, onSellPlayer, onSetCaptain, onRenewContract, onAutoPick,
  onSendOnLoan, onExerciseLoanOption, onReturnLoanEarly
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<{ id: number; isBench: boolean } | null>(null);
  const [renewYears, setRenewYears] = useState(2);
  const [loanOffers, setLoanOffers] = useState<LoanOutOffer[] | null>(null);

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
              <span title={player.country}>{player.flag ?? '🇹🇷'}</span>
              {player.role}
              <span className={getFormColor(player.form)}>●{player.form ?? 5}</span>
            </div>
            <div className="text-[9px] text-white truncate max-w-[95px] flex items-center justify-center gap-1">{player.flag ?? '🇹🇷'} {player.name}</div>
            {badge && <div className="text-[8px] text-red-300">{badge.text}</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 lg:gap-4 overflow-hidden relative">
      <div className="pointer-events-none absolute -top-2 right-2 hidden lg:flex items-center gap-1.5 opacity-30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="kaan-watermark text-[10px] tracking-[0.16em]">MADE BY KAAN — BÜTÜN YAZ</span>
      </div>
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
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-emerald-400">Yedek Kulübesi</h3>
          <span className="text-xs text-slate-400 leading-relaxed">{gameState.bench.length} oyuncu</span>
        </div>

        {onAutoPick && (
          <button
            onClick={onAutoPick}
            className="w-full mb-3 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl transition-all"
          >
            🧠 En İyi 11'i Otomatik Seç
            <span className="block text-[9px] font-normal text-violet-100">form + enerji + OVR + moral</span>
          </button>
        )}

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
                className={`bg-slate-700/50 hover:bg-slate-600/50 rounded-2xl p-3.5 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer transition-all border-l-4 ${
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
                      <span title={player.country}>{player.flag ?? '🇹🇷'}</span>
                      {player.name}
                      {player.starTier && <span className="text-[10px]" title={TIER_INFO[player.starTier].label}>{TIER_INFO[player.starTier].icon}</span>}
                      {gameState.captainId === player.id && <span className="text-[10px]">🎽</span>}
                      {player.wantsOut && <span className="text-[10px]" title="Kulüpten ayrılmak istiyor">😠</span>}
                      {adaptationPct(player) < 0.6 && <span className="text-[10px]" title={`Takıma alışıyor (%${Math.round(adaptationPct(player) * 100)})`}>🧩</span>}
                      {player.loanFrom && <span className="text-[9px] bg-cyan-500/30 text-cyan-200 px-1 rounded" title={`${player.loanFrom} kulübünden kiralık`}>KİRALIK</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 leading-relaxed">
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
          <p className="text-xs text-slate-400 leading-relaxed text-center">
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
                  <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <span title={selectedPlayer.country}>{selectedPlayer.flag ?? '🇹🇷'}</span>
                    {selectedPlayer.name}
                    {gameState.captainId === selectedPlayer.id && <span className="text-sm">🎽</span>}
                  </h3>
                  <div className="text-emerald-400 font-medium text-sm">
                    {ROLE_NAMES[selectedPlayer.role]} • {selectedPlayer.age} yaş
                    <span className={`ml-2 ${getFormColor(selectedPlayer.form)}`}>Form ●{selectedPlayer.form ?? 5}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setSelectedPlayer(null); setLoanOffers(null); }} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            {playerStatusBadge(selectedPlayer) && (
              <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-3.5 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300 mb-4 text-sm">
                <span className="text-red-300 font-medium">{playerStatusBadge(selectedPlayer)!.text}</span>
                {(selectedPlayer.suspension ?? 0) > 0 && (
                  <span className="text-slate-300 text-xs ml-2">→ Gelecek {selectedPlayer.suspension} maçta oynayamaz</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400 leading-relaxed">Potansiyel</div>
                <div className="text-lg font-bold text-emerald-400">{selectedPlayer.potential}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400 leading-relaxed">Enerji / Moral</div>
                <div className={`text-lg font-bold ${selectedPlayer.energy < 40 ? 'text-red-400' : 'text-emerald-400'}`}>
                  %{selectedPlayer.energy} / {getMoraleEmoji(selectedPlayer.morale)}{selectedPlayer.morale}
                </div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400 leading-relaxed">Sezon Golleri</div>
                <div className="text-lg font-bold text-white">⚽ {selectedPlayer.goals} • 🅰️ {selectedPlayer.assists}</div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-xl">
                <div className="text-xs text-slate-400 leading-relaxed">Maç / Kart</div>
                <div className="text-lg font-bold text-white">
                  {selectedPlayer.matchesPlayed ?? 0} • 🟨 {selectedPlayer.yellowCards ?? 0}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-amber-500/20 p-3 rounded-xl mb-4">
              <div>
                <div className="text-xs text-amber-300">Piyasa Değeri</div>
                <div className="text-base font-bold text-amber-400">{formatMoney(selectedPlayer.value)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-amber-300">Maaş / Sözleşme</div>
                <div className="text-base font-bold text-amber-400">
                  {formatMoney(selectedPlayer.wage)}/h • {selectedPlayer.contract} yıl
                </div>
              </div>
            </div>

            {/* Takım uyumu */}
            {(() => {
              const squadAvg = Math.floor(gameState.team11.reduce((a, p) => a + p.ovr, 0) / Math.max(1, gameState.team11.length));
              const info = adaptationInfo(selectedPlayer, squadAvg, gameState.teamChemistry ?? 55);
              return (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-violet-300 font-bold">🧩 Takım Uyumu</span>
                    <span className="text-white font-bold">%{info.pct}{info.penalty > 0.5 ? ` • sahada ~${Math.round(info.effective)}` : ' • tam uyum'}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${info.pct >= 100 ? 'bg-emerald-500' : info.pct >= 50 ? 'bg-violet-500' : 'bg-amber-500'}`} style={{ width: `${info.pct}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5">
                    {info.adapted
                      ? 'Takımla bütünleşti — gerçek gücünde oynuyor.'
                      : `${info.matchesLeft} maç sonra tam uyum. ${info.penalty > 2 ? `Şu an takım seviyesinin üstünde olduğu için düşük oynuyor (~${Math.round(info.effective)}).` : 'Yeni — biraz zamana ihtiyacı var.'}`}
                  </div>
                </div>
              );
            })()}

            {/* Kiralık bilgisi */}
            {selectedPlayer.loanFrom && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-3.5 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300 mb-4">
                <div className="text-cyan-300 font-bold text-sm mb-1">
                  🔄 {selectedPlayer.loanFrom} kulübünden kiralık
                </div>
                <div className="text-[11px] text-slate-300 mb-2">
                  Sezon {selectedPlayer.loanUntilSeason} sonuna kadar bizde • Maaş payımız: {formatMoney(selectedPlayer.wage)}/hafta
                  {selectedPlayer.loanOptionPrice ? ` • Opsiyon: ${formatMoney(selectedPlayer.loanOptionPrice)}` : ' • Satın alma opsiyonu yok'}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!!selectedPlayer.loanOptionPrice && (
                    <button
                      disabled={gameState.budget < selectedPlayer.loanOptionPrice}
                      onClick={() => { onExerciseLoanOption(selectedPlayer.id); setSelectedPlayer(null); }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold ${
                        gameState.budget >= selectedPlayer.loanOptionPrice
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      ✅ Satın Alma Opsiyonunu Kullan
                    </button>
                  )}
                  <button
                    onClick={() => { onReturnLoanEarly(selectedPlayer.id); setSelectedPlayer(null); }}
                    className="px-3 py-2 rounded-lg text-xs bg-slate-600 hover:bg-slate-500 text-white"
                  >
                    ↩️ Kiralıktan Çıkar
                  </button>
                </div>
              </div>
            )}

            {/* Kiralığa gönder */}
            {!selectedPlayer.loanFrom && (
              <div className="bg-slate-700/50 backdrop-blur rounded-2xl p-3.5 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all mb-4">
                <div className="text-xs text-amber-300 font-bold mb-2">📤 Kiralığa Gönder (gelişim + gelir)</div>
                {!loanOffers ? (
                  <button
                    onClick={() => setLoanOffers(generateLoanOutOffers(selectedPlayer, gameState))}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-sm"
                  >
                    Kulüp tekliflerini gör
                  </button>
                ) : (
                  <div className="space-y-2">
                    {loanOffers.map(offer => (
                      <div key={offer.id} className="bg-slate-800/60 rounded-lg p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white font-medium">{offer.toLogo} {offer.toClub}</span>
                          <span className="text-amber-300 font-bold">{formatMoney(offer.fee)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Maaşın %{Math.round(offer.wageCoverage * 100)}'ini karşılar • {offer.note}
                        </div>
                        <button
                          onClick={() => {
                            onSendOnLoan(offer);
                            setLoanOffers(null);
                            setSelectedPlayer(null);
                          }}
                          className="w-full mt-1.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded"
                        >
                          🔄 Bu kulübe kirala
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setLoanOffers(null)} className="w-full text-[11px] text-slate-400">← Geri</button>
                  </div>
                )}
              </div>
            )}

            {/* Sözleşme yenileme */}
            {!selectedPlayer.loanFrom && (
            <div className="bg-slate-700/50 backdrop-blur rounded-2xl p-3.5 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all mb-4">
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
            )}

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
                if (confirm(`${selectedPlayer.name} oyuncusunu ${formatMoney(Math.floor(selectedPlayer.value * 0.8))} karşılığında satmak istiyor musunuz?`)) {
                  onSellPlayer(selectedPlayer.id, isBench);
                  setSelectedPlayer(null);
                }
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
            >
              💰 Oyuncuyu Sat ({formatMoney(Math.floor(selectedPlayer.value * 0.8))})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
