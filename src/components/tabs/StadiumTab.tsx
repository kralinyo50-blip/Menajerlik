import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FacilityModuleId, GameState, RoofStyle, StandStyle, PitchPattern, Staff, StadiumDesign, StadiumFacilities, StadiumFacilityId, StadiumState } from '../../types/game';
import { Stadium3D, StadiumViewerApi } from '../Stadium3D';
import { BuffetSection } from './BuffetSection';
import { BUFFET_SPONSOR_MAP, normalizeBuffetState } from '../../data/buffet';
import type { BuffetPriceLevel } from '../../types/game';
import {
  CAPACITY_PACKAGES, COSMETICS, FREE_ACCENT_COLORS, FREE_SEAT_COLORS, MAX_CAPACITY, PREMIUM_COLORS,
  ROOF_LABEL, ROOF_PROTECTION, STAND_LABEL, PITCH_LABEL, TICKET_STRATEGIES, isUnlocked, TRIBUNES, STADIUM_EVENTS,
  STADIUM_FACILITY_DEFS, STADIUM_FACILITY_MAP, facilityUpgradeCost
} from '../../data/stadium';
import { formatMoney } from '../../utils/pricing';
import { fanSpendingPerFan, getStadiumFacilities, previewHomeMatch, stadiumCapacity } from '../../utils/stadium';
import { TrainingComplexSection } from './TrainingComplexSection';
import { StaffSection, YouthScoutSection } from './facilitySections';

interface StadiumTabProps {
  gameState: GameState;
  onSetDesign: (patch: Partial<GameState['stadium']['design']>) => void;
  onBuyCosmetic: (id: string) => void;
  onBuyCapacity: (id: string) => void;
  onSetTicketMultiplier: (multiplier: number) => void;
  onUpgradeStadiumLevel: (cost: number) => void;
  onUpgradeTribune?: (side: 'north'|'south'|'east'|'west') => void;
  onHostEvent?: (eventId: 'concert'|'fair') => void;
  onUpgradeStadiumFacility?: (id: import('../../types/game').StadiumFacilityId) => void;
  /* ── 🍔 Büfe işletmesi: marka sponsorluğu, menü, fiyat politikası ── */
  onSignBuffetSponsor?: (brandId: string) => void;
  onCancelBuffetSponsor?: () => void;
  onBuyBuffetMenuItem?: (itemId: string) => void;
  onSetBuffetPriceLevel?: (level: BuffetPriceLevel) => void;
  /* ── 3D Antrenman Kompleksi & tesis yönetimi (eski Tesisler sekmesi buraya taşındı) ── */
  onUpgradeFacilityModule?: (id: FacilityModuleId) => void;
  onHireStaff?: (type: Staff['type'], cost: number) => void;
  onDiscoverYouth?: () => void;
  onPromoteYouth?: (playerId: number) => void;
  onSendScout?: (regionId: string) => void;
  onClaimScoutReport?: (reportId: string, playerId?: number) => void;
  onDismissScoutReport?: (reportId: string) => void;
  onCancelScoutMission?: (missionId: string) => void;
}

type SubTab = 'design' | 'capacity' | 'tribunes' | 'facilities' | 'tickets' | 'shop' | 'complex' | 'staff' | 'youth';

const SubTabButton: React.FC<{ id: SubTab; icon: string; label: string }> = ({ id, icon, label }) => (
  <span className="flex items-center gap-1.5" data-tab={id}>
    {icon} {label}
    {id === 'complex' && (
      <span className="text-[9px] bg-amber-400 text-black font-black px-1.5 py-0.5 rounded-full">YENİ</span>
    )}
  </span>
);

/** Kilitli seçenek rozeti */
const LockBadge: React.FC<{ unlocked: boolean; price: number }> = ({ unlocked, price }) =>
  unlocked ? null : (
    <span className="text-[9px] bg-amber-500/25 text-amber-200 px-1.5 py-0.5 rounded">
      🔒 {formatMoney(price)}
    </span>
  );

/** Küçük 👁️ tuşu — renk paleti gibi dar alanlar için */
const EyeChip: React.FC<{ active: boolean; onToggle: () => void; title?: string }> = ({ active, onToggle, title }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    title={active ? 'Ön izlemeyi kapat' : title ?? 'Ön izle — 3D sahnede satın almadan gör'}
    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border transition-all ${
      active ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-800/80 text-slate-300 border-slate-600/60 hover:bg-slate-700 hover:text-white'
    }`}
  >
    {active ? '✕ kapat' : '👁️'}
  </button>
);

interface OptionCardProps {
  active: boolean;
  unlocked: boolean;
  price: number;
  budget: number;
  icon: string;
  label: string;
  desc?: string;
  /** 👁️ Ön İzle tuşu görünsün mü */
  hasPreview?: boolean;
  /** Bu seçenek şu anda 3D sahnede ön izleniyor mu */
  previewing?: boolean;
  onClick: () => void;
  onTogglePreview?: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
}

/** Stadyum seçenek kartı — yanında her zaman görünür "👁️ Ön İzle" tuşu ile */
const OptionCard: React.FC<OptionCardProps> = ({
  active, unlocked, price, budget, icon, label, desc,
  hasPreview, previewing, onClick, onTogglePreview, onHover, onHoverEnd
}) => (
  <div
    onMouseEnter={onHover}
    onMouseLeave={onHoverEnd}
    className={`relative text-left rounded-xl p-3 border-2 transition-all group ${
      previewing ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
      : active ? 'bg-emerald-500/15 border-emerald-500'
      : unlocked ? 'bg-slate-700/40 border-slate-700/60 hover:border-emerald-500/60'
      : budget >= price ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-400'
      : 'bg-slate-800/60 border-slate-700/40 opacity-60'
    }`}
  >
    <button
      onClick={onClick}
      disabled={!unlocked && budget < price}
      className="w-full text-left disabled:cursor-not-allowed"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-white font-bold text-sm">{icon} {label}</span>
        <LockBadge unlocked={unlocked} price={price} />
      </div>
      {desc && <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>}
      {!unlocked && (
        <div className="text-[10px] text-amber-300 mt-1">
          {budget >= price ? 'Satın almak için tıkla' : `Yetersiz bütçe — ${formatMoney(price - budget)} eksik`}
        </div>
      )}
    </button>
    {/* 👁️ ÖN İZLE TUŞU — her zaman görünür, basınca 3D sahnede gösterir */}
    {hasPreview && (
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[9px] text-slate-500">{previewing ? '3D sahnede gösteriliyor' : 'satın almadan 3D’de gör'}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePreview?.(); }}
          className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
            previewing
              ? 'bg-amber-400 text-black border-amber-300'
              : 'bg-slate-900/70 text-slate-200 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60 hover:text-amber-200'
          }`}
        >
          {previewing ? '✕ Ön İzlemeyi Kapat' : '👁️ Ön İzle'}
        </button>
      </div>
    )}
  </div>
);

