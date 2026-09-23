import React from 'react';
import { TeamKit } from '../../types/game';
import { luminance } from '../match3d/venue';

const SHIRT_COLORS = [
  '#facc15', '#dc2626', '#1d4ed8', '#059669', '#111827', '#f8fafc',
  '#7c3aed', '#f97316', '#0ea5e9', '#ec4899',
] as const;

const SHORTS_COLORS = [
  '#1e3a8a', '#111827', '#f8fafc', '#b91c1c', '#065f46',
  '#1f2937', '#581c87', '#7c2d12', '#0c4a6e', '#831843',
] as const;

const PRESETS: { name: string; icon: string; kit: TeamKit }[] = [
  { name: 'Kanarya', icon: '💛', kit: { shirt: '#facc15', shorts: '#1e3a8a' } },
  { name: 'Kartal', icon: '🖤', kit: { shirt: '#111827', shorts: '#f8fafc' } },
  { name: 'Ateş', icon: '🔥', kit: { shirt: '#dc2626', shorts: '#f8fafc' } },
  { name: 'Orman', icon: '🌲', kit: { shirt: '#059669', shorts: '#111827' } },
  { name: 'Mor Şimşek', icon: '⚡', kit: { shirt: '#7c3aed', shorts: '#facc15' } },
  { name: 'Okyanus', icon: '🌊', kit: { shirt: '#0ea5e9', shorts: '#f8fafc' } },
];

interface KitEditorProps {
  kit?: TeamKit;
  /** null → stadyum renklerine döner */
  onSetKit: (kit: TeamKit | null) => void;
}

/** Kumaş numarası kontrastı: açık formada lacivert, koyuda beyaz */
function numberColor(shirt: string): string {
  return luminance(shirt) > 0.45 ? '#1e3a8a' : '#f8fafc';
}

/** Mini forma önizlemesi (saf SVG — 3D sahne ile aynı renkleri gösterir) */
export const ShirtPreview: React.FC<{ kit: TeamKit; size?: number }> = ({ kit, size = 92 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
    {/* kollar */}
    <path d="M18 18 L4 34 L16 46 L24 36 Z" fill={kit.shirt} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
    <path d="M82 18 L96 34 L84 46 L76 36 Z" fill={kit.shirt} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
    {/* gövde */}
    <path d="M24 14 L38 8 Q50 16 62 8 L76 14 L78 88 L22 88 Z" fill={kit.shirt} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
    {/* yaka */}
    <path d="M38 8 Q50 16 62 8 L58 14 Q50 20 42 14 Z" fill={numberColor(kit.shirt)} opacity="0.85" />
    {/* numara */}
    <text x="50" y="58" textAnchor="middle" fontSize="30" fontWeight="900" fill={numberColor(kit.shirt)} fontFamily="system-ui, sans-serif">10</text>
    {/* şort */}
    <path d="M22 88 L78 88 L74 106 L56 106 L50 94 L44 106 L26 106 Z" fill={kit.shorts} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
  </svg>
);

/**
 * 🎨 Forma Tasarımcısı — forma + şort rengini seç, 3D maçtaki oyuncular
 * ve bu önizleme anında aynı renklere bürünür. Boşsa stadyum koltuk rengi kullanılır.
 */
export const KitEditor: React.FC<KitEditorProps> = ({ kit, onSetKit }) => {
  const current: TeamKit = kit ?? { shirt: '#1d4ed8', shorts: '#1f2937' };
  const custom = !!kit;

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-lg font-black tracking-tight text-pink-400">🎨 Forma Tasarımcısı</h3>
          <p className="text-xs text-slate-400 mt-1">
            Takımının formanı tasarla — seçim anında <b className="text-slate-300">3D maçta sahaya yansır</b>.
            {custom ? '' : ' Şu an stadyum koltuk renkleri kullanılıyor.'}
          </p>
        </div>
        <ShirtPreview kit={current} size={84} />
      </div>

      {/* Hazır şablonlar */}
      <div className="text-[10px] font-black tracking-widest text-slate-500 mb-2">HAZIR SETLER</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map(p => {
          const active = custom && kit!.shirt === p.kit.shirt && kit!.shorts === p.kit.shorts;
          return (
            <button
              key={p.name}
              onClick={() => onSetKit(p.kit)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                active ? 'border-pink-400 bg-pink-500/15 text-white scale-105' : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full border border-black/30"
                style={{ background: `linear-gradient(135deg, ${p.kit.shirt} 50%, ${p.kit.shorts} 50%)` }}
              />
              {p.icon} {p.name}
            </button>
          );
        })}
      </div>

      {/* Renk seçiciler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-black tracking-widest text-slate-500 mb-2">FORMA RENGİ</div>
          <div className="flex flex-wrap gap-2">
            {SHIRT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onSetKit({ shirt: c, shorts: current.shorts })}
                aria-label={`forma ${c}`}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${current.shirt === c && custom ? 'border-white scale-110' : 'border-black/40 hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black tracking-widest text-slate-500 mb-2">ŞORT RENGİ</div>
          <div className="flex flex-wrap gap-2">
            {SHORTS_COLORS.map(c => (
              <button
                key={c}
                onClick={() => onSetKit({ shirt: current.shirt, shorts: c })}
                aria-label={`şort ${c}`}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${current.shorts === c && custom ? 'border-white scale-110' : 'border-black/40 hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {custom && (
        <button
          onClick={() => onSetKit(null)}
          className="mt-4 text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2"
        >
          ↺ Stadyum renklerine geri dön
        </button>
      )}
    </div>
  );
};
