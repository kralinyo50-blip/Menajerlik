import React from 'react';

interface NewsTickerProps {
  news: string[];
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ news }) => {
  const [paused, setPaused] = React.useState(false);
  const items = news.length > 0 ? news : ['Sezon heyecanla devam ediyor...'];
  const crafted = 'Made by Kaan  •  ☀️ Bütün Yaz Boyunca Geliştirildi  •  Manager Pro 2026 Ultimate';
  const tickerText = [...items, crafted].join('   •   ');

  return (
    <div
      className="group fixed bottom-0 left-0 right-0 bg-slate-950/90 border-t border-emerald-500/30 py-2 overflow-hidden z-40 backdrop-blur-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.06] via-transparent to-cyan-500/[0.06] pointer-events-none" />
      <div className="flex items-center relative">
        <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black px-3 py-1 text-[11px] rounded-r-xl mr-3 ml-0 flex-shrink-0 shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 animate-badge-pop">
          <span>📰</span>
          <span>HABER</span>
          <span className="bg-black/20 text-[9px] px-1 rounded-full">CANLI</span>
        </div>
        <div className={`flex-1 overflow-hidden`}>
          <div className={`whitespace-nowrap text-slate-200 text-sm font-medium tracking-wide will-change-transform ${paused ? '[animation-play-state:paused]' : ''} animate-marquee`} style={{ animationPlayState: paused ? 'paused' as const : 'running' as const }}>
            {tickerText}   •   {tickerText}   •   {tickerText}
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 ml-auto mr-3 pl-3 border-l border-slate-700/50 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="kaan-watermark text-[10px] tracking-[0.16em]">MADE BY KAAN</span>
        </div>
      </div>
      {paused && <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-full bg-slate-800 text-[10px] text-slate-300 px-2 py-1 rounded-t-lg border border-slate-700/50 hidden lg:block">⏸ Duraklatıldı • üzerine gelince</div>}
    </div>
  );
};