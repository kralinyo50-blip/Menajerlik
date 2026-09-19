import {
  createMatchSim, stepSim, simSnapshot, simStats, drainEvents,
  setTeamTactics, substitutePlayer, seedFrom,
} from './match-sim.mjs';

export const STEP_MS = 500;
/** Her tik'te ilerletilen simülasyon süresi: maç başına ~420 sn futbol (90 dakika). */
export const SIM_MS_PER_TICK = 780;
export const MINUTE_MS = 3000;
export const BREAK_MS = 20_000;
const STYLES = ['balanced', 'attack', 'defense', 'possession'];
const ROLES = ['KL', 'STP', 'SB', 'OS', 'FW'];
const FORMATIONS = {
  '4-4-2': [[8,50],[25,17],[22,39],[22,61],[25,83],[48,16],[44,39],[44,61],[48,84],[70,37],[70,63]],
  '4-3-3': [[8,50],[25,17],[22,39],[22,61],[25,83],[43,30],[40,50],[43,70],[67,18],[72,50],[67,82]],
  '3-5-2': [[8,50],[23,27],[20,50],[23,73],[48,12],[42,32],[39,50],[42,68],[48,88],[71,37],[71,63]],
};
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };
const rounded = n => Math.round(n * 100) / 100;

/** Import only football data, never trust an entire career object or client scores. */
export function squadInput(input, strength, name) {
  if (input === undefined) {
    const roles = ['KL', 'SB', 'STP', 'STP', 'SB', 'OS', 'OS', 'OS', 'OS', 'FW', 'FW', 'KL', 'STP', 'OS', 'FW', 'SB', 'OS'];
    const players = roles.map((role, i) => ({ id: `auto-${i}`, name: `${name} ${i + 1}`, role, ovr: strength, energy: 100 }));
    return { starters: players.slice(0, 11), bench: players.slice(11) };
  }
  if (!input || !Array.isArray(input.starters) || input.starters.length !== 11 || !Array.isArray(input.bench) || input.bench.length > 12) fail('Canlı maç için 11 as oyuncu ve en fazla 12 yedek gerekli.', 400);
  const ids = new Set();
  const player = p => {
    if (!p || typeof p.id !== 'string' || !p.id || p.id.length > 80 || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 48 || !ROLES.includes(p.role) || !Number.isFinite(p.ovr) || p.ovr < 1 || p.ovr > 99 || !Number.isFinite(p.energy) || p.energy < 1 || p.energy > 100) fail('Kadroda geçersiz veya tekrarlanan oyuncu var.', 400);
    ids.add(p.id);
    return { id: p.id, name: p.name.trim(), role: p.role, ovr: Math.round(p.ovr), energy: Math.round(p.energy) };
  };
  const squad = { starters: input.starters.map(player), bench: input.bench.map(player) };
  if (squad.starters[0].role !== 'KL') fail('İlk kadro oyuncusu kaleci olmalı.', 400);
  return squad;
}

function event(match, type, text, team = null, playerId = null) {
  match.eventSeq++;
  match.events.push({ id: match.eventSeq, minute: match.minute, type, text, team, playerId });
  if (match.events.length > 100) match.events.shift();
}
function side(member) {
  const squad = squadInput(member.squad, member.strength, member.name);
  const player = p => ({ ...p, yellow: 0, sentOff: false });
  return {
    memberId: member.id, name: member.name, logo: member.logo, style: member.style,
    formation: member.formation || '4-4-2', lineup: squad.starters.map(player), bench: squad.bench.map(player),
    substituted: [], substitutions: 0, pauses: 0, score: 0,
    stats: { shots: 0, onTarget: 0, corners: 0, fouls: 0, saves: 0, offsides: 0, passes: 0, yellow: 0, red: 0 },
  };
}

/**
 * Saha olayları yorum akışına çevrilir. Motorun ürettiği her olay yayınlanmaz;
 * maç akışını anlatan olaylar (gol, kurtarış, kart, korner, faul…) yayınlanır.
 */
