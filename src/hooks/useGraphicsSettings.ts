import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  GraphicsSettings, HardwareInfo, applyTier, detectHardware, effectivePixelRatio,
  loadGraphics, runGpuBenchmark, saveGraphics, scoreToTier, subscribeGraphics,
} from '../utils/graphics';

/**
 * Grafik ayarlarına React erişimi. Ayarlar değişince abone bileşenler
 * yeniden çizilir; 3D sahneler `sig` değerini useEffect bağımlılığına
 * ekleyerek yeniden kurulur (anti-alias/gölge gibi kurulum-time seçenekler).
 */
export function useGraphicsSettings(): {
  settings: GraphicsSettings;
  setSettings: (patch: Partial<GraphicsSettings>) => void;
  setTier: typeof applyTier;
  sig: string;
  pixelRatio: number;
  benchmark: () => Promise<{ fps: number; score: number }>;
} {
  const settings = useSyncExternalStore(subscribeGraphics, loadGraphics, loadGraphics);
  const setSettings = useCallback((patch: Partial<GraphicsSettings>) => {
    saveGraphics({ ...loadGraphics(), ...patch });
  }, []);
  const sig = useMemo(
    () => `t${settings.tier}|s${settings.renderScale}|sh${settings.shadows ? 1 : 0}|aa${settings.antialias ? 1 : 0}|p${settings.particles ? 1 : 0}`,
    [settings.tier, settings.renderScale, settings.shadows, settings.antialias, settings.particles]
  );
  return {
    settings,
    setSettings,
    setTier: applyTier,
    sig,
    pixelRatio: effectivePixelRatio(settings.renderScale),
    benchmark: runGpuBenchmark,
  };
}

/** Bir kez algıla, önbelleğe al */
let hwCache: HardwareInfo | null = null;
export function cachedHardware(): HardwareInfo {
  if (!hwCache) hwCache = detectHardware();
  return hwCache;
}

export { scoreToTier };
