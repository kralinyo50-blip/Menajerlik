import { randomInt } from 'node:crypto';

export const STEP_MS = 500;
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
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
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

function random(match) {
  let x = match.rng | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  match.rng = x >>> 0;
  return match.rng / 4294967296;
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
    stats: { shots: 0, onTarget: 0, corners: 0, fouls: 0 },
  };
}

export function startLiveRound(room, now) {
  if (room.status !== 'playing' || (room.live && !room.live.settled) || room.members.some(m => !m.bot && !m.departed && !m.ready)) return false;
  room.live = {
    week: room.week, season: room.season, settled: false,
    matches: room.matches.filter(m => m.week === room.week).map(fixture => {
      const match = {
        id: `${room.season}:${room.week}:${fixture.homeId}`, week: room.week,
        homeId: fixture.homeId, awayId: fixture.awayId, home: side(room.members.find(m => m.id === fixture.homeId)), away: side(room.members.find(m => m.id === fixture.awayId)),
        phase: 'first', minute: 0, elapsedMs: 0, lastTickAt: now, frame: 0,
        phaseEndsAt: null, pausedBy: null, resumePhase: null, possession: 50,
        rng: randomInt(1, 0x7fffffff), eventSeq: 0, events: [], commands: [],
        players: [], ball: { x: 50, y: 50, z: 0 },
      };
      event(match, 'kickoff', 'İlk düdük! Ortak canlı maç başladı.');
      positions(match);
      return match;
    }),
  };
  return true;
}

const power = team => {
  const active = team.lineup.filter(p => !p.sentOff);
  return active.reduce((sum, p) => sum + p.ovr * (0.75 + p.energy / 400), 0) / 11;
};

function simulateMinute(match) {
  const homePower = power(match.home), awayPower = power(match.away);
  match.possession = Math.round(clamp(50 + (homePower - awayPower) / 2 + (match.home.style === 'possession' ? 8 : 0) - (match.away.style === 'possession' ? 8 : 0), 25, 75));
  for (const key of ['home', 'away']) {
    const team = match[key], other = match[key === 'home' ? 'away' : 'home'];
    const available = team.lineup.filter(p => !p.sentOff);
    for (const p of available) p.energy = rounded(Math.max(20, p.energy - (team.style === 'attack' ? 0.48 : 0.35)));
    const player = available[1 + Math.floor(random(match) * Math.max(1, available.length - 1))] || available[0];
    const chance = 0.13 + (team.style === 'attack' ? 0.04 : team.style === 'defense' ? -0.035 : 0) + (key === 'home' ? 0.015 : 0) + (power(team) - power(other)) / 2000;
    if (random(match) < chance && player) {
      team.stats.shots++;
      if (random(match) < 0.55) {
        team.stats.onTarget++;
        const conversion = clamp(0.27 + (power(team) - power(other)) / 160 + (other.style === 'attack' ? 0.07 : other.style === 'defense' ? -0.06 : 0), 0.08, 0.65);
        if (random(match) < conversion) {
          team.score++;
          event(match, 'goal', `GOL! ${team.name} — ${player.name}`, key, player.id);
        } else event(match, 'save', `${player.name} kaleyi buldu, kaleci kurtardı!`, key, player.id);
      } else if (random(match) < 0.35) {
        team.stats.corners++;
        event(match, 'corner', `${team.name} korner kazanıyor.`, key, player.id);
      } else event(match, 'shot', `${player.name} şutunu çekti, top dışarıda.`, key, player.id);
    }
    if (player && random(match) < 0.045) {
      team.stats.fouls++;
      if (random(match) < 0.45) {
        player.yellow++;
        if (player.yellow >= 2 && available.length > 7) {
          player.sentOff = true;
          event(match, 'red', `${player.name} ikinci sarıdan kırmızı kart!`, key, player.id);
        } else event(match, 'yellow', `${player.name} sarı kart görüyor.`, key, player.id);
      } else event(match, 'foul', `${player.name} faul yaptı.`, key, player.id);
    }
  }
}

/** One authoritative world frame, shared by the 2D and 3D viewers. No client simulation. */
function positions(match) {
  const t = match.elapsedMs / 1000;
  const recent = match.events[match.events.length - 1];
  const shot = recent && ['goal', 'shot', 'save', 'corner'].includes(recent.type) && match.minute - recent.minute < 1;
  const possessionHome = Math.sin(t * 0.28) * 35 + 50 < match.possession;
  let ballX = 50 + Math.sin(t * 0.43) * 26;
  let ballY = 50 + Math.sin(t * 0.71 + 1.2) * 29;
  let z = Math.max(0, Math.sin(t * 2.1)) * 0.7;
  if (shot) {
    ballX = recent.team === 'home' ? 95 : 5;
    ballY = 50 + Math.sin(t * 0.9) * 5;
    z = recent.type === 'goal' ? 0.2 : 1.4;
  }
  if (match.phase === 'halftime' || match.phase === 'finished') { ballX = 50; ballY = 50; z = 0; }
  match.ball = { x: rounded(ballX), y: rounded(ballY), z: rounded(z) };
  match.players = [];
  for (const key of ['home', 'away']) {
    const team = match[key];
    const anchors = FORMATIONS[team.formation];
    const forward = team.style === 'attack' ? 5 : team.style === 'defense' ? -6 : 0;
    team.lineup.forEach((player, i) => {
      if (player.sentOff) return;
      const [baseX, baseY] = anchors[i];
      const offset = i === 0 ? 0 : forward + (possessionHome === (key === 'home') ? 4 : -3);
      const x = clamp(baseX + offset + (i === 0 ? 0 : Math.sin(t * 0.7 + i * 1.7) * 4) + (ballX - 50) * 0.07, 5, 92);
      const y = clamp(baseY + Math.cos(t * 0.55 + i * 1.9) * (i === 0 ? 2 : 4), 5, 95);
      match.players.push({ id: player.id, side: key, number: i + 1, x: rounded(key === 'home' ? x : 100 - x), y: rounded(y) });
    });
  }
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
      const minute = Math.floor(match.elapsedMs / MINUTE_MS);
      if (minute > match.minute) {
        match.minute = minute;
        simulateMinute(match);
        if (minute === 45) {
          match.phase = 'halftime'; match.phaseEndsAt = match.lastTickAt + BREAK_MS;
          event(match, 'halftime', 'Devre arası. Taktik ve değişiklik için 20 saniye.');
        } else if (minute >= 90) finish(match);
      }
      positions(match);
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
  positions(match);
}

export function publicLiveRound(live, viewerId) {
  if (!live) return null;
  return {
    week: live.week, season: live.season, settled: live.settled,
    // Only stream the viewer's field; other matches need a small live scoreboard.
    matches: live.matches.map(({ rng: _rng, commands: _commands, ...match }) => {
      if ([match.homeId, match.awayId].includes(viewerId)) return match;
      return { id: match.id, homeId: match.homeId, awayId: match.awayId, minute: match.minute, phase: match.phase, homeScore: match.home.score, awayScore: match.away.score };
    }),
  };
}
