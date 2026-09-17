import { GameState, SocialPost } from '../types/game';

const BOT_HANDLES: Record<string, string> = {
  'İstanbul United': '@istanbulunited',
  'Ankara Aslanları': '@aslanlar06',
  'İzmir Körfez': '@izmirkorfez',
  'Bursa Yıldızı': '@bursayildizi',
  'Antalya Sahil': '@antalyasahil',
  'Sivas Yiğit': '@sivasyigit',
  'Trabzon Fırtına': '@firtina61',
  'Adana Demirler': '@adanademir',
  'Konya Kartal': '@konyakartal',
  'Elite İstanbul': '@eliteist',
  'Power Ankara': '@powerankara',
  'Galatasaray SK': '@galatasaray',
  'Fenerbahçe SK': '@fenerbahce',
  'Beşiktaş JK': '@besiktas',
  'Trabzonspor': '@trabzonspor',
};

const PUNDITS = [
  { name: 'Spor Gündemi', handle: '@sporgundemi', logo: '🎙️', verified: true },
  { name: 'Futbol Analiz', handle: '@futbolanaliz', logo: '📊', verified: true },
  { name: 'Transfer Merkezi', handle: '@transfermerkezi', logo: '🔥', verified: true },
  { name: 'Taraftar Tribünü', handle: '@taraftar', logo: '📣', verified: false },
  { name: 'Süper Lig Haber', handle: '@superlig', logo: '🏆', verified: true },
  { name: 'Maçkolik Canlı', handle: '@mackolik', logo: '⚽', verified: true },
];

const FAN_NAMES = ['Efe K.', 'Zeynep A.', 'Mert Y.', 'Ayşe D.', 'Can B.', 'Elif S.', 'Kerem T.', 'Derya M.'];

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randLikes(base = 200) { return Math.floor(base + Math.random() * 1500); }

export function timeAgoFromWeek(currentWeek: number, postWeek: number): string {
  const diff = currentWeek - postWeek;
  if (diff <= 0) return 'şimdi';
  if (diff === 1) return '1h önce';
  if (diff < 5) return `${diff}h önce`;
  return `${diff} gün önce`;
}

export function generateInitialFeed(state: GameState): SocialPost[] {
  const posts: SocialPost[] = [];
  // Hoşgeldin postu
  posts.push({
    id: `init-1`,
    author: 'FutbolX',
    handle: '@futbolx',
    logo: '💬',
    content: `Hoş geldin ${state.teamName}! 🏟️ Sezon ${state.season} başlıyor. İlk maç öncesi taraftarın seni bekliyor — bir hype postu at! #SüperLig #Sezon${state.season}`,
    type: 'news',
    week: state.week,
    season: state.season,
    likes: randLikes(500),
    retweets: Math.floor(Math.random()*200),
    comments: Math.floor(Math.random()*50),
    liked: false,
    isUser: false,
    verified: true,
    tags: ['#SüperLig', `#Sezon${state.season}`],
    timeAgo: 'şimdi',
  });
  // Diğer kulüplerden selam
  const bots = state.league.filter(t => !t.isUser).slice(0, 3);
  bots.forEach((bot, i) => {
    const pundit = PUNDITS[i % PUNDITS.length];
    posts.push({
      id: `init-bot-${i}`,
      author: bot.name,
      handle: BOT_HANDLES[bot.name] || `@${bot.name.toLowerCase().replace(/\s+/g,'')}`,
      logo: bot.logo,
      content: randomItem([
        `Yeni sezon, yeni hedefler! ${state.teamName} maçını sabırsızlıkla bekliyoruz. Biz hazırız! 💪 #DerbiyeDoğru`,
        `Transfer dönemi hareketli 👀 ${state.teamName} kadrosunu güçlendirecek mi?`,
        `Taraftarımız bu sezon şampiyonluk istiyor! 🏆 #İnandık`,
      ]),
      type: 'bot',
      week: state.week,
      season: state.season,
      likes: randLikes(),
      retweets: Math.floor(Math.random()*120),
      comments: Math.floor(Math.random()*30),
      liked: false,
      isUser: false,
      verified: Math.random() < 0.3,
      tags: ['#SüperLig'],
      timeAgo: `${i+1}h önce`,
    });
    posts.push({
      id: `init-pundit-${i}`,
      author: pundit.name,
      handle: pundit.handle,
      logo: pundit.logo,
      content: randomItem([
        `🎙️ Sezon öncesi güç dengeleri: ${state.teamName} OVR ${Math.floor(state.team11.reduce((a,p)=>a+p.ovr,0)/11)} ile ligde iddialı olabilir mi? Yorumlarınız?`,
        `📊 İstatistiklere göre bu sezon en çok gol atan takım şampiyon oluyor. Bakalım kim? #Analiz`,
      ]),
      type: 'news',
      week: state.week,
      season: state.season,
      likes: randLikes(800),
      retweets: Math.floor(Math.random()*300),
      comments: Math.floor(Math.random()*80),
      liked: false,
      isUser: false,
      verified: pundit.verified,
      timeAgo: `${2+i}h önce`,
    });
  });
  return posts;
}

