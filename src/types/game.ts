// Game Types

export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'wind' | 'fog';

/* ══════════ STADYUM STÜDYOSU (3D) ══════════ */
export type RoofStyle = 'none' | 'canopy' | 'full' | 'glass';
export type StandStyle = 'classic' | 'stepped' | 'double' | 'bowl';
export type PitchPattern = 'stripes' | 'rings' | 'plain';

export interface StadiumDesign {
  /** Koltuk rengi (tribün ana rengi) */
  seatColor: string;
  /** İkincil renk: çatı kenarı, bayraklar, LED panolar */
  accentColor: string;
  roof: RoofStyle;
  stands: StandStyle;
  pitchPattern: PitchPattern;
  /** Tribün üstü bayraklar */
  flags: boolean;
  /** Çim ortasında kulüp logosu */
  logoOnPitch: boolean;
  /** Projektör direkleri */
  floodlights: boolean;
}

/* ══════════ STADYUM TESİSLERİ — Büfe, Mağaza, Otopark vs (detaylı) ══════════ */
export type StadiumFacilityId =
  | 'buffet'        // Büfe — yiyecek/içecek
  | 'fanShop'       // Taraftar mağazası
  | 'restaurant'    // Restoran
  | 'bar'           // Spor bar
  | 'parking'       // Otopark
  | 'toilets'       // Tuvalet & temizlik
  | 'security'      // Güvenlik & turnike
  | 'ledScreen'     // Dev LED ekran
  | 'soundSystem'   // Ses sistemi
  | 'museum'        // Kulüp müzesi
  | 'kidsZone'      // Çocuk eğlence alanı
  | 'medicalRoom';  // İlk yardım & sağlık

export interface StadiumFacilityDef {
  id: StadiumFacilityId;
  name: string;
  icon: string;
  desc: string;
  baseCost: number;
  incomePerFan: number; // her seyirci başına gelir
  happiness: number;    // seviye başına taraftar mutluluğu
  boardBonus?: number;
}

export interface StadiumFacilities {
  buffet: number;
  fanShop: number;
  restaurant: number;
  bar: number;
  parking: number;
  toilets: number;
  security: number;
  ledScreen: number;
  soundSystem: number;
  museum: number;
  kidsZone: number;
  medicalRoom: number;
}

/** Büfe fiyat politikası */
export type BuffetPriceLevel = 'uygun' | 'normal' | 'premium';

/**
 * Büfe işletmesi (Stadyum → İç Tesisler → Büfe):
 * marka sponsorluğu + menü + fiyat politikası. Marka sözleşmesi bitince
 * (sponsorWeeksLeft = 0) büfe kulübün kendi büfesi olarak devam eder.
 */
export interface BuffetState {
  /** Büfeyi markalayan sponsor marka kimliği (data/buffet.ts) */
  sponsorId: string | null;
  /** Kalan sözleşme haftası */
  sponsorWeeksLeft: number;
  /** Sponsorluktan toplam kazanılan (imza parası dahil) */
  sponsorEarned: number;
  /** Bu büfenin toplam ekstra geliri (istatistik) */
  revenueTotal: number;
  /** Açılan menü ürünleri (data/buffet.ts id listesi) */
  menu: string[];
  /** Fiyat politikası */
  priceLevel: BuffetPriceLevel;
}

export interface StadiumState {
  design: StadiumDesign;
  /** Satın alınan ek koltuklar */
  capacityBonus: number;
  /** Bilet fiyat çarpanı (0.75 ucuz … 1.6 lüks) */
  ticketMultiplier: number;
  /** VIP loca & premium koltuk */
  vip: boolean;
  /** Satın alınmış kozmetikler: 'roof:glass', 'stands:bowl', 'color:#f43f5e' … */
  cosmetics: string[];
  /** Tribün seviyeleri (1-5) — Stadyum İmparatorluğu */
  tribunes?: { north: number; south: number; east: number; west: number };
  /** Son stadyum etkinliği geliri */
  lastEventIncome?: number;
  /** Stadyum içi tesisler (büfe, mağaza, otopark vs) — her biri 0-5 seviye */
  facilities?: StadiumFacilities;
  /** Büfe işletmesi: marka sponsorluğu, menü, fiyat politikası */
  buffet?: BuffetState;
  /** Tesislerden toplam birikmiş gelir */
  facilityIncomeTotal?: number;
  /** Son tesis geliri */
  lastFacilityIncome?: number;
}

