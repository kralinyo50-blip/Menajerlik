export interface YoutubeVideo {
  id: string;
  videoId: string; // youtube.com/watch?v=...
  title: string;
  channel: string;
  channelIcon: string;
  views: string;
  timeAgo: string;
  duration: string;
  category: 'özet' | 'gol' | 'analiz' | 'canlı' | 'magazin';
  tags?: string[];
}

export const YOUTUBE_VIDEOS: YoutubeVideo[] = [
  { id: 'yt1', videoId: 'pRpeEdMmmQ0', title: 'Süper Lig Haftanın Golleri — 8 Gol Bir Arada!', channel: 'Süper Lig Resmi', channelIcon: '🏆', views: '2.1 Mn', timeAgo: '3 saat önce', duration: '08:42', category: 'gol', tags: ['#SüperLig','#Gol'] },
  { id: 'yt2', videoId: 'dQw4w9WgXcQ', title: 'Derbi Özeti: Kıran Kırana 3-2 | Tribün Yıkıldı', channel: 'beIN Sports TR', channelIcon: '📺', views: '1.4 Mn', timeAgo: '1 gün önce', duration: '11:03', category: 'özet', tags: ['#Derbi','#Özet'] },
  { id: 'yt3', videoId: '9bZkp7q19f0', title: 'Genç Yetenek Şov: 19 Yaşında Hat-Trick!', channel: 'Tivibu Spor', channelIcon: '⚽', views: '890 B', timeAgo: '5 saat önce', duration: '04:18', category: 'gol' },
  { id: 'yt4', videoId: 'kJQP7kiw5Fk', title: 'VAR Kararları Tartışma Yarattı — Analiz Masası', channel: 'Spor Gündemi', channelIcon: '🎙️', views: '540 B', timeAgo: '2 saat önce', duration: '18:22', category: 'analiz' },
  { id: 'yt5', videoId: 'CevxZvSJLk8', title: 'Taraftar Kamerası: Deplasman Tribünü Coştu', channel: 'Tribün TV', channelIcon: '📣', views: '320 B', timeAgo: '6 saat önce', duration: '06:55', category: 'magazin' },
  { id: 'yt6', videoId: 'fRh_vgS2dFE', title: 'Canlı: Transfer Dedikoduları — Son Dakika', channel: 'Transfer Merkezi', channelIcon: '🔥', views: '12 B izliyor', timeAgo: 'Canlı', duration: 'LIVE', category: 'canlı' },
  { id: 'yt7', videoId: 'OPf0YbXqDm0', title: 'Teknik Analiz: 4-3-3 Nasıl İşledi? Taktik Tahtası', channel: 'Futbol Analiz', channelIcon: '📊', views: '210 B', timeAgo: '1 gün önce', duration: '14:40', category: 'analiz' },
  { id: 'yt8', videoId: '60ItHLz5WEA', title: 'Maç Sonu Röportaj: Hoca “Daha İyi Olacağız”', channel: 'Kulüp TV', channelIcon: '🎤', views: '175 B', timeAgo: '4 saat önce', duration: '03:12', category: 'magazin' },
  { id: 'yt9', videoId: 'YQHsXMglC9A', title: 'Altyapıdan Gelen Yıldız: İlk Golü Böyle Attı', channel: 'Akademi Lig', channelIcon: '🌱', views: '98 B', timeAgo: '2 gün önce', duration: '02:44', category: 'gol' },
  { id: 'yt10', videoId: 'hT_nvWreIhg', title: 'Haftanın En İyi Kurtarışları — Kaleciler Şovda', channel: 'Kaleci Okulu', channelIcon: '🧤', views: '430 B', timeAgo: '8 saat önce', duration: '05:30', category: 'gol' },
  { id: 'yt11', videoId: 'pRpeEdMmmQ0', title: 'Şampiyonluk Yolunda Kritik 3 Puan — Özet', channel: 'Süper Lig Resmi', channelIcon: '🏆', views: '1.8 Mn', timeAgo: '12 saat önce', duration: '09:15', category: 'özet' },
  { id: 'yt12', videoId: 'dQw4w9WgXcQ', title: 'Kupa Çeyrek Final: Penaltılarla Gelen Zafer', channel: 'Kupa TV', channelIcon: '🏅', views: '670 B', timeAgo: '3 gün önce', duration: '12:01', category: 'özet' },
  { id: 'yt13', videoId: '9bZkp7q19f0', title: 'En İyi Frikik Golleri — Füzeler!', channel: 'Gol Makinesi', channelIcon: '🎯', views: '1.1 Mn', timeAgo: '1 hafta önce', duration: '07:33', category: 'gol' },
  { id: 'yt14', videoId: 'kJQP7kiw5Fk', title: 'Canlı Yayın: Taraftarla Soru-Cevap', channel: 'Taraftar Tribünü', channelIcon: '💬', views: '4.2 B izliyor', timeAgo: 'Canlı', duration: 'LIVE', category: 'canlı' },
  { id: 'yt15', videoId: 'CevxZvSJLk8', title: 'Efsane Geri Döndü: 35 Yaşında Hala Zirvede', channel: 'Efsaneler', channelIcon: '⭐', views: '2.7 Mn', timeAgo: '5 gün önce', duration: '10:20', category: 'magazin' },
  { id: 'yt16', videoId: 'fRh_vgS2dFE', title: 'Stadyum Turu: Yeni Tribünler Nasıl Görünüyor?', channel: 'Stadyum TV', channelIcon: '🏟️', views: '88 B', timeAgo: '2 gün önce', duration: '06:10', category: 'magazin' },
  { id: 'yt17', videoId: 'OPf0YbXqDm0', title: 'Pres ve Geçiş Oyunu — Modern Futbol Analizi', channel: 'Taktik Lab', channelIcon: '🧠', views: '156 B', timeAgo: '3 gün önce', duration: '22:18', category: 'analiz' },
  { id: 'yt18', videoId: '60ItHLz5WEA', title: 'U19 Final Özeti: Geleceğin Yıldızları', channel: 'Genç Lig', channelIcon: '👶', views: '42 B', timeAgo: '1 hafta önce', duration: '04:55', category: 'özet' },
];

