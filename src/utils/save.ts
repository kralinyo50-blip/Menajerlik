import { GameState, FixtureEntry, Player, Weather } from '../types/game';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { createCareerMissions, createSeasonMissions, createWeeklyMissions } from './missions';
import { emptySkillTree } from './progression';
import { playerValue, playerWage } from './pricing';
import { defaultStadium, defaultFacilities } from '../data/stadium';
import { normalizeBuffetState } from '../data/buffet';
import { defaultFacility, normalizeFacility } from '../data/facility';
import { defaultLife } from './life';
import { generateInitialFeed } from '../data/social';
import { randomCountry } from '../data/countries';

export const SLOT_KEYS = [
  'ManagerPro2026_Save',       // Slot 1 (eski otomatik kayıt)
  'ManagerPro2026_Save_Slot2', // Slot 2
  'ManagerPro2026_Save_Slot3', // Slot 3
];

export const BACKUP_PREFIX = 'ManagerPro2026_Backup_';
export const RECOVERY_KEY = 'ManagerPro2026_Recovery';
export const BACKUP_LIST_KEY = 'ManagerPro2026_BackupList';
export const MAX_BACKUPS_PER_SLOT = 8;
export const AUTOSAVE_KEY = 'ManagerPro2026_Autosave';
export const ARCHIVE_PREFIX = 'ManagerPro2026_Archive_';

export interface SlotInfo {
  slot: number;
  exists: boolean;
  teamName?: string;
  teamLogo?: string;
  season?: number;
  week?: number;
  leagueLevel?: number;
  budget?: number;
  updatedAt?: string;
}

const DEFAULT_CLUB_STATS: GameState['clubStats'] = {
  totalGoals: 0,
  totalWins: 0,
  totalDraws: 0,
  totalLosses: 0,
  cupWins: 0,
  leagueTitles: 0,
  cleanSheets: 0,
  penaltiesScored: 0,
  minigamesWon: 0,
  totalAttendance: 0,
  motmAwards: 0,
  redCards: 0,
  socialEarnings: 0,
};

const WEATHERS: Weather[] = ['sunny', 'cloudy', 'rain', 'storm', 'snow', 'wind', 'fog'];

export const randomWeather = (): Weather => WEATHERS[Math.floor(Math.random() * WEATHERS.length)];

