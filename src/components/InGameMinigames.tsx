import React, { useState, useEffect, useRef } from 'react';
import { GameState } from '../types/game';

export type MinigameType =
  | 'penalty'
  | 'freekick'
  | 'bus'
  | 'sabotage'
  | 'press'
  | 'training_race'
  | 'fan_challenge'
  | 'keeper_save';

export interface MinigameContext {
  type: MinigameType;
  title: string;
  description: string;
  /** Maç içi ise true — sonuç skora yazılır */
  inMatch?: boolean;
  playerName?: string;
  opponentName?: string;
}

export interface MinigameResult {
  success: boolean;
  score?: number; // 0-100 quality
  budgetDelta?: number;
  moraleDelta?: number;
  energyDelta?: number;
  chemistryDelta?: number;
  fanDelta?: number;
  repDelta?: number;
  goalScored?: boolean; // maç içi gol
  goalConceded?: boolean;
  news: string;
  minigamesWon?: number;
  penaltiesScored?: number;
}

interface InGameMinigameProps {
  context: MinigameContext;
  gameState: GameState;
  onComplete: (result: MinigameResult) => void;
}

export const InGameMinigame: React.FC<InGameMinigameProps> = ({ context, gameState, onComplete }) => {
  switch (context.type) {
    case 'penalty':
      return <PenaltyMG context={context} onComplete={onComplete} />;
    case 'freekick':
      return <FreeKickMG context={context} onComplete={onComplete} />;
    case 'keeper_save':
      return <KeeperSaveMG context={context} onComplete={onComplete} />;
    case 'bus':
      return <BusDriveMG context={context} onComplete={onComplete} />;
    case 'sabotage':
      return <SabotageMG context={context} gameState={gameState} onComplete={onComplete} />;
    case 'press':
      return <PressConferenceMG context={context} onComplete={onComplete} />;
    case 'training_race':
      return <TrainingRaceMG context={context} onComplete={onComplete} />;
    case 'fan_challenge':
      return <FanChallengeMG context={context} onComplete={onComplete} />;
    default:
      onComplete({ success: false, news: 'Bilinmeyen mini oyun' });
      return null;
  }
};

/* ═══════════════════════════════════════
   SHELL — ortak çerçeve
═══════════════════════════════════════ */
const Shell: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: string;
}> = ({ icon, title, subtitle, children }) => (
  <div className="fixed inset-0 bg-black/95 z-[80] flex items-center justify-center p-3 overflow-y-auto">
    <div className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border-2 border-amber-500/40 shadow-2xl overflow-hidden my-auto">
      <div className="bg-gradient-to-r from-amber-600/30 via-emerald-600/20 to-transparent p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{icon}</span>
          <div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">⚡ Canlı Olay</div>
            <h2 className="text-xl font-black text-white">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  </div>
);