export const YOUTUBE_CATEGORIES = [
  { id: 'all', label: 'Tümü' },
  { id: 'özet', label: 'Özetler' },
  { id: 'gol', label: 'Goller' },
  { id: 'analiz', label: 'Analiz' },
  { id: 'canlı', label: 'Canlı' },
  { id: 'magazin', label: 'Magazin' },
] as const;

export const TIKTOK_VIDEOS = [
  { id: 'tt1', title: 'Soyunma odası dansı 🕺 #takım', author: '@genctakim', likes: '42.3B', comments: '1.2B', duration: '0:15', gradient: 'from-violet-600 to-fuchsia-600', emoji: '💃' },
  { id: 'tt2', title: 'Frikik böyle atılır 🎯 #gol', author: '@frikik.ustasi', likes: '128B', comments: '3.4B', duration: '0:12', gradient: 'from-emerald-600 to-teal-600', emoji: '⚽' },
  { id: 'tt3', title: 'Taraftar tepkisi: GOLLL!!! 🔥', author: '@taraftar61', likes: '89B', comments: '2.1B', duration: '0:09', gradient: 'from-orange-600 to-red-600', emoji: '🔥' },
  { id: 'tt4', title: 'Kaleci kurtarışı inanılmaz 🧤', author: '@kaleci34', likes: '67B', comments: '900', duration: '0:11', gradient: 'from-blue-600 to-indigo-600', emoji: '🧤' },
  { id: 'tt5', title: 'Hocanın son taktiği 😂 #komik', author: '@hocam', likes: '210B', comments: '5.6B', duration: '0:18', gradient: 'from-amber-600 to-orange-600', emoji: '😂' },
  { id: 'tt6', title: 'Genç yıldız çalımları ✨', author: '@wonderkid', likes: '156B', comments: '4.2B', duration: '0:14', gradient: 'from-pink-600 to-rose-600', emoji: '✨' },
  { id: 'tt7', title: 'Derbi öncesi gerginlik 👀', author: '@derbihavasi', likes: '98B', comments: '2.8B', duration: '0:20', gradient: 'from-slate-700 to-slate-800', emoji: '👀' },
  { id: 'tt8', title: 'Antrenmandan komik anlar', author: '@idman', likes: '54B', comments: '1.1B', duration: '0:16', gradient: 'from-cyan-600 to-blue-600', emoji: '😆' },
];