/** Rakip kulüp transfer hareketi */
export interface BotTransfer {
  week: number;
  season: number;
  club: string;
  logo: string;
  type: 'in' | 'out';
  playerName: string;
  ovrChange: number;
  fee?: number;
}

/* ══════════ ANTRENMAN KOMPLEKSİ (v4.6) — 3D tesisler ══════════ */
export type FacilityModuleId = 'pitch' | 'gym' | 'recovery' | 'tactics' | 'youth';

/** Haftalık antrenman raporu — tesislerin oyunculara etkisi */
export interface FacilityReport {
  season: number;
  week: number;
  /** Bu hafta tesiste gelişen oyuncu sayısı */
  growth: number;
  /** Gelişen oyuncuların isimleri (kısa liste) */
  grownNames: string[];
  /** Tesis kaynaklı toplam moral artışı */
  morale: number;
  /** Tesis kaynaklı toplam enerji yenilenmesi */
  energy: number;
  /** Rejenerasyon merkezinin önlediği tahmini sakatlık / hızlandırdığı iyileşme */
  injuriesPrevented: number;
  notes: string[];
}

/** 3D antrenman kompleksi modülleri (her biri 1-5 seviye) */
export interface FacilityState {
  /** Antrenman sahası — OVR gelişim hızı */
  pitch: number;
  /** Fitness & kondisyon salonu — enerji + moral */
  gym: number;
  /** Rejenerasyon merkezi — sakatlık önleme + iyileşme */
  recovery: number;
  /** Taktik & analiz merkezi — takım kimyası + maç bonusu */
  tactics: number;
  /** Altyapı sahası & gençlik merkezi — genç gelişimi */
  youth: number;
  /** Son haftalık tesis raporu (UI) */
  lastReport?: FacilityReport | null;
}

/* ══════════ MENAJERİN KENDİ HAYATI (v4.0) ══════════ */
export type LifeActivityId = 'gym' | 'games' | 'rest' | 'goOut' | 'vacation' | 'press';
export type LifeSceneId = 'gym' | 'home' | 'city' | 'studio';

export interface LifeStats {
  /** Haftalık enerji (0-100) — düşerse her şey zorlaşır */
  energy: number;
  /** Form/sağlık (0-100) — maç kenarındaki performansı ve oyuncu toparlanmasını artırır */
  fitness: number;
  /** Keyif/moral (0-100) — takım morali ve transfer pazarlığına yansır */
  fun: number;
  /** Ün (0-100) — sponsor geliri, pazarlık gücü ve taraftar ilişkisi */
  fame: number;
}

export interface LifeLogEntry {
  week: number;
  season: number;
  activityId: LifeActivityId;
  label: string;
  summary: string;
}

export interface ManagerAppearance {
  /** Ten rengi (hex) */
  skin?: string;
  /** Saç rengi (hex) */
  hair?: string;
  /** Antrenman kıyafeti tercihi */
  outfit?: 'club' | 'black';
}

export interface ManagerLife {
  stats: LifeStats;
  /** Bu hafta kullanılan aktivite hakkı */
  actionsUsed: number;
  /** Bu hafta yapılan aktivitelerin sayacı (aktivite başına limit) */
  weekLog: Record<string, number>;
  /** Haftalık sıfırlama takibi */
  lastActionWeek: number;
  /** Satın alınan kişisel eşyalar: gymMember | console | homeUpgrade | car */
  owned: string[];
  /** Son aktivite kayıtları */
  history: LifeLogEntry[];
  /** Menajer görünümü (ten, saç, kıyafet) */
  appearance?: ManagerAppearance;
  /** Düşük performans modu (PC'de FPS için) */
  lowPerf?: boolean;
}

