import { RoofStyle, StandStyle, PitchPattern, StadiumState } from '../types/game';

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
  };
}

/** Tüm seçenekler (ücretsizler dahil) — UI listesi */
export function isUnlocked(stadium: StadiumState, id: string): boolean {
  if (COSMETICS.find(c => c.id === id)?.price === 0) return true;
  return (stadium.cosmetics || []).includes(id);
}
