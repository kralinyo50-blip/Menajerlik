import * as THREE from 'three';
import { FacilityModuleId, FacilityState } from '../../types/game';
import { normalizeFacility, FACILITY_MAX_LEVEL } from '../../data/facility';

/* ══════════════════════════════════════════════════════════════
   ANTRENMAN KOMPLEKSİ — düzenli, simetrik prosedürel 3D yerleşim

   Yerleşim planı (kamera kuzeybatıdan bakar):
        🏋️ Fitness        🧊 Rejenerasyon        📊 Analiz
          (-78,-52)          (0,-62)              (+78,-52)
                    ┌──── ANA SAHA ────┐
                    │   (0, 0)         │
                    └──────────────────┘
                        🎓 Altyapı (0,+58)
   Her modül 1-5 seviye: bina/saha büyür, ekipman artar.
   ══════════════════════════════════════════════════════════════ */

const hasDom = typeof document !== 'undefined';

function makeCanvas(w: number, h: number) {
  if (!hasDom) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/* ── Renk paleti (sade: nötr bina + kulüp rengi aksan) ── */
const C = {
  wallDay: 0xd7dde5,
  wallNight: 0x39445a,
  wallAlt: 0xebeff4,
  wallAltNight: 0x44506a,
  roof: 0x2b3442,
  roofNight: 0x1d2432,
  concrete: 0xb9c2cc,
  plaza: 0xc6ccd4,
  plazaNight: 0x39414f,
  steel: 0x8f9aa8,
  dark: 0x323a46,
  turf: 0x3f8f4b,
  turfNight: 0x2f5c38,
  dirt: 0x4a6440,
  dirtNight: 0x25332c,
};

/* ── Saha çimi dokusu — seviye yükseldikçe daha bakımlı ── */
function turfTexture(level: number, withLogo: boolean, logo: string): THREE.Texture | null {
  const canvas = makeCanvas(768, 512);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const W = canvas.width;
  const H = canvas.height;
  const quality = (level - 1) / (FACILITY_MAX_LEVEL - 1);

  ctx.fillStyle = `rgb(64, ${Math.round(134 + quality * 24)}, ${Math.round(74 + quality * 12)})`;
  ctx.fillRect(0, 0, W, H);

  // Kesim şeritleri — düzenli ve net
  const stripes = 10;
  for (let i = 0; i < stripes; i++) {
    if (i % 2 === 0) continue;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + quality * 0.1})`;
    ctx.fillRect((W / stripes) * i, 0, W / stripes, H);
  }
  // Bakımsız saha lekeleri (yalnız düşük seviyede)
  const patches = Math.round((1 - quality) * 16);
  for (let i = 0; i < patches; i++) {
    ctx.fillStyle = `rgba(120, 104, 62, ${0.08 + Math.random() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * W, Math.random() * H, 10 + Math.random() * 26, 6 + Math.random() * 14, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Saha çizgileri
  ctx.strokeStyle = `rgba(255,255,255,${0.55 + quality * 0.4})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.beginPath();
  ctx.moveTo(W / 2, 18);
  ctx.lineTo(W / 2, H - 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
  ctx.stroke();
  if (withLogo) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.font = '78px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(logo || '⚽', W / 2, H / 2);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ── Analiz ekranı dokusu ── */
function screenTexture(accent: string): THREE.Texture | null {
  const canvas = makeCanvas(512, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#060d1a';
  ctx.fillRect(0, 0, 512, 256);
  // Taktik tahtası: yeşil saha + diziliş
  ctx.fillStyle = '#12351f';
  ctx.fillRect(20, 20, 472, 216);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, 452, 196);
  ctx.beginPath(); ctx.moveTo(256, 30); ctx.lineTo(256, 226); ctx.stroke();
  ctx.beginPath(); ctx.arc(256, 128, 34, 0, Math.PI * 2); ctx.stroke();
  // Oyuncu noktaları (4-4-2)
  ctx.fillStyle = accent;
  const dots: [number, number][] = [[80, 70], [80, 128], [80, 186], [170, 100], [170, 160], [330, 100], [330, 160], [430, 70], [430, 128], [430, 186]];
  dots.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('TAKTİK • RAKİP ANALİZİ', 30, 248);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── Skorbord ekranı: skor + dakika + kulüp rengi şerit ── */
function scoreboardTexture(accent: string, clubColor: string): THREE.Texture | null {
  const canvas = makeCanvas(512, 224);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#05080f';
  ctx.fillRect(0, 0, 512, 224);
  // Üst şerit: kulüp renkleri
  ctx.fillStyle = clubColor;
  ctx.fillRect(0, 0, 512, 16);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 16, 512, 6);
  // Ev / deplasman adları
  ctx.fillStyle = 'rgba(226,232,240,0.92)';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('EV SAHİBİ', 24, 74);
  ctx.fillText('MİSAFİR', 326, 74);
  // Skor
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 82px system-ui, sans-serif';
  ctx.fillText('3', 196, 82);
  ctx.fillText('1', 280, 82);
  ctx.fillStyle = accent;
  ctx.fillRect(246, 52, 12, 60);
  // Alt satır: dakika + animasyonlu şerit
  ctx.fillStyle = 'rgba(148,163,184,0.9)';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText("72'   •   ANTRENMAN SAHASI", 24, 176);
  ctx.fillStyle = accent;
  for (let i = 0; i < 26; i++) ctx.fillRect(24 + i * 18, 204, 10, 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ── Gökyüzü gradyanı (gündüz: ufuktan yukarıya, gece: yıldızlı lacivert) ── */
function skyGradientTexture(night: boolean): THREE.Texture | null {
  const canvas = makeCanvas(8, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  if (night) {
    grad.addColorStop(0, '#05070f');
    grad.addColorStop(0.55, '#0d1730');
    grad.addColorStop(1, '#243553');
  } else {
    grad.addColorStop(0, '#2f6fb5');
    grad.addColorStop(0.55, '#84b6e6');
    grad.addColorStop(1, '#d8e9f6');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 256);
  if (night) {
    // Yıldızlar — üst yarıda, sabit dağılım
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * 130;
      const r = Math.random() < 0.85 ? 0.6 : 1.1;
      ctx.beginPath();
      ctx.arc(Math.random() * 8, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── Bina cephesi dokusu: panel derzleri + pencere ızgarası (gece bazıları yanar) ── */
function facadeTexture(wall: number, night: boolean, floors: number, clubColor: string): THREE.Texture | null {
  const canvas = makeCanvas(256, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const base = new THREE.Color(wall);
  ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
  ctx.fillRect(0, 0, 256, 256);

  // Panel derzleri (yatay) — her kat bir şerit
  const rows = Math.max(1, floors);
  const rowH = 256 / rows;
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 2;
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * rowH);
    ctx.lineTo(256, r * rowH);
    ctx.stroke();
  }
  // Düşey derzler
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let c = 1; c < 4; c++) {
    ctx.beginPath();
    ctx.moveTo(c * 64, 0);
    ctx.lineTo(c * 64, 256);
    ctx.stroke();
  }

  // Pencere ızgarası: 4 pencere × kat
  const winW = 40, winH = Math.min(rowH * 0.46, 44);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 18 + c * 58;
      const y = r * rowH + rowH * 0.42 - winH / 2;
      const lit = night && Math.random() < 0.55;
      if (lit) {
        ctx.fillStyle = 'rgba(255, 216, 150, 0.95)';
      } else if (night) {
        ctx.fillStyle = 'rgba(24, 34, 52, 0.95)';
      } else {
        ctx.fillStyle = 'rgba(74, 96, 122, 0.85)';
      }
      ctx.fillRect(x, y, winW, winH);
      // Cam parlaması
      ctx.fillStyle = lit ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)';
      ctx.fillRect(x, y, winW, winH * 0.34);
    }
  }
  // Zemin katı: kulüp rengi şerit
  ctx.fillStyle = clubColor;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, 256 - rowH * 0.28, 256, rowH * 0.28);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* ── Bina tabelası: kulüp logosu + bina adı ── */
function signTexture(text: string, accent: string, logo: string): THREE.Texture | null {
  const canvas = makeCanvas(512, 128);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#0d141f';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.textBaseline = 'middle';
  ctx.font = '54px serif';
  ctx.fillText(logo || '⚽', 24, 66);
  ctx.fillStyle = '#ffffff';
  // Metni tabelaya sığdır (uzun adlar kırpılmasın)
  let size = 40;
  const maxW = 496 - 104;
  do {
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 2;
  } while (size > 16);
  ctx.fillText(text, 104, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ══════════════ Bina yardımcıları ══════════════ */

/**
 * Düzenli görünümlü bina: dokulu cephe (pencere ızgarası) + koyu çatı +
 * kulüp rengi zemin bandı + aksan şeridi + giriş (saçak, basamak, tabela).
 */
function building(opts: {
  w: number; d: number; h: number;
  wall: number; accent: string; clubColor: string;
  night: boolean; floors?: number;
  entrance?: boolean;
  /** Girişteki tabela metni (varsa tabela çizilir) */
  label?: string;
  logo?: string;
}) {
  const { w, d, h, wall, accent, clubColor, night } = opts;
  const floors = Math.max(1, opts.floors ?? 1);
  const g = new THREE.Group();

  // Gövde — pencere ızgaralı cephe dokusu
  const facade = facadeTexture(wall, night, floors, clubColor);
  const shellMat = new THREE.MeshStandardMaterial({
    color: facade ? 0xffffff : wall,
    roughness: 0.7,
    metalness: 0.06,
    emissive: new THREE.Color(night ? 0x1a2234 : 0x000000),
    emissiveIntensity: night ? 0.25 : 0,
  });
  if (facade) {
    shellMat.map = facade;
    // Gece yanan pencereler aynı dokudan parlar
    if (night) shellMat.emissiveMap = facade;
  }
  const shell = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), shellMat);
  shell.position.y = h / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // Koyu çatı kapağı + parapet kenarı
  const roofMat = new THREE.MeshStandardMaterial({ color: night ? C.roofNight : C.roof, roughness: 0.8, metalness: 0.15 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.7, d + 0.7), roofMat);
  roof.position.y = h + 0.35;
  roof.castShadow = true;
  g.add(roof);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 1.0, 0.35, d + 1.0), roofMat);
  parapet.position.y = h + 0.75;
  g.add(parapet);

  // Kulüp rengi zemin bandı (bina oturma bandı)
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.24, 0.6, d + 0.24),
    new THREE.MeshStandardMaterial({ color: clubColor, roughness: 0.6 })
  );
  band.position.y = 0.45;
  g.add(band);

  // Kat ayrım bantları — dokusu olmayan cihazlarda da bina katlı görünür
  if (floors > 1) {
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      roughness: 0.7,
    });
    for (let f = 1; f < floors; f++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(w + 0.26, 0.18, d + 0.26), floorMat);
      line.position.y = f * (h / floors);
      g.add(line);
    }
  }
  // Düşey pilastrlar — cepheye ritim (ön ve iki yan)
  {
    const pilMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent).multiplyScalar(0.92), roughness: 0.6, metalness: 0.1 });
    const pilCount = Math.max(3, Math.round(w / 5));
    for (let i = 0; i < pilCount; i++) {
      const px = -w / 2 + (w / (pilCount - 1)) * i;
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.34, h, 0.34), pilMat);
      pil.position.set(px, h / 2, d / 2 + 0.08);
      pil.castShadow = true;
      g.add(pil);
    }
    const sidePilCount = Math.max(3, Math.round(d / 5));
    for (let i = 0; i < sidePilCount; i++) {
      const pz = -d / 2 + (d / (sidePilCount - 1)) * i;
      [1, -1].forEach(side => {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.34, h, 0.34), pilMat);
        pil.position.set(side * (w / 2 + 0.08), h / 2, pz);
        g.add(pil);
      });
    }
  }

  // Çatı altı aksan şeridi
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.24, 0.4, d + 0.24),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), roughness: 0.55 })
  );
  trim.position.y = h - 0.45;
  g.add(trim);

  if (opts.entrance !== false) {
    const fz = d / 2;
    // Kapı (çift kanat)
    const doorMat = new THREE.MeshStandardMaterial({
      color: night ? 0x1b2432 : 0x2c3948,
      roughness: 0.35,
      metalness: 0.35,
      emissive: new THREE.Color(night ? 0xffd9a0 : 0x0b1220),
      emissiveIntensity: night ? 0.35 : 0.05,
    });
    [-1.35, 1.35].forEach(x => {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.0, 0.25), doorMat);
      leaf.position.set(x, 1.5, fz + 0.12);
      g.add(leaf);
    });
    // Giriş saçağı (kulüp rengi) + iki kolon
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(9, w * 0.5), 0.35, 3),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.5, metalness: 0.2 })
    );
    canopy.position.set(0, 3.7, fz + 1.5);
    canopy.castShadow = true;
    g.add(canopy);
    [-1, 1].forEach(side => {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 3.6, 10),
        new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.55, roughness: 0.4 })
      );
      col.position.set(side * Math.min(3.9, w * 0.22), 1.8, fz + 2.6);
      g.add(col);
    });
    // Giriş basamakları
    const stepMat = new THREE.MeshStandardMaterial({ color: C.concrete, roughness: 0.95 });
    const steps = new THREE.Mesh(new THREE.BoxGeometry(Math.min(10, w * 0.55), 0.22, 2.4), stepMat);
    steps.position.set(0, 0.11, fz + 1.1);
    steps.receiveShadow = true;
    g.add(steps);
    // Tabela — saçak üstünde, logolu
    if (opts.label) {
      const tex = signTexture(opts.label, accent, opts.logo ?? '⚽');
      if (tex) {
        const signMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: tex,
          emissive: new THREE.Color(0xffffff),
          emissiveMap: tex,
          emissiveIntensity: night ? 0.6 : 0.25,
          roughness: 0.5,
        });
        const signW = Math.min(12, w * 0.7);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signW / 4), signMat);
        sign.position.set(0, 4.9, fz + 0.08);
        g.add(sign);
      }
    }
  }
  return g;
}

/** Zemin kaplaması (plaza / beton alan) — katmanlar farklı y'de durur, z-fighting olmaz */
function slab(w: number, d: number, x: number, z: number, color: number, y = 0.012) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

/** Antrenman kuklası — düzenli sıra için */
function dummy(clubColor: string) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.52, 1.75, 14),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.75 })
  );
  body.position.y = 1.15;
  body.castShadow = true;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.7, 0.2, 14),
    new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.9 })
  );
  base.position.y = 0.1;
  g.add(body, base);
  return g;
}

/** Oyuncu figürü — forma (kulüp rengi), şort ve kafa */
function footballer(clubColor: string, skin = 0xd9a06b, shorts = 0x1f2937) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.29, 0.6, 4, 10),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.72 })
  );
  torso.position.y = 1.28;
  torso.castShadow = true;
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.72, 0.28),
    new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.9 })
  );
  legs.position.y = 0.46;
  legs.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 14, 12),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.85 })
  );
  head.position.y = 1.85;
  head.castShadow = true;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x2b2119, roughness: 0.95 })
  );
  hair.position.y = 1.88;
  g.add(torso, legs, head, hair);
  return g;
}

export interface TrainingComplexOptions {
  facility: Partial<FacilityState> | null | undefined;
  clubColor?: string;
  accentColor?: string;
  logo?: string;
  night?: boolean;
  /** Ön izlemede vurgulanan modül */
  highlight?: FacilityModuleId | null;
  wet?: boolean;
}

export interface TrainingComplexBundle {
  group: THREE.Group;
  update: (t: number, dt: number) => void;
  camera: { radius: number; phi: number; theta: number; targetY: number; fov: number };
  sky: string;
  /** Gökyüzü gradyanı dokusu (yıldızlı gece / mavi gündüz) */
  skyTexture?: THREE.Texture | null;
  fog?: [string, number, number];
  levels: Record<FacilityModuleId, number>;
  triCount: () => number;
}

/* ══════════════════════════════════════════════════════════════
   SAHNE
   ══════════════════════════════════════════════════════════════ */
export function buildTrainingComplex(opts: TrainingComplexOptions): TrainingComplexBundle {
  const n = normalizeFacility(opts.facility as Partial<FacilityState>);
  const clubColor = opts.clubColor ?? '#1d4ed8';
  const accent = opts.accentColor ?? '#f8fafc';
  const night = !!opts.night;
  const group = new THREE.Group();

  const flags: THREE.Object3D[] = [];
  const sprinklers: THREE.Object3D[] = [];
  const floodlights: THREE.Object3D[] = [];
  const ledTextures: THREE.Texture[] = [];
  const runners: { fig: THREE.Object3D; angle: number }[] = [];

  const wall = night ? C.wallNight : C.wallDay;
  const wallAlt = night ? C.wallAltNight : C.wallAlt;
  const logo = opts.logo ?? '⚽';

  /* ── Zemin ── */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 420),
    new THREE.MeshStandardMaterial({ color: night ? C.dirtNight : C.dirt, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  group.add(ground);

  /* ── Ana antrenman sahası ── */
  const PITCH_L = 100;
  const PITCH_W = 62;
  group.add(slab(PITCH_L + 14, PITCH_W + 14, 0, 0, night ? 0x2a3f28 : 0x4d6b3c));

  const turfTex = turfTexture(n.pitch, n.pitch >= 4, opts.logo ?? '⚽');
  const turfMat = new THREE.MeshStandardMaterial({
    color: turfTex ? (night ? 0x8a9a86 : 0xffffff) : C.turf,
    roughness: opts.wet ? 0.5 : 0.94,
    metalness: opts.wet ? 0.06 : 0,
  });
  if (turfTex) turfMat.map = turfTex;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PITCH_L, PITCH_W), turfMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.02;
  pitch.receiveShadow = true;
  pitch.userData.previewColor = night ? C.turfNight : C.turf;
  group.add(pitch);

  // Koşu bandı — saha çevresinde tartan pist (yuvarlak köşeli şerit)
  {
    const outer = new THREE.Shape();
    const ow = PITCH_L / 2 + 6.4, od = PITCH_W / 2 + 6.4, orad = 8;
    outer.moveTo(-ow + orad, -od);
    outer.lineTo(ow - orad, -od); outer.quadraticCurveTo(ow, -od, ow, -od + orad);
    outer.lineTo(ow, od - orad); outer.quadraticCurveTo(ow, od, ow - orad, od);
    outer.lineTo(-ow + orad, od); outer.quadraticCurveTo(-ow, od, -ow, od - orad);
    outer.lineTo(-ow, -od + orad); outer.quadraticCurveTo(-ow, -od, -ow + orad, -od);
    const hole = new THREE.Path();
    const iw = PITCH_L / 2 + 2.6, id = PITCH_W / 2 + 2.6, irad = 8;
    hole.moveTo(-iw + irad, -id);
    hole.lineTo(iw - irad, -id); hole.quadraticCurveTo(iw, -id, iw, -id + irad);
    hole.lineTo(iw, id - irad); hole.quadraticCurveTo(iw, id, iw - irad, id);
    hole.lineTo(-iw + irad, id); hole.quadraticCurveTo(-iw, id, -iw, id - irad);
    hole.lineTo(-iw, -id + irad); hole.quadraticCurveTo(-iw, -id, -iw + irad, -id);
    outer.holes.push(hole);
    const track = new THREE.Mesh(
      new THREE.ShapeGeometry(outer),
      new THREE.MeshStandardMaterial({ color: night ? 0x6d3a33 : 0xb35a44, roughness: 0.95 })
    );
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.016;
    track.receiveShadow = true;
    group.add(track);
    // Pist kenar çizgileri
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, transparent: true, opacity: 0.75 });
    [[PITCH_L / 2 + 4.5, PITCH_W / 2 + 4.5], [PITCH_L / 2 + 4.5, -(PITCH_W / 2 + 4.5)], [-(PITCH_L / 2 + 4.5), PITCH_W / 2 + 4.5], [-(PITCH_L / 2 + 4.5), -(PITCH_W / 2 + 4.5)]].forEach(([lx, lz]) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(PITCH_L + 9, 0.35), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.019, lz);
      group.add(line);
      const side = new THREE.Mesh(new THREE.PlaneGeometry(0.35, PITCH_W + 9), lineMat);
      side.rotation.x = -Math.PI / 2;
      side.position.set(lx, 0.019, 0);
      group.add(side);
    });
  }

  // Köşe bayrakları — sahanın 4 köşesi
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5, metalness: 0.2 });
    const flagMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), side: THREE.DoubleSide, roughness: 0.8 });
    ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).forEach(([sx, sz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6), poleMat);
      pole.position.set(sx * (PITCH_L / 2), 1.05, sz * (PITCH_W / 2));
      group.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), flagMat);
      flag.position.set(sx * (PITCH_L / 2) + 0.45, 1.8, sz * (PITCH_W / 2));
      group.add(flag);
    });
  }

  // Kenar kulübeleri: oyuncu bankı + su istasyonu (sahaya bakan, düzenli)
  {
    const benchMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.7 });
    const legMat = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.5, roughness: 0.45 });
    for (let i = 0; i < 3; i++) {
      const x = -20 + i * 20;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(9, 0.42, 1.1), benchMat);
      seat.position.set(x, 0.85, PITCH_W / 2 + 9.2);
      seat.castShadow = true;
      group.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 0.25), benchMat);
      back.position.set(x, 1.35, PITCH_W / 2 + 9.7);
      group.add(back);
      [-3.4, 3.4].forEach(xo => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.9), legMat);
        leg.position.set(x + xo, 0.42, PITCH_W / 2 + 9.2);
        group.add(leg);
      });
    }
    // Su istasyonu + soğutucu kutular
    const station = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 }));
    station.position.set(-34, 1.35, PITCH_W / 2 + 9.2);
    station.castShadow = true;
    group.add(station);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), legMat);
    stand.position.set(-34, 0.45, PITCH_W / 2 + 9.2);
    group.add(stand);
    [-31.5, -30].forEach((x, i) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), new THREE.MeshStandardMaterial({ color: i === 0 ? 0x1e3a8a : 0xb91c1c, roughness: 0.65 }));
      box.position.set(x, 0.5, PITCH_W / 2 + 9.4);
      box.castShadow = true;
      group.add(box);
    });
  }

  // Kaleler (seviye 2+ file)
  const goalMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42, metalness: 0.25 });
  [-1, 1].forEach(dir => {
    const goal = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.13, 0.13, 2.5, 8);
    const a = new THREE.Mesh(postGeo, goalMat);
    a.position.set(0, 1.25, -3.7);
    const b = new THREE.Mesh(postGeo, goalMat);
    b.position.set(0, 1.25, 3.7);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 7.4, 8), goalMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.y = 2.5;
    goal.add(a, b, bar);
    if (n.pitch >= 2) {
      const net = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 2.4, 7.4),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
      );
      net.position.set(dir * -0.85, 1.2, 0);
      goal.add(net);
    }
    goal.position.set(dir * (PITCH_L / 2), 0, 0);
    group.add(goal);
  });

  /* ── Sahadaki düzenli antrenman grupları (dağınık değil, bloklar hâlinde) ── */
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 });
  const coneGeo = new THREE.ConeGeometry(0.3, 0.7, 10);
  const coneRow = (count: number, x: number, z: number, gap: number) => {
    for (let i = 0; i < count; i++) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(x - ((count - 1) * gap) / 2 + i * gap, 0.35, z);
      cone.castShadow = true;
      group.add(cone);
    }
  };
  // İki düzenli slalom sırası (seviye arttıkça daha çok koni)
  coneRow(5, -26, -14, 5.5);
  coneRow(Math.min(6, 4 + Math.floor(n.pitch / 2)), 26, -14, 5.5);
  coneRow(5, -26, 14, 5.5);

  // Top rafı ve toplar (tek küme, dağınık değil)
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const ballGeo = new THREE.SphereGeometry(0.34, 14, 12);
  const ballRack = new THREE.Mesh(
    new THREE.BoxGeometry(7, 1.1, 1.6),
    new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.4, roughness: 0.55 })
  );
  ballRack.position.set(PITCH_L / 2 + 12, 0.55, 26);
  ballRack.castShadow = true;
  group.add(ballRack);
  for (let i = 0; i < 3 + n.pitch; i++) {
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(PITCH_L / 2 + 9 + (i % 4) * 1.8, 0.34, 24 + Math.floor(i / 4) * 1.8);
    ball.castShadow = true;
    group.add(ball);
  }

  // Antrenman kuklaları — tek düzenli sıra (seviye 3+)
  if (n.pitch >= 3) {
    const count = 3 + n.pitch;
    const gap = 3.2;
    for (let i = 0; i < count; i++) {
      const d = dummy(clubColor);
      d.position.set(-((count - 1) * gap) / 2 + i * gap, 0, -24);
      group.add(d);
    }
  }
  // Mini kaleler — simetrik çift (seviye 4+)
  if (n.pitch >= 4) {
    const miniGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.4, 8);
    [-1, 1].forEach(side => {
      const mini = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8), goalMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.y = 1.45;
      const l = new THREE.Mesh(miniGeo, goalMat);
      l.position.set(0, 0.72, -1.6);
      const r = new THREE.Mesh(miniGeo, goalMat);
      r.position.set(0, 0.72, 1.6);
      mini.add(bar, l, r);
      mini.position.set(side * 30, 0, 24);
      group.add(mini);
    });
  }
  // Sulama — köşelerde simetrik 4 ünite (seviye 3+)
  if (n.pitch >= 3) {
    const jetMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.42, roughness: 0.2 });
    const postMat = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.5, roughness: 0.45 });
    ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).forEach(([sx, sz]) => {
      const head = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.0, 8), postMat);
      post.position.y = 0.5;
      head.add(post);
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.34, 5.0, 10, 1, true), jetMat);
      jet.rotation.z = Math.PI / 2.15;
      jet.position.set(sx * 1.5, 1.15, 0);
      head.add(jet);
      head.position.set(sx * (PITCH_L / 2 + 5.5), 0, sz * (PITCH_W / 2 + 5.5));
      group.add(head);
      sprinklers.push(head);
    });
  }

  /* ── İnce patikalar: sahadan binalara (çakışmayan, sade) ── */
  const pathColor = night ? C.plazaNight : C.plaza;
  const PATH_Y = 0.018; // apronun üzerinde, çimden altta → çakışma yok
  group.add(slab(122, 6, 0, -46, pathColor, PATH_Y));   // kampüs yolu: üç binanın önünden geçer
  group.add(slab(6, 5, 0, -48.5, pathColor, PATH_Y));   // yol → rejenerasyon merkezi girişi
  group.add(slab(6, 5, -62, -52, pathColor, PATH_Y));   // yol → fitness girişi
  group.add(slab(6, 5, 62, -52, pathColor, PATH_Y));    // yol → analiz girişi
  group.add(slab(6, 20, 0, 46, pathColor, PATH_Y));     // saha → altyapı alanı (mini sahalara değmez)

  /* ── Yol aydınlatması: direk + kol + sıcak ampul (gece parlar) ── */
  {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c3646, metalness: 0.55, roughness: 0.45 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff4d0,
      emissive: new THREE.Color(0xffe6a8),
      emissiveIntensity: night ? 1.25 : 0.12,
      roughness: 0.3,
    });
    const lampPost = (x: number, z: number, dir: number) => {
      const post = new THREE.Object3D();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 4.6, 8), poleMat);
      pole.position.y = 2.3;
      pole.castShadow = true;
      post.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), poleMat);
      arm.position.set(dir * 0.5, 4.5, 0);
      post.add(arm);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.2, 0.46), bulbMat);
      head.position.set(dir * 1.0, 4.4, 0);
      post.add(head);
      post.position.set(x, 0, z);
      group.add(post);
    };
    // Kampüs yolu boyunca (yol z=-46, patika yüzeyinin dışına dikey konumlanır)
    [-58, -30, -2, 26, 54].forEach((x, i) => lampPost(x, -49.6, i % 2 === 0 ? 1 : -1));
    // Alan içi patika ve otopark kenarı
    lampPost(4.2, 40, -1);
    lampPost(-4.2, 54, 1);
    lampPost(48, 128, 1);
    lampPost(-14, 122, 1);
  }

  /* 🏋️ Fitness & Kondisyon Salonu — batı, sahaya bakar (seviye = kat) */
  {
    const floors = n.gym;
    const h = 4.2 * floors;
    const b = building({ w: 22, d: 30, h, wall, accent, clubColor, night, floors, label: 'FITNESS', logo });
    b.rotation.y = Math.PI / 2; // cephe sahaya (+X) döner
    b.position.set(-80, 0, -52);
    group.add(b);

    if (n.gym >= 3) {
      // Dış fonksiyonel alan: halter platformu, düzenli
      const rackMat = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.6, roughness: 0.35 });
      const platform = slab(10, 7, -64, -62, night ? 0x2f3644 : 0x8d96a2);
      group.add(platform);
      // İki halter rack'i: dikmeler + bar + ağırlık diskleri + bench
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x171e29, roughness: 0.85 });
      [-3, 3].forEach(off => {
        const zc = -62 + off * 0.5;
        [-1.35, 1.35].forEach(s => {
          const upright = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, 0.22), rackMat);
          upright.position.set(-64, 1.05, zc + s);
          upright.castShadow = true;
          group.add(upright);
        });
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.9, 8), rackMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(-64, 1.6, zc);
        group.add(bar);
        [-1.35, 1.35].forEach(s => {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.18, 16), plateMat);
          plate.rotation.x = Math.PI / 2;
          plate.position.set(-64, 1.6, zc + s);
          plate.castShadow = true;
          group.add(plate);
        });
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 1.7), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }));
        bench.position.set(-64 + 1.4, 0.5, zc);
        group.add(bench);
      });
    }
    if (n.gym >= 4) {
      // Çatıda düzenli klima üniteleri
      const acMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.3, roughness: 0.5 });
      for (let i = 0; i < 3; i++) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(4, 1.7, 3), acMat);
        ac.position.set(-84 + i * 0.1, h + 1.55, -62 + i * 8);
        ac.castShadow = true;
        group.add(ac);
      }
    }
    if (n.gym >= 5) {
      const track = new THREE.Mesh(
        new THREE.TorusGeometry(9, 0.32, 8, 40),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.8 })
      );
      track.rotation.x = Math.PI / 2;
      track.position.set(-80, h + 1.4, -52);
      group.add(track);
    }
  }

  /* 🧊 Rejenerasyon Merkezi — kuzeyin tam ortası (kubbe) */
  {
    const r = 8 + n.recovery * 1.5;
    const h = 5.5;
    const b = building({ w: 34, d: 18, h, wall: wallAlt, accent, clubColor, night, entrance: false, label: 'REJENERASYON', logo });
    b.position.set(0, 0, -60);
    group.add(b);

    const domeMat = new THREE.MeshStandardMaterial({
      color: n.recovery >= 5 ? 0xcfe8ff : 0x9db4cc,
      roughness: n.recovery >= 5 ? 0.12 : 0.35,
      metalness: n.recovery >= 5 ? 0.45 : 0.2,
      transparent: n.recovery >= 5,
      opacity: n.recovery >= 5 ? 0.8 : 1,
      side: THREE.DoubleSide,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(0, h, -60);
    dome.castShadow = true;
    group.add(dome);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.26, 8, 34),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), roughness: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, h + 0.1, -60);
    group.add(ring);

    // Giriş kapısı (güneye bakar)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 3.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 })
    );
    door.position.set(0, 1.6, -50.85);
    group.add(door);

    // Havuz — binanın batı yanında, düzenli dikdörtgen (seviye 2+)
    if (n.recovery >= 2) {
      const poolW = 12 + n.recovery * 1.6;
      group.add(slab(poolW + 5, 13, -30, -62, night ? 0x2f3644 : 0xaeb7c2));
      const pool = new THREE.Mesh(
        new THREE.BoxGeometry(poolW, 0.4, 8),
        new THREE.MeshStandardMaterial({
          color: 0x1ea7e1,
          transparent: true,
          opacity: 0.86,
          roughness: 0.08,
          metalness: 0.3,
          emissive: new THREE.Color(0x0e7490),
          emissiveIntensity: night ? 0.5 : 0.16,
        })
      );
      pool.position.set(-30, 0.24, -62);
      group.add(pool);
    }
    // Buz banyoları — simetrik ikili (seviye 4+)
    if (n.recovery >= 4) {
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.25, metalness: 0.15, emissive: new THREE.Color(0x3b82f6), emissiveIntensity: 0.2 });
      [-24, 24].forEach(x => {
        const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.3, 1.25, 18), iceMat);
        tub.position.set(x, 0.62, -53);
        tub.castShadow = true;
        group.add(tub);
      });
    }
    // Sauna bacası (seviye 3+)
    if (n.recovery >= 3) {
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 8.5, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x8b6a4a, roughness: 0.85 })
      );
      chimney.position.set(14, 4.25, -66);
      chimney.castShadow = true;
      group.add(chimney);
    }
  }

  /* 📊 Taktik & Analiz Merkezi — doğu, sahaya bakar */
  {
    const h = 6.5 + n.tactics * 1.1;
    const b = building({ w: 22, d: 30, h, wall, accent, clubColor, night, floors: Math.max(1, Math.ceil(h / 4.5)), label: 'ANALİZ', logo });
    b.rotation.y = -Math.PI / 2; // cephe sahaya (-X) döner
    b.position.set(80, 0, -52);
    group.add(b);

    // Dev analiz ekranı — sahaya bakan cephede (batı yüzü)
    const tex = screenTexture(accent);
    if (tex) ledTextures.push(tex);
    const screenW = 13 + n.tactics * 1.4;
    const screenH = 5 + n.tactics * 0.8;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, screenH + 1.1, screenW + 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1b2432, metalness: 0.4, roughness: 0.5 })
    );
    frame.position.set(64.7, h * 0.62, -52);
    frame.castShadow = true;
    group.add(frame);
    const screenMat = new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : 0x0b1220,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: night ? 0.9 : 0.5,
      roughness: 0.22,
    });
    if (tex) { screenMat.map = tex; screenMat.emissiveMap = tex; }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
    screen.rotation.y = -Math.PI / 2;
    screen.position.set(64.45, h * 0.62, -52);
    group.add(screen);

    if (n.tactics >= 3) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 4, 8),
        new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.6, roughness: 0.4 })
      );
      pole.position.set(88, h + 2, -64);
      group.add(pole);
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(2.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.5),
        new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.35, roughness: 0.4, side: THREE.DoubleSide })
      );
      dish.rotation.x = -Math.PI / 3.2;
      dish.position.set(88, h + 4.6, -64);
      group.add(dish);
    }
    if (n.tactics >= 4) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xb6c2f2, roughness: 0.28, metalness: 0.25 })
      );
      dome.position.set(80, h, -62);
      dome.castShadow = true;
      group.add(dome);
    }
    if (n.tactics >= 5) {
      // Simetrik 3 bayrak direği — giriş önünde
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xb6bfc9, metalness: 0.7, roughness: 0.3 });
      const clothMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), side: THREE.DoubleSide, roughness: 0.8 });
      for (let i = -1; i <= 1; i++) {
        const pivot = new THREE.Object3D();
        const poleH = 9;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, poleH, 8), poleMat);
        pole.position.y = poleH / 2;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.7), clothMat);
        cloth.position.set(1.4, poleH - 1, 0);
        pivot.add(pole, cloth);
        pivot.position.set(66, 0, -52 + i * 10);
        group.add(pivot);
        flags.push(pivot);
      }
    }
  }

  /* 🎓 Altyapı Sahası & Gençlik Merkezi — güneyde düzenli mini saha kampüsü */
  {
    const count = Math.min(3, n.youth);
    // Yerleşim: 1 saha ortada, 2 saha simetrik yan yana, 3 saha "üçgen" düzeni
    const layout: { x: number; z: number }[] =
      count === 1 ? [{ x: 0, z: 72 }]
      : count === 2 ? [{ x: -30, z: 72 }, { x: 30, z: 72 }]
      : [{ x: -30, z: 72 }, { x: 30, z: 72 }, { x: 0, z: 104 }];

    layout.forEach((pos, idx) => {
      const tex = turfTexture(Math.min(FACILITY_MAX_LEVEL, n.youth + 1), false, '⚽');
      const mat = new THREE.MeshStandardMaterial({
        color: tex ? (night ? 0x8a9a86 : 0xffffff) : C.turf,
        roughness: 0.94,
      });
      if (tex) mat.map = tex;
      // Zemin şeridi (mini sahanın oturduğu bakımlı alan)
      group.add(slab(50, 34, pos.x, pos.z, night ? 0x2a3f28 : 0x53803f));
      const mini = new THREE.Mesh(new THREE.PlaneGeometry(38, 24), mat);
      mini.rotation.x = -Math.PI / 2;
      mini.position.set(pos.x, 0.02, pos.z);
      mini.receiveShadow = true;
      mini.userData.previewColor = night ? C.turfNight : C.turf;
      group.add(mini);
      // Mini kaleler (simetrik ikili)
      [-1, 1].forEach(side => {
        const g2 = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), goalMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.y = 1.6;
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), goalMat);
        l.position.set(0, 0.8, -2.1);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8), goalMat);
        r.position.set(0, 0.8, 2.1);
        g2.add(bar, l, r);
        g2.position.set(pos.x + side * 19, 0, pos.z);
        group.add(g2);
      });
      // Gençler: iki düzenli sıra hâlinde (dağınık değil)
      for (let k = 0; k < 6; k++) {
        const kid = footballer(idx % 2 === 0 ? clubColor : accent, 0xe8b48a);
        kid.scale.setScalar(0.78);
        kid.position.set(pos.x - 12 + (k % 3) * 12, 0, pos.z + (k < 3 ? -6 : 6));
        kid.rotation.y = k < 3 ? 0 : Math.PI;
        group.add(kid);
      }
    });

    // Altyapı binası + lokal + kule — mini sahaların iki yanında simetrik
    const h = 4.2 + n.youth * 0.6;
    const academy = building({
      w: 18, d: 11, h,
      wall, accent, clubColor, night,
      floors: Math.max(1, Math.floor(n.youth / 2)),
      label: 'ALTYAPI',
      logo,
    });
    academy.position.set(-84, 0, 78);
    group.add(academy);
    if (n.youth >= 3) {
      const annex = building({ w: 14, d: 10, h: 4.8, wall: wallAlt, accent, clubColor, night, floors: 1, entrance: false });
      annex.position.set(84, 0, 78);
      group.add(annex);
    }
    if (n.youth >= 5) {
      const tower = building({ w: 8, d: 8, h: 13, wall: wallAlt, accent, clubColor, night, floors: 3, entrance: false });
      tower.position.set(-84, 0, 94);
      group.add(tower);
    }
    // Veli tribünü — açık basamaklar (çatısız: tepeden bakınca koyu blok gibi görünmez)
    if (n.youth >= 4) {
      const stepMat = new THREE.MeshStandardMaterial({ color: night ? 0x8d939d : 0xc3cad3, roughness: 0.92 });
      const seatStripMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.75 });
      for (let r = 0; r < 4; r++) {
        const d = 2.1;
        const step = new THREE.Mesh(new THREE.BoxGeometry(46, 0.8 + r * 0.75, d), stepMat);
        step.position.set(0, (0.8 + r * 0.75) / 2, 124 + r * d);
        step.castShadow = true;
        step.receiveShadow = true;
        group.add(step);
        // Basamak üstünde kulüp rengi koltuk şeridi
        const strip = new THREE.Mesh(new THREE.BoxGeometry(44, 0.16, 1.0), seatStripMat);
        strip.position.set(0, 0.88 + r * 0.75, 124 + r * d);
        group.add(strip);
      }
      // Arka duvar (güney taraf)
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(46, 3.4, 0.7),
        new THREE.MeshStandardMaterial({ color: night ? 0x3d475c : 0xdfe4ea, roughness: 0.85 })
      );
      back.position.set(0, 1.7, 132.4);
      back.castShadow = true;
      group.add(back);
      // Kenar duvarları — kapalı kutu hissi
      [-23, 23].forEach(x => {
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 3.4, 9.4),
          new THREE.MeshStandardMaterial({ color: night ? 0x39445a : 0xd3dae1, roughness: 0.88 })
        );
        side.position.set(x, 1.7, 128.4);
        side.castShadow = true;
        group.add(side);
      });
      // Kulüp rengi aksan bandı — ön kenar
      const front = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), roughness: 0.6 })
      );
      front.position.set(0, 0.35, 123.2);
      group.add(front);

      // Seyirciler — basamaklarda oturan veliler (tek çizim çağrısı)
      const seatCount = 40;
      const crowd = new THREE.InstancedMesh(
        new THREE.CapsuleGeometry(0.22, 0.42, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
        seatCount
      );
      const palette = [new THREE.Color(clubColor), new THREE.Color(accent), new THREE.Color(0x1f2937), new THREE.Color(0xf59e0b), new THREE.Color(0xdc2626)];
      const dummyObj = new THREE.Object3D();
      for (let i = 0; i < seatCount; i++) {
        const row = i % 4;
        const col = Math.floor(i / 4) % 10;
        dummyObj.position.set(-21 + col * 4.7, 1.15 + row * 0.75, 124 + row * 2.1);
        dummyObj.updateMatrix();
        crowd.setMatrixAt(i, dummyObj.matrix);
        crowd.setColorAt(i, palette[(i * 3 + row) % palette.length]);
      }
      crowd.castShadow = true;
      group.add(crowd);

      // Skorbord — tribün arkasında, sahaya bakan ekran (sırt yüzü sponsor panosu)
      const sbTex = scoreboardTexture(accent, clubColor);
      const SB_W = 14.4;
      const SB_H = 6.4;
      const SB_Y = 8.2;
      [-6.6, 6.6].forEach(x => {
        const mast = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, SB_Y, 0.46),
          new THREE.MeshStandardMaterial({ color: 0x2c3646, metalness: 0.5, roughness: 0.45 })
        );
        mast.position.set(x, SB_Y / 2, 134.2);
        mast.castShadow = true;
        group.add(mast);
      });
      const sbFrame = new THREE.Mesh(
        new THREE.BoxGeometry(SB_W + 0.8, SB_H + 0.8, 0.66),
        new THREE.MeshStandardMaterial({ color: 0x2a3441, metalness: 0.45, roughness: 0.5 })
      );
      sbFrame.position.set(0, SB_Y, 134.6);
      sbFrame.castShadow = true;
      group.add(sbFrame);
      const sbMat = new THREE.MeshStandardMaterial({
        color: sbTex ? 0xffffff : 0x0b1220,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: night ? 1.0 : 0.36,
        roughness: 0.24,
      });
      if (sbTex) { sbMat.map = sbTex; sbMat.emissiveMap = sbTex; }
      const sbPanel = new THREE.Mesh(new THREE.PlaneGeometry(SB_W, SB_H), sbMat);
      sbPanel.rotation.y = Math.PI; // sahaya (-Z) bakar
      sbPanel.position.set(0, SB_Y, 134.26);
      group.add(sbPanel);
      // Arka yüz: tabela dokulu sponsor panosu (kara levha görünmesin)
      const backTex = signTexture('ANTRENMAN SAHASI', accent, logo);
      const backMat = new THREE.MeshStandardMaterial({
        color: backTex ? 0xffffff : 0x1f2937,
        roughness: 0.6,
        metalness: 0.1,
        emissive: new THREE.Color(night ? 0x233047 : 0x000000),
        emissiveIntensity: night ? 0.35 : 0,
      });
      if (backTex) backMat.map = backTex;
      const sbBack = new THREE.Mesh(new THREE.PlaneGeometry(SB_W, SB_H), backMat);
      sbBack.position.set(0, SB_Y, 134.96);
      group.add(sbBack);
    }
  }

  /* ── Projektörler (saha seviyesi 4+ / 5'te 4 kule) ── */
  if (n.pitch >= 4) {
    const mastMat = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.7, roughness: 0.38 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff6cc,
      emissive: new THREE.Color(0xfff2b0),
      emissiveIntensity: night ? 0.95 : 0.2,
      roughness: 0.2,
    });
    const spots: [number, number][] = n.pitch >= 5
      ? [[-64, -40], [64, -40], [-64, 40], [64, 40]]
      : [[-64, -40], [64, -40]];
    spots.forEach(([x, z]) => {
      const pylon = new THREE.Group();
      const H = 22;
      // 3 dikme (kafes ayak) + çapraz bağlantılar
      const legR = 0.55;
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, H, 8), mastMat);
        leg.position.set(Math.cos(a) * legR, H / 2, Math.sin(a) * legR);
        leg.castShadow = true;
        pylon.add(leg);
      }
      for (let hy = 3; hy < H; hy += 5) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(legR, 0.07, 6, 12), mastMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = hy;
        pylon.add(ring);
      }
      // Projektör kafası — kafes çerçeve + 6 lamba
      const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.0, 0.35), mastMat);
      frame.position.set(0, H + 1.3, -0.25);
      frame.rotation.x = 0.32;
      frame.castShadow = true;
      pylon.add(frame);
      for (let lx = 0; lx < 3; lx++) {
        for (let ly = 0; ly < 2; ly++) {
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 0.4), lampMat);
          lamp.position.set(-2.1 + lx * 2.1, H + 0.85 + ly * 1.15, 0.05);
          lamp.rotation.x = 0.32;
          pylon.add(lamp);
          floodlights.push(lamp);
        }
      }
      pylon.position.set(x, 0, z);
      group.add(pylon);
    });
  }

  /* ── Oyuncular: tek sıra hâlinde ısınma turu (düzenli) ── */
  {
    const count = Math.min(10, 4 + n.pitch);
    for (let i = 0; i < count; i++) {
      const fig = footballer(clubColor);
      const angle = (i / count) * Math.PI * 2;
      fig.position.set(Math.cos(angle) * 54, 0, Math.sin(angle) * 35.5);
      fig.rotation.y = -angle;
      group.add(fig);
      runners.push({ fig, angle });
    }
    // Rondo grubu: merkezde düzenli beşgen + ortada antrenör
    const rondoR = 9;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const fig = footballer(i % 2 === 0 ? clubColor : accent, 0xc98b5e);
      fig.position.set(Math.cos(angle) * rondoR, 0, Math.sin(angle) * rondoR);
      fig.rotation.y = -angle + Math.PI / 2;
      group.add(fig);
    }
    const coach = footballer('#111827', 0xe8b48a); // antrenör: siyah
    coach.scale.setScalar(1.05);
    group.add(coach);
  }

  /* ── Çevre düzeni: çit, ağaçlar, otopark (düzenli) ── */
  {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5b6675, metalness: 0.45, roughness: 0.55 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x707c8b, metalness: 0.4, roughness: 0.6 });
    const minX = -128, maxX = 128, minZ = -92, maxZ = 150;
    const w = maxX - minX, d = maxZ - minZ;
    // Üst ray + alt ray (4 kenar)
    [[0, minZ, w, 0.4], [0, maxZ, w, 0.4], [minX, (minZ + maxZ) / 2, 0.4, d], [maxX, (minZ + maxZ) / 2, 0.4, d]].forEach(([x, z, bw, bd]) => {
      [2.5, 0.35].forEach(hy => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.16, bd), fenceMat);
        rail.position.set(x, hy, z);
        group.add(rail);
      });
    });
    // Dikey parmaklıklar — InstancedMesh (tek çizim çağrısı, performanslı)
    const barGeo = new THREE.BoxGeometry(0.12, 2.5, 0.12);
    const step = 2.6;
    const countX = Math.floor(w / step) + 1;
    const countZ = Math.floor(d / step) + 1;
    const bars = new THREE.InstancedMesh(barGeo, railMat, countX * 2 + countZ * 2);
    const marker = new THREE.Object3D();
    let bi = 0;
    for (let i = 0; i < countX; i++) {
      const x = minX + i * step;
      [minZ, maxZ].forEach(z => {
        marker.position.set(x, 1.42, z);
        marker.updateMatrix();
        bars.setMatrixAt(bi++, marker.matrix);
      });
    }
    for (let i = 0; i < countZ; i++) {
      const z = minZ + i * step;
      [minX, maxX].forEach(x => {
        marker.position.set(x, 1.42, z);
        marker.updateMatrix();
        bars.setMatrixAt(bi++, marker.matrix);
      });
    }
    bars.count = bi;
    group.add(bars);

    // Ağaçlar — çitin dışında eşit aralıklı sıralar (iki farklı tip: yuvarlak + konik)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: night ? 0x1f3d2a : 0x2f7a44, roughness: 0.95 });
    const pineMat = new THREE.MeshStandardMaterial({ color: night ? 0x18321f : 0x256b3a, roughness: 0.95 });
    const trees: [number, number, boolean][] = [];
    for (let i = 0; i < 7; i++) {
      const x = -108 + i * 36;
      trees.push([x, minZ - 14, i % 2 === 0]);
      trees.push([x, maxZ + 14, i % 2 === 1]);
    }
    for (let i = 0; i < 5; i++) {
      const z = -60 + i * 48;
      trees.push([minX - 14, z, i % 2 === 0]);
      trees.push([maxX + 14, z, i % 2 === 1]);
    }
    // İkinci sıra (kaydırılmış) — dış çeper daha dolu görünür
    for (let i = 0; i < 6; i++) {
      const x = -90 + i * 36;
      trees.push([x, minZ - 30, i % 2 === 1]);
      trees.push([x, maxZ + 30, i % 2 === 0]);
    }
    for (let i = 0; i < 4; i++) {
      const z = -36 + i * 48;
      trees.push([minX - 30, z, i % 2 === 1]);
      trees.push([maxX + 30, z, i % 2 === 0]);
    }
    trees.forEach(([x, z, pine]) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.6, 4.4, 8), trunkMat);
      trunk.position.y = 2.2;
      trunk.castShadow = true;
      t.add(trunk);
      if (pine) {
        // Konik çam: üç kademe
        [0, 1, 2].forEach(k => {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6 - k * 0.62, 3.2, 12), pineMat);
          cone.position.y = 4.4 + k * 1.9;
          cone.castShadow = true;
          t.add(cone);
        });
      } else {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(2.9, 14, 12), leafMat);
        crown.position.y = 6.1;
        crown.castShadow = true;
        t.add(crown);
        const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 10), leafMat);
        crown2.position.set(1.6, 7.3, 0.6);
        t.add(crown2);
      }
      t.position.set(x, 0, z);
      group.add(t);
    });
    // Çalılar — bina önlerinde düzenli sıralar
    const bushMat = new THREE.MeshStandardMaterial({ color: night ? 0x22452c : 0x387a4a, roughness: 0.95 });
    const bushSpots: [number, number][] = [];
    [-96, -64, -16, 16, 64, 96].forEach(x => bushSpots.push([x, -38]));
    for (let i = 0; i < 5; i++) bushSpots.push([-100 + i * 0, 0]);
    bushSpots.filter(([, z]) => z !== 0).forEach(([x, z]) => {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), bushMat);
      bush.position.set(x, 0.85, z);
      bush.scale.set(1, 0.8, 1);
      bush.castShadow = true;
      group.add(bush);
    });

    // Otopark + kulüp servis minibüsü — güneybatı köşesi, düzenli
    group.add(slab(48, 22, -96, 128, night ? 0x2f3644 : 0x767f8c));
    const lotLines = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 9), lotLines);
      line.rotation.x = -Math.PI / 2;
      line.position.set(-115 + i * 9.5, 0.03, 128);
      group.add(line);
    }
    // Park hâlindeki kulüp araçları (3 araba — renk çeşitliliği, düzenli park)
    const carColors = [0x334155, 0xb91c1c, 0x0f766e];
    carColors.forEach((color, i) => {
      const car = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.05, 2.1), bodyMat);
      body.position.y = 0.85;
      body.castShadow = true;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.95), new THREE.MeshStandardMaterial({ color: night ? 0x1d2735 : 0x39485c, roughness: 0.2, metalness: 0.5 }));
      cabin.position.set(-0.2, 1.72, 0);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.9 });
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
      [[-1.5, 1.0], [1.5, 1.0], [-1.5, -1.0], [1.5, -1.0]].forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.42, wz);
        car.add(wheel);
      });
      car.add(body, cabin);
      car.position.set(-115 + i * 9.5, 0, 132);
      car.rotation.y = Math.PI / 2;
      group.add(car);
    });

    // Kulüp servis minibüsü (tekerlekli, gerçek araç silueti)
    const bus = new THREE.Group();
    const busBodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.42, metalness: 0.25 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(12, 2.6, 3), busBodyMat);
    body.position.y = 2.1;
    body.castShadow = true;
    const roofBlock = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.5, 2.9), busBodyMat);
    roofBlock.position.y = 3.6;
    const windows = new THREE.Mesh(
      new THREE.BoxGeometry(10.6, 1.1, 3.06),
      new THREE.MeshStandardMaterial({ color: night ? 0x2c3a52 : 0x51637d, roughness: 0.15, metalness: 0.6, emissive: new THREE.Color(night ? 0xffd9a0 : 0x0c1626), emissiveIntensity: night ? 0.35 : 0.05 })
    );
    windows.position.y = 2.8;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 2.6), new THREE.MeshStandardMaterial({ color: night ? 0x33445e : 0x5b6f8a, roughness: 0.12, metalness: 0.6 }));
    windshield.position.set(6.0, 2.5, 0);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.42, 14);
    [[-3.9, 1.52], [3.9, 1.52], [-3.9, -1.52], [3.9, -1.52]].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.62, wz);
      wheel.castShadow = true;
      bus.add(wheel);
    });
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 2.9), new THREE.MeshStandardMaterial({ color: 0x39414d, roughness: 0.7, metalness: 0.3 }));
    bumper.position.set(6.15, 1.15, 0);
    bus.add(body, roofBlock, windows, windshield, bumper);
    bus.position.set(-108, 0, 122);
    bus.rotation.y = Math.PI / 2;
    group.add(bus);
  }

  /* ── Ön izleme vurgusu ── */
  if (opts.highlight) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(13, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    halo.rotation.x = -Math.PI / 2;
    const spots: Record<FacilityModuleId, [number, number]> = {
      pitch: [0, 0],
      gym: [-80, -52],
      recovery: [0, -60],
      tactics: [80, -52],
      youth: [0, 72],
    };
    const [hx, hz] = spots[opts.highlight];
    halo.position.set(hx, 0.16, hz);
    group.add(halo);
  }

  /* ── Işıklandırma ── */
  group.add(new THREE.HemisphereLight(
    night ? 0x2b3c58 : 0xbcd9ff,
    night ? 0x101a2e : 0x40532f,
    night ? 0.72 : 0.9
  ));
  const sun = new THREE.DirectionalLight(night ? 0x9fb0cc : 0xfff4d6, night ? 0.4 : 1.25);
  sun.position.set(120, 150, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -190;
  sun.shadow.camera.right = 190;
  sun.shadow.camera.top = 190;
  sun.shadow.camera.bottom = -190;
  sun.shadow.camera.far = 520;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.9;
  group.add(sun);

  if (night) {
    [[-64, -40], [64, -40]].forEach(([x, z]) => {
      const light = new THREE.PointLight(0xffe9a8, 28000, 240, 1.9);
      light.position.set(x, 24, z);
      group.add(light);
    });
  }

  /* ── Animasyon ── */
  const update = (t: number, dt: number) => {
    // Isınma turu: hepsi aynı hızda → aralıklar bozulmaz, düzenli görünür
    runners.forEach(r => {
      r.angle += dt * 0.12;
      r.fig.position.set(Math.cos(r.angle) * 54, Math.abs(Math.sin(t * 5 + r.angle * 3)) * 0.07, Math.sin(r.angle) * 35.5);
      r.fig.rotation.y = -r.angle;
    });
    sprinklers.forEach((s, i) => { s.rotation.y = Math.sin(t * 0.5 + i) * 0.9; });
    flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 1.3 + i * 0.6) * 0.28; });
    ledTextures.forEach(tex => { tex.offset.x = (tex.offset.x + dt * 0.04) % 1; });
    if (night) {
      floodlights.forEach((fl, i) => {
        const m = (fl as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m && 'emissiveIntensity' in m) m.emissiveIntensity = 0.9 + Math.sin(t * 1.3 + i) * 0.14;
      });
    }
  };

  return {
    group,
    update,
    camera: { radius: 188, phi: 0.98, theta: 0.58, targetY: 6, fov: 46 },
    sky: night ? '#0a1024' : '#7fb2e5',
    skyTexture: skyGradientTexture(night),
    fog: night ? ['#0a1024', 260, 620] : ['#7fb2e5', 280, 660],
    levels: { pitch: n.pitch, gym: n.gym, recovery: n.recovery, tactics: n.tactics, youth: n.youth },
    triCount: () => {
      let total = 0;
      group.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) {
          const g = mesh.geometry as THREE.BufferGeometry;
          total += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3;
        }
      });
      return Math.round(total);
    },
  };
}
