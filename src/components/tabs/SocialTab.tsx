import React, { useState, useMemo } from 'react';
import { GameState, SocialPost } from '../../types/game';
import { QUICK_TEMPLATES, TRENDING } from '../../data/social';
import { starBonuses } from '../../utils/stadium';

// ── Instagram image presets ──
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

function getPostVisual(post: SocialPost) {
  if (post.image) {
    const preset = IMAGE_PRESETS.find(p => p.id === post.image);
    if (preset && preset.gradient) return preset;
  }
  // infer from type/content
  if (post.type === 'match') {
    const won = post.content.includes('galibiyet') || post.content.includes('kazand') || post.content.includes('3 PUAN') || post.content.includes('MAÇ SONUCU');
    return won
      ? { id: 'match-win', label: '', gradient: 'from-emerald-700 via-emerald-600 to-teal-600', emoji: '🏟️' }
      : post.content.includes('BERABERE') ? { id: 'draw', label: '', gradient: 'from-slate-600 to-slate-700', emoji: '🤝' }
      : { id: 'loss', label: '', gradient: 'from-zinc-700 to-zinc-800', emoji: '😔' };
  }
  if (post.type === 'transfer') return { id: 'transfer', label: '', gradient: 'from-amber-600 via-orange-600 to-red-600', emoji: '✍️' };
  if (post.type === 'news') return { id: 'news', label: '', gradient: 'from-blue-700 via-indigo-700 to-violet-700', emoji: '📰' };
  return { id: 'generic', label: '', gradient: 'from-neutral-700 to-neutral-800', emoji: '⚽' };
}

interface SocialTabProps {
  gameState: GameState;
  onCreatePost: (content: string, image?: string) => void;
  onLikePost: (id: string) => void;
  onAddComment: (id: string, comment: string) => void;
}

