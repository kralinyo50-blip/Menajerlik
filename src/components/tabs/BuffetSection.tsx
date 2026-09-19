import React, { useMemo, useState } from 'react';
import { BuffetPriceLevel, BuffetState, GameState, StadiumFacilities } from '../../types/game';
import {
  BUFFET_MENU, BUFFET_PRICE_LEVELS, BUFFET_SPONSORS, BUFFET_SPONSOR_MAP, BUFFET_TIER_LABEL,
  buffetBreakFee, canSignBuffetSponsor,
} from '../../data/buffet';
import { facilityUpgradeCost } from '../../data/stadium';
import { buffetBreakdown } from '../../utils/stadium';
import { formatMoney } from '../../utils/pricing';

interface BuffetSectionProps {
  gameState: GameState;
  /** Gerçek büfe durumu (kayıttan normalize edilmiş) */
  buffet: BuffetState;
  facilities: StadiumFacilities;
  /** Büfe seviyesini yükselt (tesis sistemi) */
  onUpgradeBuffet: () => void;
  onSignSponsor: (brandId: string) => void;
  onCancelSponsor: () => void;
  onBuyMenuItem: (itemId: string) => void;
  onSetPriceLevel: (level: BuffetPriceLevel) => void;
  /** 3D'de marka tabelasını ön izle (null → gerçek duruma dön) */
  onPreviewBrand: (brandId: string | null) => void;
  /** Şu an 3D'de ön izlenen marka kimliği */
  previewBrandId: string | null;
  /** 3D sahnede büfeyi ön izle (bir üst seviye) */
  onPreviewLevel: () => void;
  previewingLevel: boolean;
  /** Kamera büfeye gitsin */
  onFocus3D: () => void;
  /** Tahmini seyirci (gelir tahmini için) */
  attendance: number;
}

const tierColor: Record<1 | 2 | 3, string> = {
  1: 'bg-slate-600/40 text-slate-200 border-slate-500/40',
  2: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
  3: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/40',
};

/**
 * 🍔 BÜFE STÜDYOSU — marka sponsorluğu, menü ve fiyat politikası yönetimi.
 * Satın alınan her şey 3D sahnede görünür; marka anlaşması yapılınca büfe
 * tabelaları o markanın rengini/adını alır.
 */
