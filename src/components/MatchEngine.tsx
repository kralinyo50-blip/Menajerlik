import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameState, Player, Team, MatchEvent, Weather, PlayerRating } from '../types/game';
import { MATCH_EVENTS, WEATHER_INFO, ROLE_NAMES, HOME_ADVANTAGE, AWAY_PENALTY, FIRST_NAMES, LAST_NAMES } from '../data/constants';
import { DIFFICULTY_CONFIG } from '../data/achievements';
import { facilityEffects } from '../data/facility';
import { InGameMinigame, MinigameContext, MinigameResult } from './InGameMinigames';
import { PenaltyShootout } from './PenaltyShootout';
import { sfx } from '../utils/sound';
import { skillInjuryReduction, skillTacticsBonus } from '../utils/progression';
import { LivePitch } from './LivePitch';
import { Match3D } from './Match3D';
import { managerMatchBonus } from '../utils/life';
import { fixLineup } from '../utils/lineup';
import { adaptationPct, effectiveOvr } from '../utils/adaptation';
import { isSoftwareWebGL } from '../utils/webgl';
import { hashText } from './match3d/venue';
import { setBackgroundRenderPaused } from '../utils/renderGate';

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
  xg: { home: number; away: number };
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

const MiniStat: React.FC<{ label: string; value: string; hint?: string; wide?: boolean }> = ({ label, value, hint, wide }) => (
  <div
    title={hint}
    className={`bg-slate-700/50 rounded-lg px-2 py-1 border border-slate-600/20 text-center ${wide ? 'min-w-[92px]' : 'min-w-[58px]'}`}
  >
    <div className="text-[8px] tracking-widest font-bold text-slate-400 leading-none">{label}</div>
    <div className="text-white font-black text-[11px] leading-tight mt-0.5">{value}</div>
  </div>
);

// ── Formasyon profilleri — gerçek futbol mantığı ──
interface FormationProfile {
  midfieldWeight: number; // orta saha üstünlüğü
  wingWeight: number; // kanat oyunu
  defensiveSolid: number; // savunma sağlamlığı
  attackBias: number; // hücum eğilimi
  possessionBase: number;
}

const FORMATION_PROFILES: Record<string, FormationProfile> = {
  '4-3-3': { midfieldWeight: 0.52, wingWeight: 0.72, defensiveSolid: 0.50, attackBias: 0.68, possessionBase: 54 },
  '4-4-2': { midfieldWeight: 0.58, wingWeight: 0.55, defensiveSolid: 0.60, attackBias: 0.55, possessionBase: 50 },
  '4-2-3-1': { midfieldWeight: 0.65, wingWeight: 0.50, defensiveSolid: 0.62, attackBias: 0.60, possessionBase: 56 },
  '3-5-2': { midfieldWeight: 0.78, wingWeight: 0.45, defensiveSolid: 0.48, attackBias: 0.58, possessionBase: 58 },
  '3-4-3': { midfieldWeight: 0.55, wingWeight: 0.70, defensiveSolid: 0.40, attackBias: 0.75, possessionBase: 52 },
  '5-3-2': { midfieldWeight: 0.48, wingWeight: 0.35, defensiveSolid: 0.82, attackBias: 0.38, possessionBase: 44 },
  '4-1-4-1': { midfieldWeight: 0.70, wingWeight: 0.48, defensiveSolid: 0.65, attackBias: 0.52, possessionBase: 55 },
};

function getFormationProfile(name: string): FormationProfile {
  return FORMATION_PROFILES[name] || FORMATION_PROFILES['4-3-3'];
}

