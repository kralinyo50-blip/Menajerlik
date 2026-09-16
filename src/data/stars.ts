import { PlayerRole } from '../types/game';

export type StarTier = 'world' | 'star' | 'turkish' | 'wonderkid';

export interface StarEntry {
  name: string;
  role: PlayerRole;
  ovr: number;
  age: number;
  potential: number;
  tier: StarTier;
  /** Kısa tanıtım (transfer kartında gösterilir) */
  note: string;
}

export const TIER_INFO: Record<StarTier, {
  label: string;
  icon: string;
  valueMult: number;
  badgeClass: string;
  ringClass: string;
}> = {
  world: {
    label: 'Dünya Yıldızı',
    icon: '🌍',
    valueMult: 1.7,
    badgeClass: 'bg-amber-500 text-black',
    ringClass: 'border-amber-400/70'
  },
  star: {
    label: 'Üst Düzey Yıldız',
    icon: '⭐',
    valueMult: 1.45,
    badgeClass: 'bg-purple-500 text-white',
    ringClass: 'border-purple-400/70'
  },
  turkish: {
    label: 'Milli Yıldız',
    icon: '🇹🇷',
    valueMult: 1.25,
    badgeClass: 'bg-red-600 text-white',
    ringClass: 'border-red-400/70'
  },
  wonderkid: {
    label: 'Genç Yıldız Adayı',
    icon: '✨',
    valueMult: 1.5,
    badgeClass: 'bg-emerald-500 text-black',
    ringClass: 'border-emerald-400/70'
  }
};

/**
 * Bilindik futbolcular — transfer pazarında scout listesine düşer,
 * rakip kulüplerin "yıldız oyuncusu" olarak da sahada karşına çıkar.
 * (Overall/yaş değerleri oyun dengesi için uyarlanmıştır.)
 */
