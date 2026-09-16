import { GameState, Mission, MissionMetric, MissionType } from '../types/game';

interface MissionDef {
  metric: MissionMetric;
  icon: string;
  weekly: { target: number; title: string; desc: string; budget: number; xp: number };
  season: { target: number; title: string; desc: string; budget: number; xp: number; skillPoint?: number };
  career: { target: number; title: string; desc: string; budget: number; xp: number; skillPoint?: number };
}

/** Mutlak (birikimli olmayan) metrikler — anlık değere bakılır */
const ABSOLUTE: MissionMetric[] = ['unbeatenStreak', 'budget'];

export const MISSION_POOL: MissionDef[] = [
  {
    metric: 'wins', icon: '🏆',
    weekly: { target: 2, title: '2 maç kazan', desc: 'Bu 5 haftada 2 galibiyet al', budget: 80000, xp: 40 },
    season: { target: 10, title: '10 maç kazan', desc: 'Sezon boyunca 10 galibiyet', budget: 400000, xp: 180 },
    career: { target: 50, title: '50 galibiyet', desc: 'Kariyerinde 50 maç kazan', budget: 1200000, xp: 400 },
  },
  {
    metric: 'goals', icon: '⚽',
    weekly: { target: 6, title: '6 gol at', desc: 'Bu 5 haftada 6 gol', budget: 90000, xp: 40 },
    season: { target: 30, title: '30 gol at', desc: 'Sezonda 30 gol', budget: 450000, xp: 180 },
    career: { target: 150, title: '150 gol', desc: 'Kariyerinde 150 gol at', budget: 1500000, xp: 400 },
  },
  {
    metric: 'cleanSheets', icon: '🧤',
    weekly: { target: 1, title: 'Kale kilit', desc: 'Gol yemeden kazan', budget: 70000, xp: 35 },
    season: { target: 5, title: '5 clean sheet', desc: 'Sezonda 5 maç gol yeme', budget: 350000, xp: 170 },
    career: { target: 20, title: '20 clean sheet', desc: 'Kariyerinde 20 maç gol yeme', budget: 1000000, xp: 380 },
  },
  {
    metric: 'attendance', icon: '🎫',
    weekly: { target: 20000, title: 'Tribünleri doldur', desc: 'Bu 5 haftada 20.000 seyirci', budget: 60000, xp: 30 },
    season: { target: 100000, title: '100.000 seyirci', desc: 'Sezon boyunca toplam seyirci', budget: 300000, xp: 160 },
    career: { target: 400000, title: '400.000 seyirci', desc: 'Kariyer toplam seyirci', budget: 1000000, xp: 350 },
  },
  {
    metric: 'minigames', icon: '🎮',
    weekly: { target: 2, title: '2 mini oyun kazan', desc: 'Sahadaki anları kazan', budget: 50000, xp: 35 },
    season: { target: 10, title: '10 mini oyun', desc: 'Sezonda 10 mini oyun kazan', budget: 250000, xp: 160 },
    career: { target: 40, title: '40 mini oyun', desc: 'Kariyerinde 40 mini oyun kazan', budget: 800000, xp: 350 },
  },
  {
    metric: 'motm', icon: '⭐',
    weekly: { target: 1, title: 'Maçın adamı çıkar', desc: 'Bir oyuncun MOTM olsun', budget: 60000, xp: 35 },
    season: { target: 5, title: '5 kez MOTM', desc: 'Sezonda 5 maçın adamı', budget: 300000, xp: 170 },
    career: { target: 20, title: '20 kez MOTM', desc: 'Kariyerinde 20 maçın adamı', budget: 900000, xp: 380 },
  },
  {
    metric: 'transfers', icon: '✍️',
    weekly: { target: 1, title: 'Transfer yap', desc: 'Pazara katıl', budget: 70000, xp: 30 },
    season: { target: 4, title: '4 transfer', desc: 'Sezonda 4 transfer', budget: 300000, xp: 150 },
    career: { target: 15, title: '15 transfer', desc: 'Kariyerinde 15 transfer', budget: 900000, xp: 340 },
  },
  {
    metric: 'youthPromoted', icon: '🌱',
    weekly: { target: 1, title: 'Altyapıdan çıkar', desc: 'Bir genci A takıma al', budget: 60000, xp: 35 },
    season: { target: 2, title: '2 altyapı oyuncusu', desc: 'Sezonda 2 genç oyuncu', budget: 250000, xp: 160 },
    career: { target: 8, title: '8 altyapı yıldızı', desc: 'Kariyerinde 8 genç oyuncu', budget: 700000, xp: 330 },
  },
  {
    metric: 'unbeatenStreak', icon: '🛡️',
    weekly: { target: 3, title: '3 maç yenilme', desc: 'Üst üste 3 maç yenilmezlik', budget: 100000, xp: 45 },
    season: { target: 6, title: '6 maçlık seri', desc: 'Üst üste 6 maç yenilmezlik', budget: 500000, xp: 200 },
    career: { target: 10, title: '10 maçlık seri', desc: 'Üst üste 10 maç yenilmezlik', budget: 1500000, xp: 450 },
  },
  {
    metric: 'penaltyWins', icon: '🥅',
    weekly: { target: 1, title: 'Penaltılarda kazan', desc: 'Penaltı atışlarıyla tur atla', budget: 90000, xp: 45 },
    season: { target: 2, title: '2 penaltı zaferi', desc: 'Sezonda 2 kez penaltıyla kazan', budget: 400000, xp: 190 },
    career: { target: 5, title: '5 penaltı zaferi', desc: 'Kariyerinde 5 penaltı zaferi', budget: 1200000, xp: 420 },
  },
  {
    metric: 'trophies', icon: '🏅',
    weekly: { target: 1, title: 'Kupa/kupa maçı kazan', desc: 'Bir kupa maçı kazan', budget: 80000, xp: 40 },
    season: { target: 1, title: 'Kupa kazan', desc: 'Bir kupa kaldır', budget: 600000, xp: 250, skillPoint: 1 },
    career: { target: 3, title: '3 kupa', desc: 'Kariyerinde 3 kupa kazan', budget: 2000000, xp: 500, skillPoint: 1 },
  },
  {
    metric: 'budget', icon: '💰',
    weekly: { target: 2000000, title: 'Kasayı şişir', desc: 'Kasa $2M üstünde olsun', budget: 60000, xp: 30 },
    season: { target: 5000000, title: '$5M kasa', desc: 'Kasa $5M üstünde olsun', budget: 400000, xp: 180 },
    career: { target: 10000000, title: '$10M kasa', desc: 'Kasa $10M üstünde olsun', budget: 1500000, xp: 400 },
  },
];

