import { RoofStyle, StandStyle, PitchPattern, StadiumState, StadiumFacilities, StadiumFacilityId, StadiumFacilityDef } from '../types/game';
import { defaultBuffetState } from './buffet';

export interface CosmeticOption {
  id: string;
  /** Set edilecek alan ve değeri */
  field: 'roof' | 'stands' | 'pitchPattern' | 'flags' | 'logoOnPitch' | 'floodlights' | 'vip' | 'color' | 'accent';
  value: string | boolean;
  label: string;
  icon: string;
  price: number;
  desc: string;
}

/** Ücretsiz temel görünüm */
export const FREE_SEAT_COLORS = ['#1d4ed8', '#dc2626', '#059669', '#111827', '#f8fafc', '#f59e0b'];
export const FREE_ACCENT_COLORS = ['#f8fafc', '#111827', '#facc15', '#38bdf8', '#f472b6', '#34d399'];

/** Kilitli (satın alınabilir) özel renkler */
export const PREMIUM_COLORS: { id: string; hex: string; label: string; price: number }[] = [
  { id: 'color:#7c3aed', hex: '#7c3aed', label: 'Mor Efsane', price: 400000 },
  { id: 'color:#06b6d4', hex: '#06b6d4', label: 'Neon Mavi', price: 400000 },
  { id: 'color:#f43f5e', hex: '#f43f5e', label: 'Ateş Kırmızısı', price: 400000 },
  { id: 'color:#84cc16', hex: '#84cc16', label: 'Asit Yeşili', price: 400000 },
  { id: 'color:#eab308', hex: '#eab308', label: 'Altın Tribün', price: 700000 },
  { id: 'color:#f5f5f5', hex: '#f5f5f5', label: 'Kar Beyazı', price: 500000 },
  { id: 'color:#0f172a', hex: '#0f172a', label: 'Gece Siyahı', price: 500000 },
  { id: 'color:#fb7185', hex: '#fb7185', label: 'Pastel Pembe', price: 400000 },
];

export const COSMETICS: CosmeticOption[] = [
  // Çatı
  { id: 'roof:canopy', field: 'roof', value: 'canopy', label: 'Saçak Çatı', icon: '🏠', price: 1200000, desc: 'Ana tribünleri yağmurdan korur, seyirci kaybını azaltır' },
  { id: 'roof:full', field: 'roof', value: 'full', label: 'Tam Çatı', icon: '🏟️', price: 2600000, desc: 'Tüm tribünleri kapatır — kötü havada seyirci düşmez' },
  { id: 'roof:glass', field: 'roof', value: 'glass', label: 'Cam Çatı', icon: '💎', price: 4500000, desc: 'Modern cam kaplama: prestij + tam koruma' },
  // Tribün mimarisi
  { id: 'stands:stepped', field: 'stands', value: 'stepped', label: 'Dik Basamak', icon: '📐', price: 800000, desc: 'Daha dik tribün, daha iyi atmosfer' },
  { id: 'stands:double', field: 'stands', value: 'double', label: 'Çift Katlı', icon: '🏢', price: 2000000, desc: 'İki katlı tribün — büyük kulüp görünümü' },
  { id: 'stands:bowl', field: 'stands', value: 'bowl', label: 'Modern Kase', icon: '🥣', price: 3400000, desc: 'Köşeleri kapalı kase tipi stadyum (en yüksek kapasite hissi)' },
  // Çim
  { id: 'pitch:rings', field: 'pitchPattern', value: 'rings', label: 'Halkalı Çim', icon: '🎯', price: 600000, desc: 'Konsantrik halka desenli çim' },
  { id: 'pitch:plain', field: 'pitchPattern', value: 'plain', label: 'Düz Çim', icon: '🟩', price: 0, desc: 'Klasik düz yeşil zemin' },
  // Detaylar
  { id: 'flags', field: 'flags', value: true, label: 'Tribün Bayrakları', icon: '🚩', price: 450000, desc: 'Tribün üstlerinde dalgalanan bayraklar (+taraftar morali)' },
  { id: 'logoPitch', field: 'logoOnPitch', value: true, label: 'Çimde Kulüp Logosu', icon: '🎨', price: 700000, desc: 'Orta yuvarlakta dev kulüp logosu (+taraftar morali)' },
  { id: 'floodlights', field: 'floodlights', value: true, label: 'Projektör Kuleleri', icon: '💡', price: 0, desc: 'Gece maçları için aydınlatma (standart)' },
  { id: 'vip', field: 'vip', value: true, label: 'VIP Loca & Premium Koltuk', icon: '🥂', price: 3000000, desc: 'Bilet gelirini %12 artırır, seyirciyi biraz azaltır' },
];

