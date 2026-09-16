// Game Types

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'wind' | 'fog';

export interface Player {
  id: number;
  name: string;
  ovr: number;
  role: PlayerRole;
  energy: number;
  morale: number;
  goals: number;
  assists: number;
  injured: boolean;
  injuryWeeks: number;
  age: number;
  potential: number;
  value: number;
  wage: number;
  contract: number;
  t?: number; // pitch position top %
  l?: number; // pitch position left %
  yellowCards?: number;
  redCard?: boolean;
  /** Kaç maç cezalı (sarı/kırmızı kart birikimi) */
  suspension?: number;
  matchesPlayed?: number;
  form?: number; // 1-10 form rating
  /** Kulüpten ayrılma talebi (moral çok düşükse) */
  wantsOut?: boolean;
}

export type PlayerRole = 'KL' | 'STP' | 'SB' | 'OS' | 'FW';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'legend';

export interface Team {
  name: string;
  logo: string;
  o: number; // played
  g: number; // wins
  b: number; // draws
  m: number; // losses
  p: number; // points
  gf: number; // goals for
  ga: number; // goals against
  ovr: number;
  isUser: boolean;
}

/** Fikstür satırı: rakip + iç saha mı? */
export interface FixtureEntry extends Team {
  isHome: boolean;
  week: number;
}

export interface Match {
  week: number;
  opponent: string;
  opponentLogo: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  weather?: Weather;
  attendance?: number;
  /** Penaltılarla kazanan taraf (kupa) */
  penalties?: string;
}

export interface Investment {
  id: number;
  name: string;
  price: number;
  type: string;
  owned: number;
  lastChange: number;
  icon: string;
}

export interface Sponsor {
  name: string;
  income: number;
  duration: number;
  desc: string;
  icon: string;
}

export interface Staff {
  id: number;
  type: 'coach' | 'scout' | 'physio' | 'analyst';
  name: string;
  level: number;
  salary: number;
}

export interface Tactics {
  formation: string;
  style: 'balanced' | 'attack' | 'defense' | 'possession';
  pressing: 'low' | 'medium' | 'high';
  tempo: 'slow' | 'normal' | 'fast';
}

export interface CupMatch {
  round: string;
  opponent: Team;
  played: boolean;
  userScore?: number;
  oppScore?: number;
  /** Penaltı atışları sonucu: 'user' | 'opponent' */
  penaltyWinner?: 'user' | 'opponent';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedWeek?: number;
  reward?: number;
}

/** Rakip kulüplerin oyuncularına ait lig istatistiği */
export interface LeagueScorer {
  name: string;
  club: string;
  logo: string;
  goals: number;
  assists: number;
}

/** Rakip kulüpten gelen transfer teklifi */
export interface TransferOffer {
  id: number;
  playerId: number;
  playerName: string;
  playerOvr: number;
  fromClub: string;
  fromLogo: string;
  amount: number;
  week: number;
  expiresWeek: number;
}

/** Maç sonu oyuncu performansı */
export interface PlayerRating {
  playerId: number;
  name: string;
  role: PlayerRole;
  rating: number;
  goals: number;
  assists: number;
  yellow: boolean;
  red: boolean;
  injured: boolean;
}

export interface MatchReport {
  userScore: number;
  oppScore: number;
  opponentName: string;
  opponentLogo: string;
  isHome: boolean;
  weather: Weather;
  attendance: number;
  possession: number;
  shots: { home: number; away: number };
  motm: string;
  ratings: PlayerRating[];
  penaltyWinner?: 'user' | 'opponent';
}

export type TrainingFocus = 'balanced' | 'attack' | 'defense' | 'fitness' | 'youth';

/* ══════════ GÖREV / MİSYON SİSTEMİ ══════════ */
export type MissionMetric =
  | 'wins' | 'goals' | 'cleanSheets' | 'penaltyWins' | 'motm' | 'attendance'
  | 'minigames' | 'transfers' | 'youthPromoted' | 'trophies' | 'unbeatenStreak' | 'budget';

export type MissionType = 'weekly' | 'season' | 'career';

export interface Mission {
  id: string;
  type: MissionType;
  metric: MissionMetric;
  icon: string;
  title: string;
  description: string;
  target: number;
  baseline: number;
  progress: number;
  completed: boolean;
  rewardBudget: number;
  rewardXp: number;
  rewardTokens: number;
  rewardSkillPoint: number;
  expiresWeek?: number;
}

/* ══════════ MENAJER GELİŞİMİ ══════════ */
export type SkillId =
  | 'tactics' | 'motivation' | 'fitness' | 'negotiation'
  | 'scouting' | 'youth' | 'medical' | 'media';

export type SkillTree = Record<SkillId, number>;

export interface GameState {
  teamName: string;
  teamLogo: string;
  team11: Player[];
  bench: Player[];
  league: Team[];
  fixture: FixtureEntry[];
  marketList: Player[];
  week: number;
  season: number;
  budget: number;
  stadiumLvl: number;
  trainingLvl: number;
  healthLvl: number;
  scoutLvl: number;
  academyLevel: number;
  leagueLevel: number;
  trophies: string[];
  activeSponsor: (Sponsor & { weeksLeft: number }) | null;
  staff: Staff[];
  academyPlayers: Player[];
  matchHistory: Match[];
  clubStats: {
    totalGoals: number;
    totalWins: number;
    totalDraws: number;
    totalLosses: number;
    cupWins: number;
    leagueTitles: number;
    cleanSheets: number;
    penaltiesScored: number;
    minigamesWon: number;
    totalAttendance?: number;
    motmAwards?: number;
    redCards?: number;
    transfers?: number;
    youthPromoted?: number;
    penaltyWins?: number;
  };
  tactics: Tactics;
  investments: Investment[];
  cupMatches: CupMatch[];
  cupEliminated: boolean;
  seasonObjective: string;
  managerRep: number;
  news: string[];
  shopBranches: ShopBranchData[];
  difficulty: Difficulty;
  achievements: Achievement[];
  tutorialDone: boolean;
  minigameTokens: number;
  lastSpinWeek: number;
  fanHappiness: number;
  teamChemistry: number;
  boardConfidence: number;
  // ── v3: Kariyer Sistemi ──
  captainId: number | null;
  setPieceTakers: {
    penalty: number | null;
    freekick: number | null;
    corner: number | null;
  };
  trainingFocus: TrainingFocus;
  leagueScorers: LeagueScorer[];
  transferOffers: TransferOffer[];
  weather: Weather;
  soundOn: boolean;
  /** Yönetim kaç kez resmi uyarı verdi */
  boardWarnings: number;
  /** Kariyer sona erdi mi (kovulma) */
  careerOver: boolean;
  careerOverReason: string | null;
  /** Yönetim kurulundan gelen mesajlar */
  boardMessages: string[];
  // ── v3.1: Kariyer & İlerleme ──
  managerXp: number;
  managerLevel: number;
  skillPoints: number;
  skills: SkillTree;
  missions: Mission[];
  /** Günlük giriş ödülü takibi */
  lastPlayedDate: string;
  loginStreak: number;
  /** Son gün gösterilen günlük ödül (modal için) */
  lastDailyReward?: { day: number; budget: number; tokens: number } | null;
}

export interface ShopBranchData {
  id: string;
  cityId: number;
  district: string;
  shopType: 'small' | 'medium' | 'large' | 'flagship';
  openedWeek: number;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'save' | 'chance' | 'foul' | 'injury' | 'substitution' | 'card' | 'penalty' | 'var' | 'info';
  team: 'home' | 'away';
  player?: string;
  description: string;
}
