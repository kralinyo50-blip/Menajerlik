export interface UpdateEntry {
  version: string;
  date: string;
  tag: 'YENİ' | 'DÜZELTME' | 'İYİLEŞTİRME' | 'BÜYÜK';
  title: string;
  items: string[];
}

/** Sol panel "Gelen Güncellemeler" listesi — en yeni üstte */
export const UPDATE_LOG: UpdateEntry[] = [
  {
    version: '3.1.0',
    date: '16 Eyl 2026',
    tag: 'BÜYÜK',
    title: 'Kariyer İlerlemesi: Görevler, Beceriler, 2D Saha',
    items: [
      '🎯 Görev/Misyon sistemi: haftalık + sezonluk + kariyer görevleri, ödüllü (nakit, XP, jeton, yetenek puanı)',
      '🧠 Menajer seviyesi ve 8 dallı beceri ağacı (taktik, motivasyon, pazarlık, scout, genç, sağlık, medya, kondisyon)',
      '⚽ Maçta canlı 2D saha: diziliş, top hareketi, son olay akışı ve gol animasyonu',
      '🎁 Günlük giriş ödülü (7 günlük seri tablosu)',
      '🧠 "En iyi 11" otomatik kadro seçimi (form + enerji + OVR)',
      'Yeni Kariyer sekmesi: seviye, beceriler, görevler ve kariyer kaydı',
      'Kenar panelde anlık görev takibi ve seviye çubuğu',
    ],
  },
  {
    version: '3.0.0',
    date: '16 Eyl 2026',
    tag: 'BÜYÜK',
    title: 'Kariyer Sistemi & Gerçek Maç Deneyimi',
    items: [
      'İç saha / deplasman fikstürü + ev sahibi avantajı ve seyirci geliri',
      'Hava durumu sistemi (7 tip): gol ve sakatlık oranlarını etkiler',
      'Sarı/kırmızı kart birikimi, cezalı oyuncu ve otomatik kadro düzeltme',
      'Maç içi sakatlıklar artık gerçekten uygulanıyor (1-3 hafta)',
      'Oyuncu reytingleri + maçın adamı (MOTM) bonusu',
      'Devre arası takım konuşması: öv / fırça at / sakin taktik',
      'Kupa maçlarında uzatma ve interaktif penaltı atışları',
      'Yeni Ofis sekmesi: transfer teklifleri, sözleşme yenileme, kaptan, duran top görevleri',
      'Rakip kulüplerden oyuncularına gelen teklifler (kabul/red)',
      'Haftalık antrenman odağı ve genç gelişimi',
      'Lig gol krallığı (rakip oyuncular dahil) ve fikstür ekranı',
      'Yönetim güveni: uyarılar ve kovulma (kariyer sonu ekranı)',
      'Kayıt slotları (3), yedek indir/yükle (.json), ses efektleri',
    ],
  },
  {
    version: '2.1.0',
    date: '15 Eyl 2026',
    tag: 'BÜYÜK',
    title: 'Oyun İçi Mini Oyunlar',
    items: [
      'Ayrı Mini Oyun menüsü kaldırıldı — her şey hikâyede',
      'Maç öncesi: otobüs sürme (stadyuma yolculuk)',
      'Maç içi: penaltı, frikik ve kaleci kurtarışı (skora yazılır)',
      'Maç sonrası: sabotaj, basın, antrenman sprinti, taraftar challenge',
      'Sabotaj başarılıysa rakip OVR düşer',
    ],
  },
  {
    version: '2.0.0',
    date: '15 Eyl 2026',
    tag: 'BÜYÜK',
    title: 'Ultimate Edition',
    items: [
      '4 zorluk seviyesi: Kolay / Normal / Zor / Efsane',
      'Yeni oyuncu tutorialı (7 adım)',
      '18 başarım + ödül sistemi',
      'Canlı maç: 1x/2x/4x hız, top hakimiyeti, şut istatistiği',
      'Çalışan oyuncu değişikliği (5 hak)',
      'Sezon sistemi: yaşlanma, sözleşme, yeni fikstür',
      'Taraftar / kimya / yönetim güveni metrikleri',
      'Otomatik kayıt + toast bildirimleri',
    ],
  },
  {
    version: '1.5.0',
    date: 'Önceki',
    tag: 'İYİLEŞTİRME',
    title: 'Kulüp Ekonomisi',
    items: [
      'Türkiye geneli forma mağazaları',
      'Transfer pazarlığı (scout bonusu)',
      'Yatırım portföyü & sponsorluklar',
      'Tesis / akademi / personel sistemi',
    ],
  },
  {
    version: '1.0.0',
    date: 'Çıkış',
    tag: 'YENİ',
    title: 'Manager Pro 2026',
    items: [
      'Lig + kupa kariyeri',
      'Kadro, taktik, antrenman',
      'Canlı maç simülasyonu',
      'Maç sonrası olaylar & takım aktiviteleri',
    ],
  },
];

export const CURRENT_VERSION = '3.1.0';