/** Eski kayıtları yeni şemaya taşır (geriye dönük uyumluluk) */
export function migrateState(parsed: Partial<GameState> & Record<string, unknown>): GameState {
  const state = { ...parsed } as GameState;

  // Fikstür: isHome bilgisi olmayan eski kayıtlar → sırayla iç/dış saha ata
  const rawFixture = (parsed.fixture || []) as (FixtureEntry | Record<string, unknown>)[];
  state.fixture = rawFixture.map((entry, idx) => ({
    ...(entry as FixtureEntry),
    isHome: typeof (entry as FixtureEntry).isHome === 'boolean' ? (entry as FixtureEntry).isHome : idx % 2 === 0,
    week: (entry as FixtureEntry).week ?? idx + 1,
  }));

  const allPlayers = [...(state.team11 || []), ...(state.bench || [])];
  const bestPlayer = [...allPlayers].sort((a, b) => b.ovr - a.ovr)[0];

  const defStadium = defaultStadium();

  const result: GameState = {
    ...state,
    season: state.season ?? 1,
    lifetimeSocialEarnings: (state as any).lifetimeSocialEarnings ?? 0,
    weeklySocialEarnings: (state as any).weeklySocialEarnings ?? 0,
    lastSocialPayoutWeek: (state as any).lastSocialPayoutWeek ?? 0,
    difficulty: state.difficulty ?? 'normal',
    achievements: state.achievements ?? INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
    tutorialDone: state.tutorialDone ?? true,
    minigameTokens: state.minigameTokens ?? 2,
    lastSpinWeek: state.lastSpinWeek ?? 0,
    fanHappiness: state.fanHappiness ?? 60,
    teamChemistry: state.teamChemistry ?? 55,
    boardConfidence: state.boardConfidence ?? 50,
    captainId: state.captainId ?? bestPlayer?.id ?? null,
    setPieceTakers: state.setPieceTakers ?? {
      penalty: bestPlayer?.id ?? null,
      freekick: bestPlayer?.id ?? null,
      corner: bestPlayer?.id ?? null,
    },
    trainingFocus: state.trainingFocus ?? 'balanced',
    leagueScorers: state.leagueScorers ?? [],
    transferOffers: state.transferOffers ?? [],
    weather: state.weather ?? randomWeather(),
    soundOn: state.soundOn ?? true,
    boardWarnings: state.boardWarnings ?? 0,
    careerOver: state.careerOver ?? false,
    careerOverReason: state.careerOverReason ?? null,
    boardMessages: state.boardMessages ?? [],
    managerXp: state.managerXp ?? 0,
    managerLevel: state.managerLevel ?? 1,
    skillPoints: state.skillPoints ?? 2,
    skills: state.skills ?? emptySkillTree(),
    missions: state.missions ?? [],
    lastPlayedDate: state.lastPlayedDate ?? '',
    loginStreak: state.loginStreak ?? 0,
    lastDailyReward: state.lastDailyReward ?? null,
    loanList: state.loanList ?? [],
    outgoingLoans: state.outgoingLoans ?? [],
    lastMarketRefreshWeek: (state as any).lastMarketRefreshWeek ?? 1,
    matchesSinceMarketRefresh: (state as any).matchesSinceMarketRefresh ?? 0,
    botTransfers: (state as any).botTransfers ?? [],
    team11: (state.team11 || []).map(p => {
      const rc = !p.flag ? randomCountry() : null;
      return {
        ...p,
        suspension: p.suspension ?? 0,
        value: p.starTier ? playerValue(p.ovr, p.age, { tier: p.starTier, potential: p.potential }) : p.value,
        country: p.country ?? rc?.country ?? 'Türkiye',
        flag: p.flag ?? rc?.flag ?? '🇹🇷',
      };
    }),
    bench: (state.bench || []).map(p => {
      const rc = !p.flag ? randomCountry() : null;
      return {
        ...p,
        suspension: p.suspension ?? 0,
        value: p.starTier ? playerValue(p.ovr, p.age, { tier: p.starTier, potential: p.potential }) : p.value,
        country: p.country ?? rc?.country ?? 'Türkiye',
        flag: p.flag ?? rc?.flag ?? '🇹🇷',
      };
    }),
    clubStats: {
      ...DEFAULT_CLUB_STATS,
      ...(state.clubStats || {}),
    },
    shopBranches: state.shopBranches ?? [],
    life: {
      ...defaultLife(),
      ...(state.life || {}),
      stats: { ...defaultLife().stats, ...(state.life?.stats || {}) },
      owned: state.life?.owned ?? [],
      weekLog: state.life?.weekLog ?? {},
      history: state.life?.history ?? [],
    },
    facility: normalizeFacility({ ...defaultFacility(), ...(state.facility || {}) }),
    stadium: {
      ...defStadium,
      ...(state.stadium || {}),
      design: { ...defStadium.design, ...(state.stadium?.design || {}) },
      cosmetics: state.stadium?.cosmetics ?? defStadium.cosmetics,
      tribunes: (state.stadium as any)?.tribunes ?? defStadium.tribunes,
      facilities: (state.stadium as any)?.facilities ?? defStadium.facilities ?? defaultFacilities(),
      buffet: normalizeBuffetState((state.stadium as any)?.buffet),
      facilityIncomeTotal: (state.stadium as any)?.facilityIncomeTotal ?? 0,
      lastFacilityIncome: (state.stadium as any)?.lastFacilityIncome ?? 0,
      lastEventIncome: (state.stadium as any)?.lastEventIncome ?? 0,
    },
    socialFeed: (state as any).socialFeed ?? [],
  } as any;

  // Eski (2.x/3.0/3.1) kayıtların oyuncu değer ve maaşları yeni piyasa ekonomisine çekilir.
  // Kiralık oyuncuların maaş payı korunur.
  const sample = result.team11?.[0];
  const needsRepricing = !!sample && sample.value < playerValue(sample.ovr, sample.age, { potential: sample.potential }) * 0.5;

  if (needsRepricing) {
    const reprice = (p: Player): Player => ({
      ...p,
      value: playerValue(p.ovr, p.age, { tier: p.starTier, potential: p.potential }),
      wage: p.loanFrom ? Math.round(playerWage(p.ovr, p.starTier) * 0.6) : playerWage(p.ovr, p.starTier),
    });
    result.team11 = result.team11.map(reprice);
    result.bench = result.bench.map(reprice);
    result.marketList = (result.marketList || []).map(reprice);
    result.academyPlayers = (result.academyPlayers || []).map(reprice);
  }

  // Görevler yoksa (eski kayıt) oluştur
  if (!result.missions || result.missions.length === 0) {
    result.missions = [
      ...createCareerMissions(result, 4),
      ...createSeasonMissions(result, 3),
      ...createWeeklyMissions(result, 3),
    ];
  }
  if (!result.socialFeed || (result.socialFeed as any[]).length === 0) {
    try { result.socialFeed = generateInitialFeed(result as any); } catch { result.socialFeed = [] as any; }
  }
  // Bayrak eksik oyunculara bayrak ata (eski kayıtlar)
  const ensureFlag = (p: Player): Player => {
    if (p.flag && p.country) return p;
    const rc = randomCountry();
    return { ...p, country: p.country ?? rc.country, flag: p.flag ?? rc.flag };
  };
  result.team11 = result.team11.map(ensureFlag);
  result.bench = result.bench.map(ensureFlag);
  result.marketList = (result.marketList || []).map(ensureFlag);
  result.academyPlayers = (result.academyPlayers || []).map(ensureFlag);
  if (result.loanList) result.loanList = result.loanList.map(l => ({ ...l, player: ensureFlag(l.player) }));
  if ((result as any).outgoingLoans) (result as any).outgoingLoans = (result as any).outgoingLoans.map((l: any) => ({ ...l, player: ensureFlag(l.player) }));

  // Tesisler göçü
  if (!result.stadium.facilities) {
    result.stadium.facilities = defaultFacilities();
  }
  // Büfe işletmesi göçü (marka sponsorluğu + menü + fiyat politikası)
  result.stadium.buffet = normalizeBuffetState((result.stadium as any).buffet);

  return result;
}

