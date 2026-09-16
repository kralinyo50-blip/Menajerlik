import React from 'react';

interface NewsTickerProps {
  news: string[];
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ news }) => {
  const items = news.length > 0 ? news : ['Sezon heyecanla devam ediyor...'];
  const tickerText = items.join('   •   ');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-emerald-500/40 py-2 overflow-hidden z-40 backdrop-blur-md">
      <div className="flex items-center">
        <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black px-3 py-1 text-[11px] rounded-r-lg mr-3 ml-0 flex-shrink-0 shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 animate-badge-pop">
          <span>📰</span>
          <span>HABER</span>
          <span className="bg-black/20 text-[9px] px-1 rounded">CANLI</span>
        </div>
        <div className="animate-marquee whitespace-nowrap text-slate-200 text-sm font-medium">
          {tickerText}   •   {tickerText}
        </div>
      </div>
    </div>
  );
};
