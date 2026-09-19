import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeFromSearch, modeUrl } from '../src/utils/gameMode';
import { ONLINE_CLUB_KEY, ONLINE_SESSION_KEY, ONLINE_TAB_KEY, loadOnlineClub, loadOnlineTabId, saveOnlineClub } from '../src/utils/onlineStorage';
import { parseStreamPacket, splitStreamPackets } from '../src/utils/onlineStream';
import { MAX_RECONNECT_DELAY_MS, reconnectDelay, retryAfterMs, supersededByOtherTab } from '../src/utils/onlineReconnect';
import { startOnlineConnection } from '../src/utils/onlineConnection';
import { POLL_INTERVAL_MS, STREAM_RETRY_WHILE_POLLING_MS, STREAM_WATCHDOG_MS } from '../src/utils/onlineReconnect';
import type { GameState } from '../src/types/game';

const sample = (name: string) => ({
  teamName: name, teamLogo:'⚽', week:1, season:1, budget:1000, leagueLevel:4,
  tactics:{style:'balanced',formation:'4-4-2',pressing:'medium',tempo:'normal'},
  team11:Array.from({length:11},(_,id) => ({id,name:`Oyuncu ${id}`,role:id===0?'KL':'OS',ovr:75,energy:100,age:25,flag:'🇹🇷',country:'Türkiye'})),
  bench:[], matchHistory:[],
} as unknown as GameState);
const session = JSON.stringify({code:'ABCD2345', token:'a'.repeat(64), memberId:'member-one'});
function memory(initial: Record<string,string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes:string[] = [];
  return { data, writes, getItem: (k:string) => data.get(k) ?? null, setItem: (k:string,v:string) => {writes.push(k);data.set(k,v);} };
}

test('normal launch chooses neither game; valid invitations target online only', () => {
  assert.equal(modeFromSearch(''),null);
  assert.equal(modeFromSearch('?mode=online'),'online');
  assert.equal(modeFromSearch('?mode=offline'),'offline');
  assert.equal(modeFromSearch('?lig=abcd2345'),'online');
  assert.equal(modeFromSearch('?lig=ABCD2345&mode=offline'),'offline');
  assert.equal(modeFromSearch('?lig=ABCD2345&mode=menu'),null);
  assert.equal(modeFromSearch('?lig=bad'),null);
  assert.equal(modeFromSearch('?mode=other'),null);
});

test('mode URLs preserve app path but remove stale online invitations outside online', () => {
  assert.equal(modeUrl('https://game.example/?lig=ABCD2345','online'),'/?lig=ABCD2345&mode=online');
  assert.equal(modeUrl('https://game.example/?lig=ABCD2345','offline'),'/?mode=offline');
  assert.equal(modeUrl('https://game.example/?lig=ABCD2345&mode=online',null),'/');
  assert.equal(modeUrl('https://game.example/play?mode=online&devtools=1',null),'/play?devtools=1');
});

test('online saves write only their own key, never career, autosave or recovery', () => {
  const offline=JSON.stringify(sample('Offline'));
  const store=memory({'ManagerPro2026_Save':offline,'ManagerPro2026_Recovery':'protected', [ONLINE_SESSION_KEY]:session});
  assert.equal(saveOnlineClub(sample('Online'),store),true);
  assert.deepEqual(store.writes,[ONLINE_CLUB_KEY]);
  assert.equal(store.getItem('ManagerPro2026_Save'),offline);
  assert.equal(store.getItem('ManagerPro2026_Recovery'),'protected');
  assert.equal(store.getItem(ONLINE_SESSION_KEY),session);
  assert.equal(loadOnlineClub(store)?.teamName,'Online');
});

test('fresh online mode does not silently import a pre-existing offline career', () => {
  const store=memory({'ManagerPro2026_Save':JSON.stringify(sample('Offline'))});
  assert.equal(loadOnlineClub(store),null);
  assert.deepEqual(store.writes,[]);
});

