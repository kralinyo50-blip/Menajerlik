import * as THREE from 'three';
import { buildStadiumGroup } from '../stadium/scene';
import { Venue, Kit } from './venue';
import {
  buildFootballer, Footballer, poseRun, poseIdle, poseKick, poseCelebrate, poseLying,
  poseDive, poseSeated, poseCard, poseCoach, makeCardMesh
} from './actors';

export const PITCH_L = 105;
export const PITCH_W = 68;
const HL = PITCH_L / 2;   // 52.5
const HW = PITCH_W / 2;   // 34
const GOAL_HALF = 3.66;
const GOAL_H = 2.44;

/* Kenar düzeni — kamera teknik alanın hemen önünde, menajerlerin hizasında durur.
   LED pano z=-37 (stadyum), apron kenarı z=-42; kulübe/kamera bu şeride yerleşir. */
const CAM_Y = 4.2;
const CAM_Z = -(HW + 7.0);         // -41.0  (menajer kamerası: kulübenin hemen önü)
const DUGOUT_Z = -(HW + 6.6);     // -40.6  (kulübe gövdesi)
const BENCH_Z = -(HW + 7.05);     // -41.05 (oturan yedekler)
const STAFF_Z = -(HW + 6.1);      // -40.1  (ayaktaki teknik ekip — kameranın arkasında)
const TA_Z = -(HW + 5.4);         // -39.4  (teknik alan çizgisi merkezi)

export type Side = 'home' | 'away';

/** Kadro slotu: 2D sahadaki yüzde konum + forma numarası */
export interface ShapeSlot { t: number; l: number; n: number; name?: string }

export interface BuildMatchOpts {
  venue: Venue;
  homeKit: Kit;
  awayKit: Kit;
  weather: string;
  night: boolean;
  lowPerf?: boolean;
  homeShape: ShapeSlot[];
  awayShape: ShapeSlot[];
  homeName: string;
  awayName: string;
  sponsorText?: string;
  logo?: string;
}

export interface Match3DEvent {
  key: number;
  type: string;
  team: Side;
  minute: number;
  text?: string;
}

export interface Match3DInput {
  phase: string;
  minute: number;
  /** 0-100, ev sahibinin top hakimiyeti */
  possession: number;
  /** 0 = donmuş, ~0.32 = yavaş çekim, 1 = normal */
  timeScale: number;
  scoreHome: number;
  scoreAway: number;
  homeOnPitch: number;
  awayOnPitch: number;
  energy: number;
  event?: Match3DEvent | null;
}

export interface Match3DBundle {
  group: THREE.Group;
  sky: number;
  skyTexture: THREE.Texture | null;
  fog?: [number, number, number];
  cam: { position: THREE.Vector3; target: THREE.Vector3; fov: number };
  /** 🧑‍💼 menajer (kenar) / 📺 yayın (yüksek) kamerası */
  setCameraMode: (m: 'manager' | 'broadcast') => void;
  /** Topun dünya konumu (HUD / kamera için) */
  ballPos: THREE.Vector3;
  update: (t: number, dt: number, input: Match3DInput) => void;
  dispose: () => void;
}

type ActorMode = 'play' | 'idle' | 'celebrate' | 'down' | 'walkoff' | 'off' | 'dive' | 'bench' | 'kick' | 'card';

interface Actor {
  f: Footballer;
  team: Side;
  role: string;
  /** Forma pozisyonu (takımın hücum yönüne göre sabit) */
  anchor: THREE.Vector2;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  speed: number;
  maxSpeed: number;
  facing: number;
  runPhase: number;
  mode: ActorMode;
  modeT: number;
  gk: boolean;
  staff: boolean;
  seed: number;
  number: number;
  name: string;
  /** Kaleci uçuşu: hedef z ve tutup tutmayacağı */
  diveZ: number;
  diveCatch: boolean;
}

const DEFAULT_AWAY_SHAPE: ShapeSlot[] = [
  { t: 8, l: 50, n: 1 },
  { t: 26, l: 14, n: 2 }, { t: 24, l: 38, n: 4 }, { t: 24, l: 62, n: 5 }, { t: 26, l: 86, n: 3 },
  { t: 48, l: 20, n: 8 }, { t: 46, l: 40, n: 6 }, { t: 46, l: 60, n: 10 }, { t: 48, l: 80, n: 7 },
  { t: 70, l: 36, n: 9 }, { t: 70, l: 64, n: 11 },
];

const DEFAULT_HOME_SHAPE: ShapeSlot[] = [
  { t: 92, l: 50, n: 1 },
  { t: 74, l: 14, n: 2 }, { t: 76, l: 38, n: 4 }, { t: 76, l: 62, n: 5 }, { t: 74, l: 86, n: 3 },
  { t: 52, l: 20, n: 8 }, { t: 54, l: 40, n: 6 }, { t: 54, l: 60, n: 10 }, { t: 52, l: 80, n: 7 },
  { t: 30, l: 36, n: 9 }, { t: 30, l: 64, n: 11 },
];