export const STAR_POOL: StarEntry[] = [
  // ── Dünya yıldızları ──
  { name: 'Kylian Mbappé', role: 'FW', ovr: 96, age: 27, potential: 97, tier: 'world', note: 'Dünyanın en hızlı bitiricisi' },
  { name: 'Erling Haaland', role: 'FW', ovr: 95, age: 26, potential: 96, tier: 'world', note: 'Ceza sahası canavarı' },
  { name: 'Vinícius Júnior', role: 'FW', ovr: 93, age: 26, potential: 95, tier: 'world', note: 'Kanattan yıldırım' },
  { name: 'Lamine Yamal', role: 'FW', ovr: 91, age: 19, potential: 99, tier: 'world', note: 'Tarihin en genç yıldızı' },
  { name: 'Jude Bellingham', role: 'OS', ovr: 91, age: 23, potential: 95, tier: 'world', note: 'İki yönlü lider' },
  { name: 'Rodri', role: 'OS', ovr: 91, age: 30, potential: 91, tier: 'world', note: 'Orta saha beyni' },
  { name: 'Harry Kane', role: 'FW', ovr: 91, age: 33, potential: 91, tier: 'world', note: 'Gol makinesi' },
  { name: 'Mohamed Salah', role: 'FW', ovr: 90, age: 34, potential: 90, tier: 'world', note: 'Mısır Kralı' },
  { name: 'Lionel Messi', role: 'FW', ovr: 90, age: 39, potential: 90, tier: 'world', note: 'Keçi 🐐 — son dans' },
  { name: 'Virgil van Dijk', role: 'STP', ovr: 89, age: 35, potential: 89, tier: 'world', note: 'Duvar' },
  { name: 'Thibaut Courtois', role: 'KL', ovr: 89, age: 34, potential: 89, tier: 'world', note: 'Refleks uzmanı' },
  { name: 'Kevin De Bruyne', role: 'OS', ovr: 89, age: 35, potential: 89, tier: 'world', note: 'Pas ustası' },
  { name: 'Alisson Becker', role: 'KL', ovr: 88, age: 34, potential: 88, tier: 'world', note: 'Ayaklı kaleci' },
  { name: 'Phil Foden', role: 'OS', ovr: 88, age: 26, potential: 92, tier: 'world', note: 'Sessiz katil' },
  { name: 'Bukayo Saka', role: 'FW', ovr: 88, age: 25, potential: 92, tier: 'world', note: 'Kanat motoru' },
  { name: 'Rúben Dias', role: 'STP', ovr: 88, age: 29, potential: 89, tier: 'world', note: 'Savunma organizatörü' },
  { name: 'Federico Valverde', role: 'OS', ovr: 88, age: 28, potential: 90, tier: 'world', note: 'Bitmeyen enerji' },
  { name: 'Cristiano Ronaldo', role: 'FW', ovr: 87, age: 41, potential: 87, tier: 'world', note: 'Efsane — son sezonlar' },
  { name: 'Victor Osimhen', role: 'FW', ovr: 87, age: 28, potential: 89, tier: 'world', note: 'Hava topu kralı' },
  { name: 'Pedri', role: 'OS', ovr: 87, age: 24, potential: 93, tier: 'world', note: 'Küçük sihirbaz' },
  { name: 'Gianluigi Donnarumma', role: 'KL', ovr: 87, age: 27, potential: 91, tier: 'world', note: 'Dev kaleci' },
  { name: 'Florian Wirtz', role: 'OS', ovr: 87, age: 23, potential: 93, tier: 'world', note: 'Alman mühendisi' },
  { name: 'Jamal Musiala', role: 'OS', ovr: 87, age: 23, potential: 93, tier: 'world', note: 'Çalım sanatçısı' },
  { name: 'Lautaro Martínez', role: 'FW', ovr: 87, age: 29, potential: 88, tier: 'world', note: 'Boğa' },
  { name: 'Declan Rice', role: 'OS', ovr: 86, age: 27, potential: 89, tier: 'star', note: 'Top çalan' },
  { name: 'Martin Ødegaard', role: 'OS', ovr: 86, age: 27, potential: 90, tier: 'star', note: 'Kaptan zekâsı' },
  { name: 'Julián Álvarez', role: 'FW', ovr: 86, age: 26, potential: 90, tier: 'star', note: 'Örümcek' },
  { name: 'Achraf Hakimi', role: 'SB', ovr: 86, age: 28, potential: 88, tier: 'star', note: 'Uçan bek' },
  { name: 'Bruno Fernandes', role: 'OS', ovr: 86, age: 32, potential: 86, tier: 'star', note: 'Penaltı uzmanı' },
  { name: 'Rodrygo', role: 'FW', ovr: 86, age: 25, potential: 91, tier: 'star', note: 'Büyük maç oyuncusu' },
  { name: 'Alphonso Davies', role: 'SB', ovr: 85, age: 26, potential: 90, tier: 'star', note: 'Şimşek' },
  { name: 'Theo Hernández', role: 'SB', ovr: 85, age: 29, potential: 86, tier: 'star', note: 'Hücum bek' },
  { name: 'William Saliba', role: 'STP', ovr: 85, age: 25, potential: 91, tier: 'star', note: 'Genç stoper' },
  { name: 'Antonio Rüdiger', role: 'STP', ovr: 85, age: 33, potential: 85, tier: 'star', note: 'Sert adam' },
  { name: 'Bernardo Silva', role: 'OS', ovr: 85, age: 32, potential: 85, tier: 'star', note: 'Kadife dokunuş' },
  { name: 'Rafael Leão', role: 'FW', ovr: 85, age: 27, potential: 89, tier: 'star', note: 'Kıvrak kanat' },
  { name: 'Éder Militão', role: 'STP', ovr: 84, age: 28, potential: 88, tier: 'star', note: 'Atletik stoper' },
  { name: 'Neymar Jr', role: 'FW', ovr: 84, age: 34, potential: 84, tier: 'star', note: 'Samba\'nın son temsilcisi' },
  { name: 'Kai Havertz', role: 'FW', ovr: 84, age: 27, potential: 88, tier: 'star', note: 'Çok yönlü forvet' },
  { name: 'Jan Oblak', role: 'KL', ovr: 85, age: 33, potential: 85, tier: 'star', note: 'Kaleci duvarı' },
  { name: 'Trent Alexander-Arnold', role: 'SB', ovr: 86, age: 27, potential: 89, tier: 'star', note: 'Orta ustası bek' },
  { name: 'Nicolò Barella', role: 'OS', ovr: 85, age: 29, potential: 86, tier: 'star', note: 'İtalyan motoru' },
  { name: 'Robert Lewandowski', role: 'FW', ovr: 86, age: 37, potential: 86, tier: 'star', note: 'Golcülerin golcüsü' },

  // ── Milli yıldızlar ──
  { name: 'Arda Güler', role: 'OS', ovr: 87, age: 21, potential: 95, tier: 'turkish', note: 'Milli takımın 10 numarası' },
  { name: 'Kenan Yıldız', role: 'FW', ovr: 85, age: 21, potential: 94, tier: 'turkish', note: 'Juventus\'un genç yıldızı' },
  { name: 'Hakan Çalhanoğlu', role: 'OS', ovr: 86, age: 32, potential: 86, tier: 'turkish', note: 'Frikik ve penaltı ustası' },
  { name: 'Ferdi Kadıoğlu', role: 'SB', ovr: 82, age: 27, potential: 86, tier: 'turkish', note: 'Çift kanat beki' },
  { name: 'Merih Demiral', role: 'STP', ovr: 82, age: 28, potential: 84, tier: 'turkish', note: 'Sert ve agresif' },
  { name: 'Barış Alper Yılmaz', role: 'FW', ovr: 80, age: 26, potential: 85, tier: 'turkish', note: 'Bitmeyen koşu' },
  { name: 'Kerem Aktürkoğlu', role: 'FW', ovr: 80, age: 28, potential: 83, tier: 'turkish', note: 'Klas vuruşlar' },
  { name: 'Orkun Kökçü', role: 'OS', ovr: 79, age: 26, potential: 85, tier: 'turkish', note: 'Uzaktan şut' },
  { name: 'Uğurcan Çakır', role: 'KL', ovr: 80, age: 30, potential: 82, tier: 'turkish', note: 'Refleks ve liderlik' },
  { name: 'Yusuf Yazıcı', role: 'OS', ovr: 78, age: 29, potential: 82, tier: 'turkish', note: 'Sol ayak sihirbazı' },
  { name: 'Çağlar Söyüncü', role: 'STP', ovr: 78, age: 30, potential: 82, tier: 'turkish', note: 'Hava hakimiyeti' },
  { name: 'Zeki Çelik', role: 'SB', ovr: 77, age: 29, potential: 81, tier: 'turkish', note: 'Tecrübeli bek' },
  { name: 'Altay Bayındır', role: 'KL', ovr: 77, age: 28, potential: 83, tier: 'turkish', note: 'Büyük maç kalecisi' },
  { name: 'Cengiz Ünder', role: 'FW', ovr: 77, age: 29, potential: 80, tier: 'turkish', note: 'Sol kanat' },
  { name: 'Ozan Kabak', role: 'STP', ovr: 77, age: 26, potential: 83, tier: 'turkish', note: 'Genç stoper' },
  { name: 'Kaan Ayhan', role: 'STP', ovr: 76, age: 31, potential: 76, tier: 'turkish', note: 'Çok yönlü defans' },
  { name: 'Semih Kılıçsoy', role: 'FW', ovr: 76, age: 21, potential: 89, tier: 'turkish', note: 'Beşiktaş\'ın genç golcüsü' },
  { name: 'Aral Şimşir', role: 'OS', ovr: 75, age: 24, potential: 84, tier: 'turkish', note: 'Kreatif orta saha' },
  { name: 'Emre Demir', role: 'OS', ovr: 74, age: 22, potential: 86, tier: 'turkish', note: 'Genç oyun kurucu' },
  { name: 'Berke Özer', role: 'KL', ovr: 74, age: 26, potential: 82, tier: 'turkish', note: 'Genç kaleci' },
  { name: 'Yunus Akgün', role: 'FW', ovr: 76, age: 26, potential: 81, tier: 'turkish', note: 'Kanat forvet' },

  // ── Genç yıldız adayları ──
  { name: 'Estêvão', role: 'FW', ovr: 79, age: 19, potential: 94, tier: 'wonderkid', note: 'Brezilya\'nın yeni elması' },
  { name: 'Endrick', role: 'FW', ovr: 78, age: 20, potential: 92, tier: 'wonderkid', note: 'Real\'in genç golcüsü' },
  { name: 'Pau Cubarsí', role: 'STP', ovr: 80, age: 19, potential: 92, tier: 'wonderkid', note: 'Barcelona\'nın stoperi' },
  { name: 'Warren Zaïre-Emery', role: 'OS', ovr: 80, age: 20, potential: 92, tier: 'wonderkid', note: 'PSG\'nin motoru' },
  { name: 'João Neves', role: 'OS', ovr: 80, age: 21, potential: 91, tier: 'wonderkid', note: 'Top çalma makinesi' },
  { name: 'Leny Yoro', role: 'STP', ovr: 78, age: 20, potential: 91, tier: 'wonderkid', note: 'Uzun boylu stoper' },
  { name: 'Désiré Doué', role: 'FW', ovr: 79, age: 21, potential: 91, tier: 'wonderkid', note: 'Yaratıcı kanat' },
  { name: 'Aleksandar Pavlović', role: 'OS', ovr: 78, age: 22, potential: 89, tier: 'wonderkid', note: 'Derin oyun kurucu' },
  { name: 'Can Uzun', role: 'FW', ovr: 75, age: 20, potential: 88, tier: 'wonderkid', note: 'Türk asıllı genç forvet' },
  { name: 'Arda Ünyay', role: 'STP', ovr: 72, age: 18, potential: 87, tier: 'wonderkid', note: 'Geleceğin stoperi' },
];

/** Rastgele yıldız seç (tier filtresi + hariç tutulan isimler) */
export function pickStars(count: number, tiers: StarTier[], exclude: string[] = []): StarEntry[] {
  const pool = STAR_POOL.filter(s => tiers.includes(s.tier) && !exclude.includes(s.name));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function starByName(name: string): StarEntry | undefined {
  return STAR_POOL.find(s => s.name === name);
}
