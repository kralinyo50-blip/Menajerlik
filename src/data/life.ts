import { LifeActivityId, LifeSceneId, LifeStats } from '../types/game';

export interface LifeEffect extends Partial<LifeStats> {
  xp?: number;
}

export interface ActivityVariant {
  id: string;
  label: string;
  icon: string;
  desc: string;
  effect: LifeEffect;
  /** Ekstra masraf (varsa) */
  cost?: number;
}

export interface LifeActivity {
  id: LifeActivityId;
  icon: string;
  label: string;
  desc: string;
  scene: LifeSceneId;
  /** Haftalık toplam haklardan harcanan slot */
  slots: number;
  /** Aktivitenin taban enerji maliyeti */
  energyCost: number;
  /** Haftada en fazla kaç kez */
  maxPerWeek: number;
  /** Gerekli eşya (yoksa serbest) */
  requires?: string;
  /** Aktivitenin taban etkisi */
  effect: LifeEffect;
  /** Peşin masraf (tatile git gibi) */
  cost?: number;
  variants: ActivityVariant[];
}

/** Haftalık toplam aktivite hakkı */
export const LIFE_SLOTS_PER_WEEK = 4;

export const LIFE_ACTIVITIES: LifeActivity[] = [
  {
    id: 'gym',
    icon: '🏋️',
    label: 'Spor Salonu',
    desc: 'Üstünü değiştir, terle ve formda kal. Form, maç kenarındaki performansını ve oyuncuların toparlanmasını artırır.',
    scene: 'gym',
    slots: 1,
    energyCost: 18,
    maxPerWeek: 2,
    requires: 'gymMember',
    effect: { fitness: 8, fun: -2, energy: -6, xp: 12 },
    variants: [
      { id: 'run', label: 'Koşu Bandı', icon: '🏃', desc: 'Kardiyo: form + enerji dengesi iyi', effect: { fitness: 7, energy: -2, xp: 10 } },
      { id: 'lift', label: 'Ağırlık Çalış', icon: '🏋️', desc: 'Kas + prestij: form en yüksek, yorgunluk fazla', effect: { fitness: 10, energy: -8, fame: 1, xp: 14 } },
      { id: 'bike', label: 'Kondisyon Bisikleti', icon: '🚴', desc: 'Yumuşak antrenman: keyif de artar', effect: { fitness: 6, fun: 4, xp: 10 } },
    ],
  },
  {
    id: 'games',
    icon: '🎮',
    label: 'Oyun Oyna',
    desc: 'Konsolun karşısına geç, kafanı boşalt. Keyif (moral) yükselir, takım moraline yansır.',
    scene: 'home',
    slots: 1,
    energyCost: 6,
    maxPerWeek: 3,
    requires: 'console',
    effect: { fun: 16, energy: -4, xp: 6 },
    variants: [
      { id: 'fifa', label: 'Futbol Oyunu', icon: '⚽', desc: 'Taktik gözün keskinleşir', effect: { fun: 14, xp: 10 } },
      { id: 'shooter', label: 'Aksiyon Oyunu', icon: '🎯', desc: 'Stres at, refleks tazele', effect: { fun: 18, energy: -6, xp: 6 } },
      { id: 'managerGame', label: 'Menajerlik Oyunu', icon: '📋', desc: 'İşten kaçış yok: biraz XP', effect: { fun: 12, xp: 18 } },
    ],
  },
  {
    id: 'rest',
    icon: '🛋️',
    label: 'Evde Dinlen',
    desc: 'Kanepeye uzan, enerjini topla. Enerji bu oyunun yakıtı.',
    scene: 'home',
    slots: 1,
    energyCost: 0,
    maxPerWeek: 3,
    effect: { energy: 28, fun: 4, fitness: -2 },
    variants: [
      { id: 'nap', label: 'Kestirme', icon: '😴', desc: 'Enerji en yüksek', effect: { energy: 32, fitness: -1 } },
      { id: 'film', label: 'Film İzle', icon: '🎬', desc: 'Dengeli: enerji + keyif', effect: { energy: 22, fun: 10 } },
      { id: 'family', label: 'Aile Zamanı', icon: '👨‍👩‍👧', desc: 'Keyif yüksek, enerji orta', effect: { energy: 18, fun: 14, fame: 1 } },
    ],
  },
  {
    id: 'goOut',
    icon: '🚶',
    label: 'Şehri Gez',
    desc: 'Dışarı çık, yürü, taraftarla sohbet et. Ünün ve keyfin artar.',
    scene: 'city',
    slots: 1,
    energyCost: 12,
    maxPerWeek: 2,
    effect: { fun: 14, fame: 2, energy: -6, xp: 8 },
    variants: [
      { id: 'walk', label: 'Parkta Yürüyüş', icon: '🌳', desc: 'Sakin ve dinlendirici', effect: { fun: 12, energy: 4 } },
      { id: 'fans', label: 'Taraftarla Buluş', icon: '🤝', desc: 'Ün ve taraftar sevgisi artar', effect: { fun: 10, fame: 5, energy: -8 } },
      { id: 'dinner', label: 'Restoranda Akşam Yemeği', icon: '🍽️', desc: 'Keyif en yüksek, biraz masraf', effect: { fun: 18, fame: 2, energy: -4 }, cost: 250000 },
    ],
  },
  {
    id: 'vacation',
    icon: '🏖️',
    label: 'Tatile Git',
    desc: 'Birkaç gün kafa dinle. Keyif ve ün büyük artar, enerji dolar — ama pahalıdır.',
    scene: 'city',
    slots: 2,
    energyCost: 0,
    maxPerWeek: 1,
    requires: 'car',
    effect: { fun: 34, energy: 18, fame: 3, fitness: -3, xp: 15 },
    cost: 900000,
    variants: [
      { id: 'beach', label: 'Sahilde Tatil', icon: '🏖️', desc: 'Klasik: keyif + enerji maksimum', effect: { fun: 34, energy: 20 } },
      { id: 'mountain', label: 'Dağ Evi', icon: '🏔️', desc: 'Doğa yürüyüşü: keyif + form', effect: { fun: 26, energy: 12, fitness: 4 } },
    ],
  },
  {
    id: 'press',
    icon: '🎤',
    label: 'Basın Toplantısı',
    desc: 'Mikrofonun karşısına geç. Ünün ve taraftar sevgisi artar, ama yorucudur.',
    scene: 'studio',
    slots: 1,
    energyCost: 14,
    maxPerWeek: 2,
    effect: { fame: 7, fun: -6, energy: -6, xp: 14 },
    variants: [
      { id: 'humble', label: 'Mütevazı Açıklama', icon: '🙏', desc: 'Taraftar sevgisi ağır basar', effect: { fame: 5, energy: 2 } },
      { id: 'confident', label: 'İddialı Konuş', icon: '🔥', desc: 'Ün patlaması, ama baskı da artar', effect: { fame: 10, fun: -8, energy: -6 } },
      { id: 'joke', label: 'Esprili Yaklaşım', icon: '😄', desc: 'Keyif de korunur', effect: { fame: 6, fun: 4 } },
    ],
  },
];

