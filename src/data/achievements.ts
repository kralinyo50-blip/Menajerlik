import { Achievement } from '../types/game';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    title: 'İlk Zafer',
    description: 'İlk maçını kazan',
    icon: '🥇',
    unlocked: false,
    reward: 25000
  },
  {
    id: 'hat_trick',
    title: 'Hat-trick',
    description: 'Bir maçta 3+ gol at',
    icon: '🎩',
    unlocked: false,
    reward: 50000
  },
  {
    id: 'clean_sheet',
    title: 'Kale Kilit',
    description: 'İlk clean sheet (0 gol yeme)',
    icon: '🧤',
    unlocked: false,
    reward: 30000
  },
  {
    id: 'first_transfer',
    title: 'Transfer Uzmanı',
    description: 'İlk oyuncunu transfer et',
    icon: '✍️',
    unlocked: false,
    reward: 20000
  },
  {
    id: 'cup_final',
    title: 'Finalist',
    description: 'Kupa finaline çık',
    icon: '🏅',
    unlocked: false,
    reward: 100000
  },
  {
    id: 'cup_win',
    title: 'Kupa Şampiyonu',
    description: 'Kupayı kazan',
    icon: '🏆',
    unlocked: false,
    reward: 250000
  },
  {
    id: 'league_title',
    title: 'Lig Şampiyonu',
    description: 'Ligi 1. bitir',
    icon: '👑',
    unlocked: false,
    reward: 500000
  },
  {
    id: 'promotion',
    title: 'Yükseliş',
    description: 'Üst lige yüksel',
    icon: '📈',
    unlocked: false,
    reward: 200000
  },
  {
    id: 'millionaire',
    title: 'Milyoner',
    description: 'Kasada $5,000,000 biriktir',
    icon: '💰',
    unlocked: false,
    reward: 100000
  },
  {
    id: 'shop_king',
    title: 'Mağaza Kralı',
    description: '3 forma mağazası aç',
    icon: '🏪',
    unlocked: false,
    reward: 75000
  },
  {
    id: 'youth_star',
    title: 'Altyapı Yıldızı',
    description: 'Akademiden oyuncu çıkar',
    icon: '🌟',
    unlocked: false,
    reward: 40000
  },
  {
    id: 'minigame_master',
    title: 'Mini Oyun Ustası',
    description: '10 mini oyun kazan',
    icon: '🎮',
    unlocked: false,
    reward: 50000
  },
  {
    id: 'undefeated',
    title: 'Yenilmez',
    description: 'Sezonda 5 maç üst üste kazan',
    icon: '🔥',
    unlocked: false,
    reward: 150000
  },
  {
    id: 'big_spend',
    title: 'Büyük Hamle',
    description: '$1,000,000+ değerinde oyuncu al',
    icon: '💎',
    unlocked: false,
    reward: 50000
  },
  {
    id: 'facility_max',
    title: 'Modern Kulüp',
    description: 'Her tesisi en az seviye 3 yap',
    icon: '🏟️',
    unlocked: false,
    reward: 100000
  },
  {
    id: 'penalty_king',
    title: 'Penaltı Kralı',
    description: 'Penaltı mini oyununda 5 gol at',
    icon: '⚽',
    unlocked: false,
    reward: 35000
  },
  {
    id: 'season_complete',
    title: 'Sezon Tamam',
    description: 'İlk sezonunu bitir',
    icon: '📅',
    unlocked: false,
    reward: 75000
  },
  {
    id: 'top_scorer',
    title: 'Gol Kralı',
    description: 'Bir oyuncu 15+ gol atsın',
    icon: '🎯',
    unlocked: false,
    reward: 80000
  }
];

export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Kolay',
    icon: '😊',
    desc: 'Yeni başlayanlar için. Daha fazla bütçe, zayıf rakipler.',
    budgetMult: 1.5,
    oppOvrMult: 0.9,
    injuryMult: 0.5,
    incomeMult: 1.3,
    startingBudget: 2000000
  },
  normal: {
    label: 'Normal',
    icon: '⚖️',
    desc: 'Dengeli deneyim. Klasik menajerlik hissi.',
    budgetMult: 1,
    oppOvrMult: 1,
    injuryMult: 1,
    incomeMult: 1,
    startingBudget: 1500000
  },
  hard: {
    label: 'Zor',
    icon: '😰',
    desc: 'Sınırlı bütçe, güçlü rakipler. Gerçekçi.',
    budgetMult: 0.7,
    oppOvrMult: 1.1,
    injuryMult: 1.3,
    incomeMult: 0.85,
    startingBudget: 1000000
  },
  legend: {
    label: 'Efsane',
    icon: '🔥',
    desc: 'Sadece en iyiler için. Acımasız rakipler!',
    budgetMult: 0.5,
    oppOvrMult: 1.2,
    injuryMult: 1.5,
    incomeMult: 0.7,
    startingBudget: 750000
  }
};
