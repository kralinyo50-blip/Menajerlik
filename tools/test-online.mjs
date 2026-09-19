import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOnlineApi, makeFixture } from '../server/online.mjs';
import { MINUTE_MS, BREAK_MS } from '../server/live-match.mjs';

const club = (name = 'Anadolu FK') => ({ name, logo: '⚽', strength: 72, style: 'balanced' });
async function fixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'manager-online-'));
  const dataFile = join(directory, 'rooms.json');
  let clock = Date.now();
  let server, base, api;
  async function start() {
    api = createOnlineApi({ dataFile, now: () => clock, autoTick: false, ...options });
    server = createServer(api);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}/api/online/`;
  }
  async function stop() { api.close(); await new Promise(resolve => server.close(resolve)); }
  await start();
  t.after(async () => { await stop(); rmSync(directory, { recursive: true, force: true }); });
  async function req(path, body, token, headers = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { 'X-Member-Token': token } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, ...await response.json() };
  }
  async function create(name = 'Anadolu FK') { return req('rooms', { club: club(name) }); }
  async function pair() {
    const host = await create();
    const guest = await req(`rooms/${host.room.code}/join`, { club: club('Kıyı Spor') });
    return { host, guest, path: `rooms/${host.room.code}` };
  }
  async function h2h() {
    const host = await create();
    const path = `rooms/${host.room.code}`;
    const others = [];
    for (let i = 0; i < 8; i++) others.push(await req(path + '/join', { club: club(`Menajer ${i}`) }));
    const guest = await req(path + '/join', { club: club('Kıyı Spor') });
    await req(path + '/start', {}, host.token);
    for (const user of [host, ...others, guest]) await req(path + '/ready', { week: 1, season: 1, ready: true, club: club() }, user.token);
    const room = (await req(path, undefined, host.token)).room;
    return { host, guest, others, path, match: room.live.matches.find(m => m.home) };
  }
  async function finishWeek(path, token) {
    clock += 90 * MINUTE_MS + BREAK_MS + 60_000;
    return req(path, undefined, token);
  }
  return { req, create, pair, h2h, finishWeek, url: () => base, dataFile, advance: ms => { clock += ms; }, restart: async () => { await stop(); await start(); } };
}

test('round-robin has 18 weeks, 90 unique home/away games and no double bookings', () => {
  const ids = Array.from({ length: 10 }, (_, i) => String(i));
  const matches = makeFixture(ids);
  assert.equal(matches.length, 90);
  assert.equal(new Set(matches.map(m => `${m.homeId}:${m.awayId}`)).size, 90);
  for (let week = 1; week <= 18; week++) {
    const games = matches.filter(m => m.week === week);
    assert.equal(games.length, 5);
    assert.equal(new Set(games.flatMap(m => [m.homeId, m.awayId])).size, 10);
  }
});

test('codes join real shared rooms; auth secrets never leak and duplicate names fail', async t => {
  const f = await fixture(t);
  const { host, guest, path } = await f.pair();
  assert.equal(host.status, 201);
  assert.match(host.room.code, /^[A-Z2-9]{8}$/);
  assert.equal(guest.room.members.length, 2);
  assert.equal((await f.req(path)).status, 401);
  assert.equal((await f.req(path, undefined, 'a'.repeat(64))).status, 401);
  const state = await f.req(path, undefined, host.token);
  assert.equal(state.room.members.length, 2);
  assert.ok(!JSON.stringify(state.room).includes('token'));
  assert.equal((await f.req(path + '/join', { club: club('ANADOLU FK') })).status, 409);
  assert.equal((await f.req('rooms/ABCDEFGH/join', { club: club() })).status, 404);
});

test('host-only start, minimum users, capacity and late joins are enforced', async t => {
  const f = await fixture(t);
  const host = await f.create();
  const path = `rooms/${host.room.code}`;
  assert.equal((await f.req(path + '/start', {}, host.token)).status, 409);
  const guest = await f.req(path + '/join', { club: club('İkinci') });
  assert.equal((await f.req(path + '/start', {}, guest.token)).status, 403);
  for (let i = 2; i < 10; i++) assert.equal((await f.req(path + '/join', { club: club(`Takım ${i}`) })).status, 200);
  assert.equal((await f.req(path + '/join', { club: club('Dolu') })).status, 409);
  const started = await f.req(path + '/start', {}, host.token);
  assert.equal(started.room.members.length, 10);
  assert.equal(started.room.matches.length, 90);
  assert.equal((await f.req(path + '/join', { club: club('Geç gelen') })).status, 409);
  assert.equal((await f.req(path + '/start', {}, host.token)).status, 409);
});

test('concurrent readiness advances once, syncs scores, rejects stale and forged requests', async t => {
  const f = await fixture(t);
  const { host, guest, path } = await f.pair();
  await f.req(path + '/start', {}, host.token);
  const body = { ready: true, week: 1, season: 1, club: club() };
  assert.equal((await f.req(path + '/ready', { ...body, club: { ...club(), strength: 999 } }, host.token)).status, 400);
  assert.equal((await f.req(path + '/ready', { ...body, ready: 'true' }, host.token)).status, 400);
  assert.equal((await f.req(path + '/ready', body, host.token)).room.week, 1);
  assert.equal((await f.req(path + '/ready', { ...body, ready: false }, host.token)).room.members.find(m => m.id === host.memberId).ready, false);
  await Promise.all([f.req(path + '/ready', body, host.token), f.req(path + '/ready', body, guest.token)]);
  const live = (await f.req(path, undefined, host.token)).room;
  assert.equal(live.week, 1);
  assert.equal(live.live.matches.length, 5);
  assert.equal(live.members[0].stats.played, 0);
  assert.equal((await f.req(path + '/ready', body, host.token)).status, 409);
  await f.finishWeek(path, host.token);
  const a = (await f.req(path, undefined, host.token)).room;
  const b = (await f.req(path, undefined, guest.token)).room;
  assert.deepEqual(a.members.map(m => [m.id, m.stats, m.ready]), b.members.map(m => [m.id, m.stats, m.ready]));
  assert.deepEqual(a.matches, b.matches);
  assert.equal(a.week, 2);
  assert.equal(a.matches.filter(m => m.homeScore !== null).length, 5);
  assert.ok(a.members.every(m => m.stats.played === 1 && !m.ready));
  assert.equal((await f.req(path + '/ready', body, host.token)).status, 409);
  assert.equal((await f.req(path, undefined, host.token)).room.week, 2);
});

test('full season produces consistent standings and host opens a fresh lobby with same code', async t => {
  const f = await fixture(t);
  const { host, guest, path } = await f.pair();
  await f.req(path + '/start', {}, host.token);
  let result;
  for (let week = 1; week <= 18; week++) {
    const body = { ready: true, week, season: 1, club: club() };
    await f.req(path + '/ready', body, host.token);
    result = await f.req(path + '/ready', body, guest.token);
    assert.equal(result.status, 200);
    result = await f.finishWeek(path, host.token);
  }
  assert.equal(result.room.status, 'finished');
  assert.ok(result.room.members.every(m => m.stats.played === 18));
  for (const m of result.room.members) {
    const matches = result.room.matches.filter(x => x.homeId === m.id || x.awayId === m.id);
    const expected = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
    for (const match of matches) {
      const [gf, ga] = match.homeId === m.id ? [match.homeScore, match.awayScore] : [match.awayScore, match.homeScore];
      expected.played++; expected.gf += gf; expected.ga += ga;
      if (gf > ga) { expected.won++; expected.points += 3; }
      else if (gf === ga) { expected.drawn++; expected.points++; }
      else expected.lost++;
    }
    assert.deepEqual(m.stats, expected);
  }
  assert.equal((await f.req(path + '/new-season', {}, guest.token)).status, 403);
  const next = await f.req(path + '/new-season', {}, host.token);
  assert.equal(next.room.season, 2);
  assert.equal(next.room.code, host.room.code);
  assert.equal(next.room.status, 'lobby');
  assert.equal(next.room.members.length, 2);
  assert.ok(next.room.members.every(m => m.stats.points === 0));
  assert.equal((await f.req(path + '/join', { club: club('Yeni takım') })).status, 200);
});

test('server restart preserves sessions, table, results and readiness', async t => {
  const f = await fixture(t);
  const { host, guest, path } = await f.pair();
  await f.req(path + '/start', {}, host.token);
  await f.req(path + '/ready', { ready: true, week: 1, season: 1, club: club() }, host.token);
  const before = (await f.req(path, undefined, host.token)).room;
  const disk = readFileSync(f.dataFile, 'utf8');
  assert.ok(!disk.includes(host.token));
  await f.restart();
  const after = (await f.req(path, undefined, guest.token)).room;
  assert.deepEqual(before.matches, after.matches);
  assert.deepEqual(before.members.map(m => [m.id, m.ready, m.stats]), after.members.map(m => [m.id, m.ready, m.stats]));
  assert.equal((await f.req(path + '/ready', { ready: true, week: 1, season: 1, club: club() }, guest.token)).room.week, 1);
  assert.equal((await f.finishWeek(path, guest.token)).room.week, 2);
});

test('host departure transfers ownership; abandoned team plays as bot and token is revoked', async t => {
  const f = await fixture(t);
  const { host, guest, path } = await f.pair();
  await f.req(path + '/start', {}, host.token);
  assert.equal((await f.req(path + '/leave', {}, host.token)).status, 200);
  const state = (await f.req(path, undefined, guest.token)).room;
  assert.equal(state.hostId, guest.memberId);
  assert.equal(state.members.find(m => m.id === host.memberId).departed, true);
  assert.equal((await f.req(path, undefined, host.token)).status, 401);
  assert.equal((await f.req(path + '/ready', { ready: true, week: 1, season: 1, club: club() }, guest.token)).room.week, 1);
  assert.equal((await f.finishWeek(path, guest.token)).room.week, 2);
  await f.req(path + '/leave', {}, guest.token);
  assert.equal((await f.req(path, undefined, guest.token)).status, 404);
});

test('disconnected host can be replaced after grace period but not while connected', async t => {
  const f = await fixture(t);
  const { host, guest, path } = await f.pair();
  await f.req(path + '/start', {}, host.token);
  assert.equal((await f.req(path + '/claim-host', {}, guest.token)).status, 409);
  assert.equal((await f.req(path + '/replace', { memberId: guest.memberId }, host.token)).status, 409);
  f.advance(61_000);
  assert.equal((await f.req(path + '/claim-host', {}, guest.token)).room.hostId, guest.memberId);
  const state = await f.req(path + '/replace', { memberId: host.memberId }, guest.token);
  assert.equal(state.room.members.find(m => m.id === host.memberId).departed, true);
  assert.equal((await f.req(path, undefined, host.token)).status, 401);
});

test('input bounds, origin checking and room expiry', async t => {
  const f = await fixture(t);
  assert.equal((await f.req('rooms', { club: club('') })).status, 400);
  assert.equal((await f.req('rooms', { club: club('a'.repeat(33)) })).status, 400);
  assert.equal((await f.req('rooms', { club: { ...club(), style: 'invalid' } })).status, 400);
  assert.equal((await f.req('rooms', { club: club() }, null, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await f.req('rooms', { junk: 'a'.repeat(20_000) })).status, 413);
  const host = await f.create();
  f.advance(31 * 24 * 60 * 60 * 1000);
  assert.equal((await f.req(`rooms/${host.room.code}`, undefined, host.token)).status, 404);
});

test('corrupt persistence fails loudly instead of deleting leagues', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'manager-corrupt-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const dataFile = join(directory, 'rooms.json');
  writeFileSync(dataFile, '{bad json');
  assert.throws(() => createOnlineApi({ dataFile }));
  assert.equal(readFileSync(dataFile, 'utf8'), '{bad json');
});

const ownMatch = room => room.live.matches.find(m => m.home);
const command = (match, name, extra = {}) => ({ matchId: match.id, commandId: crypto.randomUUID(), week: match.week, season: 1, command: name, ...extra });

test('head-to-head opponents receive the exact same clock, score, events, squads and field frames', async t => {
  const f = await fixture(t);
  const { host, guest, path, match } = await f.h2h();
  assert.equal(match.homeId, host.memberId);
  assert.equal(match.awayId, guest.memberId);
  assert.equal(match.minute, 0);
  assert.equal(match.players.length, 22);
  for (const delta of [500, 2500, 9000, 30_000]) {
    f.advance(delta);
    const a = ownMatch((await f.req(path, undefined, host.token)).room);
    const b = ownMatch((await f.req(path, undefined, guest.token)).room);
    assert.deepEqual(a, b);
    assert.ok(a.frame > match.frame);
    assert.ok(a.players.every(p => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100));
    assert.ok(!('rng' in a));
    assert.ok(!('commands' in a));
  }
  const finished = await f.finishWeek(path, host.token);
  const result = ownMatch(finished.room);
  assert.equal(result.phase, 'finished');
  assert.equal(result.minute, 90);
  assert.equal(result.home.score, result.events.filter(e => e.type === 'goal' && e.team === 'home').length);
  assert.equal(result.away.score, result.events.filter(e => e.type === 'goal' && e.team === 'away').length);
  const again = await f.req(path, undefined, guest.token);
  assert.deepEqual(result, ownMatch(again.room));
  assert.ok(again.room.members.every(m => m.stats.played === 1));
});

test('live tactics and substitutions are server-authoritative, mirrored, and idempotent', async t => {
  const f = await fixture(t);
  const { host, guest, others, path, match } = await f.h2h();
  const tactic = command(match, 'tactic', { style: 'attack', formation: '4-3-3' });
  assert.equal((await f.req(path + '/live-command', tactic, others[0].token)).status, 403);
  assert.equal((await f.req(path + '/live-command', { ...tactic, formation: 'bad' }, host.token)).status, 400);
  assert.equal((await f.req(path + '/live-command', tactic, host.token)).status, 200);
  let current = ownMatch((await f.req(path, undefined, guest.token)).room);
  assert.equal(current.home.style, 'attack');
  assert.equal(current.away.style, 'balanced');
  assert.equal(current.home.formation, '4-3-3');
  assert.ok(current.events.some(e => e.type === 'tactic'));
  const substitution = command(match, 'substitute', { outId: current.away.lineup[1].id, inId: current.away.bench[1].id });
  const result = await f.req(path + '/live-command', substitution, guest.token);
  assert.equal(result.status, 200);
  await f.req(path + '/live-command', substitution, guest.token);
  current = ownMatch((await f.req(path, undefined, host.token)).room);
  assert.equal(current.away.substitutions, 1);
  assert.equal(current.away.lineup[1].id, substitution.inId);
  assert.ok(!current.away.bench.some(p => p.id === substitution.outId));
  assert.equal(current.events.filter(e => e.type === 'substitution').length, 1);
  const invalid = command(match, 'substitute', { outId: current.away.lineup[2].id, inId: substitution.outId });
  assert.equal((await f.req(path + '/live-command', invalid, guest.token)).status, 409);
  assert.equal((await f.req(path + '/live-command', { ...tactic, commandId: crypto.randomUUID(), week: 99 }, host.token)).status, 409);
});

test('five-substitution limit, goalkeeper roles, roster bounds and re-entry checks', async t => {
  const f = await fixture(t);
  const { host, path, match } = await f.h2h();
  const wrongKeeper = command(match, 'substitute', { outId: match.home.lineup[0].id, inId: match.home.bench[1].id });
  assert.equal((await f.req(path + '/live-command', wrongKeeper, host.token)).status, 409);
  for (let i = 0; i < 5; i++) {
    const sub = command(match, 'substitute', { outId: match.home.lineup[i].id, inId: match.home.bench[i].id });
    assert.equal((await f.req(path + '/live-command', sub, host.token)).status, 200);
  }
  const sixth = command(match, 'substitute', { outId: match.home.lineup[5].id, inId: match.home.bench[5].id });
  assert.equal((await f.req(path + '/live-command', sixth, host.token)).status, 409);
  const duplicate = { starters: Array.from({ length: 11 }, () => ({ id:'same', name:'Player', role:'KL', ovr:75, energy:100 })), bench:[] };
  assert.equal((await f.req('rooms', { club: { ...club('Invalid'), squad:duplicate } })).status, 400);
});

test('shared pause freezes both clocks, only initiator can resume, and pauses auto-expire', async t => {
  const f = await fixture(t);
  const { host, guest, path, match } = await f.h2h();
  f.advance(12_000);
  const paused = await f.req(path + '/live-command', command(match, 'pause'), host.token);
  const before = ownMatch(paused.room);
  assert.equal(before.minute, 4);
  assert.equal(before.phase, 'paused');
  f.advance(10_000);
  const other = ownMatch((await f.req(path, undefined, guest.token)).room);
  assert.equal(other.elapsedMs, before.elapsedMs);
  assert.deepEqual(other.ball, before.ball);
  assert.equal((await f.req(path + '/live-command', command(match, 'resume'), guest.token)).status, 409);
  assert.equal((await f.req(path + '/live-command', command(match, 'resume'), host.token)).status, 200);
  await f.req(path + '/live-command', command(match, 'pause'), host.token);
  f.advance(BREAK_MS + 3000);
  const resumed = ownMatch((await f.req(path, undefined, host.token)).room);
  assert.equal(resumed.phase, 'first');
  assert.equal(resumed.minute, 5);
  assert.equal((await f.req(path + '/live-command', command(match, 'pause'), host.token)).status, 409);
});

test('halftime is shared, timed and controllable without advancing league early', async t => {
  const f = await fixture(t);
  const { host, guest, path, match } = await f.h2h();
  f.advance(45 * MINUTE_MS);
  let state = await f.req(path, undefined, host.token);
  assert.equal(ownMatch(state.room).phase, 'halftime');
  assert.equal(state.room.week, 1);
  f.advance(BREAK_MS - 500);
  assert.equal(ownMatch((await f.req(path, undefined, guest.token)).room).minute, 45);
  assert.equal((await f.req(path + '/live-command', command(match, 'tactic', { style:'defense', formation:'3-5-2' }), guest.token)).status, 200);
  f.advance(500 + MINUTE_MS);
  state = await f.req(path, undefined, host.token);
  assert.equal(ownMatch(state.room).phase, 'second');
  assert.equal(ownMatch(state.room).minute, 46);
});

test('mid-match restart restores the clock, roster, RNG progression and pause time', async t => {
  const f = await fixture(t);
  const { host, guest, path, match } = await f.h2h();
  f.advance(32_000);
  await f.req(path + '/live-command', command(match, 'pause'), guest.token);
  f.advance(5000);
  const before = ownMatch((await f.req(path, undefined, host.token)).room);
  f.advance(60_000); // the server is effectively down: no ticks/requests
  await f.restart();
  const after = ownMatch((await f.req(path, undefined, guest.token)).room);
  assert.equal(after.minute, before.minute);
  assert.equal(after.elapsedMs, before.elapsedMs);
  assert.deepEqual(after.events, before.events);
  assert.deepEqual(after.players, before.players);
  assert.equal(after.phaseEndsAt - after.lastTickAt, before.phaseEndsAt - before.lastTickAt);
  assert.equal(after.phase, 'paused');
  f.advance(18_000);
  assert.equal(ownMatch((await f.req(path, undefined, host.token)).room).phase, 'first');
});

test('leaving during live play does not regenerate, skip or duplicate the result', async t => {
  const f = await fixture(t);
  const { host, guest, path } = await f.h2h();
  f.advance(15_000);
  const before = ownMatch((await f.req(path, undefined, guest.token)).room);
  await f.req(path + '/leave', {}, host.token);
  const after = ownMatch((await f.req(path, undefined, guest.token)).room);
  assert.equal(after.id, before.id);
  assert.equal(after.minute, before.minute);
  await f.finishWeek(path, guest.token);
  const state = await f.req(path, undefined, guest.token);
  assert.ok(state.room.members.every(m => m.stats.played === 1));
});

test('authenticated event streams push identical head-to-head frames and command events', { timeout: 10_000 }, async t => {
  const f = await fixture(t);
  const { host, guest, path, match } = await f.h2h();
  const streams = [];
  async function subscribe(token) {
    const controller = new AbortController();
    const res = await fetch(f.url() + path + '/stream', { headers:{'X-Member-Token':token}, signal:controller.signal });
    assert.equal(res.status,200);
    assert.match(res.headers.get('content-type'), /text\/event-stream/);
    const reader = res.body.getReader();
    let text = '';
    const decoder = new TextDecoder();
    const read = async predicate => {
      for (;;) {
        let end;
        while ((end = text.indexOf('\n\n')) >= 0) {
          const message = text.slice(0,end); text = text.slice(end+2);
          const line = message.split('\n').find(l => l.startsWith('data: '));
          if (line) { const data = JSON.parse(line.slice(6)); if (predicate(data)) return data; }
        }
        const {done,value} = await reader.read();
        assert.equal(done,false);
        text += decoder.decode(value,{stream:true});
      }
    };
    const stream = {read, close:() => controller.abort()};
    streams.push(stream); return stream;
  }
  t.after(() => streams.forEach(s => s.close()));
  const a = await subscribe(host.token), b = await subscribe(guest.token);
  assert.deepEqual(ownMatch((await a.read(() => true)).room), ownMatch((await b.read(() => true)).room));
  const tactic = command(match,'tactic',{style:'possession',formation:'3-5-2'});
  await f.req(path + '/live-command',tactic,host.token);
  const select = data => ownMatch(data.room).events.some(e => e.type === 'tactic');
  const [one,two] = await Promise.all([a.read(select),b.read(select)]);
  assert.deepEqual(ownMatch(one.room),ownMatch(two.room));
  assert.equal(one.room.revision,two.room.revision);
  const reconnect = await subscribe(guest.token);
  assert.deepEqual(ownMatch((await reconnect.read(() => true)).room), ownMatch(two.room));
});

test('server timer advances and persists a match with all browsers disconnected', async t => {
  const f = await fixture(t, { autoTick: true });
  const { host, guest, path } = await f.pair();
  await f.req(path + '/start', {}, host.token);
  for (const user of [host, guest]) await f.req(path + '/ready', {week:1,season:1,ready:true,club:club()}, user.token);
  f.advance(6000);
  // No GET or stream drives this update: only the server's own 500 ms timer.
  await new Promise(resolve => setTimeout(resolve,650));
  const saved = JSON.parse(readFileSync(f.dataFile,'utf8')).rooms[0];
  assert.equal(saved.live.matches[0].minute,2);
  assert.equal(saved.live.matches[0].frame,12);
  assert.equal(saved.week,1);
});
