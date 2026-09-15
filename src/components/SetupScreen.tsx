import React, { useState } from 'react';
import { LOGO_POOL } from '../data/constants';

interface SetupScreenProps {
  onStart: (teamName: string, teamLogo: string) => void;
  onLoad: () => boolean;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart, onLoad }) => {
  const [teamName, setTeamName] = useState('');
  const [selectedLogo, setSelectedLogo] = useState(LOGO_POOL[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleStart = () => {
    if (!teamName.trim()) {
      setTeamName('KaanSpor');
    }
    setIsAnimating(true);
    setTimeout(() => {
      onStart(teamName.trim() || 'KaanSpor', selectedLogo);
    }, 500);
  };

  const handleLoad = () => {
    const success = onLoad();
    if (!success) {
      alert('Kayıtlı oyun bulunamadı!');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 bg-slate-800/90 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">⚽</div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-['Orbitron']">
            MANAGER PRO 2026
          </h1>
          <p className="text-slate-400 mt-2">Ultimate Football Management Experience</p>
        </div>

        {/* Team Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Kulüp Adı</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={18}
            placeholder="Kulüp adını girin..."
            className="w-full px-4 py-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-lg text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Logo Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3">Kulüp Amblemi</label>
          <div className="grid grid-cols-4 gap-3">
            {LOGO_POOL.map((logo) => (
              <button
                key={logo}
                onClick={() => setSelectedLogo(logo)}
                className={`text-3xl p-3 rounded-xl transition-all duration-300 transform hover:scale-110 ${
                  selectedLogo === logo
                    ? 'bg-emerald-500/30 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-700/50 border border-slate-600 hover:bg-slate-600/50'
                }`}
              >
                {logo}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-500/30 transform hover:scale-[1.02] transition-all duration-300"
        >
          🏆 KARİYERE BAŞLA
        </button>

        {/* Load Button */}
        <button
          onClick={handleLoad}
          className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl border border-slate-600 transition-all duration-300"
        >
          📂 Kayıtlı Oyunu Yükle
        </button>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-2 rounded-lg">
            <span>📈</span> Gelişmiş Transfer
          </div>
          <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-2 rounded-lg">
            <span>⚔️</span> Taktik Sistemi
          </div>
          <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-2 rounded-lg">
            <span>🏟️</span> Tesis Yönetimi
          </div>
          <div className="flex items-center gap-2 bg-slate-700/30 px-3 py-2 rounded-lg">
            <span>🏆</span> Kupa Turnuvaları
          </div>
        </div>
      </div>
    </div>
  );
};
