import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Team, MatchEvent, Weather, PlayerRating } from '../types/game';
import { MATCH_EVENTS, WEATHER_INFO, ROLE_NAMES, HOME_ADVANTAGE, AWAY_PENALTY, FIRST_NAMES, LAST_NAMES } from '../data/constants';
import { DIFFICULTY_CONFIG } from '../data/achievements';
import { InGameMinigame, MinigameContext, MinigameResult } from './InGameMinigames';
import { PenaltyShootout } from './PenaltyShootout';
import { sfx } from '../utils/sound';
import { skillInjuryReduction, skillTacticsBonus } from '../utils/progression';
import { LivePitch } from './LivePitch';
import { managerMatchBonus } from '../utils/life';
import { fixLineup } from '../utils/lineup';

export interface MatchExtras {
  cards: { playerId: number; type: 'yellow' | 'red' }[];
  injuries: { playerId: number; weeks: number }[];
  ratings: PlayerRating[];
  motmPlayerId: number | null;
  motmName: string;
  possession: number;
  shots: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  teamTalkMorale: number;
  penaltyWinner?: 'user' | 'opponent';
}

interface MatchEngineProps {
  gameState: GameState;
  opponent: Team;
  isHome: boolean;
  isCup: boolean;
  weather: Weather;
  onMatchEnd: (
    userScore: number,
    oppScore: number,
    scorers: { playerId: number; goals: number; assists: number }[],
    extras: MatchExtras
  ) => void;
}

type Phase = 'pre' | 'first' | 'half' | 'second' | 'et' | 'pens' | 'done';
type Talk = 'praise' | 'hairdryer' | 'calm';