/** 2D yüzde konumu 3D dünya koordinatına çevirir (home +x yönüne hücum eder) */
function toWorld(slot: ShapeSlot, team: Side): THREE.Vector2 {
  const x = ((50 - slot.t) / 50) * (HL - 3);
  const z = ((slot.l - 50) / 50) * (HW - 3);
  return team === 'home' ? new THREE.Vector2(x, z) : new THREE.Vector2(-x, z);
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function lerp(a: number, b: number, k: number) { return a + (b - a) * k; }
function damp(k: number, dt: number) { return 1 - Math.exp(-k * dt); }

function roleOf(slot: ShapeSlot, idx: number): string {
  if (idx === 0) return 'KL';
  if (slot.t > 68 || slot.t < 32) return slot.t > 50 ? 'DF' : 'FW';
  return 'OS';
}

/* ══════════════════════════════════════════════════════════════
   3D MAÇ SAHNESİ — menajerlerin durduğu kenardan izlenen canlı maç
   ══════════════════════════════════════════════════════════════ */
export function buildMatchScene(opts: BuildMatchOpts): Match3DBundle {
  const group = new THREE.Group();
  const lowPerf = !!opts.lowPerf;

  /* ── Stadyum (ev sahibinde oyuncunun kendi tasarımı, deplasmanda rastgele stat) ── */
  const stadium = buildStadiumGroup(opts.venue.design, {
    capacity: opts.venue.capacity,
    logo: opts.logo ?? '⚽',
    sponsorText: opts.sponsorText,
    teamName: opts.homeName,
    night: opts.night,
    wet: ['rain', 'storm', 'snow'].includes(opts.weather)
  });
  group.add(stadium.group);

  // Gece: kamera tarafındaki oyuncular silüet olmasın diye yumuşak dolgu ışığı.
  // Sahanın asıl aydınlanmasını projektörler verir (stadyum kurucusu, ters kare yasasına
  // göre hesaplanır) — bu iki ışık yalnızca dip gölgeleri açar, düşük tutulur.
  if (opts.night) {
    const fill = new THREE.HemisphereLight(0x9db8ff, 0x223018, 0.22);
    group.add(fill);
    const camFill = new THREE.DirectionalLight(0xdfe8ff, 0.3);
    camFill.position.set(-18, 24, -(HW + 40));
    group.add(camFill);
  }

  const actors: Actor[] = [];
  const disposables: { dispose: () => void }[] = [];

  /* ── Oyuncu üretimi ── */
  const addActor = (
    team: Side | 'ref' | 'staff',
    slot: ShapeSlot,
    kit: Kit,
    role: string,
    extra: Partial<Actor> = {}
  ): Actor => {
    const isGk = role === 'KL';
    const seed = actors.length * 7 + slot.n;
    const look = {
      shirt: team === 'ref' ? '#111827' : isGk ? kit.gk : kit.shirt,
      shorts: team === 'ref' ? '#111827' : isGk ? kit.gk : kit.shorts,
      socks: team === 'ref' ? '#111827' : isGk ? kit.gk : kit.socks,
      shoes: team === 'ref' ? '#f8fafc' : kit.shoes,
      number: team === 'home' || team === 'away' ? slot.n : 0,
      numberColor: isGk ? '#111827' : '#ffffff',
      scale: extra.staff ? 1.02 : 1
    };
    const f = buildFootballer(look, seed);
    const side: Side = team === 'away' ? 'away' : 'home';
    const anchor = team === 'home' || team === 'away' ? toWorld(slot, side) : new THREE.Vector2(0, 0);
    const pos = new THREE.Vector3(anchor.x, 0, anchor.y);
    f.root.position.copy(pos);
    group.add(f.root);
    group.add(f.shadow);
    const actor: Actor = {
      f,
      team: side,
      role,
      anchor,
      pos,
      target: pos.clone(),
      speed: 0,
      maxSpeed: isGk ? 6.2 : 6.4 + (seed % 5) * 0.28,
      facing: team === 'home' ? Math.PI / 2 : -Math.PI / 2,
      runPhase: seed,
      mode: 'idle',
      modeT: 0,
      gk: isGk,
      staff: team === 'staff' || team === 'ref',
      seed,
      number: slot.n,
      name: slot.name ?? '',
      diveZ: 0,
      diveCatch: true
    };
    Object.assign(actor, extra);
    actors.push(actor);
    return actor;
  };

  const homeShape = opts.homeShape.length === 11 ? opts.homeShape : DEFAULT_HOME_SHAPE;
  const awayShape = opts.awayShape.length === 11 ? opts.awayShape : DEFAULT_AWAY_SHAPE;

  const home = homeShape.map((s, i) => addActor('home', s, opts.homeKit, roleOf(s, i)));
  const away = awayShape.map((s, i) => addActor('away', s, opts.awayKit, roleOf(s, i)));
  const homeGk = home[0];
  const awayGk = away[0];

  /* ── Hakem + yan hakemler ── */
  const refKit: Kit = { shirt: '#111827', shorts: '#111827', socks: '#111827', shoes: '#f8fafc', gk: '#111827' };
  const referee = addActor('ref', { t: 50, l: 50, n: 0 }, refKit, 'REF');
  const cardMesh = makeCardMesh('#eab308');
  cardMesh.visible = false;
  referee.f.rig.rightForearm.add(cardMesh);

  const linesmanKit: Kit = { shirt: '#0ea5e9', shorts: '#0f172a', socks: '#0ea5e9', shoes: '#f8fafc', gk: '#0ea5e9' };
  const linesmen = [0, 1].map(i => {
    const a = addActor('ref', { t: 50, l: i === 0 ? 2 : 98, n: 0 }, linesmanKit, 'YH');
    a.pos.set(i === 0 ? -20 : 20, 0, (i === 0 ? -1 : 1) * (HW + 2.2));
    a.maxSpeed = 5.4;
    return a;
  });
  // Yan hakem bayrakları
  linesmen.forEach(a => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
    );
    pole.position.set(0, -0.34, 0.06);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.17, 0.13),
      new THREE.MeshStandardMaterial({ color: 0xf97316, side: THREE.DoubleSide, roughness: 0.6 })
    );
    flag.position.set(0.08, -0.2, 0.06);
    a.f.rig.rightForearm.add(pole, flag);
  });

  /* ── Kenar yönetimi: teknik direktör, 4. hakem, kulübe ── */
  const managerKit: Kit = {
    shirt: opts.homeKit.shirt, shorts: '#1f2937', socks: '#1f2937', shoes: '#111827', gk: opts.homeKit.shirt
  };
  const manager = addActor('staff', { t: 50, l: 30, n: 0 }, managerKit, 'HOCA', { team: 'home' });
  manager.pos.set(-18.5, 0, STAFF_Z);
  manager.target.copy(manager.pos);

  const assistant = addActor('staff', { t: 50, l: 34, n: 0 }, { ...managerKit, shirt: '#1f2937' }, 'YRD', { team: 'home' });
  assistant.pos.set(-21.4, 0, STAFF_Z - 0.2);
  assistant.target.copy(assistant.pos);

  const fourthOfficial = addActor('ref', { t: 50, l: 50, n: 0 }, { ...linesmanKit, shirt: '#f59e0b', socks: '#f59e0b' }, '4H');
  fourthOfficial.pos.set(5.5, 0, STAFF_Z + 0.2);
  fourthOfficial.target.copy(fourthOfficial.pos);
  const subBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.46, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: new THREE.Color(0x22d3ee), emissiveIntensity: 0.9, roughness: 0.35 })
  );
  subBoard.position.set(0, 1.12, 0.28);
  subBoard.visible = false;
  fourthOfficial.f.root.add(subBoard);

  /* ── Yedek kulübesi: barınak + oturan yedekler (önü açık, gerçek kulübe gibi) ── */
  const dugout = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.55, metalness: 0.25 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9fd8ff, transparent: true, opacity: 0.22, roughness: 0.12, metalness: 0.4, side: THREE.DoubleSide
  });
  const clubMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.homeKit.shirt), emissive: new THREE.Color(opts.homeKit.shirt),
    emissiveIntensity: opts.night ? 0.55 : 0.25, roughness: 0.5
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(11, 2.55, 0.16), shellMat);
  back.position.set(0, 1.27, -1.05);
  const backStripe = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.34, 0.06), clubMat);
  backStripe.position.set(0, 2.28, -0.95);
  const roofD = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.18, 2.6), shellMat);
  roofD.position.set(0, 2.62, -0.05);
  // Ön üst rüzgârlık — baş hizasının üstünde, görüşü kesmez
  const windScreen = new THREE.Mesh(new THREE.PlaneGeometry(11, 0.55), glassMat);
  windScreen.position.set(0, 2.32, 1.2);
  [-5.5, 5.5].forEach(x => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.55, 2.4), shellMat);
    side.position.set(x, 1.27, -0.05);
    dugout.add(side);
  });
  const benchSeat = new THREE.Mesh(
    new THREE.BoxGeometry(10.4, 0.14, 0.62),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.homeKit.shirt).multiplyScalar(0.75), roughness: 0.7 })
  );
  benchSeat.position.set(0, 0.52, -0.45);
  const benchBackRest = new THREE.Mesh(
    new THREE.BoxGeometry(10.4, 0.6, 0.12),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.homeKit.shirt).multiplyScalar(0.6), roughness: 0.75 })
  );
  benchBackRest.position.set(0, 0.86, -0.78);
  dugout.add(back, backStripe, roofD, windScreen, benchSeat, benchBackRest);
  dugout.position.set(-16, 0, DUGOUT_Z);
  group.add(dugout);

  // Kulübede oturan yedekler + kulüp doktoru (5 yedek, 1 doktor)
  const benchActors: Actor[] = [];
  for (let i = 0; i < 6; i++) {
    const isDoc = i === 5;
    const kit: Kit = isDoc
      ? { shirt: '#f8fafc', shorts: '#1f2937', socks: '#f8fafc', shoes: '#111827', gk: '#f8fafc' }
      : { ...opts.homeKit };
    const a = addActor(isDoc ? 'staff' : 'home', { t: 50, l: 50, n: 12 + i }, kit, isDoc ? 'DOK' : 'YEDEK', {
      mode: 'bench' as ActorMode
    });
    a.pos.set(-20.4 + i * 1.5, 0, BENCH_Z);
    a.target.copy(a.pos);
    a.f.root.rotation.y = 0;
    benchActors.push(a);
  }

  /* ── Teknik alan çizgisi, su şişeleri, taktik tahtası ── */
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  const taBox = new THREE.Group();
  const taW = 24, taD = 4.8;
  const mkLine = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.05, z);
    taBox.add(m);
  };
  mkLine(taW, 0.12, 0, taD / 2);
  mkLine(0.12, taD, -taW / 2, 0);
  mkLine(0.12, taD, taW / 2, 0);
  for (let i = -4; i <= 4; i++) mkLine(1.4, 0.1, i * 2.7, -taD / 2);
  taBox.position.set(-13, 0, TA_Z);
  group.add(taBox);

  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 8), bottleMat);
    b.position.set(-23.4 + i * 0.34, 0.12, -(HW + 5.75));
    group.add(b);
  }
  const boardStand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.05), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }));
  boardStand.position.set(-25.5, 1.0, -(HW + 5.9));
  boardStand.rotation.set(-0.22, 0.5, 0);
  const boardLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), new THREE.MeshStandardMaterial({ color: 0x4b5563 }));
  boardLeg.position.set(-25.5, 0.5, -(HW + 5.9));
  group.add(boardStand, boardLeg);

  /* ── Köşe bayrakları ── */
  const cornerFlags: THREE.Object3D[] = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
  const flagMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.venue.design.accentColor), side: THREE.DoubleSide, roughness: 0.65
  });
  [[-HL, -HW], [-HL, HW], [HL, -HW], [HL, HW]].forEach(([x, z]) => {
    const pivot = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6), poleMat);
    pole.position.y = 0.75;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), flagMat);
    flag.position.set(0.22, 1.34, 0);
    pivot.add(pole, flag);
    pivot.position.set(x, 0, z);
    group.add(pivot);
    cornerFlags.push(pivot);
  });

  /* ── Top ── */
  const ballTexCanvas = (() => {
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!c) return null;
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#111827';
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 64 + 16;
      const y = Math.floor(i / 4) * 64 + 20;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(a) * 15;
        const py = y + Math.sin(a) * 15;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    return c;
  })();
  const ballTex = ballTexCanvas ? new THREE.CanvasTexture(ballTexCanvas) : null;
  if (ballTex) ballTex.colorSpace = THREE.SRGBColorSpace;
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: ballTex ?? undefined, roughness: 0.42 })
  );
  ballMesh.position.set(0, 0.115, 0);
  group.add(ballMesh);
  const ballShadowTex = (() => {
    const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!c) return null;
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 28);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return c;
  })();
  const ballShadowCanvasTex = ballShadowTex ? new THREE.CanvasTexture(ballShadowTex) : null;
  const ballShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, alphaMap: ballShadowCanvasTex ?? undefined, depthWrite: false })
  );
  ballShadow.rotation.x = -Math.PI / 2;
  ballShadow.position.y = 0.05;
  group.add(ballShadow);

  /* ── Canlı skorbord (stadyumdaki dev ekran) ── */
  let screenMesh: THREE.Mesh | null = null;
  stadium.group.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const params = (m.geometry as THREE.PlaneGeometry).parameters as unknown as { width?: number; height?: number } | undefined;
    if (params && Math.abs((params.width ?? 0) - 15.5) < 0.01 && Math.abs((params.height ?? 0) - 6.2) < 0.01) screenMesh = m;
  });
  const sbCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (sbCanvas) { sbCanvas.width = 512; sbCanvas.height = 256; }
  const sbTex = sbCanvas ? new THREE.CanvasTexture(sbCanvas) : null;
  if (sbTex) sbTex.colorSpace = THREE.SRGBColorSpace;
  let sbOldTex: THREE.Texture | null = null;
  if (screenMesh && sbTex) {
    const mesh = screenMesh as THREE.Mesh;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    sbOldTex = mat.map ?? null;
    mat.map = sbTex;
    mat.emissiveMap = sbTex;
    mat.emissive = new THREE.Color(0xffffff);
    mat.needsUpdate = true;
  }
  let sbLast = '';
  const drawScoreboard = (homeN: string, awayN: string, sh: number, sa: number, minute: number, live: boolean) => {
    if (!sbCanvas || !sbTex) return;
    const ctx = sbCanvas.getContext('2d');
    if (!ctx) return;
    const sig = `${homeN}|${awayN}|${sh}|${sa}|${minute}|${live}`;
    if (sig === sbLast) return;
    sbLast = sig;
    const accent = opts.venue.design.accentColor;
    ctx.fillStyle = '#04070f';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 512, 8);
    ctx.fillRect(0, 248, 512, 8);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.toUpperCase());
    ctx.fillText(trim(homeN, 12), 118, 74);
    ctx.fillText(trim(awayN, 12), 394, 74);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText(`${sh}`, 118, 158);
    ctx.fillText(`${sa}`, 394, 158);
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText('-', 256, 152);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText(`${String(Math.max(0, Math.round(minute))).padStart(2, '0')}'`, 256, 214);
    if (live) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(206, 214, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CANLI', 222, 216);
    }
    sbTex.needsUpdate = true;
  };

  /* ── Hava durumu efektleri ── */
  const rainy = ['rain', 'storm'].includes(opts.weather);
  const snowy = opts.weather === 'snow';
  let particles: THREE.Points | null = null;
  let particleVel = 0;
  if ((rainy || snowy) && !lowPerf) {
    const count = rainy ? 1400 : 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = Math.random() * 46;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 110;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: snowy ? 0xffffff : 0xcfe8ff,
      size: snowy ? 0.34 : 0.19,
      transparent: true,
      opacity: snowy ? 0.85 : 0.55,
      depthWrite: false,
      sizeAttenuation: true
    });
    particles = new THREE.Points(geo, mat);
    particleVel = rainy ? 34 : 3.2;
    group.add(particles);
  }
  const lightning = opts.weather === 'storm'
    ? new THREE.DirectionalLight(0xdfeaff, 0)
    : null;
  if (lightning) {
    lightning.position.set(-40, 90, -30);
    group.add(lightning);
  }
  let nextFlash = 4 + Math.random() * 8;
  let flashT = 0;

  /* ══════════ SİMÜLASYON DURUMU ══════════ */
  const ball = {
    pos: new THREE.Vector3(0, 0.115, 0),
    vel: new THREE.Vector3(),
    holder: null as Actor | null,
    receiver: null as Actor | null,
    flight: 0,
    lastTouch: 'home' as Side
  };
  const ballPos = ball.pos;
  /** Gol senaryosunda kaleci topu tutmaz — gerçek goller yalnızca motordan gelir */
  let allowCatch = true;

  type SeqKind = 'goal' | 'shot' | 'card' | 'foul' | 'injury' | 'sub' | 'kickoff' | 'halfTime' | 'fullTime' | 'penalty' | 'corner' | 'warmup';
  interface Seq { kind: SeqKind; t: number; dur: number; team: Side; data: Record<string, unknown> }
  let seq: Seq | null = { kind: 'warmup', t: 0, dur: 1e9, team: 'home', data: {} };
  let lastEventKey = -1;
  let passTimer = 1.2;
  let simT = 0;
  let crowdHype = 0;
  let shake = 0;
  const camMode = { current: 'manager' as 'manager' | 'broadcast' };
  const cam = {
    position: new THREE.Vector3(-14, 2.5, -(HW + 8)),
    target: new THREE.Vector3(0, 1.1, 0),
    fov: 62
  };

  const onPitch = (team: Side) => actors.filter(a => !a.staff && a.team === team
    && a.mode !== 'off' && a.mode !== 'walkoff' && a.mode !== 'bench' && a.mode !== 'down');
  const nearest = (list: Actor[], p: THREE.Vector3, filter?: (a: Actor) => boolean) => {
    let best: Actor | null = null;
    let bd = Infinity;
    for (const a of list) {
      if (a.mode === 'off' || a.mode === 'down' || a.mode === 'walkoff') continue;
      if (filter && !filter(a)) continue;
      const d = a.pos.distanceToSquared(p);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  };

  const setHolder = (a: Actor | null) => {
    ball.holder = a;
    ball.receiver = null;
    if (a) { ball.lastTouch = a.team; ball.vel.set(0, 0, 0); }
  };

  const startSeq = (kind: SeqKind, team: Side, dur: number, data: Record<string, unknown> = {}) => {
    seq = { kind, t: 0, dur, team, data };
  };

  /** Topu bir oyuncuya doğru havalandır */
  const kickTo = (from: Actor, to: THREE.Vector3, power: number, lift = 0.35) => {
    const start = from.pos.clone().setY(0.35);
    ball.pos.copy(start);
    const flat = to.clone().setY(0.12).sub(start);
    const dist = flat.length();
    const time = clamp(dist / power, 0.25, 2.4);
    ball.vel.copy(flat).divideScalar(time);
    ball.vel.y = lift * 9.8 * time * 0.5;
    ball.receiver = null;
    ball.holder = null;
    ball.flight = time;
    ball.lastTouch = from.team;
    from.mode = 'kick';
    from.modeT = 0;
    return time;
  };

  const shootAtGoal = (shooter: Actor, willScore: boolean, celebrate = false) => {
    const dirX = shooter.team === 'home' ? 1 : -1;
    const goalX = dirX * HL;
    const aimZ = willScore ? (Math.random() - 0.5) * (GOAL_HALF * 1.4) : (Math.random() < 0.5 ? -1 : 1) * (GOAL_HALF + 1.2 + Math.random() * 2.4);
    const aimY = willScore ? 0.35 + Math.random() * (GOAL_H - 0.7) : 1.2 + Math.random() * 2.6;
    const target = new THREE.Vector3(goalX, aimY, aimZ);
    const start = shooter.pos.clone().setY(0.4);
    ball.pos.copy(start);
    const flat = target.clone().sub(start);
    const time = clamp(flat.length() / 26, 0.35, 1.1);
    ball.vel.copy(flat).divideScalar(time);
    ball.vel.y += 1.2;
    ball.holder = null;
    ball.receiver = null;
    ball.flight = time;
    ball.lastTouch = shooter.team;
    shooter.mode = 'kick';
    shooter.modeT = 0;
    // Kaleci tahmin edip uçar
    const gk = shooter.team === 'home' ? awayGk : homeGk;
    gk.mode = 'dive';
    gk.modeT = 0;
    gk.diveZ = willScore ? aimZ * 0.35 : aimZ;
    gk.diveCatch = !willScore && Math.random() < 0.7;
    allowCatch = !willScore;
    if (celebrate) crowdHype = 1;
    return time;
  };

  /* ══════════ OLAYLAR ══════════ */
  const handleEvent = (ev: Match3DEvent) => {
    const team = ev.team;
    switch (ev.type) {
      case 'goal':
      case 'penalty': {
        const shooters = onPitch(team).filter(a => !a.gk);
        const shooter = shooters.length ? shooters[Math.floor(Math.random() * Math.min(4, shooters.length))] : home[9];
        startSeq('goal', team, 6.4, { shooter, scored: true });
        shake = 1;
        break;
      }
      case 'chance':
      case 'save': {
        const shooters = onPitch(team).filter(a => !a.gk);
        const shooter = shooters.length ? shooters[Math.floor(Math.random() * shooters.length)] : home[9];
        startSeq('shot', team, 3.2, { shooter });
        break;
      }
      case 'card': {
        const pool = onPitch(team).filter(a => !a.gk);
        const culprit = pool.length ? pool[Math.floor(Math.random() * pool.length)] : home[4];
        const red = /kırmızı|🟥|ikinci sarı|🟨🟥/i.test(ev.text ?? '');
        startSeq('card', team, red ? 5.2 : 4.2, { culprit, red });
        break;
      }
      case 'foul': {
        const victims = onPitch(team);
        const victim = victims.length ? victims[Math.floor(Math.random() * victims.length)] : home[6];
        const foulTeam: Side = team === 'home' ? 'away' : 'home';
        const foulers = onPitch(foulTeam);
        const culprit = foulers.length ? foulers[Math.floor(Math.random() * foulers.length)] : away[4];
        startSeq('foul', team, 2.9, { victim, culprit });
        break;
      }
      case 'injury': {
        const pool = onPitch(team).filter(a => !a.gk);
        const hurt = pool.length ? pool[Math.floor(Math.random() * pool.length)] : home[6];
        startSeq('injury', team, 6.5, { hurt });
        break;
      }
      case 'substitution': {
        startSeq('sub', team, 5.0, {});
        break;
      }
      case 'corner': {
        startSeq('corner', team, 3.4, {});
        break;
      }
      default:
        break;
    }
  };

  /* ══════════ AÇIK OYUN ══════════ */
  const stepOpenPlay = (dt: number, input: Match3DInput) => {
    const poss = clamp(input.possession, 20, 80) / 100;
    const tempo = (0.72 + (input.energy / 100) * 0.5) * (input.minute > 78 ? 0.86 : 1);

    // Top sahipsizse: hakimiyeti yüksek takım daha çabuk kapar
    if (!ball.holder && !ball.receiver) {
      const hCand = nearest(onPitch('home'), ball.pos);
      const aCand = nearest(onPitch('away'), ball.pos);
      const dH = hCand ? hCand.pos.distanceTo(ball.pos) / (0.75 + poss * 0.6) : Infinity;
      const dA = aCand ? aCand.pos.distanceTo(ball.pos) / (1.35 - poss * 0.6) : Infinity;
      const cand = dH <= dA ? hCand : aCand;
      if (cand && cand.pos.distanceTo(ball.pos) < 1.9) setHolder(cand);
    }
    // Pas uçuşu: hedefe ulaşınca alıcı topu alır
    if (!ball.holder && ball.receiver) {
      if (ball.pos.distanceTo(ball.receiver.pos) < 1.5 || ball.flight <= 0) setHolder(ball.receiver);
    }

    if (ball.holder) {
      const h = ball.holder;
      passTimer -= dt * tempo;
      if (passTimer <= 0) {
        passTimer = 0.75 + Math.random() * 1.5;
        const attackX = h.team === 'home' ? 1 : -1;
        const inFinalThird = attackX * h.pos.x > HL * 0.42;
        const mates = onPitch(h.team).filter(a => a !== h && !a.gk);
        // Şut mu, pas mı?
        if (inFinalThird && Math.random() < 0.26) {
          shootAtGoal(h, false);
          const gk = h.team === 'home' ? awayGk : homeGk;
          gk.diveCatch = Math.random() < 0.72;
          return;
        }
        if (mates.length) {
          // İleriye doğru ağırlıklı alıcı seçimi
          let best: Actor | null = null;
          let bestScore = -Infinity;
          for (const m of mates) {
            const forward = (m.pos.x - h.pos.x) * attackX;
            const dist = m.pos.distanceTo(h.pos);
            const score = forward * 1.15 - Math.abs(dist - 16) * 0.45 + Math.random() * 9;
            if (score > bestScore) { bestScore = score; best = m; }
          }
          const target = best ?? mates[0];
          const lead = new THREE.Vector3().copy(target.pos);
          lead.x += attackX * (1.2 + Math.random() * 2.4);
          const dist = h.pos.distanceTo(lead);
          kickTo(h, lead, clamp(dist * 1.35, 9, 26), dist > 26 ? 0.55 : 0.22);
          ball.receiver = target;
        }
      }
      // Rakip yakınsa topu kapabilir
      const opps = onPitch(h.team === 'home' ? 'away' : 'home');
      for (const o of opps) {
        if (o.pos.distanceTo(h.pos) < 0.95 && Math.random() < dt * 2.2) { setHolder(o); passTimer = 0.5 + Math.random(); break; }
      }
    }

    // Sahipsiz top: saha dışına çıkarsa tekrar oyuna sokulur
    if (!ball.holder && ball.flight <= 0) {
      const out = Math.abs(ball.pos.x) > HL + 0.6 || Math.abs(ball.pos.z) > HW + 0.6;
      if (out) {
        const takerTeam: Side = ball.lastTouch === 'home' ? 'away' : 'home';
        ball.pos.x = clamp(ball.pos.x, -HL + 2, HL - 2);
        ball.pos.z = clamp(ball.pos.z, -HW + 2, HW - 2);
        ball.pos.y = 0.115;
        ball.vel.set(0, 0, 0);
        const taker = nearest(onPitch(takerTeam), ball.pos);
        if (taker) setHolder(taker);
        passTimer = 0.8;
      }
    }
  };

  /* ══════════ SENARYO ADIMLARI ══════════ */
  const stepSeq = (dt: number) => {
    if (!seq) return;
    const s = seq;
    s.t += dt;
    const p = clamp(s.t / s.dur, 0, 1);
    const attackX = s.team === 'home' ? 1 : -1;

    switch (s.kind) {
      case 'warmup': {
        // Devre arası / maç sonu bekleme: herkes yerinde durur
        if (s.data.still) {
          actors.forEach(a => {
            if (!a.staff && a.mode !== 'bench' && a.mode !== 'off' && a.mode !== 'walkoff') {
              a.mode = 'idle';
              a.target.copy(a.pos);
            }
          });
          break;
        }
        // Isınma: oyuncular sahada hafif koşu, top ortada
        actors.forEach(a => {
          if (a.staff || a.gk) return;
          const w = new THREE.Vector3(
            a.anchor.x + Math.sin(simT * 0.7 + a.seed) * 5,
            0,
            a.anchor.y + Math.cos(simT * 0.55 + a.seed) * 4
          );
          a.target.copy(w);
          a.mode = 'play';
        });
        ball.pos.set(Math.sin(simT * 0.5) * 6, 0.115, Math.cos(simT * 0.4) * 4);
        break;
      }
      case 'kickoff': {
        allowCatch = true;
        actors.forEach(a => {
          if (a.staff || a.mode === 'bench') return;
          a.target.set(a.anchor.x, 0, a.anchor.y);
          a.mode = 'play';
        });
        ball.pos.set(0, 0.115, 0);
        ball.vel.set(0, 0, 0);
        if (p > 0.85) {
          const starter = nearest(onPitch(s.team), new THREE.Vector3(attackX * -3, 0, 0)) ?? home[9];
          setHolder(starter);
          passTimer = 0.9;
          seq = null;
        }
        break;
      }
      case 'goal': {
        const shooter = (s.data.shooter as Actor) ?? home[9];
        if (s.t < 0.05) {
          shooter.pos.set(attackX * (HL - 16) + (Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 14);
          shootAtGoal(shooter, true, true);
        }
        if (s.t > 0.9 && s.t < 1.0) {
          // Fileler dalgalanır, tribün patlar
          crowdHype = 1;
          shake = 1;
        }
        if (s.t > 1.2) {
          shooter.mode = 'celebrate';
          shooter.target.set(attackX * (HL - 6), 0, (Math.random() - 0.5) * 2);
          const mates = onPitch(shooter.team).filter(a => a !== shooter);
          mates.forEach((m, i) => {
            m.mode = 'celebrate';
            m.target.set(shooter.pos.x + (i % 3 - 1) * 2.2 - attackX * 1.5, 0, shooter.pos.z + (Math.floor(i / 3) - 1) * 2.2);
          });
          const conceding = onPitch(shooter.team === 'home' ? 'away' : 'home');
          conceding.forEach(a => {
            a.mode = 'idle';
            a.target.set(a.pos.x - attackX * 3, 0, a.pos.z);
          });
          ball.pos.set(attackX * (HL + 1.1), 0.35, clamp(ball.pos.z * 0.4, -2.5, 2.5));
          ball.vel.multiplyScalar(0.86);
        }
        if (p > 0.9) {
          actors.forEach(a => { if (!a.staff) { a.mode = 'play'; } });
          startSeq('kickoff', shooter.team === 'home' ? 'away' : 'home', 2.2);
        }
        break;
      }
      case 'shot': {
        const shooter = (s.data.shooter as Actor) ?? home[9];
        if (s.t < 0.05) {
          shooter.pos.set(attackX * (HL - 18) + (Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 16);
          shootAtGoal(shooter, false);
        }
        if (s.t > 1.6) {
          const gk = shooter.team === 'home' ? awayGk : homeGk;
          gk.mode = 'play';
          actors.forEach(a => { if (!a.staff) a.mode = 'play'; });
          startSeq('kickoff', shooter.team === 'home' ? 'away' : 'home', 1.6);
        }
        break;
      }
      case 'penalty': {
        const shooter = (s.data.shooter as Actor) ?? home[9];
        if (s.t < 0.1) {
          ball.pos.set(attackX * (HL - 11), 0.115, 0);
          shooter.pos.set(attackX * (HL - 14.5), 0, 0.6);
          shooter.target.copy(shooter.pos);
          const gk = shooter.team === 'home' ? awayGk : homeGk;
          gk.pos.set(attackX * (HL - 0.6), 0, 0);
          gk.target.copy(gk.pos);
          onPitch(shooter.team === 'home' ? 'away' : 'home').forEach((a, i) => {
            a.target.set(attackX * (HL - 20) - attackX * (i % 3) * 2, 0, (i - 4) * 3);
          });
        }
        if (s.t > 1.3 && s.t < 1.35) shootAtGoal(shooter, Boolean(s.data.scored));
        if (p > 0.92) startSeq('kickoff', s.team === 'home' ? 'away' : 'home', 2.0);
        break;
      }
      case 'card': {
        const culprit = (s.data.culprit as Actor) ?? home[4];
        const red = Boolean(s.data.red);
        if (s.t < 0.05) {
          ball.vel.set(0, 0, 0);
          setHolder(null);
          actors.forEach(a => { if (!a.staff) { a.mode = 'idle'; a.target.copy(a.pos); } });
          (cardMesh.material as THREE.MeshStandardMaterial).color.set(red ? '#dc2626' : '#eab308');
          cardMesh.visible = true;
        }
        referee.target.copy(culprit.pos).add(new THREE.Vector3(0.9, 0, 0.9));
        referee.mode = 'play';
        culprit.mode = 'idle';
        culprit.target.copy(culprit.pos);
        culprit.facing = Math.atan2(referee.pos.x - culprit.pos.x, referee.pos.z - culprit.pos.z);
        if (s.t > 1.0) {
          referee.mode = 'card';
          referee.facing = Math.atan2(culprit.pos.x - referee.pos.x, culprit.pos.z - referee.pos.z);
        }
        if (s.t > 2.8) cardMesh.visible = false;
        if (red && s.t > 3.2) {
          culprit.mode = 'walkoff';
          culprit.target.set(culprit.pos.x * 0.2, 0, -(HW + 6));
        }
        if (p > 0.95) {
          referee.mode = 'play';
          cardMesh.visible = false;
          if (red) culprit.mode = 'off';
          actors.forEach(a => { if (!a.staff && a.mode === 'idle') a.mode = 'play'; });
          const taker = nearest(onPitch(s.team === 'home' ? 'away' : 'home'), ball.pos) ?? away[6];
          setHolder(taker);
          passTimer = 0.8;
          seq = null;
        }
        break;
      }
      case 'foul': {
        const victim = (s.data.victim as Actor) ?? home[6];
        const culprit = (s.data.culprit as Actor) ?? away[4];
        if (s.t < 0.05) {
          setHolder(null);
          ball.vel.set(0, 0, 0);
          victim.mode = 'down';
          actors.forEach(a => { if (!a.staff && a !== victim && a.mode !== 'bench') { a.mode = 'idle'; a.target.copy(a.pos); } });
        }
        victim.mode = 'down';
        referee.mode = 'play';
        referee.target.copy(victim.pos).add(new THREE.Vector3(1.1, 0, 0.9));
        culprit.mode = 'idle';
        culprit.target.copy(victim.pos).add(new THREE.Vector3(-0.9, 0, 0.7));
        if (s.t > 1.0 && victim.mode === 'down') { victim.mode = 'idle'; victim.target.copy(victim.pos); }
        if (s.t > 1.2) referee.mode = 'card';            // düdük + el işareti (kart yok)
        if (p > 0.92) {
          referee.mode = 'play';
          cardMesh.visible = false;
          actors.forEach(a => { if (!a.staff && a.mode === 'idle') a.mode = 'play'; });
          ball.pos.set(victim.pos.x, 0.115, victim.pos.z);
          const taker = nearest(onPitch(victim.team), ball.pos) ?? victim;
          setHolder(taker);
          passTimer = 0.85;
          seq = null;
        }
        break;
      }
      case 'injury': {
        const hurt = (s.data.hurt as Actor) ?? home[6];
        if (s.t < 0.05) {
          setHolder(null);
          ball.vel.set(0, 0, 0);
          hurt.mode = 'down';
          actors.forEach(a => { if (!a.staff && a !== hurt) { a.mode = 'idle'; a.target.copy(a.pos); } });
        }
        hurt.mode = 'down';
        // Hakem + iki oyuncu + kulübeden fizyo başına gelir
        if (s.t > 0.4) {
          referee.target.copy(hurt.pos).add(new THREE.Vector3(1.2, 0, 0.8));
          referee.mode = 'play';
          const mates = onPitch(hurt.team).filter(a => a !== hurt).slice(0, 2);
          mates.forEach((m, i) => { m.mode = 'play'; m.target.copy(hurt.pos).add(new THREE.Vector3(-1.1 - i, 0, 1.1 - i * 2.2)); });
          const doc = benchActors[5];
          doc.mode = 'play';
          doc.target.copy(hurt.pos).add(new THREE.Vector3(0.4, 0, -1.2));
        }
        if (s.t > 4.6) {
          hurt.mode = 'walkoff';
          hurt.target.set(-16, 0, -(HW + 6.5));
          benchActors[5].mode = 'bench';
          benchActors[5].target.copy(benchActors[5].pos);
        }
        if (p > 0.96) {
          hurt.mode = 'off';
          actors.forEach(a => { if (!a.staff && a.mode === 'idle') a.mode = 'play'; });
          referee.mode = 'play';
          startSeq('kickoff', hurt.team === 'home' ? 'away' : 'home', 1.8);
        }
        break;
      }
      case 'sub': {
        if (s.t < 0.05) {
          subBoard.visible = true;
          const outA = onPitch(s.team).filter(a => !a.gk).pop() ?? home[10];
          const inA = benchActors.find(b => b.mode === 'bench' && b.role === 'YEDEK') ?? benchActors[0];
          s.data.out = outA;
          s.data.in = inA;
          outA.mode = 'walkoff';
          outA.target.set(-18, 0, -(HW + 6.2));
          setHolder(null);
          ball.vel.set(0, 0, 0);
        }
        const outA = s.data.out as Actor | undefined;
        const inA = s.data.in as Actor | undefined;
        if (s.t > 1.4 && inA) {
          if (outA) { inA.anchor.copy(outA.anchor); inA.pos.set(-19, 0, -(HW + 5.9)); }
          inA.target.set(inA.anchor.x, 0, inA.anchor.y);
          inA.mode = 'play';
        }
        if (s.t > 2.6) subBoard.visible = false;
        if (outA && s.t > 2.8) { outA.mode = 'off'; }
        if (p > 0.94) {
          subBoard.visible = false;
          const taker = nearest(onPitch(s.team), ball.pos) ?? home[6];
          setHolder(taker);
          passTimer = 0.9;
          seq = null;
        }
        break;
      }
      case 'corner': {
        if (s.t < 0.05) {
          const cornerX = attackX * HL;
          const cornerZ = Math.random() < 0.5 ? -HW : HW;
          ball.pos.set(cornerX, 0.115, cornerZ);
          ball.vel.set(0, 0, 0);
          const taker = nearest(onPitch(s.team), ball.pos);
          if (taker) { setHolder(taker); taker.pos.set(cornerX - attackX * 0.6, 0, cornerZ * 0.94); }
          const mates = onPitch(s.team).filter(a => !a.gk);
          mates.forEach((m, i) => { m.target.set(attackX * (HL - 8 - (i % 3) * 3), 0, (i - 4) * 3.2); });
        }
        if (s.t > 1.4 && s.t < 1.45) {
          const taker = ball.holder ?? nearest(onPitch(s.team), ball.pos);
          if (taker) kickTo(taker, new THREE.Vector3(attackX * (HL - 6), 0.4, (Math.random() - 0.5) * 10), 19, 0.75);
        }
        if (p > 0.95) { seq = null; passTimer = 0.6; }
        break;
      }
      case 'halfTime':
      case 'fullTime': {
        if (s.t < 0.05) {
          setHolder(null);
          ball.vel.set(0, 0, 0);
          actors.forEach(a => {
            if (a.staff || a.gk) return;
            a.mode = 'walkoff';
            a.target.set(-HL - 4 + (a.seed % 5) * 1.6, 0, 12 + (a.seed % 7) * 2.2);
          });
        }
        if (p > 0.9) {
          actors.forEach(a => { if (!a.staff) { a.mode = 'idle'; } });
          seq = { kind: 'warmup', t: 0, dur: 1e9, team: 'home', data: { still: true } };
        }
        break;
      }
      default:
        break;
    }
  };

  /* ══════════ OYUNCU HAREKETİ ══════════ */
  const moveActors = (dt: number, input: Match3DInput) => {
    const fatigue = clamp(0.62 + (input.energy / 100) * 0.45, 0.55, 1.06);
    for (const a of actors) {
      if (a.mode === 'off') { a.f.root.visible = false; a.f.shadow.visible = false; continue; }
      a.f.root.visible = true;
      a.f.shadow.visible = true;

      if (!a.staff && a.mode === 'play' && !seq) {
        // Açık oyun: takım bloğu topla kayar, yakın oyuncular prese gider
        const attackX = a.team === 'home' ? 1 : -1;
        const shiftX = clamp(ball.pos.x * 0.42, -22, 22);
        const shiftZ = clamp(ball.pos.z * 0.34, -14, 14);
        let tx = a.anchor.x + shiftX * 0.85;
        let tz = a.anchor.y + shiftZ * 0.85;
        if (a.gk) {
          const goalX = a.team === 'home' ? -HL + 1.6 : HL - 1.6;
          tx = goalX + clamp((ball.pos.x - goalX) * 0.04, -2.5, 2.5);
          tz = clamp(ball.pos.z * 0.34, -GOAL_HALF + 0.4, GOAL_HALF - 0.4);
        } else {
          const dBall = Math.hypot(ball.pos.x - a.pos.x, ball.pos.z - a.pos.z);
          const chase = a.role === 'FW' ? 0.34 : a.role === 'OS' ? 0.3 : a.role === 'DF' ? 0.2 : 0.12;
          const press = clamp(chase * (1 + (ball.holder?.team !== a.team ? 0.55 : 0)) * (dBall < 26 ? 1.35 : 0.7), 0, 0.92);
          tx = lerp(tx, ball.pos.x, press);
          tz = lerp(tz, ball.pos.z, press * 0.92);
          // Hücum yönünde biraz önde dur
          tx += attackX * (ball.holder?.team === a.team ? 2.5 : -1.2);
        }
        a.target.set(clamp(tx, -HL + 1, HL - 1), 0, clamp(tz, -HW + 0.8, HW - 0.8));
      }

      // Yedek kulübesi / teknik ekip: sabit
      if (a.mode === 'bench') {
        a.f.root.position.set(a.pos.x, 0, a.pos.z);
        a.f.root.rotation.y = 0;
        poseSeated(a.f.rig, simT, a.seed);      // kalçayı oturak hizasına indirir
        a.f.shadow.position.set(a.pos.x, 0.045, a.pos.z);
        a.f.shadow.scale.setScalar(0.7);
        continue;
      }

      // Hareket
      const dx = a.target.x - a.pos.x;
      const dz = a.target.z - a.pos.z;
      const dist = Math.hypot(dx, dz);
      let desired = 0;
      if (a.mode === 'walkoff' && dist < 0.7) { a.mode = 'off'; }
      if (dist > 0.18) {
        const urgency = a.mode === 'walkoff' ? 0.42 : a.mode === 'celebrate' ? 0.8 : a.mode === 'dive' ? 1 : 1;
        desired = Math.min(a.maxSpeed * fatigue * urgency, dist * 3.4);
        a.pos.x += (dx / dist) * desired * dt;
        a.pos.z += (dz / dist) * desired * dt;
        const wantFacing = Math.atan2(dx, dz);
        let diff = wantFacing - a.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.facing += diff * damp(9, dt);
      }
      a.speed = lerp(a.speed, desired, damp(8, dt));

      a.f.root.position.set(a.pos.x, 0, a.pos.z);
      a.f.root.rotation.y = a.facing;
      a.f.shadow.position.set(a.pos.x, 0.045, a.pos.z);
      a.f.shadow.scale.setScalar(0.85 + a.speed * 0.03);

      // Pozlar
      a.modeT += dt;
      const intensity = clamp(a.speed / 7.2, 0, 1);
      a.runPhase += dt * (3.2 + a.speed * 1.5);
      switch (a.mode) {
        case 'celebrate':
          poseCelebrate(a.f.rig, simT, a.seed, true);
          break;
        case 'down':
          poseLying(a.f.rig, simT, a.seed);
          break;
        case 'dive': {
          const dz2 = a.diveZ - a.pos.z;
          const side = dz2 >= 0 ? 1 : -1;
          a.pos.z += clamp(dz2, -6 * dt, 6 * dt);
          poseDive(a.f.rig, side, clamp(a.modeT / 0.75, 0, 1));
          if (a.modeT > 1.5) { a.mode = 'play'; a.f.root.rotation.z = 0; }
          break;
        }
        case 'kick':
          poseKick(a.f.rig, clamp(a.modeT / 0.42, 0, 1), 1);
          if (a.modeT > 0.55) a.mode = 'play';
          break;
        case 'card':
          poseCard(a.f.rig, simT, clamp((a.modeT) / 0.5, 0, 1));
          break;
        case 'walkoff':
          if (a.speed < 0.4) poseRun(a.f.rig, a.runPhase, 0.25);
          else poseRun(a.f.rig, a.runPhase, 0.45);
          break;
        case 'idle':
          poseIdle(a.f.rig, simT, a.seed);
          break;
        default:
          if (a.speed > 0.7) poseRun(a.f.rig, a.runPhase, intensity);
          else poseIdle(a.f.rig, simT, a.seed);
          break;
      }
      if (a.mode === 'dive' || a.mode === 'down') {
        // yere yakın gölgeler küçülür
        a.f.shadow.scale.setScalar(1.15);
      }
    }

    // Özel figürler: teknik direktör, 4. hakem, yan hakemler
    poseCoach(manager.f.rig, simT);
    manager.f.root.rotation.y = Math.sin(simT * 0.4) * 0.22;
    manager.f.root.position.copy(manager.pos);
    manager.f.shadow.position.set(manager.pos.x, 0.045, manager.pos.z);
    poseIdle(assistant.f.rig, simT * 0.8, 3);
    assistant.f.root.rotation.y = 0.22;
    assistant.f.root.position.copy(assistant.pos);
    assistant.f.shadow.position.set(assistant.pos.x, 0.045, assistant.pos.z);
    poseIdle(fourthOfficial.f.rig, simT * 0.6, 5);
    fourthOfficial.f.root.rotation.y = 0;
    fourthOfficial.f.root.position.copy(fourthOfficial.pos);
    fourthOfficial.f.shadow.position.set(fourthOfficial.pos.x, 0.045, fourthOfficial.pos.z);
    // Hakem oyunu çaprazdan takip eder (senaryo sırasında senaryo yönetir)
    if (!seq && referee.mode !== 'card') {
      referee.mode = 'play';
      referee.target.set(
        clamp(ball.pos.x * 0.85 + 7, -HL + 4, HL - 4),
        0,
        clamp(ball.pos.z * 0.7 + 7, -HW + 3, HW - 3)
      );
    }
    // Yan hakemler topun hizasında kayar
    linesmen.forEach((lm, i) => {
      const z = (i === 0 ? -1 : 1) * (HW + 0.6);
      lm.pos.x = lerp(lm.pos.x, clamp(ball.pos.x * 0.88 + (i === 0 ? -9 : 9), -HL + 2, HL - 2), damp(1.6, dt));
      lm.pos.z = z;
      lm.f.root.position.set(lm.pos.x, 0, lm.pos.z);
      lm.f.root.rotation.y = i === 0 ? 0 : Math.PI;
      lm.f.shadow.position.set(lm.pos.x, 0.045, lm.pos.z);
      const moving = Math.abs(ball.vel.x) > 4;
      if (moving) poseRun(lm.f.rig, simT * 9, 0.5); else poseIdle(lm.f.rig, simT, i);
    });
  };

  /* ══════════ TOP FİZİĞİ ══════════ */
  const updateBall = (dt: number) => {
    if (ball.holder) {
      const h = ball.holder;
      const forward = new THREE.Vector3(Math.sin(h.facing), 0, Math.cos(h.facing));
      const dribble = Math.sin(simT * 7 + h.seed) * 0.16;
      ball.pos.set(
        h.pos.x + forward.x * 0.52 + dribble * forward.z,
        0.115 + Math.abs(Math.sin(simT * 8 + h.seed)) * 0.05,
        h.pos.z + forward.z * 0.52 - dribble * forward.x
      );
      ball.vel.set(0, 0, 0);
    } else {
      ball.vel.y -= 9.8 * dt;
      ball.pos.addScaledVector(ball.vel, dt);
      if (ball.flight > 0) ball.flight -= dt;
      if (ball.pos.y < 0.115) {
        ball.pos.y = 0.115;
        if (ball.vel.y < -0.6) ball.vel.y = -ball.vel.y * 0.46;
        else ball.vel.y = 0;
        ball.vel.x *= 0.965;
        ball.vel.z *= 0.965;
        if (ball.vel.length() < 0.25) ball.vel.set(0, 0, 0);
      }
      // Direk / üst direkten dönme
      if (Math.abs(ball.pos.x) > HL - 0.1 && Math.abs(ball.pos.z) < GOAL_HALF + 0.4 && ball.pos.y < GOAL_H) {
        const gk = ball.lastTouch === 'home' ? awayGk : homeGk;
        const catchIt = allowCatch && gk.diveCatch;
        if (catchIt && gk.pos.distanceTo(ball.pos) < 3.4) {
          setHolder(gk);
          ball.pos.set(gk.pos.x, 0.5, gk.pos.z);
          gk.mode = 'play';
          passTimer = 1.1;
        } else {
          ball.vel.x *= -0.42;
        }
      }
    }
    // Kaleci topu tuttuysa bir süre sonra degaj yapar
    const keeper = ball.holder;
    if (keeper && keeper.gk && keeper.mode === 'play' && !seq) {
      passTimer -= dt;
      if (passTimer <= 0) {
        const dirSign = keeper.team === 'home' ? 1 : -1;
        const mate = onPitch(keeper.team)
          .filter(a => !a.gk)
          .sort((x, y) => (y.pos.x - keeper.pos.x) * dirSign - (x.pos.x - keeper.pos.x) * dirSign)[0];
        if (mate) {
          kickTo(keeper, mate.pos.clone(), 24, 0.85);
          ball.receiver = mate;
          passTimer = 1.4;
        } else {
          passTimer = 1.0;
        }
      }
    }
    ballMesh.position.copy(ball.pos);
    ballShadow.position.set(ball.pos.x, 0.05, ball.pos.z);
    const sc = clamp(1 - ball.pos.y * 0.06, 0.5, 1);
    ballShadow.scale.setScalar(sc);
    (ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.5 * sc;
    // Top döner
    const roll = ball.holder ? 1.6 : ball.vel.length() * 0.9;
    ballMesh.rotation.x += roll * dt * 0.9;
    ballMesh.rotation.z += roll * dt * 0.35;
  };

  /* ══════════ ORTAM / DETAYLAR ══════════ */
  const updateProps = (t: number, dt: number, input: Match3DInput) => {
    // Tribün bayrakları + coşku
    const hype = crowdHype;
    crowdHype = Math.max(0, crowdHype - dt * 0.35);
    const waveSpeed = 1.1 + hype * 4.5 + (input.minute > 75 ? 0.6 : 0);
    const waveAmp = 0.16 + hype * 0.5;
    stadium.animated.flags.forEach((fl, i) => {
      fl.rotation.y = Math.sin(t * waveSpeed + i * 0.7) * waveAmp;
      fl.rotation.z = Math.sin(t * waveSpeed * 0.8 + i) * waveAmp * 0.3;
    });
    // Taraftar dokusu hafifçe kıpırdar (golde daha belirgin)
    if (!lowPerf) {
      stadium.animated.crowdMaterials.forEach(m => {
        if (m.map) m.map.offset.y = (Math.sin(t * (1.2 + hype * 5)) * 0.004);
        m.emissiveIntensity = 0.05 + hype * 0.35;
        if (!m.emissive) m.emissive = new THREE.Color(0xffffff);
      });
    }
    // LED panolar kayar
    stadium.animated.ledTextures.forEach(tex => { tex.offset.x = (tex.offset.x + dt * 0.14) % 1; });
    // Köşe bayrakları
    cornerFlags.forEach((cf, i) => { cf.rotation.y = Math.sin(t * 1.6 + i) * 0.12; });
    // Yağmur / kar
    if (particles) {
      const pos = particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= particleVel * dt;
        if (snowy) { arr[i] += Math.sin(t * 1.4 + i) * dt * 0.9; arr[i + 2] += Math.cos(t * 1.1 + i) * dt * 0.7; }
        else { arr[i] += dt * 2.2; }
        if (arr[i + 1] < 0) {
          arr[i + 1] = 42 + Math.random() * 6;
          arr[i] = (Math.random() - 0.5) * 150;
          arr[i + 2] = (Math.random() - 0.5) * 110;
        }
      }
      pos.needsUpdate = true;
    }
    // Fırtına şimşeği
    if (lightning) {
      nextFlash -= dt;
      if (nextFlash <= 0) { nextFlash = 5 + Math.random() * 9; flashT = 0.34; }
      if (flashT > 0) {
        flashT -= dt;
        lightning.intensity = Math.max(0, Math.sin((0.34 - flashT) * 22)) * 3.4;
      } else lightning.intensity = 0;
    }
    // Skorbord
    drawScoreboard(opts.homeName, opts.awayName, input.scoreHome, input.scoreAway, input.minute, input.phase === 'first' || input.phase === 'second' || input.phase === 'et');
    // Kamera sarsıntısı (gol/kart anında)
    shake = Math.max(0, shake - dt * 0.9);
  };

  /* ══════════ KAMERA — menajerlerin durduğu yer ══════════ */
  const updateCamera = (dt: number, input: Match3DInput) => {
    const bx = clamp(ball.pos.x, -HL, HL);
    const bz = clamp(ball.pos.z, -HW, HW);
    let pos: THREE.Vector3;
    let target: THREE.Vector3;
    let fov: number;
    if (camMode.current === 'manager') {
      // Teknik alanın hemen arkası, ayakta duran menajer göz hizası (~2.35 m)
      const camX = clamp(bx * 0.68, -30, 30) - 1.2;
      pos = new THREE.Vector3(camX, CAM_Y, CAM_Z);
      target = new THREE.Vector3(clamp(bx * 0.97, -50, 50), 0.75, clamp(bz * 0.6, -20, 20));
      fov = 46;
      // El kamerası hissi + golde sarsıntı
      pos.y += Math.sin(simT * 1.7) * 0.03 + shake * Math.sin(simT * 32) * 0.15;
      pos.x += Math.cos(simT * 1.3) * 0.04 + shake * Math.cos(simT * 27) * 0.11;
    } else {
      pos = new THREE.Vector3(clamp(bx * 0.42, -24, 24), 31, -(HW + 3.4));
      target = new THREE.Vector3(clamp(bx * 0.5, -36, 36), 0.4, clamp(bz * 0.34, -12, 12));
      fov = 54;
    }
    const k = damp(camMode.current === 'manager' ? 3.1 : 2.2, dt);
    cam.position.lerp(pos, k);
    cam.target.lerp(target, k);
    cam.fov = lerp(cam.fov, fov, k);
    void input;
  };

  /* ══════════ FAZ TAKİBİ ══════════ */
  let lastPhase = 'pre';
  const updatePhase = (input: Match3DInput) => {
    const ph = input.phase;
    if (ph === lastPhase) return;
    lastPhase = ph;
    if (ph === 'first' || ph === 'second' || ph === 'et') {
      startSeq('kickoff', ph === 'first' ? 'home' : 'away', 2.4);
    } else if (ph === 'half') {
      startSeq('halfTime', 'home', 5.0);
    } else if (ph === 'done' || ph === 'pens') {
      startSeq('fullTime', 'home', 5.0);
    }
  };

  const bundle: Match3DBundle = {
    group,
    sky: opts.night ? 0x0a102a : 0x7fb2e5,
    skyTexture: stadium.skyTexture,
    fog: opts.weather === 'fog'
      ? [opts.night ? 0x2a3550 : 0xc9d6e2, 40, 190]
      : [opts.night ? 0x22314e : 0xd9eaf7, 190, 760],
    cam,
    ballPos,
    setCameraMode(m) { camMode.current = m; },
    update(t, dt, input) {
      if (!(input.timeScale > 0)) return;              // ⏸️ donmuş — hiçbir şey kıpırdamaz
      const sdt = Math.min(0.05, dt) * clamp(input.timeScale, 0.05, 1.4);
      simT += sdt;
      if (input.event && input.event.key !== lastEventKey) {
        lastEventKey = input.event.key;
        handleEvent(input.event);
      }
      updatePhase(input);
      // Oyuncu sayıları düştüyse (kırmızı kart) sahadan çıkar
      const counts: Record<Side, number> = { home: input.homeOnPitch, away: input.awayOnPitch };
      (['home', 'away'] as Side[]).forEach(side => {
        const list = actors.filter(a => !a.staff && a.team === side && a.mode !== 'off' && a.mode !== 'bench');
        for (let i = list.length - 1; i >= counts[side]; i--) {
          if (list[i] && list[i].mode !== 'walkoff') { list[i].mode = 'walkoff'; list[i].target.set(list[i].pos.x * 0.3, 0, -(HW + 6)); }
        }
      });
      if (seq) stepSeq(sdt);
      else stepOpenPlay(sdt, input);
      moveActors(sdt, input);
      updateBall(sdt);
      updateProps(t, sdt, input);
      updateCamera(sdt, input);
    },
    dispose() {
      sbOldTex?.dispose();
      sbTex?.dispose();
      ballTex?.dispose();
      ballShadowCanvasTex?.dispose();
      stadium.skyTexture?.dispose();
      disposables.forEach(d => d.dispose());
    }
  };
  return bundle;
}
