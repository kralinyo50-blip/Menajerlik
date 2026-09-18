import { FacilityModuleId, FacilityState } from '../types/game';

/* ══════════════════════════════════════════════════════════════
   3D ANTRENMAN KOMPLEKSİ — tesis modülleri
   Her modül 1-5 seviye. Oyuncuların gelişimini, moralini,
   enerjisini, sakatlık riskini ve takım kimyasını etkiler.
   ══════════════════════════════════════════════════════════════ */

export const FACILITY_MAX_LEVEL = 5;

export interface FacilityModuleDef {
  id: FacilityModuleId;
  name: string;
  short: string;
  icon: string;
  /** Kart / başlık gradyanı */
  color: string;
  desc: string;
  /** Bu modül oyuncuları nasıl etkiler (kısa cümle) */
  impact: string;
  /** Seviye → kullanıcıya görünen etki metni */
  effect: (level: number) => string;
  /** Seviye → detaylı istatistik kartları */
  stats: (level: number) => { label: string; value: string }[];
  /** 1. seviyeden sonraki yükseltme maliyeti (seviyeden seviyeye) */
  baseCost: number;
  /** 3D sahnede bu modülün nerede olduğu (ön izleme ipucu) */
  sceneHint: string;
}

/** Yükseltme maliyeti: her seviyede %65 pahalanır */
export function facilityUpgradeCost(id: FacilityModuleId, currentLevel: number): number {
  const def = FACILITY_MODULES.find(m => m.id === id);
  const base = def?.baseCost ?? 600000;
  const lvl = Math.max(1, Math.min(FACILITY_MAX_LEVEL, Math.round(currentLevel || 1)));
  return Math.round((base * Math.pow(1.65, lvl - 1)) / 1000) * 1000;
}

export const FACILITY_MODULES: FacilityModuleDef[] = [
  {
    id: 'pitch',
    name: 'Antrenman Sahası',
    short: 'Saha',
    icon: '🌱',
    color: 'from-emerald-500 to-teal-600',
    desc: 'Çim kalitesi, kaleler, sulama ve antrenman ekipmanları',
    impact: 'Oyuncuların OVR gelişim hızını artırır',
    sceneHint: 'Merkezdeki büyük saha',
    baseCost: 600000,
    effect: lv => `Haftalık gelişim şansı +%${lv * 3}`,
    stats: lv => [
      { label: 'Gelişim şansı', value: `+%${lv * 3}` },
      { label: 'Antrenman verimi', value: `%${100 + lv * 6}` },
      { label: 'Saha kalitesi', value: `${'★'.repeat(lv)}${'☆'.repeat(FACILITY_MAX_LEVEL - lv)}` },
    ],
  },
  {
    id: 'gym',
    name: 'Fitness & Kondisyon Salonu',
    short: 'Fitness',
    icon: '🏋️',
    color: 'from-sky-500 to-blue-600',
    desc: 'Ağırlık, fonksiyonel alan ve soyunma odaları',
    impact: 'Enerji yenilenmesini ve takım moralini yükseltir',
    sceneHint: 'Soldaki cam cepheli bina',
    baseCost: 400000,
    effect: lv => `Haftalık enerji +${lv * 2} • moral +${lv >= 4 ? 2 : 1}`,
    stats: lv => [
      { label: 'Enerji / hafta', value: `+${lv * 2}` },
      { label: 'Moral / hafta', value: `+${lv >= 4 ? 2 : 1}` },
      { label: 'Kat sayısı', value: `${lv}` },
    ],
  },
  {
    id: 'recovery',
    name: 'Rejenerasyon Merkezi',
    short: 'Rejenerasyon',
    icon: '🧊',
    color: 'from-cyan-500 to-indigo-600',
    desc: 'Havuz, buz banyosu, sauna ve masaj odaları',
    impact: 'Sakatlık riskini düşürür, iyileşmeyi hızlandırır',
    sceneHint: 'Ortadaki kubbeli bina + havuz',
    baseCost: 520000,
    effect: lv => `Sakatlık riski -%${lv * 5} • iyileşme +%${lv * 10}`,
    stats: lv => [
      { label: 'Sakatlık riski', value: `-%${lv * 5}` },
      { label: 'İyileşme hızı', value: `+%${Math.min(60, lv * 10)}` },
      { label: 'Havuz / buz', value: lv >= 2 ? 'Açık ✓' : 'Yok' },
    ],
  },
  {
    id: 'tactics',
    name: 'Taktik & Analiz Merkezi',
    short: 'Analiz',
    icon: '📊',
    color: 'from-violet-500 to-fuchsia-600',
    desc: 'Video analiz odası, dev ekran ve maç hazırlık birimi',
    impact: 'Takım kimyasını ve maç gücünü artırır',
    sceneHint: 'Sağdaki dev ekranlı bina',
    baseCost: 460000,
    effect: lv => `Kimya +${(lv * 0.6).toFixed(1)}/hafta • maç gücü +${(lv * 0.8).toFixed(1)}`,
    stats: lv => [
      { label: 'Takım kimyası', value: `+${(lv * 0.6).toFixed(1)} / hafta` },
      { label: 'Maç bonusu', value: `+${(lv * 0.8).toFixed(1)} güç` },
      { label: 'Analiz odası', value: `${lv} ekran` },
    ],
  },
  {
    id: 'youth',
    name: 'Altyapı Sahası & Gençlik Merkezi',
    short: 'Altyapı',
    icon: '🎓',
    color: 'from-amber-500 to-orange-600',
    desc: 'Mini sahalar, yetenek tarama birimi ve genç soyunma odası',
    impact: 'Genç oyuncuların gelişimini hızlandırır',
    sceneHint: 'Soldaki mini sahalar',
    baseCost: 650000,
    effect: lv => `Genç gelişimi +%${lv * 4} • akademi kalitesi +${lv * 2}`,
    stats: lv => [
      { label: 'Genç gelişimi', value: `+%${lv * 4}` },
      { label: 'Akademi kalitesi', value: `+${lv * 2}` },
      { label: 'Mini saha', value: `${Math.min(3, lv)} adet` },
    ],
  },
];