export const StadiumTab: React.FC<StadiumTabProps> = ({
  gameState, onSetDesign, onBuyCosmetic, onBuyCapacity, onSetTicketMultiplier, onUpgradeStadiumLevel, onUpgradeTribune, onHostEvent, onUpgradeStadiumFacility,
  onSignBuffetSponsor, onCancelBuffetSponsor, onBuyBuffetMenuItem, onSetBuffetPriceLevel,
  onUpgradeFacilityModule, onHireStaff, onDiscoverYouth, onPromoteYouth,
  onSendScout, onClaimScoutReport, onDismissScoutReport, onCancelScoutMission
}) => {
  const [sub, setSub] = useState<SubTab>('design');
  const [night, setNight] = useState(true);
  const [cinematic, setCinematic] = useState(false);
  /** Tam ekran 3D görünümü (CSS overlay — iframe içinde de çalışır) */
  const [sceneFull, setSceneFull] = useState(false);
  const [viewportH, setViewportH] = useState(() => (typeof window === 'undefined' ? 900 : window.innerHeight));
  useEffect(() => {
    if (!sceneFull) return;
    const onResize = () => setViewportH(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSceneFull(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('keydown', onKey); };
  }, [sceneFull]);
  const sceneHeight = sceneFull ? Math.max(360, viewportH - 120) : 400;

  /* ══════════ ÖN İZLEME SİSTEMİ ══════════
     Her seçeneğin yanında "👁️ Ön İzle" tuşu var: basınca değişiklik satın alınmadan
     3D sahnede gösterilir (sahne ekranda değilse otomatik yukarı kayar), tekrar basınca
     veya banner'daki ✕ ile kapanır. Banner'dan tek tıkla uygulanır/satın alınır. */
  const [previewDesign, setPreviewDesign] = useState<StadiumDesign | null>(null);
  const [previewBonus, setPreviewBonus] = useState<number | null>(null);
  const [previewVip, setPreviewVip] = useState<boolean | null>(null);
  const [previewTribunes, setPreviewTribunes] = useState<StadiumState['tribunes'] | null>(null);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  /** Ön izlenen iç tesisler (büfe, mağaza, otopark…) — 3D sahnede gösterilir */
  const [previewFacilities, setPreviewFacilities] = useState<StadiumFacilities | null>(null);
  /** 3D'de halka ile işaretlenen tesis: satın alma sonrası kısa süreli vurgu */
  const [flashFacility, setFlashFacility] = useState<StadiumFacilityId | null>(null);
  const flashTimer = useRef<number | null>(null);
  useEffect(() => () => { if (flashTimer.current) window.clearTimeout(flashTimer.current); }, []);
  /** Aktif ön izlemenin kimliği + etiketi + (varsa) tek tıkla uygulama aksiyonu */
  const [previewInfo, setPreviewInfo] = useState<{ id: string; label: string; facility?: StadiumFacilityId; applyLabel?: string; onApply?: () => void } | null>(null);
  /** 🍔 3D'de ön izlenen marka tabelası (null → gerçek sponsor) */
  const [previewBrandId, setPreviewBrandId] = useState<string | null>(null);
  /** Büfe Stüdyosu paneli açık mı */
  const [buffetOpen, setBuffetOpen] = useState(false);
  /** Tuşla sabitlenmiş ön izleme — hover'lar bunu bozamaz */
  const pinned = previewInfo !== null;
  const isPreview = pinned || previewDesign !== null || previewBonus !== null || previewVip !== null || previewTribunes !== null || previewLevel !== null || previewFacilities !== null;

  const stadium = gameState.stadium;
  const design = stadium.design;
  const displayDesign = previewDesign ?? design;
  const displayBonus = previewBonus ?? stadium.capacityBonus;
  const displayVip = previewVip ?? stadium.vip;
  const displayLevel = previewLevel ?? gameState.stadiumLvl;
  /** Gerçek tesis seviyeleri (eski kayıtlarda eksik alan olabilir → helper tamamlar) */
  const realFacilities = getStadiumFacilities(gameState);
  /** İç tesis seviyeleri: ön izleme varsa o, yoksa gerçek durum (3D sahne bunu kullanır) */
  const displayFacilities = previewFacilities ?? realFacilities;
  /** 🍔 Büfe işletmesi durumu (marka, menü, fiyat politikası) */
  const buffetState = normalizeBuffetState(stadium.buffet);
  /** 3D'de tabelası görünecek marka: ön izleme varsa o, yoksa sözleşmesi süren sponsor */
  const activeBrand = buffetState.sponsorId && (buffetState.sponsorWeeksLeft ?? 0) > 0 ? BUFFET_SPONSOR_MAP[buffetState.sponsorId] : null;
  const shownBrand = previewBrandId ? BUFFET_SPONSOR_MAP[previewBrandId] : activeBrand;
  const displayStadium = {
    ...stadium,
    design: displayDesign,
    capacityBonus: displayBonus,
    vip: displayVip,
    facilities: displayFacilities,
    tribunes: previewTribunes ?? stadium.tribunes
  } as GameState['stadium'];
  /** 3D'de işaretlenecek tesis: ön izleme varsa o, yoksa satın alma sonrası geçici vurgu */
  const highlightFacility: StadiumFacilityId | null = previewFacilities ? (previewInfo?.facility ?? null) : flashFacility;

  const capacity = stadiumCapacity(gameState);
  const displayCapacity = stadiumCapacity({ ...gameState, stadiumLvl: displayLevel, stadium: displayStadium } as GameState);
  const baseCapacity = gameState.stadiumLvl * 5000 + 2000;
  const fillRate = Math.min(100, Math.round(((gameState.clubStats.totalAttendance || 0) / Math.max(1, (gameState.clubStats.totalWins || 1) * capacity)) * 100));
  const preview = useMemo(() => previewHomeMatch({ ...gameState, stadiumLvl: displayLevel, stadium: displayStadium } as GameState, 3, 'sunny'), [gameState, displayStadium, displayLevel]);
  /** Tesis özet göstergeleri (İç Tesisler sekmesi başlığı) */
  const totalFacilityLevels = Object.values(realFacilities).reduce((a, b) => a + (b || 0), 0);
  const spendPerFan = fanSpendingPerFan({ ...gameState, stadium: displayStadium } as GameState);
  const upgradeLevelCost = 1200000 * gameState.stadiumLvl;
  const bestTotal = Math.max(...TICKET_STRATEGIES.map(st =>
    previewHomeMatch({ ...gameState, stadium: { ...stadium, ticketMultiplier: st.multiplier } }, 3, 'sunny').total
  ));

  /** 3D sahne görünürde değilse ön izleme başlayınca oraya kaydır */
  const sceneRef = useRef<HTMLDivElement | null>(null);
  /** 3D izleyici kumandası (kamera ön ayarları: Genel / Çarşı / Saha) */
  const viewerApi = useRef<StadiumViewerApi | null>(null);
  const [sceneView, setSceneView] = useState<'overview' | 'plaza' | 'pitch'>('overview');
  const focusScene = () => {
    const el = sceneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // 🐛 FIX: block:'start' sayfayı tepeye fırlatıyordu — tamamen görünmezse en kısa yolla kaydır
    const fullyHidden = r.bottom < 40 || r.top > window.innerHeight - 40;
    if (fullyHidden) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  interface PreviewPatch {
    id: string;
    label: string;
    design?: Partial<StadiumDesign>;
    bonus?: number;
    vip?: boolean;
    tribunes?: StadiumState['tribunes'];
    level?: number;
    /** İç tesis seviyeleri (büfe, mağaza…) — 3D sahnede gösterilir */
    facilities?: StadiumFacilities;
    /** 3D'de işaretlenecek tesis kimliği */
    facility?: StadiumFacilityId;
    applyLabel?: string;
    onApply?: () => void;
  }

  const applyPatch = (p: PreviewPatch) => {
    if (p.design) setPreviewDesign(prev => ({ ...(prev ?? design), ...p.design }));
    if (p.bonus !== undefined) setPreviewBonus(p.bonus);
    if (p.vip !== undefined) setPreviewVip(p.vip);
    if (p.tribunes !== undefined) setPreviewTribunes(p.tribunes);
    if (p.level !== undefined) setPreviewLevel(p.level);
    if (p.facilities !== undefined) setPreviewFacilities(p.facilities);
  };

  const resetPreviewValues = () => {
    setPreviewDesign(null); setPreviewBonus(null); setPreviewVip(null);
    setPreviewTribunes(null); setPreviewLevel(null); setPreviewFacilities(null);
  };

  const clearPreview = () => { resetPreviewValues(); setPreviewInfo(null); };

  /** 👁️ Ön İzle tuşu — bas: 3D'de göster, tekrar bas: kapat */
  const togglePreview = (p: PreviewPatch) => {
    if (previewInfo?.id === p.id) { clearPreview(); return; }
    resetPreviewValues();
    applyPatch(p);
    setPreviewInfo({ id: p.id, label: p.label, facility: p.facility, applyLabel: p.applyLabel, onApply: p.onApply });
    focusScene();
  };

  /** Tesis satın alınınca: 3D sahne tazelenir, yeni yapı bir süre halka ile işaretlenir */
  const buyFacility = (id: StadiumFacilityId) => {
    onUpgradeStadiumFacility?.(id);
    setFlashFacility(id);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashFacility(null), 12000);
    focusScene();
  };

  /** Bir tesisi bir üst seviyede 3D'de ön izle (satın almadan) */
  const facilityPreviewPatch = (id: StadiumFacilityId): PreviewPatch => {
    const lvl = displayFacilities[id] ?? 0;
    const nextLvl = Math.min(5, lvl + 1);
    const def = STADIUM_FACILITY_MAP[id];
    const cost = facilityUpgradeCost(id, lvl);
    const affordable = lvl < 5 && gameState.budget >= cost;
    return {
      id: `preview:facility:${id}`,
      label: `${def?.icon ?? '🏗️'} ${def?.name ?? id} • Seviye ${nextLvl}/5`,
      facilities: { ...displayFacilities, [id]: nextLvl } as StadiumFacilities,
      facility: id,
      applyLabel: affordable ? `⬆️ Yükselt — ${formatMoney(cost)}` : undefined,
      onApply: affordable ? () => buyFacility(id) : undefined
    };
  };

  /** Büfe stüdyosu sekmeye geçince kamera meydana (büfe çarşısı) baksın */
  useEffect(() => {
    if (!buffetOpen) return;
    setSceneView('plaza');
    viewerApi.current?.focusPreset('plaza');
  }, [buffetOpen]);

  /** Fare üzerine gelince ön izleme — yalnızca sabitlenmiş bir ön izleme yoksa */
  const hoverPreview = (p: PreviewPatch) => { if (!pinned) applyPatch(p); };
  const hoverEnd = () => { if (!pinned) resetPreviewValues(); };

  const isRainy = ['rain', 'storm', 'snow'].includes(gameState.weather);
  const roofProtects = displayDesign.roof === 'full' || displayDesign.roof === 'glass';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Başlık */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">🏟️ Stadyum Stüdyosu</h2>
            <p className="text-[11px] text-amber-300/90">🏋️ Tesisler artık burada — aşağıdaki <b>TESİSLER &amp; ANTRENMAN</b> grubuna bak</p>
            <p className="text-slate-400 text-sm">
              {gameState.teamName} Arena • Seviye {gameState.stadiumLvl} • {ROOF_LABEL[displayDesign.roof]} • {STAND_LABEL[displayDesign.stands]}
              {isPreview && <span className="ml-2 text-amber-300 text-xs font-bold">👁️ ÖN İZLEME</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-700/50 px-3 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400">Kapasite {isPreview && displayCapacity !== capacity ? '(ön izleme)' : ''}</div>
              <div className={`font-black text-sm ${isPreview && displayCapacity !== capacity ? 'text-amber-300' : 'text-white'}`}>{displayCapacity.toLocaleString()}</div>
            </div>
            <div className="bg-amber-500/15 px-3 py-2 rounded-xl text-center border border-amber-500/30">
              <div className="text-[10px] text-amber-200">Maç başı toplam gelir (tahmin)</div>
              <div className="text-amber-400 font-black text-sm">{formatMoney(preview.total)}</div>
            </div>
            <div className="bg-emerald-500/15 px-3 py-2 rounded-xl text-center border border-emerald-500/30">
              <div className="text-[10px] text-emerald-200">Bütçe</div>
              <div className="text-emerald-400 font-black text-sm">{formatMoney(gameState.budget)}</div>
            </div>
          </div>
        </div>

        {/* 3D sahne — 👁️ Ön İzle tuşuna basınca burası gösterilir.
            📺 Tam ekran: sahne neredeyse tüm pencereyi kaplar (ESC veya ✕ ile çıkılır). */}
        <div
          className={sceneFull
            ? 'fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur p-2 sm:p-4 overflow-y-auto'
            : 'relative scroll-mt-3'}
          ref={sceneRef}
        >
          <Stadium3D
            design={displayDesign}
            capacity={displayCapacity}
            logo={gameState.teamLogo}
            sponsorText={gameState.activeSponsor ? `${gameState.activeSponsor.name.toUpperCase()} • RESMİ SPONSOR • ` : `${gameState.teamName.toUpperCase()} • RESMİ SPONSOR • `}
            night={night}
            teamName={gameState.teamName}
            cinematic={cinematic}
            height={sceneHeight}
            crowdIntensity={fillRate}
            wet={isRainy && !roofProtects}
            facilities={displayFacilities as unknown as Record<string, number>}
            initialView={sceneView}
            viewerApi={viewerApi}
            buffetBrand={shownBrand ? { name: shownBrand.name, color: shownBrand.color, ink: shownBrand.ink, icon: shownBrand.icon } : null}
            highlightFacility={highlightFacility}
            previewLabel={
              previewFacilities && previewInfo?.facility
                ? `${STADIUM_FACILITY_MAP[previewInfo.facility]?.icon ?? '🏗️'} ${STADIUM_FACILITY_MAP[previewInfo.facility]?.name ?? ''} • Seviye ${displayFacilities[previewInfo.facility]}/5 ön izleme`
                : flashFacility
                  ? `${STADIUM_FACILITY_MAP[flashFacility]?.icon ?? '🏗️'} ${STADIUM_FACILITY_MAP[flashFacility]?.name ?? ''} • Seviye ${displayFacilities[flashFacility]}/5 — 3D\'ye eklendi`
                  : null
            }
          />
          {/* Yağmur / sis — çatıya göre hafif overlay, performans dostu */}
          {isRainy && !roofProtects && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-[1.5px] bg-sky-200/60"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: '-12px',
                    height: `${14 + (i % 5) * 3}px`,
                    opacity: 0.55 + (i % 3) * 0.15,
                    transform: 'rotate(14deg)',
                    animation: `rainFall ${0.55 + (i % 4) * 0.12}s linear ${(i % 7) * 0.08}s infinite`,
                  }}
                />
              ))}
              <div className="absolute bottom-2 right-2 bg-sky-900/80 backdrop-blur text-sky-100 text-[10px] px-2 py-1 rounded-full border border-sky-700/40">
                {gameState.weather === 'snow' ? '❄️ Kar yağıyor — zemin beyaz, çatı korumuyor' : gameState.weather === 'storm' ? `⛈️ Fırtına — çatı ${displayDesign.roof} koruması zayıf` : '🌧️ Yağmur — çatı koruması yok, zemin ıslak'}
              </div>
            </div>
          )}
          {isRainy && roofProtects && (
            <div className="absolute bottom-2 right-2 bg-emerald-900/80 backdrop-blur text-emerald-100 text-[10px] px-2 py-1 rounded-full border border-emerald-700/40 pointer-events-none">
              {displayDesign.roof === 'glass' ? '💎 Cam çatı — yağmur tamamen engellendi' : '🏟️ Tam çatı — yağmur tribüne ulaşmıyor'}
            </div>
          )}
          {/* Doluluk uğultusu göstergesi — hafif */}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-200 flex items-center gap-1.5 pointer-events-none">
            <span className={fillRate > 75 ? 'text-emerald-400' : fillRate > 45 ? 'text-amber-400' : 'text-slate-400'}>●</span>
            🔊 {fillRate > 75 ? 'Tribün dolu — uğultu yüksek' : fillRate > 45 ? 'Orta doluluk — dalgalanma var' : 'Tribün seyrek — sessiz'} • %{fillRate}
          </div>
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
            <button
              onClick={() => { setSceneFull(v => !v); if (!sceneFull) focusScene(); }}
              title="3D görünümü tam ekran yap / ESC ile çık"
              className={`backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                sceneFull ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
              }`}
            >
              {sceneFull ? '✕ Tam Ekrandan Çık' : '📺 3D Tam Ekran'}
            </button>
          </div>
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-[11px] text-slate-200">
            Koltuk: <b style={{ color: displayDesign.seatColor }}>{displayDesign.seatColor}</b> • Aksan: <b style={{ color: displayDesign.accentColor }}>{displayDesign.accentColor}</b>
            {displayVip && ' • 🥂 VIP'}
            {isPreview && <span className="ml-2 text-amber-300">👁️ ön izleme</span>}
            {previewBrandId && shownBrand && (
              <span className="ml-2 font-black" style={{ color: shownBrand.ink ?? '#fff', textShadow: '0 0 0.5px #000' }}>
                🍔 {shownBrand.icon} {shownBrand.name} tabela ön izlemesi
              </span>
            )}
          </div>
          {/* Kamera ön ayarları — büfeler/çarşı ve saha tek tıkla */}
          <div className="absolute top-14 left-3 flex flex-col gap-1.5">
            {([
              ['overview', '🏟️ Genel Görünüm'],
              ['plaza', '🍔 Çarşı & Büfeler'],
              ['pitch', '🎥 Saha'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setSceneView(id); viewerApi.current?.focusPreset(id); }}
                className={`text-left backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  sceneView === id ? 'bg-emerald-500/80 text-white border-emerald-300' : 'bg-black/55 text-slate-200 border-white/10 hover:bg-black/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* ÖN İZLEME banner — neyin ön izlendiğini söyler, tek tıkla uygular/satın alır */}
          {isPreview && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[94%] bg-amber-500 text-black px-3 py-2 rounded-2xl text-[11px] font-black shadow-lg flex items-center gap-2 flex-wrap justify-center">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                👁️ ÖN İZLEME{previewInfo ? `: ${previewInfo.label}` : ' — satın almadan görünüm'}
              </span>
              {previewInfo?.onApply && (
                <button
                  onClick={() => { const fn = previewInfo.onApply; clearPreview(); fn?.(); }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-full text-[11px] font-black"
                >
                  {previewInfo.applyLabel ?? '✓ Uygula'}
                </button>
              )}
              <button onClick={clearPreview} className="bg-black hover:bg-slate-800 text-white px-3 py-1 rounded-full text-[11px]">✕ Kapat</button>
            </div>
          )}
        </div>
        {/* SKORBOARD — LED minimal, performans dostu */}
        <div className="bg-[#0a0f1f] border border-slate-700/60 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 overflow-hidden relative">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-base shrink-0">{gameState.teamLogo || '⚽'}</div>
            <div className="min-w-0">
              <div className="text-white font-black text-sm tracking-wide flex items-center gap-2 flex-wrap">
                <span className="truncate">{gameState.teamName}</span>
                <span className="text-slate-500 text-[11px]">vs</span>
                <span className="text-slate-200">RAKİP</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20">CANLI SKORBOARD</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Süper Lig • Sezon {gameState.season} • {displayCapacity.toLocaleString()} kapasite • {ROOF_LABEL[displayDesign.roof]}
                {isPreview && <span className="text-amber-300"> • ön izleme</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-black rounded-lg px-3 py-1.5 border border-amber-500/30 flex items-center gap-2" style={{ boxShadow: '0 0 12px rgba(245,158,11,0.22), inset 0 0 8px rgba(245,158,11,0.12)' }}>
              <span className="text-amber-400 font-mono font-black text-lg tracking-widest" style={{ textShadow: '0 0 6px rgba(245,158,11,0.75)' }}>0 — 0</span>
              <span className="text-sky-300 font-mono text-xs">45'</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #ef4444', animation: 'boardPulse 1s ease-in-out infinite' }} />
            </div>
            <div className="hidden sm:block text-right min-w-0">
              <div className="text-[9px] text-amber-200/60 tracking-[0.14em]">RESMİ SPONSOR</div>
              <div className="text-[11px] font-bold text-white truncate max-w-[120px]">{gameState.activeSponsor?.name || gameState.teamName}</div>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, white 2px, white 3px)' }} />
        </div>
        <div className="text-[11px] text-slate-400 px-1">
          💡 <b>İpucu:</b> Her seçeneğin yanındaki <b className="text-amber-300">👁️ Ön İzle</b> tuşuna bas — değişiklik anında yukarıdaki 3D sahnede gösterilir (gerekirse ekran otomatik kayar), ama <b>satın alınmaz</b>. Beğenirsen sarı banner’dan <b>uygula/satın al</b>, beğenmezsen <b>✕ Kapat</b>. Gece/gündüz ve 🎬 sinematik ile de kontrol edebilirsin.
        </div>

        {/* Alt sekmeler — iki grup: stadyum & tesisler */}
        {([
          ['🏟️ STADYUM', [
            ['design', '🎨', 'Renkler & Mimari'],
            ['capacity', '🏗️', 'Kapasite & Büyüme'],
            ['tribunes', '🏟️', 'Tribünler & Etkinlik'],
            ['facilities', '🍔', 'İç Tesisler (Büfe vb)'],
            ['tickets', '🎟️', 'Bilet Fiyatı'],
            ['shop', '🛍️', 'Kozmetik Mağazası'],
          ] as [SubTab, string, string][]],
          ['🏋️ TESİSLER & ANTRENMAN', [
            ['complex', '🏋️', 'Antrenman Kompleksi (3D)'],
            ['staff', '👥', 'Personel'],
            ['youth', '🎓', 'Akademi & Scout'],
          ] as [SubTab, string, string][]],
        ] as [string, [SubTab, string, string][]][]).map(([groupLabel, items]) => (
          <div key={groupLabel} className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black tracking-[0.14em] text-slate-400">{groupLabel}</span>
              <span className="flex-1 h-px bg-slate-700/60" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {items.map(([id, icon, label]) => (
                <button
                  key={id}
                  onClick={() => { setSub(id); clearPreview(); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    sub === id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  <SubTabButton id={id} icon={icon} label={label} />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* ── RENKLER & MİMARİ ── */}
        {sub === 'design' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h3 className="text-sm font-bold text-emerald-400">🎨 Tribün Koltuk Rengi</h3>
                <span className="text-[10px] text-slate-400">renge tıkla → uygula • <b className="text-amber-300">👁️ Ön İzle</b> → satın almadan 3D gör</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {FREE_SEAT_COLORS.map(hex => {
                  const patch: PreviewPatch = {
                    id: `seat:${hex}`,
                    label: `Koltuk rengi ${hex}`,
                    design: { seatColor: hex },
                    applyLabel: '✓ Rengi Uygula',
                    onApply: () => onSetDesign({ seatColor: hex })
                  };
                  return (
                  <div key={hex} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => { onSetDesign({ seatColor: hex }); clearPreview(); }}
                      onMouseEnter={() => hoverPreview(patch)}
                      onMouseLeave={hoverEnd}
                      style={{ background: hex }}
                      className={`w-11 h-11 rounded-xl border-4 transition-all ${displayDesign.seatColor === hex && !pinned ? 'border-white scale-110' : displayDesign.seatColor === hex ? 'border-amber-400 scale-110' : 'border-slate-600/60 hover:scale-105'}`}
                      title={`${hex} — uygula`}
                    />
                    <EyeChip active={previewInfo?.id === patch.id} onToggle={() => togglePreview(patch)} />
                  </div>
                  );
                })}
                {PREMIUM_COLORS.map(c => {
                  const unlocked = isUnlocked(stadium, c.id);
                  const patch: PreviewPatch = {
                    id: `seat:${c.hex}`,
                    label: `${c.label} • ${c.hex}`,
                    design: { seatColor: c.hex },
                    applyLabel: unlocked ? '✓ Rengi Uygula' : `💰 Satın Al — ${formatMoney(c.price)}`,
                    onApply: unlocked ? () => onSetDesign({ seatColor: c.hex }) : () => onBuyCosmetic(c.id)
                  };
                  return (
                    <div key={c.id} className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => { if (unlocked) { onSetDesign({ seatColor: c.hex }); clearPreview(); } else { togglePreview(patch); } }}
                        onMouseEnter={() => hoverPreview(patch)}
                        onMouseLeave={hoverEnd}
                        style={{ background: c.hex }}
                        className={`relative w-11 h-11 rounded-xl border-4 transition-all ${
                          displayDesign.seatColor === c.hex ? 'border-amber-400 scale-110 ring-2 ring-amber-400/40'
                          : unlocked ? 'border-slate-600/60 hover:scale-105' : 'border-amber-500/60 hover:scale-105'
                        }`}
                        title={unlocked ? `${c.label} — uygula` : `${c.label} — ${formatMoney(c.price)} — ön izle`}
                      >
                        {!unlocked && <span className="absolute inset-0 flex items-center justify-center text-xs">🔒</span>}
                      </button>
                      <EyeChip active={previewInfo?.id === patch.id} onToggle={() => togglePreview(patch)} />
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                👁️ tuşuna bas → renk 3D stadyumda gösterilir ama <b>satın alınmaz</b>. Üstteki banner’dan <b>uygula / satın al</b> ya da <b>✕ kapat</b>.
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h3 className="text-sm font-bold text-cyan-400">✨ Aksan Rengi <span className="text-[10px] font-normal text-slate-400">(çatı kenarı, bayrak, LED pano)</span></h3>
                <span className="text-[10px] text-slate-400"><b className="text-amber-300">👁️ Ön İzle</b> ile önce gör, sonra uygula</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {FREE_ACCENT_COLORS.map(hex => {
                  const patch: PreviewPatch = {
                    id: `accent:${hex}`,
                    label: `Aksan rengi ${hex}`,
                    design: { accentColor: hex },
                    applyLabel: '✓ Rengi Uygula',
                    onApply: () => onSetDesign({ accentColor: hex })
                  };
                  return (
                  <div key={hex} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => { onSetDesign({ accentColor: hex }); clearPreview(); }}
                      onMouseEnter={() => hoverPreview(patch)}
                      onMouseLeave={hoverEnd}
                      style={{ background: hex }}
                      className={`w-10 h-10 rounded-xl border-4 transition-all ${displayDesign.accentColor === hex && !pinned ? 'border-white scale-110' : displayDesign.accentColor === hex ? 'border-amber-400 scale-110' : 'border-slate-600/60 hover:scale-105'}`}
                      title={hex}
                    />
                    <EyeChip active={previewInfo?.id === patch.id} onToggle={() => togglePreview(patch)} />
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-1">🏠 Çatı Tipi</h3>
                <p className="text-[10px] text-slate-400 mb-3">Her satırda <b className="text-amber-300">👁️ Ön İzle</b> tuşu var — basınca 3D sahnede görünür.</p>
                <div className="space-y-2">
                  {(['none', 'canopy', 'full', 'glass'] as RoofStyle[]).map(roof => {
                    const id = `roof:${roof}`;
                    const unlocked = roof === 'none' || isUnlocked(stadium, id);
                    const option = COSMETICS.find(c => c.id === id);
                    const patch: PreviewPatch = {
                      id: `preview:${id}`,
                      label: `${ROOF_LABEL[roof]} çatı`,
                      design: { roof },
                      applyLabel: unlocked ? '✓ Çatıyı Uygula' : `💰 Satın Al — ${formatMoney(option?.price ?? 0)}`,
                      onApply: unlocked ? () => onSetDesign({ roof }) : () => onBuyCosmetic(id)
                    };
                    return (
                      <OptionCard
                        key={roof}
                        active={displayDesign.roof === roof && !pinned}
                        unlocked={unlocked}
                        price={option?.price ?? 0}
                        icon={roof === 'none' ? '🚫' : roof === 'canopy' ? '🏠' : roof === 'full' ? '🏟️' : '💎'}
                        label={ROOF_LABEL[roof]}
                        desc={roof === 'none'
                          ? 'Yağmur/kar seyirciyi %20-25 etkiler'
                          : `${option?.desc} — kötü havada kaybın %${Math.round((ROOF_PROTECTION[roof] / 0.25) * 20 * 0.8)}'i telafi edilir`}
                        onClick={() => {
                          if (unlocked) { onSetDesign({ roof }); clearPreview(); }
                          else { togglePreview(patch); }
                        }}
                        budget={gameState.budget}
                        hasPreview
                        previewing={previewInfo?.id === patch.id}
                        onTogglePreview={() => togglePreview(patch)}
                        onHover={() => hoverPreview(patch)}
                        onHoverEnd={hoverEnd}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-1">🏗️ Tribün Mimarisi</h3>
                <p className="text-[10px] text-slate-400 mb-3">Önce <b className="text-amber-300">👁️ Ön İzle</b>, beğenirsen banner’dan uygula/satın al.</p>
                <div className="space-y-2">
                  {(['classic', 'stepped', 'double', 'bowl'] as StandStyle[]).map(stand => {
                    const id = `stands:${stand}`;
                    const unlocked = stand === 'classic' || isUnlocked(stadium, id);
                    const option = COSMETICS.find(c => c.id === id);
                    const patch: PreviewPatch = {
                      id: `preview:${id}`,
                      label: `${STAND_LABEL[stand]} tribün`,
                      design: { stands: stand },
                      applyLabel: unlocked ? '✓ Mimariyi Uygula' : `💰 Satın Al — ${formatMoney(option?.price ?? 0)}`,
                      onApply: unlocked ? () => onSetDesign({ stands: stand }) : () => onBuyCosmetic(id)
                    };
                    return (
                      <OptionCard
                        key={stand}
                        active={displayDesign.stands === stand && !pinned}
                        unlocked={unlocked}
                        price={option?.price ?? 0}
                        icon={stand === 'classic' ? '🪑' : stand === 'stepped' ? '📐' : stand === 'double' ? '🏢' : '🥣'}
                        label={STAND_LABEL[stand]}
                        desc={option?.desc ?? 'Standart tek kat tribün'}
                        onClick={() => {
                          if (unlocked) { onSetDesign({ stands: stand }); clearPreview(); }
                          else { togglePreview(patch); }
                        }}
                        budget={gameState.budget}
                        hasPreview
                        previewing={previewInfo?.id === patch.id}
                        onTogglePreview={() => togglePreview(patch)}
                        onHover={() => hoverPreview(patch)}
                        onHoverEnd={hoverEnd}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3">🌱 Çim Deseni ve Detaylar</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                {(['stripes', 'rings', 'plain'] as PitchPattern[]).map(pattern => {
                  const id = `pitch:${pattern}`;
                  const unlocked = isUnlocked(stadium, id);
                  const option = COSMETICS.find(c => c.id === id);
                  const patch: PreviewPatch = {
                    id: `preview:${id}`,
                    label: `${PITCH_LABEL[pattern]} çim`,
                    design: { pitchPattern: pattern },
                    applyLabel: unlocked ? '✓ Çimi Uygula' : `💰 Satın Al — ${formatMoney(option?.price ?? 0)}`,
                    onApply: unlocked ? () => onSetDesign({ pitchPattern: pattern }) : () => onBuyCosmetic(id)
                  };
                  return (
                    <OptionCard
                      key={pattern}
                      active={displayDesign.pitchPattern === pattern && !pinned}
                      unlocked={unlocked}
                      price={option?.price ?? 0}
                      icon={pattern === 'stripes' ? '🟩' : pattern === 'rings' ? '🎯' : '🟢'}
                      label={`${PITCH_LABEL[pattern]} Çim`}
                      desc={option?.desc}
                      onClick={() => {
                        if (unlocked) { onSetDesign({ pitchPattern: pattern }); clearPreview(); }
                        else { togglePreview(patch); }
                      }}
                      budget={gameState.budget}
                      hasPreview
                      previewing={previewInfo?.id === patch.id}
                      onTogglePreview={() => togglePreview(patch)}
                      onHover={() => hoverPreview(patch)}
                      onHoverEnd={hoverEnd}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                {(['flags', 'logoPitch'] as const).map(key => {
                  const option = COSMETICS.find(c => c.id === key)!;
                  const unlocked = isUnlocked(stadium, key);
                  const realActive = key === 'flags' ? design.flags : design.logoOnPitch;
                  const active = key === 'flags' ? displayDesign.flags : displayDesign.logoOnPitch;
                  const patch: PreviewPatch = {
                    id: `preview:${key}`,
                    label: option.label,
                    design: key === 'flags' ? { flags: !realActive } : { logoOnPitch: !realActive },
                    applyLabel: unlocked ? (realActive ? '✓ Kapat (uygula)' : '✓ Aç (uygula)') : `💰 Satın Al — ${formatMoney(option.price)}`,
                    onApply: unlocked
                      ? () => onSetDesign(key === 'flags' ? { flags: !realActive } : { logoOnPitch: !realActive })
                      : () => onBuyCosmetic(key)
                  };
                  return (
                    <div
                      key={key}
                      onMouseEnter={() => hoverPreview(patch)}
                      onMouseLeave={hoverEnd}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-3 ${
                        previewInfo?.id === patch.id ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : unlocked ? 'bg-slate-700/40 border-slate-600 text-slate-200'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (!unlocked) { togglePreview(patch); return; }
                          onSetDesign(key === 'flags' ? { flags: !active } : { logoOnPitch: !active });
                          clearPreview();
                        }}
                        className="font-bold"
                      >
                        {option.icon} {option.label} {active ? '✓' : unlocked ? '— aç/kapat' : `🔒 ${formatMoney(option.price)}`}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePreview(patch); }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                          previewInfo?.id === patch.id
                            ? 'bg-amber-400 text-black border-amber-300'
                            : 'bg-slate-900/70 text-slate-200 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60 hover:text-amber-200'
                        }`}
                      >
                        {previewInfo?.id === patch.id ? '✕ Ön İzlemeyi Kapat' : '👁️ Ön İzle'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── KAPASİTE ── */}
        {sub === 'capacity' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-emerald-400">🏟️ Mevcut Kapasite {isPreview && displayCapacity !== capacity && <span className="text-amber-300">→ {displayCapacity.toLocaleString()} (ön izleme)</span>}</h3>
                <span className="text-white font-black">{capacity.toLocaleString()} / {MAX_CAPACITY.toLocaleString()}</span>
              </div>
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${(baseCapacity / MAX_CAPACITY) * 100}%` }} title="Temel kapasite" />
                <div className="h-full bg-amber-400" style={{ width: `${((capacity - baseCapacity) / MAX_CAPACITY) * 100}%` }} title="Satın alınan ek koltuklar" />
                {isPreview && displayCapacity > capacity && (
                  <div className="h-full bg-amber-300/70 border-l-2 border-amber-200" style={{ width: `${((displayCapacity - capacity) / MAX_CAPACITY) * 100}%` }} title="👁️ Ön izleme — eklenecek koltuklar" />
                )}
              </div>
              <div className="flex gap-4 text-[11px] mt-2 text-slate-400 flex-wrap">
                <span>🟩 Temel (seviye {gameState.stadiumLvl}): {baseCapacity.toLocaleString()}</span>
                <span>🟨 Ek koltuk: {(capacity - baseCapacity).toLocaleString()}</span>
                {isPreview && displayCapacity !== capacity && <span className="text-amber-300">👁️ Ön izleme: {displayCapacity > capacity ? '+' : ''}{(displayCapacity - capacity).toLocaleString()} koltuk → {displayCapacity.toLocaleString()}</span>}
                <span>Doluluk geçmişi: %{fillRate}</span>
              </div>
            </div>

            {/* Seviye yükseltme — 👁️ Ön İzle ile tribünlerin nasıl büyüdüğünü gör */}
            <div className="bg-gradient-to-r from-blue-900/40 to-slate-800/50 rounded-2xl border border-blue-500/30 p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-blue-300">⬆️ Stadyum Seviyesi Yükselt</h3>
                <p className="text-[11px] text-slate-300">
                  Seviye {gameState.stadiumLvl} → {gameState.stadiumLvl + 1} • +5.000 koltuk kapasiteli yeni tribün katı
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => togglePreview({
                    id: 'preview:level',
                    label: `Seviye ${gameState.stadiumLvl + 1} stadyum (+5.000 koltuk)`,
                    level: gameState.stadiumLvl + 1,
                    applyLabel: `🏗️ Yükselt — ${formatMoney(upgradeLevelCost)}`,
                    onApply: () => onUpgradeStadiumLevel(upgradeLevelCost)
                  })}
                  disabled={capacity >= MAX_CAPACITY}
                  className={`px-4 py-3 rounded-xl font-black text-xs border transition-all ${
                    previewInfo?.id === 'preview:level'
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {previewInfo?.id === 'preview:level' ? '✕ Ön İzlemeyi Kapat' : '👁️ Ön İzle'}
                </button>
                <button
                  disabled={gameState.budget < upgradeLevelCost || capacity >= MAX_CAPACITY}
                  onClick={() => { onUpgradeStadiumLevel(upgradeLevelCost); clearPreview(); }}
                  onMouseEnter={() => hoverPreview({ id: 'preview:level', label: `Seviye ${gameState.stadiumLvl + 1} stadyum`, level: gameState.stadiumLvl + 1 })}
                  onMouseLeave={hoverEnd}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                    gameState.budget >= upgradeLevelCost && capacity < MAX_CAPACITY
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  🏗️ Yükselt — {formatMoney(upgradeLevelCost)}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CAPACITY_PACKAGES.map(pack => {
                const remaining = MAX_CAPACITY - capacity;
                const canBuy = gameState.budget >= pack.price && remaining > 0;
                const added = Math.min(pack.seats, remaining);
                const patch: PreviewPatch = {
                  id: `preview:${pack.id}`,
                  label: `${pack.label} → kapasite ${(capacity + added).toLocaleString()}`,
                  bonus: stadium.capacityBonus + added,
                  applyLabel: canBuy ? `🏗️ Satın Al — ${formatMoney(pack.price)}` : undefined,
                  onApply: canBuy ? () => onBuyCapacity(pack.id) : undefined
                };
                const previewing = previewInfo?.id === patch.id;
                return (
                  <div
                    key={pack.id}
                    onMouseEnter={() => hoverPreview(patch)}
                    onMouseLeave={hoverEnd}
                    className={`rounded-2xl border p-4 transition-all ${previewing ? 'border-amber-400 bg-amber-500/10' : 'bg-slate-800/50 border-slate-700/50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold">🏗️ {pack.label}</span>
                      <span className="text-amber-400 font-black">{formatMoney(pack.price)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      {added.toLocaleString()} koltuk eklenir → yeni kapasite {(capacity + added).toLocaleString()}
                      {previewing && <span className="text-amber-300"> • 3D ön izlemede {displayCapacity.toLocaleString()}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={!canBuy}
                        onClick={() => { onBuyCapacity(pack.id); clearPreview(); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          canBuy ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {remaining <= 0 ? 'Maksimum kapasite' : canBuy ? 'Koltukları ekle' : 'Bütçe yetersiz'}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePreview(patch)}
                        disabled={remaining <= 0}
                        className={`shrink-0 px-3 py-2 rounded-xl text-[11px] font-black border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          previewing
                            ? 'bg-amber-400 text-black border-amber-300'
                            : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60'
                        }`}
                      >
                        {previewing ? '✕ Kapat' : '👁️ Ön İzle'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-2">📊 Dolu Stadyum Ne Kazandırır?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                {[
                  { l: 'Kapasite', v: displayCapacity.toLocaleString(), c: isPreview ? 'text-amber-300' : 'text-white' },
                  { l: 'Beklenen seyirci', v: preview.attendance.toLocaleString(), c: 'text-cyan-300' },
                  { l: 'Bilet fiyatı', v: `$${preview.price}`, c: 'text-amber-300' },
                  { l: 'Bilet + büfe geliri', v: formatMoney(preview.total), c: 'text-emerald-300' },
                ].map(item => (
                  <div key={item.l} className="bg-slate-700/50 backdrop-blur rounded-xl p-3.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all">
                    <div className="text-[10px] text-slate-400">{item.l}</div>
                    <div className={`font-black text-lg ${item.c}`}>{item.v}</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                VIP loca (+%12 bilet, +$4/seyirci harcama), cam çatı (+%4) ve kase tribün (+%3) geliri artırır; çatı kötü havada seyirci kaybını azaltır.
                {isPreview && <span className="text-amber-300"> • Ön izleme gelir tahmini üstte.</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── TRİBÜNLER & ETKİNLİK — İmparatorluk */}
        {sub === 'tribunes' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 mb-1">🏟️ Tribünler — Seviye 1-5 (ortalama görsel, hafif etki)</h3>
              <p className="text-[11px] text-slate-400 mb-3">Her seviye tribün +koltuk ve +doluluk getirir. Kuzey/Güney kale arkası, Doğu/Batı maraton — her biri ayrı büyür.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TRIBUNES.map(tri=>{
                  const lvl = (gameState.stadium as any)?.tribunes?.[tri.id] ?? 1;
                  const isMax = lvl >= 5;
                  const basePrice: Record<string, number> = { north: 650000, south: 650000, east: 850000, west: 900000 };
                  const cost = Math.round((basePrice[tri.id]||650000) * (0.9 + lvl*0.35));
                  const seats = tri.baseSeats;
                  const triPatch: PreviewPatch = {
                    id: `preview:tribune:${tri.id}`,
                    label: `${tri.name} → Seviye ${lvl + 1} (+${seats.toLocaleString()} koltuk)`,
                    tribunes: { ...(stadium.tribunes ?? { north: 1, south: 1, east: 1, west: 1 }), [tri.id]: Math.min(5, lvl + 1) },
                    applyLabel: gameState.budget >= cost ? `⬆️ Yükselt — ${formatMoney(cost)}` : undefined,
                    onApply: gameState.budget >= cost ? () => onUpgradeTribune?.(tri.id) : undefined
                  };
                  const triPreviewing = previewInfo?.id === triPatch.id;
                  return (
                    <div
                      key={tri.id}
                      onMouseEnter={() => !isMax && hoverPreview(triPatch)}
                      onMouseLeave={hoverEnd}
                      className={`bg-slate-700/40 rounded-xl p-3 border transition-all ${triPreviewing ? 'border-amber-400 bg-amber-500/10' : 'border-slate-600/30'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tri.icon}</span>
                          <div>
                            <div className="text-white font-bold text-sm">{tri.name}</div>
                            <div className="text-[11px] text-slate-400">{tri.desc}</div>
                          </div>
                        </div>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded-full text-white font-black">Seviye {lvl}/5</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30 mb-2">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" style={{width: `${(lvl/5)*100}%`}} />
                      </div>
                      <div className="text-[11px] text-slate-300 mb-2">+{seats.toLocaleString()} koltuk / seviye • Toplam: {(stadiumCapacity(gameState)- (gameState.stadiumLvl*5000+2000) - (gameState.stadium?.capacityBonus||0)).toLocaleString()} tribün koltuğu</div>
                      <div className="flex items-center gap-2">
                        <button disabled={isMax || gameState.budget < cost} onClick={()=> { onUpgradeTribune?.(tri.id as any); clearPreview(); }} className={`flex-1 py-2 rounded-lg text-xs font-bold ${isMax?'bg-slate-700 text-slate-400 cursor-not-allowed': gameState.budget>=cost?'bg-emerald-600 hover:bg-emerald-500 text-white':'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                          {isMax ? 'Maks seviye (5/5)' : `Yükselt Seviye ${lvl+1} — ${cost.toLocaleString()} $`}
                        </button>
                        {!isMax && (
                          <button
                            type="button"
                            onClick={() => togglePreview(triPatch)}
                            className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-black border transition-all ${
                              triPreviewing
                                ? 'bg-amber-400 text-black border-amber-300'
                                : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60'
                            }`}
                            title="Tribünün büyümüş halini 3D sahnede gör"
                          >
                            {triPreviewing ? '✕ Kapat' : '👁️ Ön İzle'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-3">Kapasite formülü: temel (lvl*5000+2000) + ek paketler + tribünler. Tribünler mild etki: her seviye +~%3 seyirci çekimi.</div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 mb-3">🎤 Stadyum Etkinlikleri — Hafta içi gelir (mild)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STADIUM_EVENTS.map(ev=>(
                  <button key={ev.id} onClick={()=> onHostEvent?.(ev.id as any)} disabled={gameState.budget < 0} className="bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/30 rounded-xl p-3 text-left transition-colors">
                    <div className="text-white font-bold text-sm">{ev.icon} {ev.label} — +${(ev.income as number).toLocaleString()}</div>
                    <div className="text-[11px] text-slate-400">{ev.desc}</div>
                    <div className="text-[10px] text-emerald-300 mt-1">Hemen + gelir, konser biraz moral -3 (çim yorgun)</div>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Mild mod: sadece küçük bonus, çılgın protesto yok. Etkinlik her hafta yapılabilir.</div>
            </div>
          </div>
        )}


        {/* ── İÇ TESİSLER — Büfe, Mağaza, Otopark vb (3D sahnede görünür + 👁️ ön izleme) ── */}
        {sub === 'facilities' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-900/30 to-slate-800/60 backdrop-blur-xl rounded-2xl border border-amber-500/20 p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-[260px] flex-1">
                  <h3 className="text-sm font-black text-amber-300 mb-1">🍔 Stadyum İç Tesisler — 3D'de Görünür &amp; Kazançlı</h3>
                  <p className="text-[11px] text-slate-300 mb-2">
                    Her tesis seviye 0-5 arası gelişir ve <b className="text-amber-200">yukarıdaki 3D sahnede görünür</b>:
                    büfe kulübeleri + masa/şemsiyeler, taraftar mağazası, restoran, otopark, müze…
                    Yükseltmeler <b>her iç saha maçında taraftar başına gelir</b> + taraftar mutluluğu + yönetim güveni getirir.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="bg-black/40 rounded-lg px-2 py-1 text-slate-200">
                      Kurulu tesis seviyesi: <b className="text-white">{totalFacilityLevels}</b>/{STADIUM_FACILITY_DEFS.length * 5}
                    </span>
                    <span className="bg-black/40 rounded-lg px-2 py-1 text-slate-200">
                      Taraftar başına harcama: <b className="text-emerald-300">{formatMoney(Math.round(spendPerFan * 10) / 10)}</b>
                    </span>
                    <span className="bg-black/40 rounded-lg px-2 py-1 text-slate-200">
                      Beklenen maç geliri (büfe &amp; ürün): <b className="text-emerald-300">{formatMoney(preview.catering)}</b>
                    </span>
                  </div>
                </div>
                <button
                  onClick={focusScene}
                  className="shrink-0 bg-slate-900/70 hover:bg-slate-800 text-amber-200 border border-amber-500/40 px-3 py-2 rounded-xl text-[11px] font-black"
                >
                  🎥 3D sahneye git
                </button>
              </div>

              {previewInfo?.facility && (
                <div className="mt-3 bg-amber-500/15 border border-amber-400/40 rounded-xl px-3 py-2 text-[11px] text-amber-100">
                  👁️ 3D'de <b>{STADIUM_FACILITY_MAP[previewInfo.facility]?.icon} {STADIUM_FACILITY_MAP[previewInfo.facility]?.name}</b> seviye{' '}
                  {displayFacilities[previewInfo.facility]}/5 olarak gösteriliyor (sarı halka ile işaretli) — henüz satın alınmadı.
                  Beğendiysen sarı banner'dan <b>yükselt</b>, istemezsen <b>✕ Kapat</b>.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {STADIUM_FACILITY_DEFS.map(def => {
                  const realLvl = realFacilities[def.id] ?? 0;
                  const isBuffet = def.id === 'buffet';
                  const openBuffetStudio = () => {
                    setBuffetOpen(true);
                    setSub('facilities');
                    // panel aşağıda; bir sonraki karede oraya kaydır
                    window.setTimeout(() => document.getElementById('bufe-studyosu')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
                  };
                  const lvl = displayFacilities[def.id] ?? 0;   // ön izleme dahil görünüm
                  const isMax = realLvl >= 5;
                  const cost = facilityUpgradeCost(def.id, realLvl);
                  const canAfford = gameState.budget >= cost;
                  const previewing = previewInfo?.id === `preview:facility:${def.id}`;
                  const patch = facilityPreviewPatch(def.id);
                  const incomePerFan = def.incomePerFan * lvl;
                  // Gelir tahmini gerçek seyirci beklentisiyle (15k sabit değil)
                  const totalIncomeEst = Math.round(incomePerFan * Math.max(500, preview.attendance));
                  return (
                    <div
                      key={def.id}
                      className={`rounded-xl p-3 border-2 transition-all ${
                        previewing ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
                        : isMax ? 'bg-emerald-500/10 border-emerald-500/30'
                        : lvl > 0 ? 'bg-slate-700/50 border-slate-600/40'
                        : 'bg-slate-800/40 border-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-black text-sm">
                          {def.icon} {def.name}
                          {isBuffet && activeBrand && (
                            <span className="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full border"
                              style={{ background: `${activeBrand.color}22`, borderColor: activeBrand.color, color: activeBrand.ink ?? '#fff' }}>
                              {activeBrand.icon} {activeBrand.name}
                            </span>
                          )}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          lvl === 0 ? 'bg-slate-700 text-slate-400' : isMax ? 'bg-emerald-500 text-white' : 'bg-amber-500/20 text-amber-200'
                        }`}>
                          Sv. {lvl}/5{previewing && <span className="ml-1 text-amber-100">(ön izleme)</span>}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mb-2 min-h-[28px]">{def.desc}</div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${(lvl / 5) * 100}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] mb-2">
                        <div className="bg-black/30 rounded px-1.5 py-1">
                          <span className="text-slate-400">Gelir/taraftar</span><br />
                          <span className="text-emerald-300 font-bold">${def.incomePerFan} × {lvl} = ${incomePerFan.toFixed(1)}</span>
                        </div>
                        <div className="bg-black/30 rounded px-1.5 py-1">
                          <span className="text-slate-400">Mutluluk</span><br />
                          <span className="text-cyan-300 font-bold">+{def.happiness * lvl}</span>
                          {def.boardBonus ? <span className="text-amber-300"> • Board +{def.boardBonus * lvl}</span> : null}
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-500 mb-2">
                        Beklenen seyirciyle (~{Math.max(500, preview.attendance).toLocaleString()}) ≈ <b className="text-emerald-300/80">{formatMoney(totalIncomeEst)}</b> maç geliri
                        {previewing && <span className="text-amber-300"> • 3D'de seviye {lvl} gösteriliyor</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={isMax || !canAfford}
                          onClick={() => { buyFacility(def.id); clearPreview(); }}
                          className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                            isMax ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : canAfford ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isMax ? 'Maks Seviye ✓' : `⬆️ Seviye ${realLvl + 1} — ${formatMoney(cost)}`}
                        </button>
                        <button
                          type="button"
                          disabled={isMax}
                          onClick={() => togglePreview(patch)}
                          title="Satın almadan 3D sahnede gör — yeni yapı sarı halka ile işaretlenir"
                          className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-black border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            previewing
                              ? 'bg-amber-400 text-black border-amber-300'
                              : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60'
                          }`}
                        >
                          {previewing ? '✕ Kapat' : '👁️ Ön İzle'}
                        </button>
                      </div>
                      {!canAfford && !isMax && (
                        <div className="text-[9px] text-red-300 mt-1">Eksik: {formatMoney(cost - gameState.budget)}</div>
                      )}
                      {isBuffet && (
                        <button
                          onClick={openBuffetStudio}
                          className="w-full mt-2 py-2 rounded-lg text-[11px] font-black bg-fuchsia-600/80 hover:bg-fuchsia-500 text-white border border-fuchsia-400/60"
                        >
                          🍔 Büfe Stüdyosu — marka, menü, fiyat
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* ══════════ 🍔 BÜFE STÜDYOSU — marka sponsorluğu + menü + fiyat ══════════ */}
              <div className="mt-4">
                <button
                  onClick={() => setBuffetOpen(v => !v)}
                  className="w-full flex items-center justify-between bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 rounded-xl px-4 py-3 transition-all"
                >
                  <span className="text-sm font-black text-fuchsia-200 flex items-center gap-2">
                    🍔 BÜFE STÜDYOSU
                    <span className="text-[10px] font-bold text-slate-300">
                      marka sponsorluğu • menü • fiyat politikası
                      {activeBrand ? ` • şu an ${activeBrand.icon} ${activeBrand.name}` : ''}
                    </span>
                  </span>
                  <span className="text-xs font-black text-fuchsia-200">{buffetOpen ? '▲ Kapat' : '▼ Aç'}</span>
                </button>
                {buffetOpen && (
                  <div className="mt-3">
                    <BuffetSection
                      gameState={gameState}
                      buffet={buffetState}
                      facilities={realFacilities}
                      attendance={Math.max(500, preview.attendance)}
                      onUpgradeBuffet={() => buyFacility('buffet')}
                      onSignSponsor={(id) => { onSignBuffetSponsor?.(id); setPreviewBrandId(null); }}
                      onCancelSponsor={onCancelBuffetSponsor ?? (() => {})}
                      onBuyMenuItem={(id) => onBuyBuffetMenuItem?.(id)}
                      onSetPriceLevel={(lvl) => onSetBuffetPriceLevel?.(lvl)}
                      onPreviewBrand={(id) => { setPreviewBrandId(id); focusScene(); }}
                      previewBrandId={previewBrandId}
                      onPreviewLevel={() => togglePreview(facilityPreviewPatch('buffet'))}
                      previewingLevel={previewInfo?.id === 'preview:facility:buffet'}
                      onFocus3D={focusScene}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 bg-black/30 rounded-xl p-3 border border-slate-700/40">
                <div className="text-[11px] font-bold text-white mb-1">💡 Tesis Stratejisi</div>
                <div className="text-[10px] text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-1">
                  <span>🍔 Büfe + 🍺 Bar = genç taraftar mutluluğu yüksek, maç günü geliri patlar</span>
                  <span>👕 Fan Shop yıldızlarla sinerji: dünya yıldızı varsa forma satış bonusu</span>
                  <span>🅿️ Otopark kötü havada doluluk kaybını %40 azaltır</span>
                  <span>🚻 Tuvalet + 🛡️ Güvenlik = temel memnuniyet, yoksa taraftar kaçar</span>
                  <span>📺 LED Ekran + 🔊 Ses = sponsor geliri + atmosfer</span>
                  <span>🏛️ Müze + 🎈 Çocuk Alanı = marka değeri + aile tribünü dolar</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ── BİLET FİYATI ── */}
        {sub === 'tickets' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 mb-1">🎟️ Bilet Fiyat Stratejisi</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Fiyatı artırmak birim geliri yükseltir ama tribünü boşaltır. Bilet geliri kadar <b>tribünde harcama (büfe, ürün)</b> da
                seyirci sayısına bağlıdır — bu yüzden en kârlı fiyat genelde ortadadır.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TICKET_STRATEGIES.map(strategy => {
                  const sim = previewHomeMatch({ ...gameState, stadium: { ...stadium, ticketMultiplier: strategy.multiplier } }, 3, 'sunny');
                  const active = stadium.ticketMultiplier === strategy.multiplier;
                  return (
                    <button
                      key={strategy.multiplier}
                      onClick={() => onSetTicketMultiplier(strategy.multiplier)}
                      className={`text-left rounded-xl p-3 border-2 transition-all ${
                        active ? 'bg-amber-500/15 border-amber-500' : 'bg-slate-700/40 border-slate-700/60 hover:border-amber-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{strategy.icon} {strategy.label}</span>
                        <span className="text-amber-400 font-black">${sim.price}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mb-2">{strategy.desc}</div>
                      {sim.total === bestTotal && (
                        <div className="text-[10px] text-emerald-300 font-bold mb-1">⭐ Bu fiyatla en yüksek gelir!</div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                        <div className="bg-slate-800/60 rounded-lg p-1.5">
                          <div className="text-slate-400">Seyirci</div>
                          <div className="text-cyan-300 font-bold">{sim.attendance.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-1.5">
                          <div className="text-slate-400">Bilet</div>
                          <div className="text-emerald-300 font-bold">{formatMoney(sim.gate)}</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-1.5">
                          <div className="text-slate-400">Büfe & ürün</div>
                          <div className="text-amber-300 font-bold">{formatMoney(sim.catering)}</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-1.5 col-span-2 border border-emerald-500/30">
                          <div className="text-slate-400">Toplam maç geliri</div>
                          <div className="text-white font-black">{formatMoney(sim.total)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-[12px] text-amber-100">
              💡 <b>İpucu:</b> Taraftar mutluluğun yüksekse pahalı bilet daha az kayıp verir. Kötü havada çatın yoksa ucuz bilet uygulamak tribünü doldurur.
            </div>
          </div>
        )}

        <style>{`@keyframes rainFall { 0%{transform:translateY(-14px) rotate(14deg)} 100%{transform:translateY(420px) rotate(14deg)} } @keyframes boardPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.55;transform:scale(0.85)}}`}</style>

        {/* ── KOZMETİK MAĞAZASI ── */}
        {sub === 'shop' && (
          <div className="space-y-3">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 mb-1">🛍️ Stadyum Kozmetikleri</h3>
              <div className="text-[11px] text-slate-400 mb-3">
                Kozmetikler stadyumun görünümünü değiştirir; bazıları taraftar morali ve bilet geliri de kazandırır.
                Her kartta <b className="text-amber-300">👁️ Ön İzle</b> tuşu var: basınca 3D sahnede görünür, satın alınmaz — beğenirsen sarı banner’dan satın alırsın.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COSMETICS.filter(c => c.price > 0).map(option => {
                  const owned = isUnlocked(stadium, option.id);
                  const affordable = gameState.budget >= option.price;
                  // 👁️ Ön İzle tuşu için: bu kozmetiğin 3D karşılığı
                  const designPatch = ((): Partial<StadiumDesign> | null => {
                    if (option.field === 'roof') return { roof: option.value as RoofStyle };
                    if (option.field === 'stands') return { stands: option.value as StandStyle };
                    if (option.field === 'pitchPattern') return { pitchPattern: option.value as PitchPattern };
                    if (option.field === 'flags') return { flags: true };
                    if (option.field === 'logoOnPitch') return { logoOnPitch: true };
                    if (option.field === 'floodlights') return { floodlights: true };
                    return null;
                  })();
                  const patch: PreviewPatch = {
                    id: `preview:cosmetic:${option.id}`,
                    label: `${option.icon} ${option.label}`,
                    design: designPatch ?? undefined,
                    vip: option.id === 'vip' ? true : undefined,
                    applyLabel: affordable ? `💰 Satın Al — ${formatMoney(option.price)}` : undefined,
                    onApply: affordable ? () => onBuyCosmetic(option.id) : undefined
                  };
                  const previewing = previewInfo?.id === patch.id;
                  return (
                    <div
                      key={option.id}
                      onMouseEnter={() => !owned && hoverPreview(patch)}
                      onMouseLeave={hoverEnd}
                      className={`rounded-xl p-3 border transition-all ${
                        previewing ? 'bg-amber-500/10 border-amber-400'
                        : owned ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-slate-700/40 border-slate-700/60 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-bold text-sm">{option.icon} {option.label}</span>
                        <span className={`font-black text-sm ${owned ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {owned ? 'SAHİPSİN ✓' : formatMoney(option.price)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 my-1">{option.desc}</div>
                      {!owned && (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={!affordable}
                            onClick={() => { onBuyCosmetic(option.id); clearPreview(); }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                              affordable ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {affordable ? 'Satın Al — kalıcı uygula' : `Eksik: ${formatMoney(option.price - gameState.budget)}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePreview(patch)}
                            className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-black border transition-all ${
                              previewing
                                ? 'bg-amber-400 text-black border-amber-300'
                                : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60'
                            }`}
                            title="Satın almadan 3D stadyumda gör"
                          >
                            {previewing ? '✕ Kapat' : '👁️ Ön İzle'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-1">🎨 Özel Koltuk Renkleri</h3>
              <p className="text-[10px] text-slate-400 mb-3">👁️ <b className="text-amber-300">Ön İzle</b> tuşuna bas → renk 3D stadyumda görünür, satın alınmaz.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PREMIUM_COLORS.map(c => {
                  const owned = isUnlocked(stadium, c.id);
                  const patch: PreviewPatch = {
                    id: `seat:${c.hex}`,
                    label: `${c.label} • ${c.hex}`,
                    design: { seatColor: c.hex },
                    applyLabel: owned ? '✓ Rengi Uygula' : gameState.budget >= c.price ? `💰 Kilidi Aç — ${formatMoney(c.price)}` : undefined,
                    onApply: owned ? () => onSetDesign({ seatColor: c.hex }) : gameState.budget >= c.price ? () => onBuyCosmetic(c.id) : undefined
                  };
                  const previewing = previewInfo?.id === patch.id;
                  return (
                    <div
                      key={c.id}
                      onMouseEnter={() => hoverPreview(patch)}
                      onMouseLeave={hoverEnd}
                      className={`rounded-xl p-3 text-center border transition-all ${previewing ? 'bg-amber-500/10 border-amber-400' : 'bg-slate-700/40 border-transparent'}`}
                    >
                      <div className="w-10 h-10 rounded-lg mx-auto mb-2 border-2 border-slate-600" style={{ background: c.hex }} />
                      <div className="text-white text-xs font-bold">{c.label}</div>
                      <div className={`text-[10px] mb-2 ${owned ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {owned ? 'Açık ✓' : formatMoney(c.price)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={!owned && gameState.budget < c.price}
                          onClick={() => {
                            if (owned) { onSetDesign({ seatColor: c.hex }); clearPreview(); }
                            else { onBuyCosmetic(c.id); clearPreview(); }
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${
                            owned ? 'bg-slate-600 hover:bg-slate-500 text-white'
                            : gameState.budget >= c.price ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {owned ? 'Uygula' : 'Kilidi Aç'}
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePreview(patch)}
                          title="3D stadyumda ön izle"
                          className={`shrink-0 px-2 py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                            previewing
                              ? 'bg-amber-400 text-black border-amber-300'
                              : 'bg-slate-900/70 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-amber-400/60'
                          }`}
                        >
                          {previewing ? '✕' : '👁️'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 3D ANTRENMAN KOMPLEKSİ (eski Tesisler sekmesinin yeni yeri) ── */}
        {sub === 'complex' && (
          onUpgradeFacilityModule
            ? <TrainingComplexSection gameState={gameState} onUpgradeFacilityModule={onUpgradeFacilityModule} />
            : <div className="text-slate-400 text-sm">Antrenman kompleksi yüklenemedi.</div>
        )}

        {/* ── PERSONEL (eski Tesisler sekmesi) ── */}
        {sub === 'staff' && (
          onHireStaff
            ? <StaffSection gameState={gameState} onHireStaff={onHireStaff} />
            : <div className="text-slate-400 text-sm">Personel bölümü yüklenemedi.</div>
        )}

        {/* ── AKADEMİ & SCOUT (eski Tesisler sekmesi) ── */}
        {sub === 'youth' && (
          <YouthScoutSection
            gameState={gameState}
            onDiscoverYouth={onDiscoverYouth ?? (() => {})}
            onPromoteYouth={onPromoteYouth ?? (() => {})}
            onSendScout={onSendScout}
            onClaimScoutReport={onClaimScoutReport}
            onDismissScoutReport={onDismissScoutReport}
            onCancelScoutMission={onCancelScoutMission}
          />
        )}

        {/* ── SABİT ÖN İZLEME ÇUBUĞU ── aşağıda gezinirken de 3D'ye dön / uygula / kapat */}
        {isPreview && (
          <div className="sticky bottom-0 z-30 mt-4 pb-1">
            <div className="bg-amber-500/95 backdrop-blur text-black rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap shadow-[0_-6px_24px_rgba(0,0,0,0.4)] border border-amber-300">
              <span className="text-[11px] font-black flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                👁️ ÖN İZLEME{previewInfo ? `: ${previewInfo.label}` : ''}
              </span>
              <span className="text-[10px] font-bold text-black/70">— henüz satın alınmadı</span>
              <span className="flex-1" />
              {previewInfo?.onApply && (
                <button
                  onClick={() => { const fn = previewInfo.onApply; clearPreview(); fn?.(); }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-full text-[11px] font-black"
                >
                  {previewInfo.applyLabel ?? '✓ Uygula'}
                </button>
              )}
              <button
                onClick={focusScene}
                className="bg-black/80 hover:bg-black text-white px-3 py-1 rounded-full text-[11px] font-bold"
              >
                🎥 3D'yi göster
              </button>
              <button onClick={clearPreview} className="bg-black hover:bg-slate-800 text-white px-3 py-1 rounded-full text-[11px] font-black">
                ✕ Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
