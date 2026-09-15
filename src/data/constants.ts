// Game Constants

export const FIRST_NAMES = [
  "Mert", "Arda", "Can", "Hakan", "Emre", "Burak", "Cenk", "Enes", "Yusuf", 
  "Merih", "Ferdi", "İrfan", "Barış", "Kerem", "Semih", "Salih", "Yunus",
  "Ozan", "Cengiz", "Okay", "Dorukhan", "Taylan", "Berkan", "Halil", "Muhammed"
];

export const LAST_NAMES = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Öztürk", "Bulut", "Güneş", 
  "Aydın", "Yıldız", "Sönmez", "Özkan", "Toprak", "Aktaş", "Koç", "Eren",
  "Arslan", "Karaca", "Özdemir", "Doğan", "Şentürk", "Acar", "Tunç", "Özer"
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

export const INITIAL_INVESTMENTS = [
  { id: 1, name: "Borsa (SP500)", price: 100000, type: "stock", owned: 0, lastChange: 0, icon: "📈" },
  { id: 2, name: "Dijital Altın", price: 50000, type: "gold", owned: 0, lastChange: 0, icon: "🥇" },
  { id: 3, name: "Emlak Fonu", price: 250000, type: "realestate", owned: 0, lastChange: 0, icon: "🏠" },
  { id: 4, name: "Kripto Varlık", price: 75000, type: "crypto", owned: 0, lastChange: 0, icon: "₿" },
  { id: 5, name: "Tahvil", price: 150000, type: "bond", owned: 0, lastChange: 0, icon: "📜" }
];