/** Bilindik oyuncu sınıflandırması */
export type StarTier = 'world' | 'star' | 'turkish' | 'wonderkid';

export interface Player {
  id: number;
  name: string;
  ovr: number;
  role: PlayerRole;
  energy: number;
  morale: number;
  goals: number;
  assists: number;
  injured: boolean;
  injuryWeeks: number;
  age: number;
  potential: number;
  value: number;
  wage: number;
  contract: number;
  /** Ülke / bayrak */
  country?: string;
  flag?: string;
  t?: number; // pitch position top %
  l?: number; // pitch position left %
  yellowCards?: number;
  redCard?: boolean;
  /** Kaç maç cezalı (sarı/kırmızı kart birikimi) */
  suspension?: number;
  matchesPlayed?: number;
  form?: number; // 1-10 form rating
  /** Kulüpten ayrılma talebi (moral çok düşükse) */
  wantsOut?: boolean;
  /** Bilindik yıldız sınıfı (varsa değer ve maaş çarpanı alır) */
  starTier?: StarTier;
  /** Kiralık geldiyse hangi kulüpten */
  loanFrom?: string;
  loanFromLogo?: string;
  /** Kiralamanın biteceği sezon */
  loanUntilSeason?: number;
  /** Satın alma opsiyonu fiyatı */
  loanOptionPrice?: number;
  /** Kiralık oyuncunun gerçek maaşı (kulübün ödediği pay hariç) */
  loanBaseWage?: number;
  /** Kiralık giden oyuncunun birikmiş gelişimi */
  loanGrowth?: number;
}

export type PlayerRole = 'KL' | 'STP' | 'SB' | 'OS' | 'FW';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'legend';

export interface Team {
  name: string;
  logo: string;
  o: number; // played
  g: number; // wins
  b: number; // draws
  m: number; // losses
  p: number; // points
  gf: number; // goals for
  ga: number; // goals against
  ovr: number;
  isUser: boolean;
  /** Rakip kulübün bilindik yıldız oyuncusu (varsa) */
  keyPlayer?: { name: string; role: PlayerRole; ovr: number; tier: StarTier };
}

/** Fikstür satırı: rakip + iç saha mı? */
export interface FixtureEntry extends Team {
  isHome: boolean;
  week: number;
}

export interface Match {
  week: number;
  opponent: string;
  opponentLogo: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  weather?: Weather;
  attendance?: number;
  /** Penaltılarla kazanan taraf (kupa) */
  penalties?: string;
}

export interface Investment {
  id: number;
  name: string;
  price: number;
  type: 'stock' | 'gold' | 'realestate' | 'crypto' | 'bond' | 'fx';
  owned: number;
  lastChange: number;
  icon: string;
  basePrice: number;
  history: number[];
  volatility: number; // weekly sigma (0.02 = 2%)
  drift: number; // expected weekly return (0.004 = 0.4%)
  dividendYield: number; // annual dividend / rent / coupon (0.015 = 1.5%)
  risk: 'Düşük' | 'Orta' | 'Yüksek' | 'Çok Yüksek';
  sector: string;
  description: string;
  avgCost: number;
  dividendsEarned: number;
  // Piyasa duyarlılığı için korelasyon katsayısı
  marketBeta?: number;
}

/* ══════════ KREDİ & TEFECİ SİSTEMİ (v2.1) ══════════ */
export interface CreditPackage {
  id: string;
  name: string;
  amount: number; // anapara
  weeks: number; // vade
  interestRate: number; // toplam faiz oranı 0.18 = %18
  weeklyPayment: number; // haftalık taksit
  totalRepayment: number; // toplam geri ödeme
  type: 'bank' | 'shark';
  icon: string;
  description: string;
  requirement?: string; // örn: "Yönetim güveni %45+"
  maxActive?: number;
}

