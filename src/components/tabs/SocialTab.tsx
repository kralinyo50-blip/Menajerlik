import React, { useState, useMemo, useEffect } from 'react';
import { GameState, SocialPost, SocialPlatform } from '../../types/game';
import { QUICK_TEMPLATES, TRENDING } from '../../data/social';
import { YOUTUBE_VIDEOS, YOUTUBE_CATEGORIES, TIKTOK_VIDEOS } from '../../data/youtubeCatalog';
import { starBonuses } from '../../utils/stadium';

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

const PLATFORM_META: Record<SocialPlatform, { label: string; icon: string; gradient: string; desc: string; color: string }> = {
  instagram: { label: 'Instagram', icon: '📸', gradient: 'from-[#feda75] via-[#d62976] to-[#4f5bd5]', desc: 'Foto & hikâye', color: '#E4405F' },
  tiktok: { label: 'TikTok', icon: '🎵', gradient: 'from-cyan-400 via-neutral-900 to-pink-500', desc: 'Dikey clip', color: '#000000' },
  youtube: { label: 'YouTube', icon: '▶️', gradient: 'from-red-600 to-red-700', desc: 'Video & canlı', color: '#FF0000' },
};

function getPostVisual(post: SocialPost) {
  if (post.image) {
    const preset = IMAGE_PRESETS.find(p => p.id === post.image);
    if (preset && preset.gradient) return preset;
  }
  if (post.type === 'match') {
    const won = post.content.includes('galibiyet') || post.content.includes('kazand') || post.content.includes('3 PUAN') || post.content.includes('MAÇ SONUCU');
    return won ? { gradient: 'from-emerald-700 via-emerald-600 to-teal-600', emoji: '🏟️' } : post.content.includes('BERABERE') ? { gradient: 'from-slate-600 to-slate-700', emoji: '🤝' } : { gradient: 'from-zinc-700 to-zinc-800', emoji: '😔' };
  }
  if (post.type === 'transfer') return { gradient: 'from-amber-600 via-orange-600 to-red-600', emoji: '✍️' };
  if (post.type === 'news') return { gradient: 'from-blue-700 via-indigo-700 to-violet-700', emoji: '📰' };
  return { gradient: 'from-neutral-700 to-neutral-800', emoji: '⚽' };
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
  const [crossPost, setCrossPost] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [likedAnim, setLikedAnim] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState<Record<string, boolean>>({});
  const [ytCategory, setYtCategory] = useState<string>('all');
  const [ytWatchId, setYtWatchId] = useState<string>(YOUTUBE_VIDEOS[0].videoId);
  const [ytQuery, setYtQuery] = useState('');
  const [ytTheater, setYtTheater] = useState(false);
  const [ytAutoplay, setYtAutoplay] = useState(true);
  const [ttIndex, setTtIndex] = useState(0);
  const [ttTab, setTtTab] = useState<'fyp'|'takip'>('fyp');
  const [igMode, setIgMode] = useState<'feed'|'explore'>('feed');
  const [storyViewer, setStoryViewer] = useState<null | { name: string; logo: string; gradient: string }>(null);
  const [dmOpen, setDmOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [postMenu, setPostMenu] = useState<string | null>(null);
  const [exploreLiked, setExploreLiked] = useState<Record<number, boolean>>({});

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

  const followersByPlatform = useMemo(()=>({
    instagram: Math.round(followers * 0.52),
    tiktok: Math.round(followers * 0.31),
    youtube: Math.round(followers * 0.17),
  }), [followers]);

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
    if (crossPost) {
      (['instagram','tiktok','youtube'] as SocialPlatform[]).forEach(pf=>{
        onCreatePost(composer.trim(), selectedImage || undefined, pf);
      });
    } else {
      onCreatePost(composer.trim(), selectedImage || undefined, composerPlatform);
    }
    setComposer(''); setSelectedImage(''); setShowComposer(false);
  };
  const handleLike = (id: string, liked: boolean) => {
    onLikePost(id);
    if (!liked) { setLikedAnim(id); setTimeout(()=> setLikedAnim(null), 650); }
  };

  const stories = useMemo(() => {
    const teams = gameState.league.slice(0, 8);
    return [
      { id: 'user', name: 'Hikayen', logo: gameState.teamLogo, isUser: true, hasStory: true, gradient: 'from-amber-400 via-pink-500 to-violet-600' },
      ...teams.filter(t => !t.isUser).slice(0, 7).map(t => ({ id: t.name, name: t.name.split(' ')[0], logo: t.logo, isUser: false, hasStory: Math.random() < 0.85, gradient: 'from-emerald-400 to-cyan-600' })),
      { id: 'sporgundemi', name: 'sporgundemi', logo: '🎙️', isUser: false, hasStory: true, gradient: 'from-orange-400 to-red-600' },
    ];
  }, [gameState.league, gameState.teamLogo]);

  const platformBonusText = useMemo(()=>{
    const devBonus = Math.round((devQuality-42)/12);
    if (platform==='instagram') return `📸 Kamera ${devCamera} → +${Math.round(devCamera*0.9+devBonus*70)} beğeni`;
    if (platform==='tiktok') return `⚡ Perf ${devPerf} → +${Math.round(devPerf*1.1+devBonus*85)} izlenme`;
    return `🎬 Kamera+Perf → +${Math.round((devCamera+devPerf)/2+devBonus*95+devQuality)} izlenme`;
  }, [platform, devCamera, devPerf, devQuality]);

  const qualityLabel = devQuality>=85 ? '4K' : devQuality>=65 ? '1080p' : devQuality>=50 ? '720p' : '480p';
  const qualityBlur = devQuality<50 ? 'blur-[1.5px]' : devQuality<65 ? 'blur-[0.6px]' : '';

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

  // keyboard for tiktok
  useEffect(()=>{
    if (platform!=='tiktok') return;
    const onKey = (e: KeyboardEvent)=>{
      if (e.key==='ArrowDown') setTtIndex(i=> i+1);
      if (e.key==='ArrowUp') setTtIndex(i=> Math.max(0,i-1));
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [platform]);

  return (
    <div className="h-full flex flex-col bg-black text-white -m-3 lg:-m-6 rounded-xl lg:rounded-2xl overflow-hidden border border-neutral-800">
      {/* ── Platform selector — premium ── */}
      <div className="bg-[#0f0f0f] border-b border-neutral-800 px-3 py-2 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black tracking-widest text-neutral-500 hidden sm:inline">SOSYAL</span>
          <div className="flex bg-[#1a1a1a] rounded-full p-1 gap-1">
            {(Object.keys(PLATFORM_META) as SocialPlatform[]).map(pf=>{
              const meta = PLATFORM_META[pf];
              const active = platform===pf;
              const count = feed.filter((p:any)=> (p.platform||'instagram')===pf).length;
              return (
                <button
                  key={pf}
                  onClick={()=> setPlatform(pf)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all ${active ? 'bg-white text-black shadow' : 'text-neutral-300 hover:text-white hover:bg-neutral-800'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${pf==='instagram'?'bg-gradient-to-tr '+meta.gradient+' text-white': pf==='youtube'?'bg-red-600 text-white':'bg-black text-white border border-neutral-700'}`}>{meta.icon}</span>
                  <span className="hidden sm:inline">{meta.label}</span>
                  <span className={`hidden lg:inline text-[10px] px-1.5 py-0.5 rounded-full ${active?'bg-black text-white':'bg-neutral-700 text-neutral-300'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline text-[11px] text-neutral-400"><span className="text-white font-bold">{followersByPlatform[platform].toLocaleString()}</span> takipçi • {filtered.length} gönderi</span>
          <button onClick={()=> openComposerFor(platform)} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${platform==='youtube'?'bg-red-600 hover:bg-red-500 text-white': platform==='tiktok'?'bg-[#fe2c55] hover:bg-[#e0264a] text-white':'bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 text-white'}`}>＋ {platform==='youtube'?'Video Yükle': platform==='tiktok'?'Clip At':'Paylaş'}</button>
        </div>
      </div>

      {/* Cihaz bar — per platform + kalite rozeti */}
      <div className="h-[38px] bg-gradient-to-r from-violet-600/20 via-slate-800 to-cyan-600/15 border-b border-neutral-800 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">{activeDevice?.icon || '📱'}</span>
          <span className="text-white font-bold">{activeDevice?.name || 'Telefon'}</span>
          <span className="hidden sm:inline text-slate-400">• {qualityLabel}</span>
          <span className={`hidden md:inline text-[11px] px-2 py-0.5 rounded-full border ${devQuality>=80?'bg-emerald-500/15 border-emerald-500/30 text-emerald-300': devQuality>=60?'bg-sky-500/15 border-sky-500/30 text-sky-300':'bg-amber-500/15 border-amber-500/30 text-amber-300'}`}>{platformBonusText}</span>
          <span className={`hidden lg:inline text-[10px] px-1.5 py-0.5 rounded font-black ${devQuality>=80?'bg-emerald-500 text-white':'bg-neutral-700 text-white'}`}>{qualityLabel} • {devQuality<50?'puslu':devQuality<65?'net değil':'kristal'}</span>
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">📱 Cihaz yükselt: <span className="text-violet-300">Teknoloji → AVM</span> <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /></div>
      </div>

      {/* ── PLATFORM CONTENT ── */}
      {platform==='instagram' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
            {/* IG top bar */}
            <div className="h-[46px] border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 bg-black">
              <div className="flex items-center gap-3">
                <span className="text-[22px] font-black tracking-tighter" style={{fontFamily:"'Segoe UI', system-ui"}}><span className="bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5] bg-clip-text text-transparent">FutbolGram</span></span>
                <button onClick={()=> setIgMode(igMode==='feed'?'explore':'feed')} className={`hidden sm:flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${igMode==='explore'?'bg-white text-black border-white':'border-neutral-700 text-neutral-300 hover:bg-neutral-800'}`}>{igMode==='explore'?'◧ Izgara':'◨ Akış'}</button>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <div className="bg-[#262626] rounded-full px-3 py-1.5 flex items-center gap-2 w-[240px] border border-transparent focus-within:border-neutral-600">
                  <span className="text-neutral-500">⌕</span>
                  <input placeholder="Ara • #SüperLig" className="bg-transparent outline-none text-sm placeholder:text-neutral-500 w-full" />
                </div>
              </div>
              <div className="flex items-center gap-3 text-[18px]">
                <button className="hover:opacity-70">⌂</button>
                <button onClick={()=> setDmOpen(v=>!v)} className="hover:opacity-70 relative">✈︎{dmOpen && <span className="absolute -top-1 -right-1 w-2 h-2 bg-sky-500 rounded-full" />}</button>
                <button onClick={()=> setNotifOpen(v=>!v)} className="hover:opacity-70 relative">♡<span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center px-1">{Math.min(9, filtered.length)}</span></button>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-xs border-2 border-neutral-800">{gameState.teamLogo}</div>
              </div>
            </div>

            {/* Stories + Following toggle */}
            <div className="shrink-0 border-b border-neutral-800 bg-black">
              <div className="flex gap-3 px-3 py-3 overflow-x-auto scrollbar-hide">
                {stories.map(s => (
                  <button key={s.id} onClick={() => s.hasStory ? setStoryViewer({name: s.name, logo: s.logo, gradient: s.gradient}) : s.isUser && setShowComposer(true)} className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
                    <div className={`w-[68px] h-[68px] rounded-full p-[3px] ${s.hasStory ? `bg-gradient-to-tr ${s.gradient}` : 'bg-neutral-700'}`}>
                      <div className="w-full h-full rounded-full bg-black p-[2px]"><div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-xl">{s.logo}</div></div>
                    </div>
                    <span className="text-[11px] text-white truncate w-full text-center">{s.name}</span>
                    {s.isUser && <span className="w-4 h-4 -mt-6 ml-8 bg-blue-500 rounded-full border-2 border-black text-white text-[10px] flex items-center justify-center">＋</span>}
                  </button>
                ))}
                <div className="flex flex-col items-center gap-1 shrink-0 w-[68px] opacity-60">
                  <div className="w-[68px] h-[68px] rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg">＋</div>
                  <span className="text-[11px] text-neutral-500">Ekle</span>
                </div>
              </div>
            </div>

            {/* Filter + mode */}
            <div className="flex gap-1 px-3 py-2 border-b border-neutral-800 bg-black overflow-x-auto items-center">
              <div className="flex gap-1">{FILTERS.map(f => (<button key={f.id} onClick={()=> setFilter(f.id)} className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${filter===f.id?'bg-white text-black border-white':'bg-[#262626] text-white border-neutral-700 hover:bg-neutral-700'}`}>{f.label}</button>))}</div>
              <span className="ml-auto text-[10px] text-neutral-500 hidden sm:flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {followersByPlatform.instagram.toLocaleString()} takipçi</span>
            </div>

            {/* Composer bar */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800 bg-black">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">{gameState.teamLogo}</div>
              <button onClick={()=> openComposerFor('instagram')} className="flex-1 text-left bg-[#262626] hover:bg-[#363636] text-neutral-400 rounded-full px-4 py-2 text-sm">Bir gönderi paylaş... ✨</button>
              <button onClick={()=> openComposerFor('instagram')} className="text-blue-500 font-semibold text-sm hover:text-white">Paylaş</button>
            </div>

            {/* Feed / Explore */}
            <div className="flex-1 overflow-y-auto bg-black">
              {igMode==='explore' ? (
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2 px-1"><span className="text-sm font-bold">🔍 Keşfet</span><span className="text-xs text-neutral-400">Kalite düşükse görseller puslu görünür</span></div>
                  <div className="grid grid-cols-3 gap-1 max-w-[470px] mx-auto">
                    {Array.from({length:9}).map((_,i)=>{
                      const preset = IMAGE_PRESETS[(i % (IMAGE_PRESETS.length-1))+1];
                      const liked = !!exploreLiked[i];
                      return (
                        <button key={i} onClick={()=> setExploreLiked({...exploreLiked,[i]:!liked})} className={`relative aspect-square bg-gradient-to-br ${preset.gradient} flex items-center justify-center group overflow-hidden ${qualityBlur}`}>
                          <span className="text-3xl group-hover:scale-110 transition">{preset.emoji}</span>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                          <div className="absolute bottom-1 left-1 bg-black/60 rounded-full px-1.5 py-0.5 text-[11px] text-white flex items-center gap-1">♥ {liked? '1':'0'}</div>
                          {devQuality<50 && <span className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] px-1 rounded font-bold">PUSLU</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="max-w-[470px] mx-auto mt-3 bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800"><div className="text-xs font-bold">💡 Cihaz İpucu</div><div className="text-xs text-neutral-400">Düşük kaliteli telefonla keşfet görselleri puslu. Teknoloji → AVM’den Pro Max / A7S III al → 4K kristal.</div></div>
                </div>
              ) : (
                <div className="max-w-[470px] mx-auto w-full">
                  {filtered.length===0 && (
                    <div className="text-center py-14 border border-neutral-800 rounded-xl m-4">
                      <div className="w-20 h-20 mx-auto rounded-full border-2 border-white flex items-center justify-center text-2xl mb-3">📸</div>
                      <div className="font-light">Henüz gönderi yok</div>
                      <div className="text-sm text-neutral-400">Paylaş — cihazın kalitesi beğeniyi katlar.</div>
                      <button onClick={()=> openComposerFor('instagram')} className="mt-3 px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-semibold">Paylaş</button>
                    </div>
                  )}
                  {filtered.map(post=>{
                    const visual = getPostVisual(post as any);
                    const isLiked = post.liked;
                    const isSaved = !!saved[post.id];
                    return (
                      <article key={post.id} className="bg-black border-b lg:border border-neutral-800 lg:rounded-lg lg:mb-3 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">{post.logo}</div></div>
                            <div className="leading-tight"><div className="flex items-center gap-1"><span className="font-semibold text-sm text-white">{post.author}</span>{post.verified && <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[9px] text-white">✓</span>}<span className="text-neutral-500 text-xs">• {post.timeAgo}</span></div><div className="text-[11px] text-neutral-400">{post.handle} {post.isUser && <span className="text-blue-400">• Sen</span>}</div></div>
                          </div>
                          <div className="relative"><button onClick={()=> setPostMenu(postMenu===post.id? null: post.id)} className="text-white px-2">⋯</button>{postMenu===post.id && (<div className="absolute right-0 top-7 w-44 bg-[#262626] border border-neutral-700 rounded-xl overflow-hidden z-20"><button onClick={()=> {navigator.clipboard?.writeText(post.content); setPostMenu(null);}} className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-700">🔗 Bağlantıyı kopyala</button><button onClick={()=> setPostMenu(null)} className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-700">🚩 Şikayet et</button>{post.isUser && <button onClick={()=> setPostMenu(null)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-neutral-700">🗑️ Sil</button>}</div>)}</div>
                        </div>
                        <div onDoubleClick={()=> handleLike(post.id, isLiked)} className={`relative w-full aspect-square bg-gradient-to-br ${visual.gradient} flex items-center justify-center overflow-hidden cursor-pointer select-none ${qualityBlur}`}>
                          <div className="absolute inset-0 opacity-20" style={{background:'radial-gradient(circle at 30% 20%, white 0.5px, transparent 1px)', backgroundSize:'24px 24px'}} />
                          <div className="relative text-center p-6">
                            <div className="text-6xl drop-shadow-lg">{visual.emoji}</div>
                            {post.type==='match' && (<div className="mt-3 bg-black/70 backdrop-blur rounded-xl px-4 py-2 border border-white/20"><div className="text-white font-black text-sm">{post.content.slice(0,80)}</div><div className="text-[10px] text-white/70 mt-1">Hafta {post.week} • Sezon {post.season}</div></div>)}
                            {post.type==='transfer' && (<div className="mt-3 text-white font-bold text-sm bg-black/60 rounded-full px-3 py-1">✍️ TRANSFER</div>)}
                          </div>
                          {likedAnim===post.id && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-8xl animate-[ping_600ms_cubic-bezier(0,0,0.2,1)] drop-shadow-2xl">❤️</span></div>)}
                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-white/10"><span className="text-[11px]">📍</span><span className="text-xs text-white font-medium">{post.type==='match'?'Stadyum':post.type==='transfer'?'Transfer Merkezi':'Süper Lig'}</span></div>
                          <div className="absolute top-3 right-3 bg-black/60 rounded-full px-2 py-1 text-[11px] border border-white/15">{qualityLabel}</div>
                          {post.image && <div className="absolute top-3 left-3 flex gap-1">{Array.from({length:3}).map((_,i)=>(<span key={i} className={`w-1.5 h-1.5 rounded-full ${i===0?'bg-white':'bg-white/40'}`} />))}</div>}
                        </div>
                        <div className="px-3 pt-3 flex items-center gap-4 text-[22px] leading-none">
                          <button onClick={()=> handleLike(post.id, isLiked)} className={`hover:opacity-60 transition ${isLiked?'text-red-500':'text-white'}`}>{isLiked?'♥':'♡'}</button>
                          <button onClick={()=> document.getElementById(`comment-${post.id}`)?.focus()} className="hover:opacity-60">💬</button>
                          <button className="hover:opacity-60">✈︎</button>
                          <button onClick={()=> setSaved({...saved,[post.id]:!isSaved})} className="ml-auto hover:opacity-60">{isSaved?'🔖':'♡'}</button>
                        </div>
                        <div className="px-3 pt-2"><div className="text-sm font-semibold text-white">{post.likes.toLocaleString()} beğenme {post.views ? `• ${Math.round((post.views)/1000)}B izlenme` : ''} <span className="text-neutral-500 font-normal">• {qualityLabel}</span></div></div>
                        <div className="px-3 pt-1 text-[14px] leading-[18px]"><span className="font-semibold text-white mr-2">{post.author}</span><span className="text-white">{post.content}</span>{post.tags && post.tags.length>0 && (<span className="ml-1">{post.tags.map(t=> (<span key={t} className="text-[#0095f6] hover:underline cursor-pointer"> {t}</span>))}</span>)}</div>
                        <div className="px-3 pt-1 text-sm">
                          {!showAllComments[post.id] && post.comments>2 && (<button onClick={()=> setShowAllComments({...showAllComments,[post.id]:true})} className="text-neutral-400 text-sm">{post.comments} yorumun tümünü gör</button>)}
                          <div className="space-y-1 mt-1"><div className="text-sm"><span className="font-semibold mr-2">{post.type==='match'?'taraftar_1907':'futbolfan34'}</span><span className="text-neutral-200">{post.type==='match'?'Helal olsun! 🔥':post.type==='transfer'?'Hoş geldin!':'Süper içerik 👏'}</span><span className="ml-2 text-neutral-500">♡</span></div>{showAllComments[post.id] && (<div className="text-sm"><span className="font-semibold mr-2">analiz_ekibi</span><span className="text-neutral-200">Maçın kırılma anı çok iyiydi.</span></div>)}</div>
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
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden xl:flex w-[320px] shrink-0 flex-col bg-black border-l border-neutral-800 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black">{gameState.teamLogo}</div><div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{gameState.teamName.toLowerCase().replace(/\s+/g,'')}</div><div className="text-xs text-neutral-400">{followersByPlatform.instagram.toLocaleString()} takipçi</div></div><button className="text-xs font-semibold text-[#0095f6]">Geçiş Yap</button></div>
              <div className="mt-4 bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800"><div className="text-xs font-bold">📊 Bu hafta</div><div className="grid grid-cols-3 gap-2 mt-2 text-center"><div className="bg-black rounded-lg py-2"><div className="font-bold text-sm">{feed.filter((p:any)=>p.isUser).length}</div><div className="text-[10px] text-neutral-400">Gönderi</div></div><div className="bg-black rounded-lg py-2"><div className="font-bold text-sm">{followers.toLocaleString()}</div><div className="text-[10px] text-neutral-400">Takipçi</div></div><div className="bg-black rounded-lg py-2"><div className="font-bold text-sm">%{Math.min(94,42+feed.filter((p:any)=>p.isUser).length*6)}</div><div className="text-[10px] text-neutral-400">Etkileşim</div></div></div><div className="text-[11px] text-neutral-500 mt-2">En iyi saat: 19:00-21:00 • En iyi gün: Derbi sonrası</div></div>
              <div className="mt-4"><div className="text-sm font-semibold text-neutral-400 mb-2">Gündem</div><div className="space-y-2">{TRENDING.slice(0,5).map(t=> (<div key={t.tag} className="flex justify-between items-center bg-[#1a1a1a] rounded-lg px-3 py-2 border border-neutral-800"><div><div className="text-sm font-medium">{t.tag}</div><div className="text-xs text-neutral-400">{t.posts}</div></div><button className="text-neutral-500">›</button></div>))}</div></div>
            </div>
          </div>

          {/* DM drawer */}
          {dmOpen && (
            <div className="absolute inset-0 z-30 flex justify-end bg-black/40 backdrop-blur-sm" onClick={()=> setDmOpen(false)}>
              <div onClick={e=> e.stopPropagation()} className="w-[360px] bg-[#121212] border-l border-neutral-800 flex flex-col">
                <div className="h-[46px] border-b border-neutral-800 flex items-center justify-between px-4"><span className="font-bold text-sm">Mesajlar</span><button onClick={()=> setDmOpen(false)} className="w-7 h-7 rounded-full hover:bg-neutral-800 flex items-center justify-center">✕</button></div>
                <div className="p-3"><div className="bg-[#262626] rounded-full px-3 py-1.5 flex items-center gap-2"><span className="text-neutral-500">⌕</span><input placeholder="Ara" className="bg-transparent outline-none text-sm w-full" /></div></div>
                <div className="flex-1 overflow-y-auto">
                  {[
                    {n:'sporgundemi', m:'Hocam maç sonrası röportaj?', t:'2s', u:'🎙️'},
                    {n:'taraftar_1907', m:'Helal olsun! 🔥', t:'1s', u:'😍'},
                    {n:'transfermerkezi', m:'Teklif var 👀', t:'5s', u:'🔥'},
                  ].map(c=> (<div key={c.n} className="flex gap-3 px-4 py-3 hover:bg-[#1a1a1a] cursor-pointer border-b border-neutral-800/50"><div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">{c.u}</div><div className="flex-1 min-w-0"><div className="text-sm font-semibold flex items-center gap-1">{c.n} <span className="w-2 h-2 bg-blue-500 rounded-full" /></div><div className="text-xs text-neutral-400 truncate">{c.m} • {c.t}</div></div><span className="w-2 h-2 bg-blue-500 rounded-full mt-2" /></div>))}
                </div>
                <div className="p-3 border-t border-neutral-800 text-xs text-neutral-500">DM’ler cihaz kalitesinden etkilenmez — ama hikayeler etkilenir.</div>
              </div>
            </div>
          )}

          {/* Notif dropdown */}
          {notifOpen && (
            <div className="absolute top-[84px] right-20 w-[380px] bg-[#262626] border border-neutral-700 rounded-xl overflow-hidden z-30 shadow-2xl" onClick={()=> setNotifOpen(false)}>
              <div className="p-3 border-b border-neutral-700 flex items-center justify-between"><span className="font-bold text-sm">Bildirimler</span><span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{filtered.length} yeni</span></div>
              <div className="max-h-[320px] overflow-y-auto">
                {filtered.slice(0,5).map(p=> (<div key={p.id} className="flex gap-3 p-3 hover:bg-[#333] border-b border-neutral-700/50"><div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm">{p.logo}</div><div className="flex-1"><div className="text-xs"><span className="font-bold">{p.author}</span> gönderini beğendi • {p.timeAgo}</div><div className="text-[11px] text-neutral-400 truncate">{p.content.slice(0,50)}</div></div><div className="w-8 h-8 rounded bg-neutral-700" /></div>))}
              </div>
            </div>
          )}

          {/* Story viewer */}
          {storyViewer && (
            <div className="absolute inset-0 z-40 bg-black flex flex-col" onClick={()=> setStoryViewer(null)}>
              <div className="h-1 bg-neutral-800 mx-2 mt-2 rounded-full overflow-hidden"><div className="h-full bg-white w-full animate-[shrink_5s_linear]" /></div>
              <div className="flex items-center gap-2 px-4 py-3"><div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 p-[2px]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">{storyViewer.logo}</div></div><span className="font-bold text-sm">{storyViewer.name}</span><span className="text-xs text-neutral-400">• 2s</span><button onClick={()=> setStoryViewer(null)} className="ml-auto w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">✕</button></div>
              <div className={`flex-1 bg-gradient-to-br ${storyViewer.gradient} flex items-center justify-center relative m-2 rounded-xl ${qualityBlur}`}><span className="text-7xl">{storyViewer.logo}</span><span className="absolute bottom-4 bg-black/60 px-3 py-1 rounded-full text-xs">Hikaye • Kalite {devQuality}/100 • {qualityLabel}</span></div>
              <div className="p-3 flex gap-2"><input placeholder="Yanıtla..." className="flex-1 bg-[#262626] rounded-full px-4 py-2 text-sm outline-none" /><button className="w-10 h-10 bg-white text-black rounded-full">✈︎</button></div>
            </div>
          )}
        </div>
      )}

      {platform==='tiktok' && (
        <div className="flex-1 flex overflow-hidden bg-black">
          <div className="flex-1 flex flex-col min-w-0 bg-black">
            <div className="h-[44px] border-b border-neutral-800 flex items-center justify-between px-4 shrink-0 bg-black">
              <div className="flex items-center gap-3">
                <span className="text-white font-black flex items-center gap-1"><span className="text-xl">🎵</span> TikTok <span className="text-cyan-400">Futbol</span></span>
                <div className="hidden sm:flex bg-[#1a1a1a] rounded-full p-1 gap-1 ml-2">
                  <button onClick={()=> setTtTab('fyp')} className={`px-3 py-1 rounded-full text-xs font-bold ${ttTab==='fyp'?'bg-white text-black':'text-neutral-400 hover:text-white'}`}>Sana Özel</button>
                  <button onClick={()=> setTtTab('takip')} className={`px-3 py-1 rounded-full text-xs font-bold ${ttTab==='takip'?'bg-white text-black':'text-neutral-400 hover:text-white'}`}>Takip</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-[11px] bg-[#fe2c55] text-white px-2 py-1 rounded-full">🔥 #{ttIndex+1} sırada</span>
                <button onClick={()=> openComposerFor('tiktok')} className="bg-white text-black px-3 py-1.5 rounded-full text-xs font-bold hover:bg-neutral-200">＋ Yükle</button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center text-white font-black text-sm">{gameState.teamLogo}</div>
              </div>
            </div>
            <div className="flex gap-1 px-3 py-2 border-b border-neutral-800 bg-black overflow-x-auto items-center">
              <div className="flex gap-1">{FILTERS.map(f=> (<button key={f.id} onClick={()=> setFilter(f.id)} className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${filter===f.id?'bg-white text-black':'bg-[#2f2f2f] text-white hover:bg-neutral-700'}`}>{f.label}</button>))}</div>
              <span className="ml-auto hidden sm:flex items-center gap-1 text-[11px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 rounded-full text-emerald-300">{platformBonusText}</span>
            </div>
            {/* Challenge banner */}
            <div className="bg-gradient-to-r from-[#fe2c55]/20 via-black to-cyan-500/20 border-b border-neutral-800 px-3 py-2 flex items-center gap-2">
              <span className="text-xs font-black bg-[#fe2c55] text-white px-2 py-1 rounded">🔥 Challenge</span>
              <span className="text-xs text-white">#FrikikMeydanı — en iyi frikik 1M izlenme!</span>
              <button className="ml-auto text-xs bg-white text-black px-2 py-1 rounded-full font-bold">Katıl</button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto bg-black">
                <div className="max-w-[360px] mx-auto">
                  <div className="relative h-[560px] bg-gradient-to-br from-neutral-900 to-black border-b border-neutral-800 flex flex-col">
                    <div className="flex-1 relative flex">
                      {(() => {
                        const list = ttTab==='takip' ? filtered.filter((p:any)=> p.isUser || Math.random()<0.2) : filtered;
                        const combined = [
                          ...list.map((p:any)=> ({ kind:'post' as const, post: p })),
                          ...TIKTOK_VIDEOS.map(v=> ({ kind:'catalog' as const, video: v })),
                        ];
                        const item = combined[ttIndex % Math.max(1, combined.length)];
                        if (!item) return (<div className="flex-1 flex items-center justify-center text-neutral-500 p-6 text-center">Henüz clip yok — ilk clipini at, keşfete düş! <br/><button onClick={()=> openComposerFor('tiktok')} className="mt-3 bg-[#fe2c55] text-white px-3 py-1 rounded-full text-xs">＋ Clip At</button></div>);
                        if (item.kind==='post') {
                          const post = item.post as SocialPost;
                          const isLiked = post.liked;
                          const visual = getPostVisual(post);
                          return (
                            <div className="flex-1 relative flex">
                              <div className={`flex-1 bg-gradient-to-br ${visual.gradient} relative flex items-center justify-center overflow-hidden ${qualityBlur}`}>
                                <div className="absolute inset-0 bg-black/15" />
                                <div className="relative text-center p-6">
                                  <div className="text-7xl drop-shadow-xl">{visual.emoji}</div>
                                  <div className="mt-3 bg-black/60 rounded-xl px-3 py-2 max-w-[260px]"><div className="text-white text-sm font-bold line-clamp-3">{post.content}</div><div className="text-[11px] text-white/70">{post.tags?.join(' ')}</div><div className="text-[10px] text-white/50 mt-1">{qualityLabel} • {devQuality<50?'puslu':'net'}</div></div>
                                </div>
                                {likedAnim===post.id && (<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-7xl animate-[ping_600ms_cubic-bezier(0,0,0.2,1)]">❤️</span></div>)}
                                <div className="absolute bottom-0 left-0 right-12 h-1 bg-white/30"><div className="h-full bg-white" style={{width:'62%'}} /></div>
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-full text-[11px] flex items-center gap-1">🎵 Orijinal ses — {post.author}</div>
                              </div>
                              <div className="w-16 bg-black flex flex-col items-center py-3 gap-3 border-l border-neutral-800">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-pink-500 p-[2px]"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">{post.logo}</div></div>
                                <button onClick={()=> handleLike(post.id, isLiked)} className="flex flex-col items-center gap-1"><span className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isLiked?'bg-[#fe2c55] text-white':'bg-[#2f2f2f] text-white'}`}>{isLiked?'♥':'♡'}</span><span className="text-[11px] font-bold">{post.likes>1000? (post.likes/1000).toFixed(1)+'B': post.likes}</span></button>
                                <button className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#2f2f2f] flex items-center justify-center">💬</span><span className="text-[11px] font-bold">{post.comments}</span></button>
                                <button className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#2f2f2f] flex items-center justify-center text-lg">🔗</span><span className="text-[10px] font-bold">Duet</span></button>
                                <button className="w-8 h-8 rounded-full bg-[#2f2f2f] flex items-center justify-center text-sm">🔖</button>
                                <div className="mt-auto w-10 h-10 rounded-full bg-neutral-900 border-2 border-white flex items-center justify-center text-xs animate-spin" style={{animationDuration:'3s'}}>💿</div>
                              </div>
                              <div className="absolute bottom-10 left-3 right-20 text-white">
                                <div className="font-bold text-sm flex items-center gap-1">{post.handle} {post.verified && <span className="w-3 h-3 bg-cyan-400 rounded-full flex items-center justify-center text-[8px] text-black">✓</span>} <span className="border border-white px-1.5 py-0.5 rounded text-[10px]">Takip Et</span></div>
                                <div className="text-sm leading-snug mt-1 line-clamp-2">{post.content}</div>
                              </div>
                              <div className="absolute top-1/2 -translate-y-1/2 left-2 flex flex-col gap-1">
                                <button onClick={()=> setTtIndex(i=> Math.max(0,i-1))} className="w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white">‹</button>
                                <button onClick={()=> setTtIndex(i=> i+1)} className="w-8 h-8 rounded-full bg-black/50 border border-white/20 text-white">›</button>
                              </div>
                              <div className="absolute top-3 right-20 bg-black/60 px-2 py-1 rounded-full text-[11px] flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> {post.views ? (post.views/1000).toFixed(1)+'B' : 'viral'}</div>
                            </div>
                          );
                        } else {
                          const v = (item as any).video as typeof TIKTOK_VIDEOS[0];
                          return (
                            <div className="flex-1 relative flex">
                              <div className={`flex-1 bg-gradient-to-br ${v.gradient} flex items-center justify-center relative ${qualityBlur}`}>
                                <div className="text-center p-6">
                                  <div className="text-7xl drop-shadow-xl">{v.emoji}</div>
                                  <div className="mt-3 bg-black/60 rounded-xl px-3 py-2"><div className="text-white font-bold">{v.title}</div><div className="text-xs text-white/70">{v.author} • {v.duration} • {qualityLabel}</div></div>
                                </div>
                              </div>
                              <div className="w-16 bg-black flex flex-col items-center py-4 gap-3 border-l border-neutral-800">
                                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">📺</div>
                                <button className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#fe2c55] flex items-center justify-center">♥</span><span className="text-[11px] font-bold">{v.likes}</span></button>
                                <button className="flex flex-col items-center gap-1"><span className="w-10 h-10 rounded-full bg-[#2f2f2f] flex items-center justify-center">💬</span><span className="text-[11px] font-bold">{v.comments}</span></button>
                              </div>
                              <div className="absolute bottom-3 left-3 right-20 text-white"><div className="font-bold text-sm">{v.author}</div><div className="text-sm">{v.title}</div></div>
                              <div className="absolute top-1/2 -translate-y-1/2 left-2 flex flex-col gap-1">
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
                        <input value={commentDrafts[`tt-${ttIndex}`]||''} onChange={e=> setCommentDrafts({...commentDrafts,[`tt-${ttIndex}`]:e.target.value})} placeholder="Yorum ekle..." className="flex-1 bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm outline-none placeholder:text-neutral-500" />
                        <button onClick={()=>{ const v=(commentDrafts[`tt-${ttIndex}`]||'').trim(); if(v.length>=2){ const pid = filtered[0]?.id; if(pid) onAddComment(pid, v); setCommentDrafts({...commentDrafts,[`tt-${ttIndex}`]:''}); }}} className="text-[#fe2c55] font-bold text-sm px-2">Gönder</button>
                      </div>
                      <div className="ml-3 hidden sm:flex gap-1">{Array.from({length:6}).map((_,i)=>(<button key={i} onClick={()=> setTtIndex(i)} className={`w-1.5 h-1.5 rounded-full ${ttIndex===i?'bg-white':'bg-neutral-600'}`} />))}</div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 bg-[#0a0a0a]">
                    <div className="text-xs font-bold text-neutral-400 flex items-center gap-2">🔥 Keşfette Öne Çıkanlar <span className="ml-auto text-[11px] bg-[#fe2c55] text-white px-1.5 py-0.5 rounded-full">Canlı</span></div>
                    <div className="grid grid-cols-3 gap-2">
                      {TIKTOK_VIDEOS.slice(0,6).map((v,i)=> (
                        <button key={v.id} onClick={()=> setTtIndex(i)} className={`aspect-[9/16] rounded-lg bg-gradient-to-br ${v.gradient} p-2 flex flex-col justify-end border ${ttIndex===i?'border-white':'border-neutral-800'} ${qualityBlur}`}>
                          <div className="text-lg">{v.emoji}</div>
                          <div className="text-[11px] font-bold text-white line-clamp-2 leading-tight">{v.title}</div>
                          <div className="text-[10px] text-white/70">{v.likes} ❤️ • {qualityLabel}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex w-[300px] shrink-0 border-l border-neutral-800 bg-black flex-col">
                <div className="p-3 border-b border-neutral-800"><span className="text-sm font-bold">Canlı Hediyeler</span><div className="grid grid-cols-4 gap-2 mt-2">{['🌹','🎁','🚀','👑'].map(e=> (<div key={e} className="bg-[#1a1a1a] rounded-lg py-2 text-center border border-neutral-800"><div className="text-lg">{e}</div><div className="text-[10px] text-neutral-400">10 jeton</div></div>))}</div></div>
                <div className="p-3"><div className="bg-[#1a1a1a] rounded-xl p-3 border border-neutral-800"><div className="text-xs font-bold">📱 Cihaz Etkisi</div><div className="text-xs text-neutral-400 mt-1">Perf düşükse 30fps, yüksekse 60fps akıcı. Şu an {devPerf}/100.</div></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {platform==='youtube' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">
          <div className="h-[56px] flex items-center gap-3 px-3 shrink-0 bg-[#0f0f0f] border-b border-neutral-800">
            <div className="flex items-center gap-2"><button className="w-8 h-8 hover:bg-neutral-800 rounded-full flex items-center justify-center">☰</button><span className="font-black flex items-center gap-1 text-white"><span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-sm">▶</span> YouTube <span className="text-[10px] text-neutral-500 font-normal">TR</span></span><span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-bold ${ytTheater?'bg-white text-black':'bg-neutral-800 text-neutral-300'}`}>{ytTheater?'Sinema':'Normal'}</span></div>
            <div className="flex-1 max-w-[640px] mx-auto flex">
              <div className="flex-1 flex">
                <input value={ytQuery} onChange={e=> setYtQuery(e.target.value)} placeholder="Ara • özet, gol, analiz" className="flex-1 bg-[#121212] border border-neutral-700 rounded-l-full px-4 py-1.5 text-sm outline-none placeholder:text-neutral-500 focus:border-blue-500" />
                <button className="bg-[#222] border border-l-0 border-neutral-700 rounded-r-full px-5 hover:bg-neutral-800">⌕</button>
              </div>
              <button className="ml-2 w-9 h-9 bg-[#272727] hover:bg-neutral-700 rounded-full flex items-center justify-center">🎙️</button>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs bg-[#272727] rounded-full px-2 py-1 cursor-pointer"><input type="checkbox" checked={ytAutoplay} onChange={e=> setYtAutoplay(e.target.checked)} className="w-3 h-3" /> Oto</label>
              <button onClick={()=> setYtTheater(v=>!v)} className="bg-[#272727] hover:bg-neutral-700 rounded-full px-3 py-1.5 text-xs">◧</button>
              <button onClick={()=> openComposerFor('youtube')} className="bg-[#272727] hover:bg-neutral-700 rounded-full px-3 py-1.5 text-sm flex items-center gap-1"><span>＋</span> Oluştur</button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">{gameState.teamLogo}</div>
            </div>
          </div>
          <div className="flex gap-2 px-3 py-2 bg-[#0f0f0f] border-b border-neutral-800 overflow-x-auto shrink-0 items-center">
            <div className="flex gap-1">{YOUTUBE_CATEGORIES.map(c=> (<button key={c.id} onClick={()=> setYtCategory(c.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${ytCategory===c.id?'bg-white text-black':'bg-[#272727] text-white hover:bg-neutral-700'}`}>{c.label}</button>))}</div>
            <span className="ml-auto hidden md:flex items-center gap-2 text-[11px] text-neutral-400"><span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> {ytVideosFiltered.length} video • {qualityLabel}</span>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="bg-black">
                <div className={`${ytTheater?'aspect-[21/9]':'aspect-video'} bg-black relative`}>
                  <iframe key={ytWatchId} src={`https://www.youtube.com/embed/${ytWatchId}?rel=0&modestbranding=1&playsinline=1${ytAutoplay?'&autoplay=1&mute=1':''}`} title="YouTube" className="w-full h-full" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded-full flex items-center gap-1"><span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> YouTube gömülü • {qualityLabel}</div>
                </div>
                <div className={`${ytTheater?'px-6':''} p-3 bg-[#0f0f0f]`}>
                  <div className="text-white font-bold text-[16px] leading-tight line-clamp-2">{currentYt.title}</div>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-sm">{currentYt.channelIcon}</div><div><div className="text-white text-sm font-medium leading-none flex items-center gap-1">{currentYt.channel} <span className="w-3 h-3 bg-neutral-600 rounded-full flex items-center justify-center text-[8px]">✓</span></div><div className="text-xs text-neutral-400">1.2 Mn abone</div></div><button className="ml-2 bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-neutral-200">Abone Ol</button><button className="w-8 h-8 bg-[#272727] rounded-full flex items-center justify-center">🔔</button></div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="flex bg-[#272727] rounded-full overflow-hidden"><button className="px-4 py-1.5 text-sm flex items-center gap-1 hover:bg-neutral-700 text-white">👍 {Math.floor(Math.random()*8000+1200).toLocaleString()}</button><div className="w-px bg-neutral-700" /><button className="px-3 py-1.5 hover:bg-neutral-700">👎</button></div>
                      <button className="bg-[#272727] hover:bg-neutral-700 rounded-full px-3 py-1.5 text-sm text-white">↗︎ Paylaş</button>
                      <button className="bg-[#272727] hover:bg-neutral-700 rounded-full px-3 py-1.5 text-sm text-white">⬇︎ İndir</button>
                      <button className="bg-[#272727] hover:bg-neutral-700 rounded-full w-8 h-8 flex items-center justify-center">⋯</button>
                    </div>
                  </div>
                  <div className="mt-3 bg-[#272727] rounded-xl p-3">
                    <div className="text-sm font-bold text-white flex items-center gap-2">{currentYt.views} görüntüleme • {currentYt.timeAgo} <span className="hidden sm:inline text-neutral-400 font-normal">#SüperLig #Futbol • {qualityLabel}</span></div>
                    <div className="text-xs text-neutral-300 mt-1 line-clamp-2">▶️ {currentYt.channel} kanalında • Kategori: {currentYt.category} • Cihazınla {qualityLabel} çekim — düşük cihazda video puslu/ düşük fps, yüksek cihazda kristal 4K.</div>
                    <div className="text-[11px] text-amber-300 mt-1">💡 {platformBonusText} • Teknoloji → AVM’den yükseltince izlenme fırlar</div>
                  </div>
                  {/* Shorts shelf */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between"><span className="text-sm font-bold flex items-center gap-1">▶ Shorts</span><button className="text-xs bg-[#272727] px-2 py-1 rounded-full">✕</button></div>
                    <div className="flex gap-2 overflow-x-auto mt-2 pb-1 scrollbar-hide">
                      {TIKTOK_VIDEOS.slice(0,5).map(v=> (
                        <button key={v.id} className="shrink-0 w-[120px] aspect-[9/16] rounded-xl bg-gradient-to-br from-neutral-800 to-black border border-neutral-800 flex flex-col justify-end p-2 relative overflow-hidden">
                          <span className="text-2xl">{v.emoji}</span><span className="text-[11px] font-bold line-clamp-2">{v.title}</span><span className="text-[10px] text-neutral-400">{v.likes}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-bold text-white flex items-center gap-2">{filtered.length} yorum <span className="text-neutral-500 font-normal text-xs">Sırala ▾</span></div>
                    <div className="flex gap-2 mt-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-xs">{gameState.teamLogo}</div>
                      <div className="flex-1 flex gap-2"><input value={commentDrafts[`yt-player`]||''} onChange={e=> setCommentDrafts({...commentDrafts,[`yt-player`]:e.target.value})} onKeyDown={e=>{ if(e.key==='Enter' && (commentDrafts[`yt-player`]||'').trim().length>=2){ const pid = filtered[0]?.id; if(pid) onAddComment(pid, commentDrafts[`yt-player`].trim()); setCommentDrafts({...commentDrafts,[`yt-player`]:''}); }}} placeholder="Yorum ekleyin..." className="flex-1 bg-transparent border-b border-neutral-700 outline-none text-sm placeholder:text-neutral-500 py-1" /><button onClick={()=>{ const v=(commentDrafts[`yt-player`]||'').trim(); if(v.length>=2){ const pid=filtered[0]?.id; if(pid) onAddComment(pid,v); setCommentDrafts({...commentDrafts,[`yt-player`]:''}); }}} className={`${(commentDrafts[`yt-player`]||'').trim().length>=2?'bg-[#263850] text-[#8ab4f8]':'bg-neutral-800 text-neutral-500'} px-3 py-1.5 rounded-full text-xs font-bold`} disabled={(commentDrafts[`yt-player`]||'').trim().length<2}>Yorum yap</button></div>
                    </div>
                    <div className="mt-3 space-y-3">
                      {[
                        {u:'taraftar_1907', a:'@taraftar1907', c:'Bu gol efsane! 🔥', l:124},
                        {u:'Spor Gündemi', a:'@sporgundemi', c:'Analiz harika, hocanın taktiği tuttu.', l:89, pin:true},
                      ].map((x,i)=> (<div key={i} className="flex gap-2"><div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs">👤</div><div className="flex-1"><div className="text-xs flex items-center gap-1"><span className="font-bold">{x.u}</span><span className="text-neutral-500">{x.a}</span><span className="text-neutral-500">• 2s</span>{x.pin && <span className="ml-1 bg-neutral-700 text-[10px] px-1 rounded">📌 Sabitlendi</span>}</div><div className="text-sm text-white">{x.c}</div><div className="flex gap-3 mt-1 text-xs text-neutral-400"><button>👍 {x.l}</button><button>👎</button><button className="bg-[#272727] px-2 py-0.5 rounded-full">Yanıtla</button></div></div><button className="text-neutral-500">⋯</button></div>))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-[#0f0f0f]">
                <div className="flex items-center justify-between mb-2"><h3 className="text-white font-bold text-sm flex items-center gap-2">▶️ Sıradaki videolar <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">18 video</span><span className="text-[11px] bg-[#272727] px-1.5 py-0.5 rounded-full hidden sm:inline">Otoynat {ytAutoplay?'açık':'kapalı'}</span></h3><span className="text-xs text-neutral-400 hidden sm:inline">{qualityLabel} • {devQuality<50?'düşük':'yüksek'} kalite</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ytVideosFiltered.slice(0,9).map(v=> (
                    <button key={v.id} onClick={()=> setYtWatchId(v.videoId)} className={`text-left rounded-xl overflow-hidden border bg-[#1f1f1f] hover:bg-[#272727] transition ${ytWatchId===v.videoId?'border-white':'border-neutral-800'} ${qualityBlur}`}>
                      <div className="relative aspect-video bg-black"><img src={`https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" loading="lazy" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} /><div className="absolute inset-0 flex items-center justify-center"><span className="w-10 h-10 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white text-lg border border-white/20">▶</span></div><span className="absolute bottom-1 right-1 bg-black/80 text-white text-[11px] px-1 py-0.5 rounded">{v.duration}</span>{v.category==='canlı' && <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-1 py-0.5 rounded font-bold">CANLI</span>}</div>
                      <div className="p-2.5 flex gap-2"><div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-sm shrink-0">{v.channelIcon}</div><div className="min-w-0"><div className="text-white text-xs font-bold leading-tight line-clamp-2">{v.title}</div><div className="text-[11px] text-neutral-400">{v.channel} ✓</div><div className="text-[11px] text-neutral-500">{v.views} • {v.timeAgo} • {qualityLabel}</div></div></div>
                    </button>
                  ))}
                </div>
                <button onClick={()=> setYtWatchId(ytVideosFiltered[Math.floor(Math.random()*ytVideosFiltered.length)]?.videoId || ytWatchId)} className="w-full mt-3 py-2 bg-[#272727] hover:bg-neutral-700 rounded-full text-sm font-bold">🎲 Rastgele video oynat</button>
                {filtered.length>0 && (<div className="mt-4"><h4 className="text-white font-bold text-sm mb-2">💬 Topluluk — YouTube akışı</h4><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{filtered.slice(0,4).map(post=> (<div key={post.id} className="bg-[#272727] rounded-xl p-3 border border-neutral-800"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-sm">{post.logo}</div><div><div className="text-white text-xs font-bold">{post.author}</div><div className="text-[11px] text-neutral-400">{post.timeAgo}</div></div><span className="ml-auto text-[11px] bg-red-600 text-white px-1.5 py-0.5 rounded-full">▶ YouTube</span></div><div className="text-sm text-white mt-2">{post.content}</div><div className="flex gap-1 mt-2"><button onClick={()=> handleLike(post.id, post.liked)} className={`px-2 py-1 rounded-full text-xs ${post.liked?'bg-white text-black':'bg-neutral-700 text-white'}`}>{post.liked?'❤️':'♡'} {post.likes}</button><button onClick={()=> setYtWatchId(post.videoId||'pRpeEdMmmQ0')} className="px-2 py-1 rounded-full bg-red-600 text-white text-xs">▶ İzle</button></div></div>))}</div></div>)}
              </div>
            </div>
            <div className="hidden xl:flex w-[380px] shrink-0 flex-col bg-[#0f0f0f] border-l border-neutral-800 overflow-y-auto">
              <div className="p-2 space-y-1">
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">{YOUTUBE_CATEGORIES.map(c=> (<button key={c.id} onClick={()=> setYtCategory(c.id)} className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap ${ytCategory===c.id?'bg-white text-black':'bg-[#272727] text-white'}`}>{c.label}</button>))}</div>
                {ytVideosFiltered.slice(0,10).map(v=> (
                  <button key={`rail-${v.id}`} onClick={()=> setYtWatchId(v.videoId)} className={`flex gap-2 text-left p-1 rounded-lg hover:bg-[#272727] w-full ${ytWatchId===v.videoId?'bg-[#272727]':''}`}>
                    <div className="w-[160px] aspect-video bg-black rounded-lg overflow-hidden relative shrink-0"><img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} /><span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">{v.duration}</span></div>
                    <div className="min-w-0 py-0.5 flex-1"><div className="text-white text-xs font-medium line-clamp-2 leading-tight">{v.title}</div><div className="text-[11px] text-neutral-400 truncate">{v.channel}</div><div className="text-[11px] text-neutral-500">{v.views} • {v.timeAgo}</div></div>
                  </button>
                ))}
                <div className="bg-[#272727] rounded-xl p-3 mt-2"><div className="text-white text-sm font-bold flex items-center gap-1">📱 Cihaz Etkin <span className="ml-auto text-[10px] bg-white text-black px-1.5 py-0.5 rounded-full">{qualityLabel}</span></div><div className="text-xs text-neutral-400 mt-1">{activeDevice?.name} ile YouTube {qualityLabel} — düşük cihazda puslu, yüksekte 4K kristal. Şu an {platformBonusText}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Composer — premium + crossPost + kalite önizleme ── */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[760px] bg-[#1f1f1f] rounded-xl overflow-hidden border border-neutral-700 flex flex-col max-h-[90vh]">
            <div className="h-[44px] border-b border-neutral-700 flex items-center justify-between px-4 shrink-0 bg-[#1f1f1f]">
              <button onClick={()=> setShowComposer(false)} className="w-8 h-8 rounded-full hover:bg-neutral-800 flex items-center justify-center">✕</button>
              <div className="font-bold text-sm flex items-center gap-2">
                {composerPlatform==='instagram' && <span className="bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] bg-clip-text text-transparent">Instagram’da paylaş</span>}
                {composerPlatform==='tiktok' && <span className="text-white">🎵 TikTok clip yükle</span>}
                {composerPlatform==='youtube' && <span className="text-white flex items-center gap-1"><span className="bg-red-600 px-1 rounded text-white text-xs">▶</span> YouTube video yükle</span>}
              </div>
              <button onClick={handlePost} disabled={!canPost} className={`px-4 py-1.5 rounded-full text-sm font-bold ${canPost?'bg-[#0095f6] hover:bg-blue-600 text-white':'bg-neutral-700 text-neutral-400'}`}>Paylaş</button>
            </div>
            <div className="flex gap-1 p-2 bg-black border-b border-neutral-700 items-center">
              {(Object.keys(PLATFORM_META) as SocialPlatform[]).map(pf=> (<button key={pf} onClick={()=> setComposerPlatform(pf)} className={`flex-1 py-1.5 rounded-full text-xs font-black flex items-center justify-center gap-1 ${composerPlatform===pf?'bg-white text-black':'bg-neutral-800 text-white hover:bg-neutral-700'}`}><span>{PLATFORM_META[pf].icon}</span> {PLATFORM_META[pf].label}</button>))}
              <label className="ml-2 flex items-center gap-1 text-[11px] bg-[#272727] rounded-full px-2 py-1 cursor-pointer border border-neutral-700"><input type="checkbox" checked={crossPost} onChange={e=> setCrossPost(e.target.checked)} /> 3’ünde paylaş</label>
            </div>
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              <div className="lg:w-[360px] bg-black flex flex-col">
                <div className={`flex-1 flex items-center justify-center relative ${composerPlatform==='instagram'?'aspect-square': composerPlatform==='tiktok'?'aspect-[9/16] max-h-[420px]':'aspect-video'} bg-gradient-to-br ${selectedImage ? (IMAGE_PRESETS.find(p=> p.id===selectedImage)?.gradient || 'from-neutral-800 to-black') : composerPlatform==='tiktok'?'from-neutral-900 via-black to-neutral-800': composerPlatform==='youtube'?'from-red-900/30 to-black':'from-neutral-800 to-black'} ${qualityBlur}`}>
                  <span className="text-6xl">{selectedImage ? IMAGE_PRESETS.find(p=> p.id===selectedImage)?.emoji : composerPlatform==='tiktok'?'🎵': composerPlatform==='youtube'?'▶️':'🖼️'}</span>
                  {!selectedImage && <span className="absolute bottom-3 text-xs bg-black/70 rounded-full px-3 py-1">{composerPlatform==='instagram'?'Fotoğraf Seç': composerPlatform==='tiktok'?'Dikey Clip Seç':'Kapak Seç'}</span>}
                  {selectedImage && <span className="absolute bottom-3 text-xs bg-black/70 rounded-full px-3 py-1">{IMAGE_PRESETS.find(p=> p.id===selectedImage)?.label}</span>}
                  <span className={`absolute top-3 left-3 text-[10px] px-1.5 py-0.5 rounded font-black ${devQuality>=80?'bg-emerald-500 text-white':'bg-amber-500 text-black'}`}>{qualityLabel} • {devQuality<50?'PUSLU': devQuality>=80?'KRISTAL':'NET'}</span>
                  {composerPlatform==='tiktok' && <span className="absolute bottom-10 text-[11px] bg-black/60 px-2 py-0.5 rounded-full text-white">9:16 • {devPerf>=70?'60fps':'30fps'} {qualityBlur && '• puslu'}</span>}
                </div>
                <div className="p-2 grid grid-cols-4 gap-1.5 border-t border-neutral-700 bg-[#1f1f1f]">
                  {IMAGE_PRESETS.map(p=> (<button key={p.id||'none'} onClick={()=> setSelectedImage(p.id)} className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 text-xs ${selectedImage===p.id?'border-white bg-white text-black':'border-neutral-700 bg-neutral-800 text-white hover:border-neutral-500'}`}><span className="text-base">{p.emoji||'—'}</span><span className="text-[9px] leading-none">{p.label}</span></button>))}
                </div>
              </div>
              <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-[#1f1f1f]">
                <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-xs">{gameState.teamLogo}</div><div className="text-sm font-bold">{gameState.teamName.toLowerCase().replace(/\s+/g,'')}</div><span className="ml-auto text-xs bg-black rounded-full px-2 py-1 border border-neutral-700">{composer.length}/{charLimit}</span></div>
                <textarea value={composer} onChange={e=> setComposer(e.target.value)} placeholder={composerPlatform==='youtube'? `Başlık yaz...` : composerPlatform==='tiktok'? `Clip açıklaması... #keşfet` : `Açıklama yaz...`} className="flex-1 min-h-[110px] bg-[#0a0a0a] border border-neutral-700 rounded-xl p-3 outline-none text-sm placeholder:text-neutral-500 resize-none focus:border-neutral-500" maxLength={320} />
                <div className="flex items-center gap-2 mt-2 text-[11px]"><span className={`${composer.length>260?'text-amber-400':'text-neutral-500'}`}>{charLimit-composer.length} kaldı</span><span className="ml-auto flex gap-1">{['#SüperLig','#keşfet','#Gol'].map(h=> (<button key={h} onClick={()=> setComposer(c=> c ? c+' '+h : h)} className="bg-[#272727] hover:bg-neutral-700 rounded-full px-2 py-1 text-[11px]">{h}</button>))}</span></div>
                <div className="mt-3"><div className="text-xs font-bold text-neutral-400 mb-1.5">Hızlı şablonlar</div><div className="grid grid-cols-1 gap-1">{QUICK_TEMPLATES.slice(0,3).map(t=> (<button key={t.label} onClick={()=> setComposer(t.text)} className="text-left bg-[#0a0a0a] hover:bg-neutral-800 border border-neutral-800 rounded-lg px-3 py-2 text-xs flex items-center gap-2"><span>{t.icon}</span><span className="font-semibold">{t.label}</span><span className="text-neutral-400 truncate ml-auto max-w-[140px]">{t.text.slice(0,28)}…</span></button>))}</div></div>
                <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-200">Aktif: <b className="text-white">{activeDevice?.name}</b> • K {devQuality} • Ka {devCamera} • Pe {devPerf} → {composerPlatform==='instagram'?'Kamera yükselt fotoğraf netleşir': composerPlatform==='tiktok'?'Perf yükselt akıcılık artar':'İkisi 4K getirir'} • {qualityLabel} {qualityBlur ? '— şu an puslu' : '— kristal'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{` .scrollbar-hide::-webkit-scrollbar{display:none} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none} @keyframes shrink{from{width:100%}to{width:0%}} `}</style>
    </div>
  );
};
