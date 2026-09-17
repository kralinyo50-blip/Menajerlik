import React from 'react';
import { GameState } from '../../types/game';

interface InvestTabProps {
  gameState: GameState;
  onBuyInvestment: (id: number) => void;
  onSellInvestment: (id: number) => void;
}

export const InvestTab: React.FC<InvestTabProps> = ({ gameState, onBuyInvestment, onSellInvestment }) => {
  const totalPortfolioValue = gameState.investments.reduce((acc, inv) => {
    return acc + (inv.owned * inv.price);
  }, 0);

  const totalUnrealizedGain = gameState.investments.reduce((acc, inv) => {
    if (inv.owned > 0) {
      return acc + (inv.owned * inv.price * (inv.lastChange / 100));
    }
    return acc;
  }, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl p-6 border border-emerald-500/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                📈 Finansal Yatırım Merkezi
              </h2>
              <p className="text-slate-400 mt-1">Kulüp bütçesini değerlendirerek pasif gelir elde edin</p>
            </div>
            <div className="bg-slate-800/50 px-4 py-2 rounded-2xl">
              <span className="text-amber-300 text-sm">Bütçe:</span>
              <span className="text-amber-400 font-bold ml-2">${gameState.budget.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400">Toplam Portföy Değeri</div>
            <div className="text-2xl font-black tracking-tight text-white">${totalPortfolioValue.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400">Gerçekleşmemiş Kar/Zarar</div>
            <div className={`text-2xl font-bold ${totalUnrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalUnrealizedGain >= 0 ? '+' : ''}${Math.floor(totalUnrealizedGain).toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400">Aktif Yatırım Sayısı</div>
            <div className="text-2xl font-bold text-blue-400">
              {gameState.investments.filter(i => i.owned > 0).length}
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="text-sm text-amber-200">
            <strong>Risk Uyarısı:</strong> Yatırımlar değer kaybedebilir. Her maç sonrasında piyasa değerleri değişir. 
            Dikkatli yatırım yapın ve tüm bütçenizi tek bir yatırıma koymayın.
          </div>
        </div>

        {/* Investments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameState.investments.map(inv => (
            <div key={inv.id} className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{inv.icon}</span>
                  <div>
                    <h3 className="font-bold text-white">{inv.name}</h3>
                    <div className="text-xs text-slate-400 leading-relaxed capitalize">{inv.type}</div>
                  </div>
                </div>
                {inv.owned > 0 && (
                  <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold">
                    {inv.owned} adet
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="text-2xl font-black tracking-tight text-white">${inv.price.toLocaleString()}</div>
                <div className={`text-sm font-medium ${inv.lastChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {inv.lastChange >= 0 ? '▲' : '▼'} %{Math.abs(inv.lastChange)} haftalık
                </div>
              </div>

              {/* Price History Visual */}
              <div className="h-12 flex items-end gap-0.5 mb-4">
                {[...Array(10)].map((_, i) => {
                  const height = 30 + Math.random() * 70;
                  const isGreen = Math.random() > 0.4;
                  return (
                    <div 
                      key={i}
                      className={`flex-1 rounded-t ${isGreen ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onBuyInvestment(inv.id)}
                  disabled={gameState.budget < inv.price}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                    gameState.budget >= inv.price
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Satın Al
                </button>
                <button
                  onClick={() => onSellInvestment(inv.id)}
                  disabled={inv.owned <= 0}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                    inv.owned > 0
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Sat
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="font-bold text-blue-400 mb-4">💡 Yatırım İpuçları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="flex items-start gap-2">
              <span>📊</span>
              <p>Borsa en volatil yatırımdır - yüksek risk, yüksek getiri.</p>
            </div>
            <div className="flex items-start gap-2">
              <span>🥇</span>
              <p>Altın daha istikrarlıdır ve kriz dönemlerinde değer kazanır.</p>
            </div>
            <div className="flex items-start gap-2">
              <span>🏠</span>
              <p>Emlak uzun vadeli yatırım için idealdir.</p>
            </div>
            <div className="flex items-start gap-2">
              <span>₿</span>
              <p>Kripto en riskli ama en yüksek potansiyele sahip.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
