import React, { useState } from 'react';
import { CorruptionState, GameState, Staff } from '../../types/game';
import { formatMoney } from '../../utils/pricing';

interface Props {
  gameState: GameState;
  onBuyBribe: (kind: 'keeper' | 'ref', tier: 'small' | 'big') => void;
  onHireStaff: (type: Staff['type'], cost: number) => void;
}

const BRIBE_PRICE = {
  keeper: { small: 750000, big: 2500000 },
  ref: { small: 1000000, big: 3000000 },
} as const;

/** Yakalanma riski % — kabaracı indirimi dahil */
function riskPct(tier: 'small' | 'big', hasFixer: boolean): number {
  const base = tier === 'small' ? 5.5 : 10;
  return Math.round(base * (hasFixer ? 0.55 : 1) * 100) / 100;
}

const RiskMeter: React.FC<{ pct: number }> = ({ pct }) => {
  const color = pct <= 4 ? 'bg-emerald-500' : pct <= 8 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(100, pct * 6)}%` }} />
      </div>
      <span className="text-[11px] font-black text-slate-300 w-14 text-right">maçbaşı %{pct.toFixed(1).replace('.', ',')}</span>
    </div>
  );
};

/**
 * 🕶️ Karanlık İşler — şike, rüşvet ve arkadaki adamlar.
 * Rakip kalecisine para ver, hakemi "ikna et"; ama yakalanırsan:
 * para cezası + puan silme + yönetim güveni erimesi. 3. yakalanışta kovulursun.
 */
export const DarkTab: React.FC<Props> = ({ gameState, onBuyBribe, onHireStaff }) => {
  const cor: CorruptionState = gameState.corruption ?? { keeperBribe: null, refBribe: null, timesCaught: 0, totalSpent: 0, dirtyWins: 0 };
  const [confirm, setConfirm] = useState<{ kind: 'keeper' | 'ref'; tier: 'small' | 'big' } | null>(null);

  const hasFixer = gameState.staff?.some(s => s.type === 'fixer') ?? false;
  const hasLawyer = gameState.staff?.some(s => s.type === 'lawyer') ?? false;
  const hasAgent = gameState.staff?.some(s => s.type === 'agent') ?? false;

  const darkTeam = [
    { type: 'fixer' as const, name: 'Kabaracı', icon: '🕶️', cost: 550000, hired: hasFixer, desc: 'Yakalanma riskini %45 azaltır. "O dosya mı? Hangi dosya?"' },
    { type: 'lawyer' as const, name: 'Avukat', icon: '⚖️', cost: 480000, hired: hasLawyer, desc: 'Yakalanınca para cezalarını yarıya indirir.' },
    { type: 'agent' as const, name: 'Oyuncu Menajeri', icon: '💼', cost: 400000, hired: hasAgent, desc: "Tüm sözleşme yenilemelerinde imza parası %18 düşer. (Stadyum → Personel'den de alınır)" },
  ];

  const bribeCard = (
    kind: 'keeper' | 'ref',
    icon: string,
    title: string,
    desc: string,
    effects: string[]
  ) => {
    const active = kind === 'keeper' ? cor.keeperBribe : cor.refBribe;
    return (
      <div className={`rounded-2xl border p-5 ${active ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700/60 bg-slate-900/40'}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <div className="text-white font-black text-sm">{title}</div>
              <div className="text-[11px] text-slate-400">{desc}</div>
            </div>
          </div>
          {active && (
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-red-500/25 text-red-300 border border-red-500/40 animate-pulse">
              SIRADAKİ MAÇTA AKTİF
            </span>
          )}
        </div>

        <ul className="text-[11px] text-slate-300 space-y-1 mb-4">
          {effects.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>

        <div className="grid grid-cols-2 gap-2.5">
          {(['small', 'big'] as const).map(tier => {
            const price = BRIBE_PRICE[kind][tier];
            const afford = gameState.budget >= price;
            return (
              <div key={tier} className="bg-slate-950/50 border border-slate-700/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-slate-400 tracking-wider">{tier === 'small' ? 'KÜÇÜK TEŞVİK' : 'BÜYÜK ANLAŞMA'}</span>
                  <RiskMeter pct={riskPct(tier, hasFixer)} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-300 font-black text-sm">{formatMoney(price)}</span>
                  <button
                    onClick={() => setConfirm({ kind, tier })}
                    disabled={!afford || !!active}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      active ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : afford ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {active ? 'AKTİF' : afford ? 'PARAYI GÖNDER 💵' : 'PARA YETMİZ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="relative overflow-hidden rounded-2xl p-6 border border-red-500/30 bg-gradient-to-r from-slate-950 via-red-950/40 to-slate-950">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 14px)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-red-200 flex items-center gap-2">🕶️ Karanlık İşler</h2>
            <p className="text-slate-400 mt-1 text-sm max-w-xl">
              Menajerliğin kirli ama kazançlı tarafı. Kaleciye ya da hakeme para kaydır — rakibin o gün "tuhaf" oynar.
              Ama unutma: <b className="text-red-300">Disiplin Kurulu hiçbir yeri unutmaz.</b>
            </p>
          </div>
          <div className="bg-black/40 rounded-2xl px-4 py-3 border border-red-500/25 text-right">
            <div className="text-[10px] tracking-widest text-red-300 font-bold">SABIKA</div>
            <div className="text-2xl font-black text-white">{cor.timesCaught} <span className="text-sm text-slate-400">/ 3</span></div>
            <div className="text-[10px] text-slate-500">harcanan: {formatMoney(cor.totalSpent)}</div>
          </div>
        </div>
      </div>

      {/* Cezalar uyarısı */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="text-[12px] text-amber-200 leading-relaxed">
          <b>Yakalanırsan:</b> para cezası ($1.8M–$6M) + <b>ligden 3 puan silme</b> + yönetim güveni -22 + taraftar morali -12.
          {hasLawyer ? ' ✅ Avukatın cezaları yarıya indiriyor.' : ' ⚖️ Avukat tutarsan cezalar yarıya iner.'}
          {hasFixer ? ' ✅ Kabaracın riskleri %45 azaltıyor.' : ' 🕶️ Kabaracı tutarsan risk %45 azalır.'}
          <b className="text-red-300"> 3. yakalanışta yönetim sözleşmeni fesheder!</b>
        </div>
      </div>

      {/* Rüşvet kartları */}
      <div className="grid md:grid-cols-2 gap-4">
        {bribeCard(
          'keeper', '🧤', 'Rakip Kaleciye Rüşvet',
          'Devresinde yemek yiyen kaleci, bugün "ayakları kaygan" oynar.',
          ['Bizim şutlar daha sık gole dönüşür (+%14 / +%28)', 'Kaleci kurtarış bonusu ciddi şekilde erir', 'Küçük: %5,5 risk • Büyük: %10 risk (kabaracıyla daha az)']
        )}
        {bribeCard(
          'ref', '🟨', 'Hakeme Rüşvet',
          'Düdük o gün biraz daha "bizim tarafta" çalar.',
          ['Rakip golleri şüpheli VAR kararlarıyla iptal edilebilir (%20 / %40)', 'Bizim kartlarımıza görmezden gelir, rakibi affetmez', 'Küçük: %8 risk • Büyük: %13 risk (kabaracıyla daha az)']
        )}
      </div>

      {/* Karanlık ekip */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-5">
        <h3 className="text-sm font-black text-white mb-1">👤 Arkamdaki Adamlar</h3>
        <p className="text-[11px] text-slate-400 mb-4">Her büyük menajerin arkasında sessiz bir ekip vardır. İşe al, işler yürüsün.</p>
        <div className="grid md:grid-cols-3 gap-3">
          {darkTeam.map(m => (
            <div key={m.type} className={`rounded-2xl border p-4 ${m.hired ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700/50 bg-slate-900/40'}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-2xl">{m.icon}</span>
                <div className="text-white font-black text-sm">{m.name}</div>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug mb-3">{m.desc}</p>
              {m.hired ? (
                <div className="bg-emerald-500/20 text-emerald-300 py-2 rounded-lg text-center text-xs font-black">✓ Ekibinde</div>
              ) : (
                <button
                  onClick={() => onHireStaff(m.type, m.cost)}
                  disabled={gameState.budget < m.cost}
                  className={`w-full py-2 rounded-lg text-xs font-black transition-all ${
                    gameState.budget >= m.cost ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  İşe Al — {formatMoney(m.cost)}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Onay penceresi */}
      {confirm && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
          <div className="bg-slate-900 rounded-2xl border border-red-500/40 p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-2">🕶️</div>
            <h3 className="text-white font-black text-lg">Emin misin?</h3>
            <p className="text-slate-400 text-[12px] mt-2 leading-relaxed">
              {formatMoney(BRIBE_PRICE[confirm.kind][confirm.tier])} gönderilecek. Yakalanırsan para da gider, ceza da gelir.
              Bu pencerede "hayır" diyen olmaz, sadece sessiz olanlar kazanır.
            </p>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-black text-sm">Vazgeç</button>
              <button
                onClick={() => { onBuyBribe(confirm.kind, confirm.tier); setConfirm(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm"
              >
                Parayı Gönder 💵
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
