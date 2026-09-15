import React, { useState } from 'react';
import { GameState } from '../types/game';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  moralBoost: number;
  energyBoost: number;
}

interface ActivityType {
  id: string;
  title: string;
  description: string;
  icon: string;
  location: string;
  menu?: MenuItem[];
  baseCost: number;
  baseEffects: {
    morale: number;
    energy: number;
    teamBonding: number;
  };
}

const RESTAURANT_MENU: MenuItem[] = [
  { id: 'kebab', name: 'İskender Kebap', price: 2500, emoji: '🥙', moralBoost: 8, energyBoost: 5 },
  { id: 'pizza', name: 'Karışık Pizza', price: 2000, emoji: '🍕', moralBoost: 6, energyBoost: 3 },
  { id: 'steak', name: 'Dana Biftek', price: 4000, emoji: '🥩', moralBoost: 10, energyBoost: 8 },
  { id: 'pasta', name: 'Makarna Tabağı', price: 1500, emoji: '🍝', moralBoost: 5, energyBoost: 6 },
  { id: 'salad', name: 'Sezar Salata', price: 1200, emoji: '🥗', moralBoost: 3, energyBoost: 10 },
  { id: 'soup', name: 'Mercimek Çorbası', price: 800, emoji: '🍲', moralBoost: 4, energyBoost: 7 },
  { id: 'burger', name: 'Gurme Burger', price: 2200, emoji: '🍔', moralBoost: 7, energyBoost: 4 },
  { id: 'fish', name: 'Izgara Levrek', price: 3500, emoji: '🐟', moralBoost: 8, energyBoost: 9 },
];

const DESSERT_MENU: MenuItem[] = [
  { id: 'baklava', name: 'Fıstıklı Baklava', price: 1000, emoji: '🍯', moralBoost: 5, energyBoost: 2 },
  { id: 'ice_cream', name: 'Dondurma', price: 600, emoji: '🍨', moralBoost: 4, energyBoost: 1 },
  { id: 'cake', name: 'Çikolatalı Pasta', price: 1200, emoji: '🍰', moralBoost: 6, energyBoost: 2 },
  { id: 'kunefe', name: 'Künefe', price: 1100, emoji: '🧁', moralBoost: 5, energyBoost: 2 },
];

const DRINK_MENU: MenuItem[] = [
  { id: 'cola', name: 'Kola', price: 200, emoji: '🥤', moralBoost: 2, energyBoost: 3 },
  { id: 'ayran', name: 'Ayran', price: 150, emoji: '🥛', moralBoost: 2, energyBoost: 4 },
  { id: 'tea', name: 'Çay', price: 100, emoji: '🍵', moralBoost: 3, energyBoost: 2 },
  { id: 'coffee', name: 'Türk Kahvesi', price: 250, emoji: '☕', moralBoost: 3, energyBoost: 5 },
  { id: 'lemonade', name: 'Limonata', price: 180, emoji: '🍋', moralBoost: 2, energyBoost: 3 },
];

const ACTIVITIES: ActivityType[] = [
  {
    id: 'restaurant',
    title: 'Takım Yemeği',
    description: 'Takım arkadaşlarınız sizi lüks bir restorana davet ediyor!',
    icon: '🍽️',
    location: 'Şehrin En İyi Restoranı',
    menu: RESTAURANT_MENU,
    baseCost: 5000,
    baseEffects: { morale: 5, energy: 5, teamBonding: 10 }
  },
  {
    id: 'bowling',
    title: 'Bowling Gecesi',
    description: 'Takım bowling oynamak için toplanmak istiyor!',
    icon: '🎳',
    location: 'Mega Bowling Center',
    baseCost: 15000,
    baseEffects: { morale: 15, energy: -5, teamBonding: 20 }
  },
  {
    id: 'cinema',
    title: 'Sinema Keyfi',
    description: 'Yeni çıkan aksiyon filmini birlikte izleyelim mi?',
    icon: '🎬',
    location: 'CinemaMax VIP',
    baseCost: 12000,
    baseEffects: { morale: 12, energy: 10, teamBonding: 15 }
  },
  {
    id: 'bbq',
    title: 'Mangal Partisi',
    description: 'Hafta sonu tesislerde mangal yapalım!',
    icon: '🍖',
    location: 'Kulüp Tesisleri',
    baseCost: 20000,
    baseEffects: { morale: 20, energy: 5, teamBonding: 25 }
  },
  {
    id: 'beach',
    title: 'Plaj Günü',
    description: 'Takımca denize gidip rahatlayalım!',
    icon: '🏖️',
    location: 'Özel Plaj',
    baseCost: 25000,
    baseEffects: { morale: 18, energy: 15, teamBonding: 20 }
  },
  {
    id: 'karting',
    title: 'Go-Kart Yarışı',
    description: 'Kim en hızlı? Go-kart pistinde yarışalım!',
    icon: '🏎️',
    location: 'Speed Kart Arena',
    baseCost: 18000,
    baseEffects: { morale: 15, energy: -10, teamBonding: 25 }
  }
];

