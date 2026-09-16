import { GameState, StadiumDesign, StadiumState } from '../types/game';
import { MAX_CAPACITY, ROOF_PROTECTION, TICKET_STRATEGIES } from '../data/stadium';

/** Toplam stadyum kapasitesi */
export function stadiumCapacity(state: { stadiumLvl: number; stadium?: StadiumState }): number {
  const base = state.stadiumLvl * 5000 + 2000;
  const bonus = state.stadium?.capacityBonus ?? 0;
  return Math.min(MAX_CAPACITY, base + bonus);
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

/** Bilet geliri çarpanı: VIP + kozmetik + taraftar etkisi */
export function gateMultiplier(state: GameState): number {
  const stadium = state.stadium;
  let mult = 1;
  if (stadium?.vip) mult += 0.12;
  if ((stadium?.cosmetics || []).includes('roof:glass')) mult += 0.04;
  if ((stadium?.cosmetics || []).includes('stands:bowl')) mult += 0.03;
  return mult;
}

/** Tribün kozmetiklerinin taraftar morali katkısı (iç saha maçı başına) */
export function stadiumLoveBonus(state: GameState): number {
  const design = state.stadium?.design;
  if (!design) return 0;
  let love = 0;
  if (design.flags) love += 1;
  if (design.logoOnPitch) love += 1;
  if (state.stadium?.vip) love += 1;
  return love;
}

/** Tribüne gelen her seyircinin büfe/ürün harcaması — stadyumu doldurmak kazandırır */
export function fanSpendingPerFan(state: GameState): number {
  let perFan = 12;
  if (state.stadium?.vip) perFan += 4;
  if ((state.stadium?.design?.roof ?? 'none') !== 'none') perFan += 2;
  return perFan;
}

/** İç saha maçı için tahmini seyirci & gelir önizlemesi (UI) */
export function previewHomeMatch(state: GameState, leaguePosition = 5, weather: 'sunny' | 'rain' = 'sunny') {
  const capacity = stadiumCapacity(state);
  const mult = state.stadium?.ticketMultiplier ?? 1;
  const price = ticketPriceFor(state.stadiumLvl, mult);
  // Lig pozisyonu ilgiyi belirler (calculateAttendance ile aynı mantık)
  const positivity = Math.max(0.45, Math.min(1.05, 1.15 - leaguePosition * 0.06));
  const love = 0.55 + ((state.fanHappiness ?? 60) / 100) * 0.4;
  const weatherFactor = weather === 'rain' ? 0.82 * weatherShield(state.stadium?.design ?? ({} as StadiumDesign), 'rain') : 1.05;
  const attendance = Math.max(500, Math.min(capacity, Math.floor(capacity * positivity * love * weatherFactor * demandFactor(mult))));
  const gate = Math.floor(attendance * price * gateMultiplier(state));
  const catering = Math.floor(attendance * fanSpendingPerFan(state));
  return { capacity, price, attendance, gate, catering, total: gate + catering };
}
