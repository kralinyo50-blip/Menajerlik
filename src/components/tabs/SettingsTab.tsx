import React, { useState } from 'react';
import { GameState } from '../../types/game';
import { useGraphicsSettings, cachedHardware, scoreToTier } from '../../hooks/useGraphicsSettings';
import {
  GraphicsSettings as GfxSettings, QualityTier, TIER_INFO, PRESETS,
} from '../../utils/graphics';
import { isSoftwareWebGL } from '../../utils/webgl';

interface Props {
  gameState: GameState;
  onToggleSound: () => void;
}

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-700/40 last:border-0">
    <div className="min-w-0">
      <div className="text-sm font-bold text-white">{label}</div>
      {hint && <div className="text-[11px] text-slate-400 leading-snug">{hint}</div>}
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button
    onClick={() => onChange(!on)}
    className={`relative w-12 h-7 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}
    aria-pressed={on}
  >
    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
  </button>
);

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      active ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/70'
    }`}
  >
    {children}
  </button>
);

/**
 * 🔧 Ayarlar — PC donanımını otomatik algılar ve en uygun grafik profilini kurar.
 * "Grafikleri kısılmadan" akıcılık: Uyarlanabilir Çözünürlük fps düşünce yalnızca
 * piksel sayısını kısar; modeller, dokular, gölgeler ve efektler tam kalır.
 */
