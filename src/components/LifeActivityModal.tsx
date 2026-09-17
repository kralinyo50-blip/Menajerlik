import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, LifeActivityId, LifeStats } from '../types/game';
import { ActivityVariant, LifeActivity } from '../data/life';
import { computeOutcome, getLifeTime } from '../utils/life';
import { LifeScene3D } from './LifeScene3D';
import { sfx } from '../utils/sound';

interface LifeActivityModalProps {
  activity: LifeActivity;
  gameState: GameState;
  /** Aktiviteyi uygular (state güncellenir) ve sonucu döndürür */
  onDo: (activityId: LifeActivityId, variantId: string) => { summary: string; xp: number; cost: number; fatigued: boolean } | null;
  onClose: () => void;
}

type Phase = 'prepare' | 'active' | 'done';

const STAT_LABEL: Record<keyof LifeStats, { label: string; icon: string; color: string }> = {
  energy: { label: 'Enerji', icon: '⚡', color: 'text-amber-300' },
  fitness: { label: 'Form', icon: '💪', color: 'text-emerald-300' },
  fun: { label: 'Keyif', icon: '😄', color: 'text-sky-300' },
  fame: { label: 'Ün', icon: '⭐', color: 'text-violet-300' },
};

/** Aktivite süresi (ms) — sahne bu süre boyunca oynar */
const DURATION: Record<LifeActivityId, number> = {
  gym: 7000,
  games: 5000,
  rest: 4500,
  goOut: 5500,
  vacation: 6000,
  press: 5000,
};

