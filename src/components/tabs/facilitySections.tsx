import React from 'react';
import { GameState, Staff } from '../../types/game';
import { SCOUT_REGIONS } from '../../data/constants';

interface StaffSectionProps {
  gameState: GameState;
  onHireStaff: (type: Staff['type'], cost: number) => void;
}

/**
 * Personel Yönetimi — eski "Tesisler" sekmesinden Stadyum sekmesine taşındı.
 */
export const StaffSection: React.FC<StaffSectionProps> = ({ gameState, onHireStaff }) => {
  const staffOptions = [
    { type: 'coach' as const, name: 'Antrenör', icon: '👨‍🏫', cost: 250000, desc: 'Tüm oyunculara +1 OVR, antrenman verimi ↑' },
    { type: 'scout' as const, name: 'Scout', icon: '🔍', cost: 200000, desc: 'Transfer pazarında daha iyi oyuncular' },
    { type: 'physio' as const, name: 'Fizyoterapist', icon: '🩺', cost: 300000, desc: 'Hızlı enerji yenileme & sakatlık önleme' },
    { type: 'analyst' as const, name: 'Analist', icon: '📊', cost: 220000, desc: 'Maç içi taktik avantajları (+3 güç)' },
    { type: 'agent' as const, name: 'Oyuncu Menajeri', icon: '💼', cost: 400000, desc: 'Sözleşme yenilemelerinde imza parası %18 düşer — adam herkesi tanır' },
    { type: 'fixer' as const, name: 'Kabaracı', icon: '🕶️', cost: 550000, desc: '"İşlerin adamı" — şike/rüşvet dosyalarının %45\'ini daha kapatmadan çözer (yakalanma riski -45%)' },
    { type: 'lawyer' as const, name: 'Avukat', icon: '⚖️', cost: 480000, desc: 'Disiplin cezalarını yarıya indirir — mahkemede kimse onunla konuşamaz' }
  ];
  const hasStaff = (type: Staff['type']) => gameState.staff.some(s => s.type === type);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
        <h3 className="text-sm font-bold text-emerald-400 mb-1">👥 Personel Yönetimi</h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Personel, tesislerle birlikte çalışır: antrenör gelişimi hızlandırır, fizyoterapist rejenerasyon merkezinin etkisini büyütür.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {staffOptions.map(staff => {
            const hired = hasStaff(staff.type);
            return (
              <div key={staff.type} className={`bg-slate-800/50 rounded-2xl p-4 border ${hired ? 'border-emerald-500/50' : 'border-slate-700/50'}`}>
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
    </div>
  );
};

interface YouthScoutSectionProps {
  gameState: GameState;
  onDiscoverYouth: () => void;
  onPromoteYouth: (playerId: number) => void;
  onSendScout?: (regionId: string) => void;
  onClaimScoutReport?: (reportId: string, playerId?: number) => void;
  onDismissScoutReport?: (reportId: string) => void;
  onCancelScoutMission?: (missionId: string) => void;
}

/**
 * Genç Akademi & Scout Ağı — eski "Tesisler" sekmesinden Stadyum sekmesine taşındı.
 */
export const YouthScoutSection: React.FC<YouthScoutSectionProps> = ({
  gameState, onDiscoverYouth, onPromoteYouth, onSendScout, onClaimScoutReport, onDismissScoutReport, onCancelScoutMission
}) => (
  <div className="space-y-4">
    <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-emerald-400">🌟 Genç Akademi & Scout Ağı</h3>
        <span className="text-[11px] bg-violet-500/15 border border-violet-500/30 text-violet-300 px-2.5 py-1 rounded-full">DENGELİ • GERÇEKÇİ • HAFİF DRAMA</span>
      </div>
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-3 mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-300">Aktif görev: <b className="text-white">{(gameState.scoutMissions || []).length}/3</b></span>
        <span className="w-1 h-1 bg-slate-600 rounded-full" />
        <span className="text-slate-300">Rapor: <b className="text-white">{(gameState.scoutReports || []).length}</b></span>
        <span className="w-1 h-1 bg-slate-600 rounded-full" />
        <span className="text-slate-400 hidden sm:inline">Bölge seç → gönder → 2-3 hafta sonra rapor</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {SCOUT_REGIONS.map(r => {
          const canAfford = gameState.budget >= r.cost;
          const full = (gameState.scoutMissions || []).length >= 3;
          return (
            <div key={r.id} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{r.flag}</span>
                <div>
                  <div className="font-black text-white text-sm leading-none">{r.name}</div>
                  <div className="text-[11px] text-slate-400">{r.desc}</div>
                </div>
              </div>
              <div className="text-[11px] bg-slate-900/40 rounded-lg p-2 border border-slate-700/30 space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Maliyet</span><span className="text-amber-300 font-bold">${r.cost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Süre</span><span className="text-white">{r.weeks} hafta</span></div>
                <div className="flex justify-between"><span className="text-slate-400">OVR</span><span className="text-white">{r.ovrRange[0]}-{r.ovrRange[1]}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Potansiyel</span><span className="text-emerald-300">{r.potRange[0]}-{r.potRange[1]}</span></div>
                <div className="text-[10px] text-violet-300">✦ {r.trait}</div>
              </div>
              <button
                onClick={() => onSendScout?.(r.id)}
                disabled={!canAfford || full}
                className={`mt-auto py-2 rounded-xl text-xs font-black ${canAfford && !full ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
              >
                {full ? 'Dolu (3/3)' : canAfford ? `Gönder — $${(r.cost / 1000).toFixed(0)}k` : 'Bütçe yetmez'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">🔭</span>
            <div>
              <h3 className="font-bold text-white">Hızlı Yetenek Ara</h3>
              <p className="text-slate-400 text-sm">Akademi Seviyesi: {gameState.academyLevel}</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mb-4">
            Akademi seviyesi arttıkça (Altyapı Sahası modülü) daha yetenekli oyuncular bulma şansınız artar. (Eski sistem — anında, ama scout daha kaliteli)
          </p>
          <button
            onClick={onDiscoverYouth}
            disabled={gameState.budget < 50000}
            className={`w-full py-3 rounded-2xl font-bold transition-all ${
              gameState.budget >= 50000 ? 'bg-purple-500 hover:bg-purple-400 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            🔍 Yetenek Ara - $50,000
          </button>
        </div>
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
                      <div className="text-xs text-slate-400 leading-relaxed">{player.role} • {player.age} yaş • Pot: {player.potential}</div>
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

    {(gameState.scoutMissions || []).length > 0 && (
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
        <h3 className="font-black text-white mb-3 flex items-center gap-2">🧭 Aktif İzci Görevleri <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{gameState.scoutMissions.length} görev</span></h3>
        <div className="space-y-2">
          {gameState.scoutMissions.map(m => (
            <div key={m.id} className="bg-slate-700/40 rounded-xl p-3 border border-slate-600/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-lg">🧭</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm truncate">{m.regionName} • {m.weeksLeft} hafta kaldı</div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700/30">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" style={{ width: `${((m.totalWeeks - m.weeksLeft) / m.totalWeeks) * 100}%` }} />
                </div>
                <div className="text-[11px] text-slate-400">Başlangıç: Sezon {m.startedSeason} Hafta {m.startedWeek} • Maliyet ${m.cost.toLocaleString()}</div>
              </div>
              <button onClick={() => onCancelScoutMission?.(m.id)} className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded-lg">İptal %40 iade</button>
            </div>
          ))}
        </div>
      </div>
    )}

    {(gameState.scoutReports || []).length > 0 && (
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
        <h3 className="font-black text-white mb-3">📬 İzci Raporları <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">{gameState.scoutReports.length} rapor</span></h3>
        <div className="space-y-4">
          {gameState.scoutReports.map(rep => (
            <div key={rep.id} className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/40">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-bold text-sm">{rep.regionName} • Sezon {rep.generatedSeason} Hafta {rep.generatedWeek} • {rep.players.length} genç</div>
                <div className="flex gap-2">
                  <button onClick={() => onClaimScoutReport?.(rep.id)} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold">Tümünü Altyapıya</button>
                  <button onClick={() => onDismissScoutReport?.(rep.id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg">Sil</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rep.players.map((pl: any) => (
                  <div key={pl.id} className="bg-slate-800/60 rounded-xl p-3 flex items-center justify-between border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm">{pl.ovr}</div>
                      <div>
                        <div className="text-white font-bold text-sm leading-none">{pl.flag || '🌍'} {pl.name}</div>
                        <div className="text-[11px] text-slate-400">{pl.role} • {pl.age} yaş • Pot {pl.potential} • {pl.country}</div>
                        <div className="text-[11px] text-emerald-300">${pl.value.toLocaleString()} • ${pl.wage.toLocaleString()}/h</div>
                      </div>
                    </div>
                    <button onClick={() => onClaimScoutReport?.(rep.id, pl.id)} className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg font-bold">Altyapıya</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
