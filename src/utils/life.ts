import { GameState, LifeStats, ManagerLife, LifeActivityId } from '../types/game';
import { ACTIVITY_MAP, LIFE_SLOTS_PER_WEEK } from '../data/life';

export const LIFE_STAT_MIN = 0;
export const LIFE_STAT_MAX = 100;

export function defaultLife(): ManagerLife {
  return {
    stats: { energy: 70, fitness: 50, fun: 60, fame: 40 },
    actionsUsed: 0,
    weekLog: {},
    lastActionWeek: 1,
    owned: [],
    history: [],
    appearance: { skin: '#e8b48a', hair: '#2b1d15', outfit: 'club' },
    lowPerf: false,
  };
}

export type LifeTimeOfDay = 'morning' | 'day' | 'evening' | 'night';
export type LifeSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export function getLifeTime(gameState: GameState): { timeOfDay: LifeTimeOfDay; season: LifeSeason; isNight: boolean } {
  const seasonIdx = ((gameState.season - 1) % 4 + 4) % 4;
  const seasons: LifeSeason[] = ['spring', 'summer', 'autumn', 'winter'];
  const season = seasons[seasonIdx];
  // Haftaya göre günün saati döner: her hafta farklı atmosfer
  const t = gameState.week % 4;
  const times: LifeTimeOfDay[] = ['day', 'evening', 'night', 'morning'];
  const timeOfDay = times[t];
  return { timeOfDay, season, isNight: timeOfDay === 'night' || timeOfDay === 'evening' };
}

export function lifeOf(state: GameState): ManagerLife {
  return state.life ?? defaultLife();
}

const clamp = (v: number) => Math.max(LIFE_STAT_MIN, Math.min(LIFE_STAT_MAX, Math.round(v)));

/** Form limiti: spor salonu üyeliği olmadan 60'ı geçemezsin */
export function fitnessCap(life: ManagerLife): number {
  return life.owned.includes('gymMember') ? 100 : 60;
}

/** Keyif limiti: ev konforu paketi +10 verir */
export function funCap(life: ManagerLife): number {
  return life.owned.includes('homeUpgrade') ? 100 : 90;
}

export function slotsLeft(life: ManagerLife): number {
  return Math.max(0, LIFE_SLOTS_PER_WEEK - (life.actionsUsed ?? 0));
}

export interface ActivityCheck {
  ok: boolean;
  reason?: string;
}

/** Aktivite yapılabilir mi? (eşya, slot, haftalık limit, enerji, bütçe) */
export function checkActivity(state: GameState, activityId: LifeActivityId): ActivityCheck {
  const life = lifeOf(state);
  const activity = ACTIVITY_MAP[activityId];
  if (!activity) return { ok: false, reason: 'Bilinmeyen aktivite' };

  if (activity.requires && !life.owned.includes(activity.requires)) {
    return { ok: false, reason: 'Önce gerekli eşyayı satın al' };
  }
  if (slotsLeft(life) < activity.slots) {
    return { ok: false, reason: `Bu hafta yeterli boş zamanın yok (${slotsLeft(life)} hak kaldı)` };
  }
  const used = life.weekLog?.[activityId] ?? 0;
  if (used >= activity.maxPerWeek) {
    return { ok: false, reason: `Bu hafta bu aktiviteyi ${activity.maxPerWeek} kez yaptın` };
  }
  if (life.stats.energy < activity.energyCost) {
    return { ok: false, reason: 'Enerjin yetmiyor — önce evde dinlen' };
  }
  const minCost = Math.min(
    ...activity.variants.map(v => (v.cost ?? 0) + (activity.cost ?? 0))
  );
  if (minCost > 0 && state.budget < minCost) {
    return { ok: false, reason: 'Bütçen bu aktivite için yetersiz' };
  }
  return { ok: true };
}

export interface ActivityOutcome {
  stats: LifeStats;
  xp: number;
  cost: number;
  /** Yorgunluk yüzünden etkiler yarıya indi mi? */
  fatigued: boolean;
  applied: Partial<LifeStats>;
  summary: string;
}

