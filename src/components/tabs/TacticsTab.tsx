import React from 'react';
import { GameState, Tactics } from '../../types/game';
import { TACTICS_SLIDERS } from '../../data/constants';

interface TacticsTabProps {
  gameState: GameState;
  onUpdateTactics: (tactics: Partial<Tactics>) => void;
  onApplyFormation: (formation: string) => void;
  onSetSlider?: (id: string, value: number) => void;
}

export const TacticsTab: React.FC<TacticsTabProps> = ({ gameState, onUpdateTactics, onApplyFormation, onSetSlider }) => {
  const formations = [
    { id: '4-3-3', name: '4-3-3', desc: 'Standart Saldırı', icon: '⚡' },
    { id: '4-4-2', name: '4-4-2', desc: 'Dengeli Oyun', icon: '⚖️' },
    { id: '3-5-2', name: '3-5-2', desc: 'Orta Saha Hakimiyeti', icon: '🎯' },
    { id: '5-3-2', name: '5-3-2', desc: 'Savunma Ağırlıklı', icon: '🛡️' },
    { id: '4-2-3-1', name: '4-2-3-1', desc: 'Modern Futbol', icon: '🌟' }
  ];

  const styles = [
    { id: 'balanced', name: 'Dengeli', desc: 'Standart yaklaşım', icon: '⚖️', color: 'from-blue-500 to-blue-600' },
    { id: 'attack', name: 'Hücum', desc: '+Gol şansı, -Savunma', icon: '⚔️', color: 'from-red-500 to-red-600' },
    { id: 'defense', name: 'Savunma', desc: '+Savunma, -Gol şansı', icon: '🛡️', color: 'from-emerald-500 to-emerald-600' },
    { id: 'possession', name: 'Topa Sahip Ol', desc: 'Rakip ataklarını azaltır', icon: '🔄', color: 'from-purple-500 to-purple-600' }
  ];

  const pressings = [
    { id: 'low', name: 'Düşük Baskı', desc: 'Enerji tasarrufu', icon: '🐢' },
    { id: 'medium', name: 'Orta Baskı', desc: 'Dengeli', icon: '🏃' },
    { id: 'high', name: 'Yüksek Baskı', desc: 'Agresif ama yorucu', icon: '🔥' }
  ];

  const tempos = [
    { id: 'slow', name: 'Yavaş Tempo', desc: 'Kontrol odaklı', icon: '🎻' },
    { id: 'normal', name: 'Normal Tempo', desc: 'Standart', icon: '🎵' },
    { id: 'fast', name: 'Hızlı Tempo', desc: 'Kontra atak', icon: '🎸' }
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Current Tactics Summary */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl p-6 border border-emerald-500/30">
          <h2 className="text-xl font-black tracking-tight text-white mb-4">📋 Mevcut Taktik Özeti</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 leading-relaxed">Formasyon</div>
              <div className="text-xl font-black tracking-tight text-emerald-400">{gameState.tactics.formation}</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 leading-relaxed">Oyun Stili</div>
              <div className="text-xl font-black tracking-tight text-blue-400 capitalize">{gameState.tactics.style}</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 leading-relaxed">Baskı</div>
              <div className="text-xl font-black tracking-tight text-purple-400 capitalize">{gameState.tactics.pressing}</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 leading-relaxed">Tempo</div>
              <div className="text-xl font-black tracking-tight text-amber-400 capitalize">{gameState.tactics.tempo}</div>
            </div>
          </div>
        </div>

        {/* Formation Selection */}
        <div>
          <h3 className="text-lg font-black tracking-tight text-white mb-4">🎮 Formasyon Seç</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {formations.map(f => (
              <button
                key={f.id}
                onClick={() => onApplyFormation(f.id)}
                className={`p-4 rounded-2xl border-2 transition-all text-center ${
                  gameState.tactics.formation === f.id
                    ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="font-bold text-white">{f.name}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Play Style */}
        <div>
          <h3 className="text-lg font-black tracking-tight text-white mb-4">⚔️ Oyun Anlayışı</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {styles.map(s => (
              <button
                key={s.id}
                onClick={() => onUpdateTactics({ style: s.id as Tactics['style'] })}
                className={`p-4 rounded-2xl border-2 transition-all text-center ${
                  gameState.tactics.style === s.id
                    ? `bg-gradient-to-br ${s.color} border-transparent shadow-lg`
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="font-bold text-white">{s.name}</div>
                <div className="text-xs text-slate-300">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Pressing */}
        <div>
          <h3 className="text-lg font-black tracking-tight text-white mb-4">🏃 Baskı Seviyesi</h3>
          <div className="grid grid-cols-3 gap-4">
            {pressings.map(p => (
              <button
                key={p.id}
                onClick={() => onUpdateTactics({ pressing: p.id as Tactics['pressing'] })}
                className={`p-4 rounded-2xl border-2 transition-all text-center ${
                  gameState.tactics.pressing === p.id
                    ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="font-bold text-white">{p.name}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tempo */}
        <div>
          <h3 className="text-lg font-black tracking-tight text-white mb-4">🎵 Oyun Temposu</h3>
          <div className="grid grid-cols-3 gap-4">
            {tempos.map(t => (
              <button
                key={t.id}
                onClick={() => onUpdateTactics({ tempo: t.id as Tactics['tempo'] })}
                className={`p-4 rounded-2xl border-2 transition-all text-center ${
                  gameState.tactics.tempo === t.id
                    ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="text-3xl mb-2">{t.icon}</div>
                <div className="font-bold text-white">{t.name}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 5 Kaydırıcı — Ortalama görsel, sade bar, mild etki */}
        <div>
          <h3 className="text-lg font-black tracking-tight text-white mb-1">🎚️ Taktik Kaydırıcılar — 5 Detay</h3>
          <p className="text-xs text-slate-400 mb-4">Her kaydırıcı maça %±4 etki eder — ortalama görsel, dengeli ve hafif. 50 = nötr.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TACTICS_SLIDERS.map(sl=>{
              const val = (gameState.tactics as any)[sl.id] ?? sl.def;
              return (
                <div key={sl.id} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sl.icon}</span>
                      <div>
                        <div className="text-white font-bold text-sm leading-none">{sl.label}</div>
                        <div className="text-[11px] text-slate-400">{sl.desc}</div>
                      </div>
                    </div>
                    <span className="text-xs font-black bg-slate-700 px-2 py-1 rounded-full text-white">{val}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{sl.left}</span>
                    <input type="range" min={sl.min} max={sl.max} value={val} onChange={e=> onSetSlider?.(sl.id, Number(e.target.value))} className="flex-1 accent-emerald-500" />
                    <span>{sl.right}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" style={{width: `${val}%`}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tactical Tips */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-black tracking-tight text-amber-400 mb-4">💡 Taktik İpuçları</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <p>• <strong>Hücum stili</strong> daha fazla gol şansı verir ancak savunmada açık verir.</p>
            <p>• <strong>Yüksek baskı</strong> rakibi sıkıştırır ama oyuncularınız daha çabuk yorulur.</p>
            <p>• <strong>Hızlı tempo</strong> kontra ataklarda etkilidir ancak top kaybı riskini artırır.</p>
            <p>• Rakip takımın gücüne göre taktik değiştirmek avantaj sağlar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
