export interface CountryInfo { country: string; flag: string; weight: number }

export const COUNTRIES: CountryInfo[] = [
  { country: 'Türkiye', flag: '🇹🇷', weight: 22 },
  { country: 'Almanya', flag: '🇩🇪', weight: 10 },
  { country: 'Fransa', flag: '🇫🇷', weight: 9 },
  { country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', weight: 9 },
  { country: 'İspanya', flag: '🇪🇸', weight: 9 },
  { country: 'İtalya', flag: '🇮🇹', weight: 8 },
  { country: 'Brezilya', flag: '🇧🇷', weight: 8 },
  { country: 'Arjantin', flag: '🇦🇷', weight: 6 },
  { country: 'Portekiz', flag: '🇵🇹', weight: 6 },
  { country: 'Hollanda', flag: '🇳🇱', weight: 5 },
  { country: 'Belçika', flag: '🇧🇪', weight: 4 },
  { country: 'Hırvatistan', flag: '🇭🇷', weight: 3 },
  { country: 'Sırbistan', flag: '🇷🇸', weight: 3 },
  { country: 'Polonya', flag: '🇵🇱', weight: 3 },
  { country: 'Norveç', flag: '🇳🇴', weight: 2 },
  { country: 'İsveç', flag: '🇸🇪', weight: 2 },
  { country: 'Danimarka', flag: '🇩🇰', weight: 2 },
  { country: 'Fas', flag: '🇲🇦', weight: 3 },
  { country: 'Güney Kore', flag: '🇰🇷', weight: 2 },
  { country: 'Japonya', flag: '🇯🇵', weight: 2 },
  { country: 'Nijerya', flag: '🇳🇬', weight: 2 },
  { country: 'Senegal', flag: '🇸🇳', weight: 2 },
  { country: 'Fildişi Sahili', flag: '🇨🇮', weight: 1 },
  { country: 'Gana', flag: '🇬🇭', weight: 1 },
  { country: 'Kolombiya', flag: '🇨🇴', weight: 2 },
  { country: 'Uruguay', flag: '🇺🇾', weight: 2 },
  { country: 'Şili', flag: '🇨🇱', weight: 1 },
  { country: 'Meksika', flag: '🇲🇽', weight: 2 },
  { country: 'ABD', flag: '🇺🇸', weight: 2 },
  { country: 'Gürcistan', flag: '🇬🇪', weight: 1 },
  { country: 'İsviçre', flag: '🇨🇭', weight: 2 },
  { country: 'Avusturya', flag: '🇦🇹', weight: 2 },
  { country: 'Çekya', flag: '🇨🇿', weight: 1 },
  { country: 'Macaristan', flag: '🇭🇺', weight: 1 },
  { country: 'Yunanistan', flag: '🇬🇷', weight: 1 },
  { country: 'İsrail', flag: '🇮🇱', weight: 1 },
];

let totalWeight = COUNTRIES.reduce((a, c) => a + c.weight, 0);

export function randomCountry(): CountryInfo {
  let r = Math.random() * totalWeight;
  for (const c of COUNTRIES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return COUNTRIES[0];
}
