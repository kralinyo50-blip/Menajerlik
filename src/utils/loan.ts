import { GameState, LoanTarget, LoanOutOffer, Player, PlayerRole, StarTier, Team } from '../types/game';
import { pickStars, STAR_POOL, StarEntry, TIER_INFO } from '../data/stars';
import { playerValue, playerWage } from './pricing';
import { FIRST_NAMES, LAST_NAMES, BOT_NAMES_BY_LEVEL } from '../data/constants';

const genName = () =>
  `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;

const allBots = (): { name: string; logo: string }[] =>
  Object.values(BOT_NAMES_BY_LEVEL).flat();

/** Yıldız havuzundan gelen transfer adayını Player nesnesine çevirir */
export function starToPlayer(entry: StarEntry, id: number, opts?: { markTier?: boolean }): Player {
  const value = playerValue(entry.ovr, entry.age, { tier: entry.tier, potential: entry.potential });
  return {
    id,
    name: `${opts?.markTier ? TIER_INFO[entry.tier].icon + ' ' : ''}${entry.name}`,
    ovr: entry.ovr,
    role: entry.role,
    energy: 100,
    morale: 78,
    goals: 0,
    assists: 0,
    injured: false,
    injuryWeeks: 0,
    age: entry.age,
    potential: entry.potential,
    value,
    wage: playerWage(entry.ovr, entry.tier),
    contract: 3,
    yellowCards: 0,
    redCard: false,
    suspension: 0,
    matchesPlayed: 0,
    form: 6,
    starTier: entry.tier
  };
}

/** Pazar için yıldız oyuncu üretir (fiyat/maaş yeni ekonominin parçası) */
export function buildMarketStars(state: GameState, excludeNames: string[] = []): Player[] {
  const scout = state.scoutLvl || 1;
  const rep = state.managerRep || 50;
  const level = state.leagueLevel || 4;
  const result: Player[] = [];

  // Üst liglere çıkıldıkça ve itibar arttıkça yıldız olasılığı yükselir
  const starChance = 0.28 + (4 - level) * 0.12 + Math.min(0.2, rep / 500) + Math.min(0.15, scout * 0.03);
  const worldChance = 0.06 + (level <= 2 ? 0.12 : 0) + Math.min(0.1, rep / 800) + (state.season - 1) * 0.02;
  const wonderkidChance = 0.3 + Math.min(0.2, (state.academyLevel || 1) * 0.03);

  if (Math.random() < starChance) {
    const [entry] = pickStars(1, ['star'], excludeNames);
    if (entry) result.push(starToPlayer(entry, Date.now() + 900));
  }
  if (Math.random() < worldChance) {
    const [entry] = pickStars(1, ['world'], excludeNames);
    if (entry) result.push(starToPlayer(entry, Date.now() + 901));
  }
  if (Math.random() < starChance * 0.7) {
    const [entry] = pickStars(1, ['turkish'], excludeNames);
    if (entry) result.push(starToPlayer(entry, Date.now() + 902));
  }
  if (Math.random() < wonderkidChance) {
    const [entry] = pickStars(1, ['wonderkid'], excludeNames);
    if (entry) result.push(starToPlayer(entry, Date.now() + 903));
  }
  return result;
}

/** Generic (rastgele) pazar oyuncusu — geniş fiyat aralığı */
export function buildGenericMarketPlayers(state: GameState, count: number): Player[] {
  const base = 52 + (5 - (state.leagueLevel || 4)) * 6 + (state.scoutLvl || 1) * 2;
  const pool: PlayerRole[] = ['KL', 'STP', 'SB', 'OS', 'FW'];
  const list: Player[] = [];
  for (let i = 0; i < count; i++) {
    const role = pool[Math.floor(Math.random() * pool.length)];
    const ovr = Math.max(50, Math.round(base + (Math.random() * 20 - 6)));
    const age = 18 + Math.floor(Math.random() * 16);
    const potential = Math.min(99, ovr + Math.floor(Math.random() * 14));
    list.push({
      id: Date.now() + i,
      name: genName(),
      ovr,
      role,
      energy: 100,
      morale: 75 + Math.floor(Math.random() * 25),
      goals: 0,
      assists: 0,
      injured: false,
      injuryWeeks: 0,
      age,
      potential,
      value: playerValue(ovr, age, { potential }),
      wage: playerWage(ovr),
      contract: 2 + Math.floor(Math.random() * 3),
      yellowCards: 0,
      redCard: false,
      suspension: 0,
      matchesPlayed: 0,
      form: 5 + Math.floor(Math.random() * 4)
    });
  }
  return list;
}

/** Kiralık listesi: rakip kulüplerin oynatmak istemediği yetenekler + oynama süresi isteyen yıldızlar */
export function generateLoanList(state: GameState, count = 5): LoanTarget[] {
  const clubs = allBots();
  const list: LoanTarget[] = [];
  const used: string[] = [];

  // 1) Büyük kulüpte yedek kalan yıldız adayı (yüksek OVR, oynama süresi istiyor)
  const bigClubChance = state.leagueLevel <= 3 ? 1 : Math.random() < 0.6 ? 1 : 0;
  for (let i = 0; i < bigClubChance; i++) {
    const [entry] = pickStars(1, ['world', 'star'], used);
    if (!entry) break;
    used.push(entry.name);
    const club = clubs[Math.floor(Math.random() * clubs.length)];
    const player = starToPlayer(entry, Date.now() + 2000 + i);
    // Kiralıkta oyuncu biraz daha genç/gelişmek isteyen profil
    player.wage = playerWage(entry.ovr, entry.tier);
    list.push({
      id: Date.now() + 2000 + i,
      player,
      fromClub: club.name,
      fromLogo: club.logo,
      loanFee: Math.round(player.value * 0.1),
      wageShare: 0.6 + Math.random() * 0.4,
      untilSeason: state.season,
      optionToBuy: Math.round(player.value * (1.15 + Math.random() * 0.2)),
      note: 'Kadroda yeterli süre bulamıyor, kiralık gitmek istiyor.'
    });
  }

  // 2) Milli yıldız / genç yıldız adayları
  const youthChance = 0.5 + (state.leagueLevel <= 3 ? 0.3 : 0);
  if (Math.random() < youthChance) {
    const [entry] = pickStars(1, ['wonderkid'], used);
    if (entry) {
      used.push(entry.name);
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      const player = starToPlayer(entry, Date.now() + 2100);
      list.push({
        id: Date.now() + 2100,
        player,
        fromClub: club.name,
        fromLogo: club.logo,
        loanFee: Math.round(player.value * 0.06),
        wageShare: 0.35 + Math.random() * 0.4,
        untilSeason: state.season,
        optionToBuy: Math.round(player.value * (1.2 + Math.random() * 0.25)),
        note: 'Genç yetenek, gelişmek için düzenli oynamak istiyor.'
      });
    }
  }

  if (Math.random() < 0.65) {
    const [entry] = pickStars(1, ['turkish'], used);
    if (entry) {
      used.push(entry.name);
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      const player = starToPlayer(entry, Date.now() + 2200);
      list.push({
        id: Date.now() + 2200,
        player,
        fromClub: club.name,
        fromLogo: club.logo,
        loanFee: Math.round(player.value * 0.08),
        wageShare: 0.5 + Math.random() * 0.4,
        untilSeason: state.season,
        optionToBuy: Math.round(player.value * (1.15 + Math.random() * 0.2)),
        note: 'Milli takım kadrosu için düzenli maç istiyor.'
      });
    }
  }

  // 3) Rastgele kulüp oyuncuları (daha ekonomik seçenekler)
  const base = 60 + (5 - (state.leagueLevel || 4)) * 4;
  const roles: PlayerRole[] = ['KL', 'STP', 'SB', 'OS', 'FW'];
  while (list.length < count) {
    const club = clubs[Math.floor(Math.random() * clubs.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const ovr = Math.max(55, Math.round(base + Math.random() * 14));
    const age = 19 + Math.floor(Math.random() * 12);
    const potential = Math.min(99, ovr + 6 + Math.floor(Math.random() * 12));
    const value = playerValue(ovr, age, { potential });
    list.push({
      id: Date.now() + 3000 + list.length,
      player: {
        id: Date.now() + 3000 + list.length,
        name: genName(),
        ovr,
        role,
        energy: 100,
        morale: 76,
        goals: 0,
        assists: 0,
        injured: false,
        injuryWeeks: 0,
        age,
        potential,
        value,
        wage: playerWage(ovr),
        contract: 3,
        yellowCards: 0,
        redCard: false,
        suspension: 0,
        matchesPlayed: 0,
        form: 5
      },
      fromClub: club.name,
      fromLogo: club.logo,
      loanFee: Math.round(value * (0.05 + Math.random() * 0.07)),
      wageShare: 0.4 + Math.random() * 0.5,
      untilSeason: state.season,
      optionToBuy: Math.random() < 0.75 ? Math.round(value * (1.2 + Math.random() * 0.25)) : 0,
      note: 'Rotasyon oyuncusu, kiralık değerlendirilecek.'
    });
  }

  return list;
}

/** Kiralığa gönderilebilecek oyuncular için kulüp teklifleri */
export function generateLoanOutOffers(player: Player, state: GameState): LoanOutOffer[] {
  const clubs = allBots();
  const count = 2 + Math.floor(Math.random() * 2);
  const offers: LoanOutOffer[] = [];
  const usedClubs = new Set<string>();

  for (let i = 0; i < count; i++) {
    let club = clubs[Math.floor(Math.random() * clubs.length)];
    let guard = 0;
    while (usedClubs.has(club.name) && guard < 10) {
      club = clubs[Math.floor(Math.random() * clubs.length)];
      guard++;
    }
    usedClubs.add(club.name);

    // Genç ve potansiyelli oyuncular daha çok ilgi görür
    const youngBonus = player.age <= 22 ? 1.35 : player.age <= 25 ? 1.15 : 0.9;
    const potentialBonus = player.potential > player.ovr ? 1.15 : 1;
    const fee = Math.round(player.value * 0.07 * youngBonus * potentialBonus * (0.8 + Math.random() * 0.6));
    const wageCoverage = Math.min(1, 0.4 + Math.random() * 0.6);

    offers.push({
      id: Date.now() + i,
      playerId: player.id,
      toClub: club.name,
      toLogo: club.logo,
      fee,
      wageCoverage,
      note: player.age <= 22
        ? 'Genç oyuncuya düzenli forma sözü veriyor.'
        : 'Rotasyonda kullanmak istiyor.'
    });
  }

  void state;
  return offers;
}

/** Sezon sonu geri dönen kiralık oyuncu gelişimi */
export function applyLoanGrowth(player: Player, weeks: number, potentialCap = 99): Player {
  const growth = Math.max(1, Math.round(weeks / 6));
  const ovr = Math.min(Math.min(potentialCap, player.potential), player.ovr + growth);
  const nextValue = playerValue(ovr, player.age, { tier: player.starTier, potential: player.potential });
  return {
    ...player,
    ovr,
    value: nextValue,
    matchesPlayed: (player.matchesPlayed ?? 0) + weeks,
    morale: Math.min(100, player.morale + 8),
    form: Math.min(10, (player.form ?? 5) + 1)
  };
}

/** Rakip kulüplere bilindik yıldız atar (sahada karşına çıkarlar) */
export function assignKeyPlayers(league: Team[]): Team[] {
  const withStars = [...league].map(t => ({ ...t }));
  const bots = withStars.filter(t => !t.isUser).sort((a, b) => b.ovr - a.ovr);
  const used = new Set<string>();

  const take = (tiers: StarTier[], minOvr: number, maxOvr: number): StarEntry | undefined => {
    const candidates = STAR_POOL
      .filter(s => tiers.includes(s.tier) && !used.has(s.name) && s.ovr >= minOvr && s.ovr <= maxOvr)
      .sort(() => Math.random() - 0.5);
    if (candidates.length > 0) return candidates[0];
    // kriterlere uyan yoksa kullanılmamış herhangi bir yıldız
    return STAR_POOL.filter(s => !used.has(s.name)).sort(() => Math.random() - 0.5)[0];
  };

  bots.slice(0, 4).forEach((team, i) => {
    // Güçlü takımlara daha büyük yıldız, zayıflara mütevazı isimler
    const tierPref: StarTier[][] = [
      ['world'],
      ['world', 'star'],
      ['star', 'turkish'],
      ['turkish', 'wonderkid'],
    ];
    const ovrRange: [number, number][] = [[88, 99], [84, 92], [78, 88], [70, 84]];
    const entry = take(tierPref[i], ovrRange[i][0], ovrRange[i][1]);
    if (!entry) return;
    used.add(entry.name);
    team.keyPlayer = { name: entry.name, role: entry.role, ovr: entry.ovr, tier: entry.tier };
    team.ovr = Math.min(95, team.ovr + Math.round(entry.ovr * 0.06));
  });

  return withStars;
}
