import React, { useMemo, useState } from 'react';
import { GameState, RoofStyle, StandStyle, PitchPattern, StadiumDesign } from '../../types/game';
import { Stadium3D } from '../Stadium3D';
import {
  CAPACITY_PACKAGES, COSMETICS, FREE_ACCENT_COLORS, FREE_SEAT_COLORS, MAX_CAPACITY, PREMIUM_COLORS,
  ROOF_LABEL, ROOF_PROTECTION, STAND_LABEL, PITCH_LABEL, TICKET_STRATEGIES, isUnlocked, TRIBUNES, STADIUM_EVENTS
} from '../../data/stadium';
import { formatMoney } from '../../utils/pricing';
import { previewHomeMatch, stadiumCapacity } from '../../utils/stadium';

interface StadiumTabProps {
  gameState: GameState;
  onSetDesign: (patch: Partial<GameState['stadium']['design']>) => void;
  onBuyCosmetic: (id: string) => void;
  onBuyCapacity: (id: string) => void;
  onSetTicketMultiplier: (multiplier: number) => void;
  onUpgradeStadiumLevel: (cost: number) => void;
  onUpgradeTribune?: (side: 'north'|'south'|'east'|'west') => void;
  onHostEvent?: (eventId: 'concert'|'fair') => void;
}

type SubTab = 'design' | 'capacity' | 'tribunes' | 'tickets' | 'shop';

const SubTabButton: React.FC<{ id: SubTab; icon: string; label: string }> = ({ id, icon, label }) => (
  <span className="flex items-center gap-1.5" data-tab={id}>{icon} {label}</span>
);

