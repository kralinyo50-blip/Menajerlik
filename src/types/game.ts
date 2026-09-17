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

export interface Sponsor {
  name: string;
  income: number;
  duration: number;
  desc: string;
  icon: string;
}

export interface Staff {
  id: number;
  type: 'coach' | 'scout' | 'physio' | 'analyst';
  name: string;
  level: number;
  salary: number;
}

export interface Tactics {
  formation: string;
  style: 'balanced' | 'attack' | 'defense' | 'possession';
  pressing: 'low' | 'medium' | 'high';
  tempo: 'slow' | 'normal' | 'fast';
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
  // ── v4.2: Kulüp Kimliği & Müze ──
  clubPhilosophy: ClubPhilosophy;
  ultrasHappiness: number; // 0-100
  ultrasRequests: UltrasRequest[];
  museum: MuseumEntry[];
  pendingPress?: PressConference | null;
  // ── v4.0: Menajerin kendi hayatı ──
  life: ManagerLife;
  // ── v4.1: Sosyal Medya (FutbolX) ──
  socialFeed: SocialPost[];
}

export interface ShopBranchData {
  id: string;
  cityId: number;
  district: string;
  shopType: 'small' | 'medium' | 'large' | 'flagship';
  openedWeek: number;
}

/* ══════════ SOSYAL MEDYA (FIFA tarzı) ══════════ */
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
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'save' | 'chance' | 'foul' | 'injury' | 'substitution' | 'card' | 'penalty' | 'var' | 'info';
  team: 'home' | 'away';
  player?: string;
  description: string;
}
