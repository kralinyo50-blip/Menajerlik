import React, { useState } from 'react';
import { GameState, LoanTarget, Player } from '../../types/game';
import { ROLE_NAMES } from '../../data/constants';
import { TIER_INFO, StarTier } from '../../data/stars';
import { formatMoney, marketRefreshCost } from '../../utils/pricing';
import { fameNegotiationBonus } from '../../utils/life';

interface TransferTabProps {
  gameState: GameState;
  onBuyPlayer: (player: Player, finalPrice: number) => void;
  onRefreshMarket: () => void;
  onRefreshLoanList: () => void;
  onTakeLoan: (targetId: number) => void;
}

const tierOf = (player: Player): StarTier | undefined => player.starTier;

export const TransferTab: React.FC<TransferTabProps> = ({
  gameState, onBuyPlayer, onRefreshMarket, onRefreshLoanList, onTakeLoan
}) => {
  const [mode, setMode] = useState<'buy' | 'loan'>('buy');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanTarget | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [negotiationState, setNegotiationState] = useState<'none' | 'negotiating' | 'success' | 'failed'>('none');
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(0);
  const [negotiationAttempts, setNegotiationAttempts] = useState<number>(0);

  const market = gameState.marketList || [];
  const loans = gameState.loanList || [];

  const filteredPlayers = filter === 'ALL' ? market : market.filter(p => p.role === filter);
  const filteredLoans = filter === 'ALL' ? loans : loans.filter(l => l.player.role === filter);

  const refreshCost = marketRefreshCost(gameState.skills?.scouting ?? 0, gameState.scoutLvl || 1);
  const loanRefreshCost = Math.max(50000, Math.round(refreshCost / 3));
  const canRefresh = gameState.budget >= refreshCost;
  const canRefreshLoans = gameState.budget >= loanRefreshCost;
  const squadWages = [...gameState.team11, ...gameState.bench].reduce((acc, p) => acc + p.wage, 0);
  const loanCount = [...gameState.team11, ...gameState.bench].filter(p => p.loanFrom).length;

  const startNegotiation = (player: Player) => {
    setSelectedPlayer(player);
    setNegotiationState('none');
    setNegotiatedPrice(player.value);
    setNegotiationAttempts(0);
  };

  const handleNegotiate = () => {
    if (!selectedPlayer || negotiationAttempts >= 3) return;
    setNegotiationState('negotiating');
    setNegotiationAttempts(prev => prev + 1);

    const baseChance = 0.5 - (negotiationAttempts * 0.15) + (gameState.scoutLvl * 0.05)
      + (gameState.skills?.negotiation ?? 0) * 0.04
      + fameNegotiationBonus(gameState);
    const success = Math.random() < baseChance;

    setTimeout(() => {
      if (success) {
        const discountPercent = 5 + Math.floor(Math.random() * 16);
        setNegotiatedPrice(Math.floor(negotiatedPrice * (1 - discountPercent / 100)));
        setNegotiationState('success');
      } else {
        if (Math.random() < 0.3) {
          const increasePercent = 5 + Math.floor(Math.random() * 10);
          setNegotiatedPrice(Math.floor(negotiatedPrice * (1 + increasePercent / 100)));
        }
        setNegotiationState('failed');
      }
    }, 900);
  };

  const handleBuy = () => {
    if (selectedPlayer && gameState.budget >= negotiatedPrice) {
      onBuyPlayer({ ...selectedPlayer, value: negotiatedPrice }, negotiatedPrice);
      setSelectedPlayer(null);
      setNegotiationState('none');
    }
  };

  const getDiscountPercent = () => {
    if (!selectedPlayer) return 0;
    return Math.round((1 - negotiatedPrice / selectedPlayer.value) * 100);
  };

  const cardBorder = (player: Player) => {
    const tier = tierOf(player);
    if (tier) return TIER_INFO[tier].ringClass;
    return gameState.budget >= player.value ? 'border-slate-700/50 hover:border-emerald-500/50' : 'border-red-500/30';
  };

  const StarBadge: React.FC<{ player: Player }> = ({ player }) => {
    const tier = tierOf(player);
    if (!tier) return null;
    const info = TIER_INFO[tier];
    return (
      <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-black rounded-bl-lg ${info.badgeClass}`}>
        {info.icon} {info.label.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Transfer Pazarı</h2>
          <p className="text-slate-400 text-sm">
            Scout Seviyesi: {gameState.scoutLvl} • Pazarlık: %{Math.round(50 + gameState.scoutLvl * 5 + (gameState.skills?.negotiation ?? 0) * 4 + fameNegotiationBonus(gameState) * 100)}+
            {loanCount > 0 && <span className="text-cyan-300"> • {loanCount} kiralık oyuncun var</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/30">
            <span className="text-amber-300 text-sm">Bütçe:</span>
            <span className="text-amber-400 font-bold ml-2">{formatMoney(gameState.budget)}</span>
          </div>
          <button
            onClick={mode === 'buy' ? onRefreshMarket : onRefreshLoanList}
            disabled={mode === 'buy' ? !canRefresh : !canRefreshLoans}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              (mode === 'buy' ? canRefresh : canRefreshLoans)
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            🔄 Yenile
            <span className="text-xs text-amber-400">
              ({formatMoney(mode === 'buy' ? refreshCost : loanRefreshCost)})
            </span>
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('buy')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            mode === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
          }`}
        >
          💰 Satın Al ({market.length})
        </button>
        <button
          onClick={() => setMode('loan')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            mode === 'loan' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
          }`}
        >
          🔄 Kiralık ({loans.length})
          <span className="text-[10px] font-medium opacity-80">düşük maliyet + opsiyon</span>
        </button>
      </div>

      {/* Wage info */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span>💰</span>
          <span className="text-red-300">5 haftalık maaş gideri:</span>
          <span className="text-red-400 font-bold">{formatMoney(squadWages * 5)}</span>
        </div>
        <span className="text-slate-400 text-xs">Her 5 maçta bir ödenir • Kiralıklarda maaşın bir kısmını karşı kulüp öder</span>
      </div>

      {mode === 'loan' && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 mb-4 text-xs text-cyan-100">
          <b>Kiralama nasıl işler?</b> Peşin bir kiralama bedeli ödersin, oyuncunun maaşının belirtilen yüzdesini kulübün öder.
          Sezon sonunda oyuncu kulübüne döner — ama <b>satın alma opsiyonunu</b> kullanırsan kalıcı olarak senin olur.
          Büyük kulüplerde yedek kalan yıldızlar burada fırsat olur.
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', 'KL', 'STP', 'SB', 'OS', 'FW'].map(role => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === role ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            {role === 'ALL' ? 'Tümü' : ROLE_NAMES[role]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {mode === 'buy' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlayers.length === 0 && (
              <div className="col-span-full text-center text-slate-400 py-10">Pazarda oyuncu yok — listeyi yenile.</div>
            )}
            {filteredPlayers.map(player => {
              const tier = tierOf(player);
              const affordable = canAffordWithSkill(player.value, gameState);
              return (
                <div
                  key={player.id}
                  onClick={() => startNegotiation(player)}
                  className={`bg-slate-800/50 rounded-2xl p-4 border-2 transition-all cursor-pointer hover:scale-[1.02] relative overflow-hidden ${
                    affordable ? cardBorder(player) : 'border-red-500/30 opacity-60'
                  }`}
                >
                  <StarBadge player={player} />

                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${
                      tier === 'world' ? 'from-amber-300 to-amber-600'
                        : tier === 'star' ? 'from-purple-400 to-purple-600'
                        : tier === 'turkish' ? 'from-red-400 to-red-600'
                        : tier === 'wonderkid' ? 'from-emerald-400 to-emerald-600'
                        : 'from-slate-400 to-slate-600'
                    } flex items-center justify-center font-black text-black text-xl shadow-lg`}>
                      {player.ovr}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-emerald-400 font-medium">{ROLE_NAMES[player.role]}</div>
                      <div className="text-xs text-slate-400">{player.age} yaş</div>
                    </div>
                  </div>

                  <div className="font-bold text-white mb-1 truncate">{player.name.replace(/^[^\w]+\s/, '')}</div>
                  {tier && (
                    <div className="text-[10px] text-slate-400 mb-2 italic">{TIER_INFO[tier].label}</div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-slate-700/30 px-2 py-1 rounded">
                      <span className="text-slate-400">Pot:</span>
                      <span className="text-emerald-400 ml-1 font-bold">{player.potential}</span>
                    </div>
                    <div className="bg-slate-700/30 px-2 py-1 rounded">
                      <span className="text-slate-400">Maaş:</span>
                      <span className="text-red-400 ml-1">{formatMoney(player.wage)}/h</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-amber-400 font-black">{formatMoney(player.value)}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); startNegotiation(player); }}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium"
                    >
                      💬 Pazarlık
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredLoans.length === 0 && (
              <div className="col-span-full text-center text-slate-400 py-10">Kiralık listesi boş — yenile.</div>
            )}
            {filteredLoans.map(target => {
              const tier = tierOf(target.player);
              const affordable = gameState.budget >= target.loanFee;
              const wageCost = Math.round(target.player.wage * target.wageShare);
              return (
                <div
                  key={target.id}
                  className={`bg-slate-800/50 rounded-2xl p-4 border-2 relative overflow-hidden ${
                    affordable ? (tier ? TIER_INFO[tier].ringClass : 'border-cyan-500/40') : 'border-red-500/30 opacity-60'
                  }`}
                >
                  <StarBadge player={target.player} />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-black text-lg">
                      {target.player.ovr}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold truncate">{target.player.name.replace(/^[^\w]+\s/, '')}</div>
                      <div className="text-[11px] text-slate-400">
                        {target.fromLogo} {target.fromClub} • {ROLE_NAMES[target.player.role]} • {target.player.age} yaş
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-700/40 rounded-lg p-2 mb-3 italic">
                    "{target.note}"
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
                    <div className="bg-slate-700/30 rounded p-2 text-center">
                      <div className="text-slate-400">Kiralama Bedeli</div>
                      <div className="text-amber-400 font-bold">{formatMoney(target.loanFee)}</div>
                    </div>
                    <div className="bg-slate-700/30 rounded p-2 text-center">
                      <div className="text-slate-400">Maaş Payımız</div>
                      <div className="text-red-400 font-bold">{formatMoney(wageCost)}/h (%{Math.round(target.wageShare * 100)})</div>
                    </div>
                    <div className="bg-slate-700/30 rounded p-2 text-center">
                      <div className="text-slate-400">Potansiyel</div>
                      <div className="text-emerald-400 font-bold">{target.player.potential}</div>
                    </div>
                    <div className="bg-slate-700/30 rounded p-2 text-center">
                      <div className="text-slate-400">Satın Alma Opsiyonu</div>
                      <div className="text-cyan-300 font-bold">
                        {target.optionToBuy ? formatMoney(target.optionToBuy) : 'YOK'}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!affordable}
                    onClick={() => setSelectedLoan(target)}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                      affordable ? 'bg-cyan-500 hover:bg-cyan-400 text-black' : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    🔄 Kirala {!affordable && '(bütçe yetersiz)'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loan confirm modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLoan(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-cyan-500/40" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-cyan-300 mb-1">Kiralık Anlaşması</h3>
            <div className="text-white font-bold text-lg">{selectedLoan.player.name.replace(/^[^\w]+\s/, '')}</div>
            <div className="text-slate-400 text-sm mb-4">
              {selectedLoan.fromLogo} {selectedLoan.fromClub} • {ROLE_NAMES[selectedLoan.player.role]} • OVR {selectedLoan.player.ovr}
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                <span className="text-slate-300">Peşin kiralama bedeli</span>
                <span className="text-amber-400 font-bold">{formatMoney(selectedLoan.loanFee)}</span>
              </div>
              <div className="flex justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                <span className="text-slate-300">Ödeyeceğimiz maaş</span>
                <span className="text-red-400 font-bold">
                  {formatMoney(Math.round(selectedLoan.player.wage * selectedLoan.wageShare))}/hafta
                </span>
              </div>
              <div className="flex justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                <span className="text-slate-300">Süre</span>
                <span className="text-white font-bold">Sezon {selectedLoan.untilSeason} sonuna kadar</span>
              </div>
              <div className="flex justify-between bg-slate-700/40 rounded-lg px-3 py-2">
                <span className="text-slate-300">Satın alma opsiyonu</span>
                <span className="text-cyan-300 font-bold">
                  {selectedLoan.optionToBuy ? formatMoney(selectedLoan.optionToBuy) : 'Yok'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 mb-4">
              Sezon sonunda oyuncu kulübüne döner. Opsiyonu sezon içinde Ofis sekmesinden kullanabilirsin.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { onTakeLoan(selectedLoan.id); setSelectedLoan(null); }}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl"
              >
                ✅ Sözleşmeyi İmzala
              </button>
              <button
                onClick={() => setSelectedLoan(null)}
                className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Negotiation Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-3xl shadow-lg">
                  {selectedPlayer.ovr}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedPlayer.name.replace(/^[^\w]+\s/, '')}</h3>
                  <div className="text-emerald-400 font-medium">{ROLE_NAMES[selectedPlayer.role]} • {selectedPlayer.age} yaş</div>
                  <div className="text-red-400 text-sm">Maaş: {formatMoney(selectedPlayer.wage)}/hafta</div>
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-slate-400">Piyasa Değeri</div>
                  <div className={`text-xl font-bold ${getDiscountPercent() > 0 ? 'text-slate-500 line-through' : 'text-amber-400'}`}>
                    {formatMoney(selectedPlayer.value)}
                  </div>
                </div>
                {getDiscountPercent() !== 0 && (
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Güncel Teklif</div>
                    <div className={`text-2xl font-bold ${getDiscountPercent() > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatMoney(negotiatedPrice)}
                    </div>
                    <div className={`text-xs ${getDiscountPercent() > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      %{Math.abs(getDiscountPercent())} {getDiscountPercent() > 0 ? 'indirim' : 'artış'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {negotiationState === 'negotiating' && (
              <div className="bg-blue-500/20 rounded-xl p-4 mb-4 text-center animate-pulse">
                <span className="text-blue-400">🤝 Pazarlık yapılıyor...</span>
              </div>
            )}
            {negotiationState === 'success' && (
              <div className="bg-emerald-500/20 rounded-xl p-4 mb-4 text-center">
                <span className="text-emerald-400">✅ Pazarlık başarılı! Fiyat düştü!</span>
              </div>
            )}
            {negotiationState === 'failed' && (
              <div className="bg-red-500/20 rounded-xl p-4 mb-4 text-center">
                <span className="text-red-400">❌ Satıcı teklifi reddetti!</span>
              </div>
            )}

            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i <= negotiationAttempts ? 'bg-slate-600 text-slate-400' : 'bg-blue-500/20 text-blue-400 border border-blue-500'
                  }`}
                >
                  {i <= negotiationAttempts ? '✓' : i}
                </div>
              ))}
            </div>
            <div className="text-center text-slate-400 text-sm mb-4">Pazarlık Hakkı: {3 - negotiationAttempts}/3</div>

            <div className="flex gap-3">
              <button
                onClick={handleNegotiate}
                disabled={negotiationAttempts >= 3 || negotiationState === 'negotiating'}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold rounded-xl transition-all"
              >
                🤝 Pazarlık Yap
              </button>
              <button
                onClick={handleBuy}
                disabled={gameState.budget < negotiatedPrice}
                className={`flex-1 py-3 font-bold rounded-xl transition-all ${
                  gameState.budget >= negotiatedPrice
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                💰 {formatMoney(negotiatedPrice)} Karşılığı Al
              </button>
            </div>
            {gameState.budget < negotiatedPrice && (
              <div className="text-center text-red-400 text-xs mt-2">
                Bütçe yetersiz — {formatMoney(negotiatedPrice - gameState.budget)} daha gerekli.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** Pazarlık yeteneği indirimiyle bütçe kontrolü */
function canAffordWithSkill(price: number, state: GameState): boolean {
  const discount = (state.skills?.negotiation ?? 0) * 0.03;
  return state.budget >= price * (1 - discount);
}
