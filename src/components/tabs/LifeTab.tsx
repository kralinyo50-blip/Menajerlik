import React, { useState } from 'react';
import { GameState, LifeActivityId, LifeStats } from '../../types/game';
import { LIFE_ACTIVITIES, LIFE_SLOTS_PER_WEEK, LIFE_ITEMS, LifeActivity } from '../../data/life';
import {
  checkActivity, fitnessCap, funCap, lifeOf, lifeSummary, slotsLeft,
  managerMatchBonus, managerRecoveryBonus, fameIncomeMultiplier, fameNegotiationBonus
} from '../../utils/life';
import { LifeActivityModal } from '../LifeActivityModal';
import { formatMoney } from '../../utils/pricing';

interface LifeTabProps {
  gameState: GameState;
  onDoActivity: (activityId: LifeActivityId, variantId: string) => { summary: string; xp: number; cost: number; fatigued: boolean } | null;
  onBuyItem: (itemId: string) => void;
}

const STAT_META: Record<keyof LifeStats, { label: string; icon: string; bar: string; text: string; desc: string }> = {
  energy: { label: 'Enerji', icon: '⚡', bar: 'from-amber-400 to-orange-500', text: 'text-amber-300', desc: 'Her aktivite enerji harcar. 30 altında etkiler yarıya iner.' },
  fitness: { label: 'Form', icon: '💪', bar: 'from-emerald-400 to-teal-500', text: 'text-emerald-300', desc: 'Maç kenarındaki gücün ve oyuncuların toparlanma hızı.' },
  fun: { label: 'Keyif', icon: '😄', bar: 'from-sky-400 to-blue-500', text: 'text-sky-300', desc: 'Takım moralini ve transfer pazarlığını etkiler.' },
  fame: { label: 'Ün', icon: '⭐', bar: 'from-violet-400 to-fuchsia-500', text: 'text-violet-300', desc: 'Sponsor geliri ve taraftar sevgisi.' },
};

