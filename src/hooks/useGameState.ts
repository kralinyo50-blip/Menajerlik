import { useState, useCallback } from 'react';
import {
  GameState, Player, Team, Tactics, Staff, CupMatch, Difficulty, Weather, TransferOffer,
  LeagueScorer, MatchReport, TrainingFocus, PlayerRating, SkillId, LoanOutOffer, LifeActivityId,
  FacilityModuleId, FacilityReport, FacilityState
} from '../types/game';
import {
  FIRST_NAMES, LAST_NAMES, BOT_NAMES_BY_LEVEL, FORMATIONS,
  INITIAL_INVESTMENTS, CREDIT_PACKAGES, UNHAPPY_MORALE
} from '../data/constants';
import { TURKEY_CITIES, SHOP_TYPES } from '../data/cities';
import { INITIAL_ACHIEVEMENTS, DIFFICULTY_CONFIG } from '../data/achievements';
import { generateFixture, calculateAttendance, awayIncome } from '../utils/fixture';
import { playerValue, playerWage, marketRefreshCost } from '../utils/pricing';
import { defaultStadium } from '../data/stadium';
import {
  defaultFacility, normalizeFacility, facilityUpgradeCost, facilityEffects, FACILITY_MODULE_MAP, FACILITY_MAX_LEVEL
} from '../data/facility';
import {
  defaultLife, computeOutcome, lifeWeeklyReset, managerRecoveryBonus, fameIncomeMultiplier
} from '../utils/life';
import { LIFE_ITEMS, ACTIVITY_MAP as LIFE_ACTIVITIES_LOOKUP } from '../data/life';
import {
  stadiumCapacity, ticketPriceFor, demandFactor, weatherShield, gateMultiplier, stadiumLoveBonus, fanSpendingPerFan, starShopMultiplier,
  facilityIncomePerFan, facilityHappinessBonus, getStadiumFacilities, buffetBreakdown
} from '../utils/stadium';
import {
  BUFFET_MENU_MAP, BUFFET_PRICE_MAP, BUFFET_SPONSOR_MAP, buffetBreakFee, normalizeBuffetState
} from '../data/buffet';
import type { BuffetPriceLevel } from '../types/game';
import { StadiumDesign as StadiumDesignType } from '../types/game';
import {
  CAPACITY_PACKAGES, COSMETICS, MAX_CAPACITY, TICKET_STRATEGIES, isUnlocked, PREMIUM_COLORS,
  STADIUM_FACILITY_DEFS, STADIUM_FACILITY_MAP, facilityUpgradeCost as stadiumFacilityUpgradeCost, defaultFacilities
} from '../data/stadium';
import {
  assignKeyPlayers, buildGenericMarketPlayers, buildMarketStars, generateLoanList,
  applyLoanGrowth
} from '../utils/loan';
import { readSlot, writeSlot, randomWeather } from '../utils/save';
import { fixLineup } from '../utils/lineup';
import { effectiveOvr } from '../utils/adaptation';
import { renewalCost, renewalWage } from '../utils/contract';
import { createCareerMissions, createSeasonMissions, createWeeklyMissions, evaluateMissions, refreshWeeklyIfNeeded } from '../utils/missions';
import {
  SKILLS, emptySkillTree, grantXp, skillBuyDiscount, skillFatigueReduction, skillInjuryReduction, skillMoraleBonus,
  skillRecoveryBonus, skillSellBonus, skillSponsorBonus, skillYouthBonus
} from '../utils/progression';
import { generateInitialFeed, generateMatchFeedPosts, generateTransferPost, generateWeeklyBotPosts } from '../data/social';
import { randomCountry } from '../data/countries';

/** Renk ücretsiz paletlerden mi yoksa satın alınmış mı? */
function isColorUnlocked(stadium: GameState['stadium'], hex: string): boolean {
  if (!hex) return false;
  const free = ['#1d4ed8', '#dc2626', '#059669', '#111827', '#f8fafc', '#f59e0b', '#facc15', '#38bdf8', '#f472b6', '#34d399'];
  if (free.includes(hex.toLowerCase()) || free.includes(hex.toUpperCase())) return true;
  const cosmetics = stadium?.cosmetics || [];
  return cosmetics.some(id => id.startsWith('color:') && id.slice(6).toLowerCase() === hex.toLowerCase());
}

const generatePlayerName = () => {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
};

const calculatePlayerValue = (ovr: number, age: number, potential?: number) =>
  playerValue(ovr, age, { potential });

const generatePlayer = (role: string, minOvr: number, maxOvr: number, id: number): Player => {
  const ovr = minOvr + Math.floor(Math.random() * Math.max(1, maxOvr - minOvr));
  const age = 18 + Math.floor(Math.random() * 17);
  const rc = randomCountry();
  return {
    id,
    name: generatePlayerName(),
    ovr,
    role: role as Player['role'],
    energy: 100,
    morale: 75 + Math.floor(Math.random() * 25),
    goals: 0,
    assists: 0,
    injured: false,
    injuryWeeks: 0,
    age,
    potential: Math.min(99, ovr + Math.floor(Math.random() * 15)),
    value: calculatePlayerValue(ovr, age, Math.min(99, ovr + Math.floor(Math.random() * 15))),
    wage: playerWage(ovr),
    contract: 1 + Math.floor(Math.random() * 4),
    yellowCards: 0,
    redCard: false,
    suspension: 0,
    matchesPlayed: 0,
    form: 5 + Math.floor(Math.random() * 4),
    country: rc.country,
    flag: rc.flag
  };
};

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/** Poisson dağılımı ile gerçekçi gol sayısı */
const poissonGoals = (lambda: number): number => {
  const L = Math.exp(-Math.max(0.15, lambda));
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 12);
  return k - 1;
};

/** Rakip kulüplerin gol krallığı listesini canlı tutar */
const bumpScorers = (scorers: LeagueScorer[], club: string, logo: string, goals: number) => {
  if (goals <= 0) return;
  let clubScorers = scorers.filter(s => s.club === club);
  if (clubScorers.length < 3) {
    const fresh: LeagueScorer = { name: generatePlayerName(), club, logo, goals: 0, assists: 0 };
    scorers.push(fresh);
    clubScorers = [...clubScorers, fresh];
  }
  const pick = clubScorers[Math.floor(Math.random() * clubScorers.length)];
  pick.goals += goals;
  if (Math.random() < 0.5) {
    const assister = clubScorers[Math.floor(Math.random() * clubScorers.length)];
    if (assister !== pick) assister.assists += 1;
  }
};

/* ══════════ GERÇEKÇİ YATIRIM MOTORU ══════════ */
function gaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Eski kayıtları yeni şemaya göç ettir
function ensureInvestments(investments: any[]): import('../types/game').Investment[] {
  if (!investments || investments.length === 0) return [...INITIAL_INVESTMENTS].map(i => ({ ...i, history: [...(i.history as number[])] })) as any;
  const byId = new Map(INITIAL_INVESTMENTS.map(i => [i.id, i] as const));
  return investments.map((inv: any) => {
    const tpl = byId.get(inv.id);
    if (!tpl) return inv;
    const base = tpl as any;
    return {
      id: inv.id,
      name: inv.name ?? base.name,
      price: typeof inv.price === 'number' ? inv.price : base.price,
      basePrice: inv.basePrice ?? base.basePrice,
      type: inv.type ?? base.type,
      owned: inv.owned ?? 0,
      lastChange: inv.lastChange ?? 0,
      icon: inv.icon ?? base.icon,
      history: Array.isArray(inv.history) && inv.history.length >= 8 ? inv.history.slice(-20) : [...base.history],
      volatility: inv.volatility ?? base.volatility,
      drift: inv.drift ?? base.drift,
      dividendYield: inv.dividendYield ?? base.dividendYield,
      risk: inv.risk ?? base.risk,
      sector: inv.sector ?? base.sector,
      description: inv.description ?? base.description,
      avgCost: inv.avgCost ?? inv.price ?? base.price,
      dividendsEarned: inv.dividendsEarned ?? 0,
      marketBeta: inv.marketBeta ?? base.marketBeta,
    };
  });
}

function investmentFeeRate(type: string): number {
  switch (type) {
    case 'stock': return 0.008; // %0.8
    case 'gold': return 0.006;
    case 'realestate': return 0.012; // tapu + komisyon yüksek
    case 'crypto': return 0.010;
    case 'bond': return 0.004;
    default: return 0.008;
  }
}

function pickMarketEvent(): { label: string; mods: Partial<Record<string, number>> } | null {
  if (Math.random() > 0.28) return null;
  const events = [
    { label: 'TCMB faiz artırdı — tahvil fırladı, borsa baskılandı', mods: { bond: 0.016, stock: -0.018, gold: 0.008 } },
    { label: 'Enflasyon beklentiyi aştı — altın ve emlak coştu', mods: { gold: 0.022, realestate: 0.014, bond: -0.010 } },
    { label: 'Kripto ETF onayı — kripto rallisi', mods: { crypto: 0.075, stock: 0.006 } },
    { label: 'Kripto düzenleme endişesi — sert satış', mods: { crypto: -0.085 } },
    { label: 'BIST bilançolar güçlü — borsa pozitif', mods: { stock: 0.021, realestate: 0.006 } },
    { label: 'Küresel risk iştahı düştü — güvenli liman talebi', mods: { gold: 0.018, stock: -0.015, crypto: -0.025 } },
    { label: 'Konut kampanyası açıklandı — GYO prim yaptı', mods: { realestate: 0.019 } },
    { label: 'Hazine ihalesine güçlü talep — tahvil ralli', mods: { bond: 0.012 } },
  ];
  return events[Math.floor(Math.random() * events.length)];
}


