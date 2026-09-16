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

export const CURRENT_VERSION = '2.1.0';
