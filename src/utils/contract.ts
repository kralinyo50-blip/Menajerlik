import { Player } from '../types/game';

/** Sözleşme yenileme: imza parası */
export const renewalCost = (p: Player, years: number) =>
  Math.floor(p.value * 0.1 * years * (p.wantsOut ? 1.4 : 1));

/** Sözleşme yenileme: yeni haftalık maaş */
export const renewalWage = (p: Player, years: number) =>
  Math.ceil(p.wage * (1 + 0.12 * years));

/** Oyuncunun gelecek sezon sözleşmesi bitiyor mu? */
export const contractRisk = (p: Player) =>
  p.contract <= 0 ? 'expired' : p.contract <= 1 ? 'risky' : 'safe';
