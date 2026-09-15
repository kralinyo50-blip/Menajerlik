import { useState, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { SetupScreen } from './components/SetupScreen';
import { Sidebar } from './components/Sidebar';
import { SquadTab } from './components/tabs/SquadTab';
import { TransferTab } from './components/tabs/TransferTab';
import { TacticsTab } from './components/tabs/TacticsTab';
import { LeagueTab } from './components/tabs/LeagueTab';
import { FacilitiesTab } from './components/tabs/FacilitiesTab';
import { InvestTab } from './components/tabs/InvestTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { CupTab } from './components/tabs/CupTab';
import { TrainingTab } from './components/tabs/TrainingTab';
import { ShopTab } from './components/tabs/ShopTab';
import { MerchTab } from './components/tabs/MerchTab';
import { MatchEngine } from './components/MatchEngine';
import { NewsTicker } from './components/NewsTicker';
import { PostMatchEvent, PostMatchEventData, generatePostMatchEvent } from './components/PostMatchEvent';
import { TeamActivityEvent, shouldTriggerTeamActivity } from './components/TeamActivityEvent';
import { Sponsor } from './types/game';

type TabId = 'squad' | 'transfer' | 'tactics' | 'training' | 'league' | 'cup' | 'facilities' | 'shop' | 'merch' | 'invest' | 'history';

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'squad', label: 'Kadro', icon: '⚽' },
  { id: 'transfer', label: 'Transfer', icon: '💰' },
  { id: 'tactics', label: 'Taktik', icon: '📋' },
  { id: 'training', label: 'Antrenman', icon: '🏋️' },
  { id: 'league', label: 'Lig', icon: '🏆' },
  { id: 'cup', label: 'Kupa', icon: '🏅' },
  { id: 'facilities', label: 'Tesisler', icon: '🏟️' },
  { id: 'shop', label: 'Dükkan', icon: '🛒' },
  { id: 'merch', label: 'Formalar', icon: '👕' },
  { id: 'invest', label: 'Yatırım', icon: '📈' },
  { id: 'history', label: 'Geçmiş', icon: '📊' },
];