export const ACTIVITY_MAP: Record<LifeActivityId, LifeActivity> =
  LIFE_ACTIVITIES.reduce((acc, a) => ({ ...acc, [a.id]: a }), {} as Record<LifeActivityId, LifeActivity>);

export interface LifeItem {
  id: string;
  icon: string;
  label: string;
  price: number;
  desc: string;
  perk: string;
}

export const LIFE_ITEMS: LifeItem[] = [
  { id: 'gymMember', icon: '🎟️', label: 'Spor Salonu Üyeliği', price: 300000, desc: 'Spor salonuna giriş hakkı.', perk: 'Form limiti 60 → 100' },
  { id: 'console', icon: '🎮', label: 'Oyun Konsolu', price: 150000, desc: 'Evde oyun oynayabilirsin.', perk: 'Keyif (moral) yükseltir' },
  { id: 'homeUpgrade', icon: '🛋️', label: 'Ev Konforu Paketi', price: 700000, desc: 'Daha konforlu bir ev: dinlenme kalitesi artar.', perk: 'Dinlenme +8 enerji, keyif limiti +10' },
  { id: 'car', icon: '🚗', label: 'Araba', price: 1600000, desc: 'Şehri gezmek ve tatile gitmek için gerekli.', perk: 'Tatil açılır, gezme keyfi +%25' },
];

