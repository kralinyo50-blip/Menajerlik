import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TAB_UNLOCK_LEVEL, UnlockableTab, careerLevelFromMatches, isTabUnlocked } from '../utils/unlocks';
import { notify } from '../utils/notify';
import { sfx } from '../utils/sound';

export interface TabDef<T extends string = string> {
  id: T;
  label: string;
  icon: string;
  badge?: number;
}

interface TabBarProps<T extends string> {
  tabs: TabDef<T>[];
  activeTab: T;
  matchesPlayed: number;
  onSelect: (tab: T) => void;
  /** Sekme değişince ses çalınsın mı (varsayılan: evet, ses ayarına saygılı) */
  playSound?: boolean;
}

/**
 * 🧭 Üst sekme çubuğu — v5.4
 *
 * Eski hâlinde kaydırma konumu (fade okları) OfflineGame'in state'iydi; sekme
 * şeridini her kaydırdığında **tüm oyun** yeniden çiziliyordu (aktif sekme ve
 * 3D sahneler dahil). Artık kaydırma durumu bu bileşenin içinde: oyun gövdesi
 * kaydırmadan etkilenmiyor.
 *
 * Ek olarak: klavye ile gezinme (← → Home End), kilitli sekme ipucu, aktif
 * sekmede akan alt çizgi ve erişilebilir rol/tuş semantiği.
 */
export function TabBar<T extends string>({ tabs, activeTab, matchesPlayed, onSelect, playSound = true }: TabBarProps<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const [fade, setFade] = useState({ left: false, right: false });
  const careerLvl = careerLevelFromMatches(matchesPlayed);

  const isLocked = (id: T) => !isTabUnlocked(id as unknown as UnlockableTab, matchesPlayed);

  const measure = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = {
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    };
    setFade(prev => (prev.left === next.left && prev.right === next.right ? prev : next));
  };

  // Sekme değişince aktif düğmeyi görünür alana getir
  useLayoutEffect(() => {
    const btn = btnRefs.current.get(activeTab);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    measure();
  }, [activeTab]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // ResizeObserver + scroll: eski kodda 800 ms'lik bir setInterval vardı
    const onScroll = () => measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    const raf = requestAnimationFrame(measure);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleSelect = (tab: TabDef<T>) => {
    if (isLocked(tab.id)) {
      const need = TAB_UNLOCK_LEVEL[tab.id as unknown as UnlockableTab] ?? 1;
      notify(
        `🔒 ${tab.label} — Kariyer Seviye ${need}'te açılır (her 5 maçta 1 seviye). Yaklaşık ${Math.max(0, need - careerLvl) * 5} maç kaldı!`,
        { tone: 'warn', ttl: 4200 }
      );
      return;
    }
    if (tab.id === activeTab) return;
    if (playSound) sfx.click();
    onSelect(tab.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex(t => t.id === activeTab);
    if (idx < 0) return;
    const move = (delta: number) => {
      e.preventDefault();
      const next = tabs[(idx + delta + tabs.length) % tabs.length];
      const btn = btnRefs.current.get(next.id);
      btn?.focus();
      handleSelect(next);
    };
    if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'Home') move(-idx);
    else if (e.key === 'End') move(tabs.length - 1 - idx);
  };

  return (
    <div className="relative mb-3 lg:mb-3 flex-shrink-0">
      <div className="relative">
        <div
          ref={scrollerRef}
          role="tablist"
          aria-label="Oyun bölümleri"
          onKeyDown={handleKeyDown}
          className="flex gap-1.5 overflow-x-auto pb-2 custom-scroll bg-slate-800/60 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/60 shadow-xl shadow-black/20 scroll-smooth snap-x snap-mandatory scroll-px-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(16,185,129,0.9) rgba(15,23,42,0.6)' }}
        >
          {tabs.map(tab => {
            const locked = isLocked(tab.id);
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={el => {
                  if (el) btnRefs.current.set(tab.id, el);
                  else btnRefs.current.delete(tab.id);
                }}
                role="tab"
                aria-selected={active}
                aria-disabled={locked}
                data-active={active}
                data-locked={locked}
                title={locked ? `Kariyer Seviye ${TAB_UNLOCK_LEVEL[tab.id as unknown as UnlockableTab]}'te açılır` : tab.label}
                onClick={() => handleSelect(tab)}
                className="mp-tab tab-btn snap-start flex-shrink-0"
              >
                <span className="text-base leading-none">{locked ? '🔒' : tab.icon}</span>
                <span className="tracking-wide">{tab.label}</span>
                {!!tab.badge && tab.badge > 0 && (
                  <span
                    className={`ml-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md ${
                      active ? 'bg-slate-900/80 text-emerald-300' : 'bg-red-500 text-white animate-badge-pop'
                    }`}
                  >
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className={`pointer-events-none absolute inset-y-1.5 left-1.5 w-10 rounded-l-2xl transition-opacity duration-200 ${fade.left ? 'opacity-100' : 'opacity-0'} tabs-fade-left`} />
        <div className={`pointer-events-none absolute inset-y-1.5 right-1.5 w-10 rounded-r-2xl transition-opacity duration-200 ${fade.right ? 'opacity-100' : 'opacity-0'} tabs-fade-right`} />
        {fade.left && (
          <button
            onClick={() => scrollerRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-base leading-none shadow-lg hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center justify-center"
            aria-label="Sekmeleri sola kaydır"
          >
            ‹
          </button>
        )}
        {fade.right && (
          <button
            onClick={() => scrollerRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-slate-900/95 border border-emerald-500/40 text-emerald-300 text-base leading-none shadow-lg hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center justify-center"
            aria-label="Sekmeleri sağa kaydır"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
