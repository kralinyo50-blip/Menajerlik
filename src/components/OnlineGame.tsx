import { useEffect, useState } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useOnlineLeague } from '../hooks/useOnlineLeague';
import { loadOnlineClub, saveOnlineClub, ONLINE_CLUB_KEY } from '../utils/onlineStorage';
import { OnlineLeagueTab } from './tabs/OnlineLeagueTab';
import { OnlineTeamSetup } from './OnlineTeamSetup';
import { OnlineTeamPreparation } from './OnlineTeamPreparation';

export function OnlineGame({ onExit }: { onExit: () => void }) {
  const { gameState, initializeGame, setGameStateExternal, updateGameState, swapPlayers, updateTactics, applyFormation, resetCareer } = useGameState();
  // Only this screen owns an online connection. Leaving the mode closes its stream.
  const online = useOnlineLeague();
  const [saved] = useState(loadOnlineClub);
  const [restoring, setRestoring] = useState(Boolean(saved));
  const [tab, setTab] = useState<'league' | 'team'>('league');
  const [storageError, setStorageError] = useState('');
  const me = online.room?.members.find(m => m.id === online.session?.memberId);
  const live = !!online.room?.live && !online.room.live.settled;
  const locked = live || !!me?.ready || online.busy || (!!online.session && online.connection !== 'connected');

  useEffect(() => {
    if (saved) setGameStateExternal(saved);
    setRestoring(false);
  }, [saved, setGameStateExternal]);
  useEffect(() => {
    if (!gameState) return;
    setStorageError(saveOnlineClub(gameState) ? '' : 'Online takım bu tarayıcıya kaydedilemedi. Depolama iznini veya boş alanı kontrol et; sayfayı kapatınca takım hazırlıkların kaybolabilir.');
  }, [gameState]);
  useEffect(() => {
    if (me && gameState && (me.name !== gameState.teamName || me.logo !== gameState.teamLogo)) {
      updateGameState({ teamName: me.name, teamLogo: me.logo });
    }
  }, [me?.name, me?.logo, gameState?.teamName, gameState?.teamLogo, updateGameState]); // eslint-disable-line react-hooks/exhaustive-deps

  const exitOnline = () => {
    if (live && !window.confirm('Canlı maç sunucuda devam edecek; ana menüde veya offline modda bağlı görünmeyeceksin. Online moda dönerek maça yeniden bağlanabilirsin. Mod seçimine dönülsün mü?')) return;
    onExit();
  };
  const resetTeam = () => {
    if (online.session || !window.confirm('Yalnızca online takımını yeniden oluşturmak istiyor musun? Offline kariyerin değişmeyecek.')) return;
    try { localStorage.removeItem(ONLINE_CLUB_KEY); resetCareer(); setTab('league'); }
    catch { setStorageError('Online takım kaydı silinemedi. Tarayıcı depolama iznini kontrol et.'); }
  };

  return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 text-white">
    <header className="sticky top-0 z-30 border-b border-slate-700/70 bg-slate-950/95 backdrop-blur">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3"><span className="text-2xl">🌐</span><div><p className="text-xs text-cyan-300 font-black tracking-widest">ONLINE MOD</p><p className="text-sm text-slate-300 mt-1">{gameState ? `${gameState.teamLogo} ${gameState.teamName}` : 'Arkadaşlarınla ortak lig'}</p></div></div>
        <button onClick={exitOnline} disabled={online.busy} className="rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2 text-sm hover:bg-slate-700 disabled:opacity-40">← Mod seçimi</button>
      </div>
    </header>
    <main className="max-w-6xl mx-auto p-4 sm:p-6 pb-12">
      {storageError && <p role="alert" className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">{storageError}</p>}
      {restoring ? <p role="status" className="py-10 text-slate-400 text-center">Online takımın yükleniyor…</p> : !gameState ? <OnlineTeamSetup returning={!!online.session} onCreate={(name, logo) => initializeGame(name, logo, 'normal')} /> : <>
        <nav aria-label="Online mod bölümleri" className="flex flex-wrap items-center gap-2 mb-6">
          <button data-online-tab="league" aria-pressed={tab === 'league'} onClick={() => setTab('league')} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === 'league' ? 'bg-cyan-400 text-slate-950' : 'border border-slate-700 text-slate-400 hover:text-white'}`}>🌐 Lig & Canlı Maç {live && <span className="ml-1">●</span>}</button>
          <button data-online-tab="team" aria-pressed={tab === 'team'} onClick={() => setTab('team')} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === 'team' ? 'bg-cyan-400 text-slate-950' : 'border border-slate-700 text-slate-400 hover:text-white'}`}>⚽ Kadro & Taktik</button>
          {!online.session && <button onClick={resetTeam} disabled={online.busy} className="sm:ml-auto text-xs text-slate-500 hover:text-slate-300 px-2 py-2 disabled:opacity-40">Takımı yeniden oluştur</button>}
        </nav>
        {live && tab !== 'league' && <button onClick={() => setTab('league')} className="w-full mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm font-bold text-emerald-200">● Maçın canlı — ortak sahaya ve maç yönetimine dön →</button>}
        {tab === 'league' ? <OnlineLeagueTab gameState={gameState} online={online} /> : <OnlineTeamPreparation gameState={gameState} locked={locked} onSwap={swapPlayers} onTactics={updateTactics} onFormation={applyFormation} onBack={() => setTab('league')} />}
      </>}
    </main>
    <footer className="text-center text-xs text-slate-500 px-4 pb-6">Online takımın ayrı kaydedilir. Offline kariyerine ana menüden ulaşabilirsin.</footer>
  </div>;
}
