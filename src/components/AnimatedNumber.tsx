import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  /** Gösterim biçimi (varsayılan: tr-TR binlik ayraçlı tam sayı) */
  format?: (n: number) => string;
  /** Animasyon süresi (ms) — büyük değerlerde otomatik uzar */
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * 🔢 Yumuşak sayaç — para/puan değişimleri "tak" diye atlamaz, akıcı sayar.
 * requestAnimationFrame ile çalışır; sekme arka plandayken tek karede tamamlanır.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format,
  duration,
  className,
  prefix,
  suffix,
}) => {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString('tr-TR'));

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    // Sayı ne kadar büyükse o kadar uzun sürsün (ama 320-900 ms arasında kalsın)
    const span = Math.abs(to - from);
    const ms = duration ?? Math.min(900, 320 + Math.log10(Math.max(10, span)) * 90);
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || document.hidden || ms <= 0) {
      fromRef.current = to;
      setShown(to);
      return;
    }

    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const v = from + (to - from) * ease(t);
      setShown(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {fmt(shown)}
      {suffix}
    </span>
  );
};
