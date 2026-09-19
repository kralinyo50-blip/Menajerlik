import { useCallback, useEffect, useRef, useState } from 'react';
import type { OnlineClub, OnlineRoom, OnlineSession } from '../types/online';
import { ONLINE_SESSION_KEY } from '../utils/onlineStorage';

const SESSION_KEY = ONLINE_SESSION_KEY;
function savedSession(): OnlineSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return value && /^[A-Z2-9]{8}$/.test(value.code) && /^[a-f0-9]{64}$/.test(value.token) && typeof value.memberId === 'string' ? value : null;
  } catch { return null; }
}

class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request(path: string, session: OnlineSession | null, body?: unknown) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`/api/online/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(session ? { 'X-Member-Token': session.token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Online sunucu bulunamadı. Oyunu ortak sunucu adresinden aç.');
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.error || 'İşlem tamamlanamadı.', response.status);
    return result as { room: OnlineRoom; token?: string; memberId?: string; serverTime?: number };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')
      ? 'Sunucuya ulaşılamıyor. Ortak sunucu adresini ve bağlantını kontrol et.'
      : error instanceof Error ? error.message : 'Bağlantı kurulamadı.');
  } finally { clearTimeout(timeout); }
}

export function useOnlineLeague() {
  const [session, setSession] = useState<OnlineSession | null>(savedSession);
  const sessionRef = useRef(session);
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [connection, setConnection] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>(session ? 'connecting' : 'disconnected');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [serverTime, setServerTime] = useState(0);

  const storeSession = useCallback((next: OnlineSession | null) => {
    sessionRef.current = next;
    setSession(next);
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      setError('Tarayıcı oturumu kaydedemedi. Sayfayı kapatırsan lige geri dönemeyebilirsin.');
    }
  }, []);

  const applyRoom = useCallback((next: OnlineRoom, time?: number) => {
    setRoom(previous => !previous || previous.code !== next.code || next.revision >= previous.revision ? next : previous);
    setConnection('connected');
    setLastSynced(Date.now());
    if (time) setServerTime(previous => Math.max(previous, time));
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let retries = 0;
    const listen = async () => {
      if (cancelled) return;
      if (!navigator.onLine) { setConnection('reconnecting'); return; }
      const attempt = new AbortController();
      controller = attempt;
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const alive = () => { clearTimeout(watchdog); watchdog = setTimeout(() => attempt.abort(), 15_000); };
      alive();
      try {
        const response = await fetch(`/api/online/rooms/${session.code}/stream`, {
          headers: { 'X-Member-Token': session.token, Accept: 'text/event-stream' },
          signal: attempt.signal, cache: 'no-store',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new ApiError(data.error || 'Canlı bağlantı kurulamadı.', response.status);
        }
        if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('Canlı maç sunucusu bulunamadı.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) throw new Error('Canlı bağlantı kapandı.');
          alive();
          buffer += decoder.decode(value, { stream: true });
          if (buffer.length > 1_000_000) throw new Error('Geçersiz canlı veri.');
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const packet = buffer.slice(0, end); buffer = buffer.slice(end + 2);
            if (packet.includes('event: expired')) throw new ApiError('Bu ligdeki oturumun sona erdi.', 401);
            const line = packet.split('\n').find(l => l.startsWith('data: '));
            if (line && !cancelled && !attempt.signal.aborted && navigator.onLine && sessionRef.current?.token === session.token) {
              const data = JSON.parse(line.slice(6)) as { room: OnlineRoom; serverTime: number };
              applyRoom(data.room, data.serverTime);
              retries = 0;
            }
          }
        }
      } catch (cause) {
        if (cancelled || sessionRef.current?.token !== session.token) return;
        if (cause instanceof ApiError && [401, 404].includes(cause.status)) {
          storeSession(null); setRoom(null); setConnection('disconnected'); setError(cause.message);
          return;
        }
        setConnection('reconnecting');
        clearTimeout(timer);
        if (navigator.onLine) timer = setTimeout(listen, Math.min(5000, 500 * 2 ** retries++));
      } finally {
        clearTimeout(watchdog);
        attempt.abort();
      }
    };
    const offline = () => { controller?.abort(); clearTimeout(timer); setConnection('reconnecting'); };
    const online = () => { clearTimeout(timer); timer = setTimeout(listen, 50); };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    void listen();
    return () => {
      cancelled = true; clearTimeout(timer); controller?.abort();
      window.removeEventListener('offline', offline); window.removeEventListener('online', online);
    };
  }, [session, applyRoom, storeSession]);

  const connect = async (club: OnlineClub, code?: string) => {
    if (inFlight.current || sessionRef.current) return;
    inFlight.current = true; setBusy(true); setError(''); setConnection('connecting');
    try {
      const result = await request(code ? `rooms/${code}/join` : 'rooms', null, { club });
      if (!result.token || !result.memberId) throw new Error('Oturum oluşturulamadı.');
      storeSession({ code: result.room.code, token: result.token, memberId: result.memberId });
      applyRoom(result.room, result.serverTime);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bağlanılamadı.');
      setConnection('disconnected');
    } finally { inFlight.current = false; setBusy(false); }
  };

  const action = async (name: string, extra: Record<string, unknown> = {}) => {
    const current = sessionRef.current;
    if (!current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await request(`rooms/${current.code}/${name}`, current, { week: room?.week, season: room?.season, ...extra });
      if (sessionRef.current?.token !== current.token) return;
      if (name === 'leave') {
        storeSession(null); setRoom(null); setConnection('disconnected'); setLastSynced(null);
      } else applyRoom(result.room, result.serverTime);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'İşlem başarısız.');
    } finally { inFlight.current = false; setBusy(false); }
  };

  return { session, room, connection, error, busy, lastSynced, serverTime, connect, action };
}

export type OnlineLeagueController = ReturnType<typeof useOnlineLeague>;
