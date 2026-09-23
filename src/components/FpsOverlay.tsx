import React, { useEffect, useRef, useState } from 'react';
import { useGraphicsSettings } from '../hooks/useGraphicsSettings';

/**
 * 🎛️ Ekran köşesinde canlı FPS + render ölçeği göstergesi (Ayarlar'dan açılır).
 * rAF hızını ve uyarlanabilir çözünürlüğün anlık ölçeğini gösterir.
 */
export const FpsOverlay: React.FC = () => {
  const { settings } = useGraphicsSettings();
  const [fps, setFps] = useState(60);
  const frameRef = useRef({ frames: 0, last: 0 });

  useEffect(() => {
    if (!settings.showFps) return;
    let raf = 0;
    let alive = true;
    const loop = (t: number) => {
      const st = frameRef.current;
      if (!st.last) st.last = t;
      st.frames++;
      if (t - st.last >= 500) {
        setFps(Math.round((st.frames * 1000) / (t - st.last)));
        st.frames = 0;
        st.last = t;
      }
      if (alive) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      frameRef.current = { frames: 0, last: 0 };
    };
  }, [settings.showFps]);

  if (!settings.showFps) return null;
  const color = fps >= 50 ? 'text-emerald-300' : fps >= 30 ? 'text-amber-300' : 'text-red-300';
  return (
    <div className="fixed bottom-2 left-2 z-[80] bg-slate-950/85 backdrop-blur border border-slate-700 rounded-lg px-2.5 py-1 font-mono text-[10px] text-slate-300 shadow-lg pointer-events-none">
      <span className={`font-black ${color}`}>{fps} FPS</span>
      <span className="mx-1.5 text-slate-600">•</span>
      <span>ölçek ×{settings.renderScale.toFixed(2)}</span>
      <span className="mx-1.5 text-slate-600">•</span>
      <span>{settings.adaptiveResolution ? 'adaptif ✓' : 'sabit'}</span>
    </div>
  );
};
