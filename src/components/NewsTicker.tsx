import React from 'react';

interface NewsTickerProps {
  news: string[];
}

/**
 * 📰 Alt haber şeridi — v5.4 performans sürümü
 *
 * Eski hâli: `backdrop-blur-xl` ile sabit (fixed) bir şerit. Altındaki içerik
 * sürekli kaydığı için tarayıcı her karede blur'u yeniden hesaplıyordu — zayıf
 * GPU'larda maç sırasında görünür takılma sebebiydi. Artık opak gradyan
 * kullanılıyor (görsel neredeyse aynı, maliyet neredeyse sıfır).
 *
 * Ayrıca: sekme arka plandayken veya "hareketi azalt" açıkken animasyon durur.
 */
export const NewsTicker: React.FC<NewsTickerProps> = React.memo(({ news }) => {
  const [paused, setPaused] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // İçerik uzunluğuna göre sabit hız: kısa şerit yavaş, uzun şerit hızlı akar
  // (eskiden 30 sn sabitti; haber çoğalınca şerit ışık hızında geçiyordu).
  const items = news.length > 0 ? news.slice(0, 8) : ['Sezon heyecanla devam ediyor...'];
  const crafted = 'Manager Pro 2026 Ultimate  •  Made by Kaan  •  ☀️ Bütün Yaz Boyunca Geliştirildi';
  const text = `${items.join('   •   ')}   •   ${crafted}`;
  const durationSec = Math.max(24, Math.min(70, text.length / 5.5));
  const frozen = paused || hidden;

  return (
    <div
      className="group fixed bottom-0 left-0 right-0 z-40 overflow-hidden border-t border-emerald-500/30 bg-slate-950/97"
      style={{ backgroundImage: 'linear-gradient(90deg, rgba(16,185,129,0.10), rgba(2,6,23,0.96) 24%, rgba(2,6,23,0.96) 76%, rgba(6,182,212,0.10))' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      tabIndex={0}
      aria-label="Haber şeridi"
    >
      <div className="flex items-center gap-3 px-0 py-1.5">
        <div className="flex items-center gap-1.5 flex-shrink-0 rounded-r-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg shadow-emerald-500/30">
          <span>📰</span>
          <span className="tracking-wider">HABER</span>
          <span className="flex items-center gap-1 rounded-full bg-slate-950/25 px-1.5 py-0.5 text-[9px] tracking-wider">
            <span className={`h-1.5 w-1.5 rounded-full bg-red-600 ${frozen ? '' : 'animate-pulse'}`} />
            CANLI
          </span>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {/* kenar yumuşatma: içeriğin şeride giriş/çıkışı keskin olmasın */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-slate-950 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-slate-950 to-transparent" />
          <div
            className="animate-marquee whitespace-nowrap text-[13px] font-medium tracking-wide text-slate-200 will-change-transform"
            style={{ animationDuration: `${durationSec}s`, animationPlayState: frozen ? 'paused' : 'running' }}
          >
            {text}   •   {text}
          </div>
        </div>

        <div className="mr-3 hidden flex-shrink-0 items-center gap-1.5 border-l border-slate-700/50 pl-3 lg:flex">
          {frozen ? (
            <span className="text-[10px] font-bold text-amber-300/90">⏸ duraklatıldı</span>
          ) : (
            <span className="text-[10px] text-slate-500">imleçle durdur</span>
          )}
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
          <span className="kaan-watermark text-[10px] tracking-[0.16em]">MADE BY KAAN</span>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Yalnızca haber içeriği gerçekten değiştiyse yeniden çiz (dizi kimliği her
  // state güncellemesinde değişiyor — içerik aynıysa boşuna çizmeyelim).
  if (prev.news === next.news) return true;
  if (prev.news.length !== next.news.length) return false;
  return prev.news.every((n, i) => n === next.news[i]);
});

NewsTicker.displayName = 'NewsTicker';
