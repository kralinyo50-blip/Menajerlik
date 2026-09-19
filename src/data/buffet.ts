/* ══════════════════════════════════════════════════════════════════════════
   BÜFE SİSTEMİ — marka sponsorluğu + menü + fiyat politikası

   • Markalar gerçek: büfe sponsorluğu yapınca tabela o markanın olur (3D'de
     marka rengiyle ve marka adıyla görünür).
   • Sözleşme: imza parası (peşin gelir), maç başına taraftar başına prim,
     taraftar mutluluğu katkısı ve süre (hafta). Süre bitince yenilenebilir.
   • Menü: büfe seviyesine göre ürün açılır (ekipman maliyeti), her ürün
     taraftar başına gelir + memnuniyet getirir.
   • Fiyat politikası: ucuz ↔ premium arasında gelir/memnuniyet dengesi.
   ══════════════════════════════════════════════════════════════════════════ */
import { BuffetPriceLevel, BuffetState, GameState } from '../types/game';

export interface BuffetSponsor {
  id: string;
  name: string;
  icon: string;
  /** Marka rengi — 3D tabelada ve UI'da kullanılır */
  color: string;
  /** ikincil marka rengi (yazı/tabela kontrastı) */
  ink?: string;
  /** Kategori etiketi (UI) */
  category: string;
  /** 1: mahalli, 2: ulusal, 3: global */
  tier: 1 | 2 | 3;
  /** Peşin imza parası (kulübe gelir) */
  signingBonus: number;
  /** Maç başına taraftar başına ek gelir */
  perFan: number;
  /** Taraftar mutluluğu katkısı (maç/süreç bazlı) */
  happiness: number;
  /** Sözleşme süresi (hafta) */
  durationWeeks: number;
  /** Sözleşmeyi bozma cezası çarpanı (kalan hafta × perFan primi × bu kat) */
  breakFeeFactor: number;
  /** Koşullar */
  minBuffetLevel: number;
  minFanHappiness: number;
  desc: string;
}

export const BUFFET_TIER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Mahalli Marka',
  2: 'Ulusal Marka',
  3: 'Global Marka',
};

/**
 * Büfe sponsorluk markaları. Gerçek markalar — büfe tabelası bu markanın olur.
 * (Fiyat/etki değerleri oyun dengesi için kurgusaldır, gerçek reklam bedeli değildir.)
 */
