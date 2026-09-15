import React from 'react';

interface NewsTickerProps {
  news: string[];
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ news }) => {
  const tickerText = news.join(' • ');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-emerald-500/30 py-2 overflow-hidden z-40">
      <div className="flex items-center">
        <div className="bg-emerald-500 text-black font-bold px-3 py-1 text-xs rounded mr-4 ml-2 flex-shrink-0">
          📰 HABER
        </div>
        <div className="animate-marquee whitespace-nowrap text-slate-300 text-sm">
          {tickerText} • {tickerText}
        </div>
      </div>
    </div>
  );
};