/** Backup listesini oku */
function readBackupList(): { slot: number; key: string; time: string }[] {
  try {
    const raw = localStorage.getItem(BACKUP_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}
function writeBackupList(list: { slot: number; key: string; time: string }[]) {
  try { localStorage.setItem(BACKUP_LIST_KEY, JSON.stringify(list.slice(-50))); } catch {}
}

/** Mevcut kaydı backup'a al — asla silme, sadece ekle */
function backupSlot(slot: number) {
  try {
    const key = SLOT_KEYS[slot];
    const existing = localStorage.getItem(key);
    if (!existing) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `${BACKUP_PREFIX}${slot}_${timestamp}`;
    localStorage.setItem(backupKey, existing);
    const timeKey = `${key}_time`;
    const timeVal = localStorage.getItem(timeKey);
    if (timeVal) localStorage.setItem(`${backupKey}_time`, timeVal);
    const list = readBackupList();
    list.push({ slot, key: backupKey, time: new Date().toISOString() });
    // per slot max backups
    const perSlot = list.filter(b => b.slot === slot);
    if (perSlot.length > MAX_BACKUPS_PER_SLOT) {
      const toRemove = perSlot.slice(0, perSlot.length - MAX_BACKUPS_PER_SLOT);
      toRemove.forEach(b => {
        try { localStorage.removeItem(b.key); localStorage.removeItem(`${b.key}_time`); } catch {}
      });
      const remaining = list.filter(b => !toRemove.some(r => r.key === b.key));
      writeBackupList(remaining);
    } else {
      writeBackupList(list);
    }
  } catch {}
}

export function readSlot(slot: number): GameState | null {
  // Try main slot
  try {
    const raw = localStorage.getItem(SLOT_KEYS[slot]);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.teamName && parsed?.team11) return migrateState(parsed);
    }
  } catch {}
  // Try autosave
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.teamName && parsed?.team11) return migrateState(parsed);
    }
  } catch {}
  // Try recovery
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.teamName && parsed?.team11) return migrateState(parsed);
    }
  } catch {}
  // Try backups
  try {
    const list = readBackupList().filter(b => b.slot === slot).reverse();
    for (const b of list) {
      const raw = localStorage.getItem(b.key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.teamName && parsed?.team11) return migrateState(parsed);
      } catch { continue; }
    }
  } catch {}
  return null;
}