export const BUFFET_SPONSORS: BuffetSponsor[] = [
  // ── Mahalli ──
  {
    id: 'simit-sarayi', name: 'Simit Sarayı', icon: '🥨', color: '#7b3f00', ink: '#fde68a', category: 'Simit & Fırın',
    tier: 1, signingBonus: 350_000, perFan: 0.35, happiness: 1, durationWeeks: 12, breakFeeFactor: 0.3,
    minBuffetLevel: 1, minFanHappiness: 0,
    desc: 'Sıcak simit + çay. Küçük bütçeyle başlamak için ideal, taraftar sever.',
  },
  {
    id: 'torku', name: 'Torku', icon: '🍩', color: '#009639', ink: '#ffffff', category: 'Atıştırmalık',
    tier: 1, signingBonus: 500_000, perFan: 0.4, happiness: 1, durationWeeks: 14, breakFeeFactor: 0.3,
    minBuffetLevel: 1, minFanHappiness: 0,
    desc: 'Yerli üretim bisküvi & gofret çeşitleri; uygun maliyetli stok desteği.',
  },
  {
    id: 'sutas', name: 'Sütaş', icon: '🥛', color: '#009fe3', ink: '#ffffff', category: 'Süt Ürünleri',
    tier: 1, signingBonus: 600_000, perFan: 0.45, happiness: 1, durationWeeks: 16, breakFeeFactor: 0.35,
    minBuffetLevel: 2, minFanHappiness: 45,
    desc: 'Ayran, süt, kaşar peynirli tost. Aile tribününü memnun eder.',
  },
  {
    id: 'banvit', name: 'Banvit', icon: '🍗', color: '#e30613', ink: '#ffffff', category: 'Tavuk & Et',
    tier: 1, signingBonus: 700_000, perFan: 0.5, happiness: 1, durationWeeks: 14, breakFeeFactor: 0.35,
    minBuffetLevel: 2, minFanHappiness: 45,
    desc: 'Tavuk kanat ve burger köftesi tedariki; ızgara kokusu tribünü doldurur.',
  },
  // ── Ulusal ──
  {
    id: 'eti', name: 'Eti', icon: '🍪', color: '#d71920', ink: '#ffffff', category: 'Atıştırmalık',
    tier: 2, signingBonus: 900_000, perFan: 0.6, happiness: 2, durationWeeks: 18, breakFeeFactor: 0.4,
    minBuffetLevel: 3, minFanHappiness: 52,
    desc: 'Bisküvi, çikolata, kek standı. Çocuklu aileler için güçlü çekim.',
  },
  {
    id: 'ulker', name: 'Ülker', icon: '🍫', color: '#e4002b', ink: '#ffffff', category: 'Atıştırmalık',
    tier: 2, signingBonus: 1_400_000, perFan: 0.8, happiness: 2, durationWeeks: 20, breakFeeFactor: 0.4,
    minBuffetLevel: 3, minFanHappiness: 55,
    desc: 'Çikolata & gofret devi: marka bilinirliği tribün harcamasını yükseltir.',
  },
  {
    id: 'pinar', name: 'Pınar', icon: '🧀', color: '#003da5', ink: '#ffffff', category: 'Süt Ürünleri',
    tier: 2, signingBonus: 1_600_000, perFan: 0.9, happiness: 2, durationWeeks: 20, breakFeeFactor: 0.4,
    minBuffetLevel: 3, minFanHappiness: 55,
    desc: 'Sucuklu tost, ayran, dondurma; yüksek kalite algısı.',
  },
  {
    id: 'kahve-dunyasi', name: 'Kahve Dünyası', icon: '☕', color: '#4b2e1a', ink: '#f5e6c8', category: 'Kahve',
    tier: 2, signingBonus: 1_800_000, perFan: 1.0, happiness: 3, durationWeeks: 22, breakFeeFactor: 0.45,
    minBuffetLevel: 3, minFanHappiness: 58,
    desc: 'Türk kahvesi, filtre kahve, sıcak çikolata. Soğuk haftalarda satış patlar.',
  },
  {
    id: 'coca-cola', name: 'Coca-Cola', icon: '🥤', color: '#f40009', ink: '#ffffff', category: 'İçecek',
    tier: 3, signingBonus: 3_200_000, perFan: 1.6, happiness: 2, durationWeeks: 26, breakFeeFactor: 0.5,
    minBuffetLevel: 4, minFanHappiness: 62,
    desc: 'Buz gibi kola + soğutucu dolap sponsorluğu; her menünün yanına satar.',
  },
  {
    id: 'red-bull', name: 'Red Bull', icon: '🐂', color: '#00205b', ink: '#ffd200', category: 'Enerji İçeceği',
    tier: 3, signingBonus: 2_600_000, perFan: 1.4, happiness: 2, durationWeeks: 22, breakFeeFactor: 0.5,
    minBuffetLevel: 4, minFanHappiness: 60,
    desc: 'Gece maçı + enerji kombini: genç tribünün favorisi, yüksek marjlı ürün.',
  },
  {
    id: 'algida', name: 'Algida', icon: '🍦', color: '#0057b8', ink: '#ffffff', category: 'Dondurma',
    tier: 3, signingBonus: 3_000_000, perFan: 1.7, happiness: 4, durationWeeks: 24, breakFeeFactor: 0.5,
    minBuffetLevel: 4, minFanHappiness: 62,
    desc: 'Cornetto & dondurma dolabı. Aile tribününü doldurur, çocuklar bayılır.',
  },
  {
    id: 'dominos', name: "Domino's Pizza", icon: '🍕', color: '#0b6bb3', ink: '#ffffff', category: 'Pizza',
    tier: 3, signingBonus: 3_500_000, perFan: 1.9, happiness: 3, durationWeeks: 26, breakFeeFactor: 0.5,
    minBuffetLevel: 4, minFanHappiness: 63,
    desc: 'Dilim pizza standı: maç öncesi kalabalığı büfeye çeker.',
  },
  {
    id: 'starbucks', name: 'Starbucks', icon: '☕', color: '#00704a', ink: '#ffffff', category: 'Kahve',
    tier: 3, signingBonus: 3_800_000, perFan: 1.8, happiness: 3, durationWeeks: 26, breakFeeFactor: 0.55,
    minBuffetLevel: 5, minFanHappiness: 68,
    desc: 'Premium kahve barı; sıcak içecek + tatlı ile büfe prestiji zirveye çıkar.',
  },
  {
    id: 'burger-king', name: 'Burger King', icon: '🍔', color: '#d62300', ink: '#ffc72c', category: 'Fast Food',
    tier: 3, signingBonus: 4_200_000, perFan: 2.0, happiness: 2, durationWeeks: 28, breakFeeFactor: 0.55,
    minBuffetLevel: 4, minFanHappiness: 64,
    desc: 'Alev ızgaralı whopper standı: tribünde en çok kokusuyla iş yapan marka.',
  },
  {
    id: 'mcdonalds', name: "McDonald's", icon: '🍟', color: '#ffc72c', ink: '#d62300', category: 'Fast Food',
    tier: 3, signingBonus: 4_500_000, perFan: 2.1, happiness: 2, durationWeeks: 30, breakFeeFactor: 0.55,
    minBuffetLevel: 5, minFanHappiness: 66,
    desc: 'Dünyanın en büyük fast food zinciri: imza parası ve maç başı prim en yüksek.',
  },
];

