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
  country: string;
  flag: string;
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
  { name: 'Kylian Mbappé', role: 'FW', ovr: 96, age: 27, potential: 97, tier: 'world', country: 'Fransa', flag: '🇫🇷', note: 'Dünyanın en hızlı bitiricisi' },
  { name: 'Erling Haaland', role: 'FW', ovr: 95, age: 26, potential: 96, tier: 'world', country: 'Norveç', flag: '🇳🇴', note: 'Ceza sahası canavarı' },
  { name: 'Vinícius Júnior', role: 'FW', ovr: 93, age: 26, potential: 95, tier: 'world', country: 'Brezilya', flag: '🇧🇷', note: 'Kanattan yıldırım' },
  { name: 'Lamine Yamal', role: 'FW', ovr: 91, age: 19, potential: 99, tier: 'world', country: 'İspanya', flag: '🇪🇸', note: 'Tarihin en genç yıldızı' },
  { name: 'Jude Bellingham', role: 'OS', ovr: 91, age: 23, potential: 95, tier: 'world', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'İki yönlü lider' },
  { name: 'Rodri', role: 'OS', ovr: 91, age: 30, potential: 91, tier: 'world', country: 'İspanya', flag: '🇪🇸', note: 'Orta saha beyni' },
  { name: 'Harry Kane', role: 'FW', ovr: 91, age: 33, potential: 91, tier: 'world', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Gol makinesi' },
  { name: 'Mohamed Salah', role: 'FW', ovr: 90, age: 34, potential: 90, tier: 'world', country: 'Mısır', flag: '🇪🇬', note: 'Mısır Kralı' },
  { name: 'Lionel Messi', role: 'FW', ovr: 90, age: 39, potential: 90, tier: 'world', country: 'Arjantin', flag: '🇦🇷', note: 'Keçi 🐐 — son dans' },
  { name: 'Virgil van Dijk', role: 'STP', ovr: 89, age: 35, potential: 89, tier: 'world', country: 'Hollanda', flag: '🇳🇱', note: 'Duvar' },
  { name: 'Thibaut Courtois', role: 'KL', ovr: 89, age: 34, potential: 89, tier: 'world', country: 'Belçika', flag: '🇧🇪', note: 'Refleks uzmanı' },
  { name: 'Kevin De Bruyne', role: 'OS', ovr: 89, age: 35, potential: 89, tier: 'world', country: 'Belçika', flag: '🇧🇪', note: 'Pas ustası' },
  { name: 'Alisson Becker', role: 'KL', ovr: 88, age: 34, potential: 88, tier: 'world', country: 'Brezilya', flag: '🇧🇷', note: 'Ayaklı kaleci' },
  { name: 'Phil Foden', role: 'OS', ovr: 88, age: 26, potential: 92, tier: 'world', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Sessiz katil' },
  { name: 'Bukayo Saka', role: 'FW', ovr: 88, age: 25, potential: 92, tier: 'world', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Kanat motoru' },
  { name: 'Rúben Dias', role: 'STP', ovr: 88, age: 29, potential: 89, tier: 'world', country: 'Portekiz', flag: '🇵🇹', note: 'Savunma organizatörü' },
  { name: 'Federico Valverde', role: 'OS', ovr: 88, age: 28, potential: 90, tier: 'world', country: 'Uruguay', flag: '🇺🇾', note: 'Bitmeyen enerji' },
  { name: 'Cristiano Ronaldo', role: 'FW', ovr: 87, age: 41, potential: 87, tier: 'world', country: 'Portekiz', flag: '🇵🇹', note: 'Efsane — son sezonlar' },
  { name: 'Victor Osimhen', role: 'FW', ovr: 87, age: 28, potential: 89, tier: 'world', country: 'Nijerya', flag: '🇳🇬', note: 'Hava topu kralı' },
  { name: 'Pedri', role: 'OS', ovr: 87, age: 24, potential: 93, tier: 'world', country: 'İspanya', flag: '🇪🇸', note: 'Küçük sihirbaz' },
  { name: 'Gianluigi Donnarumma', role: 'KL', ovr: 87, age: 27, potential: 91, tier: 'world', country: 'İtalya', flag: '🇮🇹', note: 'Dev kaleci' },
  { name: 'Florian Wirtz', role: 'OS', ovr: 87, age: 23, potential: 93, tier: 'world', country: 'Almanya', flag: '🇩🇪', note: 'Alman mühendisi' },
  { name: 'Jamal Musiala', role: 'OS', ovr: 87, age: 23, potential: 93, tier: 'world', country: 'Almanya', flag: '🇩🇪', note: 'Çalım sanatçısı' },
  { name: 'Lautaro Martínez', role: 'FW', ovr: 87, age: 29, potential: 88, tier: 'world', country: 'Arjantin', flag: '🇦🇷', note: 'Boğa' },
  { name: 'Declan Rice', role: 'OS', ovr: 86, age: 27, potential: 89, tier: 'star', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Top çalan' },
  { name: 'Martin Ødegaard', role: 'OS', ovr: 86, age: 27, potential: 90, tier: 'star', country: 'Norveç', flag: '🇳🇴', note: 'Kaptan zekâsı' },
  { name: 'Julián Álvarez', role: 'FW', ovr: 86, age: 26, potential: 90, tier: 'star', country: 'Arjantin', flag: '🇦🇷', note: 'Örümcek' },
  { name: 'Achraf Hakimi', role: 'SB', ovr: 86, age: 28, potential: 88, tier: 'star', country: 'Fas', flag: '🇲🇦', note: 'Uçan bek' },
  { name: 'Bruno Fernandes', role: 'OS', ovr: 86, age: 32, potential: 86, tier: 'star', country: 'Portekiz', flag: '🇵🇹', note: 'Penaltı uzmanı' },
  { name: 'Rodrygo', role: 'FW', ovr: 86, age: 25, potential: 91, tier: 'star', country: 'Brezilya', flag: '🇧🇷', note: 'Büyük maç oyuncusu' },
  { name: 'Alphonso Davies', role: 'SB', ovr: 85, age: 26, potential: 90, tier: 'star', country: 'Kanada', flag: '🇨🇦', note: 'Şimşek' },
  { name: 'Theo Hernández', role: 'SB', ovr: 85, age: 29, potential: 86, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Hücum bek' },
  { name: 'William Saliba', role: 'STP', ovr: 85, age: 25, potential: 91, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Genç stoper' },
  { name: 'Antonio Rüdiger', role: 'STP', ovr: 85, age: 33, potential: 85, tier: 'star', country: 'Almanya', flag: '🇩🇪', note: 'Sert adam' },
  { name: 'Bernardo Silva', role: 'OS', ovr: 85, age: 32, potential: 85, tier: 'star', country: 'Portekiz', flag: '🇵🇹', note: 'Kadife dokunuş' },
  { name: 'Rafael Leão', role: 'FW', ovr: 85, age: 27, potential: 89, tier: 'star', country: 'Portekiz', flag: '🇵🇹', note: 'Kıvrak kanat' },
  { name: 'Éder Militão', role: 'STP', ovr: 84, age: 28, potential: 88, tier: 'star', country: 'Brezilya', flag: '🇧🇷', note: 'Atletik stoper' },
  { name: 'Kai Havertz', role: 'FW', ovr: 84, age: 27, potential: 88, tier: 'star', country: 'Almanya', flag: '🇩🇪', note: 'Çok yönlü forvet' },
  { name: 'Jan Oblak', role: 'KL', ovr: 85, age: 33, potential: 85, tier: 'star', country: 'Slovenya', flag: '🇸🇮', note: 'Kaleci duvarı' },
  { name: 'Trent Alexander-Arnold', role: 'SB', ovr: 86, age: 27, potential: 89, tier: 'star', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Orta ustası bek' },
  { name: 'Nicolò Barella', role: 'OS', ovr: 85, age: 29, potential: 86, tier: 'star', country: 'İtalya', flag: '🇮🇹', note: 'İtalyan motoru' },
  { name: 'Robert Lewandowski', role: 'FW', ovr: 86, age: 37, potential: 86, tier: 'star', country: 'Polonya', flag: '🇵🇱', note: 'Golcülerin golcüsü' },
  { name: 'Arda Güler', role: 'OS', ovr: 87, age: 21, potential: 95, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Milli takımın 10 numarası' },
  { name: 'Hakan Çalhanoğlu', role: 'OS', ovr: 86, age: 32, potential: 86, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Frikik ve penaltı ustası' },
  { name: 'Ferdi Kadıoğlu', role: 'SB', ovr: 82, age: 27, potential: 86, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Çift kanat beki' },
  { name: 'Merih Demiral', role: 'STP', ovr: 82, age: 28, potential: 84, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Sert ve agresif' },
  { name: 'Barış Alper Yılmaz', role: 'FW', ovr: 80, age: 26, potential: 85, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Bitmeyen koşu' },
  { name: 'Kerem Aktürkoğlu', role: 'FW', ovr: 80, age: 28, potential: 83, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Klas vuruşlar' },
  { name: 'Orkun Kökçü', role: 'OS', ovr: 79, age: 26, potential: 85, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Uzaktan şut' },
  { name: 'Uğurcan Çakır', role: 'KL', ovr: 80, age: 30, potential: 82, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Refleks ve liderlik' },
  { name: 'Yusuf Yazıcı', role: 'OS', ovr: 78, age: 29, potential: 82, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Sol ayak sihirbazı' },
  { name: 'Çağlar Söyüncü', role: 'STP', ovr: 78, age: 30, potential: 82, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Hava hakimiyeti' },
  { name: 'Zeki Çelik', role: 'SB', ovr: 77, age: 29, potential: 81, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Tecrübeli bek' },
  { name: 'Altay Bayındır', role: 'KL', ovr: 77, age: 28, potential: 83, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Büyük maç kalecisi' },
  { name: 'Cengiz Ünder', role: 'FW', ovr: 77, age: 29, potential: 80, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Sol kanat' },
  { name: 'Ozan Kabak', role: 'STP', ovr: 77, age: 26, potential: 83, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Genç stoper' },
  { name: 'Kaan Ayhan', role: 'STP', ovr: 76, age: 31, potential: 76, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Çok yönlü defans' },
  { name: 'Aral Şimşir', role: 'OS', ovr: 75, age: 24, potential: 84, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Kreatif orta saha' },
  { name: 'Emre Demir', role: 'OS', ovr: 74, age: 22, potential: 86, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Genç oyun kurucu' },
  { name: 'Berke Özer', role: 'KL', ovr: 74, age: 26, potential: 82, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Genç kaleci' },
  { name: 'Yunus Akgün', role: 'FW', ovr: 76, age: 26, potential: 81, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Kanat forvet' },
  { name: 'João Neves', role: 'OS', ovr: 80, age: 21, potential: 91, tier: 'wonderkid', country: 'Portekiz', flag: '🇵🇹', note: 'Top çalma makinesi' },
  { name: 'Leny Yoro', role: 'STP', ovr: 78, age: 20, potential: 91, tier: 'wonderkid', country: 'Fransa', flag: '🇫🇷', note: 'Uzun boylu stoper' },
  { name: 'Désiré Doué', role: 'FW', ovr: 79, age: 21, potential: 91, tier: 'wonderkid', country: 'Fransa', flag: '🇫🇷', note: 'Yaratıcı kanat' },
  { name: 'Aleksandar Pavlović', role: 'OS', ovr: 78, age: 22, potential: 89, tier: 'wonderkid', country: 'Sırbistan', flag: '🇷🇸', note: 'Derin oyun kurucu' },
  { name: 'Can Uzun', role: 'FW', ovr: 75, age: 20, potential: 88, tier: 'wonderkid', country: 'Türkiye', flag: '🇹🇷', note: 'Türk asıllı genç forvet' },
  { name: 'Arda Ünyay', role: 'STP', ovr: 72, age: 18, potential: 87, tier: 'wonderkid', country: 'Türkiye', flag: '🇹🇷', note: 'Geleceğin stoperi' },
  { name: 'Son Heung-min', role: 'FW', ovr: 88, age: 33, potential: 88, tier: 'world', country: 'Güney Kore', flag: '🇰🇷', note: 'Koreli süperstar — sol ayak füzesi' },
  { name: 'Antoine Griezmann', role: 'FW', ovr: 88, age: 35, potential: 88, tier: 'world', country: 'Fransa', flag: '🇫🇷', note: 'Küçük prens' },
  { name: 'Cole Palmer', role: 'OS', ovr: 86, age: 24, potential: 91, tier: 'star', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Soğukkanlı penaltıcı' },
  { name: 'Alexander Isak', role: 'FW', ovr: 86, age: 26, potential: 89, tier: 'star', country: 'İsveç', flag: '🇸🇪', note: 'İsveç kulesi' },
  { name: 'Khvicha Kvaratskhelia', role: 'FW', ovr: 86, age: 25, potential: 90, tier: 'star', country: 'Gürcistan', flag: '🇬🇪', note: 'Kvaradona' },
  { name: 'Mike Maignan', role: 'KL', ovr: 86, age: 30, potential: 87, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Kartalin gözü' },
  { name: 'Ronald Araújo', role: 'STP', ovr: 86, age: 27, potential: 88, tier: 'star', country: 'Uruguay', flag: '🇺🇾', note: 'Uruguay duvarı' },
  { name: 'Gavi', role: 'OS', ovr: 84, age: 22, potential: 91, tier: 'wonderkid', country: 'İspanya', flag: '🇪🇸', note: 'Barcelona kalbi' },
  { name: 'Ollie Watkins', role: 'FW', ovr: 85, age: 30, potential: 85, tier: 'star', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Premier golcüsü' },
  { name: 'Marcus Rashford', role: 'FW', ovr: 83, age: 28, potential: 86, tier: 'star', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Hızlı kanat' },
  { name: 'Gabriel Martinelli', role: 'FW', ovr: 84, age: 25, potential: 88, tier: 'star', country: 'Brezilya', flag: '🇧🇷', note: 'Brezilya oku' },
  { name: 'Cristian Romero', role: 'STP', ovr: 85, age: 27, potential: 86, tier: 'star', country: 'Arjantin', flag: '🇦🇷', note: 'Agresif kesici' },
  { name: 'Alexis Mac Allister', role: 'OS', ovr: 85, age: 27, potential: 87, tier: 'star', country: 'Arjantin', flag: '🇦🇷', note: 'Dünya şampiyonu' },
  { name: 'Enzo Fernández', role: 'OS', ovr: 84, age: 25, potential: 89, tier: 'star', country: 'Arjantin', flag: '🇦🇷', note: 'Derin oyun kurucu' },
  { name: 'Moisés Caicedo', role: 'OS', ovr: 83, age: 24, potential: 88, tier: 'star', country: 'Ekvador', flag: '🇪🇨', note: 'Top çalma makinesi' },
  { name: 'Dominik Szoboszlai', role: 'OS', ovr: 84, age: 25, potential: 88, tier: 'star', country: 'Macaristan', flag: '🇭🇺', note: 'Frikik canavarı' },
  { name: 'Darwin Núñez', role: 'FW', ovr: 83, age: 27, potential: 86, tier: 'star', country: 'Uruguay', flag: '🇺🇾', note: 'Kaos forveti' },
  { name: 'Luis Díaz', role: 'FW', ovr: 85, age: 29, potential: 85, tier: 'star', country: 'Kolombiya', flag: '🇨🇴', note: 'Kolombiya rüzgarı' },
  { name: 'Victor Gyökeres', role: 'FW', ovr: 86, age: 27, potential: 88, tier: 'star', country: 'İsveç', flag: '🇸🇪', note: 'İsveç gol makinesi' },
  { name: 'Ousmane Dembélé', role: 'FW', ovr: 86, age: 28, potential: 87, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Çift ayaklı sihirbaz' },
  { name: 'Gregor Kobel', role: 'KL', ovr: 84, age: 28, potential: 86, tier: 'star', country: 'İsviçre', flag: '🇨🇭', note: 'Alman duvarı' },
  { name: 'Jeremie Frimpong', role: 'SB', ovr: 84, age: 25, potential: 87, tier: 'star', country: 'Hollanda', flag: '🇳🇱', note: 'Uçan bek' },
  { name: 'Grimaldo', role: 'SB', ovr: 85, age: 30, potential: 85, tier: 'star', country: 'İspanya', flag: '🇪🇸', note: 'Sol ayak füzesi' },
  { name: 'Xavi Simons', role: 'OS', ovr: 85, age: 23, potential: 90, tier: 'wonderkid', country: 'Hollanda', flag: '🇳🇱', note: 'Hollanda elması' },
  { name: 'Randal Kolo Muani', role: 'FW', ovr: 84, age: 27, potential: 86, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Fransız oku' },
  { name: 'Mauro Icardi', role: 'FW', ovr: 85, age: 33, potential: 85, tier: 'star', country: 'Arjantin', flag: '🇦🇷', note: 'Aslanın golcüsü' },
  { name: 'Edin Džeko', role: 'FW', ovr: 84, age: 39, potential: 84, tier: 'star', country: 'Bosna Hersek', flag: '🇧🇦', note: 'Boşnak elması' },
  { name: 'Dušan Tadić', role: 'OS', ovr: 83, age: 37, potential: 83, tier: 'star', country: 'Sırbistan', flag: '🇷🇸', note: 'Sırp maestro' },
  { name: 'Fred', role: 'OS', ovr: 84, age: 32, potential: 84, tier: 'star', country: 'Brezilya', flag: '🇧🇷', note: 'Brezilya motoru' },
  { name: 'Hakim Ziyech', role: 'FW', ovr: 82, age: 33, potential: 82, tier: 'star', country: 'Fas', flag: '🇲🇦', note: 'Sol ayak sihirbazı' },
  { name: 'Wilfried Zaha', role: 'FW', ovr: 82, age: 33, potential: 82, tier: 'star', country: 'Fildişi Sahili', flag: '🇨🇮', note: 'Çalım ustası' },
  { name: 'Anderson Talisca', role: 'OS', ovr: 83, age: 31, potential: 83, tier: 'star', country: 'Brezilya', flag: '🇧🇷', note: 'Uzaktan şut füzesi' },
  { name: 'Dries Mertens', role: 'FW', ovr: 83, age: 38, potential: 83, tier: 'star', country: 'Belçika', flag: '🇧🇪', note: 'Küçük şeytan' },
  { name: 'Lucas Torreira', role: 'OS', ovr: 83, age: 30, potential: 83, tier: 'star', country: 'Uruguay', flag: '🇺🇾', note: 'Savaşçı orta saha' },
  { name: 'Davinson Sánchez', role: 'STP', ovr: 82, age: 29, potential: 83, tier: 'star', country: 'Kolombiya', flag: '🇨🇴', note: 'Kolombiya duvarı' },
  { name: 'Sébastien Haller', role: 'FW', ovr: 81, age: 31, potential: 81, tier: 'star', country: 'Fildişi Sahili', flag: '🇨🇮', note: 'Güçlü forvet' },
  { name: 'Michy Batshuayi', role: 'FW', ovr: 80, age: 32, potential: 80, tier: 'turkish', country: 'Belçika', flag: '🇧🇪', note: 'Yarasa adam' },
  { name: 'İrfan Can Kahveci', role: 'OS', ovr: 79, age: 30, potential: 80, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Frikik ustası' },
  { name: 'Sofyan Amrabat', role: 'OS', ovr: 82, age: 29, potential: 82, tier: 'star', country: 'Fas', flag: '🇲🇦', note: 'Fas tankı' },
  { name: 'Sebastian Szymański', role: 'OS', ovr: 80, age: 27, potential: 84, tier: 'star', country: 'Polonya', flag: '🇵🇱', note: 'Polonya maestro' },
  { name: 'Allan Saint-Maximin', role: 'FW', ovr: 81, age: 28, potential: 83, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Çalım canavarı' },
  { name: 'Romain Saïss', role: 'STP', ovr: 79, age: 35, potential: 79, tier: 'star', country: 'Fas', flag: '🇲🇦', note: 'Fas kaptanı' },
  { name: 'Mert Günok', role: 'KL', ovr: 78, age: 36, potential: 78, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Tecrübeli eldiven' },
  { name: 'Abdülkerim Bardakcı', role: 'STP', ovr: 80, age: 31, potential: 80, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Hava topu kralı' },
  { name: 'Ismail Yüksek', role: 'OS', ovr: 78, age: 26, potential: 83, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Dinamik orta saha' },
  { name: 'Salih Özcan', role: 'OS', ovr: 77, age: 27, potential: 82, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Almanya patentli' },
  { name: 'Deniz Undav', role: 'FW', ovr: 79, age: 29, potential: 81, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Almanya doğumlu golcü' },
  { name: 'Kobbie Mainoo', role: 'OS', ovr: 78, age: 21, potential: 91, tier: 'wonderkid', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'United’ın kalbi' },
  { name: 'Rico Lewis', role: 'SB', ovr: 77, age: 21, potential: 89, tier: 'wonderkid', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Çok yönlü bek' },
  { name: 'Alejandro Garnacho', role: 'FW', ovr: 80, age: 21, potential: 91, tier: 'wonderkid', country: 'Arjantin', flag: '🇦🇷', note: 'Arjantin fırtınası' },
  { name: 'Mathys Tel', role: 'FW', ovr: 77, age: 21, potential: 90, tier: 'wonderkid', country: 'Fransa', flag: '🇫🇷', note: 'Fransız hızı' },
  { name: 'Kenan Yıldız', role: 'FW', ovr: 85, age: 21, potential: 94, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Juventus yıldızı — tekrar' },
  { name: 'Jobe Bellingham', role: 'OS', ovr: 76, age: 20, potential: 89, tier: 'wonderkid', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Jude’un kardeşi' },
  { name: 'Ethan Nwaneri', role: 'OS', ovr: 74, age: 19, potential: 91, tier: 'wonderkid', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', note: 'Arsenal’ın en genci' },
  { name: 'Pau Cubarsí', role: 'STP', ovr: 80, age: 19, potential: 92, tier: 'wonderkid', country: 'İspanya', flag: '🇪🇸', note: 'Barça stoperi — tekrar' },
  { name: 'Guillaume Restes', role: 'KL', ovr: 76, age: 20, potential: 89, tier: 'wonderkid', country: 'Fransa', flag: '🇫🇷', note: 'Fransız kaleci' },
  { name: 'Antonio Nusa', role: 'FW', ovr: 77, age: 20, potential: 89, tier: 'wonderkid', country: 'Norveç', flag: '🇳🇴', note: 'Norveç kanadı' },
  { name: 'Roony Bardghji', role: 'FW', ovr: 75, age: 19, potential: 88, tier: 'wonderkid', country: 'İsveç', flag: '🇸🇪', note: 'İsveç elması' },
  { name: 'Semih Kılıçsoy', role: 'FW', ovr: 76, age: 21, potential: 89, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Beşiktaş golcüsü — zaten var' },
  { name: 'Yasin Özcan', role: 'STP', ovr: 73, age: 19, potential: 87, tier: 'wonderkid', country: 'Türkiye', flag: '🇹🇷', note: 'Sol ayaklı stoper' },
  { name: 'Emre Can Uzunhan', role: 'STP', ovr: 72, age: 20, potential: 86, tier: 'wonderkid', country: 'Türkiye', flag: '🇹🇷', note: 'Gelecek vaat ediyor' },
  { name: 'Bartuğ Elmaz', role: 'OS', ovr: 71, age: 22, potential: 84, tier: 'turkish', country: 'Türkiye', flag: '🇹🇷', note: 'Dinamik orta saha' },
  { name: 'Federico Chiesa', role: 'FW', ovr: 83, age: 28, potential: 86, tier: 'star', country: 'İtalya', flag: '🇮🇹', note: 'İtalyan oku' },
  { name: 'Alessandro Bastoni', role: 'STP', ovr: 85, age: 27, potential: 89, tier: 'star', country: 'İtalya', flag: '🇮🇹', note: 'Uzun pas ustası' },
  { name: 'Jules Koundé', role: 'STP', ovr: 84, age: 27, potential: 88, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Çok yönlü defans' },
  { name: 'Aurélien Tchouaméni', role: 'OS', ovr: 85, age: 26, potential: 89, tier: 'star', country: 'Fransa', flag: '🇫🇷', note: 'Fizikli orta saha' },
  { name: 'Eduardo Camavinga', role: 'OS', ovr: 84, age: 23, potential: 91, tier: 'wonderkid', country: 'Fransa', flag: '🇫🇷', note: 'Top saklama ustası' },
  { name: 'Endrick', role: 'FW', ovr: 78, age: 20, potential: 92, tier: 'wonderkid', country: 'Brezilya', flag: '🇧🇷', note: 'Real genç golcü — tekrar' },
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
