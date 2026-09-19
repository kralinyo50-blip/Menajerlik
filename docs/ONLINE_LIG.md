# Online Lig — kodla ortak sezon

## Oyuncular için

1. Herkes **aynı sunucunun oyun adresini** açar. Her oyuncu ayrı cihaz, tarayıcı profili veya gizli pencere kullanmalıdır. Aynı tarayıcı profilindeki sekmeler aynı menajer oturumunu kullanır.
2. Açılışta **Online Oyna** seç. İlk girişte online takımına isim ve amblem ver; ilk 11 ve yedeklerin oluşturulur. Ardından **Lig & Canlı Maç** bölümüne geç. Offline kariyer oluşturman/yüklemen gerekmez.
3. Bir oyuncu **Lig oluştur ve kod al** der. 8 karakterli senkronizasyon kodunu veya **Davet bağlantısı** düğmesinden aldığı adresi paylaşır.
4. Diğerleri kodu girerek **Lige bağlan** der. Davet bağlantısı kullanılırsa kod otomatik doldurulur. Aynı takım adı iki kez kullanılamaz; online takım adını giriş ekranında değiştirebilirsin.
5. En az iki menajer geldiğinde oda sahibi **Sezonu başlat** der. Lig 10 takıma tamamlanır; boş yerler bot olur. Sezon başladıktan sonra yeni üye alınmaz.
6. Online **Kadro & Taktik** bölümünde hazırlan, **Lig & Canlı Maç** bölümünde **Hazırım — haftayı oyna** de. Herkes hazır olunca sunucu o haftanın beş maçını **canlı** başlatır. Maçlar yaklaşık **5 dakika** sürer. SSE akışıyla dakika, skor, olaylar ve saha konumları **500 ms** aralıklarla gönderilir; tarayıcılar sonucu kendileri hesaplamaz. Bütün maçlar bitince sonuçlar tabloya bir kez işlenir.
7. 18 haftanın sonunda şampiyon belirlenir. Oda sahibi aynı kodla yeni sezon lobisi açabilir; bu işlem eski sezonun tablosunu ve sonuçlarını sıfırlar.

### Kod doğru ama “bulunamadı” diyor

Bu hatanın sebebi neredeyse her zaman **farklı sunucuda olmak**, yanlış kod yazmak değildir. Kod yalnız oluşturulduğu sunucuda geçerlidir.

1. **Davet bağlantısı kullanın.** Oda sahibi oyundaki **Davet bağlantısı** düğmesiyle link göndersin, katılanlar o linki tarayıcıda açsın. Link doğru sunucuya götürür ve kodu otomatik doldurur.
2. **Adresleri karşılaştırın.** Oyunun online ekranında yazan sunucu adresi herkeste birebir aynı olmalı. Biri `localhost`, diğeri başka bir adres açmışsa kodlar birbirinde görünmez.
3. **Tek sunucu çalıştırın.** Aynı Wi-Fi'de oynuyorsanız sunucuyu **yalnızca bir kişi** başlatır (`baslat.bat` / `./start.sh` / `npm run dev`); diğerleri o bilgisayarın ağ adresini açar (`http://SUNUCU_YEREL_IP:5173`). Herkes kendi bilgisayarında sunucu çalıştırırsa her kod yalnız kendi bilgisayarında görünür.
4. **Kodu kopyalayın, elle yazmayın.** Kodlar 8 karakterdir ve içinde `0`, `O`, `1`, `I` harfleri hiç kullanılmaz — bunlar birbirine karışır. Küçük/büyük harf fark etmez.
5. Farklı evlerde (farklı internetlerde) oynuyorsanız aynı Wi-Fi yöntemi çalışmaz; oyunun internete açık ortak bir adrese yayınlanması gerekir (aşağıda “İnternete yayınlama / üretim”).

### Neler ortak, neler yerel?

