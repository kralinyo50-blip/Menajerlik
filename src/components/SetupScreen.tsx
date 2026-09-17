import React, { useState, useEffect } from 'react';
import { LOGO_POOL } from '../data/constants';
import { DIFFICULTY_CONFIG } from '../data/achievements';
import { UPDATE_LOG, CURRENT_VERSION } from '../data/updateLog';
import { Difficulty } from '../types/game';

interface SetupScreenProps {
  onStart: (teamName: string, teamLogo: string, difficulty: Difficulty) => void;
  onLoad: () => boolean;
}

const TAG_STYLE: Record<string, string> = {
  'YENİ': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'DÜZELTME': 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  'İYİLEŞTİRME': 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  'BÜYÜK': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, onLoad }) => {
  const [teamName, setTeamName] = useState('');
  const [selectedLogo, setSelectedLogo] = useState(LOGO_POOL[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [isAnimating, setIsAnimating] = useState(false);
  const [step, setStep] = useState<'main' | 'difficulty'>('main');
  const [hasSave, setHasSave] = useState(false);
  const [expandedVer, setExpandedVer] = useState<string | null>(UPDATE_LOG[0]?.version ?? null);
  const [mobileLogOpen, setMobileLogOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);

  const tips = [
    '💡 Maç içinde penaltı/frikik çıkarsa sen kullanırsın — skora yazılır!',
    '🟨 3 sarı kart = 1 maç ceza. Cezalı oyuncular maç öncesi otomatik düzeltilir.',
    '🌧️ Hava durumu gol ve sakatlık oranlarını değiştirir — kadronu ona göre kur.',
    '🏢 Ofis sekmesinden sözleşmeleri yenile ve transfer tekliflerini değerlendir.',
    '🎽 Kaptan seç, güç bonusu kazan; duran top görevlilerini ayarla.',
    '⚖️ Kupa maçları berabere biterse uzatma ve penaltılar var!',
    '🏋️ Haftalık antrenman odağı genç oyuncuların gelişimini hızlandırır.',
    '👔 Yönetim güveni düşerse kovulursun — sonuçlara dikkat!',
  ];

  useEffect(() => {
    try {
      setHasSave(!!localStorage.getItem('ManagerPro2026_Save'));
    } catch {
      setHasSave(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 4000);
    return () => clearInterval(id);
  }, [tips.length]);

  const handleStart = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onStart(teamName.trim() || 'KaanSpor', selectedLogo, difficulty);
    }, 500);
  };

  const handleLoad = () => {
    const success = onLoad();
    if (!success) alert('Kayıtlı oyun bulunamadı!');
  };

  const UpdateLogPanel = ({ className = '' }: { className?: string }) => (
    <aside
      className={`flex flex-col bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="relative px-4 py-4 border-b border-slate-700/60 bg-gradient-to-r from-emerald-600/20 via-cyan-600/10 to-transparent">
        <div className="absolute top-2 right-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Canlı
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="text-sm font-black text-white tracking-wide">GELEN GÜNCELLEMELER</h2>
            <p className="text-[11px] text-slate-400">Update Log • v{CURRENT_VERSION}</p>
          </div>
        </div>
      </div>

      {/* Scroll list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[min(70vh,560px)] custom-scroll">
        {UPDATE_LOG.map((entry, idx) => {
          const open = expandedVer === entry.version;
          return (
            <div
              key={entry.version}
              className={`rounded-xl border transition-all duration-300 ${
                idx === 0
                  ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-slate-800/80 shadow-lg shadow-amber-500/5'
                  : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedVer(open ? null : entry.version)}
                className="w-full text-left p-3 flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TAG_STYLE[entry.tag]}`}>
                      {entry.tag}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400/90">v{entry.version}</span>
                    <span className="text-[10px] text-slate-500">• {entry.date}</span>
                    {idx === 0 && (
                      <span className="text-[9px] font-black text-black bg-amber-400 px-1.5 py-0.5 rounded animate-pulse">
                        YENİ
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white leading-snug">{entry.title}</div>
                </div>
                <span className={`text-slate-500 text-xs mt-1 transition-transform ${open ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {open && (
                <ul className="px-3 pb-3 space-y-1.5 border-t border-slate-700/40 pt-2">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                      <span className="text-emerald-400 flex-shrink-0 mt-0.5">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2.5 border-t border-slate-700/50 bg-slate-900/60 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
        <span>Son güncelleme: {UPDATE_LOG[0]?.date} • Manager Pro Ultimate</span>
        <span className="w-1 h-1 rounded-full bg-amber-400/60" />
        <span className="kaan-watermark text-[10px]">Made by Kaan</span>
      </div>
    </aside>
  );

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-opacity duration-500 ${
        isAnimating ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background — premium */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-emerald-500/18 rounded-full blur-3xl animate-aurora" />
        <div className="absolute -bottom-40 -left-20 w-[32rem] h-[32rem] bg-cyan-500/12 rounded-full blur-3xl animate-aurora" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/2 w-[28rem] h-[28rem] bg-amber-500/10 rounded-full blur-3xl animate-aurora" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        {/* Pitch lines decoration */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(16,185,129,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Mobile update log toggle */}
      <button
        type="button"
        onClick={() => setMobileLogOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 flex items-center gap-2 bg-slate-800/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl shadow-lg backdrop-blur"
      >
        📋 Güncellemeler
        <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">YENİ</span>
      </button>

      {/* Mobile drawer */}
      {mobileLogOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-[min(100%,340px)] h-full p-3 bg-slate-950/95">
            <div className="flex justify-end mb-2">
              <button type="button" onClick={() => setMobileLogOpen(false)} className="text-slate-400 text-2xl px-2">×</button>
            </div>
            <UpdateLogPanel className="h-[calc(100%-2rem)]" />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileLogOpen(false)} />
        </div>
      )}

      {/* Main layout */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] gap-4 lg:gap-6 items-stretch">
          {/* LEFT — Update Log (desktop) */}
          <div className="hidden lg:block self-center">
            <UpdateLogPanel className="h-full min-h-[520px]" />
          </div>

          {/* CENTER — Setup card */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-lg bg-slate-800/90 backdrop-blur-xl p-6 sm:p-10 rounded-3xl shadow-2xl border border-slate-700/60 relative overflow-hidden premium-border glass-strong">
              {/* Shine */}
              <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl" />

              {/* Logo */}
              <div className="text-center mb-6 sm:mb-8 relative">
                <div className="relative inline-block mb-3">
                  <div className="text-6xl sm:text-7xl animate-bounce drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">⚽</div>
                  <div className="absolute -top-1 -right-3 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-md shadow rotate-12">
                    v{CURRENT_VERSION}
                  </div>
                </div>
                <h1
                  className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-400"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  MANAGER PRO 2026
                </h1>
                <p className="text-slate-400 mt-1.5 text-sm">Ultimate Football Management</p>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-400/50" />
                  <span className="kaan-watermark text-[11px] tracking-[0.18em] kaan-glow">MADE BY KAAN</span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-400/50" />
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="bg-amber-500/15 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/30">
                    ✨ ULTIMATE EDITION
                  </span>
                  <span className="bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                    🎮 Oyun İçi Mini Oyunlar
                  </span>
                  <span className="bg-cyan-500/15 text-cyan-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-cyan-500/30">
                    ☀️ BÜTÜN YAZ BOYUNCA GELİŞTİRİLDİ
                  </span>
                </div>
              </div>

              {/* Rotating tip */}
              <div className="mb-5 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2.5 text-center min-h-[42px] flex items-center justify-center">
                <p key={tipIdx} className="text-xs text-cyan-200/90 animate-fade-in">
                  {tips[tipIdx]}
                </p>
              </div>

              {step === 'main' && (
                <>
                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                      Kulüp Adı
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      maxLength={18}
                      placeholder="Örn: KaanSpor, Yıldız FK..."
                      className="w-full px-4 py-3.5 bg-slate-900/60 border border-slate-600 rounded-xl text-white text-lg text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="mb-7">
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                      Kulüp Amblemi
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {LOGO_POOL.map((logo) => (
                        <button
                          key={logo}
                          type="button"
                          onClick={() => setSelectedLogo(logo)}
                          className={`text-2xl sm:text-3xl p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${
                            selectedLogo === logo
                              ? 'bg-emerald-500/30 border-2 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/25'
                              : 'bg-slate-700/40 border border-slate-600 hover:bg-slate-600/50 hover:scale-105'
                          }`}
                        >
                          {logo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('difficulty')}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-lg rounded-xl shadow-lg shadow-emerald-500/30 transform hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 animate-pulse-glow"
                  >
                    🏆 KARİYERE BAŞLA
                  </button>

                  <button
                    type="button"
                    onClick={handleLoad}
                    className={`w-full mt-3 py-3 font-medium rounded-xl border transition-all duration-300 ${
                      hasSave
                        ? 'bg-slate-700/80 hover:bg-slate-600 text-white border-emerald-500/40 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800/60 backdrop-blur-xl text-slate-400 border-slate-700 hover:bg-slate-700/50'
                    }`}
                  >
                    📂 Kayıtlı Oyunu Yükle
                    {hasSave && (
                      <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                        Kayıt var
                      </span>
                    )}
                  </button>

                  <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
                    {[
                      ['🎯', 'Maç içi penaltı'],
                      ['🚌', 'Otobüs yolculuğu'],
                      ['🕵️', 'Sabotaj olayları'],
                      ['🏅', '18 Başarım'],
                      ['📺', 'Basın toplantısı'],
                      ['🏟️', 'Tesis & mağaza'],
                    ].map(([icon, label]) => (
                      <div
                        key={label}
                        className="flex items-center gap-1.5 bg-slate-900/40 border border-slate-700/40 px-2.5 py-2 rounded-lg hover:border-emerald-500/30 transition-colors"
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {step === 'difficulty' && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('main')}
                    className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1"
                  >
                    ← Geri
                  </button>
                  <h2 className="text-xl font-black text-white text-center mb-1">Zorluk Seviyesi</h2>
                  <p className="text-slate-400 text-sm text-center mb-5">Kariyerini nasıl şekillendirmek istersin?</p>

                  <div className="space-y-2.5 mb-6">
                    {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((key) => {
                      const cfg = DIFFICULTY_CONFIG[key];
                      const selected = difficulty === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDifficulty(key)}
                          className={`w-full p-3.5 rounded-xl border-2 transition-all text-left ${
                            selected
                              ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/15 scale-[1.01]'
                              : 'border-slate-600/80 bg-slate-900/40 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{cfg.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-white flex items-center gap-2">
                                {cfg.label}
                                {key === 'normal' && (
                                  <span className="text-[9px] bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded">ÖNERİLEN</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{cfg.desc}</div>
                              <div className="text-xs text-amber-400/90 mt-1 font-medium">
                                Başlangıç kasası: ${cfg.startingBudget.toLocaleString()}
                              </div>
                            </div>
                            {selected && <span className="text-emerald-400 text-xl font-black">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleStart}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black text-lg rounded-xl shadow-lg shadow-orange-500/25 transform hover:scale-[1.02] transition-all"
                  >
                    🚀 {DIFFICULTY_CONFIG[difficulty].label} Modda Başla
                  </button>
                  <p className="text-center text-[11px] text-slate-500 mt-3">
                    Seçilen amblem: <span className="text-2xl align-middle">{selectedLogo}</span>
                    {' '}• {teamName.trim() || 'KaanSpor'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom version bar — Made by Kaan */}
      <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-slate-500 pointer-events-none flex items-center justify-center gap-2">
        <span>Manager Pro 2026 Ultimate • v{CURRENT_VERSION}</span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span className="kaan-watermark text-[10px]">Made by Kaan</span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span className="text-amber-300/70">☀️ Bütün Yaz Boyunca Geliştirildi</span>
      </div>
    </div>
  );
};
