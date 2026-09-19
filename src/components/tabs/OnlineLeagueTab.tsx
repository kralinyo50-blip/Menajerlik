import { useState } from 'react';
import type { GameState } from '../../types/game';
import type { LiveMatch, OnlineClub } from '../../types/online';
import { codeHint, isValidOnlineCode, normalizeOnlineCode } from '../../utils/onlineCode';
import { OnlineLiveMatch } from '../OnlineLiveMatch';
import type { OnlineLeagueController } from '../../hooks/useOnlineLeague';

const button = 'rounded-xl px-4 py-3 text-sm font-bold transition bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed';
const secondary = 'rounded-xl px-4 py-3 text-sm font-bold transition border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed';
const panel = 'rounded-2xl border border-slate-700/60 bg-slate-800/50 p-5';
const styles = { balanced: 'Dengeli', attack: 'Hücum', defense: 'Savunma', possession: 'Topa sahip olma' };

export function OnlineLeagueTab({ gameState, online }: { gameState: GameState; online: OnlineLeagueController }) {
  const { room, session, connection, transport, issue, busy, error, errorStatus, lastSynced, connect, action } = online;
  const [code, setCode] = useState(() => normalizeOnlineCode(new URLSearchParams(window.location.search).get('lig') || ''));
  const serverOrigin = window.location.origin;
  const onFileOrLocalhost = window.location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
  const hint = codeHint(code);
  const codeValid = isValidOnlineCode(code);
  const codeNotFound = errorStatus === 404 || (!!error && /bulunamadı/i.test(error));
  const [name, setName] = useState(gameState.teamName.slice(0, 32));
  const [copyMessage, setCopyMessage] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const available = [...gameState.team11, ...gameState.bench].filter(p => !p.injured && !((p.suspension ?? 0) > 0));
  const keeper = available.find(p => p.role === 'KL');
  const starters = [...(keeper ? [keeper] : []), ...available.filter(p => p.role !== 'KL').slice(0,10)];
  const strength = Math.max(1, Math.min(99, Math.round(starters.reduce((sum, p) => sum + p.ovr, 0) / Math.max(1, starters.length))));
  const player = (p: typeof gameState.team11[number]) => ({ id: String(p.id), name: p.name.slice(0,48), role: p.role, ovr: p.ovr, energy: Math.max(1,p.energy) });
  const club: OnlineClub = {
    name: name.trim(), logo: gameState.teamLogo, strength, style: gameState.tactics.style,
    formation: gameState.tactics.formation,
    squad: { starters: starters.map(player), bench: available.filter(p => !starters.includes(p)).slice(0,12).map(player) },
  };
  const squadReady = starters.length === 11 && !!keeper;
  const liveMatch = room?.live?.matches.find((m): m is LiveMatch => 'home' in m);
  const me = room?.members.find(m => m.id === session?.memberId);
  const host = room?.members.find(m => m.id === room.hostId);
  const isHost = room?.hostId === me?.id;
  const connected = connection === 'connected';
  const humans = room?.members.filter(m => !m.bot && !m.departed) || [];
  const sorted = [...(room?.members || [])].sort((a, b) => b.stats.points - a.stats.points || (b.stats.gf - b.stats.ga) - (a.stats.gf - a.stats.ga) || b.stats.gf - a.stats.gf || a.name.localeCompare(b.name, 'tr'));
  const nextMatch = room?.matches.find(m => m.week === room.week && (m.homeId === me?.id || m.awayId === me?.id));
  const member = (id: string) => room?.members.find(m => m.id === id);
  const copy = async (link: boolean) => {
    if (!room) return;
    const url = new URL(window.location.href);
    url.search = ''; url.hash = ''; url.searchParams.set('lig', room.code);
    try {
      await navigator.clipboard.writeText(link ? url.toString() : room.code);
      setCopyMessage(link ? 'Davet bağlantısı kopyalandı.' : 'Kod kopyalandı.');
    } catch { setCopyMessage('Kopyalanamadı. Ekrandaki kodu seçip elle paylaşabilirsin.'); }
  };

  return (
    <div className="h-full overflow-y-auto pb-8">
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-emerald-400 mb-2">Bir kod · Aynı lig</p>
            <h2 className="text-2xl font-black text-white">🌐 Online Lig</h2>
            <p className="text-sm text-slate-400 mt-2">Arkadaşlarını davet et, kendi takımınla ortak sezonda yarış.</p>
          </div>
          <span role="status" className={`text-xs rounded-full border px-3 py-2 ${connected ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
            {connected ? (transport === 'poll' ? '● Yoklamayla senkronize' : '● Senkronize') : connection === 'connecting' ? '◌ Bağlanıyor…' : connection === 'reconnecting' ? '◌ Yeniden bağlanıyor…' : '○ Lige bağlı değilsin'}
          </span>
        </header>

        {error && <div role="alert" className="rounded-xl p-4 text-sm border border-red-500/40 bg-red-500/10 text-red-200">
          <p>{error}</p>
          {codeNotFound && !session && <ol className="mt-3 space-y-2 text-red-100/90 list-decimal list-inside">
            <li><strong>Davet bağlantısını kullan:</strong> oda sahibi “Davet bağlantısı” düğmesiyle link göndersin, sen o linki tarayıcıda aç. Kodu kendi adresine elle yazmak yetmez.</li>
            <li><strong>Aynı adreste ol:</strong> şu anki sunucun <span className="font-mono break-all">{serverOrigin}</span> — arkadaşının ekranındaki adresle birebir aynı olmalı. Herkes kendi bilgisayarında sunucu çalıştırıyorsa kodlar birbirinde görünmez.</li>
            <li><strong>Kodu kopyala:</strong> elle yazma; kodlarda 0, O, 1, I harfleri yoktur, bunlar birbirine karışır.</li>
          </ol>}
        </div>}
        {connection === 'reconnecting' && <div role="alert" className="rounded-xl p-4 text-sm bg-amber-500/10 text-amber-200">
          <p>{issue || 'Sunucu bağlantısı kesildi.'} {room ? 'Son kayıt gösteriliyor; işlemler geçici olarak kapalı.' : ''}</p>
          <p className="mt-1 text-xs text-amber-200/80">{transport === 'poll'
            ? 'Bağlantı yoklanarak sürdürülüyor: tablo ve saha birkaç saniye gecikmeyle güncellenir.'
            : 'Bağlantı otomatik olarak yeniden deneniyor.'}</p>
        </div>}
        {session && !room && <div className={panel}><p className="text-slate-300">{session.code} kodlu ligdeki oturumun geri yükleniyor… Aynı sunucu adresini kullandığından emin ol.</p>
          {issue && <p className="mt-2 text-sm text-amber-200">{issue}</p>}
        </div>}

        {!squadReady && <p role="alert" className="text-sm text-amber-300">Online kadro için bir kaleci ve 10 sağlıklı, cezasız saha oyuncusu gerekli. Kadronu kontrol et.</p>}

        {!session && <>
          <section className={`${panel} bg-gradient-to-br from-emerald-950/40 to-slate-800/50`}>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-4xl">{club.logo}</span>
              <div className="flex-1">
                <label htmlFor="online-team-name" className="block text-xs text-slate-400 mb-1">Online takım adın</label>
                <input id="online-team-name" value={name} onChange={e => setName(e.target.value)} maxLength={32} className="w-full max-w-sm bg-slate-950/50 border border-slate-600 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="text-right"><strong className="text-2xl text-emerald-300">{strength}</strong><p className="text-xs text-slate-400">Kadro gücü</p></div>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-xl bg-slate-950/30 p-4 space-y-3">
                <h3 className="font-bold text-white">1. Yeni lig kur</h3>
                <p className="text-sm text-slate-400">Sana özel 8 karakterli senkronizasyon kodunu arkadaşlarına gönder.</p>
                <button className={`${button} w-full`} disabled={busy || !club.name || !squadReady} onClick={() => void connect(club)}>＋ Lig oluştur ve kod al</button>
              </div>
              <form className="rounded-xl bg-slate-950/30 p-4 space-y-3" onSubmit={e => { e.preventDefault(); if (codeValid && club.name && squadReady) void connect(club, code); }}>
                <h3 className="font-bold text-white">2. Kod ile lige katıl</h3>
                <label htmlFor="sync-code" className="text-sm text-slate-400 block">Arkadaşından gelen senkronizasyon kodu</label>
                <input id="sync-code" placeholder="ABCD2345" value={code} onChange={e => setCode(normalizeOnlineCode(e.target.value))} maxLength={8} autoComplete="off" spellCheck={false} className="w-full bg-slate-950 border border-slate-600 focus:border-emerald-400 rounded-xl px-4 py-3 text-white font-mono tracking-[0.25em] uppercase" />
                {hint && <p role="status" className="text-xs text-amber-300">{hint}</p>}
                <button className={`${secondary} w-full`} disabled={busy || !codeValid || !club.name || !squadReady}>Lige bağlan →</button>
                <p className="text-xs text-slate-500">En garantisi: kodu elle yazmak yerine arkadaşının gönderdiği <strong className="text-slate-300">davet bağlantısını</strong> tarayıcıda aç — kod otomatik dolar, doğru sunucuya gidersin.</p>
              </form>
            </div>
          </section>
          <section className={`${panel} text-sm text-slate-400 space-y-2`}>
            <h3 className="text-white font-bold">Nasıl oynanır?</h3>
            <p>• <strong className="text-slate-200">Herkes aynı oyun adresini açar</strong>, Online Oyna seçer ve kendi online takımını oluşturur. Şu anki sunucun: <span className="font-mono text-cyan-300 break-all">{serverOrigin}</span></p>
            {onFileOrLocalhost && <p className="text-amber-300">⚠️ Şu an {window.location.protocol === 'file:' ? 'yerel dosya olarak açmışsın — online çalışmaz' : 'localhost’tasın — arkadaşların bu adresi açamaz'}. Oda sahibinin gönderdiği <strong>davet bağlantısını</strong> tarayıcıda aç; aynı Wi-Fi’deyseniz adres satırındaki <span className="font-mono">localhost</span> yerine sunucu bilgisayarının ağ adresi yazmalı.</p>}
            <p>• 2–10 menajer katılabilir. Oda sahibi sezonu başlatınca boş yerler botlarla dolar.</p>
            <p>• Her hafta herkes “Hazırım” der; sunucu canlı maçları başlatır. Ortak dakika, skor ve saha konumları saniyede iki kez iletilir.</p>
            <p>• Online maçlar ortak 3D/2D sahada canlı oynanır; taktik ve değişiklikler rakibe de yansır. Tek kişilik kariyerden ayrıdır. Offline kariyerin ve kayıtların bu moddan tamamen ayrıdır.</p>
            <p className="text-amber-300">Kod tek başına sunucu açmaz: farklı cihazlarda ortak bir sunucu adresi gerekir. “Kod bulunamadı” hatasının sebebi genelde budur — kodu değil, davet bağlantısını paylaşın.</p>
            <p>• Farklı evlerdeyseniz: bir kişi <span className="font-mono text-cyan-300">paylas.bat</span> (Mac/Linux: <span className="font-mono text-cyan-300">./paylas.sh</span>) ile oyunu internete açsın, herkes çıkan linkten girsin. Hesap/port ayarı gerekmez.</p>
          </section>
        </>}

        {room && me && <>
          <section className={`${panel} border-emerald-500/30`}>
            <div className="flex flex-wrap justify-between gap-4 items-center">
              <div><p className="text-xs text-slate-400 mb-1">SENKRONİZASYON KODU</p><strong className="text-3xl font-mono tracking-[0.2em] text-emerald-300 select-all">{room.code}</strong></div>
              <div className="flex gap-2 flex-wrap"><button className={secondary} onClick={() => void copy(false)}>Kodu kopyala</button><button className={secondary} onClick={() => void copy(true)}>Davet bağlantısı</button></div>
            </div>
            {copyMessage && <p role="status" className="text-xs text-emerald-300 mt-3">{copyMessage}</p>}
            <p className="text-xs text-slate-500 mt-3">Arkadaşına kodu değil <strong className="text-slate-300">davet bağlantısını</strong> gönderirsen tek tıkla doğru sunucuya gelir — “kod bulunamadı” hatası yaşanmaz.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400 mt-4 border-t border-slate-700 pt-4">
              <span>Sezon {room.season} · {room.status === 'lobby' ? 'Katılım açık' : room.status === 'finished' ? 'Sezon tamamlandı' : `Hafta ${room.week} / 18`}</span>
              <span>{humans.length} menajer / 10</span><span>Oda sahibi: {host?.name}</span>
              {lastSynced && <span>Son eşitleme: {new Date(lastSynced).toLocaleTimeString('tr-TR')}</span>}
            </div>
          </section>

          {room.status === 'lobby' && <section className={panel}>
            <h3 className="text-white font-bold mb-2">🏟️ Sezon lobisi</h3>
            <p className="text-sm text-slate-400 mb-4">Arkadaşların katılınca sezonu başlat. Boş {10 - humans.length} takım botla tamamlanır. Sezon başladıktan sonra yeni katılım olmaz.</p>
            {isHost ? <button className={button} disabled={busy || !connected || humans.length < 2} onClick={() => void action('start')}>Sezonu başlat {humans.length < 2 ? '· Bir arkadaşını bekle' : '→'}</button> : <p className="text-amber-300 text-sm">Oda sahibinin sezonu başlatması bekleniyor.</p>}
          </section>}

          {liveMatch && <OnlineLiveMatch key={liveMatch.id} match={liveMatch} online={online} />}

          {room.status === 'playing' && (!room.live || room.live.settled) && <section className={`${panel} bg-gradient-to-r from-emerald-950/40 to-slate-800/50`}>
            <p className="text-xs font-bold text-emerald-400 mb-3">{room.week}. HAFTA · ORTAK MAÇ GÜNÜ</p>
            {nextMatch && <div className="text-lg font-black text-white mb-4 flex flex-wrap items-center gap-3"><span>{member(nextMatch.homeId)?.logo} {member(nextMatch.homeId)?.name}</span><span className="text-slate-500 text-sm">VS</span><span>{member(nextMatch.awayId)?.logo} {member(nextMatch.awayId)?.name}</span></div>}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-slate-400"><p>{humans.filter(m => m.ready).length} / {humans.length} menajer hazır.</p><p className="mt-1">Gönderilecek kadro: <span className="text-white">{strength} OVR · {styles[club.style]}</span></p></div>
              <button className={me.ready ? secondary : button} disabled={busy || !connected || (!me.ready && !squadReady)} onClick={() => void action('ready', { ready: !me.ready, club: { ...club, name: me.name } })}>{me.ready ? '✓ Hazırsın · Hazırı geri al' : '⚽ Hazırım — haftayı oyna'}</button>
            </div>
            <p className="text-xs text-slate-500 mt-4">Kadro & Taktik bölümünde hazırlan, sonra hazır ol. Hazır verdiğin andaki ilk 11, yedekler ve oyun stilin bu hafta için kaydedilir. Son menajer hazır olunca tüm maçlar canlı başlar. Maç sırasında değişiklikleri canlı maç panelinden yap.</p>
          </section>}

          {room.live && !room.live.settled && <section className={panel}>
            <h3 className="font-bold text-white mb-3">📻 Ligde canlı skorlar</h3>
            <div className="grid sm:grid-cols-2 gap-2">{room.live.matches.map(m => <div key={m.id} className="text-xs text-slate-300 p-3 bg-slate-950/40 rounded-lg"><span className="text-emerald-300 mr-2">{m.phase === 'finished' ? 'MS' : `${m.minute}′`}</span>{member(m.homeId)?.name} <strong className="text-white">{'home' in m ? m.home.score : m.homeScore} : {'away' in m ? m.away.score : m.awayScore}</strong> {member(m.awayId)?.name}</div>)}</div>
          </section>}

          {room.status === 'finished' && <section className={`${panel} border-amber-500/40 text-center`}>
            <p className="text-4xl mb-2">🏆</p><h3 className="text-xl font-black text-amber-300">Şampiyon: {sorted[0]?.logo} {sorted[0]?.name}</h3>
            <p className="text-sm text-slate-400 my-3">18 haftalık ortak sezon tamamlandı. Yeni sezonda aynı kodu kullanabilirsin.</p>
            {isHost && <button className={button} disabled={busy || !connected} onClick={() => { if (window.confirm('Yeni sezon lobisi açılsın mı? Mevcut sezonun puanları ve sonuçları sıfırlanacak.')) void action('new-season'); }}>Yeni sezon lobisini aç</button>}
          </section>}

          <section className={panel}>
            <h3 className="text-white font-bold mb-4">👥 Menajerler</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {room.members.filter(m => !m.bot).map(m => <div key={m.id} className="flex gap-3 items-center rounded-xl bg-slate-950/40 p-3 min-w-0">
                <span className="text-2xl">{m.logo}</span><div className="min-w-0 flex-1"><p className="text-white text-sm font-bold truncate">{m.name} {m.id === me.id && '(Sen)'} {m.id === room.hostId && '👑'}</p><p className={`text-xs mt-1 ${m.online ? 'text-emerald-400' : 'text-slate-500'}`}>{m.departed ? '🤖 Bota devredildi' : `${m.online ? '● Çevrimiçi' : '○ Bağlantı yok'}${m.ready ? ' · Hazır ✓' : ''}`}</p></div>
                {isHost && m.canReplace && room.status === 'playing' && <button className="text-xs text-amber-300 underline" disabled={busy || !connected} onClick={() => { if (window.confirm(`${m.name} sezonun geri kalanı için bota devredilsin mi? Bu menajer bu sezona geri dönemez.`)) void action('replace', { memberId: m.id }); }}>Bota devret</button>}
              </div>)}
            </div>
            {!isHost && host?.canReplace && <button className={`${secondary} mt-4`} disabled={busy || !connected} onClick={() => void action('claim-host')}>Oda sahibi çevrimdışı · Yönetimi devral</button>}
          </section>

          {room.status !== 'lobby' && <>
            <section className={`${panel} !p-0 overflow-hidden`}>
              <h3 className="text-white font-bold px-5 py-4 border-b border-slate-700">🏆 Ortak puan tablosu</h3>
              <div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead><tr className="text-slate-400 text-xs bg-slate-950/30">{['#', 'Takım', 'O', 'G', 'B', 'M', 'AV', 'P'].map(h => <th key={h} className={`px-3 py-3 ${h === 'Takım' ? 'text-left' : 'text-center'}`}>{h}</th>)}</tr></thead><tbody>
                {sorted.map((m, i) => <tr key={m.id} className={`border-t border-slate-700/40 ${m.id === me.id ? 'bg-emerald-500/10 text-emerald-200' : 'text-slate-300'}`}><td className="p-3 text-center">{i + 1}</td><td className="p-3 font-bold">{m.logo} {m.name} <span className="text-[10px] text-slate-500">{m.bot || m.departed ? 'BOT' : 'MENAJER'}</span></td>{[m.stats.played, m.stats.won, m.stats.drawn, m.stats.lost, m.stats.gf - m.stats.ga].map((n, j) => <td key={j} className="p-3 text-center">{n}</td>)}<td className="p-3 text-center font-black text-white">{m.stats.points}</td></tr>)}
              </tbody></table></div>
            </section>
            <section className={panel}>
              <div className="flex flex-wrap gap-3 items-center justify-between mb-4"><h3 className="text-white font-bold">📅 Ortak fikstür ve sonuçlar</h3><button className="text-xs text-emerald-300 underline" onClick={() => setShowAllMatches(!showAllMatches)}>{showAllMatches ? 'Yalnızca benim maçlarım' : 'Tüm lig maçlarını göster'}</button></div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/40">
                {room.matches.filter(m => showAllMatches || m.homeId === me.id || m.awayId === me.id).map(m => <div key={`${m.week}-${m.homeId}`} className={`grid grid-cols-[2rem_1fr_3rem_1fr] gap-2 items-center py-3 text-xs sm:text-sm ${m.week === room.week && room.status === 'playing' ? 'bg-emerald-500/10' : ''}`}><span className="text-slate-500 text-center">{m.week}</span><span className="text-slate-200 text-right">{member(m.homeId)?.logo} {member(m.homeId)?.name}</span><strong className="text-center text-white">{m.homeScore === null ? '–' : `${m.homeScore}:${m.awayScore}`}</strong><span className="text-slate-200">{member(m.awayId)?.logo} {member(m.awayId)?.name}</span></div>)}
              </div>
            </section>
          </>}
          <footer className="flex flex-wrap justify-between gap-4 items-center text-xs text-slate-500">
            <p>Online takımın ve lig oturumun bu tarayıcıda ayrı saklanır. Offline kayıtların değişmez.</p>
            <button className="text-red-300 underline disabled:opacity-40" disabled={busy || !connected} onClick={() => { if (window.confirm('Ligden ayrılmak istiyor musun? Sezon başladıysa takımın bota devredilir ve bu sezona tekrar katılamazsın.')) void action('leave'); }}>Ligden ayrıl</button>
          </footer>
        </>}
      </div>
    </div>
  );
}