const COMMENTARY = new Set([
  'goal', 'save', 'woodwork', 'block', 'penalty', 'offside', 'foul', 'yellow', 'red',
  'corner', 'through', 'cross', 'header', 'shot', 'chance', 'kickoff',
]);
const EVENT_LABELS = {
  woodwork: 'post', chance: 'shot', heading: 'tackle', cutback: 'cross', header: 'shot',
  freekick: 'freekick', interception: 'tackle', 'throw-in': 'throwin', 'goal-kick': 'goalkick',
};

/** Motorun olaylarını istemciye yorum olarak aktarır. */
function syncEvents(match) {
  for (const raw of drainEvents(match.sim)) {
    if (!COMMENTARY.has(raw.type)) continue;
    event(match, EVENT_LABELS[raw.type] ?? raw.type, raw.text, raw.side, raw.playerId);
  }
}

/** Skor, istatistik ve kart bilgisi motordan okunur (tek doğruluk kaynağı saha). */
function syncTeams(match) {
  const stats = simStats(match.sim);
  for (const key of ['home', 'away']) {
    const team = match[key];
    const simSide = match.sim[key];
    const s = stats[key];
    team.score = match.sim.score[key];
    team.stats = {
      shots: s.shots, onTarget: s.onTarget, corners: s.corners, fouls: s.fouls,
      saves: s.saves, offsides: s.offsides, passes: s.passes, yellow: 0, red: 0,
      possession: key === 'home' ? stats.possessionHome : 100 - stats.possessionHome,
      blocks: s.blocks ?? 0, woodwork: s.woodwork ?? 0,
    };
    const byId = new Map(simSide.players.map(p => [p.id, p]));
    for (const player of [...team.lineup, ...team.bench]) {
      const live = byId.get(player.id);
      if (!live) continue;
      player.yellow = live.yellow;
      player.sentOff = live.sentOff;
      player.energy = Math.round(live.energy);
      if (live.sentOff || live.yellow) team.stats[live.sentOff ? 'red' : 'yellow']++;
    }
  }
}

/**
 * Saha karesi: 2D ve 3D izleyiciler aynı sunucu karesini çizer.
 * Oyuncu listesi slotları numarayla eşleşir, böylece oyuncu değişikliklerinde
 * görsel aktör yerinde kalır.
 */
function publishFrame(match) {
  const snap = simSnapshot(match.sim);
  match.players = snap.players.map(p => ({
    id: p.id, side: p.side, number: p.number, x: p.x, y: p.y,
    vx: p.vx, vy: p.vy, action: p.action, facing: p.facing,
    energy: p.energy, yellow: p.yellow, sentOff: p.sentOff,
  }));
  match.ball = {
    x: snap.ball.x, y: snap.ball.y, z: snap.ball.z,
    vx: snap.ball.vx, vy: snap.ball.vy, vz: snap.ball.vz,
    owner: snap.ball.owner, shot: snap.ball.shot, crossing: snap.ball.crossing,
  };
  match.carrierId = snap.carrierId;
  match.celebrating = snap.celebrating;
  match.restart = snap.restart;
  match.possession = snap.possession;
}

/** Motor tarafı: kadro, taktik ve tohum sunucudan; istemci asla simülasyon yapmaz. */
function engineTeam(team) {
  return {
    id: team.memberId, name: team.name, logo: team.logo, style: team.style, formation: team.formation,
    players: team.lineup.map(p => ({ id: p.id, name: p.name, role: p.role, ovr: p.ovr, energy: p.energy })),
  };
}