export interface ActiveCredit {
  id: string; // unique instance id
  packageId: string;
  name: string;
  principal: number;
  totalRepayment: number;
  weeklyPayment: number;
  weeksTotal: number;
  weeksLeft: number;
  paidAmount: number;
  interestRate: number;
  type: 'bank' | 'shark';
  takenWeek: number;
  takenSeason: number;
}

/* ══════════ KULÜP KİMLİĞİ & MÜZE (v4.2) ══════════ */
export type ClubPhilosophy = 'youth' | 'money' | 'trophy' | null;

export interface UltrasRequest {
  id: string;
  kind: 'youth' | 'derby' | 'star' | 'cleanSheet';
  text: string;
  deadlineWeek: number;
  deadlineSeason: number;
  reward: string;
  penalty: string;
}

export interface MuseumEntry {
  season: number;
  position: number;
  leagueLevel: number;
  trophies: string[];
  topScorer?: { name: string; goals: number };
  budget: number;
}

export type PressAnswerTone = 'humble' | 'confident' | 'aggressive' | 'neutral';
export interface PressQuestion {
  id: string;
  question: string;
  answers: { tone: PressAnswerTone; label: string; effect: string; }[];
}
export interface PressConference {
  id: string;
  opponent: string;
  wasWin: boolean;
  wasDraw: boolean;
  questions: PressQuestion[];
  answered: number;
}

export type ScoutRegionId = 'balkans' | 'west_eu' | 'south_america' | 'africa' | 'east_eu' | 'asia';
export interface ScoutRegion {
  id: ScoutRegionId;
  name: string;
  flag: string;
  desc: string;
  cost: number;
  weeks: number;
  ovrRange: [number, number];
  potRange: [number, number];
  trait: string;
}
export interface ScoutMission {
  id: string;
  regionId: ScoutRegionId;
  regionName: string;
  weeksLeft: number;
  totalWeeks: number;
  cost: number;
  startedWeek: number;
  startedSeason: number;
}
export interface ScoutReport {
  id: string;
  regionId: ScoutRegionId;
  regionName: string;
  players: Player[];
  generatedWeek: number;
  generatedSeason: number;
}

export type DeviceCategory = 'phone' | 'computer' | 'camera' | 'tablet' | 'console';
export interface Device {
  id: string;
  name: string;
  brand: string;
  category: DeviceCategory;
  price: number;
  quality: number; // 1-100, sosyal medya kalitesi
  camera: number; // 1-100
  performance: number; // 1-100
  icon: string;
  desc: string;
}

export type PCComponentType = 'cpu' | 'gpu' | 'ram' | 'motherboard' | 'storage' | 'psu' | 'case' | 'cooling' | 'monitor';
export interface PCComponent {
  id: string;
  name: string;
  brand: string;
  type: PCComponentType;
  price: number;
  tier: 'giriş' | 'orta' | 'üst' | 'efsane';
  specs: string;
  performance: number; // 1-100
  icon: string;
  power?: number; // watt
}

export interface PCBuild {
  cpu?: PCComponent;
  gpu?: PCComponent;
  ram?: PCComponent;
  motherboard?: PCComponent;
  storage?: PCComponent;
  psu?: PCComponent;
  case?: PCComponent;
  cooling?: PCComponent;
  monitor?: PCComponent;
}

export interface Sponsor {
  name: string;
  income: number;
  duration: number;
  desc: string;
  icon: string;
}

export interface Staff {
  id: number;
  type: 'coach' | 'scout' | 'physio' | 'analyst' | 'agent' | 'fixer' | 'lawyer';
  name: string;
  level: number;
  salary: number;
}

/* ══════════ 🕶️ KARANLIK İŞLER — ŞİKE & RÜŞVET (v5.1) ══════════ */
export interface BribeState {
  /** 'small' = düşük riskli küçük rüşvet, 'big' = yüksek riskli büyük rüşvet */
  tier: 'small' | 'big';
  /** Kaç maç boyunca etkili (şimdilik 1) */
  matchesLeft: number;
}