export const StadiumTab: React.FC<StadiumTabProps> = ({
  gameState, onSetDesign, onBuyCosmetic, onBuyCapacity, onSetTicketMultiplier, onUpgradeStadiumLevel, onUpgradeTribune, onHostEvent
}) => {
  const [sub, setSub] = useState<SubTab>('design');
  const [night, setNight] = useState(true);
  const [cinematic, setCinematic] = useState(false);

  // ── ÖN İZLEME ── hover / göz butonu ile stadyumun nasıl duracağını gör, satın almadan önce
  const [previewDesign, setPreviewDesign] = useState<StadiumDesign | null>(null);
  const [previewBonus, setPreviewBonus] = useState<number | null>(null);
  const [previewVip, setPreviewVip] = useState<boolean | null>(null);
  const isPreview = previewDesign !== null || previewBonus !== null || previewVip !== null;

  const stadium = gameState.stadium;
  const design = stadium.design;
  const displayDesign = previewDesign ?? design;
  const displayBonus = previewBonus ?? stadium.capacityBonus;
  const displayVip = previewVip ?? stadium.vip;
  const displayStadium = { ...stadium, design: displayDesign, capacityBonus: displayBonus, vip: displayVip } as GameState['stadium'];

  const capacity = stadiumCapacity(gameState);
  const displayCapacity = stadiumCapacity({ ...gameState, stadium: displayStadium } as GameState);
  const baseCapacity = gameState.stadiumLvl * 5000 + 2000;
  const fillRate = Math.min(100, Math.round(((gameState.clubStats.totalAttendance || 0) / Math.max(1, (gameState.clubStats.totalWins || 1) * capacity)) * 100));
  const preview = useMemo(() => previewHomeMatch({ ...gameState, stadium: displayStadium } as GameState, 3, 'sunny'), [gameState, displayStadium]);
  const upgradeLevelCost = 1200000 * gameState.stadiumLvl;
  const bestTotal = Math.max(...TICKET_STRATEGIES.map(st =>
    previewHomeMatch({ ...gameState, stadium: { ...stadium, ticketMultiplier: st.multiplier } }, 3, 'sunny').total
  ));

  const clearPreview = () => { setPreviewDesign(null); setPreviewBonus(null); setPreviewVip(null); };
  const patchPreview = (patch: Partial<StadiumDesign>) => {
    setPreviewDesign(prev => ({ ...(prev ?? design), ...patch }));
  };
  const bonusPreview = (addedSeats: number) => {
    const remaining = MAX_CAPACITY - capacity;
    const added = Math.min(addedSeats, remaining);
    setPreviewBonus(stadium.capacityBonus + added);
  };

  const isRainy = ['rain', 'storm', 'snow'].includes(gameState.weather);
  const roofProtects = displayDesign.roof === 'full' || displayDesign.roof === 'glass';

  const lockBadge = (unlocked: boolean, price: number) =>
    unlocked ? null : (
      <span className="text-[9px] bg-amber-500/25 text-amber-200 px-1.5 py-0.5 rounded">
        🔒 {formatMoney(price)}
      </span>
    );

  const OptionCard: React.FC<{
    active: boolean;
    unlocked: boolean;
    price: number;
    icon: string;
    label: string;
    desc?: string;
    onClick: () => void;
    onPreview?: () => void;
    onPreviewEnd?: () => void;
  }> = ({ active, unlocked, price, icon, label, desc, onClick, onPreview, onPreviewEnd }) => (
    <div
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      className={`relative text-left rounded-xl p-3 border-2 transition-all group ${
        active ? 'bg-emerald-500/15 border-emerald-500'
        : unlocked ? 'bg-slate-700/40 border-slate-700/60 hover:border-emerald-500/60'
        : gameState.budget >= price ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-400'
        : 'bg-slate-800/60 border-slate-700/40 opacity-60'
      }`}
    >
      <button
        onClick={onClick}
        disabled={!unlocked && gameState.budget < price}
        className="w-full text-left disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-white font-bold text-sm">{icon} {label}</span>
          {lockBadge(unlocked, price)}
        </div>
        {desc && <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>}
        {!unlocked && (
          <div className="text-[10px] text-amber-300 mt-1">
            {gameState.budget >= price ? 'Satın almak için tıkla' : `Yetersiz bütçe — ${formatMoney(price - gameState.budget)} eksik`}
          </div>
        )}
      </button>
      {onPreview && (
        <button
          onClick={onPreview}
          title="Ön izle — nasıl duracağını gör"
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
        >👁️</button>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Başlık */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">🏟️ Stadyum Stüdyosu</h2>
            <p className="text-slate-400 text-sm">
              {gameState.teamName} Arena • Seviye {gameState.stadiumLvl} • {ROOF_LABEL[displayDesign.roof]} • {STAND_LABEL[displayDesign.stands]}
              {isPreview && <span className="ml-2 text-amber-300 text-xs font-bold">👁️ ÖN İZLEME</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-700/50 px-3 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400">Kapasite {isPreview && displayCapacity !== capacity ? '(ön izleme)' : ''}</div>
              <div className={`font-black text-sm ${isPreview && displayCapacity !== capacity ? 'text-amber-300' : 'text-white'}`}>{displayCapacity.toLocaleString()}</div>
            </div>
            <div className="bg-amber-500/15 px-3 py-2 rounded-xl text-center border border-amber-500/30">
              <div className="text-[10px] text-amber-200">Maç başı toplam gelir (tahmin)</div>
              <div className="text-amber-400 font-black text-sm">{formatMoney(preview.total)}</div>
            </div>
            <div className="bg-emerald-500/15 px-3 py-2 rounded-xl text-center border border-emerald-500/30">
              <div className="text-[10px] text-emerald-200">Bütçe</div>
              <div className="text-emerald-400 font-black text-sm">{formatMoney(gameState.budget)}</div>
            </div>
          </div>
        </div>

        {/* 3D sahne */}
        <div className="relative">
          <Stadium3D
            design={displayDesign}
            capacity={displayCapacity}
            logo={gameState.teamLogo}
            sponsorText={gameState.activeSponsor ? `${gameState.activeSponsor.name.toUpperCase()} • RESMİ SPONSOR • ` : `${gameState.teamName.toUpperCase()} • RESMİ SPONSOR • `}
            night={night}
            cinematic={cinematic}
            height={400}
            crowdIntensity={fillRate}
            wet={isRainy && !roofProtects}
          />
          {/* Yağmur / sis — çatıya göre hafif overlay, performans dostu */}
          {isRainy && !roofProtects && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-[1.5px] bg-sky-200/60"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    top: '-12px',
                    height: `${14 + (i % 5) * 3}px`,
                    opacity: 0.55 + (i % 3) * 0.15,
                    transform: 'rotate(14deg)',
                    animation: `rainFall ${0.55 + (i % 4) * 0.12}s linear ${(i % 7) * 0.08}s infinite`,
                  }}
                />
              ))}
              <div className="absolute bottom-2 right-2 bg-sky-900/80 backdrop-blur text-sky-100 text-[10px] px-2 py-1 rounded-full border border-sky-700/40">
                {gameState.weather === 'snow' ? '❄️ Kar yağıyor — zemin beyaz, çatı korumuyor' : gameState.weather === 'storm' ? `⛈️ Fırtına — çatı ${displayDesign.roof} koruması zayıf` : '🌧️ Yağmur — çatı koruması yok, zemin ıslak'}
              </div>
            </div>
          )}
          {isRainy && roofProtects && (
            <div className="absolute bottom-2 right-2 bg-emerald-900/80 backdrop-blur text-emerald-100 text-[10px] px-2 py-1 rounded-full border border-emerald-700/40 pointer-events-none">
              {displayDesign.roof === 'glass' ? '💎 Cam çatı — yağmur tamamen engellendi' : '🏟️ Tam çatı — yağmur tribüne ulaşmıyor'}
            </div>
          )}
          {/* Doluluk uğultusu göstergesi — hafif */}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-200 flex items-center gap-1.5 pointer-events-none">
            <span className={fillRate > 75 ? 'text-emerald-400' : fillRate > 45 ? 'text-amber-400' : 'text-slate-400'}>●</span>
            🔊 {fillRate > 75 ? 'Tribün dolu — uğultu yüksek' : fillRate > 45 ? 'Orta doluluk — dalgalanma var' : 'Tribün seyrek — sessiz'} • %{fillRate}
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => setNight(v => !v)}
              className="bg-black/60 hover:bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-white/10"
            >
              {night ? '🌙 Gece' : '☀️ Gündüz'}
            </button>
            <button
              onClick={() => setCinematic(v => !v)}
              className={`backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                cinematic ? 'bg-violet-500/80 text-white border-violet-300' : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
              }`}
            >
              🎬 Sinematik
            </button>
          </div>
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-[11px] text-slate-200">
            Koltuk: <b style={{ color: displayDesign.seatColor }}>{displayDesign.seatColor}</b> • Aksan: <b style={{ color: displayDesign.accentColor }}>{displayDesign.accentColor}</b>
            {displayVip && ' • 🥂 VIP'}
            {isPreview && <span className="ml-2 text-amber-300">👁️ ön izleme</span>}
          </div>
          {/* ÖN İZLEME banner */}
          {isPreview && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-2 rounded-full text-xs font-black shadow-lg flex items-center gap-3">
              <span>👁️ ÖN İZLEME — satın almadan önce görünüm</span>
              <button onClick={clearPreview} className="bg-black text-white px-3 py-1 rounded-full text-xs">✕ Kapat</button>
            </div>
          )}
        </div>
        {/* SKORBOARD — LED minimal, performans dostu */}
        <div className="bg-[#0a0f1f] border border-slate-700/60 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 overflow-hidden relative">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-base shrink-0">{gameState.teamLogo || '⚽'}</div>
            <div className="min-w-0">
              <div className="text-white font-black text-sm tracking-wide flex items-center gap-2 flex-wrap">
                <span className="truncate">{gameState.teamName}</span>
                <span className="text-slate-500 text-[11px]">vs</span>
                <span className="text-slate-200">RAKİP</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20">CANLI SKORBOARD</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Süper Lig • Sezon {gameState.season} • {displayCapacity.toLocaleString()} kapasite • {ROOF_LABEL[displayDesign.roof]}
                {isPreview && <span className="text-amber-300"> • ön izleme</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-black rounded-lg px-3 py-1.5 border border-amber-500/30 flex items-center gap-2" style={{ boxShadow: '0 0 12px rgba(245,158,11,0.22), inset 0 0 8px rgba(245,158,11,0.12)' }}>
              <span className="text-amber-400 font-mono font-black text-lg tracking-widest" style={{ textShadow: '0 0 6px rgba(245,158,11,0.75)' }}>0 — 0</span>
              <span className="text-sky-300 font-mono text-xs">45'</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px #ef4444', animation: 'boardPulse 1s ease-in-out infinite' }} />
            </div>
            <div className="hidden sm:block text-right min-w-0">
              <div className="text-[9px] text-amber-200/60 tracking-[0.14em]">RESMİ SPONSOR</div>
              <div className="text-[11px] font-bold text-white truncate max-w-[120px]">{gameState.activeSponsor?.name || gameState.teamName}</div>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, white 2px, white 3px)' }} />
        </div>
        <div className="text-[11px] text-slate-400 px-1">
          💡 <b>İpucu:</b> Bir seçeneğin üzerine <b>gelince</b> veya <b>👁️</b> ikonuna basınca stadyumun nasıl duracağını anında 3D'de görürsün. Satın almadan önce gece/gündüz ve sinematik ile kontrol et.
        </div>

        {/* Alt sekmeler */}
        <div className="flex gap-2 flex-wrap">
          {([
            ['design', '🎨', 'Renkler & Mimari'],
            ['capacity', '🏗️', 'Kapasite & Büyüme'],
            ['tribunes', '🏟️', 'Tribünler & Etkinlik'],
            ['tickets', '🎟️', 'Bilet Fiyatı'],
            ['shop', '🛍️', 'Kozmetik Mağazası'],
          ] as [SubTab, string, string][]).map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => { setSub(id); clearPreview(); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                sub === id ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              <SubTabButton id={id} icon={icon} label={label} />
            </button>
          ))}
        </div>

        {/* ── RENKLER & MİMARİ ── */}
        {sub === 'design' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 mb-3">🎨 Tribün Koltuk Rengi <span className="text-[10px] font-normal text-slate-400">— üzerine gel → ön izleme</span></h3>
              <div className="flex flex-wrap gap-2">
                {FREE_SEAT_COLORS.map(hex => (
                  <button
                    key={hex}
                    onClick={() => { onSetDesign({ seatColor: hex }); clearPreview(); }}
                    onMouseEnter={() => patchPreview({ seatColor: hex })}
                    onMouseLeave={() => setPreviewDesign(d => d?.seatColor === hex ? null : d)}
                    onFocus={() => patchPreview({ seatColor: hex })}
                    style={{ background: hex }}
                    className={`w-11 h-11 rounded-xl border-4 transition-all ${displayDesign.seatColor === hex ? 'border-white scale-110' : 'border-slate-600/60 hover:scale-105'}`}
                    title={`${hex} — ön izle`}
                  />
                ))}
                {PREMIUM_COLORS.map(c => {
                  const unlocked = isUnlocked(stadium, c.id);
                  const isPreviewed = displayDesign.seatColor === c.hex && isPreview;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (unlocked) { onSetDesign({ seatColor: c.hex }); clearPreview(); }
                        else { patchPreview({ seatColor: c.hex }); }
                      }}
                      onMouseEnter={() => patchPreview({ seatColor: c.hex })}
                      onMouseLeave={() => { if (previewDesign?.seatColor === c.hex) setPreviewDesign(null); }}
                      style={{ background: c.hex }}
                      className={`relative w-11 h-11 rounded-xl border-4 transition-all ${
                        displayDesign.seatColor === c.hex ? (isPreviewed ? 'border-amber-400 scale-110 ring-2 ring-amber-400/40' : 'border-white scale-110')
                        : unlocked ? 'border-slate-600/60 hover:scale-105' : 'border-amber-500/60 hover:scale-105'
                      }`}
                      title={unlocked ? `${c.label} — ön izle / uygula` : `${c.label} — ${formatMoney(c.price)} — ön izle`}
                    >
                      {!unlocked && <span className="absolute inset-0 flex items-center justify-center text-xs">🔒</span>}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                🔒 işaretli renkler ön izlemede görünür; satın alınca kalıcı olur. Kilitli renge tıkla → ön izle, sonra mağazadan satın al.
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-cyan-400 mb-3">✨ Aksan Rengi (çatı kenarı, bayrak, LED pano) <span className="text-[10px] font-normal text-slate-400">— üzerine gel → ön izleme</span></h3>
              <div className="flex flex-wrap gap-2">
                {FREE_ACCENT_COLORS.map(hex => (
                  <button
                    key={hex}
                    onClick={() => { onSetDesign({ accentColor: hex }); clearPreview(); }}
                    onMouseEnter={() => patchPreview({ accentColor: hex })}
                    onMouseLeave={() => setPreviewDesign(d => d?.accentColor === hex ? null : d)}
                    style={{ background: hex }}
                    className={`w-10 h-10 rounded-xl border-4 transition-all ${displayDesign.accentColor === hex ? 'border-white scale-110' : 'border-slate-600/60 hover:scale-105'}`}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-3">🏠 Çatı Tipi</h3>
                <div className="space-y-2">
                  {(['none', 'canopy', 'full', 'glass'] as RoofStyle[]).map(roof => {
                    const id = `roof:${roof}`;
                    const unlocked = roof === 'none' || isUnlocked(stadium, id);
                    const option = COSMETICS.find(c => c.id === id);
                    return (
                      <OptionCard
                        key={roof}
                        active={displayDesign.roof === roof && !isPreview}
                        unlocked={unlocked}
                        price={option?.price ?? 0}
                        icon={roof === 'none' ? '🚫' : roof === 'canopy' ? '🏠' : roof === 'full' ? '🏟️' : '💎'}
                        label={ROOF_LABEL[roof]}
                        desc={roof === 'none'
                          ? 'Yağmur/kar seyirciyi %20-25 etkiler'
                          : `${option?.desc} — kötü havada kaybın %${Math.round((ROOF_PROTECTION[roof] / 0.25) * 20 * 0.8)}'i telafi edilir`}
                        onClick={() => {
                          if (unlocked) { onSetDesign({ roof }); clearPreview(); }
                          else { patchPreview({ roof }); }
                        }}
                        onPreview={() => patchPreview({ roof })}
                        onPreviewEnd={() => setPreviewDesign(d => d?.roof === roof ? null : d)}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-3">🏗️ Tribün Mimarisi</h3>
                <div className="space-y-2">
                  {(['classic', 'stepped', 'double', 'bowl'] as StandStyle[]).map(stand => {
                    const id = `stands:${stand}`;
                    const unlocked = stand === 'classic' || isUnlocked(stadium, id);
                    const option = COSMETICS.find(c => c.id === id);
                    return (
                      <OptionCard
                        key={stand}
                        active={displayDesign.stands === stand && !isPreview}
                        unlocked={unlocked}
                        price={option?.price ?? 0}
                        icon={stand === 'classic' ? '🪑' : stand === 'stepped' ? '📐' : stand === 'double' ? '🏢' : '🥣'}
                        label={STAND_LABEL[stand]}
                        desc={option?.desc ?? 'Standart tek kat tribün'}
                        onClick={() => {
                          if (unlocked) { onSetDesign({ stands: stand }); clearPreview(); }
                          else { patchPreview({ stands: stand }); }
                        }}
                        onPreview={() => patchPreview({ stands: stand })}
                        onPreviewEnd={() => setPreviewDesign(d => d?.stands === stand ? null : d)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3">🌱 Çim Deseni ve Detaylar</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                {(['stripes', 'rings', 'plain'] as PitchPattern[]).map(pattern => {
                  const id = `pitch:${pattern}`;
                  const unlocked = isUnlocked(stadium, id);
                  const option = COSMETICS.find(c => c.id === id);
                  return (
                    <OptionCard
                      key={pattern}
                      active={displayDesign.pitchPattern === pattern && !isPreview}
                      unlocked={unlocked}
                      price={option?.price ?? 0}
                      icon={pattern === 'stripes' ? '🟩' : pattern === 'rings' ? '🎯' : '🟢'}
                      label={`${PITCH_LABEL[pattern]} Çim`}
                      desc={option?.desc}
                      onClick={() => {
                        if (unlocked) { onSetDesign({ pitchPattern: pattern }); clearPreview(); }
                        else { patchPreview({ pitchPattern: pattern }); }
                      }}
                      onPreview={() => patchPreview({ pitchPattern: pattern })}
                      onPreviewEnd={() => setPreviewDesign(d => d?.pitchPattern === pattern ? null : d)}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                {(['flags', 'logoPitch'] as const).map(key => {
                  const option = COSMETICS.find(c => c.id === key)!;
                  const unlocked = isUnlocked(stadium, key);
                  const active = key === 'flags' ? displayDesign.flags : displayDesign.logoOnPitch;
                  const nextVal = !active;
                  const isPrev = isPreview && active !== design[key as keyof StadiumDesign];
                  return (
                    <div
                      key={key}
                      onMouseEnter={() => patchPreview(key === 'flags' ? { flags: nextVal } : { logoOnPitch: nextVal })}
                      onMouseLeave={() => setPreviewDesign(d => {
                        if (!d) return d;
                        // revert only if we were previewing this toggle
                        if (key === 'flags' && d.flags === nextVal) return { ...d, flags: design.flags };
                        if (key === 'logoPitch' && d.logoOnPitch === nextVal) return { ...d, logoOnPitch: design.logoOnPitch };
                        return d;
                      })}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                        active ? (isPrev ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-emerald-500/20 border-emerald-500 text-emerald-300')
                        : unlocked ? 'bg-slate-700/40 border-slate-600 text-slate-200'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (!unlocked) { patchPreview(key === 'flags' ? { flags: true } : { logoOnPitch: true }); return; }
                          onSetDesign(key === 'flags' ? { flags: !active } : { logoOnPitch: !active });
                          clearPreview();
                        }}
                        className="font-bold"
                      >
                        {option.icon} {option.label} {active ? (isPrev ? '👁️' : '✓') : unlocked ? '— ön izle' : `🔒 ${formatMoney(option.price)}`}
                      </button>
                      <span className="text-[10px] opacity-60">üzerine gel → ön izle</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── KAPASİTE ── */}
        {sub === 'capacity' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-emerald-400">🏟️ Mevcut Kapasite {isPreview && displayCapacity !== capacity && <span className="text-amber-300">→ {displayCapacity.toLocaleString()} (ön izleme)</span>}</h3>
                <span className="text-white font-black">{capacity.toLocaleString()} / {MAX_CAPACITY.toLocaleString()}</span>
              </div>
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${(baseCapacity / MAX_CAPACITY) * 100}%` }} title="Temel kapasite" />
                <div className="h-full bg-amber-400" style={{ width: `${((capacity - baseCapacity) / MAX_CAPACITY) * 100}%` }} title="Satın alınan ek koltuklar" />
                {isPreview && previewBonus !== null && previewBonus > stadium.capacityBonus && (
                  <div className="h-full bg-amber-300/60 border-l-2 border-amber-200" style={{ width: `${((previewBonus - stadium.capacityBonus) / MAX_CAPACITY) * 100}%` }} title="Ön izleme" />
                )}
              </div>
              <div className="flex gap-4 text-[11px] mt-2 text-slate-400 flex-wrap">
                <span>🟩 Temel (seviye {gameState.stadiumLvl}): {baseCapacity.toLocaleString()}</span>
                <span>🟨 Ek koltuk: {(capacity - baseCapacity).toLocaleString()}</span>
                {isPreview && previewBonus !== null && <span className="text-amber-300">👁️ Ön izleme ek: +{(previewBonus - stadium.capacityBonus).toLocaleString()}</span>}
                <span>Doluluk geçmişi: %{fillRate}</span>
              </div>
            </div>

            <div
              onMouseEnter={() => setPreviewBonus(stadium.capacityBonus + 5000 > MAX_CAPACITY - baseCapacity ? stadium.capacityBonus : stadium.capacityBonus)}
              className="bg-gradient-to-r from-blue-900/40 to-slate-800/50 rounded-2xl border border-blue-500/30 p-4 flex items-center justify-between flex-wrap gap-3"
            >
              <div>
                <h3 className="text-sm font-bold text-blue-300">⬆️ Stadyum Seviyesi Yükselt — üzerine gel → tribün büyümesini ön izle</h3>
                <p className="text-[11px] text-slate-300">
                  Seviye {gameState.stadiumLvl} → {gameState.stadiumLvl + 1} • +5.000 koltuk kapasiteli yeni tribün katı
                </p>
              </div>
              <button
                disabled={gameState.budget < upgradeLevelCost || capacity >= MAX_CAPACITY}
                onClick={() => { onUpgradeStadiumLevel(upgradeLevelCost); clearPreview(); }}
                onMouseEnter={() => {
                  if (capacity < MAX_CAPACITY) setPreviewBonus(Math.min(MAX_CAPACITY - baseCapacity, stadium.capacityBonus + 5000));
                }}
                onMouseLeave={() => setPreviewBonus(null)}
                className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                  gameState.budget >= upgradeLevelCost && capacity < MAX_CAPACITY
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                🏗️ Yükselt — {formatMoney(upgradeLevelCost)}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CAPACITY_PACKAGES.map(pack => {
                const remaining = MAX_CAPACITY - capacity;
                const canBuy = gameState.budget >= pack.price && remaining > 0;
                const added = Math.min(pack.seats, remaining);
                return (
                  <div
                    key={pack.id}
                    onMouseEnter={() => bonusPreview(pack.seats)}
                    onMouseLeave={() => setPreviewBonus(null)}
                    className={`rounded-2xl border p-4 transition-all ${previewBonus !== null && displayCapacity === capacity + added ? 'border-amber-400 bg-amber-500/10' : 'bg-slate-800/50 border-slate-700/50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold">🏗️ {pack.label} <span className="text-[10px] text-slate-400">— üzerine gel → ön izle</span></span>
                      <span className="text-amber-400 font-black">{formatMoney(pack.price)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      {added.toLocaleString()} koltuk eklenir → yeni kapasite {(capacity + added).toLocaleString()}
                      {isPreview && previewBonus !== null && <span className="text-amber-300"> • ön izlemede {(displayCapacity).toLocaleString()}</span>}
                    </div>
                    <button
                      disabled={!canBuy}
                      onClick={() => { onBuyCapacity(pack.id); clearPreview(); }}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                        canBuy ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {remaining <= 0 ? 'Maksimum kapasiteye ulaşıldı' : canBuy ? 'Koltukları ekle' : 'Bütçe yetersiz'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-2">📊 Dolu Stadyum Ne Kazandırır?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                {[
                  { l: 'Kapasite', v: displayCapacity.toLocaleString(), c: isPreview ? 'text-amber-300' : 'text-white' },
                  { l: 'Beklenen seyirci', v: preview.attendance.toLocaleString(), c: 'text-cyan-300' },
                  { l: 'Bilet fiyatı', v: `$${preview.price}`, c: 'text-amber-300' },
                  { l: 'Bilet + büfe geliri', v: formatMoney(preview.total), c: 'text-emerald-300' },
                ].map(item => (
                  <div key={item.l} className="bg-slate-700/50 backdrop-blur rounded-xl p-3.5 border border-slate-600/30 shadow-md hover:shadow-lg transition-all">
                    <div className="text-[10px] text-slate-400">{item.l}</div>
                    <div className={`font-black text-lg ${item.c}`}>{item.v}</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                VIP loca (+%12 bilet, +$4/seyirci harcama), cam çatı (+%4) ve kase tribün (+%3) geliri artırır; çatı kötü havada seyirci kaybını azaltır.
                {isPreview && <span className="text-amber-300"> • Ön izleme gelir tahmini üstte.</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── TRİBÜNLER & ETKİNLİK — İmparatorluk */}
        {sub === 'tribunes' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 mb-1">🏟️ Tribünler — Seviye 1-5 (ortalama görsel, hafif etki)</h3>
              <p className="text-[11px] text-slate-400 mb-3">Her seviye tribün +koltuk ve +doluluk getirir. Kuzey/Güney kale arkası, Doğu/Batı maraton — her biri ayrı büyür.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TRIBUNES.map(tri=>{
                  const lvl = (gameState.stadium as any)?.tribunes?.[tri.id] ?? 1;
                  const isMax = lvl >= 5;
                  const basePrice: Record<string, number> = { north: 650000, south: 650000, east: 850000, west: 900000 };
                  const cost = Math.round((basePrice[tri.id]||650000) * (0.9 + lvl*0.35));
                  const seats = tri.baseSeats;
                  return (
                    <div key={tri.id} className="bg-slate-700/40 rounded-xl p-3 border border-slate-600/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tri.icon}</span>
                          <div>
                            <div className="text-white font-bold text-sm">{tri.name}</div>
                            <div className="text-[11px] text-slate-400">{tri.desc}</div>
                          </div>
                        </div>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded-full text-white font-black">Seviye {lvl}/5</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30 mb-2">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" style={{width: `${(lvl/5)*100}%`}} />
                      </div>
                      <div className="text-[11px] text-slate-300 mb-2">+{seats.toLocaleString()} koltuk / seviye • Toplam: {(stadiumCapacity(gameState)- (gameState.stadiumLvl*5000+2000) - (gameState.stadium?.capacityBonus||0)).toLocaleString()} tribün koltuğu</div>
                      <button disabled={isMax || gameState.budget < cost} onClick={()=> onUpgradeTribune?.(tri.id as any)} className={`w-full py-2 rounded-lg text-xs font-bold ${isMax?'bg-slate-700 text-slate-400 cursor-not-allowed': gameState.budget>=cost?'bg-emerald-600 hover:bg-emerald-500 text-white':'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                        {isMax ? 'Maks seviye (5/5)' : `Yükselt Seviye ${lvl+1} — ${cost.toLocaleString()} $`}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-3">Kapasite formülü: temel (lvl*5000+2000) + ek paketler + tribünler. Tribünler mild etki: her seviye +~%3 seyirci çekimi.</div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 mb-3">🎤 Stadyum Etkinlikleri — Hafta içi gelir (mild)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STADIUM_EVENTS.map(ev=>(
                  <button key={ev.id} onClick={()=> onHostEvent?.(ev.id as any)} disabled={gameState.budget < 0} className="bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/30 rounded-xl p-3 text-left transition-colors">
                    <div className="text-white font-bold text-sm">{ev.icon} {ev.label} — +${(ev.income as number).toLocaleString()}</div>
                    <div className="text-[11px] text-slate-400">{ev.desc}</div>
                    <div className="text-[10px] text-emerald-300 mt-1">Hemen + gelir, konser biraz moral -3 (çim yorgun)</div>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">Mild mod: sadece küçük bonus, çılgın protesto yok. Etkinlik her hafta yapılabilir.</div>
            </div>
          </div>
        )}

        {/* ── BİLET FİYATI ── */}
        {sub === 'tickets' && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 mb-1">🎟️ Bilet Fiyat Stratejisi</h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Fiyatı artırmak birim geliri yükseltir ama tribünü boşaltır. Bilet geliri kadar <b>tribünde harcama (büfe, ürün)</b> da
                seyirci sayısına bağlıdır — bu yüzden en kârlı fiyat genelde ortadadır.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TICKET_STRATEGIES.map(strategy => {
                  const sim = previewHomeMatch({ ...gameState, stadium: { ...stadium, ticketMultiplier: strategy.multiplier } }, 3, 'sunny');
                  const active = stadium.ticketMultiplier === strategy.multiplier;
                  return (
                    <button
                      key={strategy.multiplier}
                      onClick={() => onSetTicketMultiplier(strategy.multiplier)}
                      className={`text-left rounded-xl p-3 border-2 transition-all ${
                        active ? 'bg-amber-500/15 border-amber-500' : 'bg-slate-700/40 border-slate-700/60 hover:border-amber-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{strategy.icon} {strategy.label}</span>
                        <span className="text-amber-400 font-black">${sim.price}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mb-2">{strategy.desc}</div>
                      {sim.total === bestTotal && (
                        <div className="text-[10px] text-emerald-300 font-bold mb-1">⭐ Bu fiyatla en yüksek gelir!</div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                        <div className="bg-slate-800/60 rounded-lg p-1.5">
                          <div className="text-slate-400">Seyirci</div>
                          <div className="text-cyan-300 font-bold">{sim.attendance.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-1.5">
                          <div className="text-slate-400">Bilet</div>
                          <div className="text-emerald-300 font-bold">{formatMoney(sim.gate)}</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-1.5">
                          <div className="text-slate-400">Büfe & ürün</div>
                          <div className="text-amber-300 font-bold">{formatMoney(sim.catering)}</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-1.5 col-span-2 border border-emerald-500/30">
                          <div className="text-slate-400">Toplam maç geliri</div>
                          <div className="text-white font-black">{formatMoney(sim.total)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-[12px] text-amber-100">
              💡 <b>İpucu:</b> Taraftar mutluluğun yüksekse pahalı bilet daha az kayıp verir. Kötü havada çatın yoksa ucuz bilet uygulamak tribünü doldurur.
            </div>
          </div>
        )}

        <style>{`@keyframes rainFall { 0%{transform:translateY(-14px) rotate(14deg)} 100%{transform:translateY(420px) rotate(14deg)} } @keyframes boardPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.55;transform:scale(0.85)}}`}</style>

        {/* ── KOZMETİK MAĞAZASI ── */}
        {sub === 'shop' && (
          <div className="space-y-3">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-emerald-400 mb-1">🛍️ Stadyum Kozmetikleri <span className="text-[10px] font-normal text-slate-400">— üzerine gel → ön izle</span></h3>
              <div className="text-[11px] text-slate-400 mb-3">
                Kozmetikler stadyumun görünümünü değiştirir; bazıları taraftar morali ve bilet geliri de kazandırır. Üzerine gelince 3D'de ön izlenir.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COSMETICS.filter(c => c.price > 0).map(option => {
                  const owned = isUnlocked(stadium, option.id);
                  const affordable = gameState.budget >= option.price;
                  // ön izleme preview'u: ilgili tasarımı geçici göster
                  const getPreviewPatch = (): Partial<StadiumDesign> | null => {
                    if (option.field === 'roof') return { roof: option.value as RoofStyle };
                    if (option.field === 'stands') return { stands: option.value as StandStyle };
                    if (option.field === 'pitchPattern') return { pitchPattern: option.value as PitchPattern };
                    if (option.field === 'flags') return { flags: true };
                    if (option.field === 'logoOnPitch') return { logoOnPitch: true };
                    if (option.field === 'floodlights') return { floodlights: true };
                    return null;
                  };
                  const patch = getPreviewPatch();
                  return (
                    <div
                      key={option.id}
                      onMouseEnter={() => {
                        if (!owned && patch) patchPreview(patch);
                        if (option.id === 'vip' && !stadium.vip) setPreviewVip(true);
                      }}
                      onMouseLeave={() => {
                        if (patch && previewDesign) {
                          // sadece bu kozmetiğin etkisini geri al
                          if (option.field === 'roof' && previewDesign.roof === patch!.roof) setPreviewDesign(d => d ? { ...d, roof: design.roof } : null);
                          else if (option.field === 'stands' && previewDesign.stands === patch!.stands) setPreviewDesign(d => d ? { ...d, stands: design.stands } : null);
                          else if (option.field === 'pitchPattern' && previewDesign.pitchPattern === patch!.pitchPattern) setPreviewDesign(d => d ? { ...d, pitchPattern: design.pitchPattern } : null);
                          else if (option.field === 'flags' && previewDesign.flags) setPreviewDesign(d => d ? { ...d, flags: design.flags } : null);
                          else if (option.field === 'logoOnPitch' && previewDesign.logoOnPitch) setPreviewDesign(d => d ? { ...d, logoOnPitch: design.logoOnPitch } : null);
                        }
                        if (option.id === 'vip' && previewVip) setPreviewVip(null);
                      }}
                      className={`rounded-xl p-3 border ${owned ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-700/40 border-slate-700/60 hover:border-amber-500/40'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-bold text-sm">{option.icon} {option.label} {!owned && <span className="text-[10px] text-slate-400">— üzerine gel ön izle</span>}</span>
                        <span className={`font-black text-sm ${owned ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {owned ? 'SAHİPSİN ✓' : formatMoney(option.price)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 my-1">{option.desc}</div>
                      {!owned && (
                        <button
                          disabled={!affordable}
                          onClick={() => { onBuyCosmetic(option.id); clearPreview(); }}
                          className={`w-full py-2 rounded-lg text-xs font-bold ${
                            affordable ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {affordable ? 'Satın Al — kalıcı uygula' : `Eksik: ${formatMoney(option.price - gameState.budget)}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3">🎨 Özel Koltuk Renkleri <span className="text-[10px] font-normal text-slate-400">— üzerine gel ön izle</span></h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PREMIUM_COLORS.map(c => {
                  const owned = isUnlocked(stadium, c.id);
                  return (
                    <div
                      key={c.id}
                      onMouseEnter={() => patchPreview({ seatColor: c.hex })}
                      onMouseLeave={() => setPreviewDesign(d => d?.seatColor === c.hex ? null : d)}
                      className={`rounded-xl p-3 text-center border ${displayDesign.seatColor === c.hex && isPreview ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-700/40 border-transparent'}`}
                    >
                      <div className="w-10 h-10 rounded-lg mx-auto mb-2 border-2 border-slate-600" style={{ background: c.hex }} />
                      <div className="text-white text-xs font-bold">{c.label}</div>
                      <div className={`text-[10px] mb-2 ${owned ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {owned ? 'Açık ✓' : formatMoney(c.price)}
                      </div>
                      <button
                        disabled={!owned && gameState.budget < c.price}
                        onClick={() => {
                          if (owned) { onSetDesign({ seatColor: c.hex }); clearPreview(); }
                          else { onBuyCosmetic(c.id); clearPreview(); }
                        }}
                        className={`w-full py-1.5 rounded-lg text-[11px] font-bold ${
                          owned ? 'bg-slate-600 hover:bg-slate-500 text-white'
                          : gameState.budget >= c.price ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {owned ? 'Uygula' : 'Kilidi Aç'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