- **Ortak:** lig üyeleri, sezon/hafta, ev-deplasman fikstürü, hazır durumu, canlı dakika, skor, olaylar, top/oyuncu konumları, maç içi kadrolar, taktikler, molalar, puan tablosu ve oda yönetimi.
- **Yerel:** tek kişilik kariyer haftası, para, transfer pazarı, futbolcular, tesisler, kupa ve 3D maçlar. Online maçlar bunları ilerletmez veya ödül vermez. Online maçların kendi ortak 3D/2D gösterimi vardır; yerel kariyer maçından bağımsızdır.
- Online lige ayrı online takımınla girersin. Her hazır verdiğinde sağlıklı ve cezasız oyunculardan ilk 11 ve en fazla 12 yedek (isim, rol, OVR, enerji), diziliş ve oyun stili sunucuya gönderilir; bunlar o haftanın canlı simülasyonunda kullanılır. Eksikler uygun yedeklerle doldurulur; bir kaleci + 10 saha oyuncusu olmadan hazır verilemez. Takım kimliği sezon boyunca sabittir.
- Bu bir **arkadaşlar arası lig** modudur, hile korumalı dereceli oyun değildir. Skorlar sunucu tarafından hesaplanır, ancak online kadronun gücü yerel kayıttan alınır. Paylaşımlı transfer ekonomisi yoktur. Online 3D sahası, sunucunun ortak konumlarını görselleştiren ayrı ve hafif bir sahnedir; yerel kariyer maçındaki tüm mini oyunları/animasyonları kullanmaz.

### Canlı maçta yönetim

- Karşı karşıya gelen iki menajer aynı maç kimliğini, ev/deplasman yönünü, dakikayı, skoru, maç anlatımını ve kadroları görür. Ağ gecikmesi kadar küçük görüntü farkları olabilir; ayrı rastgele maçlar çalışmaz.
- 3D veya 2D gösterim aynı sunucu karelerini kullanır. 3D yalnızca ardışık konumlar arasında görsel geçiş yapar; kamera tercihi skor/saati etkilemez. WebGL çalışmıyorsa veya cihaz çok yavaşsa 2D'ye dönülür.
- **Maçı yönet** panelinden oyun stili ve `4-4-2 / 4-3-3 / 3-5-2` dizilişleri seçilir. Diğer kariyer dizilişleri başlangıçta `4-4-2` olarak aktarılır. Taktik olayları rakibin anlatımına da düşer.
- Maç başına **5 oyuncu değişikliği** vardır. Çıkan oyuncu tekrar giremez; kırmızı kartlı oyuncu değiştirilemez; kaleci yalnızca yedek kaleciyle değiştirilebilir. Değişiklikler sunucu tarafından doğrulanır, enerji/OVR etkisi sonraki maç hesaplarına girer.
- Menü açmak maçı durdurmaz. Her menajer **iki kez, en fazla 20 saniye** ortak mola alabilir. İki ekranda da saat ve saha durur; molayı alan devam ettirebilir, aksi halde süre sonunda otomatik sürer. Rakip başkasının molasını erken bitiremez.
- 45. dakikada **20 saniyelik ortak devre arası**, ardından otomatik ikinci yarı vardır. Her iki menajer de bu sırada taktik/değişiklik yapabilir.
- Maç sırasında atlama veya bağımsız hızlandırma yoktur. Bir karşılaşma erken biterse diğer lig maçları beklenir; hepsi bitmeden yeni haftaya hazır verilemez.
- Online maç içi komutları kariyerdeki oyuncu/enerji/taktik kaydını değiştirmez. Yeni haftaya hazır verirken ayrı kaydedilmiş online kadron yeniden alınır. Hazır durumu veya canlı maç varken maç öncesi hazırlık kilitlidir; maç içi değişiklikler canlı panelden yapılır.

### Modlar arasında geçiş

