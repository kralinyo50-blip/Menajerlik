import { useState, useCallback } from 'react';
import { GameState, Player, Team, Tactics, Staff, CupMatch } from '../types/game';
import { 
  FIRST_NAMES, LAST_NAMES, BOT_NAMES_BY_LEVEL, FORMATIONS, 
  INITIAL_INVESTMENTS 
} from '../data/constants';
import { TURKEY_CITIES, SHOP_TYPES } from '../data/cities';

const generatePlayerName = () => {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
};

const calculatePlayerValue = (ovr: number, age: number) => {
  const baseValue = ovr * 15000;
  const ageMultiplier = age < 23 ? 1.3 : age > 30 ? 0.7 : 1;
  return Math.floor(baseValue * ageMultiplier);
};

const generatePlayer = (role: string, minOvr: number, maxOvr: number, id: number): Player => {
  const ovr = minOvr + Math.floor(Math.random() * (maxOvr - minOvr));
  const age = 18 + Math.floor(Math.random() * 17);
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
    value: calculatePlayerValue(ovr, age),
    wage: Math.floor(ovr * 500),
    contract: 1 + Math.floor(Math.random() * 4)
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

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading] = useState(false);

  const initializeGame = useCallback((teamName: string, teamLogo: string) => {
    const leagueLevel = 4;
    const baseOvr = 50 + (5 - leagueLevel) * 10;
    
    // Generate initial squad with formation positions
    const formation = FORMATIONS['4-3-3'];
    const team11: Player[] = formation.map((pos, i) => {
      const player = generatePlayer(pos.r, 72, 80, i);
      player.t = pos.t;
      player.l = pos.l;
      return player;
    });

    // Generate bench
    const benchRoles = ['STP', 'SB', 'OS', 'OS', 'FW', 'FW', 'KL'];
    const bench: Player[] = benchRoles.map((role, i) => 
      generatePlayer(role, 68, 76, 100 + i)
    );

    // Create league
    const botData = BOT_NAMES_BY_LEVEL[leagueLevel];
    const userTeam: Team = {
      name: teamName,
      logo: teamLogo,
      o: 0, g: 0, b: 0, m: 0, p: 0, gf: 0, ga: 0,
      ovr: Math.floor(team11.reduce((acc, p) => acc + p.ovr, 0) / 11),
      isUser: true
    };

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

    // Generate fixture (double round robin)
    const bots = league.filter(t => !t.isUser);
    const fixture = shuffleArray([...bots, ...bots]);

    // Generate market
    const marketList: Player[] = [];
    const posPool = ['KL', 'STP', 'SB', 'OS', 'FW'];
    for (let i = 0; i < 8; i++) {
      const role = posPool[Math.floor(Math.random() * posPool.length)];
      marketList.push(generatePlayer(role, baseOvr, baseOvr + 15, 5000 + i));
    }

    // Generate cup matches
    const cupTeams = shuffleArray([...bots]).slice(0, 7);
    const cupMatches: CupMatch[] = [
      { round: '1. Tur', opponent: cupTeams[0], played: false },
      { round: 'Çeyrek Final', opponent: cupTeams[1], played: false },
      { round: 'Yarı Final', opponent: cupTeams[2], played: false },
      { round: 'Final', opponent: cupTeams[3], played: false }
    ];

    const initialState: GameState = {
      teamName,
      teamLogo,
      team11,
      bench,
      league,
      fixture,
      marketList,
      week: 1,
      budget: 1500000,
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
        totalGoals: 0,
        totalWins: 0,
        totalDraws: 0,
        totalLosses: 0,
        cupWins: 0,
        leagueTitles: 0
      },
      tactics: {
        formation: '4-3-3',
        style: 'balanced',
        pressing: 'medium',
        tempo: 'normal'
      },
      investments: [...INITIAL_INVESTMENTS],
      cupMatches,
      cupEliminated: false,
      seasonObjective: 'İlk 5\'e gir',
      managerRep: 50,
      news: ['Yeni sezon heyecanla bekleniyor!', 'Transfer dönemi açıldı.'],
      shopBranches: []
    };

    setGameState(initialState);
  }, []);

  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const updatePlayer = useCallback((playerId: number, updates: Partial<Player>, isBench: boolean = false) => {
    setGameState(prev => {
      if (!prev) return null;
      
      if (isBench) {
        const newBench = prev.bench.map(p => 
          p.id === playerId ? { ...p, ...updates } : p
        );
        return { ...prev, bench: newBench };
      } else {
        const newTeam11 = prev.team11.map(p => 
          p.id === playerId ? { ...p, ...updates } : p
        );
        return { ...prev, team11: newTeam11 };
      }
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
        // Swap between team and bench
        const pos = { t: player1InTeam.t, l: player1InTeam.l, role: player1InTeam.role };
        newTeam11 = newTeam11.map(p => 
          p.id === playerId1 ? { ...player2InBench, ...pos } : p
        );
        newBench = newBench.filter(p => p.id !== playerId2);
        const { t, l, ...playerWithoutPos } = player1InTeam;
        newBench.push(playerWithoutPos as Player);
      } else if (player1InBench && player2InTeam) {
        // Swap between bench and team
        const pos = { t: player2InTeam.t, l: player2InTeam.l, role: player2InTeam.role };
        newTeam11 = newTeam11.map(p => 
          p.id === playerId2 ? { ...player1InBench, ...pos } : p
        );
        newBench = newBench.filter(p => p.id !== playerId1);
        const { t, l, ...playerWithoutPos } = player2InTeam;
        newBench.push(playerWithoutPos as Player);
      }

      return { ...prev, team11: newTeam11, bench: newBench };
    });
  }, []);

  const sellPlayer = useCallback((playerId: number, isBench: boolean) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const player = isBench 
        ? prev.bench.find(p => p.id === playerId)
        : prev.team11.find(p => p.id === playerId);
      
      if (!player) return prev;

      const sellValue = Math.floor(player.value * 0.8);
      
      if (isBench) {
        return {
          ...prev,
          bench: prev.bench.filter(p => p.id !== playerId),
          budget: prev.budget + sellValue,
          news: [`${player.name} $${sellValue.toLocaleString()} karşılığında satıldı.`, ...prev.news.slice(0, 4)]
        };
      } else {
        if (prev.bench.length === 0) return prev;
        
        const substitute = prev.bench[0];
        const pos = { t: player.t, l: player.l, role: player.role };
        
        return {
          ...prev,
          team11: prev.team11.map(p => 
            p.id === playerId ? { ...substitute, ...pos } : p
          ),
          bench: prev.bench.slice(1),
          budget: prev.budget + sellValue,
          news: [`${player.name} $${sellValue.toLocaleString()} karşılığında satıldı.`, ...prev.news.slice(0, 4)]
        };
      }
    });
  }, []);

  const buyPlayer = useCallback((player: Player, finalPrice?: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const price = finalPrice ?? player.value;
      if (prev.budget < price) return prev;

      return {
        ...prev,
        bench: [...prev.bench, { ...player, id: Date.now(), value: price }],
        marketList: prev.marketList.filter(p => p.id !== player.id),
        budget: prev.budget - price,
        news: [`${player.name} $${price.toLocaleString()} karşılığında transfer edildi!`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  const saveGame = useCallback(() => {
    if (gameState) {
      localStorage.setItem('ManagerPro2026_Save', JSON.stringify(gameState));
    }
  }, [gameState]);

  const loadGame = useCallback((): boolean => {
    const saved = localStorage.getItem('ManagerPro2026_Save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGameState(parsed);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  const refreshMarket = useCallback(() => {
    setGameState(prev => {
      if (!prev) return null;
      
      // Transfer listesi yenileme maliyeti: $200,000
      const refreshCost = 200000;
      if (prev.budget < refreshCost) {
        return prev; // Yeterli para yoksa değişiklik yapma
      }
      
      const baseOvr = 50 + (5 - prev.leagueLevel) * 10 + (prev.scoutLvl * 3);
      const posPool = ['KL', 'STP', 'SB', 'OS', 'FW'];
      const newMarket: Player[] = [];
      
      // Normal oyuncular (6-7 adet)
      const normalCount = 6 + Math.floor(Math.random() * 2);
      for (let i = 0; i < normalCount; i++) {
        const role = posPool[Math.floor(Math.random() * posPool.length)];
        newMarket.push(generatePlayer(role, baseOvr, baseOvr + 15 + prev.scoutLvl * 2, Date.now() + i));
      }

      // Nadir yıldız oyuncu şansı (%15)
      if (Math.random() < 0.15) {
        const starRole = posPool[Math.floor(Math.random() * posPool.length)];
        const starOvr = 88 + Math.floor(Math.random() * 8); // 88-95 OVR
        const starPlayer = generatePlayer(starRole, starOvr, starOvr + 5, Date.now() + 100);
        starPlayer.potential = Math.min(99, starOvr + Math.floor(Math.random() * 10) + 5); // Yüksek potansiyel
        starPlayer.value = starPlayer.ovr * 50000; // Pahalı
        starPlayer.wage = starPlayer.ovr * 2000;
        starPlayer.name = "⭐ " + starPlayer.name; // Yıldız işareti
        newMarket.push(starPlayer);
      }

      // Süper nadir efsane oyuncu şansı (%3)
      if (Math.random() < 0.03) {
        const legendRole = posPool[Math.floor(Math.random() * posPool.length)];
        const legendOvr = 96 + Math.floor(Math.random() * 4); // 96-99 OVR
        const legendPlayer = generatePlayer(legendRole, legendOvr, legendOvr, Date.now() + 200);
        legendPlayer.potential = Math.min(99, legendOvr + Math.floor(Math.random() * 5));
        legendPlayer.value = legendPlayer.ovr * 150000; // Çok pahalı
        legendPlayer.wage = legendPlayer.ovr * 5000;
        legendPlayer.name = "👑 " + legendPlayer.name; // Taç işareti
        legendPlayer.age = 28 + Math.floor(Math.random() * 5); // Yaşlı ama efsane
        newMarket.push(legendPlayer);
      }

      // Genç yetenek şansı (%25) - düşük OVR ama yüksek potansiyel
      if (Math.random() < 0.25) {
        const youthRole = posPool[Math.floor(Math.random() * posPool.length)];
        const youthOvr = 65 + Math.floor(Math.random() * 10); // 65-74 OVR
        const youthPlayer = generatePlayer(youthRole, youthOvr, youthOvr, Date.now() + 300);
        youthPlayer.age = 16 + Math.floor(Math.random() * 3); // 16-18 yaş
        youthPlayer.potential = 85 + Math.floor(Math.random() * 15); // 85-99 potansiyel!
        youthPlayer.value = youthPlayer.potential * 15000; // Potansiyele göre fiyat
        youthPlayer.wage = youthPlayer.ovr * 300;
        youthPlayer.name = "🌟 " + youthPlayer.name; // Genç yetenek işareti
        newMarket.push(youthPlayer);
      }

      return { 
        ...prev, 
        marketList: newMarket,
        budget: prev.budget - 200000, // Scout ücreti düş
        news: ['📋 Transfer listesi güncellendi. Scout ücreti: $200,000', ...prev.news.slice(0, 4)]
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

      return {
        ...prev,
        team11: newTeam11,
        tactics: { ...prev.tactics, formation: formationName }
      };
    });
  }, []);

  const updateTactics = useCallback((newTactics: Partial<Tactics>) => {
    setGameState(prev => {
      if (!prev) return null;
      return { ...prev, tactics: { ...prev.tactics, ...newTactics } };
    });
  }, []);

  const processMatchResult = useCallback((
    userScore: number, 
    oppScore: number, 
    opponent: Team,
    isCup: boolean = false
  ) => {
    setGameState(prev => {
      if (!prev) return null;

      const newState = { ...prev };
      
      // Update user team stats
      const userTeam = newState.league.find(t => t.isUser)!;
      userTeam.o++;
      userTeam.gf += userScore;
      userTeam.ga += oppScore;

      // Update club stats
      newState.clubStats.totalGoals += userScore;

      if (userScore > oppScore) {
        userTeam.g++;
        userTeam.p += 3;
        newState.clubStats.totalWins++;
        newState.managerRep = Math.min(100, newState.managerRep + 3);
      } else if (userScore === oppScore) {
        userTeam.b++;
        userTeam.p += 1;
        newState.clubStats.totalDraws++;
      } else {
        userTeam.m++;
        newState.clubStats.totalLosses++;
        newState.managerRep = Math.max(0, newState.managerRep - 2);
      }

      // Update opponent stats
      const oppTeam = newState.league.find(t => t.name === opponent.name);
      if (oppTeam) {
        oppTeam.o++;
        oppTeam.gf += oppScore;
        oppTeam.ga += userScore;
        if (oppScore > userScore) { oppTeam.g++; oppTeam.p += 3; }
        else if (oppScore === userScore) { oppTeam.b++; oppTeam.p += 1; }
        else { oppTeam.m++; }
      }

      // Simulate other matches
      const otherTeams = newState.league.filter(t => !t.isUser && t.name !== opponent.name);
      for (let i = 0; i < otherTeams.length - 1; i += 2) {
        const team1 = otherTeams[i];
        const team2 = otherTeams[i + 1];
        if (team1 && team2) {
          const score1 = Math.floor(Math.random() * 4);
          const score2 = Math.floor(Math.random() * 4);
          
          team1.o++; team2.o++;
          team1.gf += score1; team1.ga += score2;
          team2.gf += score2; team2.ga += score1;
          
          if (score1 > score2) { team1.g++; team1.p += 3; team2.m++; }
          else if (score1 === score2) { team1.b++; team1.p += 1; team2.b++; team2.p += 1; }
          else { team2.g++; team2.p += 3; team1.m++; }
        }
      }

      // Sort league
      newState.league.sort((a, b) => b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga));

      // Calculate match income
      const baseIncome = newState.stadiumLvl * 100000;
      const winBonus = userScore > oppScore ? 250000 : userScore === oppScore ? 75000 : 25000;
      const income = baseIncome + winBonus;
      newState.budget += income;

      // MAAŞ ÖDEMESİ + MAĞAZA GELİRİ - HER 5 MAÇTA BİR
      if (newState.week % 5 === 0) {
        const totalWages = [...newState.team11, ...newState.bench].reduce((acc, p) => acc + p.wage, 0);
        const wageBill = totalWages * 5;
        
        // MAĞAZA GELİRLERİ (5 haftalık)
        let shopIncome = 0;
        if (newState.shopBranches && newState.shopBranches.length > 0) {
          const sortedLeague = [...newState.league].sort((a2, b2) => b2.p - a2.p || (b2.gf - b2.ga) - (a2.gf - a2.ga));
          const leaguePosition = sortedLeague.findIndex(t2 => t2.isUser) + 1;
          const topOvr = [...newState.team11].sort((a2, b2) => b2.ovr - a2.ovr).slice(0, 3);
          
          const shopMultipliers: Record<string, number> = { small: 1, medium: 2.5, large: 5, flagship: 12 };
          
          newState.shopBranches.forEach((branch: { cityId: number; shopType: string }) => {
            const popMap: Record<number, number> = {};
            // Basit nüfus hesabı (tam cities import etmeden)
            [34, 6, 35, 16, 7].forEach(id => { popMap[id] = id === 34 ? 16000000 : id === 6 ? 5750000 : id === 35 ? 4420000 : id === 16 ? 3100000 : 2620000; });
            const pop = popMap[branch.cityId] || 500000;
            const popFactor = pop / 1000000;
            const posFactor = Math.max(1, (11 - leaguePosition) / 5);
            const starFactor = topOvr.length > 0 ? topOvr[0].ovr / 80 : 1;
            const mult = shopMultipliers[branch.shopType] || 1;
            
            shopIncome += Math.floor(5000 * mult * popFactor * posFactor * starFactor) * 5;
          });
        }
        
        newState.budget += shopIncome;
        newState.budget -= wageBill;
        
        if (newState.budget < 0) {
          newState.team11 = newState.team11.map(p => ({ ...p, morale: Math.max(0, p.morale - 15) }));
          newState.bench = newState.bench.map(p => ({ ...p, morale: Math.max(0, p.morale - 15) }));
          newState.news = [`⚠️ Maaşlar ödenemedi! Borç: $${Math.abs(newState.budget).toLocaleString()}`, ...newState.news.slice(0, 4)];
        } else {
          const netStr = shopIncome > 0 
            ? `💰 Maaş: -$${wageBill.toLocaleString()} | Forma satış: +$${shopIncome.toLocaleString()}`
            : `💰 5 haftalık maaşlar ödendi: -$${wageBill.toLocaleString()}`;
          newState.news = [netStr, ...newState.news.slice(0, 4)];
        }
      }

      // Player energy drain
      newState.team11 = newState.team11.map(p => ({
        ...p,
        energy: Math.max(0, p.energy - (10 - newState.healthLvl)),
        morale: p.morale + (userScore > oppScore ? 5 : userScore < oppScore ? -5 : 0)
      }));

      // Bench rest
      newState.bench = newState.bench.map(p => ({
        ...p,
        energy: Math.min(100, p.energy + 15 + newState.healthLvl * 2)
      }));

      // Add to match history
      if (!isCup) {
        newState.matchHistory.push({
          week: newState.week,
          opponent: opponent.name,
          opponentLogo: opponent.logo,
          homeScore: userScore,
          awayScore: oppScore,
          isHome: true
        });
      }

      // Sponsor income
      if (newState.activeSponsor) {
        newState.budget += newState.activeSponsor.income;
        newState.activeSponsor.weeksLeft--;
        if (newState.activeSponsor.weeksLeft <= 0) {
          newState.news = [`${newState.activeSponsor.name} sponsorluğu sona erdi.`, ...newState.news.slice(0, 4)];
          newState.activeSponsor = null;
        }
      }

      // Investment updates
      newState.investments = newState.investments.map(inv => {
        const change = Math.floor(Math.random() * 21) - 10;
        if (inv.owned > 0) {
          const profit = Math.floor((inv.price * inv.owned) * (change / 100));
          newState.budget += profit;
        }
        return { ...inv, lastChange: change };
      });

      // Injury recovery
      newState.team11 = newState.team11.map(p => {
        if (p.injured && p.injuryWeeks > 0) {
          const newInjuryWeeks = p.injuryWeeks - 1;
          return {
            ...p,
            injuryWeeks: newInjuryWeeks,
            injured: newInjuryWeeks > 0
          };
        }
        return p;
      });

      newState.bench = newState.bench.map(p => {
        if (p.injured && p.injuryWeeks > 0) {
          const newInjuryWeeks = p.injuryWeeks - 1;
          return {
            ...p,
            injuryWeeks: newInjuryWeeks,
            injured: newInjuryWeeks > 0
          };
        }
        return p;
      });

      // RAKİP TAKIMLARIN TRANSFERLERİ
      // Her hafta %30 şansla bir rakip transfer yapar
      if (Math.random() < 0.30) {
        const botTeams = newState.league.filter(t => !t.isUser);
        const transferringTeam = botTeams[Math.floor(Math.random() * botTeams.length)];
        
        if (transferringTeam) {
          // Transfer türü: %60 güçlendirme, %40 genç yetenek
          const isYouthTransfer = Math.random() < 0.4;
          
          let ovrChange: number;
          let transferNews: string;
          
          if (isYouthTransfer) {
            // Genç yetenek transferi - gelecek için yatırım
            ovrChange = Math.floor(Math.random() * 2); // 0-1 OVR artış
            transferNews = `📰 ${transferringTeam.name} genç bir yetenek transfer etti!`;
          } else {
            // Yıldız transfer - anında güç
            ovrChange = 1 + Math.floor(Math.random() * 3); // 1-3 OVR artış
            transferNews = `🔥 ${transferringTeam.name} yıldız bir oyuncu transfer etti! (+${ovrChange} OVR)`;
          }
          
          // Takımın OVR'ını güncelle
          transferringTeam.ovr = Math.min(95, transferringTeam.ovr + ovrChange);
          
          // Haberlere ekle
          newState.news = [transferNews, ...newState.news.slice(0, 4)];
        }
      }

      // Sezon ortasında (hafta 9) ve sezon sonunda büyük transfer dönemi
      if (newState.week === 9 || newState.week === 18) {
        const botTeams = newState.league.filter(t => !t.isUser);
        
        // Her takım için transfer şansı
        botTeams.forEach(team => {
          // Ligdeki sıraya göre transfer şansı - kötü takımlar daha çok transfer yapar
          const teamRank = newState.league.findIndex(t => t.name === team.name) + 1;
          const transferChance = teamRank > 5 ? 0.7 : 0.4; // Alt sıradakiler daha aktif
          
          if (Math.random() < transferChance) {
            const ovrBoost = 1 + Math.floor(Math.random() * 4); // 1-4 OVR
            team.ovr = Math.min(95, team.ovr + ovrBoost);
          }
        });
        
        const periodName = newState.week === 9 ? 'Ara transfer dönemi' : 'Yaz transfer dönemi';
        newState.news = [`📋 ${periodName} sona erdi. Rakipler güçlendi!`, ...newState.news.slice(0, 4)];
      }

      if (!isCup) {
        newState.week++;
      }

      return newState;
    });
  }, []);

  const hireStaff = useCallback((type: Staff['type'], cost: number) => {
    setGameState(prev => {
      if (!prev || prev.budget < cost) return prev;
      
      const names: Record<Staff['type'], string> = {
        coach: 'Antrenör',
        scout: 'Scout',
        physio: 'Fizyoterapist',
        analyst: 'Analist'
      };

      const newStaff: Staff = {
        id: Date.now(),
        type,
        name: names[type],
        level: 1,
        salary: Math.floor(cost * 0.1)
      };

      let updates: Partial<GameState> = {
        staff: [...prev.staff, newStaff],
        budget: prev.budget - cost
      };

      // Apply staff bonuses
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

  const upgradeFacility = useCallback((type: 'stadium' | 'training' | 'academy', cost: number) => {
    setGameState(prev => {
      if (!prev || prev.budget < cost) return prev;

      const updates: Partial<GameState> = {
        budget: prev.budget - cost
      };

      if (type === 'stadium') {
        updates.stadiumLvl = prev.stadiumLvl + 1;
      } else if (type === 'training') {
        updates.trainingLvl = prev.trainingLvl + 1;
        updates.team11 = prev.team11.map(p => ({ ...p, ovr: Math.min(99, p.ovr + 1) }));
        updates.bench = prev.bench.map(p => ({ ...p, ovr: Math.min(99, p.ovr + 1) }));
      } else if (type === 'academy') {
        updates.academyLevel = prev.academyLevel + 1;
      }

      return { ...prev, ...updates };
    });
  }, []);

  const discoverYouthPlayer = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.budget < 50000) return prev;

      const chance = 0.4 + (prev.academyLevel * 0.1);
      if (Math.random() < chance) {
        const posPool = ['KL', 'STP', 'SB', 'OS', 'FW'];
        const role = posPool[Math.floor(Math.random() * posPool.length)];
        const player = generatePlayer(role, 55 + prev.academyLevel * 5, 70 + prev.academyLevel * 5, Date.now());
        player.age = 16 + Math.floor(Math.random() * 3);
        
        return {
          ...prev,
          academyPlayers: [...prev.academyPlayers, player],
          budget: prev.budget - 50000,
          news: [`Yetenek keşfedildi: ${player.name} (${player.ovr})`, ...prev.news.slice(0, 4)]
        };
      }

      return {
        ...prev,
        budget: prev.budget - 50000,
        news: ['Yetenek araması başarısız oldu.', ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  const promoteYouthPlayer = useCallback((playerId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const player = prev.academyPlayers.find(p => p.id === playerId);
      if (!player) return prev;

      return {
        ...prev,
        bench: [...prev.bench, player],
        academyPlayers: prev.academyPlayers.filter(p => p.id !== playerId),
        news: [`${player.name} A takıma yükseldi!`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  const buyInvestment = useCallback((investmentId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const inv = prev.investments.find(i => i.id === investmentId);
      if (!inv || prev.budget < inv.price) return prev;

      return {
        ...prev,
        investments: prev.investments.map(i => 
          i.id === investmentId ? { ...i, owned: i.owned + 1 } : i
        ),
        budget: prev.budget - inv.price
      };
    });
  }, []);

  const sellInvestment = useCallback((investmentId: number) => {
    setGameState(prev => {
      if (!prev) return null;
      
      const inv = prev.investments.find(i => i.id === investmentId);
      if (!inv || inv.owned <= 0) return prev;

      const sellPrice = Math.floor(inv.price * (1 + inv.lastChange / 100));

      return {
        ...prev,
        investments: prev.investments.map(i => 
          i.id === investmentId ? { ...i, owned: i.owned - 1 } : i
        ),
        budget: prev.budget + sellPrice
      };
    });
  }, []);

  const trainPlayer = useCallback((playerId: number, _attribute: string) => {
    setGameState(prev => {
      if (!prev || prev.budget < 25000) return prev;

      const updatePlayerOvr = (player: Player): Player => {
        if (player.id !== playerId) return player;
        
        // Calculate training effect based on age and facilities
        const ageFactor = player.age < 23 ? 2 : player.age < 28 ? 1 : 0.5;
        const facilityBonus = prev.trainingLvl * 0.3;
        const improvement = Math.max(1, Math.round(ageFactor + facilityBonus));
        
        const newOvr = Math.min(player.potential, player.ovr + improvement);
        const newValue = newOvr * 15000 * (player.age < 23 ? 1.3 : player.age > 30 ? 0.7 : 1);
        
        return {
          ...player,
          ovr: newOvr,
          value: Math.floor(newValue)
        };
      };

      const inTeam = prev.team11.find(p => p.id === playerId);
      
      return {
        ...prev,
        team11: inTeam ? prev.team11.map(updatePlayerOvr) : prev.team11,
        bench: !inTeam ? prev.bench.map(updatePlayerOvr) : prev.bench,
        budget: prev.budget - 25000,
        news: [`Oyuncu antrenmanı tamamlandı!`, ...prev.news.slice(0, 4)]
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

      const newBranch = {
        id: `${cityId}-${district}-${Date.now()}`,
        cityId,
        district,
        shopType,
        openedWeek: prev.week
      };

      return {
        ...prev,
        shopBranches: [...prev.shopBranches, newBranch],
        budget: prev.budget - cost,
        news: [`🏪 ${city.name}/${district} şubesinde ${shopType === 'flagship' ? 'Flagship' : shopType === 'large' ? 'Mega' : shopType === 'medium' ? 'Standart' : 'Mini'} mağaza açıldı!`, ...prev.news.slice(0, 4)]
      };
    });
  }, []);

  return {
    gameState,
    isLoading,
    initializeGame,
    updateGameState,
    updatePlayer,
    swapPlayers,
    sellPlayer,
    buyPlayer,
    saveGame,
    loadGame,
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
  };
};