function App() {
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
    refreshMarket,
    applyFormation,
    updateTactics,
    processMatchResult,
    hireStaff,
    upgradeFacility,
    discoverYouthPlayer,
    promoteYouthPlayer,
    buyInvestment,
    sellInvestment,
    trainPlayer,
    openShopBranch
  } = useGameState();

  const [activeTab, setActiveTab] = useState<TabId>('squad');
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [isCupMatch, setIsCupMatch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [postMatchEvent, setPostMatchEvent] = useState<PostMatchEventData | null>(null);
  const [showTeamActivity, setShowTeamActivity] = useState(false);

  const handleStart = useCallback((teamName: string, teamLogo: string) => {
    initializeGame(teamName, teamLogo);
  }, [initializeGame]);

  const handleLoad = useCallback(() => {
    return loadGame();
  }, [loadGame]);

  const handleSave = useCallback(() => {
    saveGame();
    alert('Oyun başarıyla kaydedildi! 💾');
  }, [saveGame]);

  const handleSignSponsor = useCallback((sponsor: Sponsor) => {
    if (gameState) {
      updateGameState({
        activeSponsor: { ...sponsor, weeksLeft: sponsor.duration },
        budget: gameState.budget + sponsor.income,
        news: [`${sponsor.name} ile sponsorluk anlaşması imzalandı!`, ...gameState.news.slice(0, 4)]
      });
    }
  }, [gameState, updateGameState]);

  const handlePlayMatch = useCallback(() => {
    if (gameState && gameState.week <= 18) {
      setIsCupMatch(false);
      setIsMatchActive(true);
    }
  }, [gameState]);

  const handlePlayCupMatch = useCallback(() => {
    if (gameState && !gameState.cupEliminated) {
      setIsCupMatch(true);
      setIsMatchActive(true);
    }
  }, [gameState]);

  const handleMatchEnd = useCallback((
    userScore: number, 
    oppScore: number, 
    scorers: { playerId: number; goals: number; assists: number }[]
  ) => {
    if (!gameState) return;
    
    // Update player stats
    scorers.forEach(({ playerId, goals, assists }) => {
      const inTeam = gameState.team11.find(p => p.id === playerId);
      const inBench = gameState.bench.find(p => p.id === playerId);
      
      if (inTeam) {
        updatePlayer(playerId, { 
          goals: inTeam.goals + goals, 
          assists: inTeam.assists + assists 
        }, false);
      } else if (inBench) {
        updatePlayer(playerId, { 
          goals: inBench.goals + goals, 
          assists: inBench.assists + assists 
        }, true);
      }
    });

    if (isCupMatch) {
      // Handle cup match result
      const currentCupRound = gameState.cupMatches.findIndex(m => !m.played);
      if (currentCupRound !== -1) {
        const updatedCupMatches = [...gameState.cupMatches];
        updatedCupMatches[currentCupRound] = {
          ...updatedCupMatches[currentCupRound],
          played: true,
          userScore,
          oppScore
        };

        const prize = (currentCupRound + 1) * 150000;
        const isWin = userScore > oppScore;

        updateGameState({
          cupMatches: updatedCupMatches,
          cupEliminated: !isWin,
          budget: gameState.budget + (isWin ? prize : Math.floor(prize / 3)),
          clubStats: isWin && currentCupRound === 3 
            ? { ...gameState.clubStats, cupWins: gameState.clubStats.cupWins + 1 }
            : gameState.clubStats,
          trophies: isWin && currentCupRound === 3 
            ? [...gameState.trophies, '🏅']
            : gameState.trophies,
          news: [
            isWin 
              ? `Kupa maçında ${userScore}-${oppScore} kazandınız! Ödül: $${prize.toLocaleString()}`
              : `Kupa maçında ${userScore}-${oppScore} kaybettiniz. Kupadan elendiniz.`,
            ...gameState.news.slice(0, 4)
          ]
        });
      }
    } else {
      // Handle league match result
      const opponent = gameState.fixture[gameState.week - 1];
      processMatchResult(userScore, oppScore, opponent);

      // Check for season end
      if (gameState.week >= 18) {
        setTimeout(() => {
          handleSeasonEnd();
        }, 500);
      }
    }

    setIsMatchActive(false);
    setIsCupMatch(false);

    // Maç sonrası olay kontrolü (sadece lig maçları için)
    if (!isCupMatch && gameState.week < 18) {
      const wasWin = userScore > oppScore;
      
      // Önce takım aktivitesi kontrolü (%20 şans)
      if (shouldTriggerTeamActivity()) {
        setTimeout(() => {
          setShowTeamActivity(true);
        }, 800);
      } else {
        // Takım aktivitesi yoksa normal olay kontrolü
        const event = generatePostMatchEvent(gameState, wasWin);
        if (event) {
          setTimeout(() => {
            setPostMatchEvent(event);
          }, 800);
        }
      }
    }
  }, [gameState, isCupMatch, updatePlayer, processMatchResult, updateGameState]);

  const handlePostMatchChoice = useCallback((updates: Partial<typeof gameState>, _choiceText: string) => {
    if (updates && gameState) {
      updateGameState(updates as Parameters<typeof updateGameState>[0]);
    }
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
    
    // Reddetmek morali biraz düşürür
    updateGameState({
      team11: gameState.team11.map(p => ({
        ...p,
        morale: Math.max(0, p.morale - 3)
      })),
      news: ['Takım aktivitesi reddedildi, oyuncular biraz hayal kırıklığına uğradı.', ...gameState.news.slice(0, 4)]
    });
    setShowTeamActivity(false);
  }, [gameState, updateGameState]);

  // Dükkan satın alma
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
      case 'protein_bar':
        const randomIndices: number[] = [];
        const allPlayers = [...gameState.team11, ...gameState.bench];
        while (randomIndices.length < 3 && randomIndices.length < allPlayers.length) {
          const idx = Math.floor(Math.random() * allPlayers.length);
          if (!randomIndices.includes(idx)) randomIndices.push(idx);
        }
        updateGameState({
          budget: gameState.budget - 25000,
          team11: gameState.team11.map((p, i) => 
            randomIndices.includes(i) ? { ...p, ovr: Math.min(99, p.ovr + 1) } : p
          ),
          bench: gameState.bench.map((p, i) => 
            randomIndices.includes(i + gameState.team11.length) ? { ...p, ovr: Math.min(99, p.ovr + 1) } : p
          ),
          news: ['💪 Protein barları etkisini gösterdi! 3 oyuncu gelişti.', ...gameState.news.slice(0, 4)]
        });
        break;
      case 'sports_drink':
        updateGameState({
          budget: gameState.budget - 20000,
          team11: gameState.team11.map(p => 
            p.injured ? { ...p, injuryWeeks: Math.max(0, p.injuryWeeks - 1), injured: p.injuryWeeks <= 1 ? false : true } : p
          ),
          bench: gameState.bench.map(p => 
            p.injured ? { ...p, injuryWeeks: Math.max(0, p.injuryWeeks - 1), injured: p.injuryWeeks <= 1 ? false : true } : p
          ),
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

  const handleSeasonEnd = useCallback(() => {
    if (!gameState) return;

    const sortedLeague = [...gameState.league].sort((a, b) => 
      b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga)
    );
    const userPosition = sortedLeague.findIndex(t => t.isUser) + 1;
    
    let newTrophies = [...gameState.trophies];
    let newLeagueLevel = gameState.leagueLevel;
    let newClubStats = { ...gameState.clubStats };

    if (userPosition === 1) {
      newTrophies.push('🏆');
      newClubStats.leagueTitles++;
      alert('🏆 TEBRİKLER! LİG ŞAMPİYONU OLDUNUZ!');
    } else {
      alert(`Sezon bitti. Ligi ${userPosition}. sırada tamamladınız.`);
    }

    // Promotion/Relegation
    if (userPosition <= 3 && newLeagueLevel > 1) {
      newLeagueLevel--;
      alert('🎉 Üst lige yükseldiniz!');
    } else if (userPosition >= 8 && newLeagueLevel < 4) {
      newLeagueLevel++;
      alert('😢 Alt lige düştünüz!');
    }

    updateGameState({
      trophies: newTrophies,
      leagueLevel: newLeagueLevel,
      clubStats: newClubStats,
      week: 1,
      matchHistory: [],
      news: ['Yeni sezon başladı!', ...gameState.news.slice(0, 4)]
    });

    saveGame();
  }, [gameState, updateGameState, saveGame]);

  // Show setup screen if no game state
  if (!gameState) {
    return <SetupScreen onStart={handleStart} onLoad={handleLoad} />;
  }

  // Determine current opponent (league or cup)
  const currentOpponent = isCupMatch 
    ? gameState.cupMatches.find(m => !m.played)?.opponent
    : gameState.fixture[gameState.week - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Match Engine Overlay */}
      {isMatchActive && currentOpponent && (
        <MatchEngine
          gameState={gameState}
          opponent={currentOpponent}
          onMatchEnd={handleMatchEnd}
        />
      )}

      {/* Post Match Event Modal */}
      {postMatchEvent && (
        <PostMatchEvent
          event={postMatchEvent}
          gameState={gameState}
          onChoice={handlePostMatchChoice}
        />
      )}

      {/* Team Activity Event Modal */}
      {showTeamActivity && (
        <TeamActivityEvent
          gameState={gameState}
          onAccept={handleTeamActivityAccept}
          onDecline={handleTeamActivityDecline}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-800 p-3 rounded-xl border border-slate-700"
      >
        <span className="text-2xl">{sidebarOpen ? '✕' : '☰'}</span>
      </button>

      {/* Main Layout */}
      <div className="flex h-screen pb-8">
        {/* Sidebar - Mobile Overlay */}
        <div className={`
          fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-auto
          transform transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex-shrink-0
        `}>
          <div className="w-72 xl:w-80 h-full p-3 lg:p-4 bg-slate-900/95 lg:bg-transparent overflow-y-auto">
            <Sidebar
              gameState={gameState}
              onPlayMatch={handlePlayMatch}
              onSave={handleSave}
              onSignSponsor={handleSignSponsor}
            />
          </div>
          {sidebarOpen && (
            <div 
              className="lg:hidden absolute inset-0 bg-black/50 -z-10"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-2 lg:p-4 pl-0 min-w-0 overflow-hidden">
          {/* Tabs Header */}
          <div className="flex gap-1 lg:gap-2 mb-2 lg:mb-4 overflow-x-auto pb-1 flex-shrink-0 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl text-xs lg:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 lg:gap-2 ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 bg-slate-800/30 rounded-xl lg:rounded-2xl p-3 lg:p-6 border border-slate-700/30 overflow-hidden">
            {activeTab === 'squad' && (
              <SquadTab
                gameState={gameState}
                onSwapPlayers={swapPlayers}
                onSellPlayer={sellPlayer}
                onUpdatePlayer={updatePlayer}
              />
            )}
            {activeTab === 'transfer' && (
              <TransferTab
                gameState={gameState}
                onBuyPlayer={buyPlayer}
                onRefreshMarket={refreshMarket}
              />
            )}
            {activeTab === 'tactics' && (
              <TacticsTab
                gameState={gameState}
                onUpdateTactics={updateTactics}
                onApplyFormation={applyFormation}
              />
            )}
            {activeTab === 'training' && (
              <TrainingTab
                gameState={gameState}
                onTrainPlayer={trainPlayer}
              />
            )}
            {activeTab === 'league' && (
              <LeagueTab gameState={gameState} />
            )}
            {activeTab === 'cup' && (
              <CupTab
                gameState={gameState}
                onPlayCupMatch={handlePlayCupMatch}
              />
            )}
            {activeTab === 'facilities' && (
              <FacilitiesTab
                gameState={gameState}
                onUpgradeFacility={upgradeFacility}
                onHireStaff={hireStaff}
                onDiscoverYouth={discoverYouthPlayer}
                onPromoteYouth={promoteYouthPlayer}
              />
            )}
            {activeTab === 'shop' && (
              <ShopTab
                gameState={gameState}
                onPurchase={handleShopPurchase}
              />
            )}
            {activeTab === 'merch' && (
              <MerchTab
                gameState={gameState}
                onOpenShop={openShopBranch}
              />
            )}
            {activeTab === 'invest' && (
              <InvestTab
                gameState={gameState}
                onBuyInvestment={buyInvestment}
                onSellInvestment={sellInvestment}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab gameState={gameState} />
            )}
          </div>
        </div>
      </div>

      {/* News Ticker */}
      <NewsTicker news={gameState.news} />
    </div>
  );
}

export default App;