export function generateMatchFeedPosts(
  state: GameState,
  userScore: number,
  oppScore: number,
  opponentName: string,
  opponentLogo: string,
  isHome: boolean,
  week: number
): SocialPost[] {
  const posts: SocialPost[] = [];
  const won = userScore > oppScore;
  const draw = userScore === oppScore;
  const scoreStr = `${userScore}-${oppScore}`;
  const opponentHandle = BOT_HANDLES[opponentName] || `@${opponentName.toLowerCase().replace(/\s+/g,'')}`;

  // Resmi maç sonucu (sistem)
  posts.push({
    id: `match-${Date.now()}`,
    author: 'Süper Lig Resmi',
    handle: '@superlig',
    logo: '🏆',
    content: won
      ? `MAÇ SONUCU 🔥 ${state.teamName} ${isHome?'(E)':'(D)'} ${scoreStr} ${opponentName} karşısında galibiyet! ${userScore >= 3 ? 'Gol şöleni! ⚽⚽⚽' : 'Kritik 3 puan!' } #SüperLig #Hafta${week}`
      : draw ? `BERABERE 🤝 ${state.teamName} ${scoreStr} ${opponentName}. Puanlar paylaşıldı. Sizce kim daha iyiydi? #SüperLig`
      : `SÜRPRİZ 😱 ${opponentName} ${oppScore}-${userScore} ${state.teamName}'yi mağlup etti! Taraftar şokta. #SüperLig`,
    type: 'match',
    week,
    season: state.season,
    likes: randLikes(won? 1200: 700),
    retweets: Math.floor(Math.random()*400),
    comments: Math.floor(Math.random()*120),
    liked: false,
    isUser: false,
    verified: true,
    tags: ['#SüperLig', `#Hafta${week}`],
    timeAgo: 'şimdi',
  });

  // Rakip kulüp paylaşımı
  posts.push({
    id: `match-opp-${Date.now()+1}`,
    author: opponentName,
    handle: opponentHandle,
    logo: opponentLogo,
    content: won
      ? randomItem([
          `Bugün olmadı. Taraftarımızdan özür dileriz, telafi edeceğiz. 🙏`,
          `Hakem kararları tartışılır! Ama önümüze bakıyoruz. #MücadeleyeDevam`,
          `${state.teamName} iyi oynadı, tebrik ederiz. Rövanşı bekliyoruz! 👊`,
        ])
      : draw ? `Deplasmanda 1 puan iyidir. Mücadele için teşekkürler ${state.teamName}! 🤝`
      : randomItem([
          `3 PUAN BİZİM! 🔥 ${state.teamName} deplasmanında tarihi galibiyet! Taraftarımız muhteşemdi!`,
          `Zafer gecesi! ${scoreStr} kazandık, liderliğe göz kırptık! 🏆`,
        ]),
    type: 'bot',
    week,
    season: state.season,
    likes: randLikes(won?400:900),
    retweets: Math.floor(Math.random()*250),
    comments: Math.floor(Math.random()*80),
    liked: false,
    isUser: false,
    verified: Math.random() < 0.4,
    timeAgo: 'az önce',
  });

  // Taraftar tepkisi
  const fan = randomItem(FAN_NAMES);
  posts.push({
    id: `match-fan-${Date.now()+2}`,
    author: fan,
    handle: `@${fan.toLowerCase().replace(/\s|\./g,'')}${Math.floor(Math.random()*99)}`,
    logo: ['😍','😎','🤩','😤','🥳','😭'][Math.floor(Math.random()*6)],
    content: won
      ? randomItem([
          `İŞTE BU! ${state.teamName} kalbimde! Bu sezon şampiyonuz 🏆🔥 #İnandık`,
          `Maçın adamı kimdi sizce? Bence orta sahamız alev aldı! ⚽`,
          `Tribün yıkıldı bugün, sesim kısıldı! #Taraftar`,
        ])
      : draw ? `Beraberlik de olur, önemli olan mücadele! Takımımı seviyorum 💚`
      : randomItem([
          `Bu oyunla şampiyonluk zor... Hoca bir şeyleri değiştirmeli 😤`,
          `Hakem maçı katletti resmen! VAR nerede?! #Adalet`,
        ]),
    type: 'bot',
    week,
    season: state.season,
    likes: randLikes(150),
    retweets: Math.floor(Math.random()*40),
    comments: Math.floor(Math.random()*20),
    liked: false,
    isUser: false,
    timeAgo: 'az önce',
  });

  // Pundit yorumu
  const pundit = randomItem(PUNDITS);
  posts.push({
    id: `match-pundit-${Date.now()+3}`,
    author: pundit.name,
    handle: pundit.handle,
    logo: pundit.logo,
    content: won && userScore >= 3
      ? `📊 Analiz: ${state.teamName} hücumda ${userScore} golle parladı. xG 2.4 — bitiricilik üst düzey! #MaçAnalizi`
      : won ? `Taktik disiplin kazandırdı. ${state.teamName} kompakt kaldı ve 3 puanı aldı. 👏`
      : `Sorular artıyor: ${state.teamName} son ${draw?'2 maçtır':'maçta'} kazanamıyor. Yönetim ne yapacak? 🤔 #Gündem`,
    type: 'news',
    week,
    season: state.season,
    likes: randLikes(600),
    retweets: Math.floor(Math.random()*180),
    comments: Math.floor(Math.random()*60),
    liked: false,
    isUser: false,
    verified: true,
    timeAgo: 'az önce',
  });

  return posts;
}

