import type { GameState } from '../types/game';
import { ONLINE_CODE_PATTERN } from './onlineCode';
import { migrateState } from './save';

export const ONLINE_CLUB_KEY = 'ManagerPro2026_OnlineClub_v1';
export const ONLINE_SESSION_KEY = 'ManagerPro2026_OnlineSession_v1';
export const ONLINE_TAB_KEY = 'ManagerPro2026_OnlineTab_v1';
type StoreReader = Pick<Storage, 'getItem'>;
type StoreWriter = Pick<Storage, 'setItem'>;
type TabStore = Pick<Storage, 'getItem' | 'setItem'>;

const TAB_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
// Depolama kapalıysa (gizli pencere kısıtı) sekme kimliği en azından bu sayfa boyunca sabit kalsın.
let fallbackTabId = '';

function randomTabId(): string {
  try {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return `t${[...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return `t${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`.slice(0, 26);
  }
}

/**
 * Bu sekmenin kimliği (sayfa yenilemeleri arasında sabit, sessionStorage'da tutulur).
 * Sunucu bu kimlikle aynı sekmenin kopmuş (zombi) canlı bağlantısını devralır; böylece
 * yenilenen sayfa eski bağlantının arkasında beklemek zorunda kalmaz ve zombi akışlar birikmez.
 */
export function loadOnlineTabId(storage?: TabStore): string {
  try {
    const target = storage ?? sessionStorage;
    const saved = target.getItem(ONLINE_TAB_KEY);
    if (saved && TAB_ID_PATTERN.test(saved)) return saved;
    const id = randomTabId();
    target.setItem(ONLINE_TAB_KEY, id);
    return id;
  } catch {
    fallbackTabId ||= randomTabId();
    return fallbackTabId;
  }
}

function decodeClub(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Record<string, unknown>;
  if (typeof state.teamName !== 'string' || !state.teamName.trim() || !Array.isArray(state.team11) || state.team11.length !== 11 || !Array.isArray(state.bench)) return null;
  const tactics = state.tactics as { style?: string; formation?: string } | undefined;
  if (typeof state.teamLogo !== 'string' || !tactics || !['balanced','attack','defense','possession'].includes(tactics.style || '') || typeof tactics.formation !== 'string') return null;
  if (![...state.team11, ...state.bench].every(p => p && typeof p.name === 'string' && Number.isFinite(p.id) && Number.isFinite(p.ovr) && p.ovr >= 1 && p.ovr <= 99 && Number.isFinite(p.energy) && p.energy >= 0 && p.energy <= 100 && ['KL','STP','SB','OS','FW'].includes(p.role))) return null;
  return migrateState(state);
}

/** One-time compatibility read only. This module never writes career slots/recovery. */
export function loadOnlineClub(storage?: StoreReader): GameState | null {
  try {
    const target = storage ?? localStorage;
    const saved = target.getItem(ONLINE_CLUB_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data?.schema === 1 ? decodeClub(data.club) : null;
    }
    // Before mode separation an online session used the offline club. Copy it once
    // only when a genuine saved online session exists, without modifying that save.
    const session = JSON.parse(target.getItem(ONLINE_SESSION_KEY) || 'null');
    if (!session || !ONLINE_CODE_PATTERN.test(session.code) || !/^[a-f0-9]{64}$/.test(session.token) || typeof session.memberId !== 'string') return null;
    return decodeClub(JSON.parse(target.getItem('ManagerPro2026_Save') || 'null'));
  } catch { return null; }
}

export function saveOnlineClub(club: GameState, storage?: StoreWriter): boolean {
  try {
    (storage ?? localStorage).setItem(ONLINE_CLUB_KEY, JSON.stringify({ schema: 1, club }));
    return true;
  } catch { return false; }
}
