import React, { useCallback, useMemo } from 'react';
import { LifeActivityId } from '../types/game';
import { buildLifeScene, LifeSceneBuild } from './life/scenes';
import { useOrbitThree } from './three/useOrbitThree';
import { ACTIVITY_SCENE_KEY, SCENE_TITLES } from '../data/life';

interface LifeScene3DProps {
  activityId: LifeActivityId;
  variantId: string;
  clubColor?: string;
  clubLogo?: string;
  height?: number;
  /** Otomatik kamera turu */
  cinematic?: boolean;
  className?: string;
  /** Sahne üzerinde gösterilecek küçük etiket */
  badge?: string;
  skin?: string;
  hair?: string;
  outfit?: 'club' | 'black';
  timeOfDay?: 'morning' | 'day' | 'evening' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  lowPerf?: boolean;
}

/**
 * Menajerin hayatından 3D sahneler: spor salonu, ev, şehir/sahil ve basın topluluğu.
 * Sürükle = döndür, tekerlek = yakınlaştır, çift tık = sıfırla.
 */
export const LifeScene3D: React.FC<LifeScene3DProps> = ({
  activityId, variantId, clubColor, clubLogo, height = 340, cinematic = false, className = '', badge,
  skin, hair, outfit, timeOfDay, season, lowPerf
}) => {
  const build = useCallback(
    () => buildLifeScene(activityId, variantId, { clubColor, clubLogo, skin, hair, outfit, timeOfDay, season, lowPerf }) as LifeSceneBuild,
    [activityId, variantId, clubColor, clubLogo, skin, hair, outfit, timeOfDay, season, lowPerf]
  );

  const { hostRef, ready, failed, resetCamera } = useOrbitThree(build, [activityId, variantId, clubColor, clubLogo, skin, hair, outfit, timeOfDay, season, lowPerf, height], {
    height,
    cinematic,
  });

  const meta = useMemo(() => {
    // Aktiviteler sahne anahtarına eşlenir (games:fifa → home:game gibi)
    const sceneKey = ACTIVITY_SCENE_KEY[`${activityId}:${variantId}`];
    return (sceneKey && SCENE_TITLES[sceneKey]) || null;
  }, [activityId, variantId]);

  if (failed) {
    return (
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 text-center" style={{ height }}>
        <div className="text-4xl mb-2">🎮</div>
        <div className="text-slate-300 text-sm">3D sahne bu cihazda açılamadı (WebGL kapalı olabilir).</div>
        <div className="text-slate-500 text-xs mt-1">Aktivite sonuçları yine de geçerli.</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div key={`${activityId}-${variantId}`} ref={hostRef} style={{ height }} className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-700" />

      {/* Sahne bilgisi */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur px-2.5 py-1.5 rounded-lg">
          <div className="text-[11px] font-bold text-white">{meta?.title ?? 'Sahne'}</div>
          {meta?.subtitle && <div className="text-[9px] text-slate-300">{meta.subtitle}</div>}
        </div>
        {badge && (
          <div className="bg-emerald-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg">{badge}</div>
        )}
      </div>

      <div className="absolute bottom-2 left-2 bg-black/55 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] text-slate-200 pointer-events-none">
        🖱️ Sürükle: döndür • Tekerlek: yakınlaştır • Çift tık: sıfırla
      </div>

      <button
        onClick={resetCamera}
        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] text-white border border-white/10"
      >
        🎥 Kamerayı sıfırla
      </button>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-300 text-sm animate-pulse">🎬 Sahne hazırlanıyor…</span>
        </div>
      )}
    </div>
  );
};