export const BuffetSection: React.FC<BuffetSectionProps> = ({
  gameState, buffet, facilities, onUpgradeBuffet,
  onSignSponsor, onCancelSponsor, onBuyMenuItem, onSetPriceLevel,
  onPreviewBrand, previewBrandId, onPreviewLevel, previewingLevel, onFocus3D, attendance,
}) => {
  const [tab, setTab] = useState<'sponsor' | 'menu' | 'fiyat'>('sponsor');

  const level = facilities.buffet ?? 0;
  const sponsor = buffet.sponsorId ? BUFFET_SPONSOR_MAP[buffet.sponsorId] : null;
  const weeksLeft = buffet.sponsorWeeksLeft ?? 0;
  const breakdown = useMemo(() => buffetBreakdown(gameState, Math.max(500, attendance)), [gameState, attendance]);
  const upgradeCost = facilityUpgradeCost('buffet', level);
  const maxed = level >= 5;
  const canUpgrade = !maxed && gameState.budget >= upgradeCost;

  const boughtMenu = new Set(buffet.menu ?? []);
  const menuIncome = BUFFET_MENU.filter(m => boughtMenu.has(m.id)).reduce((a, m) => a + m.perFan, 0);
  const menuHappy = BUFFET_MENU.filter(m => boughtMenu.has(m.id)).reduce((a, m) => a + m.happiness, 0);

  /** Marka kademesine göre sıralı teklifler: önce imzalanabilirler, sonra kilitliler */
  const offers = useMemo(() => {
    return [...BUFFET_SPONSORS]
      .map(brand => ({ brand, check: canSignBuffetSponsor(gameState, brand) }))
      .sort((a, b) => {
        if (a.check.ok !== b.check.ok) return a.check.ok ? -1 : 1;
        if (a.brand.tier !== b.brand.tier) return a.brand.tier - b.brand.tier;
        return b.brand.signingBonus - a.brand.signingBonus;
      });
  }, [gameState]);

  const availableCount = offers.filter(o => o.check.ok).length;

  return (
    <div id="bufe-studyosu" className="bg-gradient-to-br from-amber-900/25 to-slate-800/60 backdrop-blur-xl rounded-2xl border border-amber-500/25 p-5 shadow-xl scroll-mt-3">
      {/* ── Başlık + durum ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
            🍔 Büfe Stüdyosu
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/30">
              SEVİYE {level}/5
            </span>
            {sponsor && weeksLeft > 0 && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                style={{ background: `${sponsor.color}22`, borderColor: sponsor.color, color: sponsor.ink ?? '#fff' }}
              >
                {sponsor.icon} {sponsor.name} • {weeksLeft} hafta kaldı
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-300 mt-1 max-w-2xl">
            Büfeyi marka sponsorluğuyla büyüt: <b className="text-amber-200">imza parası</b> peşin gelir,
            <b className="text-emerald-300"> maç başına prim</b> her iç saha maçında kazanç, <b>menü çeşitliliği</b> taraftarı,
            <b>fiyat politikası</b> kârı belirler. Her satın alma <b className="text-amber-200">3D sahnede anında görünür</b>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onFocus3D}
            className="bg-slate-900/70 hover:bg-slate-800 text-amber-200 border border-amber-500/40 px-3 py-2 rounded-xl text-[11px] font-black"
          >
            🎥 3D'de büfeye git
          </button>
          <button
            onClick={onUpgradeBuffet}
            disabled={!canUpgrade}
            className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${
              maxed ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
              : canUpgrade ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
              : 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
            }`}
            title="Büfe seviyesini yükselt (daha büyük kulübe, daha çok kapasite)"
          >
            {maxed ? 'Seviye 5/5 ✓' : `⬆️ Büfe Seviye ${level + 1} — ${formatMoney(upgradeCost)}`}
          </button>
          {!maxed && (
            <button
              onClick={onPreviewLevel}
              className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${
                previewingLevel
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60'
              }`}
            >
              {previewingLevel ? '✕ Ön izlemeyi kapat' : '👁️ Sonraki seviyeyi gör'}
            </button>
          )}
        </div>
      </div>

      {/* ── Gelir özeti ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {[
          { l: 'Maç başına büfe geliri', v: formatMoney(breakdown.total), c: 'text-emerald-300', h: `${Math.max(500, attendance).toLocaleString()} seyirci` },
          { l: 'Taraftar başına', v: formatMoney(Math.round(breakdown.perFan * 100) / 100), c: 'text-cyan-300', h: `taban ${formatMoney(Math.round(breakdown.baseIncome / Math.max(1, attendance)))}` },
          { l: 'Marka primi', v: formatMoney(breakdown.sponsorIncome), c: 'text-fuchsia-300', h: sponsor ? `${sponsor.name}` : 'sponsor yok' },
          { l: 'Toplam büfe cirosu', v: formatMoney(buffet.revenueTotal || 0), c: 'text-amber-300', h: `sponsorluktan ${formatMoney(buffet.sponsorEarned || 0)}` },
        ].map(card => (
          <div key={card.l} className="bg-black/30 rounded-xl p-3 border border-slate-700/40">
            <div className="text-[10px] text-slate-400">{card.l}</div>
            <div className={`font-black text-lg ${card.c}`}>{card.v}</div>
            <div className="text-[9px] text-slate-500 truncate">{card.h}</div>
          </div>
        ))}
      </div>

      {/* ── Alt sekmeler ── */}
      <div className="flex gap-2 flex-wrap mb-3">
        {([
          ['sponsor', `🤝 Marka Sponsorluğu${availableCount ? ` (${availableCount})` : ''}`],
          ['menu', `🍽️ Menü (${boughtMenu.size}/${BUFFET_MENU.length})`],
          ['fiyat', `🏷️ Fiyat Politikası`],
        ] as ['sponsor' | 'menu' | 'fiyat', string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
              tab === id ? 'bg-amber-500 text-black border-amber-300' : 'bg-slate-800/60 text-slate-200 border-slate-600/50 hover:bg-slate-700/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════ MARKA SPONSORLUĞU ══════════ */}
      {tab === 'sponsor' && (
        <div className="space-y-3">
          {sponsor && weeksLeft > 0 ? (
            <div className="rounded-xl p-4 border-2" style={{ borderColor: sponsor.color, background: `${sponsor.color}18` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sponsor.icon}</span>
                  <div>
                    <div className="text-white font-black text-sm">
                      {sponsor.name} <span className="text-[10px] font-bold text-slate-300">• {BUFFET_TIER_LABEL[sponsor.tier]} • {sponsor.category}</span>
                    </div>
                    <div className="text-[11px] text-emerald-300 font-bold">
                      +{formatMoney(Math.round(sponsor.perFan * 100) / 100)}/taraftar • maç başına ≈ {formatMoney(breakdown.sponsorIncome)}
                    </div>
                    <div className="text-[10px] text-slate-300">
                      Kalan süre: <b className="text-white">{weeksLeft} hafta</b> • memnuniyet {sponsor.happiness >= 0 ? '+' : ''}{sponsor.happiness}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPreviewBrand(previewBrandId === sponsor.id ? null : sponsor.id)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-black border transition-all ${
                      previewBrandId === sponsor.id ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-900/70 text-slate-100 border-slate-600'
                    }`}
                  >
                    {previewBrandId === sponsor.id ? '✕ Ön izlemeyi kapat' : '👁️ 3D tabelayı gör'}
                  </button>
                  <button
                    onClick={onCancelSponsor}
                    className="px-3 py-2 rounded-lg text-[11px] font-black bg-red-600/80 hover:bg-red-500 text-white border border-red-400"
                    title={`Fesih cezası: ${formatMoney(buffetBreakFee(sponsor, weeksLeft, Math.max(500, attendance)))}`}
                  >
                    ✕ Feshet — {formatMoney(buffetBreakFee(sponsor, weeksLeft, Math.max(500, attendance)))}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 rounded-xl p-3 border border-slate-700/40 text-[11px] text-slate-300">
              Büfenin şu an markası yok — <b className="text-amber-200">kulübün kendi büfesi</b>. Aşağıdan bir markayla anlaş:
              imza parası peşin kasaya girer, o marka büfenin tabelasını ve ürünlerini getirir.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {offers.map(({ brand, check }) => {
              const active = buffet.sponsorId === brand.id && weeksLeft > 0;
              const previewing = previewBrandId === brand.id;
              return (
                <div
                  key={brand.id}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    previewing ? 'border-amber-400 bg-amber-500/10'
                    : active ? 'border-emerald-500 bg-emerald-500/10'
                    : check.ok ? 'border-slate-600/50 bg-slate-800/50 hover:border-amber-400/60'
                    : 'border-slate-700/40 bg-slate-900/40 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0" style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.4))' }}>{brand.icon}</span>
                      <div className="min-w-0">
                        <div className="text-white font-black text-sm truncate">{brand.name}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${tierColor[brand.tier]}`}>
                            {BUFFET_TIER_LABEL[brand.tier]}
                          </span>
                          <span className="text-[9px] text-slate-400">{brand.category}</span>
                        </div>
                      </div>
                    </div>
                    <span className="w-3 h-10 rounded-full shrink-0" style={{ background: brand.color }} />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] mt-2">
                    <div className="bg-black/30 rounded px-2 py-1">
                      <span className="text-slate-400">İmza parası</span><br />
                      <span className="text-emerald-300 font-black">{formatMoney(brand.signingBonus)}</span>
                    </div>
                    <div className="bg-black/30 rounded px-2 py-1">
                      <span className="text-slate-400">Maç başı prim</span><br />
                      <span className="text-cyan-300 font-black">+{formatMoney(Math.round(brand.perFan * 100) / 100)}/taraftar</span>
                    </div>
                    <div className="bg-black/30 rounded px-2 py-1">
                      <span className="text-slate-400">Süre</span><br />
                      <span className="text-white font-bold">{brand.durationWeeks} hafta</span>
                    </div>
                    <div className="bg-black/30 rounded px-2 py-1">
                      <span className="text-slate-400">Memnuniyet</span><br />
                      <span className="text-amber-200 font-bold">{brand.happiness >= 0 ? '+' : ''}{brand.happiness}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 mt-2 min-h-[26px]">{brand.desc}</div>

                  {!check.ok && (
                    <div className="text-[10px] text-red-300/90 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 mb-2">
                      🔒 {check.reasons.join(' • ')}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onPreviewBrand(previewing ? null : brand.id)}
                      className={`shrink-0 px-2.5 py-2 rounded-lg text-[11px] font-black border transition-all ${
                        previewing ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:border-amber-400/60'
                      }`}
                      title="Tabelayı 3D sahnede dene"
                    >
                      {previewing ? '✕' : '👁️'}
                    </button>
                    <button
                      disabled={!check.ok || active}
                      onClick={() => onSignSponsor(brand.id)}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${
                        active ? 'bg-emerald-600/70 text-white cursor-default'
                        : check.ok ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {active ? '✓ Bu marka büfenin sponsoru' : check.ok ? `🤝 İmzala — +${formatMoney(brand.signingBonus)}` : 'Koşullar sağlanmadı'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ MENÜ ══════════ */}
      {tab === 'menu' && (
        <div className="space-y-3">
          <div className="bg-black/30 rounded-xl p-3 border border-slate-700/40 text-[11px] text-slate-300">
            Menüye eklenen her ürün <b className="text-emerald-300">taraftar başına geliri</b> ve <b className="text-amber-200">memnuniyeti</b> artırır.
            Ürünler büfe seviyesine bağlıdır: <b className="text-white">{menuIncome.toFixed(1)}$/taraftar</b> ek gelir • <b className="text-amber-200">+{menuHappy}</b> memnuniyet açık.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BUFFET_MENU.map(item => {
              const owned = boughtMenu.has(item.id);
              const locked = level < item.minBuffetLevel;
              const affordable = gameState.budget >= item.cost;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    owned ? 'border-emerald-500/50 bg-emerald-500/10'
                    : locked ? 'border-slate-700/40 bg-slate-900/40 opacity-70'
                    : 'border-slate-600/50 bg-slate-800/50 hover:border-amber-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-black text-sm">{item.icon} {item.name}</span>
                    {owned && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black">MENÜDE ✓</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 min-h-[26px]">{item.desc}</div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] my-2">
                    <div className="bg-black/30 rounded px-1.5 py-1 text-center">
                      <div className="text-slate-400">Gelir</div>
                      <div className="text-emerald-300 font-black">+{item.perFan.toFixed(1)}$</div>
                    </div>
                    <div className="bg-black/30 rounded px-1.5 py-1 text-center">
                      <div className="text-slate-400">Memnun.</div>
                      <div className="text-amber-200 font-black">+{item.happiness}</div>
                    </div>
                    <div className="bg-black/30 rounded px-1.5 py-1 text-center">
                      <div className="text-slate-400">Seviye</div>
                      <div className={`font-black ${locked ? 'text-red-300' : 'text-white'}`}>{item.minBuffetLevel}+</div>
                    </div>
                  </div>
                  <button
                    disabled={owned || locked || !affordable}
                    onClick={() => onBuyMenuItem(item.id)}
                    className={`w-full py-2 rounded-lg text-[11px] font-black transition-all ${
                      owned ? 'bg-emerald-600/60 text-white cursor-default'
                      : locked ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : affordable ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {owned ? 'Menüde' : locked ? `🔒 Büfe seviye ${item.minBuffetLevel} gerekli` : affordable ? `Ekle — ${formatMoney(item.cost)}` : `Eksik: ${formatMoney(item.cost - gameState.budget)}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ FİYAT POLİTİKASI ══════════ */}
      {tab === 'fiyat' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BUFFET_PRICE_LEVELS.map(tier => {
              const active = buffet.priceLevel === tier.id;
              const perFan = (breakdown.perFan) * tier.incomeMult;
              return (
                <button
                  key={tier.id}
                  onClick={() => onSetPriceLevel(tier.id)}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${
                    active ? 'border-amber-400 bg-amber-500/15' : 'border-slate-600/50 bg-slate-800/50 hover:border-amber-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-black text-sm">{tier.icon} {tier.label}</span>
                    {active && <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-black">AKTİF</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 my-1.5">{tier.desc}</div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="bg-black/30 rounded px-2 py-1">
                      <div className="text-slate-400">Gelir çarpanı</div>
                      <div className="text-emerald-300 font-black">×{tier.incomeMult}</div>
                    </div>
                    <div className="bg-black/30 rounded px-2 py-1">
                      <div className="text-slate-400">Tahmini /taraftar</div>
                      <div className="text-cyan-300 font-black">{Math.round(perFan * 100) / 100}$</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-slate-700/40 text-[11px] text-slate-300">
            💡 <b>Denge:</b> Uygun fiyat tribünü büfeye çeker ve memnuniyeti artırır (aile/çocuk tribünü için ideal).
            Premium menü birim kârı yükseltir ama memnuniyeti düşürür — taraftar mutluluğun düşükken premiuma geçmek
            doluluğu ve taraftar bağışını azaltır. Memnuniyet yükseldikçe üst kademe markalar kapıyı çalar.
          </div>
        </div>
      )}
    </div>
  );
};

export default BuffetSection;
