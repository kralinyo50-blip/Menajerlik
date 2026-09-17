import React, { useState, useMemo } from 'react';
import { GameState, SocialPost, SocialPlatform } from '../../types/game';
import { QUICK_TEMPLATES, TRENDING } from '../../data/social';
import { YOUTUBE_VIDEOS, YOUTUBE_CATEGORIES, TIKTOK_VIDEOS } from '../../data/youtubeCatalog';
import { starBonuses } from '../../utils/stadium';

// ── presets ──
const IMAGE_PRESETS: { id: string; label: string; gradient: string; emoji: string }[] = [
  { id: '', label: 'Yok', gradient: '', emoji: '' },
  { id: 'stadium', label: 'Stadyum', gradient: 'from-emerald-600 via-teal-600 to-cyan-600', emoji: '🏟️' },
  { id: 'celebration', label: 'Kutlama', gradient: 'from-violet-600 via-fuchsia-600 to-pink-600', emoji: '🎉' },
  { id: 'derby', label: 'Derbi', gradient: 'from-orange-600 via-red-600 to-rose-600', emoji: '⚔️' },
  { id: 'training', label: 'İdman', gradient: 'from-blue-600 via-indigo-600 to-violet-600', emoji: '⚽' },
  { id: 'trophy', label: 'Kupa', gradient: 'from-amber-500 via-orange-600 to-amber-700', emoji: '🏆' },
  { id: 'fans', label: 'Taraftar', gradient: 'from-pink-600 via-rose-600 to-orange-600', emoji: '💚' },
];

const FILTERS = [
  { id: 'all', label: 'Tümü', icon: '◉' },
  { id: 'match', label: 'Maçlar', icon: '⚽' },
  { id: 'transfer', label: 'Transfer', icon: '💎' },
  { id: 'user', label: 'Sen', icon: '👤' },
];

const PLATFORM_META: Record<SocialPlatform, { label: string; icon: string; color: string; gradient: string; desc: string }> = {
  instagram: { label: 'Instagram', icon: '📸', color: '#E4405F', gradient: 'from-[#feda75] via-[#d62976] to-[#4f5bd5]', desc: 'Foto & hikâye' },
  tiktok: { label: 'TikTok', icon: '🎵', color: '#000000', gradient: 'from-cyan-400 via-neutral-900 to-pink-500', desc: 'Dikey clip' },
  youtube: { label: 'YouTube', icon: '▶️', color: '#FF0000', gradient: 'from-red-600 to-red-700', desc: 'Video & canlı' },
};

function getPostVisual(post: SocialPost) {
  if (post.image) {
    const preset = IMAGE_PRESETS.find(p => p.id === post.image);
    if (preset && preset.gradient) return preset;
  }
  if (post.type === 'match') {
    const won = post.content.includes('galibiyet') || post.content.includes('kazand') || post.content.includes('3 PUAN') || post.content.includes('MAÇ SONUCU');
    return won ? { id: 'match-win', label: '', gradient: 'from-emerald-700 via-emerald-600 to-teal-600', emoji: '🏟️' } : post.content.includes('BERABERE') ? { id: 'draw', label: '', gradient: 'from-slate-600 to-slate-700', emoji: '🤝' } : { id: 'loss', label: '', gradient: 'from-zinc-700 to-zinc-800', emoji: '😔' };
  }
  if (post.type === 'transfer') return { id: 'transfer', label: '', gradient: 'from-amber-600 via-orange-600 to-red-600', emoji: '✍️' };
  if (post.type === 'news') return { id: 'news', label: '', gradient: 'from-blue-700 via-indigo-700 to-violet-700', emoji: '📰' };
  return { id: 'generic', label: '', gradient: 'from-neutral-700 to-neutral-800', emoji: '⚽' };
}

interface SocialTabProps {
  gameState: GameState;
  onCreatePost: (content: string, image?: string, platform?: SocialPlatform) => void;
  onLikePost: (id: string) => void;
  onAddComment: (id: string, comment: string) => void;
}

