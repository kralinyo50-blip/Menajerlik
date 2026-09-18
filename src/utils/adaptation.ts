import { Player } from '../types/game';

/** Tam uyum için gereken maç sayısı */
export const MATCHES_TO_ADAPT = 8;

/** Oyuncunun takıma uyumu 0..1 (oynadığı maç sayısına göre artar) */
export function adaptationPct(player: Player): number {
  const mp = player.matchesPlayed ?? 0;
  return Math.max(0, Math.min(1, mp / MATCHES_TO_ADAPT));
}

/** Takım kimyası uyum cezasını hafifletir ya da ağırlaştırır */
function chemistryMult(chemistry: number): number {
  if (chemistry >= 75) return 0.75;
  if (chemistry >= 50) return 1;
  return 1.3;
}

/**
 * Oyuncunun sahadaki gerçek gücü.
 * Takım ortalamasının çok üstündeki bir oyuncu (ör. 70'lik takımda 90'lık yıldız),
 * takıma alışana kadar kağıt üstündeki gücünde oynayamaz. Her maçla uyum artar,
 * ~8 maçta tam uyuma ulaşır ve gerçek gücünde oynamaya başlar.
 */
export function effectiveOvr(player: Player, teamAvg: number, chemistry = 55): number {
  const adapt = adaptationPct(player);
  if (adapt >= 1) return player.ovr;
  const gap = Math.max(0, player.ovr - teamAvg);
  const mismatchPenalty = gap * (1 - adapt) * 0.55;
  const newcomerPenalty = (1 - adapt) * 2;
  const total = Math.min(14, (mismatchPenalty + newcomerPenalty) * chemistryMult(chemistry));
  return Math.max(40, player.ovr - total);
}

export interface AdaptationInfo {
  /** 0-100 uyum yüzdesi */
  pct: number;
  /** Sahadaki gerçek güç */
  effective: number;
  /** OVR'dan yenen ceza */
  penalty: number;
  /** Tam uyuma kalan maç */
  matchesLeft: number;
  adapted: boolean;
}

export function adaptationInfo(player: Player, teamAvg: number, chemistry = 55): AdaptationInfo {
  const pct = Math.round(adaptationPct(player) * 100);
  const effective = effectiveOvr(player, teamAvg, chemistry);
  return {
    pct,
    effective,
    penalty: Math.max(0, player.ovr - effective),
    matchesLeft: Math.max(0, MATCHES_TO_ADAPT - (player.matchesPlayed ?? 0)),
    adapted: pct >= 100,
  };
}
