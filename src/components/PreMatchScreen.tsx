import React, { useState } from 'react';
import { GameState, Team, Weather } from '../types/game';
import { WEATHER_INFO, ROLE_NAMES } from '../data/constants';
import { TIER_INFO } from '../data/stars';
import { Stadium3D } from './Stadium3D';
import { stadiumCapacity } from '../utils/stadium';
import { lineupWarnings } from '../utils/lineup';
import { adaptationInfo } from '../utils/adaptation';
import { sfx } from '../utils/sound';

interface PreMatchScreenProps {
  gameState: GameState;
  opponent: Team;
  isHome: boolean;
  isCup: boolean;
  weather: Weather;
  onStart: () => void;
  onClose: () => void;
  onOpenTactics: () => void;
}

/** Maç öncesi taktik odası: rakip raporu, hava durumu, kadro uyarıları */
export const PreMatchScreen: React.FC<PreMatchScreenProps> = ({
  gameState, opponent, isHome, isCup, weather, onStart, onClose, onOpenTactics
}) => {
  const weatherInfo = WEATHER_INFO[weather] || WEATHER_INFO.cloudy;
  const warnings = lineupWarnings(gameState);
  const pmAvg = gameState.team11.reduce((a, p) => a + p.ovr, 0) / Math.max(1, gameState.team11.length);
  const pmChem = gameState.teamChemistry ?? 55;
  // 🧩 Uyum uyarıları: alışamamış yıldızlar düşük oynar
  gameState.team11
    .filter(p => !p.injured && !(p.suspension ?? 0))
    .forEach(p => {
      const info = adaptationInfo(p, pmAvg, pmChem);
      if (!info.adapted && info.penalty > 2) {
        warnings.push(`🧩 ${p.name} henüz uyum sağlayamadı (%${info.pct}) — sahada ~${Math.round(info.effective)} oynar`);
      }
    });

  const userOvr = Math.floor(
    gameState.team11.filter(p => !p.injured && !(p.suspension ?? 0))
      .reduce((a, p) => a + p.ovr, 0) / Math.max(1, gameState.team11.filter(p => !p.injured).length)
  );
  const oppOvr = opponent.ovr;
  const diff = userOvr - oppOvr;

  const sortedLeague = [...gameState.league].sort((a, b) => b.p - a.p || (b.gf - b.ga) - (a.gf - a.ga));
  const oppPosition = sortedLeague.findIndex(t => t.name === opponent.name) + 1;
  const userPosition = sortedLeague.findIndex(t => t.isUser) + 1;
  const form = gameState.matchHistory.slice(-5).reverse();
  const [showStadium, setShowStadium] = useState(false);

  const prediction = diff >= 6 ? { text: '🔥 Büyük favori biziz', color: 'text-emerald-400' }
    : diff >= 2 ? { text: '👍 Favori biziz', color: 'text-emerald-300' }
    : diff <= -6 ? { text: '😰 Çok zor maç', color: 'text-red-400' }
    : diff <= -2 ? { text: '⚠️ Rakip favori', color: 'text-amber-400' }
    : { text: '⚖️ Dengeli maç', color: 'text-slate-300' };

  const penaltyTaker = [...gameState.team11, ...gameState.bench].find(p => p.id === gameState.setPieceTakers?.penalty);
  const freekickTaker = [...gameState.team11, ...gameState.bench].find(p => p.id === gameState.setPieceTakers?.freekick);
  const captain = [...gameState.team11, ...gameState.bench].find(p => p.id === gameState.captainId);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-2xl bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-emerald-500/30 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-cyan-700 px-4 py-3 rounded-t-2xl flex items-center justify-between">
          <div>
            <div className="text-white font-black text-lg">
              {isCup ? '🏅 KUPA MAÇI' : `⚽ HAFTA ${gameState.week} MAÇI`}
            </div>
            <div className="text-emerald-100 text-xs">Takım otelde, son taktik konuşması öncesi</div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Matchup */}
        <div className="p-4">
          <div className="flex items-center justify-around bg-slate-900/50 rounded-2xl p-4 mb-4">
            <div className="text-center">
              <div className="text-4xl">{gameState.teamLogo}</div>
              <div className="text-white font-bold text-sm mt-1 max-w-[120px] truncate">{gameState.teamName}</div>
              <div className="text-emerald-400 text-xs">OVR {userOvr} • {userPosition}. sıra</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400">VS</div>
              <div className={`text-xs font-bold mt-1 ${isHome ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isHome ? '🏟️ İç Saha' : '🚌 Deplasman'}
              </div>
              <div className={`text-xs font-bold mt-1 ${prediction.color}`}>{prediction.text}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl">{opponent.logo}</div>
              <div className="text-white font-bold text-sm mt-1 max-w-[120px] truncate">{opponent.name}</div>
              <div className="text-slate-400 text-xs">OVR {oppOvr} • {oppPosition}. sıra</div>
            </div>
          </div>

          {/* Weather + board objective */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Hava Durumu</div>
              <div className="text-white font-bold">{weatherInfo.icon} {weatherInfo.label}</div>
              <div className="text-[11px] text-slate-400 mt-1">{weatherInfo.desc}</div>
              <div className="text-[11px] text-amber-300 mt-1">
                Gol etkisi: ×{weatherInfo.goalMult.toFixed(2)} • Sakatlık riski: ×{weatherInfo.injuryMult.toFixed(2)}
              </div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Yönetim & Sezon Hedefi</div>
              <div className="text-white font-bold text-sm">{gameState.seasonObjective}</div>
              <div className="text-[11px] text-slate-300 mt-1">Yönetim güveni: %{gameState.boardConfidence}</div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full ${gameState.boardConfidence >= 50 ? 'bg-emerald-500' : gameState.boardConfidence >= 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(3, gameState.boardConfidence)}%` }}
                />
              </div>
              {gameState.boardConfidence <= 25 && (
                <div className="text-[11px] text-red-400 mt-1 animate-pulse">⚠️ Koltuğun sallantıda — kazanmalısın!</div>
              )}
            </div>
          </div>

          {/* Scout report */}
          <div className="bg-slate-800/60 rounded-xl p-3 mb-4 border border-slate-700/50">
            <div className="text-xs text-emerald-400 font-bold mb-2">🕵️ Rakip Raporu</div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Oynanan</div>
                <div className="text-white font-bold">{opponent.o}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">G-B-M</div>
                <div className="text-white font-bold">{opponent.g}-{opponent.b}-{opponent.m}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Gol (A/Y)</div>
                <div className="text-white font-bold">{opponent.gf}/{opponent.ga}</div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <div className="text-slate-400">Puan</div>
                <div className="text-white font-bold">{opponent.p}</div>
              </div>
            </div>
            {isHome && gameState.stadium && (
              <div className="mt-2">
                <button
                  onClick={() => setShowStadium(v => !v)}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white"
                >
                  🏟️ {showStadium ? 'Stadyum turunu kapat' : 'Stadyumunu 3D gör (maç öncesi tur)'}
                </button>
                {showStadium && (
                  <div className="mt-2">
                    <Stadium3D
                      design={gameState.stadium.design}
                      capacity={stadiumCapacity(gameState)}
                      logo={gameState.teamLogo}
                      sponsorText={gameState.activeSponsor ? `${gameState.activeSponsor.name.toUpperCase()} • ` : 'RESMİ SPONSOR • '}
                      night={gameState.weather !== 'sunny'}
                      cinematic
                      height={220}
                    />
                  </div>
                )}
              </div>
            )}
            {opponent.keyPlayer && (
              <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg px-2.5 py-2 flex items-center justify-between">
                <div className="text-[11px] text-red-200">
                  <b>{TIER_INFO[opponent.keyPlayer.tier].icon} Yıldız oyuncu:</b> {opponent.keyPlayer.name}
                  <span className="text-slate-400"> ({ROLE_NAMES[opponent.keyPlayer.role]} • OVR {opponent.keyPlayer.ovr})</span>
                </div>
                <span className="text-[10px] bg-red-600/40 text-red-100 px-1.5 py-0.5 rounded">
                  {TIER_INFO[opponent.keyPlayer.tier].label}
                </span>
              </div>
            )}
            {form.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[11px] text-slate-400">Formumuz:</span>
                {form.map((m, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-black px-1.5 rounded ${
                      m.homeScore > m.awayScore ? 'bg-emerald-600/40 text-emerald-300'
                      : m.homeScore === m.awayScore ? 'bg-slate-600/50 text-slate-300'
                      : 'bg-red-600/40 text-red-300'
                    }`}
                  >
                    {m.homeScore}-{m.awayScore}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Squad status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <div className="text-xs text-emerald-400 font-bold mb-2">👥 Kadro Durumu</div>
              {warnings.length === 0 ? (
                <div className="text-[11px] text-emerald-300">✅ Kadro tam, sorun yok.</div>
              ) : (
                <ul className="space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-[11px] text-amber-300">{w}</li>
                  ))}
                </ul>
              )}
              <div className="text-[11px] text-slate-400 mt-2">
                Ortalama enerji: %{Math.floor(gameState.team11.reduce((a, p) => a + p.energy, 0) / Math.max(1, gameState.team11.length))} •
                Moral: %{Math.floor(gameState.team11.reduce((a, p) => a + p.morale, 0) / Math.max(1, gameState.team11.length))}
              </div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <div className="text-xs text-emerald-400 font-bold mb-2">🎯 Görevler</div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>🎽 Kaptan: <span className="text-white font-medium">{captain?.name ?? 'Belirlenmedi'}</span></div>
                <div>🥅 Penaltı: <span className="text-white font-medium">{penaltyTaker?.name ?? '—'}</span></div>
                <div>🎯 Frikik: <span className="text-white font-medium">{freekickTaker?.name ?? '—'}</span></div>
                <div>📋 Taktik: <span className="text-white font-medium">{gameState.tactics.formation} • {gameState.tactics.style}</span></div>
                <div>🏃 Antrenman odağı: <span className="text-white font-medium">{gameState.trainingFocus}</span></div>
              </div>
            </div>
          </div>

          {/* Squad preview */}
          <div className="bg-slate-800/60 rounded-xl p-3 mb-4 border border-slate-700/50 max-h-40 overflow-y-auto">
            <div className="text-xs text-emerald-400 font-bold mb-2">İlk 11</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {gameState.team11.map(p => (
                <div key={p.id} className="flex items-center justify-between text-[11px] bg-slate-700/30 rounded px-2 py-1">
                  <span className="text-white truncate">{p.name}</span>
                  <span className="text-slate-400 ml-1 shrink-0">
                    {ROLE_NAMES[p.role]} {p.ovr}
                    {p.injured && ' 🏥'}
                    {(p.suspension ?? 0) > 0 && ' 🟥'}
                    {!p.injured && !(p.suspension ?? 0) && adaptationInfo(p, pmAvg, pmChem).penalty > 2 && (
                      <span title="Takıma alışıyor"> 🧩</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => { sfx.whistle(); onStart(); }}
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 transition-all animate-cta-ring"
            >
              ⚽ MAÇI BAŞLAT
            </button>
            <button
              onClick={onOpenTactics}
              className="px-5 py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
            >
              📋 Taktik Değiştir
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all"
            >
              ✖ Vazgeç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
