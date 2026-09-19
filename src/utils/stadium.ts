import { BuffetState, GameState, StadiumDesign, StadiumState, StadiumFacilities } from '../types/game';
import { MAX_CAPACITY, ROOF_PROTECTION, TICKET_STRATEGIES, STADIUM_FACILITY_MAP, STADIUM_FACILITY_DEFS } from '../data/stadium';
import {
  BUFFET_PRICE_MAP, BUFFET_SPONSOR_MAP, buffetMenuHappiness, buffetMenuIncome, normalizeBuffetState,
} from '../data/buffet';

/** Toplam stadyum kapasitesi */
export function stadiumCapacity(state: { stadiumLvl: number; stadium?: StadiumState }): number {
  const base = state.stadiumLvl * 5000 + 2000;
  const bonus = state.stadium?.capacityBonus ?? 0;
  const tri = state.stadium?.tribunes;
  let tribuneBonus = 0;
  if (tri) {
    const baseSeats: Record<string, number> = { north: 2200, south: 2200, east: 3200, west: 3200 };
    (['north','south','east','west'] as const).forEach(k=> {
      const lvl = (tri as any)[k] ?? 1;
      tribuneBonus += Math.max(0, lvl-1) * (baseSeats[k] ?? 2200);
    });
  }
  return Math.min(MAX_CAPACITY, base + bonus + tribuneBonus);
}

/** Yeni stadyum seviyesine geçildiğinde seviye başına ek kapasite (bilgi amaçlı) */
export const CAPACITY_PER_LEVEL = 5000;

/** Bilet fiyatı (strateji çarpanı dahil) */
export function ticketPriceFor(stadiumLvl: number, multiplier = 1): number {
  return Math.round((30 + stadiumLvl * 5) * multiplier);
}

/** Bilet stratejisinin seyirci talebine etkisi */
export function demandFactor(multiplier = 1): number {
  const found = TICKET_STRATEGIES.find(t => t.multiplier === multiplier);
  if (found) return found.demandFactor;
  return Math.max(0.6, Math.min(1.2, 1.15 - (multiplier - 0.75) * 0.5));
}

/** Kötü hava etkisini çatının koruma oranı kadar geri kazandırır */
export function weatherShield(design: StadiumDesign, weather: string): number {
  const bad = weather === 'rain' || weather === 'storm' || weather === 'snow';
  if (!bad) return 1;
  const protection = ROOF_PROTECTION[design.roof] ?? 0;
  // Koruma oranı, kaybın %80'ine kadarını telafi eder
  return 1 + protection * 0.8 * (1 - 0.78);
}

/** Bilet geliri çarpanı: VIP + kozmetik + taraftar etkisi + yıldızlar gişe çeker */
export function gateMultiplier(state: GameState): number {
  const stadium = state.stadium;
  let mult = 1;
  if (stadium?.vip) mult += 0.12;
  if ((stadium?.cosmetics || []).includes('roof:glass')) mult += 0.04;
  if ((stadium?.cosmetics || []).includes('stands:bowl')) mult += 0.03;
  mult += starGateBonus(state);
  return mult;
}

/** Tribün kozmetiklerinin taraftar morali katkısı (iç saha maçı başına) + tesisler */
export function stadiumLoveBonus(state: GameState): number {
  const design = state.stadium?.design;
  if (!design) return 0;
  let love = 0;
  if (design.flags) love += 1;
  if (design.logoOnPitch) love += 1;
  if (state.stadium?.vip) love += 1;
  love += facilityHappinessBonus(state) * 0.15;
  return love;
}

