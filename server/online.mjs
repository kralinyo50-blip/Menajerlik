import { randomBytes, randomInt, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { squadInput, startLiveRound, advanceLiveRound, liveCommand, publicLiveRound } from './live-match.mjs';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const ROOM_TTL = 30 * 24 * 60 * 60 * 1000;
const hash = token => createHash('sha256').update(token).digest('hex');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const emptyStats = () => ({ played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });

function clubInput(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 32) fail(400, 'Takım adı 1–32 karakter olmalı.');
  if (typeof input.logo !== 'string' || input.logo.length > 16) fail(400, 'Geçersiz takım logosu.');
  if (!Number.isFinite(input.strength) || input.strength < 1 || input.strength > 99) fail(400, 'Geçersiz kadro gücü.');
  if (!['balanced', 'attack', 'defense', 'possession'].includes(input.style)) fail(400, 'Geçersiz taktik.');
  return { name: input.name.trim(), logo: input.logo, strength: Math.round(input.strength), style: input.style,
    formation: ['4-4-2', '4-3-3', '3-5-2'].includes(input.formation) ? input.formation : '4-4-2',
    squad: squadInput(input.squad, Math.round(input.strength), input.name.trim()),
  };

}

/** Circle method: every team meets every other team once at home and once away. */
export function makeFixture(ids) {
  const ring = [...ids];
  const first = [];
  for (let round = 0; round < ids.length - 1; round++) {
    for (let i = 0; i < ids.length / 2; i++) {
      const pair = [ring[i], ring[ring.length - 1 - i]];
      if ((round + i) % 2) pair.reverse();
      first.push({ week: round + 1, homeId: pair[0], awayId: pair[1], homeScore: null, awayScore: null });
    }
    ring.splice(1, 0, ring.pop());
  }
  return [...first, ...first.map(m => ({ ...m, week: m.week + ids.length - 1, homeId: m.awayId, awayId: m.homeId }))];
}

async function readBody(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 16_384) fail(413, 'İstek çok büyük.');
  }
  try {
    const body = JSON.parse(text || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Geçersiz istek.');
    return body;
  } catch { fail(400, 'Geçersiz JSON isteği.'); }
}