const randomOpponentName = () =>
  `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;

export const MatchEngine: React.FC<MatchEngineProps> = ({
  gameState, opponent, isHome, isCup, weather, onMatchEnd
}) => {
  const [phase, setPhase] = useState<Phase>('pre');
  const [minute, setMinute] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [substitutions, setSubstitutions] = useState<number[]>([]);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subOut, setSubOut] = useState<number | null>(null);
  const [scorers, setScorers] = useState<Map<number, { goals: number; assists: number }>>(new Map());
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [possession, setPossession] = useState(50);
  const [shots, setShots] = useState({ home: 0, away: 0 });
  const [corners, setCorners] = useState({ home: 0, away: 0 });
  const [fouls, setFouls] = useState({ home: 0, away: 0 });
  const [activeLineup, setActiveLineup] = useState<Player[]>(() => fixLineup(gameState).team11);
  const [activeBench, setActiveBench] = useState<Player[]>(() => fixLineup(gameState).bench);
  const [matchMinigame, setMatchMinigame] = useState<MinigameContext | null>(null);
  const [pendingScorer, setPendingScorer] = useState<Player | null>(null);
  const [sentOff, setSentOff] = useState<number[]>([]);
  const [cardCount, setCardCount] = useState<Map<number, number>>(new Map());
  const [talk, setTalk] = useState<Talk | null>(null);
  const [talkBonus, setTalkBonus] = useState({ attack: 0, defense: 0, morale: 0 });
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [motm, setMotm] = useState<{ playerId: number | null; name: string }>({ playerId: null, name: '—' });
  const [extraTime, setExtraTime] = useState(false);
  const [penaltyWinner, setPenaltyWinner] = useState<'user' | 'opponent' | undefined>(undefined);
  const [goalFlash, setGoalFlash] = useState(false);

  const eventsEndRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef({ u: 0, o: 0 });
  const minuteRef = useRef(0);
  const finishedRef = useRef(false);
  const pausedRef = useRef(false);
  const extraTimeRef = useRef(false);
  const mgCountRef = useRef(0);
  const playedRef = useRef<Set<number>>(new Set(gameState.team11.map(p => p.id)));
  const cardMapRef = useRef<Map<number, { yellow: number; red: number }>>(new Map());
  const injuryMapRef = useRef<Map<number, number>>(new Map());
  const sentOffRef = useRef<number[]>([]);
  const handlerRef = useRef<(m: number, extra: boolean) => void>(() => {});

  const soundOn = gameState.soundOn !== false;
  const play = useCallback((fn: () => void) => { if (soundOn) fn(); }, [soundOn]);

  const difficulty = gameState.difficulty || 'normal';
  const diffCfg = DIFFICULTY_CONFIG[difficulty];
  const weatherInfo = WEATHER_INFO[weather] || WEATHER_INFO.cloudy;

  /* ══════════ GÜÇ HESABI ══════════ */
  const calculateStrength = useCallback(() => {
    const available = activeLineup.filter(p => !p.injured && !sentOff.includes(p.id));
    const pool = available.length > 0 ? available : activeLineup;
    const avgOvr = pool.length > 0 ? pool.reduce((acc, p) => acc + p.ovr, 0) / pool.length : 0;

    const avgEnergy = pool.reduce((acc, p) => acc + p.energy, 0) / Math.max(1, pool.length);
    const avgMorale = pool.reduce((acc, p) => acc + p.morale, 0) / Math.max(1, pool.length);
    const chemistry = (gameState.teamChemistry || 50) / 100;

    let attackBonus = 0;
    let defenseBonus = 0;

    if (gameState.tactics.style === 'attack') { attackBonus += 12; defenseBonus -= 8; }
    if (gameState.tactics.style === 'defense') { attackBonus -= 8; defenseBonus += 12; }
    if (gameState.tactics.style === 'possession') { attackBonus += 5; defenseBonus += 5; }
    if (gameState.tactics.pressing === 'high') { attackBonus += 5; defenseBonus -= 2; }
    if (gameState.tactics.pressing === 'low') { defenseBonus += 5; }
    if (gameState.tactics.tempo === 'fast') { attackBonus += 7; defenseBonus -= 2; }
    if (gameState.tactics.tempo === 'slow') { defenseBonus += 7; }

    // Ev sahibi avantajı / deplasman
    if (isHome) { attackBonus += HOME_ADVANTAGE; defenseBonus += HOME_ADVANTAGE; }
    else { attackBonus -= AWAY_PENALTY; defenseBonus -= AWAY_PENALTY; }

    // Kaptan sahada mı?
    const captainPlaying = available.some(p => p.id === gameState.captainId);
    if (captainPlaying) { attackBonus += 2; defenseBonus += 2; }

    // Analist personeli
    if (gameState.staff?.some(s => s.type === 'analyst')) { attackBonus += 3; defenseBonus += 3; }

    // Menajer yeteneği: Taktik Zekâsı
    // Menajerin kendi formu (Hayat sekmesi): kondisyon ve keyif sahaya yansır
    const lifeBonus = managerMatchBonus(gameState);
    attackBonus += lifeBonus.attack;
    defenseBonus += lifeBonus.defense;

    const tactSkill = gameState.skills?.tactics ?? 0;
    if (tactSkill > 0) {
      attackBonus += skillTacticsBonus(tactSkill);
      defenseBonus += skillTacticsBonus(tactSkill);
    }

    // Devre arası konuşma etkisi
    attackBonus += talkBonus.attack;
    defenseBonus += talkBonus.defense;

    // 10 kişi kaldıysa ceza
    const redPenalty = sentOffRef.current.length * 6;
    attackBonus -= redPenalty;
    defenseBonus -= redPenalty;

    const energyMultiplier = 0.7 + (avgEnergy / 100) * 0.3;
    const moraleMultiplier = 0.85 + (avgMorale / 100) * 0.15;
    const chemBonus = 0.9 + chemistry * 0.1;

    return {
      attack: (avgOvr + attackBonus) * energyMultiplier * moraleMultiplier * chemBonus,
      defense: (avgOvr + defenseBonus) * energyMultiplier * moraleMultiplier * chemBonus,
      overall: Math.round(avgOvr),
      effectiveOverall: avgOvr * energyMultiplier * moraleMultiplier * chemBonus
    };
  }, [gameState, activeLineup, isHome, sentOff, talkBonus]);

  const userStrength = calculateStrength();
  const oppOvr = Math.floor(opponent.ovr * (diffCfg?.oppOvrMult || 1));
  const oppStrength = {
    attack: oppOvr * (isHome ? 1 : 1.03),
    defense: oppOvr * (isHome ? 1 : 1.03),
    overall: oppOvr
  };

  const addEvent = useCallback((event: MatchEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const getRandomPlayer = useCallback((forGoal: boolean = false): Player => {
    const available = activeLineup.filter(p => !p.injured && !sentOff.includes(p.id));
    const pool = available.length > 0 ? available : activeLineup;
    if (forGoal) {
      const weights = pool.map(p => {
        if (gameState.setPieceTakers?.penalty === p.id) return 5.5;
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
  }, [activeLineup, sentOff, gameState.setPieceTakers]);

  const addUserGoal = useCallback((player: Player | null, assist: Player | null, description: string) => {
    scoreRef.current.u += 1;
    setUserScore(scoreRef.current.u);
    if (player) {
      setScorers(prev => {
        const next = new Map(prev);
        const cur = next.get(player.id) || { goals: 0, assists: 0 };
        next.set(player.id, { ...cur, goals: cur.goals + 1 });
        if (assist && assist.id !== player.id) {
          const a = next.get(assist.id) || { goals: 0, assists: 0 };
          next.set(assist.id, { ...a, assists: a.assists + 1 });
        }
        return next;
      });
    }
    play(sfx.goal);
    setGoalFlash(true);
    setTimeout(() => setGoalFlash(false), 900);
    addEvent({ minute: minuteRef.current, type: 'goal', team: 'home', player: player?.name, description });
  }, [addEvent, play]);

  /* ══════════ DAKİKA SİMÜLASYONU ══════════ */
  const simulateMinute = useCallback((currentMinute: number, isExtra: boolean) => {
    const goalMult = (weatherInfo.goalMult || 1) * (isExtra ? 0.75 : 1);

    // Top hakimiyeti kayması
    if (Math.random() < 0.3) {
      const ovrDiff = userStrength.effectiveOverall - oppStrength.overall;
      const drift = (Math.random() - 0.5) * 6 + ovrDiff * 0.15;
      setPossession(prev => Math.max(25, Math.min(75, prev + drift)));
    }

    if (Math.random() < 0.20) {
      const ovrDiff = userStrength.effectiveOverall - oppStrength.overall;
      const dominanceFactor = 0.5 + (ovrDiff * 0.02);
      const userDominance = Math.max(0.22, Math.min(0.82, dominanceFactor));
      const isUserAttack = Math.random() < userDominance;

      if (isUserAttack) {
        setShots(s => ({ ...s, home: s.home + 1 }));
        if (Math.random() < 0.25) setCorners(c => ({ ...c, home: c.home + 1 }));

        const goalChance = Math.max(0.05, (0.22 + Math.max(-0.12, Math.min(0.28, ovrDiff * 0.01))) * goalMult);
        const roll = Math.random();

        if (roll < goalChance) {
          // İnteraktif duran top — maç başına en fazla 2 kez
          if (mgCountRef.current < 2 && Math.random() < 0.22 && !pausedRef.current) {
            const isPen = Math.random() < 0.55;
            const takerId = isPen ? gameState.setPieceTakers?.penalty : gameState.setPieceTakers?.freekick;
            const taker = activeLineup.find(p => p.id === takerId && !p.injured && !sentOff.includes(p.id));
            const scorer = taker || getRandomPlayer(true);
            mgCountRef.current += 1;
            pausedRef.current = true;
            setPendingScorer(scorer);
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
            return;
          }
          const scorer = getRandomPlayer(true);
          const assister = Math.random() > 0.35 ? getRandomPlayer(false) : null;
          const template = MATCH_EVENTS.goals[Math.floor(Math.random() * MATCH_EVENTS.goals.length)];
          const desc = template.replace('{player}', scorer.name) +
            (assister && assister.id !== scorer.id ? ` (Asist: ${assister.name})` : '');
          addUserGoal(scorer, assister, desc);
        } else if (roll < goalChance + 0.3) {
          const player = getRandomPlayer(true);
          addEvent({
            minute: currentMinute, type: 'chance', team: 'home', player: player.name,
            description: `${player.name} şut çekti ama kaleci kurtardı!`
          });
        } else if (roll < goalChance + 0.45) {
          addEvent({
            minute: currentMinute, type: 'save', team: 'home',
            description: MATCH_EVENTS.saves[Math.floor(Math.random() * MATCH_EVENTS.saves.length)]
          });
        }
      } else {
        setShots(s => ({ ...s, away: s.away + 1 }));
        if (Math.random() < 0.25) setCorners(c => ({ ...c, away: c.away + 1 }));
        const goalChance = Math.max(0.05, (0.18 + Math.max(-0.12, Math.min(0.18, -ovrDiff * 0.008))) * goalMult);
        const roll = Math.random();

        if (roll < goalChance) {
          if (mgCountRef.current < 2 && Math.random() < 0.28 && !pausedRef.current) {
            mgCountRef.current += 1;
            pausedRef.current = true;
            addEvent({
              minute: currentMinute, type: 'info', team: 'away',
              description: '⏸️ RAKİP NET POZİSYON! Kaleci, kurtar!'
            });
            setMatchMinigame({
              type: 'keeper_save', title: 'Kaleci Anı!',
              description: `${currentMinute}' — ${opponent.name} tehlikeli pozisyon`,
              inMatch: true, playerName: 'Kaleci'
            });
            return;
          }
          scoreRef.current.o += 1;
          setOppScore(scoreRef.current.o);
          play(sfx.conceded);
          addEvent({
            minute: currentMinute, type: 'goal', team: 'away',
            player: randomOpponentName(),
            description: `❌ ${opponent.name} gol buldu!`
          });
        } else if (roll < goalChance + 0.25) {
          addEvent({ minute: currentMinute, type: 'chance', team: 'away', description: `${opponent.name} tehlikeli bir atak geliştiriyor...` });
        } else if (roll < goalChance + 0.4) {
          addEvent({ minute: currentMinute, type: 'save', team: 'home', description: `Savunma araya girdi! ${opponent.name} atağı boşa çıktı.` });
        }
      }
    }

    /* — Kartlar — */
    if (Math.random() < 0.016 && currentMinute > 10) {
      const player = getRandomPlayer();
      const isRed = Math.random() < 0.1;
      const record = cardMapRef.current.get(player.id) || { yellow: 0, red: 0 };

      if (isRed) {
        record.red += 1;
        cardMapRef.current.set(player.id, record);
        sentOffRef.current = [...sentOffRef.current, player.id];
        setSentOff(sentOffRef.current);
        play(sfx.card);
        addEvent({
          minute: currentMinute, type: 'card', team: 'home', player: player.name,
          description: `🟥 ${player.name} kırmızı kart gördü! ${gameState.teamName} 10 kişi kaldı!`
        });
        setActiveLineup(prev => prev.map(p => (p.id === player.id ? { ...p, redCard: true } : p)));
      } else {
        record.yellow += 1;
        cardMapRef.current.set(player.id, record);
        setCardCount(prev => {
          const next = new Map(prev);
          next.set(player.id, record.yellow);
          return next;
        });
        play(sfx.card);
        const secondYellow = record.yellow >= 2;
        if (secondYellow) {
          record.red += 1;
          cardMapRef.current.set(player.id, record);
          sentOffRef.current = [...sentOffRef.current, player.id];
          setSentOff(sentOffRef.current);
          setActiveLineup(prev => prev.map(p => (p.id === player.id ? { ...p, redCard: true } : p)));
        }
        addEvent({
          minute: currentMinute, type: 'card', team: 'home', player: player.name,
          description: secondYellow
            ? `🟨🟥 ${player.name} ikinci sarıdan atıldı!`
            : `🟨 ${player.name} sarı kart gördü.`
        });
      }
    }

    /* — Sakatlıklar (gerçekten uygulanır) — */
    const injuryChance = 0.005 * (diffCfg?.injuryMult || 1) * (weatherInfo.injuryMult || 1) *
      (1 - skillInjuryReduction(gameState.skills?.medical ?? 0));
    if (Math.random() < injuryChance && currentMinute > 15) {
      const player = getRandomPlayer();
      if (!player.injured) {
        const weeks = 1 + Math.floor(Math.random() * 3);
        injuryMapRef.current.set(player.id, weeks);
        setActiveLineup(prev => prev.map(p => (p.id === player.id ? { ...p, injured: true, injuryWeeks: weeks } : p)));
        play(sfx.injury);
        addEvent({
          minute: currentMinute, type: 'injury', team: 'home', player: player.name,
          description: `🏥 ${player.name} sakatlandı ve oyuna devam edemiyor (${weeks} hafta)!`
        });
        // Otomatik değişiklik hakkı varsa yedekten oyuncu girsin
        if (substitutions.length < 5) {
          const replacement = activeBench.find(p => !p.injured);
          if (replacement) {
            setActiveLineup(prev => prev.map(p =>
              p.id === player.id ? { ...replacement, t: p.t, l: p.l, role: p.role } : p
            ));
            setActiveBench(prev => [...prev.filter(p => p.id !== replacement.id), { ...player, t: undefined, l: undefined }]);
            setSubstitutions(prev => [...prev, player.id]);
            addEvent({
              minute: currentMinute, type: 'substitution', team: 'home',
              description: `🔄 Zorunlu değişiklik: ${player.name} ⇄ ${replacement.name}`
            });
          }
        }
      }
    }

    /* — FauL & yorum — */
    if (Math.random() < 0.08) {
      setFouls(f => (Math.random() < 0.5 ? { ...f, home: f.home + 1 } : { ...f, away: f.away + 1 }));
    }
    if (Math.random() < 0.04) {
      const comments = [
        'Orta saha mücadelesi kızışıyor...',
        'Taraftarlar ayakta!',
        'Teknik direktörler kenarda talimat veriyor.',
        'Tempo yükseliyor!',
        WEATHER_INFO[weather]?.desc ?? 'Hava koşulları oyunu etkiliyor.',
        `${gameState.teamName} baskı kuruyor.`,
        `${opponent.name} kontra arıyor.`
      ];
      addEvent({
        minute: currentMinute, type: 'info', team: 'home',
        description: comments[Math.floor(Math.random() * comments.length)]
      });
    }
  }, [
    userStrength, oppStrength, opponent.name, gameState.teamName, gameState.setPieceTakers,
    addEvent, getRandomPlayer, diffCfg, weatherInfo, weather, addUserGoal, activeLineup, activeBench,
    substitutions, sentOff, play
  ]);

  /* ══════════ MAÇ AKIŞI ══════════ */
  const buildRatings = useCallback((): { ratings: PlayerRating[]; motmPlayerId: number | null; motmName: string } => {
    const uScore = scoreRef.current.u;
    const oScore = scoreRef.current.o;
    const resultBonus = uScore > oScore ? 0.45 : uScore < oScore ? -0.45 : 0;
    const played = [...gameState.team11, ...gameState.bench].filter(p => playedRef.current.has(p.id));

    const list: PlayerRating[] = played.map(p => {
      const stats = scorers.get(p.id) || { goals: 0, assists: 0 };
      const card = cardMapRef.current.get(p.id) || { yellow: 0, red: 0 };
      const injured = injuryMapRef.current.has(p.id);
      const base = 6.1 + ((p.form ?? 5) / 10) * 0.5;
      const rating =
        base + stats.goals * 1.3 + stats.assists * 0.8 - card.yellow * 0.55 - card.red * 1.6 -
        (injured ? 0.4 : 0) + resultBonus + (Math.random() * 0.8 - 0.4);
      return {
        playerId: p.id,
        name: p.name,
        role: p.role,
        rating: Math.max(3, Math.min(10, Math.round(rating * 10) / 10)),
        goals: stats.goals,
        assists: stats.assists,
        yellow: card.yellow > 0,
        red: card.red > 0,
        injured
      };
    }).sort((a, b) => b.rating - a.rating);

    const best = list[0] ?? null;
    let motmPlayerId: number | null = best?.playerId ?? null;
    let motmName = best?.name ?? '—';

    // Rakip daha iyi oynadıysa maçın adamı onlardan olabilir
    if (oScore > uScore && Math.random() < 0.65) {
      motmPlayerId = null;
      motmName = `${randomOpponentName()} (${opponent.name})`;
    }
    return { ratings: list, motmPlayerId, motmName };
  }, [gameState.team11, gameState.bench, scorers, opponent.name]);

  const finishMatch = useCallback((penWinner?: 'user' | 'opponent') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    pausedRef.current = true;
    setMatchMinigame(null);
    const { ratings: list, motmPlayerId, motmName } = buildRatings();
    setRatings(list);
    setMotm({ playerId: motmPlayerId, name: motmName });
    setPenaltyWinner(penWinner);
    const uScore = scoreRef.current.u;
    const oScore = scoreRef.current.o;
    const won = uScore > oScore || penWinner === 'user';
    const lost = uScore < oScore || penWinner === 'opponent';
    if (won) play(sfx.win); else if (lost) play(sfx.lose); else play(sfx.whistle);
    addEvent({
      minute: minuteRef.current, type: 'info', team: 'home',
      description: penWinner ? '🔔 Penaltılar sonucu maç bitti!' : '🔔 Maç sona erdi!'
    });
    setPhase('done');
  }, [addEvent, buildRatings, play]);

  const toPenalties = useCallback(() => {
    pausedRef.current = true;
    setMatchMinigame(null);
    addEvent({ minute: 120, type: 'info', team: 'home', description: '⚖️ Penaltı atışlarına gidiliyor!' });
    setPhase('pens');
  }, [addEvent]);

  const startExtraTime = useCallback(() => {
    extraTimeRef.current = true;
    setExtraTime(true);
    setPhase('et');
    pausedRef.current = false;
    addEvent({ minute: 90, type: 'info', team: 'home', description: '⏱️ 90 dakika berabere! Uzatma oynanacak.' });
  }, [addEvent]);

  const pauseForHalfTime = useCallback(() => {
    pausedRef.current = true;
    stopTimer();
    setPhase('half');
    addEvent({ minute: 45, type: 'info', team: 'home', description: '⏱️ İlk yarı sona erdi. Soyunma odasına gidiliyor...' });
  }, [addEvent]);

  const handleMinute = useCallback((m: number, isExtra: boolean) => {
    if (m === 45 && !isExtra && phase === 'first') { pauseForHalfTime(); return; }
    if (m === 90 && !isExtra) {
      if (isCup && scoreRef.current.u === scoreRef.current.o) { startExtraTime(); return; }
      finishMatch();
      return;
    }
    if (m === 120 && isExtra) {
      if (isCup && scoreRef.current.u === scoreRef.current.o) { toPenalties(); return; }
      finishMatch();
      return;
    }
    simulateMinute(m, isExtra);
  }, [phase, isCup, pauseForHalfTime, startExtraTime, finishMatch, toPenalties, simulateMinute]);

  useEffect(() => { handlerRef.current = handleMinute; });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const matchRunning = (phase === 'first' || phase === 'second' || phase === 'et') && !finishedRef.current;

  useEffect(() => {
    if (!matchRunning) { stopTimer(); return; }
    stopTimer();
    timerRef.current = setInterval(() => {
      if (pausedRef.current || finishedRef.current) return;
      const next = minuteRef.current + 1;
      if ((next > 90 && !extraTimeRef.current) || next > 120) return;
      minuteRef.current = next;
      setMinute(next);
      handlerRef.current(next, extraTimeRef.current);
    }, 1000 / speed / 2.5);
    return stopTimer;
  }, [matchRunning, speed, phase]);

  useEffect(() => () => stopTimer(), []);

  const startMatch = () => {
    setPhase('first');
    pausedRef.current = false;
    playedRef.current = new Set(gameState.team11.map(p => p.id));
    play(sfx.whistle);
    addEvent({ minute: 0, type: 'info', team: 'home', description: '🏟️ Hakem düdüğü çaldı, maç başladı!' });
  };

  const applyTeamTalk = (choice: Talk) => {
    const leading = scoreRef.current.u - scoreRef.current.o;
    let effect = { attack: 0, defense: 0, morale: 0 };
    let text = '';
    // %20 ihtimalle konuşma tutmaz
    const reacted = Math.random() > 0.2;

    if (!reacted) {
      text = '😐 Oyuncular söylenenlere tepki vermedi...';
    } else if (choice === 'praise') {
      effect = leading >= 2
        ? { attack: 2, defense: -3, morale: 3 }
        : { attack: 5, defense: 2, morale: 6 };
      text = leading >= 2
        ? '😌 Övgü rehavete yol açtı, takım geri çekildi.'
        : '🔥 Övgü işe yaradı! Takım özgüvenle döndü.';
    } else if (choice === 'hairdryer') {
      effect = { attack: 8, defense: -3, morale: -4 };
      text = '😤 Fırça etkili oldu — takım ateş gibi, ama düzen risk altında!';
    } else {
      effect = { attack: 2, defense: 7, morale: 1 };
      text = '🧠 Sakin taktik konuşması meyvesini verdi, takım disiplinli.';
    }

    setTalkBonus(effect);
    setTalk(choice);
    addEvent({ minute: 45, type: 'info', team: 'home', description: `💬 Devre arası: ${text}` });
    setTimeout(() => {
      pausedRef.current = false;
      setPhase(extraTimeRef.current ? 'et' : 'second');
      addEvent({
        minute: 46, type: 'info', team: 'home',
        description: extraTimeRef.current ? '🏟️ Uzatma devam ediyor!' : '🏟️ İkinci yarı başladı!'
      });
    }, 900);
  };

  const skipMatch = () => {
    disableMinigames();
    const isExtra = extraTimeRef.current;
    const endMinute = isExtra ? 120 : 90;
    let m = minuteRef.current;
    while (m < endMinute) {
      m += 1;
      if (m === 45 && !isExtra) continue;
      if (isExtra && m === 90) continue;
      simulateMinute(m, isExtra);
    }
    minuteRef.current = endMinute;
    setMinute(endMinute);
    handlerRef.current(endMinute, isExtra);
    addEvent({ minute: endMinute, type: 'info', team: 'home', description: '⏭️ Maç hızlı simüle edildi.' });
  };

  function disableMinigames() {
    pausedRef.current = false;
    mgCountRef.current = 99;
    setMatchMinigame(null);
  }

  const resumeFromMinigame = useCallback(() => {
    pausedRef.current = false;
    setMatchMinigame(null);
    setPendingScorer(null);
  }, []);

  const handleMinigameComplete = useCallback((result: MinigameResult) => {
    const scorer = pendingScorer;
    if (result.goalScored) {
      addUserGoal(scorer, null, result.news);
    } else if (result.goalConceded) {
      scoreRef.current.o += 1;
      setOppScore(scoreRef.current.o);
      play(sfx.conceded);
      addEvent({ minute: minuteRef.current, type: 'goal', team: 'away', description: result.news });
    } else {
      addEvent({
        minute: minuteRef.current,
        type: result.success ? 'save' : 'chance',
        team: 'home',
        player: scorer?.name,
        description: result.news
      });
    }
    setTimeout(resumeFromMinigame, 300);
  }, [pendingScorer, addEvent, addUserGoal, resumeFromMinigame, play]);

  const makeSubstitution = (outId: number, inId: number) => {
    if (substitutions.length >= 5) return;
    const outPlayer = activeLineup.find(p => p.id === outId);
    const inPlayer = activeBench.find(p => p.id === inId);
    if (!outPlayer || !inPlayer) return;

    playedRef.current.add(inPlayer.id);
    setActiveLineup(prev => prev.map(p =>
      p.id === outId ? { ...inPlayer, t: outPlayer.t, l: outPlayer.l, role: outPlayer.role } : p
    ));
    setActiveBench(prev => [...prev.filter(p => p.id !== inId), { ...outPlayer, t: undefined, l: undefined }]);
    setSubstitutions(prev => [...prev, outId]);
    addEvent({ minute: minuteRef.current, type: 'substitution', team: 'home', description: `🔄 ${outPlayer.name} ⇄ ${inPlayer.name}` });
    setShowSubModal(false);
    setSubOut(null);
  };

  const handleFinishClick = () => {
    const scorerArray = Array.from(scorers.entries()).map(([playerId, stats]) => ({
      playerId, goals: stats.goals, assists: stats.assists
    }));
    const extras: MatchExtras = {
      cards: Array.from(cardMapRef.current.entries()).flatMap(([playerId, c]) => [
        ...Array.from({ length: c.yellow }, () => ({ playerId, type: 'yellow' as const })),
        ...Array.from({ length: c.red }, () => ({ playerId, type: 'red' as const })),
      ]),
      injuries: Array.from(injuryMapRef.current.entries()).map(([playerId, weeks]) => ({ playerId, weeks })),
      ratings,
      motmPlayerId: motm.playerId,
      motmName: motm.name,
      possession: Math.round(possession),
      shots,
      corners,
      fouls,
      teamTalkMorale: talkBonus.morale,
      penaltyWinner
    };
    onMatchEnd(scoreRef.current.u, scoreRef.current.o, scorerArray, extras);
  };

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getResultText = () => {
    const u = scoreRef.current.u;
    const o = scoreRef.current.o;
    if (penaltyWinner === 'user' || (u > o && !penaltyWinner)) return { text: 'GALİBİYET', color: 'text-emerald-400', bg: 'from-emerald-500/20' };
    if (penaltyWinner === 'opponent' || (u < o && !penaltyWinner)) return { text: 'MAĞLUBİYET', color: 'text-red-400', bg: 'from-red-500/20' };
    return { text: 'BERABERLİK', color: 'text-slate-400', bg: 'from-slate-500/20' };
  };

  const ratingColor = (r: number) =>
    r >= 8 ? 'text-emerald-400' : r >= 7 ? 'text-lime-400' : r >= 6 ? 'text-slate-200' : r >= 5 ? 'text-amber-400' : 'text-red-400';

  const score = { u: userScore, o: oppScore };

  return (
    <div className={`fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 lg:p-4 overflow-y-auto ${goalFlash ? 'animate-goal-flash' : ''}`}>
      <div className="w-full max-w-3xl bg-gradient-to-b from-emerald-900 to-slate-900 rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-cyan-700 p-2 lg:p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-white text-xs lg:text-sm font-medium flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              CANLI
            </span>
            <span>{isCup ? '🏅 Kupa' : `Lig ${gameState.leagueLevel}`} • Hafta {gameState.week}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isHome ? 'bg-emerald-900/60 text-emerald-200' : 'bg-amber-900/60 text-amber-200'}`}>
              {isHome ? 'İÇ SAHA' : 'DEPLASMAN'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/25">
              {weatherInfo.icon} {weatherInfo.label}
            </span>
            {extraTime && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-900/60">UZATMA</span>}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                managerMatchBonus(gameState).attack > 0.2 ? 'bg-emerald-900/60 text-emerald-200'
                : managerMatchBonus(gameState).attack < -0.1 ? 'bg-red-900/60 text-red-200'
                : 'bg-black/25 text-white/80'
              }`}
              title="Menajerin kendi formu (Hayat sekmesi) maç performansını etkiler"
            >
              🧑‍💼 {managerMatchBonus(gameState).label}
            </span>
          </div>
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
        </div>

        {/* Scoreboard */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-3 lg:p-5">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="text-center flex-1">
              <div className="text-3xl lg:text-4xl mb-1">{gameState.teamLogo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{gameState.teamName}</div>
              <div className="text-emerald-400 text-xs font-bold">
                OVR: {userStrength.overall}
                {sentOff.length > 0 && <span className="text-red-400"> • {11 - sentOff.length} kişi</span>}
              </div>
            </div>

            <div className="px-2 lg:px-6">
              <div className="text-4xl lg:text-6xl font-black text-white flex items-center gap-2 lg:gap-4">
                <span className={score.u > score.o ? 'text-emerald-400' : ''}>{score.u}</span>
                <span className="text-slate-500">-</span>
                <span className={score.o > score.u ? 'text-red-400' : ''}>{score.o}</span>
              </div>
              <div className="text-center mt-1">
                <div className="text-2xl lg:text-3xl font-black text-amber-400 font-mono">
                  {String(minute).padStart(2, '0')}'
                </div>
                <div className="text-[10px] text-slate-500">
                  {phase === 'pre' ? 'Başlamadı' : phase === 'half' ? 'Devre arası' : phase === 'done' ? 'Bitti' : extraTime ? 'Uzatma' : 'Devam ediyor'}
                </div>
                {talk && (
                  <div className="text-[10px] text-amber-300 mt-0.5">
                    💬 {talk === 'praise' ? 'Övgü' : talk === 'hairdryer' ? 'Fırça' : 'Sakin taktik'}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center flex-1">
              <div className="text-3xl lg:text-4xl mb-1">{opponent.logo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{opponent.name}</div>
              <div className="text-slate-400 text-xs">OVR: {oppOvr}{!isHome && <span className="text-amber-300"> • ev sahibi</span>}</div>
            </div>
          </div>

          {(phase !== 'pre') && (
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-2 max-w-2xl mx-auto text-center text-xs">
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
                <div className="text-slate-400">Korner</div>
                <div className="text-white font-bold">{corners.home} - {corners.away}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Faul</div>
                <div className="text-white font-bold">{fouls.home} - {fouls.away}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Değişiklik</div>
                <div className="text-white font-bold">{substitutions.length}/5</div>
              </div>
            </div>
          )}
        </div>

        {/* Canlı 2D saha */}
        {phase !== 'pre' && (
          <div className="px-2 lg:px-4 pt-3">
            <LivePitch
              minute={minute}
              possession={possession}
              events={events}
              homeLogo={gameState.teamLogo}
              awayLogo={opponent.logo}
              homeName={gameState.teamName}
              awayName={opponent.name}
              isHome={isHome}
              lineup={activeLineup}
              sentOff={sentOff}
              phase={phase}
            />
          </div>
        )}

        {/* Match Console */}
        <div className="p-2 lg:p-4">
          <div className="bg-black/50 rounded-xl lg:rounded-2xl border border-emerald-500/30 h-36 lg:h-52 overflow-y-auto p-3 lg:p-4 font-mono text-xs lg:text-sm">
            {events.map((event, i) => (
              <div
                key={i}
                className={`mb-1.5 ${
                  event.type === 'goal' || event.type === 'penalty'
                    ? event.team === 'home' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                    : event.type === 'injury' ? 'text-orange-400'
                    : event.type === 'card' ? 'text-yellow-400'
                    : event.type === 'substitution' ? 'text-blue-400'
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
          {phase === 'pre' && (
            <div className="w-full">
              <div className="text-center text-slate-300 text-xs mb-3">
                {weatherInfo.icon} {weatherInfo.label} — {weatherInfo.desc}
                <br />
                {isHome
                  ? '🏟️ Kendi sahamızda, taraftar desteği arkamızda (+ev sahibi avantajı)'
                  : '🚌 Deplasmandayız, rakip ev sahibi avantajına sahip'}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={startMatch}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm lg:text-lg rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
                >
                  ▶️ Maçı Başlat
                </button>
              </div>
            </div>
          )}

          {(phase === 'second' || phase === 'et') && (
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

          {phase === 'half' && (
            <div className="w-full">
              <div className="text-center text-white font-bold mb-2">💬 Devre Arası Takım Konuşması</div>
              <div className="text-center text-slate-400 text-xs mb-3">
                Skor {score.u}-{score.o} • Oyuncular seni dinliyor
              </div>
              <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
                <button onClick={() => applyTeamTalk('praise')} className="py-3 rounded-xl bg-emerald-600/70 hover:bg-emerald-500 text-white text-sm font-bold">
                  👏 Öv<br /><span className="text-[10px] font-normal">Moral +, hücum +</span>
                </button>
                <button onClick={() => applyTeamTalk('hairdryer')} className="py-3 rounded-xl bg-red-600/70 hover:bg-red-500 text-white text-sm font-bold">
                  😤 Fırça<br /><span className="text-[10px] font-normal">Hücum ++, moral −</span>
                </button>
                <button onClick={() => applyTeamTalk('calm')} className="py-3 rounded-xl bg-blue-600/70 hover:bg-blue-500 text-white text-sm font-bold">
                  🧠 Sakin<br /><span className="text-[10px] font-normal">Defans ++, disiplin</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="w-full">
              <div className={`text-center py-3 bg-gradient-to-r ${getResultText().bg} to-transparent rounded-xl mb-3`}>
                <span className={`text-2xl font-black ${getResultText().color}`}>{getResultText().text}</span>
                <div className="text-slate-400 text-xs mt-1">
                  Şutlar: {shots.home}-{shots.away} • Korner: {corners.home}-{corners.away} • Top: %{Math.round(possession)}
                  {penaltyWinner && ` • Penaltılar: ${penaltyWinner === 'user' ? 'KAZANDIK' : 'KAYBETTİK'}`}
                </div>
              </div>

              {ratings.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-3 mb-3 max-h-44 overflow-y-auto">
                  <div className="text-xs text-emerald-400 font-bold mb-2">📊 Oyuncu Reytingleri</div>
                  {ratings.map((r, i) => (
                    <div key={r.playerId} className="flex items-center justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
                      <span className="text-white truncate flex items-center gap-1">
                        {i === 0 && <span title="Maçın adamı">⭐</span>}
                        {r.name}
                        <span className="text-slate-500">{ROLE_NAMES[r.role]}</span>
                        {r.goals > 0 && <span className="text-emerald-400">⚽{r.goals}</span>}
                        {r.assists > 0 && <span className="text-blue-400">🅰️{r.assists}</span>}
                        {r.yellow && <span>🟨</span>}
                        {r.red && <span>🟥</span>}
                        {r.injured && <span>🏥</span>}
                      </span>
                      <span className={`font-black ${ratingColor(r.rating)}`}>{r.rating.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleFinishClick}
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
                  {activeLineup.filter(p => !sentOff.includes(p.id)).map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSubOut(p.id)}
                      className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded mb-1 text-sm flex justify-between"
                    >
                      <span className="text-white">{p.name}</span>
                      <span className="text-slate-400">{p.role} • {p.ovr} • ⚡{p.energy}%{p.injured ? ' 🏥' : ''}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <h4 className="text-sm text-emerald-400 mb-2">Girecek oyuncu seç</h4>
                  {activeBench.filter(p => !p.injured && !(p.suspension && p.suspension > 0)).map(p => (
                    <button
                      key={p.id}
                      onClick={() => makeSubstitution(subOut, p.id)}
                      className="w-full text-left p-2 bg-slate-700/50 hover:bg-emerald-600/30 rounded mb-1 text-sm flex justify-between"
                    >
                      <span className="text-white">{p.name}</span>
                      <span className="text-slate-400">{p.role} • {p.ovr} • ⚡{p.energy}%</span>
                    </button>
                  ))}
                  <button onClick={() => setSubOut(null)} className="w-full mt-2 py-2 text-slate-400 text-sm">← Geri</button>
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
        <InGameMinigame context={matchMinigame} gameState={gameState} onComplete={handleMinigameComplete} />
      )}

      {/* Penalty shootout */}
      {phase === 'pens' && (
        <PenaltyShootout
          userTeamName={gameState.teamName}
          opponentName={opponent.name}
          onFinish={(winner, u, o) => {
            scoreRef.current = { u, o };
            setUserScore(u);
            setOppScore(o);
            finishMatch(winner);
          }}
        />
      )}

      {/* Kart uyarıları */}
      {cardCount.size > 0 && (
        <div className="fixed bottom-3 right-3 bg-slate-900/90 border border-amber-500/40 rounded-xl p-2 text-[10px] text-amber-200 z-[60]">
          🟨 Kart: {activeLineup.filter(p => cardCount.has(p.id)).map(p => `${p.name} (${cardCount.get(p.id)})`).join(', ')}
        </div>
      )}
    </div>
  );
};
