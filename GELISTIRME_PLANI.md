# Manager Pro 2026 — Geliştirme Planı ve Oyun Analizi

> Tarih: 16 Eylül 2026 • Sürüm: **3.1.0 (Kariyer İlerlemesi)**
> v3.0: Kariyer Sistemi (maç deneyimi + yönetim) → v3.1: **oyuncuyu oyunda tutan ilerleme katmanı**

Bu doküman; mevcut oyunun **tespitini (audit)**, kapatılan eksikleri ve sıradaki
geliştirme adımlarını tek yerde toplar. Amaç: oyunu "simülasyon"dan **gerçek bir
menajerlik kariyerine** taşımak.

---

## 1. Yapılan Tespit (Audit) — En Kritik Sorunlar

Oyunun mevcut kod yapısı incelendiğinde şu **ölü (dead) mekanikler** ve eksikler tespit edildi:

| # | Tespit | Etki | Durum |
|---|--------|------|-------|
| 1 | `isHome` her zaman `true` — deplasman maçı yok | Lig hissi zedeleniyor, gelir tek düze | ✅ Düzeltildi |
| 2 | `yellowCards` / `redCard` alanları tanımlı ama **hiç kullanılmıyor** | Kartlar sadece yazı, ceza yok | ✅ Düzeltildi |
| 3 | Maç içi sakatlık mesajı çıkıyor ama **oyuncu sakatlanmıyor** | Sakatlık sistemi işlevsiz | ✅ Düzeltildi |
| 4 | `contract` alanı var, sözleşme yenileme ekranı yok | Oyuncular bedelsiz kaybediliyor / mekanik anlamsız | ✅ Düzeltildi |
| 5 | Kupa maçı berabere biterse direkt **eleniyorsun** | Uzatma/penaltı yok | ✅ Düzeltildi |
| 6 | `boardConfidence` düşüyor ama **hiçbir sonucu yok** | Baskı hissi yok | ✅ Düzeltildi (uyarı + kovulma) |
| 7 | Maç motoru skorlarının dışında oyuncu **performans geri bildirimi** yok | "Kim iyi oynadı?" belirsiz | ✅ Reyting + MOTM eklendi |
| 8 | Kupa haftalarında lig tablosu ve diğer maçlar da simüle ediliyordu | Lig puanları şişiyordu (bug) | ✅ Düzeltildi |
| 9 | Hava durumu, seyirci, bilet geliri yok | Ekonomi düz ve sıkıcı | ✅ Eklendi |
| 10 | Tek kayıt slotu, yedekleme yok | Kayıp riski | ✅ 3 slot + .json yedek |
| 11 | Ses yok | Geri bildirim zayıf | ✅ WebAudio efektleri |
| 12 | `alert()` ile sezon sonu bildirimleri | Akış bozuluyor | ✅ Gazete raporu ekranı |
| 13 | Antrenman sistemi tek tık, haftalık strateji yok | Derinlik eksik | ✅ Haftalık odak eklendi |
| 14 | Rakip kulüpler oyuncularına teklif vermiyor | Transfer tek yönlü | ✅ Gelen teklifler eklendi |

---

## 2. Bu Sürümde Eklenenler (v3.0.0)

### Maç Deneyimi
- **İç saha / deplasman fikstürü**: 18 haftalık çift devreli lig (circle method ile gerçek program), 9 iç + 9 dış saha.
- **Ev sahibi avantajı** (+3.5 saldırı/savunma) ve **deplasman cezası** (-2).
- **Hava durumu sistemi (7 tip)**: Güneşli, parçalı bulutlu, yağmur, fırtına, kar, rüzgâr, sis. Gol oranı ve sakatlık riskini çarpan olarak etkiler; seyirci sayısını da değiştirir.
- **Kart & ceza sistemi**: Sarı kart birikir, 3 sarı = 1 maç ceza; kırmızı = 2 maç ceza. Maçta kırmızı gören oyuncu **sahadan çıkar (10 kişi kalırsın)**. Maç öncesi cezalı/sakat oyuncular otomatik olarak yedekle değiştirilir.
- **Gerçek sakatlıklar**: Maç içinde sakatlanan oyuncu 1-3 hafta yok, otomatik oyuncu değişikliği devreye girer.
- **Oyuncu reytingleri + maçın adamı**: 3.0-10.0 arası puanlama; MOTM ekstra moral/itibar kazandırır, form takip edilir.
- **Devre arası takım konuşması**: Öv / fırça at / sakin taktik — her birinin farklı risk-ödülü var, %20 ihtimalle tutmaz.
- **Kupa'da uzatma + interaktif penaltı atışları**: Şut yönü ve kaleci köşesi seçimi, ani ölüm.
- **Canlı maç istatistikleri**: Top hakimiyeti, şut, korner, faul, oyuncu değişikliği.

