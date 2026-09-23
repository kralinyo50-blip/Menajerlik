import React, { useMemo, useState } from 'react';
import { GameState, Investment } from '../../types/game';
import { CREDIT_PACKAGES } from '../../data/constants';

interface InvestTabProps {
  gameState: GameState;
  onBuyInvestment: (id: number, qty?: number) => void;
  onSellInvestment: (id: number, qty?: number) => void;
  onTakeCredit?: (id: string) => void;
  onRepayCredit?: (creditId: string) => void;
}

function riskBadge(risk: string) {
  switch (risk) {
    case 'Düşük': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'Orta': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'Yüksek': return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'Çok Yüksek': return 'bg-red-500/15 text-red-300 border-red-500/30';
    default: return 'bg-slate-700 text-slate-300 border-slate-600';
  }
}

function Sparkline({ data, change }: { data: number[]; change: number }) {
  const w = 120, h = 40, pad = 2;
  if (!data || data.length < 2) return <div className="h-[40px] bg-slate-800 rounded" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const color = change >= 0 ? '#10b981' : '#ef4444';
  const fillColor = change >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
  const pathD = `M ${points.split(' ').join(' L ')}`;
  const areaD = `${pathD} L ${pad + (data.length - 1) * step},${h - pad} L ${pad},${h - pad} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full h-[40px]">
      <path d={areaD} fill={fillColor} stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {/* last dot */}
      {(() => {
        const last = data[data.length - 1];
        const lx = pad + (data.length - 1) * step;
        const ly = h - pad - ((last - min) / range) * (h - pad * 2);
        return <circle cx={lx} cy={ly} r={2.5} fill={color} stroke="white" strokeWidth={1} />;
      })()}
    </svg>
  );
}

const InvestCard: React.FC<{ inv: Investment; budget: number; onBuy: (id:number,qty:number)=>void; onSell:(id:number,qty:number)=>void }> = ({ inv, budget, onBuy, onSell }) => {
  const [qty, setQty] = useState(1);
  const owned = inv.owned || 0;
  const avg = (inv as any).avgCost ?? inv.price;
  const history: number[] = (inv as any).history ?? [inv.price];
  const feeRates: Record<string, number> = { stock: 0.008, gold: 0.006, realestate: 0.012, crypto: 0.01, bond: 0.004, fx: 0.005 };
  const fee = feeRates[inv.type] ?? 0.008;
  const unitCost = Math.round(inv.price * (1 + fee));
  const totalCost = unitCost * qty;
  const canBuy = budget >= totalCost;
  const canSell = owned >= qty;
  const unrealized = owned > 0 ? (inv.price - avg) * owned : 0;
  const unrealizedPct = owned > 0 && avg > 0 ? ((inv.price - avg) / avg) * 100 : 0;
  const weeklyPnl = owned > 0 ? Math.round(owned * inv.price * (inv.lastChange / 100)) : 0;
  const annualReturn = ((inv.drift ?? 0) * 52 * 100 + (inv.dividendYield ?? 0) * 100);
  const dividendWeekly = inv.dividendYield > 0 ? Math.round(inv.price * (inv.dividendYield / 52)) : 0;

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-4 flex flex-col gap-3 hover:border-slate-600/60 transition-colors shadow-lg shadow-black/10 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-[1.02] transition-transform">{inv.icon}</div>
          <div className="min-w-0">
            <h3 className="font-black text-white text-[14px] leading-tight truncate">{inv.name}</h3>
            <div className="text-[11px] text-slate-400 leading-tight truncate">{inv.sector}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${riskBadge(inv.risk)}`}>{inv.risk} Risk</span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">{inv.type.toUpperCase()} • β {inv.marketBeta?.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {owned > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded-full text-xs font-black">{owned} lot</div>
            <div className={`text-[11px] font-bold mt-1 ${unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{unrealized >= 0 ? '+' : ''}${unrealized.toLocaleString()} ({unrealizedPct >= 0 ? '+' : ''}{unrealizedPct.toFixed(1)}%)</div>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] tracking-widest font-bold text-slate-500">GÜNCEL FİYAT / LOT</div>
          <div className="text-2xl font-black tracking-tight text-white">${inv.price.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500">Ort. maliyet: ${avg.toLocaleString()} {owned>0 && <span className={unrealized>=0?'text-emerald-400':'text-red-400'}>• {unrealizedPct>=0?'+':''}{unrealizedPct.toFixed(2)}%</span>}</div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-black border ${inv.lastChange >= 0 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
          {inv.lastChange >= 0 ? '▲' : '▼'} {inv.lastChange >= 0 ? '+' : ''}{inv.lastChange.toFixed(1)}% <span className="font-normal opacity-70">haftalık</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-700/40 p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] tracking-widest font-bold text-slate-500">16 HAFTA FİYAT GEÇMİŞİ</span>
          <span className="text-[10px] text-slate-500">{history[0]?.toLocaleString()} → {history[history.length-1]?.toLocaleString()}</span>
        </div>
        <Sparkline data={history} change={inv.lastChange} />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>En düşük ${Math.min(...history).toLocaleString()}</span>
          <span>En yüksek ${Math.max(...history).toLocaleString()}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-900/50 rounded-xl p-2 border border-slate-700/30">
          <div className="text-[10px] text-slate-500 font-bold tracking-widest">VOLATİLİTE</div>
          <div className="text-sm font-black text-white">%{(inv.volatility*100).toFixed(1)}</div>
          <div className="text-[10px] text-slate-500">haftalık σ</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2 border border-slate-700/30">
          <div className="text-[10px] text-slate-500 font-bold tracking-widest">YILLIK GETİRİ*</div>
          <div className="text-sm font-black text-amber-300">%{annualReturn.toFixed(1)}</div>
          <div className="text-[10px] text-slate-500">drift+temettü</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-2 border border-slate-700/30">
          <div className="text-[10px] text-slate-500 font-bold tracking-widest">{inv.type==='realestate'?'KİRA':inv.type==='bond'?'KUPON':inv.type==='stock'?'TEMETTÜ':'GETİRİ'}</div>
          <div className="text-sm font-black text-cyan-300">{inv.dividendYield>0?`%${(inv.dividendYield*100).toFixed(1)}`:'—'}</div>
          <div className="text-[10px] text-slate-500">{inv.dividendYield>0?`$${dividendWeekly.toLocaleString()}/hf`:'fiyat artışı'}</div>
        </div>
      </div>

      {owned > 0 && (
        <div className="bg-slate-900/40 rounded-xl border border-slate-700/30 p-2.5 flex justify-between text-xs">
          <div>
            <div className="text-slate-500 text-[11px]">Pozisyon değeri</div>
            <div className="font-bold text-white">${(owned*inv.price).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-[11px]">Haftalık P/L</div>
            <div className={`font-bold ${weeklyPnl>=0?'text-emerald-400':'text-red-400'}`}>{weeklyPnl>=0?'+':''}${weeklyPnl.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-[11px]">Toplam temettü</div>
            <div className="font-bold text-cyan-300">+${(inv.dividendsEarned||0).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="text-[11px] leading-relaxed text-slate-400 bg-slate-900/30 rounded-xl p-2.5 border border-slate-700/20">
        {inv.description}
      </div>

      {/* Quantity + Actions */}
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-900 rounded-full p-1 border border-slate-700/50">
          {[1,5,10].map(n => (
            <button key={n} onClick={()=>setQty(n)} className={`px-2.5 py-1 rounded-full text-xs font-black transition-all ${qty===n?'bg-white text-slate-900 shadow':'text-slate-400 hover:text-white'}`}>{n}</button>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 flex-1 text-right">
          {qty} lot • komisyon %{(fee*100).toFixed(1)} • {qty>1?`$${totalCost.toLocaleString()}`:`$${unitCost.toLocaleString()}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onBuy(inv.id, qty)}
          disabled={!canBuy}
          className={`py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-1.5 ${canBuy ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
        >
          <span>Al</span> <span className="opacity-80 text-xs">• ${totalCost.toLocaleString()}</span>
        </button>
        <button
          onClick={() => onSell(inv.id, qty)}
          disabled={!canSell}
          className={`py-2.5 rounded-xl font-black text-sm transition-all ${canSell ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 active:scale-[0.98]' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
        >
          Sat {owned>0?`(${Math.min(qty,owned)})`:''}
        </button>
      </div>
      {!canBuy && <div className="text-[11px] text-amber-300 text-center">Yetersiz bütçe — {qty} lot için ${totalCost.toLocaleString()} gerekli</div>}
      <div className="text-[10px] text-slate-500 text-center">Satışta %10 stopaj sadece kâra uygulanır. Fiyatlar her maç sonrası Gaussian + piyasa hissiyatı ile güncellenir.</div>
    </div>
  );
};

