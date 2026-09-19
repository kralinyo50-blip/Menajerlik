// Çerçeveden bağımsız canlı bağlantı makinesi (React yok, DOM yok): React kancası yalnızca
// durumları arayüze taşır, burada kalan mantık node altında birebir test edilir.
//
// Kural: canlı akış (SSE) birincil, yoklama (GET) yedek. Akış veri getirmezse veya sunucu
// bağlantıyı devraldığını bildirirse oyun asla "bağlanıyor" ekranında kilitli kalmaz.
import type { OnlineRoom, OnlineSession } from '../types/online';
import { parseStreamPacket, splitStreamPackets } from './onlineStream';
import {
  POLL_FAILURES_BEFORE_STREAM, POLL_INTERVAL_MS, STREAM_FAILURES_BEFORE_POLL,
  STREAM_RETRY_WHILE_POLLING_MS, STREAM_WATCHDOG_MS, reconnectDelay, retryAfterMs, supersededByOtherTab,
} from './onlineReconnect';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type Transport = 'stream' | 'poll';

export interface ConnectionSnapshot {
  connection: ConnectionState;
  transport: Transport;
  issue: string;
}

export interface ConnectionOptions {
  session: OnlineSession;
  /** Aynı sekmenin kimliği: sunucu bu kimlikle eski kopmuş bağlantıyı devralır. */
  tabId: string;
  onState: (snapshot: ConnectionSnapshot) => void;
  onRoom: (room: OnlineRoom, serverTime?: number) => void;
  /** Oturum sunucuda geçersiz (401/404): istemci kayıtlı oturumu silmeli. */
  onExpired: (message: string) => void;
  fetchImpl?: typeof fetch;
  schedule?: (run: () => void, delay: number) => unknown;
  cancel?: (handle: unknown) => void;
  isOnline?: () => boolean;
  now?: () => number;
  random?: () => number;
}

export interface OnlineConnection {
  /** Bağlantıyı tamamen durdurur (ekrandan çıkış, oturum değişimi). */
  stop: () => void;
  /** Hemen yeniden dener (tarayıcı yeniden çevrimiçi olduğunda). */
  retryNow: () => void;
}

/** Sunucunun HTTP yanıtından gelen hata: durum kodu ve istediği bekleme süresi korunur. */
export class ConnectionError extends Error {
  constructor(message: string, public status: number, public waitMs = 0) { super(message); }
}

const errorMessage = (cause: unknown) => {
  if (cause instanceof ConnectionError) return cause.message;
  const name = cause instanceof Error ? cause.name : '';
  return name === 'AbortError' || name === 'TimeoutError'
    ? 'Canlı bağlantı yanıt vermedi; yeniden kuruluyor.'
    : 'Sunucuya ulaşılamıyor. Ortak sunucu adresini ve bağlantını kontrol et.';
};

/** Yanıt gövdesindeki `error` alanını oku; gövde JSON değilse varsayılan mesaj kalır. */
const responseError = async (response: Response, fallback: string) => {
  let message = fallback;
  try { const data = await response.json() as { error?: unknown }; if (typeof data?.error === 'string') message = data.error; } catch { /* gövde JSON değil */ }
  return new ConnectionError(message, response.status, retryAfterMs(response));
};