/** Kapasite paketleri */
export const CAPACITY_PACKAGES = [
  { id: 'cap1000', seats: 1000, price: 600000, label: '+1.000 Koltuk' },
  { id: 'cap2500', seats: 2500, price: 1400000, label: '+2.500 Koltuk' },
  { id: 'cap5000', seats: 5000, price: 2600000, label: '+5.000 Koltuk' },
  { id: 'cap10000', seats: 10000, price: 4800000, label: '+10.000 Koltuk' },
];

export const MAX_CAPACITY = 90000;

/** Bilet fiyat stratejisi seçenekleri */
export const TICKET_STRATEGIES = [
  { multiplier: 0.75, label: 'Ucuz', icon: '🎟️', desc: 'Stadyum dolar → daha çok büfe harcaması', demandFactor: 1.15 },
  { multiplier: 1, label: 'Normal', icon: '⚖️', desc: 'Dengeli fiyatlandırma', demandFactor: 1 },
  { multiplier: 1.3, label: 'Pahalı', icon: '💎', desc: 'Yüksek birim gelir, biraz boş koltuk', demandFactor: 0.87 },
  { multiplier: 1.6, label: 'Lüks', icon: '👑', desc: 'Maksimum birim gelir ama tribün seyrelir', demandFactor: 0.72 },
];

export const ROOF_LABEL: Record<RoofStyle, string> = {
  none: 'Çatısız',
  canopy: 'Saçak Çatı',
  full: 'Tam Çatı',
  glass: 'Cam Çatı',
};

export const ROOF_PROTECTION: Record<RoofStyle, number> = {
  none: 0,
  canopy: 0.5,
  full: 0.8,
  glass: 0.9,
};

export const STAND_LABEL: Record<StandStyle, string> = {
  classic: 'Klasik Basamak',
  stepped: 'Dik Basamak',
  double: 'Çift Katlı',
  bowl: 'Modern Kase',
};

export const PITCH_LABEL: Record<PitchPattern, string> = {
  stripes: 'Şeritli',
  rings: 'Halkalı',
  plain: 'Düz',
};

export const STADIUM_FACILITY_DEFS: StadiumFacilityDef[] = [
  { id: 'buffet', name: 'Büfe', icon: '🍔', desc: 'Sıcak sosisli, köfte ekmek, patates ve içecek. Her iç saha maçında taraftar başına gelir getirir.', baseCost: 180000, incomePerFan: 4.5, happiness: 2 },
  { id: 'fanShop', name: 'Taraftar Mağazası', icon: '👕', desc: 'Forma, atkı, şapka satışı. Yıldız oyuncularla birlikte satış patlar.', baseCost: 250000, incomePerFan: 5.2, happiness: 3 },
  { id: 'restaurant', name: 'Restoran', icon: '🍽️', desc: 'Maç öncesi/sonrası aile restoranı. VIP ve loca misafirleri için premium gelir.', baseCost: 420000, incomePerFan: 7.0, happiness: 3, boardBonus: 1 },
  { id: 'bar', name: 'Spor Bar', icon: '🍺', desc: 'Maç izleme barı, canlı müzik. Genç taraftarın favorisi.', baseCost: 300000, incomePerFan: 6.0, happiness: 4 },
  { id: 'parking', name: 'Otopark', icon: '🅿️', desc: 'Kapalı otopark ve vale. Seyirciyi artırır, kötü havada bile doluluk sağlar.', baseCost: 350000, incomePerFan: 3.8, happiness: 2 },
  { id: 'toilets', name: 'Tuvalet & Temizlik', icon: '🚻', desc: 'Modern, temiz tuvaletler ve bakım ekibi. Taraftar memnuniyetinin temeli.', baseCost: 150000, incomePerFan: 0.8, happiness: 5 },
  { id: 'security', name: 'Güvenlik & Turnike', icon: '🛡️', desc: 'Hızlı turnikeler, güvenlik kameraları. Kargaşayı azaltır, doluluğu artırır.', baseCost: 200000, incomePerFan: 1.2, happiness: 3, boardBonus: 2 },
  { id: 'ledScreen', name: 'Dev LED Ekran', icon: '📺', desc: 'Skor, tekrar ve reklam ekranı. Sponsor gelirini artırır.', baseCost: 600000, incomePerFan: 2.5, happiness: 4 },
  { id: 'soundSystem', name: 'Ses Sistemi', icon: '🔊', desc: 'Stadyum anons ve müzik sistemi. Atmosferi 2 kat artırır.', baseCost: 280000, incomePerFan: 1.5, happiness: 4 },
  { id: 'museum', name: 'Kulüp Müzesi', icon: '🏛️', desc: 'Kupalar, efsaneler, tarih koridoru. Turist çeker, marka değeri artar.', baseCost: 500000, incomePerFan: 3.0, happiness: 5, boardBonus: 2 },
  { id: 'kidsZone', name: 'Çocuk Alanı', icon: '🎈', desc: 'Çocuk oyun parkı, yüz boyama, maskot. Aile tribününü doldurur.', baseCost: 220000, incomePerFan: 2.8, happiness: 6 },
  { id: 'medicalRoom', name: 'İlk Yardım', icon: '🏥', desc: 'Sağlık odası ve ambulans. Sakatlık riskini azaltır, yönetim güveni artar.', baseCost: 180000, incomePerFan: 0.5, happiness: 2, boardBonus: 3 },
];