### Kariyer & Yönetim
- **🏢 Ofis sekmesi** (yeni): gelen transfer teklifleri, sözleşme yenileme, kaptanlık, duran top görevleri, haftalık antrenman odağı, yönetim kurulu mesajları.
- **Rakip teklifleri**: Başka kulüpler oyuncularına teklif yapar (2 hafta geçerli, kabul/red); reddedince moral düşer.
- **Sözleşme yenileme**: İmza parası + maaş artışı; süresi biten oyuncu sezon sonunda bedelsiz ayrılır.
- **Kaptanlık ve duran top görevleri**: Kaptan sahada +2/+2 bonus, penaltı/frikik görevlisi mini oyunlarda topun başına geçer.
- **Haftalık antrenman odağı**: Dengeli / Hücum / Savunma / Kondisyon / Gençler — genç gelişimini ve sakatlık riskini etkiler.
- **Yönetim güveni sistemi**: Düşük güvende uyarılar, sıfırda **kovulma** ve kariyer özeti ekranı.
- **Emeklilik/yaşlanma dengesi**: Sezon sonu yaşlanma, sözleşme bitişi, altyapıdan takviye.
- **Ligin gol krallığı** (rakip oyuncular dahil) ve **fikstür/sonuç ekranı**.
- **Sezon sonu gazete raporu**: hedef tutuldu mu, ödül, ayrılanlar, en golcü oyuncu.

### Kalite & UX
- **3 kayıt slotu** + yedek indir (.json) / yedek yükle, ses aç-kapat.
- **WebAudio ses efektleri**: düdük, gol, yiyilen gol, kart, kurtarış, kazanma/kaybetme.
- **Maç öncesi taktik odası**: rakip raporu (G-B-M, gol istatistikleri, sıra), hava durumu etkileri, kadro uyarıları, form göstergesi.
- **Başarımlar genişletildi**: Dağıttık (5+ fark), Penaltı Kahramanı, Tam Kapasite, Yenilmez Sezon, Çifte Kupa.
- **Hata düzeltmeleri**: kupa haftası lig tablosu bozulması, `alert()` akışları, maç motorundaki çift zamanlayıcı/hız değişimi tutarsızlığı, sezon sonu stale state sorunu.

---

## 2b. v3.1.0 — Oyuncuyu Oyunda Tutan Katman (Retention)

Oyunun "bir kere oynanıp bırakılmasını" engelleyen, **her girişte bir sebep** yaratan sistemler:

### 🎯 Görev / Misyon Sistemi (12 farklı metrik)
| Tür | Süre | Ödül |
|-----|------|------|
| **Haftalık (3 görev)** | 5 hafta geçerli, sonra yenilenir | Nakit + XP + 1 mini oyun jetonu |
| **Sezonluk (3 görev)** | Sezon boyu | Büyük nakit + XP (+ bazıları yetenek puanı) |
| **Kariyer (4 görev)** | Kalıcı, sezonlar arası devam eder | Çok büyük nakit + XP + yetenek puanı |

Metrikler: galibiyet, gol, clean sheet, seyirci, mini oyun, maçın adamı, transfer, altyapı çıkışı, yenilmezlik serisi, penaltı zaferi, kupa, kasa. Görevler **kenar panelde anlık** takip edilir.

### 🧠 Menajer Seviyesi + 8 Dallı Beceri Ağacı
- XP kaynağı: galibiyet (25), beraberlik (10), gol başına +1, görev ödülleri, günlük giriş.
- Seviye atlayınca **1 yetenek puanı**; toplam 40 puanla tamamlanan ağaç.
- **Taktik Zekâsı** (maç gücü +1.5/dal), **Motivasyon** (galibiyet morali), **Kondisyon** (yorgunluk −, dönüş +), **Pazarlıkçı** (alış −%3 / satış +%2), **Scout Ağı** (pazar kalitesi +1.5 OVR ve daha ucuz liste yenileme), **Genç Gelişimi** (+%3), **Sağlık Ekibi** (sakatlık riski −%6, iyileşme hızı +), **Medya İlişkileri** (taraftar +0.5, sponsor geliri +%4).
- Her beceri maç motoruna / ekonomiye **gerçekten** bağlı (kozmetik değil).

### ⚽ Canlı 2D Maç Sahası
- Diziliş (kullanıcı alt kale, rakip üst), top **hücum yönünde hareket eder**, gol anında saha flaşı ve animasyon.
- Sahada anlık skor/dakika, top hakimiyeti barı ve **son 3 olay akışı**.
- Kırmızı kart gören oyuncu sahada görünmez; 10 kişi kaldığın görsel olarak belli olur.

### 🎁 Günlük Giriş Ödülü
- 7 günlük artan tablo ($40K → $400K + 3 jeton), seri bozulmazsa katlanır; günde bir defa.

### 🧠 "En İyi 11" Otomatik Seçim
- Form, enerji, OVR ve morale göre pozisyon uyumlu en iyi kadro — tek tık, kadro seçme derdine son.

---

## 3. Sıradaki Adımlar — Önceliklendirilmiş Yol Haritası

