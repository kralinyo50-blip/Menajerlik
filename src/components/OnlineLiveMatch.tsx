import { useEffect, useState } from 'react';
import type { LiveMatch, OnlineClub } from '../types/online';
import type { OnlineLeagueController } from '../hooks/useOnlineLeague';
import { OnlineMatchPitch } from './OnlineMatchPitch';

const styles: Record<OnlineClub['style'], string> = { balanced: 'Dengeli', attack: 'Hücum', defense: 'Savunma', possession: 'Topa sahip olma' };
const phases = { first: 'İlk yarı', second: 'İkinci yarı', halftime: 'Devre arası', paused: 'Ortak mola', finished: 'Maç sonu' };
const input = 'w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white';
const btn = 'rounded-xl px-4 py-2 text-sm font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed';
const icons: Record<string, string> = { goal: '⚽', substitution: '🔄', yellow: '🟨', red: '🟥', pause: '⏸', resume: '▶', halftime: '⏱', fulltime: '🏁', tactic: '📋', shot: '↗', save: '🧤', corner: '🚩' };

export function OnlineLiveMatch({ match, online }: { match: LiveMatch; online: OnlineLeagueController }) {
  const { room, session, busy, connection, action, serverTime } = online;
  const mySide = match.homeId === session?.memberId ? 'home' : 'away';
  const team = match[mySide];
  const opponent = match[mySide === 'home' ? 'away' : 'home'];
  const [style, setStyle] = useState(team.style);
  const [formation, setFormation] = useState(team.formation);
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [showOpponent, setShowOpponent] = useState(false);
  useEffect(() => { setStyle(team.style); setFormation(team.formation); }, [team.style, team.formation]);
  const connected = connection === 'connected';
  const canManage = connected && !busy && match.phase !== 'finished';
  const secondsLeft = Math.max(0, Math.ceil(((match.phaseEndsAt || 0) - serverTime) / 1000));
  const send = (command: string, extra: Record<string, unknown> = {}) => {
    const commandId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    void action('live-command', { command, commandId, matchId: match.id, week: match.week, season: room?.live?.season, ...extra });
  };
  const canSub = team.lineup.some(p => p.id === outId && !p.sentOff) && team.bench.some(p => p.id === inId);
  const listed = showOpponent ? opponent : team;

  return <section className="space-y-4" data-testid="live-match" data-match-id={match.id} data-frame={match.frame}>
    <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 to-slate-900 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h3 className="text-xs tracking-widest font-bold text-emerald-300">{match.phase === 'finished' ? 'ORTAK MAÇ SONUCU' : '● CANLI ORTAK MAÇ'} · {match.week}. HAFTA</h3>
        <span className="text-xs text-slate-400">{phases[match.phase]}{secondsLeft > 0 && ` · ${secondsLeft} sn`}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-center">
        <div><div className="text-3xl mb-2">{match.home.logo}</div><h4 className="font-black text-sky-200 text-sm sm:text-lg">{match.home.name}</h4><span className="text-[10px] text-slate-400">EV SAHİBİ {mySide === 'home' && '· SEN'}</span></div>
        <div><strong data-testid="live-score" className="text-4xl sm:text-5xl text-white font-black tabular-nums">{match.home.score} : {match.away.score}</strong><div data-testid="live-minute" className="text-emerald-300 font-mono text-xl mt-2">{match.minute}′</div></div>
        <div><div className="text-3xl mb-2">{match.away.logo}</div><h4 className="font-black text-rose-200 text-sm sm:text-lg">{match.away.name}</h4><span className="text-[10px] text-slate-400">DEPLASMAN {mySide === 'away' && '· SEN'}</span></div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-center text-slate-400">
        <div><span className="block text-white font-bold mb-1">{match.possession}% — {100-match.possession}%</span>Topa sahip olma</div>
        <div><span className="block text-white font-bold mb-1">{match.home.stats.shots} — {match.away.stats.shots}</span>Şut</div>
        <div><span className="block text-white font-bold mb-1">{match.home.stats.onTarget} — {match.away.stats.onTarget}</span>İsabetli şut</div>
      </div>
      {match.phase === 'paused' && <p role="status" className="text-amber-200 text-sm mt-4 text-center">{match.pausedBy === session?.memberId ? 'Sen mola aldın.' : 'Rakip mola aldı.'} İkinizde de saat durdu; süre bitince otomatik devam eder.</p>}
      {match.phase === 'halftime' && <p role="status" className="text-amber-200 text-sm mt-4 text-center">Devre arası: iki menajer de taktik ve oyuncu değişikliği yapabilir. İkinci yarı otomatik başlayacak.</p>}
      {match.phase === 'finished' && <p role="status" className="text-emerald-200 text-sm mt-4 text-center">{room?.live?.settled ? 'Sonuçlar ortak puan tablosuna işlendi.' : 'Maçın bitti. Diğer lig maçlarının tamamlanması bekleniyor.'}</p>}
    </div>

    <OnlineMatchPitch match={match} connected={connected} />

    <div className="grid lg:grid-cols-2 gap-4">
      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-4">
        <div className="flex justify-between gap-3"><h4 className="text-white font-bold">📋 Maçı yönet</h4><span className="text-xs text-slate-400">{team.name}</span></div>
        <fieldset disabled={!canManage} className="space-y-3 disabled:opacity-60">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">Oyun stili<select aria-label="Canlı oyun stili" value={style} onChange={e => setStyle(e.target.value as OnlineClub['style'])} className={`${input} mt-1`}>{Object.entries(styles).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></label>
            <label className="text-xs text-slate-400">Diziliş<select aria-label="Canlı diziliş" value={formation} onChange={e => setFormation(e.target.value)} className={`${input} mt-1`}>{['4-4-2','4-3-3','3-5-2'].map(f => <option key={f}>{f}</option>)}</select></label>
          </div>
          <button className={btn} onClick={() => send('tactic', { style, formation })}>Taktiği uygula</button>
          <p className="text-xs text-slate-500">Sunucudaki taktiğin: {styles[team.style]} · {team.formation}. Rakibin: {styles[opponent.style]} · {opponent.formation}.</p>
          <div className="border-t border-slate-700 pt-3 space-y-3">
            <p className="text-sm font-bold text-white">Oyuncu değişikliği <span className="text-emerald-300">{team.substitutions}/5</span></p>
            <select className={input} aria-label="Çıkacak oyuncu" value={outId} onChange={e => setOutId(e.target.value)}><option value="">Çıkacak oyuncuyu seç</option>{team.lineup.filter(p => !p.sentOff).map(p => <option key={p.id} value={p.id}>{p.name} · {p.role} · %{Math.round(p.energy)} enerji</option>)}</select>
            <select className={input} aria-label="Girecek oyuncu" value={inId} onChange={e => setInId(e.target.value)}><option value="">Yedek oyuncuyu seç</option>{team.bench.map(p => <option key={p.id} value={p.id}>{p.name} · {p.role} · {p.ovr} OVR</option>)}</select>
            <button className={btn} disabled={!canSub || team.substitutions >= 5} onClick={() => send('substitute', {outId,inId})}>Değişikliği yap</button>
            <p className="text-xs text-slate-500">Değişiklik ikinize de yansır; çıkan oyuncu tekrar giremez. Menü açılması saati durdurmaz; istersen ortak mola al.</p>
          </div>
          <div className="border-t border-slate-700 pt-3">
            {match.phase === 'paused' && match.pausedBy === session?.memberId ? <button className={btn} onClick={() => send('resume')}>▶ Ortak maça devam et</button> : <button className="rounded-xl border border-amber-500/40 text-amber-200 px-4 py-2 text-sm disabled:opacity-40" disabled={!['first','second'].includes(match.phase) || team.pauses >= 2} onClick={() => send('pause')}>⏸ 20 sn ortak mola ({2-team.pauses} hak)</button>}
          </div>
        </fieldset>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
        <h4 className="text-white font-bold mb-4">📡 Ortak maç anlatımı</h4>
        <div data-testid="live-events" className="max-h-[430px] overflow-y-auto space-y-2">
          {[...match.events].reverse().map(e => <div key={e.id} className={`flex gap-3 rounded-lg p-3 text-sm ${e.type === 'goal' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30' : 'bg-slate-950/40 text-slate-300'}`}><span className="text-slate-500 font-mono shrink-0 w-7">{e.minute}′</span><p>{icons[e.type] || '•'} {e.text}</p></div>)}
        </div>
      </section>
    </div>

    <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex justify-between gap-3 mb-3"><h4 className="text-white font-bold">Sahadaki kadro · {listed.name}</h4><button className="text-sm text-emerald-300 underline" onClick={() => setShowOpponent(!showOpponent)}>{showOpponent ? 'Kendi kadrom' : 'Rakibin kadrosu'}</button></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{listed.lineup.map((p,i) => <div key={p.id} className={`text-xs p-2 rounded-lg bg-slate-950/40 ${p.sentOff ? 'text-red-300 line-through' : 'text-slate-300'}`}><span className="text-slate-500 mr-2">{i+1}.</span>{p.name} {p.sentOff ? '🟥' : p.yellow ? '🟨' : ''}<span className="block text-slate-500 mt-1">{p.role} · {p.ovr} OVR · %{Math.round(p.energy)} enerji</span></div>)}</div>
    </section>
    <p className="text-xs text-slate-500">Maç yaklaşık 5 dakika sürer. Dakika, skor, olaylar, oyuncular ve top sunucudan canlı gelir. Bağlantın kesilse de maç sunucuda devam eder; geri dönünce güncel duruma bağlanırsın.</p>
  </section>;
}