/** Yıldız oyuncuların tribün/forma etkisini toplar */
export function starBonuses(state: GameState): { attendance: number; gate: number; perFan: number; shop: number } {
  const all = [...(state.team11 || []), ...(state.bench || [])];
  let w = 0, s = 0, t = 0, wk = 0;
  all.forEach(p => {
    if (p.starTier === 'world') w++;
    else if (p.starTier === 'star') s++;
    else if (p.starTier === 'turkish') t++;
    else if (p.starTier === 'wonderkid') wk++;
  });
  // doyurma: ilk yıldızlar daha değerli
  const att = Math.min(0.32, w * 0.11 + s * 0.065 + t * 0.075 + wk * 0.035);
  const gate = Math.min(0.22, w * 0.085 + s * 0.05 + t * 0.045 + wk * 0.025);
  const perFan = Math.min(8, w * 3.2 + s * 1.8 + t * 2.2 + wk * 1.1);
  const shop = Math.min(0.85, w * 0.32 + s * 0.2 + t * 0.17 + wk * 0.11);
  return { attendance: att, gate, perFan, shop };
}

export function starAttendanceFactor(state: GameState): number {
  return 1 + starBonuses(state).attendance;
}
export function starGateBonus(state: GameState): number {
  return starBonuses(state).gate;
}
export function starShopMultiplier(state: GameState): number {
  return 1 + starBonuses(state).shop;
}

export function getStadiumFacilities(state: GameState): StadiumFacilities {
  const f = state.stadium?.facilities;
  if (f) return f;
  // fallback for old saves
  return {
    buffet: 0, fanShop: 0, restaurant: 0, bar: 0, parking: 0,
    toilets: 1, security: 1, ledScreen: 0, soundSystem: 1,
    museum: 0, kidsZone: 0, medicalRoom: 0
  };
}

export function facilityIncomePerFan(state: GameState): number {
  const facs = getStadiumFacilities(state);
  let income = 0;
  (Object.keys(facs) as (keyof StadiumFacilities)[]).forEach(k => {
    const lvl = facs[k] || 0;
    const def = STADIUM_FACILITY_MAP[k as any];
    if (def && lvl > 0) {
      income += def.incomePerFan * lvl;
    }
  });
  return income;
}

/** Büfe işletme durumu (eski kayıtlar için normalize edilmiş) */
export function getBuffetState(state: GameState): BuffetState {
  return normalizeBuffetState(state.stadium?.buffet);
}

/** Büfeyi markalayan sponsor (yoksa null) */
export function activeBuffetSponsor(state: GameState) {
  const id = state.stadium?.buffet?.sponsorId;
  if (!id) return null;
  const weeksLeft = state.stadium?.buffet?.sponsorWeeksLeft ?? 0;
  if (weeksLeft <= 0) return null;
  return BUFFET_SPONSOR_MAP[id] ?? null;
}

/**
 * Büfe detayının taraftar başına EK geliri (menü ürünleri + fiyat politikası +
 * sponsor marka primi). `facilityIncomePerFan` zaten taban büfe gelirini eklediği
 * için burada yalnızca farkı döndürürüz — çift sayım olmaz.
 */
export function buffetDetailPerFan(state: GameState): number {
  const level = state.stadium?.facilities?.buffet ?? 0;
  if (level <= 0) return 0;
  const buffet = getBuffetState(state);
  const base = STADIUM_FACILITY_MAP.buffet.incomePerFan * level;
  const menu = buffetMenuIncome(buffet.menu ?? []);
  const mult = BUFFET_PRICE_MAP[buffet.priceLevel]?.incomeMult ?? 1;
  const sponsor = activeBuffetSponsor(state)?.perFan ?? 0;
  const gross = (base + menu) * mult;
  return gross - base + sponsor;
}

/** Büfe detayının taraftar memnuniyeti katkısı (menü + fiyat + sponsor) */
export function buffetHappinessBonus(state: GameState): number {
  const level = state.stadium?.facilities?.buffet ?? 0;
  if (level <= 0) return 0;
  const buffet = getBuffetState(state);
  const menu = buffetMenuHappiness(buffet.menu ?? []);
  const price = BUFFET_PRICE_MAP[buffet.priceLevel]?.happiness ?? 0;
  const sponsor = activeBuffetSponsor(state)?.happiness ?? 0;
  return menu + price + sponsor;
}