export interface CorruptionState {
  /** Sıradaki maçta etkili: rakip kaleciye para verildi */
  keeperBribe: BribeState | null;
  /** Sıradaki maçta etkili: hakeme para verildi */
  refBribe: BribeState | null;
  /** Kaç kez yakalandı (3.'de kovulma!) */
  timesCaught: number;
  /** Rüşvetlere toplam harcanan para */
  totalSpent: number;
  /** Şike sayesinde geldiği düşünülen galibiyet sayısı (istatistik) */
  dirtyWins: number;
}

export interface Tactics {
  formation: string;
  style: 'balanced' | 'attack' | 'defense' | 'possession';
  pressing: 'low' | 'medium' | 'high';
  tempo: 'slow' | 'normal' | 'fast';
  /** 5 kaydırıcı — 0-100, ortalama görselde sade bar */
  defensiveLine?: number; // 0 derin, 100 yüksek
  width?: number; // 0 dar, 100 geniş
  creativity?: number; // 0 disiplinli, 100 yaratıcı
  pressingIntensity?: number; // 0 gevşek, 100 şiddetli pres
  tempoValue?: number; // 0 yavaş, 100 hızlı (tempo string ile senkron)
}

export interface CupMatch {
  round: string;
  opponent: Team;
  played: boolean;
  userScore?: number;
  oppScore?: number;
  /** Penaltı atışları sonucu: 'user' | 'opponent' */
  penaltyWinner?: 'user' | 'opponent';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedWeek?: number;
  reward?: number;
}

/** Rakip kulüplerin oyuncularına ait lig istatistiği */
export interface LeagueScorer {
  name: string;
  club: string;
  logo: string;
  goals: number;
  assists: number;
}

/* ══════════ KİRALAMA SİSTEMİ ══════════ */
export interface LoanTarget {
  id: number;
  player: Player;
  fromClub: string;
  fromLogo: string;
  /** Peşin kiralama bedeli */
  loanFee: number;
  /** Karşı kulübün maaştan aldığı pay (0-1) */
  wageShare: number;
  /** Kiralama bitiş sezonu */
  untilSeason: number;
  /** Satın alma opsiyonu (yoksa 0) */
  optionToBuy: number;
  note: string;
}

export interface OutgoingLoan {
  id: number;
  /** Oyuncunun kiralık giderken alınan tam kopyası (geri dönüşte kullanılır) */
  player: Player;
  playerId: number;
  playerName: string;
  playerOvr: number;
  playerRole: PlayerRole;
  playerAge: number;
  toClub: string;
  toLogo: string;
  /** Alınan peşin kiralama bedeli */
  fee: number;
  /** Karşı kulübün maaştan karşıladığı pay (0-1) */
  wageCoverage: number;
  baseWage: number;
  startWeek: number;
  season: number;
  /** Hafta başına biriken gelişim */
  growth: number;
  /** Geri dönüş haftası/sezonu */
  untilSeason: number;
}

/** Kiralığa gönderme teklifi (kulüplerden gelen) */
export interface LoanOutOffer {
  id: number;
  playerId: number;
  toClub: string;
  toLogo: string;
  fee: number;
  wageCoverage: number;
  note: string;
}

/** Rakip kulüpten gelen transfer teklifi */
export interface TransferOffer {
  id: number;
  playerId: number;
  playerName: string;
  playerOvr: number;
  fromClub: string;
  fromLogo: string;
  amount: number;
  week: number;
  expiresWeek: number;
}

/** Maç sonu oyuncu performansı */
export interface PlayerRating {
  playerId: number;
  name: string;
  role: PlayerRole;
  rating: number;
  goals: number;
  assists: number;
  yellow: boolean;
  red: boolean;
  injured: boolean;
}

export interface MatchReport {
  userScore: number;
  oppScore: number;
  opponentName: string;
  opponentLogo: string;
  isHome: boolean;
  weather: Weather;
  attendance: number;
  possession: number;
  shots: { home: number; away: number };
  motm: string;
  ratings: PlayerRating[];
  penaltyWinner?: 'user' | 'opponent';
}

