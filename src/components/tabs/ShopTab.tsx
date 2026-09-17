import React, { useState } from 'react';
import { GameState } from '../../types/game';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  effect: string;
  emoji: string;
}

interface ShopTabProps {
  gameState: GameState;
  onPurchase: (itemId: string, quantity: number) => void;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'white_monster',
    name: 'Beyaz Monster Energy',
    description: 'Tüm takımın enerjisini %100 yapar. Ultra saf enerji!',
    price: 15000,
    image: '/images/white-monster.png',
    effect: 'Tüm oyuncular %100 enerji',
    emoji: '⚡'
  },
  {
    id: 'protein_bar',
    name: 'Protein Bar Paketi',
    description: 'Antrenman sonrası toparlanma. Oyuncu gelişimini hızlandırır.',
    price: 25000,
    image: '/images/protein-bar.png',
    effect: 'Rastgele 3 oyuncuya +1 OVR',
    emoji: '💪'
  },
  {
    id: 'sports_drink',
    name: 'Sporcu İçeceği Kasası',
    description: 'Hidrasyon ve elektrolit dengesi. Sakatlık riskini azaltır.',
    price: 20000,
    image: '/images/sports-drink.png',
    effect: 'Sakatları 1 hafta erken iyileştirir',
    emoji: '💧'
  },
  {
    id: 'massage_session',
    name: 'Masaj Seansı',
    description: 'Profesyonel spor masajı. Yorgunluğu giderir.',
    price: 35000,
    image: '',
    effect: 'Tüm oyuncular +50 enerji',
    emoji: '💆'
  },
  {
    id: 'motivation_speech',
    name: 'Motivasyon Koçu',
    description: 'Profesyonel motivasyon koçu ile seans.',
    price: 40000,
    image: '',
    effect: 'Tüm oyuncular +20 moral',
    emoji: '🎯'
  },
  {
    id: 'team_jersey',
    name: 'Yeni Forma Seti',
    description: 'Takıma yeni formalar. Moral patlaması!',
    price: 75000,
    image: '',
    effect: 'Tüm oyuncular +30 moral, +$50K taraftar geliri',
    emoji: '👕'
  }
];

export const ShopTab: React.FC<ShopTabProps> = ({ gameState, onPurchase }) => {
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const handlePurchase = (item: ShopItem) => {
    if (gameState.budget >= item.price) {
      onPurchase(item.id, 1);
      setPurchaseSuccess(item.name);
      setTimeout(() => setPurchaseSuccess(null), 3000);
      setSelectedItem(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                🛒 Kulüp Dükkanı
              </h2>
              <p className="text-slate-400 mt-1">Takımını güçlendir, performansı artır!</p>
            </div>
            <div className="bg-slate-800/50 px-4 py-2 rounded-2xl">
              <span className="text-amber-300 text-sm">Bütçe:</span>
              <span className="text-amber-400 font-bold ml-2">${gameState.budget.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {purchaseSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-2xl p-4 text-center animate-pulse">
            <span className="text-emerald-400 font-bold">✅ {purchaseSuccess} satın alındı!</span>
          </div>
        )}

        {/* Shop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHOP_ITEMS.map(item => {
            const canAfford = gameState.budget >= item.price;
            
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`bg-slate-800/50 rounded-2xl p-5 border-2 transition-all cursor-pointer hover:scale-[1.02] ${
                  canAfford 
                    ? 'border-slate-700/50 hover:border-purple-500/50' 
                    : 'border-red-500/30 opacity-60'
                }`}
              >
                {/* Product Image or Emoji */}
                <div className="h-32 bg-slate-700/30 rounded-2xl mb-4 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="h-28 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span className={`text-6xl ${item.image ? 'hidden' : ''}`}>{item.emoji}</span>
                </div>

                {/* Product Info */}
                <div className="text-center">
                  <h3 className="font-bold text-white text-lg mb-1">{item.name}</h3>
                  <p className="text-slate-400 text-sm mb-3">{item.description}</p>
                  
                  {/* Effect Badge */}
                  <div className="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full inline-block mb-3">
                    {item.effect}
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-2xl font-black text-amber-400">${item.price.toLocaleString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canAfford) handlePurchase(item);
                      }}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white'
                          : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Satın Al' : 'Yetersiz'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Special Offers */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/30">
          <h3 className="text-lg font-black tracking-tight text-amber-400 mb-2">🔥 Haftanın Fırsatı</h3>
          <p className="text-slate-300 text-sm">
            Her hafta yeni ürünler ve indirimler! Takımını en iyi şekilde destekle.
          </p>
        </div>

        {/* Purchase Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="text-center">
                {/* Product Display */}
                <div className="h-40 bg-slate-700/30 rounded-2xl mb-4 flex items-center justify-center">
                  {selectedItem.image ? (
                    <img 
                      src={selectedItem.image} 
                      alt={selectedItem.name}
                      className="h-36 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-7xl">{selectedItem.emoji}</span>
                  )}
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white mb-2">{selectedItem.name}</h3>
                <p className="text-slate-400 mb-4">{selectedItem.description}</p>

                <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-2xl mb-4">
                  <span className="font-bold">Etki:</span> {selectedItem.effect}
                </div>

                <div className="text-3xl font-black text-amber-400 mb-6">
                  ${selectedItem.price.toLocaleString()}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-2xl font-medium"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => handlePurchase(selectedItem)}
                    disabled={gameState.budget < selectedItem.price}
                    className={`flex-1 py-3 rounded-2xl font-bold ${
                      gameState.budget >= selectedItem.price
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Satın Al
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