- **Offline Oyna** normal kariyeri açar; online oda, lig sekmesi veya canlı bağlantı içermez. Mevcut kariyer kayıtları kullanılmaya devam eder. Moddan ayrılırken kariyer kaydedilir; tamamlanmamış maçın sonucu yazılmaz.
- **Online Oyna** yalnızca online takım hazırlığı, ortak lig ve canlı maç ekranlarını açar. Offline maç butonu, ofis, mağaza, kupa ve kariyer ödülleri bu modda görünmez.
- **Mod seçimi** ile ana menüye dönmek **ligden ayrılmak değildir**. Canlı bağlantı kapanır, takım/oturum saklanır. Online moda dönünce aynı lige yeniden bağlanırsın. Canlı maç sürüyorsa sunucuda ilerlemeye devam eder; çıkış öncesi uyarı gösterilir. Uzun süre dönmezsen oda sahibinin 60 saniye sonrası bot devri kuralı geçerlidir.
- Önceki sürümden kayıtlı bir online oturumun varsa ve henüz ayrı online takım kaydın yoksa eski kariyer takımın **bir kez kopyalanır**. Kaynak offline kaydı değiştirilmez. Yeni oyuncularda iki takım sıfırdan ve ayrı oluşturulur.
- Davet bağlantısı (`?lig=KOD`) doğrudan online modu açar. Seçilen mod URL'de `?mode=online` veya `?mode=offline` olarak yer alır; yenileme ve tarayıcı geri/ileri tuşları desteklenir.

### Bağlantı, kayıt ve ayrılma

- Oturum anahtarı tarayıcının localStorage alanında, lig durumu sunucuda tutulur. Anahtarı paylaşma; davet bağlantısı yalnızca oda kodunu içerir.
- Online takım `ManagerPro2026_OnlineClub_v1` anahtarına otomatik kaydedilir; offline slotlara, yedeklere ve kurtarma kaydına yazılmaz. Online ekranda sayfa yenilenince ayrı online takım ve lig oturumu geri yüklenir. Sunucu kapalıysa otomatik yeniden bağlanma denenir; son tablo ve saha karesi salt okunur gösterilir. Bağlantı kopunca yerel saat ilerletilmez; bağlantı gelince güncel sunucu karesi alınır.
- Tarayıcı verilerini silmek veya başka cihaza geçmek mevcut takımın oturumunu taşımaz. Başlamış sezona kodla yeniden takım eklenemez.
- Sekmeyi kapatmak ligden ayrılmak değildir. Menajer tekrar bağlanabilir. Maç başlamadan bağlantısı kesilen menajer hazır değilse hafta bekler. **Başlamış maç**, oyuncu bağlantısı kopsa bile sunucuda sürer; geri dönen kişi güncel dakika/skor/kadroya bağlanır. Sunucunun kendisi yeniden başlatılırsa kaydedilen maç noktasından devam edilir; kapalı kaldığı süre futbol zamanı sayılmaz.
- **Ligden ayrıl** aktif sezonda takımı bot yönetimine bırakır; aynı oturum bu sezona geri dönemez. Lobide takım tamamen çıkarılır. Oda sahibi ayrılırsa yönetim kalan bir menajere aktarılır.
- 60 saniyeden fazla çevrimdışı kalan menajeri oda sahibi bota devredebilir. Oda sahibi çevrimdışıysa başka menajer **Yönetimi devral** diyebilir. Bot devri sezon için geri alınamaz.
- Bütün menajerler ayrılınca oda silinir. Son değişiklikten itibaren 30 gün işlem görmeyen oda süresi dolar.

## Sunucuyu çalıştırma

Node.js 22 LTS önerilir. Ek veritabanı veya ayrı bir WebSocket servisi gerekmez.

### Geliştirme / aynı yerel ağ

```bash
npm ci
npm run dev
```

Windows: `baslat.bat`. Mac/Linux: `./start.sh`.

Arayüz ve online API aynı portta çalışır (varsayılan **5173**). Aynı Wi-Fi üzerindeki arkadaşların sunucu bilgisayarının yerel ağ adresini açabilir: `http://SUNUCU_YEREL_IP:5173`. Güvenlik duvarında bu porta izin vermek gerekebilir. `localhost`, başka bir oyuncu için sunucu bilgisayarını ifade etmez.

