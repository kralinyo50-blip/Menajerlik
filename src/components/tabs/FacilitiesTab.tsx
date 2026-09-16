import React from 'react';
import { GameState, Staff } from '../../types/game';

interface FacilitiesTabProps {
  gameState: GameState;
  onUpgradeFacility: (type: 'stadium' | 'training' | 'academy', cost: number) => void;
  onHireStaff: (type: Staff['type'], cost: number) => void;
  onDiscoverYouth: () => void;
  onPromoteYouth: (playerId: number) => void;
}

export const FacilitiesTab: React.FC<FacilitiesTabProps> = ({ 
  gameState, 
  onUpgradeFacility, 
  onHireStaff,
  onDiscoverYouth,
  onPromoteYouth
}) => {
  const facilities = [
    {
      id: 'stadium',
      name: 'Stadyum',
      icon: '🏟️',
      level: gameState.stadiumLvl,
      desc: 'Daha fazla taraftar, daha fazla gelir',
      benefit: `Kapasite: ${(gameState.stadiumLvl * 5000).toLocaleString()}`,
      cost: 1200000 * gameState.stadiumLvl,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'training',
      name: 'Antrenman Tesisi',
      icon: '🏋️',
      level: gameState.trainingLvl,
      desc: 'Tüm oyuncuların OVR değerini artırır',
      benefit: `+${gameState.trainingLvl} OVR bonus`,
      cost: 1000000 * gameState.trainingLvl,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'academy',
      name: 'Akademi',
      icon: '🎓',
      level: gameState.academyLevel,
      desc: 'Daha yetenekli genç oyuncular keşfet',
      benefit: `Kalite bonusu: +${gameState.academyLevel * 5}`,
      cost: 500000 * gameState.academyLevel,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const staffOptions = [
    { type: 'coach' as const, name: 'Antrenör', icon: '👨‍🏫', cost: 250000, desc: 'Tüm oyunculara +1 OVR' },
    { type: 'scout' as const, name: 'Scout', icon: '🔍', cost: 200000, desc: 'Transfer pazarında daha iyi oyuncular' },
    { type: 'physio' as const, name: 'Fizyoterapist', icon: '🩺', cost: 300000, desc: 'Hızlı enerji yenileme & sakatlık önleme' },
    { type: 'analyst' as const, name: 'Analist', icon: '📊', cost: 220000, desc: 'Maç içi taktik avantajları' }
  ];

  const hasStaff = (type: Staff['type']) => gameState.staff.some(s => s.type === type);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Budget Display */}
        <div className="bg-amber-500/20 rounded-xl p-4 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <div className="text-sm text-amber-300">Kulüp Bütçesi</div>
              <div className="text-2xl font-bold text-amber-400">${gameState.budget.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">🏗️ Tesis Yönetimi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {facilities.map(facility => (
              <div key={facility.id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{facility.icon}</span>
                  <div className="bg-slate-700/50 px-3 py-1 rounded-full">
                    <span className="text-emerald-400 font-bold">Seviye {facility.level}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{facility.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{facility.desc}</p>
                <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
                  <div className="text-xs text-slate-400">Mevcut Fayda</div>
                  <div className="text-emerald-400 font-medium">{facility.benefit}</div>
                </div>
                <button
                  onClick={() => onUpgradeFacility(facility.id as 'stadium' | 'training' | 'academy', facility.cost)}
                  disabled={gameState.budget < facility.cost}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    gameState.budget >= facility.cost
                      ? `bg-gradient-to-r ${facility.color} text-white hover:opacity-90`
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Yükselt - ${facility.cost.toLocaleString()}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Staff */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">👥 Personel Yönetimi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {staffOptions.map(staff => {
              const hired = hasStaff(staff.type);
              return (
                <div key={staff.type} className={`bg-slate-800/50 rounded-2xl p-4 border ${
                  hired ? 'border-emerald-500/50' : 'border-slate-700/50'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{staff.icon}</span>
                    <div>
                      <div className="font-bold text-white">{staff.name}</div>
                      {hired && <div className="text-xs text-emerald-400">✓ Aktif</div>}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">{staff.desc}</p>
                  {!hired ? (
                    <button
                      onClick={() => onHireStaff(staff.type, staff.cost)}
                      disabled={gameState.budget < staff.cost}
                      className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
                        gameState.budget >= staff.cost
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                          : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      İşe Al - ${staff.cost.toLocaleString()}
                    </button>
                  ) : (
                    <div className="bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-center text-sm font-medium">
                      İşe Alındı
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Youth Academy */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">🌟 Genç Akademi</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scout Action */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">🔭</span>
                <div>
                  <h3 className="font-bold text-white">Yetenek Ara</h3>
                  <p className="text-slate-400 text-sm">Akademi Seviyesi: {gameState.academyLevel}</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-4">
                Akademi seviyesi arttıkça daha yetenekli oyuncular bulma şansınız artar.
              </p>
              <button
                onClick={onDiscoverYouth}
                disabled={gameState.budget < 50000}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  gameState.budget >= 50000
                    ? 'bg-purple-500 hover:bg-purple-400 text-white'
                    : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
              >
                🔍 Yetenek Ara - $50,000
              </button>
            </div>

            {/* Youth Players */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="font-bold text-white mb-4">Akademi Oyuncuları</h3>
              {gameState.academyPlayers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="text-4xl block mb-2">🌱</span>
                  Henüz akademide oyuncu yok
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.academyPlayers.map(player => (
                    <div key={player.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                          {player.ovr}
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">{player.name}</div>
                          <div className="text-xs text-slate-400">{player.role} • {player.age} yaş • Pot: {player.potential}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => onPromoteYouth(player.id)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-xs font-medium transition-all"
                      >
                        A Takıma Al
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
