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
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 260),
    new THREE.MeshStandardMaterial({ color: opts.night ? 0x3d4550 : 0x6b7585, roughness: 1 })
  );
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
    emissive: opts.wet ? new THREE.Color(0x1a3a25) : new THREE.Color(0x000000),
    emissiveIntensity: opts.wet ? (opts.night ? 0.22 : 0.08) : 0,
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
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    emissive: new THREE.Color(0x2dd4bf),
    emissiveIntensity: opts.night ? 0.9 : 0.7,
    roughness: 0.25
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(15.5, 6.2, 0.35), screenMat);
  screen.position.z = 0.75;
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
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, mastH, 10), mastMat);
      mast.position.y = mastH / 2;
      mast.castShadow = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.6, 0.7), lampMat);
      head.position.y = mastH + 1.6;
      head.rotation.x = 0.35;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(8.1, 4.2, 0.35), mastMat);
      frame.position.set(0, mastH + 1.6, -0.3);
      frame.rotation.x = 0.35;
      pylon.add(mast, head, frame);
      pylon.position.set(x, 0, z);
      pylon.lookAt(0, 0, 0);
      group.add(pylon);
      floodlights.push(head);
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

  if (opts.night && design.floodlights) {
    const lightTargets: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    lightTargets.forEach(([lx, lz]) => {
      // Önceki 180000 değeri sahayı bembeyaz yapıyordu — düşür, mesafeyi kaptır
      const spot = new THREE.PointLight(0xffe9a8, 42000, 260, 1.85);
      spot.position.set(lx * (PITCH_L / 2 + MARGIN + depth * 0.7), height + 16, lz * (PITCH_W / 2 + MARGIN + depth * 0.7));
      group.add(spot);
    });
  }

  return {
    group,
    animated: { flags, ledTextures, floodlights, crowdMaterials },
    rows,
    seats,
    standMeshes,
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