export interface MatchOutcomeOptions {
  isCup?: boolean;
  isHome?: boolean;
  weather?: Weather;
  attendance?: number;
  motmPlayerId?: number | null;
  cards?: { playerId: number; type: 'yellow' | 'red' }[];
  injuries?: { playerId: number; weeks: number }[];
  ratings?: PlayerRating[];
  penaltyWinner?: 'user' | 'opponent';
  report?: MatchReport;
  teamTalkMorale?: number;
}

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading] = useState(false);

  /* ══════════════ KURULUM ══════════════ */
  const initializeGame = useCallback((teamName: string, teamLogo: string, difficulty: Difficulty = 'normal') => {
    const leagueLevel = 4;
    const diffCfg = DIFFICULTY_CONFIG[difficulty];
    const baseOvr = Math.floor((50 + (5 - leagueLevel) * 10) * diffCfg.oppOvrMult);

    const formation = FORMATIONS['4-3-3'];
    const team11: Player[] = formation.map((pos, i) => {
      const player = generatePlayer(pos.r, 72, 80, i);
      player.t = pos.t;
      player.l = pos.l;
      return player;
    });

    const benchRoles = ['STP', 'SB', 'OS', 'OS', 'FW', 'FW', 'KL'];
    const bench: Player[] = benchRoles.map((role, i) => generatePlayer(role, 68, 76, 100 + i));

    const userTeam: Team = {
      name: teamName,
      logo: teamLogo,
      o: 0, g: 0, b: 0, m: 0, p: 0, gf: 0, ga: 0,
      ovr: Math.floor(team11.reduce((acc, p) => acc + p.ovr, 0) / 11),
      isUser: true
    };

    const botData = BOT_NAMES_BY_LEVEL[leagueLevel];
    const league: Team[] = [userTeam];
    botData.forEach(bot => {
      league.push({
        name: bot.name,
        logo: bot.logo,
        o: 0, g: 0, b: 0, m: 0, p: 0, gf: 0, ga: 0,
        ovr: baseOvr + Math.floor(Math.random() * 12),
        isUser: false
      });
    });

    // Rakip kulüplere bilindik yıldız oyuncuları ata
    const leagueWithStars = assignKeyPlayers(league);
    const bots = leagueWithStars.filter(t => !t.isUser);
    const fixture = generateFixture(userTeam, bots);

    const cupTeams = shuffleArray([...bots]).slice(0, 4);
    const cupMatches: CupMatch[] = [
      { round: '1. Tur', opponent: cupTeams[0], played: false },
      { round: 'Çeyrek Final', opponent: cupTeams[1], played: false },
      { round: 'Yarı Final', opponent: cupTeams[2], played: false },
      { round: 'Final', opponent: cupTeams[3], played: false }
    ];

    const captain = [...team11].sort((a, b) => b.ovr - a.ovr)[0];

    const initialState: GameState = {
      teamName,
      teamLogo,
      team11,
      bench,
      league: leagueWithStars,
      fixture,
      marketList: [],
      week: 1,
      season: 1,
      budget: diffCfg.startingBudget,
      lifetimeSocialEarnings: 0,
      weeklySocialEarnings: 0,
      lastSocialPayoutWeek: 0,
      stadiumLvl: 1,
      trainingLvl: 1,
      healthLvl: 1,
      scoutLvl: 1,
      academyLevel: 1,
      leagueLevel,
      trophies: [],
      activeSponsor: null,
      staff: [],
      academyPlayers: [],
      matchHistory: [],
      clubStats: {
        socialEarnings: 0,
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
        redCards: 0
      },
      tactics: {
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
      investments: INITIAL_INVESTMENTS.map(i => ({ ...i, history: [...(i.history as number[])] })),
      activeCredits: [],
      creditScore: 620,
      cupMatches,
      cupEliminated: false,
      seasonObjective: 'İlk 5\'e gir',
      managerRep: 50,
      news: [
        'Yeni sezon heyecanla bekleniyor!',
        'Transfer dönemi açıldı — Ofis sekmesinden teklifleri takip et.',
        'Mini oyun jetonların hazır!'
      ],
      shopBranches: [],
      difficulty,
      achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a })),
      tutorialDone: false,
      minigameTokens: difficulty === 'easy' ? 3 : difficulty === 'legend' ? 1 : 2,
      lastSpinWeek: 0,
      fanHappiness: 60,
      teamChemistry: 55,
      boardConfidence: 50,
      captainId: captain?.id ?? null,
      setPieceTakers: {
        penalty: [...team11].sort((a, b) => b.ovr - a.ovr)[1]?.id ?? captain?.id ?? null,
        freekick: captain?.id ?? null,
        corner: [...team11].sort((a, b) => b.ovr - a.ovr)[2]?.id ?? null
      },
      trainingFocus: 'balanced',
      leagueScorers: [],
      transferOffers: [],
      weather: randomWeather(),
      soundOn: true,
      boardWarnings: 0,
      careerOver: false,
      careerOverReason: null,
      boardMessages: [
        '👔 Yönetim: Sezon hedefimiz ilk 5. Başarılar dileriz.'
      ],
      managerXp: 0,
      managerLevel: 1,
      skillPoints: 2,
      skills: emptySkillTree(),
      missions: [],
      lastPlayedDate: '',
      loginStreak: 0,
      lastDailyReward: null,
      loanList: [],
      outgoingLoans: [],
      lastMarketRefreshWeek: 1,
      matchesSinceMarketRefresh: 0,
      botTransfers: [],
      stadium: defaultStadium(),
      facility: defaultFacility(),
      clubPhilosophy: null,
      ultrasHappiness: 65,
      ultrasRequests: [],
      museum: [],
      pendingPress: null,
      scoutMissions: [],
      scoutReports: [],
      devices: [{ id: 'phone_mini', name: 'Akıllı Mini 12', brand: 'Meyve', category: 'phone', price: 18000, quality: 42, camera: 45, performance: 40, icon: '📱', desc: 'Giriş seviye' }],
      activeDeviceId: 'phone_mini',
      pcBuild: {},
      pcInventory: [],
      life: defaultLife(),
      socialFeed: []
    };

    // Transfer pazarı: genişletildi — 30-40 oyuncu, her 3 maçta yenilenir
    const genericCount = 24 + Math.floor(Math.random() * 7); // 24-30
    initialState.marketList = [
      ...buildGenericMarketPlayers(initialState, genericCount),
      ...buildMarketStars(initialState)
    ];
    // 36'ya tamamla
    if (initialState.marketList.length < 28) {
      const extra = buildGenericMarketPlayers(initialState, 28 - initialState.marketList.length);
      initialState.marketList = [...initialState.marketList, ...extra];
    }
    initialState.marketList = initialState.marketList.slice(0, 36);

    // Kiralık listesi
    initialState.loanList = generateLoanList(initialState, 5);
    initialState.outgoingLoans = [];

    // Görevler: kariyer (kalıcı) + sezon + haftalık
    initialState.missions = [
      ...createCareerMissions(initialState, 4),
      ...createSeasonMissions(initialState, 3),
      ...createWeeklyMissions(initialState, 3)
    ];

    // Sosyal akış — ilk hafta bot + hoşgeldin
    initialState.socialFeed = generateInitialFeed(initialState);

    setGameState(initialState);
  }, []);

  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const setGameStateExternal = useCallback((state: GameState) => {
    if ((state as any).investments) {
      (state as any).investments = ensureInvestments((state as any).investments) as any;
    }
    if (!(state as any).activeCredits) (state as any).activeCredits = [];
    if ((state as any).creditScore == null) (state as any).creditScore = 620;
    if ((state as any).clubPhilosophy === undefined) (state as any).clubPhilosophy = null;
    if ((state as any).ultrasHappiness == null) (state as any).ultrasHappiness = 65;
    if (!(state as any).ultrasRequests) (state as any).ultrasRequests = [];
    if (!(state as any).museum) (state as any).museum = [];
    if (!(state as any).scoutMissions) (state as any).scoutMissions = [];
    if (!(state as any).scoutReports) (state as any).scoutReports = [];
    if ((state as any).pendingPress === undefined) (state as any).pendingPress = null;
    if (!(state as any).devices) (state as any).devices = [{ id: 'phone_mini', name: 'Akıllı Mini 12', brand: 'Meyve', category: 'phone', price: 18000, quality: 42, camera: 45, performance: 40, icon: '📱', desc: 'Giriş seviye' }];
    if ((state as any).activeDeviceId === undefined) (state as any).activeDeviceId = (state as any).devices?.[0]?.id || 'phone_mini';
    if (!(state as any).pcBuild) (state as any).pcBuild = {};
    if (!(state as any).pcInventory) (state as any).pcInventory = [];
    if ((state as any).socialFeed) (state as any).socialFeed = (state as any).socialFeed.map((post: any)=> ({ platform: 'instagram', views: post.views ?? Math.floor(post.likes*12), ...post }));
    if ((state as any).lifetimeSocialEarnings === undefined) (state as any).lifetimeSocialEarnings = 0;
    if ((state as any).weeklySocialEarnings === undefined) (state as any).weeklySocialEarnings = 0;
    if ((state as any).lastSocialPayoutWeek === undefined) (state as any).lastSocialPayoutWeek = 0;
    if ((state as any).clubStats && (state as any).clubStats.socialEarnings === undefined) (state as any).clubStats.socialEarnings = 0;
    if (!(state as any).stadium?.tribunes) {
      const baseStadium = (state as any).stadium || {};
      baseStadium.tribunes = { north: 1, south: 1, east: 1, west: 1 };
      (state as any).stadium = baseStadium;
    }
    if (!(state as any).stadium?.facilities) {
      const baseStadium = (state as any).stadium || {};
      baseStadium.facilities = defaultFacilities();
      (state as any).stadium = baseStadium;
    }
    if ((state as any).lastMarketRefreshWeek === undefined) (state as any).lastMarketRefreshWeek = 1;
    if ((state as any).matchesSinceMarketRefresh === undefined) (state as any).matchesSinceMarketRefresh = 0;
    if (!(state as any).botTransfers) (state as any).botTransfers = [];
    if ((state as any).tactics) {
      const tac: any = (state as any).tactics;
      if (tac.defensiveLine == null) tac.defensiveLine = 50;
      if (tac.width == null) tac.width = 50;
      if (tac.creativity == null) tac.creativity = 50;
      if (tac.pressingIntensity == null) tac.pressingIntensity = 50;
      if (tac.tempoValue == null) tac.tempoValue = 50;
    }
    setGameState(state);
  }, []);

  /* ══════════════ OYUNCU İŞLEMLERİ ══════════════ */
  const updatePlayer = useCallback((playerId: number, updates: Partial<Player>, isBench: boolean = false) => {
    setGameState(prev => {
      if (!prev) return null;
      if (isBench) {
        return { ...prev, bench: prev.bench.map(p => (p.id === playerId ? { ...p, ...updates } : p)) };
      }
      return { ...prev, team11: prev.team11.map(p => (p.id === playerId ? { ...p, ...updates } : p)) };
    });
  }, []);

  const swapPlayers = useCallback((playerId1: number, playerId2: number) => {
    setGameState(prev => {
      if (!prev) return null;

      const player1InTeam = prev.team11.find(p => p.id === playerId1);
      const player2InTeam = prev.team11.find(p => p.id === playerId2);
      const player1InBench = prev.bench.find(p => p.id === playerId1);
      const player2InBench = prev.bench.find(p => p.id === playerId2);

      let newTeam11 = [...prev.team11];
      let newBench = [...prev.bench];

      if (player1InTeam && player2InBench) {
        const pos = { t: player1InTeam.t, l: player1InTeam.l, role: player1InTeam.role };
        newTeam11 = newTeam11.map(p => (p.id === playerId1 ? { ...player2InBench, ...pos } : p));
        newBench = newBench.filter(p => p.id !== playerId2);
        const { t, l, ...playerWithoutPos } = player1InTeam;
        void t; void l;
        newBench.push(playerWithoutPos as Player);
      } else if (player1InBench && player2InTeam) {
        const pos = { t: player2InTeam.t, l: player2InTeam.l, role: player2InTeam.role };
        newTeam11 = newTeam11.map(p => (p.id === playerId2 ? { ...player1InBench, ...pos } : p));
        newBench = newBench.filter(p => p.id !== playerId1);
        const { t, l, ...playerWithoutPos } = player2InTeam;
        void t; void l;
        newBench.push(playerWithoutPos as Player);
      }

      return { ...prev, team11: newTeam11, bench: newBench };
    });
  }, []);

  const sellPlayer = useCallback((playerId: number, isBench: boolean) => {
    setGameState(prev => {
      if (!prev) return null;

      const player = isBench ? prev.bench.find(p => p.id === playerId) : prev.team11.find(p => p.id === playerId);
      if (!player) return prev;

      const sellValue = Math.floor(player.value * (0.8 + skillSellBonus(prev.skills?.negotiation ?? 0)));

      if (isBench) {
        return {
          ...prev,
          bench: prev.bench.filter(p => p.id !== playerId),
          budget: prev.budget + sellValue,
          news: [`${player.name} $${sellValue.toLocaleString()} karşılığında satıldı.`, ...prev.news.slice(0, 4)]
        };
      }
      if (prev.bench.length === 0) return prev;

      const substitute = prev.bench[0];
      const pos = { t: player.t, l: player.l, role: player.role };

      return {
        ...prev,
        team11: prev.team11.map(p => (p.id === playerId ? { ...substitute, ...pos } : p)),
        bench: prev.bench.slice(1),
        budget: prev.budget + sellValue,
        news: [`${player.name} $${sellValue.toLocaleString()} karşılığında satıldı.`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  const buyPlayer = useCallback((player: Player, finalPrice?: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const rawPrice = finalPrice ?? player.value;
      const price = Math.max(10000, Math.floor(rawPrice * (1 - skillBuyDiscount(prev.skills?.negotiation ?? 0))));
      if (prev.budget < price) return prev;

      // pazarlıkta vaat edilen maaş/süre korunur (ikna oyunu)
      const requestedWage = (player as Player).wage;
      const requestedContract = (player as Player).contract;
      const newWage = requestedWage && requestedWage > 0 ? requestedWage : Math.max(player.wage, playerWage(player.ovr, player.starTier));
      const newContract = requestedContract >= 1 && requestedContract <= 5 ? requestedContract : 3;
      const newMorale = (player as Player).morale ?? 75;
      let result: GameState = {
        ...prev,
        bench: [...prev.bench, { ...player, id: Date.now(), value: price, wage: newWage, contract: newContract, morale: newMorale, suspension: 0 }],
        marketList: prev.marketList.filter(p => p.id !== player.id),
        budget: prev.budget - price,
        clubStats: { ...prev.clubStats, transfers: (prev.clubStats.transfers || 0) + 1 },
        news: [`✍️ ${player.name} $${price.toLocaleString()} karşılığında transfer edildi! (${newContract} yıl, $${newWage.toLocaleString()}/h${newMorale >= 80 ? ' • motive' : newMorale < 65 ? ' • temkinli' : ''})`, ...prev.news.slice(0, 4)]
      };

      // ⭐ İtibar & forma satışı: yıldız oyuncu kulübe para ve heyecan getirir
      if (player.starTier) {
        let fameGain = 0, fanGain = 0, boardGain = 0, jerseyBonus = 0;
        if (player.starTier === 'world') { fameGain = 14; fanGain = 12; boardGain = 7; jerseyBonus = Math.round(price * 0.22); }
        else if (player.starTier === 'star') { fameGain = 9; fanGain = 8; boardGain = 5; jerseyBonus = Math.round(price * 0.14); }
        else if (player.starTier === 'turkish') { fameGain = 10; fanGain = 10; boardGain = 6; jerseyBonus = Math.round(price * 0.16); }
        else if (player.starTier === 'wonderkid') { fameGain = 7; fanGain = 6; boardGain = 4; jerseyBonus = Math.round(price * 0.10); }
        const life = result.life ?? defaultLife();
        result = {
          ...result,
          life: { ...life, stats: { ...life.stats, fame: Math.min(100, life.stats.fame + fameGain) } },
          fanHappiness: Math.min(100, (result.fanHappiness ?? 60) + fanGain),
          boardConfidence: Math.min(100, (result.boardConfidence ?? 50) + boardGain),
          budget: result.budget + jerseyBonus,
          news: [
            `👕 ${player.starTier === 'world' ? 'Dünya yıldızı' : player.starTier === 'star' ? 'Yıldız' : player.starTier === 'turkish' ? 'Milli yıldız' : 'Genç yıldız'} etkisi! ${fameGain} ün, +%${fanGain} taraftar, forma satışından +$${jerseyBonus.toLocaleString()}!`,
            ...result.news.slice(0, 4)
          ]
        };
      }

      // Sosyal: transfer duyurusu bot feed'e düşer
      {
        const tp = generateTransferPost(player.name, player.ovr, prev.teamName, price, player.starTier);
        tp.week = prev.week;
        tp.season = prev.season;
        const currentFeed = (result.socialFeed || (prev as any).socialFeed || []) as any[];
        result = { ...result, socialFeed: [tp, ...currentFeed].slice(0, 80) };
      }
      const tryUnlock = (id: string) => {
        const a = result.achievements?.find(x => x.id === id);
        if (a && !a.unlocked) {
          result = {
            ...result,
            budget: result.budget + (a.reward || 0),
            achievements: result.achievements.map(x =>
              x.id === id ? { ...x, unlocked: true, unlockedWeek: result.week } : x
            ),
            news: [`🏅 Başarım: ${a.title}!`, ...result.news.slice(0, 4)]
          };
        }
      };
      tryUnlock('first_transfer');
      if (price >= 1000000) tryUnlock('big_spend');
      return result;
    });
  }, []);

  /** Sözleşme yenileme — imza parası ödenir, maaş artar */
  const renewContract = useCallback((playerId: number, years: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const inTeam = prev.team11.find(p => p.id === playerId);
      const inBench = prev.bench.find(p => p.id === playerId);
      const player = inTeam || inBench;
      if (!player) return prev;

      const signingBonus = Math.floor(renewalCost(player, years) * (1 - skillBuyDiscount(prev.skills?.negotiation ?? 0)));
      const newWage = renewalWage(player, years);
      if (prev.budget < signingBonus) return prev;

      const patch = (p: Player): Player =>
        p.id === playerId
          ? { ...p, contract: p.contract + years, wage: newWage, wantsOut: false, morale: Math.min(100, p.morale + 12) }
          : p;

      return {
        ...prev,
        team11: prev.team11.map(patch),
        bench: prev.bench.map(patch),
        budget: prev.budget - signingBonus,
        teamChemistry: Math.min(100, (prev.teamChemistry || 55) + 1),
        news: [
          `📝 ${player.name} ile ${years} yıllık yeni sözleşme! İmza parası: $${signingBonus.toLocaleString()} • Yeni maaş: $${newWage.toLocaleString()}/hafta`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  const setCaptain = useCallback((playerId: number | null) => {
    setGameState(prev => {
      if (!prev) return null;
      const player = [...prev.team11, ...prev.bench].find(p => p.id === playerId);
      return {
        ...prev,
        captainId: playerId,
        team11: prev.team11.map(p => ({
          ...p,
          morale: p.id === playerId ? Math.min(100, p.morale + 8) : p.morale
        })),
        teamChemistry: Math.min(100, (prev.teamChemistry || 55) + 2),
        news: player
          ? [`🎽 ${player.name} yeni takım kaptanı olarak açıklandı!`, ...prev.news.slice(0, 4)]
          : [`Kaptanlık boş bırakıldı.`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  const setSetPieceTaker = useCallback((kind: 'penalty' | 'freekick' | 'corner', playerId: number | null) => {
    setGameState(prev => {
      if (!prev) return null;
      const player = [...prev.team11, ...prev.bench].find(p => p.id === playerId);
      const label = kind === 'penalty' ? 'Penaltı' : kind === 'freekick' ? 'Frikik' : 'Korner';
      return {
        ...prev,
        setPieceTakers: { ...prev.setPieceTakers, [kind]: playerId },
        news: player
          ? [`🎯 ${label} görevi ${player.name} oyuncusuna verildi.`, ...prev.news.slice(0, 4)]
          : prev.news
      };
    });
  }, []);

  const setTrainingFocus = useCallback((focus: TrainingFocus) => {
    setGameState(prev => prev ? { ...prev, trainingFocus: focus } : null);
  }, []);

  const toggleSound = useCallback(() => {
    setGameState(prev => prev ? { ...prev, soundOn: !prev.soundOn } : null);
  }, []);

  const dismissBoardMessage = useCallback((index: number) => {
    setGameState(prev => prev
      ? { ...prev, boardMessages: prev.boardMessages.filter((_, i) => i !== index) }
      : null);
  }, []);

  /* ══════════════ TRANSFER TEKLİFLERİ ══════════════ */
  const acceptTransferOffer = useCallback((offerId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const offer = prev.transferOffers.find(o => o.id === offerId);
      if (!offer) return prev;

      const isBench = prev.bench.some(p => p.id === offer.playerId);
      const inTeam = prev.team11.some(p => p.id === offer.playerId);
      if (!isBench && !inTeam) {
        return { ...prev, transferOffers: prev.transferOffers.filter(o => o.id !== offerId) };
      }

      let team11 = prev.team11;
      let bench = prev.bench;

      if (isBench) {
        bench = prev.bench.filter(p => p.id !== offer.playerId);
      } else if (prev.bench.length > 0) {
        const sold = prev.team11.find(p => p.id === offer.playerId)!;
        const sub = prev.bench.filter(p => !p.injured && !(p.suspension && p.suspension > 0))[0] || prev.bench[0];
        team11 = prev.team11.map(p => (p.id === sold.id ? { ...sub, t: sold.t, l: sold.l, role: sold.role } : p));
        bench = prev.bench.filter(p => p.id !== sub.id);
      } else {
        return prev;
      }

      return {
        ...prev,
        team11,
        bench,
        budget: prev.budget + offer.amount,
        transferOffers: prev.transferOffers.filter(o => o.id !== offerId),
        captainId: prev.captainId === offer.playerId ? null : prev.captainId,
        fanHappiness: Math.max(0, (prev.fanHappiness || 60) - 3),
        news: [
          `💸 ${offer.playerName}, ${offer.fromClub} kulübüne $${offer.amount.toLocaleString()} karşılığında satıldı!`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  const rejectTransferOffer = useCallback((offerId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const offer = prev.transferOffers.find(o => o.id === offerId);
      if (!offer) return prev;
      const patch = (p: Player): Player =>
        p.id === offer.playerId ? { ...p, morale: Math.max(0, p.morale - 5), wantsOut: p.morale <= UNHAPPY_MORALE } : p;
      return {
        ...prev,
        team11: prev.team11.map(patch),
        bench: prev.bench.map(patch),
        transferOffers: prev.transferOffers.filter(o => o.id !== offerId),
        news: [`❌ ${offer.fromClub} teklifi reddedildi (${offer.playerName}).`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /* ══════════════ KAYIT / YÜKLEME ══════════════ */
  const saveGame = useCallback((slot: number = 0) => {
    if (gameState) writeSlot(slot, gameState);
  }, [gameState]);

  const loadGame = useCallback((slot: number = 0): boolean => {
    const loaded = readSlot(slot);
    if (!loaded) return false;
    if (loaded.careerOver) loaded.careerOver = false; // kariyer ekranından devam edilmez
    // eski yatırımları yeni şemaya taşı
    if (loaded.investments) {
      loaded.investments = ensureInvestments(loaded.investments as any) as any;
    }
    if (!(loaded as any).activeCredits) (loaded as any).activeCredits = [];
    if ((loaded as any).creditScore == null) (loaded as any).creditScore = 620;
    if ((loaded as any).clubPhilosophy === undefined) (loaded as any).clubPhilosophy = null;
    if ((loaded as any).ultrasHappiness == null) (loaded as any).ultrasHappiness = 65;
    if (!(loaded as any).ultrasRequests) (loaded as any).ultrasRequests = [];
    if (!(loaded as any).museum) (loaded as any).museum = [];
    if (!(loaded as any).scoutMissions) (loaded as any).scoutMissions = [];
    if (!(loaded as any).scoutReports) (loaded as any).scoutReports = [];
    if ((loaded as any).pendingPress === undefined) (loaded as any).pendingPress = null;
    if (!(loaded as any).facility) (loaded as any).facility = defaultFacility();
    (loaded as any).facility = normalizeFacility((loaded as any).facility);
    if (!(loaded as any).stadium?.tribunes) {
      const baseStadium = (loaded as any).stadium || {};
      baseStadium.tribunes = { north: 1, south: 1, east: 1, west: 1 };
      (loaded as any).stadium = baseStadium;
    }
    if ((loaded as any).tactics) {
      const tac: any = (loaded as any).tactics;
      if (tac.defensiveLine == null) tac.defensiveLine = 50;
      if (tac.width == null) tac.width = 50;
      if (tac.creativity == null) tac.creativity = 50;
      if (tac.pressingIntensity == null) tac.pressingIntensity = 50;
      if (tac.tempoValue == null) tac.tempoValue = 50;
    }
    if ((loaded as any).socialFeed) (loaded as any).socialFeed = (loaded as any).socialFeed.map((post: any)=> ({ platform: post.platform || 'instagram', views: post.views ?? Math.floor((post.likes||200)*12), ...post }));
    if ((loaded as any).lifetimeSocialEarnings === undefined) (loaded as any).lifetimeSocialEarnings = 0;
    if ((loaded as any).weeklySocialEarnings === undefined) (loaded as any).weeklySocialEarnings = 0;
    if ((loaded as any).lastSocialPayoutWeek === undefined) (loaded as any).lastSocialPayoutWeek = 0;
    if ((loaded as any).clubStats && (loaded as any).clubStats.socialEarnings === undefined) (loaded as any).clubStats.socialEarnings = 0;
    if ((loaded as any).lastMarketRefreshWeek === undefined) (loaded as any).lastMarketRefreshWeek = 1;
    if ((loaded as any).matchesSinceMarketRefresh === undefined) (loaded as any).matchesSinceMarketRefresh = 0;
    if (!(loaded as any).botTransfers) (loaded as any).botTransfers = [];
    if (!(loaded as any).stadium?.facilities) {
      const baseStadium = (loaded as any).stadium || defaultStadium();
      baseStadium.facilities = defaultFacilities();
      (loaded as any).stadium = baseStadium;
    }
    setGameState(loaded);
    return true;
  }, []);

  const resetCareer = useCallback(() => {
    setGameState(null);
  }, []);

  /* ══════════════ MARKET & TESİS ══════════════ */
  const refreshMarket = useCallback((free = false) => {
    setGameState(prev => {
      if (!prev) return null;

      const cost = free ? 0 : marketRefreshCost(prev.skills?.scouting ?? 0, prev.scoutLvl || 1);
      if (!free && prev.budget < cost) return prev;

      const exclude = [...prev.team11, ...prev.bench].map(p => p.name.replace(/^[^\w]+\s/, ''));
      const genericCount = 24 + Math.floor(Math.random() * 8); // 24-31
      const newMarket = [
        // Scout ağı yeteneği pazar kalitesini yükseltir
        ...buildGenericMarketPlayers({ ...prev, scoutLvl: (prev.scoutLvl || 1) + (prev.skills?.scouting ?? 0) }, genericCount),
        ...buildMarketStars(prev, exclude)
      ];
      // 30-36 arası garanti
      const finalMarket = newMarket.slice(0, 36);
      if (finalMarket.length < 28) {
        const extra = buildGenericMarketPlayers({ ...prev, scoutLvl: (prev.scoutLvl || 1) + (prev.skills?.scouting ?? 0) }, 28 - finalMarket.length);
        finalMarket.push(...extra);
      }

      return {
        ...prev,
        marketList: finalMarket.slice(0, 36),
        budget: prev.budget - cost,
        lastMarketRefreshWeek: prev.week,
        matchesSinceMarketRefresh: 0,
        news: [free ? `🔄 Transfer pazarı otomatik yenilendi! ${finalMarket.length} oyuncu izleniyor (her 3 maçta bir).` : `📋 Transfer listesi güncellendi ($${cost.toLocaleString()}). ${finalMarket.length} oyuncu izleniyor.`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /* ══════════════ KİRALAMA ══════════════ */
  const refreshLoanList = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      const cost = Math.max(50000, marketRefreshCost(prev.skills?.scouting ?? 0, prev.scoutLvl || 1) / 3 | 0);
      if (prev.budget < cost) return prev;
      return {
        ...prev,
        loanList: generateLoanList(prev, 5),
        budget: prev.budget - cost,
        news: [`🔄 Kiralık listesi yenilendi ($${cost.toLocaleString()}).`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /** Kiralık oyuncu kadroya katılır (maaşın bir kısmını kulübümüz öder) */
  const takeLoan = useCallback((targetId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const target = (prev.loanList || []).find(t => t.id === targetId);
      if (!target) return prev;
      if (prev.budget < target.loanFee) return prev;

      const baseName = target.player.name.replace(/^[^\w]+\s/, '');
      if ([...prev.team11, ...prev.bench].some(p => p.name.replace(/^[^\w]+\s/, '') === baseName)) return prev;

      const loaned: Player = {
        ...target.player,
        id: Date.now(),
        wage: Math.max(1000, Math.round(target.player.wage * target.wageShare)),
        loanBaseWage: target.player.wage,
        loanFrom: target.fromClub,
        loanFromLogo: target.fromLogo,
        loanUntilSeason: target.untilSeason,
        loanOptionPrice: target.optionToBuy,
        contract: 0
      };

      return {
        ...prev,
        bench: [...prev.bench, loaned],
        loanList: prev.loanList.filter(t => t.id !== targetId),
        budget: prev.budget - target.loanFee,
        news: [
          `🔄 ${loaned.name}, ${target.fromClub} kulübünden kiralandı! Bedel: $${target.loanFee.toLocaleString()} • Maaş payımız: %${Math.round(target.wageShare * 100)}${target.optionToBuy ? ` • Satın alma opsiyonu: $${target.optionToBuy.toLocaleString()}` : ''}`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  /** Kiralık oyuncunun satın alma opsiyonunu kullan */
  const exerciseLoanOption = useCallback((playerId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const inTeam = prev.team11.find(p => p.id === playerId);
      const inBench = prev.bench.find(p => p.id === playerId);
      const player = inTeam || inBench;
      if (!player || !player.loanOptionPrice) return prev;
      if (prev.budget < player.loanOptionPrice) return prev;

      const convert = (p: Player): Player => {
        if (p.id !== playerId) return p;
        const { loanFrom, loanFromLogo, loanUntilSeason, loanOptionPrice, loanBaseWage, ...rest } = p;
        void loanFrom; void loanFromLogo; void loanUntilSeason; void loanOptionPrice;
        return {
          ...rest,
          wage: loanBaseWage ?? p.wage,
          loanBaseWage: undefined,
          contract: 3,
          morale: Math.min(100, p.morale + 12),
          value: playerValue(p.ovr, p.age, { tier: p.starTier, potential: p.potential })
        };
      };

      return {
        ...prev,
        team11: prev.team11.map(convert),
        bench: prev.bench.map(convert),
        budget: prev.budget - player.loanOptionPrice,
        clubStats: { ...prev.clubStats, transfers: (prev.clubStats.transfers || 0) + 1 },
        news: [
          `✅ ${player.name} için satın alma opsiyonu kullanıldı! $${player.loanOptionPrice.toLocaleString()} ödendi — oyuncu artık bizim!`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  /** Kiralık oyuncuyu erken iade et (kadro yer açar) */
  const returnLoanEarly = useCallback((playerId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const inTeam = prev.team11.find(p => p.id === playerId);
      const inBench = prev.bench.find(p => p.id === playerId);
      const player = inTeam || inBench;
      if (!player || !player.loanFrom) return prev;

      const penalty = Math.round((player.loanBaseWage ?? 0) * 2);
      let team11 = prev.team11;
      let bench = prev.bench.filter(p => p.id !== playerId);

      if (inTeam) {
        const sub = bench.find(p => !p.injured && !(p.suspension ?? 0));
        if (sub) {
          team11 = prev.team11.map(p => (p.id === playerId ? { ...sub, t: p.t, l: p.l, role: p.role } : p));
          bench = bench.filter(p => p.id !== sub.id);
        } else {
          team11 = prev.team11.filter(p => p.id !== playerId);
        }
      }

      return {
        ...prev,
        team11,
        bench,
        budget: prev.budget - penalty,
        news: [`↩️ ${player.name} kiralık sözleşmesi feshedildi (${player.loanFrom}). Cezai işlem: $${penalty.toLocaleString()}`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /** Oyuncuyu kiralığa gönder (kulüp teklifi kabul edilir) */
  const sendOnLoan = useCallback((offer: LoanOutOffer) => {
    setGameState(prev => {
      if (!prev) return null;
      const inTeam = prev.team11.find(p => p.id === offer.playerId);
      const inBench = prev.bench.find(p => p.id === offer.playerId);
      const player = inTeam || inBench;
      if (!player) return prev;

      let team11 = prev.team11;
      let bench = prev.bench.filter(p => p.id !== offer.playerId);

      if (inTeam) {
        const sub = bench.find(p => !p.injured && !(p.suspension ?? 0));
        if (!sub) return prev; // yedek yoksa gönderemeyiz
        team11 = prev.team11.map(p => (p.id === player.id ? { ...sub, t: p.t, l: p.l, role: p.role } : p));
        bench = bench.filter(p => p.id !== sub.id);
      }

      const loan = {
        id: Date.now(),
        player: { ...player, t: undefined, l: undefined },
        playerId: player.id,
        playerName: player.name,
        playerOvr: player.ovr,
        playerRole: player.role,
        playerAge: player.age,
        toClub: offer.toClub,
        toLogo: offer.toLogo,
        fee: offer.fee,
        wageCoverage: offer.wageCoverage,
        baseWage: player.wage,
        startWeek: prev.week,
        season: prev.season,
        growth: 0,
        untilSeason: prev.season
      };

      return {
        ...prev,
        team11,
        bench,
        budget: prev.budget + offer.fee,
        outgoingLoans: [...(prev.outgoingLoans || []), loan],
        news: [
          `📤 ${player.name}, ${offer.toClub} kulübüne kiralandı! Bedel: $${offer.fee.toLocaleString()} • Maaşın %${Math.round(offer.wageCoverage * 100)}'ini onlar ödüyor.`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  /** Kiralıktaki oyuncuyu geri çağır (bedelin %30'u iade edilir) */
  const recallLoan = useCallback((loanId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const loan = (prev.outgoingLoans || []).find(l => l.id === loanId);
      if (!loan) return prev;

      const weeks = Math.max(1, prev.week - loan.startWeek);
      const returned = applyLoanGrowth(loan.player, weeks);
      const refund = Math.round(loan.fee * 0.3);

      return {
        ...prev,
        bench: [...prev.bench, { ...returned, t: undefined, l: undefined }],
        outgoingLoans: prev.outgoingLoans.filter(l => l.id !== loanId),
        budget: prev.budget - refund,
        news: [
          `↩️ ${loan.playerName} kiralamadan geri çağrıldı (${loan.toClub}). Gelişim: ${loan.player.ovr} → ${returned.ovr} OVR • İade: $${refund.toLocaleString()}`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  const applyFormation = useCallback((formationName: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const formation = FORMATIONS[formationName];
      if (!formation) return prev;

      const newTeam11 = prev.team11.map((player, i) => ({
        ...player,
        t: formation[i]?.t ?? player.t,
        l: formation[i]?.l ?? player.l,
        role: (formation[i]?.r ?? player.role) as Player['role']
      }));

      return { ...prev, team11: newTeam11, tactics: { ...prev.tactics, formation: formationName } };
    });
  }, []);

  const updateTactics = useCallback((newTactics: Partial<Tactics>) => {
    setGameState(prev => (prev ? { ...prev, tactics: { ...prev.tactics, ...newTactics } } : null));
  }, []);

  /** Maç öncesi: cezalı/sakat oyuncuları yedeklerle değiştirip state'e uygular */
  const applyFixedLineup = useCallback((): { out: string; in: string }[] => {
    if (!gameState) return [];
    const fix = fixLineup(gameState);
    if (fix.changes.length > 0) {
      setGameState(prev => prev ? {
        ...prev,
        team11: fix.team11,
        bench: fix.bench,
        news: [
          `🔄 Otomatik kadro düzeltmesi: ${fix.changes.map(c => `${c.out} → ${c.in}`).join(', ')}`,
          ...prev.news.slice(0, 4)
        ]
      } : null);
    }
    return fix.changes;
  }, [gameState]);

  /* ══════════════ MAÇ SONUCU ══════════════ */
  const processMatchResult = useCallback((
    userScore: number,
    oppScore: number,
    opponent: Team,
    options: MatchOutcomeOptions = {}
  ) => {
    const {
      isCup = false,
      isHome = true,
      weather = 'cloudy',
      attendance = 0,
      motmPlayerId = null,
      cards = [],
      injuries = [],
      ratings = [],
      penaltyWinner,
      report,
      teamTalkMorale = 0
    } = options;

    setGameState(prev => {
      if (!prev) return null;

      const newState: GameState = {
        ...prev,
        league: prev.league.map(t => ({ ...t })),
        clubStats: { ...prev.clubStats },
        achievements: (prev.achievements || []).map(a => ({ ...a })),
        matchHistory: [...prev.matchHistory],
        news: [...prev.news],
        investments: prev.investments.map(i => ({ ...i, history: [...(i as any).history || []] })),
        activeCredits: [...((prev as any).activeCredits || [])].map((c: any) => ({ ...c })),
        team11: prev.team11.map(p => ({ ...p })),
        bench: prev.bench.map(p => ({ ...p })),
        leagueScorers: prev.leagueScorers.map(s => ({ ...s })),
        transferOffers: [...(prev.transferOffers || [])],
        boardMessages: [...(prev.boardMessages || [])]
      };

      /* — 3D antrenman kompleksi etkileri (tüm hafta boyunca kullanılır) — */
      const facEff = facilityEffects(newState.facility);

      /* — Skor tablosu — */
      const userTeam = newState.league.find(t => t.isUser)!;
      newState.clubStats.totalGoals += userScore;

      // Kupa kazananı (beraberlikte penaltılar olabilir)
      const userWon = userScore > oppScore || penaltyWinner === 'user';
      const userLost = userScore < oppScore || penaltyWinner === 'opponent';

      // Lig puanları yalnızca lig maçlarında işlenir (kupa haftası lig maçı sayılmaz)
      if (!isCup) {
        userTeam.o++;
        userTeam.gf += userScore;
        userTeam.ga += oppScore;
      }

      if (userWon) {
        if (!isCup) { userTeam.g++; userTeam.p += 3; }
        newState.clubStats.totalWins++;
        newState.managerRep = Math.min(100, newState.managerRep + 3);
        newState.minigameTokens = (newState.minigameTokens || 0) + 1;
        newState.fanHappiness = Math.min(100, (newState.fanHappiness || 60) + 5);
        newState.boardConfidence = Math.min(100, (newState.boardConfidence || 50) + 3);
        newState.teamChemistry = Math.min(100, (newState.teamChemistry || 55) + 2);
      } else if (!userLost) {
        if (!isCup) { userTeam.b++; userTeam.p += 1; }
        newState.clubStats.totalDraws++;
        newState.fanHappiness = Math.max(0, (newState.fanHappiness || 60) - 1);
      } else {
        if (!isCup) userTeam.m++;
        newState.clubStats.totalLosses++;
        newState.managerRep = Math.max(0, newState.managerRep - 2);
        newState.fanHappiness = Math.max(0, (newState.fanHappiness || 60) - 5);
        newState.boardConfidence = Math.max(0, (newState.boardConfidence || 50) - (isHome ? 4 : 3));
        newState.teamChemistry = Math.max(0, (newState.teamChemistry || 55) - 2);
      }

      if (oppScore === 0) newState.clubStats.cleanSheets = (newState.clubStats.cleanSheets || 0) + 1;
      if (Math.abs(userScore - oppScore) >= 4 && userScore > oppScore) {
        newState.boardConfidence = Math.min(100, newState.boardConfidence + 3);
        newState.news = [`🔥 ${userScore}-${oppScore}'lik farklı galibiyet yönetimi memnun etti!`, ...newState.news.slice(0, 4)];
      }

      const diffMult = DIFFICULTY_CONFIG[newState.difficulty || 'normal']?.incomeMult || 1;

      /* — Rakip istatistikleri — */
      const oppTeam = newState.league.find(t => t.name === opponent.name);
      if (oppTeam) {
        oppTeam.o++;
        oppTeam.gf += oppScore;
        oppTeam.ga += userScore;
        if (oppScore > userScore) { oppTeam.g++; oppTeam.p += 3; }
        else if (oppScore === userScore) { oppTeam.b++; oppTeam.p += 1; }
        else { oppTeam.m++; }
      }

      /* — Diğer maçlar (Poisson tabanlı, gerçekçi skorlar) — yalnız lig haftasında — */
      if (!isCup) {
        const otherTeams = shuffleArray(newState.league.filter(t => !t.isUser && t.name !== opponent.name));
        for (let i = 0; i < otherTeams.length - 1; i += 2) {
          const team1 = otherTeams[i];
          const team2 = otherTeams[i + 1];
          if (!team1 || !team2) continue;
          const s1 = poissonGoals(1.35 + (team1.ovr - team2.ovr) * 0.035);
          const s2 = poissonGoals(1.2 + (team2.ovr - team1.ovr) * 0.035);

          team1.o++; team2.o++;
          team1.gf += s1; team1.ga += s2;
          team2.gf += s2; team2.ga += s1;
          if (s1 > s2) { team1.g++; team1.p += 3; team2.m++; }
          else if (s1 === s2) { team1.b++; team1.p += 1; team2.b++; team2.p += 1; }
          else { team2.g++; team2.p += 3; team1.m++; }

          bumpScorers(newState.leagueScorers, team1.name, team1.logo, s1);
          bumpScorers(newState.leagueScorers, team2.name, team2.logo, s2);
        }
      }

      newState.league.sort((a, b) => b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga));

      /* — Gelir: bilet + yayın + prim — */
      const baseIncome = newState.stadiumLvl * 200000;
      const winBonus = userWon ? 450000 : userScore === oppScore ? 150000 : 50000;
      let matchIncome: number;
      if (isHome) {
        const price = ticketPriceFor(newState.stadiumLvl, newState.stadium?.ticketMultiplier ?? 1);
        const ticketRevenue = Math.floor(attendance * price * 0.7 * gateMultiplier(newState));
        // Tribünde büfe/ürün harcaması: stadyumu doldurmak ekstra kazandırır
        const catering = Math.floor(attendance * fanSpendingPerFan(newState));
        // 🍔 Büfe işletmesi istatistiği: marka primi + menü + fiyat politikası dahil ciro
        {
          const buffetNow = normalizeBuffetState(newState.stadium?.buffet);
          const bd = buffetBreakdown(newState, attendance);
          newState.stadium = {
            ...(newState.stadium as any),
            buffet: { ...buffetNow, revenueTotal: buffetNow.revenueTotal + Math.round(bd.total) },
          } as any;
        }
        matchIncome = baseIncome + ticketRevenue + catering + winBonus;
        newState.clubStats.totalAttendance = (newState.clubStats.totalAttendance || 0) + attendance;
        // Tribün kozmetikleri taraftar morali kazandırır
        const love = stadiumLoveBonus(newState);
        if (love > 0) newState.fanHappiness = Math.min(100, newState.fanHappiness + love);
        // Seyirci memnuniyeti
        const capacity = stadiumCapacity(newState);
        const fillRate = attendance / capacity;
        if (fillRate > 0.9) newState.fanHappiness = Math.min(100, newState.fanHappiness + 2);
        if (fillRate < 0.5) newState.fanHappiness = Math.max(0, newState.fanHappiness - 2);
      } else {
        const oppAttendance = calculateAttendance({
          stadiumLvl: Math.max(1, Math.round(opponent.ovr / 12)),
          leaguePosition: 5,
          fanHappiness: 60,
          opponentOvr: userTeam.ovr,
          isHome: true,
          weather,
          // Rakibin stadyumu da kendi kozmetiklerinden etkilenir (basit simülasyon)
          demandFactor: demandFactor(1),
          weatherShield: weatherShield({ roof: 'canopy' } as StadiumDesignType, weather),
          capacityBonus: 0
        });
        matchIncome = baseIncome + awayIncome(opponent.ovr, oppAttendance, newState.stadiumLvl) + winBonus;
      }
      newState.budget += Math.floor(matchIncome * (diffMult || 1));

      /* — Kartlar & cezalar — */
      const appliedCards = cards.length > 0
        ? cards
        : [];
      // Bu hafta oynanmayan cezalar erir
      const tickSuspension = (p: Player): Player =>
        (p.suspension ?? 0) > 0 ? { ...p, suspension: (p.suspension ?? 0) - 1 } : p;
      newState.team11 = newState.team11.map(tickSuspension);
      newState.bench = newState.bench.map(tickSuspension);

      const cardPatches: Record<number, { yellow: number; red: number }> = {};
      appliedCards.forEach(c => {
        const entry = cardPatches[c.playerId] || { yellow: 0, red: 0 };
        if (c.type === 'yellow') entry.yellow += 1;
        else entry.red += 1;
        cardPatches[c.playerId] = entry;
      });

      const applyCardEffects = (p: Player): Player => {
        const card = cardPatches[p.id];
        if (!card) return p;
        let yellowCards = (p.yellowCards ?? 0) + card.yellow;
        let suspension = p.suspension ?? 0;
        let morale = p.morale;
        let redCard = p.redCard ?? false;

        if (card.red > 0) {
          suspension += 2;
          redCard = true;
          yellowCards = 0;
          morale = Math.max(0, morale - 6);
          newState.clubStats.redCards = (newState.clubStats.redCards || 0) + 1;
          newState.news = [`🟥 ${p.name} kırmızı kart gördü — 2 maç ceza!`, ...newState.news.slice(0, 4)];
        }
        if (yellowCards >= 3) {
          suspension += 1;
          yellowCards = 0;
          newState.news = [`🟨 ${p.name} 3 sarı kart sınırına ulaştı — 1 maç cezalı!`, ...newState.news.slice(0, 4)];
        } else if (card.yellow > 0) {
          newState.news = [`🟨 ${p.name} sarı kart gördü (${yellowCards}/3).`, ...newState.news.slice(0, 4)];
        }
        return { ...p, yellowCards, suspension, morale, redCard };
      };

      newState.team11 = newState.team11.map(applyCardEffects);
      newState.bench = newState.bench.map(applyCardEffects);

      /* — Sakatlıklar (gerçekten uygulanır) — Rejenerasyon merkezi bir kısmını önler — */
      let injuriesPrevented = 0;
      injuries.forEach(inj => {
        if (facEff.injuryRiskMult < 1 && Math.random() > facEff.injuryRiskMult) {
          injuriesPrevented += 1;
          return; // havuz / buz banyosu / masaj sakatlığı önledi
        }
        const patch = (p: Player): Player =>
          p.id === inj.playerId
            ? { ...p, injured: true, injuryWeeks: Math.max(1, inj.weeks), morale: Math.max(0, p.morale - 5) }
            : p;
        newState.team11 = newState.team11.map(patch);
        newState.bench = newState.bench.map(patch);
        const victim = [...newState.team11, ...newState.bench].find(p => p.id === inj.playerId);
        if (victim) {
          newState.news = [`🏥 ${victim.name} sakatlandı — ${inj.weeks} hafta yok!`, ...newState.news.slice(0, 4)];
        }
      });
      if (injuriesPrevented > 0) {
        newState.news = [`🧊 Rejenerasyon merkezi ${injuriesPrevented} sakatlığı önledi!`, ...newState.news.slice(0, 4)];
      }

      /* — Oyuncu reytingleri & form — */
      const ratingMap = new Map(ratings.map(r => [r.playerId, r]));
      const applyRatings = (p: Player): Player => {
        const r = ratingMap.get(p.id);
        if (!r) return p;
        const formDelta = r.rating >= 7.5 ? 1 : r.rating >= 6.5 ? 0 : -1;
        return {
          ...p,
          matchesPlayed: (p.matchesPlayed ?? 0) + 1,
          form: Math.max(1, Math.min(10, (p.form || 5) + formDelta)),
          morale: Math.max(0, Math.min(100, p.morale + (r.rating >= 7 ? 4 : r.rating < 5.5 ? -4 : 0)))
        };
      };
      newState.team11 = newState.team11.map(applyRatings);
      newState.bench = newState.bench.map(applyRatings);

      if (motmPlayerId != null) {
        const motm = [...newState.team11, ...newState.bench].find(p => p.id === motmPlayerId);
        if (motm) {
          newState.clubStats.motmAwards = (newState.clubStats.motmAwards || 0) + 1;
          newState.managerRep = Math.min(100, newState.managerRep + 1);
          const boost = (p: Player): Player =>
            p.id === motmPlayerId ? { ...p, morale: Math.min(100, p.morale + 8), form: Math.min(10, (p.form || 5) + 1) } : p;
          newState.team11 = newState.team11.map(boost);
          newState.bench = newState.bench.map(boost);
          newState.news = [`⭐ Maçın adamı: ${motm.name}!`, ...newState.news.slice(0, 4)];
        }
      }

      /* — Enerji & moral — */
      const fitnessLvl = prev.skills?.fitness ?? 0;
      const motivationLvl = prev.skills?.motivation ?? 0;
      newState.team11 = newState.team11.map(p => ({
        ...p,
        energy: Math.max(0, Math.round(p.energy - (weather === 'snow' || weather === 'storm' ? 12 : 10) + newState.healthLvl + skillFatigueReduction(fitnessLvl))),
        morale: Math.max(0, Math.min(100, p.morale + (userWon ? 5 + skillMoraleBonus(motivationLvl) : userLost ? -5 : 0)))
      }));
      newState.bench = newState.bench.map(p => ({
        ...p,
        energy: Math.min(100, p.energy + 15 + newState.healthLvl * 2 + skillRecoveryBonus(fitnessLvl))
      }));

      // Devre arası takım konuşmasının moral etkisi
      if (teamTalkMorale) {
        const talkBoost = (p: Player): Player => ({
          ...p,
          morale: Math.max(0, Math.min(100, p.morale + teamTalkMorale))
        });
        newState.team11 = newState.team11.map(talkBoost);
        newState.bench = newState.bench.map(talkBoost);
      }

      /* — Maaş & mağaza gelirleri (5 haftada bir) — */
      if (newState.week % 5 === 0) {
        const totalWages = [...newState.team11, ...newState.bench].reduce((acc, p) => acc + p.wage, 0);
        const wageBill = totalWages * 5;

        let shopIncome = 0;
        if (newState.shopBranches && newState.shopBranches.length > 0) {
          const sortedLeague = [...newState.league].sort((a2, b2) => b2.p - a2.p || (b2.gf - b2.ga) - (a2.gf - a2.ga));
          const leaguePosition = sortedLeague.findIndex(t2 => t2.isUser) + 1;
          const topOvr = [...newState.team11].sort((a2, b2) => b2.ovr - a2.ovr).slice(0, 3);
          const shopMultipliers: Record<string, number> = { small: 1, medium: 2.5, large: 5, flagship: 12 };
          const popMap: Record<number, number> = {
            34: 16000000, 6: 5750000, 35: 4420000, 16: 3100000, 7: 2620000,
            1: 2260000, 42: 2260000, 21: 1800000, 27: 2050000, 33: 1900000
          };

          newState.shopBranches.forEach((branch: { cityId: number; shopType: string }) => {
            const pop = popMap[branch.cityId] || 500000;
            const popFactor = pop / 1000000;
            const posFactor = Math.max(1, (11 - leaguePosition) / 5);
            const starFactor = topOvr.length > 0 ? topOvr[0].ovr / 80 : 1;
            const mult = shopMultipliers[branch.shopType] || 1;
            shopIncome += Math.floor(5000 * mult * popFactor * posFactor * starFactor) * 5;
          });
          // yıldızlar forma sattırır
          if (shopIncome > 0) shopIncome = Math.floor(shopIncome * starShopMultiplier(newState));
        }

        newState.budget += shopIncome;
        newState.budget -= wageBill;

        if (newState.budget < 0) {
          newState.team11 = newState.team11.map(p => ({ ...p, morale: Math.max(0, p.morale - 15) }));
          newState.bench = newState.bench.map(p => ({ ...p, morale: Math.max(0, p.morale - 15) }));
          newState.boardConfidence = Math.max(0, newState.boardConfidence - 8);
          newState.news = [`⚠️ Maaşlar ödenemedi! Borç: $${Math.abs(newState.budget).toLocaleString()}`, ...newState.news.slice(0, 4)];
        } else {
          const netStr = shopIncome > 0
            ? `💰 Maaş: -$${wageBill.toLocaleString()} | Forma satış: +$${shopIncome.toLocaleString()}`
            : `💰 5 haftalık maaşlar ödendi: -$${wageBill.toLocaleString()}`;
          newState.news = [netStr, ...newState.news.slice(0, 4)];
        }
      }

      /* — Maç geçmişi — */
      if (!isCup) {
        newState.matchHistory.push({
          week: newState.week,
          opponent: opponent.name,
          opponentLogo: opponent.logo,
          homeScore: userScore,
          awayScore: oppScore,
          isHome,
          weather,
          attendance,
          penalties: penaltyWinner === 'user' ? 'user' : penaltyWinner === 'opponent' ? 'opponent' : undefined
        });
      }

      /* — Sponsor — */
      if (newState.activeSponsor) {
        const sponsorMediaBonus = 1 + skillSponsorBonus(prev.skills?.media ?? 0);
        // Menajerin ünü sponsor gelirini artırır
        newState.budget += Math.floor(newState.activeSponsor.income * sponsorMediaBonus * fameIncomeMultiplier(newState));
        newState.activeSponsor = { ...newState.activeSponsor, weeksLeft: newState.activeSponsor.weeksLeft - 1 };
        if (newState.activeSponsor.weeksLeft <= 0) {
          newState.news = [`${newState.activeSponsor.name} sponsorluğu sona erdi.`, ...newState.news.slice(0, 4)];
          newState.activeSponsor = null;
        }
      }

      /* — 🍔 Büfe marka sponsorluğu: haftalık sayaç + süre bitişi — */
      {
        const buffet = normalizeBuffetState(newState.stadium?.buffet);
        if (buffet.sponsorId && buffet.sponsorWeeksLeft > 0) {
          const brand = BUFFET_SPONSOR_MAP[buffet.sponsorId];
          const left = buffet.sponsorWeeksLeft - 1;
          if (left <= 0) {
            newState.news = [
              `${brand?.icon ?? '🍔'} ${brand?.name ?? 'Marka'} ile büfe sponsorluğu sona erdi — yenilemek için Stadyum → İç Tesisler → Büfe.`,
              ...newState.news.slice(0, 4),
            ];
            newState.stadium = { ...(newState.stadium as any), buffet: { ...buffet, sponsorId: null, sponsorWeeksLeft: 0 } } as any;
          } else {
            newState.stadium = { ...(newState.stadium as any), buffet: { ...buffet, sponsorWeeksLeft: left } } as any;
          }
        }
      }

      /* — Sosyal pasif gelir (haftalık) — takipçi + etkileşimden otomatik */
      {
        const baseFollowers = 18400 + ((newState.life?.stats.fame||40)*620) + ((newState.fanHappiness||60)*240) + (newState.week*420) + ((newState.managerRep||50)*140);
        const totalFollowers = baseFollowers;
        const userPosts = (newState.socialFeed||[]).filter((p:any)=> p.isUser).length;
        const engagement = 0.045 + Math.min(0.065, userPosts*0.005 + ((newState.life?.stats.fame||40)/900)*0.02);
        const qualityMult = 0.95 + (((newState as any).devices?.find((d:any)=> d.id===(newState as any).activeDeviceId)?.quality||42)/150);
        const weeklyPassive = Math.floor(totalFollowers * engagement * 1.85 * qualityMult);
        if (weeklyPassive>900) {
          newState.budget += weeklyPassive;
          (newState as any).lifetimeSocialEarnings = (((newState as any).lifetimeSocialEarnings)||0) + weeklyPassive;
          (newState as any).weeklySocialEarnings = weeklyPassive;
          (newState.clubStats as any).socialEarnings = (((newState.clubStats as any).socialEarnings)||0) + weeklyPassive;
          newState.news = [`💰 Sosyal pasif gelir: +$${weeklyPassive.toLocaleString()} (${totalFollowers.toLocaleString()} takipçi • %${Math.round(engagement*100)} etkileşim • ${(() => { const q=((newState as any).devices?.find((d:any)=> d.id===(newState as any).activeDeviceId)?.quality||42); return q>=80?'4K':q>=65?'1080p':'720p'; })()})`, ...newState.news.slice(0,4)];
        } else if (weeklyPassive>0) {
          (newState as any).weeklySocialEarnings = weeklyPassive;
        }
        (newState as any).lastSocialPayoutWeek = newState.week;
      }

      /* — Yatırımlar — gerçekçi simülasyon: drift + volatilite + piyasa betası + olay şoku + temettü */
      {
        // eski kayıtları göç ettir
        newState.investments = ensureInvestments(newState.investments as any) as any;
        const marketSentiment = gaussian() * 0.012; // haftalık genel piyasa rüzgârı ±%1.2
        const event = pickMarketEvent();
        let totalDividend = 0;
        newState.investments = newState.investments.map((raw: any) => {
          const inv: any = { ...raw, history: [...(raw.history || [])] };
          const vol = inv.volatility ?? 0.03;
          const drift = inv.drift ?? 0.002;
          const beta = inv.marketBeta ?? 0.6;
          const eventMod = event?.mods[inv.type] ?? event?.mods[inv.type as string] ?? 0;
          // fat-tail: crypto %8 ihtimalle ekstra şok
          let shock = gaussian() * vol;
          if (inv.type === 'crypto' && Math.random() < 0.08) shock += (Math.random() < 0.5 ? 1 : -1) * 0.09;
          if (inv.type === 'gold' && marketSentiment < -0.008) shock += Math.abs(marketSentiment) * 0.6; // güvenli liman
          const weeklyReturn = drift + shock + beta * marketSentiment + eventMod;
          // mean-reversion küçük düzeltme: fiyattan çok uzaklaştıysa geri çek
          const distance = (inv.price - inv.basePrice) / inv.basePrice;
          const reversion = -distance * 0.015; // %1.5 geri çekme
          const finalReturn = weeklyReturn + reversion;
          const newPrice = Math.max(Math.round(inv.basePrice * 0.32), Math.round(inv.price * (1 + finalReturn)));
          const clamped = Math.max(5000, newPrice);
          const changePct = ((clamped - inv.price) / inv.price) * 100;
          inv.history.push(clamped);
          if (inv.history.length > 20) inv.history.shift();
          inv.price = clamped;
          inv.lastChange = Math.round(changePct * 10) / 10;
          // temettü / kira / kupon — haftalık nakit akışı (sadece elde varsa)
          if ((inv.owned || 0) > 0 && inv.dividendYield > 0) {
            const weeklyPayout = Math.round(inv.price * inv.owned * (inv.dividendYield / 52));
            if (weeklyPayout > 0) {
              totalDividend += weeklyPayout;
              inv.dividendsEarned = (inv.dividendsEarned || 0) + weeklyPayout;
            }
          }
          return inv;
        });
        if (totalDividend > 0) {
          newState.budget += totalDividend;
          newState.news = [`💵 Yatırım temettü/kupon/kira geliri: +$${totalDividend.toLocaleString()}`, ...newState.news.slice(0, 4)];
        }
        if (event) {
          newState.news = [`📰 Piyasa: ${event.label}`, ...newState.news.slice(0, 4)];
        }
      }

      /* — Kredi taksitleri (her hafta) — */
      {
        const credits: any[] = (newState as any).activeCredits || [];
        if (credits.length > 0) {
          let totalDue = 0;
          let missedShark = 0;
          let missedBank = 0;
          const nextCredits: any[] = [];
          credits.forEach((loan: any) => {
            const due = loan.weeklyPayment;
            const canPay = newState.budget >= due;
            // her hafta tahsilat (negatife düşebilir — gerçekte kredi kartı gibi)
            newState.budget -= due;
            loan.paidAmount = (loan.paidAmount || 0) + due;
            loan.weeksLeft = (loan.weeksLeft || loan.weeksTotal) - 1;
            totalDue += due;
            if (!canPay) {
              if (loan.type === 'shark') missedShark++;
              else missedBank++;
            }
            if (loan.weeksLeft > 0) {
              nextCredits.push({ ...loan });
            } else {
              // kredi bitti — skor toparlar
              (newState as any).creditScore = Math.min(850, Math.max(300, ((newState as any).creditScore ?? 620) + (loan.type === 'shark' ? 28 : 18)));
              newState.news = [`✅ ${loan.name} tamamen ödendi! Kredi skoru yükseldi.`, ...newState.news.slice(0,4)];
            }
          });
          (newState as any).activeCredits = nextCredits;
          if (totalDue > 0) {
            newState.news = [`🏦 Kredi taksiti: -$${totalDue.toLocaleString()} (${credits.length} kredi)`, ...newState.news.slice(0,4)];
          }
          // gecikme cezaları
          if (missedBank > 0) {
            newState.boardConfidence = Math.max(0, newState.boardConfidence - 6 * missedBank);
            (newState as any).creditScore = Math.max(300, ((newState as any).creditScore ?? 620) - 18 * missedBank);
            newState.news = [`⚠️ Banka taksiti ödenemedi! Yönetim güveni -${6*missedBank}, skor düştü. Bütçe: $${newState.budget.toLocaleString()}`, ...newState.news.slice(0,4)];
            newState.boardMessages = [`👔 Yönetim: "Kredi ödemesini aksattın, mali disiplin şart!"`, ...newState.boardMessages.slice(0,5)];
          }
          if (missedShark > 0) {
            // tefeci çok sert
            newState.boardConfidence = Math.max(0, newState.boardConfidence - 10 * missedShark);
            newState.fanHappiness = Math.max(0, (newState.fanHappiness || 60) - 5 * missedShark);
            newState.team11 = newState.team11.map(pl => ({ ...pl, morale: Math.max(0, pl.morale - 4 * missedShark) }));
            newState.bench = newState.bench.map(pl => ({ ...pl, morale: Math.max(0, pl.morale - 4 * missedShark) }));
            (newState as any).creditScore = Math.max(300, ((newState as any).creditScore ?? 620) - 28 * missedShark);
            // puan silme — tefeci mafyası federasyona şikayet etmiş gibi
            const userTeam = newState.league.find(tm => tm.isUser);
            if (userTeam && userTeam.p > 0) {
              const pts = Math.min(userTeam.p, missedShark); // her gecikme 1 puan
              userTeam.p = Math.max(0, userTeam.p - pts);
              newState.news = [`💀 Tefeci kapıya dayandı! -$${totalDue.toLocaleString()} ödenemedi → -${pts} puan silindi! Moraller çöktü.`, ...newState.news.slice(0,4)];
              newState.boardMessages = [`🚨 Tefeci tehdidi: "Parayı getirmezseniz kulübün lisansı yanar!" -${pts} puan silindi!`, ...newState.boardMessages.slice(0,5)];
            } else {
              newState.news = [`💀 Tefeci tahsilatı gecikti! Takım morali -${4*missedShark}, güven -10.`, ...newState.news.slice(0,4)];
            }
          }
          // iflas kontrol: bütçe çok ekside ve 2+ kredi
          if (newState.budget < -500000 && nextCredits.length >= 2) {
            newState.boardMessages = [`📉 Mali kriz: Bütçe $${newState.budget.toLocaleString()} — acil satış yap veya iflas kapıda!`, ...newState.boardMessages.slice(0,5)];
          }
        }
      }

      /* — Haftalık tesis raporu (3D antrenman kompleksi) — */
      const facilityReport: FacilityReport = {
        season: newState.season,
        week: newState.week,
        growth: 0,
        grownNames: [],
        morale: 0,
        energy: 0,
        injuriesPrevented: injuriesPrevented + 0,
        notes: [],
      };

      /* — İyileşme — Sağlık Ekibi yeteneği + rejenerasyon merkezi hızlandırır — */
      const medicalLvl = prev.skills?.medical ?? 0;
      const heal = (p: Player): Player => {
        if (p.injured && p.injuryWeeks > 0) {
          let left = p.injuryWeeks - 1;
          const skillChance = medicalLvl > 0 ? skillInjuryReduction(medicalLvl) * 1.5 : 0;
          if (left > 0 && Math.random() < skillChance + facEff.healChanceBonus) {
            left -= 1;
            facilityReport.injuriesPrevented += 1;
          }
          return { ...p, injuryWeeks: left, injured: left > 0 };
        }
        return p;
      };
      newState.team11 = newState.team11.map(heal);
      newState.bench = newState.bench.map(heal);

      /* — Haftalık antrenman odağı — */
      const focus = newState.trainingFocus || 'balanced';
      const focusGrowth = (p: Player): Player => {
        if (p.injured) return p;
        const youngFactor = p.age <= 23 ? 1 : p.age <= 28 ? 0.5 : 0.25;
        const roleMatch =
          (focus === 'attack' && (p.role === 'FW' || p.role === 'OS')) ||
          (focus === 'defense' && (p.role === 'SB' || p.role === 'STP' || p.role === 'KL')) ||
          (focus === 'fitness') ||
          (focus === 'youth' && p.age <= 23) ||
          focus === 'balanced';
        if (!roleMatch) return p;
        const chance = (0.18 + newState.trainingLvl * 0.05 + skillYouthBonus(prev.skills?.youth ?? 0) + facEff.growthChance) * youngFactor * (focus === 'balanced' ? 0.8 : 1.15);
        if (p.ovr < p.potential && Math.random() < chance) {
          const ovr = Math.min(p.potential, p.ovr + 1);
          facilityReport.growth += 1;
          if (facilityReport.grownNames.length < 6) facilityReport.grownNames.push(p.name);
          return { ...p, ovr, value: calculatePlayerValue(ovr, p.age) };
        }
        if (focus === 'fitness') return { ...p, energy: Math.min(100, p.energy + 4) };
        return p;
      };
      newState.team11 = newState.team11.map(focusGrowth);
      newState.bench = newState.bench.map(focusGrowth);

      /* — Akademi gelişimi — */
      newState.academyPlayers = newState.academyPlayers.map(p => {
        const chance = 0.15 + newState.academyLevel * 0.08 + skillYouthBonus(prev.skills?.youth ?? 0) + facEff.youthGrowth;
        if (Math.random() < chance && p.ovr < p.potential) {
          const ovr = p.ovr + 1;
          facilityReport.growth += 1;
          if (facilityReport.grownNames.length < 6) facilityReport.grownNames.push(p.name);
          return { ...p, ovr, value: calculatePlayerValue(ovr, p.age) };
        }
        return p;
      });

      /* — Fitness & kondisyon salonu: enerji + moral — */
      if (facEff.energyRegen > 0 || facEff.moraleRegen > 0) {
        const gymBoost = (p: Player): Player => {
          const energy = Math.min(100, p.energy + facEff.energyRegen);
          const morale = Math.min(100, p.morale + facEff.moraleRegen);
          facilityReport.energy += energy - p.energy;
          facilityReport.morale += morale - p.morale;
          return { ...p, energy, morale };
        };
        newState.team11 = newState.team11.map(gymBoost);
        newState.bench = newState.bench.map(gymBoost);
      }

      /* — Taktik & analiz merkezi: takım kimyası — */
      if (facEff.chemistryRegen > 0) {
        newState.teamChemistry = Math.min(100, Math.round(((newState.teamChemistry || 55) + facEff.chemistryRegen) * 10) / 10);
      }

      /* — Haftalık tesis raporunu kaydet (Stadyum → Antrenman Kompleksi sekmesinde görünür) — */
      {
        const lv = normalizeFacility(newState.facility);
        const notes: string[] = [];
        if (lv.pitch > 1) notes.push(`🌱 Saha Sv.${lv.pitch} gelişim şansına +%${Math.round(facEff.growthChance * 100)} ekledi`);
        if (facilityReport.growth > 0) notes.push(`📈 ${facilityReport.growth} oyuncu OVR geliştirdi`);
        if (facEff.energyRegen > 0) notes.push(`🔋 Enerji yenilenmesi +${facilityReport.energy}`);
        if (facilityReport.morale > 0) notes.push(`😊 Moral +${facilityReport.morale}`);
        if (facilityReport.injuriesPrevented > 0) notes.push(`🧊 ${facilityReport.injuriesPrevented} sakatlık/iyileşme haftası kazanıldı`);
        if (facEff.chemistryRegen > 0) notes.push(`📊 Takım kimyası +${facEff.chemistryRegen.toFixed(1)}`);
        if (facEff.youthGrowth > 0) notes.push(`🎓 Altyapı gelişimi +%${Math.round(facEff.youthGrowth * 100)}`);
        if (notes.length === 0) notes.push('Tesisler seviye 1 — Stadyum → Antrenman Kompleksi sekmesinden yükselt!');
        facilityReport.notes = notes;
        newState.facility = { ...lv, lastReport: facilityReport };

        if (facilityReport.growth > 0) {
          newState.news = [
            `🏋️ Tesis antrenmanı: ${facilityReport.growth} oyuncu gelişti${facilityReport.grownNames.length ? ` (${facilityReport.grownNames.slice(0, 3).join(', ')})` : ''}`,
            ...newState.news.slice(0, 4)
          ];
        }
      }

      /* — Kulüpten ayrılmak isteyenler — */
      const markUnhappy = (p: Player): Player => {
        if (p.morale <= UNHAPPY_MORALE && !p.wantsOut) {
          newState.boardMessages = [`😠 ${p.name} mutsuz: "Yeterince süre almıyorum." Moral düzeltilmeli.`, ...newState.boardMessages.slice(0, 5)];
          return { ...p, wantsOut: true };
        }
        if (p.morale > 55 && p.wantsOut) return { ...p, wantsOut: false };
        return p;
      };
      newState.team11 = newState.team11.map(markUnhappy);
      newState.bench = newState.bench.map(markUnhappy);

      /* — Rakip kulüpten transfer teklifleri — */
      newState.transferOffers = (newState.transferOffers || []).filter(o => o.expiresWeek > newState.week);
      const squad = [...newState.team11, ...newState.bench];
      const hasOpenOffer = (id: number) => newState.transferOffers.some(o => o.playerId === id);
      const wanted = squad.filter(p => p.ovr >= 74 && !hasOpenOffer(p.id));
      if (wanted.length > 0 && Math.random() < 0.32) {
        const target = wanted.sort((a, b) => (b.wantsOut ? 1 : 0) - (a.wantsOut ? 1 : 0) || b.ovr - a.ovr)[
          Math.min(wanted.length - 1, Math.floor(Math.random() * Math.min(3, wanted.length)))
        ];
        const buyers = newState.league.filter(t => !t.isUser);
        const buyer = buyers[Math.floor(Math.random() * buyers.length)];
        const multiplier = target.wantsOut ? 0.95 : 1.05 + Math.random() * 0.5;
        const offer: TransferOffer = {
          id: Date.now(),
          playerId: target.id,
          playerName: target.name,
          playerOvr: target.ovr,
          fromClub: buyer.name,
          fromLogo: buyer.logo,
          amount: Math.floor(target.value * multiplier),
          week: newState.week,
          expiresWeek: newState.week + 2
        };
        newState.transferOffers = [offer, ...newState.transferOffers];
        newState.news = [`📨 ${buyer.name}, ${target.name} için $${offer.amount.toLocaleString()} teklif etti!`, ...newState.news.slice(0, 4)];
        newState.boardMessages = [`📨 ${buyer.name} kulübünden ${target.name} için teklif var (2 hafta geçerli).`, ...newState.boardMessages.slice(0, 5)];
      }

      /* — Sözleşmesi bitecekler uyarısı — */
      if (newState.week % 6 === 0) {
        const expiring = squad.filter(p => p.contract <= 1);
        if (expiring.length > 0) {
          newState.boardMessages = [
            `📝 Sözleşmesi bitmek üzere: ${expiring.map(p => p.name).join(', ')}. Sezon sonu bedelsiz kaybedebilirsin!`,
            ...newState.boardMessages.slice(0, 5)
          ];
        }
      }

      /* — Rakip transferleri — Gerçekçi simülasyon: bütçe/pozisyon bazlı + haber akışı — */
      {
        const botTeams = newState.league.filter(t => !t.isUser);
        const transfersThisWeek: any[] = [];
        // Her hafta %55 ihtimalle 1-2 rakip transfer yapar
        if (!isCup && Math.random() < 0.55) {
          const numTransfers = Math.random() < 0.7 ? 1 : 2;
          const shuffled = [...botTeams].sort(() => Math.random() - 0.5);
          for (let i = 0; i < numTransfers && i < shuffled.length; i++) {
            const team = shuffled[i];
            const isYouth = Math.random() < 0.38;
            const ovrChange = isYouth ? 1 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 3);
            const fee = isYouth ? Math.round(150000 + Math.random() * 600000) : Math.round(400000 + Math.random() * 2500000);
            team.ovr = Math.min(94, team.ovr + ovrChange);
            const playerName = `${FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)]}`;
            const bt = {
              week: newState.week,
              season: newState.season,
              club: team.name,
              logo: team.logo,
              type: 'in' as const,
              playerName,
              ovrChange,
              fee
            };
            (newState.botTransfers = newState.botTransfers || []).push(bt);
            transfersThisWeek.push(bt);
          }
          if (transfersThisWeek.length > 0) {
            transfersThisWeek.forEach((bt: any) => {
              newState.news = [`${bt.fee > 1000000 ? '🔥' : '📰'} ${bt.club}: ${bt.playerName} transfer edildi! (+${bt.ovrChange} OVR • $${bt.fee.toLocaleString()})`, ...newState.news.slice(0, 4)];
              newState.boardMessages = [`📢 ${bt.club}, ${bt.playerName} oyuncusunu kadrosuna kattı (S${bt.season} H${bt.week}).`, ...newState.boardMessages.slice(0, 5)];
            });
          }
        }
        // Sezon ortası / yaz dönemi: daha büyük dalga
        if (newState.week === 9 || newState.week === 18) {
          botTeams.forEach(team => {
            const teamRank = newState.league.findIndex(t => t.name === team.name) + 1;
            const transferChance = teamRank > 5 ? 0.75 : 0.45;
            if (Math.random() < transferChance) {
              const ovrBump = 1 + Math.floor(Math.random() * 3);
              team.ovr = Math.min(94, team.ovr + ovrBump);
              const playerName = `${FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)]}`;
              (newState.botTransfers = newState.botTransfers || []).push({
                week: newState.week,
                season: newState.season,
                club: team.name,
                logo: team.logo,
                type: 'in',
                playerName,
                ovrChange: ovrBump,
                fee: Math.round(300000 + Math.random()*2000000)
              });
            }
          });
          const periodName = newState.week === 9 ? 'Ara transfer dönemi' : 'Yaz transfer dönemi';
          newState.news = [`📋 ${periodName} sona erdi — ${botTeams.length} kulüp kadrosunu güçlendirdi! Transfer geçmişi: Ofis → Rakipler`, ...newState.news.slice(0, 4)];
        }
      }

      /* — Pazar otomatik yenileme: her 3 maçta bir — */
      if (!isCup) {
        newState.matchesSinceMarketRefresh = (newState.matchesSinceMarketRefresh || 0) + 1;
        if (newState.matchesSinceMarketRefresh >= 3) {
          const exclude = [...newState.team11, ...newState.bench].map(p => p.name.replace(/^[^\w]+\s/, ''));
          const genericCount = 24 + Math.floor(Math.random() * 8);
          const newMarket = [
            ...buildGenericMarketPlayers({ ...newState, scoutLvl: (newState.scoutLvl || 1) + (newState.skills?.scouting ?? 0) }, genericCount),
            ...buildMarketStars(newState, exclude)
          ];
          newState.marketList = newMarket.slice(0, 36);
          newState.lastMarketRefreshWeek = newState.week;
          newState.matchesSinceMarketRefresh = 0;
          newState.news = [`🔄 Transfer pazarı otomatik yenilendi! ${newState.marketList.length} yeni oyuncu eklendi (her 3 maçta bir).`, ...newState.news.slice(0, 4)];
        }
      }

      /* — Hafta ilerle — */
      if (!isCup) newState.week++;

      /* — Menajerin haftalık hayat döngüsü — */
      newState.life = lifeWeeklyReset(newState.life ?? defaultLife(), newState.week);
      {
        const life = newState.life;
        // Menajer formu oyuncuların toparlanmasını hızlandırır
        const recovery = managerRecoveryBonus(newState);
        if (recovery > 0) {
          const boost = (p: Player) => ({ ...p, energy: Math.min(100, p.energy + recovery) });
          newState.team11 = newState.team11.map(boost);
          newState.bench = newState.bench.map(boost);
        }
        // Mutlu menajer = mutlu soyunma odası; bitkin menajer takımı da yorar
        if (life.stats.fun >= 75 || life.stats.fitness >= 75) {
          const lift = (p: Player) => ({ ...p, morale: Math.min(100, p.morale + 1) });
          newState.team11 = newState.team11.map(lift);
          newState.bench = newState.bench.map(lift);
        } else if (life.stats.energy < 20) {
          const drain = (p: Player) => ({ ...p, morale: Math.max(0, p.morale - 1) });
          newState.team11 = newState.team11.map(drain);
          newState.bench = newState.bench.map(drain);
        }
        // Enerji haftalık olarak kendiliğinden biraz dolar
        newState.life = {
          ...newState.life,
          stats: { ...life.stats, energy: Math.min(100, life.stats.energy + 12) }
        };
      }

      /* — Sosyal Akış: maç sonucu postları + haftalık bot dedikodu */
      {
        const matchPosts = generateMatchFeedPosts(newState, userScore, oppScore, opponent.name, opponent.logo, isHome, newState.week);
        const weeklyPosts = generateWeeklyBotPosts(newState);
        const existing = (newState as any).socialFeed || (prev as any).socialFeed || [];
        (newState as any).socialFeed = [...matchPosts, ...weeklyPosts, ...existing].slice(0, 90);
      }
      /* — Başarımlar — */
      const unlock = (id: string) => {
        const a = newState.achievements?.find(x => x.id === id);
        if (a && !a.unlocked) {
          a.unlocked = true;
          a.unlockedWeek = newState.week;
          newState.budget += a.reward || 0;
          newState.news = [`🏅 Başarım: ${a.title}! +$${(a.reward || 0).toLocaleString()}`, ...newState.news.slice(0, 4)];
        }
      };
      if (userWon) unlock('first_win');
      if (userScore >= 3) unlock('hat_trick');
      if (oppScore === 0) unlock('clean_sheet');
      if (newState.budget >= 5000000) unlock('millionaire');
      if ((newState.shopBranches?.length || 0) >= 3) unlock('shop_king');
      if (newState.stadiumLvl >= 3 && newState.trainingLvl >= 3 && newState.academyLevel >= 3) unlock('facility_max');
      if (Math.abs(userScore - oppScore) >= 5 && userScore > oppScore) unlock('big_win');
      if (penaltyWinner === 'user') unlock('penalty_hero');
      if (attendance >= 30000) unlock('full_house');
      const recent = newState.matchHistory.slice(-5);
      if (recent.length >= 5 && recent.every(m => m.homeScore > m.awayScore)) unlock('undefeated');
      if (newState.matchHistory.length === 18 && newState.matchHistory.every(m => m.homeScore >= m.awayScore)) unlock('invincible');
      const allP = [...newState.team11, ...newState.bench];
      if (allP.some(p => p.goals >= 15)) unlock('top_scorer');

      /* — Yönetim güveni: uyarı & kovulma — */
      if (newState.boardConfidence <= 25 && newState.boardWarnings < 3) {
        newState.boardWarnings = newState.boardWarnings + 1;
        const msg = newState.boardConfidence <= 10
          ? '👔 Yönetim: "Sonuçlar kabul edilemez. Bir sonraki maç kader maçı!"'
          : '👔 Yönetim: "Performanstan memnun değiliz, toparlanmalısın."';
        newState.boardMessages = [msg, ...newState.boardMessages.slice(0, 5)];
        newState.news = [msg, ...newState.news.slice(0, 4)];
      }
      if (newState.boardConfidence <= 0) {
        newState.careerOver = true;
        newState.careerOverReason = 'Yönetim kurulu güvenini kaybetti ve sözleşmen feshedildi.';
      }

      /* — Kiralık sözleşmeleri — */
      const loanReminders: string[] = [];
      const activeLoans = [...newState.team11, ...newState.bench].filter(p => p.loanFrom);
      activeLoans.forEach(p => {
        if (p.loanOptionPrice && newState.week >= 15) {
          loanReminders.push(`⏳ ${p.name} satın alma opsiyonu ($${p.loanOptionPrice.toLocaleString()}) sezon sonuna kadar geçerli — Ofis → Kiralıklar`);
        }
      });
      // Süresi geçen kiralıklar geri döner
      const expiredLoanIds = activeLoans
        .filter(p => (p.loanUntilSeason ?? newState.season) < newState.season)
        .map(p => p.id);
      if (expiredLoanIds.length > 0) {
        const strip = (p: Player): Player => {
          if (!expiredLoanIds.includes(p.id)) return p;
          const { loanFrom, loanFromLogo, loanUntilSeason, loanOptionPrice, loanBaseWage, ...rest } = p;
          void loanFrom; void loanFromLogo; void loanUntilSeason; void loanOptionPrice; void loanBaseWage;
          return rest as Player;
        };
        newState.team11 = newState.team11.filter(p => !expiredLoanIds.includes(p.id)).map(strip);
        newState.bench = newState.bench.filter(p => !expiredLoanIds.includes(p.id)).map(strip);
        newState.news = [`🔄 Kiralık sözleşmeleri sona erdi, oyuncular kulüplerine döndü.`, ...newState.news.slice(0, 4)];
      }
      // Kiralıktaki oyuncular gelişiyor
      newState.outgoingLoans = (newState.outgoingLoans || []).map(l => ({
        ...l,
        growth: Math.round(Math.max(0, newState.week - l.startWeek) / 6)
      }));
      if (loanReminders.length > 0) {
        newState.boardMessages = [...loanReminders, ...newState.boardMessages.slice(0, 5)];
      }

      /* — Ultras istekleri: deadline + galibiyet/maglubiyet etkisi + yeni istek şansı — */
      {
        const reqs: any[] = (newState as any).ultrasRequests || [];
        const remaining: any[] = [];
        reqs.forEach((r: any) => {
          const expired = (newState.season > r.deadlineSeason) || (newState.season === r.deadlineSeason && newState.week > r.deadlineWeek);
          if (expired) {
            (newState as any).ultrasHappiness = Math.max(0, ((newState as any).ultrasHappiness||65) - 8);
            newState.fanHappiness = Math.max(0, (newState.fanHappiness||60) - 5);
            newState.news = [`📢 Ultras öfkeli: "${r.text}" yerine getirilmedi → taraftar -5, ultras -8`, ...newState.news.slice(0,4)];
          } else {
            remaining.push(r);
          }
        });
        (newState as any).ultrasRequests = remaining;
        // galibiyet/maglubiyet ultras'a yansır + felsefe bonusu
        const phil: any = (newState as any).clubPhilosophy;
        if (userWon) {
          const bonus = phil === 'trophy' ? 5 : phil === 'money' ? 4 : 3;
          (newState as any).ultrasHappiness = Math.min(100, ((newState as any).ultrasHappiness||65) + bonus);
        } else if (userLost) {
          (newState as any).ultrasHappiness = Math.max(0, ((newState as any).ultrasHappiness||65) - 3);
        } else {
          (newState as any).ultrasHappiness = Math.max(0, Math.min(100, ((newState as any).ultrasHappiness||65) + 0));
        }
        // haftada %20 ihtimalle yeni istek (kupa haftası değilse)
        if (remaining.length < 2 && !isCup && Math.random() < 0.20) {
          const pool = [
            { kind: 'youth', text: 'Bu ay bir altyapı oyuncusunu A takıma al!', reward: 'Sadakat +12', penalty: '-8' },
            { kind: 'star', text: 'Yıldız transferi istiyoruz — OVR 78+ birini al', reward: 'Doluluk +8%', penalty: '-10 taraftar' },
            { kind: 'derby', text: 'Sıradaki iç saha maçını kazan!', reward: 'Moral +8', penalty: '-5 güven' },
            { kind: 'cleanSheet', text: '2 maçta gol yemeyin', reward: 'Savunma +2', penalty: '-10' },
          ];
          const pick = pool[Math.floor(Math.random()*pool.length)];
          const req: any = {
            id: `ur-${Date.now()}-${Math.random().toString(36).slice(2,4)}`,
            kind: pick.kind,
            text: pick.text,
            deadlineWeek: (newState.week||1) + 3 + Math.floor(Math.random()*2),
            deadlineSeason: newState.season||1,
            reward: pick.reward,
            penalty: pick.penalty,
          };
          (newState as any).ultrasRequests = [...remaining, req];
          newState.news = [`📢 Ultras: "${pick.text}" — ${req.deadlineWeek - (newState.week||1)} hafta süren var!`, ...newState.news.slice(0,4)];
        }
        // Mild surprise — %5 ihtimalle hafif drama (ortalama görsel, hafif olay)
        if (!isCup && Math.random() < 0.05) {
          const roll = Math.random();
          if (roll < 0.35) {
            // Soyunma odası kavgası
            const a = [...newState.team11, ...newState.bench][Math.floor(Math.random()*Math.min(11,newState.team11.length))];
            const b = [...newState.team11, ...newState.bench].find(pl=> pl.id!==a.id) || a;
            newState.teamChemistry = Math.max(0,(newState.teamChemistry||55)-2);
            newState.team11 = newState.team11.map(pl=> pl.id===a.id||pl.id===b.id ? { ...pl, morale: Math.max(0, pl.morale-4)} : pl);
            newState.bench = newState.bench.map(pl=> pl.id===a.id||pl.id===b.id ? { ...pl, morale: Math.max(0, pl.morale-4)} : pl);
            newState.news = [`🎭 Hafif gerginlik: ${a.name} — ${b.name} tartışması, tatlıya bağlandı. Kimya -2, moral -4`, ...newState.news.slice(0,4)];
          } else if (roll < 0.65) {
            // Yıldız resti — wantsOut drama
            const candidates = [...newState.team11, ...newState.bench].filter(pl=> pl.ovr>=76 && !pl.wantsOut);
            if (candidates.length) {
              const star = candidates[Math.floor(Math.random()*candidates.length)];
              const bump = (pl:any)=> pl.id===star.id ? { ...pl, wantsOut: true, morale: Math.max(0, pl.morale-10)} : pl;
              newState.team11 = newState.team11.map(bump);
              newState.bench = newState.bench.map(bump);
              (newState as any).ultrasHappiness = Math.max(0,((newState as any).ultrasHappiness||65)-3);
              newState.news = [`📰 Hafif dedikodu: ${star.name} menajeriyle görüştü — "daha fazla süre istiyor" (moral -5)`, ...newState.news.slice(0,4)];
              newState.boardMessages = [`📢 ${star.name} ayrılmak istiyor! Ofis → Sözleşmeler'den ikna et.`, ...newState.boardMessages.slice(0,4)];
            }
          } else {
            // Sakatlık şoku — antrenmanda ekstra sakatlık
            const vic = [...newState.team11].filter(pl=> !pl.injured)[Math.floor(Math.random()*newState.team11.length)];
            if (vic) {
              const weeks = 1 + Math.floor(Math.random()*2);
              const inj = (pl:any)=> pl.id===vic.id ? { ...pl, injured: true, injuryWeeks: weeks, energy: Math.max(0, pl.energy-20)} : pl;
              newState.team11 = newState.team11.map(inj);
              newState.news = [`🎭 Drama: Antrenmanda şok sakatlık — ${vic.name} ${weeks} hafta yok!`, ...newState.news.slice(0,4)];
            }
          }
        }
        // felsefe haftalık pasif bonus
        if (phil === 'youth' && Math.random() < 0.18) {
          // genç bir oyuncu +1 gelişim şansı
          const youthCandidates = [...newState.team11, ...newState.bench].filter(pl=> pl.age <= 22 && pl.ovr < pl.potential);
          if (youthCandidates.length) {
            const lucky = youthCandidates[Math.floor(Math.random()*youthCandidates.length)];
            const bump = (pl:any)=> pl.id===lucky.id ? { ...pl, ovr: Math.min(pl.potential, pl.ovr+1)} : pl;
            newState.team11 = newState.team11.map(bump);
            newState.bench = newState.bench.map(bump);
          }
        }
        if (phil === 'money' && !isCup) {
          // hafif ekstra sponsor geliri simülasyonu: haftalık küçük bonus
          if (Math.random() < 0.25) {
            const bonus = 8000 + Math.floor(Math.random()*12000);
            newState.budget += bonus;
          }
        }
      }

      /* — Scout görevleri haftalık ilerleme — */
      {
        const missions: any[] = (newState as any).scoutMissions || [];
        const reports: any[] = (newState as any).scoutReports || [];
        const nextMissions: any[] = [];
        const regionMap: Record<string, any> = {
          balkans: { ovr: [60,69], pot: [74,84], roles: ['OS','SB','STP'], trait: 'teknik' },
          west_eu: { ovr: [64,74], pot: [78,88], roles: ['OS','STP','SB'], trait: 'taktik' },
          south_america: { ovr: [65,74], pot: [82,92], roles: ['FW','OS','SB'], trait: 'flair' },
          africa: { ovr: [62,71], pot: [77,89], roles: ['FW','SB','STP'], trait: 'hız' },
          east_eu: { ovr: [61,70], pot: [76,86], roles: ['STP','SB','KL'], trait: 'fizik' },
          asia: { ovr: [59,68], pot: [73,85], roles: ['OS','SB','FW'], trait: 'çalışkan' },
        };
        missions.forEach((m:any)=> {
          const left = (m.weeksLeft||1)-1;
          if (left <= 0) {
            // rapor üret
            const cfg = regionMap[m.regionId] || regionMap.balkans;
            const count = 1 + (Math.random()<0.42?1:0) + (Math.random()<0.10?1:0); // 1-3
            const players: any[] = [];
            for (let i=0;i<count;i++) {
              const role = cfg.roles[Math.floor(Math.random()*cfg.roles.length)];
              const ovr = cfg.ovr[0] + Math.floor(Math.random()*(cfg.ovr[1]-cfg.ovr[0]+1));
              const pot = Math.max(ovr+4, cfg.pot[0] + Math.floor(Math.random()*(cfg.pot[1]-cfg.pot[0]+1)));
              const age = 16 + Math.floor(Math.random()*3);
              const rc = (()=>{ try{ return randomCountry(); } catch { return {country:'Bilinmiyor', flag:'🌍'}; } })();
              const id = Date.now()+Math.floor(Math.random()*100000)+i;
              const name = `${FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)]}`;
              const val = Math.round(ovr* 11500 + (pot-ovr)*7500 + Math.random()*4000);
              players.push({ id, name, ovr, role, age, potential: Math.min(99,pot), value: val, wage: Math.max(800, Math.round(ovr*280)), contract: 3, energy: 100, morale: 75+Math.floor(Math.random()*15), goals:0, assists:0, injured:false, injuryWeeks:0, yellowCards:0, redCard:false, suspension:0, matchesPlayed:0, form:5+Math.floor(Math.random()*3), country: rc.country, flag: rc.flag, potentialOriginal: pot });
            }
            const report: any = { id: `rep-${Date.now()}-${Math.random().toString(36).slice(2,4)}`, regionId: m.regionId, regionName: m.regionName, players, generatedWeek: newState.week, generatedSeason: newState.season };
            reports.push(report);
            newState.news = [`📬 İzci döndü (${m.regionName}): ${players.length} genç bulundu! Stadyum → Akademi & Scout`, ...newState.news.slice(0,4)];
          } else {
            nextMissions.push({ ...m, weeksLeft: left });
          }
        });
        (newState as any).scoutMissions = nextMissions;
        (newState as any).scoutReports = reports;
      }

      /* — Görevler, XP ve yetenek etkileri — */
      if (!isCup && (newState.clubStats.penaltyWins === undefined)) newState.clubStats.penaltyWins = 0;
      if (penaltyWinner === 'user') {
        newState.clubStats.penaltyWins = (newState.clubStats.penaltyWins || 0) + 1;
        newState.news = [`🥅 Penaltı zaferi kaydedildi!`, ...newState.news.slice(0, 4)];
      }

      // Yetenek: medya (taraftar) + sponsor geliri
      const mediaLvl = prev.skills?.media ?? 0;
      if (userWon && mediaLvl > 0) {
        newState.fanHappiness = Math.min(100, newState.fanHappiness + mediaLvl * 0.5);
      }

      // Yetenek: pazarlık (satış) — kulübün kasasına ekstra gelir
      const negotiationLvl = prev.skills?.negotiation ?? 0;
      if (negotiationLvl > 0) {
        newState.budget += Math.floor(matchIncome * negotiationLvl * 0.01);
      }

      // Görev değerlendirmesi + XP verme
      const evaluation = evaluateMissions(newState);
      newState.missions = evaluation.missions;
      newState.budget += evaluation.budget;
      newState.minigameTokens = (newState.minigameTokens || 0) + evaluation.tokens;

      const matchXp = (userWon ? 25 : userLost ? 3 : 10) + Math.min(5, userScore);
      const xpResult = grantXp(
        { managerXp: prev.managerXp || 0, managerLevel: prev.managerLevel || 1, skillPoints: prev.skillPoints || 0 },
        matchXp + evaluation.xp
      );
      newState.managerXp = xpResult.managerXp;
      newState.managerLevel = xpResult.managerLevel;
      newState.skillPoints = xpResult.skillPoints + evaluation.skillPoints;
      if (xpResult.levelUps > 0) {
        newState.news = [
          `⬆️ Menajer seviyesi ${xpResult.managerLevel}! +${xpResult.levelUps} yetenek puanı (Kariyer sekmesi)`,
          ...newState.news.slice(0, 4)
        ];
      }
      evaluation.completed.forEach(c => {
        newState.news = [
          `🎯 Görev tamamlandı: ${c.icon} ${c.title} (+$${c.budget.toLocaleString()}, +${c.xp} XP)`,
          ...newState.news.slice(0, 4)
        ];
      });

      // Haftalık görevleri tazele
      newState.missions = refreshWeeklyIfNeeded(newState);

      /* — Son maç raporu & hava durumu — */
      if (report) {
        newState.boardMessages = [
          `📊 ${report.opponentName} maçı: ${report.userScore}-${report.oppScore} • Maçın adamı: ${report.motm}`,
          ...newState.boardMessages.slice(0, 5)
        ];
      }
      newState.weather = randomWeather();

      return newState;
    });
  }, []);

  /* ══════════════ PERSONEL & TESİS ══════════════ */
  const hireStaff = useCallback((type: Staff['type'], cost: number) => {
    setGameState(prev => {
      if (!prev || prev.budget < cost) return prev;

      const names: Record<Staff['type'], string> = {
        coach: 'Antrenör',
        scout: 'Scout',
        physio: 'Fizyoterapist',
        analyst: 'Analist'
      };

      const newStaff: Staff = { id: Date.now(), type, name: names[type], level: 1, salary: Math.floor(cost * 0.1) };

      const updates: Partial<GameState> = { staff: [...prev.staff, newStaff], budget: prev.budget - cost };

      if (type === 'coach') {
        updates.team11 = prev.team11.map(p => ({ ...p, ovr: Math.min(99, p.ovr + 1) }));
        updates.bench = prev.bench.map(p => ({ ...p, ovr: Math.min(99, p.ovr + 1) }));
      } else if (type === 'scout') {
        updates.scoutLvl = prev.scoutLvl + 1;
      } else if (type === 'physio') {
        updates.healthLvl = prev.healthLvl + 1;
      }

      return { ...prev, ...updates };
    });
  }, []);

  const upgradeFacility = useCallback((type: 'stadium' | 'training' | 'academy' | 'health', cost: number) => {
    setGameState(prev => {
      if (!prev || prev.budget < cost) return prev;

      const updates: Partial<GameState> = { budget: prev.budget - cost };

      if (type === 'stadium') {
        updates.stadiumLvl = prev.stadiumLvl + 1;
        updates.fanHappiness = Math.min(100, (prev.fanHappiness || 60) + 5);
      } else if (type === 'training') {
        updates.trainingLvl = prev.trainingLvl + 1;
        updates.team11 = prev.team11.map(p => ({ ...p, ovr: Math.min(99, p.ovr + 1) }));
        updates.bench = prev.bench.map(p => ({ ...p, ovr: Math.min(99, p.ovr + 1) }));
      } else if (type === 'academy') {
        updates.academyLevel = prev.academyLevel + 1;
      } else if (type === 'health') {
        updates.healthLvl = prev.healthLvl + 1;
        updates.team11 = prev.team11.map(p =>
          p.injured ? { ...p, injuryWeeks: Math.max(1, p.injuryWeeks - 1) } : { ...p, energy: Math.min(100, p.energy + 10) }
        );
        updates.bench = prev.bench.map(p =>
          p.injured ? { ...p, injuryWeeks: Math.max(1, p.injuryWeeks - 1) } : { ...p, energy: Math.min(100, p.energy + 10) }
        );
      }

      return { ...prev, ...updates };
    });
  }, []);

  /* ══════════════ 3D ANTRENMAN KOMPLEKSİ ══════════════ */
  /** Bir tesis modülünü yükselt — 3D sahnede bina/saha büyür, oyunculara anında + haftalık etki */
  const upgradeFacilityModule = useCallback((id: FacilityModuleId) => {
    setGameState(prev => {
      if (!prev) return null;
      const facility = normalizeFacility(prev.facility);
      const level = facility[id];
      if (level >= FACILITY_MAX_LEVEL) return prev;
      const cost = facilityUpgradeCost(id, level);
      if (prev.budget < cost) return prev;

      const nextLevel = level + 1;
      const nextFacility: FacilityState = { ...facility, [id]: nextLevel, lastReport: facility.lastReport ?? null };
      const def = FACILITY_MODULE_MAP[id];
      const updates: Partial<GameState> = {
        budget: prev.budget - cost,
        facility: nextFacility,
        news: [`${def.icon} ${def.name} seviye ${nextLevel} oldu! ${def.effect(nextLevel)}`, ...prev.news.slice(0, 4)],
      };

      /* Anında hissedilen etkiler — tesis açılış bonusu */
      if (id === 'pitch') {
        // Saha kalitesi = takım antrenman verimi: tüm takıma +1 OVR + moral
        updates.trainingLvl = Math.max(prev.trainingLvl || 1, nextLevel);
        const lift = (p: Player) => {
          const ovr = Math.min(99, p.ovr + 1);
          return { ...p, ovr, value: calculatePlayerValue(ovr, p.age), morale: Math.min(100, p.morale + 3) };
        };
        updates.team11 = prev.team11.map(lift);
        updates.bench = prev.bench.map(lift);
      } else if (id === 'gym') {
        // Fitness salonu açıldı: enerji + moral patlaması
        const boost = (p: Player) => ({ ...p, energy: Math.min(100, p.energy + 15), morale: Math.min(100, p.morale + 5) });
        updates.team11 = prev.team11.map(boost);
        updates.bench = prev.bench.map(boost);
      } else if (id === 'recovery') {
        updates.healthLvl = Math.max(prev.healthLvl || 1, nextLevel);
        const care = (p: Player) =>
          p.injured ? { ...p, injuryWeeks: Math.max(1, p.injuryWeeks - 1) } : { ...p, energy: Math.min(100, p.energy + 12) };
        updates.team11 = prev.team11.map(care);
        updates.bench = prev.bench.map(care);
      } else if (id === 'tactics') {
        updates.teamChemistry = Math.min(100, Math.round(((prev.teamChemistry || 55) + 6 + nextLevel) * 10) / 10);
      } else if (id === 'youth') {
        updates.academyLevel = Math.max(prev.academyLevel || 1, nextLevel);
        updates.academyPlayers = prev.academyPlayers.map(p => {
          const ovr = Math.min(p.potential, p.ovr + 1);
          return { ...p, ovr, value: calculatePlayerValue(ovr, p.age) };
        });
      }

      return { ...prev, ...updates };
    });
  }, []);

  const discoverYouthPlayer = useCallback((investment: number = 50000) => {
    setGameState(prev => {
      if (!prev || prev.budget < investment) return prev;

      const chance = 0.4 + (prev.academyLevel * 0.1) + (prev.scoutLvl * 0.05);
      if (Math.random() < chance) {
        const posPool = ['KL', 'STP', 'SB', 'OS', 'FW'];
        const role = posPool[Math.floor(Math.random() * posPool.length)];
        const player = generatePlayer(role, 55 + prev.academyLevel * 5, 70 + prev.academyLevel * 5, Date.now());
        player.age = 16 + Math.floor(Math.random() * 3);

        return {
          ...prev,
          academyPlayers: [...prev.academyPlayers, player],
          budget: prev.budget - investment,
          news: [`🌟 Yetenek keşfedildi: ${player.name} (${player.ovr} OVR, potansiyel ${player.potential})`, ...prev.news.slice(0, 4)]
        };
      }

      return {
        ...prev,
        budget: prev.budget - investment,
        news: ['🔍 Yetenek araması başarısız oldu.', ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  const promoteYouthPlayer = useCallback((playerId: number) => {
    setGameState(prev => {
      if (!prev) return null;

      const player = prev.academyPlayers.find(p => p.id === playerId);
      if (!player) return prev;

      let result: GameState = {
        ...prev,
        bench: [...prev.bench, { ...player, suspension: 0 }],
        academyPlayers: prev.academyPlayers.filter(p => p.id !== playerId),
        clubStats: { ...prev.clubStats, youthPromoted: (prev.clubStats.youthPromoted || 0) + 1 },
        news: [`⬆️ ${player.name} A takıma yükseldi!`, ...prev.news.slice(0, 4)]
      };
      const a = result.achievements?.find(x => x.id === 'youth_star');
      if (a && !a.unlocked) {
        result = {
          ...result,
          budget: result.budget + (a.reward || 0),
          achievements: result.achievements.map(x =>
            x.id === 'youth_star' ? { ...x, unlocked: true, unlockedWeek: result.week } : x
          ),
          news: [`🏅 Başarım: ${a.title}!`, ...result.news.slice(0, 4)]
        };
      }
      return result;
    });
  }, []);

  const buyInvestment = useCallback((investmentId: number, quantity: number = 1) => {
    setGameState(prev => {
      if (!prev) return null;
      const inv = prev.investments.find(i => i.id === investmentId);
      if (!inv) return prev;
      const qty = Math.max(1, Math.floor(quantity));
      const fee = investmentFeeRate(inv.type);
      const unitCost = Math.round(inv.price * (1 + fee));
      const totalCost = unitCost * qty;
      if (prev.budget < totalCost) return prev;
      const oldOwned = inv.owned || 0;
      const oldAvg = (inv as any).avgCost ?? inv.price;
      const newOwned = oldOwned + qty;
      const newAvg = Math.round((oldOwned * oldAvg + totalCost) / newOwned);
      return {
        ...prev,
        investments: prev.investments.map(i => (i.id === investmentId ? { ...i, owned: newOwned, avgCost: newAvg } : i)),
        budget: prev.budget - totalCost,
        news: [`📈 ${inv.name} — ${qty} lot alındı @ $${inv.price.toLocaleString()} (komisyon %${(fee*100).toFixed(1)})`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  const sellInvestment = useCallback((investmentId: number, quantity: number = 1) => {
    setGameState(prev => {
      if (!prev) return null;
      const inv = prev.investments.find(i => i.id === investmentId);
      if (!inv || (inv.owned || 0) <= 0) return prev;
      const qty = Math.min(Math.max(1, Math.floor(quantity)), inv.owned);
      const fee = investmentFeeRate(inv.type);
      const unitProceeds = Math.round(inv.price * (1 - fee));
      const avg = (inv as any).avgCost ?? inv.price;
      let totalProceeds = 0;
      let totalTax = 0;
      for (let k = 0; k < qty; k++) {
        const profit = unitProceeds - avg;
        const tax = profit > 0 ? Math.round(profit * 0.10) : 0; // %10 stopaj sadece kâra
        totalProceeds += unitProceeds - tax;
        totalTax += tax;
      }
      const newOwned = inv.owned - qty;
      return {
        ...prev,
        investments: prev.investments.map(i => (i.id === investmentId ? { ...i, owned: newOwned, avgCost: newOwned === 0 ? i.price : (i as any).avgCost } : i)),
        budget: prev.budget + totalProceeds,
        news: [`💰 ${inv.name} — ${qty} lot satıldı @ $${inv.price.toLocaleString()} → net $${totalProceeds.toLocaleString()}${totalTax ? ` (vergi $${totalTax.toLocaleString()})` : ''}`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /* ══════════ KREDİ & TEFECİ ══════════ */
  const takeCredit = useCallback((packageId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const pkg: any = CREDIT_PACKAGES.find(c => c.id === packageId);
      if (!pkg) return prev;
      const active = (prev as any).activeCredits || [];
      if (active.length >= 3) return prev; // max 3 aynı anda
      // banka için yönetim güveni şartı
      if (pkg.type === 'bank') {
        const need = pkg.id === 'bank_quick' ? 35 : pkg.id === 'bank_standard' ? 40 : 50;
        if ((prev.boardConfidence || 50) < need) return prev;
      }
      // aynı paketten en fazla 1 tane
      if (active.some((c: any) => c.packageId === packageId)) return prev;
      const loan = {
        id: `cr-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        packageId: pkg.id,
        name: pkg.name,
        principal: pkg.amount,
        totalRepayment: pkg.totalRepayment,
        weeklyPayment: pkg.weeklyPayment,
        weeksTotal: pkg.weeks,
        weeksLeft: pkg.weeks,
        paidAmount: 0,
        interestRate: pkg.interestRate,
        type: pkg.type,
        takenWeek: prev.week,
        takenSeason: prev.season,
      };
      const creditScoreDelta = pkg.type === 'shark' ? -35 : -12;
      return {
        ...prev,
        budget: prev.budget + pkg.amount,
        activeCredits: [...active, loan],
        creditScore: Math.max(300, Math.min(850, (prev.creditScore ?? 620) + creditScoreDelta)),
        news: [pkg.type === 'shark' ? `🕶️ Tefeciden $${pkg.amount.toLocaleString()} alındı! Haftalık $${pkg.weeklyPayment.toLocaleString()} x${pkg.weeks} = $${pkg.totalRepayment.toLocaleString()} (%${Math.round(pkg.interestRate*100)} faiz). Dikkat: gecikme = puan silme!` : `🏦 ${pkg.name} onaylandı: +$${pkg.amount.toLocaleString()} (haftalık $${pkg.weeklyPayment.toLocaleString()} x${pkg.weeks})`, ...prev.news.slice(0,4)],
        boardMessages: pkg.type === 'shark' ? [`⚠️ Tefeciden borç alındı — yönetim tedirgin: "Bu işin sonu kötü bitebilir."`, ...prev.boardMessages.slice(0,5)] : prev.boardMessages,
      };
    });
  }, []);

  const repayCreditEarly = useCallback((creditId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const active: any[] = (prev as any).activeCredits || [];
      const loan = active.find(c => c.id === creditId);
      if (!loan) return prev;
      const remaining = loan.totalRepayment - loan.paidAmount;
      // erken kapatmada %5 ıskonto
      const discount = Math.round(remaining * 0.05);
      const payNow = remaining - discount;
      if (prev.budget < payNow) return prev;
      return {
        ...prev,
        budget: prev.budget - payNow,
        activeCredits: active.filter(c => c.id !== creditId),
        creditScore: Math.min(850, (prev.creditScore ?? 620) + (loan.type === 'shark' ? 22 : 15)),
        news: [`✅ ${loan.name} erken kapatıldı: $${payNow.toLocaleString()} ödendi (iskonto $${discount.toLocaleString()})`, ...prev.news.slice(0,4)],
      };
    });
  }, []);

  const setClubPhilosophy = useCallback((philosophy: import('../types/game').ClubPhilosophy) => {
    setGameState(prev => {
      if (!prev) return null;
      if (prev.clubPhilosophy === philosophy) return prev;
      // bonuslar
      let bonusMsg = '';
      let updates: any = { clubPhilosophy: philosophy };
      if (philosophy === 'youth') {
        updates = { ...updates, academyLevel: Math.min(5, (prev.academyLevel||1)+1), ultrasHappiness: Math.min(100, (prev.ultrasHappiness||65)+8) };
        bonusMsg = '🌱 Altyapı Fabrikası seçildi! Akademi +1 seviye, ultras coşkulu!';
      } else if (philosophy === 'money') {
        updates = { ...updates, budget: prev.budget + 250000, ultrasHappiness: Math.min(100, (prev.ultrasHappiness||65)+5) };
        bonusMsg = '💰 Para Makinesi seçildi! +$250k sıcak para, sponsorlar memnun!';
      } else if (philosophy === 'trophy') {
        updates = { ...updates, teamChemistry: Math.min(100, (prev.teamChemistry||55)+6), ultrasHappiness: Math.min(100, (prev.ultrasHappiness||65)+6) };
        bonusMsg = '🏆 Kupa Avcısı seçildi! Takım kimyası +6, stadyum inliyor!';
      }
      return { ...prev, ...updates, news: [bonusMsg, ...prev.news.slice(0,4)] };
    });
  }, []);

  const generateUltrasRequests = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      // zaten 2 aktif varsa üretme
      if ((prev.ultrasRequests||[]).length >= 2) return prev;
      // rastgele 1-2 istek
      const templates: any[] = [
        { kind: 'youth', text: 'Bu ay bir altyapı oyuncusunu A takıma al!', reward: 'Sadakat +12, kimya +2', penalty: '-8 taraftar', check: 'youth' },
        { kind: 'star', text: 'Yıldız transferi istiyoruz — OVR 78+ birini al', reward: 'Tribün doluluk +8%', penalty: '-10 taraftar' },
        { kind: 'derby', text: 'Sıradaki iç saha maçını kazan!', reward: 'Moral +8 tüm takım', penalty: '-5 güven' },
        { kind: 'cleanSheet', text: '2 maçta gol yemeyin', reward: 'Savunma +2', penalty: '-10 ultras' },
      ];
      const pick = templates[Math.floor(Math.random()*templates.length)];
      const req: any = {
        id: `ur-${Date.now()}-${Math.random().toString(36).slice(2,4)}`,
        kind: pick.kind,
        text: pick.text,
        deadlineWeek: (prev.week||1) + 3 + Math.floor(Math.random()*3),
        deadlineSeason: prev.season||1,
        reward: pick.reward,
        penalty: pick.penalty,
      };
      return { ...prev, ultrasRequests: [...(prev.ultrasRequests||[]), req], news: [`📢 Ultras: "${pick.text}" — 3 hafta süren var!`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const completeUltrasRequest = useCallback((requestId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const req = (prev.ultrasRequests||[]).find((r:any)=> r.id===requestId);
      if (!req) return prev;
      let bonus: any = {};
      if (req.kind === 'youth') bonus = { teamChemistry: Math.min(100,(prev.teamChemistry||55)+2), ultrasHappiness: Math.min(100,(prev.ultrasHappiness||65)+12), fanHappiness: Math.min(100,(prev.fanHappiness||60)+3) };
      else if (req.kind === 'star') bonus = { fanHappiness: Math.min(100,(prev.fanHappiness||60)+8), ultrasHappiness: Math.min(100,(prev.ultrasHappiness||65)+10) };
      else if (req.kind === 'derby') bonus = { team11: prev.team11.map(pl=>({ ...pl, morale: Math.min(100, pl.morale+8)})), bench: prev.bench.map(pl=>({ ...pl, morale: Math.min(100, pl.morale+8)})), ultrasHappiness: Math.min(100,(prev.ultrasHappiness||65)+10) };
      else if (req.kind === 'cleanSheet') bonus = { ultrasHappiness: Math.min(100,(prev.ultrasHappiness||65)+9) };
      return { ...prev, ...bonus, ultrasRequests: (prev.ultrasRequests||[]).filter((r:any)=> r.id!==requestId), ultrasHappiness: Math.min(100,(prev.ultrasHappiness||65)+5), news: [`✅ Ultras isteği tamamlandı: "${req.text}" → ${req.reward}`, ...prev.news.slice(0,4)], boardMessages: [`📢 Ultras memnun: "${req.text}" yerine getirildi!`, ...prev.boardMessages.slice(0,5)] };
    });
  }, []);

  const dismissUltrasRequest = useCallback((requestId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      return { ...prev, ultrasRequests: (prev.ultrasRequests||[]).filter((r:any)=> r.id!==requestId), ultrasHappiness: Math.max(0,(prev.ultrasHappiness||65)-6), news: [`❌ Ultras isteği görmezden gelindi — ultras -6`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const generatePressConference = useCallback((opponent: string, wasWin: boolean, wasDraw: boolean) => {
    setGameState(prev => {
      if (!prev) return null;
      const qs: any[] = (() => {
        if (wasWin) return [
          { id: 'q1', question: 'Galibiyetin anahtarı neydi?', answers: [
            { tone: 'humble', label: 'Çocuklar çok çalıştı, ben sadece yön verdim', effect: 'Takım morali +5, kimya +2' },
            { tone: 'confident', label: 'Planım tıkır tıkır işledi — biz daha iyiyiz', effect: 'Taraftar +6, board +3' },
            { tone: 'aggressive', label: 'Hakem de rakip de yetmedi!', effect: 'Ultras +7, kart riski +15%' },
          ]},
          { id: 'q2', question: 'Bir oyuncunuzu öne çıkarır mısınız?', answers: [
            { tone: 'humble', label: 'Hepsi yıldızdı, tek isim haksızlık olur', effect: 'Genel moral +3' },
            { tone: 'confident', label: 'Gol kralımız yine konuştu', effect: 'Golcü +10, diğerleri -2' },
            { tone: 'neutral', label: 'Taraftar muhteşemdi', effect: 'Fan +8, ultras +5' },
          ]},
        ];
        if (wasDraw) return [
          { id: 'q1', question: 'Beraberliği nasıl değerlendiriyorsunuz?', answers: [
            { tone: 'humble', label: 'Bir puan da puandır', effect: 'Kimya +1' },
            { tone: 'aggressive', label: 'Hakem iki puanımızı çaldı!', effect: 'Ultras +5, board -2' },
            { tone: 'confident', label: 'Üstün olan bizdik', effect: 'Fan +3' },
          ]},
          { id: 'q2', question: 'Sıradaki maç için mesajınız?', answers: [
            { tone: 'confident', label: 'Eze eze kazanacağız', effect: 'Moral +4' },
            { tone: 'humble', label: 'Adım adım, her maç final', effect: 'Kimya +2' },
            { tone: 'neutral', label: 'Taraftar yanımızda olsun', effect: 'Fan +4' },
          ]},
        ];
        return [
          { id: 'q1', question: 'Mağlubiyetin sebebi neydi?', answers: [
            { tone: 'humble', label: 'Sorumluluk bende', effect: 'Board +3, saygı +4' },
            { tone: 'aggressive', label: 'Oyuncularım sahada yoktu!', effect: 'Moral -8, board -5' },
            { tone: 'confident', label: 'Kaza oldu, telafi edeceğiz', effect: 'Moral -2' },
          ]},
          { id: 'q2', question: 'Eleştirilere ne diyorsunuz?', answers: [
            { tone: 'humble', label: 'Haklılar, daha çok çalışmalıyız', effect: 'Fan +2' },
            { tone: 'aggressive', label: 'Koltuğumdan memnun olmayan gitsin!', effect: 'Board -7, ultras +6' },
            { tone: 'neutral', label: 'Sahada konuşacağız', effect: 'Moral +2' },
          ]},
        ];
      })();
      // Drama: 3. soru — transfer dedikodusu / yıldız krizi (ultra drama mod)
      if (Math.random() < 0.55) {
        const hasOffers = (prev.transferOffers||[]).length > 0;
        const wantsOut = [...(prev.team11||[]), ...(prev.bench||[])].find((p:any)=> p.wantsOut);
        if (wantsOut) {
          qs.push({ id: 'q3', question: `${wantsOut.name} ayrılmak istiyor — ne diyorsunuz?`, answers: [
            { tone: 'humble', label: `O bizim evladımız, konuşup ikna edeceğim`, effect: 'Yıldız moral +6, kimya +1' },
            { tone: 'confident', label: `Kimse kulüpten büyük değil`, effect: 'Takım +3, yıldız -5 ama taraftar +5' },
            { tone: 'aggressive', label: `Gitsin! Parasını getirsin yeter`, effect: 'Board +4, ultras -4, yıldız -10' },
          ]});
        } else if (hasOffers) {
          const offer = (prev.transferOffers||[])[0];
          qs.push({ id: 'q3', question: `${offer?.playerName || 'Bir oyuncunuza'} teklif var — satar mısınız?`, answers: [
            { tone: 'humble', label: `Oyuncumla konuşacağım, o karar verecek`, effect: 'Oyuncu moral +3' },
            { tone: 'confident', label: `Doğru fiyat gelirse herkes satılık`, effect: 'Board +3, fan -2' },
            { tone: 'aggressive', label: `Bu rakamlar komik, kapıyı kapatıyoruz!`, effect: 'Ultras +4, board -1' },
          ]});
        } else if (Math.random() < 0.4) {
          qs.push({ id: 'q3', question: `Taraftar şampiyonluk bekliyor — sözünüz nedir?`, answers: [
            { tone: 'humble', label: `Maç maç bakıyoruz, söz vermek kolay`, effect: 'Board +2' },
            { tone: 'confident', label: `Bu şehir şampiyonluğu hak ediyor — getireceğiz!`, effect: 'Fan +10, baskı artar' },
            { tone: 'aggressive', label: `Bizi izlemeye devam edin, ezeceğiz!`, effect: 'Ultras +6, baskı +2' },
          ]});
        }
      }
      const conf: any = { id: `press-${Date.now()}`, opponent, wasWin, wasDraw, questions: qs, answered: 0 };
      return { ...prev, pendingPress: conf, news: [`🎙️ Basın toplantısı: ${opponent} maçı sonrası ${qs.length} soru seni bekliyor!`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const answerPressQuestion = useCallback((tone: string) => {
    setGameState(prev => {
      if (!prev || !(prev as any).pendingPress) return prev;
      const press: any = (prev as any).pendingPress;
      const currentQ = press.questions[press.answered];
      if (!currentQ) return prev;
      const ans = currentQ.answers.find((a:any)=> a.tone===tone) || currentQ.answers[0];
      let updates: any = {};
      let msg = `🎙️ Basın: "${ans.label}" → ${ans.effect}`;
      // Drama: 3. soru özel — wantsOut oyuncusunu etkile
      const isStarCrisis = currentQ.id==='q3' && currentQ.question.includes('ayrılmak istiyor');
      if (isStarCrisis) {
        const starName = currentQ.question.split(' ayrılmak')[0].trim();
        const bump = (pl:any)=> pl.name===starName ? { ...pl, morale: tone==='humble' ? Math.min(100, pl.morale+6) : tone==='confident' ? Math.max(0, pl.morale-3) : Math.max(0, pl.morale-10), wantsOut: tone==='aggressive' ? true : tone==='humble' ? false : pl.wantsOut } : pl;
        updates.team11 = (prev.team11||[]).map(bump);
        updates.bench = (prev.bench||[]).map(bump);
        if (tone==='humble') msg += ' | Yıldız ikna oldu!';
        else if (tone==='aggressive') msg += ' | Yıldız resti gördü!';
      }
      if (tone === 'humble') {
        updates = { teamChemistry: Math.min(100,(prev.teamChemistry||55)+1), boardConfidence: Math.min(100,(prev.boardConfidence||60)+2), team11: prev.team11.map(p=> ({...p, morale: Math.min(100,p.morale+2)})), bench: prev.bench.map(p=> ({...p, morale: Math.min(100,p.morale+2)})) };
        updates.fanHappiness = Math.min(100,(prev.fanHappiness||60)+2);
      } else if (tone === 'confident') {
        updates = { fanHappiness: Math.min(100,(prev.fanHappiness||60)+4), boardConfidence: Math.min(100,(prev.boardConfidence||60)+2), team11: prev.team11.map(p=> ({...p, morale: Math.min(100,p.morale+3)})), bench: prev.bench.map(p=> ({...p, morale: Math.max(0,p.morale-1)})) };
        updates.ultrasHappiness = Math.min(100,((prev as any).ultrasHappiness||65)+2);
      } else if (tone === 'aggressive') {
        updates = { ultrasHappiness: Math.min(100,((prev as any).ultrasHappiness||65)+5), fanHappiness: Math.min(100,(prev.fanHappiness||60)+1), boardConfidence: Math.max(0,(prev.boardConfidence||60)-3), team11: prev.team11.map(p=> ({...p, morale: Math.max(0,p.morale-2)})) };
        if (Math.random() < 0.3) {
          updates.boardConfidence = Math.max(0,(updates.boardConfidence?? prev.boardConfidence)-2);
          msg += " | Drama: Yönetim kaşlarını çattı!";
        }
      } else {
        updates = { fanHappiness: Math.min(100,(prev.fanHappiness||60)+3) };
        updates.ultrasHappiness = Math.min(100,((prev as any).ultrasHappiness||65)+3);
      }
      const nextAnswered = press.answered + 1;
      const isDone = nextAnswered >= press.questions.length;
      const nextPress = isDone ? null : { ...press, answered: nextAnswered };
      let socialFeed: any = prev.socialFeed || [];
      if (isDone && Math.random() < 0.6) {
        const hot = tone==='aggressive' ? '🔥 Basın toplantısında ortalık karıştı! Taraftar ikiye bölündü.' : tone==='confident' ? '🎙️ Hocadan iddialı sözler — taraftar coşkulu!' : '🎙️ Alçakgönüllü demeçler takdir topladı.';
        socialFeed = [{ id: `press-social-${Date.now()}`, author: 'FutbolX', handle: '@futbolx', text: hot, likes: 40 + Math.floor(Math.random()*80), liked: false, comments: [], time: 'az önce', isUser: false }, ...socialFeed].slice(0,30);
      }
      return { ...prev, ...updates, pendingPress: nextPress, socialFeed, news: [msg, ...prev.news.slice(0,4)] };
    });
  }, []);

  const dismissPress = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      return { ...prev, pendingPress: null, boardConfidence: Math.max(0,(prev.boardConfidence||60)-2), news: ['🎙️ Basın toplantısı atlandı — yönetim memnun değil (-2)', ...prev.news.slice(0,4)] };
    });
  }, []);

  const sendScout = useCallback((regionId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      // @ts-ignore
      const regions: any[] = (() => { try { return require('../data/constants').SCOUT_REGIONS; } catch { return []; } })();
      // fallback inline if import fails
      const fallback: any[] = [
        { id: 'balkans', name: 'Balkanlar', cost: 45000, weeks: 2 },
        { id: 'west_eu', name: 'Batı Avrupa', cost: 85000, weeks: 3 },
        { id: 'south_america', name: 'Güney Amerika', cost: 135000, weeks: 3 },
        { id: 'africa', name: 'Afrika', cost: 70000, weeks: 2 },
        { id: 'east_eu', name: 'Doğu Avrupa', cost: 65000, weeks: 3 },
        { id: 'asia', name: 'Doğu Asya', cost: 50000, weeks: 2 },
      ];
      const list = regions.length ? regions : fallback;
      const region: any = list.find((r:any)=> r.id===regionId);
      if (!region) return prev;
      if (prev.budget < region.cost) return prev;
      // max 3 aynı anda
      if ((prev.scoutMissions||[]).length >= 3) return prev;
      const mission: any = {
        id: `scout-${Date.now()}-${Math.random().toString(36).slice(2,4)}`,
        regionId: region.id,
        regionName: region.name,
        weeksLeft: region.weeks,
        totalWeeks: region.weeks,
        cost: region.cost,
        startedWeek: prev.week,
        startedSeason: prev.season,
      };
      return {
        ...prev,
        budget: prev.budget - region.cost,
        scoutMissions: [...(prev.scoutMissions||[]), mission],
        news: [`🧭 İzci gönderildi: ${region.flag||'🌍'} ${region.name} — ${region.weeks} hafta, $${region.cost.toLocaleString()}`, ...prev.news.slice(0,4)],
      };
    });
  }, []);

  const claimScoutReport = useCallback((reportId: string, playerId?: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const report = (prev.scoutReports||[]).find((r:any)=> r.id===reportId);
      if (!report) return prev;
      if (playerId) {
        const player = (report.players||[]).find((p:any)=> p.id===playerId);
        if (!player) return prev;
        return {
          ...prev,
          academyPlayers: [...prev.academyPlayers, { ...player, id: Date.now()+Math.floor(Math.random()*1000) }],
          scoutReports: (prev.scoutReports||[]).map((r:any)=> r.id===reportId ? { ...r, players: r.players.filter((p:any)=> p.id!==playerId)} : r).filter((r:any)=> r.players.length>0),
          news: [`🌟 ${player.name} (${player.ovr} OVR, pot ${player.potential}) altyapıya katıldı! (${report.regionName})`, ...prev.news.slice(0,4)],
        };
      } else {
        // hepsini al
        const toAcademy = (report.players||[]).map((p:any)=> ({ ...p, id: Date.now()+Math.floor(Math.random()*10000)+p.id%1000 }));
        return {
          ...prev,
          academyPlayers: [...prev.academyPlayers, ...toAcademy],
          scoutReports: (prev.scoutReports||[]).filter((r:any)=> r.id!==reportId),
          news: [`🌟 ${report.regionName} raporu: ${toAcademy.length} genç altyapıya katıldı!`, ...prev.news.slice(0,4)],
        };
      }
    });
  }, []);

  const dismissScoutReport = useCallback((reportId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      return { ...prev, scoutReports: (prev.scoutReports||[]).filter((r:any)=> r.id!==reportId), news: [`🗑️ İzci raporu silindi.`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const cancelScoutMission = useCallback((missionId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const m = (prev.scoutMissions||[]).find((x:any)=> x.id===missionId);
      if (!m) return prev;
      const refund = Math.round(m.cost*0.4);
      return { ...prev, scoutMissions: (prev.scoutMissions||[]).filter((x:any)=> x.id!==missionId), budget: prev.budget + refund, news: [`↩️ İzci görevi iptal: ${m.regionName} • $${refund.toLocaleString()} iade`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const buyDevice = useCallback((deviceId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      // catalog lookup (inline fallback)
      const catalog: any[] = [
        { id: 'phone_mini', name: 'Akıllı Mini 12', brand: 'Meyve', category: 'phone', price: 18000, quality: 42, camera: 45, performance: 40, icon: '📱', desc: 'Giriş seviye' },
        { id: 'phone_mid', name: 'Galaksi S24', brand: 'Semsun', category: 'phone', price: 42000, quality: 68, camera: 72, performance: 65, icon: '📱', desc: 'Orta-üst' },
        { id: 'phone_pro', name: 'Meyve 15 Pro Max', brand: 'Meyve', category: 'phone', price: 78000, quality: 88, camera: 90, performance: 88, icon: '📱', desc: 'Amiral' },
        { id: 'phone_fold', name: 'Z Kat 5', brand: 'Semsun', category: 'phone', price: 65000, quality: 75, camera: 70, performance: 78, icon: '📱', desc: 'Katlanabilir' },
        { id: 'pc_air', name: 'HafifBook Air M2', brand: 'Meyve', category: 'computer', price: 38000, quality: 62, camera: 50, performance: 60, icon: '💻', desc: 'Taşınabilir' },
        { id: 'pc_gaming_mid', name: 'Canavar T7 V21', brand: 'Canavar', category: 'computer', price: 55000, quality: 74, camera: 55, performance: 78, icon: '💻', desc: 'Oyuncu laptop' },
        { id: 'cam_vlog', name: 'VlogCam ZV-1', brand: 'Sonyx', category: 'camera', price: 28000, quality: 80, camera: 85, performance: 55, icon: '📷', desc: 'Vlog canavarı' },
        { id: 'cam_pro', name: 'A7S III', brand: 'Sonyx', category: 'camera', price: 95000, quality: 95, camera: 96, performance: 70, icon: '📷', desc: 'Sinema' },
        { id: 'tablet_pro', name: 'Tab Pro 12.9', brand: 'Meyve', category: 'tablet', price: 35000, quality: 60, camera: 65, performance: 62, icon: '📲', desc: 'Çizim & kurgu' },
        { id: 'console_x', name: 'Kutu X', brand: 'MikroYum', category: 'console', price: 15000, quality: 45, camera: 40, performance: 50, icon: '🎮', desc: 'Oyun yayını' },
      ];
      const dev: any = catalog.find((d:any)=> d.id===deviceId);
      if (!dev) return prev;
      if (prev.budget < dev.price) return prev;
      if ((prev.devices||[]).some((d:any)=> d.id===deviceId)) return prev;
      return { ...prev, budget: prev.budget - dev.price, devices: [...(prev.devices||[]), dev], activeDeviceId: dev.id, news: [`📱 ${dev.brand} ${dev.name} satın alındı! Kalite ${dev.quality}/100`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const setActiveDevice = useCallback((deviceId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      if (!(prev.devices||[]).some((d:any)=> d.id===deviceId)) return prev;
      return { ...prev, activeDeviceId: deviceId, news: [`📱 Aktif cihaz: ${(prev.devices||[]).find((d:any)=> d.id===deviceId)?.name}`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const sellDevice = useCallback((deviceId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const dev: any = (prev.devices||[]).find((d:any)=> d.id===deviceId);
      if (!dev) return prev;
      if ((prev.devices||[]).length <= 1) return prev;
      const refund = Math.round(dev.price*0.55);
      const remaining = (prev.devices||[]).filter((d:any)=> d.id!==deviceId);
      return { ...prev, budget: prev.budget + refund, devices: remaining, activeDeviceId: prev.activeDeviceId===deviceId ? remaining[0]?.id : prev.activeDeviceId, news: [`💸 ${dev.name} satıldı +$${refund.toLocaleString()}`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const buyPCComponent = useCallback((compId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      // find component in catalog
      const all: any[] = [
        { id: 'cpu_i3', name: 'i3-13100F', brand: 'Intel', type: 'cpu', price: 3800, tier: 'giriş', specs: '4C/8T • 4.5GHz', performance: 42, icon: '🧠', power: 65 },
        { id: 'cpu_i5', name: 'i5-14400F', brand: 'Intel', type: 'cpu', price: 7200, tier: 'orta', specs: '10C/16T • 4.7GHz', performance: 68, icon: '🧠', power: 95 },
        { id: 'cpu_i7', name: 'i7-14700K', brand: 'Intel', type: 'cpu', price: 14500, tier: 'üst', specs: '20C/28T • 5.6GHz', performance: 88, icon: '🧠', power: 125 },
        { id: 'cpu_r5', name: 'Ryzen 5 7600', brand: 'AMD', type: 'cpu', price: 6800, tier: 'orta', specs: '6C/12T • 5.1GHz', performance: 66, icon: '🧠', power: 65 },
        { id: 'cpu_r7', name: 'Ryzen 7 7800X3D', brand: 'AMD', type: 'cpu', price: 12800, tier: 'efsane', specs: '8C/16T • 5.0GHz 3D', performance: 92, icon: '🧠', power: 80 },
        { id: 'cpu_r9', name: 'Ryzen 9 7950X', brand: 'AMD', type: 'cpu', price: 18500, tier: 'efsane', specs: '16C/32T • 5.7GHz', performance: 95, icon: '🧠', power: 120 },
        { id: 'gpu_4060', name: 'RTX 4060 8GB', brand: 'NVIDIA', type: 'gpu', price: 11500, tier: 'orta', specs: 'DLSS 3 • 1080p kralı', performance: 62, icon: '🎮', power: 115 },
        { id: 'gpu_4070', name: 'RTX 4070 12GB', brand: 'NVIDIA', type: 'gpu', price: 19800, tier: 'üst', specs: 'DLSS 3 • 1440p', performance: 78, icon: '🎮', power: 200 },
        { id: 'gpu_4080', name: 'RTX 4080 16GB', brand: 'NVIDIA', type: 'gpu', price: 38000, tier: 'efsane', specs: '4K • AV1', performance: 92, icon: '🎮', power: 320 },
        { id: 'gpu_4090', name: 'RTX 4090 24GB', brand: 'NVIDIA', type: 'gpu', price: 62000, tier: 'efsane', specs: '4K canavar • 450W', performance: 100, icon: '🎮', power: 450 },
        { id: 'gpu_7600', name: 'RX 7600 8GB', brand: 'AMD', type: 'gpu', price: 8500, tier: 'giriş', specs: '1080p • FSR', performance: 55, icon: '🎮', power: 165 },
        { id: 'gpu_7800', name: 'RX 7800 XT 16GB', brand: 'AMD', type: 'gpu', price: 16500, tier: 'orta', specs: '1440p • 16GB', performance: 72, icon: '🎮', power: 263 },
        { id: 'ram_16', name: '16GB DDR5 5600', brand: 'Corsair', type: 'ram', price: 2200, tier: 'orta', specs: '2x8GB CL36', performance: 60, icon: '💾', power: 10 },
        { id: 'ram_32', name: '32GB DDR5 6000', brand: 'G.Skill', type: 'ram', price: 4200, tier: 'üst', specs: '2x16GB CL30 Expo', performance: 78, icon: '💾', power: 12 },
        { id: 'ram_64', name: '64GB DDR5 6000', brand: 'Kingston', type: 'ram', price: 7800, tier: 'efsane', specs: '2x32GB CL32', performance: 90, icon: '💾', power: 15 },
        { id: 'mb_b660', name: 'B660M-HDV', brand: 'ASRock', type: 'motherboard', price: 2800, tier: 'giriş', specs: 'mATX • DDR5', performance: 45, icon: '🔌', power: 20 },
        { id: 'mb_b760', name: 'B760 Gaming X', brand: 'Gigabyte', type: 'motherboard', price: 4800, tier: 'orta', specs: 'ATX • WiFi', performance: 68, icon: '🔌', power: 25 },
        { id: 'mb_z790', name: 'Z790-E ROG', brand: 'ASUS', type: 'motherboard', price: 9500, tier: 'efsane', specs: 'ATX • WiFi 6E • OC', performance: 92, icon: '🔌', power: 30 },
        { id: 'ssd_1tb', name: '1TB NVMe Gen4', brand: 'Samsung 990', type: 'storage', price: 2800, tier: 'orta', specs: '7450 MB/s', performance: 70, icon: '💿', power: 6 },
        { id: 'ssd_2tb', name: '2TB NVMe Gen4', brand: 'WD Black', type: 'storage', price: 5200, tier: 'üst', specs: '7300 MB/s', performance: 85, icon: '💿', power: 7 },
        { id: 'ssd_4tb', name: '4TB NVMe Gen4', brand: 'Seagate', type: 'storage', price: 9800, tier: 'efsane', specs: '7250 MB/s • 4TB', performance: 95, icon: '💿', power: 8 },
        { id: 'psu_650', name: '650W 80+ Bronze', brand: 'FSP', type: 'psu', price: 1800, tier: 'giriş', specs: 'Bronze • 650W', performance: 50, icon: '🔋', power: 650 },
        { id: 'psu_750g', name: '750W 80+ Gold', brand: 'Corsair RM750', type: 'psu', price: 3200, tier: 'orta', specs: 'Gold • Full Mod', performance: 75, icon: '🔋', power: 750 },
        { id: 'psu_1000', name: '1000W 80+ Gold', brand: 'MSI MPG', type: 'psu', price: 5200, tier: 'efsane', specs: 'ATX 3.0 • PCIe5', performance: 95, icon: '🔋', power: 1000 },
        { id: 'case_mini', name: 'Matrexx 40', brand: 'DeepCool', type: 'case', price: 1200, tier: 'giriş', specs: 'mATX • Mesh', performance: 40, icon: '🖥️', power: 0 },
        { id: 'case_mid', name: 'H7 Flow', brand: 'NZXT', type: 'case', price: 3400, tier: 'orta', specs: 'ATX • AirFlow', performance: 72, icon: '🖥️', power: 0 },
        { id: 'case_prem', name: 'O11 Dynamic EVO', brand: 'Lian Li', type: 'case', price: 6200, tier: 'efsane', specs: 'Premium • Cam', performance: 92, icon: '🖥️', power: 0 },
        { id: 'cool_air', name: 'AK400', brand: 'DeepCool', type: 'cooling', price: 900, tier: 'giriş', specs: 'Hava • 4 heatpipe', performance: 45, icon: '❄️', power: 5 },
        { id: 'cool_aio240', name: '240mm AIO', brand: 'Corsair H100', type: 'cooling', price: 2800, tier: 'orta', specs: '240mm Sıvı', performance: 75, icon: '❄️', power: 12 },
        { id: 'cool_aio360', name: '360mm AIO', brand: 'NZXT Kraken', type: 'cooling', price: 5200, tier: 'efsane', specs: '360mm • LCD', performance: 95, icon: '❄️', power: 18 },
        { id: 'mon_1080', name: '24" 1080p 144Hz', brand: 'AOC', type: 'monitor', price: 3200, tier: 'giriş', specs: 'IPS 144Hz', performance: 45, icon: '🖥️', power: 25 },
        { id: 'mon_1440', name: '27" 1440p 165Hz', brand: 'LG UltraGear', type: 'monitor', price: 6800, tier: 'orta', specs: 'IPS 165Hz', performance: 72, icon: '🖥️', power: 35 },
        { id: 'mon_4k', name: '32" 4K 144Hz', brand: 'Samsung Odyssey', type: 'monitor', price: 14500, tier: 'efsane', specs: '4K 144Hz HDR', performance: 95, icon: '🖥️', power: 55 },
      ];
      const comp: any = all.find((c:any)=> c.id===compId);
      if (!comp) return prev;
      if (prev.budget < comp.price) return prev;
      // add to inventory
      return { ...prev, budget: prev.budget - comp.price, pcInventory: [...(prev.pcInventory||[]), comp], news: [`🛒 ${comp.brand} ${comp.name} sepete eklendi!`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const setPCPart = useCallback((type: string, compId: string | null) => {
    setGameState(prev => {
      if (!prev) return null;
      if (!compId) {
        const next: any = { ...(prev.pcBuild||{}) };
        delete next[type];
        return { ...prev, pcBuild: next };
      }
      const comp: any = (prev.pcInventory||[]).find((c:any)=> c.id===compId && c.type===type);
      if (!comp) return prev;
      // simple compatibility: check PSU watt
      if (type!=='psu') {
        const psu = (prev.pcBuild as any)?.psu;
        const totalPower = (comp.power||0) + Object.values(prev.pcBuild||{}).reduce((a:any,b:any)=> a + ((b as any)?.power||0), 0);
        if (psu && totalPower > (psu.power||0)) {
          // allow but warn via news - still set
        }
      }
      return { ...prev, pcBuild: { ...(prev.pcBuild||{}), [type]: comp } };
    });
  }, []);

  const sellPCComponent = useCallback((compId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const comp: any = (prev.pcInventory||[]).find((c:any)=> c.id===compId);
      if (!comp) return prev;
      const refund = Math.round(comp.price*0.60);
      // remove from build if equipped
      let build: any = { ...(prev.pcBuild||{}) };
      for (const k in build) if ((build as any)[k]?.id===compId) delete (build as any)[k];
      return { ...prev, budget: prev.budget + refund, pcInventory: (prev.pcInventory||[]).filter((c:any)=> c.id!==compId), pcBuild: build, news: [`💸 ${comp.name} satıldı +$${refund.toLocaleString()}`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const assemblePC = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      const build: any = prev.pcBuild||{};
      const required = ['cpu','gpu','ram','motherboard','storage','psu','case'];
      const missing = required.filter(r=> !build[r]);
      if (missing.length) return prev;
      // calculate quality and performance
      const parts: any[] = Object.values(build);
      const avgPerf = Math.round(parts.reduce((a:any,b:any)=> a + (b.performance||0),0)/parts.length);
      const totalPrice = parts.reduce((a:any,b:any)=> a + (b.price||0),0);
      // create a device representing the built PC
      const pcDevice: any = { id: `pc_custom_${Date.now()}`, name: `Toplama PC • ${build.cpu?.name} + ${build.gpu?.name}`, brand: 'Özel Toplama', category: 'computer', price: totalPrice, quality: Math.min(98, 55+avgPerf*0.45), camera: 60, performance: Math.min(98, avgPerf), icon: '🖥️', desc: `${parts.length} parça • ${avgPerf}/100` };
      // add to devices and set active
      return { ...prev, devices: [...(prev.devices||[]), pcDevice], activeDeviceId: pcDevice.id, news: [`🖥️ PC toplandı! ${pcDevice.name} — Kalite ${pcDevice.quality}/100`, ...prev.news.slice(0,4)] };
    });
  }, []);

  const trainPlayer = useCallback((playerId: number, _attribute?: string) => {
    setGameState(prev => {
      if (!prev || prev.budget < 25000) return prev;

      const focus = prev.trainingFocus || 'balanced';
      const updatePlayerOvr = (player: Player): Player => {
        if (player.id !== playerId) return player;

        const ageFactor = player.age < 23 ? 2 : player.age < 28 ? 1 : 0.5;
        const facilityBonus = prev.trainingLvl * 0.3 + (prev.staff.some(s => s.type === 'coach') ? 0.5 : 0);
        const focusBonus = focus === 'balanced' ? 0 : 0.4;
        const improvement = Math.max(1, Math.round(ageFactor + facilityBonus + focusBonus));

        const newOvr = Math.min(player.potential, player.ovr + improvement);
        return { ...player, ovr: newOvr, value: calculatePlayerValue(newOvr, player.age) };
      };

      const inTeam = prev.team11.find(p => p.id === playerId);
      const injuredRisk = (focus === 'fitness' ? 0.02 : 0.05) * facilityEffects(prev.facility).injuryRiskMult;
      const gotInjured = Math.random() < injuredRisk && !prev.team11.find(p => p.id === playerId)?.injured;

      let team11 = inTeam ? prev.team11.map(updatePlayerOvr) : prev.team11;
      let bench = !inTeam ? prev.bench.map(updatePlayerOvr) : prev.bench;
      if (gotInjured) {
        const weeks = 1 + Math.floor(Math.random() * 2);
        team11 = team11.map(p => (p.id === playerId ? { ...p, injured: true, injuryWeeks: weeks } : p));
        bench = bench.map(p => (p.id === playerId ? { ...p, injured: true, injuryWeeks: weeks } : p));
      }

      return {
        ...prev,
        team11,
        bench,
        budget: prev.budget - 25000,
        news: [
          gotInjured
            ? `🏥 Ekstra antrenmanda sakatlık! Oyuncu 1-2 hafta yok.`
            : `🏋️ Oyuncu antrenmanı tamamlandı!`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  const openShopBranch = useCallback((cityId: number, district: string, shopType: 'small' | 'medium' | 'large' | 'flagship') => {
    setGameState(prev => {
      if (!prev) return null;

      const city = TURKEY_CITIES.find(c => c.id === cityId);
      const shopInfo = SHOP_TYPES.find(s => s.type === shopType);
      if (!city || !shopInfo) return prev;

      const cost = Math.floor(shopInfo.baseCost * (city.population / 1000000 + 0.5));
      if (prev.budget < cost) return prev;

      const newBranch = { id: `${cityId}-${district}-${Date.now()}`, cityId, district, shopType, openedWeek: prev.week };

      let result: GameState = {
        ...prev,
        shopBranches: [...(prev.shopBranches || []), newBranch],
        budget: prev.budget - cost,
        news: [
          `🏪 ${city.name}/${district} şubesinde ${shopType === 'flagship' ? 'Flagship' : shopType === 'large' ? 'Mega' : shopType === 'medium' ? 'Standart' : 'Mini'} mağaza açıldı!`,
          ...prev.news.slice(0, 4)
        ]
      };
      if ((result.shopBranches?.length || 0) >= 3) {
        const a = result.achievements?.find(x => x.id === 'shop_king');
        if (a && !a.unlocked) {
          result = {
            ...result,
            budget: result.budget + (a.reward || 0),
            achievements: result.achievements.map(x =>
              x.id === 'shop_king' ? { ...x, unlocked: true, unlockedWeek: result.week } : x
            ),
            news: [`🏅 Başarım: ${a.title}!`, ...result.news.slice(0, 4)]
          };
        }
      }
      return result;
    });
  }, []);

  const unlockAchievement = useCallback((id: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const ach = prev.achievements?.find(a => a.id === id);
      if (!ach || ach.unlocked) return prev;
      const reward = ach.reward || 0;
      return {
        ...prev,
        budget: prev.budget + reward,
        achievements: prev.achievements.map(a => (a.id === id ? { ...a, unlocked: true, unlockedWeek: prev.week } : a)),
        news: [`🏅 Başarım açıldı: ${ach.title}! +$${reward.toLocaleString()}`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /* ══════════════ KARİYER: YETENEK, GÜNLÜK ÖDÜL, KADRO ══════════════ */
  /* ══════════════ STADYUM STÜDYOSU ══════════════ */

  /** Tasarım alanlarını (renk, çatı, tribün, çim, bayrak…) güncelle — kilit kontrolü ile */
  const setStadiumDesign = useCallback((patch: Partial<GameState['stadium']['design']>) => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? defaultStadium();
      const allowed = { ...patch };

      // Kilitli kozmetik kontrolü
      const roof = allowed.roof;
      if (roof && roof !== 'none' && !isUnlocked(stadium, `roof:${roof}`)) delete allowed.roof;
      const stands = allowed.stands;
      if (stands && stands !== 'classic' && !isUnlocked(stadium, `stands:${stands}`)) delete allowed.stands;
      const pattern = allowed.pitchPattern;
      if (pattern && !isUnlocked(stadium, `pitch:${pattern}`)) delete allowed.pitchPattern;
      if (allowed.flags === true && !isUnlocked(stadium, 'flags')) delete allowed.flags;
      if (allowed.logoOnPitch === true && !isUnlocked(stadium, 'logoPitch')) delete allowed.logoOnPitch;
      if (allowed.seatColor && !isColorUnlocked(stadium, allowed.seatColor)) delete allowed.seatColor;
      if (allowed.accentColor && !isColorUnlocked(stadium, allowed.accentColor)) delete allowed.accentColor;

      const design = { ...stadium.design, ...allowed };

      return {
        ...prev,
        stadium: { ...stadium, design, vip: design && (prev.stadium?.vip ?? false) }
      };
    });
  }, []);

  /** Kozmetik satın al (çatı, tribün tipi, bayrak, VIP, özel renk…) */
  const buyStadiumCosmetic = useCallback((cosmeticId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? defaultStadium();
      if (isUnlocked(stadium, cosmeticId)) return prev;

      const option = COSMETICS.find(c => c.id === cosmeticId);
      const premiumColor = PREMIUM_COLORS.find(c => c.id === cosmeticId);
      const price = option?.price ?? premiumColor?.price;
      if (price === undefined) return prev;
      if (prev.budget < price) return prev;

      let design = { ...stadium.design };
      let vip = stadium.vip;

      if (option) {
        if (option.field === 'roof') design.roof = option.value as GameState['stadium']['design']['roof'];
        else if (option.field === 'stands') design.stands = option.value as GameState['stadium']['design']['stands'];
        else if (option.field === 'pitchPattern') design.pitchPattern = option.value as GameState['stadium']['design']['pitchPattern'];
        else if (option.field === 'flags') design.flags = true;
        else if (option.field === 'logoOnPitch') design.logoOnPitch = true;
        else if (option.field === 'floodlights') design.floodlights = true;
        else if (option.field === 'vip') vip = true;
      }
      if (premiumColor) design.seatColor = premiumColor.hex;

      const love = option?.field === 'vip' ? 4 : option?.field === 'flags' ? 3 : option?.field === 'logoOnPitch' ? 2 : 0;

      return {
        ...prev,
        budget: prev.budget - price,
        fanHappiness: Math.min(100, prev.fanHappiness + love),
        stadium: {
          ...stadium,
          design,
          vip,
          cosmetics: [...(stadium.cosmetics || []), cosmeticId]
        },
        news: [
          `${option?.icon ?? '🎨'} ${option?.label ?? premiumColor?.label} satın alındı! ($${price.toLocaleString()}) — Stadyum sekmesinden görünümü incele.`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  /** Kapasite paketi satın al (ek koltuk) */
  const buyCapacityPackage = useCallback((packageId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? defaultStadium();
      const pack = CAPACITY_PACKAGES.find(p => p.id === packageId);
      if (!pack) return prev;
      const current = stadiumCapacity(prev);
      if (current >= MAX_CAPACITY) return prev;
      if (prev.budget < pack.price) return prev;

      const added = Math.min(pack.seats, MAX_CAPACITY - current);
      return {
        ...prev,
        budget: prev.budget - pack.price,
        stadium: { ...stadium, capacityBonus: stadium.capacityBonus + added },
        news: [
          `🏗️ Stadyuma ${added.toLocaleString()} koltuk eklendi! Yeni kapasite: ${(current + added).toLocaleString()}`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  /** Bilet fiyat stratejisi */
  const setTicketMultiplier = useCallback((multiplier: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? defaultStadium();
      const strategy = TICKET_STRATEGIES.find(t => t.multiplier === multiplier);
      if (!strategy) return prev;
      return {
        ...prev,
        stadium: { ...stadium, ticketMultiplier: multiplier },
        news: [`🎟️ Bilet fiyatları "${strategy.label}" olarak ayarlandı ($${ticketPriceFor(prev.stadiumLvl, multiplier)}/bilet).`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /** Stadyum seviyesini yükselt (tesis yükseltmesiyle aynı, kapasite +5.000) */
  const upgradeStadiumLevel = useCallback((cost: number) => {
    setGameState(prev => {
      if (!prev) return null;
      if (prev.budget < cost) return prev;
      if (stadiumCapacity(prev) >= MAX_CAPACITY) return prev;
      return {
        ...prev,
        budget: prev.budget - cost,
        stadiumLvl: prev.stadiumLvl + 1,
        fanHappiness: Math.min(100, prev.fanHappiness + 5),
        news: [
          `🏟️ Stadyum seviye ${prev.stadiumLvl + 1} oldu! Kapasite: ${stadiumCapacity({ stadiumLvl: prev.stadiumLvl + 1, stadium: prev.stadium }).toLocaleString()}`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  const upgradeTribune = useCallback((side: 'north'|'south'|'east'|'west') => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? { design: { seatColor: '#1d4ed8', accentColor: '#f8fafc', roof: 'none', stands: 'classic', pitchPattern: 'stripes', flags: false, logoOnPitch: false, floodlights: true }, capacityBonus: 0, ticketMultiplier: 1, vip: false, cosmetics: [], tribunes: { north: 1, south: 1, east: 1, west: 1 } } as any;
      const tribunes: any = stadium.tribunes || { north: 1, south: 1, east: 1, west: 1 };
      const lvl = tribunes[side] ?? 1;
      if (lvl >= 5) return prev;
      const baseSeats: Record<string, number> = { north: 2200, south: 2200, east: 3200, west: 3200 };
      const pricePerLevel: Record<string, number> = { north: 650000, south: 650000, east: 850000, west: 900000 };
      const cost = Math.round(pricePerLevel[side] * (0.9 + lvl*0.35)); // her seviye %35 pahalanır
      if (prev.budget < cost) return prev;
      const nextTribunes = { ...tribunes, [side]: lvl+1 };
      const addedSeats = baseSeats[side];
      return {
        ...prev,
        budget: prev.budget - cost,
        stadium: { ...stadium, tribunes: nextTribunes },
        fanHappiness: Math.min(100, (prev.fanHappiness||60)+2),
        news: [`🏗️ ${side==='north'?'Kuzey':side==='south'?'Güney':side==='east'?'Doğu':'Batı'} tribünü seviye ${lvl+1} oldu! +${addedSeats.toLocaleString()} koltuk`, ...prev.news.slice(0,4)],
      };
    });
  }, []);

  const upgradeStadiumFacility = useCallback((facilityId: import('../types/game').StadiumFacilityId) => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? defaultStadium();
      const facs = stadium.facilities ?? defaultFacilities();
      const lvl = (facs as any)[facilityId] ?? 0;
      if (lvl >= 5) return prev;
      const cost = stadiumFacilityUpgradeCost(facilityId, lvl);
      if (prev.budget < cost) return prev;
      const def = STADIUM_FACILITY_MAP[facilityId];
      const nextFacs = { ...facs, [facilityId]: lvl + 1 } as any;
      return {
        ...prev,
        budget: prev.budget - cost,
        fanHappiness: Math.min(100, (prev.fanHappiness||60) + (def?.happiness || 1)),
        stadium: { ...stadium, facilities: nextFacs },
        news: [`${def?.icon || '🏗️'} ${def?.name || facilityId} seviye ${lvl+1} oldu! ($${cost.toLocaleString()}) — ${def?.desc || ''}`, ...prev.news.slice(0,4)]
      };
    });
  }, []);

  /* ══════════ 🍔 BÜFE İŞLETMESİ ══════════
     Marka sponsorluğu (imza parası + maç başı prim + tabela), menü yatırımı ve
     fiyat politikası. Etkiler utils/stadium.ts üzerinden maç gelirine işler. */

  /** Marka ile büfe sponsorluğu imzala: imza parası peşin gelir, prim her iç saha maçında */
  const signBuffetSponsor = useCallback((brandId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const brand = BUFFET_SPONSOR_MAP[brandId];
      if (!brand) return prev;
      const stadium = prev.stadium ?? defaultStadium();
      const buffetLvl = stadium.facilities?.buffet ?? 0;
      if (buffetLvl < brand.minBuffetLevel) return prev;
      if ((prev.fanHappiness ?? 60) < brand.minFanHappiness) return prev;
      const buffet = normalizeBuffetState(stadium.buffet);
      return {
        ...prev,
        budget: prev.budget + brand.signingBonus,
        fanHappiness: Math.min(100, (prev.fanHappiness ?? 60) + Math.max(0, brand.happiness)),
        stadium: {
          ...stadium,
          buffet: {
            ...buffet,
            sponsorId: brand.id,
            sponsorWeeksLeft: brand.durationWeeks,
            sponsorEarned: buffet.sponsorEarned + brand.signingBonus,
          },
        },
        news: [
          `${brand.icon} ${brand.name} büfe sponsorluğu imzalandı! İmza parası $${brand.signingBonus.toLocaleString()} • ${brand.durationWeeks} hafta • maç başına +$${brand.perFan.toFixed(2)}/taraftar`,
          ...prev.news.slice(0, 4),
        ],
      };
    });
  }, []);

  /** Büfe sponsorluk sözleşmesini feshet (kalan haftaların cezası ödenir) */
  const cancelBuffetSponsor = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? defaultStadium();
      const buffet = normalizeBuffetState(stadium.buffet);
      const brand = buffet.sponsorId ? BUFFET_SPONSOR_MAP[buffet.sponsorId] : null;
      if (!brand || buffet.sponsorWeeksLeft <= 0) return prev;
      const fee = buffetBreakFee(brand, buffet.sponsorWeeksLeft);
      return {
        ...prev,
        budget: prev.budget - fee,
        stadium: { ...stadium, buffet: { ...buffet, sponsorId: null, sponsorWeeksLeft: 0 } },
        news: [`${brand.icon} ${brand.name} sözleşmesi feshedildi. Ceza: $${fee.toLocaleString()}`, ...prev.news.slice(0, 4)],
      };
    });
  }, []);

  /** Büfe menüsüne ürün ekle (ekipman yatırımı; büfe seviyesi yeterli olmalı) */
  const buyBuffetMenuItem = useCallback((itemId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const item = BUFFET_MENU_MAP[itemId];
      if (!item) return prev;
      const stadium = prev.stadium ?? defaultStadium();
      const buffetLvl = stadium.facilities?.buffet ?? 0;
      if (buffetLvl < item.minBuffetLevel) return prev;
      const buffet = normalizeBuffetState(stadium.buffet);
      if (buffet.menu.includes(item.id)) return prev;
      if (prev.budget < item.cost) return prev;
      return {
        ...prev,
        budget: prev.budget - item.cost,
        fanHappiness: Math.min(100, (prev.fanHappiness ?? 60) + item.happiness * 0.5),
        stadium: { ...stadium, buffet: { ...buffet, menu: [...buffet.menu, item.id] } },
        news: [
          `${item.icon} Büfe menüsüne ${item.name} eklendi! (+$${item.perFan.toFixed(2)}/taraftar, +${item.happiness} memnuniyet)`,
          ...prev.news.slice(0, 4),
        ],
      };
    });
  }, []);

  /** Büfe fiyat politikası (uygun / normal / premium) */
  const setBuffetPriceLevel = useCallback((level: BuffetPriceLevel) => {
    setGameState(prev => {
      if (!prev) return null;
      const stadium = prev.stadium ?? defaultStadium();
      const buffet = normalizeBuffetState(stadium.buffet);
      const tier = BUFFET_PRICE_MAP[level];
      if (!tier || buffet.priceLevel === level) return prev;
      return {
        ...prev,
        stadium: { ...stadium, buffet: { ...buffet, priceLevel: level } },
        news: [`${tier.icon} Büfe fiyat politikası: ${tier.label} (gelir ×${tier.incomeMult}, memnuniyet ${tier.happiness >= 0 ? '+' : ''}${tier.happiness})`, ...prev.news.slice(0, 4)],
      };
    });
  }, []);

  const hostStadiumEvent = useCallback((eventId: 'concert'|'fair') => {
    setGameState(prev => {
      if (!prev) return null;
      const income = eventId==='concert' ? 180000 : 90000;
      const moraleHit = eventId==='concert' ? -3 : 0;
      // Mild surprise only: small fan +/-
      return {
        ...prev,
        budget: prev.budget + income,
        stadium: { ...(prev.stadium||{} as any), lastEventIncome: income } as any,
        team11: prev.team11.map(p=> ({...p, morale: Math.max(0, p.morale + moraleHit)})),
        news: [eventId==='concert' ? `🎤 Stadyumda konser! +$${income.toLocaleString()} gelir, çim biraz yoruldu (-3 moral)` : `🏢 Stadyumda fuar! +$${income.toLocaleString()} risksiz gelir`, ...prev.news.slice(0,4)],
      };
    });
  }, []);

  const setTacticsSlider = useCallback((id: string, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    setGameState(prev => {
      if (!prev) return null;
      const tac: any = { ...prev.tactics, [id]: v };
      // tempoValue -> tempo string senkron (mild, ortalama)
      if (id==='tempoValue') {
        if (v < 33) tac.tempo = 'slow';
        else if (v > 66) tac.tempo = 'fast';
        else tac.tempo = 'normal';
      }
      if (id==='pressingIntensity') {
        if (v < 33) tac.pressing = 'low';
        else if (v > 66) tac.pressing = 'high';
        else tac.pressing = 'medium';
      }
      return { ...prev, tactics: tac };
    });
  }, []);

  /* ══════════════ MENAJER HAYATI ══════════════ */

  /** Aktiviteyi uygular: statlar, XP, masraf, haftalık hak ve geçmiş güncellenir */
  const doLifeActivity = useCallback((activityId: LifeActivityId, variantId: string) => {
    if (!gameState) return null;
    const outcome = computeOutcome(gameState, activityId, variantId);
    if (gameState.budget < outcome.cost) return null;

    const xpGain = grantXp(
      { managerXp: gameState.managerXp || 0, managerLevel: gameState.managerLevel || 1, skillPoints: gameState.skillPoints || 0 },
      outcome.xp
    );
    const activity = LIFE_ACTIVITIES_LOOKUP[activityId];

    setGameState(prev => {
      if (!prev) return null;
      const life = prev.life ?? defaultLife();
      return {
        ...prev,
        budget: prev.budget - outcome.cost,
        managerXp: xpGain.managerXp,
        managerLevel: xpGain.managerLevel,
        skillPoints: xpGain.skillPoints,
        life: {
          ...life,
          stats: outcome.stats,
          actionsUsed: life.actionsUsed + (activity?.slots ?? 1),
          weekLog: { ...(life.weekLog || {}), [activityId]: (life.weekLog?.[activityId] ?? 0) + 1 },
          history: [
            {
              week: prev.week,
              season: prev.season,
              activityId,
              label: activity ? `${activity.icon} ${activity.label}` : activityId,
              summary: outcome.summary,
            },
            ...(life.history || []),
          ].slice(0, 40),
        },
      };
    });

    return { summary: outcome.summary, xp: outcome.xp, cost: outcome.cost, fatigued: outcome.fatigued };
  }, [gameState]);

  /** Kişisel eşya satın al (spor salonu üyeliği, konsol, araba, ev konforu) */
  const buyLifeItem = useCallback((itemId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const item = LIFE_ITEMS.find(i => i.id === itemId);
      if (!item) return prev;
      const life = prev.life ?? defaultLife();
      if (life.owned.includes(itemId)) return prev;
      if (prev.budget < item.price) return prev;
      return {
        ...prev,
        budget: prev.budget - item.price,
        life: { ...life, owned: [...life.owned, itemId] },
        news: [
          `${item.icon} ${item.label} satın alındı! ($${item.price.toLocaleString()}) — ${item.perk}. Hayat sekmesinden kullanabilirsin.`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  /** Menajer görünümünü güncelle (ten/saç/kıyafet) */
  const updateLifeAppearance = useCallback((patch: Partial<import('../types/game').ManagerAppearance>) => {
    setGameState(prev => {
      if (!prev) return null;
      const life = prev.life ?? defaultLife();
      return {
        ...prev,
        life: { ...life, appearance: { ...(life.appearance ?? { skin: '#e8b48a', hair: '#2b1d15', outfit: 'club' as const }), ...patch } }
      };
    });
  }, []);

  /** Düşük performans modu (gölge kapatma) */
  const setLifeLowPerf = useCallback((value: boolean) => {
    setGameState(prev => {
      if (!prev) return null;
      const life = prev.life ?? defaultLife();
      return { ...prev, life: { ...life, lowPerf: value } };
    });
  }, []);

  const spendSkillPoint = useCallback((skillId: SkillId) => {
    setGameState(prev => {
      if (!prev || (prev.skillPoints || 0) <= 0) return prev;
      const current = prev.skills?.[skillId] ?? 0;
      if (current >= 5) return prev;
      const info = SKILLS.find(sk => sk.id === skillId);
      return {
        ...prev,
        skillPoints: prev.skillPoints - 1,
        skills: { ...(prev.skills || emptySkillTree()), [skillId]: current + 1 },
        news: [
          `🧠 ${info?.icon || ''} ${info?.name || 'Yetenek'} ${current + 1}. seviyeye çıktı! (${info?.effectPerLevel})`,
          ...prev.news.slice(0, 4)
        ]
      };
    });
  }, []);

  /** Günlük giriş ödülü — günde bir kez, seri arttıkça büyür */
  const claimDailyReward = useCallback((): { day: number; budget: number; tokens: number } | null => {
    if (!gameState) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (gameState.lastPlayedDate === today) return null;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = gameState.lastPlayedDate === yesterday ? (gameState.loginStreak || 0) + 1 : 1;
    const table = [
      { budget: 40000, tokens: 0 },
      { budget: 60000, tokens: 0 },
      { budget: 90000, tokens: 1 },
      { budget: 120000, tokens: 1 },
      { budget: 180000, tokens: 1 },
      { budget: 250000, tokens: 2 },
      { budget: 400000, tokens: 3 }
    ];
    const reward = table[Math.min(streak, table.length) - 1];
    const xpGain = grantXp(
      { managerXp: gameState.managerXp || 0, managerLevel: gameState.managerLevel || 1, skillPoints: gameState.skillPoints || 0 },
      25
    );

    setGameState(prev => prev ? {
      ...prev,
      lastPlayedDate: today,
      loginStreak: streak,
      budget: prev.budget + reward.budget,
      minigameTokens: (prev.minigameTokens || 0) + reward.tokens,
      managerXp: xpGain.managerXp,
      managerLevel: xpGain.managerLevel,
      skillPoints: xpGain.skillPoints,
      lastDailyReward: { day: streak, budget: reward.budget, tokens: reward.tokens },
      news: [
        `🎁 Günlük giriş ödülü (${streak}. gün): +$${reward.budget.toLocaleString()}${reward.tokens ? ` +${reward.tokens} jeton` : ''}`,
        ...prev.news.slice(0, 4)
      ]
    } : null);

    return { day: streak, budget: reward.budget, tokens: reward.tokens };
  }, [gameState]);

  const dismissDailyReward = useCallback(() => {
    setGameState(prev => prev ? { ...prev, lastDailyReward: null } : null);
  }, []);

  /** En iyi 11'i form + enerji + OVR'a göre otomatik seçer */
  const autoPickBestEleven = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      const formation = FORMATIONS[prev.tactics.formation] || FORMATIONS['4-3-3'];
      const pool = [...prev.team11, ...prev.bench].filter(p => !p.injured && (p.suspension ?? 0) === 0);
      if (pool.length < 11) return prev;

      const poolAvgPick = pool.reduce((a, p) => a + p.ovr, 0) / Math.max(1, pool.length);
      const score = (p: Player) => effectiveOvr(p, poolAvgPick, prev.teamChemistry ?? 55) * 2 + (p.form ?? 5) * 1.6 + p.energy * 0.15 + p.morale * 0.05;
      const used = new Set<number>();
      const chosen: Player[] = [];

      formation.forEach(slot => {
        const ideal = pool.filter(p => !used.has(p.id) && p.role === slot.r).sort((a, b) => score(b) - score(a))[0];
        const pick = ideal || pool.filter(p => !used.has(p.id)).sort((a, b) => score(b) - score(a))[0];
        if (pick) {
          used.add(pick.id);
          chosen.push({ ...pick, t: slot.t, l: slot.l, role: slot.r as Player['role'] });
        }
      });

      if (chosen.length < 11) return prev;
      const bench = pool
        .filter(p => !used.has(p.id))
        .map(p => ({ ...p, t: undefined, l: undefined }));

      return {
        ...prev,
        team11: chosen,
        bench,
        news: ['🧠 En iyi 11 otomatik seçildi (form + enerji + OVR).', ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  /* ══════════════ SOSYAL MEDYA (FutbolX) ══════════════ */
  const addSocialPost = useCallback((content: string, image?: string, platform: string = 'instagram') => {
    if (!content || content.trim().length < 3) return;
    const safePlatform: any = (platform === 'tiktok' || platform === 'youtube' || platform === 'instagram') ? platform : 'instagram';
    setGameState(prev => {
      if (!prev) return null;
      const trimmed = content.slice(0, 280);
      const handle = `@${prev.teamName.toLowerCase().replace(/\s+/g,'')}`;
      const low = trimmed.toLowerCase();
      let bonusFame = 1;
      let bonusFan = 1;
      let tags: string[] = ['#SüperLig'];
      // Cihaz kalitesi — platforma göre ağırlık değişir, ama hep mild
      const activeDev: any = (prev.devices||[]).find((d:any)=> d.id===prev.activeDeviceId) || (prev.devices||[])[0];
      const devQuality = activeDev?.quality ?? 42;
      const devCamera = activeDev?.camera ?? 45;
      const devPerf = activeDev?.performance ?? 40;
      const devBonus = Math.round((devQuality - 42) / 12); // 0..4
      // platform ağırlığı: instagram kamera, tiktok perf, youtube ikisi
      let platformBonus = 0;
      if (safePlatform === 'instagram') platformBonus = Math.round(devCamera * 0.9 + devBonus*70);
      else if (safePlatform === 'tiktok') platformBonus = Math.round(devPerf * 1.1 + devBonus*85);
      else platformBonus = Math.round((devCamera + devPerf)/2 * 1.0 + devBonus*95 + devQuality);
      if (low.includes('transfer')) { tags.push('#Transfer'); bonusFame+=1; }
      if (low.includes('#maç')||low.includes('maç')||low.includes('galib')) { tags.push('#MaçGünü'); bonusFan+=1; }
      if (safePlatform === 'tiktok') tags.push('#keşfet');
      if (safePlatform === 'youtube') tags.push('#YouTube');
      const baseLikes = safePlatform==='youtube' ? 420 : safePlatform==='tiktok' ? 380 : 340;
      const viewsMult = safePlatform==='youtube' ? 28 : safePlatform==='tiktok' ? 35 : 18;
      const likesVal = Math.floor(baseLikes + Math.random()*900 + (prev.life?.stats.fame||40)*10 + platformBonus);
      const post: any = {
        id: `user-${Date.now()}`,
        author: prev.teamName,
        handle,
        logo: prev.teamLogo,
        content: trimmed,
        type: 'user',
        week: prev.week,
        season: prev.season,
        likes: likesVal,
        retweets: Math.floor(30 + Math.random()*200),
        comments: Math.floor(Math.random()*18),
        liked: false,
        isUser: true,
        verified: true,
        tags,
        timeAgo: 'şimdi',
        image: image || undefined,
        platform: safePlatform,
        views: Math.floor(likesVal * (viewsMult/10) + Math.random()*5000),
        videoId: safePlatform==='youtube' ? 'pRpeEdMmmQ0' : undefined
      };
      const life = prev.life ?? defaultLife();
      // ── Sosyal gelir: platforma göre RPM ──
      const rpm = safePlatform==='youtube' ? 0.52 : safePlatform==='tiktok' ? 0.31 : 0.24; // $ per 1k views + like bonus
      const viewRev = Math.floor((post.views||0) * rpm * (0.9 + devQuality/220));
      const likeRev = Math.floor(post.likes * (safePlatform==='youtube' ? 2.1 : safePlatform==='tiktok' ? 1.4 : 1.1) * (0.8 + devBonus*0.15));
      const fameMult = 1 + (prev.life?.stats.fame||40)/180;
      const income = Math.floor((viewRev + likeRev) * fameMult);
      // marka eşiği: 20k+ takipçide %15 bonus
      const followersEst = 18400 + ((prev.life?.stats.fame||40)*620) + ((prev.fanHappiness||60)*240) + (prev.week*420);
      const brandBonus = followersEst > 40000 ? Math.floor(income*0.18) : followersEst > 25000 ? Math.floor(income*0.08) : 0;
      const totalIncome = income + brandBonus;
      return {
        ...prev,
        socialFeed: [post, ...((prev as any).socialFeed||[])].slice(0, 80),
        budget: prev.budget + totalIncome,
        lifetimeSocialEarnings: ((prev as any).lifetimeSocialEarnings||0) + totalIncome,
        weeklySocialEarnings: ((prev as any).weeklySocialEarnings||0) + totalIncome,
        clubStats: { ...prev.clubStats, socialEarnings: ((prev.clubStats as any).socialEarnings||0) + totalIncome },
        fanHappiness: Math.min(100, (prev.fanHappiness||60)+bonusFan),
        boardConfidence: Math.min(100, (prev.boardConfidence||50)+0.5),
        life: { ...life, stats: { ...life.stats, fame: Math.min(100, life.stats.fame + bonusFame) } },
        news: [`💸 Sosyal gelir: +$${totalIncome.toLocaleString()} (${safePlatform} • ${post.views?.toLocaleString()} izlenme, ${post.likes.toLocaleString()} beğeni${brandBonus?` + marka $${brandBonus.toLocaleString()}`:''}) — "${trimmed.slice(0,32)}..."`, ...prev.news.slice(0,4)]
      };
    });
  }, []);
  const likeSocialPost = useCallback((postId: string) => {
    setGameState(prev => {
      if (!prev) return null;
      const feed = ((prev as any).socialFeed || []) as any[];
      const idx = feed.findIndex((p:any)=>p.id===postId);
      if (idx===-1) return prev;
      const p = feed[idx];
      const liked = !p.liked;
      const patched = { ...p, liked, likes: p.likes + (liked?1:-1) };
      const nextFeed = [...feed];
      nextFeed[idx]=patched;
      void (prev.life ?? defaultLife());
      if (liked && p.isUser) {
        // self like ignore
      } else if (liked) {
        // no change
      }
      return { ...prev, socialFeed: nextFeed } as any;
    });
  }, []);
  const commentOnPost = useCallback((postId: string, comment: string) => {
    if (!comment || comment.trim().length<2) return;
    setGameState(prev => {
      if (!prev) return null;
      const feed = ((prev as any).socialFeed || []) as any[];
      const next = feed.map((p:any)=> p.id===postId ? { ...p, comments: (p.comments||0)+1 } : p);
      return { ...prev, socialFeed: next, fanHappiness: Math.min(100,(prev.fanHappiness||60)+0.4) } as any;
    });
  }, []);

  const completeTutorial = useCallback(() => {
    setGameState(prev => (prev ? { ...prev, tutorialDone: true } : null));
  }, []);

  const applyMinigameReward = useCallback((reward: {
    budget?: number;
    morale?: number;
    energy?: number;
    tokens?: number;
    penaltiesScored?: number;
    minigamesWon?: number;
    news?: string;
    lastSpinWeek?: number;
  }) => {
    setGameState(prev => {
      if (!prev) return null;
      let next: GameState = {
        ...prev,
        budget: prev.budget + (reward.budget || 0),
        minigameTokens: Math.max(0, prev.minigameTokens + (reward.tokens || 0)),
        lastSpinWeek: reward.lastSpinWeek ?? prev.lastSpinWeek,
        clubStats: {
          ...prev.clubStats,
          penaltiesScored: (prev.clubStats.penaltiesScored || 0) + (reward.penaltiesScored || 0),
          minigamesWon: (prev.clubStats.minigamesWon || 0) + (reward.minigamesWon || 0)
        }
      };
      if (reward.morale) {
        next.team11 = next.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + reward.morale!) }));
        next.bench = next.bench.map(p => ({ ...p, morale: Math.min(100, p.morale + reward.morale!) }));
      }
      if (reward.energy) {
        next.team11 = next.team11.map(p => ({ ...p, energy: Math.min(100, p.energy + reward.energy!) }));
        next.bench = next.bench.map(p => ({ ...p, energy: Math.min(100, p.energy + reward.energy!) }));
      }
      if (reward.news) next.news = [reward.news, ...next.news.slice(0, 4)];

      if ((next.clubStats.minigamesWon || 0) >= 10) {
        const a = next.achievements.find(x => x.id === 'minigame_master');
        if (a && !a.unlocked) {
          next = {
            ...next,
            budget: next.budget + (a.reward || 0),
            achievements: next.achievements.map(x =>
              x.id === 'minigame_master' ? { ...x, unlocked: true, unlockedWeek: next.week } : x
            ),
            news: ['🏅 Başarım: Mini Oyun Ustası!', ...next.news.slice(0, 4)]
          };
        }
      }
      if ((next.clubStats.penaltiesScored || 0) >= 5) {
        const a = next.achievements.find(x => x.id === 'penalty_king');
        if (a && !a.unlocked) {
          next = {
            ...next,
            budget: next.budget + (a.reward || 0),
            achievements: next.achievements.map(x =>
              x.id === 'penalty_king' ? { ...x, unlocked: true, unlockedWeek: next.week } : x
            )
          };
        }
      }
      return next;
    });
  }, []);

  return {
    gameState,
    isLoading,
    initializeGame,
    updateGameState,
    setGameStateExternal,
    updatePlayer,
    swapPlayers,
    sellPlayer,
    buyPlayer,
    renewContract,
    setCaptain,
    setSetPieceTaker,
    setTrainingFocus,
    toggleSound,
    dismissBoardMessage,
    acceptTransferOffer,
    rejectTransferOffer,
    saveGame,
    loadGame,
    resetCareer,
    refreshMarket,
    applyFormation,
    updateTactics,
    applyFixedLineup,
    processMatchResult,
    hireStaff,
    upgradeFacility,
    upgradeFacilityModule,
    discoverYouthPlayer,
    promoteYouthPlayer,
    buyInvestment,
    sellInvestment,
    takeCredit,
    repayCreditEarly,
    setClubPhilosophy,
    generateUltrasRequests,
    completeUltrasRequest,
    dismissUltrasRequest,
    generatePressConference,
    answerPressQuestion,
    dismissPress,
    sendScout,
    claimScoutReport,
    dismissScoutReport,
    cancelScoutMission,
    trainPlayer,
    openShopBranch,
    unlockAchievement,
    completeTutorial,
    applyMinigameReward,
    spendSkillPoint,
    claimDailyReward,
    dismissDailyReward,
    autoPickBestEleven,
    doLifeActivity,
    buyLifeItem,
    updateLifeAppearance,
    setLifeLowPerf,
    setStadiumDesign,
    buyStadiumCosmetic,
    buyCapacityPackage,
    setTicketMultiplier,
    upgradeStadiumLevel,
    upgradeTribune,
    upgradeStadiumFacility,
    signBuffetSponsor,
    cancelBuffetSponsor,
    buyBuffetMenuItem,
    setBuffetPriceLevel,
    hostStadiumEvent,
    setTacticsSlider,
    buyDevice,
    setActiveDevice,
    sellDevice,
    buyPCComponent,
    setPCPart,
    sellPCComponent,
    assemblePC,
    refreshLoanList,
    takeLoan,
    exerciseLoanOption,
    returnLoanEarly,
    sendOnLoan,
    recallLoan,
    addSocialPost,
    likeSocialPost,
    commentOnPost
  };
};

