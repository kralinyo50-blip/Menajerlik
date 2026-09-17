import React, { useState, useMemo } from 'react';
import { GameState } from '../../types/game';
import { TURKEY_CITIES, SHOP_TYPES, REGIONS, calculateShopIncome, ShopBranch, ShopType, City } from '../../data/cities';

interface MerchTabProps {
  gameState: GameState;
  onOpenShop: (cityId: number, district: string, shopType: ShopType) => void;
}

export const MerchTab: React.FC<MerchTabProps> = ({ gameState, onOpenShop }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedShopType, setSelectedShopType] = useState<ShopType>('small');
  const [step, setStep] = useState<'map' | 'city' | 'design'>('map');
  const [search, setSearch] = useState('');

  const branches: ShopBranch[] = (gameState as any).shopBranches || [];

  const topPlayers = useMemo(() =>
    [...gameState.team11].sort((a, b) => b.ovr - a.ovr).slice(0, 3).map(p => ({ name: p.name, ovr: p.ovr })),
    [gameState.team11]
  );

  const leaguePos = useMemo(() => {
    const sorted = [...gameState.league].sort((a, b) => b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga));
    return sorted.findIndex(t => t.isUser) + 1;
  }, [gameState.league]);

  const totalWeeklyIncome = useMemo(() =>
    branches.reduce((acc, b) => {
      const city = TURKEY_CITIES.find(c => c.id === b.cityId);
      if (!city) return acc;
      return acc + calculateShopIncome(b, city, topPlayers, leaguePos);
    }, 0),
    [branches, topPlayers, leaguePos]
  );

  const filteredCities = useMemo(() => {
    let cities = TURKEY_CITIES;
    if (selectedRegion !== 'all') cities = cities.filter(c => c.region === selectedRegion);
    if (search) cities = cities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    return cities.sort((a, b) => b.population - a.population);
  }, [selectedRegion, search]);

  const getBranchesInCity = (cityId: number) => branches.filter(b => b.cityId === cityId);
  const hasBranchInDistrict = (cityId: number, district: string) =>
    branches.some(b => b.cityId === cityId && b.district === district);

  const shopTypeInfo = SHOP_TYPES.find(s => s.type === selectedShopType)!;
  const setupCost = selectedCity
    ? Math.floor(shopTypeInfo.baseCost * (selectedCity.population / 1000000 + 0.5))
    : shopTypeInfo.baseCost;

  const previewIncome = selectedCity
    ? calculateShopIncome(
        { id: '', cityId: selectedCity.id, district: selectedDistrict, shopType: selectedShopType, weeklyIncome: 0, setupCost: 0, opened: true, openedWeek: 0 },
        selectedCity, topPlayers, leaguePos
      )
    : 0;

  const canAfford = gameState.budget >= setupCost;

  const handleOpenShop = () => {
    if (selectedCity && selectedDistrict && canAfford) {
      onOpenShop(selectedCity.id, selectedDistrict, selectedShopType);
      setStep('map');
      setSelectedCity(null);
      setSelectedDistrict('');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-2xl p-4 border border-pink-500/30">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">👕 Forma Satış & Şube Mağazalar</h2>
              <p className="text-slate-400 text-xs mt-1">81 ilde mağaza açarak forma satışından gelir elde et</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg text-center">
                <div className="text-[10px] text-slate-400">Toplam Şube</div>
                <div className="text-lg font-bold text-emerald-400">{branches.length}</div>
              </div>
              <div className="bg-slate-800/50 px-3 py-1.5 rounded-lg text-center">
                <div className="text-[10px] text-slate-400">5 Haftalık Gelir</div>
                <div className="text-lg font-bold text-amber-400">${(totalWeeklyIncome * 5).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Players = Top Sellers */}
        {topPlayers.length > 0 && (
          <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
            <div className="text-xs text-pink-400 font-bold mb-2">🔥 En Çok Satan Formalar</div>
            <div className="flex gap-3 overflow-x-auto">
              {topPlayers.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-lg flex-shrink-0">
                  <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                  <div>
                    <div className="text-white text-xs font-medium truncate max-w-[100px]">{p.name}</div>
                    <div className="text-amber-400 text-[10px]">OVR: {p.ovr} • Satış x{(p.ovr / 20).toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Map/City Selection */}
        {step === 'map' && (
          <>
            {/* Region + Search */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-shrink-0">
                <button
                  onClick={() => setSelectedRegion('all')}
                  className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${selectedRegion === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-300'}`}
                >Tümü</button>
                {REGIONS.map(r => (
                  <button key={r} onClick={() => setSelectedRegion(r)}
                    className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${selectedRegion === r ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-300'}`}
                  >{r}</button>
                ))}
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 İl ara..."
                className="flex-1 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* City Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredCities.map(city => {
                const cityBranches = getBranchesInCity(city.id);
                const hasBranch = cityBranches.length > 0;

                return (
                  <button
                    key={city.id}
                    onClick={() => { setSelectedCity(city); setStep('city'); setSelectedDistrict(''); }}
                    className={`p-3 rounded-2xl border transition-all text-left hover:scale-[1.02] ${
                      hasBranch ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">{city.name}</span>
                      {hasBranch && <span className="text-emerald-400 text-xs">✓{cityBranches.length}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">{city.region}</div>
                    <div className="text-[10px] text-slate-400">Nüfus: {(city.population / 1000).toFixed(0)}K</div>
                  </button>
                );
              })}
            </div>

            {/* Existing Branches */}
            {branches.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white mb-2">📍 Açık Şubeleriniz</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {branches.map(b => {
                    const city = TURKEY_CITIES.find(c => c.id === b.cityId)!;
                    const info = SHOP_TYPES.find(s => s.type === b.shopType)!;
                    const income = calculateShopIncome(b, city, topPlayers, leaguePos);
                    return (
                      <div key={b.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex items-center gap-3">
                        <span className="text-2xl">{info.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-medium truncate">{city.name} / {b.district}</div>
                          <div className="text-[10px] text-slate-400">{info.name}</div>
                        </div>
                        <div className="text-emerald-400 text-xs font-bold">${income.toLocaleString()}/h</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Step: City Detail / District Selection */}
        {step === 'city' && selectedCity && (
          <div>
            <button onClick={() => setStep('map')} className="text-slate-400 hover:text-white text-sm mb-3 flex items-center gap-1">← Geri</button>
            
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">{selectedCity.name}</h3>
                  <p className="text-slate-400 text-xs">{selectedCity.region} • Nüfus: {selectedCity.population.toLocaleString()}</p>
                </div>
                <div className="text-3xl">🏙️</div>
              </div>
            </div>

            <h4 className="text-sm font-bold text-white mb-2">İlçe Seçin</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {selectedCity.districts.map(district => {
                const taken = hasBranchInDistrict(selectedCity.id, district);
                return (
                  <button
                    key={district}
                    onClick={() => { if (!taken) { setSelectedDistrict(district); setStep('design'); } }}
                    disabled={taken}
                    className={`p-3 rounded-2xl border-2 transition-all text-left ${
                      taken
                        ? 'bg-emerald-500/10 border-emerald-500/30 cursor-not-allowed'
                        : 'bg-slate-800/50 border-slate-700/50 hover:border-amber-500 cursor-pointer'
                    }`}
                  >
                    <div className="font-medium text-white text-sm">{district}</div>
                    {taken ? (
                      <div className="text-emerald-400 text-[10px]">✓ Mağaza açık</div>
                    ) : (
                      <div className="text-amber-400 text-[10px]">Mağaza açılabilir</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: Shop Design Selection */}
        {step === 'design' && selectedCity && selectedDistrict && (
          <div>
            <button onClick={() => setStep('city')} className="text-slate-400 hover:text-white text-sm mb-3 flex items-center gap-1">← Geri</button>

            <div className="bg-slate-800/50 rounded-2xl p-3 mb-4 border border-slate-700/50">
              <div className="text-xs text-slate-400 leading-relaxed">📍 {selectedCity.name} / {selectedDistrict}</div>
            </div>

            <h4 className="text-sm font-bold text-white mb-3">Mağaza Tipi Seçin</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {SHOP_TYPES.map(shopType => {
                const cost = Math.floor(shopType.baseCost * (selectedCity.population / 1000000 + 0.5));
                const isSelected = selectedShopType === shopType.type;
                const affordable = gameState.budget >= cost;

                return (
                  <button
                    key={shopType.type}
                    onClick={() => setSelectedShopType(shopType.type)}
                    className={`rounded-2xl border-2 overflow-hidden transition-all text-left ${
                      isSelected
                        ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                        : affordable
                        ? 'border-slate-700/50 hover:border-slate-500'
                        : 'border-red-500/30 opacity-50'
                    }`}
                  >
                    {/* Shop Image */}
                    <div className="h-28 bg-slate-700/50 overflow-hidden">
                      <img
                        src={shopType.image}
                        alt={shopType.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{shopType.emoji}</span>
                        <div className="font-bold text-white text-sm">{shopType.name}</div>
                      </div>
                      <p className="text-slate-400 text-[10px] mb-2">{shopType.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-400 font-bold text-sm">${cost.toLocaleString()}</span>
                        <span className="text-emerald-400 text-[10px]">x{shopType.incomeMultiplier} gelir</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Preview & Confirm */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/30 mb-4">
              <h4 className="font-bold text-white mb-3">📋 Mağaza Özeti</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Konum:</span> <span className="text-white">{selectedCity.name} / {selectedDistrict}</span></div>
                <div><span className="text-slate-400">Tip:</span> <span className="text-white">{shopTypeInfo.emoji} {shopTypeInfo.name}</span></div>
                <div><span className="text-slate-400">Kurulum:</span> <span className="text-amber-400 font-bold">${setupCost.toLocaleString()}</span></div>
                <div><span className="text-slate-400">Haftalık Gelir:</span> <span className="text-emerald-400 font-bold">~${previewIncome.toLocaleString()}</span></div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400">
                💡 Gelir; şehir nüfusu, lig sırası ve yıldız oyunculara göre değişir.
                Amortismanı: ~{previewIncome > 0 ? Math.ceil(setupCost / previewIncome) : '∞'} hafta
              </div>
            </div>

            <button
              onClick={handleOpenShop}
              disabled={!canAfford}
              className={`w-full py-3 rounded-2xl font-bold transition-all ${
                canAfford
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              {canAfford ? `🏪 Mağaza Aç - $${setupCost.toLocaleString()}` : `Bütçe Yetersiz ($${(setupCost - gameState.budget).toLocaleString()} eksik)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
