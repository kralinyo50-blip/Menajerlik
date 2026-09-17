// Game Constants

export const FIRST_NAMES = [
  // Türk
  "Mert", "Arda", "Can", "Hakan", "Emre", "Burak", "Cenk", "Enes", "Yusuf", 
  "Merih", "Ferdi", "İrfan", "Barış", "Kerem", "Semih", "Salih", "Yunus",
  "Ozan", "Cengiz", "Okay", "Dorukhan", "Taylan", "Berkan", "Halil", "Muhammed",
  "Ahmet", "Mehmet", "Mustafa", "Ali", "Ayhan", "Uğur", "Tolga", "Volkan", "Selçuk", "Gökhan", "Serdar", "Onur", "Emir", "Efe", "Eren", "Kaan", "Doruk", "Deniz", "Berk", "Batu", "Cem",
  // Avrupa & Dünya
  "James", "Lucas", "Mateo", "Leo", "Noah", "Liam", "Ethan", "Mohammed", "Omar", "Youssef", "Khalid", "Diego", "Sergio", "Pablo", "Javier", "Carlos", "Miguel", "João", "Pedro", "Rafael", "André", "Gabriel", "Felipe", "Thiago", "Luka", "Ivan", "Marko", "Nikola", "Stefan", "Andrei", "Viktor", "Dmitri", "Alex", "Jordan", "Kyle", "Ryan", "Jack", "Harry", "Oliver", "Thomas", "Benjamin", "Elias", "Hugo", "Louis", "Antoine", "Kylian", "Jules", "Theo", "Emil", "Oscar", "Sven", "Erik", "Johan", "Noa", "Daan", "Milan", "Lars", "Kasper", "Mohamed", "Amine", "Bilal", "Hakim", "Achraf", "Sadio", "Victor", "Samuel", "Ismail", "Moussa", "Kalidou", "Wilfried", "Nicolas", "Franck", "Didier", "Yaya", "Pierre", "Samuel", "David", "Cristiano", "Lionel", "Neymar", "Vinicius", "Rodrygo", "Endrick", "Lamine", "Gavi", "Pedri",
  // Kadın isimleri de ekle (farklı kişiler)
  "Elif", "Zeynep", "Ayşe", "Fatma", "Meryem", "Aylin", "Derya", "Esra", "Melis", "Sıla"
];

export const LAST_NAMES = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Bulut", "Güneş", 
  "Aydın", "Yıldız", "Sönmez", "Özkan", "Toprak", "Aktaş", "Koç", "Eren",
  "Arslan", "Karaca", "Özdemir", "Doğan", "Şentürk", "Acar", "Tunç", "Özer",
  "Aslan", "Koçak", "Korkmaz", "Acar", "Başar", "Erdem", "Kılıç", "Turan", "Güler", "Aksoy", "Polat", "Tuncer", "Çetin", "Kurt", "Özkan", "Aydın", "Yalçın", "Kara", "Uçar", "Şahin", "Yavuz", "Avcı",
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez", "Rodriguez", "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Rossi", "Esposito", "Bianchi", "Romano", "Colombo", "Dubois", "Martin", "Bernard", "Thomas", "Petit", "Andersson", "Johansson", "Karlsson", "Nilsson", "Jensen", "Hansen", "Pedersen", "Olsen", "Van Dijk", "De Jong", "De Bruyne", "Hazard", "Lukaku", "Salah", "Mane", "Aubameyang", "Eto’o", "Drogba", "Yaya", "Touré", "Essien", "Mikel", "Okocha", "Salah", "Ziyech", "Hakimi", "Mahrez", "Benzema", "Mbappé", "Griezmann", "Pogba", "Kanté", "Varane", "Giroud", "Lloris", "Neuer", "Kroos", "Messi", "Ronaldo", "Neymar", "Suárez", "Cavani", "Higuaín", "Aguero", "Di Maria", "Alvarez", "Lautaro", "Dybala"
];

export const LOGO_POOL = ['🦁', '🦅', '🐺', '⚡', '🔥', '⚔️', '🛡️', '👑', '🔱', '🏹', '🌪️', '💎', '🐉', '🦈', '🐆', '⭐'];