test('legacy online sessions migrate once without writing to the offline save', () => {
  const raw=JSON.stringify(sample('Eski ortak takım'));
  const store=memory({'ManagerPro2026_Save':raw,[ONLINE_SESSION_KEY]:session});
  const migrated=loadOnlineClub(store);
  assert.equal(migrated?.teamName,'Eski ortak takım');
  assert.deepEqual(store.writes,[]);
  assert.ok(migrated);
  saveOnlineClub(migrated,store);
  store.data.set('ManagerPro2026_Save',JSON.stringify(sample('Farklı offline takım')));
  assert.equal(loadOnlineClub(store)?.teamName,'Eski ortak takım');
  assert.deepEqual(store.writes,[ONLINE_CLUB_KEY]);
});

test('malformed online data and denied storage fail safely, without offline fallback or overwrite', () => {
  for (const corrupt of ['{bad','null',JSON.stringify({schema:2,club:sample('Other')}),JSON.stringify({schema:1,club:{...sample('Other'),tactics:null}})]) {
    const store=memory({[ONLINE_CLUB_KEY]:corrupt,[ONLINE_SESSION_KEY]:session,'ManagerPro2026_Save':JSON.stringify(sample('Offline'))});
    assert.equal(loadOnlineClub(store),null);
    assert.deepEqual(store.writes,[]);
  }
  assert.equal(loadOnlineClub({getItem:()=>{throw new Error('denied');}}),null);
  assert.equal(saveOnlineClub(sample('Online'),{setItem:()=>{throw new Error('quota');}}),false);
});