### İnternete yayınlama / üretim

```bash
npm ci
npm run build
npm run serve
```

`npm run serve`, `dist/` arayüzünü ve `/api/online/*` uçlarını tek Node sunucusunda, `0.0.0.0:5173` üzerinde sunar. `PORT` ortam değişkeniyle port değiştirilebilir. Vite geliştirme sunucusunu halka açık üretim sunucusu olarak kullanma.

- Uygulamayı kalıcı diski olan bir Node.js sunucusunda **tek process / tek replika** olarak çalıştır. HTTPS sağlayan ters proxy arkasına koy ve orijinal `Host` başlığını koru; tarayıcı istekleri aynı origin'den gelmelidir.
- Ters proxy SSE yanıtlarını tamponlamamalıdır (`/api/online/rooms/*/stream` için örneğin Nginx `proxy_buffering off`). Uzun HTTP akışlarını destekleyen bir ortam gerekir; sunucu 5 saniyede bir canlılık mesajı gönderir. `X-Accel-Buffering: no` başlığı da gönderilir.
- Oyunculara herkesin erişebildiği **aynı HTTPS adresini** gönder. Arena canlı önizlemesi geçici deneme içindir, kalıcı yayın yerine geçmez.
- Varsayılan kayıt dosyası `data/online-rooms.json`. Başka bir kalıcı yol için `ONLINE_DATA_FILE` ortam değişkeni kullanılabilir. Dizine yazma izni gereklidir.
- Canlı kareler, RNG durumu, komut tekrar koruması ve maç kadroları dahil sunucu kayıtları geçici dosyaya yazılıp atomik yeniden adlandırma ile korunur. `data/` Git'e eklenmez. Dosyayı yedekle; ephemeral disk kullanan yayın ortamında sunucu yeniden kurulunca kayıt kaybolur.
- **Aynı kayıt dosyasına iki sunucu yazmamalı.** Dev/preview/serve işlemlerini aynı dosyayla eşzamanlı çalıştırma. Birden çok replika için işlem kilitlemeli paylaşımlı veritabanı gerekir.
- `dist/index.html` dosyasını tek başına açmak veya GitHub Pages gibi yalnız statik barındırma kullanmak online lig API'sini çalıştırmaz. Tek kişilik oyun yine kullanılabilir.
- Oturum anahtarları API yanıtlarında sadece ilgili oyuncuya verilir; sunucu dosyasında SHA-256 özetleri tutulur. Kod bir davet anahtarıdır, yalnız katılmasını istediğin kişilerle paylaş.

### Kontrol / test

```bash
npm run test:online
npm run test:modes
npm run test:match
npm run build
```

`GET /api/online/health` → `{"ok":true}`.

Online testleri: kodla katılma, yetkilendirme ve anahtar gizliliği, isim/kapasite kontrolü, 18 haftalık çift devre fikstür, eşzamanlı hazır istekleri, eski hafta isteklerinin reddi, tüm sezon puan hesabı, sunucu yeniden başlatma, ayrılma, bot devri, yönetim devralma, girdi sınırları, origin kontrolü ve bozuk kayıt dosyası davranışı. Ek canlı testleri: birebir maçta aynı saha kareleri, yetkisiz takım komutları, tekrarlanan komutların tek uygulanması, oyuncu değişikliği sınırı, ortak duraklatma/devre arası, maç ortası yeniden başlatma ve kimliği doğrulanmış SSE akışlarının eşitliği.

Manuel tarayıcı kontrolü: açılışta iki modu da dene; offline modda online API isteği olmadığını ve iki kaydın birbirine yazılmadığını kontrol et; iki ayrı profilde online takım oluştur; kodla katıl; hazır ver; iki ekranda aynı dakika/skor/sahayı gör; taktik ve oyuncu değişikliği yap; ortak molayı kontrol et; maç sürerken sayfayı yenile; birini çevrimdışı yapıp yeniden bağla; sezon sonunda yeni lobi aç.
