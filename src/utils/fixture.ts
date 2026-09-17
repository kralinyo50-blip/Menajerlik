import { FixtureEntry, Team, Weather } from '../types/game';

/**
 * Çift devreli lig fikstürü üretir (circle method).
 * 10 takım → 9 hafta, ikinci yarı ters saha → toplam 18 hafta.
 * Kullanıcı takımı her hafta 1 maç oynar; iç saha / deplasman dengeli dağılır.
 */
export function generateFixture(userTeam: Team, bots: Team[]): FixtureEntry[] {
  const teams: Team[] = [userTeam, ...bots];
  const n = teams.length;
  if (n < 2) return [];

  const ids = teams.map((_, i) => i);
  const rounds: { a: number; b: number }[][] = [];
  const half = n - 1;
  let list = [...ids];

  for (let r = 0; r < half; r++) {
    const pairs: { a: number; b: number }[] = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push({ a: list[i], b: list[n - 1 - i] });
    }
    rounds.push(pairs);
    // rotate (ilk eleman sabit)
    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop()!);
    list = [fixed, ...rest];
  }

  const userIdx = ids[0];
  const fixture: FixtureEntry[] = [];
  let week = 1;

  // İlk yarı
  rounds.forEach((pairs, roundIdx) => {
    const pair = pairs.find(p => p.a === userIdx || p.b === userIdx);
    if (!pair) return;
    const isHome = pair.a === userIdx ? roundIdx % 2 === 0 : roundIdx % 2 !== 0;
    const oppIdx = pair.a === userIdx ? pair.b : pair.a;
    fixture.push({ ...teams[oppIdx], isHome, week: week++ });
  });

  // İkinci yarı (saha değişir)
  rounds.forEach((pairs, roundIdx) => {
    const pair = pairs.find(p => p.a === userIdx || p.b === userIdx);
    if (!pair) return;
    const firstHalfHome = pair.a === userIdx ? roundIdx % 2 === 0 : roundIdx % 2 !== 0;
    const oppIdx = pair.a === userIdx ? pair.b : pair.a;
    fixture.push({ ...teams[oppIdx], isHome: !firstHalfHome, week: week++ });
  });

  return fixture;
}

/** Lig pozisyonuna göre seyirci & bilet geliri hesabı — yıldızlar tribünü doldurur */
export function calculateAttendance(params: {
  stadiumLvl: number;
  leaguePosition: number;
  fanHappiness: number;
  opponentOvr: number;
  isHome: boolean;
  weather: Weather;
  isCup?: boolean;
  /** Stadyum stüdyosundan gelen ek kapasite (ek koltuklar) */
  capacityBonus?: number;
  /** Bilet fiyat stratejisinin talep etkisi (0.72 … 1.15) */
  demandFactor?: number;
  /** Çatı koruması (kötü havada kaybı azaltır: 1 … 0.96) */
  weatherShield?: number;
  /** Yıldız çekimi: 🌍/⭐/🇹🇷 oyuncular tribünü doldurur (1.0 … 1.32) */
  starFactor?: number;
}): number {
  if (!params.isHome) return 0;

  const capacity = Math.min(90000, params.stadiumLvl * 5000 + 2000 + (params.capacityBonus ?? 0));
  const posFactor = Math.max(0.45, Math.min(1.05, 1.15 - params.leaguePosition * 0.06));
  const fanFactor = 0.55 + (params.fanHappiness / 100) * 0.55;
  // Güçlü rakip ilgi çeker
  const rivalFactor = Math.max(0.85, Math.min(1.15, 0.85 + params.opponentOvr / 400));
  const weatherFactor =
    params.weather === 'rain' || params.weather === 'storm' ? 0.82 :
    params.weather === 'snow' ? 0.75 :
    params.weather === 'fog' ? 0.9 :
    params.weather === 'sunny' ? 1.05 : 1;
  const cupFactor = params.isCup ? 1.12 : 1;

  const attendance = Math.floor(
    capacity * posFactor * fanFactor * rivalFactor * weatherFactor * cupFactor *
    (params.demandFactor ?? 1) * (params.weatherShield ?? 1) * (params.starFactor ?? 1)
  );
  return Math.max(500, Math.min(capacity, attendance));
}

/** Bilet fiyatı — stadyum seviyesiyle hafifçe artar */
export function ticketPrice(stadiumLvl: number): number {
  return 30 + stadiumLvl * 5;
}

/**
 * Deplasman geliri: TV/deplasman payı + rakibin seyirci payı - yol masrafı.
 * İç saha gelirinden düşüktür (gerçekçilik).
 */
export function awayIncome(opponentOvr: number, opponentAttendance: number, stadiumLvl: number): number {
  const tvMoney = 60000;
  const shareMoney = Math.floor(opponentAttendance * ticketPrice(stadiumLvl) * 0.05);
  const travelCost = 20000 + opponentOvr * 300;
  return Math.max(10000, tvMoney + shareMoney - travelCost);
}