export type TrainingFocus = 'balanced' | 'attack' | 'defense' | 'fitness' | 'youth';

/* ══════════ GÖREV / MİSYON SİSTEMİ ══════════ */
export type MissionMetric =
  | 'wins' | 'goals' | 'cleanSheets' | 'penaltyWins' | 'motm' | 'attendance'
  | 'minigames' | 'transfers' | 'youthPromoted' | 'trophies' | 'unbeatenStreak' | 'budget';

export type MissionType = 'weekly' | 'season' | 'career';

export interface Mission {
  id: string;
  type: MissionType;
  metric: MissionMetric;
  icon: string;
  title: string;
  description: string;
  target: number;
  baseline: number;
  progress: number;
  completed: boolean;
  rewardBudget: number;
  rewardXp: number;
  rewardTokens: number;
  rewardSkillPoint: number;
  expiresWeek?: number;
}

/* ══════════ MENAJER GELİŞİMİ ══════════ */
export type SkillId =
  | 'tactics' | 'motivation' | 'fitness' | 'negotiation'
  | 'scouting' | 'youth' | 'medical' | 'media';

export type SkillTree = Record<SkillId, number>;

/** 🎨 Kullanıcı forması — 3D maçta sahaya yansır */
export interface TeamKit {
  shirt: string;
  shorts: string;
}

export interface GameState {
  teamName: string;
  teamLogo: string;
  team11: Player[];
  bench: Player[];
  league: Team[];
  fixture: FixtureEntry[];
  marketList: Player[];
  week: number;
  season: number;
  budget: number;
  lifetimeSocialEarnings: number;
  weeklySocialEarnings: number;
  lastSocialPayoutWeek: number;
  stadiumLvl: number;
  trainingLvl: number;
  healthLvl: number;
  scoutLvl: number;
  academyLevel: number;
  leagueLevel: number;
  trophies: string[];
  activeSponsor: (Sponsor & { weeksLeft: number }) | null;
  staff: Staff[];
  academyPlayers: Player[];
  matchHistory: Match[];
  clubStats: {
    totalGoals: number;
    totalWins: number;
    totalDraws: number;
    totalLosses: number;
    cupWins: number;
    leagueTitles: number;
    cleanSheets: number;
    penaltiesScored: number;
    minigamesWon: number;
    totalAttendance?: number;
    motmAwards?: number;
    redCards?: number;
    transfers?: number;
    youthPromoted?: number;
    penaltyWins?: number;
    socialEarnings: number;
};
  tactics: Tactics;
  investments: Investment[];
  activeCredits: ActiveCredit[];
  creditScore: number; // 300-850
  cupMatches: CupMatch[];
  cupEliminated: boolean;
  seasonObjective: string;
  managerRep: number;
  news: string[];
  shopBranches: ShopBranchData[];
  difficulty: Difficulty;
  achievements: Achievement[];
  tutorialDone: boolean;
  minigameTokens: number;
  lastSpinWeek: number;
  fanHappiness: number;
  teamChemistry: number;
  boardConfidence: number;
  // ── v3: Kariyer Sistemi ──
  captainId: number | null;
  setPieceTakers: {
    penalty: number | null;
    freekick: number | null;
    corner: number | null;
  };
  trainingFocus: TrainingFocus;
  leagueScorers: LeagueScorer[];
  transferOffers: TransferOffer[];
  weather: Weather;
  soundOn: boolean;
  /** Yönetim kaç kez resmi uyarı verdi */
  boardWarnings: number;
  /** Kariyer sona erdi mi (kovulma) */
  careerOver: boolean;
  careerOverReason: string | null;
  /** Yönetim kurulundan gelen mesajlar */
  boardMessages: string[];
  // ── v3.1: Kariyer & İlerleme ──
  managerXp: number;
  managerLevel: number;
  skillPoints: number;
  skills: SkillTree;
  missions: Mission[];
  /** Günlük giriş ödülü takibi */
  lastPlayedDate: string;
  loginStreak: number;
  /** Son gün gösterilen günlük ödül (modal için) */
  lastDailyReward?: { day: number; budget: number; tokens: number } | null;
  // ── v3.2: Kiralama Sistemi ──
  loanList: LoanTarget[];
  outgoingLoans: OutgoingLoan[];
  // ── v3.3: Stadyum Stüdyosu (3D) ──
  stadium: StadiumState;
  // ── v3.4: Pazar otomatik yenileme & rakip transferleri ──
  lastMarketRefreshWeek: number;
  matchesSinceMarketRefresh: number;
  botTransfers: BotTransfer[];
  // ── v4.6: 3D Antrenman Kompleksi (tesisler) ──
  facility: FacilityState;
  // ── v4.2: Kulüp Kimliği & Müze ──
  clubPhilosophy: ClubPhilosophy;
  ultrasHappiness: number; // 0-100
  ultrasRequests: UltrasRequest[];
  museum: MuseumEntry[];
  pendingPress?: PressConference | null;
  scoutMissions: ScoutMission[];
  scoutReports: ScoutReport[];
  // ── Teknoloji & AVM (v4.5) ──
  devices: Device[];
  activeDeviceId?: string | null;
  pcBuild: PCBuild;
  pcInventory: PCComponent[];
  // ── v4.0: Menajerin kendi hayatı ──
  life: ManagerLife;
  // ── v4.1: Sosyal Medya (FutbolX) ──
  socialFeed: SocialPost[];
  // ── v5.0: Kariyer seviyesi (her 5 maçta 1 seviye, özellikler kademeli açılır) ──
  /** Toplam oynanan maç (lig + kupa). Seviye = 1 + floor(maç / 5) */
  matchesPlayed?: number;
  // ── v5.1: Karanlık İşler (şike & rüşvet) ──
  corruption?: CorruptionState;
  /** 🎨 Forma tasarımcısı: kullanıcı forması (yoksa stadyum koltuk renginden türetilir) */
  kit?: TeamKit;
  /** 📈 Portföy değeri haftalık kapanışları (sparkline, son 24) */
  portfolioHistory?: number[];
  /** 🎰 Kumarhane (seviye 40'ta açılır) */
  casino?: CasinoState;
}