export const SocialTab: React.FC<SocialTabProps> = ({ gameState, onCreatePost, onLikePost, onAddComment }) => {
  const [filter, setFilter] = useState<string>('all');
  const [showComposer, setShowComposer] = useState(false);
  const [composer, setComposer] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [likedAnim, setLikedAnim] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState<Record<string, boolean>>({});

  const feed = gameState.socialFeed || [];
  const followers = useMemo(() => {
    const base = 18400;
    const fameBonus = (gameState.life?.stats.fame || 40) * 620;
    const fanBonus = (gameState.fanHappiness || 60) * 240;
    const star = starBonuses(gameState);
    const starFollowers = Math.round((star.attendance * 90000) + (star.gate * 60000));
    const rep = (gameState.managerRep || 50) * 140;
    return base + fameBonus + fanBonus + starFollowers + rep + gameState.week * 420;
  }, [gameState]);

  const filtered = filter === 'all' ? feed : feed.filter(p => {
    if (filter === 'user') return p.isUser;
    if (filter === 'match') return p.type === 'match';
    if (filter === 'transfer') return p.type === 'transfer';
    return true;
  });

  const charLimit = 280;
  const canPost = composer.trim().length >= 3 && composer.length <= charLimit;

  const handlePost = () => {
    if (!canPost) return;
    onCreatePost(composer.trim(), selectedImage || undefined);
    setComposer('');
    setSelectedImage('');
    setShowComposer(false);
  };

  const handleLike = (id: string, liked: boolean) => {
    onLikePost(id);
    if (!liked) {
      setLikedAnim(id);
      setTimeout(() => setLikedAnim(null), 650);
    }
  };

  // stories = user + top 7 league teams + pundits
  const stories = useMemo(() => {
    const teams = gameState.league.slice(0, 8);
    return [
      { id: 'user', name: 'Hikayen', logo: gameState.teamLogo, isUser: true, hasStory: true },
      ...teams.filter(t => !t.isUser).slice(0, 7).map(t => ({ id: t.name, name: t.name.split(' ')[0], logo: t.logo, isUser: false, hasStory: Math.random() < 0.85 })),
      { id: 'sporgundemi', name: 'sporgundemi', logo: '🎙️', isUser: false, hasStory: true },
    ];
  }, [gameState.league, gameState.teamLogo]);

  return (
    <div className="h-full flex flex-col bg-black text-white -m-3 lg:-m-6 rounded-xl lg:rounded-2xl overflow-hidden border border-neutral-800">
      {/* ── Instagram top bar ── */}
      <div className="h-[60px] border-b border-neutral-800 flex items-center justify-between px-4 lg:px-6 shrink-0 bg-black sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-[28px] font-black tracking-tighter" style={{ fontFamily: "'Segoe UI', system-ui" }}>
            <span className="bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5] bg-clip-text text-transparent">FutbolGram</span>
          </span>
          <span className="hidden sm:inline text-[10px] border border-neutral-700 rounded-full px-2 py-0.5 text-neutral-400">▾</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="bg-[#262626] rounded-lg px-3 py-1.5 flex items-center gap-2 w-[268px]">
            <span className="text-neutral-500">⌕</span>
            <input placeholder="Ara" className="bg-transparent outline-none text-sm placeholder:text-neutral-500 w-full" />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[20px]">
          <button className="hover:opacity-70">⌂</button>
          <button className="hover:opacity-70 relative">♡<span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" /></button>
          <button className="hover:opacity-70">✈︎</button>
          <button onClick={() => setShowComposer(true)} className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 flex items-center justify-center text-white text-sm">＋</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm border-2 border-neutral-800">
            {gameState.teamLogo}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Center feed ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black">
          {/* Stories */}
          <div className="shrink-0 border-b border-neutral-800 bg-black">
            <div className="flex gap-3 px-3 py-3 overflow-x-auto scrollbar-hide">
              {stories.map(s => (
                <button
                  key={s.id}
                  onClick={() => { if (!s.isUser) { /* could filter by author */ } else setShowComposer(true); }}
                  className="flex flex-col items-center gap-1 shrink-0 w-[66px]"
                >
                  <div className={`w-[66px] h-[66px] rounded-full p-[3px] ${s.hasStory ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600' : 'bg-neutral-700'}`}>
                    <div className="w-full h-full rounded-full bg-black p-[2px]">
                      <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-xl">
                        {s.logo}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-white truncate w-full text-center">{s.name}</span>
                  {s.isUser && <span className="w-4 h-4 -mt-6 ml-8 bg-blue-500 rounded-full border-2 border-black text-white text-[10px] flex items-center justify-center">＋</span>}
                </button>
              ))}
              {/* Add more placeholder stories */}
              {['ads', 'live'].map(k => (
                <div key={k} className="flex flex-col items-center gap-1 shrink-0 w-[66px] opacity-60">
                  <div className="w-[66px] h-[66px] rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg">• • •</div>
                  <span className="text-[11px] text-neutral-500">{k}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter pills (instagram style underline) */}
          <div className="flex gap-1 px-3 py-2 border-b border-neutral-800 bg-black sticky top-0 z-10 overflow-x-auto">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${filter === f.id ? 'bg-white text-black border-white' : 'bg-[#262626] text-white border-neutral-700 hover:bg-neutral-700'}`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-neutral-500 hidden sm:flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> {followers.toLocaleString()} takipçi
            </span>
          </div>

          {/* Create bar (instagram-like) */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-black">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">{gameState.teamLogo}</div>
            <button onClick={() => setShowComposer(true)} className="flex-1 text-left bg-[#262626] hover:bg-[#363636] text-neutral-400 rounded-full px-4 py-2 text-sm">
              Bir gönderi paylaş... Maç öncesi hype, kutlama ya da transfer duyurusu ✨
            </button>
            <button onClick={() => setShowComposer(true)} className="text-blue-500 font-semibold text-sm hover:text-white">Paylaş</button>
          </div>

          {/* Feed scroll */}
          <div className="flex-1 overflow-y-auto bg-black">
            <div className="max-w-[470px] mx-auto w-full">
              {/* quick stats bar mobile */}
              <div className="lg:hidden flex items-center justify-between px-4 py-2 text-xs text-neutral-400 border-b border-neutral-800">
                <span>{feed.filter(p => p.isUser).length} gönderi • {gameState.week}. hafta</span>
                <span className="text-blue-400">@{gameState.teamName.toLowerCase().replace(/\s+/g, '')}</span>
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16 border border-neutral-800 rounded-xl m-4">
                  <div className="w-24 h-24 mx-auto rounded-full border-2 border-white flex items-center justify-center text-3xl mb-4">📸</div>
                  <div className="font-light text-xl">Henüz gönderi yok</div>
                  <div className="text-sm text-neutral-400 mt-2">Paylaşmaya başladığında fotoğrafların burada görünecek.</div>
                  <button onClick={() => setShowComposer(true)} className="mt-4 px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-semibold">İlk gönderini paylaş</button>
                </div>
              )}

              {filtered.map(post => {
                const visual = getPostVisual(post);
                const isLiked = post.liked;
                return (
                  <article key={post.id} className="bg-black border-b lg:border border-neutral-800 lg:rounded-lg lg:mb-4 overflow-hidden">
                    {/* header */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600">
                          <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">{post.logo}</div>
                        </div>
                        <div className="leading-tight">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm text-white">{post.author}</span>
                            {post.verified && <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[9px] text-white">✓</span>}
                            <span className="text-neutral-500 text-xs">• {post.timeAgo}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 -mt-0.5">{post.handle} {post.isUser && <span className="text-blue-400">• Sen</span>}</div>
                        </div>
                      </div>
                      <button className="text-white px-2">⋯</button>
                    </div>

                    {/* image */}
                    <div
                      onDoubleClick={() => handleLike(post.id, isLiked)}
                      className={`relative w-full aspect-square bg-gradient-to-br ${visual.gradient} flex items-center justify-center overflow-hidden cursor-pointer select-none`}
                    >
                      {/* subtle pattern */}
                      <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 20%, white 0.5px, transparent 1px)', backgroundSize: '24px 24px' }} />
                      <div className="relative text-center p-6">
                        <div className="text-6xl drop-shadow-lg">{visual.emoji}</div>
                        {post.type === 'match' && (
                          <div className="mt-3 bg-black/70 backdrop-blur rounded-xl px-4 py-2 border border-white/20">
                            <div className="text-white font-black text-sm">{post.content.slice(0, 80)}</div>
                            <div className="text-[10px] text-white/70 mt-1">Hafta {post.week} • Sezon {post.season}</div>
                          </div>
                        )}
                        {post.type === 'transfer' && (
                          <div className="mt-3 text-white font-bold text-sm bg-black/60 rounded-full px-3 py-1">✍️ TRANSFER</div>
                        )}
                        {post.type === 'user' && selectedImage === '' && (
                          <div className="mt-2 text-white/90 text-xs max-w-[280px] line-clamp-3">{post.content.slice(0, 90)}</div>
                        )}
                      </div>
                      {/* double-tap heart anim */}
                      {likedAnim === post.id && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-8xl animate-[ping_600ms_cubic-bezier(0,0,0.2,1)] drop-shadow-2xl">❤️</span>
                        </div>
                      )}
                      {/* location tag instagram style */}
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-white/10">
                        <span className="text-[11px]">📍</span>
                        <span className="text-xs text-white font-medium">{post.type === 'match' ? 'Stadyum' : post.type === 'transfer' ? 'Transfer Merkezi' : 'Süper Lig'}</span>
                      </div>
                    </div>

                    {/* action bar */}
                    <div className="px-3 pt-3 flex items-center gap-4 text-[22px] leading-none">
                      <button onClick={() => handleLike(post.id, isLiked)} className={`hover:opacity-60 transition ${isLiked ? 'text-red-500' : 'text-white'}`}>
                        {isLiked ? '♥' : '♡'}
                      </button>
                      <button onClick={() => document.getElementById(`comment-${post.id}`)?.focus()} className="hover:opacity-60">💬</button>
                      <button className="hover:opacity-60">✈︎</button>
                      <button className="ml-auto hover:opacity-60">🔖</button>
                    </div>

                    {/* likes */}
                    <div className="px-3 pt-2">
                      <div className="text-sm font-semibold text-white">{post.likes.toLocaleString()} beğenme</div>
                    </div>

                    {/* caption */}
                    <div className="px-3 pt-1 text-[14px] leading-[18px]">
                      <span className="font-semibold text-white mr-2">{post.author}</span>
                      <span className="text-white">{post.content}</span>
                      {post.tags && post.tags.length > 0 && (
                        <span className="ml-1">
                          {post.tags.map(t => (
                            <span key={t} className="text-[#0095f6] hover:underline cursor-pointer"> {t}</span>
                          ))}
                        </span>
                      )}
                    </div>

                    {/* comments preview */}
                    <div className="px-3 pt-1 text-sm">
                      {!showAllComments[post.id] && post.comments > 2 && (
                        <button onClick={() => setShowAllComments({ ...showAllComments, [post.id]: true })} className="text-neutral-400 text-sm">
                          {post.comments} yorumun tümünü gör
                        </button>
                      )}
                      <div className="space-y-1 mt-1">
                        {/* fake preview comments */}
                        <div className="text-sm">
                          <span className="font-semibold mr-2">{post.type === 'match' ? 'taraftar_1907' : 'futbolfan34'}</span>
                          <span className="text-neutral-200">{post.type === 'match' ? 'Helal olsun! 🔥' : post.type === 'transfer' ? 'Hoş geldin! 💛💙' : 'Süper içerik 👏'}</span>
                          <span className="ml-2 text-neutral-500">♡</span>
                        </div>
                        {showAllComments[post.id] && (
                          <div className="text-sm">
                            <span className="font-semibold mr-2">analiz_ekibi</span>
                            <span className="text-neutral-200">Maçın kırılma anı çok iyiydi.</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 uppercase tracking-wider mt-1">{post.timeAgo} • Hafta {post.week}</div>
                    </div>

                    {/* add comment */}
                    <div className="mt-2 border-t border-neutral-800 flex items-center gap-2 px-3 py-2">
                      <span className="text-lg">☺</span>
                      <input
                        id={`comment-${post.id}`}
                        value={commentDrafts[post.id] || ''}
                        onChange={e => setCommentDrafts({ ...commentDrafts, [post.id]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (commentDrafts[post.id] || '').trim().length >= 2) {
                            onAddComment(post.id, commentDrafts[post.id].trim());
                            setCommentDrafts({ ...commentDrafts, [post.id]: '' });
                          }
                        }}
                        placeholder="Yorum ekle..."
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-500"
                      />
                      <button
                        onClick={() => {
                          const v = (commentDrafts[post.id] || '').trim();
                          if (v.length >= 2) { onAddComment(post.id, v); setCommentDrafts({ ...commentDrafts, [post.id]: '' }); }
                        }}
                        disabled={(commentDrafts[post.id] || '').trim().length < 2}
                        className="text-[#0095f6] font-semibold text-sm disabled:opacity-40 hover:text-white"
                      >
                        Paylaş
                      </button>
                    </div>
                  </article>
                );
              })}
              <div className="h-8" />
            </div>
          </div>
        </div>

        {/* ── Right sidebar (desktop) ── */}
        <div className="hidden xl:flex w-[319px] shrink-0 flex-col bg-black border-l border-neutral-800 overflow-y-auto">
          <div className="p-4">
            {/* switch */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-lg">{gameState.teamLogo}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{gameState.teamName.toLowerCase().replace(/\s+/g, '')}</div>
                <div className="text-sm text-neutral-400 truncate">{gameState.teamName}</div>
              </div>
              <button className="text-xs font-semibold text-[#0095f6] hover:text-white">Geçiş Yap</button>
            </div>

            {/* suggestions */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-400">Senin için önerilenler</span>
                <button className="text-xs font-semibold">Tümünü Gör</button>
              </div>
              <div className="mt-4 space-y-4">
                {[
                  { name: 'sporgundemi', sub: 'Seni takip ediyor', logo: '🎙️', verified: true },
                  { name: 'transfermerkezi', sub: 'Popüler', logo: '🔥', verified: true },
                  { name: 'superlig', sub: 'Takip et', logo: '🏆', verified: true },
                  { name: 'taraftar', sub: 'Senin için öneriliyor', logo: '📣', verified: false },
                  { name: 'mackolik', sub: 'Yeni', logo: '⚽', verified: true },
                ].map(u => (
                  <div key={u.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm">{u.logo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-1">{u.name} {u.verified && <span className="w-3 h-3 bg-blue-500 rounded-full text-white text-[8px] flex items-center justify-center">✓</span>}</div>
                      <div className="text-xs text-neutral-400 truncate">{u.sub}</div>
                    </div>
                    <button className="text-xs font-semibold text-[#0095f6] hover:text-white">Takip Et</button>
                  </div>
                ))}
              </div>
            </div>

            {/* trending */}
            <div className="mt-6">
              <div className="text-sm font-semibold text-neutral-400 mb-3">Gündem</div>
              <div className="space-y-3">
                {TRENDING.slice(0, 5).map(t => (
                  <div key={t.tag} className="flex justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{t.tag}</div>
                      <div className="text-xs text-neutral-400">{t.posts} gönderi</div>
                    </div>
                    <button className="text-neutral-500">›</button>
                  </div>
                ))}
              </div>
            </div>

            {/* stats */}
            <div className="mt-6 bg-[#262626] rounded-xl p-3 border border-neutral-800">
              <div className="text-xs text-neutral-400">Hesabın</div>
              <div className="text-lg font-bold">{followers.toLocaleString()} takipçi</div>
              <div className="text-xs text-neutral-400">Haftalık +{(followers * 0.04 | 0).toLocaleString()} • Etkileşim %{Math.min(94, 42 + feed.filter(p => p.isUser).length * 6)}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-black rounded-lg py-2">
                  <div className="font-bold text-sm">{feed.filter(p => p.isUser).length}</div>
                  <div className="text-[10px] text-neutral-400">Gönderi</div>
                </div>
                <div className="bg-black rounded-lg py-2">
                  <div className="font-bold text-sm">{feed.length}</div>
                  <div className="text-[10px] text-neutral-400">Akış</div>
                </div>
                <div className="bg-black rounded-lg py-2">
                  <div className="font-bold text-sm">{gameState.week}/18</div>
                  <div className="text-[10px] text-neutral-400">Hafta</div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-[11px] text-neutral-500 leading-4">
              Hakkında • Yardım • API • Gizlilik • Koşullar • Konum • Dil • Meta Onaylı
              <div className="mt-3">© 2026 FUTBOLGRAM</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Composer Modal (Instagram) ── */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[720px] bg-[#262626] rounded-xl overflow-hidden border border-neutral-700 flex flex-col max-h-[90vh]">
            <div className="h-[42px] border-b border-neutral-700 flex items-center justify-between px-4 shrink-0">
              <button onClick={() => setShowComposer(false)} className="text-xl">✕</button>
              <div className="font-semibold text-sm">Yeni gönderi oluştur</div>
              <button
                onClick={handlePost}
                disabled={!canPost}
                className={`text-sm font-semibold ${canPost ? 'text-[#0095f6] hover:text-white' : 'text-[#0095f6]/40'}`}
              >
                Paylaş
              </button>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* image picker */}
              <div className="lg:w-[360px] bg-black flex flex-col">
                <div className={`flex-1 aspect-square lg:aspect-auto bg-gradient-to-br ${selectedImage ? (IMAGE_PRESETS.find(p => p.id === selectedImage)?.gradient || 'from-neutral-800 to-black') : 'from-neutral-800 to-black'} flex items-center justify-center relative`}>
                  <span className="text-6xl">{selectedImage ? IMAGE_PRESETS.find(p => p.id === selectedImage)?.emoji : '🖼️'}</span>
                  {!selectedImage && <span className="absolute bottom-3 text-xs bg-black/70 rounded-full px-3 py-1">Fotoğraf Seç</span>}
                  {selectedImage && <span className="absolute bottom-3 text-xs bg-black/70 rounded-full px-3 py-1">{IMAGE_PRESETS.find(p => p.id === selectedImage)?.label}</span>}
                </div>
                <div className="p-3 grid grid-cols-4 gap-2 border-t border-neutral-700 bg-[#262626]">
                  {IMAGE_PRESETS.map(p => (
                    <button
                      key={p.id || 'none'}
                      onClick={() => setSelectedImage(p.id)}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 text-xs ${selectedImage === p.id ? 'border-white bg-white text-black' : 'border-neutral-700 bg-neutral-800 text-white hover:border-neutral-500'}`}
                    >
                      <span className="text-lg">{p.emoji || '—'}</span>
                      <span className="text-[10px] leading-none">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* caption */}
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-black text-xs">{gameState.teamLogo}</div>
                  <div className="text-sm font-semibold">{gameState.teamName.toLowerCase().replace(/\s+/g, '')}</div>
                  <span className="ml-auto text-xs bg-[#363636] rounded-full px-2 py-1">{composer.length}/{charLimit}</span>
                </div>
                <textarea
                  value={composer}
                  onChange={e => setComposer(e.target.value)}
                  placeholder={`Bir açıklama yaz... #${gameState.teamName.replace(/\s+/g, '')} için neler düşünüyorsun?`}
                  className="flex-1 min-h-[140px] bg-transparent outline-none text-sm placeholder:text-neutral-500 resize-none"
                  maxLength={320}
                />

                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs ${composer.length > 260 ? 'text-amber-400' : 'text-neutral-500'}`}>{charLimit - composer.length} kaldı</span>
                  <span className="text-[11px] text-neutral-500">😊</span>
                </div>

                {/* templates */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-neutral-400 mb-2">Hızlı şablonlar</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {QUICK_TEMPLATES.map(t => (
                      <button
                        key={t.label}
                        onClick={() => setComposer(t.text)}
                        className="text-left bg-[#363636] hover:bg-[#426] border border-neutral-700 rounded-lg px-3 py-2 text-xs flex items-center gap-2"
                      >
                        <span>{t.icon}</span>
                        <span className="font-semibold">{t.label}</span>
                        <span className="text-neutral-400 truncate ml-auto max-w-[160px]">{t.text.slice(0, 36)}…</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
                  <span>Gelişmiş ayarlar</span>
                  <span>›</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-2">💡 İpucu: Maç öncesi paylaşım yaparsan galibiyette +taraftar & ün, mağlubiyette özür ile moral toplarsın.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{` .scrollbar-hide::-webkit-scrollbar{display:none} .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none} `}</style>
    </div>
  );
};
