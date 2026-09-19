import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { SetupScreen } from './components/SetupScreen';
import { Sidebar } from './components/Sidebar';
import { SquadTab } from './components/tabs/SquadTab';
import { TransferTab } from './components/tabs/TransferTab';
import { TacticsTab } from './components/tabs/TacticsTab';
import { LeagueTab } from './components/tabs/LeagueTab';
import { InvestTab } from './components/tabs/InvestTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { CupTab } from './components/tabs/CupTab';
import { TrainingTab } from './components/tabs/TrainingTab';
import { ShopTab } from './components/tabs/ShopTab';
import { MerchTab } from './components/tabs/MerchTab';
import { OfficeTab } from './components/tabs/OfficeTab';
import { CareerTab } from './components/tabs/CareerTab';
import { StadiumTab } from './components/tabs/StadiumTab';
import { LifeTab } from './components/tabs/LifeTab';
import { SocialTab } from './components/tabs/SocialTab';
import { TechTab } from './components/tabs/TechTab';
import { DailyRewardModal } from './components/DailyRewardModal';
import { MatchEngine, MatchExtras } from './components/MatchEngine';
import { PreMatchScreen } from './components/PreMatchScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { NewsTicker } from './components/NewsTicker';
import { PostMatchEvent, PostMatchEventData, generatePostMatchEvent } from './components/PostMatchEvent';
import { TeamActivityEvent, shouldTriggerTeamActivity } from './components/TeamActivityEvent';
import { Tutorial } from './components/Tutorial';
import AiAssistant from './components/AiAssistant';
import { PressConference } from './components/PressConference';
import {
  InGameMinigame,
  MinigameContext,
  MinigameResult,
  pickStoryMinigame,
  applyMinigameToState
} from './components/InGameMinigames';
import { Difficulty, FixtureEntry, Player, Sponsor, TrainingFocus, SkillId } from './types/game';
import { BOT_NAMES_BY_LEVEL, FORMATIONS } from './data/constants';
import { calculateAttendance, generateFixture } from './utils/fixture';
import { assignKeyPlayers, applyLoanGrowth, generateLoanList } from './utils/loan';
import { playerValue } from './utils/pricing';
import { demandFactor, weatherShield, starAttendanceFactor } from './utils/stadium';
import { StadiumDesign } from './types/game';
import { createSeasonMissions, createWeeklyMissions } from './utils/missions';
import { exportSaveToFile, importSaveFromFile, writeSlot, clearSlot } from './utils/save';
import { randomCountry } from './data/countries';
import { sfx, setSoundEnabled, primeAudio } from './utils/sound';

type TabId =
  | 'office' | 'social' | 'career' | 'life' | 'stadium' | 'squad' | 'transfer' | 'tactics' | 'training' | 'league'
  | 'cup' | 'shop' | 'merch' | 'invest' | 'history' | 'tech';

interface TabDef { id: TabId; label: string; icon: string; badge?: number }

interface SeasonSummary {
  season: number;
  position: number;
  champion: boolean;
  promoted: boolean;
  relegated: boolean;
  prize: number;
  objectiveMet: boolean;
  objective: string;
  topScorer?: { name: string; goals: number };
  departed: string[];
}