export const LifeTab: React.FC<LifeTabProps> = ({ gameState, onDoActivity, onBuyItem }) => {
  const [openActivity, setOpenActivity] = useState<LifeActivity | null>(null);
  const life = lifeOf(gameState);
  const slots = slotsLeft(life);
  const summary = lifeSummary(gameState);
  const matchBonus = managerMatchBonus(gameState);
  const recovery = managerRecoveryBonus(gameState);

  const effects = [
    { icon: '⚽', label: 'Maç kenarı bonusu', value: matchBonus.label, tone: matchBonus.attack > 0 ? 'good' : matchBonus.attack < 0 ? 'bad' : 'neutral' },
    { icon: '🔋', label: 'Oyuncu toparlanma', value: `+${recovery} enerji/hafta`, tone: recovery > 1 ? 'good' : 'neutral' },
    { icon: '💰', label: 'Sponsor geliri', value: `×${fameIncomeMultiplier(gameState).toFixed(2)}`, tone: fameIncomeMultiplier(gameState) > 1.05 ? 'good' : 'neutral' },
    { icon: '🤝', label: 'Pazarlık payı', value: `+%${Math.round(fameNegotiationBonus(gameState) * 100)}`, tone: fameNegotiationBonus(gameState) > 0.02 ? 'good' : 'neutral' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Menajer profili */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900 rounded-2xl border border-slate-700/60 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-3xl">
                🧑‍💼
              </div>
              <div>
                <div className="text-white font-black text-lg">Menajer Hayatı</div>
                <div className="text-[11px] text-slate-400">{gameState.teamName} • Sezon {gameState.season} • Hafta {gameState.week}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Bu hafta kalan boş zaman</div>
              <div className="flex gap-1 justify-end mt-1">
                {Array.from({ length: LIFE_SLOTS_PER_WEEK }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black ${
                      i < slots ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'
                    }`}
                  >
                    {i < slots ? '✓' : '·'}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{slots}/{LIFE_SLOTS_PER_WEEK} hak kaldı</div>
            </div>
          </div>

          {/* Statlar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(STAT_META) as (keyof LifeStats)[]).map(key => {
              const value = life.stats[key];
              const meta = STAT_META[key];
              const cap = key === 'fitness' ? fitnessCap(life) : key === 'fun' ? funCap(life) : 100;
              return (
                <div key={key} className="bg-slate-800/70 rounded-xl p-3" title={meta.desc}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-300">{meta.icon} {meta.label}</span>
                    <span className={`font-black ${meta.text}`}>{value}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden relative">
                    <div className={`h-full bg-gradient-to-r ${meta.bar}`} style={{ width: `${value}%` }} />
                    {cap < 100 && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80" style={{ left: `${cap}%` }} title={`Limit: ${cap}`} />
                    )}
                  </div>
                  {cap < 100 && (
                    <div className="text-[9px] text-amber-300/90 mt-1">Limit {cap} — eşya ile yükselir</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={`mt-3 text-[12px] rounded-xl px-3 py-2 ${
            summary.tone === 'good' ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
            : summary.tone === 'bad' ? 'bg-red-500/10 text-red-200 border border-red-500/30'
            : 'bg-slate-700/40 text-slate-300'
          }`}>
            {summary.tone === 'good' ? '😎' : summary.tone === 'bad' ? '⚠️' : '🙂'} {summary.text}
          </div>
        </div>

        {/* Etkiler */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {effects.map(effect => (
            <div key={effect.label} className={`rounded-xl p-3 border text-center ${
              effect.tone === 'good' ? 'bg-emerald-500/10 border-emerald-500/30'
              : effect.tone === 'bad' ? 'bg-red-500/10 border-red-500/30'
              : 'bg-slate-800/60 border-slate-700/60'
            }`}>
              <div className="text-[10px] text-slate-400">{effect.icon} {effect.label}</div>
              <div className={`font-black text-sm ${
                effect.tone === 'good' ? 'text-emerald-300' : effect.tone === 'bad' ? 'text-red-300' : 'text-slate-200'
              }`}>{effect.value}</div>
            </div>
          ))}
        </div>

        {/* Aktiviteler */}
        <div>
          <h3 className="text-sm font-bold text-white mb-2">🗓️ Bu Hafta Ne Yapmak İstersin?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {LIFE_ACTIVITIES.map(activity => {
              const check = checkActivity(gameState, activity.id);
              const used = life.weekLog?.[activity.id] ?? 0;
              const owned = !activity.requires || life.owned.includes(activity.requires);
              const requiredItem = LIFE_ITEMS.find(i => i.id === activity.requires);
              return (
                <div
                  key={activity.id}
                  className={`rounded-2xl p-4 border transition-all ${
                    check.ok ? 'bg-slate-800/60 border-slate-700/60 hover:border-emerald-500/50'
                    : 'bg-slate-800/40 border-slate-700/40 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activity.icon}</span>
                      <div>
                        <div className="text-white font-bold">{activity.label}</div>
                        <div className="text-[10px] text-slate-400">
                          {activity.scene === 'gym' ? '🏋️ 3D Spor Salonu'
                          : activity.scene === 'home' ? '🛋️ 3D Ev'
                          : activity.scene === 'city' ? '🌆 3D Şehir'
                          : '🎤 3D Stüdyo'}
                          {activity.slots > 1 ? ` • ${activity.slots} hak` : ''}
                        </div>
                      </div>
                    </div>
                    {used > 0 && (
                      <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                        bu hafta {used}/{activity.maxPerWeek}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 mb-2">{activity.desc}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {(Object.keys(activity.effect) as (keyof LifeStats | 'xp')[]).map(key => {
                      const value = activity.effect[key] as number;
                      if (!value) return null;
                      const label = key === 'xp' ? 'XP' : STAT_META[key as keyof LifeStats].label;
                      return (
                        <span key={key} className={`text-[9px] px-1.5 py-0.5 rounded ${
                          value > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                        }`}>
                          {label} {value > 0 ? '+' : ''}{value}
                        </span>
                      );
                    })}
                    {activity.energyCost > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                        Enerji -{activity.energyCost}
                      </span>
                    )}
                    {!!activity.cost && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">
                        {formatMoney(activity.cost)}
                      </span>
                    )}
                  </div>

                  {check.ok ? (
                    <button
                      onClick={() => setOpenActivity(activity)}
                      className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white transition-all"
                    >
                      ▶️ {activity.label} — 3D sahneye gir
                    </button>
                  ) : !owned && requiredItem ? (
                    <button
                      onClick={() => onBuyItem(requiredItem.id)}
                      disabled={gameState.budget < requiredItem.price}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                        gameState.budget >= requiredItem.price
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      🔒 {requiredItem.icon} {requiredItem.label} al — {formatMoney(requiredItem.price)}
                    </button>
                  ) : (
                    <div className="w-full py-2.5 rounded-xl text-center text-[11px] bg-slate-700/60 text-slate-400">
                      ⛔ {check.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Eşyalar */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
          <h3 className="text-sm font-bold text-cyan-400 mb-1">🛍️ Kişisel Eşyalar</h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Bazı aktiviteler eşya gerektirir; eşyalar ayrıca aktivitelerin verimini artırır.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {LIFE_ITEMS.map(item => {
              const owned = life.owned.includes(item.id);
              const affordable = gameState.budget >= item.price;
              return (
                <div key={item.id} className={`rounded-xl p-3 border ${owned ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-700/40 border-slate-700/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`text-[11px] font-black ${owned ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {owned ? 'SAHİPSİN ✓' : formatMoney(item.price)}
                    </span>
                  </div>
                  <div className="text-white font-bold text-sm mt-1">{item.label}</div>
                  <div className="text-[10px] text-slate-400">{item.desc}</div>
                  <div className="text-[10px] text-cyan-300 mt-1">✨ {item.perk}</div>
                  {!owned && (
                    <button
                      disabled={!affordable}
                      onClick={() => onBuyItem(item.id)}
                      className={`w-full mt-2 py-2 rounded-lg text-xs font-bold transition-all ${
                        affordable ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {affordable ? 'Satın Al' : `Eksik: ${formatMoney(item.price - gameState.budget)}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Geçmiş */}
        {life.history.length > 0 && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
            <h3 className="text-sm font-bold text-slate-300 mb-3">📜 Son Aktiviteler</h3>
            <div className="space-y-1.5">
              {life.history.slice(0, 8).map((entry, i) => (
                <div key={`${entry.week}-${i}`} className="flex items-center justify-between text-[11px] bg-slate-700/30 rounded-lg px-3 py-2">
                  <span className="text-slate-300">
                    <span className="text-slate-500">S{entry.season} H{entry.week} •</span> {entry.label}
                  </span>
                  <span className="text-slate-400 text-[10px]">{entry.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {openActivity && (
        <LifeActivityModal
          activity={openActivity}
          gameState={gameState}
          onDo={onDoActivity}
          onClose={() => setOpenActivity(null)}
        />
      )}
    </div>
  );
};
