import React from 'react';
import { PressConference as PressType } from '../types/game';

interface Props {
  press: PressType;
  onAnswer: (tone: string) => void;
  onDismiss: () => void;
}

export const PressConference: React.FC<Props> = ({ press, onAnswer, onDismiss }) => {
  const q = press.questions[press.answered];
  if (!q) return null;
  const progress = ((press.answered) / press.questions.length) * 100;
  const total = press.questions.length;
  const current = press.answered + 1;

  const toneIcon: Record<string, string> = {
    humble: '🤝',
    confident: '💪',
    aggressive: '🔥',
    neutral: '⚖️',
  };
  const toneColor: Record<string, string> = {
    humble: 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300',
    confident: 'border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300',
    aggressive: 'border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300',
    neutral: 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300',
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden">
        {/* header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-700/40 bg-slate-900/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-lg shadow-lg">🎙️</div>
              <div>
                <div className="text-xs tracking-widest font-bold text-violet-300">BASIN TOPLANTISI</div>
                <div className="text-white font-black leading-none">vs {press.opponent} <span className="text-slate-400 font-normal text-xs">• Soru {current}/{total}</span></div>
              </div>
            </div>
            <button onClick={onDismiss} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300">✕</button>
          </div>
          <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30 p-1">
            <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
            <span>{press.wasWin ? '✅ Galibiyet sonrası — beklenti yüksek' : press.wasDraw ? '➖ Beraberlik — dengeli cevaplar bekleniyor' : '❌ Mağlubiyet — kelimelerini seç!'}</span>
            <span className="hidden sm:inline">Ortalama mod: sade, hızlı, net etkiler</span>
          </div>
        </div>

        {/* question */}
        <div className="p-6">
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 mb-4">
            <div className="text-[11px] tracking-widest font-bold text-slate-500 mb-1">GAZETECİ SORUYOR</div>
            <div className="text-white font-bold text-base leading-snug">“{q.question}”</div>
            <div className="text-xs text-slate-400 mt-1">Cevabın morale, taraftara ve yönetime yansır — drama dozu arttı!</div>
          </div>

          <div className="space-y-2.5">
            {q.answers.map(ans => (
              <button
                key={ans.tone}
                onClick={() => onAnswer(ans.tone)}
                className={`w-full text-left rounded-2xl border p-3.5 flex items-center gap-3 transition-all btn-press ${toneColor[ans.tone] || toneColor.neutral}`}
              >
                <span className="text-xl w-8 h-8 rounded-xl bg-slate-900/60 border border-slate-700/40 flex items-center justify-center flex-shrink-0">{toneIcon[ans.tone] || '💬'}</span>
                <span className="flex-1">
                  <span className="font-bold text-sm text-white block leading-tight">{ans.label}</span>
                  <span className="text-[11px] opacity-80">{ans.effect}</span>
                </span>
                <span className="text-slate-400">›</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
            <span>💡 İpucu: <b className="text-slate-300">Alçakgönüllü</b> = güvenli, <b className="text-sky-300">Özgüvenli</b> = taraftar coşar, <b className="text-red-300">Agresif</b> = ultras coşar ama yönetim kızar.</span>
          </div>
        </div>

        {/* footer drama hint */}
        <div className="px-6 pb-5">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-[11px] text-amber-200/80 flex items-center gap-2">
            <span>🎭</span><span>Yeni drama modu aktif: agresif demeçler %30 ihtimalle yönetim güveni -2 daha düşürür, sosyal medyada gündem olur.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