function OfflineGame({ onExit }: { onExit: () => void }) {
  const {
    gameState,
    initializeGame,
    loadGame,
    saveGame,
    updateGameState,
    swapPlayers,
    sellPlayer,
    updatePlayer,
    buyPlayer,
    renewContract,
    setCaptain,
    setSetPieceTaker,
    setTrainingFocus,
    toggleSound,
    dismissBoardMessage,
    acceptTransferOffer,
    rejectTransferOffer,
    refreshMarket,
    applyFormation,
    updateTactics,
    applyFixedLineup,
    processMatchResult,
    hireStaff,
    upgradeFacilityModule,
    discoverYouthPlayer,
    promoteYouthPlayer,
    buyInvestment,
    sellInvestment,
    takeCredit,
    repayCreditEarly,
    setClubPhilosophy,
    generatePressConference,
    answerPressQuestion,
    dismissPress,
    generateUltrasRequests,
    completeUltrasRequest,
    dismissUltrasRequest,
    sendScout,
    claimScoutReport,
    dismissScoutReport,
    cancelScoutMission,
    trainPlayer,
    openShopBranch,
    completeTutorial,
    resetCareer,
    setGameStateExternal,
    spendSkillPoint,
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
    hostStadiumEvent,
    // ⚠️ Stadyum iç tesisleri (büfe, mağaza, otopark…): bu satır eksikti,
    // bu yüzden "Seviye Yükselt" tuşları hiçbir şey yapmıyordu.
    upgradeStadiumFacility,
    signBuffetSponsor,
    cancelBuffetSponsor,
    buyBuffetMenuItem,
    setBuffetPriceLevel,
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
    claimDailyReward,
    dismissDailyReward,
    autoPickBestEleven,
    addSocialPost,
    likeSocialPost,
    commentOnPost
  } = useGameState();

  const [activeTab, setActiveTab] = useState<TabId>('office');
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [isCupMatch, setIsCupMatch] = useState(false);
  const [showPreMatch, setShowPreMatch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [postMatchEvent, setPostMatchEvent] = useState<PostMatchEventData | null>(null);
  const [showTeamActivity, setShowTeamActivity] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [storyMinigame, setStoryMinigame] = useState<MinigameContext | null>(null);
  const [pendingMatchAfterStory, setPendingMatchAfterStory] = useState(false);
  const [seasonSummary, setSeasonSummary] = useState<SeasonSummary | null>(null);
  const [seasonHandled, setSeasonHandled] = useState<number | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsScrollFade, setTabsScrollFade] = useState({ left: false, right: false });

  // Leaving this mode (including browser Back) must not lose the offline club.
  const latestCareer = useRef(gameState);
  latestCareer.current = gameState;
  useEffect(() => () => {
    if (latestCareer.current) writeSlot(0, latestCareer.current);
  }, []);
  const exitOffline = () => {
    if (isMatchActive && !window.confirm('Devam eden kariyer maçı tamamlanmadan çıkılacak. Maç öncesi kariyerin kaydedilir. Mod seçimine dönmek istiyor musun?')) return;
    onExit();
  };

  // Show tutorial for new games
  useEffect(() => {
    if (gameState && !gameState.tutorialDone) setShowTutorial(true);
  }, [gameState?.tutorialDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save after every week
  useEffect(() => {
    if (gameState) saveGame(0);
  }, [gameState?.week]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sound preference
  useEffect(() => {
    setSoundEnabled(gameState?.soundOn !== false);
  }, [gameState?.soundOn]);

  // Günlük giriş ödülü (günde bir)
  useEffect(() => {
    if (!gameState) return;
    const today = new Date().toISOString().slice(0, 10);
    if (gameState.lastPlayedDate === today) return;
    const reward = claimDailyReward();
    if (reward) setTimeout(() => sfx.levelUp(), 300);
  }, [gameState?.lastPlayedDate, gameState?.teamName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sekme değişince aktif sekmeyi ortaya kaydır + fade hesapla
  const updateTabsFade = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const next = {
      left: scrollLeft > 8,
      right: scrollLeft + clientWidth < scrollWidth - 8
    };
    // ⚠️ Değer değişmediyse state'i güncelleme: bu fonksiyon 800 ms'de bir çalışıyor,
    // her çağrıda yeni nesne yazmak tüm oyunu (maç sahnesi dahil) gereksiz yeniden
    // çiziyor ve maç sırasında mikro takılmalar yaratıyordu.
    setTabsScrollFade(prev => (prev.left === next.left && prev.right === next.right ? prev : next));
  }, []);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    // aktif sekmeyi görünür yap
    const activeBtn = el.querySelector(`[data-tab=\"${activeTab}\"]`) as HTMLElement | null;
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    updateTabsFade();
  }, [activeTab, updateTabsFade]);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const onScroll = () => updateTabsFade();
    const onResize = () => updateTabsFade();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // ilk ölçüm
    requestAnimationFrame(updateTabsFade);
    const id = setInterval(updateTabsFade, 800);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); clearInterval(id); };
  }, [updateTabsFade]);

  // Hafta ilerledikçe menajer XP'si (maç içi XP zaten ekleniyor)
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  const handleStart = useCallback((teamName: string, teamLogo: string, difficulty: Difficulty) => {
    primeAudio();
    initializeGame(teamName, teamLogo, difficulty);
  }, [initializeGame]);

  const handleLoad = useCallback(() => loadGame(0), [loadGame]);

  const handleSave = useCallback(() => {
    saveGame(0);
    showToast('Oyun kaydedildi! 💾');
  }, [saveGame, showToast]);

  const handleSignSponsor = useCallback((sponsor: Sponsor) => {
    if (gameState) {
      updateGameState({
        activeSponsor: { ...sponsor, weeksLeft: sponsor.duration },
        budget: gameState.budget + sponsor.income,
        news: [`${sponsor.name} ile sponsorluk anlaşması imzalandı!`, ...gameState.news.slice(0, 4)]
      });
    }
  }, [gameState, updateGameState]);

  /* ══════════ MAÇ ÖNCESİ ══════════ */
  const handlePlayMatch = useCallback(() => {
    if (!gameState || gameState.week > 18) return;
    primeAudio();
    const changes = applyFixedLineup();
    if (changes.length > 0) showToast(`🔄 Kadro düzeltildi: ${changes.length} değişiklik`);
    setIsCupMatch(false);
    setShowPreMatch(true);
  }, [gameState, applyFixedLineup, showToast]);

  const handlePlayCupMatch = useCallback(() => {
    if (!gameState || gameState.cupEliminated) return;
    primeAudio();
    const changes = applyFixedLineup();
    if (changes.length > 0) showToast(`🔄 Kadro düzeltildi: ${changes.length} değişiklik`);
    setIsCupMatch(true);
    setShowPreMatch(true);
  }, [gameState, applyFixedLineup, showToast]);

  const beginMatch = useCallback((withStory: boolean) => {
    setShowPreMatch(false);
    const opponent = isCupMatch
      ? gameState?.cupMatches.find(m => !m.played)?.opponent
      : gameState?.fixture[gameState.week - 1];

    if (withStory && opponent) {
      setPendingMatchAfterStory(true);
      setStoryMinigame({
        type: 'bus',
        title: 'Stadyuma Yolculuk',
        description: `${opponent.name} maçı öncesi otobüsle stadyuma!`,
        opponentName: opponent.name
      });
    } else {
      setIsMatchActive(true);
    }
  }, [isCupMatch, gameState]);

  const currentOpponent = gameState
    ? (isCupMatch
        ? gameState.cupMatches.find(m => !m.played)?.opponent
        : gameState.fixture[gameState.week - 1])
    : undefined;

  const currentFixture: FixtureEntry | undefined = gameState
    ? (isCupMatch ? undefined : gameState.fixture[gameState.week - 1])
    : undefined;

  /* ══════════ MAÇ SONU ══════════ */
  const handleMatchEnd = useCallback((
    userScore: number,
    oppScore: number,
    scorers: { playerId: number; goals: number; assists: number }[],
    extras: MatchExtras
  ) => {
    if (!gameState) return;

    scorers.forEach(({ playerId, goals, assists }) => {
      const inTeam = gameState.team11.find(p => p.id === playerId);
      const inBench = gameState.bench.find(p => p.id === playerId);
      if (inTeam) updatePlayer(playerId, { goals: inTeam.goals + goals, assists: inTeam.assists + assists }, false);
      else if (inBench) updatePlayer(playerId, { goals: inBench.goals + goals, assists: inBench.assists + assists }, true);
    });

    const isHome = isCupMatch ? Math.random() < 0.5 : (currentFixture?.isHome ?? true);
    const sortedLeague = [...gameState.league].sort((a, b) => b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga));
    const leaguePosition = sortedLeague.findIndex(t => t.isUser) + 1;
    const opponent = currentOpponent;
    const attendance = opponent
      ? calculateAttendance({
          stadiumLvl: gameState.stadiumLvl,
          leaguePosition,
          fanHappiness: gameState.fanHappiness || 60,
          opponentOvr: opponent.ovr,
          isHome,
          weather: gameState.weather,
          isCup: isCupMatch,
          capacityBonus: gameState.stadium?.capacityBonus ?? 0,
          demandFactor: demandFactor(gameState.stadium?.ticketMultiplier ?? 1),
          weatherShield: weatherShield(gameState.stadium?.design ?? ({} as StadiumDesign), gameState.weather),
          starFactor: starAttendanceFactor(gameState)
        })
      : 0;

    const userWon = userScore > oppScore || extras.penaltyWinner === 'user';
    const isDraw = userScore === oppScore && !extras.penaltyWinner;

    if (isCupMatch) {
      const currentCupRound = gameState.cupMatches.findIndex(m => !m.played);
      if (currentCupRound !== -1) {
        const updatedCupMatches = [...gameState.cupMatches];
        updatedCupMatches[currentCupRound] = {
          ...updatedCupMatches[currentCupRound],
          played: true,
          userScore,
          oppScore,
          penaltyWinner: extras.penaltyWinner
        };

        const prize = (currentCupRound + 1) * 150000;
        let achievements = [...(gameState.achievements || [])];
        let extraBudget = 0;
        const extraNews: string[] = [];

        const unlockCup = (id: string) => {
          const a = achievements.find(x => x.id === id);
          if (a && !a.unlocked) {
            achievements = achievements.map(x =>
              x.id === id ? { ...x, unlocked: true, unlockedWeek: gameState.week } : x
            );
            extraBudget += a.reward || 0;
            extraNews.push(`🏅 Başarım: ${a.title}! +$${(a.reward || 0).toLocaleString()}`);
          }
        };
        if (userWon && currentCupRound >= 2) unlockCup('cup_final');
        if (userWon && currentCupRound === 3) {
          unlockCup('cup_win');
          if (gameState.clubStats.leagueTitles > 0) unlockCup('double');
        }

        updateGameState({
          cupMatches: updatedCupMatches,
          cupEliminated: !userWon,
          budget: gameState.budget + (userWon ? prize : Math.floor(prize / 3)) + extraBudget,
          achievements,
          minigameTokens: userWon ? (gameState.minigameTokens || 0) + 1 : gameState.minigameTokens,
          clubStats: userWon && currentCupRound === 3
            ? { ...gameState.clubStats, cupWins: gameState.clubStats.cupWins + 1 }
            : gameState.clubStats,
          trophies: userWon && currentCupRound === 3 ? [...gameState.trophies, '🏅'] : gameState.trophies,
          team11: extras.teamTalkMorale
            ? gameState.team11.map(p => ({ ...p, morale: Math.max(0, Math.min(100, p.morale + extras.teamTalkMorale)) }))
            : gameState.team11,
          news: [
            userWon
              ? `🏅 Kupa: ${userScore}-${oppScore}${extras.penaltyWinner ? ' (penaltılar)' : ''} kazandınız! Ödül: $${prize.toLocaleString()}`
              : `Kupa maçında elendiniz (${userScore}-${oppScore}${extras.penaltyWinner ? ', penaltılar' : ''}).`,
            ...extraNews,
            ...gameState.news.slice(0, 4)
          ]
        });
      }
    } else if (opponent) {
      processMatchResult(userScore, oppScore, opponent, {
        isCup: false,
        isHome,
        weather: gameState.weather,
        attendance,
        motmPlayerId: extras.motmPlayerId,
        cards: extras.cards,
        injuries: extras.injuries,
        ratings: extras.ratings,
        penaltyWinner: extras.penaltyWinner,
        teamTalkMorale: extras.teamTalkMorale
      });
    }

    setIsMatchActive(false);
    setIsCupMatch(false);
    setShowPreMatch(false);

    // Basın toplantısı — her lig maçı sonrası (kupa dahil) drama modunda
    const wasWinPress = userWon && !isDraw;
    if (opponent && !isCupMatch) {
      setTimeout(() => generatePressConference(opponent.name, wasWinPress, isDraw), 500);
    } else if (opponent && isCupMatch) {
      setTimeout(() => generatePressConference(opponent.name, wasWinPress, isDraw), 600);
    }

    // Maç sonu hikâye mini oyunu / olay (sezonun son maçında gösterilmez) — basın sonrası gecikmeli
    const wasWin = userWon && !isDraw;
    if (opponent && (isCupMatch || gameState.week < 18)) {
      const story = pickStoryMinigame(gameState, wasWin, opponent.name);
      if (story) {
        setTimeout(() => setStoryMinigame(story), 700);
      } else if (shouldTriggerTeamActivity()) {
        setTimeout(() => setShowTeamActivity(true), 800);
      } else {
        const event = generatePostMatchEvent(gameState, wasWin);
        if (event) setTimeout(() => setPostMatchEvent(event), 800);
      }
    }

    setTimeout(() => saveGame(0), 1200);
  }, [
    gameState, isCupMatch, updatePlayer, processMatchResult, updateGameState,
    currentOpponent, currentFixture, saveGame, generatePressConference
  ]);

  const handleStoryMinigameComplete = useCallback((result: MinigameResult) => {
    if (!gameState) return;
    const ctx = storyMinigame;
    const updates = applyMinigameToState(gameState, result, {
      weakenOpponent: ctx?.type === 'sabotage' && result.success ? ctx.opponentName : undefined
    });
    updateGameState(updates);
    setStoryMinigame(null);

    if (pendingMatchAfterStory) {
      setPendingMatchAfterStory(false);
      setTimeout(() => setIsMatchActive(true), 400);
      return;
    }
    showToast(result.success ? `✅ ${result.news}` : `⚠️ ${result.news}`);
  }, [gameState, storyMinigame, pendingMatchAfterStory, updateGameState, showToast]);

  const handlePostMatchChoice = useCallback((updates: Partial<typeof gameState>, _choiceText: string) => {
    if (updates && gameState) updateGameState(updates as Parameters<typeof updateGameState>[0]);
    setPostMatchEvent(null);
  }, [gameState, updateGameState]);

  const handleTeamActivityAccept = useCallback((
    _activity: unknown,
    _selectedItems: unknown[],
    totalCost: number,
    effects: { morale: number; energy: number }
  ) => {
    if (!gameState) return;
    updateGameState({
      budget: gameState.budget - totalCost,
      teamChemistry: Math.min(100, (gameState.teamChemistry || 55) + 8),
      team11: gameState.team11.map(p => ({
        ...p,
        morale: Math.min(100, p.morale + effects.morale),
        energy: Math.min(100, Math.max(0, p.energy + effects.energy))
      })),
      bench: gameState.bench.map(p => ({
        ...p,
        morale: Math.min(100, p.morale + effects.morale),
        energy: Math.min(100, Math.max(0, p.energy + effects.energy))
      })),
      news: ['Takımla birlikte harika vakit geçirildi! 🎉', ...gameState.news.slice(0, 4)]
    });
    setShowTeamActivity(false);
  }, [gameState, updateGameState]);

  const handleTeamActivityDecline = useCallback(() => {
    if (!gameState) return;
    updateGameState({
      team11: gameState.team11.map(p => ({ ...p, morale: Math.max(0, p.morale - 3) })),
      news: ['Takım aktivitesi reddedildi, oyuncular biraz hayal kırıklığına uğradı.', ...gameState.news.slice(0, 4)]
    });
    setShowTeamActivity(false);
  }, [gameState, updateGameState]);

  /* ══════════ SEZON SONU ══════════ */
  const runSeasonEnd = useCallback(() => {
    if (!gameState) return;

    const sortedLeague = [...gameState.league].sort((a, b) =>
      b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
    );
    const userPosition = sortedLeague.findIndex(t => t.isUser) + 1;
    const champion = userPosition === 1;

    let newTrophies = [...gameState.trophies];
    let newLeagueLevel = gameState.leagueLevel;
    const newClubStats = { ...gameState.clubStats };
    let newAchievements = [...(gameState.achievements || [])];
    let budgetBonus = 0;
    let boardConfidence = gameState.boardConfidence;
    const newsItems: string[] = [];
    const boardMessages: string[] = [];
    const departed: string[] = [];

    const unlock = (id: string) => {
      const idx = newAchievements.findIndex(a => a.id === id);
      if (idx >= 0 && !newAchievements[idx].unlocked) {
        newAchievements[idx] = { ...newAchievements[idx], unlocked: true, unlockedWeek: 18 };
        budgetBonus += newAchievements[idx].reward || 0;
        newsItems.push(`🏅 Başarım: ${newAchievements[idx].title}! +$${(newAchievements[idx].reward || 0).toLocaleString()}`);
      }
    };

    unlock('season_complete');
    if (champion) {
      newTrophies = [...newTrophies, '🏆'];
      newClubStats.leagueTitles++;
      unlock('league_title');
      if (newClubStats.cupWins > 0) unlock('double');
    }

    // Hedef değerlendirmesi
    const objectiveMatch = gameState.seasonObjective.match(/(\d+)/);
    const objectiveTarget = objectiveMatch ? Number(objectiveMatch[1]) : 5;
    const objectiveMet = userPosition <= objectiveTarget;
    if (objectiveMet) {
      boardConfidence = Math.min(100, boardConfidence + 15);
      newsItems.push(`✅ Sezon hedefi tutuldu (${userPosition}. sıra). Yönetim memnun.`);
      boardMessages.push(`👔 Yönetim: "Hedefimizi tuttun, tebrikler. Gelecek sezon daha iyisini bekliyoruz."`);
    } else {
      boardConfidence = Math.max(0, boardConfidence - 18);
      newsItems.push(`❌ Sezon hedefi tutulmadı (${userPosition}. sıra / hedef ilk ${objectiveTarget}).`);
      boardMessages.push(`👔 Yönetim: "Hedefin uzağında kaldın. Bu performans kabul edilemez."`);
    }

    let promoted = false;
    let relegated = false;
    if (userPosition <= 3 && newLeagueLevel > 1) {
      newLeagueLevel--;
      promoted = true;
      unlock('promotion');
      newsItems.push('🎉 Üst lige yükseldiniz!');
      budgetBonus += 300000;
    } else if (userPosition >= 8 && newLeagueLevel < 4) {
      newLeagueLevel++;
      relegated = true;
      boardConfidence = Math.max(0, boardConfidence - 10);
      newsItems.push('😢 Alt lige düştünüz!');
    }

    // Oyuncu yaşlanması + sözleşme
    const agePlayers = (p: Player): Player => {
      const aged = p.age + 1;
      let ovr = p.ovr;
      if (aged > 32 && Math.random() < 0.45) ovr = Math.max(45, ovr - 1);
      if (aged < 24 && p.ovr < p.potential && Math.random() < 0.55) ovr = Math.min(p.potential, ovr + 1);
      return {
        ...p,
        age: aged,
        contract: Math.max(0, p.contract - 1),
        ovr,
        value: playerValue(ovr, aged, { tier: p.starTier, potential: p.potential }),
        goals: 0,
        assists: 0,
        matchesPlayed: 0,
        energy: 100,
        injured: false,
        injuryWeeks: 0,
        yellowCards: 0,
        redCard: false,
        suspension: 0,
        form: 5 + Math.floor(Math.random() * 3),
        wantsOut: false
      };
    };

    const agedTeam = gameState.team11.map(agePlayers);
    const agedBench = gameState.bench.map(agePlayers);
    const agedAcademy = gameState.academyPlayers.map(p => ({
      ...p,
      age: p.age + 1,
      ovr: Math.min(p.potential, p.ovr + (Math.random() < 0.6 ? 1 : 0))
    }));

    // Sözleşmesi bitenler ayrılır (kiralık oyuncular bu kuraldan muaf)
    const loanInIds = new Set([...gameState.team11, ...gameState.bench].filter(p => p.loanFrom).map(p => p.id));
    const keepOrLeave = (p: Player): boolean => {
      if (loanInIds.has(p.id)) return true;
      if (p.contract > 0) return true;
      // %25 ihtimalle düşük maaşla 1 yıl uzatır
      if (Math.random() < 0.25) return true;
      departed.push(p.name);
      return false;
    };

    let team11 = agedTeam.filter(keepOrLeave);
    let bench = agedBench.filter(keepOrLeave);

    // ── Kiralıklar ──
    // 1) Bizden kiralığa gidenler gelişmiş olarak döner
    const returning: Player[] = [];
    (gameState.outgoingLoans || []).forEach(loan => {
      const weeks = Math.max(1, 18 - loan.startWeek);
      const back = applyLoanGrowth(loan.player, weeks);
      returning.push({ ...back, t: undefined, l: undefined });
      newsItems.push(`↩️ ${loan.playerName} kiralamadan döndü (${loan.toClub}): ${loan.playerOvr} → ${back.ovr} OVR`);
    });

    // 2) Bizim kiraladığımız oyuncular kulüplerine döner (satın alma opsiyonu kullanılmadıysa)
    const releasedNames = [...team11, ...bench].filter(p => p.loanFrom).map(p => p.name);
    team11 = team11.filter(p => !p.loanFrom);
    bench = bench.filter(p => !p.loanFrom);
    if (releasedNames.length > 0) {
      newsItems.push(`🔄 Kiralık oyuncular kulüplerine döndü: ${releasedNames.join(', ')}`);
    }
    bench = [...bench, ...returning];


    // Eksik kadroyu akademi ve altyapıdan tamamla
    const fillFromAcademy = () => {
      while (team11.length < 11 && agedAcademy.length > 0) {
        const idx = agedAcademy.findIndex(p => !p.injured);
        if (idx < 0) break;
        const [youth] = agedAcademy.splice(idx, 1);
        const slot = FORMATIONS[gameState.tactics.formation]?.[team11.length];
        team11 = [...team11, { ...youth, t: slot?.t, l: slot?.l, role: (slot?.r as Player['role']) ?? youth.role }];
        newsItems.push(`⬆️ ${youth.name} altyapıdan A takıma yükseldi.`);
      }
      while (bench.length < 5) {
        const role = ['STP', 'SB', 'OS', 'FW', 'KL'][bench.length % 5];
        const id = Date.now() + Math.floor(Math.random() * 100000);
        const ovr = 62 + Math.floor(Math.random() * 12) + (5 - newLeagueLevel) * 3;
        const rcAltyapi = randomCountry();
        bench = [...bench, {
          id, name: `Altyapı Oyuncusu`, ovr, role: role as Player['role'], energy: 100,
          morale: 70, goals: 0, assists: 0, injured: false, injuryWeeks: 0, age: 19,
          potential: Math.min(99, ovr + 12), value: ovr * 15000, wage: ovr * 350,
          contract: 3, yellowCards: 0, redCard: false, suspension: 0, matchesPlayed: 0, form: 5,
          country: rcAltyapi.country, flag: rcAltyapi.flag
        }];
      }
      // İlk 11 boşsa yedekten tamamla
      while (team11.length < 11 && bench.length > 0) {
        const [next] = bench.splice(0, 1);
        team11 = [...team11, next];
      }
    };
    fillFromAcademy();

    // Yeni sezon ligi ve fikstürü
    const botData = BOT_NAMES_BY_LEVEL[newLeagueLevel] || BOT_NAMES_BY_LEVEL[4];
    const baseOvr = 50 + (5 - newLeagueLevel) * 10;
    const userTeam = {
      name: gameState.teamName,
      logo: gameState.teamLogo,
      o: 0, g: 0, b: 0, m: 0, p: 0, gf: 0, ga: 0,
      ovr: Math.floor(team11.reduce((acc, p) => acc + p.ovr, 0) / Math.max(1, team11.length)),
      isUser: true
    };
    const league = [userTeam, ...botData.map(bot => ({
      name: bot.name,
      logo: bot.logo,
      o: 0, g: 0, b: 0, m: 0, p: 0, gf: 0, ga: 0,
      ovr: baseOvr + Math.floor(Math.random() * 12) + (promoted ? 3 : 0),
      isUser: false
    }))];
    const leagueWithStars = assignKeyPlayers(league);
    const bots = leagueWithStars.filter(t => !t.isUser);
    const nextFixture = generateFixture(userTeam, bots);

    const cupTeams = [...bots].sort(() => Math.random() - 0.5).slice(0, 4);
    const cupMatches = [
      { round: '1. Tur', opponent: cupTeams[0], played: false },
      { round: 'Çeyrek Final', opponent: cupTeams[1], played: false },
      { round: 'Yarı Final', opponent: cupTeams[2], played: false },
      { round: 'Final', opponent: cupTeams[3], played: false }
    ];

    const seasonPrize = champion ? 3000000 : userPosition <= 3 ? 1500000 : userPosition <= 5 ? 700000 : 300000;

    const topScorer = [...gameState.team11, ...gameState.bench].sort((a, b) => b.goals - a.goals)[0];

    // Yeni hedef
    const nextObjective = newLeagueLevel >= 4
      ? 'İlk 3\'e gir (üst lige yüksel)'
      : newLeagueLevel === 3 ? 'İlk 5\'e gir'
      : newLeagueLevel === 2 ? 'İlk 5\'e gir'
      : 'İlk 3\'e gir';

    const careerOver = boardConfidence <= 0;
    // Müze kaydı — bu sezonun özeti rafa eklenir
    const seasonTrophies: string[] = [];
    if (champion) seasonTrophies.push('🏆');
    if (newClubStats.cupWins > gameState.clubStats.cupWins) seasonTrophies.push('🏅');
    // eğer hiç kupa kazanılmadıysa ama position iyi ise boş bırak (müze yine kayıt tutar)
    const museumEntry: import('./types/game').MuseumEntry = {
      season: gameState.season,
      position: userPosition,
      leagueLevel: gameState.leagueLevel,
      trophies: seasonTrophies.length ? seasonTrophies : (champion || seasonTrophies.length ? seasonTrophies : []),
      topScorer: topScorer ? { name: topScorer.name, goals: topScorer.goals } : (undefined as any),
      budget: gameState.budget + budgetBonus + seasonPrize,
    };
    const newMuseum = [...(gameState.museum || []), museumEntry];

    const summary: SeasonSummary = {
      season: gameState.season,
      position: userPosition,
      champion,
      promoted,
      relegated,
      prize: seasonPrize + budgetBonus,
      objectiveMet,
      objective: gameState.seasonObjective,
      topScorer: topScorer ? { name: topScorer.name, goals: topScorer.goals } : undefined,
      departed
    };

    const provisional = { ...gameState, week: 1, season: (gameState.season || 1) + 1 } as typeof gameState;
    const nextMissions = [
      ...(gameState.missions || []).filter(m => m.type === 'career'),
      ...createSeasonMissions(provisional, 3),
      ...createWeeklyMissions(provisional, 3)
    ];

    updateGameState({
      missions: nextMissions,
      trophies: newTrophies,
      museum: newMuseum as any,
      leagueLevel: newLeagueLevel,
      clubStats: newClubStats,
      achievements: newAchievements,
      week: 1,
      season: (gameState.season || 1) + 1,
      matchHistory: [],
      league: leagueWithStars,
      fixture: nextFixture,
      cupMatches,
      cupEliminated: false,
      team11,
      bench,
      academyPlayers: agedAcademy,
      budget: gameState.budget + budgetBonus + seasonPrize,
      boardConfidence,
      boardMessages: [...boardMessages, `👔 Yeni sezon hedefi: ${nextObjective}`, ...gameState.boardMessages.slice(0, 3)],
      seasonObjective: nextObjective,
      leagueScorers: [],
      transferOffers: [],
      outgoingLoans: [],
      boardWarnings: 0,
      careerOver,
      careerOverReason: careerOver ? 'Sezon sonu değerlendirmesinde yönetim kurulu sözleşmeni yenilemedi.' : null,
      news: [
        `🆕 Sezon ${(gameState.season || 1) + 1} başladı! Ödül: $${(seasonPrize + budgetBonus).toLocaleString()}`,
        ...newsItems,
        ...gameState.news.slice(0, 3)
      ]
    });

    // Yeni sezon kiralık listesi
    setTimeout(() => {
      updateGameState({ loanList: generateLoanList({ ...provisional, outgoingLoans: [] } as typeof gameState, 5) });
    }, 50);

    setSeasonSummary(summary);
    setTimeout(() => saveGame(0), 800);
  }, [gameState, updateGameState, saveGame]);

  // Hafta 18'den sonra sezon geçişini tetikle
  useEffect(() => {
    if (!gameState) return;
    if (gameState.week <= 18) return;
    if (isMatchActive || showPreMatch) return;
    if (seasonHandled === gameState.season) return;
    setSeasonHandled(gameState.season);
    runSeasonEnd();
  }, [gameState?.week, gameState?.season, isMatchActive, showPreMatch, seasonHandled, runSeasonEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ══════════ MAĞAZA ══════════ */
  const handleShopPurchase = useCallback((itemId: string, _quantity: number) => {
    if (!gameState) return;

    switch (itemId) {
      case 'white_monster':
        updateGameState({
          budget: gameState.budget - 15000,
          team11: gameState.team11.map(p => ({ ...p, energy: 100 })),
          bench: gameState.bench.map(p => ({ ...p, energy: 100 })),
          news: ['⚡ Beyaz Monster ile takım enerjisi %100!', ...gameState.news.slice(0, 4)]
        });
        break;
      case 'protein_bar': {
        const randomIndices: number[] = [];
        const allPlayers = [...gameState.team11, ...gameState.bench];
        while (randomIndices.length < 3 && randomIndices.length < allPlayers.length) {
          const idx = Math.floor(Math.random() * allPlayers.length);
          if (!randomIndices.includes(idx)) randomIndices.push(idx);
        }
        updateGameState({
          budget: gameState.budget - 25000,
          team11: gameState.team11.map((p, i) => (randomIndices.includes(i) ? { ...p, ovr: Math.min(99, p.ovr + 1) } : p)),
          bench: gameState.bench.map((p, i) => (randomIndices.includes(i + gameState.team11.length) ? { ...p, ovr: Math.min(99, p.ovr + 1) } : p)),
          news: ['💪 Protein barları etkisini gösterdi! 3 oyuncu gelişti.', ...gameState.news.slice(0, 4)]
        });
        break;
      }
      case 'sports_drink':
        updateGameState({
          budget: gameState.budget - 20000,
          team11: gameState.team11.map(p => (p.injured ? { ...p, injuryWeeks: Math.max(0, p.injuryWeeks - 1), injured: p.injuryWeeks <= 1 ? false : true } : p)),
          bench: gameState.bench.map(p => (p.injured ? { ...p, injuryWeeks: Math.max(0, p.injuryWeeks - 1), injured: p.injuryWeeks <= 1 ? false : true } : p)),
          news: ['💧 Sporcu içecekleri sakatlıkları hızlandırdı!', ...gameState.news.slice(0, 4)]
        });
        break;
      case 'massage_session':
        updateGameState({
          budget: gameState.budget - 35000,
          team11: gameState.team11.map(p => ({ ...p, energy: Math.min(100, p.energy + 50) })),
          bench: gameState.bench.map(p => ({ ...p, energy: Math.min(100, p.energy + 50) })),
          news: ['💆 Masaj seansı tamamlandı! Takım dinlendi.', ...gameState.news.slice(0, 4)]
        });
        break;
      case 'motivation_speech':
        updateGameState({
          budget: gameState.budget - 40000,
          team11: gameState.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + 20) })),
          bench: gameState.bench.map(p => ({ ...p, morale: Math.min(100, p.morale + 20) })),
          news: ['🎯 Motivasyon koçu konuştu! Moral yükseldi.', ...gameState.news.slice(0, 4)]
        });
        break;
      case 'team_jersey':
        updateGameState({
          budget: gameState.budget - 75000 + 50000,
          team11: gameState.team11.map(p => ({ ...p, morale: Math.min(100, p.morale + 30) })),
          bench: gameState.bench.map(p => ({ ...p, morale: Math.min(100, p.morale + 30) })),
          news: ['👕 Yeni formalar geldi! Taraftarlardan $50K gelir.', ...gameState.news.slice(0, 4)]
        });
        break;
    }
  }, [gameState, updateGameState]);

  /* ══════════ KAYIT İŞLEMLERİ ══════════ */
  const handleSaveToSlot = useCallback((slot: number) => {
    if (!gameState) return;
    writeSlot(slot, gameState);
    showToast(`Slot ${slot + 1}'e kaydedildi 💾`);
  }, [gameState, showToast]);

  const handleLoadFromSlot = useCallback((slot: number) => {
    if (loadGame(slot)) showToast(`Slot ${slot + 1} yüklendi ✅`);
    else showToast('Kayıt bulunamadı ❌');
  }, [loadGame, showToast]);

  const handleExportSave = useCallback(() => {
    if (gameState) exportSaveToFile(gameState);
  }, [gameState]);

  const handleImportSave = useCallback((file: File) => {
    importSaveFromFile(file)
      .then(state => {
        setGameStateExternal(state);
        showToast('Yedek yüklendi ✅');
      })
      .catch(() => showToast('Dosya okunamadı ❌'));
  }, [setGameStateExternal, showToast]);

  const handleNewCareer = useCallback(() => {
    clearSlot(0);
    resetCareer();
    setSeasonSummary(null);
    setSeasonHandled(null);
  }, [resetCareer]);

  if (!gameState) {
    return <SetupScreen onStart={handleStart} onLoad={handleLoad} onBack={onExit} />;
  }

  const offersCount = (gameState.transferOffers || []).length;
  const messagesCount = (gameState.boardMessages || []).length;
  const expiringCount = [...gameState.team11, ...gameState.bench].filter(p => p.contract <= 1).length;
  const officeBadge = offersCount + messagesCount + expiringCount;

  const lifeSlots = Math.max(0, 4 - (gameState.life?.actionsUsed ?? 4));
  const pendingPoints = gameState.skillPoints || 0;
  const activeMissions = (gameState.missions || []).filter(m => !m.completed).length;
  const careerBadge = pendingPoints + (activeMissions > 0 ? 1 : 0);
  const socialCount = (gameState.socialFeed || []).filter(p=>!p.isUser).length;
  const socialBadge = socialCount > 0 ? Math.min(9, Math.ceil(socialCount/4)) : 0;

  const tabs: TabDef[] = [
    { id: 'office', label: 'Ofis', icon: '🏢', badge: officeBadge },
    { id: 'social', label: 'Sosyal', icon: '💬', badge: socialBadge },
    { id: 'career', label: 'Kariyer', icon: '🧠', badge: careerBadge },
    { id: 'life', label: 'Hayat', icon: '🚶', badge: lifeSlots > 0 ? lifeSlots : 0 },
    { id: 'stadium', label: 'Stadyum', icon: '🏟️' },
    { id: 'squad', label: 'Kadro', icon: '⚽' },
    { id: 'transfer', label: 'Transfer', icon: '💰' },
    { id: 'tactics', label: 'Taktik', icon: '📋' },
    { id: 'training', label: 'Antrenman', icon: '🏋️' },
    { id: 'league', label: 'Lig', icon: '🏆' },
    { id: 'cup', label: 'Kupa', icon: '🏅' },
    { id: 'shop', label: 'Dükkan', icon: '🛒' },
    { id: 'merch', label: 'Formalar', icon: '👕' },
    { id: 'invest', label: 'Yatırım', icon: '📈' },
    { id: 'history', label: 'Geçmiş', icon: '📊' },
    { id: 'tech', label: 'Teknoloji', icon: '🛒' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.07),transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.06),transparent_60%),radial-gradient(ellipse_at_bottom_left,_rgba(139,92,246,0.05),transparent_60%),radial-gradient(ellipse_at_center,_rgba(251,191,36,0.03),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{backgroundImage:"url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1Ii8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')"}} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-28 -right-28 w-[36rem] h-[36rem] bg-emerald-500/[0.06] rounded-full blur-3xl animate-aurora" />
        <div className="absolute -bottom-32 -left-20 w-[32rem] h-[32rem] bg-cyan-500/[0.05] rounded-full blur-3xl animate-aurora" style={{animationDelay:'3s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[48rem] h-[48rem] bg-violet-500/[0.03] rounded-full blur-3xl" />
      </div>
      {showTutorial && (
        <Tutorial
          onComplete={() => { completeTutorial(); setShowTutorial(false); showToast('Tutorial tamamlandı! Bol şans ⚽'); }}
          onSkip={() => { completeTutorial(); setShowTutorial(false); }}
        />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-[70] bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 text-white px-5 py-3 rounded-xl shadow-xl shadow-black/30 font-medium animate-slide-in flex items-center gap-3 max-w-sm">
          <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm flex-shrink-0">✓</span>
          <span className="text-sm">{toast}</span>
        </div>
      )}

      {/* Kariyer bitti */}
      {gameState.careerOver && (
        <GameOverScreen
          gameState={gameState}
          onNewCareer={handleNewCareer}
          onLoadSave={() => { if (loadGame(1)) showToast('Slot 2 yüklendi ✅'); else if (loadGame(2)) showToast('Slot 3 yüklendi ✅'); else showToast('Kayıt bulunamadı ❌'); }}
        />
      )}

      {/* Maç öncesi taktik odası */}
      {showPreMatch && currentOpponent && !gameState.careerOver && (
        <PreMatchScreen
          gameState={gameState}
          opponent={currentOpponent}
          isHome={isCupMatch ? true : (currentFixture?.isHome ?? true)}
          isCup={isCupMatch}
          weather={gameState.weather}
          onClose={() => setShowPreMatch(false)}
          onOpenTactics={() => { setShowPreMatch(false); setActiveTab('tactics'); }}
          onStart={() => beginMatch(Math.random() < 0.35)}
        />
      )}

      {/* Maç motoru */}
      {isMatchActive && currentOpponent && (
        <MatchEngine
          gameState={gameState}
          opponent={currentOpponent}
          isHome={isCupMatch ? true : (currentFixture?.isHome ?? true)}
          isCup={isCupMatch}
          weather={gameState.weather}
          onMatchEnd={handleMatchEnd}
        />
      )}

      {postMatchEvent && (
        <PostMatchEvent event={postMatchEvent} gameState={gameState} onChoice={handlePostMatchChoice} />
      )}

      {showTeamActivity && (
        <TeamActivityEvent
          gameState={gameState}
          onAccept={handleTeamActivityAccept}
          onDecline={handleTeamActivityDecline}
        />
      )}

      {storyMinigame && (
        <InGameMinigame context={storyMinigame} gameState={gameState} onComplete={handleStoryMinigameComplete} />
      )}

      {gameState.pendingPress && (
        <PressConference press={gameState.pendingPress} onAnswer={answerPressQuestion} onDismiss={dismissPress} />
      )}

      {/* Sezon sonu gazetesi */}
      {seasonSummary && (
        <div className="fixed inset-0 bg-black/85 z-[75] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-amber-500/40 p-6">
            <div className="text-center mb-4">
              <div className="text-xs text-amber-400 font-bold tracking-widest">SEZON {seasonSummary.season} RAPORU</div>
              <div className="text-3xl font-black text-white mt-1">
                {seasonSummary.champion ? '🏆 ŞAMPİYON!' : `${seasonSummary.position}. SIRA`}
              </div>
              {seasonSummary.promoted && <div className="text-emerald-400 font-bold mt-1">🎉 Üst lige yükseldin!</div>}
              {seasonSummary.relegated && <div className="text-red-400 font-bold mt-1">😢 Alt lige düştün!</div>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs mb-4">
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Hedef</div>
                <div className={seasonSummary.objectiveMet ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {seasonSummary.objectiveMet ? 'TUTULDU' : 'TUTULMADI'}
                </div>
                <div className="text-[10px] text-slate-500">{seasonSummary.objective}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Sezon Ödülü</div>
                <div className="text-amber-400 font-bold">${seasonSummary.prize.toLocaleString()}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Yönetim Güveni</div>
                <div className="text-white font-bold">%{gameState.boardConfidence}</div>
              </div>
              {seasonSummary.topScorer && (
                <div className="bg-slate-700/40 rounded-lg p-2 col-span-2 sm:col-span-1">
                  <div className="text-slate-400">Gol Kralımız</div>
                  <div className="text-white font-bold truncate">{seasonSummary.topScorer.name}</div>
                  <div className="text-[10px] text-slate-400">⚽ {seasonSummary.topScorer.goals}</div>
                </div>
              )}
            </div>

            {seasonSummary.departed.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <div className="text-xs text-red-300 font-bold mb-1">Sözleşmesi biten ayrılanlar</div>
                <div className="text-[11px] text-slate-300">{seasonSummary.departed.join(', ')}</div>
                <div className="text-[10px] text-slate-400 mt-1">Ofis → Sözleşmeler bölümünden zamanında yenile!</div>
              </div>
            )}

            <button
              onClick={() => { setSeasonSummary(null); sfx.coin(); }}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 shimmer"
            >
              Yeni Sezona Başla ⚽
            </button>
            <div className="text-center mt-3 text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
              <span>☀️ Bütün Yaz Boyunca Geliştirildi</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="kaan-watermark text-[10px]">Made by Kaan</span>
            </div>
          </div>
        </div>
      )}

      {gameState.lastDailyReward && (
        <DailyRewardModal
          day={gameState.lastDailyReward.day}
          budget={gameState.lastDailyReward.budget}
          tokens={gameState.lastDailyReward.tokens}
          loginStreak={gameState.loginStreak || 1}
          onClose={dismissDailyReward}
        />
      )}

      {/* Mobil menü - premium glass */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-800/90 backdrop-blur-xl p-3 rounded-xl border border-slate-700 shadow-xl hover:bg-slate-700/90 active:scale-95 transition-all"
        aria-label="Menüyü aç/kapat"
      >
        <span className="text-xl w-6 h-6 flex items-center justify-center">{sidebarOpen ? '✕' : '☰'}</span>
      </button>

      {/* Ana Yerleşim */}
      <div className="flex h-screen pb-8">
        <div className={`
          fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-auto
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex-shrink-0
        `}>
          <div className="w-72 xl:w-80 h-full p-3 lg:p-4 bg-slate-900/95 lg:bg-transparent overflow-y-auto custom-scroll">
            <Sidebar
              gameState={gameState}
              onPlayMatch={handlePlayMatch}
              onSave={handleSave}
              onSignSponsor={handleSignSponsor}
              onSaveToSlot={handleSaveToSlot}
              onLoadFromSlot={handleLoadFromSlot}
              onExportSave={handleExportSave}
              onImportSave={handleImportSave}
              onToggleSound={toggleSound}
            />
          </div>
          {sidebarOpen && (
            <div className="lg:hidden absolute inset-0 bg-black/50 -z-10" onClick={() => setSidebarOpen(false)} />
          )}
        </div>

        <div className="flex-1 flex flex-col p-2 lg:p-4 pl-0 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center gap-3 mb-3 pl-14 lg:pl-0">
            <span className="text-xs font-bold tracking-widest text-amber-300">OFFLINE KARİYER</span>
            <button onClick={exitOffline} className="text-sm text-slate-300 hover:text-white rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">← Mod seçimi</button>
          </div>
          {/* Üst sekmeler - kaydırma barı görünür + aktif sekmeye otomatik kaydırma + fade */}
          <div className="relative mb-3 lg:mb-4 flex-shrink-0">
            <div
              ref={tabsRef}
              onScroll={updateTabsFade}
              className="flex gap-1.5 overflow-x-auto pb-2 custom-scroll bg-slate-800/60 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/60 shadow-xl shadow-black/20 scroll-smooth snap-x snap-mandatory scroll-px-2"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(16,185,129,0.9) rgba(15,23,42,0.6)' }}
            >
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onMouseMove={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    (e.currentTarget as HTMLElement).style.setProperty('--x', `${e.clientX - r.left}px`);
                    (e.currentTarget as HTMLElement).style.setProperty('--y', `${e.clientY - r.top}px`);
                  }}
                  className={`tab-btn snap-start shrink-0 relative px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 lg:gap-2 btn-press ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span className="tracking-wide">{tab.label}</span>
                  {!!tab.badge && tab.badge > 0 && (
                    <span className={`absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md ${activeTab===tab.id?'bg-white text-emerald-600 animate-badge-pop':'bg-red-500 text-white'}`}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* sol/sağ fade - kaydırılabilir olduğunu gösterir */}
            <div className={`pointer-events-none absolute inset-y-1.5 left-1.5 w-8 rounded-l-2xl transition-opacity ${tabsScrollFade.left ? 'opacity-100' : 'opacity-0'} tabs-fade-left`} />
            <div className={`pointer-events-none absolute inset-y-1.5 right-1.5 w-8 rounded-r-2xl transition-opacity ${tabsScrollFade.right ? 'opacity-100' : 'opacity-0'} tabs-fade-right`} />
            {tabsScrollFade.left && (
              <button
                onClick={() => tabsRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-base leading-none shadow-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center"
                aria-label="Sekmeleri sola kaydır"
              >‹</button>
            )}
            {tabsScrollFade.right && (
              <button
                onClick={() => tabsRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-base leading-none shadow-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center"
                aria-label="Sekmeleri sağa kaydır"
              >›</button>
            )}
            {/* küçük ipucu */}
            {tabsScrollFade.right && (
              <div className="pointer-events-none hidden sm:flex absolute -bottom-1 right-3 text-[10px] text-slate-500 items-center gap-1">
                <span>kaydır →</span><span className="animate-pulse">›</span>
              </div>
            )}
          </div>

          <div className="flex-1 bg-slate-800/45 backdrop-blur-xl rounded-2xl lg:rounded-[24px] p-3 lg:p-6 border border-slate-700/50 shadow-2xl shadow-black/30 overflow-y-auto custom-scroll relative min-h-0 panel-inner-glow">
            <div className="pointer-events-none absolute top-3 right-4 hidden lg:flex items-center gap-1.5 opacity-[0.35] hover:opacity-60 transition-opacity">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="kaan-watermark text-[10px] tracking-[0.18em]">MADE BY KAAN</span>
            </div>
            <div key={activeTab} className="tab-content">
            {activeTab === 'social' && (
              <SocialTab gameState={gameState} onCreatePost={addSocialPost} onLikePost={likeSocialPost} onAddComment={commentOnPost} />
            )}
            {activeTab === 'office' && (
              <OfficeTab
                gameState={gameState}
                onAcceptOffer={acceptTransferOffer}
                onRejectOffer={rejectTransferOffer}
                onRenewContract={renewContract}
                onSetCaptain={setCaptain}
                onSetSetPieceTaker={setSetPieceTaker}
                onSetTrainingFocus={(f: TrainingFocus) => setTrainingFocus(f)}
                onDismissBoardMessage={dismissBoardMessage}
                onExerciseLoanOption={exerciseLoanOption}
                onReturnLoanEarly={returnLoanEarly}
                onRecallLoan={recallLoan}
                onSetPhilosophy={setClubPhilosophy}
                onCompleteUltras={completeUltrasRequest}
                onDismissUltras={dismissUltrasRequest}
                onGenerateUltras={generateUltrasRequests}
              />
            )}
            {activeTab === 'career' && (
              <CareerTab gameState={gameState} onSpendSkillPoint={(id: SkillId) => spendSkillPoint(id)} />
            )}
            {activeTab === 'life' && (
              <LifeTab
                gameState={gameState}
                onDoActivity={doLifeActivity}
                onBuyItem={buyLifeItem}
                onUpdateAppearance={updateLifeAppearance}
                onToggleLowPerf={setLifeLowPerf}
              />
            )}
            {activeTab === 'stadium' && (
              <StadiumTab
                gameState={gameState}
                onSetDesign={setStadiumDesign}
                onBuyCosmetic={buyStadiumCosmetic}
                onBuyCapacity={buyCapacityPackage}
                onSetTicketMultiplier={setTicketMultiplier}
                onUpgradeStadiumLevel={upgradeStadiumLevel}
                onUpgradeTribune={upgradeTribune}
                onHostEvent={hostStadiumEvent}
                onUpgradeStadiumFacility={upgradeStadiumFacility}
                onSignBuffetSponsor={signBuffetSponsor}
                onCancelBuffetSponsor={cancelBuffetSponsor}
                onBuyBuffetMenuItem={buyBuffetMenuItem}
                onSetBuffetPriceLevel={setBuffetPriceLevel}
                onUpgradeFacilityModule={upgradeFacilityModule}
                onHireStaff={hireStaff}
                onDiscoverYouth={discoverYouthPlayer}
                onPromoteYouth={promoteYouthPlayer}
                onSendScout={sendScout}
                onClaimScoutReport={claimScoutReport}
                onDismissScoutReport={dismissScoutReport}
                onCancelScoutMission={cancelScoutMission}
              />
            )}
            {activeTab === 'squad' && (
              <SquadTab
                gameState={gameState}
                onSwapPlayers={swapPlayers}
                onSellPlayer={sellPlayer}
                onUpdatePlayer={updatePlayer}
                onSetCaptain={setCaptain}
                onRenewContract={renewContract}
                onAutoPick={autoPickBestEleven}
                onSendOnLoan={sendOnLoan}
                onExerciseLoanOption={exerciseLoanOption}
                onReturnLoanEarly={returnLoanEarly}
              />
            )}
            {activeTab === 'transfer' && (
              <TransferTab
                gameState={gameState}
                onBuyPlayer={buyPlayer}
                onRefreshMarket={refreshMarket}
                onRefreshLoanList={refreshLoanList}
                onTakeLoan={takeLoan}
              />
            )}
            {activeTab === 'tactics' && (
              <TacticsTab gameState={gameState} onUpdateTactics={updateTactics} onApplyFormation={applyFormation} onSetSlider={setTacticsSlider} />
            )}
            {activeTab === 'training' && (
              <TrainingTab gameState={gameState} onTrainPlayer={trainPlayer} />
            )}
            {activeTab === 'league' && <LeagueTab gameState={gameState} />}
            {activeTab === 'cup' && <CupTab gameState={gameState} onPlayCupMatch={handlePlayCupMatch} />}
            {activeTab === 'shop' && <ShopTab gameState={gameState} onPurchase={handleShopPurchase} />}
            {activeTab === 'merch' && <MerchTab gameState={gameState} onOpenShop={openShopBranch} />}
            {activeTab === 'invest' && (
              <InvestTab gameState={gameState} onBuyInvestment={buyInvestment} onSellInvestment={sellInvestment} onTakeCredit={takeCredit} onRepayCredit={repayCreditEarly} />
            )}
            {activeTab === 'history' && <HistoryTab gameState={gameState} />}
            {activeTab === 'tech' && <TechTab gameState={gameState} onBuyDevice={buyDevice} onSetActiveDevice={setActiveDevice} onSellDevice={sellDevice} onBuyPCComponent={buyPCComponent} onSetPCPart={setPCPart} onSellPCComponent={sellPCComponent} onAssemblePC={assemblePC} />}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-0 right-0 pointer-events-none hidden lg:flex justify-center z-30 opacity-40">
        <div className="bg-slate-900/70 backdrop-blur border border-slate-700/50 px-3 py-1 rounded-full text-[10px] text-slate-400 flex items-center gap-2 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Manager Pro 2026 Ultimate</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span className="kaan-watermark text-[10px]">MADE BY KAAN</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span className="text-amber-300/70">☀️ Bütün Yaz Boyunca Geliştirildi</span>
        </div>
      </div>
      <AiAssistant />
      <NewsTicker news={gameState.news} />
    </div>
  );
}

export default OfflineGame;