export const BOT_NAMES_BY_LEVEL: Record<number, { name: string; logo: string }[]> = {
  4: [
    { name: "İstanbul United", logo: "🦅" },
    { name: "Ankara Aslanları", logo: "🦁" },
    { name: "İzmir Körfez", logo: "🌊" },
    { name: "Bursa Yıldızı", logo: "⭐" },
    { name: "Antalya Sahil", logo: "🌴" },
    { name: "Sivas Yiğit", logo: "⚔️" },
    { name: "Trabzon Fırtına", logo: "🌪️" },
    { name: "Adana Demirler", logo: "🔨" },
    { name: "Konya Kartal", logo: "🦅" }
  ],
  3: [
    { name: "Elite İstanbul", logo: "💎" },
    { name: "Power Ankara", logo: "⚡" },
    { name: "Storm İzmir", logo: "🌩️" },
    { name: "Thunder Bursa", logo: "⚡" },
    { name: "Wave Antalya", logo: "🌊" },
    { name: "Lion Sivas", logo: "🦁" },
    { name: "Eagle Trabzon", logo: "🦅" },
    { name: "Iron Adana", logo: "🛡️" },
    { name: "Falcon Konya", logo: "🦅" }
  ],
  2: [
    { name: "Supreme United", logo: "👑" },
    { name: "Mega Aslanları", logo: "🦁" },
    { name: "Ultra Körfez", logo: "🔱" },
    { name: "Pro Yıldızı", logo: "⭐" },
    { name: "Epic Sahil", logo: "🏖️" },
    { name: "Legend Yiğit", logo: "🏆" },
    { name: "Master Fırtına", logo: "🌪️" },
    { name: "Champion Demirler", logo: "🏅" },
    { name: "King Kartal", logo: "👑" }
  ],
  1: [
    { name: "Galatasaray SK", logo: "🦁" },
    { name: "Fenerbahçe SK", logo: "🐤" },
    { name: "Beşiktaş JK", logo: "🦅" },
    { name: "Trabzonspor", logo: "🌊" },
    { name: "Başakşehir FK", logo: "🏰" },
    { name: "Adana Demirspor", logo: "⚡" },
    { name: "Konyaspor", logo: "🦅" },
    { name: "Sivasspor", logo: "⚔️" },
    { name: "Antalyaspor", logo: "🌴" }
  ]
};

export const SPONSOR_OFFERS = [
  { name: "TechGiant Corp", income: 40000, duration: 5, desc: "Kısa vadeli, güvenilir gelir.", icon: "💻" },
  { name: "EnergyDrink X", income: 65000, duration: 3, desc: "Yüksek gelir ama kısa sürer.", icon: "🥤" },
  { name: "Global Airways", income: 30000, duration: 10, desc: "Uzun vadeli istikrar.", icon: "✈️" },
  { name: "BetFair Sports", income: 100000, duration: 2, desc: "Riskli ama çok kazançlı!", icon: "🎰" },
  { name: "AutoMax Motors", income: 55000, duration: 4, desc: "Prestijli marka ortaklığı.", icon: "🚗" },
  { name: "CryptoBank", income: 80000, duration: 3, desc: "Yeni nesil finansman.", icon: "₿" }
];