/** Aktivitenin etkilerini hesaplar (enerji, yorgunluk, limitler, eşya bonusları) */
export function computeOutcome(
  state: GameState,
  activityId: LifeActivityId,
  variantId: string
): ActivityOutcome {
  const life = lifeOf(state);
  const activity = ACTIVITY_MAP[activityId];
  const variant = activity.variants.find(v => v.id === variantId) ?? activity.variants[0];

  const fatigued = life.stats.energy < 30;
  const combo: Partial<LifeStats> = {};
  const add = (key: keyof LifeStats, value: number) => {
    combo[key] = (combo[key] ?? 0) + value;
  };

  (Object.keys(activity.effect) as (keyof LifeStats | 'xp')[]).forEach(key => {
    if (key === 'xp') return;
    const value = activity.effect[key] as number;
    add(key as keyof LifeStats, value);
  });
  (Object.keys(variant.effect) as (keyof LifeStats | 'xp')[]).forEach(key => {
    if (key === 'xp') return;
    const value = variant.effect[key] as number;
    add(key as keyof LifeStats, value);
  });

  // Araba: gezme/tatil keyfini artırır
  if (life.owned.includes('car') && (activityId === 'goOut' || activityId === 'vacation')) {
    combo.fun = Math.round((combo.fun ?? 0) * 1.25);
  }
  // Ev konforu: dinlenme daha verimli
  if (life.owned.includes('homeUpgrade') && activityId === 'rest') {
    combo.energy = (combo.energy ?? 0) + 8;
  }
  // Spor salonu üyeliği: antrenman verimi
  if (life.owned.includes('gymMember') && activityId === 'gym') {
    combo.fitness = (combo.fitness ?? 0) + 2;
  }

  // Yorgunken verim düşer (enerji kazancı hariç)
  const applied: Partial<LifeStats> = {};
  (Object.keys(combo) as (keyof LifeStats)[]).forEach(key => {
    const raw = combo[key] ?? 0;
    const value = fatigued && raw > 0 && key !== 'energy' ? Math.round(raw / 2) : raw;
    applied[key] = value;
  });

  const stats: LifeStats = {
    energy: clamp(life.stats.energy + (applied.energy ?? 0) - activity.energyCost),
    fitness: clamp(Math.min(fitnessCap(life), life.stats.fitness + (applied.fitness ?? 0))),
    fun: clamp(Math.min(funCap(life), life.stats.fun + (applied.fun ?? 0))),
    fame: clamp(life.stats.fame + (applied.fame ?? 0)),
  };

  const xp = (activity.effect.xp ?? 0) + (variant.effect.xp ?? 0);
  const cost = (activity.cost ?? 0) + (variant.cost ?? 0);

  const parts: string[] = [];
  (Object.keys(applied) as (keyof LifeStats)[]).forEach(key => {
    const v = applied[key] ?? 0;
    if (v === 0) return;
    const labels: Record<keyof LifeStats, string> = { energy: 'Enerji', fitness: 'Form', fun: 'Keyif', fame: 'Ün' };
    parts.push(`${labels[key]} ${v > 0 ? '+' : ''}${v}`);
  });
  if (activity.energyCost > 0) parts.push(`Enerji -${activity.energyCost}`);
  if (cost > 0) parts.push(`Masraf $${cost.toLocaleString()}`);
  if (fatigued) parts.push('⚠️ Yorgunluk: etkiler yarıya indi');

  return {
    stats,
    xp,
    cost,
    fatigued,
    applied,
    summary: parts.join(' • '),
  };
}

/** Haftalık aktivite haklarını sıfırlar */
export function lifeWeeklyReset(life: ManagerLife, week: number): ManagerLife {
  if (life.lastActionWeek === week) return life;
  return { ...life, actionsUsed: 0, weekLog: {}, lastActionWeek: week };
}

/** Menajer formunun maça etkisi: hücum/savunma bonusu */
export function managerMatchBonus(state: GameState): { attack: number; defense: number; label: string } {
  const life = lifeOf(state);
  const { fitness, energy, fun } = life.stats;
  const base = Math.floor(fitness / 25) * 0.4;             // 0 … 1.6
  const energyPenalty = energy < 30 ? -0.5 : 0;
  const funPenalty = fun < 30 ? -0.3 : 0;
  const bonus = Math.max(-0.8, base + energyPenalty + funPenalty);
  const label = bonus > 0 ? `Form +${bonus.toFixed(1)}` : bonus < 0 ? `Form ${bonus.toFixed(1)}` : 'Form 0.0';
  return { attack: bonus, defense: bonus * 0.6, label };
}

/** Menajer formu oyuncuların haftalık toparlanmasını hızlandırır (+0..3 enerji) */
export function managerRecoveryBonus(state: GameState): number {
  const life = lifeOf(state);
  let bonus = Math.floor(life.stats.fitness / 30);
  if (life.stats.fun >= 80) bonus += 1;
  if (life.stats.energy < 25) bonus -= 1;
  return Math.max(0, Math.min(4, bonus));
}

/** Ün → sponsor geliri çarpanı (1.00 … 1.30) */
export function fameIncomeMultiplier(state: GameState): number {
  return 1 + Math.min(0.3, lifeOf(state).stats.fame / 333);
}

/** Ün → transfer pazarlığında ekstra başarı şansı (0 … 0.2) */
export function fameNegotiationBonus(state: GameState): number {
  return Math.min(0.2, lifeOf(state).stats.fame / 500);
}

/** Haftalık hayat raporu (Ofis/Hayat sekmesi için) */
export function lifeSummary(state: GameState): { text: string; tone: 'good' | 'bad' | 'neutral' } {
  const life = lifeOf(state);
  const avg = (life.stats.energy + life.stats.fitness + life.stats.fun) / 3;
  if (life.stats.energy < 25) return { text: 'Bitkinsin! Evde dinlenmeye zaman ayır.', tone: 'bad' };
  if (life.stats.fun < 30) return { text: 'Stres yükleniyor — kafanı boşaltacak bir şeyler yap.', tone: 'bad' };
  if (life.stats.fitness < 35) return { text: 'Formun düşük, spor salonuna uğramalısın.', tone: 'bad' };
  if (avg > 78) return { text: 'Hem formda hem mutlusun — takım bunu hissediyor!', tone: 'good' };
  return { text: 'Dengeli bir hafta geçiriyorsun.', tone: 'neutral' };
}