/** Aktivite adı → sahne varyantı eşleşmesi (3D sahneler için) — her varyant için ayrı anahtar */
export const ACTIVITY_SCENE_KEY: Record<string, string> = {
  'gym:run': 'gym:run',
  'gym:lift': 'gym:lift',
  'gym:bike': 'gym:bike',
  'games:fifa': 'home:game-fifa',
  'games:shooter': 'home:game-shooter',
  'games:managerGame': 'home:game-manager',
  'rest:nap': 'home:rest-nap',
  'rest:film': 'home:rest-film',
  'rest:family': 'home:rest-family',
  'goOut:walk': 'city:walk',
  'goOut:fans': 'city:fans',
  'goOut:dinner': 'city:dinner',
  'vacation:beach': 'city:beach',
  'vacation:mountain': 'city:mountain',
  'press:humble': 'studio:press-humble',
  'press:confident': 'studio:press-confident',
  'press:joke': 'studio:press-joke',
};

export const SCENE_TITLES: Record<string, { title: string; subtitle: string }> = {
  'gym:run': { title: 'Spor Salonu — Koşu Bandı', subtitle: 'Kardiyo zamanı, menajer formda kalmalı' },
  'gym:lift': { title: 'Spor Salonu — Ağırlık Bölgesi', subtitle: 'Güç çalışması: prestij ve form' },
  'gym:bike': { title: 'Spor Salonu — Kondisyon Bisikleti', subtitle: 'Yumuşak antrenman, kafanı dinle' },
  'home:game-fifa': { title: 'Ev — Futbol Oyunu', subtitle: 'Sanal çimde taktik deniyorsun' },
  'home:game-shooter': { title: 'Ev — Aksiyon Oyunu', subtitle: 'Refleks ve adrenalin zamanı' },
  'home:game-manager': { title: 'Ev — Menajerlik Oyunu', subtitle: 'Ekran başında bile iş düşünüyorsun' },
  'home:rest-nap': { title: 'Ev — Kestirme', subtitle: 'Işıklar kısık, derin bir uyku' },
  'home:rest-film': { title: 'Ev — Film Keyfi', subtitle: 'Patlamış mısır ve perde ışığı' },
  'home:rest-family': { title: 'Ev — Aile Zamanı', subtitle: 'Sıcacık bir aile akşamı' },
  'city:walk': { title: 'Şehir — Parkta Yürüyüş', subtitle: 'Temiz hava, sakin adımlar' },
  'city:fans': { title: 'Şehir — Taraftarla Buluşma', subtitle: 'Atkılar, tezahüratlar ve selfieler' },
  'city:dinner': { title: 'Şehir — Restoran Akşamı', subtitle: 'Mum ışığı ve şehir manzarası' },
  'city:beach': { title: 'Tatil — Sahil', subtitle: 'Dalga sesi, deniz ve huzur' },
  'city:mountain': { title: 'Tatil — Dağ Evi', subtitle: 'Çam ormanları ve temiz dağ havası' },
  'studio:press-humble': { title: 'Basın — Mütevazı Açıklama', subtitle: 'Sakin ve alçakgönüllü bir ton' },
  'studio:press-confident': { title: 'Basın — İddialı Konuşma', subtitle: 'Flaşlar patlıyor, meydan okuyorsun' },
  'studio:press-joke': { title: 'Basın — Esprili Yaklaşım', subtitle: 'Gülüşmeler, rahat bir ortam' },
};