/** Metrik → oyun durumundan okunan değer */
function metricValue(state: GameState, metric: MissionMetric): number {
  const cs = state.clubStats;
  switch (metric) {
    case 'wins': return cs.totalWins || 0;
    case 'goals': return cs.totalGoals || 0;
    case 'cleanSheets': return cs.cleanSheets || 0;
    case 'attendance': return cs.totalAttendance || 0;
    case 'minigames': return cs.minigamesWon || 0;
    case 'motm': return cs.motmAwards || 0;
    case 'transfers': return cs.transfers || 0;
    case 'youthPromoted': return cs.youthPromoted || 0;
    case 'penaltyWins': return cs.penaltyWins || 0;
    case 'trophies': return (cs.cupWins || 0) + (cs.leagueTitles || 0);
    case 'budget': return state.budget;
    case 'unbeatenStreak': {
      let streak = 0;
      for (let i = state.matchHistory.length - 1; i >= 0; i--) {
        const m = state.matchHistory[i];
        if (m.homeScore >= m.awayScore) streak++;
        else break;
      }
      return streak;
    }
    default: return 0;
  }
}

function makeMission(
  def: MissionDef,
  type: MissionType,
  state: GameState,
  seq: number
): Mission {
  const cfg = def[type];
  const value = metricValue(state, def.metric);
  return {
    id: `${type}-${def.metric}-${seq}-${Date.now()}`,
    type,
    metric: def.metric,
    icon: def.icon,
    title: cfg.title,
    description: cfg.desc,
    target: cfg.target,
    baseline: ABSOLUTE.includes(def.metric) ? 0 : value,
    progress: ABSOLUTE.includes(def.metric) ? value : 0,
    completed: false,
    rewardBudget: cfg.budget,
    rewardXp: cfg.xp,
    rewardTokens: type === 'weekly' ? 1 : 2,
    rewardSkillPoint: 'skillPoint' in cfg ? (cfg.skillPoint || 0) : 0,
    expiresWeek: type === 'weekly' ? state.week + 4 : undefined,
  };
}

