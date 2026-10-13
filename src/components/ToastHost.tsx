import React, { useSyncExternalStore } from 'react';
import { dismissToast, getToasts, subscribeToasts, ToastTone } from '../utils/notify';

const TONE_STYLE: Record<ToastTone, { ring: string; badge: string; bar: string }> = {
  ok: { ring: 'border-emerald-500/35', badge: 'bg-emerald-500 text-slate-950', bar: 'from-emerald-400 to-cyan-400' },
  info: { ring: 'border-cyan-500/35', badge: 'bg-cyan-500 text-slate-950', bar: 'from-cyan-400 to-sky-400' },
  warn: { ring: 'border-amber-500/40', badge: 'bg-amber-400 text-slate-950', bar: 'from-amber-400 to-orange-400' },
  bad: { ring: 'border-red-500/40', badge: 'bg-red-500 text-white', bar: 'from-red-500 to-rose-400' },
};

/**
 * 🔔 Bildirim katmanı — oyundan bağımsız çalışır (OfflineGame'i yeniden çizmez).
 * Sağ üstte yığılır, tıklayınca kapanır, alttaki çubuk süreyi gösterir.
 */
export const ToastHost: React.FC<{ bottomOffset?: boolean }> = ({ bottomOffset = true }) => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed right-3 z-[95] flex flex-col items-end gap-2 pointer-events-none ${bottomOffset ? 'top-3 lg:top-4' : 'top-3'}`}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(t => {
        const s = TONE_STYLE[t.tone];
        return (
          <button
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`pointer-events-auto text-left w-full max-w-sm overflow-hidden rounded-2xl border ${s.ring} bg-slate-900/95 shadow-2xl shadow-black/45 backdrop-blur-md animate-slide-in group`}
            title="Kapat"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className={`w-9 h-9 rounded-full ${s.badge} flex items-center justify-center text-base font-black flex-shrink-0 shadow-lg`}>
                {t.icon}
              </span>
              <span className="text-sm font-semibold text-slate-100 leading-snug">{t.message}</span>
            </div>
            {t.ttl > 0 && (
              <span className="block h-[3px] bg-slate-700/40">
                <span
                  className={`block h-full bg-gradient-to-r ${s.bar}`}
                  style={{ animation: `mpToastBar ${t.ttl}ms linear forwards` }}
                />
              </span>
            )}
          </button>
        );
      })}
      <style>{`@keyframes mpToastBar { from { width: 100% } to { width: 0% } }`}</style>
    </div>
  );
};
