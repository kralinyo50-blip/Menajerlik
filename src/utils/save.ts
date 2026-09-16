import { GameState, FixtureEntry, Weather } from '../types/game';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';

export const SLOT_KEYS = [
  'ManagerPro2026_Save',       // Slot 1 (eski otomatik kayıt)
  'ManagerPro2026_Save_Slot2', // Slot 2
  'ManagerPro2026_Save_Slot3', // Slot 3
];

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
};

const WEATHERS: Weather[] = ['sunny', 'cloudy', 'rain', 'storm', 'snow', 'wind', 'fog'];

const randomWeather = (): Weather => WEATHERS[Math.floor(Math.random() * WEATHERS.length)];

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

  return {
    ...state,
    season: state.season ?? 1,
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
    team11: (state.team11 || []).map(p => ({ ...p, suspension: p.suspension ?? 0 })),
    bench: (state.bench || []).map(p => ({ ...p, suspension: p.suspension ?? 0 })),
    clubStats: {
      ...DEFAULT_CLUB_STATS,
      ...(state.clubStats || {}),
    },
    shopBranches: state.shopBranches ?? [],
  };
}

export function readSlot(slot: number): GameState | null {
  try {
    const raw = localStorage.getItem(SLOT_KEYS[slot]);
    if (!raw) return null;
    return migrateState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSlot(slot: number, state: GameState): boolean {
  try {
    localStorage.setItem(SLOT_KEYS[slot], JSON.stringify(state));
    localStorage.setItem(`${SLOT_KEYS[slot]}_time`, new Date().toISOString());
    return true;
  } catch {
    return false;
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

export function clearSlot(slot: number) {
  try {
    localStorage.removeItem(SLOT_KEYS[slot]);
    localStorage.removeItem(`${SLOT_KEYS[slot]}_time`);
  } catch {
    /* yoksay */
  }
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

export { randomWeather };
