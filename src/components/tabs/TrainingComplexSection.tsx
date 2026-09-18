import React, { useEffect, useMemo, useState } from 'react';
import { FacilityModuleId, FacilityState, GameState } from '../../types/game';
import {
  FACILITY_MODULES, FACILITY_MAX_LEVEL, facilityUpgradeCost, facilityEffects, normalizeFacility,
  weeklyGrowthChance, focusCoversPlayer
} from '../../data/facility';
import { formatMoney } from '../../utils/pricing';
import { TrainingComplex3D } from '../TrainingComplex3D';

interface Props {
  gameState: GameState;
  onUpgradeFacilityModule: (id: FacilityModuleId) => void;
}

const FocusLabel: Record<string, string> = {
  balanced: 'Dengeli', attack: 'Hücum', defense: 'Savunma', fitness: 'Kondisyon', youth: 'Gençler',
};

/**
 * 🏋️ 3D Antrenman Kompleksi — stadyum sekmesinin altındaki tesis yönetimi.
 * Her modül 1-5 seviye; seviye yükseldikçe 3D sahne değişir ve oyuncuların
 * gelişimi / morali / enerjisi / sakatlık riski doğrudan etkilenir.
 */
export const TrainingComplexSection: React.FC<Props> = ({ gameState, onUpgradeFacilityModule }) => {
  const [night, setNight] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  /** Ön izleme: bir modülün bir üst seviyesini satın almadan gör (etki sayıları anında) */
  const [previewModule, setPreviewModule] = useState<FacilityModuleId | null>(null);
  /** 3D sahne ön izlemesi — fare kartların üzerinde gezerken sürekli yeniden kurulmasın diye geciktirilir */
  const [sceneModule, setSceneModule] = useState<FacilityModuleId | null>(null);
  useEffect(() => {
    if (!previewModule) { setSceneModule(null); return; }
    const t = setTimeout(() => setSceneModule(previewModule), 220);
    return () => clearTimeout(t);
  }, [previewModule]);

  const facility = useMemo(() => normalizeFacility(gameState.facility), [gameState.facility]);

  // Ön izleme seviyeleri: ilgili modül +1 (maks. 5) — satın almadan görünüm ve etkiler
  const previewFacility: FacilityState = useMemo(() => {
    if (!previewModule) return facility;
    const lvl = Math.min(FACILITY_MAX_LEVEL, (facility[previewModule] || 1) + 1);
    return { ...facility, [previewModule]: lvl };
  }, [facility, previewModule]);

  /** 3D sahnede gösterilecek seviyeler (gecikmeli ön izleme) */
  const sceneFacility: FacilityState = useMemo(() => {
    if (!sceneModule) return facility;
    const lvl = Math.min(FACILITY_MAX_LEVEL, (facility[sceneModule] || 1) + 1);
    return { ...facility, [sceneModule]: lvl };
  }, [facility, sceneModule]);

  const isPreviewing = previewModule !== null;
  const displayFacility = isPreviewing ? previewFacility : facility;
  const eff = facilityEffects(displayFacility);
  const effNow = facilityEffects(facility);
  const report = facility.lastReport;

  const totalLevel = displayFacility.pitch + displayFacility.gym + displayFacility.recovery + displayFacility.tactics + displayFacility.youth;
  const maxTotal = FACILITY_MAX_LEVEL * FACILITY_MODULES.length;

  // Oyuncu etkisi: gelişime en açık oyuncular önce
  const focus = gameState.trainingFocus || 'balanced';
  const impactPlayers = useMemo(() => {
    const all = [...gameState.team11, ...gameState.bench];
    return all
      .slice()
      .sort((a, b) => (b.potential - b.ovr) - (a.potential - a.ovr) || a.age - b.age)
      .slice(0, 8);
  }, [gameState.team11, gameState.bench]);

  const summaryCards = [
    { icon: '📈', label: 'Haftalık gelişim', value: `+%${Math.round(eff.growthChance * 100)}`, hint: 'Antrenman sahası' },
    { icon: '🔋', label: 'Enerji / hafta', value: `+${eff.energyRegen}`, hint: 'Fitness salonu' },
    { icon: '😊', label: 'Moral / hafta', value: `+${eff.moraleRegen}`, hint: 'Fitness salonu' },
    { icon: '🧊', label: 'Sakatlık riski', value: `-%${Math.round((1 - eff.injuryRiskMult) * 100)}`, hint: 'Rejenerasyon' },
    { icon: '📊', label: 'Maç gücü bonusu', value: `+${eff.matchBonus.toFixed(1)}`, hint: 'Taktik merkezi' },
    { icon: '🎓', label: 'Genç gelişimi', value: `+%${Math.round(eff.youthGrowth * 100)}`, hint: 'Altyapı sahası' },
  ];

  const pips = (level: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: FACILITY_MAX_LEVEL }).map((_, i) => (
        <span key={i} className={`w-3.5 h-1.5 rounded-full ${i < level ? 'bg-emerald-400' : 'bg-slate-600/70'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Başlık + genel durum ── */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-4 shadow-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            🏋️ 3D Antrenman Kompleksi
            <span className="text-[10px] font-normal text-slate-400">— tesisleri yükselt, oyuncuların gelişimini büyüt</span>
          </h3>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Toplam tesis seviyesi <b className="text-emerald-300">{totalLevel}</b> / {maxTotal} •
            {' '}Gelişim şansı <b className="text-emerald-300">%{Math.round(effNow.growthChance * 100)}</b> • Moral <b className="text-emerald-300">+{effNow.moraleRegen}</b>/hafta • Sakatlık <b className="text-emerald-300">-%{Math.round((1 - effNow.injuryRiskMult) * 100)}</b>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/15 border border-amber-500/30 px-3 py-2 rounded-xl text-center">
            <div className="text-[10px] text-amber-200">Bütçe</div>
            <div className="text-amber-400 font-black text-sm">{formatMoney(gameState.budget)}</div>
          </div>
          <div className="bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 rounded-xl text-center">
            <div className="text-[10px] text-emerald-200">Antrenman odağı</div>
            <div className="text-emerald-300 font-black text-sm">{FocusLabel[focus] || focus}</div>
          </div>
        </div>
      </div>

      {/* ── 3D sahne ── */}
      <div className="relative">
        <TrainingComplex3D
          facility={sceneFacility}
          clubColor={gameState.stadium?.design?.seatColor || '#1d4ed8'}
          accentColor={gameState.stadium?.design?.accentColor || '#f8fafc'}
          logo={gameState.teamLogo}
          night={night}
          cinematic={cinematic}
          height={380}
          highlight={sceneModule}
          previewLabel={sceneModule ? `${FACILITY_MODULES.find(m => m.id === sceneModule)?.name} • Seviye ${sceneFacility[sceneModule]}/5` : null}
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => setNight(v => !v)}
            className="bg-black/60 hover:bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10"
          >
            {night ? '🌙 Gece' : '☀️ Gündüz'}
          </button>
          <button
            onClick={() => setCinematic(v => !v)}
            className={`backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              cinematic ? 'bg-violet-500/80 text-white border-violet-300' : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
            }`}
          >
            🎬 Sinematik
          </button>
        </div>
        {isPreviewing && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-2 rounded-full text-[11px] font-black shadow-lg flex items-center gap-3">
            <span>👁️ ÖN İZLEME — seviye {displayFacility[previewModule!]}/5 satın almadan önce gör</span>
            <button onClick={() => setPreviewModule(null)} className="bg-black text-white px-3 py-1 rounded-full text-[11px]">✕ Kapat</button>
          </div>
        )}
      </div>

      {/* ── Etki özeti ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {summaryCards.map(c => (
          <div
            key={c.label}
            className={`rounded-xl p-3 border text-center transition-all ${
              isPreviewing ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-800/60 border-slate-700/60'
            }`}
          >
            <div className="text-lg">{c.icon}</div>
            <div className={`font-black text-lg ${isPreviewing ? 'text-amber-300' : 'text-emerald-300'}`}>{c.value}</div>
            <div className="text-[10px] text-slate-300 leading-tight">{c.label}</div>
            <div className="text-[9px] text-slate-500">{c.hint}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-400 px-1">
        💡 Bu değerler her hafta maç sonrası otomatik uygulanır: oyuncular gelişir, enerji/moral dolar, sakatlık riski düşer, takım kimyası artar.
      </div>

      {/* ── Modül kartları ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {FACILITY_MODULES.map(mod => {
          const level = displayFacility[mod.id];
          const realLevel = facility[mod.id];
          const isMax = realLevel >= FACILITY_MAX_LEVEL;
          const cost = facilityUpgradeCost(mod.id, realLevel);
          const affordable = gameState.budget >= cost;
          const previewing = previewModule === mod.id;
          return (
            <div
              key={mod.id}
              onMouseEnter={() => !isMax && setPreviewModule(mod.id)}
              onMouseLeave={() => setPreviewModule(p => (p === mod.id ? null : p))}
              className={`rounded-2xl border p-4 transition-all ${
                previewing ? 'bg-amber-500/10 border-amber-400/70'
                : isMax ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-slate-800/60 border-slate-700/60 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{mod.icon}</span>
                  <div className="min-w-0">
                    <div className="text-white font-bold text-sm leading-tight truncate">{mod.name}</div>
                    <div className="text-[10px] text-slate-400">{mod.sceneHint}</div>
                  </div>
                </div>
                <span className="text-[11px] bg-slate-900/60 px-2 py-1 rounded-full text-white font-black shrink-0">
                  Sv. {realLevel}/{FACILITY_MAX_LEVEL}
                </span>
              </div>
              <div className="mb-2">{pips(level)}</div>
              <div className="text-[11px] text-slate-300 mb-1">{mod.desc}</div>
              <div className="text-[11px] text-emerald-300 mb-1">🧠 {mod.impact}</div>
              <div className="text-[11px] bg-slate-900/50 rounded-lg p-2 border border-slate-700/40 mb-2">
                <div className="flex justify-between"><span className="text-slate-400">Şu an</span><span className="text-white">{mod.effect(realLevel)}</span></div>
                {!isMax && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sonraki</span>
                    <span className="text-emerald-300">{mod.effect(realLevel + 1)}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {mod.stats(realLevel).map(st => (
                  <div key={st.label} className="bg-slate-900/40 rounded-lg p-1.5 text-center">
                    <div className="text-[9px] text-slate-400 truncate">{st.label}</div>
                    <div className="text-[11px] text-white font-bold truncate">{st.value}</div>
                  </div>
                ))}
              </div>
              {isMax ? (
                <div className="w-full py-2 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 text-center">
                  ★ MAKSİMUM SEVİYE
                </div>
              ) : (
                <button
                  disabled={!affordable}
                  onClick={() => { onUpgradeFacilityModule(mod.id); setPreviewModule(null); }}
                  className={`w-full py-2 rounded-xl text-xs font-black transition-all ${
                    affordable ? `bg-gradient-to-r ${mod.color} text-white hover:opacity-90` : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {affordable ? `⬆️ Yükselt — ${formatMoney(cost)}` : `Eksik ${formatMoney(cost - gameState.budget)}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Oyuncu etkisi (canlı önizleme) ── */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="text-sm font-bold text-emerald-400">
            👥 Oyuncularına Etkisi {isPreviewing && <span className="text-amber-300">(ön izleme: {FACILITY_MODULES.find(m => m.id === previewModule)?.name} sv.{displayFacility[previewModule!]})</span>}
          </h3>
          <span className="text-[11px] text-slate-400">
            Haftalık gelişim şansı, antrenman odağı + tesis seviyesi + yaşa göre hesaplanır
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700/60">
                <th className="py-2 pr-3">Oyuncu</th>
                <th className="py-2 pr-3">Yaş</th>
                <th className="py-2 pr-3">OVR / Pot</th>
                <th className="py-2 pr-3">Gelişim şansı / hafta</th>
                <th className="py-2 pr-3">Moral</th>
                <th className="py-2 pr-3">Enerji</th>
              </tr>
            </thead>
            <tbody>
              {impactPlayers.map(p => {
                const chance = weeklyGrowthChance(p, focus, gameState.trainingLvl, displayFacility);
                const chanceNow = weeklyGrowthChance(p, focus, gameState.trainingLvl, facility);
                const covered = focusCoversPlayer(focus, p.role, p.age);
                return (
                  <tr key={p.id} className="border-b border-slate-700/30 last:border-0">
                    <td className="py-2 pr-3">
                      <div className="text-white font-bold">{p.flag} {p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.role}{p.injured ? ' • 🏥 sakat' : ''}{p.wantsOut ? ' • 😠 mutsuz' : ''}</div>
                    </td>
                    <td className="py-2 pr-3 text-slate-300">{p.age}</td>
                    <td className="py-2 pr-3">
                      <span className="text-white font-bold">{p.ovr}</span>
                      <span className="text-slate-500"> / {p.potential}</span>
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${(p.ovr / Math.max(1, p.potential)) * 100}%` }} />
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {chance <= 0 ? (
                        <span className="text-slate-500">{p.injured ? 'Sakat — antrenman yok' : p.ovr >= p.potential ? 'Potansiyel dolu' : 'Odak dışı'}</span>
                      ) : (
                        <span className={`font-black ${isPreviewing && chance > chanceNow ? 'text-amber-300' : 'text-emerald-300'}`}>
                          %{chance}
                          {isPreviewing && chance > chanceNow && <span className="text-[10px] text-amber-200"> (+{chance - chanceNow})</span>}
                        </span>
                      )}
                      {!covered && chance <= 0 && p.ovr < p.potential && !p.injured && (
                        <div className="text-[9px] text-slate-500">Antrenman odağını değiştir</div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className={p.morale >= 60 ? 'text-emerald-300' : p.morale >= 35 ? 'text-amber-300' : 'text-red-400'}>{p.morale}</span>
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full ${p.morale >= 60 ? 'bg-emerald-400' : p.morale >= 35 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${p.morale}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className={p.energy >= 60 ? 'text-cyan-300' : p.energy >= 35 ? 'text-amber-300' : 'text-red-400'}>{p.energy}</span>
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${p.energy}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-[11px] text-slate-400 mt-3">
          🧩 Moral ve enerji maç gücünü doğrudan etkiler (moral ×0.85-1.0, enerji ×0.7-1.0). Fitness salonu her hafta ikisini de yukarı çeker, rejenerasyon merkezi sakatlıkları engeller.
        </div>
      </div>

      {/* ── Haftalık rapor ── */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-2">📋 Son Haftalık Tesis Raporu</h3>
        {report ? (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400">Sezon {report.season} • Hafta {report.week}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40">
                <div className="text-[10px] text-slate-400">Gelişen oyuncu</div>
                <div className="text-emerald-300 font-black text-lg">{report.growth}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40">
                <div className="text-[10px] text-slate-400">Moral kazancı</div>
                <div className="text-emerald-300 font-black text-lg">+{report.morale}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40">
                <div className="text-[10px] text-slate-400">Enerji yenilenmesi</div>
                <div className="text-cyan-300 font-black text-lg">+{report.energy}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40">
                <div className="text-[10px] text-slate-400">Önlenen sakatlık</div>
                <div className="text-amber-300 font-black text-lg">{report.injuriesPrevented}</div>
              </div>
            </div>
            {report.grownNames.length > 0 && (
              <div className="text-[11px] text-slate-300">📈 Gelişenler: <b className="text-white">{report.grownNames.join(', ')}</b></div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {report.notes.map((note, i) => (
                <span key={i} className="text-[10px] bg-slate-900/60 border border-slate-700/40 text-slate-300 px-2 py-1 rounded-full">{note}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-slate-400">
            Henüz rapor yok — ilk maç haftasından sonra tesislerin oyuncularına etkisi burada raporlanır.
          </div>
        )}
      </div>
    </div>
  );
};