/** Shared middleware for Vite dev/preview and the standalone production server. */
export function createOnlineApi({ dataFile = process.env.ONLINE_DATA_FILE || resolve('data/online-rooms.json'), now = Date.now, autoTick = true } = {}) {
  let rooms = new Map();
  const presence = new Map();
  const startedAt = now();
  const rates = new Map();
  const streams = new Map();
  if (existsSync(dataFile)) {
    // Do not silently discard a corrupt save. An operator must restore its backup.
    const data = JSON.parse(readFileSync(dataFile, 'utf8'));
    if (data.schema !== 1 || !Array.isArray(data.rooms)) throw new Error('Online lig kayıt biçimi geçersiz.');
    rooms = new Map(data.rooms.filter(r => now() - r.updatedAt < ROOM_TTL).map(r => [r.code, r]));
  }
  // A restart resumes the saved match; server downtime is not simulated football time.
  for (const room of rooms.values()) for (const match of room.live?.matches || []) {
    if (match.phaseEndsAt) match.phaseEndsAt = now() + Math.max(0, match.phaseEndsAt - match.lastTickAt);
    match.lastTickAt = now();
  }
  const persist = () => {
    mkdirSync(dirname(dataFile), { recursive: true });
    writeFileSync(`${dataFile}.tmp`, JSON.stringify({ schema: 1, rooms: [...rooms.values()] }), { mode: 0o600 });
    renameSync(`${dataFile}.tmp`, dataFile);
  };
  const seenKey = (room, member) => `${room.code}:${member.id}`;
  const lastSeen = (room, member) => presence.get(seenKey(room, member)) ?? startedAt;
  const view = (room, viewerId) => ({
    code: room.code, hostId: room.hostId, status: room.status, season: room.season,
    week: room.week, revision: room.revision, updatedAt: room.updatedAt,
    members: room.members.map(({ tokenHash: _secret, squad: _squad, ...m }) => ({
      ...m, online: !m.bot && !m.departed && presence.has(seenKey(room, m)) && now() - lastSeen(room, m) < 15_000,
      canReplace: !m.bot && !m.departed && now() - lastSeen(room, m) > 60_000,
    })), matches: room.matches, live: publicLiveRound(room.live, viewerId),
  });
  const addMember = (room, club) => {
    if (room.members.some(m => m.name.toLocaleLowerCase('tr') === club.name.toLocaleLowerCase('tr'))) fail(409, 'Bu takım adı ligde kullanılıyor. Takım adını değiştir.');
    const token = randomBytes(32).toString('hex');
    const member = { id: randomUUID(), tokenHash: hash(token), ...club, bot: false, departed: false, ready: false, stats: emptyStats() };
    room.members.push(member);
    presence.set(seenKey(room, member), now());
    return { member, token };
  };
  const authenticate = (req, room) => {
    const token = req.headers['x-member-token'];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail(401, 'Oturum geçersiz. Kod ile tekrar katıl.');
    const digest = Buffer.from(hash(token), 'hex');
    const member = room.members.find(m => m.tokenHash && timingSafeEqual(Buffer.from(m.tokenHash, 'hex'), digest));
    if (!member || member.departed) fail(401, 'Bu ligdeki oturumun sona erdi.');
    presence.set(seenKey(room, member), now());
    return member;
  };
  const sendStream = (client, room) => {
    if (client.res.destroyed) return;
    if (client.res.writableLength > 1_000_000) { client.res.destroy(); return; }
    const member = room?.members.find(m => m.id === client.memberId && !m.departed);
    if (!room || !member) {
      client.res.write(`event: expired\ndata: {}\n\n`); client.res.end(); return;
    }
    client.res.write(`data: ${JSON.stringify({ room: view(room, client.memberId), serverTime: now() })}\n\n`);
  };
  const broadcast = room => {
    for (const client of streams.get(room.code) || []) sendStream(client, rooms.get(room.code));
  };
  const change = room => { room.revision++; room.updatedAt = now(); persist(); broadcast(room); };
  const advance = room => {
    if (!room.live || room.live.settled) return;
    const backup = JSON.stringify(room);
    try {
      if (advanceLiveRound(room, now())) change(room);
    } catch (error) {
      rooms.set(room.code, JSON.parse(backup));
      throw error;
    }
  };
  let lastHeartbeat = now();
  const timer = autoTick ? setInterval(() => {
    try {
      for (const [code, clients] of streams) {
        const room = rooms.get(code);
        for (const client of clients) {
          if (room?.members.some(m => m.id === client.memberId && !m.departed)) presence.set(`${code}:${client.memberId}`, now());
        }
      }
      const active = [...rooms.values()].filter(room => room.live && !room.live.settled);
      if (active.length) {
        const backup = JSON.stringify(active);
        const changed = [];
        try {
          for (const room of active) if (advanceLiveRound(room, now())) {
            room.revision++; room.updatedAt = now(); changed.push(room);
          }
          // One durable write per tick, not one whole-database write per live room.
          if (changed.length) persist();
        } catch (error) {
          for (const room of JSON.parse(backup)) rooms.set(room.code, room);
          throw error;
        }
        for (const room of changed) broadcast(room);
      }
      if (now() - lastHeartbeat >= 5000) {
        for (const [code, clients] of streams) for (const client of clients) sendStream(client, rooms.get(code));
        lastHeartbeat = now();
      }
    } catch (error) { console.error('Canlı maç kaydı:', error); }
  }, 500) : null;
  timer?.unref();

  const api = async function onlineApi(req, res, next = () => { res.statusCode = 404; res.end(); }) {
    const url = new URL(req.url || '/', 'http://server');
    if (!url.pathname.startsWith('/api/online/')) return next();
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(body));
    };
    // Roll back mutations if validation or durable storage fails.
    let backup;
    try {
      if (!['GET', 'POST'].includes(req.method)) fail(405, 'Bu yöntem desteklenmiyor.');
      if (req.method === 'POST') {
        // Browser requests must be same-origin; no wildcard CORS or trust in proxy headers.
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) fail(403, 'Farklı bir adresten istek kabul edilmiyor.');
        if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'JSON isteği gerekli.');
      }
      const ip = req.socket.remoteAddress || 'unknown';
      const time = now();
      if (rates.size > 2000) for (const [key, rate] of rates) if (time - rate.since > 60_000) rates.delete(key);
      const rate = rates.get(ip);
      if (!rate || time - rate.since > 60_000) rates.set(ip, { since: time, count: 1 });
      else if (++rate.count > 900) fail(429, 'Çok fazla istek. Bir dakika bekle.');

      if (url.pathname === '/api/online/health' && req.method === 'GET') return send(200, { ok: true });
      // Kodu geniş eşleştirip sonra doğrula: küçük harf de kabul edilir,
      // bozuk kodlarda "adres bulunamadı" yerine gerçek sebep söylenir.
      const route = url.pathname.match(/^\/api\/online\/rooms(?:\/([^/]{1,32})(?:\/(join|start|ready|leave|replace|claim-host|new-season|stream|live-command))?)?$/);
      if (!route) fail(404, 'Online adres bulunamadı.');
      const [, rawCode, action] = route;
      const code = rawCode === undefined ? undefined : rawCode.trim().toLocaleUpperCase('en-US');
      if (rawCode !== undefined && !CODE_PATTERN.test(code)) {
        if (code.length !== 8) fail(400, `Kod 8 karakter olmalı (yazdığın: ${code.length || 0}). Davet bağlantısındaki kodu kopyala, elle yazma.`);
        fail(400, 'Kodda geçersiz harf var. Kodlarda 0, O, 1, I harfleri kullanılmaz; davet bağlantısındaki kodu kopyala.');
      }
      const body = req.method === 'POST' ? await readBody(req) : {};
      if (req.method === 'POST') backup = JSON.stringify([...rooms]);
      if (!code && req.method === 'POST') {
        const club = clubInput(body.club);
        for (const [key, room] of rooms) if (now() - room.updatedAt >= ROOM_TTL) rooms.delete(key);
        if (rooms.size >= 500) fail(503, 'Sunucu dolu. Daha sonra tekrar dene.');
        let newCode;
        do { newCode = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''); } while (rooms.has(newCode));
        const room = { code: newCode, hostId: '', status: 'lobby', season: 1, week: 1, revision: 0, updatedAt: now(), members: [], matches: [] };
        const { member, token } = addMember(room, club);
        room.hostId = member.id;
        rooms.set(room.code, room);
        change(room);
        return send(201, { room: view(room, member.id), memberId: member.id, token });
      }
      const room = rooms.get(code);
      // En sık sebep: herkes kendi bilgisayarındaki sunucuda. Kod doğru olsa bile
      // farklı sunucuda görünmez; mesaj bunu açıkça söylemeli.
      if (!room || now() - room.updatedAt >= ROOM_TTL) fail(404, 'Bu kod bu sunucuda bulunamadı. Kod doğruysa farklı bir oyun adresindesin: oda sahibinin “Davet bağlantısı”nı tarayıcıda aç, herkes aynı adrese bağlansın.');
      if (req.method === 'POST' && action === 'join') {
        if (room.status !== 'lobby') fail(409, 'Sezon başlamış. Yeni sezon lobisini bekle.');
        if (room.members.length >= 10) fail(409, 'Lig dolu (en fazla 10 menajer).');
        const { member, token } = addMember(room, clubInput(body.club));
        change(room);
        return send(200, { room: view(room, member.id), memberId: member.id, token });
      }
      const member = authenticate(req, room);
      advance(room);
      // Advance is already durable; a rejected command must not rewind the clock.
      if (req.method === 'POST') backup = JSON.stringify([...rooms]);
      if (req.method === 'GET' && action === 'stream') {
        const clients = streams.get(code) || new Set();
        if ([...clients].filter(c => c.memberId === member.id).length >= 4) fail(429, 'Aynı oturumda en fazla dört canlı sekme açılabilir.');
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.flushHeaders?.();
        const client = { res, memberId: member.id };
        clients.add(client); streams.set(code, clients);
        res.on('close', () => { clients.delete(client); if (!clients.size) streams.delete(code); });
        sendStream(client, room);
        return;
      }
      if (req.method === 'GET' && !action) return send(200, { room: view(room, member.id), serverTime: now() });
      if (req.method !== 'POST' || !action) fail(405, 'Geçersiz işlem.');
      const requireHost = () => { if (room.hostId !== member.id) fail(403, 'Bu işlemi yalnızca oda sahibi yapabilir.'); };
      switch (action) {
        case 'start': {
          requireHost();
          if (room.status !== 'lobby') fail(409, 'Sezon zaten başladı.');
          if (room.members.length < 2) fail(409, 'En az iki menajer gerekli.');
          const average = Math.round(room.members.reduce((sum, m) => sum + m.strength, 0) / room.members.length);
          while (room.members.length < 10) {
            const number = room.members.length + 1;
            room.members.push({ id: randomUUID(), name: `Lig Botu ${number}`, logo: '🤖', strength: average, style: 'balanced', bot: true, departed: false, ready: false, stats: emptyStats() });
          }
          room.matches = makeFixture(room.members.map(m => m.id));
          room.status = 'playing';
          break;
        }
        case 'ready': {
          if (room.live && !room.live.settled) fail(409, 'Canlı maçlar bitmeden yeni hafta hazırlanamaz.');
          if (room.status !== 'playing' || body.week !== room.week || body.season !== room.season) fail(409, 'Hafta değişti. Güncel lig bilgisi alınıyor; yeniden kontrol et.');
          if (typeof body.ready !== 'boolean') fail(400, 'Hazır durumu geçersiz.');
          if (body.ready) {
            const club = clubInput(body.club);
            // Identity is locked for a season; squad strength and tactical style can change each week.
            member.strength = club.strength; member.style = club.style; member.squad = club.squad; member.formation = club.formation;
          }
          member.ready = body.ready;
          startLiveRound(room, now());
          break;
        }
        case 'live-command': {
          liveCommand(room, member, body, now());
          break;
        }
        case 'claim-host': {
          const host = room.members.find(m => m.id === room.hostId);
          if (host && now() - lastSeen(room, host) <= 60_000) fail(409, 'Oda sahibi hâlâ bağlı.');
          room.hostId = member.id;
          break;
        }
        case 'replace': {
          requireHost();
          if (room.status !== 'playing') fail(409, 'Bot devri yalnızca sezon sırasında yapılabilir.');
          const target = room.members.find(m => m.id === body.memberId);
          if (!target || target.bot || target.departed || target.id === member.id || now() - lastSeen(room, target) <= 60_000) fail(409, 'Yalnızca 60 saniyedir bağlantısı olmayan menajer bota devredilebilir.');
          target.departed = true;
          presence.delete(seenKey(room, target));
          startLiveRound(room, now());
          break;
        }
        case 'leave': {
          presence.delete(seenKey(room, member));
          if (room.status === 'lobby') room.members = room.members.filter(m => m.id !== member.id);
          else member.departed = true;
          if (room.hostId === member.id) room.hostId = room.members.find(m => !m.bot && !m.departed)?.id || '';
          if (!room.hostId) rooms.delete(room.code);
          else startLiveRound(room, now());
          break;
        }
        case 'new-season': {
          requireHost();
          if (room.status !== 'finished') fail(409, 'Önce mevcut sezon tamamlanmalı.');
          room.members = room.members.filter(m => !m.bot && !m.departed).map(m => ({ ...m, ready: false, stats: emptyStats() }));
          room.status = 'lobby'; room.season++; room.week = 1; room.matches = []; room.live = null;
          break;
        }
        default: fail(404, 'İşlem bulunamadı.');
      }
      change(room);
      return send(200, { room: action === 'leave' ? null : view(room, member.id), serverTime: now() });
    } catch (error) {
      if (backup) rooms = new Map(JSON.parse(backup));
      if (!error.status) console.error('Online API:', error);
      if (!res.headersSent && !res.destroyed) send(error.status || 500, { error: error.status ? error.message : 'Sunucu kaydı yapılamadı. Lütfen yeniden dene.' });
    }
  };
  api.close = () => {
    if (timer) clearInterval(timer);
    for (const clients of streams.values()) for (const client of clients) client.res.end();
    streams.clear();
  };
  return api;
}