export const STADIUM_FACILITY_MAP: Record<StadiumFacilityId, StadiumFacilityDef> = STADIUM_FACILITY_DEFS.reduce((acc, f) => ({ ...acc, [f.id]: f }), {} as Record<StadiumFacilityId, StadiumFacilityDef>);

export function defaultFacilities(): StadiumFacilities {
  return {
    buffet: 0,
    fanShop: 0,
    restaurant: 0,
    bar: 0,
    parking: 0,
    toilets: 1, // başlangıçta 1 seviye tuvalet
    security: 1,
    ledScreen: 0,
    soundSystem: 1,
    museum: 0,
    kidsZone: 0,
    medicalRoom: 0,
  };
}

export function facilityUpgradeCost(id: StadiumFacilityId, level: number): number {
  const def = STADIUM_FACILITY_MAP[id];
  const base = def?.baseCost ?? 200000;
  const lvl = Math.max(0, level);
  return Math.round(base * Math.pow(1.75, lvl) / 1000) * 1000;
}

export function defaultStadium(): StadiumState {
  return {
    design: {
      seatColor: '#1d4ed8',
      accentColor: '#f8fafc',
      roof: 'none',
      stands: 'classic',
      pitchPattern: 'stripes',
      flags: false,
      logoOnPitch: false,
      floodlights: true,
    },
    capacityBonus: 0,
    ticketMultiplier: 1,
    vip: false,
    cosmetics: ['floodlights', 'pitch:plain'],
    tribunes: { north: 1, south: 1, east: 1, west: 1 },
    lastEventIncome: 0,
    facilities: defaultFacilities(),
    // Büfe işletmesi: marka sponsorluğu + menü + fiyat politikası (bkz. data/buffet.ts)
    buffet: defaultBuffetState(),
    facilityIncomeTotal: 0,
    lastFacilityIncome: 0,
  };
}

export const TRIBUNES = [
  { id: 'north' as const, name: 'Kuzey Kale Arkası', icon: '⬆️', desc: 'Genç ve ateşli taraftar, atmosferi ateşler', baseSeats: 2200, pricePerLevel: 650000 },
  { id: 'south' as const, name: 'Güney Kale Arkası', icon: '⬇️', desc: 'Aile tribünü, istikrarlı doluluk', baseSeats: 2200, pricePerLevel: 650000 },
  { id: 'east' as const, name: 'Doğu Maraton', icon: '➡️', desc: 'Ana maraton, TV’ye en yakın', baseSeats: 3200, pricePerLevel: 850000 },
  { id: 'west' as const, name: 'Batı Kapalı (VIP)', icon: '⬅️', desc: 'Kapalı ve VIP’e yakın, yüksek gelir', baseSeats: 3200, pricePerLevel: 900000 },
];

export const STADIUM_EVENTS = [
  { id: 'concert', label: 'Konser', icon: '🎤', income: 180000, desc: 'Hafta içi konser — saha yorulur ama kasa dolar' },
  { id: 'fair', label: 'Fuar', icon: '🏢', desc: 'Endüstri fuarı — düşük gelir, risksiz', income: 90000 },
];

/** Tüm seçenekler (ücretsizler dahil) — UI listesi */
export function isUnlocked(stadium: StadiumState, id: string): boolean {
  if (COSMETICS.find(c => c.id === id)?.price === 0) return true;
  return (stadium.cosmetics || []).includes(id);
}
