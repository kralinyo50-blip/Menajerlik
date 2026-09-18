import * as THREE from 'three';
import { StandStyle, StadiumDesign } from '../../types/game';

const hasDom = typeof document !== 'undefined';

/* ══════════════ YARDIMCILAR ══════════════ */

function makeCanvas(w: number, h: number) {
  if (!hasDom) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Gökyüzü gradyanı — gündüz ufuk geçişi, gece yıldızlı lacivert */
function skyGradientTexture(night: boolean): THREE.Texture | null {
  const canvas = makeCanvas(16, 512);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (night) {
    grad.addColorStop(0, '#04060e');
    grad.addColorStop(0.5, '#0b1428');
    grad.addColorStop(1, '#22314e');
  } else {
    grad.addColorStop(0, '#2f6fb5');
    grad.addColorStop(0.5, '#7db4e8');
    grad.addColorStop(1, '#d9eaf7');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 512);
  if (night) {
    // Yıldızlar — üst yarıda seyrek, alta doğru kaybolur
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * 16;
      const y = Math.random() * 300;
      const a = 0.25 + Math.random() * 0.7 * (1 - y / 320);
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      ctx.fillRect(x, y, Math.random() < 0.2 ? 1.6 : 1, Math.random() < 0.2 ? 1.6 : 1);
    }
  } else {
    // Gündüz: yumuşak bulut bantları
    for (let i = 0; i < 16; i++) {
      const y = 120 + Math.random() * 300;
      ctx.fillStyle = `rgba(255,255,255,${(0.05 + Math.random() * 0.09).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 16, y, 10 + Math.random() * 8, 4 + Math.random() * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Stadyum dış alanı: beton parke (derzli kareler + hafif ton farkı) */
function plazaTexture(night: boolean): THREE.Texture | null {
  const canvas = makeCanvas(256, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const base = night ? '#404954' : '#8d959e';
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const tile = 32;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const shade = ((x * 7 + y * 13) % 5) * 3;
      ctx.fillStyle = `rgba(255,255,255,${(shade / 100).toFixed(3)})`;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }
  ctx.strokeStyle = night ? 'rgba(0,0,0,0.45)' : 'rgba(60,66,74,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += tile) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Dış cephe paneli: düşey kaburgalar + cam şerit (+ gece yanan ışıklar) */
function facadeTexture(clubColor: string, night: boolean): THREE.Texture | null {
  const canvas = makeCanvas(256, 128);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = night ? '#2a3341' : '#c7ced6';
  ctx.fillRect(0, 0, 256, 128);
  // Düşey kaburgalar
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = night ? 'rgba(0,0,0,0.28)' : 'rgba(90,100,112,0.32)';
    ctx.fillRect(x, 0, 3, 128);
  }
  // Cam şerit (üstte): gece bazı bölmeler yanar
  for (let x = 4; x < 256; x += 16) {
    const lit = night && Math.random() < 0.5;
    ctx.fillStyle = lit ? 'rgba(255,214,150,0.9)' : night ? 'rgba(20,28,42,0.85)' : 'rgba(70,92,116,0.55)';
    ctx.fillRect(x, 12, 12, 26);
  }
  // Kulüp rengi zemin bandı
  ctx.fillStyle = clubColor;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, 108, 256, 20);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Skorbord ekranı: takım adları, skor, dakika + alt LED şerit */
function scoreboardTexture(accent: string, clubColor: string, teamName: string): THREE.Texture | null {
  const canvas = makeCanvas(512, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#04070f';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = clubColor;
  ctx.fillRect(0, 0, 512, 14);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 14, 512, 6);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(teamName.toUpperCase().slice(0, 14), 22, 66);
  ctx.fillText('MİSAFİR', 22, 122);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.fillText('2', 372, 78);
  ctx.fillText('1', 452, 78);
  ctx.fillStyle = accent;
  ctx.fillRect(418, 44, 10, 58);
  ctx.fillStyle = 'rgba(148,163,184,0.95)';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText("67'", 372, 140);
  ctx.fillStyle = clubColor;
  for (let i = 0; i < 24; i++) ctx.fillRect(22 + i * 20, 210, 12, 8);
  ctx.fillStyle = 'rgba(226,232,240,0.85)';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('STADYUM', 22, 240);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Tribün cephesi için uzun sponsor şeridi (sabit marka bandı) */
function bannerTexture(text: string, accent: string): THREE.Texture | null {
  const canvas = makeCanvas(1024, 64);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 64);
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const label = text.toUpperCase();
  let x = 12;
  let i = 0;
  while (x < 1024) {
    ctx.fillStyle = i % 2 === 0 ? accent : '#e2e8f0';
    ctx.fillText(label, x, 34);
    x += ctx.measureText(label).width + 28;
    i++;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Çim dokusu: çizgiler + saha çizgileri + (opsiyonel) orta yuvarlak logo */
function pitchTexture(design: StadiumDesign, logo: string): THREE.Texture | null {
  const canvas = makeCanvas(1024, 680);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const W = canvas.width;
  const H = canvas.height;

  // Çim zemin
  ctx.fillStyle = '#2b8a3e';
  ctx.fillRect(0, 0, W, H);

  if (design.pitchPattern === 'stripes') {
    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2f9e44' : '#37b24d';
      ctx.fillRect((W / stripes) * i, 0, W / stripes, H);
    }
  } else if (design.pitchPattern === 'rings') {
    ctx.fillStyle = '#2f9e44';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#37b24d';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 44;
      ctx.strokeRect(W * 0.5 - (i + 1) * (W / 22), H * 0.5 - (i + 1) * (H / 16), (i + 1) * (W / 11), (i + 1) * (H / 8));
    }
  } else {
    ctx.fillStyle = '#349646';
    ctx.fillRect(0, 0, W, H);
  }

  // Çizgiler
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.beginPath();
  ctx.moveTo(W / 2, 20);
  ctx.lineTo(W / 2, H - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();

  // Ceza sahaları
  const boxW = 170;
  const boxH = 320;
  ctx.strokeRect(20, (H - boxH) / 2, boxW, boxH);
  ctx.strokeRect(W - 20 - boxW, (H - boxH) / 2, boxW, boxH);
  ctx.strokeRect(20, (H - 130) / 2, 70, 130);
  ctx.strokeRect(W - 90, (H - 130) / 2, 70, 130);
  // Penaltı noktaları
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); ctx.arc(20 + 120, H / 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W - 20 - 120, H / 2, 5, 0, Math.PI * 2); ctx.fill();
  // Penaltı yayları
  ctx.beginPath(); ctx.arc(20 + 120, H / 2, 78, -Math.PI / 2.6, Math.PI / 2.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(W - 20 - 120, H / 2, 78, Math.PI - Math.PI / 2.6, Math.PI + Math.PI / 2.6); ctx.stroke();
  // Köşe yayları
  [[20, 20, 0], [W - 20, 20, Math.PI / 2], [20, H - 20, -Math.PI / 2], [W - 20, H - 20, Math.PI]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, 14, r + Math.PI / 2, r + Math.PI, false); ctx.stroke();
  });
  // Teknik alan çizgileri (orta saha kenarları)
  ctx.strokeRect(W / 2 - 130, H - 66, 260, 46);
  ctx.strokeRect(W / 2 - 130, 20, 260, 46);

  // Orta sahada kulüp logosu / baş harfler
  if (design.logoOnPitch) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.font = '120px serif';
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

/** Tribün yüzeyi için kalabalık dokusu (uzaktan seyirci gibi görünür) */
function crowdTexture(seatColor: string): THREE.Texture | null {
  const canvas = makeCanvas(256, 256);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = seatColor;
  ctx.fillRect(0, 0, 256, 256);

  const skin = ['#e8b48a', '#c98b5e', '#8d5b3a', '#f2d2b3'];
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const roll = Math.random();
    if (roll < 0.22) {
      ctx.fillStyle = skin[Math.floor(Math.random() * skin.length)];
    } else if (roll < 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
    } else if (roll < 0.72) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
    } else {
      continue;
    }
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** LED reklam panosu dokusu (kayan yazı) */
function ledTexture(text: string, color: string): THREE.Texture | null {
  const canvas = makeCanvas(512, 64);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = color;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 6; i++) {
    ctx.fillText(text, 20 + i * 170, 34);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tribün kesiti: basamaklı kama profili (ExtrudeGeometry ile uzatılır).
 * Profil: ön kenar zeminden başlar, her basamak yükselir, arka duvardan zemine iner.
 */
function standProfile(rows: number, style: StandStyle, isDouble: boolean) {
  const shape = new THREE.Shape();
  const rowDepth = style === 'stepped' ? 1.9 : 1.55;
  const rowRise = style === 'stepped' ? 0.95 : 1.15;
  const tiers = isDouble ? 2 : 1;
  const rowsPerTier = Math.max(3, Math.round(rows / tiers));
  const aisleGap = isDouble ? 5 : 0;

  shape.moveTo(0, 0);
  let x = 0;
  let y = 0;
  for (let t = 0; t < tiers; t++) {
    for (let r = 0; r < rowsPerTier; r++) {
      x += rowDepth;
      shape.lineTo(x, y);        // basamak yüzeyi (tread)
      y += rowRise;
      shape.lineTo(x, y);        // basamak yükselişi (riser)
    }
    if (t < tiers - 1) {
      x += aisleGap;
      y += 1.4;
      shape.lineTo(x, y);        // katlar arası geçiş koridoru
    }
  }
  shape.lineTo(x, 0);            // arka duvar zemine iner
  shape.closePath();             // zemin çizgisi ön kenara döner

  return { shape, depth: x, height: y };
}

export interface StadiumBuildOptions {
  /** Toplam koltuk kapasitesi */
  capacity: number;
  /** Kulüp logosu (emoji) */
  logo?: string;
  /** Reklam panosu metni */
  sponsorText?: string;
  /** Gece modu — projektörler yanar */
  night?: boolean;
  /** Yağmur yağıyor ve çatı korumuyor → zemin ıslak */
  wet?: boolean;
  /** Kulüp adı — skorbord ve giriş tabelasında görünür */
  teamName?: string;
}

export interface StadiumSceneBundle {
  group: THREE.Group;
  /** Animasyon için referanslar */
  animated: {
    flags: THREE.Object3D[];
    ledTextures: THREE.Texture[];
    floodlights: THREE.Object3D[];
    crowdMaterials: THREE.MeshStandardMaterial[];
  };
  rows: number;
  seats: number;
  /** Tribün ve köşe blokları (geometri doğrulaması için) */
  standMeshes: THREE.Object3D[];
  /** Gökyüzü dokusu (izleyici arka planı için) */
  skyTexture: THREE.Texture | null;
  /** Yedek gökyüzü rengi (doku üretilemezse) */
  sky: number;
  triCount: () => number;
}

/** 3D stadyum modelini prosedürel olarak kurar (WebGL gerektirmez) */
export function buildStadiumGroup(design: StadiumDesign, opts: StadiumBuildOptions): StadiumSceneBundle {
  const group = new THREE.Group();
  const flags: THREE.Object3D[] = [];
  const ledTextures: THREE.Texture[] = [];
  const floodlights: THREE.Object3D[] = [];
  const crowdMaterials: THREE.MeshStandardMaterial[] = [];
  const standMeshes: THREE.Object3D[] = [];

  const rows = Math.max(4, Math.min(30, Math.round(opts.capacity / 1600)));
  const seats = rows * 4 * 42;

  const PITCH_L = 105;
  const PITCH_W = 68;
  const MARGIN = 8;

  /* ── Zemin (dış alan) ── */
  const plazaTex = plazaTexture(!!opts.night);
  const groundMat = new THREE.MeshStandardMaterial({
    color: plazaTex ? 0xffffff : (opts.night ? 0x3d4550 : 0x6b7585),
    roughness: 1,
  });
  if (plazaTex) {
    plazaTex.repeat.set(33, 31);   // ~1.5 m'lik parke taşları
    groundMat.map = plazaTex;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(380, 360), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.06;
  ground.receiveShadow = true;
  group.add(ground);

  /* ── Saha çevresi (apron) ── */
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_L + MARGIN * 2, PITCH_W + MARGIN * 2),
    new THREE.MeshStandardMaterial({ color: opts.night ? 0x3f5a32 : 0x5c7a44, roughness: 0.98 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0;
  apron.receiveShadow = true;
  group.add(apron);

  /* ── Çim ── */
  const pitchTex = pitchTexture(design, opts.logo ?? '⚽');
  const pitchMat = new THREE.MeshStandardMaterial({
    color: pitchTex ? 0xffffff : 0x37994a,
    roughness: opts.wet ? 0.52 : 0.95,
    metalness: opts.wet ? 0.08 : 0.0,
    // Gece projektör altında çim hafifçe kendi kendine aydınlanır (gerçekte de parlak görünür)
    emissive: opts.wet ? new THREE.Color(0x1a3a25) : (opts.night && design.floodlights ? new THREE.Color(0x14351f) : new THREE.Color(0x000000)),
    emissiveIntensity: opts.wet ? (opts.night ? 0.22 : 0.08) : (opts.night && design.floodlights ? 0.5 : 0),
  });
  if (pitchTex) pitchMat.map = pitchTex;
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PITCH_L, PITCH_W), pitchMat);
  pitch.userData.previewColor = design.pitchPattern === 'stripes' ? 0x349646 : design.pitchPattern === 'rings' ? 0x2f9e44 : 0x3aa04e;
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.03;
  pitch.receiveShadow = true;
  group.add(pitch);

  /* ── Tribünler ── */
  const isDouble = design.stands === 'double' || design.stands === 'bowl';
  const { shape, depth, height } = standProfile(rows, design.stands, isDouble);
  const crowdTex = crowdTexture(design.seatColor);
  const standMat = new THREE.MeshStandardMaterial({
    color: crowdTex ? 0xffffff : new THREE.Color(design.seatColor).getHex(),
    roughness: 0.9,
    metalness: 0.05
  });
  if (crowdTex) standMat.map = crowdTex;
  crowdMaterials.push(standMat);
  const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor).multiplyScalar(0.55), roughness: 0.85 });

  const sides: { length: number; pos: [number, number]; rotY: number }[] = [
    { length: PITCH_L + MARGIN * 2 + 6, pos: [0, -(PITCH_W / 2 + MARGIN)], rotY: 0 },              // güney
    { length: PITCH_L + MARGIN * 2 + 6, pos: [0, PITCH_W / 2 + MARGIN], rotY: Math.PI },          // kuzey
    { length: PITCH_W + MARGIN * 2 + 6, pos: [-(PITCH_L / 2 + MARGIN), 0], rotY: Math.PI / 2 },   // batı
    { length: PITCH_W + MARGIN * 2 + 6, pos: [PITCH_L / 2 + MARGIN, 0], rotY: -Math.PI / 2 },     // doğu
  ];

  sides.forEach(side => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: side.length, bevelEnabled: false });
    // Ekstrüzyon +Z yönünde; tribünü uzunluk ekseni X'e çevir ve derinliği sahaya ters (dışa) yönlendir
    geo.rotateY(Math.PI / 2);
    geo.translate(-side.length / 2, 0, 0);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, [standMat, wallMat]);
    mesh.position.set(side.pos[0], 0, side.pos[1]);
    mesh.rotation.y = side.rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.previewColor = new THREE.Color(design.seatColor).getHex();
    group.add(mesh);
    standMeshes.push(mesh);

    /* ── Çatı (yalnızca tribünün üstünde, sahaya sarkmaz) ── */
    if (design.roof !== 'none') {
      const roofCoverage = design.roof === 'canopy' ? 0.62 : 0.85;
      const roofInnerZ = -(depth * (1 - roofCoverage));   // sahaya bakan iç kenar
      const roofOuterZ = -(depth + 3.0);                  // arka duvarın dışı
      const roofDepth = Math.abs(roofInnerZ - roofOuterZ);
      const roofHeight = height + 5.5;
      const roofThickness = design.roof === 'glass' ? 0.35 : 0.85;

      const roofMat = design.roof === 'glass'
        ? new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.3, roughness: 0.08, metalness: 0.4, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: 0x7c8698, roughness: 0.72, metalness: 0.22 });

      const roofPivot = new THREE.Object3D();
      const roof = new THREE.Mesh(new THREE.BoxGeometry(side.length + 1.5, roofThickness, roofDepth), roofMat);
      roof.position.set(0, roofHeight, (roofInnerZ + roofOuterZ) / 2);
      roof.rotation.x = 0.14;
      roof.castShadow = true;
      roofPivot.add(roof);

      // Çatı kenar bandı (aksan renginde)
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(side.length + 1.8, 0.85, 0.5),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor), roughness: 0.6 })
      );
      trim.position.set(0, roofHeight - 0.35, roofInnerZ + 0.3);
      roofPivot.add(trim);

      // Çatı altı aydınlatma şeridi — gece tribünü yıkar (soffit)
      const soffit = new THREE.Mesh(
        new THREE.BoxGeometry(side.length + 1.0, 0.24, 0.5),
        new THREE.MeshStandardMaterial({
          color: 0xfff4d0,
          emissive: new THREE.Color(0xffe6a8),
          emissiveIntensity: opts.night ? 1.15 : 0.08,
          roughness: 0.3,
        })
      );
      soffit.position.set(0, roofHeight - 1.15, roofInnerZ + 0.6);
      roofPivot.add(soffit);

      // Dış kenar bandı: kulüp adı yazan fascia (uzaktan takım kimliği)
      const fasciaTex = bannerTexture(opts.teamName ?? 'STADYUM', design.accentColor);
      const fasciaMat = new THREE.MeshStandardMaterial({
        color: fasciaTex ? 0xffffff : new THREE.Color(design.accentColor).getHex(),
        roughness: 0.6,
        metalness: 0.1,
        emissive: new THREE.Color(opts.night ? 0x2a3446 : 0x000000),
        emissiveIntensity: opts.night ? 0.35 : 0,
      });
      if (fasciaTex) {
        fasciaTex.repeat.set(Math.max(3, side.length / 28), 1);
        fasciaMat.map = fasciaTex;
        if (opts.night) fasciaMat.emissiveMap = fasciaTex;
      }
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(side.length + 1.6, 1.7, 0.35), fasciaMat);
      fascia.position.set(0, roofHeight - 0.5, roofOuterZ - 0.15);
      fascia.castShadow = true;
      roofPivot.add(fascia);

      // Destek kirişleri: tribünün arkasından çatıya uzanan konsol
      const trussMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b4, metalness: 0.55, roughness: 0.4 });
      const trussCount = Math.max(3, Math.round(side.length / 26));
      for (let i = 0; i < trussCount; i++) {
        const xPos = -side.length / 2 + (side.length / (trussCount - 1 || 1)) * i;
        const truss = new THREE.Mesh(new THREE.BoxGeometry(0.6, roofHeight, 0.6), trussMat);
        truss.position.set(xPos, (height + roofHeight) / 2 - 0.5, -(depth + 2.4));
        roofPivot.add(truss);
      }

      const wrapper = new THREE.Object3D();
      wrapper.position.set(side.pos[0], 0, side.pos[1]);
      wrapper.rotation.y = side.rotY;
      wrapper.add(roofPivot);
      group.add(wrapper);
    }

    /* ── Dış cephe: kaburgalı panel + giriş kapıları + aksan bandı ── */
    {
      const wrap = new THREE.Object3D();
      wrap.position.set(side.pos[0], 0, side.pos[1]);
      wrap.rotation.y = side.rotY;
      group.add(wrap);

      const facadeH = Math.max(3.4, height * 0.62);
      const facadeTex = facadeTexture(design.accentColor, !!opts.night);
      const facadeMat = new THREE.MeshStandardMaterial({
        color: facadeTex ? 0xffffff : 0xb9c1ca,
        roughness: 0.8,
        metalness: 0.05,
      });
      if (facadeTex) {
        facadeTex.repeat.set(Math.max(3, side.length / 14), 1);
        facadeMat.map = facadeTex;
      }
      const facade = new THREE.Mesh(new THREE.BoxGeometry(side.length - 4, facadeH, 0.55), facadeMat);
      facade.position.set(0, facadeH / 2, -(depth + 0.3));
      facade.castShadow = true;
      facade.receiveShadow = true;
      wrap.add(facade);

      // Giriş kapıları: koyu açıklık (gece içi aydınlık) + saçak + aksan bant
      const gateCount = Math.max(2, Math.round(side.length / 26));
      const gateMat = new THREE.MeshStandardMaterial({
        color: 0x141a25,
        roughness: 0.85,
        emissive: new THREE.Color(0xffd9a0),
        emissiveIntensity: opts.night ? 0.45 : 0.0,
      });
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe2e7ee, roughness: 0.6, metalness: 0.15 });
      const gateBandMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor), roughness: 0.55 });
      for (let i = 0; i < gateCount; i++) {
        const gx = (i / Math.max(1, gateCount - 1) - 0.5) * side.length * 0.72;
        const opening = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.8, 0.5), gateMat);
        opening.position.set(gx, 1.4, -(depth + 0.62));
        wrap.add(opening);
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.3, 2.3), canopyMat);
        canopy.position.set(gx, 3.15, -(depth + 1.15));
        canopy.castShadow = true;
        wrap.add(canopy);
        const band = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.42, 0.3), gateBandMat);
        band.position.set(gx, 3.0, -(depth + 2.24));
        wrap.add(band);
      }
    }

    /* ── Bayraklar (tribün üstü) ── */
    if (design.flags) {
      const flagMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor), side: THREE.DoubleSide, roughness: 0.8 });
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.3 });
      const flagCount = Math.max(4, Math.round(side.length / 12));
      for (let i = 0; i < flagCount; i++) {
        const pivot = new THREE.Object3D();
        const poleH = 6;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, poleH, 6), poleMat);
        pole.position.y = poleH / 2;
        pivot.add(pole);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2), flagMat);
        cloth.position.set(1.7, poleH - 1.2, 0);
        pivot.add(cloth);
        pivot.position.set(
          -side.length / 2 + (side.length / (flagCount - 1 || 1)) * i,
          height + 2.2,
          -(depth + 1.1)
        );
        const holder = new THREE.Object3D();
        holder.position.set(side.pos[0], 0, side.pos[1]);
        holder.rotation.y = side.rotY;
        holder.add(pivot);
        group.add(holder);
        flags.push(pivot);
      }
    }
  });

  if (design.stands === 'bowl') {
    // Köşe dolgu blokları: çapı ve konumu sahaya taşmayacak şekilde hesaplanır
    const cornerMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(design.seatColor).multiplyScalar(0.98), roughness: 0.88 });
    const r = depth * 0.55;
    const cx = PITCH_L / 2 + MARGIN + r * 0.75;
    const cz = PITCH_W / 2 + MARGIN + r * 0.75;
    [[-cx, -cz], [cx, -cz], [-cx, cz], [cx, cz]].forEach(([x, z]) => {
      // Sahanın merkezine bakan çeyrek silindir
      const dirX = -Math.sign(x);
      const dirZ = -Math.sign(z);
      const thetaStart = Math.atan2(dirX, dirZ) - Math.PI / 4;
      const corner = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 1.06, height * 0.68, 24, 1, false, thetaStart, Math.PI / 2),
        cornerMat
      );
      corner.position.set(x, height * 0.34, z);
      corner.castShadow = true;
      group.add(corner);
      standMeshes.push(corner);
    });
  }

  /* ── Skorbord (kuzey tribünün üstünde) ── */
  const scoreboardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(18, 8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.35 })
  );
  const sbTex = scoreboardTexture(design.accentColor, design.seatColor, opts.teamName ?? 'EV SAHİBİ');
  const screenMat = new THREE.MeshStandardMaterial({
    color: sbTex ? 0xffffff : 0x0b1220,
    emissive: new THREE.Color(sbTex ? 0xffffff : 0x2dd4bf),
    emissiveIntensity: opts.night ? 0.95 : 0.5,
    roughness: 0.25
  });
  if (sbTex) {
    screenMat.map = sbTex;
    screenMat.emissiveMap = sbTex;
  }
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 6.2), screenMat);
  screen.position.z = 0.62;
  const boardGroup = new THREE.Group();
  boardGroup.add(scoreboardFrame, screen);
  const sbZ = -(PITCH_W / 2 + MARGIN + depth * 0.35);
  const sbY = height + 4.5;
  boardGroup.position.set(0, sbY, sbZ);
  group.add(boardGroup);
  // Skorbord ayakları
  const legMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.4, roughness: 0.5 });
  [-6, 6].forEach(xOff => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, sbY, 0.5), legMat);
    leg.position.set(xOff, sbY / 2, sbZ);
    group.add(leg);
  });
  // Skorbordun altında kulüp rengi şerit (tribünle bütünleşir)
  const sbSkirt = new THREE.Mesh(
    new THREE.BoxGeometry(18.4, 0.7, 0.4),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor), roughness: 0.6 })
  );
  sbSkirt.position.set(0, sbY - 4.35, sbZ + 0.35);
  group.add(sbSkirt);

  /* ── LED reklam panoları ── */
  const led = ledTexture(opts.sponsorText ?? 'MANAGER PRO 2026 • RESMİ SPONSOR •', design.accentColor);
  if (led) ledTextures.push(led);
  const ledMat = new THREE.MeshStandardMaterial({
    color: led ? 0xffffff : 0x111827,
    emissive: new THREE.Color(design.accentColor),
    emissiveIntensity: opts.night ? 0.65 : 0.45,
    side: THREE.DoubleSide
  });
  if (led) {
    ledMat.map = led;
    ledMat.emissiveMap = led;
  }
  const boards: { len: number; pos: [number, number]; rotY: number }[] = [
    { len: PITCH_L, pos: [0, -(PITCH_W / 2 + 3)], rotY: 0 },
    { len: PITCH_L, pos: [0, PITCH_W / 2 + 3], rotY: Math.PI },
    { len: PITCH_W, pos: [-(PITCH_L / 2 + 3), 0], rotY: Math.PI / 2 },
    { len: PITCH_W, pos: [PITCH_L / 2 + 3, 0], rotY: -Math.PI / 2 },
  ];
  boards.forEach(b => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(b.len, 1.05, 0.22), ledMat);
    board.position.set(b.pos[0], 0.58, b.pos[1]);
    board.rotation.y = b.rotY;
    group.add(board);
  });

  /* ── Kaleler ── */
  const goalMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.3 });
  [-1, 1].forEach(dir => {
    const goal = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.14, 0.14, 2.6, 8);
    const left = new THREE.Mesh(post, goalMat);
    left.position.set(0, 1.3, -3.66);
    const right = new THREE.Mesh(post, goalMat);
    right.position.set(0, 1.3, 3.66);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7.4, 8), goalMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, 2.6, 0);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 2.5, 7.3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    );
    net.position.set(dir * -1.0, 1.25, 0);
    goal.add(left, right, bar, net);
    goal.position.x = dir * (PITCH_L / 2);
    group.add(goal);
  });

  /* ── Projektörler ── */
  if (design.floodlights) {
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.75, roughness: 0.35 });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff6cc,
      emissive: new THREE.Color(0xfff2b0),
      emissiveIntensity: opts.night ? 0.85 : 0.25,
      roughness: 0.2
    });
    const cx = PITCH_L / 2 + MARGIN + depth * 0.75;
    const cz = PITCH_W / 2 + MARGIN + depth * 0.75;
    [[-cx, -cz], [cx, -cz], [-cx, cz], [cx, cz]].forEach(([x, z]) => {
      const pylon = new THREE.Group();
      const mastH = height + 16;
      // Kafes gövde: üçgen kesitli 3 bacak + çapraz çemberler
      const legSpread = 1.5;
      for (let li = 0; li < 3; li++) {
        const ang = (li / 3) * Math.PI * 2 + Math.PI / 6;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, mastH, 6), mastMat);
        leg.position.set(Math.cos(ang) * legSpread * 0.6, mastH / 2, Math.sin(ang) * legSpread * 0.6);
        leg.rotation.z = Math.cos(ang) * 0.03;
        leg.rotation.x = -Math.sin(ang) * 0.03;
        leg.castShadow = true;
        pylon.add(leg);
      }
      for (let ri = 1; ri <= 4; ri++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(legSpread * (0.55 + ri * 0.06), 0.11, 5, 14),
          mastMat
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = (mastH / 5) * ri;
        pylon.add(ring);
      }
      // Lamba kafası: 6 ayrı projektör + parlayan panel
      const headGroup = new THREE.Group();
      for (let li = 0; li < 6; li++) {
        const col = li % 3;
        const row = Math.floor(li / 3);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.45), lampMat);
        lamp.position.set((col - 1) * 2.4, row * 1.7, 0);
        headGroup.add(lamp);
      }
      const head = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.5, 0.3), mastMat);
      head.position.set(0, 0.85, -0.45);
      headGroup.add(head);
      headGroup.position.y = mastH + 1.4;
      headGroup.rotation.x = 0.35;
      pylon.add(headGroup);
      pylon.position.set(x, 0, z);
      pylon.lookAt(0, 0, 0);
      group.add(pylon);
      floodlights.push(headGroup.children[0] as THREE.Mesh);
    });
  }

  /* ── Çevre düzeni: giriş meydanı, bilet gişeleri, bayraklar, otopark, yeşil alan ── */
  const halfX = PITCH_L / 2 + MARGIN + depth + 4;
  const halfZ = PITCH_W / 2 + MARGIN + depth + 4;
  {
    const plazaMat = new THREE.MeshStandardMaterial({
      color: plazaTex ? 0xffffff : (opts.night ? 0x4a535f : 0x949ba4),
      roughness: 0.95,
    });
    if (plazaTex) plazaMat.map = plazaTex;
    const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor), roughness: 0.55 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b4, metalness: 0.6, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x27313f, roughness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fc7e8, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.75 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xfff3d0,
      emissive: new THREE.Color(0xffdf9a),
      emissiveIntensity: opts.night ? 1.2 : 0.1,
      roughness: 0.3,
    });

    // Ana giriş meydanı (kuzey yakası): yükseltilmiş platform
    const plazaW = Math.min(150, PITCH_L + 24);
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(plazaW, 0.16, 30), plazaMat);
    plaza.position.set(0, 0.08, halfZ + 15);
    plaza.receiveShadow = true;
    group.add(plaza);
    // Meydan kenarı: aksan bordür
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(plazaW + 1.2, 0.34, 0.7), accentMat);
    kerb.position.set(0, 0.17, halfZ + 30);
    group.add(kerb);

    // Bilet gişeleri (iki yanda simetrik)
    [-1, 1].forEach(sideSign => {
      const kiosk = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.2, 5), plazaMat);
      kiosk.position.set(sideSign * 20, 1.6, halfZ + 8);
      kiosk.castShadow = true;
      group.add(kiosk);
      const win = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 0.3), glassMat);
      win.position.set(sideSign * 20, 1.9, halfZ + 10.6);
      group.add(win);
      const roofK = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.36, 5.8), accentMat);
      roofK.position.set(sideSign * 20, 3.4, halfZ + 8);
      roofK.castShadow = true;
      group.add(roofK);
      // Gişe önü turnike sırası
      for (let t = 0; t < 4; t++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 1.6), steelMat);
        post.position.set(sideSign * (14 + t * 2.6), 0.72, halfZ + 12.5);
        group.add(post);
      }
    });

    // Ana giriş kapısı: saçak + cam cephe + takım tabelası
    const gateW = 26;
    const gate = new THREE.Mesh(new THREE.BoxGeometry(gateW, 7.4, 7), glassMat);
    gate.position.set(0, 3.7, halfZ + 3);
    gate.castShadow = true;
    group.add(gate);
    const gateCore = new THREE.Mesh(new THREE.BoxGeometry(gateW - 3, 7.4, 6.4), plazaMat);
    gateCore.position.set(0, 3.7, halfZ + 3.4);
    group.add(gateCore);
    const gateCanopy = new THREE.Mesh(new THREE.BoxGeometry(gateW + 2.5, 0.5, 10), accentMat);
    gateCanopy.position.set(0, 7.7, halfZ + 4.6);
    gateCanopy.castShadow = true;
    group.add(gateCanopy);
    const gateSignTex = bannerTexture(`${(opts.teamName ?? 'STADYUM').toUpperCase()} •`, '#f8fafc');
    const gateSignMat = new THREE.MeshStandardMaterial({
      color: gateSignTex ? 0xffffff : new THREE.Color(design.accentColor).getHex(),
      emissive: new THREE.Color(opts.night ? 0x33405a : 0x000000),
      emissiveIntensity: opts.night ? 0.5 : 0,
      roughness: 0.5,
      metalness: 0.2,
    });
    if (gateSignTex) {
      gateSignTex.repeat.set(gateW / 26, 1);
      gateSignMat.map = gateSignTex;
    }
    const gateSign = new THREE.Mesh(new THREE.BoxGeometry(gateW + 2.2, 1.7, 0.4), gateSignMat);
    gateSign.position.set(0, 8.9, halfZ + 8.9);
    group.add(gateSign);

    // Bayrak sırası: giriş yolunun iki yanı
    const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xc7ced8, metalness: 0.7, roughness: 0.3 });
    const flagA = new THREE.MeshStandardMaterial({ color: new THREE.Color(design.seatColor), side: THREE.DoubleSide, roughness: 0.8 });
    const flagB = new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor), side: THREE.DoubleSide, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      [-1, 1].forEach(sideSign => {
        const px = sideSign * (8 + i * 4.6);
        const pz = halfZ + 22 + i * 1.6;
        const fp = new THREE.Object3D();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8.2, 6), flagPoleMat);
        pole.position.y = 4.1;
        fp.add(pole);
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), (i + (sideSign > 0 ? 1 : 0)) % 2 === 0 ? flagA : flagB);
        cloth.position.set(1.6, 6.9, 0);
        fp.add(cloth);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), flagPoleMat);
        tip.position.y = 8.25;
        fp.add(tip);
        fp.position.set(px, 0, pz);
        group.add(fp);
        flags.push(fp);
      });
    }

    // Meydan aydınlatması: direk + ampul (gece parlar)
    const lampPost = (x: number, z: number) => {
      const post = new THREE.Object3D();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 6.4, 8), darkMat);
      pole.position.y = 3.2;
      pole.castShadow = true;
      post.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.7), glowMat);
      head.position.y = 6.5;
      post.add(head);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.9), darkMat);
      cap.position.y = 6.7;
      post.add(cap);
      post.position.set(x, 0, z);
      group.add(post);
    };
    [-60, -36, -12, 12, 36, 60].forEach(x => lampPost(x, halfZ + 27));
    [-46, 46].forEach(x => lampPost(x, -(halfZ + 12)));
    lampPost(halfX + 12, 0);
    lampPost(-(halfX + 12), 0);

    // Otopark (doğu yanı): asfalt + park çizgileri + araçlar
    const parkX = halfX + 30;
    const park = new THREE.Mesh(
      new THREE.BoxGeometry(46, 0.12, 62),
      new THREE.MeshStandardMaterial({ color: opts.night ? 0x2f3742 : 0x646d78, roughness: 0.95 })
    );
    park.position.set(parkX, 0.06, 0);
    park.receiveShadow = true;
    group.add(park);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xe8edf3, roughness: 0.8 });
    // İki sıra park yeri: çizgiler araç boyunca (X) uzanır, stallar Z'de 8 birim arayla
    [-10.5, 10.5].forEach(dx => {
      for (let i = -2; i <= 2; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(15, 0.14, 0.3), lineMat);
        line.position.set(parkX + dx, 0.14, i * 8);
        group.add(line);
      }
    });
    const carColors = [0xdc2626, 0x1e293b, 0xe5e7eb, 0x2563eb, 0x0f766e, 0xf59e0b, 0x7c3aed, 0x9ca3af];
    const carGlassMat = new THREE.MeshStandardMaterial({ color: 0x2f3b4d, metalness: 0.4, roughness: 0.2 });
    let carIdx = 0;
    [-16, -8, 0, 8].forEach(cz => {
      [-10.5, 10.5].forEach(dx => {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(4.4, 1.2, 2),
          new THREE.MeshStandardMaterial({ color: carColors[carIdx % carColors.length], roughness: 0.45, metalness: 0.35 })
        );
        body.position.set(parkX + dx, 0.72, cz);
        body.castShadow = true;
        group.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 1.75), carGlassMat);
        cabin.position.set(parkX + dx + (dx < 0 ? 0.3 : -0.3), 1.62, cz);
        group.add(cabin);
        carIdx++;
      });
    });
    // Takım otobüsü: uzun gövde + cam bant + tekerler
    const bus = new THREE.Group();
    const busBody = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3.2, 3),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(design.accentColor), roughness: 0.45, metalness: 0.25 })
    );
    busBody.position.y = 1.9;
    busBody.castShadow = true;
    bus.add(busBody);
    const busGlass = new THREE.Mesh(new THREE.BoxGeometry(11.2, 1.05, 3.06), glassMat);
    busGlass.position.y = 2.6;
    bus.add(busGlass);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    [-4.4, 4.4].forEach(wx => {
      [-1.5, 1.5].forEach(wz => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.4, 12), wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.62, wz);
        bus.add(wheel);
      });
    });
    bus.position.set(parkX, 0, 30.5);
    bus.rotation.y = Math.PI / 2;
    group.add(bus);

    // Yeşil alan: sahayı çevreleyen çim şerit + çalılar
    const lawnMat = new THREE.MeshStandardMaterial({ color: opts.night ? 0x24402c : 0x3f7a4a, roughness: 0.95 });
    const lawnT = 6;
    const lawnX = halfX + 4;   // çim çerçevenin iç yarıçapı (X)
    const lawnZ = halfZ + 4;   // çim çerçevenin iç yarıçapı (Z)
    // Çim çerçeve "U" şeklinde: giriş meydanının olduğu yakada çim yok
    const sideZ0 = -(lawnZ + lawnT);
    const sideZ1 = halfZ - 2;
    const sideLen = sideZ1 - sideZ0;
    const sideCz = (sideZ0 + sideZ1) / 2;
    [
      { w: (lawnX + lawnT) * 2, d: lawnT, x: 0, z: -(lawnZ + lawnT / 2) },
      { w: lawnT, d: sideLen, x: -(lawnX + lawnT / 2), z: sideCz },
      { w: lawnT, d: sideLen, x: lawnX + lawnT / 2, z: sideCz },
    ].forEach(slabDef => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(slabDef.w, 0.1, slabDef.d), lawnMat);
      slab.position.set(slabDef.x, 0.05, slabDef.z);
      slab.receiveShadow = true;
      group.add(slab);
    });

    // Çevre çiti: ince çerçeve + InstancedMesh dikey parmaklıklar
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x556275, metalness: 0.5, roughness: 0.5 });
    const fx = halfX + 34;
    const fz = halfZ + 30;
    const railT = 0.16;
    [
      { w: fx * 2, d: railT, x: 0, z: -fz },
      { w: fx * 2, d: railT, x: 0, z: fz },
      { w: railT, d: fz * 2, x: -fx, z: 0 },
      { w: railT, d: fz * 2, x: fx, z: 0 },
    ].forEach((r, ri) => {
      [0.5, 2.6].forEach(hy => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.12, r.d), fenceMat);
        rail.position.set(r.x, hy, r.z);
        group.add(rail);
      });
      void ri;
    });
    const barStep = 4;
    const barsX = Math.floor((fx * 2) / barStep) + 1;
    const barsZ = Math.floor((fz * 2) / barStep) + 1;
    const fenceBars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.14, 2.3, 0.14),
      fenceMat,
      barsX * 2 + barsZ * 2
    );
    const marker = new THREE.Object3D();
    let bi = 0;
    for (let i = 0; i < barsX; i++) {
      const x = -fx + i * barStep;
      [-fz, fz].forEach(z => {
        marker.position.set(x, 1.4, z);
        marker.updateMatrix();
        fenceBars.setMatrixAt(bi++, marker.matrix);
      });
    }
    for (let i = 0; i < barsZ; i++) {
      const z = -fz + i * barStep;
      [-fx, fx].forEach(x => {
        marker.position.set(x, 1.4, z);
        marker.updateMatrix();
        fenceBars.setMatrixAt(bi++, marker.matrix);
      });
    }
    fenceBars.count = bi;
    group.add(fenceBars);

    // Ağaçlar: iki tip (yuvarlak + konik) — stadyum dışında düzenli sıralar
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: opts.night ? 0x1f3d2a : 0x2f7a44, roughness: 0.95 });
    const pineMat = new THREE.MeshStandardMaterial({ color: opts.night ? 0x18321f : 0x256b3a, roughness: 0.95 });
    const treeSpots: [number, number, boolean][] = [];
    for (let i = 0; i < 8; i++) {
      const x = -fx + 8 + i * ((fx * 2 - 16) / 7);
      treeSpots.push([x, -(fz + 9), i % 2 === 0]);
      treeSpots.push([x, fz + 14, i % 2 === 1]);
    }
    for (let i = 0; i < 5; i++) {
      const z = -fz + 14 + i * ((fz * 2 - 28) / 4);
      treeSpots.push([-(fx + 9), z, i % 2 === 0]);
      treeSpots.push([fx + 9, z, i % 2 === 1]);
    }
    // İkinci sıra (kaydırılmış) — çeper daha dolu görünür
    for (let i = 0; i < 7; i++) {
      const x = -fx + 18 + i * ((fx * 2 - 36) / 6);
      treeSpots.push([x, -(fz + 21), i % 2 === 1]);
      treeSpots.push([x, fz + 26, i % 2 === 0]);
    }
    for (let i = 0; i < 4; i++) {
      const z = -fz + 30 + i * ((fz * 2 - 60) / 3);
      treeSpots.push([-(fx + 21), z, i % 2 === 1]);
      treeSpots.push([fx + 21, z, i % 2 === 0]);
    }
    treeSpots.forEach(([x, z, pine]) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.58, 4.2, 8), trunkMat);
      trunk.position.y = 2.1;
      trunk.castShadow = true;
      t.add(trunk);
      if (pine) {
        [0, 1, 2].forEach(k => {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5 - k * 0.6, 3.1, 12), pineMat);
          cone.position.y = 4.2 + k * 1.8;
          cone.castShadow = true;
          t.add(cone);
        });
      } else {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(2.8, 14, 12), leafMat);
        crown.position.y = 5.9;
        crown.castShadow = true;
        t.add(crown);
        const crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 10), leafMat);
        crown2.position.set(1.5, 7, 0.6);
        t.add(crown2);
      }
      t.position.set(x, 0, z);
      group.add(t);
    });
  }

  /* ── Karşı skorbord (büyük stadyumlarda denge) ── */
  if (rows >= 12) {
    const backTex2 = scoreboardTexture(design.accentColor, design.seatColor, opts.teamName ?? 'EV SAHİBİ');
    const backMat2 = new THREE.MeshStandardMaterial({
      color: backTex2 ? 0xffffff : 0x0b1220,
      emissive: new THREE.Color(backTex2 ? 0xffffff : 0x2dd4bf),
      emissiveIntensity: opts.night ? 0.95 : 0.5,
      roughness: 0.25,
    });
    if (backTex2) {
      backMat2.map = backTex2;
      backMat2.emissiveMap = backTex2;
    }
    const frame2 = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 1.2), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.35 }));
    const panel2 = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 6.2), backMat2);
    panel2.position.z = -0.62;
    panel2.rotation.y = Math.PI;
    const board2 = new THREE.Group();
    board2.add(frame2, panel2);
    const sbZ2 = PITCH_W / 2 + MARGIN + depth * 0.35;
    board2.position.set(0, sbY, sbZ2);
    group.add(board2);
    [-6, 6].forEach(xOff => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, sbY, 0.5), legMat);
      leg.position.set(xOff, sbY / 2, sbZ2);
      group.add(leg);
    });
  }

  /* ── Işıklandırma ── */
  const hemi = new THREE.HemisphereLight(opts.night ? 0x1a2540 : 0xbcd9ff, opts.night ? 0x0d1328 : 0x3f5233, opts.night ? 0.52 : 0.85);
  group.add(hemi);
  // Gece güneşi kısık ve soğuk — bembeyaz yıkamayı engeller
  const sun = new THREE.DirectionalLight(opts.night ? 0x8da0c2 : 0xfff4d6, opts.night ? 0.32 : 1.32);
  sun.position.set(90, 130, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.9;
  group.add(sun);

  if (opts.night) {
    // Giriş meydanı aydınlatması (lambaların altında sıcak ışık havuzu)
    [-34, 34].forEach(lx => {
      const lamp = new THREE.PointLight(0xffe3a8, 22000, 120, 1.9);
      lamp.position.set(lx, 7, halfZ + 30);
      group.add(lamp);
    });
  }

  if (opts.night && design.floodlights) {
    const lightTargets: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    lightTargets.forEach(([lx, lz]) => {
      // Önceki 180000 değeri sahayı bembeyaz yapıyordu — düşür, mesafeyi kaptır
      const spot = new THREE.PointLight(0xffe9a8, 78000, 300, 1.85);
      spot.position.set(lx * (PITCH_L / 2 + MARGIN + depth * 0.7), height + 16, lz * (PITCH_W / 2 + MARGIN + depth * 0.7));
      group.add(spot);
    });
  }

  const skyTexture = skyGradientTexture(!!opts.night);

  return {
    group,
    animated: { flags, ledTextures, floodlights, crowdMaterials },
    rows,
    seats,
    standMeshes,
    skyTexture,
    sky: opts.night ? 0x0a102a : 0x7fb2e5,
    triCount: () => {
      let total = 0;
      group.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) {
          const g = mesh.geometry as THREE.BufferGeometry;
          const count = g.index ? g.index.count : g.attributes.position?.count ?? 0;
          total += count / 3;
        }
      });
      return Math.round(total);
    }
  };
}

/** Tribün satır sayısı → kapasite tahmini (UI için) */
export function rowsForCapacity(capacity: number): number {
  return Math.max(4, Math.min(30, Math.round(capacity / 1600)));
}