export interface CasinoState {
  /** Kumarhane kasesi — kulüp bütçesinden ayrı */
  balance: number;
  /** Toplam yatırılan bahis */
  wagered: number;
  /** Toplam kazanılan */
  won: number;
  /** Oyun sayısı */
  plays: number;
  /** En büyük tek kazanç */
  biggestWin: number;
  /** Son 12 oyunun sonucu (kasa değişimi) */
  history: number[];
}

export interface ShopBranchData {
  id: string;
  cityId: number;
  district: string;
  shopType: 'small' | 'medium' | 'large' | 'flagship';
  openedWeek: number;
}

/* ══════════ SOSYAL MEDYA (FIFA tarzı) — çok platformlu ══════════ */
export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube';
export type SocialPostType = 'user' | 'bot' | 'match' | 'transfer' | 'news' | 'hype';

export interface SocialPost {
  id: string;
  author: string;
  handle: string;
  logo: string;
  content: string;
  type: SocialPostType;
  week: number;
  season: number;
  likes: number;
  retweets: number;
  comments: number;
  liked: boolean;
  isUser: boolean;
  verified?: boolean;
  image?: string;
  tags?: string[];
  timeAgo: string;
  platform: SocialPlatform;
  views?: number;
  videoId?: string;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'save' | 'chance' | 'foul' | 'injury' | 'substitution' | 'card' | 'penalty' | 'var' | 'info' | 'offside' | 'corner' | 'freekick' | 'tackle' | 'interception' | 'brawl' | 'invader';
  team: 'home' | 'away';
  player?: string;
  description: string;
  xg?: number;
}
