import { GameState, FixtureEntry, Player, Weather } from '../types/game';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { createCareerMissions, createSeasonMissions, createWeeklyMissions } from './missions';
import { emptySkillTree } from './progression';
import { playerValue, playerWage } from './pricing';
import { defaultStadium } from '../data/stadium';
import { defaultFacility, normalizeFacility } from '../data/facility';
import { defaultLife } from './life';
import { generateInitialFeed } from '../data/social';
import { randomCountry } from '../data/countries';

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
  socialEarnings: 0,
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
    // ⚠️ taktikler eski kayıtlarda (v2.x/3.0) yoktu — maç ekranı
    // gameState.tactics.formation okuduğu için eksikse MAÇA GİRERKEN çöküyordu
    tactics: state.tactics ?? {
      formation: '4-3-3',
      style: 'balanced',
      pressing: 'medium',
      tempo: 'normal',
      defensiveLine: 50,
      width: 50,
      creativity: 50,
      pressingIntensity: 50,
      tempoValue: 50,
    },
    // maç geçmişi yoksa boş dizi — PreMatchScreen slice(-5) yapıyor
    matchHistory: state.matchHistory ?? [],
    league: state.league ?? [],
    cupMatches: state.cupMatches ?? [],
    marketList: state.marketList ?? [],
    academyPlayers: state.academyPlayers ?? [],
    news: state.news ?? [],
    trophies: state.trophies ?? [],
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
      ...defaultStadium(),
      ...(state.stadium || {}),
      design: { ...defaultStadium().design, ...(state.stadium?.design || {}) },
      cosmetics: state.stadium?.cosmetics ?? defaultStadium().cosmetics,
    },
    socialFeed: (state as any).socialFeed ?? [],
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