export const SettingsTab: React.FC<Props> = ({ gameState, onToggleSound }) => {
  const { settings, setSettings, setTier, benchmark } = useGraphicsSettings();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const hw = cachedHardware();

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    const [bench] = await Promise.all([
      benchmark(),
      new Promise(r => setTimeout(r, 400)), // UI nefes alabilsin
    ]);
    const info = cachedHardware();
    const tier = isSoftwareWebGL() ? 'low' as QualityTier : scoreToTier(bench.score || info.score || 0);
    setTier(tier);
    setSettings({ autoTuned: true });
    setScanning(false);
    setScanResult(
      `✅ Tara tamamlandı: GPU testi ${bench.fps > 0 ? `${bench.fps} FPS (skor ${bench.score})` : 'yapılamadı'} → ${TIER_INFO[tier].label} profil kuruldu.`
    );
  };

  const patchPreset = (p: Partial<typeof PRESETS.ultra>) => setSettings(p as Partial<GfxSettings>);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-2xl p-6 border border-cyan-500/30">
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">🔧 Ayarlar & Performans</h2>
        <p className="text-slate-400 mt-1 text-sm">
          PC'niz otomatik algılanır ve size en uygun grafik profili kurulur. <b className="text-emerald-300">Uyarlanabilir Çözünürlük</b> sayesinde
          oyun eski bir Intel i3'te bile akıcı koşar — 3D modeller, tribünler ve efektler tam gücünde kalır.
        </p>
      </div>

      {/* Donanım kartı */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">💻 Algılanan Donanım</h3>
          <button
            onClick={runScan}
            disabled={scanning}
            className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
              scanning
                ? 'bg-slate-700 text-slate-400 cursor-wait'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25'
            }`}
          >
            {scanning ? '🔍 Taranıyor… (GPU testi)' : '🚀 PC\'imi Tara & Otomatik Ayarla'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3">
            <div className="text-slate-400 text-[10px] tracking-wider font-bold">GPU</div>
            <div className="text-white font-bold mt-0.5 break-words leading-tight">{hw.gpu}</div>
            {hw.softwareWebGL && <div className="text-red-300 text-[10px] mt-1">⚠️ Yazılımsal WebGL — 3D sınırlı</div>}
          </div>
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3">
            <div className="text-slate-400 text-[10px] tracking-wider font-bold">CPU Çekirdeği</div>
            <div className="text-white font-bold mt-0.5">{hw.cores} çekirdek</div>
            <div className="text-slate-500 text-[10px]">{hw.memoryGB ? `RAM (tarayıcı raporu): ~${hw.memoryGB} GB` : 'RAM bilgisi tarayıcıdan gelmiyor'}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3">
            <div className="text-slate-400 text-[10px] tracking-wider font-bold">Cihaz / Ekran</div>
            <div className="text-white font-bold mt-0.5">{hw.isMobile ? '📱 Mobil / Taşınabilir' : '🖥️ Masaüstü'}</div>
            <div className="text-slate-500 text-[10px]">WebGL2: {hw.webgl2 ? '✅' : 'WebGL 1'} • DPR {(window.devicePixelRatio || 1).toFixed(2)}×</div>
          </div>
        </div>
        {scanResult && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 font-bold">{scanResult}</div>
        )}
        {settings.autoTuned && !scanResult && (
          <div className="mt-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-[11px] text-cyan-200">
            🤖 Bu profil <b>otomatik algılama</b> ile kuruldu. Değiştirmekten çekinmeyin — seçiminiz kaydedilir.
          </div>
        )}
      </div>

      {/* Kalite profili */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5">
        <h3 className="text-sm font-black text-white mb-1">🎚️ Kalite Profili</h3>
        <p className="text-[11px] text-slate-400 mb-4">Hazır profiller tek tıkla: çözünürlük ölçeği, gölge, anti-alias, tribün ve efekt dengesi.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {(Object.keys(TIER_INFO) as QualityTier[]).map(t => {
            const info = TIER_INFO[t];
            const active = settings.tier === t;
            return (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                  active
                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 shadow-lg shadow-emerald-500/20'
                    : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-500'
                }`}
              >
                <div className="text-2xl">{info.icon}</div>
                <div className="text-sm font-black text-white mt-1">{info.label}{active && <span className="ml-1.5 text-[10px] text-emerald-300">• AKTİF</span>}</div>
                <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{info.desc}</div>
                <div className="mt-1.5 text-[9px] text-slate-500 font-mono">
                  ×{PRESETS[t].renderScale} ölçek • {PRESETS[t].shadows ? 'gölge' : 'gölgesiz'} • {PRESETS[t].antialias ? 'AA' : 'AA yok'} • tribün %{Math.round(PRESETS[t].crowdDensity * 100)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ayrıntılı ayarlar */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5">
        <h3 className="text-sm font-black text-white mb-2">🎛️ Ayrıntılı Ayarlar</h3>
        <Row label="Çözünürlük Ölçeği" hint="Render pikselleri. 1.0 = doğal keskinlik; eski PC'de 0.8 akıcılığı ciddi artırır.">
          <Pill active={settings.renderScale <= 0.7} onClick={() => patchPreset({ renderScale: 0.7 })}>%70</Pill>
          <Pill active={settings.renderScale > 0.7 && settings.renderScale <= 1.0} onClick={() => patchPreset({ renderScale: 1.0 })}>%100</Pill>
          <Pill active={settings.renderScale > 1.0 && settings.renderScale <= 1.25} onClick={() => patchPreset({ renderScale: 1.25 })}>%125</Pill>
          <Pill active={settings.renderScale > 1.25} onClick={() => patchPreset({ renderScale: 1.5 })}>%150</Pill>
        </Row>
        <Row label="Gölgeler" hint="Gerçek zamanlı gölge haritaları. Kapatmak GPU yükünü belirgin azaltır (maç gölgeleri zaten 1 kez pişirilir).">
          <Toggle on={settings.shadows} onChange={v => setSettings({ shadows: v })} />
        </Row>
        <Row label="Anti-Aliasing" hint="Kenar yumuşatma. Değişiklik 3D sahneyi bir kez yeniden kurar.">
          <Toggle on={settings.antialias} onChange={v => setSettings({ antialias: v })} />
        </Row>
        <Row label="Tribün Yoğunluğu" hint="Seyirci kalabalığı. Sahne mimarisi aynı kalır, insan sayısı ölçeklenir.">
          <input
            type="range" min={25} max={100} step={5} value={Math.round(settings.crowdDensity * 100)}
            onChange={e => setSettings({ crowdDensity: Number(e.target.value) / 100 })}
            className="w-36 accent-emerald-500"
          />
          <span className="text-xs font-bold text-emerald-300 w-10 text-right">%{Math.round(settings.crowdDensity * 100)}</span>
        </Row>
        <Row label="Partiküller" hint="Yağmur, kar, konfeti gibi hava/efekt parçacıkları.">
          <Toggle on={settings.particles} onChange={v => setSettings({ particles: v })} />
        </Row>
        <Row label="FPS Sınırı" hint="Sınırsız = VSync'e kadar. 60 sabitleme dizüstülerde ısınmayı azaltır.">
          <Pill active={settings.fpsCap === 0} onClick={() => setSettings({ fpsCap: 0 })}>Sınırsız</Pill>
          <Pill active={settings.fpsCap === 120} onClick={() => setSettings({ fpsCap: 120 })}>120</Pill>
          <Pill active={settings.fpsCap === 60} onClick={() => setSettings({ fpsCap: 60 })}>60</Pill>
          <Pill active={settings.fpsCap === 30} onClick={() => setSettings({ fpsCap: 30 })}>30</Pill>
        </Row>
        <Row label="Uyarlanabilir Çözünürlük" hint="FPS düşünce oyun kendiliğinden render ölçeğini kısar, toparlanınca geri açar. Grafik setleri hiç kısılmaz — önerilir.">
          <Toggle on={settings.adaptiveResolution} onChange={v => setSettings({ adaptiveResolution: v })} />
        </Row>
        <Row label="FPS Göstergesi" hint="Ekranın köşesinde anlık FPS ve çözünürlük ölçeğini göster.">
          <Toggle on={settings.showFps} onChange={v => setSettings({ showFps: v })} />
        </Row>
      </div>

      {/* Diğer ayarlar */}
      <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5">
        <h3 className="text-sm font-black text-white mb-2">🔊 Genel</h3>
        <Row label="Ses Efektleri" hint="Düdük, gol, kart sesleri.">
          <Toggle on={gameState.soundOn !== false} onChange={onToggleSound} />
        </Row>
        <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          ℹ️ Ayarlar tarayıcına kaydedilir ve tüm 3D sahnelerde (maç, stadyum, antrenman kompleksi, hayat) anında geçerlidir.
          Zayıf bir GPU tespit edilirse maç motoru otomatik olarak akıcı 2D sahaya geçer; maç sonucu hiç etkilenmez.
        </div>
      </div>
    </div>
  );
};
