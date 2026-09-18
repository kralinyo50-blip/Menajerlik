import * as THREE from 'three';
import { FacilityModuleId, FacilityState } from '../../types/game';
import { normalizeFacility, FACILITY_MAX_LEVEL } from '../../data/facility';

/* ══════════════════════════════════════════════════════════════
   ANTRENMAN KOMPLEKSİ — prosedürel 3D sahne
   Modül seviyeleri binanın/sahanın görünümünü gerçekten büyütür.
   WebGL gerektirmez (Node önizleme aracı da kullanır).
   ══════════════════════════════════════════════════════════════ */

const hasDom = typeof document !== 'undefined';

function makeCanvas(w: number, h: number) {
  if (!hasDom) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Antrenman sahası çimi — seviye yükseldikçe daha bakımlı ve canlı */
function trainingPitchTexture(level: number, withLogo: boolean, logo: string): THREE.Texture | null {
  const canvas = makeCanvas(768, 512);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const W = canvas.width;
  const H = canvas.height;

  // Seviye 1: soluk, yıpranmış çim. Seviye 5: turnuva kalitesinde çim.
  const quality = (level - 1) / (FACILITY_MAX_LEVEL - 1); // 0..1
  ctx.fillStyle = `rgb(${Math.round(64 + quality * 6)}, ${Math.round(112 + quality * 34)}, ${Math.round(58 + quality * 16)})`;
  ctx.fillRect(0, 0, W, H);

  // Kesim şeritleri — yüksek seviyede daha net
  const stripes = 10;
  for (let i = 0; i < stripes; i++) {
    const shade = i % 2 === 0 ? 0.9 : 1.22 - quality * 0.06;
    ctx.fillStyle = `rgba(${Math.round(80 * shade)}, ${Math.round(160 * shade)}, ${Math.round(80 * shade)}, ${0.25 + quality * 0.45})`;
    ctx.fillRect((W / stripes) * i, 0, W / stripes, H);
  }

  // Düşük seviyede yıpranmış / toprak lekeler (bakımsız saha hissi)
  const patches = Math.round((1 - quality) * 26);
  for (let i = 0; i < patches; i++) {
    ctx.fillStyle = `rgba(120, 104, 62, ${0.10 + Math.random() * 0.16})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * W, Math.random() * H, 8 + Math.random() * 30, 6 + Math.random() * 18, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Saha çizgileri
  ctx.strokeStyle = `rgba(255,255,255,${0.5 + quality * 0.45})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, W - 32, H - 32);
  ctx.beginPath();
  ctx.moveTo(W / 2, 16);
  ctx.lineTo(W / 2, H - 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 62, 0, Math.PI * 2);
  ctx.stroke();
  if (withLogo) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.font = '86px serif';
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

/** Taktik merkezinin dev ekranı — kayan analiz yazısı */
function analysisScreenTexture(text: string, accent: string): THREE.Texture | null {
  const canvas = makeCanvas(512, 128);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#050b18';
  ctx.fillRect(0, 0, 512, 128);
  // Basit taktik tahtası ızgarası
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 18, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('ANALİZ • RAKİP PLANI • DURAN TOP', 18, 88);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface TrainingComplexOptions {
  facility: Partial<FacilityState> | null | undefined;
  /** Kulüp rengi — bina vurguları, ekipman */
  clubColor?: string;
  accentColor?: string;
  /** Kulüp logosu (emoji) */
  logo?: string;
  /** Gece modu — projektörler ve pencereler yanar */
  night?: boolean;
  /** Ön izlemede vurgulanan modül (parlar) */
  highlight?: FacilityModuleId | null;
  /** Zemin ıslak (yağmur) */
  wet?: boolean;
}

export interface TrainingComplexBundle {
  group: THREE.Group;
  update: (t: number, dt: number) => void;
  camera: {
    radius: number;
    phi: number;
    theta: number;
    targetY: number;
    fov: number;
  };
  sky: string;
  fog?: [string, number, number];
  /** Modül seviyeleri — geometri doğrulaması için */
  levels: Record<FacilityModuleId, number>;
  triCount: () => number;
}

/* ── Küçük yardımcılar ── */
function block(w: number, h: number, d: number, color: number | string, opts: { rough?: number; metal?: number; emissive?: number | string; emissiveIntensity?: number } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color as any),
    roughness: opts.rough ?? 0.82,
    metalness: opts.metal ?? 0.08,
    emissive: opts.emissive ? new THREE.Color(opts.emissive as any) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function glassMaterial(night: boolean, accent: string) {
  return new THREE.MeshStandardMaterial({
    color: 0x2b3a52,
    roughness: 0.16,
    metalness: 0.62,
    emissive: new THREE.Color(night ? accent : 0x0d1a2b),
    emissiveIntensity: night ? 0.45 : 0.06,
  });
}

/** Oyuncu figürü — gövde + kafa (antrenmanda koşan/duran) */
function makePlayerFigure(color: string, skin = 0xd9a06b) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.75 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.72, 4, 8), bodyMat);
  body.position.y = 0.98;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.85 }));
  head.position.y = 1.66;
  head.castShadow = true;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 }));
  legs.position.y = 0.33;
  g.add(body, head, legs);
  return g;
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
  const textTextures: THREE.Texture[] = [];
  const runners: { fig: THREE.Object3D; angle: number; radius: number; speed: number }[] = [];
  const balls: THREE.Object3D[] = [];

  const groundColor = night ? 0x25332c : 0x4a6440;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 380),
    new THREE.MeshStandardMaterial({ color: groundColor, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = true;
  group.add(ground);

  /* ── Ana antrenman sahası (pitch modülü) ── */
  const PITCH_L = 100;
  const PITCH_W = 62;
  const pitchTex = trainingPitchTexture(n.pitch, n.pitch >= 4, opts.logo ?? '⚽');
  const pitchMat = new THREE.MeshStandardMaterial({
    color: pitchTex ? (night ? 0x8a9a86 : 0xffffff) : 0x3f8f4b,
    roughness: opts.wet ? 0.55 : 0.95,
    metalness: opts.wet ? 0.06 : 0,
  });
  if (pitchTex) pitchMat.map = pitchTex;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PITCH_L, PITCH_W), pitchMat);
  // Node önizleme aracı (doku yok) için düz renk ipucu
  pitch.userData.previewColor = night ? 0x2f5c38 : 0x3f8f4b;
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.02;
  pitch.receiveShadow = true;
  group.add(pitch);

  // Saha çevresi (apron)
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_L + 12, PITCH_W + 12),
    new THREE.MeshStandardMaterial({ color: night ? 0x2a3a24 : 0x54703f, roughness: 0.98 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.01;
  apron.receiveShadow = true;
  group.add(apron);

  // Kaleler (seviye 1'de file yok, seviye 2+ file var)
  const goalMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42, metalness: 0.28 });
  [-1, 1].forEach(dir => {
    const goal = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.13, 0.13, 2.5, 8);
    const a = new THREE.Mesh(post, goalMat);
    a.position.set(0, 1.25, -3.7);
    const b = new THREE.Mesh(post, goalMat);
    b.position.set(0, 1.25, 3.7);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 7.4, 8), goalMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.y = 2.5;
    goal.add(a, b, bar);
    if (n.pitch >= 2) {
      const net = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 2.4, 7.4),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
      );
      net.position.set(dir * -0.85, 1.2, 0);
      goal.add(net);
    }
    goal.position.set(dir * (PITCH_L / 2), 0, 0);
    group.add(goal);
  });

  // Antrenman malzemeleri: koniler + toplar (seviyeyle artar)
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.7 });
  const coneCount = 6 + n.pitch * 4;
  for (let i = 0; i < coneCount; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 10), coneMat);
    const lane = i % 2 === 0 ? -1 : 1;
    cone.position.set(-PITCH_L / 2 + 10 + (i * 7) % (PITCH_L - 20), 0.36, lane * (6 + (i % 4) * 5));
    cone.castShadow = true;
    group.add(cone);
  }
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  for (let i = 0; i < 3 + n.pitch * 2; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), ballMat);
    ball.position.set(-PITCH_L / 2 + 12 + i * 8.5, 0.34, 24 - (i % 3) * 3);
    ball.castShadow = true;
    group.add(ball);
    balls.push(ball);
  }

  // Antrenman kuklaları (seviye 3+)
  if (n.pitch >= 3) {
    const dummyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.8 });
    const dummyBody = new THREE.CylinderGeometry(0.42, 0.5, 1.9, 12);
    for (let i = 0; i < 2 + n.pitch; i++) {
      const dummy = new THREE.Group();
      const torso = new THREE.Mesh(dummyBody, dummyMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.9 }));
      base.position.y = 0.11;
      dummy.add(torso, base);
      dummy.position.set(-30 + i * 9, 0, -18);
      group.add(dummy);
    }
  }

  // Mini kaleler (seviye 4+)
  if (n.pitch >= 4) {
    for (let i = 0; i < 2; i++) {
      const mini = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.2, 8), goalMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.y = 1.5;
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8), goalMat);
      l.position.set(0, 0.75, -1.6);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8), goalMat);
      r.position.set(0, 0.75, 1.6);
      mini.add(bar, l, r);
      mini.position.set(26, 0, 20 - i * 40);
      group.add(mini);
    }
  }

  // Sulama sistemi (seviye 3+) — dönen su jetleri
  if (n.pitch >= 3) {
    const jetMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.5, roughness: 0.2, metalness: 0.1 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.45 });
    const spots: [number, number][] = [[-32, -22], [32, -22], [-32, 22], [32, 22]];
    spots.forEach(([x, z]) => {
      const head = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.1, 8), postMat);
      post.position.y = 0.55;
      head.add(post);
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.38, 5.4, 10, 1, true), jetMat);
      jet.rotation.z = Math.PI / 2.2;
      jet.position.set(1.6, 1.3, 0);
      head.add(jet);
      head.position.set(x, 0, z);
      group.add(head);
      sprinklers.push(head);
    });
  }

  // Kulübe / soyunma binası (seviye 2+) — sahanın güney kenarı
  if (n.pitch >= 2) {
    const cabin = block(20, 4.2, 8, night ? 0x374151 : 0x9aa4b4);
    cabin.position.set(-PITCH_L / 2 - 2, 2.1, PITCH_W / 2 + 8);
    group.add(cabin);
    const roofBand = block(20.6, 0.5, 8.6, accent);
    roofBand.position.set(-PITCH_L / 2 - 2, 4.45, PITCH_W / 2 + 8);
    group.add(roofBand);
    // Bank alanı
    const benchMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 0.9), benchMat);
      seat.position.set(-44 + i * 9, 0.8, PITCH_W / 2 + 12);
      seat.castShadow = true;
      group.add(seat);
      [-2.4, 2.4].forEach(xo => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x4b5563 }));
        leg.position.set(-44 + i * 9 + xo, 0.4, PITCH_W / 2 + 12);
        group.add(leg);
      });
    }
  }

  // Küçük seyirci tribünü (seviye 5)
  if (n.pitch >= 5) {
    const standMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.85 });
    for (let i = 0; i < 3; i++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(46, 0.8, 2.2), standMat);
      row.position.set(0, 0.5 + i * 0.85, PITCH_W / 2 + 16 + i * 2.1);
      row.castShadow = true;
      group.add(row);
    }
    const roof = block(48, 0.5, 8, accent);
    roof.position.set(0, 6.2, PITCH_W / 2 + 20);
    group.add(roof);
    [-23, 23].forEach(x => {
      const col = block(0.6, 6.2, 0.6, 0x94a3b8, { metal: 0.5 });
      col.position.set(x, 3.1, PITCH_W / 2 + 20);
      group.add(col);
    });
  }

  /* ── Projektörler (pitch 4+ / 2 kule, pitch 5 / 4 kule) ── */
  if (n.pitch >= 4) {
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.72, roughness: 0.36 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff6cc,
      emissive: new THREE.Color(0xfff2b0),
      emissiveIntensity: night ? 0.95 : 0.22,
      roughness: 0.2,
    });
    const positions: [number, number][] = n.pitch >= 5
      ? [[-62, -40], [62, -40], [-62, 40], [62, 40]]
      : [[-62, -40], [62, -40]];
    positions.forEach(([x, z]) => {
      const pylon = new THREE.Group();
      const h = 22;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, h, 10), mastMat);
      mast.position.y = h / 2;
      mast.castShadow = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3, 0.6), lampMat);
      head.position.y = h + 1.4;
      head.rotation.x = 0.35;
      pylon.add(mast, head);
      pylon.position.set(x, 0, z);
      group.add(pylon);
      floodlights.push(head);
    });
  }

  /* ── Koşan oyuncular ── */
  const runnerCount = Math.min(12, 3 + n.pitch * 2);
  for (let i = 0; i < runnerCount; i++) {
    const fig = makePlayerFigure(clubColor);
    const angle = (i / runnerCount) * Math.PI * 2;
    const radius = 16 + (i % 3) * 7;
    const speed = 0.10 + (i % 4) * 0.02 + n.pitch * 0.008;
    fig.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.55);
    group.add(fig);
    runners.push({ fig, angle, radius, speed });
  }

  /* ── Fitness & Kondisyon Salonu (gym) ── */
  const gymX = -52;
  const gymZ = -50;
  const gymFloors = n.gym;
  const gymW = 30;
  const gymD = 20;
  const floorH = 4.0;
  {
    const shell = block(gymW, gymFloors * floorH, gymD, night ? 0x334155 : 0xb8c0cc, { rough: 0.6, metal: 0.15 });
    shell.position.set(gymX, (gymFloors * floorH) / 2, gymZ);
    group.add(shell);

    // Cam cephe (her kat ayrı şerit)
    for (let f = 0; f < gymFloors; f++) {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(gymW * 0.86, floorH * 0.52, 0.4), glassMaterial(night, '#7dd3fc'));
      glass.position.set(gymX, f * floorH + floorH * 0.52, gymZ + gymD / 2 + 0.1);
      group.add(glass);
    }
    // Kulüp rengi bant
    const band = block(gymW + 0.6, 0.7, gymD + 0.6, clubColor, { rough: 0.5 });
    band.position.set(gymX, gymFloors * floorH + 0.35, gymZ);
    group.add(band);

    // Giriş
    const door = block(5, 3.2, 0.5, 0x1f2937);
    door.position.set(gymX, 1.6, gymZ + gymD / 2 + 0.2);
    group.add(door);

    // Seviye 3+: dış fonksiyonel antrenman alanı
    if (n.gym >= 3) {
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.35 });
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8), rackMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(gymX + gymW / 2 + 7, 1.9, gymZ + 6);
      group.add(bar);
      [-1, 1].forEach(s => {
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), rackMat);
        upright.position.set(gymX + gymW / 2 + 7 + s * 1.5, 1.7, gymZ + 6);
        group.add(upright);
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 14), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 }));
        plate.rotation.z = Math.PI / 2;
        plate.position.set(gymX + gymW / 2 + 7 + s * 1.1, 1.85, gymZ + 6);
        group.add(plate);
      });
    }
    // Seviye 4+: çatıda klima üniteleri + güneş paneli
    if (n.gym >= 4) {
      const acMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.35, roughness: 0.5 });
      for (let i = 0; i < 3; i++) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(4, 1.8, 3.2), acMat);
        ac.position.set(gymX - 9 + i * 9, gymFloors * floorH + 1.2, gymZ);
        ac.castShadow = true;
        group.add(ac);
      }
      const solar = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.55, roughness: 0.25, emissive: new THREE.Color(0x0b1a3a), emissiveIntensity: 0.4 }));
      solar.position.set(gymX + 8, gymFloors * floorH + 2.2, gymZ - 4);
      group.add(solar);
    }
    // Seviye 5: çatı koşu bandı
    if (n.gym >= 5) {
      const track = new THREE.Mesh(new THREE.TorusGeometry(8, 0.35, 8, 32), new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), roughness: 0.8 }));
      track.rotation.x = Math.PI / 2;
      track.position.set(gymX, gymFloors * floorH + 2.7, gymZ);
      group.add(track);
    }
  }

  /* ── Rejenerasyon Merkezi (recovery) ── */
  const recX = 0;
  const recZ = -52;
  {
    const domeR = 8 + n.recovery * 1.7;
    const baseH = 5.5;
    const base = block(28, baseH, 18, night ? 0x2f3d4d : 0xdfe6ee, { rough: 0.55 });
    base.position.set(recX, baseH / 2, recZ);
    group.add(base);

    // Kubbe
    const domeMat = new THREE.MeshStandardMaterial({
      color: n.recovery >= 5 ? 0xbfe3ff : 0x8fa9c4,
      roughness: n.recovery >= 5 ? 0.14 : 0.4,
      metalness: n.recovery >= 5 ? 0.5 : 0.2,
      transparent: n.recovery >= 5,
      opacity: n.recovery >= 5 ? 0.75 : 1,
      side: THREE.DoubleSide,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(domeR, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(recX, baseH, recZ);
    dome.castShadow = true;
    group.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(domeR, 0.28, 8, 30), new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), roughness: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(recX, baseH + 0.15, recZ);
    group.add(ring);

    // Havuz (seviye 2+)
    if (n.recovery >= 2) {
      const poolW = 10 + n.recovery * 2.2;
      const pool = new THREE.Mesh(
        new THREE.BoxGeometry(poolW, 0.4, 9),
        new THREE.MeshStandardMaterial({
          color: 0x0ea5e9,
          transparent: true,
          opacity: 0.82,
          roughness: 0.08,
          metalness: 0.25,
          emissive: new THREE.Color(0x0e7490),
          emissiveIntensity: night ? 0.5 : 0.18,
        })
      );
      pool.position.set(recX + 24, 0.22, recZ + 14);
      group.add(pool);
      const deck = block(poolW + 4, 0.3, 13, 0xe2e8f0, { rough: 0.9 });
      deck.position.set(recX + 24, 0.12, recZ + 14);
      group.add(deck);
    }
    // Buz banyoları (seviye 4+)
    if (n.recovery >= 4) {
      const iceMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.25, metalness: 0.15, emissive: new THREE.Color(0x60a5fa), emissiveIntensity: 0.25 });
      [-1, 1].forEach(s => {
        const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.35, 1.3, 16), iceMat);
        tub.position.set(recX - 20, 0.65, recZ + 16 + s * 5);
        tub.castShadow = true;
        group.add(tub);
      });
    }
    // Sauna bacası (seviye 3+)
    if (n.recovery >= 3) {
      const chimney = block(1.4, 9, 1.4, 0x8b5a2b);
      chimney.position.set(recX - 12, 4.5, recZ - 7);
      group.add(chimney);
    }
  }

  /* ── Taktik & Analiz Merkezi (tactics) ── */
  const tacX = 52;
  const tacZ = -50;
  {
    const h = 7 + n.tactics * 1.1;
    const shell = block(28, h, 18, night ? 0x3b3350 : 0xcfc7dd, { rough: 0.6, metal: 0.12 });
    shell.position.set(tacX, h / 2, tacZ);
    group.add(shell);

    // Dev analiz ekranı (cephede, seviyeyle büyür)
    const screenTex = analysisScreenTexture('TAKTİK TAHTASI', accent);
    if (screenTex) textTextures.push(screenTex);
    const screenW = 12 + n.tactics * 1.8;
    const screenH = 5 + n.tactics * 0.9;
    const screenMat = new THREE.MeshStandardMaterial({
      color: screenTex ? 0xffffff : 0x0b1220,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: night ? 0.95 : 0.55,
      roughness: 0.22,
      side: THREE.DoubleSide,
    });
    if (screenTex) {
      screenMat.map = screenTex;
      screenMat.emissiveMap = screenTex;
    }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenW, screenH), screenMat);
    screen.position.set(tacX, h * 0.62, tacZ + 9.2);
    group.add(screen);
    const frame = block(screenW + 1.2, screenH + 1.2, 0.4, 0x1f2937, { metal: 0.4 });
    frame.position.set(tacX, h * 0.62, tacZ + 9.0);
    group.add(frame);

    // Uydu anteni (seviye 3+)
    if (n.tactics >= 3) {
      const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.35, roughness: 0.4, side: THREE.DoubleSide }));
      dish.rotation.x = -Math.PI / 2.6;
      dish.position.set(tacX - 10, h + 2.6, tacZ - 4);
      group.add(dish);
      const pole = block(0.4, 3, 0.4, 0x6b7280, { metal: 0.6 });
      pole.position.set(tacX - 10, h + 1.2, tacZ - 4);
      group.add(pole);
    }
    // Kubbeli analiz odası + ışık direği (seviye 4+)
    if (n.tactics >= 4) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(5.4, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xa5b4fc, roughness: 0.3, metalness: 0.25 }));
      dome.position.set(tacX + 7, h, tacZ - 3);
      dome.castShadow = true;
      group.add(dome);
    }
    // Bayrak direkleri (seviye 5)
    if (n.tactics >= 5) {
      const flagMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(clubColor), side: THREE.DoubleSide, roughness: 0.8 });
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.3 });
      for (let i = 0; i < 3; i++) {
        const pivot = new THREE.Object3D();
        const poleH = 10;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, poleH, 6), poleMat);
        pole.position.y = poleH / 2;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.8), flagMat);
        cloth.position.set(1.5, poleH - 1, 0);
        pivot.add(pole, cloth);
        pivot.position.set(tacX - 12 + i * 12, 0, tacZ + 14);
        group.add(pivot);
        flags.push(pivot);
      }
    }
  }

  /* ── Altyapı Sahası & Gençlik Merkezi (youth) ── */
  const youthPitches = Math.min(3, n.youth);
  for (let i = 0; i < youthPitches; i++) {
    const z = 52 + (i - (youthPitches - 1) / 2) * 30;
    const miniTex = trainingPitchTexture(Math.min(FACILITY_MAX_LEVEL, n.youth + 1), false, '⚽');
    const miniMat = new THREE.MeshStandardMaterial({ color: miniTex ? (night ? 0x8a9a86 : 0xffffff) : 0x3f8f4b, roughness: 0.95 });
    if (miniTex) miniMat.map = miniTex;
    const mini = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), miniMat);
    mini.rotation.x = -Math.PI / 2;
    mini.position.set(-54, 0.02, z);
    mini.receiveShadow = true;
    group.add(mini);
    // Mini kale çiftleri
    [-1, 1].forEach(d => {
      const g2 = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 8), goalMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.y = 1.7;
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 8), goalMat);
      l.position.set(0, 0.85, -2.2);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 8), goalMat);
      r.position.set(0, 0.85, 2.2);
      g2.add(bar, l, r);
      g2.position.set(-54 + d * 22, 0, z);
      group.add(g2);
    });
    // Genç oyuncular
    for (let k = 0; k < 5; k++) {
      const kid = makePlayerFigure(i === 0 ? clubColor : accent, 0xe8b48a);
      kid.scale.setScalar(0.82);
      kid.position.set(-66 + k * 6, 0, z + (k % 2 === 0 ? 6 : -6));
      group.add(kid);
    }
  }
  // Altyapı binası
  {
    const h = 4 + n.youth * 0.7;
    const shed = block(16, h, 10, night ? 0x3a4a3a : 0xc7d2c0, { rough: 0.85 });
    shed.position.set(-92, h / 2, 52);
    group.add(shed);
    const roof = block(17, 0.6, 11, clubColor);
    roof.position.set(-92, h + 0.3, 52);
    group.add(roof);
    if (n.youth >= 3) {
      // Top arabaları + işaret levhaları
      const cartMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
      for (let i = 0; i < 2; i++) {
        const cart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.6), cartMat);
        cart.position.set(-78, 0.6, 66 + i * 10);
        cart.castShadow = true;
        group.add(cart);
      }
    }
    if (n.youth >= 4) {
      // Küçük veli tribünü
      const standMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
      for (let r = 0; r < 3; r++) {
        const row = new THREE.Mesh(new THREE.BoxGeometry(30, 0.7, 2), standMat);
        row.position.set(-54, 0.45 + r * 0.8, 70 + r * 2);
        group.add(row);
      }
    }
    if (n.youth >= 5) {
      // Gençlik akademisi kulesi + bayrak
      const tower = block(6, 12, 6, night ? 0x334155 : 0xdfe6ee, { rough: 0.5 });
      tower.position.set(-104, 6, 40);
      group.add(tower);
      const pivot = new THREE.Object3D();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7 }));
      pole.position.y = 3;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), side: THREE.DoubleSide }));
      cloth.position.set(1.3, 5, 0);
      pivot.add(pole, cloth);
      pivot.position.set(-104, 12, 40);
      group.add(pivot);
      flags.push(pivot);
    }
  }

  /* ── Çevre düzeni: çit, ağaçlar, yol, otopark ── */
  {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x54606f, metalness: 0.4, roughness: 0.6 });
    const railLen = 250;
    // Çevre çimi (parsel)
    [[0, -92, railLen, 0.35], [0, 92, railLen, 0.35], [-124, 0, 0.35, 184], [124, 0, 0.35, 184]].forEach(([x, z, w, d]) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), fenceMat);
      rail.position.set(x, 1.6, z);
      group.add(rail);
    });
    // Ağaçlar
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: night ? 0x1f3d2a : 0x2f7a44, roughness: 0.95 });
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2;
      const r = 108 + (i % 4) * 9;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r * 0.72;
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 4.6, 8), trunkMat);
      trunk.position.y = 2.3;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(3.1, 12, 10), leafMat);
      crown.position.y = 6.4;
      crown.castShadow = true;
      t.add(trunk, crown);
      t.position.set(x, 0, z);
      group.add(t);
    }
    // Otopark + kulüp servis minibüsü
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), new THREE.MeshStandardMaterial({ color: 0x3a4150, roughness: 1 }));
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(-20, 0.01, -86);
    lot.receiveShadow = true;
    group.add(lot);
    const bus = new THREE.Group();
    const body = block(11, 3, 2.8, clubColor, { rough: 0.45, metal: 0.2 });
    body.position.y = 1.8;
    const win = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.1, 2.9), glassMaterial(night, '#93c5fd'));
    win.position.y = 2.5;
    bus.add(body, win);
    bus.position.set(-24, 0, -86);
    group.add(bus);
  }

  /* ── Ön izleme vurgusu ── */
  if (opts.highlight) {
    const haloColor = new THREE.Color(0xfbbf24);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(14, 17, 40),
      new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    halo.rotation.x = -Math.PI / 2;
    const spots: Record<FacilityModuleId, [number, number]> = {
      pitch: [0, 0],
      gym: [gymX, gymZ],
      recovery: [recX, recZ + 6],
      tactics: [tacX, tacZ + 6],
      youth: [-54, 52],
    };
    const [hx, hz] = spots[opts.highlight];
    halo.position.set(hx, 0.14, hz);
    group.add(halo);
  }

  /* ── Işıklandırma ── */
  const hemi = new THREE.HemisphereLight(night ? 0x2b3c58 : 0xbcd9ff, night ? 0x101a2e : 0x40532f, night ? 0.78 : 0.92);
  group.add(hemi);
  const sun = new THREE.DirectionalLight(night ? 0x9fb0cc : 0xfff4d6, night ? 0.42 : 1.28);
  sun.position.set(95, 130, 75);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -170;
  sun.shadow.camera.right = 170;
  sun.shadow.camera.top = 170;
  sun.shadow.camera.bottom = -170;
  sun.shadow.camera.far = 460;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.9;
  group.add(sun);

  if (night) {
    // Sadece iki nokta ışık — performans dostu
    [[-62, -40], [62, -40]].forEach(([x, z]) => {
      const light = new THREE.PointLight(0xffe9a8, 30000, 220, 1.9);
      light.position.set(x, 24, z);
      group.add(light);
    });
  }

  /* ── Animasyon ── */
  const update = (t: number, dt: number) => {
    // Oyuncular sahada koşar
    runners.forEach(r => {
      r.angle += dt * r.speed;
      r.fig.position.set(Math.cos(r.angle) * r.radius, Math.abs(Math.sin(t * 6 + r.angle)) * 0.09, Math.sin(r.angle) * r.radius * 0.55);
      r.fig.rotation.y = -r.angle + Math.PI / 2;
    });
    // Sulama jetleri döner
    sprinklers.forEach((s, i) => {
      s.rotation.y = Math.sin(t * 0.6 + i) * 1.1;
    });
    // Toplar hafif hareket (drill hissi)
    balls.forEach((b, i) => {
      b.position.y = 0.34 + Math.abs(Math.sin(t * 1.4 + i)) * 0.12;
      b.rotation.x += dt * 0.8;
    });
    // Bayraklar dalgalanır
    flags.forEach((f, i) => {
      f.rotation.y = Math.sin(t * 1.4 + i * 0.7) * 0.3;
    });
    // Analiz ekranı kayar
    textTextures.forEach(tex => {
      tex.offset.x = (tex.offset.x + dt * 0.05) % 1;
    });
    // Gece projektör nefesi
    if (night) {
      floodlights.forEach((fl, i) => {
        const m = (fl as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m && 'emissiveIntensity' in m) m.emissiveIntensity = 0.9 + Math.sin(t * 1.3 + i) * 0.15;
      });
    }
  };

  return {
    group,
    update,
    camera: { radius: 122, phi: 0.88, theta: 0.86, targetY: 8, fov: 46 },
    sky: night ? '#0a1024' : '#7fb2e5',
    fog: night ? ['#0a1024', 180, 460] : ['#7fb2e5', 200, 500],
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