test('sekme kimliği yenileme boyunca sabit kalır, bozuk kayıt yenilenir', () => {
  const store=memory();
  const first=loadOnlineTabId(store);
  assert.match(first,/^t[0-9a-f]{24}$/);
  assert.equal(loadOnlineTabId(store),first,'aynı sekme aynı kimliği kullanmalı');
  const other=memory({[ONLINE_TAB_KEY]:'t'+'0'.repeat(24)});
  assert.equal(loadOnlineTabId(other),'t'+'0'.repeat(24));
  for (const corrupt of ['kisa','a b c d e f g h i j k l m n o p','']) {
    const broken=memory({[ONLINE_TAB_KEY]:corrupt});
    const id=loadOnlineTabId(broken);
    assert.notEqual(id,corrupt);
    assert.match(id,/^t[0-9a-f]{24}$/);
  }
  // Depolama kapalıysa (gizli pencere) yine de geçerli ve sabit bir kimlik dönmeli.
  const denied={getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');}};
  const fallback=loadOnlineTabId(denied);
  assert.match(fallback,/^t[0-9a-f]{24}$/);
  assert.equal(loadOnlineTabId(denied),fallback);
});

test('SSE paketleri oda/superseded/expired olarak ayrıştırılır', () => {
  const room={revision:4,code:'ABCD2345'};
  assert.deepEqual(parseStreamPacket(`data: ${JSON.stringify({room,serverTime:123})}`),{type:'room',payload:{room,serverTime:123}});
  assert.deepEqual(parseStreamPacket('event: superseded\ndata: {"reason":"limit"}'),{type:'superseded',reason:'limit'});
  assert.deepEqual(parseStreamPacket('event: superseded\ndata: {}'),{type:'superseded',reason:''});
  assert.deepEqual(parseStreamPacket('event: expired\ndata: {}'),{type:'expired'});
  // Devralma paketinde oda yok: odakare yerine sayılmamalı, aksi hâlde arayüz bozulur.
  assert.equal(parseStreamPacket('event: superseded\ndata: {}\n\ndata: {"room":null}').type,'superseded');
  assert.deepEqual(parseStreamPacket('data: {bozuk'),{type:'ignore'});
  assert.deepEqual(parseStreamPacket('data: {}'),{type:'ignore'});
  assert.deepEqual(parseStreamPacket(': keep-alive'),{type:'ignore'});
  const split=splitStreamPackets(`data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"`);
  assert.deepEqual(split.packets,['data: {"a":1}','data: {"b":2}']);
  assert.equal(split.rest,'data: {"c"');
  assert.deepEqual(splitStreamPackets('').packets,[]);
});

test('yeniden deneme gecikmesi üstel, jitterli ve Retry-After değerine saygılı', () => {
  const none=()=>0;
  assert.equal(reconnectDelay(1,0,none),375);
  assert.equal(reconnectDelay(2,0,none),750);
  assert.equal(reconnectDelay(3,0,none),1500);
  assert.equal(reconnectDelay(99,0,none),MAX_RECONNECT_DELAY_MS*0.75,'gecikme üst sınıra oturur (jitter alt ucu)');
  assert.equal(reconnectDelay(99,0,()=>1),MAX_RECONNECT_DELAY_MS,'jitter ile üst sınırı aşmaz');
  assert.ok(reconnectDelay(4,0,()=>1)>reconnectDelay(4,0,()=>0),'jitter istemcileri aynı anda yığmaz');
  // Sunucu "30 saniye sonra dene" dediyse daha erken denenmez.
  assert.equal(reconnectDelay(1,30_000,none),30_000);
  assert.equal(reconnectDelay(9,30_000,()=>1),30_000);
  assert.equal(reconnectDelay(1,-5,none),375);
  assert.equal(supersededByOtherTab('tab'),true);
  assert.equal(supersededByOtherTab('limit'),true);
  assert.equal(supersededByOtherTab('stall'),false,'boşa düşen akışa normal yeniden bağlanılır');
  assert.equal(supersededByOtherTab(''),false);
  assert.equal(supersededByOtherTab(null),false);
  assert.equal(retryAfterMs({headers:{get:name=>name==='retry-after'?'30':null}}),30_000);
  assert.equal(retryAfterMs({headers:{get:()=>'yok'}}),0);
  assert.equal(retryAfterMs({headers:{get:()=>null}}),0);
});

// --- Canlı bağlantı makinesi (src/utils/onlineConnection.ts) ---
// Bu testler tarayıcısız çalışır: zamanlayıcı, saat ve fetch enjekte edilir.
type Snapshot = { connection: string; transport: string; issue: string };
const liveSession = { code: 'ABCD2345', token: 'a'.repeat(64), memberId: 'member-one' };
const roomBody = (revision: number) => JSON.stringify({ room: { code: 'ABCD2345', revision, members: [], matches: [], live: null }, serverTime: 1000 });
const jsonResponse = (body: string, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers: { 'content-type': 'application/json', ...headers } });
const settle = async () => { await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0)); };

/** Elle tetiklenen zamanlayıcı: gecikmeler sözleşmenin parçası olduğu için testte doğrulanır. */
function timers() {
  let queue: { id: number; run: () => void; delay: number }[] = [];
  let nextId = 0;
  const next = async () => { const item = queue.shift(); if (!item) return false; item.run(); await settle(); return true; };
  return {
    schedule: (run: () => void, delay: number) => { const id = ++nextId; queue.push({ id, run, delay }); return id; },
    cancel: (handle: unknown) => { queue = queue.filter(item => item.id !== handle); },
    delays: () => queue.map(item => item.delay),
    next,
    until: async (predicate: () => boolean, steps = 30) => {
      for (let i = 0; i < steps; i++) {
        await settle();
        if (predicate()) return true;
        if (!await next()) return predicate();
      }
      return predicate();
    },
  };
}

/** Gövdesini testin gönderdiği canlı akış (veri, kapanma, hata senaryoları). */
function fakeStream() {
  const encoder = new TextEncoder();
  let push: (chunk: string) => void = () => {};
  let close: () => void = () => {};
  let kill: (error: Error) => void = () => {};
  const body = new ReadableStream({
    start(controller) {
      push = chunk => controller.enqueue(encoder.encode(chunk));
      close = () => controller.close();
      kill = error => controller.error(error);
    },
  });
  return { body, push, close, kill, response: () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }) };
}

