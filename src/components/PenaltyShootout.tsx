import React, { useState } from 'react';
import { sfx } from '../utils/sound';

type Dir = 'left' | 'center' | 'right';
const DIRS: { id: Dir; label: string; icon: string }[] = [
  { id: 'left', label: 'Sol', icon: '⬅️' },
  { id: 'center', label: 'Orta', icon: '⬆️' },
  { id: 'right', label: 'Sağ', icon: '➡️' },
];

interface PenaltyShootoutProps {
  userTeamName: string;
  opponentName: string;
  onFinish: (winner: 'user' | 'opponent', userPens: number, oppPens: number) => void;
}

/** Kupa maçlarında beraberlik bozulmazsa: interaktif penaltı atışları */
export const PenaltyShootout: React.FC<PenaltyShootoutProps> = ({ userTeamName, opponentName, onFinish }) => {
  const [round, setRound] = useState(0);            // tamamlanan tur
  const [userPens, setUserPens] = useState(0);
  const [oppPens, setOppPens] = useState(0);
  const [turn, setTurn] = useState<'user' | 'opponent'>('user');
  const [log, setLog] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const maxRounds = 5;
  const isSuddenDeath = round >= maxRounds;
  const kicksTaken = round;

  const checkFinish = (u: number, o: number, roundNo: number) => {
    if (roundNo < maxRounds) {
      const remaining = maxRounds - roundNo;
      if (u > o + remaining || o > u + remaining) {
        finish(u, o);
      }
      return;
    }
    if (u !== o) finish(u, o);
  };

  const finish = (u: number, o: number) => {
    setDone(true);
    const winner: 'user' | 'opponent' = u > o ? 'user' : 'opponent';
    (winner === 'user' ? sfx.win : sfx.lose)();
    setTimeout(() => onFinish(winner, u, o), 1600);
  };

  const takeUserKick = (dir: Dir) => {
    if (busy || done || turn !== 'user') return;
    setBusy(true);
    const keeperDir = DIRS[Math.floor(Math.random() * 3)].id;
    const saved = keeperDir === dir ? Math.random() < 0.55 : Math.random() < 0.06;
    const scored = !saved;
    const u = userPens + (scored ? 1 : 0);
    setUserPens(u);
    (scored ? sfx.goal : sfx.save)();
    const line = scored
      ? `⚽ ${userTeamName}: GOL! (${dir === 'left' ? 'sol' : dir === 'center' ? 'orta' : 'sağ'})`
      : keeperDir === dir
      ? `🧤 ${userTeamName}: Kaleci köşeyi bildi — KURTARDI!`
      : `❌ ${userTeamName}: Direkten döndü!`;
    setLog(prev => [...prev, line]);
    setFeedback(line);

    setTimeout(() => {
      setBusy(false);
      setFeedback(null);
      setTurn('opponent');
      // Rakip atışına geçerken erken bitiş kontrolü
      if (kicksTaken + 1 >= maxRounds) checkFinish(u, oppPens, kicksTaken + 1);
    }, 900);
  };

  const takeOpponentKick = (diveDir: Dir) => {
    if (busy || done || turn !== 'opponent') return;
    setBusy(true);
    const shooterDir = DIRS[Math.floor(Math.random() * 3)].id;
    const saved = shooterDir === diveDir ? Math.random() < 0.68 : Math.random() < 0.05;
    const scored = !saved;
    const o = oppPens + (scored ? 1 : 0);
    setOppPens(o);
    (scored ? sfx.conceded : sfx.save)();
    const line = scored
      ? `😖 ${opponentName}: GOL (${shooterDir === 'left' ? 'sol' : shooterDir === 'center' ? 'orta' : 'sağ'})`
      : `🧤 KALECİ KURTARDI! ${opponentName} kaçırdı!`;
    setLog(prev => [...prev, line]);
    setFeedback(line);

    const newRound = round + 1;
    setTimeout(() => {
      setBusy(false);
      setFeedback(null);
      setRound(newRound);
      setTurn('user');
      checkFinish(userPens, o, newRound);
    }, 900);
  };

  const remainingText = isSuddenDeath ? 'ANI ÖLÜM' : `${maxRounds - round} atış kaldı`;

  return (
    <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-amber-500/40 p-5">
        <div className="text-center mb-4">
          <div className="text-2xl font-black text-amber-400">PENALTI ATIŞLARI</div>
          <div className="text-xs text-slate-400 mt-1">{remainingText} • Tur {Math.min(round + 1, maxRounds)}</div>
        </div>

        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-4xl font-black text-emerald-400">{userPens}</div>
            <div className="text-xs text-slate-300 truncate max-w-[120px]">{userTeamName}</div>
          </div>
          <div className="text-2xl text-slate-500">-</div>
          <div className="text-center">
            <div className="text-4xl font-black text-red-400">{oppPens}</div>
            <div className="text-xs text-slate-300 truncate max-w-[120px]">{opponentName}</div>
          </div>
        </div>

        {feedback && (
          <div className="text-center text-sm font-bold text-amber-300 bg-amber-500/10 rounded-lg py-2 mb-3 animate-fade-in">
            {feedback}
          </div>
        )}

        {!done && (
          <div className="mb-4">
            <div className="text-center text-sm text-white font-medium mb-2">
              {turn === 'user' ? '⚽ Şut yönünü seç' : '🧤 Kaleci olarak köşe seç'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DIRS.map(d => (
                <button
                  key={d.id}
                  disabled={busy}
                  onClick={() => (turn === 'user' ? takeUserKick(d.id) : takeOpponentKick(d.id))}
                  className="py-4 rounded-xl bg-slate-700/60 hover:bg-emerald-600/50 disabled:opacity-40 text-white font-bold transition-all"
                >
                  <div className="text-2xl">{d.icon}</div>
                  <div className="text-xs mt-1">{d.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-black/50 rounded-xl p-3 h-32 overflow-y-auto text-xs font-mono space-y-1">
          {log.length === 0 && <div className="text-slate-500">Penaltılar başlıyor...</div>}
          {log.map((l, i) => (
            <div key={i} className="text-slate-200">{l}</div>
          ))}
        </div>

        {done && (
          <div className="text-center mt-4 text-lg font-black text-amber-400 animate-pulse">
            {userPens > oppPens ? '🎉 TUR ATLADIN!' : '😢 ELENDİN'}
          </div>
        )}
      </div>
    </div>
  );
};
