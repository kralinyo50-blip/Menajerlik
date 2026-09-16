import { GameState, SkillId, SkillTree } from '../types/game';

export interface SkillInfo {
  id: SkillId;
  name: string;
  icon: string;
  desc: string;
  effectPerLevel: string;
  max: number;
}

export const SKILLS: SkillInfo[] = [
  { id: 'tactics', name: 'Taktik Zekâsı', icon: '📋', desc: 'Maç motorunda takım gücünü artırır.', effectPerLevel: '+1.5 hücum & savunma', max: 5 },
  { id: 'motivation', name: 'Motivasyon', icon: '🔥', desc: 'Galibiyet sonrası moral artışı.', effectPerLevel: '+1.5 moral / galibiyet', max: 5 },
  { id: 'fitness', name: 'Kondisyon Uzmanı', icon: '🏃', desc: 'Oyuncular daha az yorulur, yedekler daha hızlı döner.', effectPerLevel: '-0.6 yorgunluk, +2 enerji', max: 5 },
  { id: 'negotiation', name: 'Pazarlıkçı', icon: '🤝', desc: 'Transfer ve sözleşme maliyetlerini düşürür.', effectPerLevel: "%-3 alış / +%2 satış", max: 5 },
  { id: 'scouting', name: 'Scout Ağı', icon: '🔍', desc: 'Transfer pazarında daha kaliteli oyuncular.', effectPerLevel: '+1.5 OVR kalite', max: 5 },
  { id: 'youth', name: 'Genç Gelişimi', icon: '🌱', desc: 'Genç oyuncular ve akademi daha hızlı gelişir.', effectPerLevel: '+%3 gelişim şansı', max: 5 },
  { id: 'medical', name: 'Sağlık Ekibi', icon: '🏥', desc: 'Sakatlık riski ve sakatlık süresi azalır.', effectPerLevel: '-%6 sakatlık riski', max: 5 },
  { id: 'media', name: 'Medya İlişkileri', icon: '📣', desc: 'Taraftar memnuniyeti ve sponsor geliri artar.', effectPerLevel: '+0.5 taraftar, +%4 sponsor', max: 5 },
];

export const emptySkillTree = (): SkillTree => ({
  tactics: 0, motivation: 0, fitness: 0, negotiation: 0,
  scouting: 0, youth: 0, medical: 0, media: 0,
});

export const getSkill = (state: GameState, id: SkillId) => state.skills?.[id] ?? 0;

/* ── Yetenek etkileri ── */
export const skillTacticsBonus = (lvl: number) => lvl * 1.5;
export const skillMoraleBonus = (lvl: number) => lvl * 1.5;
export const skillFatigueReduction = (lvl: number) => lvl * 0.6;
export const skillRecoveryBonus = (lvl: number) => lvl * 2;
export const skillBuyDiscount = (lvl: number) => lvl * 0.03;
export const skillSellBonus = (lvl: number) => lvl * 0.02;
export const skillScoutBonus = (lvl: number) => lvl * 1.5;
export const skillYouthBonus = (lvl: number) => lvl * 0.03;
export const skillInjuryReduction = (lvl: number) => lvl * 0.06;
export const skillFanBonus = (lvl: number) => lvl * 0.5;
export const skillSponsorBonus = (lvl: number) => lvl * 0.04;

/* ── Seviye / XP ── */
export const xpForLevel = (level: number) => 100 + (level - 1) * 80;

export interface XpResult {
  managerXp: number;
  managerLevel: number;
  skillPoints: number;
  levelUps: number;
}

export function grantXp(state: { managerXp: number; managerLevel: number; skillPoints: number }, amount: number): XpResult {
  let xp = (state.managerXp || 0) + amount;
  let level = state.managerLevel || 1;
  let points = state.skillPoints || 0;
  let levelUps = 0;
  while (xp >= xpForLevel(level) && level < 99) {
    xp -= xpForLevel(level);
    level += 1;
    points += 1;
    levelUps += 1;
  }
  return { managerXp: xp, managerLevel: level, skillPoints: points, levelUps };
}

export const managerLevelTitle = (level: number) => {
  if (level >= 20) return 'Efsane Menajer';
  if (level >= 15) return 'Dünya Yıldızı';
  if (level >= 10) return 'Usta Menajer';
  if (level >= 6) return 'Deneyimli Menajer';
  if (level >= 3) return 'Yükselen Menajer';
  return 'Çaylak Menajer';
};