/** UI için büfe gelir dağılımı (maç başına, tahmini seyirciye göre) */
export function buffetBreakdown(state: GameState, attendance: number) {
  const level = state.stadium?.facilities?.buffet ?? 0;
  const buffet = getBuffetState(state);
  const sponsor = activeBuffetSponsor(state);
  const base = STADIUM_FACILITY_MAP.buffet.incomePerFan * level;
  const menu = buffetMenuIncome(buffet.menu ?? []);
  const mult = BUFFET_PRICE_MAP[buffet.priceLevel]?.incomeMult ?? 1;
  const baseIncome = base * mult * attendance;
  const menuIncome = menu * mult * attendance;
  const sponsorIncome = (sponsor?.perFan ?? 0) * attendance;
  return {
    level,
    baseIncome,
    menuIncome,
    sponsorIncome,
    perFan: (base + menu) * mult + (sponsor?.perFan ?? 0),
    total: baseIncome + menuIncome + sponsorIncome,
  };
}

export function facilityHappinessBonus(state: GameState): number {
  const facs = getStadiumFacilities(state);
  let happy = 0;
  (Object.keys(facs) as (keyof StadiumFacilities)[]).forEach(k => {
    const lvl = facs[k] || 0;
    const def = STADIUM_FACILITY_MAP[k as any];
    if (def && lvl > 0) happy += def.happiness * lvl * 0.3;
  });
  // Büfe detayı: menü çeşitliliği + fiyat politikası + sponsor marka
  happy += buffetHappinessBonus(state) * 0.35;
  return Math.min(15, happy);
}

export function facilityBoardBonus(state: GameState): number {
  const facs = getStadiumFacilities(state);
  let bonus = 0;
  (Object.keys(facs) as (keyof StadiumFacilities)[]).forEach(k => {
    const lvl = facs[k] || 0;
    const def = STADIUM_FACILITY_MAP[k as any];
    if (def?.boardBonus && lvl > 0) bonus += def.boardBonus * lvl * 0.2;
  });
  return bonus;
}

export function totalFacilityLevel(state: GameState): number {
  const facs = getStadiumFacilities(state);
  return Object.values(facs).reduce((a, b) => a + (b || 0), 0);
}

/** Tribüne gelen her seyircinin büfe/ürün harcaması — stadyumu doldurmak kazandırır + yıldızlar forma sattırır + tesisler */
export function fanSpendingPerFan(state: GameState): number {
  let perFan = 12;
  if (state.stadium?.vip) perFan += 4;
  if ((state.stadium?.design?.roof ?? 'none') !== 'none') perFan += 2;
  perFan += starBonuses(state).perFan;
  perFan += facilityIncomePerFan(state);
  // Büfe işletmesi: menü ürünleri, fiyat politikası ve marka sponsor primi
  perFan += buffetDetailPerFan(state);
  return perFan;
}

/** İç saha maçı için tahmini seyirci & gelir önizlemesi (UI) — yıldızlar dahil */
export function previewHomeMatch(state: GameState, leaguePosition = 5, weather: 'sunny' | 'rain' = 'sunny') {
  const capacity = stadiumCapacity(state);
  const mult = state.stadium?.ticketMultiplier ?? 1;
  const price = ticketPriceFor(state.stadiumLvl, mult);
  const positivity = Math.max(0.45, Math.min(1.05, 1.15 - leaguePosition * 0.06));
  const love = 0.55 + ((state.fanHappiness ?? 60) / 100) * 0.4;
  const weatherFactor = weather === 'rain' ? 0.82 * weatherShield(state.stadium?.design ?? ({} as StadiumDesign), 'rain') : 1.05;
  const attendance = Math.max(500, Math.min(capacity, Math.floor(capacity * positivity * love * weatherFactor * demandFactor(mult) * starAttendanceFactor(state))));
  const gate = Math.floor(attendance * price * gateMultiplier(state));
  const catering = Math.floor(attendance * fanSpendingPerFan(state));
  return { capacity, price, attendance, gate, catering, total: gate + catering };
}
