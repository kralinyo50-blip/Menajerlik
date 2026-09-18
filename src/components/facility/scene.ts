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

/* ══════════════ Bina yardımcıları ══════════════ */

/**
 * Düzenli görünümlü bina: gövde + koyu çatı bandı + kulüp rengi aksan şeridi.
 * Ön yüz (+Z) cephesine cam şeritler ve giriş kapısı eklenir.
 */
function building(opts: {
  w: number; d: number; h: number;
  wall: number; accent: string; clubColor: string;
  night: boolean; floors?: number;
  entrance?: boolean;
}) {
  const { w, d, h, wall, accent, clubColor, night } = opts;
  const floors = Math.max(1, opts.floors ?? 1);
  const g = new THREE.Group();

  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: wall, roughness: 0.72, metalness: 0.06 })
  );
  shell.position.y = h / 2;
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);

  // Koyu çatı kapağı
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.7, 0.7, d + 0.7),
    new THREE.MeshStandardMaterial({ color: night ? C.roofNight : C.roof, roughness: 0.8, metalness: 0.15 })
  );
  roof.position.y = h + 0.35;
  roof.castShadow = true;
  g.add(roof);

  // Kulüp rengi zemin bandı
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.2, 0.55, d + 0.2),
    new THREE.MeshStandardMaterial({ color: clubColor, roughness: 0.6 })
  );
  band.position.y = 0.5;
  g.add(band);

  // Aksan şeridi (çatı altı)
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.2, 0.42, d + 0.2),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), roughness: 0.55 })
  );
  trim.position.y = h - 0.5;
  g.add(trim);

  // Cephe camları (her kat için tek sıra)
  const glassMat = new THREE.MeshStandardMaterial({
    color: night ? 0x2c3a52 : 0x51637d,
    roughness: 0.14,
    metalness: 0.6,
    emissive: new THREE.Color(night ? 0xffd9a0 : 0x0c1626),
    emissiveIntensity: night ? 0.4 : 0.06,
  });
  const floorH = h / floors;
  for (let f = 0; f < floors; f++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, floorH * 0.34, 0.3), glassMat);
    win.position.set(0, f * floorH + floorH * 0.6, d / 2 + 0.05);
    g.add(win);
  }
  // Yan cephe camı
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.3, h * 0.32, d * 0.66), glassMat);
  sideWin.position.set(w / 2 + 0.05, h * 0.58, 0);
  g.add(sideWin);

  if (opts.entrance !== false) {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(5.6, w * 0.3), 3, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.2 })
    );
    door.position.set(0, 1.5, d / 2 + 0.15);
    g.add(door);
  }
  return g;
}