export const BUFFET_SPONSOR_MAP: Record<string, BuffetSponsor> =
  BUFFET_SPONSORS.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, BuffetSponsor>);

/* ── MENÜ ── */
export interface BuffetMenuItem {
  id: string;
  name: string;
  icon: string;
  /** Büfe bu seviyeye gelmeden satılamaz */
  minBuffetLevel: number;
  /** Ekipman/tezgâh yatırımı */
  cost: number;
  /** Taraftar başına ek gelir */
  perFan: number;
  /** Taraftar memnuniyeti */
  happiness: number;
  desc: string;
}

export const BUFFET_MENU: BuffetMenuItem[] = [
  { id: 'sosisli', name: 'Sosisli', icon: '🌭', minBuffetLevel: 1, cost: 120_000, perFan: 0.9, happiness: 1, desc: 'Klasik stadyum sosisi; her büfenin olmazsa olmazı.' },
  { id: 'patates', name: 'Patates Kızartması', icon: '🍟', minBuffetLevel: 1, cost: 150_000, perFan: 1.0, happiness: 1, desc: 'Tuzlu, sıcak, hızlı satar.' },
  { id: 'mesrubat', name: 'Meşrubat Dolabı', icon: '🥤', minBuffetLevel: 1, cost: 180_000, perFan: 1.2, happiness: 1, desc: 'Soğutucu dolap: yüksek marj, düşük maliyet.' },
  { id: 'simit-cay', name: 'Simit & Çay', icon: '🫖', minBuffetLevel: 2, cost: 200_000, perFan: 1.1, happiness: 2, desc: 'Sabırsız taraftarın kurtarıcısı; kış maçlarında altın.' },
  { id: 'cips-cikolata', name: 'Cips & Çikolata', icon: '🍫', minBuffetLevel: 2, cost: 160_000, perFan: 0.8, happiness: 1, desc: 'Raf ürünü: reyonda hazır, kuyruk beklemez.' },
  { id: 'hamburger', name: 'Hamburger Menü', icon: '🍔', minBuffetLevel: 3, cost: 450_000, perFan: 2.2, happiness: 2, desc: 'Izgaralı tam menü; maç öncesi kalabalık buraya gelir.' },
  { id: 'pizza', name: 'Pizza Dilimi', icon: '🍕', minBuffetLevel: 3, cost: 420_000, perFan: 2.0, happiness: 2, desc: 'Dilim sattığı için fire az, dönüş hızı yüksek.' },
  { id: 'dondurma', name: 'Dondurma Dolabı', icon: '🍦', minBuffetLevel: 3, cost: 300_000, perFan: 1.3, happiness: 3, desc: 'Çocuklu ailelerin vazgeçilmezi.' },
  { id: 'kanat', name: 'Tavuk Kanat', icon: '🍗', minBuffetLevel: 4, cost: 600_000, perFan: 2.6, happiness: 3, desc: 'Izgara kokusu tribünün iştahını açar.' },
  { id: 'dürüm-ayran', name: 'Dürüm & Ayran', icon: '🌯', minBuffetLevel: 4, cost: 520_000, perFan: 2.4, happiness: 3, desc: 'Aç taraftarı en hızlı doyuran kombinasyon.' },
  { id: 'kahve-bar', name: 'Kahve Barı', icon: '☕', minBuffetLevel: 5, cost: 700_000, perFan: 2.8, happiness: 4, desc: 'Premium kahve: bilet dışı gelirin en kârlı kalemi.' },
  { id: 'tatlı', name: 'Tatlı & Künefe', icon: '🍮', minBuffetLevel: 5, cost: 640_000, perFan: 2.2, happiness: 5, desc: 'Maç sonu tatlısı: mutluluğa doğrudan etkisi en yüksek ürün.' },
];

export const BUFFET_MENU_MAP: Record<string, BuffetMenuItem> =
  BUFFET_MENU.reduce((acc, m) => ({ ...acc, [m.id]: m }), {} as Record<string, BuffetMenuItem>);

/* ── FİYAT POLİTİKASI ── */
export interface BuffetPriceTier {
  id: BuffetPriceLevel;
  label: string;
  icon: string;
  /** Gelir çarpanı */
  incomeMult: number;
  /** Taraftar memnuniyeti (− negatif olabilir) */
  happiness: number;
  desc: string;
}