const ResultBanner: React.FC<{
  ok: boolean;
  title: string;
  detail: string;
  onDone: () => void;
}> = ({ ok, title, detail, onDone }) => (
  <div className="text-center py-4">
    <div className="text-5xl mb-3">{ok ? '🎉' : '😤'}</div>
    <div className={`text-2xl font-black mb-2 ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{title}</div>
    <p className="text-slate-300 mb-6">{detail}</p>
    <button
      onClick={onDone}
      className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl"
    >
      Devam Et →
    </button>
  </div>
);

/* ═══════════════════════════════════════
   1) PENALTI (maç içi / olay)
═══════════════════════════════════════ */
const PenaltyMG: React.FC<{ context: MinigameContext; onComplete: (r: MinigameResult) => void }> = ({
  context,
  onComplete
}) => {
  const [phase, setPhase] = useState<'aim' | 'result'>('aim');
  const [aimX, setAimX] = useState(50);
  const [keeperDive, setKeeperDive] = useState(50); // visual dive target after shot
  const [result, setResult] = useState<'goal' | 'save' | 'miss' | null>(null);
  const dir = useRef(1);

  useEffect(() => {
    if (phase !== 'aim') return;
    const id = setInterval(() => {
      setAimX(prev => {
        let n = prev + dir.current * 2.8;
        if (n >= 90) { dir.current = -1; n = 90; }
        if (n <= 10) { dir.current = 1; n = 10; }
        return n;
      });
    }, 28);
    return () => clearInterval(id);
  }, [phase]);

  const shoot = () => {
    const dive = 12 + Math.random() * 76;
    setKeeperDive(dive);
    const inGoal = aimX >= 12 && aimX <= 88;
    const reach = Math.abs(aimX - dive) < 16;
    const corner = aimX < 22 || aimX > 78;
    let r: 'goal' | 'save' | 'miss';
    if (!inGoal) r = 'miss';
    else if (reach && !corner) r = Math.random() < 0.65 ? 'save' : 'goal';
    else if (reach && corner) r = Math.random() < 0.3 ? 'save' : 'goal';
    else r = 'goal';
    setResult(r);
    setPhase('result');
  };

  const finish = () => {
    const ok = result === 'goal';
    onComplete({
      success: ok,
      goalScored: context.inMatch ? ok : undefined,
      score: ok ? 90 : result === 'save' ? 40 : 10,
      moraleDelta: ok ? 5 : -3,
      fanDelta: ok ? 4 : -2,
      penaltiesScored: ok ? 1 : 0,
      minigamesWon: ok ? 1 : 0,
      budgetDelta: context.inMatch ? 0 : ok ? 25000 : 0,
      news: ok
        ? `⚽ ${context.playerName || 'Oyuncu'} penaltıyı gole çevirdi!`
        : result === 'save'
        ? `🧤 ${context.playerName || 'Oyuncu'} penaltıyı kaçırdı — kaleci kurtardı!`
        : `❌ ${context.playerName || 'Oyuncu'} penaltıyı dışarı attı!`
    });
  };

  if (phase === 'result' && result) {
    return (
      <Shell icon="🎯" title="PENALTI!" subtitle={context.description} accent="emerald">
        <ResultBanner
          ok={result === 'goal'}
          title={result === 'goal' ? 'GOL!' : result === 'save' ? 'KURTARILDI!' : 'DIŞARI!'}
          detail={
            result === 'goal'
              ? `${context.playerName || 'Oyuncu'} ağları sarstı!`
              : result === 'save'
              ? 'Kaleci harika uzandı!'
              : 'Top direğin yanından dışarı...'
          }
          onDone={finish}
        />
      </Shell>
    );
  }

  return (
    <Shell icon="🎯" title="PENALTI!" subtitle={`${context.playerName || 'Oyuncu'} topun başında...`} accent="emerald">
      <div className="relative h-56 bg-gradient-to-b from-sky-900/50 to-emerald-900/40 rounded-2xl border border-white/20 overflow-hidden mb-4">
        <div className="absolute top-[6%] left-[8%] right-[8%] bottom-[30%] border-4 border-white/80 rounded-t-md">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,.3) 10px,rgba(255,255,255,.3) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,.3) 10px,rgba(255,255,255,.3) 11px)'
            }}
          />
          <div
            className="absolute bottom-0 text-3xl transition-all duration-300"
            style={{ left: `${phase === 'result' ? keeperDive : 50}%`, transform: 'translateX(-50%)' }}
          >
            🧤
          </div>
        </div>
        {phase === 'aim' && (
          <div
            className="absolute w-7 h-7 border-2 border-red-500 rounded-full z-10 pointer-events-none"
            style={{ left: `${aimX}%`, top: '28%', transform: 'translate(-50%,-50%)', boxShadow: '0 0 10px rgba(239,68,68,.7)' }}
          >
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50" />
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500/50" />
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-3xl">⚽</div>
      </div>
      <p className="text-center text-slate-400 text-sm mb-3">Nişanı köşeye getirip ŞUT'a bas!</p>
      <button
        onClick={shoot}
        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xl rounded-xl"
      >
        💥 ŞUT!
      </button>
    </Shell>
  );
};

/* ═══════════════════════════════════════
   2) FRİKİK
═══════════════════════════════════════ */
const FreeKickMG: React.FC<{ context: MinigameContext; onComplete: (r: MinigameResult) => void }> = ({
  context,
  onComplete
}) => {
  const [phase, setPhase] = useState<'ready' | 'power' | 'result'>('ready');
  const [power, setPower] = useState(0);
  const [hit, setHit] = useState(false);
  const dir = useRef(1);
  const powerRef = useRef(0);

  useEffect(() => {
    if (phase !== 'power') return;
    const id = setInterval(() => {
      setPower(prev => {
        let n = prev + dir.current * 3.2;
        if (n >= 100) { dir.current = -1; n = 100; }
        if (n <= 0) { dir.current = 1; n = 0; }
        powerRef.current = n;
        return n;
      });
    }, 18);
    return () => clearInterval(id);
  }, [phase]);

  const lock = () => {
    const p = powerRef.current;
    const ok = p >= 52 && p <= 78;
    setHit(ok);
    setPhase('result');
  };

  const finish = () => {
    onComplete({
      success: hit,
      goalScored: context.inMatch ? hit : undefined,
      score: hit ? 85 : 25,
      moraleDelta: hit ? 6 : -2,
      fanDelta: hit ? 5 : -1,
      minigamesWon: hit ? 1 : 0,
      budgetDelta: context.inMatch ? 0 : hit ? 30000 : 0,
      news: hit
        ? `🌀 ${context.playerName || 'Oyuncu'} frikikten muhteşem gol attı!`
        : `❌ ${context.playerName || 'Oyuncu'} frikiği isabetsiz vurdu.`
    });
  };

  if (phase === 'result') {
    return (
      <Shell icon="🌀" title="FRİKİK!" subtitle={context.description} accent="blue">
        <ResultBanner
          ok={hit}
          title={hit ? 'GOL! 🔥' : 'ISKA!'}
          detail={hit ? 'Duvarı aştı, ağlara gitti!' : `Güç: %${Math.round(power)} — sweet spot kaçtı.`}
          onDone={finish}
        />
      </Shell>
    );
  }

  return (
    <Shell icon="🌀" title="FRİKİK!" subtitle={`${context.playerName || 'Oyuncu'} topun başında`} accent="blue">
      {phase === 'ready' ? (
        <div className="text-center">
          <p className="text-slate-300 mb-2">Güç çubuğunu <span className="text-emerald-400 font-bold">yeşil bölgede</span> durdur!</p>
          <p className="text-slate-500 text-sm mb-6">Sweet spot: %52–%78</p>
          <button onClick={() => setPhase('power')} className="px-8 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl">
            Hazırım →
          </button>
        </div>
      ) : (
        <div>
          <div className="relative h-8 bg-slate-700 rounded-full overflow-hidden mb-2">
            <div className="absolute top-0 bottom-0 bg-emerald-500/40 border-x-2 border-emerald-400" style={{ left: '52%', width: '26%' }} />
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full" style={{ width: `${power}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mb-4">
            <span>Zayıf</span><span className="text-emerald-400 font-bold">SWEET</span><span>Aşırı</span>
          </div>
          <div className="text-center text-2xl font-black text-white mb-4">%{Math.round(power)}</div>
          <button onClick={lock} className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black text-xl rounded-xl">
            💥 VUR!
          </button>
        </div>
      )}
    </Shell>
  );
};