type HarnessContext = {
  clock: ReturnType<typeof timers>;
  streams: ReturnType<typeof fakeStream>[];
  urls: string[];
  snapshots: Snapshot[];
  rooms: number[];
  expired: string[];
};
function connectionHarness(handler: (ctx: HarnessContext, url: string, init?: RequestInit) => Response | Promise<Response>) {
  const clock = timers();
  const ctx: HarnessContext = { clock, streams: [], urls: [], snapshots: [], rooms: [], expired: [] };
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    ctx.urls.push(String(url));
    if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const response = await handler(ctx, String(url), init);
    // Gerçek akışta olduğu gibi: istek iptal edilirse okuma da kesilir.
    if (init?.signal) init.signal.addEventListener('abort', () => ctx.streams[ctx.streams.length - 1]?.kill(new DOMException('aborted', 'AbortError')));
    return response;
  }) as typeof fetch;
  const connection = startOnlineConnection({
    session: liveSession, tabId: 'tab-test-0123456789abcdef',
    onState: snapshot => ctx.snapshots.push(snapshot as Snapshot),
    onRoom: room => ctx.rooms.push((room as { revision: number }).revision),
    onExpired: message => ctx.expired.push(message),
    fetchImpl, schedule: clock.schedule, cancel: clock.cancel, isOnline: () => true,
    now: () => 0, random: () => 0,
  });
  const state = () => ctx.snapshots[ctx.snapshots.length - 1] || { connection: 'connecting', transport: 'stream', issue: '' };
  return { ...ctx, state, stop: connection.stop, retryNow: connection.retryNow };
}

test('akış veri getirmezse istemci yoklamaya geçer, oda bilgisi yine gelir', async () => {
  const h = connectionHarness((ctx, url) => {
    if (url.endsWith('/stream')) { const s = fakeStream(); ctx.streams.push(s); return s.response(); }
    // (aşağıdaki testlerde akış kendi kendine kapanır; bekçi abort'u okumayı reddettirir)
    return jsonResponse(roomBody(ctx.rooms.length + 1));
  });
  // Açılışta tek GET: ekran "oturum yükleniyor" yazısında kilitli kalmaz.
  assert.ok(await h.clock.until(() => h.rooms.length === 1), 'açılışta oda tek istekle gelmeli');
  assert.deepEqual(h.rooms, [1]);
  assert.equal(h.state().connection, 'connected');
  // Akış açıldı ama hiç veri yok: bekçi 15 sn sonra bağlantıyı düşürür.
  assert.ok(await h.clock.until(() => h.clock.delays().includes(STREAM_WATCHDOG_MS)));
  assert.ok(await h.clock.until(() => h.state().connection === 'reconnecting'));
  // İkinci akış da sessiz: yoklama yedeği devreye girer ve tablo güncellenmeye başlar.
  assert.ok(await h.clock.until(() => h.state().transport === 'poll'), 'yoklamaya geçilmeli');
  assert.ok(await h.clock.until(() => h.rooms.length >= 3), 'yoklama oda bilgisini getirmeli');
  assert.equal(h.state().connection, 'connected');
  assert.equal(h.state().issue, '');
  assert.ok(h.clock.delays().includes(POLL_INTERVAL_MS));
  h.stop();
});