export const LifeActivityModal: React.FC<LifeActivityModalProps> = ({ activity, gameState, onDo, onClose }) => {
  const [phase, setPhase] = useState<Phase>('prepare');
  const [variant, setVariant] = useState<ActivityVariant>(activity.variants[0]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ summary: string; xp: number; cost: number; fatigued: boolean } | null>(null);
  const [pickedOutfit, setPickedOutfit] = useState<'club' | 'black' | null>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  const preview = useMemo(() => computeOutcome(gameState, activity.id, variant.id), [gameState, activity.id, variant.id]);
  const needsOutfit = activity.scene === 'gym';
  const outfitPicked = !!pickedOutfit;
  const timeInfo = useMemo(() => getLifeTime(gameState), [gameState.week, gameState.season]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const start = () => {
    setPhase('active');
    setProgress(0);
    startRef.current = performance.now();
    const total = DURATION[activity.id] ?? 5000;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const pct = Math.min(100, (elapsed / total) * 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const outcome = onDo(activity.id, variant.id);
        if (outcome) {
          setResult(outcome);
          sfx.levelUp();
        }
        setPhase('done');
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const statsAfter: LifeStats = {
    energy: Math.max(0, Math.min(100, gameState.life.stats.energy + (preview.applied.energy ?? 0) - activity.energyCost)),
    fitness: Math.min(100, Math.max(0, gameState.life.stats.fitness + (preview.applied.fitness ?? 0))),
    fun: Math.min(100, Math.max(0, gameState.life.stats.fun + (preview.applied.fun ?? 0))),
    fame: Math.min(100, Math.max(0, gameState.life.stats.fame + (preview.applied.fame ?? 0))),
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden my-4">
        {/* Başlık */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activity.icon}</span>
            <div>
              <div className="text-white font-black">{activity.label}</div>
              <div className="text-[11px] text-slate-400">
                {phase === 'prepare' && (needsOutfit && !outfitPicked ? 'Hazırlık: üstünü değiştir' : 'Ne yapmak istiyorsun?')}
                {phase === 'active' && 'Devam ediyor…'}
                {phase === 'done' && 'Tamamlandı'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* 3D sahne — variant değişiminde sahne tamamen yenilenmeli */}
        <div className="p-3">
          <LifeScene3D
            key={`${activity.id}-${variant.id}-${pickedOutfit ?? ''}`}
            activityId={activity.id}
            variantId={variant.id}
            clubColor={gameState.stadium?.design?.seatColor}
            clubLogo={gameState.teamLogo}
            height={300}
            cinematic={phase === 'active'}
            badge={phase === 'active' ? `${Math.round(progress)}%` : variant.label}
            skin={gameState.life.appearance?.skin}
            hair={gameState.life.appearance?.hair}
            outfit={activity.scene === 'gym' ? (pickedOutfit ?? gameState.life.appearance?.outfit) : gameState.life.appearance?.outfit}
            timeOfDay={timeInfo.timeOfDay}
            season={timeInfo.season}
            lowPerf={gameState.life.lowPerf}
          />
        </div>

        {/* Hazırlık */}
        {phase === 'prepare' && (
          <div className="px-4 pb-4">
            {needsOutfit && !outfitPicked && (
              <div className="bg-slate-800/70 rounded-2xl p-4 mb-3 text-center">
                <div className="text-3xl mb-1">👕</div>
                <div className="text-white font-bold text-sm mb-1">Spor salonuna girmeden önce üstünü değiştir</div>
                <div className="text-[11px] text-slate-400 mb-3">
                  Dolabından antrenman kıyafetini seç: {gameState.teamName} renkleri ya da klasik siyah.
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => { setPickedOutfit('club'); sfx.click?.(); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${pickedOutfit === 'club' ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                  >
                    🎽 Kulüp kıyafeti
                  </button>
                  <button
                    onClick={() => { setPickedOutfit('black'); sfx.click?.(); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${pickedOutfit === 'black' ? 'bg-slate-900 text-white ring-2 ring-slate-400' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                  >
                    ⚫ Siyah antrenman
                  </button>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 mb-2">Ne yapacağını seç:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {activity.variants.map(v => {
                const active = variant.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={`text-left rounded-xl p-3 border-2 transition-all ${
                      active ? 'bg-emerald-500/15 border-emerald-500' : 'bg-slate-800/60 border-slate-700 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="text-white font-bold text-sm">{v.icon} {v.label}</div>
                    <div className="text-[10px] text-slate-400 mb-1">{v.desc}</div>
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(v.effect) as (keyof LifeStats | 'xp')[]).map(key => {
                        const value = v.effect[key] as number;
                        if (!value) return null;
                        const label = key === 'xp' ? 'XP' : STAT_LABEL[key as keyof LifeStats].label;
                        return (
                          <span key={key} className={`text-[9px] px-1.5 py-0.5 rounded ${
                            value > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {label} {value > 0 ? '+' : ''}{value}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tahmini sonuç */}
            <div className="bg-slate-800/60 rounded-2xl p-3 mb-3">
              <div className="text-[11px] text-slate-300 mb-2 font-bold">Bu aktiviteden sonra tahmini durumun</div>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(STAT_LABEL) as (keyof LifeStats)[]).map(key => {
                  const before = gameState.life.stats[key];
                  const after = statsAfter[key];
                  const diff = after - before;
                  return (
                    <div key={key} className="bg-slate-700/40 rounded-xl p-2 text-center">
                      <div className="text-[10px] text-slate-400">{STAT_LABEL[key].icon} {STAT_LABEL[key].label}</div>
                      <div className={`font-black text-sm ${STAT_LABEL[key].color}`}>{after}</div>
                      {diff !== 0 && (
                        <div className={`text-[9px] ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="text-slate-400">
                  Kullanılacak hak: {activity.slots} • Enerji maliyeti: {activity.energyCost}
                  {preview.cost > 0 && ` • Masraf: $${preview.cost.toLocaleString()}`}
                </span>
                {preview.fatigued && <span className="text-amber-300">⚠️ Yorgunsun: etkiler yarıya iner</span>}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={start}
                disabled={needsOutfit && !outfitPicked}
                className={`flex-1 py-3 rounded-xl font-black transition-all ${
                  needsOutfit && !outfitPicked
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white'
                }`}
              >
                ▶️ Başla {preview.xp > 0 && `(+${preview.xp} XP)`}
              </button>
              <button onClick={onClose} className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl">Vazgeç</button>
            </div>
          </div>
        )}

        {/* Aktif */}
        {phase === 'active' && (
          <div className="px-4 pb-4">
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-center text-xs text-slate-300">
              {activity.id === 'gym' && (variant.id === 'run' ? '🏃 Ter akıtıyorsun…' : variant.id === 'lift' ? '🏋️ Son tekrarlar…' : '🚴 Pedal çeviriyorsun…')}
              {activity.id === 'games' && '🎮 Maç yapıyorsun…'}
              {activity.id === 'rest' && '🛋️ Kafanı dinliyorsun…'}
              {activity.id === 'goOut' && '🚶 Şehri geziyorsun…'}
              {activity.id === 'vacation' && '🏖️ Tatilin tadını çıkarıyorsun…'}
              {activity.id === 'press' && '🎤 Soruları yanıtlıyorsun…'}
            </div>
          </div>
        )}

        {/* Sonuç */}
        {phase === 'done' && result && (
          <div className="px-4 pb-4">
            <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-4 text-center mb-3">
              <div className="text-3xl mb-1">✅</div>
              <div className="text-emerald-300 font-black mb-1">{activity.label} tamamlandı!</div>
              <div className="text-[12px] text-slate-200">{result.summary}</div>
              {result.xp > 0 && <div className="text-[12px] text-violet-300 font-bold mt-1">+{result.xp} menajer XP</div>}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(Object.keys(STAT_LABEL) as (keyof LifeStats)[]).map(key => {
                const value = statsAfter[key];
                const diff = value - gameState.life.stats[key];
                return (
                  <div key={key} className="bg-slate-800/70 rounded-xl p-3 text-center">
                    <div className="text-[10px] text-slate-400">{STAT_LABEL[key].icon} {STAT_LABEL[key].label}</div>
                    <div className={`font-black text-lg ${STAT_LABEL[key].color}`}>{value}</div>
                    {diff !== 0 && (
                      <div className={`text-[10px] ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-black rounded-xl"
            >
              Harika, devam! 👍
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
