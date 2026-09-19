/** Saha motorunun tip bildirimleri (tarayıcı ve sunucu aynı motoru kullanır). */
export type SimSide = 'home' | 'away';
export type SimOutcome = 'goal' | 'save' | 'miss' | 'woodwork';
export interface SimPlayerInput {
  id: string;
  name: string;
  role: string;
  ovr?: number;
  energy?: number;
  number?: number;
}
export interface SimTeamInput {
  id: string;
  name: string;
  logo?: string;
  style?: string;
  formation?: string;
  players: SimPlayerInput[];
}
export interface SimPlayerState {
  id: string;
  side: SimSide;
  number: number;
  role: string;
  name: string;
  ovr: number;
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
export interface SimSnapshot {
  time: number;
  score: { home: number; away: number };
  possession: number;
  ball: {
    x: number; y: number; z: number; vx: number; vy: number; vz: number; spin: number;
    owner: string | null;
    shot: { side: SimSide; shooterId: string } | null;
    crossing: boolean;
  };
  restart: { type: string; side: SimSide; x: number; y: number } | null;
  celebrating: boolean;
  carrierId: string | null;
  players: SimPlayerState[];
  stats: { home: SimStats; away: SimStats };
}
export interface SimStats {
  shots: number;
  onTarget: number;
  goals: number;
  saves: number;
  corners: number;
  throwIns: number;
  fouls: number;
  offsides: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  interceptions: number;
  clearances: number;
  crosses: number;
  woodwork: number;
  blocks: number;
}
export interface SimEvent {
  seq: number;
  type: string;
  t: number;
  side: SimSide | null;
  playerId: string | null;
  text: string;
  x: number;
  y: number;
}
export interface MatchSimState {
  seed: number;
  homeAdvantage: number;
  home: Record<string, unknown> & { players: SimPlayerState[] };
  away: Record<string, unknown> & { players: SimPlayerState[] };
  ball: SimSnapshot['ball'];
  score: { home: number; away: number };
  time: number;
  events: SimEvent[];
  restart: SimSnapshot['restart'];
  celebrationUntil: number;
  [key: string]: unknown;
}
export declare function createMatchSim(options: { home: SimTeamInput; away: SimTeamInput; seed?: number; homeAdvantage?: number; autoScore?: boolean }): MatchSimState;
export declare function stepSim(sim: MatchSimState, dtMs: number): void;
export declare function simSnapshot(sim: MatchSimState): SimSnapshot;
export declare function simStats(sim: MatchSimState): { possessionHome: number; home: SimStats; away: SimStats };
export declare function drainEvents(sim: MatchSimState): SimEvent[];
export declare function setTeamTactics(sim: MatchSimState, key: SimSide, options?: { style?: string; formation?: string }): void;
export declare function substitutePlayer(sim: MatchSimState, key: SimSide, outId: string, incoming: SimPlayerInput): boolean;
export declare function markSentOff(sim: MatchSimState, key: SimSide, playerId: string): void;
export declare function scriptOutcome(sim: MatchSimState, key: SimSide, outcome: SimOutcome, seconds?: number): void;
export declare function seedFrom(...parts: string[]): number;
export declare function simPossessionSide(sim: MatchSimState): SimSide | null;
export declare const SIM_SPEEDS: { jog: number; run: number; sprint: number; pass: number; long: number; shot: number; cross: number; throwIn: number };
export declare const FORMATIONS: Record<string, number[][]>;
