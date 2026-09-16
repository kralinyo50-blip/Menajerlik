import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Team, MatchEvent } from '../types/game';
import { MATCH_EVENTS } from '../data/constants';
import { DIFFICULTY_CONFIG } from '../data/achievements';
import { InGameMinigame, MinigameContext, MinigameResult } from './InGameMinigames';

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
  const [subOut, setSubOut] = useState<number | null>(null);
  const [scorers, setScorers] = useState<Map<number, { goals: number; assists: number }>>(new Map());
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [possession, setPossession] = useState(50);
  const [shots, setShots] = useState({ home: 0, away: 0 });
  const [activeLineup, setActiveLineup] = useState<Player[]>(() => [...gameState.team11]);
  const [activeBench, setActiveBench] = useState<Player[]>(() => [...gameState.bench]);
  const [matchMinigame, setMatchMinigame] = useState<MinigameContext | null>(null);
  const [pendingScorer, setPendingScorer] = useState<Player | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speed);
  const finishedRef = useRef(false);
  const pausedRef = useRef(false);
  const mgCountRef = useRef(0); // max minigames per match
  const userScoreRef = useRef(0);
  const oppScoreRef = useRef(0);

  // Keep speed ref in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { userScoreRef.current = userScore; }, [userScore]);
  useEffect(() => { oppScoreRef.current = oppScore; }, [oppScore]);

  const difficulty = gameState.difficulty || 'normal';
  const diffCfg = DIFFICULTY_CONFIG[difficulty];

  const calculateStrength = useCallback(() => {
    const players = activeLineup.filter(p => !p.injured && !substitutions.includes(p.id));
    const pool = players.length > 0 ? players : activeLineup;
    const avgOvr = pool.length > 0
      ? Math.floor(pool.reduce((acc, p) => acc + p.ovr, 0) / pool.length)
      : 0;
    
    const avgEnergy = pool.reduce((acc, p) => acc + p.energy, 0) / Math.max(1, pool.length);
    const avgMorale = pool.reduce((acc, p) => acc + p.morale, 0) / Math.max(1, pool.length);
    const chemistry = (gameState.teamChemistry || 50) / 100;

    let attackBonus = 0;
    let defenseBonus = 0;

    if (gameState.tactics.style === 'attack') { attackBonus += 12; defenseBonus -= 8; }
    if (gameState.tactics.style === 'defense') { attackBonus -= 8; defenseBonus += 12; }
    if (gameState.tactics.style === 'possession') { attackBonus += 5; defenseBonus += 5; }
    if (gameState.tactics.pressing === 'high') { attackBonus += 5; }
    if (gameState.tactics.pressing === 'low') { defenseBonus += 5; }
    if (gameState.tactics.tempo === 'fast') { attackBonus += 7; }
    if (gameState.tactics.tempo === 'slow') { defenseBonus += 7; }

    // Analyst staff bonus
    const hasAnalyst = gameState.staff?.some(s => s.type === 'analyst');
    if (hasAnalyst) { attackBonus += 3; defenseBonus += 3; }

    const energyMultiplier = 0.7 + (avgEnergy / 100) * 0.3;
    const moraleMultiplier = 0.85 + (avgMorale / 100) * 0.15;
    const chemBonus = 0.9 + chemistry * 0.1;

    return {
      attack: (avgOvr + attackBonus) * energyMultiplier * moraleMultiplier * chemBonus,
      defense: (avgOvr + defenseBonus) * energyMultiplier * moraleMultiplier * chemBonus,
      overall: avgOvr,
      effectiveOverall: avgOvr * energyMultiplier * moraleMultiplier * chemBonus
    };
  }, [gameState, activeLineup, substitutions]);

  const userStrength = calculateStrength();
  const oppOvr = Math.floor(opponent.ovr * (diffCfg?.oppOvrMult || 1));
  const oppStrength = {
    attack: oppOvr,
    defense: oppOvr,
    overall: oppOvr
  };

  const addEvent = useCallback((event: MatchEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const getRandomPlayer = useCallback((forGoal: boolean = false): Player => {
    const activePlayers = activeLineup.filter(p => !p.injured && !substitutions.includes(p.id));
    const pool = activePlayers.length > 0 ? activePlayers : activeLineup;
    if (forGoal) {
      const weights = pool.map(p => {
        if (p.role === 'FW') return 5;
        if (p.role === 'OS') return 2.5;
        if (p.role === 'SB') return 1.2;
        return 0.5;
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < pool.length; i++) {
        random -= weights[i];
        if (random <= 0) return pool[i];
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, [activeLineup, substitutions]);

  const simulateMinute = useCallback((currentMinute: number) => {
    const eventChance = Math.random();

    // Possession drift
    if (Math.random() < 0.3) {
      const ovrDiff = userStrength.effectiveOverall - oppStrength.overall;
      const drift = (Math.random() - 0.5) * 6 + ovrDiff * 0.15;
      setPossession(prev => Math.max(25, Math.min(75, prev + drift)));
    }

    if (eventChance < 0.20) {
      const ovrDiff = userStrength.effectiveOverall - oppStrength.overall;
      const dominanceFactor = 0.5 + (ovrDiff * 0.02);
      const userDominance = Math.max(0.22, Math.min(0.82, dominanceFactor));
      const isUserAttack = Math.random() < userDominance;

      if (isUserAttack) {
        const baseGoalChance = 0.22;
        const ovrBonus = Math.max(-0.12, Math.min(0.28, ovrDiff * 0.01));
        const goalChance = baseGoalChance + ovrBonus;
        const roll = Math.random();
        setShots(s => ({ ...s, home: s.home + 1 }));

        if (roll < goalChance) {
          // Interactive set-piece minigame (penaltı / frikik) — max 2 per match
          if (mgCountRef.current < 2 && Math.random() < 0.22 && !pausedRef.current) {
            const scorer = getRandomPlayer(true);
            const isPen = Math.random() < 0.55;
            mgCountRef.current += 1;
            pausedRef.current = true;
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            setPendingScorer(scorer);
            setIsPlaying(false);
            addEvent({
              minute: currentMinute,
              type: 'info',
              team: 'home',
              description: isPen
                ? `⏸️ PENALTI! ${scorer.name} topun başında — sen kullan!`
                : `⏸️ TEHLİKELİ FRİKİK! ${scorer.name} vuracak — sen kontrol et!`
            });
            setMatchMinigame({
              type: isPen ? 'penalty' : 'freekick',
              title: isPen ? 'Penaltı!' : 'Frikik!',
              description: `${currentMinute}' — ${scorer.name}`,
              inMatch: true,
              playerName: scorer.name
            });
            return; // pause simulation
          } else {
            const scorer = getRandomPlayer(true);
            const template = MATCH_EVENTS.goals[Math.floor(Math.random() * MATCH_EVENTS.goals.length)];
            
            setUserScore(prev => prev + 1);
            setScorers(prev => {
              const newMap = new Map(prev);
              const current = newMap.get(scorer.id) || { goals: 0, assists: 0 };
              newMap.set(scorer.id, { ...current, goals: current.goals + 1 });
              
              if (Math.random() > 0.3) {
                const assister = getRandomPlayer(false);
                if (assister.id !== scorer.id) {
                  const assistCurrent = newMap.get(assister.id) || { goals: 0, assists: 0 };
                  newMap.set(assister.id, { ...assistCurrent, assists: assistCurrent.assists + 1 });
                  addEvent({
                    minute: currentMinute,
                    type: 'goal',
                    team: 'home',
                    player: scorer.name,
                    description: template.replace('{player}', scorer.name) + ` (Asist: ${assister.name})`
                  });
                  return newMap;
                }
              }
              addEvent({
                minute: currentMinute,
                type: 'goal',
                team: 'home',
                player: scorer.name,
                description: template.replace('{player}', scorer.name)
              });
              return newMap;
            });
          }
        } else if (roll < goalChance + 0.3) {
          const player = getRandomPlayer(true);
          addEvent({
            minute: currentMinute,
            type: 'chance',
            team: 'home',
            player: player.name,
            description: `${player.name} şut çekti ama kaleci kurtardı!`
          });
        } else if (roll < goalChance + 0.45) {
          addEvent({
            minute: currentMinute,
            type: 'save',
            team: 'home',
            description: MATCH_EVENTS.saves[Math.floor(Math.random() * MATCH_EVENTS.saves.length)]
          });
        }
      } else {
        setShots(s => ({ ...s, away: s.away + 1 }));
        const baseGoalChance = 0.18;
        const ovrPenalty = Math.max(-0.12, Math.min(0.18, -ovrDiff * 0.008));
        const goalChance = Math.max(0.06, baseGoalChance + ovrPenalty);
        const roll = Math.random();

        if (roll < goalChance) {
          // Keeper save minigame chance on dangerous opponent chance
          if (mgCountRef.current < 2 && Math.random() < 0.28 && !pausedRef.current) {
            mgCountRef.current += 1;
            pausedRef.current = true;
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            setIsPlaying(false);
            addEvent({
              minute: currentMinute,
              type: 'info',
              team: 'away',
              description: `⏸️ RAKİP PENALTI / NET POZİSYON! Kaleci, kurtar!`
            });
            setMatchMinigame({
              type: 'keeper_save',
              title: 'Kaleci Anı!',
              description: `${currentMinute}' — ${opponent.name} tehlikeli pozisyon`,
              inMatch: true,
              playerName: 'Kaleci'
            });
            return;
          }
          setOppScore(prev => prev + 1);
          addEvent({
            minute: currentMinute,
            type: 'goal',
            team: 'away',
            description: `❌ ${opponent.name} gol buldu!`
          });
        } else if (roll < goalChance + 0.25) {
          addEvent({
            minute: currentMinute,
            type: 'chance',
            team: 'away',
            description: `${opponent.name} tehlikeli bir atak geliştiriyor...`
          });
        } else if (roll < goalChance + 0.4) {
          addEvent({
            minute: currentMinute,
            type: 'save',
            team: 'home',
            description: `Savunma araya girdi! ${opponent.name} atağı boşa çıktı.`
          });
        }
      }
    }

    // Card chance
    if (Math.random() < 0.015 && currentMinute > 10) {
      const player = getRandomPlayer();
      const isRed = Math.random() < 0.12;
      addEvent({
        minute: currentMinute,
        type: 'card',
        team: 'home',
        player: player.name,
        description: isRed
          ? `🟥 ${player.name} kırmızı kart gördü!`
          : `🟨 ${player.name} sarı kart gördü.`
      });
    }

    // Injury chance
    const injuryChance = 0.004 * (diffCfg?.injuryMult || 1);
    if (Math.random() < injuryChance && currentMinute > 15) {
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

    // Commentary flavor
    if (Math.random() < 0.04) {
      const comments = [
        'Orta saha mücadelesi kızışıyor...',
        'Taraftarlar ayakta!',
        'Teknik direktörler kenarda talimat veriyor.',
        'Tempo yükseliyor!',
        'Hava durumu maçı etkiliyor...',
        `${gameState.teamName} baskı kuruyor.`,
        `${opponent.name} kontra arıyor.`
      ];
      addEvent({
        minute: currentMinute,
        type: 'info',
        team: 'home',
        description: comments[Math.floor(Math.random() * comments.length)]
      });
    }
  }, [userStrength, oppStrength, opponent.name, gameState.teamName, addEvent, getRandomPlayer, diffCfg]);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startMatch = useCallback(() => {
    setIsPlaying(true);
    finishedRef.current = false;
    addEvent({
      minute: 0,
      type: 'info',
      team: 'home',
      description: '🏟️ Hakem düdüğü çaldı, maç başladı!'
    });

    const tick = () => {
      if (pausedRef.current || finishedRef.current) return;
      setMinute(prev => {
        const newMinute = prev + 1;
        
        if (newMinute === 45) {
          addEvent({
            minute: 45,
            type: 'info',
            team: 'home',
            description: '⏱️ İlk yarı sona erdi.'
          });
        }

        if (newMinute === 46) {
          addEvent({
            minute: 46,
            type: 'info',
            team: 'home',
            description: '🏟️ İkinci yarı başladı!'
          });
        }

        // Injury time
        const endMinute = 90 + Math.floor(Math.random() * 4);

        if (newMinute >= endMinute || newMinute >= 94) {
          clearTimer();
          setIsPlaying(false);
          setIsFinished(true);
          finishedRef.current = true;
          addEvent({
            minute: newMinute,
            type: 'info',
            team: 'home',
            description: '🔔 Maç sona erdi!'
          });
          return Math.min(newMinute, 94);
        }

        simulateMinute(newMinute);
        return newMinute;
      });
    };

    clearTimer();
    intervalRef.current = setInterval(tick, 1000 / speedRef.current / 2.5);
  }, [addEvent, simulateMinute]);

  // Restart interval when speed changes during play
  useEffect(() => {
    if (!isPlaying || isFinished) return;
    clearTimer();
    const tick = () => {
      if (pausedRef.current || finishedRef.current) return;
      setMinute(prev => {
        if (finishedRef.current) return prev;
        const newMinute = prev + 1;
        if (newMinute === 45) {
          addEvent({ minute: 45, type: 'info', team: 'home', description: '⏱️ İlk yarı sona erdi.' });
        }
        if (newMinute === 46) {
          addEvent({ minute: 46, type: 'info', team: 'home', description: '🏟️ İkinci yarı başladı!' });
        }
        if (newMinute >= 90) {
          clearTimer();
          setIsPlaying(false);
          setIsFinished(true);
          finishedRef.current = true;
          addEvent({ minute: 90, type: 'info', team: 'home', description: '🔔 Maç sona erdi!' });
          return 90;
        }
        simulateMinute(newMinute);
        return newMinute;
      });
    };
    intervalRef.current = setInterval(tick, 1000 / speed / 2.5);
    return clearTimer;
  }, [speed, isPlaying, isFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipMatch = () => {
    clearTimer();
    pausedRef.current = false;
    setMatchMinigame(null);
    mgCountRef.current = 99; // no minigames during skip
    // Fast-forward remaining minutes
    let m = minute;
    while (m < 90) {
      m++;
      simulateMinute(m);
    }
    setMinute(90);
    setIsPlaying(false);
    setIsFinished(true);
    finishedRef.current = true;
    addEvent({
      minute: 90,
      type: 'info',
      team: 'home',
      description: '🔔 Maç sona erdi! (Atlandı)'
    });
  };

  const resumeMatch = useCallback(() => {
    pausedRef.current = false;
    setMatchMinigame(null);
    setPendingScorer(null);
    if (finishedRef.current) return;
    setIsPlaying(true); // speed/isPlaying effect restarts the timer
  }, []);

  const handleMinigameComplete = useCallback((result: MinigameResult) => {
    const scorer = pendingScorer;
    if (result.goalScored) {
      setUserScore(prev => prev + 1);
      if (scorer) {
        setScorers(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(scorer.id) || { goals: 0, assists: 0 };
          newMap.set(scorer.id, { ...current, goals: current.goals + 1 });
          return newMap;
        });
      }
      addEvent({
        minute,
        type: result.penaltiesScored ? 'penalty' : 'goal',
        team: 'home',
        player: scorer?.name,
        description: result.news
      });
    } else if (result.goalConceded) {
      setOppScore(prev => prev + 1);
      addEvent({
        minute,
        type: 'goal',
        team: 'away',
        description: result.news
      });
    } else {
      // Missed pen / saved / failed freekick / keeper saved
      addEvent({
        minute,
        type: result.success ? 'save' : 'chance',
        team: 'home',
        player: scorer?.name,
        description: result.news
      });
    }
    // small delay then resume
    setTimeout(() => resumeMatch(), 200);
  }, [pendingScorer, minute, addEvent, resumeMatch]);

  const handleFinish = () => {
    const scorerArray = Array.from(scorers.entries()).map(([playerId, stats]) => ({
      playerId,
      goals: stats.goals,
      assists: stats.assists
    }));
    onMatchEnd(userScore, oppScore, scorerArray);
  };

  const makeSubstitution = (outId: number, inId: number) => {
    if (substitutions.length >= 5) return;
    const outPlayer = activeLineup.find(p => p.id === outId);
    const inPlayer = activeBench.find(p => p.id === inId);
    if (!outPlayer || !inPlayer) return;

    setActiveLineup(prev => prev.map(p =>
      p.id === outId ? { ...inPlayer, t: outPlayer.t, l: outPlayer.l, role: outPlayer.role } : p
    ));
    setActiveBench(prev => [
      ...prev.filter(p => p.id !== inId),
      { ...outPlayer, t: undefined, l: undefined }
    ]);
    setSubstitutions(prev => [...prev, outId]);
    addEvent({
      minute,
      type: 'substitution',
      team: 'home',
      description: `🔄 ${outPlayer.name} ⇄ ${inPlayer.name}`
    });
    setShowSubModal(false);
    setSubOut(null);
  };

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  useEffect(() => {
    return () => clearTimer();
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
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-cyan-700 p-2 lg:p-3 flex items-center justify-between">
          <div className="text-white text-xs lg:text-sm font-medium flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              CANLI
            </span>
            Lig {gameState.leagueLevel} • Hafta {gameState.week}
            {gameState.season ? ` • Sezon ${gameState.season}` : ''}
          </div>
          {/* Speed controls */}
          {(isPlaying || (!isPlaying && !isFinished)) && (
            <div className="flex gap-1">
              {([1, 2, 4] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                    speed === s ? 'bg-white text-emerald-700' : 'bg-emerald-800/50 text-white/70 hover:bg-emerald-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-4 lg:p-6">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="text-center flex-1">
              <div className="text-3xl lg:text-5xl mb-1 lg:mb-2">{gameState.teamLogo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{gameState.teamName}</div>
              <div className="text-emerald-400 text-xs font-bold">OVR: {userStrength.overall}</div>
            </div>

            <div className="px-3 lg:px-8">
              <div className="text-4xl lg:text-6xl font-black text-white flex items-center gap-2 lg:gap-4">
                <span className={userScore > oppScore ? 'text-emerald-400' : ''}>{userScore}</span>
                <span className="text-slate-500">-</span>
                <span className={oppScore > userScore ? 'text-red-400' : ''}>{oppScore}</span>
              </div>
              <div className="text-center mt-2">
                <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono">
                  {String(minute).padStart(2, '0')}'
                </div>
              </div>
            </div>

            <div className="text-center flex-1">
              <div className="text-3xl lg:text-5xl mb-1 lg:mb-2">{opponent.logo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{opponent.name}</div>
              <div className="text-slate-400 text-xs">OVR: {oppOvr}</div>
            </div>
          </div>

          {/* Live stats bar */}
          {(isPlaying || isFinished) && (
            <div className="mt-4 grid grid-cols-3 gap-2 max-w-md mx-auto text-center text-xs">
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Top Hakimiyeti</div>
                <div className="text-white font-bold">%{Math.round(possession)} - %{Math.round(100 - possession)}</div>
                <div className="mt-1 h-1.5 bg-slate-600 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${possession}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${100 - possession}%` }} />
                </div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Şutlar</div>
                <div className="text-white font-bold">{shots.home} - {shots.away}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Değişiklik</div>
                <div className="text-white font-bold">{substitutions.length}/5</div>
              </div>
            </div>
          )}
        </div>

        {/* Match Console */}
        <div className="p-2 lg:p-4">
          <div className="bg-black/50 rounded-xl lg:rounded-2xl border border-emerald-500/30 h-40 lg:h-56 overflow-y-auto p-3 lg:p-4 font-mono text-xs lg:text-sm">
            {events.map((event, i) => (
              <div
                key={i}
                className={`mb-1.5 ${
                  event.type === 'goal' || event.type === 'penalty'
                    ? event.team === 'home' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                    : event.type === 'injury'
                    ? 'text-orange-400'
                    : event.type === 'card'
                    ? 'text-yellow-400'
                    : event.type === 'substitution'
                    ? 'text-blue-400'
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
        <div className="p-2 lg:p-4 bg-slate-900/50 flex gap-3 justify-center flex-wrap">
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
                disabled={substitutions.length >= 5}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium rounded-xl transition-all text-sm"
              >
                🔄 Değişiklik ({5 - substitutions.length})
              </button>
              <button
                onClick={skipMatch}
                className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-xl transition-all text-sm"
              >
                ⏭️ Atla
              </button>
            </>
          )}

          {isFinished && (
            <div className="w-full">
              <div className={`text-center py-4 bg-gradient-to-r ${getResultText().bg} to-transparent rounded-xl mb-4`}>
                <span className={`text-3xl font-black ${getResultText().color}`}>
                  {getResultText().text}
                </span>
                <div className="text-slate-400 text-sm mt-1">
                  Şutlar: {shots.home}-{shots.away} • Top: %{Math.round(possession)}
                </div>
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
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-2">Oyuncu Değişikliği</h3>
              <p className="text-slate-400 text-sm mb-4">Kalan hak: {5 - substitutions.length}</p>
              
              {!subOut ? (
                <div>
                  <h4 className="text-sm text-red-400 mb-2">Çıkacak oyuncu seç</h4>
                  {activeLineup.filter(p => !substitutions.includes(p.id)).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSubOut(p.id)}
                      className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded mb-1 text-sm flex justify-between"
                    >
                      <span className="text-white">{p.name}</span>
                      <span className="text-slate-400">{p.role} • {p.ovr} • ⚡{p.energy}%</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <h4 className="text-sm text-emerald-400 mb-2">Girecek oyuncu seç</h4>
                  {activeBench.filter(p => !p.injured).map(p => (
                    <button
                      key={p.id}
                      onClick={() => makeSubstitution(subOut, p.id)}
                      className="w-full text-left p-2 bg-slate-700/50 hover:bg-emerald-600/30 rounded mb-1 text-sm flex justify-between"
                    >
                      <span className="text-white">{p.name}</span>
                      <span className="text-slate-400">{p.role} • {p.ovr} • ⚡{p.energy}%</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setSubOut(null)}
                    className="w-full mt-2 py-2 text-slate-400 text-sm"
                  >
                    ← Geri
                  </button>
                </div>
              )}

              <button
                onClick={() => { setShowSubModal(false); setSubOut(null); }}
                className="w-full mt-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-match minigame overlay */}
      {matchMinigame && (
        <InGameMinigame
          context={matchMinigame}
          gameState={gameState}
          onComplete={handleMinigameComplete}
        />
      )}
    </div>
  );
};
