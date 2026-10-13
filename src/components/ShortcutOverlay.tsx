import React from 'react';

interface Shortcut {
  keys: string[];
  desc: string;
}

const GROUPS: { title: string; icon: string; items: Shortcut[] }[] = [
  {
    title: 'Genel',
    icon: '🧭',
    items: [
      { keys: ['?'], desc: 'Bu kısayol listesini aç / kapat' },
      { keys: ['Esc'], desc: 'Açık pencereyi kapat' },
      { keys: ['M'], desc: 'Maça çık (taktik odası açılır)' },
      { keys: ['S'], desc: 'Hızlı kaydet (Slot 1)' },
      { keys: ['Alt', '←'], desc: 'Önceki sekme' },
      { keys: ['Alt', '→'], desc: 'Sonraki sekme' },
      { keys: ['←', '→'], desc: 'Sekme şeridinde gezin (şerit odaktayken)' },
      { keys: ['Home', 'End'], desc: 'İlk / son sekme' },
    ],
  },
  {
    title: 'Maç ekranı',
    icon: '⚽',
    items: [
      { keys: ['1'], desc: 'Normal hız (1×)' },
      { keys: ['2'], desc: 'Hızlı (2×)' },
      { keys: ['4'], desc: 'Çok hızlı (4×)' },
      { keys: ['Space'], desc: 'Duraklat / devam' },
      { keys: ['D'], desc: 'Oyuncu değişikliği ekranı' },
    ],
  },
];

/**
 * ⌨️ Kısayol rehberi — ? tuşuyla açılır.
 * Oyunu duraklatmaz, salt bilgi verir; Esc veya arka plana tıklayınca kapanır.
 */
export const ShortcutOverlay: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mp-overlay fixed inset-0 z-[92] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Klavye kısayolları"
    >
      <div className="mp-modal mp-card w-full max-w-2xl overflow-hidden p-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700/60 bg-gradient-to-r from-emerald-600/25 to-cyan-600/15 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-white">⌨️ Klavye Kısayolları</h3>
            <p className="text-xs text-emerald-200/80">Fareyle de her şey yapılabilir — bunlar hız için.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-600/70 bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
          >
            Kapat <span className="kbd ml-1">Esc</span>
          </button>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {GROUPS.map(g => (
            <div key={g.title}>
              <div className="mp-section-title mb-3">
                <span>{g.icon}</span>
                {g.title}
              </div>
              <ul className="space-y-2">
                {g.items.map(it => (
                  <li key={it.desc} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-700/30">
                    <span className="text-[13px] text-slate-300">{it.desc}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {it.keys.map(k => (
                        <React.Fragment key={k}>
                          <span className="kbd">{k}</span>
                          {it.keys.indexOf(k) < it.keys.length - 1 && <span className="text-[10px] text-slate-500">/</span>}
                        </React.Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700/60 bg-slate-900/60 px-5 py-3 text-[11px] text-slate-500">
          İpucu: metin yazarken kısayollar devre dışıdır — formları rahatça doldurabilirsin.
        </div>
      </div>
    </div>
  );
};
