import { PitchPattern, RoofStyle, StandStyle, StadiumDesign } from '../../types/game';

/** Forma seti — 3D oyuncuların kıyafet renkleri */
export interface Kit {
  shirt: string;
  shorts: string;
  socks: string;
  shoes: string;
  /** Kaleci forması (takımdan farklı, parlak) */
  gk: string;
}

/** Maçın oynanacağı 3D stat */
export interface Venue {
  name: string;
  city: string;
  design: StadiumDesign;
  capacity: number;
  night: boolean;
  kit: Kit;
}

/** Deterministik hash — aynı rakip her zaman aynı stadyumda oynar */
export function hashText(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], h: number, salt: number): T {
  const idx = Math.abs(h ^ Math.imul(salt + 1, 2654435761)) % arr.length;
  return arr[idx];
}

function rand01(h: number, salt: number): number {
  const v = Math.abs(Math.imul(h ^ (salt + 7) * 40503, 2246822519)) % 100000;
  return v / 100000;
}

/** Göreli parlaklık — iki renk çakışıyor mu diye bakmak için */
export function luminance(hex: string): number {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** İki renk birbirine çok mu yakın? (forma çakışmasını önlemek için) */
export function similarColor(a: string, b: string): boolean {
  const pa = a.replace('#', '');
  const pb = b.replace('#', '');
  const ra = parseInt(pa.slice(0, 2), 16), ga = parseInt(pa.slice(2, 4), 16), ba = parseInt(pa.slice(4, 6), 16);
  const rb = parseInt(pb.slice(0, 2), 16), gb = parseInt(pb.slice(2, 4), 16), bb = parseInt(pb.slice(4, 6), 16);
  const dist = Math.sqrt((ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2);
  return dist < 70;
}

const SEAT_PALETTE = [
  '#dc2626', '#1d4ed8', '#059669', '#f59e0b', '#7c3aed', '#0f172a',
  '#e11d48', '#0891b2', '#65a30d', '#9333ea', '#b91c1c', '#1e40af',
  '#0d9488', '#c2410c', '#4338ca', '#be123c'
] as const;

const ACCENT_PALETTE = ['#f8fafc', '#facc15', '#111827', '#38bdf8', '#f472b6', '#34d399', '#fb923c', '#e2e8f0'] as const;

const SHIRT_PALETTE = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#111827',
  '#facc15', '#ec4899', '#14b8a6', '#f8fafc', '#8b5cf6', '#0ea5e9'
] as const;

const GK_PALETTE = ['#facc15', '#22c55e', '#f97316', '#38bdf8', '#a3e635', '#fb7185'] as const;

const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Trabzon', 'Kayseri', 'Samsun', 'Eskişehir', 'Malatya', 'Denizli', 'Mersin', 'Rize',
  'Diyarbakır', 'Sivas', 'Erzurum', 'Hatay', 'Aydın', 'Muğla', 'Kocaeli', 'Van'
] as const;

const VENUE_KINDS = ['Şehir Stadyumu', 'Arena', 'Stadyumu', 'Spor Kompleksi', 'Park Stadyumu'] as const;

const ROOFS: RoofStyle[] = ['none', 'canopy', 'full', 'glass'];
const STANDS: StandStyle[] = ['classic', 'stepped', 'double', 'bowl'];
const PATTERNS: PitchPattern[] = ['stripes', 'rings', 'plain'];

/** Ev sahibi: oyuncunun kendi stadyumu (Stadyum sekmesindeki tasarım birebir kullanılır) */
export function homeVenue(opts: {
  teamName: string;
  design: StadiumDesign;
  capacity: number;
  city?: string;
  night?: boolean;
}): Venue {
  const seat = opts.design.seatColor;
  return {
    name: `${opts.teamName} Arena`,
    city: opts.city ?? 'İstanbul',
    design: opts.design,
    capacity: opts.capacity,
    night: opts.night ?? false,
    kit: kitFrom(seat, opts.design.accentColor, hashText(opts.teamName), undefined)
  };
}

/** Deplasman: rakibe özgü, her seferinde farklı ama tutarlı rastgele bir stat */
export function awayVenue(opponentName: string, season = 1, avoidShirt?: string): Venue {
  const h = hashText(`${opponentName}|${season}`);
  const city = pick(CITIES, h, 1);
  const seatColor = pick(SEAT_PALETTE, h, 2);
  const accentColor = pick(ACCENT_PALETTE, h, 3);
  const roof = pick(ROOFS, h, 4);
  const stands = pick(STANDS, h, 5);
  const pitchPattern = pick(PATTERNS, h, 6);
  const capacity = Math.round((14000 + rand01(h, 7) * 46000) / 500) * 500;
  const night = rand01(h, 8) < 0.45;

  let shirt = pick(SHIRT_PALETTE, h, 9);
  // Ev sahibi formasıyla çakışmasın
  let guard = 0;
  while (avoidShirt && similarColor(shirt, avoidShirt) && guard < SHIRT_PALETTE.length) {
    shirt = SHIRT_PALETTE[(SHIRT_PALETTE.indexOf(shirt) + 1 + guard) % SHIRT_PALETTE.length];
    guard++;
  }

  return {
    name: `${city} ${pick(VENUE_KINDS, h, 10)}`,
    city,
    design: {
      seatColor,
      accentColor,
      roof,
      stands,
      pitchPattern,
      flags: rand01(h, 11) < 0.6,
      logoOnPitch: rand01(h, 12) < 0.5,
      floodlights: true
    },
    capacity,
    night,
    kit: kitFrom(shirt, accentColor, h, avoidShirt)
  };
}

/** Bir ana renkten tam forma seti üretir */
export function kitFrom(shirt: string, accent: string, h: number, avoidShirt?: string): Kit {
  const bright = luminance(shirt) > 0.55;
  const shorts = bright || similarColor(accent, shirt) ? '#111827' : accent;
  let gk = pick(GK_PALETTE, h, 21);
  let guard = 0;
  while ((similarColor(gk, shirt) || (avoidShirt && similarColor(gk, avoidShirt))) && guard < GK_PALETTE.length) {
    gk = GK_PALETTE[(GK_PALETTE.indexOf(gk) + 1 + guard) % GK_PALETTE.length];
    guard++;
  }
  return {
    shirt,
    shorts,
    socks: shirt,
    shoes: pick(['#0f172a', '#f8fafc', '#facc15', '#22d3ee', '#f43f5e'] as const, h, 22),
    gk
  };
}

/** Rakip takımın forması — rakip adına göre deterministik, ev sahibiyle çakışmaz */
export function opponentKit(name: string, season = 1, avoidShirt?: string): Kit {
  const h = hashText(`${name}|forma|${season}`);
  let shirt = pick(SHIRT_PALETTE, h, 31);
  let guard = 0;
  while (avoidShirt && similarColor(shirt, avoidShirt) && guard < SHIRT_PALETTE.length) {
    shirt = SHIRT_PALETTE[(SHIRT_PALETTE.indexOf(shirt) + 1 + guard) % SHIRT_PALETTE.length];
    guard++;
  }
  return kitFrom(shirt, pick(ACCENT_PALETTE, h, 32), h, avoidShirt);
}

/** Maç öncesi ekranda göstermek için kısa stat bilgisi */
export function venueSummary(v: Venue): string {
  return `${v.name} • ${v.city} • ${v.capacity.toLocaleString()} kapasite`;
}
