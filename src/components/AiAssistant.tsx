import React, { useState, useRef, useEffect, useMemo } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

interface QuickQ {
  id: string;
  label: string;
  icon: string;
  q: string;
  keywords: string[];
  answer: string;
  category: string;
}

const QUICK_QUESTIONS: QuickQ[] = [
  {
    id: 'match-how',
    label: 'Maça nasıl çıkarım?',
    icon: '⚽',
    q: 'Maça nasıl çıkarım?',
    category: 'Maç',
    keywords: ['maç', 'oyna', 'başlat', 'çık'],
    answer: `**⚽ Maça Çıkış - Adım Adım**\n\n**1. Sidebar'dan "MAÇA ÇIK"a tıkla** (lig haftası 1-18 arası olmalı).\n**2. Taktik Odası açılır:** rakibin OVR'sı, son 5 maçı, hava durumu ve kadro uyarılarını görürsün.\n   • Sakat/cezalı varsa otomatik yedekle değişir - yine de Taktik sekmesinden kontrol et.\n   • Hava durumu gol oranını ve sakatlık riskini etkiler (yağmurda kayma, karda yorgunluk).\n**3. "Maçı Başlat" de:** maç motoru açılır.\n   • Hız 1x/2x/4x ile izle, olaylar canlı akar, 2D sahada topu takip et.\n   • Devre arası (45') takım konuşması seç: **Öv** (moral+), **Fırça** (hücum++ ama moral-), **Sakin** (defans++). %20 ihtimalle tutmaz!\n**4. Maç içi:** 68' ve 83'te yorgunluk uyarısı gelirse **Değişiklik (5 hak)** kullan. 3 sarı=1 maç ceza, kırmızı=2 maç.\n**5. Bitişte reytingler ve MOTM** gösterilir, "Devam Et" ile lig tablosu ve ekonomi güncellenir.\n\n💡 **İpucu:** Kaptan sahadaysa +2 hücum/savunma bonusu alırsın. Penaltı/frikik görevlisini Ofis'ten ayarla - maç içi mini oyunlarda o oyuncu topun başına geçer.`
  },
  {
    id: 'transfer-buy',
    label: 'Oyuncu nasıl alırım?',
    icon: '💰',
    q: 'Oyuncu nasıl transfer ederim?',
    category: 'Transfer',
    keywords: ['transfer', 'oyuncu al', 'satın al', 'pazarlık'],
    answer: `**💰 Transfer Pazarı - Detaylı Rehber**\n\n**Transfer sekmesine git → Satın Al modu**\n• Filtre: KL/STP/SB/OS/FW veya Tümü\n• Her kartta OVR, potansiyel, maaş ve **yıldız rozeti** (Dünya/Milli/Genç) var.\n• Kartın köşe etiketi **forma geliri + tribün artışı + ün** etkisini gösterir.\n\n**Pazarlık sistemi (çok önemli!):**\n1. Oyuncuya tıkla → **"Pazarlık"** penceresi açılır.\n2. **Maaş (0.9x-1.25x), Sözleşme (1-5 yıl), Rol Sözü (İlk 11/Rotasyon/Yedek)** seç.\n   • Yıldız (OVR 78+) **İlk 11 ister** - yedek dersen ikna barı düşer.\n   • Gençler yedeğe razı, maaşla telafi edebilirsin.\n3. **İkna Barı** 68/100 üzerinde olmalı: Yetenek (Pazarlık), Ün, Scout seviyesi etkiler.\n4. **"Pazarlık Yap"** (3 hak) → başarı olursa fiyat %6-20 düşer, başarısızsa %4-9 artabilir!\n5. **"Karşılığı Al"** ile bitir - bütçe yeterliyse oyuncu yedek kulübesine gelir.\n\n**Yenileme:** '🔄 Yenile' scout seviyene göre maliyetlidir ve pazar kalitesi artar (Scout Ağı yeteneği +1.5 OVR).\n\n💡 **Taktik:** Pazarlıkta yüksek maaş verirsen indirim azalır. 3 hakkını ikna barını 68 üstüne çıkarıp kullan.`
  },
  {
    id: 'loan',
    label: 'Kiralama nasıl işler?',
    icon: '🔄',
    q: 'Kiralama sistemi nasıl işler?',
    category: 'Transfer',
    keywords: ['kiralama', 'kiralık', 'loan'],
    answer: `**🔄 Kiralama - Düşük Bütçeyle Yıldız Oynat**\n\n**Kiralık sekmesi:** Transfer → 🔄 Kiralık\n• Her kiralıkta **peşin bedel** (değerin %6-12'si) + **maaş payın %35-100** + **satın alma opsiyonu** yazar.\n• Not kısmında hikâye: "Büyük kulüpte yedek kalan dünya yıldızı fırsat!".\n\n**Nasıl kiralanır:**\n1. Bütçen peşin bedele yetiyorsa **"Kirala"** de → oyuncu yedeğe gelir, sözleşme sezon sonuna kadar.\n2. Haftalık maaşın sadece belirtilen yüzdesini ödersin (karşı kulüp kalanını öder).\n\n**Opsiyon:** Ofis → Kiralık Gelenler'den **"Opsiyonu Kullan"** (değerin ~1.15-1.45 katı) ile kalıcı yapabilirsin - sezon içinde tek tık!\n\n**Kiralığa Gönder (para + gelişim):**\n• Kadro → oyuncu detay → "Kiralığa Gönder" → kulüp teklifleri (peşin + maaşın %40-100'ünü öderler).\n• Kiralıkta her ~6 haftada **+1 OVR** gelişir ve moralli döner.\n• Hafta 15'te opsiyon hatırlatması gelir. Sezon sonu otomatik dönerler/ayrılırlar.\n\n💡 **Fırsat:** 74 bilindik yıldız kiralıkta da çıkabilir - düşük bütçeyle şampiyonluk yolu!`
  },
  {
    id: 'contract',
    label: 'Sözleşme yenileme?',
    icon: '📝',
    q: 'Sözleşme nasıl yenilenir?',
    category: 'Ofis',
    keywords: ['sözleşme', 'kontrat', 'yenile'],
    answer: `**📝 Sözleşme Yenileme**\n\n**Nerede:** Ofis → Sözleşmeler veya Kadro → oyuncu detay → "Sözleşme Yenile"\n\n**Akış:**\n1. **Süre seç:** 1/2/3/4 yıl butonları.\n2. **İmza parası** ve **yeni maaş** otomatik hesaplanır (Pazarlık yeteneği indirimi uygular).\n3. Bütçen yetiyorsa **"Yenile"** de → sözleşme uzar, moral +12, gitme isteği silinir, kimya +1.\n\n**Neden önemli:** Sözleşmesi 0'a inen oyuncu sezon sonunda **bedelsiz ayrılır!** Ofis'te "Son Yıl" ve "SÖZLEŞME BİTTİ" rozetlerine dikkat et. Her 6 haftada bir uyarı gelir.\n\n**Mutsuz oyuncular:** Moral ≤35 veya 'wantsOut' ise imza parası %40 artar. Moral kazanmak için maç kazan, takım aktivitesine katıl.\n\n💡 **Strateji:** Potansiyeli yüksek gençleri erken 3-4 yıl uzat - sonra maliyet katlanır.`
  },
  {
    id: 'captain',
    label: 'Kaptan & duran top?',
    icon: '🎽',
    q: 'Kaptan ve duran toplar nasıl atanır?',
    category: 'Ofis',
    keywords: ['kaptan', 'duran top', 'penaltı', 'frikik', 'korner'],
    answer: `**🎽 Kaptanlık & Duran Toplar**\n\n**Ofis → Kaptanlık:**\n• Listeden oyuncuya tıkla → **Kaptan Yap**. Kaptan sahadaysa maçta **+2 hücum/+2 savunma** ve moral bonusu verir. Kaptana moral +8 ve kimya +2 gelir.\n• Aynı yerden görevden alabilirsin.\n\n**Ofis → Duran Top Görevleri:**\n• **Penaltı / Frikik / Korner** için ayrı ayrı oyuncu seç.\n• Seçtiğin oyuncu maç içi **penaltı/frikik mini oyununda** topun başına geçer - isabet şansın artar.\n\n**Kadro detaydan da kaptan yapılabilir.**\n\n💡 **Tavsiye:** Penaltıcın yüksek OVR + yüksek moralli olsun. Frikikçin OS/FW olsun.`
  },
  {
    id: 'tactics',
    label: 'Taktik & formasyon?',
    icon: '📋',
    q: 'En iyi taktik nedir?',
    category: 'Taktik',
    keywords: ['taktik', 'formasyon', 'pressing', 'tempo', 'stil'],
    answer: `**📋 Taktik Rehberi**\n\n**Taktik sekmesi 4 katman:**\n• **Formasyon:** 4-3-3 (saldırı), 4-4-2 (dengeli), 3-5-2 (orta saha), 5-3-2 (savunma), 4-2-3-1 (modern). Değiştirince sahadaki noktalar otomatik yerleşir.\n• **Oyun Stili:** Dengeli / Hücum (+12 hücum -8 savunma) / Savunma (+12 savunma) / Topa Sahip Ol (+5/+5)\n• **Baskı:** Düşük (enerji tasarrufu) / Orta / Yüksek (+5 hücum -2 savunma ama yorulursun)\n• **Tempo:** Yavaş (kontrol) / Normal / Hızlı (+7 hücum kontra)\n\n**Etkileri:** Ev sahibi +3.5, deplasman -2, analist +3, kaptan +2, Taktik Zekâsı yeteneği +1.5/dal, hayat formu 0-1.6 bonus.\n\n**Ne zaman ne:**\n• Güçlü rakibe karşı **Savunma + Düşük baskı + Yavaş tempo**\n• Zayıf rakibe **Hücum + Yüksek baskı + Hızlı tempo**\n• Derbi, kupa finali → **Dengeli + Topa Sahip Ol**\n\n💡 **İpucu:** Taktik özeti üstte canlı görünür. Maçtan önce rakibin OVR farkına bakıp ayarla.`
  },
  {
    id: 'career',
    label: 'Seviye & yetenek?',
    icon: '🧠',
    q: 'Seviye ve yetenek puanları nasıl?',
    category: 'Kariyer',
    keywords: ['seviye', 'yetenek', 'skill', 'xp', 'görev'],
    answer: `**🧠 Kariyer, Seviye ve Yetenek Ağacı**\n\n**XP nereden gelir:** galibiyet 25, beraberlik 10, gol +1, görevler, günlük giriş 25.\n\n**Seviye sistemi:** Kariyer sekmesinde bar dolar, seviye atlayınca **+1 yetenek puanı**. Toplam 40 puanla ağaç biter.\n\n**8 yetenek (her biri max 5):**\n• **Taktik Zekâsı** maç gücü +1.5/dal\n• **Motivasyon** galibiyet morali ↑\n• **Kondisyon** yorgunluk ↓, toparlanma ↑\n• **Pazarlıkçı** alış -%3 / satış +%2\n• **Scout Ağı** pazar kalitesi +1.5 OVR, yenileme ucuz\n• **Genç Gelişimi** +%3\n• **Sağlık Ekibi** sakatlık -%6, iyileşme hızı +\n• **Medya** taraftar +0.5, sponsor +%4\n\n**Görevler:** Haftalık (3, 5 haftada yenilenir), Sezonluk (3), Kariyer (4 kalıcı). Kenar panelde ve Kariyer'de takip edilir. Tamamlayınca nakit+XP+jeton.\n\n💡 **Öneri:** Erken oyunda Scout + Pazarlık, sonra Taktik + Kondisyon.`
  },
  {
    id: 'stadium',
    label: 'Stadyumu büyütme?',
    icon: '🏟️',
    q: 'Stadyumu nasıl büyütürüm?',
    category: 'Stadyum',
    keywords: ['stadyum', 'kapasite', 'bilet', 'tribün', 'çatı'],
    answer: `**🏟️ Stadyum Stüdyosu**\n\n**3D görüntüleyici:** sürükle=döndür, tekerlek=yakınlaştır, çift tık=sıfırla, sinematik mod, gece/gündüz.\n\n**Büyütme:**\n• **Seviye yükseltmesi** (+5.000, tesislerle aynı mantık)\n• **Koltuk paketleri:** +1.000 / +2.500 / +5.000 / +10.000 (90.000'e kadar). Tribün satırları 3D'de gözle görülür büyür!\n\n**Özelleştirme:** 6 ücretsiz koltuk rengi + 8 satın alınabilir, aksan rengi, 4 çatı (saçak/tam/cam), 4 tribün (klasik/dik/çift katlı/kase), 3 çim deseni, bayraklar, çimde logo, VIP loca, floodlights.\n\n**Ekonomi:**\n• **Bilet fiyatı:** Ucuz/NORMAL/Pahalı/Lüks (demandFactor). Ucuz doldurur (büfe geliri + moral), pahalı birim geliri artırır - **en kârlı genelde ortada!** Testte 17k'da Pahalı $865K.\n• **Büfe:** $12-18/seyirci, VIP +%12, yıldızlar forma sattırır.\n• **Çatı:** yağmur/kar kaybını azaltır.\n\n💡 **Strateji:** Önce kapasite, sonra çatı, sonra bilet optimizasyonu.`
  },
  {
    id: 'life',
    label: 'Hayat modu nedir?',
    icon: '🚶',
    q: 'Hayat modu nasıl oynanır?',
    category: 'Hayat',
    keywords: ['hayat', 'enerji', 'form', 'keyif', 'ün', 'aktivite'],
    answer: `**🚶 Menajerin Hayatı (Haftada 4 Hak)**\n\n**Statlar 0-100:** ⚡ Enerji, 💪 Form, 😄 Keyif, ⭐ Ün\n• Form limiti spor salonu üyeliğiyle 60→100, keyif limiti ev konforuyla artar.\n• **Yorgunluk:** Enerji <30 ise aktivite etkileri **yarıya iner** - dinlenmeyi planla!\n\n**Aktiviteler (haftalık limitli):**\n• **Spor:** koşu/bisiklet/ağırlık (Form ↑, Enerji ↓) spor üyeliği $300K gerekir\n• **Ev:** konsol oyun (+Keyif, TV'de maç yanar) $150K, dinlenme 💤 (Enerji ↑)\n• **Şehir:** park yürüyüşü, taraftarla buluşma, akşam yemeği (Ün/Keyif)\n• **Tatil:** sahil (2 hak yer, Keyif/Ün büyük)\n• **Basın:** toplantı (Ün ↑)\n\n**Oyuna etkisi:**\n• Form → maç hücum/savunma +0-1.6 ve oyuncuların haftalık enerjisi +0-4\n• Keyif ≥75 → takım morali +1/hafta\n• Enerji <20 → moral -1/hafta\n• Ün → sponsor geliri x1.00-1.30 ve pazarlık +%0-20\n\n💡 **Rutin:** Pazartesi spor, ortada şehir, haftasonu dinlenme - denge kur.`
  },
  {
    id: 'money',
    label: 'Hızlı para kazanma?',
    icon: '💸',
    q: 'Para nasıl kazanılır?',
    category: 'Ekonomi',
    keywords: ['para', 'bütçe', 'kazanç', 'ekonomi', 'gelir'],
    answer: `**💸 Para Kazanma Yolları (En Hızlıdan Yavaşa)**\n\n**1. Maç gelirleri (her maç):**\n   • Bilet: kapasite + doluluk + bilet fiyatı. Yıldızlar doldurur!\n   • Büfe: her seyirci $12-18 harcar, VIP +%12\n   • Galibiyet primi $450K, beraberlik $150K\n\n**2. Yıldız satışı:** Dünya yıldızı %22 forma bonusu ile kendini amorti eder. Al → forma geliri → sat.\n\n**3. Kiralama:** Kiralığa gönder → peşin + maaş tasarrufu, kiralık alıp opsiyonla ucuza yıldız kap.\n\n**4. Mağazalar:** Merch sekmesinden şehir/mağaza tipi seç (Flagship en kârlı). Nüfus + lig sırası + yıldız OVR etkiler. 5 haftada bir maaşla birlikte ödenir.\n\n**5. Sponsorluk:** Sidebar 🤝 - 3-8 hafta, $/hafta. Medya yeteneği ve Ün geliri artırır.\n\n**6. Sezon ödülü:** Şampiyon $3M, ilk 3 $1.5M, ilk 5 $700K.\n\n**7. Günlük giriş:** 7 gün serisi $40K→$400K + jeton.\n\n💡 **Döngü:** Maç kazan → taraftar ↑ → bilet+forma ↑ → daha iyi oyuncu → tekrar kazan.`
  },
  {
    id: 'training',
    label: 'Antrenman & sakatlık?',
    icon: '🏋️',
    q: 'Antrenman ve sakatlık nasıl?',
    category: 'Antrenman',
    keywords: ['antrenman', 'sakatlık', 'fitness', 'health'],
    answer: `**🏋️ Antrenman & Sağlık**\n\n**Haftalık Odak (Ofis):** Dengeli/Hücum/Savunma/Kondisyon/Gençler - genç rozwoju ve sakatlık riskini etkiler. Dengeli en güvenli.\n\n**Ekstra Antrenman (Antrenman sekmesi):** oyuncu başına $25K, yaş ve tesis seviyesi kadar OVR artışı şansı. Fitness odağı riski %2, diğerleri %5 sakatlık riski!\n\n**Sakatlık:** Maç içi 1-3 hafta, otomatik değişiklik devreye girer. Sağlık personeli ve Sağlık Ekibi yeteneği iyileşmeyi hızlandırır (her hafta -1, yetenekle %6 daha hızlı).\n\n**Cezalar:** 3 sarı=1 maç, kırmızı=2 maç. Sahada 10 kişi kalırsın, OVR -6 ceza!\n\n💡 **İpucu:** 68' ve 83'te yorgunluk anonsu gelirse değiştir. Kondisyon odağı + sağlık tesisi ile sezonu sorunsuz atlat.`
  },
  {
    id: 'social',
    label: 'Sosyal medya nasıl?',
    icon: '💬',
    q: 'Sosyal medya nasıl kullanılır?',
    category: 'Sosyal',
    keywords: ['sosyal', 'post', 'feed'],
    answer: `**💬 Sosyal (FutbolX)**\n\n**Post at:** Sosyal sekmesi üstte metin + görsel ekle → Paylaş. İçinde "transfer" veya "maç/galibiyet" geçerse +ün ve +taraftar bonusu alırsın, doğru hashtag otomatik eklenir (#Transfer, #MaçGünü).\n\n**Etkileşim:** Diğer postları beğen, yorum yap - taraftar mutluluğu +0.4.\n\n**Bot akışı:** Maç sonucu, transfer dedikoduları, haftalık olaylar otomatik düşer. Hafta ilerledikçe yenilenir.\n\n💡 **Strateji:** Galibiyet sonrası post at → beğeni ve ün patlar, sponsor pazarlığında işine yarar!`
  },
  {
    id: 'facilities',
    label: 'Tesisler ne işe yarar?',
    icon: '🏗️',
    q: 'Tesisler ve personel nasıl?',
    category: 'Tesisler',
    keywords: ['tesis', 'stadyum', 'antrenman', 'akademi', 'sağlık', 'personel'],
    answer: `**🏗️ Tesisler & Personel**\n\n**Tesis seviyeleri (1-5):**\n• **Stadyum:** +5.000 kapasite, taraftar +5\n• **Antrenman:** tüm oyunculara +1 OVR\n• **Akademi:** genç keşif ve gelişim şansı ↑\n• **Sağlık:** sakatlık -1 hafta veya enerji +10\n\n**Personel ($):** Antrenör (+1 OVR tüm takıma), Scout (+1 scout lvl), Fizyoterapist, Analist (+3 maç gücü).\n\n**Genç keşfi:** Akademi → "Yetenek Ara" ($50K) → 16-18 yaş, 55-70 OVR, potansiyel gizli, A takıma yükseltilebilir.\n\n💡 **Sıra:** Erken Scout+Antrenman, ortada Sağlık, sonra Akademi.`
  },
];

