import { useCallback, useEffect, useRef, useState } from 'react';
import type { OnlineClub, OnlineRoom, OnlineSession } from '../types/online';
import { normalizeOnlineCode, ONLINE_CODE_PATTERN } from '../utils/onlineCode';
import { ONLINE_SESSION_KEY, loadOnlineTabId } from '../utils/onlineStorage';
import { startOnlineConnection } from '../utils/onlineConnection';
import { retryAfterMs } from '../utils/onlineReconnect';

const SESSION_KEY = ONLINE_SESSION_KEY;
function savedSession(): OnlineSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return value && ONLINE_CODE_PATTERN.test(value.code) && /^[a-f0-9]{64}$/.test(value.token) && typeof value.memberId === 'string' ? value : null;
  } catch { return null; }
}

class ApiError extends Error {
  constructor(message: string, public status: number, public waitMs = 0) { super(message); }
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
    if (!response.ok) throw new ApiError(result.error || 'İşlem tamamlanamadı.', response.status, retryAfterMs(response));
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
  const [transport, setTransport] = useState<'stream' | 'poll'>('stream');
  const [issue, setIssue] = useState('');
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
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
    setLastSynced(Date.now());
    if (time) setServerTime(previous => Math.max(previous, time));
  }, []);

  useEffect(() => {
    if (!session) return;
    // Bağlantı makinesi çerçeveden bağımsızdır (src/utils/onlineConnection.ts): akış (SSE)
    // birincil, veri gelmezse yoklama yedeği. Kanca yalnızca durumu arayüze taşır.
    const connection = startOnlineConnection({
      session,
      tabId: loadOnlineTabId(),
      onRoom: applyRoom,
      onState: ({ connection: state, transport: next, issue: nextIssue }) => {
        setConnection(state); setTransport(next); setIssue(nextIssue);
      },
      onExpired: message => { storeSession(null); setRoom(null); setError(message); },
    });
    // Ağ geri geldiğinde beklemeden dene; kopmada akış zaten kendi hatasıyla düşer.
    const online = () => connection.retryNow();
    window.addEventListener('online', online);
    return () => { window.removeEventListener('online', online); connection.stop(); };
  }, [session, applyRoom, storeSession]);

  const connect = async (club: OnlineClub, code?: string) => {
    if (inFlight.current || sessionRef.current) return;
    const clean = code === undefined ? undefined : normalizeOnlineCode(code);
    if (clean !== undefined && !ONLINE_CODE_PATTERN.test(clean)) {
      setErrorStatus(400);
      setError('Kod 8 karakter olmalı ve 0, O, 1, I harflerini içermemeli. Davet bağlantısındaki kodu kopyala.');
      return;
    }
    inFlight.current = true; setBusy(true); setError(''); setErrorStatus(null); setConnection('connecting');
    try {
      const result = await request(clean ? `rooms/${clean}/join` : 'rooms', null, { club });
      if (!result.token || !result.memberId) throw new Error('Oturum oluşturulamadı.');
      storeSession({ code: result.room.code, token: result.token, memberId: result.memberId });
      setConnection('connected'); setIssue('');
      applyRoom(result.room, result.serverTime);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bağlanılamadı.');
      setErrorStatus(cause instanceof ApiError ? cause.status : null);
      setConnection('disconnected');
    } finally { inFlight.current = false; setBusy(false); }
  };

  const action = async (name: string, extra: Record<string, unknown> = {}) => {
    const current = sessionRef.current;
    if (!current || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setErrorStatus(null);
    try {
      const result = await request(`rooms/${current.code}/${name}`, current, { week: room?.week, season: room?.season, ...extra });
      if (sessionRef.current?.token !== current.token) return;
      if (name === 'leave') {
        storeSession(null); setRoom(null); setConnection('disconnected'); setLastSynced(null);
      } else { setConnection('connected'); setIssue(''); applyRoom(result.room, result.serverTime); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'İşlem başarısız.');
      setErrorStatus(cause instanceof ApiError ? cause.status : null);
    } finally { inFlight.current = false; setBusy(false); }
  };

  return { session, room, connection, transport, issue, error, errorStatus, busy, lastSynced, serverTime, connect, action };
}

export type OnlineLeagueController = ReturnType<typeof useOnlineLeague>;
