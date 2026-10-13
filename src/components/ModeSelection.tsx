import React from 'react';
import { CURRENT_VERSION } from '../data/updateLog';
import { describeSlots, SlotInfo } from '../utils/save';
import { sfx } from '../utils/sound';

const HIGHLIGHTS = [
  { icon: '🎥', label: '3D maç & stadyum' },
  { icon: '🌍', label: '74 yıldız futbolcu' },
  { icon: '🧠', label: '8 dallı beceri ağacı' },
  { icon: '🎰', label: '7 kumarhane oyunu' },
  { icon: '🏅', label: '23 başarım' },
  { icon: '🚶', label: 'Menajerin hayatı' },
];

export function ModeSelection({ onSelect }: { onSelect: (mode: 'online' | 'offline') => void }) {
  const [slots, setSlots] = React.useState<SlotInfo[]>([]);
  React.useEffect(() => {
    // Kayıt özetleri ilk kare çizildikten sonra okunur (açılışı yavaşlatmasın)
    const id = requestAnimationFrame(() => setSlots(describeSlots()));
    return () => cancelAnimationFrame(id);
  }, []);

  const active = slots.find(s => s.exists);

  const pick = (mode: 'online' | 'offline') => {
    sfx.click();
    onSelect(mode);
  };

  return (
    <main className="relative flex h-screen overflow-y-auto overflow-x-hidden bg-slate-950 p-5 text-white custom-scroll sm:p-10">
      {/* Arka plan: saha çizgileri + aurora (saf CSS, ek istek yok) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          background:
            'radial-gradient(900px 520px at 50% -10%, rgba(16,185,129,0.18), transparent 62%),' +
            'radial-gradient(760px 460px at 92% 108%, rgba(6,182,212,0.16), transparent 62%),' +
            'radial-gradient(620px 420px at 4% 100%, rgba(139,92,246,0.12), transparent 62%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            'linear-gradient(transparent 49.6%, rgba(226,232,240,0.5) 49.6%, rgba(226,232,240,0.5) 50.4%, transparent 50.4%),' +
            'radial-gradient(circle at 50% 50%, transparent 132px, rgba(226,232,240,0.55) 132px, rgba(226,232,240,0.55) 134px, transparent 134px)',
        }}
      />
      <div className="pointer-events-none absolute -top-32 -left-24 h-[32rem] w-[32rem] rounded-full bg-emerald-500/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[32rem] w-[32rem] rounded-full bg-amber-500/[0.06] blur-3xl" />

      <div className="relative m-auto w-full max-w-5xl">
        <header className="mb-9 text-center sm:mb-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-[11px] font-bold tracking-[0.22em] text-slate-400 backdrop-blur">
            <span className="text-base">⚽</span>
            <span className="text-slate-200">MANAGER PRO 2026</span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-300">v{CURRENT_VERSION}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            <span className="text-gradient">Nasıl oynamak istersin?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
            Kendi kariyerin ya da arkadaşlarınla aynı lig. Seçim senin — istediğin an değiştirebilirsin.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2 sm:gap-6">
          {/* ── OFFLINE ── */}
          <button
            onClick={() => pick('offline')}
            aria-label="Offline Oyna"
            className="mp-card mp-card-hover group relative overflow-hidden p-6 text-left sm:p-8 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
            <div className="relative flex items-start justify-between mb-8">
              <span className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-amber-300 transition-transform duration-300 group-hover:scale-105">
                <svg aria-hidden="true" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
                </svg>
              </span>
              <span className="mp-chip mp-chip-warn">Tek oyuncu</span>
            </div>
            <h2 className="relative text-3xl font-black text-white">Offline Oyna</h2>
            <p className="relative mt-3 text-sm leading-relaxed text-slate-400">
              Kulübünü sıfırdan zirveye taşı. Kendi temponda, botlara karşı tam menajerlik deneyimi.
            </p>
            <ul className="relative my-7 space-y-2.5 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> Kariyer, transfer ve tesis yönetimi</li>
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> Tek kişilik lig, kupa ve 3D maçlar</li>
              <li className="flex gap-2"><span className="text-emerald-400">✓</span> Mevcut kayıtlarınla devam et</li>
            </ul>

            {active && (
              <div className="relative mb-6 flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] px-3.5 py-3">
                <span className="text-2xl">{active.teamLogo || '⚽'}</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-black tracking-widest text-amber-300/90">DEVAM EDEN KARİYER</div>
                  <div className="truncate text-sm font-bold text-white">
                    {active.teamName} • Sezon {active.season} • Hafta {active.week}
                  </div>
                </div>
              </div>
            )}

            <div className="relative flex items-center justify-between border-t border-slate-700/70 pt-5 font-bold text-amber-300">
              <span>{active ? 'Kariyere devam et' : 'Yeni kariyer başlat'}</span>
              <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          {/* ── ONLINE ── */}
          <button
            onClick={() => pick('online')}
            aria-label="Online Oyna"
            className="mp-card mp-card-hover group relative overflow-hidden border-cyan-500/30 p-6 text-left sm:p-8 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-2xl opacity-60 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start justify-between mb-8">
              <span className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-cyan-300 transition-transform duration-300 group-hover:scale-105">
                <svg aria-hidden="true" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <ellipse cx="12" cy="12" rx="4" ry="10" />
                  <path d="M2 12h20M4 6h16M4 18h16" />
                </svg>
              </span>
              <span className="mp-chip mp-chip-info">2–10 menajer</span>
            </div>
            <h2 className="relative text-3xl font-black text-white">Online Oyna</h2>
            <p className="relative mt-3 text-sm leading-relaxed text-slate-400">
              Arkadaşlarınla aynı lige gir. Kodu paylaş, takımını hazırla ve ortak sahada karşılaş.
            </p>
            <ul className="relative my-7 space-y-2.5 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-cyan-400">✓</span> Kodla lig kur veya arkadaşına katıl</li>
              <li className="flex gap-2"><span className="text-cyan-400">✓</span> Senkronize canlı 3D / 2D maçlar</li>
              <li className="flex gap-2"><span className="text-cyan-400">✓</span> Ayrı online takım, kadro ve taktik</li>
            </ul>

            <div className="relative mb-6 flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3.5 py-3">
              <span className="text-2xl">🔗</span>
              <div className="min-w-0">
                <div className="text-[10px] font-black tracking-widest text-cyan-300/90">NASIL ÇALIŞIR</div>
                <div className="text-sm font-bold text-white">Oda kur → 8 haneli kodu paylaş → herkes aynı ligde</div>
              </div>
            </div>

            <div className="relative flex items-center justify-between border-t border-cyan-500/25 pt-5 font-bold text-cyan-300">
              <span>Online lige gir</span>
              <span className="text-2xl transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>
        </div>

        {/* Özellik şeridi */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {HIGHLIGHTS.map(h => (
            <span key={h.label} className="mp-chip">
              <span>{h.icon}</span> {h.label}
            </span>
          ))}
        </div>

        <footer className="mt-8 space-y-2 text-center text-xs text-slate-500">
          <p>İki modun kayıtları ayrıdır. İstediğin zaman bu ekrana dönüp mod değiştirebilirsin.</p>
          <p>Online oyun için herkesin aynı çalışan sunucuya bağlanması gerekir.</p>
          <p className="pt-3 text-[10px] tracking-[0.25em]">
            <span className="kaan-watermark">MADE BY KAAN</span> • <span className="text-slate-600">☀️ BÜTÜN YAZ BOYUNCA GELİŞTİRİLDİ</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