test('sunucu akışı devraldığında sekme yoklamaya geçer ve hemen geri saldırmaz', async () => {
  const h = connectionHarness((ctx, url) => {
    if (url.endsWith('/stream')) {
      const s = fakeStream(); ctx.streams.push(s);
      s.push('event: superseded\ndata: {"reason":"limit"}\n\n'); s.close();
      return s.response();
    }
    return jsonResponse(roomBody(9));
  });
  assert.ok(await h.clock.until(() => h.state().transport === 'poll'), 'yoklamaya geçilmeli');
  assert.ok(h.snapshots.some(snapshot => /başka bir sekme/i.test(snapshot.issue)), 'devralma nedeni kullanıcıya söylenmeli');
  // İki sekme birbirini sonsuz düşürmesin: akış yeniden denenmeden önce yoklama aralıkları geçer.
  const quick = h.clock.delays().filter(delay => delay !== POLL_INTERVAL_MS);
  assert.ok(quick.every(delay => delay >= STREAM_RETRY_WHILE_POLLING_MS), `erken akış denemesi olmamalı: ${quick}`);
  assert.ok(await h.clock.until(() => h.rooms.includes(9)), 'yoklama verisini getirmeli');
  h.stop();
});

test('429 yanıtında Retry-After kadar beklenir, ısrarlı hatada yoklamaya geçilir', async () => {
  const h = connectionHarness((ctx, url) => url.endsWith('/stream')
    ? jsonResponse(JSON.stringify({ error: 'Canlı bağlantı çok sık denendi.' }), 429, { 'retry-after': '30' })
    : jsonResponse(roomBody(ctx.rooms.length + 1)));
  assert.ok(await h.clock.until(() => h.clock.delays().includes(30_000)), 'sunucunun istediği 30 sn beklenmeli');
  assert.match(h.state().issue, /çok sık denendi/);
  assert.ok(await h.clock.until(() => h.state().transport === 'poll'), 'art arda hatada yoklamaya geçilmeli');
  assert.ok(await h.clock.until(() => h.rooms.length >= 2), 'yoklama oda bilgisini getirmeli');
  h.stop();
});

test('geçersiz oturumda bağlantı bırakılır ve sunucunun mesajı kullanıcıya verilir', async () => {
  const h = connectionHarness(() => jsonResponse(JSON.stringify({ error: 'Bu kod bu sunucuda bulunamadı.' }), 404));
  assert.ok(await h.clock.until(() => h.expired.length === 1), 'oturumun bittiği bildirilmeli');
  assert.match(h.expired[0], /bulunamadı/);
  assert.equal(h.state().connection, 'disconnected');
  const before = h.urls.length;
  h.retryNow();
  await settle();
  assert.equal(h.urls.length, before, 'oturum bittikten sonra yeni istek yapılmaz');
});

test('canlı kareler odaya yazılır, akış kapanınca artan beklemeyle yeniden bağlanılır', async () => {
  const h = connectionHarness((ctx, url) => {
    if (url.endsWith('/stream')) {
      const s = fakeStream(); ctx.streams.push(s);
      if (ctx.streams.length === 1) {
        s.push(`data: ${JSON.stringify({ room: { revision: 5, code: 'ABCD2345' }, serverTime: 7 })}\n\n`);
        // Yarım kalan paket: bir sonraki parçayla tamamlanana kadar uygulanmamalı.
        s.push(`data: ${JSON.stringify({ room: { revision: 6, code: 'ABCD2345' }, serverTime: 8 })}\n\ndata: {"room":`);
        s.close();
      } else s.close();
      return s.response();
    }
    return jsonResponse(roomBody(1));
  });
  assert.ok(await h.clock.until(() => h.rooms.includes(6)), 'kareler sırayla uygulanmalı');
  assert.deepEqual(h.rooms, [1, 5, 6], 'yarım paket oda karesi sayılmamalı');
  assert.ok(h.snapshots.some(snapshot => snapshot.connection === 'connected' && snapshot.issue === ''), 'kareler gelince bağlantı sağlam görünmeli');
  // Akış kapanınca üstel geri çekilme: ilk deneme 375 ms (random = 0).
  assert.ok(await h.clock.until(() => h.clock.delays().includes(375)), 'artan beklemeyle yeniden bağlanılmalı');
  h.stop();
});