/** Zemin kaplaması (plaza / beton alan) */
function slab(w: number, d: number, x: number, z: number, color: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.012, z);
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
    for (let i = 0; i < count; i++) {
      const d = dummy(clubColor);
      d.position.set(-8 + i * (16 / count) * 1.6, 0, -24);
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
  group.add(slab(140, 6, 0, -46, pathColor));     // kampüs yolu: üç binanın önünden geçer
  group.add(slab(6, 7, 0, -52, pathColor));       // yol → rejenerasyon merkezi
  group.add(slab(6, 12, 0, 44, pathColor));       // saha → altyapı alanı
  group.add(slab(6, 6, -65, -52, pathColor));     // yol → fitness girişi
  group.add(slab(6, 6, 65, -52, pathColor));      // yol → analiz girişi

  /* 🏋️ Fitness & Kondisyon Salonu — batı, sahaya bakar (seviye = kat) */
  {
    const floors = n.gym;
    const h = 4.2 * floors;
    const b = building({ w: 22, d: 30, h, wall, accent, clubColor, night, floors });
    b.rotation.y = Math.PI / 2; // cephe sahaya (+X) döner
    b.position.set(-80, 0, -52);
    group.add(b);

    if (n.gym >= 3) {
      // Dış fonksiyonel alan: halter platformu, düzenli
      const rackMat = new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.6, roughness: 0.35 });
      const platform = slab(10, 7, -64, -62, night ? 0x2f3644 : 0x8d96a2);
      group.add(platform);
      [-3, 3].forEach(off => {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8), rackMat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(-64, 1.85, -62 + off * 0.5);
        group.add(bar);
        [-1.1, 1.1].forEach(s => {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x171e29, roughness: 0.85 }));
          plate.rotation.z = Math.PI / 2;
          plate.position.set(-64, 1.85, -62 + off * 0.5 + s * 1.02);
          group.add(plate);
        });
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
    const b = building({ w: 34, d: 18, h, wall: wallAlt, accent, clubColor, night, entrance: false });
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
        tub.position.set(x, 0.62, -56);
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
    const b = building({ w: 22, d: 30, h, wall, accent, clubColor, night, floors: Math.max(1, Math.ceil(h / 4.5)) });
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

  /* 🎓 Altyapı Sahası & Gençlik Merkezi — güneyde simetrik mini sahalar */
  {
    const count = Math.min(3, n.youth);
    // Mini sahalar: tek saha ortada, iki saha yan yana, üç saha üçgen/yan yana
    const layout: { x: number; z: number }[] =
      count === 1 ? [{ x: 0, z: 66 }]
      : count === 2 ? [{ x: -28, z: 66 }, { x: 28, z: 66 }]
      : [{ x: -34, z: 66 }, { x: 34, z: 66 }, { x: 0, z: 92 }];

    layout.forEach((pos, idx) => {
      const tex = turfTexture(Math.min(FACILITY_MAX_LEVEL, n.youth + 1), false, '⚽');
      const mat = new THREE.MeshStandardMaterial({
        color: tex ? (night ? 0x8a9a86 : 0xffffff) : C.turf,
        roughness: 0.94,
      });
      if (tex) mat.map = tex;
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

    // Altyapı binası + lokal (seviyeye göre büyür)
    const h = 4.2 + n.youth * 0.6;
    const academy = building({
      w: 18, d: 11, h,
      wall, accent, clubColor, night,
      floors: Math.max(1, Math.floor(n.youth / 2)),
    });
    academy.position.set(-74, 0, 78);
    group.add(academy);
    // İkinci lokal (seviye 3+)
    if (n.youth >= 3) {
      const annex = building({ w: 12, d: 9, h: 4.6, wall: wallAlt, accent, clubColor, night, floors: 1, entrance: false });
      annex.position.set(74, 0, 78);
      group.add(annex);
    }
    // Veli tribünü — tek parça, düzenli basamak (seviye 4+)
    if (n.youth >= 4) {
      const standMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, roughness: 0.9 });
      for (let r = 0; r < 3; r++) {
        const row = new THREE.Mesh(new THREE.BoxGeometry(44, 0.7, 1.9), standMat);
        row.position.set(0, 0.5 + r * 0.8, 84 + r * 2);
        row.castShadow = true;
        group.add(row);
      }
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: night ? C.roofNight : C.roof, roughness: 0.7, metalness: 0.2 })
      );
      roof.position.set(0, 6.4, 88);
      roof.castShadow = true;
      group.add(roof);
      [-22, 22].forEach(x => {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 6.4, 10),
          new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.5, roughness: 0.45 })
        );
        col.position.set(x, 3.2, 88);
        group.add(col);
      });
    }
    // Gençlik kulesi (seviye 5) — simetrik, köşede
    if (n.youth >= 5) {
      const tower = building({ w: 8, d: 8, h: 13, wall: wallAlt, accent, clubColor, night, floors: 3, entrance: false });
      tower.position.set(-74, 0, 96);
      group.add(tower);
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
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.66, H, 10), mastMat);
      mast.position.y = H / 2;
      mast.castShadow = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(6, 2.8, 0.55), lampMat);
      head.position.y = H + 1.3;
      head.rotation.x = 0.32;
      pylon.add(mast, head);
      pylon.position.set(x, 0, z);
      group.add(pylon);
      floodlights.push(head);
    });
  }

  /* ── Oyuncular: tek sıra hâlinde ısınma turu (düzenli) ── */
  {
    const count = Math.min(10, 4 + n.pitch);
    for (let i = 0; i < count; i++) {
      const fig = footballer(clubColor);
      const angle = (i / count) * Math.PI * 2;
      fig.position.set(Math.cos(angle) * 63, 0, Math.sin(angle) * 42);
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
    const minX = -128, maxX = 128, minZ = -92, maxZ = 116;
    const w = maxX - minX, d = maxZ - minZ;
    // Çit: 4 kenar — alt ray
    [[0, minZ, w, 0.4], [0, maxZ, w, 0.4], [minX, (minZ + maxZ) / 2, 0.4, d], [maxX, (minZ + maxZ) / 2, 0.4, d]].forEach(([x, z, bw, bd]) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(bw, 1.6, bd), fenceMat);
      rail.position.set(x, 1.7, z);
      group.add(rail);
    });
    // Köşe ve kenar direkleri — eşit aralık
    const postGeo = new THREE.BoxGeometry(0.45, 3.2, 0.45);
    for (let x = minX; x <= maxX; x += 32) {
      [minZ, maxZ].forEach(z => {
        const p = new THREE.Mesh(postGeo, railMat);
        p.position.set(x, 1.6, z);
        group.add(p);
      });
    }
    for (let z = minZ; z <= maxZ; z += 32) {
      [minX, maxX].forEach(x => {
        const p = new THREE.Mesh(postGeo, railMat);
        p.position.set(x, 1.6, z);
        group.add(p);
      });
    }

    // Ağaçlar — çitin dışında eşit aralıklı iki sıra hissi
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: night ? 0x1f3d2a : 0x2f7a44, roughness: 0.95 });
    const trees: [number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const x = -108 + i * 36;
      trees.push([x, minZ - 14]);
      trees.push([x, maxZ + 14]);
    }
    for (let i = 0; i < 4; i++) {
      const z = -60 + i * 44;
      trees.push([minX - 14, z]);
      trees.push([maxX + 14, z]);
    }
    trees.forEach(([x, z]) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 4.4, 8), trunkMat);
      trunk.position.y = 2.2;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(2.9, 14, 12), leafMat);
      crown.position.y = 6.1;
      crown.castShadow = true;
      t.add(trunk, crown);
      t.position.set(x, 0, z);
      group.add(t);
    });

    // Otopark + kulüp servis minibüsü — güneybatı köşesi, düzenli
    group.add(slab(44, 20, -96, 104, night ? 0x2f3644 : 0x767f8c));
    const lotLines = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 8), lotLines);
      line.rotation.x = -Math.PI / 2;
      line.position.set(-114 + i * 9, 0.03, 104);
      group.add(line);
    }
    const bus = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3.2, 3),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.45, metalness: 0.2 })
    );
    body.position.y = 1.9;
    body.castShadow = true;
    const windows = new THREE.Mesh(
      new THREE.BoxGeometry(10.4, 1.2, 3.05),
      new THREE.MeshStandardMaterial({ color: night ? 0x2c3a52 : 0x51637d, roughness: 0.15, metalness: 0.6, emissive: new THREE.Color(night ? 0xffd9a0 : 0x0c1626), emissiveIntensity: night ? 0.35 : 0.05 })
    );
    windows.position.y = 2.6;
    bus.add(body, windows);
    bus.position.set(-104, 0, 96);
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
      r.fig.position.set(Math.cos(r.angle) * 63, Math.abs(Math.sin(t * 5 + r.angle * 3)) * 0.07, Math.sin(r.angle) * 42);
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
    camera: { radius: 182, phi: 0.96, theta: 0.6, targetY: 5, fov: 46 },
    sky: night ? '#0a1024' : '#7fb2e5',
    fog: night ? ['#0a1024', 240, 580] : ['#7fb2e5', 260, 620],
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
