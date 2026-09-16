# Manager Pro 2026 — Ultimate Edition (v4.0 Menajerin Hayatı)

Futbol menajerlik simülasyonu. Kadro, transfer, taktik, kupa, tesisler, mağazalar, yatırımlar ve mini-oyunlar — artık **kariyer sistemi, hava durumu, kart/ceza, sözleşmeler ve penaltı atışları** ile.

## Hızlı Başlatma (Windows)

1. [Node.js](https://nodejs.org) kurulu olsun (LTS önerilir).
2. `baslat.bat` dosyasına çift tıkla.
3. Tarayıcıda otomatik açılır: **http://localhost:5173**

## Hızlı Başlatma (Mac / Linux)

```bash
chmod +x start.sh
./start.sh
```

veya:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Komutlar

| Komut | Açıklama |
|--------|----------|
| `npm run dev` | Geliştirme sunucusu (localhost) |
| `npm run build` | Üretim derlemesi |
| `npm run preview` | Derlenmiş sürümü önizle |

## Özellikler

### Maç
- **İç saha / deplasman** fikstürü, ev sahibi avantajı ve **seyirci + bilet geliri**
- **Hava durumu** (güneş/yağmur/kar/fırtına/sis/rüzgâr) → gol ve sakatlık oranlarına etki
- **Canlı maç motoru** — 1x/2x/4x hız, top hakimiyeti, şut/korner/faul istatistikleri, atlama
- **Kart & ceza sistemi** — 3 sarı = 1 maç, kırmızı = 2 maç ceza; sahada 10 kişi kalabilirsin
- **Gerçek sakatlıklar** (1-3 hafta) ve zorunlu oyuncu değişikliği
- **Oyuncu reytingleri + maçın adamı (MOTM)** — form takibi ve moral etkisi
- **Devre arası takım konuşması** — öv / fırça at / sakin taktik
- **Kupa'da uzatma ve interaktif penaltı atışları**
- Oyun içi mini-oyunlar: penaltı, frikik, kaleci kurtarışı, otobüs, sabotaj, basın, sprint, taraftar

### 🚶 Menajerin Kendi Hayatı (v4.0)
- **Kişisel statlar** — ⚡ Enerji, 💪 Form, 😄 Keyif, ⭐ Ün + haftalık **4 boş zaman hakkı**
- **3D Spor Salonu** — üstünü değiştir, koşu bandı / bench press / kondisyon bisikleti seç; karakter gerçek zamanlı antrenman yapar
- **3D Ev** — konsol karşısında oyun oyna (TV'de maç yayını) ya da kanepede uzanıp dinlen (💤 animasyonu)
- **3D Şehir** — parkta yürüyüş, taraftarla buluşma, akşam yemeği; trafik akan arabalar, sokak lambaları, ağaçlar
- **3D Tatil** — sahil, palmiyeler, dalgalar ve güneş
- **3D Basın Toplantısı** — mikrofonlar, kameralar, flaş patlamaları
- **Oyuna gerçek etki** — Form → maç kenarı bonusu (hücum/savunma) ve oyuncuların haftalık toparlanması; Keyif → takım morali + pazarlık payı; Ün → sponsor geliri (×1.00-1.30)
- **Kişisel eşyalar** — 🎟️ spor salonu üyeliği, 🎮 konsol, 🛋️ ev konforu, 🚗 araba
- **Yorgunluk mekaniği** — enerji 30 altındayken aktivite etkileri yarıya iner

### 🏟️ 3D Stadyum Stüdyosu (v3.3)
- **3D stadyum görüntüleyici** — sürükle-döndür, yakınlaştır, çift tıkla sıfırla; gece/gündüz ve sinematik kamera modları
- **Özelleştirme** — koltuk rengi (ücretsiz palet + satın alınabilir özel renkler), aksan rengi, çatı tipi (saçak/tam/cam), tribün mimarisi (klasik/dik/çift katlı/kase), çim deseni, tribün bayrakları, çimde logo
- **Kapasite büyütme** — +1.000 / +2.500 / +5.000 / +10.000 koltuk paketleri; tribün satırları 3D olarak gözle görülür şekilde büyür (90.000'e kadar)
- **Bilet fiyat stratejisi** — ucuz/normal/pahalı/lüks; tribünde büfe harcaması ile gerçek talep eğrisi (en kârlı fiyat genelde ortada)
- **Çatı ve hava** — çatı kötü havada seyirci kaybını azaltır; VIP loca bilet gelirini %12 artırır
- **Maç öncesi stadyum turu** — iç saha maçlarından önce stadyumunu sinematik modda gez

### Kiralama & Yıldız Oyuncular (v3.2)
- **🔄 Kiralama sistemi** — kiralık liste (peşin bedel, maaş payı, satın alma opsiyonu), sezon sonu dönüş, erken iade ve geri çağırma
- **📤 Oyuncularını kiralığa gönder** — kulüp teklifleri arasından seç, maaşın bir kısmı dışarıdan karşılanır, oyuncu OVR gelişimiyle döner
- **🌍 74 bilindik futbolcu** — dünya yıldızları (Mbappé, Haaland, Yamal…), milli yıldızlar (Arda Güler, Kenan Yıldız, Hakan Çalhanoğlu…) ve genç yıldız adayları
- **⭐ Rakip kulüp yıldızları** — her takımın bir yıldızı var; maç öncesi raporda ve sahada karşına çıkar
- **💰 Yeni piyasa ekonomisi** — 80 OVR ≈ $6.7M, 90 OVR ≈ $18M, 95 OVR ≈ $29M; yaş ve yıldız sınıfı çarpanlarıyla

### İlerleme & Bağlılık (v3.1)
- **🎯 Görev sistemi** — haftalık (5 haftada yenilenen), sezonluk ve kariyer görevleri; nakit + XP + jeton + yetenek puanı
- **🧠 Menajer seviyesi ve 8 dallı beceri ağacı** — taktik, motivasyon, kondisyon, pazarlık, scout, genç gelişimi, sağlık, medya (hepsi oyuna gerçekten bağlı)
- **⚽ Canlı 2D maç sahası** — diziliş, top hareketi, gol animasyonu, son olay akışı
- **🎁 Günlük giriş ödülü** — 7 günlük artan seri tablosu
- **🧠 "En İyi 11" otomatik kadro seçimi** (form + enerji + OVR + moral)
- **🧠 Kariyer sekmesi** — seviye, beceriler, görevler ve kariyer kaydı; kenar panelde anlık görev takibi

### Kariyer & Yönetim
- **🏢 Ofis sekmesi**: transfer teklifleri, sözleşme yenileme, kaptanlık, duran top görevleri, antrenman odağı, yönetim mesajları
- **Rakip kulüplerden gelen transfer teklifleri** (kabul/red, 2 hafta geçerli)
- **Sözleşme sistemi** — süresi biten oyuncular bedelsiz ayrılır
- **Haftalık antrenman odağı** ve genç oyuncu gelişimi
- **Yönetim güveni** — uyarılar ve kovulma (kariyer sonu ekranı)
- **Sezon sonu gazete raporu**, lig/üst lig yükselme, kupa, gol krallığı
- **Başarımlar** (23 adet) — kariyer rozetleri ve ödüller
- **3 kayıt slotu** + yedek indir/yükle (.json)
- **Ses efektleri** (WebAudio) ve aç/kapat
- Tutorial, 4 zorluk seviyesi, güncelleme günlüğü

## Kontroller

- Sol menüden **MAÇA ÇIK** → **maç öncesi taktik odası** (rakip raporu, hava durumu, kadro uyarıları)
- Üst sekmeler: Ofis, Kariyer, **Hayat**, Stadyum, Kadro, Transfer, Taktik, Antrenman, Lig, Kupa, Tesisler, Dükkan, Formalar, Yatırım, Geçmiş
- Maç içinde: hız 1x/2x/4x, 🔄 Değişiklik (5 hak), ⏭️ Atla
- 💾 menüsünden kayıt slotları ve yedekleme; 🔊 ile sesi kapat

Geliştirme yol haritası ve detaylı analiz: [`GELISTIRME_PLANI.md`](./GELISTIRME_PLANI.md)

İyi şanslar, şampiyon! ⚽🏆