export const SocialTab: React.FC<SocialTabProps> = ({ gameState, onCreatePost, onLikePost, onAddComment }) => {
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [filter, setFilter] = useState<string>('all');
  const [showComposer, setShowComposer] = useState(false);
  const [composer, setComposer] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [composerPlatform, setComposerPlatform] = useState<SocialPlatform>('instagram');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [likedAnim, setLikedAnim] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState<Record<string, boolean>>({});
  const [ytCategory, setYtCategory] = useState<string>('all');
  const [ytWatchId, setYtWatchId] = useState<string>(YOUTUBE_VIDEOS[0].videoId);
  const [ytQuery, setYtQuery] = useState('');
  const [ttIndex, setTtIndex] = useState(0);

  const feed = gameState.socialFeed || [];
  const activeDevice: any = (gameState.devices||[]).find((d:any)=> d.id===gameState.activeDeviceId) || (gameState.devices||[])[0];
  const devQuality = activeDevice?.quality ?? 42;
  const devCamera = activeDevice?.camera ?? 45;
  const devPerf = activeDevice?.performance ?? 40;

  const followers = useMemo(() => {
    const base = 18400;
    const fameBonus = (gameState.life?.stats.fame || 40) * 620;
    const fanBonus = (gameState.fanHappiness || 60) * 240;
    const star = starBonuses(gameState);
    const starFollowers = Math.round((star.attendance * 90000) + (star.gate * 60000));
    const rep = (gameState.managerRep || 50) * 140;
    return base + fameBonus + fanBonus + starFollowers + rep + gameState.week * 420;
  }, [gameState]);

  const platformFeed = useMemo(()=> feed.filter((p:any)=> (p.platform||'instagram')===platform), [feed, platform]);
  const filtered = useMemo(()=> {
    if (filter==='all') return platformFeed;
    return platformFeed.filter((p:any)=>{
      if (filter==='user') return p.isUser;
      if (filter==='match') return p.type==='match';
      if (filter==='transfer') return p.type==='transfer';
      return true;
    });
  }, [platformFeed, filter]);

  const charLimit = 280;
  const canPost = composer.trim().length >= 3 && composer.length <= charLimit;

  const handlePost = () => {
    if (!canPost) return;
    onCreatePost(composer.trim(), selectedImage || undefined, composerPlatform);
    setComposer(''); setSelectedImage(''); setShowComposer(false);
  };
  const handleLike = (id: string, liked: boolean) => {
    onLikePost(id);
    if (!liked) { setLikedAnim(id); setTimeout(()=> setLikedAnim(null), 650); }
  };

  const stories = useMemo(() => {
    const teams = gameState.league.slice(0, 8);
    return [
      { id: 'user', name: 'Hikayen', logo: gameState.teamLogo, isUser: true, hasStory: true },
      ...teams.filter(t => !t.isUser).slice(0, 7).map(t => ({ id: t.name, name: t.name.split(' ')[0], logo: t.logo, isUser: false, hasStory: Math.random() < 0.85 })),
      { id: 'sporgundemi', name: 'sporgundemi', logo: '🎙️', isUser: false, hasStory: true },
    ];
  }, [gameState.league, gameState.teamLogo]);

  // device bonus per platform display
  const platformBonusText = useMemo(()=>{
    const devBonus = Math.round((devQuality-42)/12);
    if (platform==='instagram') return `📸 Kamera ${devCamera} → +${Math.round(devCamera*0.9+devBonus*70)} beğeni`;
    if (platform==='tiktok') return `⚡ Perf ${devPerf} → +${Math.round(devPerf*1.1+devBonus*85)} izlenme`;
    return `🎬 Kamera+Perf → +${Math.round((devCamera+devPerf)/2+devBonus*95+devQuality)} izlenme`;
  }, [platform, devCamera, devPerf, devQuality]);

  const ytVideosFiltered = useMemo(()=>{
    let list = YOUTUBE_VIDEOS;
    if (ytCategory!=='all') list = list.filter(v=> v.category===ytCategory);
    if (ytQuery.trim()) {
      const q = ytQuery.toLowerCase();
      list = list.filter(v=> v.title.toLowerCase().includes(q) || v.channel.toLowerCase().includes(q));
    }
    return list;
  }, [ytCategory, ytQuery]);

  const currentYt = YOUTUBE_VIDEOS.find(v=> v.videoId===ytWatchId) || YOUTUBE_VIDEOS[0];

  const openComposerFor = (pf: SocialPlatform) => { setComposerPlatform(pf); setPlatform(pf); setShowComposer(true); };

  return (
    <div className="h-full flex flex-col bg-black text-white -m-3 lg:-m-6 rounded-xl lg:rounded-2xl overflow-hidden border border-neutral-800">
      {/* ── Platform selector — marka gibi ── */}
      <div className="bg-[#0f0f0f] border-b border-neutral-800 px-3 py-2 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black tracking-widest text-neutral-500 hidden sm:inline">SOSYAL</span>
          <div className="flex bg-[#272727] rounded-full p-1 gap-1">
            {(Object.keys(PLATFORM_META) as SocialPlatform[]).map(pf=>{
              const meta = PLATFORM_META[pf];
              const active = platform===pf;
              return (
                <button
                  key={pf}
                  onClick={()=> setPlatform(pf)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all ${active ? 'bg-white text-black shadow' : 'text-neutral-300 hover:text-white hover:bg-neutral-700'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${pf==='instagram'?'bg-gradient-to-tr '+meta.gradient+' text-white': pf==='youtube'?'bg-red-600 text-white':'bg-black text-white border border-neutral-700'}`}>{meta.icon}</span>
                  <span className="hidden sm:inline">{meta.label}</span>
                  <span className={`hidden lg:inline text-[10px] ${active?'text-neutral-600':'text-neutral-500'}`}>{meta.desc}</span>
                  {pf==='instagram' && <span className="text-[10px] bg-neutral-200 text-black px-1 rounded-full ml-1">{platformFeed.length}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline text-[11px] text-neutral-400">{platform==='instagram'?'FutbolGram': platform==='tiktok'?'TikTok Futbol':'YouTube Futbol'} • {filtered.length} gönderi</span>
          <button onClick={()=> openComposerFor(platform)} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${platform==='youtube'?'bg-red-600 hover:bg-red-500 text-white': platform==='tiktok'?'bg-white text-black hover:bg-neutral-200':'bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 text-white'}`}>＋ {platform==='youtube'?'Video Yükle': platform==='tiktok'?'Clip At':'Paylaş'}</button>
        </div>
      </div>

      {/* Cihaz bar — per platform bonus */}
      <div className="h-[36px] bg-gradient-to-r from-violet-600/20 via-slate-800 to-cyan-600/15 border-b border-neutral-800 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">{activeDevice?.icon || '📱'}</span>
          <span className="text-white font-bold">{activeDevice?.name || 'Telefon'}</span>
          <span className="hidden sm:inline text-slate-400">• Kalite {devQuality}/100</span>
          <span className="hidden md:inline text-[11px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full text-emerald-300">{platformBonusText}</span>
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">📱 Cihazın iyiyse video 4K, beğeni fırlar — <span className="text-violet-300">Teknoloji → AVM</span>’den yükselt</div>
      </div>

      {/* ── Platform content ── */}
      {platform==='instagram' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Center feed - IG */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
            {/* IG top bar */}
            <div className="h-[44px] border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 bg-black">
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-black tracking-tighter" style={{fontFamily:"'Segoe UI', system-ui"}}><span className="bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5] bg-clip-text text-transparent">FutbolGram</span></span>
                <span className="hidden sm:inline text-[10px] border border-neutral-700 rounded-full px-2 py-0.5 text-neutral-400">▾</span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <div className="bg-[#262626] rounded-lg px-3 py-1.5 flex items-center gap-2 w-[220px]">
                  <span className="text-neutral-500">⌕</span>
                  <input placeholder="Ara" className="bg-transparent outline-none text-sm placeholder:text-neutral-500 w-full" />
                </div>
              </div>
              <div className="flex items-center gap-3 text-[18px]">
                <button className="hover:opacity-70">⌂</button>
                <button className="hover:opacity-70 relative">♡<span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" /></button>
                <button className="hover:opacity-70">✈︎</button>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-xs border-2 border-neutral-800">{gameState.teamLogo}</div>
              </div>
            </div>

            {/* Stories */}
            <div className="shrink-0 border-b border-neutral-800 bg-black">
              <div className="flex gap-3 px-3 py-3 overflow-x-auto scrollbar-hide">
                {stories.map(s => (
                  <button key={s.id} onClick={() => { if (s.isUser) setShowComposer(true); }} className="flex flex-col items-center gap-1 shrink-0 w-[66px]">
                    <div className={`w-[66px] h-[66px] rounded-full p-[3px] ${s.hasStory ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600' : 'bg-neutral-700'}`}>
                      <div className="w-full h-full rounded-full bg-black p-[2px]"><div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-xl">{s.logo}</div></div>
                    </div>
                    <span className="text-[11px] text-white truncate w-full text-center">{s.name}</span>
                    {s.isUser && <span className="w-4 h-4 -mt-6 ml-8 bg-blue-500 rounded-full border-2 border-black text-white text-[10px] flex items-center justify-center">＋</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1 px-3 py-2 border-b border-neutral-800 bg-black overflow-x-auto">
              {FILTERS.map(f => (
                <button key={f.id} onClick={()=> setFilter(f.id)} className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${filter===f.id?'bg-white text-black border-white':'bg-[#262626] text-white border-neutral-700 hover:bg-neutral-700'}`}>{f.label}</button>
              ))}
              <span className="ml-auto text-[10px] text-neutral-500 hidden sm:flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {followers.toLocaleString()} takipçi</span>
            </div>

            {/* Create bar */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-black">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">{gameState.teamLogo}</div>
              <button onClick={()=> openComposerFor('instagram')} className="flex-1 text-left bg-[#262626] hover:bg-[#363636] text-neutral-400 rounded-full px-4 py-2 text-sm">Bir gönderi paylaş... Maç öncesi hype, kutlama ya da transfer ✨</button>
              <button onClick={()=> openComposerFor('instagram')} className="text-blue-500 font-semibold text-sm hover:text-white">Paylaş</button>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto bg-black">
              <div className="max-w-[470px] mx-auto w-full">
                {filtered.length===0 && (
                  <div className="text-center py-16 border border-neutral-800 rounded-xl m-4">
                    <div className="w-24 h-24 mx-auto rounded-full border-2 border-white flex items-center justify-center text-3xl mb-4">📸</div>
                    <div className="font-light text-xl">Bu platformda henüz gönderi yok</div>
                    <div className="text-sm text-neutral-400 mt-2">Paylaşmaya başla — cihazın kalitesi beğeniyi katlar.</div>
                    <button onClick={()=> openComposerFor('instagram')} className="mt-4 px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-semibold">İlk gönderini paylaş</button>
                  </div>
                )}
                {filtered.map(post=>{
                  const visual = getPostVisual(post as any);
                  const isLiked = post.liked;
                  return (
                    <article key={post.id} className="bg-black border-b lg:border border-neutral-800 lg:rounded-lg lg:mb-4 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">{post.logo}</div></div>
                          <div className="leading-tight">
                            <div className="flex items-center gap-1"><span className="font-semibold text-sm text-white">{post.author}</span>{post.verified && <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[9px] text-white">✓</span>}<span className="text-neutral-500 text-xs">• {post.timeAgo}</span></div>
                            <div className="text-[11px] text-neutral-400 -mt-0.5">{post.handle} {post.isUser && <span className="text-blue-400">• Sen</span>}</div>
                          </div>
                        </div>
                        <button className="text-white px-2">⋯</button>
                      </div>
                      <div onDoubleClick={()=> handleLike(post.id, isLiked)} className={`relative w-full aspect-square bg-gradient-to-br ${visual.gradient} flex items-center justify-center overflow-hidden cursor-pointer select-none`}>
                        <div className="absolute inset-0 opacity-20" style={{background:'radial-gradient(circle at 30% 20%, white 0.5px, transparent 1px)', backgroundSize:'24px 24px'}} />
                        <div className="relative text-center p-6">
                          <div className="text-6xl drop-shadow-lg">{visual.emoji}</div>
                          {post.type==='match' && (<div className="mt-3 bg-black/70 backdrop-blur rounded-xl px-4 py-2 border border-white/20"><div className="text-white font-black text-sm">{post.content.slice(0,80)}</div><div className="text-[10px] text-white/70 mt-1">Hafta {post.week} • Sezon {post.season}</div></div>)}
                          {post.type==='transfer' && (<div className="mt-3 text-white font-bold text-sm bg-black/60 rounded-full px-3 py-1">✍️ TRANSFER</div>)}
                        </div>
                        {likedAnim===post.id && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-8xl animate-[ping_600ms_cubic-bezier(0,0,0.2,1)] drop-shadow-2xl">❤️</span></div>)}
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-white/10"><span className="text-[11px]">📍</span><span className="text-xs text-white font-medium">{post.type==='match'?'Stadyum':post.type==='transfer'?'Transfer Merkezi':'Süper Lig'}</span></div>
                      </div>
                      <div className="px-3 pt-3 flex items-center gap-4 text-[22px] leading-none">
                        <button onClick={()=> handleLike(post.id, isLiked)} className={`hover:opacity-60 transition ${isLiked?'text-red-500':'text-white'}`}>{isLiked?'♥':'♡'}</button>
                        <button onClick={()=> document.getElementById(`comment-${post.id}`)?.focus()} className="hover:opacity-60">💬</button>
                        <button className="hover:opacity-60">✈︎</button>
                        <button className="ml-auto hover:opacity-60">🔖</button>
                      </div>
                      <div className="px-3 pt-2"><div className="text-sm font-semibold text-white">{post.likes.toLocaleString()} beğenme {post.views ? `• ${Math.round((post.views)/1000)}B izlenme` : ''}</div></div>
                      <div className="px-3 pt-1 text-[14px] leading-[18px]"><span className="font-semibold text-white mr-2">{post.author}</span><span className="text-white">{post.content}</span>{post.tags && post.tags.length>0 && (<span className="ml-1">{post.tags.map(t=> (<span key={t} className="text-[#0095f6] hover:underline cursor-pointer"> {t}</span>))}</span>)}</div>
                      <div className="px-3 pt-1 text-sm">
                        {!showAllComments[post.id] && post.comments>2 && (<button onClick={()=> setShowAllComments({...showAllComments,[post.id]:true})} className="text-neutral-400 text-sm">{post.comments} yorumun tümünü gör</button>)}
                        <div className="space-y-1 mt-1"><div className="text-sm"><span className="font-semibold mr-2">{post.type==='match'?'taraftar_1907':'futbolfan34'}</span><span className="text-neutral-200">{post.type==='match'?'Helal olsun! 🔥':post.type==='transfer'?'Hoş geldin! 💛💙':'Süper içerik 👏'}</span><span className="ml-2 text-neutral-500">♡</span></div>{showAllComments[post.id] && (<div className="text-sm"><span className="font-semibold mr-2">analiz_ekibi</span><span className="text-neutral-200">Maçın kırılma anı çok iyiydi.</span></div>)}</div>
                        <div className="text-[11px] text-neutral-500 uppercase tracking-wider mt-1">{post.timeAgo} • Hafta {post.week}</div>
                      </div>
                      <div className="mt-2 border-t border-neutral-800 flex items-center gap-2 px-3 py-2">
                        <span className="text-lg">☺</span>
                        <input id={`comment-${post.id}`} value={commentDrafts[post.id]||''} onChange={e=> setCommentDrafts({...commentDrafts,[post.id]:e.target.value})} onKeyDown={e=>{ if(e.key==='Enter' && (commentDrafts[post.id]||'').trim().length>=2){ onAddComment(post.id, commentDrafts[post.id].trim()); setCommentDrafts({...commentDrafts,[post.id]:''}); }}} placeholder="Yorum ekle..." className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-500" />
                        <button onClick={()=>{ const v=(commentDrafts[post.id]||'').trim(); if(v.length>=2){ onAddComment(post.id,v); setCommentDrafts({...commentDrafts,[post.id]:''}); }}} disabled={(commentDrafts[post.id]||'').trim().length<2} className="text-[#0095f6] font-semibold text-sm disabled:opacity-40 hover:text-white">Paylaş</button>
                      </div>
                    </article>
                  );
                })}
                <div className="h-8" />
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden xl:flex w-[319px] shrink-0 flex-col bg-black border-l border-neutral-800 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-lg">{gameState.teamLogo}</div><div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{gameState.teamName.toLowerCase().replace(/\s+/g,'')}</div><div className="text-sm text-neutral-400 truncate">{gameState.teamName}</div></div><button className="text-xs font-semibold text-[#0095f6] hover:text-white">Geçiş Yap</button></div>
              <div className="mt-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-neutral-400">Senin için önerilenler</span><button className="text-xs font-semibold">Tümünü Gör</button></div><div className="mt-4 space-y-4">{[{name:'sporgundemi',sub:'Seni takip ediyor',logo:'🎙️',verified:true},{name:'transfermerkezi',sub:'Popüler',logo:'🔥',verified:true},{name:'superlig',sub:'Takip et',logo:'🏆',verified:true},{name:'taraftar',sub:'Senin için öneriliyor',logo:'📣',verified:false},{name:'mackolik',sub:'Yeni',logo:'⚽',verified:true}].map(u=> (<div key={u.name} className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm">{u.logo}</div><div className="flex-1 min-w-0"><div className="text-sm font-semibold flex items-center gap-1">{u.name} {u.verified && <span className="w-3 h-3 bg-blue-500 rounded-full text-white text-[8px] flex items-center justify-center">✓</span>}</div><div className="text-xs text-neutral-400 truncate">{u.sub}</div></div><button className="text-xs font-semibold text-[#0095f6] hover:text-white">Takip Et</button></div>))}</div></div>
              <div className="mt-6"><div className="text-sm font-semibold text-neutral-400 mb-3">Gündem</div><div className="space-y-3">{TRENDING.slice(0,5).map(t=> (<div key={t.tag} className="flex justify-between"><div><div className="text-sm font-medium text-white">{t.tag}</div><div className="text-xs text-neutral-400">{t.posts} gönderi</div></div><button className="text-neutral-500">›</button></div>))}</div></div>
              <div className="mt-6 bg-[#262626] rounded-xl p-3 border border-neutral-800"><div className="text-xs text-neutral-400">Hesabın</div><div className="text-lg font-bold">{followers.toLocaleString()} takipçi</div><div className="text-xs text-neutral-400">Haftalık +{(followers*0.04|0).toLocaleString()} • Etkileşim %{Math.min(94,42+feed.filter((p:any)=>p.isUser).length*6)}</div><div className="grid grid-cols-3 gap-2 mt-3 text-center"><div className="bg-black rounded-lg py-2"><div className="font-bold text-sm">{feed.filter((p:any)=>p.isUser).length}</div><div className="text-[10px] text-neutral-400">Gönderi</div></div><div className="bg-black rounded-lg py-2"><div className="font-bold text-sm">{feed.length}</div><div className="text-[10px] text-neutral-400">Akış</div></div><div className="bg-black rounded-lg py-2"><div className="font-bold text-sm">{gameState.week}/18</div><div className="text-[10px] text-neutral-400">Hafta</div></div></div></div>
            </div>
          </div>
        </div>
      )}

      {platform==='tiktok' && (
        <div className="flex-1 flex overflow-hidden bg-black">
          {/* TikTok header */}
          <div className="flex-1 flex flex-col min-w-0 bg-black">
            <div className="h-[44px] border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 bg-black">
              <div className="flex items-center gap-2">
                <span className="text-white font-black tracking-tight flex items-center gap-1"><span className="text-xl">🎵</span> TikTok <span className="text-cyan-400">Futbol</span></span>
                <span className="text-[10px] bg-white text-black px-1.5 py-0.5 rounded font-bold">FOR YOU</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex bg-[#1a1a1a] rounded-full px-3 py-1.5 items-center gap-2">
                  <span className="text-neutral-400">⌕</span>
                  <input placeholder="Ara #keşfet" className="bg-transparent outline-none text-sm placeholder:text-neutral-500 w-[160px]" value={ytQuery} onChange={e=> setYtQuery(e.target.value)} />
                </div>
                <button onClick={()=> openComposerFor('tiktok')} className="bg-[#fe2c55] hover:bg-[#e0264a] text-white px-3 py-1.5 rounded-full text-xs font-bold">＋ Clip</button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center text-white font-black text-sm">{gameState.teamLogo}</div>
              </div>
            </div>

            {/* TikTok top pills */}
            <div className="flex gap-1 px-3 py-2 border-b border-neutral-800 bg-black overflow-x-auto">
              {FILTERS.map(f=> (<button key={f.id} onClick={()=> setFilter(f.id)} className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${filter===f.id?'bg-white text-black':'bg-[#2f2f2f] text-white hover:bg-neutral-700'}`}>{f.label}</button>))}
              <span className="ml-auto hidden sm:flex items-center gap-1 text-[11px] text-neutral-400"><span className="w-2 h-2 bg-[#fe2c55] rounded-full animate-pulse" /> {platformFeed.length} clip</span>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Vertical feed */}
              <div className="flex-1 overflow-y-auto bg-black snap-y snap-mandatory">
                <div className="max-w-[360px] mx-auto">
                  {/* TikTok browse catalogue + social feed mixed */}
                  <div className="snap-start relative h-[560px] bg-gradient-to-br from-neutral-900 to-black border-b border-neutral-800 flex flex-col">
                    {/* Browse catalogue carousel on top */}
                    <div className="h-[560px] flex flex-col">
                      {(() => {
                        const combined = [
                          ...filtered.map(p=> ({ kind:'post' as const, post: p })),
                          ...TIKTOK_VIDEOS.map(v=> ({ kind:'catalog' as const, video: v })),
                        ];
                        const item = combined[ttIndex % combined.length];
                        if (!item) return (<div className="flex-1 flex items-center justify-center text-neutral-500">Clip yok — ilk clipini at!</div>);
                        if (item.kind==='post') {
                          const post = item.post as SocialPost;
                          const isLiked = post.liked;
                          const visual = getPostVisual(post);
                          return (
                            <div className="flex-1 relative flex">
                              <div className={`flex-1 bg-gradient-to-br ${visual.gradient} relative flex items-center justify-center overflow-hidden`}>
                                <div className="absolute inset-0 bg-black/20" />
                                <div className="relative text-center p-6">
                                  <div className="text-7xl drop-shadow-xl">{visual.emoji}</div>
                                  <div className="mt-3 bg-black/60 rounded-xl px-3 py-2 max-w-[260px]"><div className="text-white text-sm font-bold line-clamp-3">{post.content}</div><div className="text-[11px] text-white/70">{post.tags?.join(' ')}</div></div>
                                </div>
                                {likedAnim===post.id && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-7xl animate-[ping_600ms_cubic-bezier(0,0,0.2,1)]">❤️</span></div>)}
                                {/* progress */}
                                <div className="absolute bottom-0 left-0 right-12 h-1 bg-white/30"><div className="h-full bg-white" style={{width:'62%'}} /></div>
                              </div>
                              {/* Right actions */}
                              <div className="w-16 bg-black flex flex-col items-center py-4 gap-4 border-l border-neutral-800">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-pink-500 p-[2px]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">{post.logo}</div></div>
                                <button onClick={()=> handleLike(post.id, isLiked)} className="flex flex-col items-center gap-1"><span className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isLiked?'bg-[#fe2c55] text-white':'bg-[#2f2f2f] text-white'}`}>{isLiked?'♥':'♡'}</span><span className="text-[11px] font-bold">{post.likes>1000? (post.likes/1000).toFixed(1)+'B': post.likes}</span></button>
                                <button onClick={()=> document.getElementById(`tt-comment-${post.id}`)?.focus()} className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#2f2f2f] flex items-center justify-center">💬</span><span className="text-[11px] font-bold">{post.comments}</span></button>
                                <button className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#2f2f2f] flex items-center justify-center">↗︎</span><span className="text-[11px] font-bold">Paylaş</span></button>
                                <button className="w-8 h-8 rounded-full bg-[#2f2f2f] flex items-center justify-center text-sm">🔖</button>
                                <div className="mt-auto w-10 h-10 rounded-full bg-neutral-800 border-2 border-white flex items-center justify-center text-xs animate-spin" style={{animationDuration:'3s'}}>💿</div>
                              </div>
                              {/* Bottom caption */}
                              <div className="absolute bottom-3 left-3 right-20 text-white">
                                <div className="font-bold text-sm flex items-center gap-1">{post.handle} {post.verified && <span className="w-3 h-3 bg-cyan-400 rounded-full flex items-center justify-center text-[8px] text-black">✓</span>} <span className="border border-white px-1.5 py-0.5 rounded text-[10px]">Takip Et</span></div>
                                <div className="text-sm leading-snug mt-1">{post.content}</div>
                                <div className="text-xs text-white/80 mt-1">🎵 orijinal ses — {post.author} • Hafta {post.week}</div>
                                <div className="flex gap-2 mt-2"><span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">#keşfet</span><span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">#SüperLig</span></div>
                              </div>
                              {/* Nav */}
                              <div className="absolute top-1/2 -translate-y-1/2 left-2 flex flex-col gap-2">
                                <button onClick={()=> setTtIndex(i=> Math.max(0,i-1))} className="w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white">‹</button>
                                <button onClick={()=> setTtIndex(i=> i+1)} className="w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white">›</button>
                              </div>
                              <div className="absolute top-3 right-20 bg-black/60 px-2 py-1 rounded-full text-[11px] flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> {post.views ? (post.views/1000).toFixed(1)+'B izlenme' : 'viral'}</div>
                            </div>
                          );
                        } else {
                          const v = (item as any).video as typeof TIKTOK_VIDEOS[0];
                          return (
                            <div className="flex-1 relative flex">
                              <div className={`flex-1 bg-gradient-to-br ${v.gradient} flex items-center justify-center relative`}>
                                <div className="text-center p-6">
                                  <div className="text-7xl drop-shadow-xl">{v.emoji}</div>
                                  <div className="mt-3 bg-black/60 rounded-xl px-3 py-2"><div className="text-white font-bold">{v.title}</div><div className="text-xs text-white/70">{v.author} • {v.duration}</div></div>
                                </div>
                              </div>
                              <div className="w-16 bg-black flex flex-col items-center py-4 gap-4 border-l border-neutral-800">
                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">📺</div>
                                <button className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#fe2c55] flex items-center justify-center">♥</span><span className="text-[11px] font-bold">{v.likes}</span></button>
                                <button className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#2f2f2f] flex items-center justify-center">💬</span><span className="text-[11px] font-bold">{v.comments}</span></button>
                                <button className="w-8 h-8 rounded-full bg-[#2f2f2f] flex items-center justify-center">↗︎</button>
                              </div>
                              <div className="absolute bottom-3 left-3 right-20 text-white">
                                <div className="font-bold text-sm">{v.author}</div>
                                <div className="text-sm">{v.title}</div>
                                <div className="text-xs text-white/80 mt-1">🎵 orijinal ses</div>
                              </div>
                              <div className="absolute top-1/2 -translate-y-1/2 left-2 flex flex-col gap-2">
                                <button onClick={()=> setTtIndex(i=> Math.max(0,i-1))} className="w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white">‹</button>
                                <button onClick={()=> setTtIndex(i=> i+1)} className="w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white">›</button>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                    <div className="h-10 bg-black border-t border-neutral-800 flex items-center justify-between px-3">
                      <div className="flex gap-1 flex-1">
                        <input id={`tt-comment-${ttIndex}`} value={commentDrafts[`tt-${ttIndex}`]||''} onChange={e=> setCommentDrafts({...commentDrafts,[`tt-${ttIndex}`]:e.target.value})} placeholder="Yorum ekle..." className="flex-1 bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm outline-none placeholder:text-neutral-500" />
                        <button onClick={()=>{ const v=(commentDrafts[`tt-${ttIndex}`]||'').trim(); if(v.length>=2){ const postId = filtered[0]?.id; if(postId) onAddComment(postId, v); setCommentDrafts({...commentDrafts,[`tt-${ttIndex}`]:''}); }}} className="text-[#fe2c55] font-bold text-sm px-2">Gönder</button>
                      </div>
                      <div className="ml-3 flex gap-1">{Array.from({length:6}).map((_,i)=>(<button key={i} onClick={()=> setTtIndex(i)} className={`w-1.5 h-1.5 rounded-full ${ttIndex===i?'bg-white':'bg-neutral-600'}`} />))}</div>
                    </div>
                  </div>

                  {/* List below */}
                  <div className="p-3 space-y-2 bg-[#0a0a0a]">
                    <div className="text-xs font-bold text-neutral-400 flex items-center gap-2">🔥 Keşfette Öne Çıkanlar <span className="ml-auto text-[11px] text-neutral-500">{TIKTOK_VIDEOS.length} clip • kaydır</span></div>
                    <div className="grid grid-cols-3 gap-2">
                      {TIKTOK_VIDEOS.slice(0,6).map((v,i)=> (
                        <button key={v.id} onClick={()=> setTtIndex(i)} className={`aspect-[9/16] rounded-lg bg-gradient-to-br ${v.gradient} p-2 flex flex-col justify-end border ${ttIndex===i?'border-white':'border-neutral-800'} hover:scale-[1.02] transition`}>
                          <div className="text-lg">{v.emoji}</div>
                          <div className="text-[11px] font-bold text-white line-clamp-2 leading-tight">{v.title}</div>
                          <div className="text-[10px] text-white/70">{v.likes} ❤️</div>
                        </button>
                      ))}
                    </div>
                    {filtered.length>0 && (<div className="pt-2"><div className="text-xs font-bold text-white mb-2">Senin Akışın ({filtered.length})</div><div className="space-y-2">{filtered.slice(0,4).map(p=> (<div key={p.id} className="bg-neutral-900 rounded-lg p-2 flex gap-2 border border-neutral-800"><div className="w-16 h-24 rounded bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-xl">{getPostVisual(p as any).emoji}</div><div className="flex-1 min-w-0"><div className="text-white text-sm font-bold truncate">{p.author}</div><div className="text-xs text-neutral-300 line-clamp-2">{p.content}</div><div className="text-[11px] text-neutral-500">{p.likes.toLocaleString()} beğeni • {p.views?.toLocaleString()} izlenme</div><div className="flex gap-1 mt-1"><button onClick={()=> handleLike(p.id, p.liked)} className={`text-xs px-2 py-1 rounded-full ${p.liked?'bg-red-500 text-white':'bg-neutral-700 text-white'}`}>{p.liked?'❤️ Beğendin':'♡ Beğen'}</button><button onClick={()=> setTtIndex(filtered.findIndex(x=> x.id===p.id))} className="text-xs px-2 py-1 rounded-full bg-white text-black">İzle</button></div></div></div>))}</div></div>)}
                  </div>
                </div>
              </div>

              {/* Desktop right: comments / suggestions */}
              <div className="hidden lg:flex w-[320px] shrink-0 border-l border-neutral-800 bg-black flex-col overflow-hidden">
                <div className="p-3 border-b border-neutral-800">
                  <div className="text-sm font-bold">Yorumlar</div>
                  <div className="text-xs text-neutral-500">Canlı sohbet — #keşfet</div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {[
                    {u:'taraftar_1907', c:'Bu gol inanılmazdı 🔥', t:'2d'},
                    {u:'futbolfan34', c:'Hocanın taktiği efsane', t:'1s'},
                    {u:'analiz_ekibi', c:'Keşfete düştük!', t:'şimdi'},
                  ].map((x,i)=> (<div key={i} className="flex gap-2"><div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs">👤</div><div><div className="text-xs font-bold">{x.u} <span className="text-neutral-500 font-normal">{x.t}</span></div><div className="text-xs text-neutral-300">{x.c}</div></div></div>))}
                </div>
                <div className="p-3 border-t border-neutral-800">
                  <div className="bg-[#1a1a1a] rounded-xl p-2">
                    <div className="text-xs font-bold flex items-center gap-1">📱 Cihaz Etkisi <span className="ml-auto text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">{platformBonusText}</span></div>
                    <div className="text-[11px] text-neutral-400 mt-1">TikTok’ta dikey çekim — perf yüksekse akıcılık + izlenme fırlar. Teknoloji → AVM’den Canavar laptop al.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {platform==='youtube' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">
          {/* YT header */}
          <div className="h-[56px] flex items-center gap-3 px-3 shrink-0 bg-[#0f0f0f] border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-full">☰</button>
              <span className="font-black flex items-center gap-1 text-white"><span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-sm">▶</span> YouTube <span className="text-[10px] text-neutral-500 font-normal ml-1">TR</span></span>
            </div>
            <div className="flex-1 max-w-[640px] mx-auto flex">
              <div className="flex-1 flex">
                <input value={ytQuery} onChange={e=> setYtQuery(e.target.value)} placeholder="Ara" className="flex-1 bg-[#121212] border border-neutral-700 rounded-l-full px-4 py-1.5 text-sm outline-none placeholder:text-neutral-500 focus:border-blue-500" />
                <button className="bg-[#222] border border-l-0 border-neutral-700 rounded-r-full px-5 hover:bg-neutral-800">⌕</button>
              </div>
              <button className="ml-2 w-9 h-9 bg-[#272727] hover:bg-neutral-700 rounded-full flex items-center justify-center">🎙️</button>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={()=> openComposerFor('youtube')} className="bg-[#272727] hover:bg-neutral-700 rounded-full px-3 py-1.5 text-sm flex items-center gap-1"><span>＋</span> Oluştur</button>
              <button className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">🔔<span className="absolute ml-3 -mt-3 w-4 h-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center">9+</span></button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">{gameState.teamLogo}</div>
            </div>
          </div>

          {/* YT categories */}
          <div className="flex gap-2 px-3 py-2 bg-[#0f0f0f] border-b border-neutral-800 overflow-x-auto shrink-0">
            {YOUTUBE_CATEGORIES.map(c=> (
              <button key={c.id} onClick={()=> setYtCategory(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${ytCategory===c.id?'bg-white text-black':'bg-[#272727] text-white hover:bg-neutral-700'}`}>{c.label}</button>
            ))}
            <span className="ml-auto hidden md:flex items-center gap-1 text-[11px] text-neutral-500"><span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> {ytVideosFiltered.length} video</span>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Main: player + feed */}
            <div className="flex-1 overflow-y-auto">
              {/* Player */}
              <div className="bg-black">
                <div className="aspect-video bg-black relative">
                  <iframe
                    key={ytWatchId}
                    src={`https://www.youtube.com/embed/${ytWatchId}?rel=0&modestbranding=1&playsinline=1`}
                    title="YouTube video player"
                    className="w-full h-full"
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded-full flex items-center gap-1"><span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> Canlı değil • YouTube gömülü oynatıcı</div>
                </div>
                <div className="p-3 bg-[#0f0f0f]">
                  <div className="text-white font-bold text-[16px] leading-tight">{currentYt.title}</div>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm">{currentYt.channelIcon}</div>
                      <div><div className="text-white text-sm font-medium leading-none">{currentYt.channel}</div><div className="text-xs text-neutral-400">1.2 Mn abone</div></div>
                      <button className="ml-2 bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold hover:bg-neutral-200">Abone Ol</button>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="flex bg-[#272727] rounded-full overflow-hidden">
                        <button className="px-3 py-1.5 text-sm flex items-center gap-1 hover:bg-neutral-700 text-white">👍 {Math.floor(Math.random()*8000+1200).toLocaleString()}</button>
                        <div className="w-px bg-neutral-700" />
                        <button className="px-3 py-1.5 hover:bg-neutral-700">👎</button>
                      </div>
                      <button className="bg-[#272727] hover:bg-neutral-700 rounded-full px-3 py-1.5 text-sm text-white">↗︎ Paylaş</button>
                      <button className="bg-[#272727] hover:bg-neutral-700 rounded-full px-3 py-1.5 text-sm text-white">⬇︎ İndir</button>
                    </div>
                  </div>
                  <div className="mt-3 bg-[#272727] rounded-xl p-3">
                    <div className="text-sm font-bold text-white flex items-center gap-2">{currentYt.views} görüntüleme • {currentYt.timeAgo} <span className="text-neutral-400 font-normal">#SüperLig #Futbol</span></div>
                    <div className="text-xs text-neutral-300 mt-1">▶️ {currentYt.channel} kanalında • Kategori: {currentYt.category} • YouTubedan baya video izle — aşağıdaki listeden seç, hemen oynat!</div>
                    <div className="text-[11px] text-neutral-500 mt-1">💡 İpucu: Kaliteli kamera & PC ile YouTube yüklemelerin izlenmesi fırlar. Şu an aktif: {activeDevice?.name} (q{devQuality}) — {platformBonusText}</div>
                  </div>

                  {/* Comments */}
                  <div className="mt-3">
                    <div className="text-sm font-bold text-white flex items-center gap-2">{filtered.length} yorum <span className="text-neutral-500 font-normal">Sırala ▾</span></div>
                    <div className="flex gap-2 mt-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-xs">{gameState.teamLogo}</div>
                      <div className="flex-1 flex gap-2">
                        <input value={commentDrafts[`yt-player`]||''} onChange={e=> setCommentDrafts({...commentDrafts,[`yt-player`]:e.target.value})} onKeyDown={e=>{ if(e.key==='Enter' && (commentDrafts[`yt-player`]||'').trim().length>=2){ const pid = filtered[0]?.id; if(pid) onAddComment(pid, commentDrafts[`yt-player`].trim()); setCommentDrafts({...commentDrafts,[`yt-player`]:''}); }}} placeholder="Yorum ekleyin..." className="flex-1 bg-transparent border-b border-neutral-700 outline-none text-sm placeholder:text-neutral-500 py-1" />
                        <button onClick={()=>{ const v=(commentDrafts[`yt-player`]||'').trim(); if(v.length>=2){ const pid=filtered[0]?.id; if(pid) onAddComment(pid,v); setCommentDrafts({...commentDrafts,[`yt-player`]:''}); }}} className="bg-[#263850] text-[#8ab4f8] px-3 py-1.5 rounded-full text-xs font-bold disabled:opacity-40" disabled={(commentDrafts[`yt-player`]||'').trim().length<2}>Yorum yap</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* YT grid: catalog + social feed youtube posts */}
              <div className="p-3 bg-[#0f0f0f]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">▶️ Sıradaki videolar — YouTube Kataloğu <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">18 video</span></h3>
                  <span className="text-xs text-neutral-400">Filtre: {ytCategory} • Ara: {ytQuery || '—'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ytVideosFiltered.map(v=> (
                    <button key={v.id} onClick={()=> setYtWatchId(v.videoId)} className={`text-left rounded-xl overflow-hidden border bg-[#1f1f1f] hover:bg-[#272727] transition ${ytWatchId===v.videoId?'border-white':'border-neutral-800'}`}>
                      <div className="relative aspect-video bg-black">
                        <img src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" loading="lazy" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                        <div className={`absolute inset-0 bg-gradient-to-br from-violet-600/20 to-cyan-600/20 ${ytWatchId===v.videoId?'opacity-60':''}`} />
                        <div className="absolute inset-0 flex items-center justify-center"><span className="w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white text-lg border border-white/20">▶</span></div>
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[11px] px-1 py-0.5 rounded">{v.duration}</span>
                        {v.category==='canlı' && <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1 py-0.5 rounded font-bold">CANLI</span>}
                        {ytWatchId===v.videoId && <span className="absolute top-1 right-1 bg-white text-black text-[10px] px-1 py-0.5 rounded font-bold">▶ Oynatılıyor</span>}
                      </div>
                      <div className="p-2.5 flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-sm shrink-0">{v.channelIcon}</div>
                        <div className="min-w-0">
                          <div className="text-white text-xs font-bold leading-tight line-clamp-2">{v.title}</div>
                          <div className="text-[11px] text-neutral-400">{v.channel} ✓</div>
                          <div className="text-[11px] text-neutral-500">{v.views} • {v.timeAgo}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Social feed youtube posts as Shorts */}
                {filtered.length>0 && (
                  <div className="mt-4">
                    <h4 className="text-white font-bold text-sm mb-2">💬 Topluluk Gönderileri — YouTube Akışı</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {filtered.slice(0,6).map(post=>(
                        <div key={post.id} className="bg-[#272727] rounded-xl p-3 border border-neutral-800">
                          <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-sm">{post.logo}</div><div><div className="text-white text-xs font-bold">{post.author} {post.verified && <span className="text-[10px] bg-neutral-600 px-1 rounded">✓</span>}</div><div className="text-[11px] text-neutral-400">{post.handle} • {post.timeAgo}</div></div><span className="ml-auto text-[11px] bg-red-600 text-white px-1.5 py-0.5 rounded-full">▶ YouTube</span></div>
                          <div className="text-sm text-white mt-2">{post.content}</div>
                          <div className="flex gap-2 mt-2 text-xs text-neutral-400"><span>👍 {post.likes.toLocaleString()}</span><span>👁️ {post.views?.toLocaleString()}</span><span>💬 {post.comments}</span></div>
                          <div className="flex gap-1 mt-2"><button onClick={()=> handleLike(post.id, post.liked)} className={`px-2 py-1 rounded-full text-xs ${post.liked?'bg-white text-black':'bg-neutral-700 text-white'}`}>{post.liked?'❤️ Beğendin':'♡ Beğen'}</button><button onClick={()=> setYtWatchId(post.videoId||'pRpeEdMmmQ0')} className="px-2 py-1 rounded-full bg-red-600 text-white text-xs">▶ İzle</button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right rail - suggestions */}
            <div className="hidden xl:flex w-[402px] shrink-0 flex-col bg-[#0f0f0f] border-l border-neutral-800 overflow-y-auto">
              <div className="p-2 space-y-2">
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {YOUTUBE_CATEGORIES.map(c=> (<button key={c.id} onClick={()=> setYtCategory(c.id)} className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap ${ytCategory===c.id?'bg-white text-black':'bg-[#272727] text-white'}`}>{c.label}</button>))}
                </div>
                {ytVideosFiltered.slice(0,10).map(v=> (
                  <button key={`rail-${v.id}`} onClick={()=> setYtWatchId(v.videoId)} className={`flex gap-2 text-left p-1 rounded-lg hover:bg-[#272727] ${ytWatchId===v.videoId?'bg-[#272727]':''}`}>
                    <div className="w-[168px] aspect-video bg-black rounded-lg overflow-hidden relative shrink-0">
                      <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                      <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">{v.duration}</span>
                    </div>
                    <div className="min-w-0 py-0.5">
                      <div className="text-white text-xs font-medium line-clamp-2 leading-tight">{v.title}</div>
                      <div className="text-[11px] text-neutral-400 truncate">{v.channel}</div>
                      <div className="text-[11px] text-neutral-500">{v.views} • {v.timeAgo}</div>
                    </div>
                  </button>
                ))}
                <div className="bg-[#272727] rounded-xl p-3 mt-2">
                  <div className="text-white text-sm font-bold">📱 Cihazın Etkisi</div>
                  <div className="text-xs text-neutral-400 mt-1">YouTube’da aktif cihazın kamerası + performansı izlenmeyi belirler. Şu an {activeDevice?.name} — {platformBonusText}</div>
                  <div className="text-[11px] text-amber-300 mt-1">İpucu: Canavar laptop + A7S III ile 4K yükle → izlenme 3×</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Composer — platforma duyarlı ── */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[740px] bg-[#262626] rounded-xl overflow-hidden border border-neutral-700 flex flex-col max-h-[90vh]">
            <div className="h-[42px] border-b border-neutral-700 flex items-center justify-between px-4 shrink-0">
              <button onClick={()=> setShowComposer(false)} className="text-xl">✕</button>
              <div className="font-semibold text-sm flex items-center gap-2">
                {composerPlatform==='instagram' && <span className="bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] bg-clip-text text-transparent">Instagram’da paylaş</span>}
                {composerPlatform==='tiktok' && <span className="text-white">TikTok clip yükle</span>}
                {composerPlatform==='youtube' && <span className="text-white flex items-center gap-1"><span className="bg-red-600 px-1 rounded text-white text-xs">▶</span> YouTube video yükle</span>}
              </div>
              <button onClick={handlePost} disabled={!canPost} className={`text-sm font-semibold ${canPost?'text-[#0095f6] hover:text-white':'text-[#0095f6]/40'}`}>Paylaş</button>
            </div>

            {/* platform tabs inside composer */}
            <div className="flex gap-1 p-2 bg-black border-b border-neutral-700">
              {(Object.keys(PLATFORM_META) as SocialPlatform[]).map(pf=> (
                <button key={pf} onClick={()=> setComposerPlatform(pf)} className={`flex-1 py-1.5 rounded-full text-xs font-black flex items-center justify-center gap-1 ${composerPlatform===pf?'bg-white text-black':'bg-neutral-800 text-white hover:bg-neutral-700'}`}>
                  <span>{PLATFORM_META[pf].icon}</span> {PLATFORM_META[pf].label}
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              <div className="lg:w-[360px] bg-black flex flex-col">
                <div className={`flex-1 flex items-center justify-center relative ${composerPlatform==='instagram'?'aspect-square': composerPlatform==='tiktok'?'aspect-[9/16] max-h-[420px]':'aspect-video'} bg-gradient-to-br ${selectedImage ? (IMAGE_PRESETS.find(p=> p.id===selectedImage)?.gradient || 'from-neutral-800 to-black') : composerPlatform==='tiktok'?'from-neutral-900 via-black to-neutral-800': composerPlatform==='youtube'?'from-red-900/30 to-black':'from-neutral-800 to-black'}`}>
                  <span className="text-6xl">{selectedImage ? IMAGE_PRESETS.find(p=> p.id===selectedImage)?.emoji : composerPlatform==='tiktok'?'🎵': composerPlatform==='youtube'?'▶️':'🖼️'}</span>
                  {!selectedImage && <span className="absolute bottom-3 text-xs bg-black/70 rounded-full px-3 py-1">{composerPlatform==='instagram'?'Fotoğraf Seç': composerPlatform==='tiktok'?'Dikey Clip Seç':'Kapak Seç'}</span>}
                  {selectedImage && <span className="absolute bottom-3 text-xs bg-black/70 rounded-full px-3 py-1">{IMAGE_PRESETS.find(p=> p.id===selectedImage)?.label}</span>}
                  {composerPlatform==='youtube' && selectedImage && <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">HD 1080p • {devQuality>=80?'4K':devQuality>=60?'1080p':'720p'}</span>}
                  {composerPlatform==='tiktok' && <span className="absolute bottom-8 text-[11px] bg-black/60 px-2 py-0.5 rounded-full text-white">9:16 dikey • {devPerf>=80?'60fps akıcı':'30fps'}</span>}
                </div>
                <div className="p-3 grid grid-cols-4 gap-2 border-t border-neutral-700 bg-[#262626]">
                  {IMAGE_PRESETS.map(p=> (
                    <button key={p.id||'none'} onClick={()=> setSelectedImage(p.id)} className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 text-xs ${selectedImage===p.id?'border-white bg-white text-black':'border-neutral-700 bg-neutral-800 text-white hover:border-neutral-500'}`}>
                      <span className="text-lg">{p.emoji||'—'}</span><span className="text-[10px] leading-none">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-xs">{gameState.teamLogo}</div>
                  <div className="text-sm font-semibold">{gameState.teamName.toLowerCase().replace(/\s+/g,'')}</div>
                  <span className="ml-auto text-xs bg-[#363636] rounded-full px-2 py-1">{composer.length}/{charLimit}</span>
                </div>
                <textarea value={composer} onChange={e=> setComposer(e.target.value)} placeholder={composerPlatform==='youtube'? `Başlık yaz... #${gameState.teamName.replace(/\s+/g,'')} için video açıklaması`: composerPlatform==='tiktok'? `Clip açıklaması yaz... #keşfet #${gameState.teamName.replace(/\s+/g,'')}` : `Bir açıklama yaz... #${gameState.teamName.replace(/\s+/g,'')} için neler düşünüyorsun?`} className="flex-1 min-h-[140px] bg-transparent outline-none text-sm placeholder:text-neutral-500 resize-none" maxLength={320} />
                <div className="flex items-center justify-between mt-3"><span className={`text-xs ${composer.length>260?'text-amber-400':'text-neutral-500'}`}>{charLimit-composer.length} kaldı</span><span className="text-[11px] text-neutral-500">😊 #️⃣</span></div>
                <div className="mt-4"><div className="text-xs font-semibold text-neutral-400 mb-2">Hızlı şablonlar ({composerPlatform})</div><div className="grid grid-cols-1 gap-1.5">{QUICK_TEMPLATES.slice(0, composerPlatform==='youtube'?3:4).map(t=> (<button key={t.label} onClick={()=> setComposer(t.text)} className="text-left bg-[#363636] hover:bg-[#426] border border-neutral-700 rounded-lg px-3 py-2 text-xs flex items-center gap-2"><span>{t.icon}</span><span className="font-semibold">{t.label}</span><span className="text-neutral-400 truncate ml-auto max-w-[160px]">{t.text.slice(0,36)}…</span></button>))}</div></div>
                <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-[11px] text-amber-200">Aktif cihaz: {activeDevice?.name} (K: {devQuality} • Kam: {devCamera} • Perf: {devPerf}) — {composerPlatform==='instagram'?'Kamera yükselt → fotoğraf net, beğeni artar': composerPlatform==='tiktok'?'Perf yükselt → dikey video akıcı, keşfete düşme ↑':'Kamera+Perf → 4K video, YouTube izlenme fırlar'} • Teknoloji → AVM’den yükselt</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{` .scrollbar-hide::-webkit-scrollbar{display:none} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none} `}</style>
    </div>
  );
};
