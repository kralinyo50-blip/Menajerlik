import { CURRENT_VERSION } from '../data/updateLog';

export function ModeSelection({ onSelect }: { onSelect: (mode: 'online' | 'offline') => void }) {
  return <main className="h-screen bg-slate-950 text-white relative overflow-y-auto overflow-x-hidden custom-scroll flex p-5 sm:p-10">
    <div className="pointer-events-none absolute -top-40 -left-28 h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-40 -right-28 h-[34rem] w-[34rem] rounded-full bg-amber-500/10 blur-3xl" />
    <div className="relative w-full max-w-5xl m-auto">
      <header className="text-center mb-10 sm:mb-14">
        <div className="inline-flex gap-2 items-center text-xs font-bold tracking-widest text-slate-400 border border-slate-700 bg-slate-900 rounded-full px-4 py-2 mb-7">⚽ MANAGER PRO 2026 <span className="text-slate-600">/</span> v{CURRENT_VERSION}</div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Nasıl oynamak istersin?</h1>
        <p className="text-slate-400 text-sm sm:text-base mt-4">Kendi kariyerin ya da arkadaşlarınla aynı lig. Seçim senin.</p>
      </header>
      <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
        <button onClick={() => onSelect('offline')} aria-label="Offline Oyna" className="group relative text-left rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-900 p-6 sm:p-8 hover:border-amber-400/70 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-amber-400 transition duration-200">
          <div className="flex items-start justify-between mb-9"><span className="text-amber-300 bg-amber-400/10 border border-amber-400/20 rounded-2xl p-4"><svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg></span><span className="text-[11px] uppercase tracking-widest rounded-full bg-amber-400/10 text-amber-300 px-3 py-1.5">Tek oyuncu</span></div>
          <h2 className="text-3xl font-black text-white">Offline Oyna</h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">Kulübünü sıfırdan zirveye taşı. Kendi temponda, botlara karşı tam menajerlik deneyimi.</p>
          <ul className="space-y-3 text-sm text-slate-300 my-7"><li>✓ Kariyer, transfer ve tesis yönetimi</li><li>✓ Tek kişilik lig, kupa ve 3D maçlar</li><li>✓ Mevcut kayıtlarınla devam et</li></ul>
          <div className="flex items-center justify-between border-t border-slate-700 pt-5 text-amber-300 font-bold">Kariyere gir <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span></div>
        </button>
        <button onClick={() => onSelect('online')} aria-label="Online Oyna" className="group relative text-left rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/60 to-slate-900 p-6 sm:p-8 hover:border-cyan-400/80 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-cyan-400 transition duration-200">
          <div className="flex items-start justify-between mb-9"><span className="text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-2xl p-4"><svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><ellipse cx="12" cy="12" rx="4" ry="10" /><path d="M2 12h20M4 6h16M4 18h16" /></svg></span><span className="text-[11px] uppercase tracking-widest rounded-full bg-cyan-400/10 text-cyan-300 px-3 py-1.5">2–10 menajer</span></div>
          <h2 className="text-3xl font-black text-white">Online Oyna</h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">Arkadaşlarınla aynı lige gir. Kodu paylaş, takımını hazırla ve ortak sahada karşılaş.</p>
          <ul className="space-y-3 text-sm text-slate-300 my-7"><li>✓ Kodla lig kur veya arkadaşına katıl</li><li>✓ Senkronize canlı 3D/2D maçlar</li><li>✓ Ayrı online takım, kadro ve taktik</li></ul>
          <div className="flex items-center justify-between border-t border-cyan-500/20 pt-5 text-cyan-300 font-bold">Online lige gir <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span></div>
        </button>
      </div>
      <footer className="text-center text-xs text-slate-500 mt-8 space-y-2"><p>İki modun kayıtları ayrıdır. İstediğin zaman mod seçimine dönebilirsin.</p><p>Online için herkesin aynı çalışan oyun sunucusuna bağlanması gerekir.</p><p className="pt-4 text-[10px] tracking-[0.25em] text-slate-600">MADE BY KAAN</p></footer>
    </div>
  </main>;
}