### 🔥 Yüksek Etki / Orta Emek (sıradaki "olmazsa olmaz" adayları)
0. **Başarımlar → Koleksiyon kitabı**: başarım kartları, rozet galerisi ve "yakında" görünümü (tamamlanmış ilerleme hissi).
0b. **Transfer müzakeresi diyalogu**: teklifini yükselt/geri çek, rakip kulübün sabrı, oyuncuyu ikna konuşması.
1. **Kiralama (loan) sistemi** — Gençleri kiraya ver, gelişim + maaş payı; rakipten kiralık oyuncu al.
2. **Oyuncu özellikleri (traits)** — "Frikik ustası", "Lider", "Cam adam", "Kart manyağı": maç motoruna kişisel çarpanlar.
3. **Seyirci/bilet yönetimi** — Bilet fiyatı belirleme, kampanya, kombine satışı; fan memnuniyeti-fiyat dengesi.
4. **Scout ağı** — Ülke/lig seçerek oyuncu arama, scout raporu doğruluğu (belirsiz potansiyel aralığı: 78-88 gibi).
5. **Basın & röportaj sistemi** — Maç öncesi/sonrası soru seçenekleri; taraftar, yönetim ve oyuncu morali üzerinde etki.
6. **Sakatlık tipleri** — Kas, burkulma, kırık; farklı iyileşme süreleri ve etkileri (formsuz dönüş).
7. **Gençlik ligi / A takım maçları** — Akademi oyuncuları gerçek maç oynayarak gelişsin.

### ⚙️ Orta Etki / Düşük Emek
8. **Kupa eşleşme kurası animasyonu** ve 2 maçlık yarı final/final (çift ayak) seçeneği.
9. **TV yayın anlaşması** — Sezon başı hak ihalesi; lig seviyesine göre gelir.
10. **Sponsor pazarlığı** — Teklifleri reddedip daha iyisini zorlama, performans bonusları.
11. **Kadro numaraları ve forma isimleri** — Detay hissi.
12. **Menajer istatistikleri/hall of fame** — Kariyer toplamı, rekorlar.
13. **Takım aktiviteleri çeşitliliği** — Bowling, kamp, derbi gezisi; kimyaya etkileri.
14. **Otomatik kadro önerisi** — "En iyi 11'i seç" butonu (form + enerji + rakip analizine göre).
15. **Uyarı merkezi** — Sözleşmesi biten, cezalı, formsuz oyuncular için tek ekranda özet (Ofis'te kısmen var).

### 🎨 Görsel / Uzun Vade
16. **2D maç izleme** — Topun sahada hareket ettiği basit top-down animasyon.
17. **Oyuncu kartları / portre üretimi** — CSS ile avatar veya emoji tabanlı portreler.
18. **Tema seçenekleri** (koyu/açık) ve renk paletleri.
19. **PWA desteği** — Manifest + service worker, telefona kurulabilir uygulama, offline oynama.
20. **Çoklu dil (i18n)** — Türkçe/İngilizce altyapısı.
21. **Kayıt bulut senkronizasyonu** — localStorage yerine opsiyonel dosya/hesap tabanlı kayıt.
22. **Mod desteği** — Takım/oyuncu isimlerini dışa aktarılan JSON ile değiştirme.

### 🧪 Denge & Test İşleri
23. **Sezon içi hikâye olayları**: yıldız oyuncunun sakatlık krizi, taraftar protestosu, başkan değişimi gibi kariyere özgü olay zincirleri.
24. **Ekonomi dengeleme**: bilet geliri / maaş / transfer fiyatları oranının uzun vadeli testi (5 sezon simülasyonu).
25. **Zorluk seviyesi derinleştirme**: Efsane'de rakiplerin transfer zekâsı artışı.
26. **Otomatik testler**: maç motoru ve ekonomi için birim testleri (örn. Vitest).

---

## 4. Teknik Notlar

- **v3.1 yeni dosyalar**: `src/utils/missions.ts`, `src/utils/progression.ts`, `src/components/tabs/CareerTab.tsx`, `src/components/LivePitch.tsx`, `src/components/DailyRewardModal.tsx`.
- **v3.0 yeni dosyalar**: `src/utils/fixture.ts`, `src/utils/lineup.ts`, `src/utils/sound.ts`, `src/utils/save.ts`, `src/utils/contract.ts`, `src/components/PreMatchScreen.tsx`, `src/components/GameOverScreen.tsx`, `src/components/PenaltyShootout.tsx`, `src/components/tabs/OfficeTab.tsx`.
- **Genişletilen tipler**: `GameState` içine `captainId`, `setPieceTakers`, `trainingFocus`, `leagueScorers`, `transferOffers`, `weather`, `soundOn`, `boardWarnings`, `careerOver`, `boardMessages`; `FixtureEntry` (isHome/week) ve `MatchReport`/`PlayerRating` eklendi.
- **Kayıt uyumluluğu**: Eski (2.x) kayıtlar `migrateState()` ile otomatik yeni şemaya taşınır (haftaların iç/dış sahası, kaptan, hava durumu vb. otomatik atanır).
- **Doğrulama**: `npx tsc --noEmit` temiz, `npm run build` başarılı; fikstür üretimi, seyirci/gelir hesabı, kayıt migrasyonu, görev/XP dengesi (30 maç → seviye 5) ve 20 ekranın tamamı render testinden geçirildi.

İyi şanslar, şampiyon! ⚽🏆
