import React, { useMemo } from 'react';

interface SparklineProps {
  /** Değer dizisi (sol→sağ eskiden yeniye) */
  data: number[];
  /** Vurgu rengi (hex) */
  color?: string;
  /** px yükseklik — genişlik her zaman %100 */
  height?: number;
  /** Çizgi altını doldur */
  fill?: boolean;
  className?: string;
}

/**
 * 📈 Ultra hafif SVG sparkline — canvas yok, kütüphane yok.
 * 24 nokta = 1 polyline + 1 polygon; i3'e bile batmaz.
 */
export const Sparkline: React.FC<SparklineProps> = ({ data, color = '#34d399', height = 40, fill = true, className }) => {
  const geom = useMemo(() => {
    const pts = data.filter(v => typeof v === 'number' && isFinite(v));
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const W = 100;
    const H = height;
    const pad = 3;
    const coords = pts.map((v, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = pad + (1 - (v - min) / span) * (H - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return {
      line: coords.join(' '),
      area: `0,${H} ${coords.join(' ')} ${W},${H}`,
      lastX: W,
      lastY: Number(coords[coords.length - 1].split(',')[1]),
    };
  }, [data, height]);

  const gid = useMemo(() => `sg${Math.random().toString(36).slice(2, 8)}`, []);

  if (!geom) {
    return (
      <div className={`flex items-center justify-center text-[10px] text-slate-600 ${className ?? ''}`} style={{ height }}>
        grafik için veri birikiyor…
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={`w-full ${className ?? ''}`} style={{ height }} aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={geom.area} fill={`url(#${gid})`} />
        </>
      )}
      <polyline points={geom.line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={geom.lastX} cy={geom.lastY} r="1.6" fill={color} />
    </svg>
  );
};
