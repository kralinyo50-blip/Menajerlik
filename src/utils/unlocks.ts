/**
 * 🎯 Kariyer Seviye Sistemi (v5.0)
 *
 * - Her oynanan 5 maçta 1 seviye atlanır (kupa maçları dahil)
 * - Sekmeler seviye ile açılır: başta her şey kapalı değildir, ama ekonomi ve
 *   eğlence özellikleri kariyer ilerledikçe kademeli açılır (yatırım mantığı)
 * - 🎰 Kumarhane seviye 40'ta açılır (200 maç ≈ 11 sezonluk sadakat ödülü)
 */

export type UnlockableTab =
  | 'office' | 'social' | 'career' | 'life' | 'stadium' | 'squad' | 'transfer'
  | 'tactics' | 'training' | 'league' | 'cup' | 'shop' | 'merch' | 'invest'
  | 'history' | 'tech' | 'casino' | 'settings' | 'dark';

/** Sekmenin açıldığı seviye */
export const TAB_UNLOCK_LEVEL: Record<UnlockableTab, number> = {
  office: 1,
  social: 1,
  career: 1,
  life: 1,
  stadium: 1,
  squad: 1,
  transfer: 1,
  tactics: 1,
  training: 1,
  league: 1,
  cup: 1,
  history: 1,
  settings: 1,
  // ── Kademeli açılanlar ──
  shop: 2,      // 10 maç — Dükkan
  merch: 3,     // 15 maç — Formalar (mağaza zinciri)
  invest: 5,    // 25 maç — Yatırım & kredi
  tech: 8,      // 40 maç — Teknoloji/AVM
  dark: 2,      // 10 maç — 🕶️ Karanlık İşler (şike & rüşvet)
  casino: 40,   // 195 maç — 🎰 Kumarhane
};

export const MATCHES_PER_LEVEL = 5;
export const MAX_CAREER_LEVEL = 50;

/** Oynanan maçtan kariyer seviyesi (her 5 maçta 1) */
export const careerLevelFromMatches = (matchesPlayed: number): number =>
  Math.min(MAX_CAREER_LEVEL, 1 + Math.floor(Math.max(0, matchesPlayed) / MATCHES_PER_LEVEL));

export interface CareerProgress {
  level: number;
  matchesPlayed: number;
  /** Bu seviyeye ilerlemek için oynanması gereken maç */
  matchesToNext: number;
  /** 1-5 arası seviye içindeki ilerleme */
  levelProgress: number;
  /** Şu an açık olmayan, sırada gelen özellik */
  nextUnlock: { tab: UnlockableTab; label: string; icon: string; atLevel: number } | null;
}

const UNLOCK_META: Record<string, { label: string; icon: string }> = {
  shop: { label: 'Dükkan', icon: '🛒' },
  merch: { label: 'Formalar', icon: '👕' },
  dark: { label: 'Karanlık İşler', icon: '🕶️' },
  invest: { label: 'Yatırım', icon: '📈' },
  tech: { label: 'Teknoloji', icon: '💻' },
  casino: { label: 'Kumarhane', icon: '🎰' },
};

export function careerProgress(matchesPlayed: number): CareerProgress {
  const level = careerLevelFromMatches(matchesPlayed);
  const matchesToNext = MATCHES_PER_LEVEL - (Math.max(0, matchesPlayed) % MATCHES_PER_LEVEL);
  const levelProgress = (Math.max(0, matchesPlayed) % MATCHES_PER_LEVEL) / MATCHES_PER_LEVEL;
  let nextUnlock: CareerProgress['nextUnlock'] = null;
  for (const [tab, meta] of Object.entries(UNLOCK_META)) {
    const at = TAB_UNLOCK_LEVEL[tab as UnlockableTab];
    if (at > level) {
      nextUnlock = { tab: tab as UnlockableTab, label: meta.label, icon: meta.icon, atLevel: at };
      break;
    }
  }
  return { level, matchesPlayed, matchesToNext: level >= MAX_CAREER_LEVEL ? 0 : matchesToNext, levelProgress, nextUnlock };
}

/** İki seviye arasında açılan özellikler (seviye atlama ekranı için) */
export interface UnlockReveal { tab: UnlockableTab; label: string; icon: string; atLevel: number }
export function unlocksBetween(fromLevel: number, toLevel: number): UnlockReveal[] {
  const out: UnlockReveal[] = [];
  for (const [tab, meta] of Object.entries(UNLOCK_META)) {
    const at = TAB_UNLOCK_LEVEL[tab as UnlockableTab];
    if (at > fromLevel && at <= toLevel) out.push({ tab: tab as UnlockableTab, label: meta.label, icon: meta.icon, atLevel: at });
  }
  return out.sort((a, b) => a.atLevel - b.atLevel);
}

export const isTabUnlocked = (tab: UnlockableTab, matchesPlayed: number): boolean =>
  careerLevelFromMatches(matchesPlayed) >= TAB_UNLOCK_LEVEL[tab];

/** Seviye atlayınca gelen ödül: seviye başına bütçe primi */
export const levelUpBonus = (level: number): number => 50_000 * level;