export const FORMATIONS: Record<string, { r: string; t: number; l: number }[]> = {
  "4-3-3": [
    { r: "KL", t: 90, l: 50 },
    { r: "SB", t: 72, l: 15 }, { r: "STP", t: 72, l: 35 }, { r: "STP", t: 72, l: 65 }, { r: "SB", t: 72, l: 85 },
    { r: "OS", t: 48, l: 25 }, { r: "OS", t: 45, l: 50 }, { r: "OS", t: 48, l: 75 },
    { r: "FW", t: 20, l: 20 }, { r: "FW", t: 15, l: 50 }, { r: "FW", t: 20, l: 80 }
  ],
  "4-4-2": [
    { r: "KL", t: 90, l: 50 },
    { r: "SB", t: 72, l: 15 }, { r: "STP", t: 72, l: 35 }, { r: "STP", t: 72, l: 65 }, { r: "SB", t: 72, l: 85 },
    { r: "OS", t: 48, l: 15 }, { r: "OS", t: 45, l: 38 }, { r: "OS", t: 45, l: 62 }, { r: "OS", t: 48, l: 85 },
    { r: "FW", t: 18, l: 35 }, { r: "FW", t: 18, l: 65 }
  ],
  "3-5-2": [
    { r: "KL", t: 90, l: 50 },
    { r: "STP", t: 75, l: 25 }, { r: "STP", t: 72, l: 50 }, { r: "STP", t: 75, l: 75 },
    { r: "OS", t: 52, l: 10 }, { r: "OS", t: 48, l: 30 }, { r: "OS", t: 45, l: 50 }, { r: "OS", t: 48, l: 70 }, { r: "OS", t: 52, l: 90 },
    { r: "FW", t: 18, l: 35 }, { r: "FW", t: 18, l: 65 }
  ],
  "5-3-2": [
    { r: "KL", t: 90, l: 50 },
    { r: "SB", t: 70, l: 10 }, { r: "STP", t: 75, l: 28 }, { r: "STP", t: 72, l: 50 }, { r: "STP", t: 75, l: 72 }, { r: "SB", t: 70, l: 90 },
    { r: "OS", t: 48, l: 30 }, { r: "OS", t: 45, l: 50 }, { r: "OS", t: 48, l: 70 },
    { r: "FW", t: 18, l: 40 }, { r: "FW", t: 18, l: 60 }
  ],
  "4-2-3-1": [
    { r: "KL", t: 90, l: 50 },
    { r: "SB", t: 72, l: 15 }, { r: "STP", t: 72, l: 35 }, { r: "STP", t: 72, l: 65 }, { r: "SB", t: 72, l: 85 },
    { r: "OS", t: 55, l: 35 }, { r: "OS", t: 55, l: 65 },
    { r: "OS", t: 35, l: 20 }, { r: "OS", t: 32, l: 50 }, { r: "OS", t: 35, l: 80 },
    { r: "FW", t: 15, l: 50 }
  ]
};

export const MATCH_EVENTS = {
  goals: [
    "{player} muhteşem bir şutla ağları sarstı! ⚽",
    "{player} kafa vuruşuyla gol attı! ⚽",
    "{player} penaltıyı gole çevirdi! ⚽",
    "{player} solo bir çalımla kalecinin ayaklarının arasından topu ağlara gönderdi! ⚽",
    "{player} rövaşata ile inanılmaz bir gol attı! ⚽🔥",
    "{player} frikik topunu tam doksan köşeye yerleştirdi! ⚽"
  ],
  saves: [
    "Kaleci harika bir kurtarış yaptı!",
    "Direkten döndü! İnanılmaz şanssızlık!",
    "Son anda defans araya girdi!",
    "Kaleci ayak ucuyla kurtardı!"
  ],
  chances: [
    "{team} tehlikeli bir pozisyon geliştiriyor...",
    "Orta saha baskısı artıyor!",
    "Kontra atak başladı!",
    "{team} kale önünde buluşuyor!"
  ],
  injuries: [
    "{player} yerde kaldı, sağlık ekibi sahaya giriyor! 🏥",
    "{player} sakatlık nedeniyle oyuna devam edemiyor! 🚑"
  ]
};

export const ROLE_NAMES: Record<string, string> = {
  'KL': 'Kaleci',
  'STP': 'Stoper',
  'SB': 'Bek',
  'OS': 'Orta Saha',
  'FW': 'Forvet'
};

/** Hava durumu sistemi — maç dinamiğini etkiler */
export const WEATHER_INFO: Record<
  string,
  { label: string; icon: string; goalMult: number; injuryMult: number; desc: string }
