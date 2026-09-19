import { useState } from 'react';
import type { GameState, Tactics } from '../types/game';
import { ROLE_NAMES } from '../data/constants';

interface Props {
  gameState: GameState;
  locked: boolean;
  onSwap: (outId: number, inId: number) => void;
  onTactics: (changes: Partial<Tactics>) => void;
  onFormation: (formation: string) => void;
  onBack: () => void;
}

export function OnlineTeamPreparation({ gameState, locked, onSwap, onTactics, onFormation, onBack }: Props) {
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const out = gameState.team11.find(p => String(p.id) === outId);
  const incoming = gameState.bench.find(p => String(p.id) === inId);
  const compatible = !!out && !!incoming && (out.role === 'KL') === (incoming.role === 'KL');
  const avg = Math.round(gameState.team11.reduce((sum, p) => sum + p.ovr, 0) / gameState.team11.length);
  const select = 'mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 text-white px-3 py-3 text-sm';
  return <section className="max-w-5xl mx-auto space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-cyan-300 mb-2">ONLINE TAKIMIN</p><h1 className="text-2xl font-black text-white">{gameState.teamLogo} Kadro & Taktik</h1></div><div className="text-right"><strong className="text-3xl text-cyan-300">{avg}</strong><p className="text-xs text-slate-400">İlk 11 ortalaması</p></div></header>
    <p className="text-sm text-slate-400">Burada yaptığın hazırlıklar bir sonraki “Hazırım” komutuyla lige gönderilir. Offline kariyerin etkilenmez.</p>
    {locked && <p role="status" className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">Hazır verdiğin için, canlı maç sürerken veya bağlantı beklenirken maç öncesi kadro kilitlidir. Hazır durumunu lobiden geri alabilir; devam eden maçı canlı maç panelinden yönetebilirsin.</p>}
    <fieldset disabled={locked} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 space-y-5 disabled:opacity-60">
      <legend className="text-white font-bold px-2">Maç öncesi hazırlık</legend>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm text-slate-300">Oyun stili<select aria-label="Online oyun stili" className={select} value={gameState.tactics.style} onChange={e => onTactics({ style: e.target.value as Tactics['style'] })}><option value="balanced">Dengeli</option><option value="attack">Hücum</option><option value="defense">Savunma</option><option value="possession">Topa sahip olma</option></select></label>
        <label className="text-sm text-slate-300">Diziliş<select aria-label="Online diziliş" className={select} value={['4-4-2','4-3-3','3-5-2'].includes(gameState.tactics.formation) ? gameState.tactics.formation : '4-4-2'} onChange={e => onFormation(e.target.value)}>{['4-4-2','4-3-3','3-5-2'].map(f => <option key={f}>{f}</option>)}</select></label>
      </div>
      <div className="border-t border-slate-700 pt-4 grid sm:grid-cols-2 gap-4">
        <label className="text-sm text-slate-300">İlk 11'den çıkar<select aria-label="İlk 11 oyuncusu" className={select} value={outId} onChange={e => setOutId(e.target.value)}><option value="">Oyuncu seç</option>{gameState.team11.map(p => <option value={p.id} key={p.id}>{p.name} · {p.role} · {p.ovr} OVR</option>)}</select></label>
        <label className="text-sm text-slate-300">Yedekten al<select aria-label="Yedek oyuncu" className={select} value={inId} onChange={e => setInId(e.target.value)}><option value="">Oyuncu seç</option>{gameState.bench.map(p => <option value={p.id} key={p.id}>{p.name} · {p.role} · {p.ovr} OVR</option>)}</select></label>
      </div>
      {out && incoming && !compatible && <p className="text-xs text-amber-300">Kaleci yalnızca başka bir kaleciyle yer değiştirebilir.</p>}
      <button disabled={!compatible} onClick={() => { if (out && incoming && compatible) { onSwap(out.id, incoming.id); setOutId(''); setInId(''); } }} className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm rounded-xl px-4 py-3 disabled:opacity-40">İlk 11'i güncelle</button>
    </fieldset>
    <div className="grid md:grid-cols-2 gap-5">{[{ title:'İlk 11', players:gameState.team11 }, { title:'Yedekler', players:gameState.bench }].map(section => <section key={section.title} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5"><h2 className="text-white font-bold mb-4">{section.title}</h2><div className="space-y-2">{section.players.map(p => <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-slate-950/40 rounded-xl"><div><p className="text-sm text-white font-bold">{p.name}</p><p className="text-xs text-slate-500 mt-1">{ROLE_NAMES[p.role]} · %{Math.round(p.energy)} enerji{p.injured ? ' · Sakat' : (p.suspension ?? 0) > 0 ? ' · Cezalı' : ''}</p></div><strong className="text-cyan-300">{p.ovr}</strong></div>)}</div></section>)}</div>
    <button onClick={onBack} className="w-full sm:w-auto rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 px-5 py-3 font-bold">Lige dön →</button>
  </section>;
}