export function startOnlineConnection(options: ConnectionOptions): OnlineConnection {
  const { session, tabId } = options;
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const schedule = options.schedule ?? ((run: () => void, delay: number) => setTimeout(run, delay));
  const cancel = options.cancel ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const isOnline = options.isOnline ?? (() => navigator.onLine);
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;

  let closed = false;
  let handle: unknown;
  let controller: AbortController | undefined;
  let generation = 0;
  let failures = 0;
  let pollFailures = 0;
  let polling = false;
  let lastStreamTry = 0;
  let snapshot: ConnectionSnapshot = { connection: 'connecting', transport: 'stream', issue: '' };

  const emit = (patch: Partial<ConnectionSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    if (!closed) options.onState({ ...snapshot });
  };
  const later = (delay: number, run: () => void) => { cancel(handle); handle = schedule(run, delay); };
  const fresh = (gen: number) => !closed && gen === generation;
  const start = () => { if (closed) return; const gen = ++generation; if (polling) void runPoll(gen); else void runStream(gen); };

  const expired = (cause: unknown) => {
    const message = cause instanceof ConnectionError ? cause.message : 'Bu ligdeki oturumun sona erdi.';
    cancel(handle); controller?.abort();
    emit({ connection: 'disconnected', transport: 'stream', issue: '' });
    closed = true;   // emit'ten sonra: kopma durumu arayüze mutlaka ulaşmalı
    options.onExpired(message);
  };
  const isExpired = (cause: unknown) => cause instanceof ConnectionError && [401, 404].includes(cause.status);
  const waitMsOf = (cause: unknown) => cause instanceof ConnectionError ? cause.waitMs : 0;

  const runStream = async (gen: number) => {
    if (!fresh(gen)) return;
    if (!isOnline()) { emit({ connection: 'reconnecting', issue: 'İnternet bağlantısı yok.' }); later(POLL_INTERVAL_MS, start); return; }
    lastStreamTry = now();
    const attempt = new AbortController();
    controller = attempt;
    let superseded: string | null = null;
    // Bekçi: akış 15 saniye boyunca tek bayt bile getirmezse bağlantı ölü sayılır.
    // Durdurulmuş bağlantının artık bekçisi bir şey yapmaz.
    let watchdog: unknown;
    const alive = () => { cancel(watchdog); watchdog = schedule(() => { if (!closed) attempt.abort(); }, STREAM_WATCHDOG_MS); };
    
    alive();
    try {
      const response = await doFetch(`/api/online/rooms/${session.code}/stream`, {
        headers: { 'X-Member-Token': session.token, 'X-Tab-Id': tabId, Accept: 'text/event-stream' },
        signal: attempt.signal, cache: 'no-store',
      });
      if (!response.ok) throw await responseError(response, 'Canlı bağlantı kurulamadı.');
      if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('Canlı maç sunucusu bulunamadı.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (fresh(gen)) {
        const { done, value } = await reader.read();
        if (value) { alive(); buffer += decoder.decode(value, { stream: true }); }
        if (buffer.length > 1_000_000) throw new Error('Geçersiz canlı veri.');
        const split = splitStreamPackets(buffer);
        buffer = split.rest;
        for (const packet of split.packets) {
          const parsed = parseStreamPacket(packet);
          if (parsed.type === 'expired') throw new ConnectionError('Bu ligdeki oturumun sona erdi.', 401);
          // Sunucu bu akışı kapattı; nedeni "tab" / "limit" / "stall" olabilir.
          if (parsed.type === 'superseded') { superseded = parsed.reason; continue; }
          if (parsed.type === 'room' && fresh(gen) && !attempt.signal.aborted && isOnline()) {
            options.onRoom(parsed.payload.room as OnlineRoom, parsed.payload.serverTime);
            failures = 0; pollFailures = 0;
            emit({ connection: 'connected', issue: '' });
          }
        }
        if (done) break;
      }
      if (supersededByOtherTab(superseded)) {
        // Başka bir sekme canlı akışı devraldı. Burada hemen yeniden bağlanmak iki sekmeyi
        // sürekli birbirini düşüren bir döngüye sokar; bunun yerine yoklamaya geçilir.
        failures = 0; polling = true;
        emit({ transport: 'poll', issue: 'Canlı bağlantıyı başka bir sekme devraldı; bu sekme yoklamayla güncelleniyor.' });
        void runPoll(gen);
        return;
      }
      throw new Error('Canlı bağlantı kapandı.');
    } catch (cause) {
      if (!fresh(gen)) return;
      if (isExpired(cause)) { expired(cause); return; }
      failures++;
      // Akış üst üste veri getirmezse (tünel/proxy SSE yanıtını tamponluyor olabilir) oyun
      // ekranının boş kalmasındansa birkaç saniyelik gecikmeyle yoklama yedeği kullanılır.
      if (failures >= STREAM_FAILURES_BEFORE_POLL) polling = true;
      emit({ connection: 'reconnecting', transport: polling ? 'poll' : 'stream', issue: errorMessage(cause) });
      later(polling ? POLL_INTERVAL_MS : reconnectDelay(failures, waitMsOf(cause), random), start);
    } finally {
      cancel(watchdog);
      attempt.abort();
    }
  };

  /** Yoklama yedeği: aynı oda bilgisini tek istekle alır (akış tamponlanıyorsa da çalışır). */
  const runPoll = async (gen: number) => {
    if (!fresh(gen)) return;
    try {
      const response = await doFetch(`/api/online/rooms/${session.code}`, {
        headers: { 'X-Member-Token': session.token }, cache: 'no-store',
      });
      if (!response.ok) throw await responseError(response, 'Oda bilgisi alınamadı.');
      const result = await response.json() as { room?: OnlineRoom; serverTime?: number };
      if (!fresh(gen)) return;
      if (result.room) options.onRoom(result.room, result.serverTime);
      failures = 0; pollFailures = 0;
      emit({ connection: 'connected', transport: 'poll', issue: '' });
      // Akış düzelmiş olabilir: aralıklı olarak yeniden denenir, başarılıysa canlı karelere dönülür.
      if (now() - lastStreamTry >= STREAM_RETRY_WHILE_POLLING_MS) { polling = false; start(); return; }
      later(POLL_INTERVAL_MS, () => { if (gen === generation) void runPoll(gen); });
    } catch (cause) {
      if (!fresh(gen)) return;
      if (isExpired(cause)) { expired(cause); return; }
      pollFailures++;
      if (pollFailures >= POLL_FAILURES_BEFORE_STREAM) polling = false;
      emit({ connection: 'reconnecting', transport: polling ? 'poll' : 'stream', issue: errorMessage(cause) });
      later(reconnectDelay(pollFailures, waitMsOf(cause), random), polling ? () => { if (gen === generation) void runPoll(gen); } : start);
    }
  };

  // Akış açılmadan önce odanın mevcut hâlini tek istekle al: SSE'nin hiç veri getirmediği
  // ortamlarda ekran "oturumun geri yükleniyor" yazısında kilitli kalmasın.
  const bootstrap = async (gen: number) => {
    try {
      const response = await doFetch(`/api/online/rooms/${session.code}`, {
        headers: { 'X-Member-Token': session.token }, cache: 'no-store',
      });
      if (!response.ok) throw await responseError(response, 'Oda bilgisi alınamadı.');
      const result = await response.json() as { room?: OnlineRoom; serverTime?: number };
      if (!fresh(gen)) return;
      if (result.room) options.onRoom(result.room, result.serverTime);
      emit({ connection: 'connected', issue: '' });
    } catch (cause) {
      if (!fresh(gen)) return;
      if (isExpired(cause)) { expired(cause); return; }
      emit({ connection: 'reconnecting', issue: errorMessage(cause) });
    }
    if (!closed) start();
  };

  void bootstrap(generation);
  return {
    stop: () => { closed = true; cancel(handle); controller?.abort(); },
    retryNow: () => { if (closed) return; cancel(handle); start(); },
  };
}
