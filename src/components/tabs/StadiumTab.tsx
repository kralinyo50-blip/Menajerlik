import React, { useMemo, useState } from 'react';
import { GameState, RoofStyle, StandStyle, PitchPattern } from '../../types/game';
import { Stadium3D } from '../Stadium3D';
import {
  CAPACITY_PACKAGES, COSMETICS, FREE_ACCENT_COLORS, FREE_SEAT_COLORS, MAX_CAPACITY, PREMIUM_COLORS,
  ROOF_LABEL, ROOF_PROTECTION, STAND_LABEL, PITCH_LABEL, TICKET_STRATEGIES, isUnlocked
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
}

type SubTab = 'design' | 'capacity' | 'tickets' | 'shop';

const SubTabButton: React.FC<{ id: SubTab; icon: string; label: string }> = ({ id, icon, label }) => (
  <span className="flex items-center gap-1.5" data-tab={id}>{icon} {label}</span>
);

export const StadiumTab: React.FC<StadiumTabProps> = ({
  gameState, onSetDesign, onBuyCosmetic, onBuyCapacity, onSetTicketMultiplier, onUpgradeStadiumLevel
}) => {
  const [sub, setSub] = useState<SubTab>('design');
  const [night, setNight] = useState(true);
  const [cinematic, setCinematic] = useState(false);

  const stadium = gameState.stadium;
  const design = stadium.design;
  const capacity = stadiumCapacity(gameState);
  const baseCapacity = gameState.stadiumLvl * 5000 + 2000;
  const fillRate = Math.min(100, Math.round(((gameState.clubStats.totalAttendance || 0) / Math.max(1, (gameState.clubStats.totalWins || 1) * capacity)) * 100));
  const preview = useMemo(() => previewHomeMatch(gameState, 3, 'sunny'), [gameState]);
  const upgradeLevelCost = 1200000 * gameState.stadiumLvl;
  const bestTotal = Math.max(...TICKET_STRATEGIES.map(st =>
    previewHomeMatch({ ...gameState, stadium: { ...stadium, ticketMultiplier: st.multiplier } }, 3, 'sunny').total
  ));

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
  }> = ({ active, unlocked, price, icon, label, desc, onClick }) => (
    <button
      onClick={onClick}
      disabled={!unlocked && gameState.budget < price}
      className={`text-left rounded-xl p-3 border-2 transition-all ${
        active ? 'bg-emerald-500/15 border-emerald-500'
        : unlocked ? 'bg-slate-700/40 border-slate-700/60 hover:border-emerald-500/60'
        : gameState.budget >= price ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-400'
        : 'bg-slate-800/60 border-slate-700/40 opacity-60 cursor-not-allowed'
      }`}
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
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Başlık */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black text-white">🏟️ Stadyum Stüdyosu</h2>
            <p className="text-slate-400 text-sm">
              {gameState.teamName} Arena • Seviye {gameState.stadiumLvl} • {ROOF_LABEL[design.roof]} • {STAND_LABEL[design.stands]}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-700/50 px-3 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400">Kapasite</div>
              <div className="text-white font-black text-sm">{capacity.toLocaleString()}</div>
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
            design={design}
            capacity={capacity}
            logo={gameState.teamLogo}
            sponsorText={gameState.activeSponsor ? `${gameState.activeSponsor.name.toUpperCase()} • RESMİ SPONSOR • ` : `${gameState.teamName.toUpperCase()} • RESMİ SPONSOR • `}
            night={night}
            cinematic={cinematic}
            height={400}
          />
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
            Koltuk: <b style={{ color: design.seatColor }}>{design.seatColor}</b> • Aksan: <b style={{ color: design.accentColor }}>{design.accentColor}</b>
            {stadium.vip && ' • 🥂 VIP'}
          </div>
        </div>

        {/* Alt sekmeler */}
        <div className="flex gap-2 flex-wrap">
          {([
            ['design', '🎨', 'Renkler & Mimari'],
            ['capacity', '🏗️', 'Kapasite & Büyüme'],
            ['tickets', '🎟️', 'Bilet Fiyatı'],
            ['shop', '🛍️', 'Kozmetik Mağazası'],
          ] as [SubTab, string, string][]).map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setSub(id)}
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
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-bold text-emerald-400 mb-3">🎨 Tribün Koltuk Rengi</h3>
              <div className="flex flex-wrap gap-2">
                {FREE_SEAT_COLORS.map(hex => (
                  <button
                    key={hex}
                    onClick={() => onSetDesign({ seatColor: hex })}
                    style={{ background: hex }}
                    className={`w-11 h-11 rounded-xl border-4 transition-all ${design.seatColor === hex ? 'border-white scale-110' : 'border-slate-600/60 hover:scale-105'}`}
                    title={hex}
                  />
                ))}
                {PREMIUM_COLORS.map(c => {
                  const unlocked = isUnlocked(stadium, c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => (unlocked ? onSetDesign({ seatColor: c.hex }) : onBuyCosmetic(c.id))}
                      style={{ background: c.hex }}
                      className={`relative w-11 h-11 rounded-xl border-4 transition-all ${
                        design.seatColor === c.hex ? 'border-white scale-110'
                        : unlocked ? 'border-slate-600/60 hover:scale-105' : 'border-amber-500/60 hover:scale-105'
                      }`}
                      title={unlocked ? c.label : `${c.label} — ${formatMoney(c.price)}`}
                    >
                      {!unlocked && <span className="absolute inset-0 flex items-center justify-center text-xs">🔒</span>}
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                🔒 işaretli renkler satın alınır (tıkla → anında açılır).
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-bold text-cyan-400 mb-3">✨ Aksan Rengi (çatı kenarı, bayrak, LED pano)</h3>
              <div className="flex flex-wrap gap-2">
                {FREE_ACCENT_COLORS.map(hex => (
                  <button
                    key={hex}
                    onClick={() => onSetDesign({ accentColor: hex })}
                    style={{ background: hex }}
                    className={`w-10 h-10 rounded-xl border-4 transition-all ${design.accentColor === hex ? 'border-white scale-110' : 'border-slate-600/60 hover:scale-105'}`}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
                <h3 className="text-sm font-bold text-white mb-3">🏠 Çatı Tipi</h3>
                <div className="space-y-2">
                  {(['none', 'canopy', 'full', 'glass'] as RoofStyle[]).map(roof => {
                    const id = `roof:${roof}`;
                    const unlocked = roof === 'none' || isUnlocked(stadium, id);
                    const option = COSMETICS.find(c => c.id === id);
                    return (
                      <OptionCard
                        key={roof}
                        active={design.roof === roof}
                        unlocked={unlocked}
                        price={option?.price ?? 0}
                        icon={roof === 'none' ? '🚫' : roof === 'canopy' ? '🏠' : roof === 'full' ? '🏟️' : '💎'}
                        label={ROOF_LABEL[roof]}
                        desc={roof === 'none'
                          ? 'Yağmur/kar seyirciyi %20-25 etkiler'
                          : `${option?.desc} — kötü havada kaybın %${Math.round((ROOF_PROTECTION[roof] / 0.25) * 20 * 0.8)}'i telafi edilir`}
                        onClick={() => (unlocked ? onSetDesign({ roof }) : onBuyCosmetic(id))}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
                <h3 className="text-sm font-bold text-white mb-3">🏗️ Tribün Mimarisi</h3>
                <div className="space-y-2">
                  {(['classic', 'stepped', 'double', 'bowl'] as StandStyle[]).map(stand => {
                    const id = `stands:${stand}`;
                    const unlocked = stand === 'classic' || isUnlocked(stadium, id);
                    const option = COSMETICS.find(c => c.id === id);
                    return (
                      <OptionCard
                        key={stand}
                        active={design.stands === stand}
                        unlocked={unlocked}
                        price={option?.price ?? 0}
                        icon={stand === 'classic' ? '🪑' : stand === 'stepped' ? '📐' : stand === 'double' ? '🏢' : '🥣'}
                        label={STAND_LABEL[stand]}
                        desc={option?.desc ?? 'Standart tek kat tribün'}
                        onClick={() => (unlocked ? onSetDesign({ stands: stand }) : onBuyCosmetic(id))}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-bold text-white mb-3">🌱 Çim Deseni ve Detaylar</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                {(['stripes', 'rings', 'plain'] as PitchPattern[]).map(pattern => {
                  const id = `pitch:${pattern}`;
                  const unlocked = isUnlocked(stadium, id);
                  const option = COSMETICS.find(c => c.id === id);
                  return (
                    <OptionCard
                      key={pattern}
                      active={design.pitchPattern === pattern}
                      unlocked={unlocked}
                      price={option?.price ?? 0}
                      icon={pattern === 'stripes' ? '🟩' : pattern === 'rings' ? '🎯' : '🟢'}
                      label={`${PITCH_LABEL[pattern]} Çim`}
                      desc={option?.desc}
                      onClick={() => (unlocked ? onSetDesign({ pitchPattern: pattern }) : onBuyCosmetic(id))}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                {(['flags', 'logoPitch'] as const).map(key => {
                  const option = COSMETICS.find(c => c.id === key)!;
                  const unlocked = isUnlocked(stadium, key);
                  const active = key === 'flags' ? design.flags : design.logoOnPitch;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!unlocked) { onBuyCosmetic(key); return; }
                        onSetDesign(key === 'flags' ? { flags: !active } : { logoOnPitch: !active });
                      }}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : unlocked ? 'bg-slate-700/40 border-slate-600 text-slate-200'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      {option.icon} {option.label} {active ? '✓' : unlocked ? '' : `🔒 ${formatMoney(option.price)}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── KAPASİTE ── */}
        {sub === 'capacity' && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-emerald-400">🏟️ Mevcut Kapasite</h3>
                <span className="text-white font-black">{capacity.toLocaleString()} / {MAX_CAPACITY.toLocaleString()}</span>
              </div>
              <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${(baseCapacity / MAX_CAPACITY) * 100}%` }} title="Temel kapasite" />
                <div className="h-full bg-amber-400" style={{ width: `${((capacity - baseCapacity) / MAX_CAPACITY) * 100}%` }} title="Satın alınan ek koltuklar" />
              </div>
              <div className="flex gap-4 text-[11px] mt-2 text-slate-400">
                <span>🟩 Temel (seviye {gameState.stadiumLvl}): {baseCapacity.toLocaleString()}</span>
                <span>🟨 Ek koltuk: {(capacity - baseCapacity).toLocaleString()}</span>
                <span>Doluluk geçmişi: %{fillRate}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-900/40 to-slate-800/50 rounded-2xl border border-blue-500/30 p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-blue-300">⬆️ Stadyum Seviyesi Yükselt</h3>
                <p className="text-[11px] text-slate-300">
                  Seviye {gameState.stadiumLvl} → {gameState.stadiumLvl + 1} • +5.000 koltuk kapasiteli yeni tribün katı
                </p>
              </div>
              <button
                disabled={gameState.budget < upgradeLevelCost || capacity >= MAX_CAPACITY}
                onClick={() => onUpgradeStadiumLevel(upgradeLevelCost)}
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
                  <div key={pack.id} className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold">🏗️ {pack.label}</span>
                      <span className="text-amber-400 font-black">{formatMoney(pack.price)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      {added.toLocaleString()} koltuk eklenir → yeni kapasite {(capacity + added).toLocaleString()}
                    </div>
                    <button
                      disabled={!canBuy}
                      onClick={() => onBuyCapacity(pack.id)}
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

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-bold text-white mb-2">📊 Dolu Stadyum Ne Kazandırır?</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                {[
                  { l: 'Kapasite', v: capacity.toLocaleString(), c: 'text-white' },
                  { l: 'Beklenen seyirci', v: preview.attendance.toLocaleString(), c: 'text-cyan-300' },
                  { l: 'Bilet fiyatı', v: `$${preview.price}`, c: 'text-amber-300' },
                  { l: 'Bilet + büfe geliri', v: formatMoney(preview.total), c: 'text-emerald-300' },
                ].map(item => (
                  <div key={item.l} className="bg-slate-700/40 rounded-xl p-3">
                    <div className="text-[10px] text-slate-400">{item.l}</div>
                    <div className={`font-black text-lg ${item.c}`}>{item.v}</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                VIP loca (+%12 bilet, +$4/seyirci harcama), cam çatı (+%4) ve kase tribün (+%3) geliri artırır; çatı kötü havada seyirci kaybını azaltır.
              </div>
            </div>
          </div>
        )}

        {/* ── BİLET FİYATI ── */}
        {sub === 'tickets' && (
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
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

        {/* ── KOZMETİK MAĞAZASI ── */}
        {sub === 'shop' && (
          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-bold text-emerald-400 mb-1">🛍️ Stadyum Kozmetikleri</h3>
              <div className="text-[11px] text-slate-400 mb-3">
                Kozmetikler stadyumun görünümünü değiştirir; bazıları taraftar morali ve bilet geliri de kazandırır.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {COSMETICS.filter(c => c.price > 0).map(option => {
                  const owned = isUnlocked(stadium, option.id);
                  const affordable = gameState.budget >= option.price;
                  return (
                    <div key={option.id} className={`rounded-xl p-3 border ${owned ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-700/40 border-slate-700/60'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-bold text-sm">{option.icon} {option.label}</span>
                        <span className={`font-black text-sm ${owned ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {owned ? 'SAHİPSİN ✓' : formatMoney(option.price)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 my-1">{option.desc}</div>
                      {!owned && (
                        <button
                          disabled={!affordable}
                          onClick={() => onBuyCosmetic(option.id)}
                          className={`w-full py-2 rounded-lg text-xs font-bold ${
                            affordable ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {affordable ? 'Satın Al' : `Eksik: ${formatMoney(option.price - gameState.budget)}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-bold text-white mb-3">🎨 Özel Koltuk Renkleri</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PREMIUM_COLORS.map(c => {
                  const owned = isUnlocked(stadium, c.id);
                  return (
                    <div key={c.id} className="bg-slate-700/40 rounded-xl p-3 text-center">
                      <div className="w-10 h-10 rounded-lg mx-auto mb-2 border-2 border-slate-600" style={{ background: c.hex }} />
                      <div className="text-white text-xs font-bold">{c.label}</div>
                      <div className={`text-[10px] mb-2 ${owned ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {owned ? 'Açık ✓' : formatMoney(c.price)}
                      </div>
                      <button
                        disabled={!owned && gameState.budget < c.price}
                        onClick={() => (owned ? onSetDesign({ seatColor: c.hex }) : onBuyCosmetic(c.id))}
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
