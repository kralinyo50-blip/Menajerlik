import { useState } from 'react';
import { LOGO_POOL } from '../data/constants';

export function OnlineTeamSetup({ onCreate, returning }: { onCreate: (name: string, logo: string) => void; returning: boolean }) {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState(LOGO_POOL[0]);
  return <div className="max-w-xl mx-auto py-8 sm:py-14">
    <div className="rounded-3xl border border-cyan-500/30 bg-slate-900/80 p-6 sm:p-8">
      <div className="text-5xl mb-5">{logo}</div>
      <p className="text-xs tracking-widest text-cyan-300 font-bold mb-2">ONLINE MOD</p>
      <h1 className="text-2xl sm:text-3xl text-white font-black">Online takımını hazırla</h1>
      <p className="text-sm text-slate-400 leading-relaxed mt-3 mb-6">Kariyer açmana gerek yok. Takımına bir isim ver; ilk 11 ve yedek kadron hazır olsun. Sonraki ekranda lig kurabilir veya kodla katılabilirsin.</p>
      {returning && <p className="text-sm text-amber-200 rounded-xl bg-amber-500/10 p-3 mb-5">Lig oturumun kayıtlı ancak bu cihazdaki takım kaydı bulunamadı. Kadronu hazırladığında mevcut oturumuna dönülecek; canlı maç varsa sunucudaki kadro korunur.</p>}
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onCreate(name.trim(), logo); }}>
        <label htmlFor="online-club-create" className="block text-sm text-slate-300 mb-2">Takım adı</label>
        <input id="online-club-create" required maxLength={32} value={name} onChange={e => setName(e.target.value)} placeholder="Örn: İstanbul United" autoComplete="off" className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400" />
        <fieldset className="mt-6"><legend className="text-sm text-slate-300 mb-3">Takım amblemi</legend><div className="grid grid-cols-4 sm:grid-cols-8 gap-2">{LOGO_POOL.map(item => <button type="button" key={item} aria-label={`Amblem ${item}`} aria-pressed={item === logo} onClick={() => setLogo(item)} className={`text-2xl p-2 rounded-xl border transition ${item === logo ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`}>{item}</button>)}</div></fieldset>
        <button disabled={!name.trim()} className="mt-7 w-full rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 px-4 py-3 font-black text-slate-950">Takımı oluştur ve online lobiye geç →</button>
      </form>
      <p className="text-xs text-slate-500 mt-4">Bu takım yalnızca online moda kaydedilir. Offline kariyerine ve kayıtlarına dokunulmaz.</p>
    </div>
  </div>;
}