export const FACILITY_MODULE_MAP: Record<FacilityModuleId, FacilityModuleDef> = FACILITY_MODULES.reduce(
  (acc, m) => ({ ...acc, [m.id]: m }),
  {} as Record<FacilityModuleId, FacilityModuleDef>
);

export function defaultFacility(): FacilityState {
  return { pitch: 1, gym: 1, recovery: 1, tactics: 1, youth: 1, lastReport: null };
}

/** Kayıt dosyaları / eski state için güvenli seviye okuma */
export function facilityLevel(state: { facility?: FacilityState } | null | undefined, id: FacilityModuleId): number {
  const raw = state?.facility?.[id];
  return Math.max(1, Math.min(FACILITY_MAX_LEVEL, Math.round(typeof raw === 'number' ? raw : 1)));
}

export function normalizeFacility(f?: Partial<FacilityState> | null): FacilityState {
  const base = defaultFacility();
  if (!f) return base;
  const pick = (id: FacilityModuleId) => Math.max(1, Math.min(FACILITY_MAX_LEVEL, Math.round(((f as any)[id] as number) || 1)));
  return {
    pitch: pick('pitch'),
    gym: pick('gym'),
    recovery: pick('recovery'),
    tactics: pick('tactics'),
    youth: pick('youth'),
    lastReport: f.lastReport ?? null,
  };
}

export function facilityTotalLevel(f?: Partial<FacilityState> | null): number {
  const n = normalizeFacility(f);
  return n.pitch + n.gym + n.recovery + n.tactics + n.youth;
}

/* ══════════════ OYUNA ETKİLER ══════════════ */
export interface FacilityEffects {
  /** Haftalık OVR gelişim şansına eklenen bonus (0.03 → 0.15) */
  growthChance: number;
  /** Antrenman verimi çarpanı (1.06 → 1.30) */
  trainingMult: number;
  /** Haftalık enerji yenilenmesi */
  energyRegen: number;
  /** Haftalık moral yenilenmesi */
  moraleRegen: number;
  /** Maç içi sakatlık riski çarpanı (0.75 → 0.95 azaltma) */
  injuryRiskMult: number;
  /** İyileşme şansı bonusu (0-1) */
  healChanceBonus: number;
  /** Haftalık takım kimyası artışı */
  chemistryRegen: number;
  /** Maç gücü bonusu (attack/defense) */
  matchBonus: number;
  /** Akademi (genç) gelişim şansı bonusu */
  youthGrowth: number;
  /** Akademi keşif kalitesi bonusu */
  academyQuality: number;
}

export function facilityEffects(f?: Partial<FacilityState> | null): FacilityEffects {
  const n = normalizeFacility(f);
  return {
    growthChance: n.pitch * 0.03,
    trainingMult: 1 + n.pitch * 0.06,
    energyRegen: n.gym * 2,
    moraleRegen: n.gym >= 4 ? 2 : 1,
    injuryRiskMult: Math.max(0.45, 1 - n.recovery * 0.05),
    healChanceBonus: Math.min(0.6, n.recovery * 0.1),
    chemistryRegen: n.tactics * 0.6,
    matchBonus: n.tactics * 0.8,
    youthGrowth: n.youth * 0.04,
    academyQuality: n.youth * 2,
  };
}

/**
 * Bir oyuncunun haftalık gelişim şansı (%) — antrenman odağı + tesis + yaş.
 * Haftalık simülasyondaki formülle birebir aynı; UI bu değeri gösterir.
 */
export function weeklyGrowthChance(
  p: { age: number; ovr: number; potential: number; role: string; injured?: boolean },
  focus: string,
  trainingLvl: number,
  f?: Partial<FacilityState> | null
): number {
  if (p.injured || p.ovr >= p.potential) return 0;
  if (!focusCoversPlayer(focus, p.role, p.age)) return 0;
  const youngFactor = p.age <= 23 ? 1 : p.age <= 28 ? 0.5 : 0.25;
  const eff = facilityEffects(f);
  const chance = (0.18 + trainingLvl * 0.05 + eff.growthChance) * youngFactor * (focus === 'balanced' ? 0.8 : 1.15);
  return Math.max(0, Math.min(95, Math.round(chance * 100)));
}

/** Antrenman odağı bu oyuncuyu kapsıyor mu (haftalık gelişimdeki roleMatch kuralı) */
export function focusCoversPlayer(focus: string, role: string, age: number): boolean {
  if (focus === 'attack') return role === 'FW' || role === 'OS';
  if (focus === 'defense') return role === 'SB' || role === 'STP' || role === 'KL';
  if (focus === 'fitness') return true;
  if (focus === 'youth') return age <= 23;
  return true; // balanced
}

export function facilitySummaryLine(f?: Partial<FacilityState> | null): string {
  const eff = facilityEffects(f);
  const n = normalizeFacility(f);
  return `🌱 gelişim +%${Math.round(eff.growthChance * 100)} • 🏋️ enerji +${eff.energyRegen} • 😊 moral +${eff.moraleRegen} • 🧊 sakatlık -%${Math.round((1 - eff.injuryRiskMult) * 100)} • 📊 kimya +${(n.tactics * 0.6).toFixed(1)} • 🎓 genç +%${Math.round(eff.youthGrowth * 100)}`;
}
