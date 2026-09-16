import { GameState, Player } from '../types/game';

export const isUnavailable = (p: Player) => p.injured || (p.suspension ?? 0) > 0;

export interface LineupFix {
  team11: Player[];
  bench: Player[];
  changes: { out: string; in: string }[];
}

/**
 * Cezalı (sarı/kırmızı kart) ve sakat oyuncuları otomatik olarak yedek kulübesinden
 * uygun bir oyuncuyla değiştirir. Saf fonksiyon — çağıran taraf state'e uygular.
 */
export function fixLineup(state: GameState): LineupFix {
  const benchPool = [...state.bench];
  const outgoing: Player[] = [];
  const changes: { out: string; in: string }[] = [];

  const team11 = state.team11.map(starter => {
    if (!isUnavailable(starter)) return starter;

    let idx = benchPool.findIndex(p => !isUnavailable(p) && p.role === starter.role);
    if (idx < 0) idx = benchPool.findIndex(p => !isUnavailable(p));
    if (idx < 0) return starter; // hiç uygun oyuncu yok — mecburen oynuyor

    const sub = benchPool.splice(idx, 1)[0];
    changes.push({ out: starter.name, in: sub.name });

    const { t, l, ...rest } = starter;
    void t; void l;
    outgoing.push(rest as Player);

    return { ...sub, t: starter.t, l: starter.l, role: starter.role };
  });

  return { team11, bench: [...benchPool, ...outgoing], changes };
}

/** Maç öncesi uyarı listesi (kadro sorunları) */
export function lineupWarnings(state: GameState): string[] {
  const warnings: string[] = [];
  const injured = state.team11.filter(p => p.injured);
  const suspended = state.team11.filter(p => (p.suspension ?? 0) > 0);
  const tired = state.team11.filter(p => !p.injured && p.energy < 55);

  if (injured.length > 0) warnings.push(`🏥 Sakat: ${injured.map(p => `${p.name} (${p.injuryWeeks}h)`).join(', ')}`);
  if (suspended.length > 0) warnings.push(`🟥 Cezalı: ${suspended.map(p => `${p.name} (${p.suspension} maç)`).join(', ')}`);
  if (tired.length >= 3) warnings.push(`⚡ ${tired.length} oyuncunun enerjisi düşük — rotasyon gerekebilir.`);
  if (state.team11.length < 11) warnings.push('⚠️ İlk 11 eksik! Kadronu tamamla.');
  return warnings;
}

/** Ceza/sakatlık durumu rozet metni */
export function playerStatusBadge(p: Player): { text: string; className: string } | null {
  if (p.redCard) return { text: '🟥 Kırmızı', className: 'bg-red-600/30 text-red-300' };
  if (p.injured) return { text: `🏥 ${p.injuryWeeks} hafta`, className: 'bg-red-500/20 text-red-300' };
  if ((p.suspension ?? 0) > 0) return { text: `🟨 ${p.suspension} maç ceza`, className: 'bg-amber-500/20 text-amber-300' };
  if ((p.yellowCards ?? 0) >= 2) return { text: `🟨 ${p.yellowCards}/3`, className: 'bg-yellow-500/20 text-yellow-300' };
  return null;
}
