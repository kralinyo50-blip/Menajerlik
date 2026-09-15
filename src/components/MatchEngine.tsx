import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Team, MatchEvent } from '../types/game';
import { MATCH_EVENTS } from '../data/constants';

interface MatchEngineProps {
  gameState: GameState;
  opponent: Team;
  onMatchEnd: (userScore: number, oppScore: number, scorers: { playerId: number; goals: number; assists: number }[]) => void;
}

export const MatchEngine: React.FC<MatchEngineProps> = ({ gameState, opponent, onMatchEnd }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [minute, setMinute] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [substitutions, setSubstitutions] = useState<number[]>([]);
  const [showSubModal, setShowSubModal] = useState(false);
  const [scorers, setScorers] = useState<Map<number, { goals: number; assists: number }>>(new Map());
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Calculate team strength based on tactics
  const calculateStrength = useCallback(() => {
    // Ham OVR - sidebar ile aynı hesaplama
    const avgOvr = gameState.team11.length > 0 
      ? Math.floor(gameState.team11.reduce((acc, p) => acc + p.ovr, 0) / gameState.team11.length)
      : 0;
    
    const avgEnergy = gameState.team11.reduce((acc, p) => acc + p.energy, 0) / 11;
    const avgMorale = gameState.team11.reduce((acc, p) => acc + p.morale, 0) / 11;

    let attackBonus = 0;
    let defenseBonus = 0;

    // Tactical bonuses
    if (gameState.tactics.style === 'attack') { attackBonus += 12; defenseBonus -= 8; }
    if (gameState.tactics.style === 'defense') { attackBonus -= 8; defenseBonus += 12; }
    if (gameState.tactics.style === 'possession') { attackBonus += 5; defenseBonus += 5; }

    if (gameState.tactics.pressing === 'high') { attackBonus += 5; }
    if (gameState.tactics.pressing === 'low') { defenseBonus += 5; }

    if (gameState.tactics.tempo === 'fast') { attackBonus += 7; }
    if (gameState.tactics.tempo === 'slow') { defenseBonus += 7; }

    // Energy and morale impact - maç gücü için kullanılır
    const energyMultiplier = avgEnergy / 100;
    const moraleMultiplier = 0.8 + (avgMorale / 500);

    return {
      attack: (avgOvr + attackBonus) * energyMultiplier * moraleMultiplier,
      defense: (avgOvr + defenseBonus) * energyMultiplier * moraleMultiplier,
      overall: avgOvr, // Ham OVR göster (sidebar ile aynı)
      effectiveOverall: avgOvr * energyMultiplier * moraleMultiplier // Maç için efektif güç
    };
  }, [gameState]);

  const userStrength = calculateStrength();
  const oppStrength = {
    attack: opponent.ovr,
    defense: opponent.ovr,
    overall: opponent.ovr
  };

  const addEvent = useCallback((event: MatchEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const getRandomPlayer = useCallback((forGoal: boolean = false): Player => {
    const activePlayers = gameState.team11.filter(p => !p.injured);
    if (forGoal) {
      // Weighted selection - forwards more likely to score
      const weights = activePlayers.map(p => {
        if (p.role === 'FW') return 4;
        if (p.role === 'OS') return 2;
        return 1;
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < activePlayers.length; i++) {
        random -= weights[i];
        if (random <= 0) return activePlayers[i];
      }
    }
    return activePlayers[Math.floor(Math.random() * activePlayers.length)];
  }, [gameState.team11]);

  const simulateMinute = useCallback((currentMinute: number) => {
    // Base chance for events
    const eventChance = Math.random();

    if (eventChance < 0.18) {
      // OVR FARKI HESAPLAMASI - ÇOK ÖNEMLİ
      // Fark ne kadar büyükse, güçlü takım o kadar baskın
      const ovrDiff = userStrength.overall - oppStrength.overall;
      
      // Pozitif = biz güçlüyüz, negatif = rakip güçlü
      // Her 5 OVR farkı için %10 bonus/ceza
      const dominanceFactor = 0.5 + (ovrDiff * 0.02); // 0.3 - 0.7 arası
      const userDominance = Math.max(0.25, Math.min(0.85, dominanceFactor));
      
      // Attack event - OVR farkına göre kimin atağı olacağı
      const isUserAttack = Math.random() < userDominance;

      if (isUserAttack) {
        // User attack - OVR farkı gol şansını etkiler
        // Baz şans + OVR farkı bonusu
        const baseGoalChance = 0.25;
        const ovrBonus = Math.max(-0.15, Math.min(0.25, ovrDiff * 0.008)); // -15% ile +25% arası
        const goalChance = baseGoalChance + ovrBonus;
        
        const roll = Math.random();

        if (roll < goalChance) {
          // Goal!
          const scorer = getRandomPlayer(true);
          const template = MATCH_EVENTS.goals[Math.floor(Math.random() * MATCH_EVENTS.goals.length)];
          
          setUserScore(prev => prev + 1);
          setScorers(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(scorer.id) || { goals: 0, assists: 0 };
            newMap.set(scorer.id, { ...current, goals: current.goals + 1 });
            
            // Random assist
            if (Math.random() > 0.3) {
              const assister = getRandomPlayer(false);
              if (assister.id !== scorer.id) {
                const assistCurrent = newMap.get(assister.id) || { goals: 0, assists: 0 };
                newMap.set(assister.id, { ...assistCurrent, assists: assistCurrent.assists + 1 });
              }
            }
            return newMap;
          });
          
          addEvent({
            minute: currentMinute,
            type: 'goal',
            team: 'home',
            player: scorer.name,
            description: template.replace('{player}', scorer.name)
          });
        } else if (roll < goalChance + 0.25) {
          // Chance - missed or saved
          const player = getRandomPlayer(true);
          addEvent({
            minute: currentMinute,
            type: 'chance',
            team: 'home',
            player: player.name,
            description: `${player.name} şut çekti ama kaleci kurtardı!`
          });
        } else if (roll < goalChance + 0.4) {
          addEvent({
            minute: currentMinute,
            type: 'save',
            team: 'home',
            description: MATCH_EVENTS.saves[Math.floor(Math.random() * MATCH_EVENTS.saves.length)]
          });
        }
      } else {
        // Opponent attack - OVR farkı rakibin gol şansını düşürür
        const baseGoalChance = 0.20;
        const ovrPenalty = Math.max(-0.15, Math.min(0.15, -ovrDiff * 0.006)); // Bizim OVR yüksekse rakibin şansı düşer
        const goalChance = Math.max(0.05, baseGoalChance + ovrPenalty); // Minimum %5 şans
        
        const roll = Math.random();

        if (roll < goalChance) {
          // Opponent goal
          setOppScore(prev => prev + 1);
          addEvent({
            minute: currentMinute,
            type: 'goal',
            team: 'away',
            description: `❌ ${opponent.name} gol buldu!`
          });
        } else if (roll < goalChance + 0.2) {
          addEvent({
            minute: currentMinute,
            type: 'chance',
            team: 'away',
            description: `${opponent.name} tehlikeli bir atak geliştiriyor...`
          });
        } else if (roll < goalChance + 0.35) {
          // Bizim savunma kurtardı
          addEvent({
            minute: currentMinute,
            type: 'save',
            team: 'home',
            description: `Savunma araya girdi! ${opponent.name} atağı boşa çıktı.`
          });
        }
      }
    }

    // Injury chance (very low)
    if (Math.random() < 0.004 && currentMinute > 15) {
      const player = getRandomPlayer();
      if (!player.injured) {
        addEvent({
          minute: currentMinute,
          type: 'injury',
          team: 'home',
          player: player.name,
          description: MATCH_EVENTS.injuries[Math.floor(Math.random() * MATCH_EVENTS.injuries.length)].replace('{player}', player.name)
        });
      }
    }
  }, [userStrength, oppStrength, opponent.name, addEvent, getRandomPlayer]);

  const startMatch = useCallback(() => {
    setIsPlaying(true);
    addEvent({
      minute: 0,
      type: 'chance',
      team: 'home',
      description: '🏟️ Hakem düdüğü çaldı, maç başladı!'
    });

    intervalRef.current = setInterval(() => {
      setMinute(prev => {
        const newMinute = prev + 1;
        
        if (newMinute === 45) {
          addEvent({
            minute: 45,
            type: 'chance',
            team: 'home',
            description: '⏱️ İlk yarı sona erdi.'
          });
        }

        if (newMinute === 46) {
          addEvent({
            minute: 46,
            type: 'chance',
            team: 'home',
            description: '🏟️ İkinci yarı başladı!'
          });
        }

        if (newMinute >= 90) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsPlaying(false);
          setIsFinished(true);
          addEvent({
            minute: 90,
            type: 'chance',
            team: 'home',
            description: '🔔 Maç sona erdi!'
          });
          return 90;
        }

        simulateMinute(newMinute);
        return newMinute;
      });
    }, 100); // Speed of simulation
  }, [addEvent, simulateMinute]);

  const handleFinish = () => {
    const scorerArray = Array.from(scorers.entries()).map(([playerId, stats]) => ({
      playerId,
      goals: stats.goals,
      assists: stats.assists
    }));
    onMatchEnd(userScore, oppScore, scorerArray);
  };

  const makeSubstitution = (outId: number, _inId: number) => {
    if (substitutions.length >= 3) return;
    setSubstitutions(prev => [...prev, outId]);
    addEvent({
      minute,
      type: 'substitution',
      team: 'home',
      description: `🔄 Oyuncu değişikliği yapıldı.`
    });
    setShowSubModal(false);
  };
  
  // Use makeSubstitution to avoid lint error
  void makeSubstitution;

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getResultText = () => {
    if (userScore > oppScore) return { text: 'GALİBİYET', color: 'text-emerald-400', bg: 'from-emerald-500/20' };
    if (userScore < oppScore) return { text: 'MAĞLUBİYET', color: 'text-red-400', bg: 'from-red-500/20' };
    return { text: 'BERABERLİK', color: 'text-slate-400', bg: 'from-slate-500/20' };
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 lg:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-gradient-to-b from-emerald-900 to-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-2 lg:p-4">
          <div className="text-center text-white text-xs lg:text-sm font-medium">
            Lig {gameState.leagueLevel} • Hafta {gameState.week}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-4 lg:p-8">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {/* Home Team */}
            <div className="text-center flex-1">
              <div className="text-3xl lg:text-5xl mb-1 lg:mb-2">{gameState.teamLogo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{gameState.teamName}</div>
              <div className="text-emerald-400 text-xs font-bold">OVR: {userStrength.overall}</div>
            </div>

            {/* Score */}
            <div className="px-3 lg:px-8">
              <div className="text-4xl lg:text-6xl font-black text-white flex items-center gap-2 lg:gap-4">
                <span className={userScore > oppScore ? 'text-emerald-400' : ''}>{userScore}</span>
                <span className="text-slate-500">-</span>
                <span className={oppScore > userScore ? 'text-red-400' : ''}>{oppScore}</span>
              </div>
              <div className="text-center mt-2 lg:mt-4">
                <div className="text-2xl lg:text-4xl font-black text-amber-400 font-mono">
                  {minute < 10 ? '0' : ''}{minute}:00
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div className="text-center flex-1">
              <div className="text-3xl lg:text-5xl mb-1 lg:mb-2">{opponent.logo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{opponent.name}</div>
              <div className="text-slate-400 text-xs">OVR: {opponent.ovr}</div>
            </div>
          </div>
        </div>

        {/* Match Console */}
        <div className="p-2 lg:p-4">
          <div className="bg-black/50 rounded-xl lg:rounded-2xl border border-emerald-500/30 h-40 lg:h-64 overflow-y-auto p-3 lg:p-4 font-mono text-xs lg:text-sm">
            {events.map((event, i) => (
              <div 
                key={i} 
                className={`mb-2 ${
                  event.type === 'goal' 
                    ? event.team === 'home' ? 'text-emerald-400' : 'text-red-400'
                    : event.type === 'injury' 
                    ? 'text-orange-400'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-slate-500">[{event.minute}']</span> {event.description}
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        </div>

        {/* Controls */}
        <div className="p-2 lg:p-4 bg-slate-900/50 flex gap-3 justify-center">
          {!isPlaying && !isFinished && (
            <button
              onClick={startMatch}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm lg:text-lg rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
            >
              ▶️ Maçı Başlat
            </button>
          )}

          {isPlaying && (
            <>
              <button
                onClick={() => setShowSubModal(true)}
                disabled={substitutions.length >= 3}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium rounded-xl transition-all"
              >
                🔄 Değişiklik ({3 - substitutions.length})
              </button>
            </>
          )}

          {isFinished && (
            <div className="w-full">
              <div className={`text-center py-4 bg-gradient-to-r ${getResultText().bg} to-transparent rounded-xl mb-4`}>
                <span className={`text-3xl font-black ${getResultText().color}`}>
                  {getResultText().text}
                </span>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleFinish}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all"
                >
                  ✓ Devam Et
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Substitution Modal */}
        {showSubModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Oyuncu Değişikliği</h3>
              <p className="text-slate-400 text-sm mb-4">Kalan hak: {3 - substitutions.length}</p>
              
              <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                <div>
                  <h4 className="text-sm text-emerald-400 mb-2">Çıkacak</h4>
                  {gameState.team11.filter(p => !substitutions.includes(p.id)).map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded mb-1 text-sm"
                    >
                      {p.name} ({p.ovr})
                    </button>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm text-blue-400 mb-2">Girecek</h4>
                  {gameState.bench.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded mb-1 text-sm"
                    >
                      {p.name} ({p.ovr})
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowSubModal(false)}
                className="w-full mt-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
