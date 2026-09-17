import React, { useState } from 'react';
import { GameState, Player, TrainingFocus } from '../../types/game';
import { ROLE_NAMES, TRAINING_FOCUS_INFO, WEATHER_INFO, PHILOSOPHIES } from '../../data/constants';
import { TIER_INFO } from '../../data/stars';
import { formatMoney } from '../../utils/pricing';
import { renewalCost, renewalWage, contractRisk } from '../../utils/contract';

interface OfficeTabProps {
  gameState: GameState;
  onAcceptOffer: (offerId: number) => void;
  onRejectOffer: (offerId: number) => void;
  onRenewContract: (playerId: number, years: number) => void;
  onSetCaptain: (playerId: number | null) => void;
  onSetSetPieceTaker: (kind: 'penalty' | 'freekick' | 'corner', playerId: number | null) => void;
  onSetTrainingFocus: (focus: TrainingFocus) => void;
  onDismissBoardMessage: (index: number) => void;
  onExerciseLoanOption: (playerId: number) => void;
  onReturnLoanEarly: (playerId: number) => void;
  onRecallLoan: (loanId: number) => void;
  onSetPhilosophy?: (p: import('../../types/game').ClubPhilosophy) => void;
  onCompleteUltras?: (id: string) => void;
  onDismissUltras?: (id: string) => void;
  onGenerateUltras?: () => void;
}

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode; accent?: string }> = ({
  title, icon, children, accent = 'text-emerald-400'
}) => (
  <div className="bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500">
    <h3 className={`text-sm font-bold mb-3 ${accent} flex items-center gap-2`}>
      <span>{icon}</span> {title}
    </h3>
    {children}
  </div>
);