export const BUFFET_PRICE_LEVELS: BuffetPriceTier[] = [
  { id: 'uygun', label: 'Uygun Fiyat', icon: '🟢', incomeMult: 0.85, happiness: 3, desc: 'Taraftar büfeye akar, birim kâr düşer. Memnuniyet +3.' },
  { id: 'normal', label: 'Standart Fiyat', icon: '🟡', incomeMult: 1.0, happiness: 0, desc: 'Dengeli: piyasa fiyatı, nötr memnuniyet.' },
  { id: 'premium', label: 'Premium Menü', icon: '🔴', incomeMult: 1.35, happiness: -3, desc: 'Birim kâr yüksek ama taraftar pahalı bulur. Memnuniyet −3.' },
];

export const BUFFET_PRICE_MAP: Record<BuffetPriceLevel, BuffetPriceTier> =
  BUFFET_PRICE_LEVELS.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<BuffetPriceLevel, BuffetPriceTier>);

/* ── DURUM ── */
export function defaultBuffetState(): BuffetState {
  return {
    sponsorId: null,
    sponsorWeeksLeft: 0,
    sponsorEarned: 0,
    revenueTotal: 0,
    menu: [],
    priceLevel: 'normal',
  };
}

/** Eski kayıtlardan/eksik alanlardan güvenli durum üretir */
export function normalizeBuffetState(raw?: Partial<BuffetState> | null): BuffetState {
  const def = defaultBuffetState();
  if (!raw) return def;
  const priceLevel: BuffetPriceLevel =
    raw.priceLevel === 'uygun' || raw.priceLevel === 'premium' || raw.priceLevel === 'normal' ? raw.priceLevel : 'normal';
  return {
    sponsorId: raw.sponsorId && BUFFET_SPONSOR_MAP[raw.sponsorId] ? raw.sponsorId : null,
    sponsorWeeksLeft: Math.max(0, Math.floor(Number(raw.sponsorWeeksLeft) || 0)),
    sponsorEarned: Math.max(0, Number(raw.sponsorEarned) || 0),
    revenueTotal: Math.max(0, Number(raw.revenueTotal) || 0),
    menu: Array.isArray(raw.menu) ? raw.menu.filter(id => !!BUFFET_MENU_MAP[id]) : [],
    priceLevel,
  };
}

/** Açık menü ürünlerinin taraftar başına toplam katkısı */
export function buffetMenuIncome(menu: string[]): number {
  return menu.reduce((sum, id) => sum + (BUFFET_MENU_MAP[id]?.perFan ?? 0), 0);
}

/** Açık menü ürünlerinin memnuniyet katkısı */
export function buffetMenuHappiness(menu: string[]): number {
  return menu.reduce((sum, id) => sum + (BUFFET_MENU_MAP[id]?.happiness ?? 0), 0);
}

/** Sözleşmeyi bozma cezası (kalan hafta primi) */
export function buffetBreakFee(brand: BuffetSponsor, weeksLeft: number, attendanceEstimate = 18000): number {
  const perMatch = brand.perFan * attendanceEstimate;
  return Math.round(perMatch * Math.max(0, weeksLeft) * brand.breakFeeFactor);
}

export interface SignCheck {
  ok: boolean;
  reasons: string[];
}

/** Marka sözleşmesi imzalanabilir mi? (büfe seviyesi + taraftar mutluluğu) */
export function canSignBuffetSponsor(gameState: GameState, brand: BuffetSponsor): SignCheck {
  const buffetLevel = gameState.stadium?.facilities?.buffet ?? 0;
  const happiness = gameState.fanHappiness ?? 60;
  const reasons: string[] = [];
  if (buffetLevel < brand.minBuffetLevel) {
    reasons.push(`Büfe seviyesi ${brand.minBuffetLevel} olmalı (şu an ${buffetLevel})`);
  }
  if (happiness < brand.minFanHappiness) {
    reasons.push(`Taraftar mutluluğu ${brand.minFanHappiness} olmalı (şu an ${Math.round(happiness)})`);
  }
  const current = gameState.stadium?.buffet?.sponsorId;
  const weeksLeft = gameState.stadium?.buffet?.sponsorWeeksLeft ?? 0;
  if (current === brand.id) {
    reasons.push('Bu marka zaten büfenin sponsoru');
  } else if (current && weeksLeft > 0) {
    const other = BUFFET_SPONSOR_MAP[current];
    reasons.push(`Önce ${other?.name ?? 'mevcut'} sözleşmesini feshet (ceza ödenir)`);
  }
  return { ok: reasons.length === 0, reasons };
}
