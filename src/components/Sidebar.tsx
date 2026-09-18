import React from 'react';
import { GameState, Sponsor } from '../types/game';
import { SPONSOR_OFFERS, WEATHER_INFO, ROLE_NAMES } from '../data/constants';
import { describeSlots, clearSlot, SlotInfo } from '../utils/save';
import { managerLevelTitle, xpForLevel } from '../utils/progression';

interface SidebarProps {
  gameState: GameState;
  onPlayMatch: () => void;
  onSave: () => void;
  onSignSponsor: (sponsor: Sponsor) => void;
  onSaveToSlot: (slot: number) => void;
  onLoadFromSlot: (slot: number) => void;
  onExportSave: () => void;
  onImportSave: (file: File) => void;
  onToggleSound: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  gameState, onPlayMatch, onSave, onSignSponsor,
  onSaveToSlot, onLoadFromSlot, onExportSave, onImportSave, onToggleSound
}) => {
  const [showSponsorModal, setShowSponsorModal] = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [slots, setSlots] = React.useState<SlotInfo[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const refreshSlots = () => setSlots(describeSlots());

  const avg = (arr: number[]) => (arr.length > 0 ? Math.floor(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
  const avgOvr = avg(gameState.team11.map(p => p.ovr));
  const avgEnergy = avg(gameState.team11.map(p => p.energy));
  const avgMorale = avg(gameState.team11.map(p => p.morale));

  const nextMatch = gameState.fixture[gameState.week - 1];
  const weeklyWages = [...gameState.team11, ...gameState.bench].reduce((acc, p) => acc + p.wage, 0);
  const weather = WEATHER_INFO[gameState.weather] || WEATHER_INFO.cloudy;


  const getEnergyColor = (energy: number) => {
    if (energy >= 70) return 'text-emerald-400';
    if (energy >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMoraleIcon = (morale: number) => {
    if (morale >= 80) return '😊';
    if (morale >= 50) return '😐';
    return '😟';
  };

  const unavailableCount = gameState.team11.filter(p => p.injured || (p.suspension ?? 0) > 0).length;

  return (
    <>
      <div className="bg-slate-800/55 backdrop-blur-xl rounded-2xl p-4 xl:p-6 border border-slate-700/60 shadow-xl shadow-black/20 h-full flex flex-col overflow-y-auto relative premium-border">
        {/* Club Info — premium */}
        <div className="text-center mb-4 pb-4 border-b border-slate-700/50 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.07] via-cyan-500/[0.03] to-transparent rounded-t-2xl pointer-events-none" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-12 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="text-5xl xl:text-6xl mb-2 drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]">{gameState.teamLogo}</div>
          <h2 className="text-lg xl:text-xl font-black tracking-tight text-white truncate" style={{fontFamily:'Plus Jakarta Sans, Inter, sans-serif'}}>{gameState.teamName}</h2>
          <div className="text-xs text-slate-400 mt-1">
            Lig {gameState.leagueLevel} • Sezon {gameState.season || 1}
            {gameState.difficulty && (
              <span className="ml-1 text-amber-400/80">
                • {gameState.difficulty === 'easy' ? '😊' : gameState.difficulty === 'hard' ? '😰' : gameState.difficulty === 'legend' ? '🔥' : '⚖️'}
              </span>
            )}
          </div>
        </div>

        {/* Budget — premium */}
        <div className="bg-gradient-to-br from-amber-500/22 via-yellow-500/16 to-orange-500/22 rounded-2xl p-3.5 mb-3 border border-amber-500/30 shadow-lg backdrop-blur shimmer premium-border">
          <div className="text-[10px] tracking-widest font-black text-amber-300/90 mb-1">KULÜP KASASI</div>
          <div className="text-xl xl:text-2xl font-black text-amber-400">${gameState.budget.toLocaleString()}</div>
          <div className="text-[10px] text-amber-300/70 mt-1">
            Maaş (5 haftada bir): ${(weeklyWages * 5).toLocaleString()}
          </div>
          {gameState.week % 5 >= 3 && (
            <div className="text-[10px] text-red-400 mt-1">
              ⏰ {5 - (gameState.week % 5)} maç sonra maaş günü
            </div>
          )}
        </div>

        {/* Stats Grid - premium progress bar eklendi */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-700/40 backdrop-blur rounded-xl p-2.5 border border-slate-600/30 shadow-sm hover:border-emerald-500/30 hover:bg-slate-700/60 transition-all group">
            <div className="text-[10px] text-slate-400 group-hover:text-emerald-300 transition-colors">Takım Gücü</div>
            <div className="text-lg font-black text-emerald-400">⭐ {avgOvr}</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, avgOvr)}%` }} /></div>
          </div>
          <div className="bg-slate-700/40 backdrop-blur rounded-xl p-2.5 border border-slate-600/30 shadow-sm hover:border-slate-500/40 transition-all">
            <div className="text-[10px] text-slate-400">Hafta</div>
            <div className="text-lg font-black text-white">📅 {gameState.week}/18</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-cyan-500 transition-all duration-700" style={{ width: `${(gameState.week/18)*100}%` }} /></div>
          </div>
          <div className="bg-slate-700/40 backdrop-blur rounded-xl p-2.5 border border-slate-600/30 shadow-sm hover:border-amber-500/30 transition-all">
            <div className="text-[10px] text-slate-400">Enerji</div>
            <div className={`text-lg font-black ${getEnergyColor(avgEnergy)}`}>⚡ %{avgEnergy}</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className={`h-full transition-all duration-700 ${avgEnergy>=70?'bg-emerald-500':avgEnergy>=40?'bg-yellow-500':'bg-red-500'}`} style={{ width: `${avgEnergy}%` }} /></div>
          </div>
          <div className="bg-slate-700/40 backdrop-blur rounded-xl p-2.5 border border-slate-600/30 shadow-sm hover:border-violet-500/30 transition-all">
            <div className="text-[10px] text-slate-400">Moral</div>
            <div className="text-lg font-black text-white">{getMoraleIcon(avgMorale)} %{avgMorale}</div>
            <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className={`h-full transition-all duration-700 ${avgMorale>=70?'bg-emerald-500':avgMorale>=40?'bg-yellow-500':'bg-red-500'}`} style={{ width: `${avgMorale}%` }} /></div>
          </div>
        </div>

        {/* Stadium + meters */}
        <div className="bg-slate-700/30 rounded-lg p-2 mb-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[10px] text-slate-400">🏟️ Stadyum Kapasitesi</span>
            <span className="font-bold text-white text-xs">{(gameState.stadiumLvl * 5000 + 2000).toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <div className="text-center">
              <div className="text-slate-500">Taraftar</div>
              <div className={`font-bold ${(gameState.fanHappiness || 60) >= 60 ? 'text-emerald-400' : 'text-orange-400'}`}>
                📣 {gameState.fanHappiness || 60}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-500">Kimya</div>
              <div className={`font-bold ${(gameState.teamChemistry || 55) >= 60 ? 'text-blue-400' : 'text-slate-300'}`}>
                🤝 {gameState.teamChemistry || 55}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-500">Yönetim</div>
              <div className={`font-bold ${(gameState.boardConfidence || 50) >= 50 ? 'text-purple-400' : 'text-red-400'}`}>
                👔 {gameState.boardConfidence || 50}
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-cyan-300/80 bg-cyan-500/10 rounded py-1">
            {weather.icon} {weather.label} • {gameState.trainingFocus === 'attack' ? '⚡ Hücum' :
              gameState.trainingFocus === 'defense' ? '🛡️ Savunma' :
              gameState.trainingFocus === 'fitness' ? '🏃 Kondisyon' :
              gameState.trainingFocus === 'youth' ? '🌱 Gençler' : '⚖️ Dengeli'} antrenman
          </div>
        </div>

        {/* Next Match */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-2xl p-4 mb-4 border border-slate-600/40 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-emerald-400 font-medium">SIRADAKİ MAÇI</div>
            {nextMatch && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                nextMatch.isHome ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {nextMatch.isHome ? 'İÇ SAHA' : 'DEPLASMAN'}
              </span>
            )}
          </div>
          {nextMatch ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{nextMatch.logo}</span>
                <div>
                  <div className="font-bold text-white">{nextMatch.name}</div>
                  <div className={`text-sm font-bold ${
                    avgOvr > nextMatch.ovr ? 'text-emerald-400' :
                    avgOvr < nextMatch.ovr ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    OVR: {nextMatch.ovr}
                    {avgOvr !== nextMatch.ovr && (
                      <span className="ml-1">({avgOvr > nextMatch.ovr ? '+' : ''}{avgOvr - nextMatch.ovr})</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={`text-xs p-2 rounded-lg text-center font-medium ${
                avgOvr > nextMatch.ovr + 5 ? 'bg-emerald-500/20 text-emerald-400' :
                avgOvr > nextMatch.ovr ? 'bg-emerald-500/10 text-emerald-300' :
                avgOvr < nextMatch.ovr - 5 ? 'bg-red-500/20 text-red-400' :
                avgOvr < nextMatch.ovr ? 'bg-red-500/10 text-red-300' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {avgOvr > nextMatch.ovr + 5 ? '🔥 Büyük favori sensin!' :
                 avgOvr > nextMatch.ovr ? '👍 Favori sensin' :
                 avgOvr < nextMatch.ovr - 5 ? '😰 Çok zor maç!' :
                 avgOvr < nextMatch.ovr ? '⚠️ Rakip favori' :
                 '⚖️ Dengeli maç'}
              </div>
              {unavailableCount > 0 && (
                <div className="text-[10px] text-red-300 bg-red-500/10 rounded-lg p-2 mt-2">
                  ⚠️ İlk 11'de {unavailableCount} oyuncu sakat/cezalı — maç öncesi otomatik düzeltilecek.
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-400">Sezon Sonu</div>
          )}
        </div>

        {/* Active Sponsor */}
        {gameState.activeSponsor && (
          <div className="bg-purple-500/20 rounded-xl p-3 mb-4 border border-purple-500/30">
            <div className="text-xs text-purple-300 font-medium">AKTİF SPONSOR</div>
            <div className="text-sm text-white font-bold mt-1">{gameState.activeSponsor.name}</div>
            <div className="text-xs text-purple-300">
              ${gameState.activeSponsor.income.toLocaleString()}/hafta • {gameState.activeSponsor.weeksLeft} hafta kaldı
            </div>
          </div>
        )}

        {/* Menajer seviyesi & aktif görevler */}
        <div className="bg-violet-500/10 rounded-xl p-2 mb-3 border border-violet-500/20">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-violet-300 font-bold">
              🧠 Seviye {gameState.managerLevel || 1} · {managerLevelTitle(gameState.managerLevel || 1)}
            </span>
            {(gameState.skillPoints || 0) > 0 && (
              <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 rounded animate-pulse">
                {gameState.skillPoints} PUAN
              </span>
            )}
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${Math.min(100, Math.round(((gameState.managerXp || 0) / xpForLevel(gameState.managerLevel || 1)) * 100))}%` }}
            />
          </div>
          {(() => {
            const active = (gameState.missions || []).filter(m => !m.completed).slice(0, 2);
            if (active.length === 0) return <div className="text-[10px] text-emerald-300 mt-1">✅ Tüm görevler tamam!</div>;
            return (
              <div className="mt-1.5 space-y-1">
                {active.map(m => (
                  <div key={m.id} className="text-[10px] text-slate-300 flex items-center justify-between gap-1">
                    <span className="truncate">{m.icon} {m.title}</span>
                    <span className="text-slate-400 shrink-0">
                      {Math.min(m.progress, m.target)}/{m.target}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Captain */}
        {gameState.captainId != null && (() => {
          const cap = [...gameState.team11, ...gameState.bench].find(p => p.id === gameState.captainId);
          return cap ? (
            <div className="bg-amber-500/10 rounded-xl p-2 mb-3 text-center text-[11px] text-amber-200">
              🎽 Kaptan: <span className="font-bold">{cap.name}</span>
              <span className="text-amber-300/70"> ({ROLE_NAMES[cap.role]})</span>
            </div>
          ) : null;
        })()}

        {/* Trophies */}
        {gameState.trophies.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 justify-center">
            {gameState.trophies.map((trophy, i) => (
              <span key={i} className="text-2xl drop-shadow-lg" style={{ animationDelay: `${i * 100}ms` }}>
                {trophy}
              </span>
            ))}
          </div>
        )}

        {/* Made by Kaan signature */}
        <div className="mt-3 mb-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900/50 border border-slate-700/40">
          <span className="text-[10px] text-slate-500">Crafted with</span>
          <span className="text-[11px]">❤️</span>
          <span className="kaan-watermark text-[11px]">Made by Kaan</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span className="text-[9px] text-amber-300/60 font-bold tracking-widest">YAZ 2026</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-2">
          <button
            onClick={onPlayMatch}
            disabled={gameState.week > 18}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-slate-600 disabled:to-slate-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:shadow-none tracking-wide"
          >
            ⚽ MAÇA ÇIK
            {gameState.week <= 18 && (
              <span className="block text-[10px] font-medium text-emerald-100/80 mt-0.5">
                Maç öncesi taktik odası açılır
              </span>
            )}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setShowSponsorModal(true); refreshSlots(); }}
              disabled={!!gameState.activeSponsor}
              className="py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white font-medium rounded-lg transition-all text-xs"
              title="Sponsorluk"
            >
              🤝
            </button>
            <button
              onClick={() => { setShowSaveModal(true); refreshSlots(); }}
              className="py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all text-xs"
              title="Kayıt yönetimi"
            >
              💾
            </button>
            <button
              onClick={onToggleSound}
              className={`py-2 font-medium rounded-lg transition-all text-xs ${gameState.soundOn !== false ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
              title="Ses aç/kapat"
            >
              {gameState.soundOn !== false ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-amber-400">Sponsorluk Anlaşmaları</h3>
              <button onClick={() => setShowSponsorModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {SPONSOR_OFFERS.map((sponsor, i) => (
                <button
                  key={i}
                  onClick={() => { onSignSponsor(sponsor); setShowSponsorModal(false); }}
                  className="bg-slate-700/50 hover:bg-slate-600/50 p-4 rounded-xl border border-slate-600 hover:border-purple-500 transition-all text-left"
                >
                  <div className="text-2xl mb-2">{sponsor.icon}</div>
                  <div className="font-bold text-white text-sm">{sponsor.name}</div>
                  <div className="text-emerald-400 font-bold">${sponsor.income.toLocaleString()}/hafta</div>
                  <div className="text-xs text-slate-400 mt-1">{sponsor.duration} hafta • {sponsor.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save / Load Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-blue-400">💾 Kayıt Yönetimi</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-3 mb-5">
              {slots.map(s => (
                <div key={s.slot} className="bg-slate-700/40 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-white text-sm font-bold">Slot {s.slot + 1}</div>
                    {s.exists ? (
                      <div className="text-[11px] text-slate-300 truncate">
                        {s.teamLogo} {s.teamName} • Sezon {s.season} • Hafta {s.week} • ${(s.budget || 0).toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">Boş</div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { onSaveToSlot(s.slot); refreshSlots(); }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg"
                    >
                      Kaydet
                    </button>
                    <button
                      disabled={!s.exists}
                      onClick={() => { onLoadFromSlot(s.slot); setShowSaveModal(false); }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 text-white text-xs rounded-lg"
                    >
                      Yükle
                    </button>
                    <button
                      disabled={!s.exists}
                      onClick={() => { clearSlot(s.slot); refreshSlots(); }}
                      className="px-2 py-1.5 bg-slate-600 hover:bg-red-600 disabled:opacity-40 text-white text-xs rounded-lg"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportSave}
                className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl"
              >
                📤 Yedek İndir (.json)
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl"
              >
                📥 Yedek Yükle
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { onImportSave(file); setShowSaveModal(false); }
                  e.target.value = '';
                }}
              />
            </div>

            <button
              onClick={() => { onSave(); refreshSlots(); }}
              className="w-full mt-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
            >
              Hızlı kaydet (Slot 1)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