export const OfficeTab: React.FC<OfficeTabProps> = ({
  gameState, onAcceptOffer, onRejectOffer, onRenewContract,
  onSetCaptain, onSetSetPieceTaker, onSetTrainingFocus, onDismissBoardMessage,
  onExerciseLoanOption, onReturnLoanEarly, onRecallLoan,
  onSetPhilosophy, onCompleteUltras, onDismissUltras, onGenerateUltras
}) => {
  const [renewYears, setRenewYears] = useState(2);

  const allPlayers: Player[] = [...gameState.team11, ...gameState.bench];
  const offers = gameState.transferOffers || [];
  const expiring = allPlayers.filter(p => p.contract <= 2).sort((a, b) => a.contract - b.contract);
  const unhappy = allPlayers.filter(p => p.wantsOut || p.morale <= 35);
  const focus = gameState.trainingFocus || 'balanced';
  const weather = WEATHER_INFO[gameState.weather] || WEATHER_INFO.cloudy;

  const confidence = gameState.boardConfidence;
  const confidenceColor = confidence >= 60 ? 'bg-emerald-500' : confidence >= 35 ? 'bg-amber-500' : 'bg-red-500';
  const confidenceText = confidence >= 75 ? 'Yönetim çok memnun' : confidence >= 50 ? 'Yönetim memnun'
    : confidence >= 30 ? 'Yönetim temkinli' : confidence >= 15 ? 'Yönetim rahatsız' : 'Koltuğun tehlikede!';

  return (
    <div className="h-full relative overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">🏢 Menajer Ofisi</h2>
            <p className="text-slate-400 text-sm">
              Yönetim, sözleşmeler, transfer teklifleri ve görevler • Sezon {gameState.season}
            </p>
          </div>
          <div className="bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700/50 text-xs text-slate-300">
            {weather.icon} {weather.label} • Önümüzdeki maçta hava böyle olabilir
          </div>
        </div>

        {/* Board confidence */}
        <Section title="Yönetim Kurulu" icon="👔">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Güven: <span className="font-bold text-white">%{confidence}</span></span>
            <span className={confidence >= 35 ? 'text-slate-400' : 'text-red-400 font-bold'}>{confidenceText}</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-3 p-1 border border-slate-700/50">
            <div className={`h-full ${confidenceColor} rounded-full transition-all duration-700 shadow-sm`} style={{ width: `${Math.max(2, confidence)}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] mb-3">
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/40 shadow-sm">
              <div className="text-slate-400">Sezon Hedefi</div>
              <div className="text-white font-medium">{gameState.seasonObjective}</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/40 shadow-sm">
              <div className="text-slate-400">Taraftar</div>
              <div className={`font-medium ${gameState.fanHappiness >= 60 ? 'text-emerald-400' : 'text-orange-400'}`}>%{gameState.fanHappiness}</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/40 shadow-sm">
              <div className="text-slate-400">Takım Kimyası</div>
              <div className={`font-medium ${gameState.teamChemistry >= 60 ? 'text-blue-400' : 'text-slate-300'}`}>%{gameState.teamChemistry}</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/40 shadow-sm">
              <div className="text-slate-400">İtibar</div>
              <div className="text-purple-400 font-medium">{gameState.managerRep}</div>
            </div>
          </div>

          {(gameState.boardMessages || []).length === 0 ? (
            <p className="text-xs text-slate-400 leading-relaxed">Gelen kutusu boş.</p>
          ) : (
            <div className="space-y-2">
              {gameState.boardMessages.map((msg, i) => (
                <div key={i} className="flex items-start justify-between gap-2 bg-slate-700/30 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-200">{msg}</span>
                  <button
                    onClick={() => onDismissBoardMessage(i)}
                    className="text-slate-500 hover:text-white text-xs shrink-0"
                    title="Okundu olarak işaretle"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Kulüp Felsefesi */}
        <Section title="Kulüp Felsefesi" icon="🧭" accent="text-violet-400">
          <p className="text-xs text-slate-400 mb-3">Sezon başında bir kimlik seç — bonuslar ve taraftar beklentisi ona göre şekillenir. Seçimi değiştirebilirsin ama ultras biraz bozulur.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PHILOSOPHIES.map(ph => {
              const selected = gameState.clubPhilosophy === ph.id;
              const border = selected ? (ph.color==='emerald' ? 'border-emerald-500 bg-emerald-500/10' : ph.color==='amber' ? 'border-amber-500 bg-amber-500/10' : 'border-violet-500 bg-violet-500/10') : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-700/40';
              const btnCol = ph.color==='emerald' ? 'bg-emerald-600 hover:bg-emerald-500' : ph.color==='amber' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-violet-600 hover:bg-violet-500';
              return (
                <div key={ph.id} className={`rounded-2xl border p-4 flex flex-col gap-2 ${border} transition-colors`}>
                  <div className="text-2xl">{ph.icon}</div>
                  <div className="font-black text-white text-sm">{ph.name}</div>
                  <div className="text-[11px] text-slate-300 leading-relaxed">{ph.desc}</div>
                  <div className="text-[11px] bg-slate-900/40 rounded-lg p-2 border border-slate-700/30 text-slate-200">🎁 {ph.bonus}</div>
                  <div className="text-[11px] text-slate-500 italic">Beklenti: {ph.fanExpectation}</div>
                  <button onClick={() => onSetPhilosophy?.(ph.id as any)} disabled={selected} className={`mt-auto py-2 rounded-xl text-xs font-black transition-all ${selected ? 'bg-white text-slate-900 cursor-default' : `${btnCol} text-white`}`}>{selected ? '✓ Seçili' : 'Seç'}</button>
                </div>
              );
            })}
          </div>
          {!gameState.clubPhilosophy && <div className="text-[11px] text-amber-300 mt-2">💡 İpucu: Bir felsefe seçmezsen ultras kararsız kalır, bonus da alamazsın.</div>}
        </Section>

        {/* Ultras */}
        <Section title={`Ultras Tribünü — Sadakat %${gameState.ultrasHappiness ?? 65}`} icon="🔥" accent="text-red-400">
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/40 p-1 mb-2">
            <div className={`h-full rounded-full transition-all duration-700 ${(gameState.ultrasHappiness ?? 65) >= 70 ? 'bg-gradient-to-r from-red-500 to-orange-500' : (gameState.ultrasHappiness ?? 65) >= 45 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-slate-500 to-slate-600'}`} style={{width: `${Math.max(4, gameState.ultrasHappiness ?? 65)}%`}} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
            <span>{(gameState.ultrasHappiness ?? 65) >= 75 ? '🔥 Ultras coşkulu — stadyum doluyor!' : (gameState.ultrasHappiness ?? 65) >= 50 ? 'Ultras dengede' : '⚠️ Ultras homurdanıyor — ıslıklar gelebilir'}</span>
            <button onClick={() => onGenerateUltras?.()} className="text-[11px] bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-full border border-slate-600">+ Yeni İstek Üret</button>
          </div>
          {(gameState.ultrasRequests || []).length === 0 ? (
            <p className="text-xs text-slate-400">Şu an ultrasın bir isteği yok. Maçlar ilerledikçe ve felsefene göre yeni pankartlar gelecek.</p>
          ) : (
            <div className="space-y-2">
              {(gameState.ultrasRequests || []).map(req => (
                <div key={req.id} className="bg-slate-700/40 rounded-xl p-3 border border-slate-600/30 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-white text-sm font-bold flex items-center gap-1">{req.kind==='youth'?'🌱':req.kind==='star'?'⭐':req.kind==='derby'?'⚔️':'🛡️'} {req.text}</div>
                    <div className="text-[11px] text-slate-300">Ödül: <span className="text-emerald-300">{req.reward}</span> • Cezası: <span className="text-red-300">{req.penalty}</span> • Son: Sezon {req.deadlineSeason} Hafta {req.deadlineWeek}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onCompleteUltras?.(req.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold">✓ Yaptım</button>
                    <button onClick={() => onDismissUltras?.(req.id)} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-xs">✕ Reddet</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-2">Hafif olay: istekler her maç sonrası %20 şansla gelir, süresi dolarsa taraftar -5 / ultras -8. Galibiyet ultras +3~5, mağlubiyet -3.</div>
        </Section>

        {/* Transfer offers */}
        <Section title={`Gelen Transfer Teklifleri (${offers.length})`} icon="📨" accent="text-amber-400">
          {offers.length === 0 ? (
            <p className="text-xs text-slate-400 leading-relaxed">Şu an masada teklif yok. Oyuncuların iyi oynadıkça teklifler artar.</p>
          ) : (
            <div className="space-y-2">
              {offers.map(o => {
                const player = allPlayers.find(p => p.id === o.playerId);
                const weeksLeft = Math.max(0, o.expiresWeek - gameState.week);
                return (
                  <div key={o.id} className="bg-slate-700/50 backdrop-blur rounded-xl p-3.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-[180px]">
                      <div className="text-white font-bold text-sm">{o.playerName} <span className="text-slate-400 text-xs">OVR {o.playerOvr}</span></div>
                      <div className="text-[11px] text-slate-300">{o.fromLogo} {o.fromClub}</div>
                      <div className="text-[11px] text-amber-300">
                        Teklif: ${o.amount.toLocaleString()} • {weeksLeft} hafta geçerli
                        {player && ` • Değeri: $${player.value.toLocaleString()}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAcceptOffer(o.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          player && o.amount >= player.value ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        ✅ Kabul Et
                      </button>
                      <button
                        onClick={() => onRejectOffer(o.id)}
                        className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-600 hover:bg-slate-500 text-white transition-all"
                      >
                        ❌ Reddet
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Contracts */}
        <Section title={`Sözleşmeler (${expiring.length})`} icon="📝" accent="text-sky-400">
          <div className="flex items-center gap-2 mb-3 text-xs text-slate-300">
            Yenileme süresi:
            {[1, 2, 3, 4].map(y => (
              <button
                key={y}
                onClick={() => setRenewYears(y)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  renewYears === y ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {y} yıl
              </button>
            ))}
          </div>

          {expiring.length === 0 ? (
            <p className="text-xs text-emerald-300">✅ Tüm oyuncuların sözleşmesi güvende.</p>
          ) : (
            <div className="space-y-2">
              {expiring.map(p => {
                const risk = contractRisk(p);
                const cost = renewalCost(p, renewYears);
                const newWage = renewalWage(p, renewYears);
                const affordable = gameState.budget >= cost;
                return (
                  <div key={p.id} className="bg-slate-700/50 backdrop-blur rounded-xl p-3.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-white font-bold text-sm flex items-center gap-1">
                        <span title={p.country}>{p.flag ?? '🇹🇷'}</span>
                        {p.name} <span className="text-slate-400 text-xs">{ROLE_NAMES[p.role]} • OVR {p.ovr}</span>
                        {risk === 'expired' && <span className="ml-2 text-[10px] bg-red-600/40 text-red-200 px-2 py-0.5 rounded">SÖZLEŞME BİTTİ</span>}
                        {risk === 'risky' && <span className="ml-2 text-[10px] bg-amber-600/40 text-amber-100 px-2 py-0.5 rounded">SON YIL</span>}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {p.contract} yıl kaldı • Maaş: ${p.wage.toLocaleString()}/hafta → ${newWage.toLocaleString()}/hafta
                        {p.wantsOut && <span className="text-red-400"> • Gitmek istiyor (+%40 imza parası)</span>}
                      </div>
                    </div>
                    <button
                      disabled={!affordable}
                      onClick={() => onRenewContract(p.id, renewYears)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        affordable ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      🤝 Yenile (${cost.toLocaleString()})
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {unhappy.length > 0 && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <div className="text-xs text-red-300 font-bold mb-1">😠 Mutsuz Oyuncular</div>
              <div className="text-[11px] text-slate-300">
                {unhappy.map(p => `${p.name} (moral %${p.morale})`).join(' • ')}
                <div className="mt-1 text-slate-400">Moral düşükse kulüpten ayrılmak isterler. Maç kazanmak ve takım aktiviteleri moral yükseltir.</div>
              </div>
            </div>
          )}
        </Section>

        {/* Kiralık oyuncular */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title={`Kiralık Gelenler (${allPlayers.filter(p => p.loanFrom).length})`} icon="🔄" accent="text-cyan-400">
            {allPlayers.filter(p => p.loanFrom).length === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed">Kiralık oyuncun yok. Transfer → Kiralık sekmesinden fırsatları incele.</p>
            ) : (
              <div className="space-y-2">
                {allPlayers.filter(p => p.loanFrom).map(p => (
                  <div key={p.id} className="bg-slate-700/50 backdrop-blur rounded-xl p-3.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all">
                    <div className="text-white font-bold text-sm">
                      {p.name.replace(/^[^\w]+\s/, '')}
                      <span className="text-slate-400 text-xs ml-2">
                        {ROLE_NAMES[p.role]} • OVR {p.ovr}
                        {p.starTier && <span className="ml-1">{TIER_INFO[p.starTier].icon}</span>}
                      </span>
                    </div>
                    <div className="text-[11px] text-cyan-200">
                      {p.loanFromLogo} {p.loanFrom} • Sezon {p.loanUntilSeason} sonuna kadar kiralık
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Maaş payımız: {formatMoney(p.wage)}/hafta
                      {p.loanBaseWage ? ` (gerçek maaş ${formatMoney(p.loanBaseWage)})` : ''}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {!!p.loanOptionPrice && (
                        <button
                          disabled={gameState.budget < p.loanOptionPrice}
                          onClick={() => onExerciseLoanOption(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            gameState.budget >= p.loanOptionPrice
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          ✅ Opsiyonu Kullan ({formatMoney(p.loanOptionPrice)})
                        </button>
                      )}
                      <button
                        onClick={() => onReturnLoanEarly(p.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] bg-slate-600 hover:bg-slate-500 text-white"
                      >
                        ↩️ Erken İade
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Kiralık Gidenler (${(gameState.outgoingLoans || []).length})`} icon="📤" accent="text-amber-400">
            {(gameState.outgoingLoans || []).length === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                Genç oyuncularını kiralığa göndererek gelişmelerini sağlayabilirsin (Kadro → oyuncu kartı).
              </p>
            ) : (
              <div className="space-y-2">
                {(gameState.outgoingLoans || []).map(loan => {
                  const weeks = Math.max(0, gameState.week - loan.startWeek);
                  const projected = loan.player.ovr + Math.max(0, Math.round(weeks / 6));
                  return (
                    <div key={loan.id} className="bg-slate-700/50 backdrop-blur rounded-xl p-3.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all">
                      <div className="text-white font-bold text-sm">
                        {loan.playerName}
                        <span className="text-slate-400 text-xs ml-2">{ROLE_NAMES[loan.playerRole]} • {loan.playerAge} yaş</span>
                      </div>
                      <div className="text-[11px] text-amber-200">{loan.toLogo} {loan.toClub}</div>
                      <div className="text-[11px] text-slate-300">
                        Gelişim: {loan.playerOvr} → <span className="text-emerald-400 font-bold">{projected}</span> OVR (tahmini)
                        • Maaşın %{Math.round(loan.wageCoverage * 100)}'ini onlar ödüyor
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-slate-400">{weeks} haftadır kiralık</span>
                        <button
                          onClick={() => onRecallLoan(loan.id)}
                          className="px-3 py-1.5 rounded-lg text-[11px] bg-slate-600 hover:bg-slate-500 text-white"
                        >
                          ↩️ Geri Çağır
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Roles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Kaptanlık" icon="🎽" accent="text-amber-400">
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {allPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSetCaptain(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    gameState.captainId === p.id ? 'bg-amber-500/20 border border-amber-500/50 text-white' : 'bg-slate-700/40 hover:bg-slate-600/40 text-slate-200'
                  }`}
                >
                  <span>{p.name} <span className="text-slate-400">{ROLE_NAMES[p.role]}</span></span>
                  <span className="text-slate-300">
                    OVR {p.ovr} • Liderlik {Math.round(p.morale / 10)}/10 {gameState.captainId === p.id ? '🎽' : ''}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Duran Top Görevleri" icon="🎯" accent="text-emerald-400">
            {( ['penalty', 'freekick', 'corner'] as const ).map(kind => (
              <div key={kind} className="mb-3">
                <div className="text-[11px] text-slate-400 mb-1">
                  {kind === 'penalty' ? 'Penaltı' : kind === 'freekick' ? 'Frikik' : 'Korner'}
                </div>
                <select
                  value={gameState.setPieceTakers?.[kind] ?? ''}
                  onChange={e => onSetSetPieceTaker(kind, e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-700 text-white text-xs rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— Seçilmedi —</option>
                  {allPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({ROLE_NAMES[p.role]} • OVR {p.ovr})
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <p className="text-[11px] text-slate-400">
              Penaltı ve frikik görevlileri maç içindeki mini oyunlarda topun başına geçer.
            </p>
          </Section>
        </div>

        {/* Training focus */}
        <Section title="Haftalık Antrenman Odağı" icon="🏋️" accent="text-purple-400">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.keys(TRAINING_FOCUS_INFO) as TrainingFocus[]).map(key => {
              const info = TRAINING_FOCUS_INFO[key];
              return (
                <button
                  key={key}
                  onClick={() => onSetTrainingFocus(key)}
                  className={`p-3 rounded-xl text-center transition-all border ${
                    focus === key ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-700/40 border-transparent hover:bg-slate-600/40 text-slate-200'
                  }`}
                >
                  <div className="text-2xl">{info.icon}</div>
                  <div className="text-xs font-bold mt-1">{info.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{info.desc}</div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Odak, her maç sonrası oyuncu gelişimini etkiler. Dengeli odak sakatlık riskini azaltır.
          </p>
        </Section>
      </div>
    </div>
  );
};