function pickDefs(count: number, exclude: MissionMetric[] = []): MissionDef[] {
  const pool = MISSION_POOL.filter(d => !exclude.includes(d.metric));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function createWeeklyMissions(state: GameState, count = 3): Mission[] {
  return pickDefs(count).map((def, i) => makeMission(def, 'weekly', state, i));
}

export function createSeasonMissions(state: GameState, count = 3): Mission[] {
  return pickDefs(count).map((def, i) => makeMission(def, 'season', state, i));
}

export function createCareerMissions(state: GameState, count = 4): Mission[] {
  const defs = pickDefs(count, ['budget']);
  return defs.map((def, i) => makeMission(def, 'career', state, i));
}

export interface MissionEvaluation {
  missions: Mission[];
  budget: number;
  xp: number;
  tokens: number;
  skillPoints: number;
  completed: { icon: string; title: string; budget: number; xp: number }[];
}

/**
 * Görev ilerlemelerini hesaplar, tamamlananları ödüllendirir.
 * Saf fonksiyon: aynı girdi için aynı çıktıyı üretmez (tamamlanma bir kez işaretlenir),
 * bu yüzden state güncellemesi içinde çağrılıp sonucu uygulanır.
 */
export function evaluateMissions(state: GameState): MissionEvaluation {
  let budget = 0;
  let xp = 0;
  let tokens = 0;
  let skillPoints = 0;
  const completed: { icon: string; title: string; budget: number; xp: number }[] = [];

  const missions = (state.missions || []).map(m => {
    if (m.completed) {
      // ilerlemeyi güncel tut (görsel)
      const value = metricValue(state, m.metric);
      return { ...m, progress: ABSOLUTE.includes(m.metric) ? value : value - m.baseline };
    }
    const value = metricValue(state, m.metric);
    const progress = ABSOLUTE.includes(m.metric) ? value : value - m.baseline;
    if (progress >= m.target) {
      budget += m.rewardBudget;
      xp += m.rewardXp;
      tokens += m.rewardTokens;
      skillPoints += m.rewardSkillPoint;
      completed.push({ icon: m.icon, title: m.title, budget: m.rewardBudget, xp: m.rewardXp });
      return { ...m, progress, completed: true };
    }
    return { ...m, progress };
  });

  return { missions, budget, xp, tokens, skillPoints, completed };
}

/** Süresi geçen haftalık görevleri temizler, yerine yenilerini koyar */
export function refreshWeeklyIfNeeded(state: GameState): Mission[] {
  const current = (state.missions || []).filter(m => m.type !== 'weekly' || (m.expiresWeek ?? 99) >= state.week);
  const weeklyAlive = current.filter(m => m.type === 'weekly' && !m.completed);
  if (weeklyAlive.length === 0 && state.week % 5 === 1) {
    return [...current, ...createWeeklyMissions(state, 3)];
  }
  return current;
}