export function startLiveRound(room, now) {
  if (room.status !== 'playing' || (room.live && !room.live.settled) || room.members.some(m => !m.bot && !m.departed && !m.ready)) return false;
  room.live = {
    week: room.week, season: room.season, settled: false,
    matches: room.matches.filter(m => m.week === room.week).map(fixture => {
      const home = side(room.members.find(m => m.id === fixture.homeId));
      const away = side(room.members.find(m => m.id === fixture.awayId));
      const match = {
        id: `${room.season}:${room.week}:${fixture.homeId}`, week: room.week,
        homeId: fixture.homeId, awayId: fixture.awayId, home, away,
        phase: 'first', minute: 0, elapsedMs: 0, lastTickAt: now, frame: 0,
        phaseEndsAt: null, pausedBy: null, resumePhase: null, possession: 50,
        eventSeq: 0, events: [], commands: [],
        players: [], ball: { x: 50, y: 50, z: 0 }, carrierId: null, celebrating: false, restart: null,
        // Tek doğruluk kaynağı: tohum sunucudan, maç sahadaki motor tarafından oynanır.
        sim: createMatchSim({
          home: engineTeam(home), away: engineTeam(away),
          seed: seedFrom(room.code ?? 'oda', `${room.season}`, `${room.week}`, fixture.homeId, fixture.awayId),
          homeAdvantage: 0.06,
        }),
      };
      event(match, 'kickoff', 'İlk düdük! Ortak canlı maç başladı.');
      publishFrame(match);
      return match;
    }),
  };
  return true;
}

function finish(match) {
  match.minute = 90;
  match.phase = 'finished';
  event(match, 'fulltime', `Maç bitti: ${match.home.name} ${match.home.score}–${match.away.score} ${match.away.name}`);
}

export function advanceLiveRound(room, now) {
  if (!room.live || room.live.settled) return false;
  let changed = false;
  for (const match of room.live.matches) {
    if (match.phase === 'finished') continue;
    while (match.lastTickAt + STEP_MS <= now && match.phase !== 'finished') {
      match.lastTickAt += STEP_MS;
      match.frame++;
      changed = true;
      if (match.phase === 'paused' || match.phase === 'halftime') {
        if (match.lastTickAt >= match.phaseEndsAt) {
          match.phase = match.resumePhase || 'second';
          match.pausedBy = null; match.phaseEndsAt = null; match.resumePhase = null;
          event(match, 'resume', match.minute === 45 ? 'İkinci yarı başladı.' : 'Maç devam ediyor.');
        }
        continue;
      }
      match.elapsedMs += STEP_MS;
      // Saha motoru: aynı adım uzunluğu, gerçek futbol akışı (duran top, faul, ofsayt, şut).
      stepSim(match.sim, SIM_MS_PER_TICK);
      syncEvents(match);
      syncTeams(match);
      publishFrame(match);
      const minute = Math.floor(match.elapsedMs / MINUTE_MS);
      if (minute > match.minute) {
        match.minute = minute;
        if (minute === 45) {
          match.phase = 'halftime'; match.phaseEndsAt = match.lastTickAt + BREAK_MS;
          event(match, 'halftime', 'Devre arası. Taktik ve değişiklik için 20 saniye.');
        } else if (minute >= 90) finish(match);
      }
    }
  }
  if (room.live.matches.every(m => m.phase === 'finished')) {
    // Exactly once: no browser supplies a result, and refresh cannot settle twice.
    for (const match of room.live.matches) {
      const fixture = room.matches.find(m => m.week === room.live.week && m.homeId === match.homeId);
      if (fixture.homeScore !== null) continue;
      fixture.homeScore = match.home.score; fixture.awayScore = match.away.score;
      for (const [id, gf, ga] of [[match.homeId, match.home.score, match.away.score], [match.awayId, match.away.score, match.home.score]]) {
        const stats = room.members.find(m => m.id === id).stats;
        stats.played++; stats.gf += gf; stats.ga += ga;
        if (gf > ga) { stats.won++; stats.points += 3; }
        else if (gf === ga) { stats.drawn++; stats.points++; }
        else stats.lost++;
      }
    }
    room.live.settled = true;
    for (const member of room.members) member.ready = false;
    if (room.week === 18) room.status = 'finished';
    else room.week++;
  }
  return changed;
}

