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
    version: '4.0.0',
    date: '16 Eyl 2026',
    tag: 'BÜYÜK',
    title: 'Menajerin Kendi Hayatı: 3D Spor Salonu, Ev, Şehir ve Tatil',
    items: [
      '🧑‍💼 Kişisel hayat sistemi: Enerji, Form, Keyif ve Ün statları + haftalık 4 boş zaman hakkı',
      '🏋️ 3D Spor Salonu: üstünü değiştir, koşu bandı / bench press / kondisyon bisikleti seç, karakter antrenman yapıyor',
      '🛋️ 3D Ev: kanepede oyun oyna (konsol + yanan TV) veya uzanıp dinlen (uyku animasyonu)',
      '🌆 3D Şehir: parkta yürü, taraftarla buluş, akşam yemeği — trafik, lambalar ve manzara canlı',
      '🏖️ 3D Tatil: sahil, palmiyeler, dalgalar ve güneş — kafa dinleme zamanı',
      '🎤 3D Basın Toplantısı: mikrofonlar, kameralar ve flaşlar eşliğinde konuşma',
      '💪 Hayatın oyuna etkisi: Form → maç kenarı bonusu ve oyuncu toparlanması, Keyif → takım morali ve pazarlık, Ün → sponsor geliri',
      '🛍️ Kişisel eşyalar: spor salonu üyeliği, oyun konsolu, ev konforu ve araba',
      'Yorgunken (enerji < 30) etkiler yarıya iner — dinlenmek de bir strateji',
    ],
  },
  {
    version: '3.3.0',
    date: '16 Eyl 2026',
    tag: 'BÜYÜK',
    title: '3D Stadyum Stüdyosu: Stadyumunu Gör, Tasarla ve Büyüt',
    items: [
      '🏟️ Gerçek 3D stadyum: sürükleyerek döndür, tekerlekle yakınlaş, çift tıkla sıfırla (mobilde pinch)',
      '🎨 Koltuk ve aksan renkleri: ücretsiz palet + satın alınabilir özel renkler (altın tribün, neon mavi…)',
      '🏠 Çatı tipleri: saçak, tam çatı, cam çatı — kötü havada seyirci kaybını azaltır',
      '🏗️ Tribün mimarisi: dik basamak, çift katlı, modern kase (köşeleri kapalı)',
      '🌱 Çim deseni (şeritli/halkalı/düz), çimde kulüp logosu, tribün bayrakları',
      '💡 Gece/gündüz modu + sinematik kamera turu; projektörler ve LED panolar canlı',
      '📈 Kapasite büyütme: +1.000 / +2.500 / +5.000 / +10.000 koltuk paketleri (tribün satırları görsel olarak büyür)',
      '🎟️ Bilet fiyat stratejisi (ucuz/normal/pahalı/lüks) + tribünde büfe harcaması ile gerçek talep eğrisi',
      '🏟️ Maç öncesi ekranında "stadyum turu" 3D önizleme',
    ],
  },
  {
    version: '3.2.0',
    date: '16 Eyl 2026',
    tag: 'BÜYÜK',
    title: 'Kiralama, Yıldız Futbolcular ve Yeni Piyasa Ekonomisi',
    items: [
      '🔄 Kiralama sistemi: kiralık liste, peşin bedel, maaş payı, sezon sonu dönüş, satın alma opsiyonu',
      '📤 Oyuncularını kiralığa gönderebilirsin: kulüp teklifleri, maaş katkısı ve OVR gelişimi ile geri dönüş',
      '🌍 74 bilindik futbolcu: dünya yıldızları, üst düzey yıldızlar, milli yıldızlar ve genç yıldız adayları',
      '⭐ Rakip kulüplerin yıldız oyuncuları var — maç öncesi raporda görürsün, sahada karşına çıkar',
      '💰 Yeni piyasa ekonomisi: 80 OVR ≈ $6.7M, 90 OVR ≈ $18M, 95 OVR ≈ $29M (yaş ve yıldız sınıfı çarpanlı)',
      'Gelir dengesi yenilendi: maç gelirleri, sezon ödülleri ve tesis fiyatları yeni ekonomiye ölçeklendi',
      'Kiralık gelen/giden oyuncular Ofis sekmesinden takip edilir ve yönetilir',
    ],
  },
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

export const CURRENT_VERSION = '4.0.0';