// ── xG modeli ──
function calculateXG(params: {
  distance: number; // 6-30m
  angle: number; // 0-90 deg, 0 = kaleye dik
  shotType: 'open' | 'header' | 'volley' | 'oneonone' | 'long' | 'freekick' | 'penalty';
  pressure: number; // 0-1
  keeperOvr: number;
  weather: Weather;
}): number {
  let base = 0;
  const d = params.distance;
  // mesafeye göre baz xG
  if (d <= 6) base = 0.55;
  else if (d <= 11) base = 0.28 - (d - 6) * 0.03;
  else if (d <= 18) base = 0.13 - (d - 11) * 0.012;
  else if (d <= 25) base = 0.045 - (d - 18) * 0.004;
  else base = 0.015;

  // açı etkisi
  const angleFactor = Math.max(0.35, 1 - (params.angle / 90) * 0.65);
  base *= angleFactor;

  // şut tipi
  const typeMult: Record<string, number> = {
    open: 1.0,
    header: 0.72,
    volley: 0.68,
    oneonone: 1.55,
    long: 0.45,
    freekick: 0.85,
    penalty: 2.8,
  };
  base *= typeMult[params.shotType] || 1;

  // baskı
  base *= (1 - params.pressure * 0.55);

  // kaleci
  const keeperFactor = Math.max(0.75, Math.min(1.25, 1 - (params.keeperOvr - 75) * 0.012));
  base *= keeperFactor;

  // hava
  if (params.weather === 'rain' || params.weather === 'storm') base *= 0.88;
  if (params.weather === 'snow') base *= 0.82;
  if (params.weather === 'wind') base *= 0.90;

  return Math.max(0.01, Math.min(0.92, base));
}

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
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [possession, setPossession] = useState(50);
  const [shots, setShots] = useState({ home: 0, away: 0 });
  const [xg, setXg] = useState({ home: 0, away: 0 });
  const [spiker, setSpiker] = useState<string | null>(null);
  const [corners, setCorners] = useState({ home: 0, away: 0 });
  const [fouls, setFouls] = useState({ home: 0, away: 0 });
  const [activeLineup, setActiveLineup] = useState<Player[]>(() => fixLineup(gameState).team11);
  const [activeBench, setActiveBench] = useState<Player[]>(() => fixLineup(gameState).bench);
  const [matchMinigame, setMatchMinigame] = useState<MinigameContext | null>(null);
  const [pendingScorer, setPendingScorer] = useState<Player | null>(null);
  const [sentOff, setSentOff] = useState<number[]>([]);
  const [oppReds, setOppReds] = useState(0); // rakip kırmızı kart sayısı (3D sahada da adam eksilir)
  const [cardCount, setCardCount] = useState<Map<number, number>>(new Map());
  const [talk, setTalk] = useState<Talk | null>(null);
  const [talkBonus, setTalkBonus] = useState({ attack: 0, defense: 0, morale: 0 });
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [motm, setMotm] = useState<{ playerId: number | null; name: string }>({ playerId: null, name: '—' });
  const [extraTime, setExtraTime] = useState(false);
  const [penaltyWinner, setPenaltyWinner] = useState<'user' | 'opponent' | undefined>(undefined);
  const [goalFlash, setGoalFlash] = useState(false);
  const [celebration, setCelebration] = useState<{ team: 'home' | 'away'; player?: string; key: number } | null>(null);
  const [subBoard, setSubBoard] = useState<{ outName: string; inName: string; outRole: string; inRole: string; key: number } | null>(null);
  const [cardPop, setCardPop] = useState<{ player: string; kind: 'yellow' | 'red' | 'second'; key: number } | null>(null);
  const [freeze, setFreeze] = useState<{ icon: string; reason: string } | null>(null);
  const [slowMo, setSlowMo] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [view3d, setView3d] = useState(!gameState.life?.lowPerf && !isSoftwareWebGL());

  const consoleRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef({ u: 0, o: 0 });
  const minuteRef = useRef(0);
  const finishedRef = useRef(false);
  const pausedRef = useRef(false);
  const extraTimeRef = useRef(false);
  const mgCountRef = useRef(0);
  const lastGoalMinuteRef = useRef(-99);
  const playedRef = useRef<Set<number>>(new Set(gameState.team11.map(p => p.id)));
  const cardMapRef = useRef<Map<number, { yellow: number; red: number }>>(new Map());
  const injuryMapRef = useRef<Map<number, number>>(new Map());
  const sentOffRef = useRef<number[]>([]);
  const oppRedsRef = useRef(0);   // rakip kırmızı kartlar — 3D sahada adam eksilir, güç düşer
  const oppSubsRef = useRef<number[]>([]); // rakip değişiklik dakikaları
  const handlerRef = useRef<(m: number, extra: boolean) => void>(() => {});
  const slowMoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>('pre');

  // Taktik zincir durumu — gerçek maç akışı için
  const possessionChainRef = useRef<{ team: 'home' | 'away'; phase: 'build' | 'mid' | 'final'; passes: number }>({ team: 'home', phase: 'build', passes: 0 });
  const momentumRef = useRef<{ home: number; away: number }>({ home: 0, away: 0 });

  const pushSpiker = useCallback((txt: string) => {
    setSpiker(txt);
    setTimeout(() => setSpiker(null), 2200);
  }, []);

  const soundOn = gameState.soundOn !== false;
  const play = useCallback((fn: () => void) => { if (soundOn) fn(); }, [soundOn]);

  const pauseSim = useCallback((icon: string, reason: string) => {
    if (resumeTimer.current) { clearTimeout(resumeTimer.current); resumeTimer.current = null; }
    pausedRef.current = true;
    setFreeze({ icon, reason });
  }, []);

  const resumeSim = useCallback((delay = 0) => {
    if (resumeTimer.current) { clearTimeout(resumeTimer.current); resumeTimer.current = null; }
    const running = () => phaseRef.current === 'first' || phaseRef.current === 'second' || phaseRef.current === 'et';
    if (delay <= 0) {
      if (running() || phaseRef.current === 'pre') pausedRef.current = false;
      setFreeze(null);
      return;
    }
    resumeTimer.current = setTimeout(() => {
      resumeTimer.current = null;
      if (running()) pausedRef.current = false;
      setFreeze(null);
    }, delay);
  }, []);

  const triggerSlowMo = useCallback((ms = 2800) => {
    setSlowMo(true);
    if (slowMoTimer.current) clearTimeout(slowMoTimer.current);
    slowMoTimer.current = setTimeout(() => {
      slowMoTimer.current = null;
      setSlowMo(false);
    }, ms);
  }, []);

  useEffect(() => () => {
    if (slowMoTimer.current) clearTimeout(slowMoTimer.current);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  useEffect(() => {
    setBackgroundRenderPaused(true);
    return () => setBackgroundRenderPaused(false);
  }, []);

  const difficulty = gameState.difficulty || 'normal';
  const diffCfg = DIFFICULTY_CONFIG[difficulty];
  const weatherInfo = WEATHER_INFO[weather] || WEATHER_INFO.cloudy;

  // ── Taktik sliderları ──
  const tac: any = gameState.tactics as any;
  const defensiveLine = tac.defensiveLine ?? 50;
  const width = tac.width ?? 50;
  const creativity = tac.creativity ?? 50;
  const pressingIntensity = tac.pressingIntensity ?? 50;
  const tempoValue = tac.tempoValue ?? 50;

  const formationProfile = getFormationProfile(gameState.tactics.formation || '4-3-3');

  // ── Güç hesabı — taktik sliderlar ve formasyon ağırlıklarıyla ──
  const calculateStrength = useCallback(() => {
    const available = activeLineup.filter(p => !p.injured && !sentOff.includes(p.id));
    const pool = available.length > 0 ? available : activeLineup;
    const avgOvr = pool.length > 0 ? pool.reduce((acc, p) => acc + p.ovr, 0) / pool.length : 0;
    const chemistryVal = gameState.teamChemistry ?? 55;
    const effOf = (p: Player) => effectiveOvr(p, avgOvr, chemistryVal);
    const effAvg = pool.length > 0 ? pool.reduce((acc, p) => acc + effOf(p), 0) / pool.length : avgOvr;
    const teamAdaptPct = pool.length > 0
      ? Math.round(pool.reduce((acc, p) => acc + adaptationPct(p), 0) / pool.length * 100)
      : 100;

    // Rol bazlı güç ayrımı — gerçek futbol
    const attackers = pool.filter(p => p.role === 'FW' || p.role === 'OS');
    const midfielders = pool.filter(p => p.role === 'OS' || p.role === 'SB');
    const defenders = pool.filter(p => p.role === 'STP' || p.role === 'SB' || p.role === 'KL');

    const attOvr = attackers.length ? attackers.reduce((a, p) => a + effOf(p), 0) / attackers.length : effAvg;
    const midOvr = midfielders.length ? midfielders.reduce((a, p) => a + effOf(p), 0) / midfielders.length : effAvg;
    const defOvr = defenders.length ? defenders.reduce((a, p) => a + effOf(p), 0) / defenders.length : effAvg;

    let starAttack = 0;
    let starDefense = 0;
    pool.forEach(p => {
      const eff = effOf(p);
      const bonus = eff >= 87 ? 1.6 : eff >= 83 ? 1.0 : eff >= 80 ? 0.5 : 0;
      if (bonus <= 0) return;
      const gate = 0.6 + ((p.form ?? 5) / 10) * 0.4;
      if (p.role === 'FW' || p.role === 'OS') starAttack += bonus * gate;
      else starDefense += bonus * gate;
    });
    starAttack = Math.min(8, starAttack);
    starDefense = Math.min(8, starDefense);

    const facilityEff = facilityEffects(gameState.facility);

    const avgEnergy = pool.reduce((acc, p) => acc + p.energy, 0) / Math.max(1, pool.length);
    const avgMorale = pool.reduce((acc, p) => acc + p.morale, 0) / Math.max(1, pool.length);
    const chemistry = (gameState.teamChemistry || 50) / 100;

    let attackBonus = 0;
    let defenseBonus = 0;
    let midfieldBonus = 0;
    let possessionBonus = 0;

    // Temel taktik
    if (gameState.tactics.style === 'attack') { attackBonus += 12; defenseBonus -= 8; possessionBonus -= 3; }
    if (gameState.tactics.style === 'defense') { attackBonus -= 8; defenseBonus += 12; possessionBonus -= 2; }
    if (gameState.tactics.style === 'possession') { attackBonus += 5; defenseBonus += 5; possessionBonus += 8; midfieldBonus += 6; }
    if (gameState.tactics.pressing === 'high') { attackBonus += 5; defenseBonus -= 2; midfieldBonus += 4; }
    if (gameState.tactics.pressing === 'low') { defenseBonus += 5; midfieldBonus -= 3; }
    if (gameState.tactics.tempo === 'fast') { attackBonus += 7; defenseBonus -= 2; }
    if (gameState.tactics.tempo === 'slow') { defenseBonus += 7; possessionBonus += 5; }

    // ── SLIDER ETKİLERİ — gerçekçi ──
    // Defensive Line: yüksek = önde savunma, ofsayt tuzağı, ama arkada boşluk
    // 0 = derinde bekle, 100 = orta sahaya kadar çık
    const dlNorm = (defensiveLine - 50) / 50; // -1 to 1
    attackBonus += dlNorm * 6; // önde oynamak hücumu artırır
    defenseBonus += dlNorm * -4 + (dlNorm > 0 ? -Math.abs(dlNorm) * 3 : Math.abs(dlNorm) * 4); // çok önde risk
    midfieldBonus += dlNorm * 5;
    // Width: genişlik
    const wNorm = (width - 50) / 50;
    attackBonus += wNorm * 4; // geniş oyun kanatları açar
    possessionBonus += wNorm * -2 + (wNorm < 0 ? 3 : 0); // dar oyun topu tutar
    // Creativity: yaratıcılık
    const cNorm = (creativity - 50) / 50;
    attackBonus += cNorm * 7; // yaratıcı hücum
    midfieldBonus += cNorm * 4;
    defenseBonus += cNorm * -3; // yaratıcılık risk getirir
    // Pressing Intensity
    const pNorm = (pressingIntensity - 50) / 50;
    midfieldBonus += pNorm * 8; // yoğun pres orta sahayı domine eder
    attackBonus += pNorm * 3;
    defenseBonus += pNorm * 2;
    // Tempo
    const tNorm = (tempoValue - 50) / 50;
    attackBonus += tNorm * 5;
    possessionBonus += tNorm * -6; // yüksek tempo topu daha çok kaybettirir

    // Formasyon profili
    midfieldBonus += (formationProfile.midfieldWeight - 0.5) * 16;
    attackBonus += (formationProfile.attackBias - 0.5) * 12;
    defenseBonus += (formationProfile.defensiveSolid - 0.5) * 12;
    possessionBonus += (formationProfile.possessionBase - 50) * 0.5;

    // Ev sahibi
    if (isHome) { attackBonus += HOME_ADVANTAGE; defenseBonus += HOME_ADVANTAGE; midfieldBonus += 2; possessionBonus += 3; }
    else { attackBonus -= AWAY_PENALTY; defenseBonus -= AWAY_PENALTY; }

    const captainPlaying = available.some(p => p.id === gameState.captainId);
    if (captainPlaying) { attackBonus += 2; defenseBonus += 2; midfieldBonus += 2; }

    if (gameState.staff?.some(s => s.type === 'analyst')) { attackBonus += 3; defenseBonus += 3; midfieldBonus += 2; }

    if (facilityEff.matchBonus > 0) {
      attackBonus += facilityEff.matchBonus;
      defenseBonus += facilityEff.matchBonus;
      midfieldBonus += facilityEff.matchBonus * 0.7;
    }

    const lifeBonus = managerMatchBonus(gameState);
    attackBonus += lifeBonus.attack;
    defenseBonus += lifeBonus.defense;

    const tactSkill = gameState.skills?.tactics ?? 0;
    if (tactSkill > 0) {
      attackBonus += skillTacticsBonus(tactSkill);
      defenseBonus += skillTacticsBonus(tactSkill);
      midfieldBonus += skillTacticsBonus(tactSkill) * 0.6;
    }

    attackBonus += talkBonus.attack;
    defenseBonus += talkBonus.defense;
    midfieldBonus += talkBonus.morale * 0.3;

    const redPenalty = sentOffRef.current.length * 6;
    attackBonus -= redPenalty;
    defenseBonus -= redPenalty;
    midfieldBonus -= redPenalty * 0.8;
    possessionBonus -= redPenalty * 1.2;

    attackBonus += starAttack;
    defenseBonus += starDefense;

    const energyMultiplier = 0.7 + (avgEnergy / 100) * 0.3;
    const moraleMultiplier = 0.85 + (avgMorale / 100) * 0.15;
    const chemBonus = 0.9 + chemistry * 0.1;

    return {
      attack: (effAvg + attackBonus) * energyMultiplier * moraleMultiplier * chemBonus,
      defense: (effAvg + defenseBonus) * energyMultiplier * moraleMultiplier * chemBonus,
      midfield: (effAvg + midfieldBonus) * energyMultiplier * moraleMultiplier * chemBonus,
      possessionBase: 50 + possessionBonus,
      overall: Math.round(avgOvr),
      effectiveRounded: Math.round(effAvg),
      penaltyTotal: Math.max(0, avgOvr - effAvg),
      teamAdaptPct,
      starAttack,
      starDefense,
      attOvr,
      midOvr,
      defOvr,
      effectiveOverall: effAvg * energyMultiplier * moraleMultiplier * chemBonus,
      midfieldOverall: (effAvg + midfieldBonus) * energyMultiplier * moraleMultiplier * chemBonus,
    };
  }, [gameState, activeLineup, isHome, sentOff, talkBonus, defensiveLine, width, creativity, pressingIntensity, tempoValue, formationProfile]);

  const userStrength = calculateStrength();
  const oppOvr = Math.floor(opponent.ovr * (diffCfg?.oppOvrMult || 1));

  // ── v5.1 RAKİP KADROSU — takım adı+sezondan deterministik üretilen isimler.
  // Rakip golleri, kartları ve MOTM'u artık gerçek isimli oyunculara gider;
  // "rastgele isim makinesi" hissi biter.
  const oppSquad = useMemo(() => {
    const base = hashText(`${opponent.name}|${gameState.season}`);
    const roles: Player['role'][] = ['KL', 'STP', 'STP', 'SB', 'SB', 'OS', 'OS', 'OS', 'FW', 'FW', 'FW', 'OS', 'STP', 'SB'];
    return roles.map((role, i) => ({
      name: `${FIRST_NAMES[(base + i * 37) % FIRST_NAMES.length]} ${LAST_NAMES[(base + i * 53 + 7) % LAST_NAMES.length]}`,
      role,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponent.name, gameState.season]);
  const oppPlayerName = useCallback((roles: Player['role'][]) => {
    const pool = oppSquad.filter(p => roles.includes(p.role));
    return (pool.length ? pool[Math.floor(Math.random() * pool.length)] : oppSquad[8]).name;
  }, [oppSquad]);
  // Rakip kırmızı kartları gücü gerçekten düşürür (her kırmızı ≈ -5%)
  const oppStrength = {
    attack: oppOvr * Math.max(0.7, 1 - oppReds * 0.05) * (isHome ? 1 : 1.03),
    defense: oppOvr * Math.max(0.7, 1 - oppReds * 0.05) * (isHome ? 1 : 1.03),
    midfield: oppOvr * Math.max(0.72, 1 - oppReds * 0.04) * (isHome ? 0.98 : 1.02),
    overall: oppOvr
  };
  const userKeeper = activeLineup.find(p => p.role === 'KL' && !p.injured && !sentOff.includes(p.id));
  const userKeeperSaveBonus = userKeeper
    ? Math.max(-0.035, Math.min(0.06, (userKeeper.ovr - 72) * 0.002 + ((userKeeper.energy - 55) * 0.00035) + ((userKeeper.morale - 50) * 0.0002)))
    : -0.01;
  const oppKeeperSaveBonus = Math.max(-0.035, Math.min(0.06, (oppOvr - 72) * 0.002));

  const addEvent = useCallback((event: MatchEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const getRandomPlayer = useCallback((forGoal: boolean = false, roleFilter?: Player['role'][]): Player => {
    let pool = activeLineup.filter(p => !p.injured && !sentOff.includes(p.id));
    if (pool.length === 0) pool = activeLineup;
    if (roleFilter && roleFilter.length > 0) {
      const filtered = pool.filter(p => roleFilter.includes(p.role));
      if (filtered.length > 0) pool = filtered;
    }
    if (forGoal) {
      const tAvg = pool.reduce((a, p) => a + p.ovr, 0) / Math.max(1, pool.length);
      const chem = gameState.teamChemistry ?? 55;
      const weights = pool.map(p => {
        let base: number;
        if (gameState.setPieceTakers?.penalty === p.id) base = 5.5;
        else if (p.role === 'FW') base = 5.2;
        else if (p.role === 'OS') base = 2.8;
        else if (p.role === 'SB') base = 1.3;
        else base = 0.4;
        const eff = effectiveOvr(p, tAvg, chem);
        const ovrF = 0.4 + eff / 100;
        const formF = 0.7 + (p.form ?? 5) / 16.6;
        const moraleF = 0.85 + p.morale / 500;
        const energyF = 0.85 + p.energy / 500;
        return Math.max(0.05, base * ovrF * formF * moraleF * energyF);
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < pool.length; i++) {
        random -= weights[i];
        if (random <= 0) return pool[i];
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, [activeLineup, sentOff, gameState.setPieceTakers, gameState.teamChemistry]);

  const addUserGoal = useCallback((player: Player | null, assist: Player | null, description: string, xgVal?: number) => {
    lastGoalMinuteRef.current = minuteRef.current;
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
    pushSpiker(`⚽ GOOOOLL! ${player?.name || 'Takım'} affetmedi! xG ${xgVal ? xgVal.toFixed(2) : (Math.random()*0.4+0.3).toFixed(2)}`);
    setGoalFlash(true);
    setTimeout(() => setGoalFlash(false), 900);
    setCelebration({ team: 'home', player: player?.name, key: Date.now() });
    setTimeout(() => setCelebration(null), 3400);
    addEvent({ minute: minuteRef.current, type: 'goal', team: 'home', player: player?.name, description, xg: xgVal });
    momentumRef.current.home = Math.min(5, momentumRef.current.home + 1.5);
    momentumRef.current.away = Math.max(-3, momentumRef.current.away - 0.8);
  }, [addEvent, play]);

  // ── GERÇEKÇİ MAÇ SİMÜLASYONU — ZİNCİRLEME MODEL ──
  const simulateMinute = useCallback((currentMinute: number, isExtra: boolean) => {
    // 🐛 FIX/BERABERLİK BELASI: yorgunluk gol üretimini fazla kırıyordu (0-0/1-0 serisi).
    // Artık son 20 dakika gol dostu — yorgun savunmalar hata yapar, maçlar ateşlenir.
    const fatigueGoalMult = currentMinute > 80 ? 1.08 : currentMinute > 66 ? 1.02 : 1;
    const goalMult = (weatherInfo.goalMult || 1) * (isExtra ? 0.75 : 1) * fatigueGoalMult;

    // Yorgunluk ve zemin
    if ((currentMinute === 68 || currentMinute === 83) && Math.random() < 0.72) {
      const tiredPool = activeLineup.filter(p => !sentOff.includes(p.id) && !p.injured).sort((a, b) => a.energy - b.energy);
      const tired = tiredPool[0];
      if (tired) addEvent({ minute: currentMinute, type: 'info', team: 'home', description: `🥵 ${tired.name} yorgun düşüyor — tempo düştü, 2D'de ağırlaştılar! Değişiklik düşün.` });
    }
    const isWet = weather === 'rain' || weather === 'storm' || weather === 'snow';
    if (isWet && Math.random() < 0.072 && currentMinute > 10) {
      const slipper = Math.random() < 0.62 ? getRandomPlayer(false) : null;
      if (slipper) {
        if (Math.random() < 0.55) setFouls(f => ({ ...f, home: f.home + 1 }));
        else setFouls(f => ({ ...f, away: f.away + 1 }));
        addEvent({ minute: currentMinute, type: 'info', team: Math.random() < 0.5 ? 'home' : 'away', description: `💦 ${slipper.name} kaygan zeminde kaydı! Top sekti, faul riski ↑` });
      } else {
        addEvent({ minute: currentMinute, type: 'info', team: 'away', description: `💦 ${opponent.name} kaygan zeminde kontrolü kaybetti — top sekiyor` });
      }
    }

    // ── 1. ORTA SAHA SAVAŞI — top kimde? ──
    // Orta saha üstünlüğü + pres + momentum
    const midDiff = userStrength.midfield - oppStrength.midfield;
    const pressingFactor = (pressingIntensity - 50) / 100; // -0.5 to 0.5
    const momentum = momentumRef.current.home - momentumRef.current.away;
    const midfieldWinChance = 0.5 + midDiff * 0.012 + pressingFactor * 0.08 + momentum * 0.03 + (userStrength.possessionBase - 50) * 0.008;

    // Possession drift — daha yumuşak, gerçekçi
    if (Math.random() < 0.38) {
      const drift = (Math.random() - 0.5) * 4 + (midfieldWinChance - 0.5) * 8;
      setPossession(prev => Math.max(28, Math.min(72, prev + drift)));
    }

    // ── v5.1 RAKİP YAPAY ZEKÂSI — skor okuyup davranış değiştirir ──
    // Yenilen rakip yüklenir, öndeki rakip kontrollü oynar, beraberlikte son 20 dk iki taraf da açılır.
    const scoreDiffOpp = scoreRef.current.o - scoreRef.current.u; // rakip bakış açısıyla skor farkı
    const minuteFactor = Math.min(1, currentMinute / 90);
    let oppPush = 0;
    if (scoreDiffOpp < 0) {
      // Yenilen rakip: geride ne kadar fazlaysa ve maç ilerledikçe daha agresif
      oppPush = Math.min(0.26, 0.06 + minuteFactor * 0.14 + Math.min(1, -scoreDiffOpp) * 0.05);
      if (currentMinute > 80 && scoreDiffOpp === -1) oppPush = 0.3; // beraberlik/maç uzatma baskısı
    } else if (scoreDiffOpp >= 2) {
      oppPush = -0.14; // rahat öndeki rakip kontra bekler
    } else if (currentMinute > 70 && scoreDiffOpp === 0) {
      oppPush = 0.07; // beraberlikte son dönem iki taraf da kazanmak ister
    }
    // Kullanıcı da yenilirken yüklenir (maçlar ölü olmasın)
    const userPush = scoreRef.current.u < scoreRef.current.o && currentMinute > 65
      ? Math.min(0.2, 0.06 + minuteFactor * 0.1 + (currentMinute > 85 ? 0.06 : 0))
      : 0;
    if (userPush > 0 && currentMinute % 17 === 0) {
      addEvent({ minute: currentMinute, type: 'info', team: 'home', description: `🔥 ${gameState.teamName} geride — yükleniyor! ${currentMinute}. dakikada herkes hücumda.` });
    }

    // ── v5.1 HIZLI ZİNCİR AKIŞI ──
    // Her dakika pas zinciri büyür; top kaybı (turnover) dakika başına ~%16-24.
    // Eski model zincirleri nadiren "final" evresine taşıdığı için maçlar şutsuz geçiyordu.
    possessionChainRef.current.passes += 1;
    const chainNow = possessionChainRef.current;
    if (chainNow.passes > 2 && chainNow.phase === 'build') chainNow.phase = 'mid';
    if (chainNow.passes > 5 && chainNow.phase === 'mid') chainNow.phase = 'final';

    // Güçlü orta saha topu korur, zayıf daha sık kaptırır
    const chainMidEdge = chainNow.team === 'home' ? midfieldWinChance - 0.5 : 0.5 - midfieldWinChance;
    const turnoverChance = Math.max(0.1, 0.17 - chainMidEdge * 0.5 + (chainNow.phase === 'final' ? 0.03 : 0));
    if (Math.random() < turnoverChance) {
      const newTeam = Math.random() < midfieldWinChance ? 'home' : 'away';
      if (newTeam !== chainNow.team) {
        possessionChainRef.current = { team: newTeam, phase: 'build', passes: 0 };
        // Top kapma olayı
        if (Math.random() < 0.55) {
          const tackler = newTeam === 'home' ? getRandomPlayer(false, ['STP', 'SB']) : null;
          const type = Math.random() < 0.5 ? 'tackle' : 'interception';
          if (tackler) {
            addEvent({
              minute: currentMinute,
              type: type as any,
              team: newTeam,
              player: tackler.name,
              description: type === 'tackle' ? `🦶 ${tackler.name} kritik müdahale! Topu kazandı` : `🛡️ ${tackler.name} araya girdi, pası kesti!`
            });
          } else {
            addEvent({
              minute: currentMinute,
              type: type as any,
              team: newTeam,
              description: `${newTeam === 'home' ? gameState.teamName : opponent.name} topu kazandı — ${type === 'tackle' ? 'müdahale' : 'pres'} başarılı!`
            });
          }
        }
      }
    }

    // ── 2. ŞANS YARATMA — pas zinciri başarılı mı? ──
    const chain = possessionChainRef.current;
    const chainTeam = chain.team;
    const isUserChain = chainTeam === 'home';

    // Yaratıcılık, tempo, pres (pas riski hesabında kullanılır)
    const creativityFactor = (creativity - 50) / 50; // -1 to 1
    const tempoFactor = (tempoValue - 50) / 50;

    // 🐛 FIX: pas riski eski halinde zincirleri çok öldürüyordu — şut üretimi düşük kalıyordu.
    const passRisk = 0.09 + Math.abs(tempoFactor) * 0.09 + (creativityFactor > 0 ? creativityFactor * 0.06 : 0);
    const losesPossession = Math.random() < passRisk && chain.phase !== 'build';

    if (losesPossession) {
      possessionChainRef.current = { team: isUserChain ? 'away' : 'home', phase: 'build', passes: 0 };
      return;
    }

    // Final bölgesine ulaşıldı mı? — v5.1: zincirler artık çok daha sık hücuma dönüyor
    const chainPhaseBonus = oppRedsRef.current * 0.03; // rakip 10 kişiye düştüyse alan açılır
    const finalChance = (chain.phase === 'final' ? 0.55 : chain.phase === 'mid' ? 0.26 : 0.08) + chainPhaseBonus;
    // Ofansif taktikler ve genişlik final şansını artırır
    const widthFactor = (width - 50) / 50;
    const dlFactor = (defensiveLine - 50) / 50;
    // Rakip YZ baskısı: yenilen rakip son bölgeye daha sık gelir; öndeki rakip az gelir
    const oppAiBoost = isUserChain ? 0 : oppPush;
    const userPushBoost = isUserChain ? userPush : 0;
    const finalBoost = (isUserChain
      ? (formationProfile.attackBias - 0.5) * 0.15 + widthFactor * 0.08 + dlFactor * 0.06
      : 0) + oppAiBoost + userPushBoost;
    const shouldCreateChance = Math.random() < (finalChance + finalBoost);

    if (!shouldCreateChance) {
      // Ara pas trafiği — hafif olaylar
      if (Math.random() < 0.28) {
        const mover = isUserChain ? getRandomPlayer(false) : null;
        if (mover && isUserChain) {
          const moves = chain.phase === 'build'
            ? [`⚽ ${mover.name} geriden oyun kuruyor`, `🔄 ${mover.name} stoperlerle paslaşıyor`, `↗️ ${mover.name} orta sahaya taşıdı`]
            : [`⚽ ${mover.name} topu sürüyor — kanada açıldı`, `🌀 ${mover.name} topu saklıyor, tempo yapıyor`, `🎯 Orta sahada ${mover.name} oyunu kuruyor`];
          addEvent({ minute: currentMinute, type: 'info', team: 'home', description: moves[Math.floor(Math.random() * moves.length)] });
        } else if (!isUserChain) {
          const awayMoves = chain.phase === 'build'
            ? [`🔴 ${opponent.name} geriden kuruyor`, `🔄 ${opponent.name} pas trafiği kuruyor`]
            : [`🔴 ${opponent.name} top çeviriyor`, `↘️ ${opponent.name} kanattan geliyor`, `💨 ${opponent.name} hızlı hücuma çıkıyor`];
          // 🐛 FIX: 'away' olay tipi + state mutasyonu yok — düzgün tip/team ile ekle
          addEvent({ minute: currentMinute, type: 'info', team: 'away', description: awayMoves[Math.floor(Math.random() * awayMoves.length)] });
        }
      }
      return;
    }

    // ── 3. ŞANS TİPİ BELİRLEME ──
    // Kanat vs merkez, ortalar vs ara paslar — v5.1: uzaktan şut payı azaldı,
    // ara paslar ve ceza sahası içi pozisyonlar arttı (daha fazla net pozisyon)
    const isWidePlay = Math.random() < (formationProfile.wingWeight * 0.5 + widthFactor * 0.25 + 0.15);
    const isThroughBall = !isWidePlay && Math.random() < (0.32 + creativityFactor * 0.18);
    const isCross = isWidePlay && Math.random() < 0.6;
    const isLongShot = !isWidePlay && !isThroughBall && Math.random() < 0.1;
    const isSetPiece = Math.random() < 0.12; // korner/frikik sonrası

    let shotType: 'open' | 'header' | 'volley' | 'oneonone' | 'long' | 'freekick' | 'penalty' = 'open';
    let distance = 16 + Math.random() * 10;
    let angle = Math.random() * 35;
    let pressure = 0.3 + Math.random() * 0.4;

    if (isCross) {
      shotType = Math.random() < 0.6 ? 'header' : 'volley';
      distance = 6 + Math.random() * 8;
      angle = 15 + Math.random() * 40;
      pressure = 0.4 + Math.random() * 0.3;
    } else if (isThroughBall) {
      shotType = Math.random() < 0.45 ? 'oneonone' : 'open';
      distance = 8 + Math.random() * 8;
      angle = Math.random() * 25;
      pressure = 0.15 + Math.random() * 0.25;
    } else if (isLongShot) {
      shotType = 'long';
      distance = 22 + Math.random() * 8;
      angle = Math.random() * 30;
      pressure = 0.2 + Math.random() * 0.3;
    } else {
      distance = 12 + Math.random() * 10;
      angle = Math.random() * 30;
      pressure = 0.35 + Math.random() * 0.35;
    }

    // Ofsayt kontrolü — defans çizgisi yüksekse ofsayt daha olası
    const offsideLineRisk = isUserChain
      ? Math.max(0, (50 - defensiveLine) / 100) // rakip derindeyse ofsayt az
      : Math.max(0, (defensiveLine - 50) / 100 * 0.8); // biz öndeysek rakip ofsayta düşer

    // Ama through ball'lar ofsayt riskini artırır
    const offsideChance = (isThroughBall ? 0.18 : 0.06) + offsideLineRisk * 0.25;
    if (Math.random() < offsideChance) {
      const offPlayer = isUserChain ? getRandomPlayer(true, ['FW', 'OS']) : null;
      addEvent({
        minute: currentMinute,
        type: 'offside',
        team: chainTeam,
        player: offPlayer?.name,
        description: offPlayer ? `🚩 ${offPlayer.name} ofsayta yakalandı! ${isThroughBall ? 'Ara pası biraz hızlı...' : 'Savunma çizgisi dikkatli'}` : `🚩 Ofsayt! ${chainTeam === 'home' ? gameState.teamName : opponent.name} atağı durdu`
      });
      possessionChainRef.current = { team: isUserChain ? 'away' : 'home', phase: 'build', passes: 0 };
      return;
    }

    // ── 4. xG HESABI VE ŞUT ──
    const keeperOvr = isUserChain ? oppOvr : (userKeeper?.ovr || 70);
    const xgVal = calculateXG({ distance, angle, shotType, pressure, keeperOvr, weather });

    // Şut çekildi
    if (isUserChain) {
      setShots(s => ({ ...s, home: s.home + 1 }));
      setXg(x => ({ ...x, home: +(x.home + xgVal).toFixed(2) }));
      if (isSetPiece || isCross) {
        if (Math.random() < 0.5) setCorners(c => ({ ...c, home: c.home + 1 }));
      }
    } else {
      setShots(s => ({ ...s, away: s.away + 1 }));
      setXg(x => ({ ...x, away: +(x.away + xgVal).toFixed(2) }));
      if (isSetPiece || isCross) {
        if (Math.random() < 0.5) setCorners(c => ({ ...c, away: c.away + 1 }));
      }
    }

    // Gol şansı — xG'ye göre + taktik bonuslar
    const ovrDiff = isUserChain ? userStrength.attack - oppStrength.defense : oppStrength.attack - userStrength.defense;
    const formBoost = isUserChain ? userStrength.starAttack * 0.015 : 0;
    const defReduction = isUserChain ? 0 : userStrength.starDefense * 0.01;
    const keeperSave = isUserChain ? oppKeeperSaveBonus : userKeeperSaveBonus;

    // xG'yi gol olasılığına çevir — xG zaten olasılık ama OVR farkı ve kaleci eklenir
    let goalProb = xgVal * 1.22; // v5.1: bitiricilik arttı — pozisyonlar artık daha sık gole dönüşüyor
    goalProb += ovrDiff * 0.004; // OVR farkı etkisi
    goalProb += formBoost;
    goalProb -= defReduction;
    goalProb -= keeperSave;
    // Rakip YZ: yüklenen rakip pozisyonlarını daha cesur bitirir, geri çekilen daha tembel
    if (!isUserChain) goalProb *= 1 + oppPush * 1.6;
    goalProb *= goalMult;
    goalProb = Math.max(0.02, Math.min(0.9, goalProb));

    const roll = Math.random();

    if (isUserChain) {
      // Kullanıcı atağı
      if (roll < goalProb && currentMinute - lastGoalMinuteRef.current >= 1) {
        // Mini oyun tetikleme — sadece yüksek xG'lerde ve nadir
        if (mgCountRef.current < 2 && xgVal > 0.28 && Math.random() < 0.22 && !pausedRef.current) {
          // 🐛 FIX: shotType hiç 'penalty' olamıyordu (ölü kod) — artık penaltı gerçekten atılabilir
          const isPen = Math.random() < 0.3 && xgVal > 0.4;
          const takerId = isPen ? gameState.setPieceTakers?.penalty : gameState.setPieceTakers?.freekick;
          const taker = activeLineup.find(p => p.id === takerId && !p.injured && !sentOff.includes(p.id));
          const scorer = taker || getRandomPlayer(true, isCross ? ['FW', 'STP'] : ['FW', 'OS']);
          mgCountRef.current += 1;
          pausedRef.current = true;
          setPendingScorer(scorer);
          addEvent({
            minute: currentMinute,
            type: 'info',
            team: 'home',
            description: isPen
              ? `⏸️ PENALTI! ${scorer.name} topun başında — sen kullan! (xG ${xgVal.toFixed(2)})`
              : `⏸️ TEHLİKELİ ${isCross ? 'KAFA' : 'ŞUT'}! ${scorer.name} vuracak — sen kontrol et! (xG ${xgVal.toFixed(2)})`
          });
          setMatchMinigame({
            type: isPen ? 'penalty' : 'freekick',
            title: isPen ? 'Penaltı!' : isCross ? 'Kafa Vuruşu!' : 'Frikik!',
            description: `${currentMinute}' — ${scorer.name} • xG ${xgVal.toFixed(2)}`,
            inMatch: true,
            playerName: scorer.name
          });
          return;
        }

        const scorer = getRandomPlayer(true, isCross ? ['FW', 'STP', 'OS'] : ['FW', 'OS']);
        const assister = Math.random() > 0.32 ? getRandomPlayer(false, isWidePlay ? ['SB', 'OS'] : ['OS', 'SB']) : null;
        let desc = '';
        if (isCross) {
          desc = shotType === 'header'
            ? `${assister ? assister.name + ' ortaladı, ' : ''}${scorer.name} kafayla ağlara gönderdi!`
            : `${assister ? assister.name + ' ortası, ' : ''}${scorer.name} voleyle bitirdi!`;
        } else if (isThroughBall) {
          desc = `${assister ? assister.name + ' ara pası, ' : ''}${scorer.name} ${shotType === 'oneonone' ? 'kaleciyle karşı karşıya affetmedi' : 'ceza sahasında bitirdi'}!`;
        } else if (isLongShot) {
          desc = `${scorer.name} uzaklardan sert vurdu — kaleci çaresiz!`;
        } else {
          const template = MATCH_EVENTS.goals[Math.floor(Math.random() * MATCH_EVENTS.goals.length)];
          desc = template.replace('{player}', scorer.name) + (assister && assister.id !== scorer.id ? ` (Asist: ${assister.name})` : '');
        }
        addUserGoal(scorer, assister, desc, xgVal);
        possessionChainRef.current = { team: 'away', phase: 'build', passes: 0 };
      } else if (roll < goalProb + 0.28) {
        const player = getRandomPlayer(true, isCross ? ['FW', 'STP'] : ['FW', 'OS']);
        const saveDesc = shotType === 'header'
          ? `${player.name} kafa vuruşu — kaleci son anda çeldi!`
          : shotType === 'long'
          ? `${player.name} uzaktan denedi — kaleci uzandı kurtardı!`
          : `${player.name} şut çekti ama kaleci kurtardı! (xG ${xgVal.toFixed(2)})`;
        addEvent({ minute: currentMinute, type: 'save', team: 'home', player: player.name, description: saveDesc, xg: xgVal });
        momentumRef.current.home = Math.min(3, momentumRef.current.home + 0.2);
      } else if (roll < goalProb + 0.42) {
        addEvent({
          minute: currentMinute, type: 'chance', team: 'home',
          description: `${getRandomPlayer(true).name} pozisyonu harcadı — ${shotType === 'header' ? 'kafa auta' : shotType === 'long' ? 'top üstten auta' : 'şut yandan auta'}! (xG ${xgVal.toFixed(2)})`,
          xg: xgVal
        });
      } else {
        // Bloklandı / korner
        if (Math.random() < 0.35) {
          setCorners(c => ({ ...c, home: c.home + 1 }));
          addEvent({ minute: currentMinute, type: 'corner', team: 'home', description: `🚩 Korner! ${gameState.teamName} baskıyı sürdürüyor (xG ${xgVal.toFixed(2)})`, xg: xgVal });
        } else {
          addEvent({ minute: currentMinute, type: 'info', team: 'home', description: `🛡️ ${opponent.name} savunması ${shotType === 'header' ? 'kafayı' : 'şutu'} blokladı!` });
        }
      }
    } else {
      // Rakip atağı
      if (roll < goalProb && currentMinute - lastGoalMinuteRef.current >= 1) {
        if (mgCountRef.current < 2 && xgVal > 0.25 && Math.random() < 0.28 && !pausedRef.current) {
          mgCountRef.current += 1;
          pausedRef.current = true;
          addEvent({ minute: currentMinute, type: 'info', team: 'away', description: `⏸️ RAKİP NET POZİSYON! xG ${xgVal.toFixed(2)} — Kaleci, kurtar!` });
          setMatchMinigame({
            type: 'keeper_save', title: 'Kaleci Anı!',
            description: `${currentMinute}' — ${opponent.name} tehlikeli pozisyon • xG ${xgVal.toFixed(2)}`,
            inMatch: true, playerName: 'Kaleci'
          });
          return;
        }
        lastGoalMinuteRef.current = currentMinute;
        scoreRef.current.o += 1;
        setOppScore(scoreRef.current.o);
        play(sfx.conceded);
        const oppScorerName = oppPlayerName(isCross ? ['FW', 'STP'] : isThroughBall ? ['FW', 'OS'] : ['FW', 'OS', 'SB']);
        pushSpiker(`❌ ${oppScorerName} (${opponent.name}) ağları havalandırdı! xG ${xgVal.toFixed(2)}`);
        setCelebration({ team: 'away', player: oppScorerName, key: Date.now() });
        setTimeout(() => setCelebration(null), 2200);
        addEvent({
          minute: currentMinute, type: 'goal', team: 'away',
          player: oppScorerName,
          description: `❌ GOL — ${oppScorerName}! ${opponent.name}${isCross ? ' orta kafa golüyle' : isThroughBall ? ' ara pası golüyle' : ' organize atağıyla'} öne geçiyor/geçiyor (xG ${xgVal.toFixed(2)})`,
          xg: xgVal
        });
        momentumRef.current.away = Math.min(4, momentumRef.current.away + 1.2);
        momentumRef.current.home = Math.max(-3, momentumRef.current.home - 0.6);
        possessionChainRef.current = { team: 'home', phase: 'build', passes: 0 };
      } else if (roll < goalProb + 0.25) {
        addEvent({ minute: currentMinute, type: 'chance', team: 'away', description: `${opponent.name} tehlikeli geldi — xG ${xgVal.toFixed(2)} ama sonuç yok!`, xg: xgVal });
        momentumRef.current.away = Math.min(2, momentumRef.current.away + 0.15);
      } else if (roll < goalProb + 0.42) {
        addEvent({ minute: currentMinute, type: 'save', team: 'home', description: `🧤 Kalecimiz ${opponent.name} ${shotType === 'header' ? 'kafa vuruşunu' : 'şutunu'} kurtardı! (xG ${xgVal.toFixed(2)})`, xg: xgVal });
      } else {
        if (Math.random() < 0.32) {
          setCorners(c => ({ ...c, away: c.away + 1 }));
          addEvent({ minute: currentMinute, type: 'corner', team: 'away', description: `🚩 Korner — ${opponent.name} yükleniyor`, xg: xgVal });
        }
      }
    }

    // ── FAUL & KARTLAR — pres yoğunluğuna bağlı ──
    const foulBase = 0.055 + (pressingIntensity - 50) / 500 + (isWet ? 0.02 : 0);
    if (Math.random() < foulBase) {
      const foulTeam = Math.random() < 0.5 ? 'home' : 'away';
      setFouls(f => foulTeam === 'home' ? { ...f, home: f.home + 1 } : { ...f, away: f.away + 1 });
      if (Math.random() < 0.35) {
        const foulPlayer = foulTeam === 'home' ? getRandomPlayer(false, ['STP', 'SB']) : null;
        addEvent({
          minute: currentMinute,
          type: 'foul',
          team: foulTeam as any,
          player: foulPlayer?.name,
          description: foulPlayer ? `⚠️ ${foulPlayer.name} faul yaptı — ${pressingIntensity > 70 ? 'yoğun presin bedeli' : 'sert müdahale'}` : `⚠️ Faul — ${foulTeam === 'home' ? gameState.teamName : opponent.name} serbest vuruş kazandı`
        });
      }
    }

    if (Math.random() < (0.012 + (pressingIntensity - 50) / 5000) && currentMinute > 10) {
      // 🐛 FIX: kartlar eskiden yalnızca bizim oyunculara çıkıyordu — hakem artık tarafsız (rakip ~%45)
      const cardForOpponent = Math.random() < 0.45;

      if (cardForOpponent) {
        const oppName = oppPlayerName(['STP', 'SB', 'OS']);
        const isOppRed = Math.random() < 0.09;
        if (isOppRed) {
          oppRedsRef.current += 1;
          setOppReds(oppRedsRef.current);
          play(sfx.card);
          setCardPop({ player: oppName, kind: 'red', key: Date.now() });
          setTimeout(() => setCardPop(null), 2600);
          triggerSlowMo(3600);
          pushSpiker(`🟥 ${oppName} (${opponent.name}) kırmızı kart! Rakip 10 kişi!`);
          addEvent({
            minute: currentMinute, type: 'card', team: 'away', player: oppName,
            description: `🟥 ${oppName} (${opponent.name}) kırmızı kart gördü — rakip 10 kişi kaldı! Devrim fırsatı!`
          });
        } else {
          play(sfx.card);
          setCardPop({ player: oppName, kind: 'yellow', key: Date.now() });
          setTimeout(() => setCardPop(null), 2600);
          triggerSlowMo(2600);
          pushSpiker(`🟨 ${oppName} (${opponent.name}) sarı kart gördü`);
          addEvent({
            minute: currentMinute, type: 'card', team: 'away', player: oppName,
            description: `🟨 ${oppName} (${opponent.name}) sarı kart gördü — rakip savunmada gerilim var.`
          });
        }
        return; // aynı dakikada iki kart çıkmasın
      }

      const player = getRandomPlayer(false, ['STP', 'SB', 'OS']);
      const isRed = Math.random() < 0.09;
      const record = cardMapRef.current.get(player.id) || { yellow: 0, red: 0 };

      if (isRed) {
        record.red += 1;
        cardMapRef.current.set(player.id, record);
        sentOffRef.current = [...sentOffRef.current, player.id];
        setSentOff(sentOffRef.current);
        play(sfx.card);
        setCardPop({ player: player.name, kind: 'red', key: Date.now() });
        setTimeout(() => setCardPop(null), 2600);
        triggerSlowMo(3600);
        pushSpiker(`🟥 ${player.name} kırmızı kart!`);
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
        setCardPop({ player: player.name, kind: secondYellow ? 'second' : 'yellow', key: Date.now() });
        setTimeout(() => setCardPop(null), 2600);
        triggerSlowMo(secondYellow ? 3400 : 2600);
        pushSpiker(secondYellow ? `🟨🟥 ${player.name} ikinci sarıdan atıldı` : `🟨 ${player.name} sarı kart gördü`);
        if (secondYellow) {
          record.red += 1;
          cardMapRef.current.set(player.id, record);
          sentOffRef.current = [...sentOffRef.current, player.id];
          setSentOff(sentOffRef.current);
          setActiveLineup(prev => prev.map(p => (p.id === player.id ? { ...p, redCard: true } : p)));
        }
        addEvent({
          minute: currentMinute, type: 'card', team: 'home', player: player.name,
          description: secondYellow ? `🟨🟥 ${player.name} ikinci sarıdan atıldı!` : `🟨 ${player.name} sarı kart gördü.`
        });
      }
    }

    // Sakatlıklar
    const injuryChance = 0.0045 * (diffCfg?.injuryMult || 1) * (weatherInfo.injuryMult || 1) *
      (1 - skillInjuryReduction(gameState.skills?.medical ?? 0)) * (isWet ? 1.15 : 1) * (pressingIntensity > 75 ? 1.2 : 1);
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
        if (substitutions.length < 5) {
          const replacement = activeBench.find(p => !p.injured);
          if (replacement) {
            playedRef.current.add(replacement.id);
            setActiveLineup(prev => prev.map(p =>
              p.id === player.id ? { ...replacement, t: p.t, l: p.l, role: p.role } : p
            ));
            setActiveBench(prev => [...prev.filter(p => p.id !== replacement.id), { ...player, t: undefined, l: undefined }]);
            setSubstitutions(prev => [...prev, player.id]);
            addEvent({
              minute: currentMinute, type: 'substitution', team: 'home',
              description: `🔄 Zorunlu değişiklik: ${player.name} ⇄ ${replacement.name}`
            });
            setSubBoard({ outName: player.name, inName: replacement.name, outRole: player.role, inRole: replacement.role, key: Date.now() });
            setTimeout(() => setSubBoard(null), 2800);
          }
        }
      }
    }

    // ── v5.1 RAKİP DEĞİŞİKLİKLERİ — rakip da oyuncu değiştirir, chat'e düşer ──
    const oppSubMinutes = [58, 64, 71, 78, 84];
    if (oppSubMinutes.includes(currentMinute) && Math.random() < 0.75) {
      const already = oppSubsRef.current.includes(currentMinute);
      if (!already) {
        oppSubsRef.current.push(currentMinute);
        const outName = oppPlayerName(['OS', 'FW']);
        const inName = oppSquad[11 + (oppSubsRef.current.length % 3)].name;
        const chasing = scoreRef.current.o < scoreRef.current.u;
        addEvent({
          minute: currentMinute, type: 'substitution', team: 'away', player: inName,
          description: chasing
            ? `🔄 ${opponent.name} değişiklik: ${outName} ⇄ ${inName} — geride olduğu için hücuma yükleniyor!`
            : `🔄 ${opponent.name} değişiklik: ${outName} ⇄ ${inName} — taze bacaklar oyunda.`
        });
      }
    }
    if (currentMinute === 75 && oppPush > 0.15) {
      addEvent({ minute: currentMinute, type: 'info', team: 'away', description: `📣 ${opponent.name} teknik direktörü kenardan bağırıyor: "İleri! İleri!" — rakip tam yüklenme modunda.` });
    }

    // Tempo yüksekse daha fazla olay, düşükse daha sakin
    const tempoEventChance = 0.18 + (tempoValue - 50) / 500;
    if (Math.random() < tempoEventChance && currentMinute % 7 === 0) {
      const comments = [
        `Orta saha mücadelesi kızışıyor... (pres %${pressingIntensity})`,
        `Taraftarlar ayakta! ${possessionChainRef.current.team === 'home' ? gameState.teamName : opponent.name} baskı kuruyor`,
        `Teknik direktörler kenarda talimat veriyor — defans çizgisi ${defensiveLine > 60 ? 'önde' : defensiveLine < 40 ? 'derinde' : 'dengede'}`,
        `${width > 65 ? 'Kanatlar geniş, ortalar geliyor' : width < 35 ? 'Dar alanda kısa paslar' : 'Orta koridor kalabalık'}`,
        WEATHER_INFO[weather]?.desc ?? 'Hava koşulları oyunu etkiliyor.',
        `${creativity > 70 ? 'Yaratıcı ara paslar deneniyor' : creativity < 30 ? 'Güvenli, garanti paslar' : 'Dengeli hücum'}`,
      ];
      addEvent({
        minute: currentMinute, type: 'info', team: 'home',
        description: comments[Math.floor(Math.random() * comments.length)]
      });
    }
  }, [
    userStrength, oppStrength, userKeeperSaveBonus, oppKeeperSaveBonus, opponent.name, gameState.teamName, gameState.setPieceTakers,
    addEvent, getRandomPlayer, diffCfg, weatherInfo, weather, addUserGoal, activeLineup, activeBench,
    substitutions, sentOff, play, triggerSlowMo, pushSpiker, defensiveLine, width, creativity, pressingIntensity, tempoValue, formationProfile,
    oppPlayerName, oppSquad
  ]);

  const buildRatings = useCallback((): { ratings: PlayerRating[]; motmPlayerId: number | null; motmName: string } => {
    const uScore = scoreRef.current.u;
    const oScore = scoreRef.current.o;
    const resultBonus = uScore > oScore ? 0.45 : uScore < oScore ? -0.45 : 0;
    const played = [...gameState.team11, ...gameState.bench].filter(p => playedRef.current.has(p.id));
    const rAvg = played.length > 0 ? played.reduce((a, p) => a + p.ovr, 0) / played.length : 70;
    const rChem = gameState.teamChemistry ?? 55;

    const list: PlayerRating[] = played.map(p => {
      const stats = scorers.get(p.id) || { goals: 0, assists: 0 };
      const card = cardMapRef.current.get(p.id) || { yellow: 0, red: 0 };
      const injured = injuryMapRef.current.has(p.id);
      const indBonus = Math.max(-0.8, Math.min(1.2, (effectiveOvr(p, rAvg, rChem) - rAvg) * 0.14));
      const base = 6.1 + ((p.form ?? 5) / 10) * 0.5 + indBonus;
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

    if (oScore > uScore && Math.random() < 0.65) {
      motmPlayerId = null;
      motmName = `${oppPlayerName(['FW', 'OS'])} (${opponent.name})`;
    }
    return { ratings: list, motmPlayerId, motmName };
  }, [gameState.team11, gameState.bench, gameState.teamChemistry, scorers, opponent.name]);

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
  useEffect(() => { phaseRef.current = phase; });

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
    const tickMs = (1333 / speed) * (slowMo ? 3.2 : 1);
    timerRef.current = setInterval(() => {
      if (pausedRef.current || finishedRef.current) return;
      const next = minuteRef.current + 1;
      if ((next > 90 && !extraTimeRef.current) || next > 120) return;
      minuteRef.current = next;
      setMinute(next);
      handlerRef.current(next, extraTimeRef.current);
    }, tickMs);
    return stopTimer;
  }, [matchRunning, speed, phase, slowMo]);

  useEffect(() => () => stopTimer(), []);

  const startMatch = () => {
    setPhase('first');
    pausedRef.current = false;
    playedRef.current = new Set(gameState.team11.map(p => p.id));
    possessionChainRef.current = { team: isHome ? 'home' : 'away', phase: 'build', passes: 0 };
    momentumRef.current = { home: isHome ? 0.5 : -0.3, away: isHome ? -0.3 : 0.5 };
    play(sfx.whistle);
    addEvent({ minute: 0, type: 'info', team: 'home', description: `🏟️ Hakem düdüğü çaldı, maç başladı! Formasyon: ${gameState.tactics.formation} • ${formationProfile.midfieldWeight > 0.6 ? 'Orta saha kalabalık' : 'Kanatlar açık'} • Pres %${pressingIntensity} • Tempo %${tempoValue}` });
    const sAvg = activeLineup.reduce((a, p) => a + p.ovr, 0) / Math.max(1, activeLineup.length);
    const sChem = gameState.teamChemistry ?? 55;
    const adapting = activeLineup.filter(p => adaptationPct(p) < 0.5 && (p.ovr - sAvg) >= 3);
    if (adapting.length > 0) {
      addEvent({ minute: 0, type: 'info', team: 'home', description: `🧩 ${adapting.slice(0, 3).map(p => `${p.name} (%${Math.round(adaptationPct(p) * 100)})`).join(', ')} henüz takıma tam alışamadı — bugün düşük oynayabilir!` });
    } else {
      const stars = activeLineup.filter(p => effectiveOvr(p, sAvg, sChem) >= 86);
      if (stars.length > 0) {
        addEvent({ minute: 0, type: 'info', team: 'home', description: `⭐ ${stars.slice(0, 2).map(p => p.name).join(', ')} tam uyumlu ve formda — maçı çevirebilir!` });
      }
    }
  };

  const applyTeamTalk = (choice: Talk) => {
    const leading = scoreRef.current.u - scoreRef.current.o;
    let effect = { attack: 0, defense: 0, morale: 0 };
    let text = '';
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
    if (slowMoTimer.current) { clearTimeout(slowMoTimer.current); slowMoTimer.current = null; }
    setSlowMo(false);
    resumeSim(0);
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
      addUserGoal(scorer, null, result.news, 0.75);
    } else if (result.goalConceded) {
      scoreRef.current.o += 1;
      setOppScore(scoreRef.current.o);
      play(sfx.conceded);
      setCelebration({ team: 'away', player: opponent.name, key: Date.now() });
      setTimeout(() => setCelebration(null), 2200);
      addEvent({ minute: minuteRef.current, type: 'goal', team: 'away', description: result.news, xg: 0.65 });
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
  }, [pendingScorer, addEvent, addUserGoal, resumeFromMinigame, play, opponent.name]);

  const makeSubstitution = (outId: number, inId: number) => {
    if (substitutions.length >= 5) { setShowSubModal(false); setSubOut(null); resumeSim(0); return; }
    const outPlayer = activeLineup.find(p => p.id === outId);
    const inPlayer = activeBench.find(p => p.id === inId);
    if (!outPlayer || !inPlayer) { setShowSubModal(false); setSubOut(null); resumeSim(0); return; }

    playedRef.current.add(inPlayer.id);
    setActiveLineup(prev => prev.map(p =>
      p.id === outId ? { ...inPlayer, t: outPlayer.t, l: outPlayer.l, role: outPlayer.role } : p
    ));
    setActiveBench(prev => [...prev.filter(p => p.id !== inId), { ...outPlayer, t: undefined, l: undefined }]);
    setSubstitutions(prev => [...prev, outId]);
    addEvent({ minute: minuteRef.current, type: 'substitution', team: 'home', description: `🔄 ${outPlayer.name} ⇄ ${inPlayer.name}` });
    play(sfx.whistle);
    setSubBoard({ outName: outPlayer.name, inName: inPlayer.name, outRole: outPlayer.role, inRole: inPlayer.role, key: Date.now() });
    setTimeout(() => setSubBoard(null), 2800);
    setShowSubModal(false);
    setSubOut(null);
    addEvent({ minute: minuteRef.current, type: 'info', team: 'home', description: `▶️ Değişiklik tamamlandı, oyun yeniden başladı (${inPlayer.name} sahada).` });
    resumeSim(900);
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
      xg,
      teamTalkMorale: talkBonus.morale,
      penaltyWinner
    };
    onMatchEnd(scoreRef.current.u, scoreRef.current.o, scorerArray, extras);
  };

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
  const subTeamAvg = activeLineup.reduce((a, p) => a + p.ovr, 0) / Math.max(1, activeLineup.length);
  const subChem = gameState.teamChemistry ?? 55;

  return (
    <div className={`fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-0 sm:p-2 lg:p-3 overflow-y-auto overflow-x-hidden ${goalFlash ? 'animate-goal-flash' : ''}`}>
      <div className="w-full max-w-5xl xl:max-w-6xl bg-gradient-to-b from-emerald-900 to-slate-900 rounded-none sm:rounded-2xl lg:rounded-3xl overflow-y-auto overflow-x-hidden custom-scroll shadow-2xl border-0 sm:border border-emerald-500/30 my-auto flex flex-col max-h-[100dvh] sm:max-h-[96dvh] lg:max-h-[92dvh]">
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-cyan-700 p-2 lg:p-3 flex items-center justify-between gap-2 flex-shrink-0 relative overflow-hidden rounded-t-none sm:rounded-t-2xl lg:rounded-t-3xl">
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div className="h-full bg-white/80 transition-all duration-500" style={{ width: `${Math.min(100, (minute / (extraTime ? 120 : 90)) * 100)}%` }} />
          </div>
          <div className="text-white text-xs lg:text-sm font-medium flex items-center gap-2 flex-nowrap overflow-x-auto custom-scroll whitespace-nowrap min-w-0 flex-1 py-0.5 [&>*]:shrink-0">
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
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${managerMatchBonus(gameState).attack > 0.2 ? 'bg-emerald-900/60 text-emerald-200' : managerMatchBonus(gameState).attack < -0.1 ? 'bg-red-900/60 text-red-200' : 'bg-black/25 text-white/80'}`}>
              🧑‍💼 {managerMatchBonus(gameState).label}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/25">
              {gameState.tactics.formation} • xG {xg.home.toFixed(2)}-{xg.away.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {freeze ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-500 text-white flex items-center gap-1">⏸️ DONDURULDU</span>
            ) : slowMo ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-black flex items-center gap-1 animate-pulse">🐢 YAVAŞ ÇEKİM</span>
            ) : null}
            {([1, 2, 4] as const).map(s => (
              <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-0.5 rounded text-xs font-bold ${speed === s ? 'bg-white text-emerald-700' : 'bg-emerald-800/50 text-white/70'}`}>{s}x</button>
            ))}
            <button onClick={skipMatch} disabled={!matchRunning} className="px-2 py-0.5 rounded text-xs font-bold bg-slate-600/70 text-white/85 disabled:opacity-40">⏭️ Atla</button>
          </div>
        </div>

        {(freeze || slowMo) && phase !== 'pre' && phase !== 'done' && (
          <div className={`px-3 py-1 text-[11px] font-black flex items-center justify-center gap-2 ${freeze ? 'bg-sky-500/90 text-white' : 'bg-amber-400/90 text-black'}`}>
            {freeze ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />{freeze.icon} {freeze.reason} — dakika {String(minute).padStart(2, '0')}' sabit</> : <>🐢 KART! Simülasyon yavaş çekimde</>}
          </div>
        )}

        {spiker && (
          <div className="bg-amber-500 text-black text-xs font-bold px-3 py-1.5 flex items-center gap-2 animate-pulse">
            <span className="bg-black text-amber-400 px-1.5 py-0.5 rounded text-[10px]">SPİKER</span>
            <span className="truncate">{spiker}</span>
          </div>
        )}

        <div className="bg-gradient-to-b from-slate-800 to-slate-900 px-2 py-2 lg:px-4 lg:py-3 flex-shrink-0 sticky top-0 z-20 shadow-[0_8px_24px_rgba(0,0,0,0.45)] border-b border-emerald-500/20">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="text-center flex-1">
              <div className="text-2xl lg:text-3xl">{gameState.teamLogo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{gameState.teamName}</div>
              <div className="text-emerald-400 text-xs font-bold">
                {userStrength.penaltyTotal > 0.5 ? <>OVR {userStrength.overall} → <span className="text-amber-300">sahada ~{userStrength.effectiveRounded}</span> 🧩%{userStrength.teamAdaptPct}</> : <>OVR: {userStrength.overall} <span className="text-slate-400">🧩%{userStrength.teamAdaptPct}</span></>}
                {sentOff.length > 0 && <span className="text-red-400"> • {11 - sentOff.length} kişi</span>}
              </div>
            </div>
            <div className="px-2 lg:px-6">
              <div className="text-3xl lg:text-5xl font-black text-white flex items-center gap-2 lg:gap-4">
                <span className={score.u > score.o ? 'text-emerald-400' : ''}>{score.u}</span>
                <span className="text-slate-500">-</span>
                <span className={score.o > score.u ? 'text-red-400' : ''}>{score.o}</span>
              </div>
              <div className="text-center mt-1">
                <div className="text-xl lg:text-2xl font-black text-amber-400 font-mono leading-none">{String(minute).padStart(2, '0')}'</div>
                <div className="text-[10px] text-slate-500">{phase === 'pre' ? 'Başlamadı' : phase === 'half' ? 'Devre arası' : phase === 'done' ? 'Bitti' : extraTime ? 'Uzatma' : 'Devam ediyor'}</div>
                {talk && <div className="text-[10px] text-amber-300 mt-0.5">💬 {talk === 'praise' ? 'Övgü' : talk === 'hairdryer' ? 'Fırça' : 'Sakin taktik'}</div>}
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl lg:text-3xl">{opponent.logo}</div>
              <div className="text-white font-bold text-xs lg:text-base truncate px-1">{opponent.name}</div>
              <div className="text-slate-400 text-xs">OVR: {oppOvr}{!isHome && <span className="text-amber-300"> • ev sahibi</span>}</div>
            </div>
          </div>
          {(phase !== 'pre') && (
            <div className="mt-2 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <MiniStat wide label="TOP HAKİMİYETİ" value={`%${Math.round(possession)} - %${Math.round(100 - possession)}`} />
                <MiniStat label="ŞUT" value={`${shots.home} - ${shots.away}`} />
                <MiniStat label="KORNER" value={`${corners.home} - ${corners.away}`} />
                <MiniStat label="FAUL" value={`${fouls.home} - ${fouls.away}`} />
                <MiniStat wide label="xG" value={`${xg.home.toFixed(2)} - ${xg.away.toFixed(2)}`} />
                <MiniStat label="DEĞİŞİKLİK" value={`${substitutions.length}/5`} />
              </div>
              <div className="mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${possession}%` }} />
                <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${100 - possession}%` }} />
              </div>
              <div className="mt-1 flex justify-center gap-2 text-[9px] text-slate-500">
                <span>Defans Çizgisi: {defensiveLine}</span>
                <span>• Genişlik: {width}</span>
                <span>• Yaratıcılık: {creativity}</span>
                <span>• Pres: {pressingIntensity}</span>
                <span>• Tempo: {tempoValue}</span>
              </div>
            </div>
          )}
        </div>

        {phase !== 'pre' && phase !== 'pens' && (
          <div className="px-2 lg:px-4 pt-3 flex-shrink-0">
            {view3d ? (
              <Match3D
                gameState={gameState}
                opponent={opponent}
                userIsHome={isHome}
                weather={weather}
                minute={minute}
                possession={possession}
                phase={phase}
                scoreUser={score.u}
                scoreOpp={score.o}
                lineup={activeLineup}
                userOnPitch={Math.max(7, 11 - sentOff.length - activeLineup.filter(p => p.injured || p.redCard).length)}
                oppOnPitch={Math.max(7, 11 - oppReds)}
                events={events}
                paused={freeze !== null}
                slowMo={slowMo}
                lowPerf={!!gameState.life?.lowPerf}
                onFallback={() => setView3d(false)}
                className="h-[46vh] min-h-[300px] max-h-[520px]"
              />
            ) : (
              <>
                <div className="mb-1 flex justify-end">
                  <button onClick={() => setView3d(true)} className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-700/70 hover:bg-emerald-600 text-white">🎥 3D Görünüme Dön</button>
                </div>
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
                  weather={weather}
                  paused={freeze !== null}
                  slowMo={slowMo}
                  tactics={gameState.tactics}
                />
              </>
            )}
          </div>
        )}

        <div className="px-2 pt-2 lg:px-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1 px-1">
            <span className="text-[10px] tracking-widest font-black text-slate-400">📜 MAÇ ANLATIMI • GERÇEKÇİ xG MODELİ</span>
            <button onClick={() => setConsoleOpen(o => !o)} className="text-[10px] font-bold text-slate-300 bg-slate-700/60 hover:bg-slate-600 px-2 py-0.5 rounded-full border border-slate-600/40">
              {consoleOpen ? '▲ Kapat' : `▼ Aç (${events.length})`}
            </button>
          </div>
          {consoleOpen && (
            <div ref={consoleRef} className="bg-black/50 rounded-xl border border-emerald-500/30 h-28 lg:h-36 overflow-y-auto custom-scroll p-2 lg:p-3 font-mono text-[11px] lg:text-xs">
              {events.map((event, i) => (
                <div key={i} className={`mb-1.5 ${
                  event.type === 'goal' ? event.team === 'home' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                  : event.type === 'offside' ? 'text-purple-300'
                  : event.type === 'tackle' ? 'text-cyan-300'
                  : event.type === 'interception' ? 'text-blue-300'
                  : event.type === 'corner' ? 'text-amber-300'
                  : event.type === 'foul' ? 'text-orange-300'
                  : event.type === 'injury' ? 'text-orange-400'
                  : event.type === 'card' ? 'text-yellow-400'
                  : event.type === 'substitution' ? 'text-blue-400'
                  : 'text-slate-300'
                }`}>
                  <span className="text-slate-500">[{event.minute}']</span> {event.description} {event.xg ? <span className="text-[9px] text-slate-500">xG {event.xg.toFixed(2)}</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 lg:p-4 bg-slate-900/50 flex gap-3 justify-center flex-wrap flex-shrink-0 rounded-b-none sm:rounded-b-2xl lg:rounded-b-3xl">
          {phase === 'pre' && (
            <div className="w-full">
              <div className="text-center text-slate-300 text-xs mb-3">
                {weatherInfo.icon} {weatherInfo.label} — {weatherInfo.desc}
                <br />
                {isHome ? '🏟️ Kendi sahamızda (+ev sahibi avantajı)' : '🚌 Deplasmandayız'} • Formasyon {gameState.tactics.formation} • Orta saha {Math.round(userStrength.midfieldOverall)} vs {oppStrength.midfield} • xG modeli aktif
              </div>
              <div className="flex justify-center">
                <button onClick={startMatch} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm lg:text-lg rounded-xl shadow-lg shadow-emerald-500/30">▶️ Maçı Başlat</button>
              </div>
            </div>
          )}
          {(phase === 'first' || phase === 'second' || phase === 'et') && (
            <>
              <button onClick={() => { setShowSubModal(true); pauseSim('⏸️', 'Değişiklik yapılıyor'); }} disabled={substitutions.length >= 5} className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-medium rounded-xl text-sm">🔄 Değişiklik ({5 - substitutions.length})</button>
              <button onClick={skipMatch} className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-xl text-sm">⏭️ Atla</button>
            </>
          )}
          {phase === 'half' && (
            <div className="w-full">
              <div className="text-center text-white font-bold mb-2">💬 Devre Arası Takım Konuşması</div>
              <div className="text-center text-slate-400 text-xs mb-3">Skor {score.u}-{score.o} • xG {xg.home.toFixed(2)}-{xg.away.toFixed(2)} • Oyuncular seni dinliyor</div>
              <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
                <button onClick={() => applyTeamTalk('praise')} className="py-3 rounded-xl bg-emerald-600/70 hover:bg-emerald-500 text-white text-sm font-bold">👏 Öv<br /><span className="text-[10px] font-normal">Moral +, hücum +</span></button>
                <button onClick={() => applyTeamTalk('hairdryer')} className="py-3 rounded-xl bg-red-600/70 hover:bg-red-500 text-white text-sm font-bold">😤 Fırça<br /><span className="text-[10px] font-normal">Hücum ++, moral −</span></button>
                <button onClick={() => applyTeamTalk('calm')} className="py-3 rounded-xl bg-blue-600/70 hover:bg-blue-500 text-white text-sm font-bold">🧠 Sakin<br /><span className="text-[10px] font-normal">Defans ++, disiplin</span></button>
              </div>
            </div>
          )}
          {phase === 'done' && (
            <div className="w-full">
              <div className={`text-center py-3 bg-gradient-to-r ${getResultText().bg} to-transparent rounded-xl mb-3`}>
                <span className={`text-2xl font-black ${getResultText().color}`}>{getResultText().text}</span>
                <div className="text-slate-400 text-xs mt-1">Şutlar: {shots.home}-{shots.away} • Korner: {corners.home}-{corners.away} • Top: %{Math.round(possession)} • xG: {xg.home.toFixed(2)}-{xg.away.toFixed(2)} {penaltyWinner && ` • Penaltılar: ${penaltyWinner === 'user' ? 'KAZANDIK' : 'KAYBETTİK'}`}</div>
              </div>
              {ratings.length > 0 && (
                <div className="bg-slate-800/60 rounded-xl p-3 mb-3 max-h-44 overflow-y-auto">
                  <div className="text-xs text-emerald-400 font-bold mb-2">📊 Oyuncu Reytingleri • Gerçekçi xG katkısı</div>
                  {ratings.map((r, i) => (
                    <div key={r.playerId} className="flex items-center justify-between text-xs py-1 border-b border-slate-700/40 last:border-0">
                      <span className="text-white truncate flex items-center gap-1">{i === 0 && <span>⭐</span>}{r.name} <span className="text-slate-500">{ROLE_NAMES[r.role]}</span> {r.goals > 0 && <span className="text-emerald-400">⚽{r.goals}</span>} {r.assists > 0 && <span className="text-blue-400">🅰️{r.assists}</span>} {r.yellow && <span>🟨</span>} {r.red && <span>🟥</span>} {r.injured && <span>🏥</span>}</span>
                      <span className={`font-black ${ratingColor(r.rating)}`}>{r.rating.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-4 justify-center">
                <button onClick={handleFinishClick} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg">✓ Devam Et</button>
              </div>
            </div>
          )}
        </div>

        {showSubModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-1">Oyuncu Değişikliği</h3>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-sky-200 bg-sky-500/15 border border-sky-500/40 rounded-lg px-2 py-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" />⏸️ SİMÜLASYON DONDURULDU — {String(minute).padStart(2, '0')}' sabit
              </div>
              <p className="text-slate-400 text-xs mb-3">Kalan hak: {5 - substitutions.length}</p>
              {!subOut ? (
                <div>
                  <h4 className="text-sm text-red-400 mb-2">Çıkacak oyuncu seç</h4>
                  {activeLineup.filter(p => !sentOff.includes(p.id)).map(p => (
                    <button key={p.id} onClick={() => setSubOut(p.id)} className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded mb-1 text-sm flex justify-between">
                      <span className="text-white">{p.name}</span>
                      <span className="text-slate-400">{p.role} • {p.ovr}{effectiveOvr(p, subTeamAvg, subChem) < p.ovr - 0.5 ? `(~${Math.round(effectiveOvr(p, subTeamAvg, subChem))})` : ''} • ⚡{p.energy}% • 🧩{Math.round(adaptationPct(p) * 100)}%{p.injured ? ' 🏥' : ''}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <h4 className="text-sm text-emerald-400 mb-2">Girecek oyuncu seç</h4>
                  {activeBench.filter(p => !p.injured && !(p.suspension && p.suspension > 0)).map(p => (
                    <button key={p.id} onClick={() => makeSubstitution(subOut, p.id)} className="w-full text-left p-2 bg-slate-700/50 hover:bg-emerald-600/30 rounded mb-1 text-sm flex justify-between">
                      <span className="text-white">{p.name}</span>
                      <span className="text-slate-400">{p.role} • {p.ovr}{effectiveOvr(p, subTeamAvg, subChem) < p.ovr - 0.5 ? `(~${Math.round(effectiveOvr(p, subTeamAvg, subChem))})` : ''} • ⚡{p.energy}% • 🧩{Math.round(adaptationPct(p) * 100)}%</span>
                    </button>
                  ))}
                  <button onClick={() => setSubOut(null)} className="w-full mt-2 py-2 text-slate-400 text-sm">← Geri</button>
                </div>
              )}
              <button onClick={() => { setShowSubModal(false); setSubOut(null); resumeSim(0); }} className="w-full mt-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl">✕ Vazgeç</button>
            </div>
          </div>
        )}
      </div>

      {celebration && (
        <div key={celebration.key} className={`absolute inset-0 z-[55] flex flex-col items-center justify-center pointer-events-none overflow-hidden ${celebration.team === 'home' ? 'bg-emerald-500/18 backdrop-blur-[2px]' : 'bg-red-500/14 backdrop-blur-[2px]'}`} style={{ animation: 'goalFade 3400ms ease forwards' }}>
          <div className="text-center px-4">
            <div className={`text-5xl lg:text-7xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${celebration.team === 'home' ? 'text-white' : 'text-red-100'}`} style={{ animation: 'goalPop 600ms cubic-bezier(0.34,1.56,0.64,1) 80ms both, goalGlow 900ms ease 650ms 2 alternate' }}>{celebration.team === 'home' ? 'GOOOOL! ⚽' : 'GOL!'}</div>
            <div className="mt-2 text-white font-black text-lg lg:text-2xl drop-shadow" style={{ animation: 'goalSlide 500ms ease 200ms both' }}>{celebration.player ?? (celebration.team === 'home' ? gameState.teamName : opponent.name)}</div>
            <div className={`mt-1 text-xs lg:text-sm font-bold ${celebration.team === 'home' ? 'text-emerald-200' : 'text-red-200'}`} style={{ animation: 'goalSlide 500ms ease 300ms both' }}>{celebration.team === 'home' ? `${gameState.teamName} • ${String(minute).padStart(2,'0')}'` : `${opponent.name} — sessizlik...`}</div>
            <div className="mt-4 flex justify-center gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} className="text-xl" style={{ display: 'inline-block', animation: `confetti 900ms ease ${i * 70}ms both` }}>{celebration.team === 'home' ? ['🎉','✨','🎊','⚽','🔥'][i%5] : ['😶','💨'][i%2]}</span>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-14 flex items-end justify-center gap-[2px] px-2 opacity-90">
            {Array.from({ length: 28 }).map((_, i) => {
              const h = 10 + (Math.sin(i * 0.9) * 6 + Math.random() * 8);
              const delay = (i % 7) * 70;
              return <div key={i} className={`flex-1 rounded-t-md ${celebration.team === 'home' ? 'bg-emerald-400/90' : 'bg-red-400/70'} border-t border-white/20`} style={{ height: h + 12, maxWidth: 14, animation: `crowdJump 520ms ease ${delay}ms 3 alternate` }} />;
            })}
          </div>
          <div className="absolute bottom-16 text-[10px] tracking-widest font-bold text-white/70">{celebration.team === 'home' ? 'TRİBÜNLER AYAKTA! 🎶' : 'DEPLASMAN SESSİZ...'}</div>
        </div>
      )}

      {subBoard && (
        <div key={subBoard.key} className="absolute inset-0 z-[54] flex flex-col items-center justify-center pointer-events-none" style={{ animation: 'subFade 2800ms ease forwards' }}>
          <div className="bg-slate-900/92 border border-emerald-500/30 rounded-2xl px-5 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.55)] text-center min-w-[300px] max-w-[92%]" style={{ animation: 'subPop 420ms ease both' }}>
            <div className="text-[10px] tracking-[0.18em] font-black text-emerald-300 mb-2">🔄 OYUNCU DEĞİŞİKLİĞİ • {String(minute).padStart(2,'0')}'</div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 text-right"><div className="text-[10px] text-red-300 font-bold">ÇIKAN 🔴</div><div className="text-white font-black text-sm leading-tight">{subBoard.outName}</div><div className="text-[10px] text-slate-400">{subBoard.outRole} • {gameState.teamName}</div></div>
              <div className="flex flex-col items-center gap-1"><div className="w-16 h-10 rounded-lg bg-black border-2 border-amber-400 flex items-center justify-center relative overflow-hidden" style={{ animation: 'boardGlow 900ms ease infinite alternate' }}><span className="text-amber-300 font-black text-lg">⇄</span><div className="absolute inset-0 bg-amber-400/10" style={{ animation: 'boardShine 1.1s ease infinite' }} /></div><div className="text-[9px] text-slate-400">4. hakem</div></div>
              <div className="flex-1 text-left"><div className="text-[10px] text-emerald-300 font-bold">GİREN 🟢</div><div className="text-white font-black text-sm leading-tight">{subBoard.inName}</div><div className="text-[10px] text-slate-400">{subBoard.inRole} • sahada!</div></div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-bold text-sky-200"><span style={{ animation: 'runIn 700ms ease 200ms both' }}>🏃</span><span style={{ animation: 'goalSlide 500ms ease 400ms both' }}>Koşarak giriyor…</span></div>
          </div>
        </div>
      )}

      {cardPop && (
        <div key={cardPop.key} className="absolute inset-0 z-[53] flex items-center justify-center pointer-events-none" style={{ animation: 'cardFade 2600ms ease forwards' }}>
          <div className="relative bg-slate-900/94 border-2 rounded-2xl px-6 py-5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-center min-w-[280px] max-w-[90%]" style={{ borderColor: cardPop.kind === 'red' ? '#ef4444' : cardPop.kind === 'second' ? '#f59e0b' : '#eab308', animation: 'cardPop 420ms cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-0.5 rounded-full border text-[10px] font-black tracking-widest" style={{ borderColor: cardPop.kind === 'red' ? '#ef4444' : '#eab308', color: cardPop.kind === 'red' ? '#fca5a5' : '#fde68a' }}>{cardPop.kind === 'red' ? '🟥 KIRMIZI KART' : cardPop.kind === 'second' ? '🟨🟥 ÇİFT SARI' : '🟨 SARI KART'} • {String(minute).padStart(2,"0")}' • VAR</div>
            <div className="mx-auto mt-2 mb-3 relative w-16 h-24 rounded-lg shadow-lg flex items-center justify-center" style={{ background: cardPop.kind === 'red' ? '#dc2626' : cardPop.kind === 'second' ? 'linear-gradient(180deg,#eab308 50%,#dc2626 50%)' : '#eab308', transform: 'rotate(6deg)', animation: 'cardFlip 600ms ease 120ms both' }}><span className="text-2xl">{cardPop.kind === 'red' ? '🟥' : cardPop.kind === 'second' ? '🟨🟥' : '🟨'}</span><div className="absolute inset-0 rounded-lg border border-white/20" /></div>
            <div className="text-white font-black text-base leading-tight">{cardPop.player}</div>
            <div className="text-[11px] text-slate-400 mt-1">{cardPop.kind === 'red' ? 'Hakem tereddütsüz — direkt kırmızı!' : cardPop.kind === 'second' ? 'İkinci sarı — tribünler uğulduyor!' : 'Hakem uyarıyor'}</div>
          </div>
        </div>
      )}

      {matchMinigame && <InGameMinigame context={matchMinigame} gameState={gameState} onComplete={handleMinigameComplete} />}
      {phase === 'pens' && <PenaltyShootout userTeamName={gameState.teamName} opponentName={opponent.name} onFinish={(winner, u, o) => { scoreRef.current = { u, o }; setUserScore(u); setOppScore(o); finishMatch(winner); }} />}
      {cardCount.size > 0 && <div className="fixed bottom-3 right-3 bg-slate-900/90 border border-amber-500/40 rounded-xl p-2 text-[10px] text-amber-200 z-[60]">🟨 Kart: {activeLineup.filter(p => cardCount.has(p.id)).map(p => `${p.name} (${cardCount.get(p.id)})`).join(', ')}</div>}
      <style>{`
        @keyframes goalFade { 0%{opacity:0} 10%{opacity:1} 82%{opacity:1} 100%{opacity:0; pointer-events:none} }
        @keyframes goalPop { 0%{transform:scale(0.6) translateY(14px); opacity:0} 100%{transform:scale(1) translateY(0); opacity:1} }
        @keyframes goalGlow { 0%{text-shadow:0 0 0 rgba(255,255,255,0.0)} 100%{text-shadow:0 0 18px rgba(255,255,255,0.65),0 0 32px rgba(16,185,129,0.35)} }
        @keyframes goalSlide { 0%{transform:translateY(8px); opacity:0} 100%{transform:translateY(0); opacity:1} }
        @keyframes confetti { 0%{transform:translateY(10px) scale(0.7) rotate(-10deg); opacity:0} 60%{opacity:1} 100%{transform:translateY(-6px) scale(1) rotate(6deg); opacity:1} }
        @keyframes crowdJump { 0%{transform:translateY(0)} 100%{transform:translateY(-10px)} }
        @keyframes goalFlashKF { 0%{box-shadow:inset 0 0 0 rgba(16,185,129,0)} 20%{box-shadow:inset 0 0 32px rgba(16,185,129,0.55)} 100%{box-shadow:inset 0 0 0 rgba(16,185,129,0)} }
        .animate-goal-flash { animation: goalFlashKF 900ms ease }
        @keyframes subFade { 0%{opacity:0} 8%{opacity:1} 84%{opacity:1} 100%{opacity:0} }
        @keyframes subPop { 0%{transform:translateY(14px) scale(0.92); opacity:0} 100%{transform:translateY(0) scale(1); opacity:1} }
        @keyframes boardGlow { 0%{box-shadow:0 0 0 rgba(251,146,60,0)} 100%{box-shadow:0 0 18px rgba(251,146,60,0.45)} }
        @keyframes boardShine { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes runIn { 0%{transform:translateX(-16px)} 100%{transform:translateX(0)} }
        @keyframes cardFade { 0%{opacity:0} 10%{opacity:1} 85%{opacity:1} 100%{opacity:0} }
        @keyframes cardPop { 0%{transform:scale(0.85) translateY(12px); opacity:0} 100%{transform:scale(1) translateY(0); opacity:1} }
        @keyframes cardFlip { 0%{transform:rotate(18deg) scale(0.8); opacity:0} 100%{transform:rotate(6deg) scale(1); opacity:1} }
      `}</style>
    </div>
  );
};