/* ═══════════════════════════════════════
   3) KALECİ KURTARİŞI (rakip penaltı)
═══════════════════════════════════════ */
const KeeperSaveMG: React.FC<{ context: MinigameContext; onComplete: (r: MinigameResult) => void }> = ({
  context,
  onComplete
}) => {
  const [phase, setPhase] = useState<'ready' | 'dive' | 'result'>('ready');
  const [choice, setChoice] = useState<'L' | 'C' | 'R' | null>(null);
  const [shot, setShot] = useState<'L' | 'C' | 'R'>('C');
  const [saved, setSaved] = useState(false);

  const dive = (dir: 'L' | 'C' | 'R') => {
    const real: ('L' | 'C' | 'R')[] = ['L', 'C', 'R'];
    const s = real[Math.floor(Math.random() * 3)];
    setShot(s);
    setChoice(dir);
    // Center is harder, corners: match = save, wrong = goal (small luck)
    let ok = false;
    if (dir === s) ok = Math.random() < 0.85;
    else if (dir === 'C' || s === 'C') ok = Math.random() < 0.15;
    else ok = Math.random() < 0.08;
    setSaved(ok);
    setPhase('result');
  };

  const finish = () => {
    onComplete({
      success: saved,
      goalConceded: context.inMatch ? !saved : undefined,
      score: saved ? 95 : 20,
      moraleDelta: saved ? 8 : -4,
      fanDelta: saved ? 6 : -3,
      minigamesWon: saved ? 1 : 0,
      news: saved
        ? `🧤 Kaleci inanılmaz kurtarış! Penaltı kaçtı!`
        : `❌ Rakip penaltıyı gole çevirdi...`
    });
  };

  if (phase === 'result') {
    return (
      <Shell icon="🧤" title="KALECİ!" subtitle="Rakip penaltı kullanıyor" accent="cyan">
        <ResultBanner
          ok={saved}
          title={saved ? 'KURTARDI!' : 'GOL YEDİK'}
          detail={`Sen: ${choice === 'L' ? 'Sol' : choice === 'R' ? 'Sağ' : 'Orta'} • Top: ${shot === 'L' ? 'Sol' : shot === 'R' ? 'Sağ' : 'Orta'}`}
          onDone={finish}
        />
      </Shell>
    );
  }

  return (
    <Shell icon="🧤" title="KALECİ ANI!" subtitle={context.description || 'Nereye atlayacaksın?'} accent="cyan">
      <div className="relative h-40 bg-sky-900/40 rounded-2xl border border-white/20 mb-4 flex items-end justify-center pb-2">
        <div className="absolute top-2 left-4 right-4 bottom-8 border-4 border-white/70 rounded-t-md" />
        <div className="text-4xl z-10">🧤</div>
      </div>
      <p className="text-center text-slate-300 text-sm mb-4">Hızlı karar ver — top geliyor!</p>
      <div className="grid grid-cols-3 gap-3">
        {([
          ['L', '◀️ SOL'],
          ['C', '⬆️ ORTA'],
          ['R', 'SAĞ ▶️']
        ] as const).map(([d, label]) => (
          <button
            key={d}
            onClick={() => dive(d)}
            className="py-4 bg-cyan-600/30 hover:bg-cyan-500/50 border border-cyan-500/40 rounded-xl text-white font-bold"
          >
            {label}
          </button>
        ))}
      </div>
    </Shell>
  );
};

