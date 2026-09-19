import { ONLINE_CODE_PATTERN } from './onlineCode';

export type GameMode = 'online' | 'offline' | null;

export function modeFromSearch(search: string): GameMode {
  const params = new URLSearchParams(search);
  const mode = params.get('mode');
  if (mode === 'online' || mode === 'offline') return mode;
  if (mode === 'menu') return null;
  // Invitation links open online directly, never the offline career setup.
  // en-US ile büyüt: Türkçe 'i' → 'İ' olup geçerli kodun bozulmasın.
  return ONLINE_CODE_PATTERN.test((params.get('lig') || '').toLocaleUpperCase('en-US')) ? 'online' : null;
}

export function modeUrl(current: string, mode: GameMode): string {
  const url = new URL(current);
  if (mode) url.searchParams.set('mode', mode);
  else url.searchParams.delete('mode');
  if (mode !== 'online') url.searchParams.delete('lig');
  return `${url.pathname}${url.search}${url.hash}`;
}