interface TeamActivityEventProps {
  gameState: GameState;
  onAccept: (activity: ActivityType, selectedItems: MenuItem[], totalCost: number, effects: { morale: number; energy: number }) => void;
  onDecline: () => void;
}

export const TeamActivityEvent: React.FC<TeamActivityEventProps> = ({ gameState, onAccept, onDecline }) => {
  // Rastgele aktivite seç
  const [activity] = useState<ActivityType>(() => 
    ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)]
  );
  
  const [step, setStep] = useState<'invite' | 'menu' | 'summary'>('invite');
  const [selectedMain, setSelectedMain] = useState<MenuItem | null>(null);
  const [selectedDessert, setSelectedDessert] = useState<MenuItem | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<MenuItem | null>(null);

  const calculateTotal = () => {
    let cost = activity.baseCost;
    let morale = activity.baseEffects.morale;
    let energy = activity.baseEffects.energy;

    if (selectedMain) {
      cost += selectedMain.price * 11; // Tüm takım için
      morale += selectedMain.moralBoost;
      energy += selectedMain.energyBoost;
    }
    if (selectedDessert) {
      cost += selectedDessert.price * 11;
      morale += selectedDessert.moralBoost;
      energy += selectedDessert.energyBoost;
    }
    if (selectedDrink) {
      cost += selectedDrink.price * 11;
      morale += selectedDrink.moralBoost;
      energy += selectedDrink.energyBoost;
    }

    return { cost, morale, energy };
  };

  const handleAccept = () => {
    if (activity.menu) {
      setStep('menu');
    } else {
      const { cost, morale, energy } = calculateTotal();
      onAccept(activity, [], cost, { morale, energy });
    }
  };

  const handleConfirmOrder = () => {
    const items = [selectedMain, selectedDessert, selectedDrink].filter(Boolean) as MenuItem[];
    const { cost, morale, energy } = calculateTotal();
    onAccept(activity, items, cost, { morale, energy });
  };

  const { cost, morale, energy } = calculateTotal();
  const canAfford = gameState.budget >= cost;

  // Teklifi yapan oyuncu
  const proposer = gameState.team11[Math.floor(Math.random() * gameState.team11.length)];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 lg:p-4 overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl lg:rounded-3xl w-full max-w-2xl border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20 overflow-hidden my-auto">
        
        {/* Step: Invite */}
        {step === 'invite' && (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="text-7xl mb-4 animate-bounce">{activity.icon}</div>
              <h2 className="text-2xl font-black text-amber-400 mb-2">Takım Aktivitesi!</h2>
              <p className="text-slate-300">{proposer.name} ve takım arkadaşların seni davet ediyor</p>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{activity.title}</h3>
              <p className="text-slate-400 mb-4">{activity.description}</p>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span>📍</span>
                <span>{activity.location}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-2xl">😊</div>
                <div className="text-xs text-slate-400">Moral</div>
                <div className="text-emerald-400 font-bold">+{activity.baseEffects.morale}</div>
              </div>
              <div className="bg-blue-500/20 rounded-xl p-3 text-center">
                <div className="text-2xl">⚡</div>
                <div className="text-xs text-slate-400">Enerji</div>
                <div className={`font-bold ${activity.baseEffects.energy >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {activity.baseEffects.energy >= 0 ? '+' : ''}{activity.baseEffects.energy}
                </div>
              </div>
              <div className="bg-purple-500/20 rounded-xl p-3 text-center">
                <div className="text-2xl">🤝</div>
                <div className="text-xs text-slate-400">Takım Ruhu</div>
                <div className="text-purple-400 font-bold">+{activity.baseEffects.teamBonding}</div>
              </div>
            </div>

            <div className="bg-amber-500/20 rounded-xl p-4 mb-6 text-center">
              <span className="text-amber-300">Tahmini Maliyet: </span>
              <span className="text-amber-400 font-bold text-xl">${activity.baseCost.toLocaleString()}</span>
              {activity.menu && <span className="text-amber-300/70 text-sm block">+ yemek masrafları</span>}
            </div>

            <div className="flex gap-4">
              <button
                onClick={onDecline}
                className="flex-1 py-4 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold"
              >
                Başka Zaman 👋
              </button>
              <button
                onClick={handleAccept}
                disabled={!canAfford}
                className={`flex-1 py-4 rounded-xl font-bold ${
                  canAfford
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                {activity.menu ? 'Gidelim! 🎉' : 'Kabul Et! 🎉'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Menu Selection (for restaurant) */}
        {step === 'menu' && activity.menu && (
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-amber-400">🍽️ Menü Seçimi</h2>
              <p className="text-slate-400">Takıma ne ısmarlamak istersin?</p>
            </div>

            {/* Ana Yemek */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3">🥘 Ana Yemek</h3>
              <div className="grid grid-cols-2 gap-3">
                {RESTAURANT_MENU.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMain(selectedMain?.id === item.id ? null : item)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selectedMain?.id === item.id
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <div className="font-medium text-white text-sm">{item.name}</div>
                        <div className="text-xs text-amber-400">${item.price.toLocaleString()}/kişi</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tatlı */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3">🍰 Tatlı (Opsiyonel)</h3>
              <div className="grid grid-cols-2 gap-3">
                {DESSERT_MENU.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDessert(selectedDessert?.id === item.id ? null : item)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      selectedDessert?.id === item.id
                        ? 'border-pink-500 bg-pink-500/20'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <div className="font-medium text-white text-sm">{item.name}</div>
                        <div className="text-xs text-pink-400">${item.price.toLocaleString()}/kişi</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* İçecek */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-3">🥤 İçecek (Opsiyonel)</h3>
              <div className="grid grid-cols-3 gap-3">
                {DRINK_MENU.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDrink(selectedDrink?.id === item.id ? null : item)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedDrink?.id === item.id
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-2xl block">{item.emoji}</span>
                    <div className="font-medium text-white text-xs mt-1">{item.name}</div>
                    <div className="text-xs text-blue-400">${item.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sipariş Özeti */}
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-white mb-3">📝 Sipariş Özeti (11 kişi)</h3>
              <div className="space-y-2 text-sm">
                {selectedMain && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">{selectedMain.emoji} {selectedMain.name} x11</span>
                    <span className="text-amber-400">${(selectedMain.price * 11).toLocaleString()}</span>
                  </div>
                )}
                {selectedDessert && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">{selectedDessert.emoji} {selectedDessert.name} x11</span>
                    <span className="text-pink-400">${(selectedDessert.price * 11).toLocaleString()}</span>
                  </div>
                )}
                {selectedDrink && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">{selectedDrink.emoji} {selectedDrink.name} x11</span>
                    <span className="text-blue-400">${(selectedDrink.price * 11).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-300">🎉 Organizasyon</span>
                  <span className="text-slate-400">${activity.baseCost.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-600 pt-2 flex justify-between font-bold">
                  <span className="text-white">Toplam</span>
                  <span className="text-amber-400 text-lg">${cost.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Effects */}
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-600">
                <div className="flex items-center gap-1 text-sm">
                  <span>😊</span>
                  <span className="text-emerald-400">+{morale} Moral</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span>⚡</span>
                  <span className={energy >= 0 ? 'text-blue-400' : 'text-red-400'}>
                    {energy >= 0 ? '+' : ''}{energy} Enerji
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('invite')}
                className="flex-1 py-4 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold"
              >
                ← Geri
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={!canAfford || !selectedMain}
                className={`flex-1 py-4 rounded-xl font-bold ${
                  canAfford && selectedMain
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                {!selectedMain ? 'Ana Yemek Seç' : !canAfford ? 'Bütçe Yetersiz' : 'Sipariş Ver! 🍽️'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Takım aktivitesi oluşturucu - %20 şans ile maç sonrası
export const shouldTriggerTeamActivity = (): boolean => {
  return Math.random() < 0.20;
};
