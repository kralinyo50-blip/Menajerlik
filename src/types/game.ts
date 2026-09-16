// Game Types
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
  matchesPlayed?: number;
  form?: number; // 1-10 form rating
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

export interface Match {
  week: number;
  opponent: string;
  opponentLogo: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
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

export interface GameState {
  teamName: string;
  teamLogo: string;
  team11: Player[];
  bench: Player[];
  league: Team[];
  fixture: Team[];
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
