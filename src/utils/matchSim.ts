/**
 * Kariyer (offline) maçları için saha motoru köprüsü.
 *
 * Sunucudaki canlı lig ile AYNI motor kullanılır (`server/match-sim.mjs`), yani
 * 3D sahadaki futbol artık süsleme değil: paslar, şutlar, kaleci kurtarışları,
 * duran toplar ve ofsayt gerçekten oynanır. Kariyer skoru yine maç olay motoru
 * tarafından belirlenir; saha o sonucu `scriptOutcome` ile oynar.
 */
import type { GameState, Player, Team } from '../types/game';
import {
  createMatchSim, stepSim, simSnapshot, scriptOutcome, drainEvents, setTeamTactics,
  substitutePlayer, SIM_SPEEDS, seedFrom,
} from '../../server/match-sim.mjs';

export type SimOutcome = 'goal' | 'save' | 'miss' | 'woodwork';
export type SimSide = 'home' | 'away';
export type SimSnapshot = ReturnType<typeof simSnapshot>;
export type MatchSim = ReturnType<typeof createMatchSim>;
export type SimEvent = { type: string; side: SimSide | null; text: string; x: number; y: number };

export { createMatchSim, stepSim, simSnapshot, scriptOutcome, drainEvents, setTeamTactics, substitutePlayer, SIM_SPEEDS, seedFrom };

const ROLE_ORDER = ['KL', 'SB', 'STP', 'STP', 'SB', 'OS', 'OS', 'OS', 'OS', 'FW', 'FW'] as const;

/** Kariyer taktiğini saha motorunun oyun tarzına çevirir. */
function styleOf(gameState: GameState): 'balanced' | 'attack' | 'defense' | 'possession' {
  const tactics = gameState.tactics;
  if (tactics.style) return tactics.style;
  const line = tactics.defensiveLine ?? 50;
  const tempo = tactics.tempoValue ?? 50;
  if (line >= 64) return 'attack';
  if (line <= 38) return 'defense';
  if (tempo >= 62) return 'possession';
  return 'balanced';
}

/** Kullanıcının maç kadrosunu motor kadrosuna çevirir (11 as oyuncu). */
function userPlayers(lineup: Player[]) {
  const starters = lineup.slice(0, 11);
  const players = starters.map((p, i) => ({
    id: `u-${p.id}`, name: p.name, role: p.role, ovr: p.ovr,
    energy: p.injured || p.redCard ? 55 : Math.max(40, Math.round(p.energy ?? 90)),
    number: i + 1,
  }));
  while (players.length < 11) {
    const role = ROLE_ORDER[players.length];
    players.push({ id: `u-fill-${players.length}`, name: `Yedek ${players.length + 1}`, role, ovr: 60, energy: 80, number: players.length + 1 });
  }
  return players;
}

/** Rakip kulübün kadrosu: gücü maç zorluğuna göre ölçeklenir. */
function opponentPlayers(opponent: Team, strength: number) {
  return ROLE_ORDER.map((role, i) => ({
    id: `o-${i + 1}`, name: `${opponent.name} ${i + 1}`, role, ovr: Math.round(strength),
    energy: 100, number: i + 1,
  }));
}

export interface CareerSimOptions {
  gameState: GameState;
  opponent: Team;
  userIsHome: boolean;
  lineup: Player[];
  opponentStrength: number;
  seedKey: string;
}

/**
 * Kariyer maçı için saha motorunu kurar. Ev sahibi avantajı kullanıcının
 * sahasında mı oynadığına bağlıdır; tohum maç kimliğinden gelir (tekrar oynatmada
 * aynı maç çıkar).
 */
export function createCareerSim({ gameState, opponent, userIsHome, lineup, opponentStrength, seedKey }: CareerSimOptions): MatchSim {
  const user = {
    id: 'user', name: gameState.teamName, logo: gameState.teamLogo, style: styleOf(gameState),
    formation: gameState.tactics.formation || '4-4-2', players: userPlayers(lineup.length ? lineup : gameState.team11),
  };
  const rival = {
    id: 'opp', name: opponent.name, logo: opponent.logo, style: 'balanced', formation: '4-4-2',
    players: opponentPlayers(opponent, opponentStrength),
  };
  const home = userIsHome ? user : rival;
  const away = userIsHome ? rival : user;
  // autoScore: kariyer skoru maç olay motoruna aittir; saha yalnızca oynatır.
  const sim = createMatchSim({ home, away, seed: seedFrom('kariyer', seedKey, gameState.teamName, opponent.name), homeAdvantage: 0.06, autoScore: false });
  return sim;
}

/** Kullanıcı tarafının saha tarafı (ev/deplasman). */
export const userSimSide = (userIsHome: boolean): SimSide => (userIsHome ? 'home' : 'away');

/**
 * Kadro değişince motor takımı da güncellenir: yeni giren oyuncu sahaya alınır,
 * enerji/güç güncellenir, kırmızı kart gören oyuncu sahadan çıkar.
 */
export function syncCareerLineup(sim: MatchSim, userIsHome: boolean, lineup: Player[], sentOffIds: number[]) {
  const side = userSimSide(userIsHome);
  const team = sim[side];
  const active = lineup.slice(0, 11);
  const wanted = new Set(active.map(p => `u-${p.id}`));
  const onPitch = new Set(team.players.map(p => p.id));
  for (const player of active) {
    const id = `u-${player.id}`;
    if (onPitch.has(id)) continue;
    const slot = team.players.find(q => q.role === player.role && !wanted.has(q.id));
    if (!slot) continue;
    substitutePlayer(sim, side, slot.id, {
      id, name: player.name, role: player.role, ovr: player.ovr,
      energy: player.injured || player.redCard ? 55 : Math.max(40, Math.round(player.energy ?? 90)),
    });
    onPitch.delete(slot.id);
    onPitch.add(id);
  }
  for (const player of team.players) {
    const source = active.find(p => `u-${p.id}` === player.id);
    if (!source) continue;
    player.ovr = source.ovr;
    player.energy = Math.max(35, Math.round(source.energy ?? player.energy));
  }
  const offIds = new Set(sentOffIds.map(id => `u-${id}`));
  for (const player of team.players) {
    if (offIds.has(player.id)) player.sentOff = true;
  }
}