export function writeSlot(slot: number, state: GameState): boolean {
  try {
    // Validate state before saving — never save corrupt data
    if (!state?.teamName || !state?.team11 || state.team11.length < 7) {
      console.warn('Corrupt state, refusing to save');
      return false;
    }
    // Backup existing before overwrite
    backupSlot(slot);
    // Also keep recovery copy
    try {
      const json = JSON.stringify(state);
      localStorage.setItem(RECOVERY_KEY, json);
      localStorage.setItem(`${RECOVERY_KEY}_time`, new Date().toISOString());
      localStorage.setItem(AUTOSAVE_KEY, json);
      localStorage.setItem(`${AUTOSAVE_KEY}_time`, new Date().toISOString());
    } catch {}
    // Write main slot atomically via temp key
    const json = JSON.stringify(state);
    const tempKey = `${SLOT_KEYS[slot]}_temp`;
    localStorage.setItem(tempKey, json);
    // Verify temp write
    const verify = localStorage.getItem(tempKey);
    if (!verify) return false;
    localStorage.setItem(SLOT_KEYS[slot], verify);
    localStorage.setItem(`${SLOT_KEYS[slot]}_time`, new Date().toISOString());
    localStorage.removeItem(tempKey);
    return true;
  } catch (e) {
    console.error('Save failed', e);
    // If quota exceeded, try to clean only old backup temp keys, never main slots
    try {
      const keysToClean: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('_temp')) keysToClean.push(k);
      }
      keysToClean.forEach(k => { try { localStorage.removeItem(k); } catch {} });
      // retry once
      const json = JSON.stringify(state);
      localStorage.setItem(SLOT_KEYS[slot], json);
      localStorage.setItem(`${SLOT_KEYS[slot]}_time`, new Date().toISOString());
      return true;
    } catch {
      return false;
    }
  }
}

export function describeSlots(): SlotInfo[] {
  return SLOT_KEYS.map((key, idx) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { slot: idx, exists: false };
      const parsed = JSON.parse(raw) as GameState;
      return {
        slot: idx,
        exists: true,
        teamName: parsed.teamName,
        teamLogo: parsed.teamLogo,
        season: parsed.season ?? 1,
        week: parsed.week ?? 1,
        leagueLevel: parsed.leagueLevel ?? 4,
        budget: parsed.budget,
        updatedAt: localStorage.getItem(`${key}_time`) ?? undefined,
      };
    } catch {
      return { slot: idx, exists: false };
    }
  });
}

/** Asla silme — arşive taşı */
export function clearSlot(slot: number) {
  try {
    const key = SLOT_KEYS[slot];
    const existing = localStorage.getItem(key);
    if (existing) {
      const archiveKey = `${ARCHIVE_PREFIX}${slot}_${Date.now()}`;
      localStorage.setItem(archiveKey, existing);
      const t = localStorage.getItem(`${key}_time`);
      if (t) localStorage.setItem(`${archiveKey}_time`, t);
      // Also keep in backup list
      const list = readBackupList();
      list.push({ slot, key: archiveKey, time: new Date().toISOString() });
      writeBackupList(list);
    }
    // NOT deleting main slot — user requested never delete
    // Instead, we keep it but mark as archived in separate storage
    // For compatibility, we DO remove from main slot only if explicitly called for new career,
    // but we have already archived it above, so recovery is possible.
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_time`);
  } catch {
    /* yoksay */
  }
}

/** Tüm backup'ları listele */
export function listBackups(): { slot: number; key: string; time: string; teamName?: string }[] {
  const list = readBackupList();
  return list.map(b => {
    try {
      const raw = localStorage.getItem(b.key);
      if (!raw) return b;
      const parsed = JSON.parse(raw);
      return { ...b, teamName: parsed.teamName };
    } catch { return b; }
  });
}

/** Kaydı .json olarak indirir (yedek) */
export function exportSaveToFile(state: GameState) {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `manager-pro-${state.teamName.replace(/\s+/g, '-')}-S${state.season}-H${state.week}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importSaveFromFile(file: File): Promise<GameState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !parsed.teamName || !parsed.team11) {
          reject(new Error('Geçersiz kayıt dosyası'));
          return;
        }
        resolve(migrateState(parsed));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Dosya okunamadı'));
      }
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsText(file);
  });
}
