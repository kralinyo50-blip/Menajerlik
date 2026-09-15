export interface City {
  id: number;
  name: string;
  region: string;
  population: number;
  districts: string[];
}

export const TURKEY_CITIES: City[] = [
  { id: 1, name: "Adana", region: "Akdeniz", population: 2270000, districts: ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam"] },
  { id: 2, name: "Adıyaman", region: "G.Doğu Anadolu", population: 635000, districts: ["Merkez", "Kahta", "Besni"] },
  { id: 3, name: "Afyonkarahisar", region: "Ege", population: 747000, districts: ["Merkez", "Sandıklı", "Dinar"] },
  { id: 4, name: "Ağrı", region: "Doğu Anadolu", population: 510000, districts: ["Merkez", "Doğubayazıt", "Patnos"] },
  { id: 5, name: "Amasya", region: "Karadeniz", population: 340000, districts: ["Merkez", "Merzifon", "Suluova"] },
  { id: 6, name: "Ankara", region: "İç Anadolu", population: 5750000, districts: ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Sincan"] },
  { id: 7, name: "Antalya", region: "Akdeniz", population: 2620000, districts: ["Muratpaşa", "Konyaaltı", "Kepez", "Alanya", "Manavgat"] },
  { id: 8, name: "Artvin", region: "Karadeniz", population: 174000, districts: ["Merkez", "Hopa", "Arhavi"] },
  { id: 9, name: "Aydın", region: "Ege", population: 1120000, districts: ["Efeler", "Nazilli", "Söke", "Kuşadası"] },
  { id: 10, name: "Balıkesir", region: "Marmara", population: 1240000, districts: ["Altıeylül", "Karesi", "Bandırma", "Edremit"] },
  { id: 11, name: "Bilecik", region: "Marmara", population: 228000, districts: ["Merkez", "Bolu", "Söğüt"] },
  { id: 12, name: "Bingöl", region: "Doğu Anadolu", population: 282000, districts: ["Merkez", "Genç", "Solhan"] },
  { id: 13, name: "Bitlis", region: "Doğu Anadolu", population: 353000, districts: ["Merkez", "Tatvan", "Ahlat"] },
  { id: 14, name: "Bolu", region: "Karadeniz", population: 316000, districts: ["Merkez", "Gerede", "Mudurnu"] },
  { id: 15, name: "Burdur", region: "Akdeniz", population: 270000, districts: ["Merkez", "Bucak", "Gölhisar"] },
  { id: 16, name: "Bursa", region: "Marmara", population: 3100000, districts: ["Osmangazi", "Nilüfer", "Yıldırım", "İnegöl", "Gemlik"] },
  { id: 17, name: "Çanakkale", region: "Marmara", population: 560000, districts: ["Merkez", "Biga", "Çan", "Gelibolu"] },
  { id: 18, name: "Çankırı", region: "İç Anadolu", population: 195000, districts: ["Merkez", "Çerkeş", "Ilgaz"] },
  { id: 19, name: "Çorum", region: "Karadeniz", population: 540000, districts: ["Merkez", "Osmancık", "Sungurlu"] },
  { id: 20, name: "Denizli", region: "Ege", population: 1040000, districts: ["Merkezefendi", "Pamukkale", "Çivril"] },
  { id: 21, name: "Diyarbakır", region: "G.Doğu Anadolu", population: 1790000, districts: ["Bağlar", "Kayapınar", "Yenişehir", "Sur"] },
  { id: 22, name: "Edirne", region: "Marmara", population: 413000, districts: ["Merkez", "Keşan", "Uzunköprü"] },
  { id: 23, name: "Elazığ", region: "Doğu Anadolu", population: 591000, districts: ["Merkez", "Kovancılar", "Karakoçan"] },
  { id: 24, name: "Erzincan", region: "Doğu Anadolu", population: 238000, districts: ["Merkez", "Tercan", "Üzümlü"] },
  { id: 25, name: "Erzurum", region: "Doğu Anadolu", population: 762000, districts: ["Yakutiye", "Palandöken", "Aziziye"] },
  { id: 26, name: "Eskişehir", region: "İç Anadolu", population: 888000, districts: ["Odunpazarı", "Tepebaşı", "Çifteler"] },
  { id: 27, name: "Gaziantep", region: "G.Doğu Anadolu", population: 2130000, districts: ["Şahinbey", "Şehitkamil", "Nizip", "İslahiye"] },
  { id: 28, name: "Giresun", region: "Karadeniz", population: 453000, districts: ["Merkez", "Bulancak", "Görele"] },
  { id: 29, name: "Gümüşhane", region: "Karadeniz", population: 164000, districts: ["Merkez", "Kelkit", "Şiran"] },
  { id: 30, name: "Hakkari", region: "Doğu Anadolu", population: 286000, districts: ["Merkez", "Yüksekova", "Çukurca"] },
  { id: 31, name: "Hatay", region: "Akdeniz", population: 1660000, districts: ["Antakya", "İskenderun", "Defne", "Samandağ"] },
  { id: 32, name: "Isparta", region: "Akdeniz", population: 445000, districts: ["Merkez", "Yalvaç", "Eğirdir"] },
  { id: 33, name: "Mersin", region: "Akdeniz", population: 1870000, districts: ["Yenişehir", "Toroslar", "Mezitli", "Akdeniz", "Tarsus"] },
  { id: 34, name: "İstanbul", region: "Marmara", population: 16000000, districts: ["Kadıköy", "Beşiktaş", "Şişli", "Bakırköy", "Üsküdar", "Fatih", "Beyoğlu", "Ataşehir", "Maltepe", "Başakşehir"] },
  { id: 35, name: "İzmir", region: "Ege", population: 4420000, districts: ["Konak", "Bornova", "Karşıyaka", "Buca", "Çiğli", "Bayraklı", "Alsancak"] },
  { id: 36, name: "Kars", region: "Doğu Anadolu", population: 285000, districts: ["Merkez", "Sarıkamış", "Kağızman"] },
  { id: 37, name: "Kastamonu", region: "Karadeniz", population: 383000, districts: ["Merkez", "Tosya", "Taşköprü"] },
  { id: 38, name: "Kayseri", region: "İç Anadolu", population: 1420000, districts: ["Melikgazi", "Kocasinan", "Talas", "Develi"] },
  { id: 39, name: "Kırklareli", region: "Marmara", population: 361000, districts: ["Merkez", "Lüleburgaz", "Babaeski"] },
  { id: 40, name: "Kırşehir", region: "İç Anadolu", population: 243000, districts: ["Merkez", "Kaman", "Mucur"] },
  { id: 41, name: "Kocaeli", region: "Marmara", population: 2030000, districts: ["İzmit", "Gebze", "Darıca", "Derince", "Gölcük"] },
  { id: 42, name: "Konya", region: "İç Anadolu", population: 2280000, districts: ["Selçuklu", "Meram", "Karatay", "Ereğli", "Akşehir"] },
  { id: 43, name: "Kütahya", region: "Ege", population: 580000, districts: ["Merkez", "Tavşanlı", "Simav"] },
  { id: 44, name: "Malatya", region: "Doğu Anadolu", population: 810000, districts: ["Battalgazi", "Yeşilyurt", "Akçadağ"] },
  { id: 45, name: "Manisa", region: "Ege", population: 1450000, districts: ["Şehzadeler", "Yunusemre", "Akhisar", "Turgutlu", "Salihli"] },
  { id: 46, name: "Kahramanmaraş", region: "Akdeniz", population: 1170000, districts: ["Onikişubat", "Dulkadiroğlu", "Elbistan"] },
  { id: 47, name: "Mardin", region: "G.Doğu Anadolu", population: 862000, districts: ["Artuklu", "Kızıltepe", "Nusaybin", "Midyat"] },
  { id: 48, name: "Muğla", region: "Ege", population: 1000000, districts: ["Menteşe", "Bodrum", "Fethiye", "Marmaris", "Dalaman"] },
  { id: 49, name: "Muş", region: "Doğu Anadolu", population: 411000, districts: ["Merkez", "Bulanık", "Malazgirt"] },
  { id: 50, name: "Nevşehir", region: "İç Anadolu", population: 303000, districts: ["Merkez", "Ürgüp", "Avanos"] },
  { id: 51, name: "Niğde", region: "İç Anadolu", population: 364000, districts: ["Merkez", "Bor", "Çiftlik"] },
  { id: 52, name: "Ordu", region: "Karadeniz", population: 771000, districts: ["Altınordu", "Ünye", "Fatsa", "Perşembe"] },
  { id: 53, name: "Rize", region: "Karadeniz", population: 348000, districts: ["Merkez", "Çayelı", "Ardeşen"] },
  { id: 54, name: "Sakarya", region: "Marmara", population: 1040000, districts: ["Adapazarı", "Serdivan", "Erenler", "Arifiye"] },
  { id: 55, name: "Samsun", region: "Karadeniz", population: 1360000, districts: ["İlkadım", "Atakum", "Canik", "Bafra", "Çarşamba"] },
  { id: 56, name: "Siirt", region: "G.Doğu Anadolu", population: 331000, districts: ["Merkez", "Kurtalan", "Baykan"] },
  { id: 57, name: "Sinop", region: "Karadeniz", population: 220000, districts: ["Merkez", "Boyabat", "Gerze"] },
  { id: 58, name: "Sivas", region: "İç Anadolu", population: 646000, districts: ["Merkez", "Şarkışla", "Zara"] },
  { id: 59, name: "Tekirdağ", region: "Marmara", population: 1080000, districts: ["Süleymanpaşa", "Çorlu", "Çerkezköy", "Kapaklı"] },
  { id: 60, name: "Tokat", region: "Karadeniz", population: 612000, districts: ["Merkez", "Erbaa", "Turhal", "Niksar"] },
  { id: 61, name: "Trabzon", region: "Karadeniz", population: 810000, districts: ["Ortahisar", "Akçaabat", "Yomra", "Of"] },
  { id: 62, name: "Tunceli", region: "Doğu Anadolu", population: 88000, districts: ["Merkez", "Pertek", "Hozat"] },
  { id: 63, name: "Şanlıurfa", region: "G.Doğu Anadolu", population: 2115000, districts: ["Eyyübiye", "Haliliye", "Karaköprü", "Siverek", "Viranşehir"] },
  { id: 64, name: "Uşak", region: "Ege", population: 373000, districts: ["Merkez", "Eşme", "Banaz"] },
  { id: 65, name: "Van", region: "Doğu Anadolu", population: 1136000, districts: ["İpekyolu", "Tuşba", "Edremit", "Erciş"] },
  { id: 66, name: "Yozgat", region: "İç Anadolu", population: 424000, districts: ["Merkez", "Sorgun", "Yerköy"] },
  { id: 67, name: "Zonguldak", region: "Karadeniz", population: 596000, districts: ["Merkez", "Ereğli", "Çaycuma", "Devrek"] },
  { id: 68, name: "Aksaray", region: "İç Anadolu", population: 421000, districts: ["Merkez", "Ortaköy", "Eskil"] },
  { id: 69, name: "Bayburt", region: "Karadeniz", population: 84000, districts: ["Merkez", "Aydıntepe"] },
  { id: 70, name: "Karaman", region: "İç Anadolu", population: 254000, districts: ["Merkez", "Ermenek", "Sarıveliler"] },
  { id: 71, name: "Kırıkkale", region: "İç Anadolu", population: 289000, districts: ["Merkez", "Yahşihan", "Keskin"] },
  { id: 72, name: "Batman", region: "G.Doğu Anadolu", population: 620000, districts: ["Merkez", "Kozluk", "Sason"] },
  { id: 73, name: "Şırnak", region: "G.Doğu Anadolu", population: 542000, districts: ["Merkez", "Cizre", "Silopi", "İdil"] },
  { id: 74, name: "Bartın", region: "Karadeniz", population: 199000, districts: ["Merkez", "Ulus", "Amasra"] },
  { id: 75, name: "Ardahan", region: "Doğu Anadolu", population: 98000, districts: ["Merkez", "Göle", "Çıldır"] },
  { id: 76, name: "Iğdır", region: "Doğu Anadolu", population: 203000, districts: ["Merkez", "Tuzluca", "Aralık"] },
  { id: 77, name: "Yalova", region: "Marmara", population: 276000, districts: ["Merkez", "Çiftlikköy", "Çınarcık"] },
  { id: 78, name: "Karabük", region: "Karadeniz", population: 248000, districts: ["Merkez", "Safranbolu", "Eskipazar"] },
  { id: 79, name: "Kilis", region: "G.Doğu Anadolu", population: 145000, districts: ["Merkez", "Musabeyli", "Elbeyli"] },
  { id: 80, name: "Osmaniye", region: "Akdeniz", population: 538000, districts: ["Merkez", "Kadirli", "Düziçi"] },
  { id: 81, name: "Düzce", region: "Karadeniz", population: 395000, districts: ["Merkez", "Akçakoca", "Gölyaka"] },
];

export interface ShopBranch {
  id: string;
  cityId: number;
  district: string;
  shopType: ShopType;
  weeklyIncome: number;
  setupCost: number;
  opened: boolean;
  openedWeek: number;
}

export type ShopType = 'small' | 'medium' | 'large' | 'flagship';

export interface ShopTypeInfo {
  type: ShopType;
  name: string;
  description: string;
  image: string;
  baseCost: number;
  incomeMultiplier: number;
  emoji: string;
}

export const SHOP_TYPES: ShopTypeInfo[] = [
  {
    type: 'small',
    name: 'Mini Mağaza',
    description: 'Küçük bir köşe dükkanı. Formalar ve atkılar satılır.',
    image: '/images/shop-small.png',
    baseCost: 150000,
    incomeMultiplier: 1,
    emoji: '🏪'
  },
  {
    type: 'medium',
    name: 'Standart Mağaza',
    description: 'AVM içi mağaza. Geniş ürün yelpazesi.',
    image: '/images/shop-medium.png',
    baseCost: 400000,
    incomeMultiplier: 2.5,
    emoji: '🏬'
  },
  {
    type: 'large',
    name: 'Mega Store',
    description: 'Çok katlı büyük mağaza. Premium ürünler.',
    image: '/images/shop-large.png',
    baseCost: 900000,
    incomeMultiplier: 5,
    emoji: '🏢'
  },
  {
    type: 'flagship',
    name: 'Flagship Mağaza',
    description: 'Amiral gemisi! VIP bölüm, özel tasarım.',
    image: '/images/shop-premium.png',
    baseCost: 2000000,
    incomeMultiplier: 12,
    emoji: '👑'
  }
];

export const REGIONS = [
  "Marmara", "Ege", "Akdeniz", "İç Anadolu", "Karadeniz", "Doğu Anadolu", "G.Doğu Anadolu"
];

// Haftalık forma geliri hesapla
export function calculateShopIncome(
  branch: ShopBranch,
  city: City,
  topPlayers: { name: string; ovr: number }[],
  leaguePosition: number
): number {
  const shopInfo = SHOP_TYPES.find(s => s.type === branch.shopType)!;
  const popFactor = city.population / 1000000; // Nüfus çarpanı
  const positionBonus = Math.max(1, (11 - leaguePosition) / 5); // Lig sırası bonusu
  const starBonus = topPlayers.length > 0 ? (topPlayers[0].ovr / 80) : 1; // Yıldız oyuncu bonusu

  const base = 5000 * shopInfo.incomeMultiplier;
  return Math.floor(base * popFactor * positionBonus * starBonus);
}