export function generateTransferPost(playerName: string, ovr: number, teamName: string, price: number, tier?: string): SocialPost {
  const tierIcon = tier === 'world' ? '🌍' : tier === 'star' ? '⭐' : tier === 'turkish' ? '🇹🇷' : tier === 'wonderkid' ? '✨' : '🆕';
  return {
    id: `transfer-${Date.now()}`,
    author: 'Transfer Merkezi',
    handle: '@transfermerkezi',
    logo: '🔥',
    content: `${tierIcon} SON DAKİKA! ${playerName} (${ovr} OVR) ${teamName}'a transfer oldu! Bonservis: $${price.toLocaleString()}. Taraftar coştu! #Transfer #SüperLig`,
    type: 'transfer',
    week: 0,
    season: 0,
    likes: randLikes(1000),
    retweets: Math.floor(Math.random()*500),
    comments: Math.floor(Math.random()*150),
    liked: false,
    isUser: false,
    verified: true,
    tags: ['#Transfer', '#SüperLig'],
    timeAgo: 'şimdi',
  };
}

export function generateWeeklyBotPosts(state: GameState): SocialPost[] {
  const posts: SocialPost[] = [];
  const bots = state.league.filter(t=>!t.isUser);
  const randomBots = [...bots].sort(()=>Math.random()-0.5).slice(0,2);
  randomBots.forEach(bot=>{
    const isRumor = Math.random() < 0.5;
    if (isRumor) {
      const targetPlayer = randomItem(state.team11);
      posts.push({
        id: `weekly-${Date.now()}-${bot.name}`,
        author: 'Transfer Dedikodusu',
        handle: '@dedikodu',
        logo: '👀',
        content: `👀 İDDİA: ${bot.name}, ${state.teamName}'tan ${targetPlayer.name}'ı istiyor! Teklif yolda... Siz bırakır mıydınız? #Dedikodu`,
        type: 'news',
        week: state.week,
        season: state.season,
        likes: randLikes(300),
        retweets: Math.floor(Math.random()*80),
        comments: Math.floor(Math.random()*40),
        liked: false,
        isUser: false,
        timeAgo: 'az önce',
      });
    } else {
      posts.push({
        id: `weekly-${Date.now()}-${bot.name}-2`,
        author: bot.name,
        handle: BOT_HANDLES[bot.name] || `@${bot.name.toLowerCase().replace(/\s+/g,'')}`,
        logo: bot.logo,
        content: randomItem([
          `Hafta ${state.week} hazırlıklarımız tamam! Hedef 3 puan 💪 #BizHazırız`,
          `Taraftarımızla buluştuk, enerji muhteşem! Bu hafta tribün dolacak! #Taraftar`,
          `Antrenmanda tempo yüksek! Gençler forma için yarışıyor 🌱`,
        ]),
        type: 'bot',
        week: state.week,
        season: state.season,
        likes: randLikes(250),
        retweets: Math.floor(Math.random()*60),
        comments: Math.floor(Math.random()*15),
        liked: false,
        isUser: false,
        timeAgo: 'az önce',
      });
    }
  });
  return posts;
}

export const QUICK_TEMPLATES = [
  { label: 'Hype', icon: '🔥', text: 'Bugün büyük gün! Taraftarımızı tribüne bekliyoruz, 3 puan için savaşacağız! 💪 #MaçGünü' },
  { label: 'Kutlama', icon: '🏆', text: 'Galibiyet bizim! Taraftarımıza armağan olsun! Bu takım şampiyon olacak! 🏆🔥' },
  { label: 'Taraftara', icon: '💚', text: 'Desteğiniz için teşekkürler! Siz olmadan başaramayız, birlikte güçlüyüz! 💚 #Taraftar' },
  { label: 'Transfer', icon: '✍️', text: 'Yeni transferimiz hoş geldi! Formamız sana çok yakışacak! 👕✨' },
  { label: 'Meydan okuma', icon: '⚔️', text: 'Rakip kim olursa olsun, sahada konuşacağız! Hodri meydan! ⚔️🔥' },
  { label: 'Öz eleştiri', icon: '🙏', text: 'Bugün istediğimiz oyunu oynayamadık, taraftarımızdan özür dileriz. Daha çok çalışacağız! 🙏' },
];

export const TRENDING = [
  { tag: '#SüperLig', posts: '42.3B' },
  { tag: '#Transfer', posts: '18.7B' },
  { tag: '#Derbi', posts: '12.1B' },
  { tag: '#GolGoll', posts: '9.4B' },
  { tag: '#VAR', posts: '7.2B' },
  { tag: '#Şampiyon', posts: '6.8B' },
];