export const InvestTab: React.FC<InvestTabProps> = ({ gameState, onBuyInvestment, onSellInvestment, onTakeCredit, onRepayCredit }) => {
  const investments = (gameState.investments as unknown as Investment[]) || [];

  const stats = useMemo(() => {
    let invested = 0, value = 0, dividends = 0, weekly = 0;
    investments.forEach(inv => {
      const owned = inv.owned || 0;
      if (owned > 0) {
        const avg = (inv as any).avgCost ?? inv.price;
        invested += avg * owned;
        value += inv.price * owned;
        dividends += (inv as any).dividendsEarned || 0;
        weekly += inv.price * owned * (inv.lastChange / 100);
      }
    });
    const unrealized = value - invested;
    const unrealizedPct = invested > 0 ? (unrealized / invested) * 100 : 0;
    const avgChange = investments.length ? investments.reduce((a, b) => a + b.lastChange, 0) / investments.length : 0;
    const best = [...investments].sort((a,b)=> b.lastChange - a.lastChange)[0];
    const worst = [...investments].sort((a,b)=> a.lastChange - b.lastChange)[0];
    const totalReturn = invested > 0 ? ((value + dividends - invested) / invested) * 100 : 0;
    return { invested, value, dividends, weekly, unrealized, unrealizedPct, avgChange, best, worst, totalReturn };
  }, [investments]);

  const sentiment = stats.avgChange > 1.2 ? 'Boğa 🐂' : stats.avgChange < -1.2 ? 'Ayı 🐻' : 'Yatay ↔️';
  const sentimentColor = stats.avgChange > 1.2 ? 'text-emerald-400' : stats.avgChange < -1.2 ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      <div className="max-w-6xl mx-auto space-y-5 pb-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(6,182,212,0.1),transparent_60%)] pointer-events-none" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">📈 Yatırım & Portföy Merkezi <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] px-2 py-1 rounded-full tracking-widest">GERÇEKÇİ PİYASA v2</span></h2>
              <p className="text-slate-400 mt-1 text-sm max-w-2xl">Gerçek piyasa gibi: her maç sonrası fiyatlar <b>drift + volatilite × Gaussian + piyasa betası</b> ile oluşur, temettü/kira/kupon her hafta nakit ödenir. Altın krizde parlar, kripto sert şoklanır.</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-slate-300">🏦 Bütçe: <b className="text-amber-300">${gameState.budget.toLocaleString()}</b></span>
                <span className={`bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full ${sentimentColor}`}>Piyasa: <b>{sentiment}</b> • ort. {stats.avgChange >=0?'+':''}{stats.avgChange.toFixed(2)}%</span>
                <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full text-slate-300">Hafta {gameState.week} • Sezon {gameState.season}</span>
              </div>
            </div>
            <div className="bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-3 min-w-[260px]">
              <div className="text-[11px] tracking-widest font-bold text-slate-500">PORTFÖY ÖZETİ</div>
              <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                <div><div className="text-slate-500 text-xs">Yatırılan</div><div className="font-bold text-white">${stats.invested.toLocaleString()}</div></div>
                <div><div className="text-slate-500 text-xs">Güncel değer</div><div className="font-bold text-white">${stats.value.toLocaleString()}</div></div>
                <div><div className="text-slate-500 text-xs">Gerçekleşmemiş K/Z</div><div className={`font-black ${stats.unrealized>=0?'text-emerald-400':'text-red-400'}`}>{stats.unrealized>=0?'+':''}${Math.round(stats.unrealized).toLocaleString()} ({stats.unrealizedPct>=0?'+':''}{stats.unrealizedPct.toFixed(1)}%)</div></div>
                <div><div className="text-slate-500 text-xs">Temettü/Kupon</div><div className="font-bold text-cyan-300">+${stats.dividends.toLocaleString()}</div></div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between text-xs">
                <span className="text-slate-500">Toplam getiri</span><span className={`font-bold ${stats.totalReturn>=0?'text-emerald-400':'text-red-400'}`}>{stats.totalReturn>=0?'+':''}{stats.totalReturn.toFixed(2)}%</span>
                <span className="text-slate-500">Haftalık P/L</span><span className={`font-bold ${stats.weekly>=0?'text-emerald-400':'text-red-400'}`}>{stats.weekly>=0?'+':''}${Math.round(stats.weekly).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Market bar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">📰</div>
            <div className="text-sm">
              <div className="font-bold text-white">Canlı Piyasa Duvarı</div>
              <div className="text-slate-400 text-xs">En iyi: <span className="text-emerald-400 font-bold">{stats.best?.name} {stats.best?.lastChange>=0?'+':''}{stats.best?.lastChange.toFixed(1)}%</span> • En kötü: <span className="text-red-400 font-bold">{stats.worst?.name} {stats.worst?.lastChange.toFixed(1)}%</span> • Her maç sonrası yeni kapanış.</div>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-2">
              <span className="text-[11px] bg-slate-900 border border-slate-700 px-2 py-1 rounded-full text-slate-400">T+2 takas</span>
              <span className="text-[11px] bg-slate-900 border border-slate-700 px-2 py-1 rounded-full text-slate-400">Komisyon %0.4-1.2</span>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-xs leading-relaxed text-amber-200">
              <b>SPK Risk Bildirimi:</b> Yatırımlar sermaye kaybına yol açabilir. Kripto %±15 gün içi oynaklık normaldir. Tek varlığa yüklenmek portföy riskini artırır — <b>dağılım</b> yap.
              {stats.invested>0 && stats.value>0 && Math.max(...investments.map(i=> (i.owned*i.price)/(stats.value||1))) > 0.65 && (
                <span className="block mt-1 text-amber-300 font-bold">→ Portföyün tek varlığa yığılmış, çeşitlendir!</span>
              )}
            </div>
          </div>
        </div>

        {/* ══════════ KREDİ & TEFECİ (24) ══════════ */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/60 p-4 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">🏦 Acil Kredi & Tefeci <span className="bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] px-2 py-1 rounded-full tracking-widest">24 • YENİ</span></h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xl">Nakit sıkıştı mı? Bankadan düşük faizli kredi çek veya <b>tefeciden anında para</b> al — ama her hafta <b>otomatik taksit</b> kesilir. Ödeyemezsen: banka = güven & skor düşer, tefeci = <b>-1 puan silme + moral çöküşü</b>!</p>
            </div>
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-3 min-w-[220px]">
              <div className="text-[11px] tracking-widest font-bold text-slate-500">KREDİ SKORU</div>
              {(() => {
                const score = (gameState as any).creditScore ?? 620;
                const col = score >= 720 ? 'text-emerald-400' : score >= 620 ? 'text-amber-300' : score >= 520 ? 'text-orange-400' : 'text-red-400';
                const label = score >= 750 ? 'Mükemmel' : score >= 680 ? 'İyi' : score >= 600 ? 'Orta' : score >= 500 ? 'Riskli' : 'Çok Riskli';
                const active = ((gameState as any).activeCredits || []).length;
                const totalDebt = ((gameState as any).activeCredits || []).reduce((a:number,c:any)=> a + (c.totalRepayment - c.paidAmount),0);
                const nextPay = ((gameState as any).activeCredits || []).reduce((a:number,c:any)=> a + c.weeklyPayment,0);
                return (
                  <div>
                    <div className={`text-2xl font-black ${col}`}>{score} <span className="text-xs font-bold text-slate-500">{label}</span></div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" style={{width: `${((score-300)/550)*100}%`}} /></div>
                    <div className="text-xs text-slate-400 mt-1">Aktif kredi: <b className="text-white">{active}/3</b> • Toplam borç: <b className="text-red-300">${totalDebt.toLocaleString()}</b> • Haftalık taksit: <b className="text-amber-300">${nextPay.toLocaleString()}</b></div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Aktif krediler */}
          {((gameState as any).activeCredits || []).length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] tracking-widest font-bold text-slate-500 mb-2">AKTİF BORÇLAR — HER MAÇ SONRASI OTOMATİK KESİLİR</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {((gameState as any).activeCredits || []).map((cr:any) => {
                  const pct = ((cr.weeksTotal - cr.weeksLeft) / cr.weeksTotal) * 100;
                  const remaining = cr.totalRepayment - cr.paidAmount;
                  const isShark = cr.type === 'shark';
                  return (
                    <div key={cr.id} className={`rounded-2xl border p-3 ${isShark ? 'bg-red-950/30 border-red-800/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{isShark ? '🕶️' : '🏦'}</span>
                          <div>
                            <div className="font-bold text-white text-sm leading-tight">{cr.name}</div>
                            <div className="text-[11px] text-slate-400">{cr.principal.toLocaleString()} → {cr.totalRepayment.toLocaleString()} • %{Math.round(cr.interestRate*100)} faiz</div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${isShark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>{cr.weeksLeft} hf kaldı</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-[11px] text-slate-400"><span>Ödenen ${cr.paidAmount.toLocaleString()} / ${cr.totalRepayment.toLocaleString()}</span><span>Haftalık ${cr.weeklyPayment.toLocaleString()}</span></div>
                        <div className="w-full h-2 bg-slate-900 rounded-full mt-1 overflow-hidden border border-slate-700/30"><div className={`h-full ${isShark ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'}`} style={{width: `${pct}%`}} /></div>
                        <div className="text-[11px] text-slate-500 mt-1">Kalan borç: <b className="text-white">${remaining.toLocaleString()}</b> • Alındı: Sezon {cr.takenSeason} Hafta {cr.takenWeek}</div>
                      </div>
                      <button onClick={() => onRepayCredit?.(cr.id)} disabled={(gameState.budget || 0) < (remaining - Math.round(remaining*0.05))} className={`w-full mt-2 py-2 rounded-xl text-xs font-black transition-all ${ (gameState.budget || 0) >= (remaining - Math.round(remaining*0.05)) ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>Erken Kapat — ${ (remaining - Math.round(remaining*0.05)).toLocaleString()} (%5 iskonto)</button>
                      {isShark && <div className="text-[10px] text-red-300 text-center mt-1">⚠️ Gecikme = -1 puan + moral çöküşü!</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-[11px] tracking-widest font-bold text-slate-500 mt-4 mb-2">KREDİ PAKETLERİ — ANINDA HESABA YATAR</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CREDIT_PACKAGES.map(pkg => {
              const active = ((gameState as any).activeCredits || []) as any[];
              const hasPackage = active.some(c => c.packageId === pkg.id);
              const maxReached = active.length >= 3;
              const need = pkg.type==='bank' ? (pkg.id==='bank_quick'?35:pkg.id==='bank_standard'?40:50) : 0;
              const meetsReq = pkg.type==='shark' || (gameState.boardConfidence ?? 50) >= need;
              const canTake = !hasPackage && !maxReached && meetsReq;
              const whyDisabled = hasPackage ? 'Zaten aktif' : maxReached ? 'Max 3 kredi' : !meetsReq ? `Güven %${need}+ lazım` : '';
              return (
                <div key={pkg.id} className={`rounded-2xl border p-4 flex flex-col gap-2 ${pkg.type==='shark' ? 'bg-gradient-to-br from-red-950/40 to-slate-900 border-red-800/40' : 'bg-slate-800/50 border-slate-700/50'} ${!canTake ? 'opacity-60' : 'hover:border-slate-600'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{pkg.icon}</span>
                    <div>
                      <div className="font-black text-white text-sm leading-tight">{pkg.name}</div>
                      <div className="text-[11px] text-slate-400">{pkg.type==='shark' ? 'Tefeci • Şartsız' : 'Banka • Güven ister'} • {pkg.requirement}</div>
                    </div>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full border ${pkg.type==='shark' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>{pkg.type==='shark' ? 'TEFECİ' : 'BANKA'}</span>
                  </div>
                  <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30">
                    <div className="flex justify-between items-baseline"><span className="text-[11px] text-slate-500">Anapara</span><span className="text-lg font-black text-white">${pkg.amount.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Vade</span><span className="font-bold text-white">{pkg.weeks} hafta</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Faiz</span><span className={`font-bold ${pkg.type==='shark' ? 'text-red-400' : 'text-amber-300'}`}>%{Math.round(pkg.interestRate*100)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-500">Toplam geri</span><span className="font-bold text-white">${pkg.totalRepayment.toLocaleString()}</span></div>
                    <div className="mt-1 pt-1 border-t border-slate-700/30 flex justify-between text-xs"><span className="text-slate-400">Haftalık taksit</span><span className="font-black text-amber-300">${pkg.weeklyPayment.toLocaleString()}</span></div>
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-400 flex-1">{pkg.description}</div>
                  <button onClick={() => onTakeCredit?.(pkg.id)} disabled={!canTake} className={`w-full py-2.5 rounded-xl font-black text-sm transition-all ${canTake ? (pkg.type==='shark' ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/20' : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20') : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>{canTake ? `Çek — +$${pkg.amount.toLocaleString()}` : whyDisabled}</button>
                  {pkg.type==='shark' && canTake && <div className="text-[10px] text-center text-red-300">Son çare! Gecikme bedeli çok ağır.</div>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs leading-relaxed text-amber-200 flex gap-2">
            <span>⚠️</span><span><b>Gerçekçi uyarı:</b> Taksitler <b>her maç sonrası otomatik</b> kesilir — bütçen eksiye düşse bile. Banka gecikmesi = skor + güven düşer, <b>tefeci gecikmesi = direkt -1 puan + takım moral -4</b> ve haber manşeti. Erken kapatırsan %5 iskonto alırsın.</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {investments.map(inv => (
            <InvestCard key={inv.id} inv={inv as Investment} budget={gameState.budget} onBuy={onBuyInvestment as any} onSell={onSellInvestment as any} />
          ))}
        </div>

        {/* Education */}
        <div className="bg-slate-800/40 backdrop-blur rounded-2xl border border-slate-700/50 p-5">
          <h3 className="font-black text-white flex items-center gap-2">💡 Gerçekçi Yatırım Rehberi <span className="text-xs font-normal text-slate-500">• Oyun içi ekonomi, gerçek piyasa matematiğiyle</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 text-sm">
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="font-bold text-emerald-300">📈 BIST 100 — Büyüme</div>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">Yıllık ~%22 hisse artışı + %1.8 temettü. Volatilite %4.8/hafta. Boğa piyasasında uçar, ayıda en çok düşen o olur. Uzun vade en iyi.</p>
              <div className="text-[11px] text-slate-500 mt-1">Beta 1.0 • Haftalık drift %0.42</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="font-bold text-amber-300">🥇 Altın — Sigorta</div>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">Krizde portföyü korur (beta -0.28). Temettü yok, sadece fiyat. Enflasyon + jeopolitik gerilimde ralli yapar.</p>
              <div className="text-[11px] text-slate-500 mt-1">Vol %3.1 • Güvenli liman</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="font-bold text-cyan-300">🏘️ GYO — Kira Makinesi</div>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">Her hafta kira temettüsü (%5.5 yıllık) yatar. Fiyatı yavaş oynar, enflasyonda değer kazanır. En dengeli nakit akışı.</p>
              <div className="text-[11px] text-slate-500 mt-1">Vol %2.4 • Kira haftalık</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="font-bold text-violet-300">₿ Kripto — Roket</div>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">Haftada %10 sigma — %8 ihtimalle ekstra %±9 şok! Drift yüksek (%0.55/hf) ama bir gecede %12 düşebilir. Sadece riske atabileceğin parayla.</p>
              <div className="text-[11px] text-slate-500 mt-1">Beta 0.62 • Fat-tail</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-200">
              <b>📜 Tahvil İpucu:</b> Faiz artınca fiyatı düşer — ama kupon %18 yıllık her hafta yatar. Volatilitesi en düşük (%1.4), ayı piyasasında en güvenli.
            </div>
            <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3 text-slate-300">
              <b>Matematik:</b> Haftalık getiri = drift + σ·N(0,1) + β·piyasa + olay şoku − 0.015·(fiyat − taban)/taban <span className="text-slate-500">(mean-reversion)</span>
            </div>
            <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-3 text-slate-300">
              <b>Maliyetler:</b> Alışta %0.4-1.2 komisyon, satışta %10 stopaj <i>sadece kâra</i>. Maliyet ortalaması (avgCost) ile K/Z hesaplanır — vesting yok, T+2.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
