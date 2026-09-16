import { Player } from '../types/game';
import { StarTier, TIER_INFO } from '../data/stars';

/**
 * Yeni piyasa ekonomisi:
 * Düşük overall'lar erişilebilir, 80+ oyuncular ciddi yatırım, 90+ süper yıldızlar servet.
 *  60 OVR ≈ $0.9M   70 ≈ $2.5M   80 ≈ $6.7M   85 ≈ $11M   90 ≈ $18M   95 ≈ $29M
 */
export function baseValue(ovr: number): number {
  return 15000 * ovr * Math.pow(1.09, Math.max(0, ovr - 60));
}

export function ageMultiplier(age: number): number {
  if (age <= 20) return 1.4;
  if (age <= 22) return 1.3;
  if (age <= 24) return 1.18;
  if (age <= 29) return 1;
  if (age <= 31) return 0.85;
  if (age <= 33) return 0.65;
  if (age <= 35) return 0.45;
  return 0.28;
}

export function playerValue(ovr: number, age: number, opts?: { tier?: StarTier; potential?: number }): number {
  const tierMult = opts?.tier ? TIER_INFO[opts.tier].valueMult : 1;
  const potentialMult = opts?.potential && opts.potential > ovr
    ? 1 + Math.min(0.45, (opts.potential - ovr) * 0.035)
    : 1;
  return Math.round(baseValue(ovr) * ageMultiplier(age) * tierMult * potentialMult);
}

/** Haftalık maaş — 80 üzeri yıldızlarda belirgin şekilde artar */
export function playerWage(ovr: number, tier?: StarTier): number {
  const premium = Math.max(0, ovr - 80) * 2000;
  const tierPremium = tier === 'world' ? 1.25 : tier === 'star' ? 1.12 : 1;
  return Math.round((ovr * 500 + premium) * tierPremium);
}

export function valueOf(player: Player): number {
  return playerValue(player.ovr, player.age, { tier: player.starTier, potential: player.potential });
}

/** 6.700.000 → "$6.7M" / 850.000 → "$850K" */
export function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toLocaleString()}`;
}

/** Transfer listesi yenileme maliyeti (scout yeteneği indirir) */
export const marketRefreshCost = (scoutingSkill: number, scoutLvl: number) =>
  Math.max(120000, 250000 - scoutingSkill * 16000 - scoutLvl * 10000);
