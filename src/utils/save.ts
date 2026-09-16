import { GameState, FixtureEntry, Player, Weather } from '../types/game';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { createCareerMissions, createSeasonMissions, createWeeklyMissions } from './missions';
import { emptySkillTree } from './progression';
import { playerValue, playerWage } from './pricing';

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
  void 0;

  // Fikstür: isHome bilgisi olmayan eski kayıtlar → sırayla iç/dış saha ata
  const rawFixture = (parsed.fixture || []) as (FixtureEntry | Record<string, unknown>)[];
  state.fixture = rawFixture.map((entry, idx) => ({
    ...(entry as FixtureEntry),
    isHome: typeof (entry as FixtureEntry).isHome === 'boolean' ? (entry as FixtureEntry).isHome : idx % 2 === 0,
    week: (entry as FixtureEntry).week ?? idx + 1,
  }));

  const allPlayers = [...(state.team11 || []), ...(state.bench || [])];
  const bestPlayer = [...allPlayers].sort((a, b) => b.ovr - a.ovr)[0];

  const result: GameState = {
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
    team11: (state.team11 || []).map(p => ({
      ...p,
      suspension: p.suspension ?? 0,
      value: p.starTier ? playerValue(p.ovr, p.age, { tier: p.starTier, potential: p.potential }) : p.value,
    })),
    bench: (state.bench || []).map(p => ({
      ...p,
      suspension: p.suspension ?? 0,
      value: p.starTier ? playerValue(p.ovr, p.age, { tier: p.starTier, potential: p.potential }) : p.value,
    })),
    clubStats: {
      ...DEFAULT_CLUB_STATS,
      ...(state.clubStats || {}),
    },
    shopBranches: state.shopBranches ?? [],
  };

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

  return result;
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