/* ═══════════════════════════════════════
   4) OTOBÜS SÜRME
═══════════════════════════════════════ */
const BusDriveMG: React.FC<{ context: MinigameContext; onComplete: (r: MinigameResult) => void }> = ({
  context,
  onComplete
}) => {
  const [lane, setLane] = useState(1); // 0 1 2
  const [obstacles, setObstacles] = useState<{ id: number; lane: number; y: number }[]>([]);
  const [distance, setDistance] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const idRef = useRef(0);
  const laneRef = useRef(1);
  const TARGET = 100;

  useEffect(() => { laneRef.current = lane; }, [lane]);

  useEffect(() => {
    if (done || crashed) return;
    const tick = setInterval(() => {
      setDistance(d => {
        const nd = d + 1.2;
        if (nd >= TARGET) {
          setDone(true);
          setScore(100);
          return TARGET;
        }
        return nd;
      });
      setObstacles(prev => {
        let next = prev.map(o => ({ ...o, y: o.y + 4 })).filter(o => o.y < 110);
        // spawn
        if (Math.random() < 0.08) {
          idRef.current++;
          next.push({ id: idRef.current, lane: Math.floor(Math.random() * 3), y: -10 });
        }
        // collision
        for (const o of next) {
          if (o.lane === laneRef.current && o.y > 72 && o.y < 92) {
            setCrashed(true);
            setDone(true);
            setScore(Math.max(10, Math.floor((distance / TARGET) * 70)));
          }
        }
        return next;
      });
    }, 50);
    return () => clearInterval(tick);
  }, [done, crashed, distance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') setLane(l => Math.max(0, l - 1));
      if (e.key === 'ArrowRight' || e.key === 'd') setLane(l => Math.min(2, l + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const finish = () => {
    const ok = !crashed && distance >= TARGET;
    const late = crashed;
    onComplete({
      success: ok,
      score: ok ? 100 : score,
      energyDelta: ok ? 5 : late ? -15 : 0,
      moraleDelta: ok ? 8 : late ? -10 : 0,
      chemistryDelta: ok ? 5 : -5,
      budgetDelta: late ? -15000 : ok ? 10000 : 0,
      fanDelta: ok ? 3 : -4,
      minigamesWon: ok ? 1 : 0,
      news: ok
        ? '🚌 Otobüs sorunsuz stadyuma vardı! Takım dinç.'
        : late
        ? '💥 Otobüs kaza yaptı! Oyuncular sarsıldı, geç kaldınız.'
        : '🚌 Yolculuk tamam ama yorucu geçti.'
    });
  };

  if (done) {
    return (
      <Shell icon="🚌" title="Otobüs Yolculuğu" subtitle={context.description} accent="amber">
        <ResultBanner
          ok={!crashed}
          title={crashed ? 'KAZA!' : 'VARDIK!'}
          detail={crashed ? 'Trafikte çarpışma... Takım sarsıldı.' : 'Stadyuma zamanında ve sağ salim!'}
          onDone={finish}
        />
      </Shell>
    );
  }

  const lanePos = [16, 50, 84];

  return (
    <Shell icon="🚌" title="Otobüsle Stadyuma!" subtitle="Engellerden kaç — ok tuşları veya butonlar" accent="amber">
      <div className="relative h-72 bg-slate-900 rounded-2xl overflow-hidden border border-amber-500/30 mb-3">
        {/* road */}
        <div className="absolute inset-y-0 left-[5%] right-[5%] bg-slate-700/80">
          {[33, 66].map(x => (
            <div key={x} className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-yellow-400/40" style={{ left: `${x}%` }} />
          ))}
        </div>
        {/* obstacles */}
        {obstacles.map(o => (
          <div
            key={o.id}
            className="absolute text-2xl"
            style={{ left: `${lanePos[o.lane]}%`, top: `${o.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            {o.id % 2 === 0 ? '🚗' : '🚧'}
          </div>
        ))}
        {/* bus */}
        <div
          className="absolute text-3xl transition-all duration-100"
          style={{ left: `${lanePos[lane]}%`, top: '80%', transform: 'translate(-50%,-50%)' }}
        >
          🚌
        </div>
        {/* progress */}
        <div className="absolute top-2 left-2 right-2 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${(distance / TARGET) * 100}%` }} />
        </div>
        <div className="absolute top-5 right-3 text-xs text-amber-300 font-bold">
          {Math.min(100, Math.round((distance / TARGET) * 100))}%
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setLane(l => Math.max(0, l - 1))} className="py-3 bg-amber-600/40 hover:bg-amber-500/50 rounded-xl text-white font-bold text-lg">
          ◀️ Sol
        </button>
        <button onClick={() => setLane(l => Math.min(2, l + 1))} className="py-3 bg-amber-600/40 hover:bg-amber-500/50 rounded-xl text-white font-bold text-lg">
          Sağ ▶️
        </button>
      </div>
    </Shell>
  );
};

/* ═══════════════════════════════════════
   5) SABOTAJ
═══════════════════════════════════════ */
const SabotageMG: React.FC<{
  context: MinigameContext;
  gameState: GameState;
  onComplete: (r: MinigameResult) => void;
}> = ({ context, gameState, onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'hack' | 'result'>('intro');
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSeq, setPlayerSeq] = useState<string[]>([]);
  const [showing, setShowing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [success, setSuccess] = useState(false);
  const COLORS = ['🔴', '🟢', '🔵', '🟡'];

  const startHack = () => {
    const seq = Array.from({ length: 4 + Math.floor(Math.random() * 2) }, () =>
      COLORS[Math.floor(Math.random() * COLORS.length)]
    );
    setSequence(seq);
    setPlayerSeq([]);
    setPhase('hack');
    setShowing(true);
    // hide after show
    setTimeout(() => setShowing(false), 1200 + seq.length * 400);
  };

  const press = (c: string) => {
    if (showing || failed || success) return;
    const next = [...playerSeq, c];
    setPlayerSeq(next);
    if (sequence[next.length - 1] !== c) {
      setFailed(true);
      setTimeout(() => setPhase('result'), 600);
      return;
    }
    if (next.length === sequence.length) {
      setSuccess(true);
      setTimeout(() => setPhase('result'), 600);
    }
  };

  const finish = () => {
    const ok = success && !failed;
    onComplete({
      success: ok,
      score: ok ? 90 : 15,
      budgetDelta: ok ? 0 : -50000, // yakalanırsan ceza
      moraleDelta: ok ? 5 : -8,
      repDelta: ok ? -3 : -12, // riskli iş
      fanDelta: ok ? 2 : -6,
      // Sabotaj başarılıysa rakip zayıflar — App tarafında fixture OVR düşürülür
      minigamesWon: ok ? 1 : 0,
      news: ok
        ? `🕵️ Sabotaj başarılı! ${context.opponentName || 'Rakip'} tesisleri etkilendi. (-OVR)`
        : `🚨 Sabotaj ekibi yakalandı! Ceza ve itibar kaybı.`
    });
  };

  if (phase === 'result') {
    return (
      <Shell icon="🕵️" title="Sabotaj Operasyonu" subtitle={context.opponentName || 'Rakip tesis'} accent="red">
        <ResultBanner
          ok={success && !failed}
          title={success && !failed ? 'BAŞARILI!' : 'YAKALANDIN!'}
          detail={
            success && !failed
              ? 'Rakip antrenman sahası bozuldu. Yarın yorgun olacaklar.'
              : 'Güvenlik sizi gördü. Kulüp cezası yolda...'
          }
          onDone={finish}
        />
      </Shell>
    );
  }

  if (phase === 'intro') {
    return (
      <Shell icon="🕵️" title="Gizli Operasyon?" subtitle={context.description} accent="red">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-sm text-slate-300">
          <p className="mb-2">
            Scoutların <strong className="text-white">{context.opponentName || 'rakip'}</strong> tesisine sızma planı kurdu.
            Kod sırasını ezberle ve gir. Yakalanırsan ağır ceza var!
          </p>
          <p className="text-red-300 text-xs">⚠️ Risk: İtibar ↓ • Başarı: Rakip OVR ↓</p>
          <p className="text-slate-500 text-xs mt-1">Bütçe: ${gameState.budget.toLocaleString()}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() =>
              onComplete({
                success: false,
                score: 0,
                news: '🕵️ Sabotaj teklifi reddedildi. Temiz kaldınız.',
                repDelta: 2
              })
            }
            className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-bold"
          >
            Vazgeç
          </button>
          <button onClick={startHack} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold">
            Sız! 🕵️
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell icon="🔐" title="Güvenlik Kodu" subtitle="Sırayı ezberle ve tekrarla" accent="red">
      <div className="flex justify-center gap-3 mb-6 min-h-[48px]">
        {showing
          ? sequence.map((c, i) => (
              <span key={i} className="text-4xl animate-pulse">
                {c}
              </span>
            ))
          : sequence.map((_, i) => (
              <span key={i} className="text-4xl opacity-30">
                {playerSeq[i] || '⬛'}
              </span>
            ))}
      </div>
      {showing ? (
        <p className="text-center text-amber-300 animate-pulse mb-4">Ezberle...</p>
      ) : (
        <p className="text-center text-slate-400 text-sm mb-4">Sırayı gir ({playerSeq.length}/{sequence.length})</p>
      )}
      <div className="grid grid-cols-4 gap-3">
        {COLORS.map(c => (
          <button
            key={c}
            disabled={showing}
            onClick={() => press(c)}
            className="py-4 text-3xl bg-slate-700/50 hover:bg-slate-600/50 rounded-xl disabled:opacity-40"
          >
            {c}
          </button>
        ))}
      </div>
    </Shell>
  );
};

/* ═══════════════════════════════════════
   6) BASIN TOPLANTISI
═══════════════════════════════════════ */
const PressConferenceMG: React.FC<{ context: MinigameContext; onComplete: (r: MinigameResult) => void }> = ({
  context,
  onComplete
}) => {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [lastOk, setLastOk] = useState<boolean | null>(null);

  const QUESTIONS = [
    {
      q: 'Son maçtaki performansınızı nasıl değerlendiriyorsunuz?',
      answers: [
        { t: 'Oyuncularımı tebrik ederim, takım ruhu yüksek.', s: 2 },
        { t: 'Hakemin hataları sonucu etkiledi.', s: 0 },
        { t: 'Yorum yok.', s: 1 }
      ]
    },
    {
      q: 'Transfer döneminde büyük isimler mi gelecek?',
      answers: [
        { t: 'Bütçemiz elverdiğince güçleneceğiz.', s: 2 },
        { t: 'Şampiyon kadroyu kuracağız, söz!', s: 0 },
        { t: 'Mevcut kadroya güveniyorum.', s: 1 }
      ]
    },
    {
      q: 'Taraftarlar yönetimden memnun değil, ne diyorsunuz?',
      answers: [
        { t: 'Taraftarlarımız her şeyimiz, sabırla dinliyoruz.', s: 2 },
        { t: 'Sahada cevap veririz.', s: 1 },
        { t: 'Eleştiren anlamaz.', s: -1 }
      ]
    }
  ];

  const answer = (s: number) => {
    setScore(prev => prev + s);
    setLastOk(s >= 1);
    if (qIndex + 1 >= QUESTIONS.length) {
      setTimeout(() => setDone(true), 500);
    } else {
      setTimeout(() => {
        setLastOk(null);
        setQIndex(i => i + 1);
      }, 500);
    }
  };

  const finish = () => {
    const ok = score >= 4;
    onComplete({
      success: ok,
      score: Math.min(100, score * 20),
      repDelta: score,
      fanDelta: Math.round(score * 1.5),
      moraleDelta: ok ? 5 : -3,
      budgetDelta: ok ? 20000 : score < 1 ? -10000 : 0,
      minigamesWon: ok ? 1 : 0,
      news: ok
        ? '📺 Basın toplantısı masterclass! İtibar ve taraftar mutlu.'
        : score < 1
        ? '📺 Basın toplantısı facia... Manşetler olumsuz.'
        : '📺 Basın toplantısı idare eder geçti.'
    });
  };

  if (done) {
    return (
      <Shell icon="📺" title="Basın Toplantısı" subtitle={context.description} accent="purple">
        <ResultBanner
          ok={score >= 4}
          title={score >= 4 ? 'HARİKA RÖPORTAJ!' : score >= 2 ? 'İDARE EDER' : 'FASİLA!'}
          detail={`Puan: ${score}/6`}
          onDone={finish}
        />
      </Shell>
    );
  }

  const cur = QUESTIONS[qIndex];

  return (
    <Shell icon="📺" title="Basın Toplantısı" subtitle={`Soru ${qIndex + 1}/${QUESTIONS.length}`} accent="purple">
      <div className="bg-slate-700/40 rounded-xl p-4 mb-4">
        <div className="text-xs text-purple-300 mb-1">Gazeteci soruyor:</div>
        <p className="text-white font-medium">{cur.q}</p>
      </div>
      {lastOk !== null && (
        <div className={`text-center text-sm mb-2 ${lastOk ? 'text-emerald-400' : 'text-red-400'}`}>
          {lastOk ? '✓ İyi cevap' : '✗ Kötü algılandı'}
        </div>
      )}
      <div className="space-y-2">
        {cur.answers.map((a, i) => (
          <button
            key={i}
            onClick={() => answer(a.s)}
            className="w-full text-left p-3 bg-slate-700/50 hover:bg-purple-600/30 border border-slate-600 hover:border-purple-500 rounded-xl text-sm text-slate-200 transition-all"
          >
            {a.t}
          </button>
        ))}
      </div>
    </Shell>
  );
};

/* ═══════════════════════════════════════
   7) ANTRENMAN YARIŞI
═══════════════════════════════════════ */
const TrainingRaceMG: React.FC<{ context: MinigameContext; onComplete: (r: MinigameResult) => void }> = ({
  context,
  onComplete
}) => {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const TARGET = 28;

  useEffect(() => {
    if (!running || done) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setDone(true);
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, done]);

  const finish = () => {
    const ok = taps >= TARGET;
    onComplete({
      success: ok,
      score: Math.min(100, Math.round((taps / TARGET) * 100)),
      energyDelta: ok ? 10 : 3,
      moraleDelta: ok ? 8 : 2,
      chemistryDelta: ok ? 6 : 1,
      minigamesWon: ok ? 1 : 0,
      news: ok
        ? '🏃 Antrenman yarışı efsane! Takım ateşlendi.'
        : `🏃 Antrenman yarışı: ${taps}/${TARGET} tempo. Daha iyisi olabilir.`
    });
  };

  if (done) {
    return (
      <Shell icon="🏃" title="Antrenman Yarışı" subtitle={context.description} accent="orange">
        <ResultBanner
          ok={taps >= TARGET}
          title={taps >= TARGET ? 'ŞAMPİYON TEMPO!' : 'YETERSİZ TEMPO'}
          detail={`${taps} tık / hedef ${TARGET}`}
          onDone={finish}
        />
      </Shell>
    );
  }

  return (
    <Shell icon="🏃" title="Antrenman Sprinti!" subtitle="8 saniyede mümkün olduğunca tıkla" accent="orange">
      {!running ? (
        <div className="text-center">
          <p className="text-slate-300 mb-4">Takım koşu yarışı yapıyor. Ritmi sen tut!</p>
          <button
            onClick={() => setRunning(true)}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl"
          >
            Başla!
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-5xl font-black text-orange-400 mb-2">{timeLeft}s</div>
          <div className="text-3xl font-bold text-white mb-4">
            {taps} <span className="text-slate-500 text-lg">/ {TARGET}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-orange-400 transition-all" style={{ width: `${Math.min(100, (taps / TARGET) * 100)}%` }} />
          </div>
          <button
            onClick={() => setTaps(t => t + 1)}
            className="w-full py-10 bg-gradient-to-b from-orange-500 to-orange-700 active:scale-95 text-white font-black text-2xl rounded-2xl shadow-lg select-none"
          >
            🏃 TIKLA!
          </button>
        </div>
      )}
    </Shell>
  );
};

/* ═══════════════════════════════════════
   8) TARAFTAR MEYDAN OKUMASI
═══════════════════════════════════════ */
const FanChallengeMG: React.FC<{ context: MinigameContext; onComplete: (r: MinigameResult) => void }> = ({
  context,
  onComplete
}) => {
  const [pos, setPos] = useState(50);
  const [target, setTarget] = useState(50);
  const [hits, setHits] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const dir = useRef(1);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setPos(p => {
        let n = p + dir.current * 2.5;
        if (n >= 95) { dir.current = -1; n = 95; }
        if (n <= 5) { dir.current = 1; n = 5; }
        return n;
      });
    }, 20);
    return () => clearInterval(id);
  }, [done, round]);

  useEffect(() => {
    setTarget(20 + Math.random() * 60);
  }, [round]);

  const throwBall = () => {
    const ok = Math.abs(pos - target) < 12;
    const nh = hits + (ok ? 1 : 0);
    setHits(nh);
    if (round + 1 >= 5) {
      setDone(true);
    } else {
      setRound(r => r + 1);
    }
  };

  const finish = () => {
    const ok = hits >= 3;
    onComplete({
      success: ok,
      score: hits * 20,
      fanDelta: ok ? 12 : hits * 2,
      moraleDelta: ok ? 6 : 0,
      budgetDelta: ok ? 15000 : 0,
      minigamesWon: ok ? 1 : 0,
      news: ok
        ? `🎽 Taraftar challenge: ${hits}/5 isabet! Taraftarlar bayildi.`
        : `🎽 Taraftar challenge: ${hits}/5. Biraz daha pratik lazım.`
    });
  };

  if (done) {
    return (
      <Shell icon="🎽" title="Taraftar Challenge" subtitle={context.description} accent="pink">
        <ResultBanner
          ok={hits >= 3}
          title={`${hits}/5 İsabet`}
          detail={hits >= 3 ? 'Taraftarlar seni omuzlarda taşıyor!' : 'Iska çok oldu, yuhalamalar...'}
          onDone={finish}
        />
      </Shell>
    );
  }

  return (
    <Shell icon="🎽" title="İmza + Top Atışı" subtitle={`Deneme ${round + 1}/5 • İsabet: ${hits}`} accent="pink">
      <p className="text-center text-slate-400 text-sm mb-3">Çubuğu yeşil bölgede bırak!</p>
      <div className="relative h-10 bg-slate-700 rounded-full mb-6 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-pink-500/50 border-x-2 border-pink-400"
          style={{ left: `${target - 10}%`, width: '20%' }}
        />
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full shadow-lg"
          style={{ left: `${pos}%` }}
        />
      </div>
      <button
        onClick={throwBall}
        className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xl rounded-xl"
      >
        ⚽ AT!
      </button>
    </Shell>
  );
};

/* ═══════════════════════════════════════
   OLAY SEÇİCİ — maç sonrası / haftalık
═══════════════════════════════════════ */
export function pickStoryMinigame(
  _gameState: GameState,
  wasWin: boolean,
  opponentName?: string
): MinigameContext | null {
  // ~55% chance after match for a story mini-game
  if (Math.random() > 0.55) return null;

  const pool: MinigameContext[] = [
    {
      type: 'bus',
      title: 'Otobüs Yolculuğu',
      description: 'Takımı stadyuma / kampa güvenle götür!',
      opponentName
    },
    {
      type: 'press',
      title: 'Basın Toplantısı',
      description: wasWin ? 'Galibiyet sonrası mikrofonlar sende.' : 'Mağlubiyet sonrası zor sorular...',
      opponentName
    },
    {
      type: 'training_race',
      title: 'Antrenman Sprinti',
      description: 'Takım temposunu sen belirle!'
    },
    {
      type: 'fan_challenge',
      title: 'Taraftar Günü',
      description: 'Taraftarlarla top sektirme challenge!'
    }
  ];

  // Sabotaj only sometimes and not too often
  if (Math.random() < 0.35 && opponentName) {
    pool.push({
      type: 'sabotage',
      title: 'Gizli Operasyon',
      description: `${opponentName} tesisine sızma teklifi var...`,
      opponentName
    });
  }

  // Prefer bus before away vibe randomly
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickMatchMinigame(
  minute: number,
  isUserAttack: boolean,
  playerName: string
): MinigameContext | null {
  // Called by MatchEngine on special moments
  if (isUserAttack) {
    if (Math.random() < 0.55) {
      return {
        type: 'penalty',
        title: 'Penaltı!',
        description: `${minute}' — ${playerName} penaltı kullanacak!`,
        inMatch: true,
        playerName
      };
    }
    return {
      type: 'freekick',
      title: 'Tehlikeli Frikik!',
      description: `${minute}' — ${playerName} frikik kullanıyor!`,
      inMatch: true,
      playerName
    };
  }
  // Defending
  return {
    type: 'keeper_save',
    title: 'Rakip Penaltısı!',
    description: `${minute}' — Kaleci, penaltıyı kurtar!`,
    inMatch: true,
    playerName
  };
}

/** Apply minigame result onto game state partial */
export function applyMinigameToState(
  gs: GameState,
  result: MinigameResult,
  opts?: { weakenOpponent?: string }
): Partial<GameState> {
  const updates: Partial<GameState> = {
    budget: gs.budget + (result.budgetDelta || 0),
    managerRep: Math.max(0, Math.min(100, gs.managerRep + (result.repDelta || 0))),
    fanHappiness: Math.max(0, Math.min(100, (gs.fanHappiness || 60) + (result.fanDelta || 0))),
    teamChemistry: Math.max(0, Math.min(100, (gs.teamChemistry || 55) + (result.chemistryDelta || 0))),
    clubStats: {
      ...gs.clubStats,
      minigamesWon: (gs.clubStats.minigamesWon || 0) + (result.minigamesWon || 0),
      penaltiesScored: (gs.clubStats.penaltiesScored || 0) + (result.penaltiesScored || 0)
    },
    news: [result.news, ...gs.news.slice(0, 4)]
  };

  if (result.moraleDelta) {
    updates.team11 = gs.team11.map(p => ({
      ...p,
      morale: Math.max(0, Math.min(100, p.morale + (result.moraleDelta || 0)))
    }));
    updates.bench = gs.bench.map(p => ({
      ...p,
      morale: Math.max(0, Math.min(100, p.morale + (result.moraleDelta || 0)))
    }));
  }
  if (result.energyDelta) {
    const base11 = updates.team11 || gs.team11;
    const baseBench = updates.bench || gs.bench;
    updates.team11 = base11.map(p => ({
      ...p,
      energy: Math.max(0, Math.min(100, p.energy + (result.energyDelta || 0)))
    }));
    updates.bench = baseBench.map(p => ({
      ...p,
      energy: Math.max(0, Math.min(100, p.energy + (result.energyDelta || 0)))
    }));
  }

  // Sabotage success: lower next opponent / named team ovr temporarily
  if (result.success && opts?.weakenOpponent) {
    updates.league = gs.league.map(t =>
      t.name === opts.weakenOpponent ? { ...t, ovr: Math.max(40, t.ovr - 3) } : t
    );
    // Also fixture copy
    updates.fixture = gs.fixture.map(t =>
      t.name === opts.weakenOpponent ? { ...t, ovr: Math.max(40, t.ovr - 3) } : t
    );
  }

  return updates;
}