> = {
  sunny:  { label: 'Güneşli',   icon: '☀️', goalMult: 1.05, injuryMult: 1.0, desc: 'İdeal futbol havası, tempolu maç.' },
  cloudy: { label: 'Parçalı Bulutlu', icon: '⛅', goalMult: 1.0, injuryMult: 1.0, desc: 'Dengeli koşullar.' },
  rain:   { label: 'Yağmurlu',  icon: '🌧️', goalMult: 0.9,  injuryMult: 1.15, desc: 'Kaygan zemin: hatalı paslar, sürpriz goller.' },
  storm:  { label: 'Fırtına',   icon: '⛈️', goalMult: 0.82, injuryMult: 1.3, desc: 'Şiddetli yağış, oyun zorlaşır.' },
  snow:   { label: 'Karlı',     icon: '❄️', goalMult: 0.75, injuryMult: 1.4, desc: 'Zemin ağır, sakatlık riski yüksek.' },
  wind:   { label: 'Rüzgârlı',  icon: '💨', goalMult: 0.85, injuryMult: 1.05, desc: 'Uzun toplar kontrol edilemiyor.' },
  fog:    { label: 'Sisli',     icon: '🌫️', goalMult: 0.95, injuryMult: 1.1, desc: 'Görüş düşük: kaleci hataları artar.' },
};

export const TRAINING_FOCUS_INFO: Record<
  string,
  { label: string; icon: string; desc: string; attr: 'attack' | 'defense' | 'fitness' | 'youth' | 'balanced' }
> = {
  balanced: { label: 'Dengeli',   icon: '⚖️', desc: 'Her alana eşit yük. Sakatlık riski düşük.', attr: 'balanced' },
  attack:   { label: 'Hücum',     icon: '⚡', desc: 'Forvet ve orta saha gelişimi hızlanır.', attr: 'attack' },
  defense:  { label: 'Savunma',   icon: '🛡️', desc: 'Defans oyuncuları gelişir, gol yeme azalır.', attr: 'defense' },
  fitness:  { label: 'Kondisyon', icon: '🏃', desc: 'Enerji daha çabuk dolar, sakatlık azalır.', attr: 'fitness' },
  youth:    { label: 'Gençler',   icon: '🌱', desc: 'Akademi ve genç oyuncular hızlı gelişir.', attr: 'youth' },
};

export const HOME_ADVANTAGE = 3.5;
export const AWAY_PENALTY = 2;

/** Kulüpten ayrılma sınırı: moral bu değerin altına düşerse oyuncu gitmek ister */
export const UNHAPPY_MORALE = 30;

/* ══════════ GERÇEKÇİ YATIRIM PİYASASI (v2) ══════════
   - Her varlık: volatilite, drift, temettü/kira/kupon, beta, risk sınıfı
   - Fiyatlar haftalık Gaussian + piyasa hissiyatı ile evrilir, grafik history'de izlenir
   - Temettü/kira/kupon her hafta nakit olarak ödenir (gerçek piyasadaki gibi)
*/
function invHistory(base: number): number[] {
  // 16 haftalık geriye dönük gerçekçi fiyat serisi
  const h: number[] = [];
  let p = base * 0.92;
  for (let i = 0; i < 16; i++) {
    const drift = 0.002;
    const vol = 0.035;
    const shock = (Math.random() * 2 - 1) * vol;
    p = Math.round(p * (1 + drift + shock));
    h.push(p);
  }
  h[h.length - 1] = base;
  return h;
}

