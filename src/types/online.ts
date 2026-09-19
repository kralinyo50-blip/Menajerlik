export interface OnlinePlayer {
  id: string;
  name: string;
  role: string;
  ovr: number;
  energy: number;
  yellow?: number;
  sentOff?: boolean;
}
export interface OnlineClub {
  name: string;
  logo: string;
  strength: number;
  style: 'balanced' | 'attack' | 'defense' | 'possession';
  formation?: string;
  squad?: { starters: OnlinePlayer[]; bench: OnlinePlayer[] };
}
export interface OnlineMember extends OnlineClub {
  id: string;
  bot: boolean;
  departed: boolean;
  ready: boolean;
  online: boolean;
  canReplace: boolean;
  stats: { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number };
}
export interface OnlineMatch {
  week: number;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
}
export type LivePhase = 'first' | 'halftime' | 'second' | 'paused' | 'finished';
export interface LiveTeamStats {
  shots: number;
  onTarget: number;
  corners: number;
  fouls: number;
  saves: number;
  offsides: number;
  passes: number;
  yellow: number;
  red: number;
  possession: number;
  blocks: number;
  woodwork: number;
}
export interface LiveTeam {
  memberId: string;
  name: string;
  logo: string;
  style: OnlineClub['style'];
  formation: string;
  lineup: OnlinePlayer[];
  bench: OnlinePlayer[];
  substituted: OnlinePlayer[];
  substitutions: number;
  pauses: number;
  score: number;
  stats: LiveTeamStats;
}
export interface LiveEvent {
  id: number;
  minute: number;
  type: string;
  text: string;
  team: 'home' | 'away' | null;
  playerId: string | null;
}
/** Saha karesindeki oyuncu: konum, hız, yön ve anlık hareket (şut, kayarak kurtarış…). */
export interface LivePosition {
  id: string;
  side: 'home' | 'away';
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  action: string;
  facing: number;
  energy: number;
  yellow: number;
  sentOff: boolean;
}
/** Top: yükseklik (z), hız bileşenleri, sahibi ve şut/orta durumu. */
export interface LiveBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  owner: string | null;
  shot: { side: 'home' | 'away'; shooterId: string } | null;
  crossing: boolean;
}
export interface LiveRestart {
  type: string;
  side: 'home' | 'away';
  x: number;
  y: number;
}
export interface LiveScoreboard {
  id: string;
  homeId: string;
  awayId: string;
  minute: number;
  phase: LivePhase;
  homeScore: number;
  awayScore: number;
}
export interface LiveMatch {
  id: string;
  week: number;
  homeId: string;
  awayId: string;
  home: LiveTeam;
  away: LiveTeam;
  phase: LivePhase;
  minute: number;
  elapsedMs: number;
  lastTickAt: number;
  frame: number;
  phaseEndsAt: number | null;
  pausedBy: string | null;
  resumePhase: LivePhase | null;
  possession: number;
  eventSeq: number;
  events: LiveEvent[];
  players: LivePosition[];
  ball: LiveBall;
  /** Sahanın şu anki sahibi (varsa): görsel katman onu işaretler. */
  carrierId: string | null;
  celebrating: boolean;
  restart: LiveRestart | null;
}
export interface OnlineRoom {
  code: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  season: number;
  week: number;
  revision: number;
  updatedAt: number;
  members: OnlineMember[];
  matches: OnlineMatch[];
  live: { week: number; season: number; settled: boolean; matches: (LiveMatch | LiveScoreboard)[] } | null;
}
export interface OnlineSession {
  code: string;
  token: string;
  memberId: string;
}
