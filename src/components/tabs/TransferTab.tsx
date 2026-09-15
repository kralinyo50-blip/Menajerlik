import React, { useState } from 'react';
import { GameState, Player } from '../../types/game';
import { ROLE_NAMES } from '../../data/constants';

interface TransferTabProps {
  gameState: GameState;
  onBuyPlayer: (player: Player, finalPrice: number) => void;
  onRefreshMarket: () => void;
}

export const TransferTab: React.FC<TransferTabProps> = ({ gameState, onBuyPlayer, onRefreshMarket }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [negotiationState, setNegotiationState] = useState<'none' | 'negotiating' | 'success' | 'failed'>('none');
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(0);
  const [negotiationAttempts, setNegotiationAttempts] = useState<number>(0);

  const filteredPlayers = filter === 'ALL' 
    ? gameState.marketList 
    : gameState.marketList.filter(p => p.role === filter);

  const canAfford = (price: number) => gameState.budget >= price;
  const refreshCost = 200000;
  const canRefresh = gameState.budget >= refreshCost;

  const handleRefresh = () => {
    if (canRefresh) {
      onRefreshMarket();
    } else {
      alert('Transfer listesini yenilemek için $200,000 gerekli!');
    }
  };

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

    // Pazarlık başarı şansı - her deneme sonrası düşer
    // Scout seviyesi başarı şansını artırır
    const baseChance = 0.5 - (negotiationAttempts * 0.15) + (gameState.scoutLvl * 0.05);
    const success = Math.random() < baseChance;

    setTimeout(() => {
      if (success) {
        // %5 ile %20 arası indirim
        const discountPercent = 5 + Math.floor(Math.random() * 16);
        const newPrice = Math.floor(negotiatedPrice * (1 - discountPercent / 100));
        setNegotiatedPrice(newPrice);
        setNegotiationState('success');
      } else {
        // Başarısız - %30 şans ile satıcı kızar ve fiyat artar
        if (Math.random() < 0.3) {
          const increasePercent = 5 + Math.floor(Math.random() * 10);
          const newPrice = Math.floor(negotiatedPrice * (1 + increasePercent / 100));
          setNegotiatedPrice(newPrice);
        }
        setNegotiationState('failed');
      }
    }, 1000);
  };

  const handleBuy = () => {
    if (selectedPlayer && canAfford(negotiatedPrice)) {
      onBuyPlayer({ ...selectedPlayer, value: negotiatedPrice }, negotiatedPrice);
      setSelectedPlayer(null);
      setNegotiationState('none');
    }
  };

  const getDiscountPercent = () => {
    if (!selectedPlayer) return 0;
    return Math.round((1 - negotiatedPrice / selectedPlayer.value) * 100);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Transfer Pazarı</h2>
          <p className="text-slate-400 text-sm">Scout Seviyesi: {gameState.scoutLvl} • Pazarlık başarı şansı: %{Math.round((50 + gameState.scoutLvl * 5))}+</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/30">
            <span className="text-amber-300 text-sm">Bütçe:</span>
            <span className="text-amber-400 font-bold ml-2">${gameState.budget.toLocaleString()}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={!canRefresh}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              canRefresh 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            🔄 Yenile
            <span className="text-xs text-amber-400">($200K)</span>
          </button>
        </div>
      </div>

      {/* Weekly Wages Info */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>💰</span>
          <span className="text-red-300 text-sm">Haftalık Maaş Gideri:</span>
          <span className="text-red-400 font-bold">
            ${([...gameState.team11, ...gameState.bench].reduce((acc, p) => acc + p.wage, 0) * 5).toLocaleString()}
          </span>
        </div>
        <span className="text-slate-400 text-xs">Her 5 maçta bir ödenir</span>
      </div>

      {/* News Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-xl p-4 mb-6 border border-emerald-500/30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📰</span>
          <div>
            <div className="text-emerald-400 font-medium">Transfer Haberleri</div>
            <div className="text-slate-300 text-sm">
              {gameState.news[0] || 'Transfer dönemi hareketli geçiyor...'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'KL', 'STP', 'SB', 'OS', 'FW'].map(role => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === role 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            {role === 'ALL' ? 'Tümü' : ROLE_NAMES[role]}
          </button>
        ))}
      </div>

      {/* Player Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map(player => {
            const isLegend = player.name.startsWith('👑');
            const isStar = player.name.startsWith('⭐');
            const isYouth = player.name.startsWith('🌟');
            const specialType = isLegend ? 'legend' : isStar ? 'star' : isYouth ? 'youth' : 'normal';
            
            const borderColors = {
              legend: 'border-amber-500 shadow-lg shadow-amber-500/30',
              star: 'border-purple-500 shadow-lg shadow-purple-500/20',
              youth: 'border-emerald-500 shadow-lg shadow-emerald-500/20',
              normal: 'border-slate-700/50 hover:border-emerald-500/50'
            };

            const gradients = {
              legend: 'from-amber-400 to-amber-600',
              star: 'from-purple-400 to-purple-600',
              youth: 'from-emerald-400 to-emerald-600',
              normal: 'from-amber-400 to-amber-600'
            };

            return (
              <div
                key={player.id}
                onClick={() => startNegotiation(player)}
                className={`bg-slate-800/50 rounded-2xl p-4 border-2 transition-all cursor-pointer hover:scale-[1.02] relative overflow-hidden ${
                  canAfford(player.value)
                    ? borderColors[specialType]
                    : 'border-red-500/30 opacity-60'
                }`}
              >
                {specialType !== 'normal' && (
                  <div className={`absolute top-0 right-0 px-2 py-1 text-xs font-bold rounded-bl-lg ${
                    isLegend ? 'bg-amber-500 text-black' : isStar ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {isLegend ? 'EFSANE' : isStar ? 'YILDIZ' : 'GENÇ'}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradients[specialType]} flex items-center justify-center font-black text-black text-xl shadow-lg`}>
                    {player.ovr}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-400 font-medium">{ROLE_NAMES[player.role]}</div>
                    <div className="text-xs text-slate-400">{player.age} yaş</div>
                  </div>
                </div>

                <div className="font-bold text-white mb-2">{player.name}</div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-700/30 px-2 py-1 rounded text-xs">
                    <span className="text-slate-400">Potansiyel:</span>
                    <span className="text-emerald-400 ml-1 font-bold">{player.potential}</span>
                  </div>
                  <div className="bg-slate-700/30 px-2 py-1 rounded text-xs">
                    <span className="text-slate-400">Maaş:</span>
                    <span className="text-red-400 ml-1">${player.wage.toLocaleString()}/h</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-amber-400 font-bold">${player.value.toLocaleString()}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startNegotiation(player);
                    }}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium"
                  >
                    💬 Pazarlık
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Negotiation Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-black text-3xl shadow-lg">
                  {selectedPlayer.ovr}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedPlayer.name}</h3>
                  <div className="text-emerald-400 font-medium">{ROLE_NAMES[selectedPlayer.role]} • {selectedPlayer.age} yaş</div>
                  <div className="text-red-400 text-sm">Maaş: ${selectedPlayer.wage.toLocaleString()}/hafta</div>
                </div>
              </div>
              <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            {/* Price Display */}
            <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-slate-400">Orijinal Fiyat</div>
                  <div className={`text-xl font-bold ${getDiscountPercent() > 0 ? 'text-slate-500 line-through' : 'text-amber-400'}`}>
                    ${selectedPlayer.value.toLocaleString()}
                  </div>
                </div>
                {getDiscountPercent() > 0 && (
                  <div className="text-right">
                    <div className="text-sm text-emerald-400">İndirimli Fiyat</div>
                    <div className="text-2xl font-bold text-emerald-400">${negotiatedPrice.toLocaleString()}</div>
                    <div className="text-xs text-emerald-300">%{getDiscountPercent()} indirim!</div>
                  </div>
                )}
                {getDiscountPercent() < 0 && (
                  <div className="text-right">
                    <div className="text-sm text-red-400">Artan Fiyat</div>
                    <div className="text-2xl font-bold text-red-400">${negotiatedPrice.toLocaleString()}</div>
                    <div className="text-xs text-red-300">%{Math.abs(getDiscountPercent())} artış!</div>
                  </div>
                )}
              </div>
            </div>

            {/* Negotiation Status */}
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

            {/* Negotiation Attempts */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map(i => (
                <div 
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i <= negotiationAttempts 
                      ? 'bg-slate-600 text-slate-400' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500'
                  }`}
                >
                  {i <= negotiationAttempts ? '✓' : i}
                </div>
              ))}
            </div>
            <div className="text-center text-slate-400 text-sm mb-4">
              Pazarlık Hakkı: {3 - negotiationAttempts}/3
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleNegotiate}
                disabled={negotiationAttempts >= 3 || negotiationState === 'negotiating'}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  negotiationAttempts < 3 && negotiationState !== 'negotiating'
                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                🤝 Pazarlık Yap
              </button>
              <button
                onClick={handleBuy}
                disabled={!canAfford(negotiatedPrice)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  canAfford(negotiatedPrice)
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                💰 Satın Al (${negotiatedPrice.toLocaleString()})
              </button>
            </div>

            {!canAfford(negotiatedPrice) && (
              <div className="mt-3 text-center text-red-400 text-sm">
                Bütçe yetersiz! (${(negotiatedPrice - gameState.budget).toLocaleString()} eksik)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