export const INITIAL_INVESTMENTS = [
  {
    id: 1,
    name: "BIST 100 Endeks Fonu",
    price: 118000,
    basePrice: 118000,
    type: "stock" as const,
    owned: 0,
    lastChange: 0,
    icon: "📈",
    history: invHistory(118000),
    volatility: 0.048,
    drift: 0.0042,
    dividendYield: 0.018,
    risk: "Yüksek" as const,
    sector: "Borsa İstanbul • Hisse Senedi",
    description: "Türkiye'nin en büyük 100 şirketine endeksli borsa yatırım fonu. Temettü verir, yüksek getiri potansiyeli ama düzeltmelerde sert düşer. SPK denetimli, T+2 takas.",
    avgCost: 118000,
    dividendsEarned: 0,
    marketBeta: 1.0
  },
  {
    id: 2,
    name: "Gram Altın (Fiziki)",
    price: 82000,
    basePrice: 82000,
    type: "gold" as const,
    owned: 0,
    lastChange: 0,
    icon: "🥇",
    history: invHistory(82000),
    volatility: 0.031,
    drift: 0.0021,
    dividendYield: 0,
    risk: "Orta" as const,
    sector: "Değerli Metal • Güvenli Liman",
    description: "Enflasyon ve kriz dönemlerinin güvenli limanı. Borsa düşerken genelde yükselir (negatif beta). Fiziki altın, temettü yok — kazanç sadece fiyat artışından.",
    avgCost: 82000,
    dividendsEarned: 0,
    marketBeta: -0.28
  },
  {
    id: 3,
    name: "İstanbul GYO Sepeti",
    price: 235000,
    basePrice: 235000,
    type: "realestate" as const,
    owned: 0,
    lastChange: 0,
    icon: "🏘️",
    history: invHistory(235000),
    volatility: 0.024,
    drift: 0.0016,
    dividendYield: 0.055,
    risk: "Orta" as const,
    sector: "GYO • Kira Geliri",
    description: "İstanbul konut & ticari portföyüne dayalı GYO fonu. Her hafta kira temettüsü öder (%5.5 yıllık). Fiyatı yavaş hareket eder, emlak balonuna dikkat.",
    avgCost: 235000,
    dividendsEarned: 0,
    marketBeta: 0.45
  },
  {
    id: 4,
    name: "Kripto Sepeti (BTC/ETH)",
    price: 72000,
    basePrice: 72000,
    type: "crypto" as const,
    owned: 0,
    lastChange: 0,
    icon: "₿",
    history: invHistory(72000),
    volatility: 0.105,
    drift: 0.0055,
    dividendYield: 0,
    risk: "Çok Yüksek" as const,
    sector: "Kripto • Volatil",
    description: "Bitcoin ve Ethereum ağırlıklı sepet. Haftada %±15 dalgalanma normal. Düzenleme haberlerine çok duyarlı, stopaj %0 ama kayıp riski en yüksek.",
    avgCost: 72000,
    dividendsEarned: 0,
    marketBeta: 0.62
  },
  {
    id: 5,
    name: "Devlet Tahvili (TL 10Y)",
    price: 145000,
    basePrice: 145000,
    type: "bond" as const,
    owned: 0,
    lastChange: 0,
    icon: "📜",
    history: invHistory(145000),
    volatility: 0.014,
    drift: 0.0006,
    dividendYield: 0.18,
    risk: "Düşük" as const,
    sector: "Sabit Getiri • Hazine",
    description: "Hazine ihraçlı 10 yıllık TL tahvil. Her hafta kupon faizi öder (%18 yıllık). Fiyatı çok oynak değil — faiz artarsa fiyatı düşer, düşerse fırlar.",
    avgCost: 145000,
    dividendsEarned: 0,
    marketBeta: 0.08
  }
];