function findAnswer(input: string): { answer: string; related: QuickQ[] } {
  const lower = input.toLowerCase();
  // skorla
  let best: QuickQ | null = null;
  let bestScore = 0;
  for (const q of QUICK_QUESTIONS) {
    let score = 0;
    for (const kw of q.keywords) if (lower.includes(kw.toLowerCase())) score += 3;
    if (lower.includes(q.label.toLowerCase().slice(0, 5))) score += 2;
    if (q.q.toLowerCase().split(' ').some(w => lower.includes(w) && w.length > 3)) score += 1;
    // tam eşleşme bonusu
    if (lower.trim() === q.q.toLowerCase()) score += 10;
    if (score > bestScore) { bestScore = score; best = q; }
  }
  if (best && bestScore >= 2) {
    const related = QUICK_QUESTIONS.filter(x => x.category === best!.category && x.id !== best!.id).slice(0, 3);
    return { answer: best.answer, related };
  }
  // fallback - genel yardımcı
  const fallback = `**🤖 Asistan - Sana nasıl yardım edebilirim?**\n\nSorunu tam eşleştiremedim ama en yakın konular:\n\n• **Maç:** "Maça nasıl çıkarım?"\n• **Transfer:** "Oyuncu nasıl alırım?" / "Kiralama nasıl?"\n• **Ekonomi:** "Para nasıl kazanılır?"\n• **Taktik:** "En iyi taktik nedir?"\n• **Hayat/Stadyum:** "Hayat modu nedir?" / "Stadyumu nasıl büyütürüm?"\n\n**Ne yazdın:** _"${input}"_\n\nAşağıdaki **hazır sorulardan birine tıkla** veya daha net yaz: örneğin "sözleşme yenileme", "kiralık opsiyon", "bilet fiyatı", "yetenek puanı" gibi anahtar kelime kullan.`;
  return { answer: fallback, related: QUICK_QUESTIONS.slice(0, 3) };
}

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: `**Merhaba Teknik Direktör! 👋 Ben Manager Pro Asistanın**\n\nSana **neleri nasıl yapacağını** adım adım, detaylıca anlatırım. Hiçbir yeri kapatmam - bu pencereyi sürükleyebilir, küçültebilirsin.\n\n**Aşağıdan hazır sorulardan seç** veya serbestçe yaz. Örneğin:\n• "Kiralama nasıl işler?"\n• "Sözleşme yenileme nerede?"\n• "En hızlı para nasıl kazanılır?"`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(QUICK_QUESTIONS.map(q => q.category)))], []);

  const filteredQuick = useMemo(() => {
    if (selectedCategory === 'Tümü') return QUICK_QUESTIONS;
    return QUICK_QUESTIONS.filter(q => q.category === selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const pushMessage = (role: 'user' | 'assistant', text: string) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random().toString(), role, text, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }]);
  };

  const handleAsk = (q: string) => {
    if (!q.trim()) return;
    const userText = q.trim().slice(0, 300);
    pushMessage('user', userText);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const { answer } = findAnswer(userText);
      setIsTyping(false);
      pushMessage('assistant', answer);
    }, 650 + Math.random() * 600);
  };

  const handleQuickClick = (qq: QuickQ) => {
    pushMessage('user', qq.q);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      pushMessage('assistant', qq.answer);
    }, 500);
  };

  return (
    <>
      {/* FAB - hiçbir yeri kapatmayan, haber ticker'ının üstünde */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`fixed z-[60] right-4 bottom-[3.25rem] lg:bottom-12 w-14 h-14 rounded-full shadow-xl border flex items-center justify-center text-xl transition-all duration-300 ${isOpen ? 'bg-slate-800 border-slate-600 text-slate-200 scale-90' : 'bg-gradient-to-br from-emerald-500 via-cyan-500 to-violet-500 border-white/20 text-white hover:scale-105 hover:shadow-emerald-500/30 animate-pulse-glow'}`}
        aria-label="AI Asistanı aç/kapat"
        title={isOpen ? 'Kapat (Esc)' : 'AI Asistan - sor & öğren'}
      >
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>{isOpen ? '✕' : '🤖'}</span>
        {!isOpen && <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full animate-badge-pop border border-white">AI</span>}
      </button>

      {/* Panel - hiçbir yeri tam kapatmayan, köşede yüzen pencere */}
      <div className={`fixed z-[61] right-2 sm:right-4 bottom-[4.5rem] lg:bottom-14 w-[calc(100%-1rem)] sm:w-[380px] lg:w-[400px] h-[68vh] sm:h-[520px] max-h-[640px] bg-slate-900/95 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95 pointer-events-none'}`}>
        {/* Header - gradient + shimmer */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-cyan-600 to-violet-600 p-3 flex items-center justify-between flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.08] via-transparent to-white/[0.06] pointer-events-none" />
          <div className="flex items-center gap-2.5 relative">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center text-lg">🤖</div>
            <div>
              <div className="text-white font-black text-sm leading-none flex items-center gap-1.5">Menajer Asistanı <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded-full font-bold">AI • CANLI</span></div>
              <div className="text-white/80 text-[11px]">Hazır sorular + serbest sor • hiçbir yeri kapatmaz</div>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors" title="Kapat (Esc)">✕</button>
          </div>
        </div>

        {/* Kategori filtre */}
        <div className="flex gap-1.5 p-2 overflow-x-auto custom-scroll flex-shrink-0 bg-slate-800/50 border-b border-slate-700/40">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-emerald-500 text-white shadow' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Hazır sorular - yatay chips */}
        <div className="p-2 bg-slate-800/30 border-b border-slate-700/30 flex-shrink-0">
          <div className="text-[10px] font-black tracking-widest text-emerald-300 mb-1.5 flex items-center gap-1">⚡ HAZIR SORULAR <span className="text-slate-500 font-normal">• tıkla, detaylı cevap al</span></div>
          <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1 snap-x">
            {filteredQuick.map(qq => (
              <button
                key={qq.id}
                onClick={() => handleQuickClick(qq)}
                className="snap-start flex-shrink-0 bg-slate-700/70 hover:bg-slate-700 border border-slate-600/40 hover:border-emerald-500/40 text-white text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span>{qq.icon}</span><span className="font-medium whitespace-nowrap">{qq.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mesajlar */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scroll p-3 space-y-3 bg-gradient-to-b from-slate-900/50 to-slate-900">
          {messages.map(m => (
            <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">🤖</div>}
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-md ${m.role === 'user' ? 'bg-gradient-to-br from-emerald-600 to-cyan-600 text-white rounded-br-md' : 'bg-slate-800 border border-slate-700/50 text-slate-100 rounded-bl-md'}`}>
                <div className="whitespace-pre-wrap break-words text-[13px]" dangerouslySetInnerHTML={{ __html: formatAnswer(m.text) }} />
                <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/70 text-right' : 'text-slate-500'}`}>{m.time}</div>
              </div>
              {m.role === 'user' && <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">👤</div>}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs">🤖</div>
              <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-2 bg-slate-800/80 backdrop-blur border-t border-slate-700/50 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(input); } }}
              placeholder="Serbest sor: örn. 'bilet fiyatı nasıl ayarlanır?'"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              maxLength={300}
            />
            <button
              onClick={() => handleAsk(input)}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex-shrink-0"
              title="Gönder (Enter)"
            >
              ➤
            </button>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
            <span>💡 İpucu: anahtar kelime yazman yeterli - "transfer", "sözleşme", "taktik" gibi</span>
            <span className="hidden sm:inline">Enter ↵</span>
          </div>
        </div>
      </div>

    </>
  );
};

function formatAnswer(text: string): string {
  // Basit markdown: **bold**, satır başı • ve başlıklar
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-bold">$1</b>')
    .replace(/\n• /g, '<br/>• ')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  // emoji başlıkları vurgula
  html = html.replace(/(⚽|💰|🔄|📝|🎽|📋|🧠|🏟️|🚶|💸|🏋️|💬|🏗️|🤖)(.*?)(<br\/>)/g, '<span class="text-emerald-300 font-bold">$1$2</span>$3');
  return html;
}

export default AiAssistant;