export function liveCommand(room, member, body, now) {
  const match = room.live?.matches.find(m => m.id === body.matchId);
  if (!match || ![match.homeId, match.awayId].includes(member.id)) fail('Yalnızca kendi maçını yönetebilirsin.', 403);
  if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) fail('Geçersiz komut kimliği.', 400);
  const key = `${member.id}:${body.commandId}`;
  if (match.commands.includes(key)) return;
  if (room.live.settled || match.phase === 'finished' || body.week !== room.live.week || body.season !== room.live.season) fail('Bu canlı maç artık yönetilemiyor.');
  const sideKey = match.homeId === member.id ? 'home' : 'away';
  const team = match[sideKey];
  if (body.command === 'tactic') {
    if (!STYLES.includes(body.style) || !Object.hasOwn(FORMATIONS, body.formation)) fail('Geçersiz maç taktiği.', 400);
    team.style = body.style; team.formation = body.formation;
    // Taktik sahaya da yansır: blok yüksekliği, baskı ve şut isteği değişir.
    setTeamTactics(match.sim, sideKey, { style: body.style, formation: body.formation });
    event(match, 'tactic', `${team.name} taktiğini değiştirdi: ${body.formation}.`, sideKey);
  } else if (body.command === 'substitute') {
    if (team.substitutions >= 5) fail('Beş oyuncu değişikliği hakkın doldu.');
    const out = team.lineup.findIndex(p => p.id === body.outId && !p.sentOff);
    const incoming = team.bench.findIndex(p => p.id === body.inId);
    if (out < 0 || incoming < 0) fail('Oyuncu değişikliği geçersiz; kadroyu yeniden kontrol et.');
    if ((out === 0) !== (team.bench[incoming].role === 'KL')) fail('Kaleci yalnızca yedek kaleciyle değiştirilebilir.');
    const before = team.lineup[out];
    const after = team.bench.splice(incoming, 1)[0];
    team.lineup[out] = after;
    team.substituted.push(before); team.substitutions++;
    substitutePlayer(match.sim, sideKey, before.id, after);
    event(match, 'substitution', `${team.name}: ${before.name} çıktı, ${after.name} girdi.`, sideKey, after.id);
  } else if (body.command === 'pause') {
    if (!['first', 'second'].includes(match.phase)) fail('Maç zaten durmuş.');
    if (team.pauses >= 2) fail('İki duraklatma hakkını kullandın.');
    team.pauses++;
    match.resumePhase = match.phase; match.phase = 'paused'; match.pausedBy = member.id;
    match.phaseEndsAt = now + BREAK_MS;
    event(match, 'pause', `${team.name} 20 saniyelik mola aldı.`, sideKey);
  } else if (body.command === 'resume') {
    if (match.phase !== 'paused' || match.pausedBy !== member.id) fail('Yalnızca molayı alan menajer devam ettirebilir.');
    match.phase = match.resumePhase; match.resumePhase = null; match.pausedBy = null; match.phaseEndsAt = null;
    event(match, 'resume', `${team.name} maçı devam ettirdi.`, sideKey);
  } else fail('Bilinmeyen canlı maç komutu.', 400);
  match.commands.push(key);
  if (match.commands.length > 200) match.commands.shift();
  match.frame++;
  syncTeams(match);
  publishFrame(match);
}

export function publicLiveRound(live, viewerId) {
  if (!live) return null;
  return {
    week: live.week, season: live.season, settled: live.settled,
    // Only stream the viewer's field; other matches need a small live scoreboard.
    matches: live.matches.map(({ sim: _sim, commands: _commands, ...match }) => {
      if ([match.homeId, match.awayId].includes(viewerId)) return match;
      return { id: match.id, homeId: match.homeId, awayId: match.awayId, minute: match.minute, phase: match.phase, homeScore: match.home.score, awayScore: match.away.score };
    }),
  };
}