/* ══════════ KREDİ & TEFECİ PAKETLERİ (24) ══════════
   Banka: düşük faiz, yönetim güveni şart, gecikmede puan silinmez ama güven düşer
   Tefeci: anında verir, kimlik sormaz ama faiz can yakar, gecikmede -3 puan + moral çöker
*/
export const CREDIT_PACKAGES = [
  {
    id: 'bank_quick',
    name: 'Hızlı Banka Kredisi',
    amount: 350000,
    weeks: 5,
    interestRate: 0.14,
    weeklyPayment: 79800,
    totalRepayment: 399000,
    type: 'bank' as const,
    icon: '🏦',
    description: 'Acil nakit: 5 haftada geri öde, düşük faiz. Transferde son gün kurtarıcısı.',
    requirement: 'Yönetim güveni %35+',
  },
  {
    id: 'bank_standard',
    name: 'Esnaf Kredisi',
    amount: 700000,
    weeks: 6,
    interestRate: 0.18,
    weeklyPayment: 137667,
    totalRepayment: 826000,
    type: 'bank' as const,
    icon: '🏛️',
    description: 'Orta vade, dengeli taksit. Tesis + transferi aynı anda finanse eder.',
    requirement: 'Yönetim güveni %40+',
  },
  {
    id: 'bank_big',
    name: 'Kurumsal Kredi',
    amount: 1200000,
    weeks: 8,
    interestRate: 0.25,
    weeklyPayment: 187500,
    totalRepayment: 1500000,
    type: 'bank' as const,
    icon: '💼',
    description: 'Büyük oynayanlara: 1.2M anında, 8 taksit. Yıldız transferi için.',
    requirement: 'Yönetim güveni %50+',
  },
  {
    id: 'shark_flash',
    name: 'Tefeci — Kara Para',
    amount: 500000,
    weeks: 4,
    interestRate: 0.35,
    weeklyPayment: 168750,
    totalRepayment: 675000,
    type: 'shark' as const,
    icon: '🕶️',
    description: 'Soru yok, kefil yok — 4 haftada %35 faiz! Ödeyemezsen puan silinir, takım morali çöker.',
    requirement: 'Hiçbir şart yok',
  },
  {
    id: 'shark_big',
    name: 'Tefeci — Büyük Vurgun',
    amount: 900000,
    weeks: 5,
    interestRate: 0.42,
    weeklyPayment: 255600,
    totalRepayment: 1278000,
    type: 'shark' as const,
    icon: '💀',
    description: 'En riskli: 900k anında, 5 haftada %42 faiz. Son çare — ya şampiyon olursun ya batarsın.',
    requirement: 'Hiçbir şart yok',
  },
];

/* ══════════ KULÜP FELSEFESİ & ULTRAS (v4.2) ══════════ */
export const PHILOSOPHIES = [
  {
    id: 'youth' as const,
    name: 'Altyapı Fabrikası',
    icon: '🌱',
    color: 'emerald',
    desc: 'Gençlere yatırım. Akademi + genç gelişimi %25 hızlanır, taraftar sabırlı, bütçe kısıtlı.',
    bonus: 'Genç gelişimi +25% • Scout yenileme %20 ucuz • Ultras genç oynatmanı ister',
    fanExpectation: 'İlk 6 yeterli, gençlere şans ver',
  },
  {
    id: 'money' as const,
    name: 'Para Makinesi',
    icon: '💰',
    color: 'amber',
    desc: 'Ticari başarı. Mağaza + sponsor + yatırım geliri %15 fazla, taraftar şov sever.',
    bonus: 'Mağaza & sponsor +%15 • Yatırım temettü +%10 • Taraftar doluluk +5%',
    fanExpectation: 'Her sezon kâr et, şov transferi yap',
  },
  {
    id: 'trophy' as const,
    name: 'Kupa Avcısı',
    icon: '🏆',
    color: 'violet',
    desc: 'Sadece şampiyonluk. Maç gücü +3, yönetim sabırsız, her kupa sonrası dev ödül.',
    bonus: 'Maçlarda +3 OVR • Kupa primi x1.5 • Moral +5 galibiyette',
    fanExpectation: 'İlk 3 şart, kupa = efsane',
  },
];

export const ULTRAS_TEMPLATES = [
  { kind: 'youth' as const, text: 'Bu ay bir altyapı oyuncusunu A takıma al!', reward: 'Sadakat +12, kimya +2', penalty: '-8 taraftar, -6 ultras' },
  { kind: 'youth' as const, text: 'Gençlere süre ver — bir U23 oyuncuyu ilk 11 başlat', reward: 'Genç gelişimi +1 OVR', penalty: 'Ultras ıslıklar' },
  { kind: 'star' as const, text: 'Yıldız transferi istiyoruz — OVR 78+ birini al', reward: 'Tribün doluluk +8%', penalty: 'Taraftar -10' },
  { kind: 'derby' as const, text: 'Derbiyi kazan — sıradaki iç saha maçını al', reward: 'Moral +8 tüm takım', penalty: 'Yönetim güven -5' },
  { kind: 'cleanSheet' as const, text: '2 maçta gol yemeyin — savunmayı toparlayın', reward: 'Savunma +2 sonraki maç', penalty: 'Ultras -10' },
  { kind: 'derby' as const, text: 'Deplasmanda yenilmeyin — en az beraberlik', reward: 'Deplasman primi +$100k', penalty: 'Fan -7' },
];
