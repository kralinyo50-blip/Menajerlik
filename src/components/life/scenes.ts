import * as THREE from 'three';
import { LifeActivityId } from '../../types/game';
import {
  buildCharacter, poseBenchPress, poseBike, poseGaming, poseResting,
  poseRunning, poseSpeaking, poseStanding, poseWalking
} from './character';

const hasDom = typeof document !== 'undefined';

export interface LifeSceneBuild {
  group: THREE.Group;
  update: (t: number, dt: number) => void;
  camera: {
    radius: number;
    phi: number;
    theta: number;
    targetY: number;
    targetX?: number;
    targetZ?: number;
    fov?: number;
    maxPhi?: number;
  };
  sky: string;
  fog?: [string, number, number];
}

export interface LifeSceneOptions {
  clubColor?: string;
  clubLogo?: string;
  playerName?: string;
  skin?: string;
  hair?: string;
  outfit?: 'club' | 'black';
  timeOfDay?: 'morning' | 'day' | 'evening' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  lowPerf?: boolean;
}

/* ══════════════ YARDIMCI PARÇALAR ══════════════ */

function floorMat(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
}

/** Ekran/televizyon dokusu — varyanta göre farklı içerik */
function screenTexture(w = 256, h = 160, mode: 'game-fifa' | 'game-shooter' | 'game-manager' | 'game' | 'off' | 'sky' | 'film' = 'game') {
  if (!hasDom) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // normalize legacy 'game' -> fifa
  const m = mode === 'game' ? 'game-fifa' : mode;
  if (m === 'game-fifa') {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(10, h - 60, w - 20, 40);        // saha
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(w / 2 - 2, h - 60, 4, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('2 - 1', w / 2 - 30, 40);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(30, h - 100, 30, 30);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(w - 70, h - 100, 30, 30);
    // top FUT logosu
    ctx.fillStyle = '#0ea5e9';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('FUT', w / 2 - 12, h - 70);
  } else if (m === 'game-shooter') {
    ctx.fillStyle = '#1a0b14';
    ctx.fillRect(0, 0, w, h);
    // karanlık arena
    ctx.fillStyle = '#2d0f1f';
    ctx.fillRect(20, 60, w - 40, h - 90);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(w / 2 - 30, h / 2 - 10, 60, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('VS', w / 2 - 12, h / 2 + 2);
    ctx.fillStyle = '#f59e0b';
    // crosshair
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - 18, h / 2 - 18, 36, 36);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('HEADSHOT!', w / 2 - 32, 30);
  } else if (m === 'game-manager') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    // taktik tahtası
    ctx.fillStyle = '#14532d';
    ctx.fillRect(10, 30, w - 20, h - 50);
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 30, w - 20, h - 50);
    ctx.strokeRect(w / 2 - 20, 30, 40, h - 50);
    ctx.beginPath(); ctx.arc(w / 2, 30 + (h - 50) / 2, 18, 0, Math.PI * 2); ctx.stroke();
    // oyuncular (noktalar)
    ctx.fillStyle = '#facc15';
    [[60, 70], [80, 95], [55, 120]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#60a5fa';
    [[w - 60, 70], [w - 80, 95], [w - 55, 120]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('4-3-3', w / 2 - 14, 22);
  } else if (m === 'film') {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(12, 18, w - 24, h - 36);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('▶', w / 2 - 8, h / 2 + 6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(20, h - 30, w - 40, 3);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(20, h - 30, 60, 3);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '7px system-ui, sans-serif';
    ctx.fillText('FILM • 1080p', 22, 28);
  } else if (m === 'off') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    // hafif yansıma
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, w, h / 3);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0ea5e9');
    grad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Ağaç: gövde + yaprak kümeleri */
function makeTree(x: number, z: number, scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 2.4, 7),
    new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.95 })
  );
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  tree.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.95 });
  [[0, 2.8, 0, 1.25], [0.6, 2.4, 0.3, 0.9], [-0.55, 2.5, -0.25, 0.85], [0.15, 3.4, -0.35, 0.8]].forEach(([lx, ly, lz, r]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), leafMat);
    leaf.position.set(lx, ly, lz);
    leaf.castShadow = true;
    tree.add(leaf);
  });
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  return tree;
}

/** Çam ağacı (dağ sahnesi için) */
function makePine(x: number, z: number, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x4b2e16, roughness: 0.95 }));
  trunk.position.y = 0.8;
  g.add(trunk);
  const green = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.95 });
  [1.9, 1.3, 0.7].forEach((y, i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.65 - i * 0.13, 1.1, 8), green);
    cone.position.y = y;
    g.add(cone);
  });
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  return g;
}

/** Bina: pencere dokusu ile */
function makeBuilding(w: number, h: number, d: number, color: number) {
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  );
  building.position.y = h / 2;
  building.castShadow = true;
  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.92, h * 0.9, d * 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: new THREE.Color(0x334155), emissiveIntensity: 0.5, roughness: 0.3 })
  );
  windows.position.set(0, h / 2, d / 2 + 0.01);
  const group = new THREE.Group();
  group.add(building, windows);
  return group;
}

/** Araba (izleyici hareket ettirir) */
function makeCar(color: number) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 3.8), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.35 }));
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 1.9), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 }));
  cabin.position.set(0, 1.02, -0.15);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  [[-0.78, 1.25], [0.78, 1.25], [-0.78, -1.25], [0.78, -1.25]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.32, z);
    car.add(wheel);
  });
  car.add(body, cabin);
  return car;
}

/** Emoji etiketli sprite (kafa üstü Zzz, 💤 vb.) */
function makeSprite(text: string, color = 'rgba(255,255,255,0.9)') {
  if (!hasDom) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = '74px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.7, 0.7, 0.7);
  return sprite;
}

function indoorLighting(scene: THREE.Group, color = 0xfff3d6, intensity = 0.9, lowPerf = false) {
  const ambient = new THREE.HemisphereLight(0xffffff, 0x5b6472, 1.05);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, intensity);
  key.position.set(4, 7, 5);
  key.castShadow = !lowPerf;
  if (!lowPerf) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.normalBias = 0.4;
  }
  scene.add(key);
  const warm = new THREE.PointLight(color, 60, 20, 2);
  warm.position.set(0, 3.2, 1.5);
  scene.add(warm);
  return { ambient, key };
}

function applyTimeAndSeasonToSky(baseSky: string, opts: LifeSceneOptions): string {
  if (!opts.timeOfDay && !opts.season) return baseSky;
  const base = new THREE.Color(baseSky);
  // Mevsim tonu
  if (opts.season === 'winter') base.lerp(new THREE.Color('#dbeafe'), 0.18);
  else if (opts.season === 'autumn') base.lerp(new THREE.Color('#fef3c7'), 0.12);
  else if (opts.season === 'summer') base.lerp(new THREE.Color('#7dd3fc'), 0.10);
  // Günün saati
  if (opts.timeOfDay === 'evening') base.lerp(new THREE.Color('#2d1b4a'), 0.28).multiplyScalar(0.92);
  else if (opts.timeOfDay === 'night') base.lerp(new THREE.Color('#0f172a'), 0.45).multiplyScalar(0.78);
  else if (opts.timeOfDay === 'morning') base.lerp(new THREE.Color('#fed7aa'), 0.15);
  return '#' + base.getHexString();
}

function timeIntensity(base: number, time?: string): number {
  if (time === 'night') return base * 0.55;
  if (time === 'evening') return base * 0.75;
  if (time === 'morning') return base * 0.90;
  return base;
}

/* ══════════════ SAHNE 1: SPOR SALONU ══════════════ */

function buildGymRoom(): {
  room: THREE.Group;
  beltMat: THREE.MeshStandardMaterial;
  bikeWheel: THREE.Mesh;
  barbell: THREE.Group;
  npcs: { rig: ReturnType<typeof buildCharacter>; kind: 'curl' | 'stretch'; phase: number }[];
} {
  const room = new THREE.Group();
  const W = 14, D = 11, H = 4.3;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat(0x5b6270));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b7482, roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.3), wallMat);
  back.position.set(0, H / 2, -D / 2);
  room.add(back);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, H, D), wallMat);
  left.position.set(-W / 2, H / 2, 0);
  room.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.3, H, D), wallMat);
  right.position.set(W / 2, H / 2, 0);
  room.add(right);
  const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.3), wallMat);
  front.position.set(0, H / 2, D / 2);
  room.add(front);

  for (let i = -2; i <= 2; i++) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 1, 0.35),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x6f7885 : 0x505764, roughness: 0.95 })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.005, i * 2.2);
    room.add(stripe);
  }

  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x9fb3c8, roughness: 0.08, metalness: 0.75 })
  );
  mirror.position.set(-W / 2 + 0.2, 1.5, -1.5);
  mirror.rotation.y = Math.PI / 2;
  room.add(mirror);

  [-3.5, 0, 3.5].forEach(x => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.1, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: new THREE.Color(0xfff2c4), emissiveIntensity: 1.25 })
    );
    panel.position.set(x, H - 0.12, 0);
    room.add(panel);
  });

  const windowTex = screenTexture(180, 120, 'sky');
  const windowMat = new THREE.MeshStandardMaterial({ color: windowTex ? 0xffffff : 0x9ec9ff, roughness: 0.2, emissiveIntensity: 0.2 });
  if (windowTex) {
    windowMat.map = windowTex;
    windowMat.emissiveMap = windowTex;
    windowMat.emissive = new THREE.Color(0xffffff);
    windowMat.emissiveIntensity = 0.35;
  }
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2), windowMat);
  windowMesh.position.set(0, 1.85, -D / 2 + 0.18);
  room.add(windowMesh);

  const tvTex = screenTexture(200, 130, 'game');
  const tvMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissiveIntensity: 0.8 });
  if (tvTex) {
    tvMat.map = tvTex;
    tvMat.emissiveMap = tvTex;
    tvMat.emissive = new THREE.Color(0xffffff);
  }
  const tv = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.12), tvMat);
  tv.position.set(W / 2 - 0.35, 2.1, -2.2);
  tv.rotation.y = -Math.PI / 2;
  room.add(tv);

  const rackMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.5, roughness: 0.5 });
  const rack = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 0.8), rackMat);
  rack.position.set(3.6, 0.5, -D / 2 + 1.2);
  const rackLegs = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.12), rackMat);
  rackLegs.position.set(3.6, 0.25, -D / 2 + 1.2);
  room.add(rack, rackLegs);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.4, roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const dumbbell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10), plateMat);
    dumbbell.rotation.z = Math.PI / 2;
    dumbbell.position.set(2.4 + i * 0.45, 0.68, -D / 2 + 1.2);
    room.add(dumbbell);
  }

  const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.4 }));
  cooler.position.set(-W / 2 + 1, 0.55, D / 2 - 1.2);
  room.add(cooler);

  const treadmill = new THREE.Group();
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 2.6), beltMat);
  belt.position.y = 0.25;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 2.4), new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.4 }));
  deck.position.y = 0.12;
  const console1 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.7, 0.14), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.3 }));
  console1.position.set(0, 1.05, -1.1);
  console1.rotation.x = -0.35;
  const screen1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.45, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: new THREE.Color(0xf59e0b), emissiveIntensity: 0.85 })
  );
  screen1.position.set(0, 1.08, -1.0);
  screen1.rotation.x = -0.35;
  const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6 }));
  bar1.rotation.z = Math.PI / 2;
  bar1.position.set(0, 1.0, -0.75);
  [-0.62, 0.62].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.6), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.55, roughness: 0.4 }));
    rail.position.set(x, 0.92, 0);
    treadmill.add(rail);
  });
  treadmill.add(belt, deck, console1, screen1, bar1);
  treadmill.position.set(-3.6, 0, 0.6);
  treadmill.rotation.y = Math.PI * 0.06;
  room.add(treadmill);

  const benchGroup = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 1.9), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 }));
  pad.position.y = 0.62;
  const benchLegs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.16), rackMat);
  benchLegs.position.set(0, 0.31, -0.7);
  const benchLegs2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.16), rackMat);
  benchLegs2.position.set(0, 0.31, 0.7);
  benchGroup.add(pad, benchLegs, benchLegs2);
  benchGroup.position.set(2.6, 0, 0.8);
  benchGroup.rotation.y = -0.25;
  room.add(benchGroup);

  const barbell = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 10), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.75, roughness: 0.25 }));
  bar.rotation.z = Math.PI / 2;
  barbell.add(bar);
  [-0.75, 0.75].forEach(x => {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 }));
    plate.rotation.z = Math.PI / 2;
    plate.position.x = x;
    barbell.add(plate);
  });
  barbell.position.set(2.5, 1.35, 0.75);
  barbell.rotation.y = -0.25;
  room.add(barbell);

  const bike = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.35, roughness: 0.6 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.75, roughness: 0.3 });

  const frontFoot = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.16), darkMat);
  frontFoot.position.set(0, 0.06, -0.6);
  const rearFoot = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.16), darkMat);
  rearFoot.position.set(0, 0.06, 0.52);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.2), frameMat);
  beam.position.set(0, 0.16, -0.04);

  const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.15), frameMat);
  frontPost.position.set(0, 0.62, -0.46);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 10), steelMat);
  stem.position.set(0, 1.26, -0.46);
  const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.09, 0.1), darkMat);
  handleBar.position.set(0, 1.42, -0.46);
  const hornL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.34), darkMat);
  hornL.position.set(-0.28, 1.42, -0.62);
  const hornR = hornL.clone();
  hornR.position.x = 0.28;
  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.07), darkMat);
  consoleBox.position.set(0, 1.44, -0.34);
  const consoleScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.13, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: new THREE.Color(0x38bdf8), emissiveIntensity: 0.6 })
  );
  consoleScreen.position.set(0, 1.45, -0.29);

  const seatPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.86, 0.12), frameMat);
  seatPost.position.set(0, 0.66, 0.42);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.52), darkMat);
  saddle.position.set(0, 1.06, 0.42);
  const saddleNose = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.22), darkMat);
  saddleNose.position.set(0, 1.05, 0.18);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 0.45, -0.6);
  wheelPivot.rotation.y = Math.PI / 2;
  const bikeWheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 10, 24), darkMat);
  const spokes = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.03), steelMat);
    spoke.rotation.z = (i * Math.PI) / 3;
    spokes.add(spoke);
  }
  wheelPivot.add(bikeWheel, spokes);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), steelMat);
  hub.rotation.z = Math.PI / 2;
  hub.position.set(0, 0.45, -0.6);

  const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 12), steelMat);
  crank.rotation.z = Math.PI / 2;
  crank.position.set(0, 0.44, 0.02);
  const pedalArmL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.07), steelMat);
  pedalArmL.position.set(-0.16, 0.44, -0.06);
  const pedalL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.12), darkMat);
  pedalL.position.set(-0.2, 0.3, -0.1);
  const pedalArmR = pedalArmL.clone();
  pedalArmR.position.set(0.16, 0.44, 0.1);
  const pedalR = pedalL.clone();
  pedalR.position.set(0.2, 0.58, 0.14);

  bike.add(frontFoot, rearFoot, beam, frontPost, stem, handleBar, hornL, hornR, consoleBox, consoleScreen, seatPost, saddle, saddleNose, wheelPivot, hub, crank, pedalArmL, pedalL, pedalArmR, pedalR);
  const bikePos = new THREE.Vector3(-4.4, 0, -1.6);
  const bikeYaw = 0.5;
  bike.position.copy(bikePos);
  bike.rotation.y = bikeYaw;
  room.add(bike);

  const npcs: { rig: ReturnType<typeof buildCharacter>; kind: 'curl' | 'stretch'; phase: number }[] = [];
  [
    { x: 3.6, z: -2.9, ry: 0.4, shirt: '#dc2626', skin: '#c98b5e', kind: 'curl' as const },
    { x: -1.6, z: -3.0, ry: -0.5, shirt: '#059669', skin: '#f2d2b3', kind: 'stretch' as const },
  ].forEach((cfg, i) => {
    const npc = buildCharacter({ shirt: cfg.shirt, shorts: '#111827', skin: cfg.skin });
    npc.root.position.set(cfg.x, 0, cfg.z);
    npc.root.rotation.y = cfg.ry;
    poseStanding(npc);
    room.add(npc.root);
    npcs.push({ rig: npc, kind: cfg.kind, phase: i * 1.3 });
  });

  return { room, beltMat, bikeWheel, barbell, npcs };
}

function buildGymScene(variant: 'run' | 'lift' | 'bike', opts: LifeSceneOptions): LifeSceneBuild {
  const group = new THREE.Group();
  const { room, beltMat, bikeWheel, barbell, npcs } = buildGymRoom();
  group.add(room);
  const lights = indoorLighting(group, 0xfff0c9, timeIntensity(1.25, opts.timeOfDay), !!opts.lowPerf);

  const shirtCol = opts.outfit === 'black' ? '#111827' : (opts.clubColor ?? '#1d4ed8');
  const rig = buildCharacter({
    shirt: shirtCol,
    shorts: '#0f172a',
    shoes: '#f8fafc',
    skin: opts.skin,
    hair: opts.hair,
  });
  rig.root.castShadow = true;
  group.add(rig.root);

  let camera: LifeSceneBuild['camera'] = { radius: 5.2, phi: 1.12, theta: 0.7, targetY: 1.1, targetX: 0, targetZ: 0, fov: 45 };

  if (variant === 'run') {
    rig.root.position.set(-3.6, 0.32, 0.6);
    rig.root.rotation.y = Math.PI * 0.06 + Math.PI;
    camera = { radius: 4.3, phi: 1.14, theta: 0.8, targetY: 1.05, targetX: -3.6, targetZ: 0.5, fov: 48, maxPhi: 1.26 };
  } else if (variant === 'lift') {
    rig.root.position.set(2.6, 0.42, 0.8);
    rig.root.rotation.y = -0.25;
    camera = { radius: 3.3, phi: 1.08, theta: -0.85, targetY: 1.0, targetX: 2.55, targetZ: 0.75, fov: 50, maxPhi: 1.2 };
  } else {
    const bikeYaw = 0.5;
    const seatOffset = 0.42;
    const seatX = -4.4 + Math.sin(bikeYaw) * seatOffset;
    const seatZ = -1.6 + Math.cos(bikeYaw) * seatOffset;
    rig.root.position.set(seatX, 1.06 - 0.88, seatZ);
    rig.root.rotation.y = bikeYaw + Math.PI;
    camera = { radius: 3.6, phi: 1.22, theta: -2.9, targetY: 0.95, targetX: seatX, targetZ: seatZ, fov: 48, maxPhi: 1.3 };
  }

  const update = (t: number, dt: number) => {
    npcs.forEach(npc => {
      const local = t + npc.phase;
      if (npc.kind === 'curl') {
        const curl = (Math.sin(local * 2.4) + 1) / 2;
        npc.rig.leftArm.rotation.x = -1.1 - curl * 0.7;
        npc.rig.rightArm.rotation.x = -1.1 - curl * 0.7;
        npc.rig.leftForearm.rotation.x = -1.5 + curl * 1.1;
        npc.rig.rightForearm.rotation.x = -1.5 + curl * 1.1;
        npc.rig.torso.rotation.y = Math.sin(local * 1.2) * 0.05;
      } else {
        npc.rig.torso.rotation.x = 0.25 + Math.sin(local * 0.9) * 0.12;
        npc.rig.leftArm.rotation.set(-2.4, 0, 0.5);
        npc.rig.rightArm.rotation.set(-2.4, 0, -0.5);
        npc.rig.leftForearm.rotation.set(-0.4, 0, 0);
        npc.rig.rightForearm.rotation.set(-0.4, 0, 0);
      }
    });

    if (variant === 'run') {
      poseRunning(rig, t);
      beltMat.color.offsetHSL(0, 0, 0.0004 * Math.sin(t * 12));
    } else if (variant === 'lift') {
      poseBenchPress(rig, t);
      const push = (Math.sin(t * 3) + 1) / 2;
      barbell.position.y = 1.02 + push * 0.62;
      barbell.position.z = 0.78 - push * 0.06;
    } else {
      poseBike(rig, t);
      bikeWheel.rotation.z -= dt * 6;
    }
    lights.key.intensity = 1.0 + Math.sin(t * 1.4) * 0.05;
  };

  const sky = applyTimeAndSeasonToSky('#1b1f27', opts);
  if (opts.lowPerf) {
    group.traverse(o => {
      const m = o as THREE.Mesh;
      if ((m as any).castShadow !== undefined) (m as any).castShadow = false;
      if ((m as any).receiveShadow !== undefined) (m as any).receiveShadow = false;
    });
  }
  return { group, update, camera, sky };
}

/* ══════════════ SAHNE 2: EV ══════════════ */

type HomeVariant = 'game-fifa' | 'game-shooter' | 'game-manager' | 'rest-nap' | 'rest-film' | 'rest-family';

function buildHomeScene(variant: HomeVariant, opts: LifeSceneOptions): LifeSceneBuild {
  const group = new THREE.Group();
  const W = 9, D = 7.5, H = 3.7;

  const isGame = variant.startsWith('game');
  const isRest = variant.startsWith('rest');
  const sub = variant.split('-')[1] as string;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat(0xb08a5e));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const rugColor = isGame
    ? 0x334155
    : sub === 'nap'
      ? new THREE.Color(opts.clubColor ?? '#1d4ed8').multiplyScalar(0.55).getHex()
      : sub === 'film'
        ? 0x1e1b4b
        : 0xfde68a; // aile zamanı sıcak halı
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 3.2),
    new THREE.MeshStandardMaterial({ color: rugColor, roughness: 0.98 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.012, 0.55);
  group.add(rug);

  const wallMat = new THREE.MeshStandardMaterial({ color: isRest && sub === 'film' ? 0x1e1b3a : 0xf0e7d8, roughness: 0.95 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.25), wallMat);
  backWall.position.set(0, H / 2, -D / 2);
  group.add(backWall);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, D), wallMat);
  leftWall.position.set(-W / 2, H / 2, 0);
  group.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, D), wallMat);
  rightWall.position.set(W / 2, H / 2, 0);
  group.add(rightWall);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, D), new THREE.MeshStandardMaterial({ color: 0xf5f1e8, roughness: 0.95 }));
  ceiling.position.y = H;
  group.add(ceiling);

  // Tavan lambası — filmde kısık
  const ceilingIntensity = sub === 'film' ? 0.45 : sub === 'nap' ? 0.35 : 1.2;
  const ceilingLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: new THREE.Color(0xfff0c0), emissiveIntensity: ceilingIntensity })
  );
  ceilingLamp.position.set(0, H - 0.2, 0.2);
  group.add(ceilingLamp);
  const ceilingLight = new THREE.PointLight(0xffeec4, sub === 'film' ? 8 : sub === 'nap' ? 6 : 30, 12, 2);
  ceilingLight.position.set(0, H - 0.4, 0.2);
  group.add(ceilingLight);

  for (let i = 0; i < 3; i++) {
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.8),
      new THREE.MeshStandardMaterial({ color: i === 1 ? (opts.clubColor ?? '#1d4ed8') : 0x334155, roughness: 0.9 })
    );
    poster.position.set(-2.6 + i * 1.6, 1.9, -D / 2 + 0.14);
    group.add(poster);
  }

  const sofaMat = new THREE.MeshStandardMaterial({ color: sub === 'family' ? 0x6d4a2a : 0x3f4a5a, roughness: 0.95 });
  const sofa = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 1.1), sofaMat);
  seat.position.y = 0.45;
  const backRest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 0.28), sofaMat);
  backRest.position.set(0, 0.85, -0.45);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.1), sofaMat);
  armL.position.set(-1.6, 0.7, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.1), sofaMat);
  armR.position.set(1.6, 0.7, 0);
  sofa.add(seat, backRest, armL, armR);
  sofa.position.set(0, 0, 1.2);
  sofa.rotation.y = Math.PI;
  group.add(sofa);

  const table = new THREE.Group();
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.8), new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.8 }));
  tableTop.position.y = 0.42;
  const tableLeg = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 0.6), new THREE.MeshStandardMaterial({ color: 0x4b3524, roughness: 0.85 }));
  tableLeg.position.y = 0.2;
  table.add(tableTop, tableLeg);
  table.position.set(0, 0, -0.3);
  group.add(table);

  // Sehpa objeleri varyanta göre değişir
  if (isGame) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
    mug.position.set(0.45, 0.54, -0.3);
    group.add(mug);
    // oyun kumandası
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.14), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    pad.position.set(-0.2, 0.52, -0.28);
    pad.rotation.y = 0.2;
    group.add(pad);
  } else if (sub === 'film') {
    const popcorn = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.18, 10), new THREE.MeshStandardMaterial({ color: 0xfde68a }));
    popcorn.position.set(0.35, 0.55, -0.25);
    group.add(popcorn);
    const popcornTop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.9 }));
    popcornTop.position.set(0.35, 0.68, -0.25);
    popcornTop.scale.y = 0.55;
    group.add(popcornTop);
    const remote = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    remote.position.set(-0.25, 0.52, -0.32);
    group.add(remote);
  } else if (sub === 'family') {
    // aile: 2 bardak + oyuncak
    [-0.3, 0.45].forEach(x => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      cup.position.set(x, 0.54, -0.28);
      group.add(cup);
    });
    const toy = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    toy.position.set(0.05, 0.55, -0.45);
    group.add(toy);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    photo.position.set(2.2, 1.2, -D / 2 + 0.18);
    group.add(photo);
  } else { // nap
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
    mug.position.set(0.45, 0.54, -0.3);
    group.add(mug);
    const blanket = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.clubColor ?? '#1d4ed8').multiplyScalar(0.85).getHex(), roughness: 1, side: THREE.DoubleSide }));
    blanket.rotation.x = -Math.PI / 2;
    blanket.position.set(0.2, 0.58, 1.15);
    blanket.rotation.z = 0.2;
    group.add(blanket);
  }

  // Televizyon — varyanta göre doku
  let tvMode: 'game-fifa' | 'game-shooter' | 'game-manager' | 'off' | 'film' = 'off';
  let tvEmissive = 0.12;
  let tvLightColor = 0x9ad7ff;
  let tvLightIntensity = 0;
  if (sub === 'fifa') { tvMode = 'game-fifa'; tvEmissive = 1.2; tvLightIntensity = 26; tvLightColor = 0x86efac; }
  else if (sub === 'shooter') { tvMode = 'game-shooter'; tvEmissive = 1.35; tvLightIntensity = 34; tvLightColor = 0xf87171; }
  else if (sub === 'manager') { tvMode = 'game-manager'; tvEmissive = 1.0; tvLightIntensity = 22; tvLightColor = 0x93c5fd; }
  else if (sub === 'film') { tvMode = 'film'; tvEmissive = 0.95; tvLightIntensity = 18; tvLightColor = 0xa5b4fc; }
  else if (sub === 'nap') { tvMode = 'off'; tvEmissive = 0.04; tvLightIntensity = 0; }
  else if (sub === 'family') { tvMode = 'off'; tvEmissive = 0.06; tvLightIntensity = 0; }

  const screenTex = screenTexture(240, 150, tvMode as any);
  const tvMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissiveIntensity: tvEmissive });
  if (screenTex) {
    tvMat.map = screenTex;
    tvMat.emissiveMap = screenTex;
    tvMat.emissive = new THREE.Color(0xffffff);
  }
  const tvPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.1), tvMat);
  tvPanel.position.set(0, 1.55, -D / 2 + 0.2);
  group.add(tvPanel);
  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
  tvStand.position.set(0, 0.25, -D / 2 + 0.3);
  group.add(tvStand);
  const tvLight = new THREE.PointLight(tvLightColor, tvLightIntensity, 8, 2);
  tvLight.position.set(0, 1.6, -D / 2 + 1.2);
  group.add(tvLight);

  if (isGame) {
    const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.45), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 }));
    consoleBox.position.set(-1.2, 0.46, -D / 2 + 0.5);
    group.add(consoleBox);
    const ledCol = sub === 'shooter' ? 0xef4444 : sub === 'manager' ? 0xa78bfa : 0x22d3ee;
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.06),
      new THREE.MeshStandardMaterial({ color: ledCol, emissive: new THREE.Color(ledCol), emissiveIntensity: 1.6 })
    );
    led.position.set(-1.2, 0.53, -D / 2 + 0.5);
    group.add(led);
  }

  // Lambader — filmde loş, napta sıcak
  const lampColor = sub === 'film' ? 0xddd6fe : sub === 'nap' ? 0xffedd5 : 0xfde68a;
  const lampShadeEmissive = sub === 'nap' ? 1.4 : sub === 'film' ? 0.35 : sub === 'family' ? 1.0 : 0.55;
  const lamp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.5 }));
  pole.position.y = 0.85;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.45, 14, 1, true), new THREE.MeshStandardMaterial({ color: lampColor, side: THREE.DoubleSide, emissive: new THREE.Color(lampColor), emissiveIntensity: lampShadeEmissive }));
  shade.position.y = 1.75;
  lamp.add(pole, shade);
  lamp.position.set(-3.4, 0, -1.4);
  group.add(lamp);
  const lampIntensity = sub === 'nap' ? 30 : sub === 'film' ? 9 : sub === 'family' ? 26 : 14;
  const lampLight = new THREE.PointLight(lampColor, lampIntensity, 9, 2);
  lampLight.position.set(-3.4, 1.8, -1.4);
  group.add(lampLight);

  const viewTex = screenTexture(200, 140, 'sky');
  const viewMat = new THREE.MeshStandardMaterial({ color: 0x9ec9ff, roughness: 0.15, metalness: 0.2 });
  if (viewTex) {
    viewMat.map = viewTex;
    viewMat.emissiveMap = viewTex;
    viewMat.emissive = new THREE.Color(0xffffff);
    viewMat.emissiveIntensity = isRest ? 0.18 : 0.5;
  }
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), viewMat);
  windowMesh.position.set(3.3, 1.6, 0);
  windowMesh.rotation.y = -Math.PI / 2;
  group.add(windowMesh);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }));
  pot.position.set(3.5, 0.17, -1.6);
  const plantLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.95 }));
  plantLeaves.position.set(3.5, 0.65, -1.6);
  group.add(pot, plantLeaves);

  // aile sahnesinde ikinci küçük karakter (çocuk)
  if (sub === 'family') {
    const child = buildCharacter({ shirt: '#facc15', shorts: '#60a5fa', skin: '#f2d2b3', scale: 0.62 });
    child.root.position.set(0.55, 0.05, 1.25);
    child.root.rotation.y = Math.PI;
    poseStanding(child);
    child.leftArm.rotation.x = -0.5;
    child.rightArm.rotation.x = -0.5;
    group.add(child.root);
    // balonlar
    [0xff6b6b, 0x60a5fa, 0xfacc15].forEach((col, i) => {
      const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshStandardMaterial({ color: col }));
      balloon.position.set(2.6 + i * 0.28, 1.2 + i * 0.18, 1.0);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      string.position.set(2.6 + i * 0.28, 0.7, 1.0);
      group.add(balloon, string);
    });
  }

  indoorLighting(group, sub === 'nap' ? 0xffd9a0 : sub === 'film' ? 0x6366f1 : sub === 'family' ? 0xfff7ed : 0xfff4d6, timeIntensity(sub === 'nap' ? 0.55 : sub === 'film' ? 0.6 : 1.1, opts.timeOfDay), !!opts.lowPerf);

  const rig = buildCharacter({
    shirt: (opts.outfit === 'black' && !isGame ? '#111827' : (opts.clubColor ?? '#1d4ed8')),
    shorts: '#111827',
    shoes: '#e5e7eb',
    skin: opts.skin,
    hair: opts.hair,
  });
  // varyanta göre pozisyon: nap = uzanma, film = oturma ama arkaya yaslı, family = hafif yan, game = oturma öne eğik
  if (sub === 'nap') {
    rig.root.position.set(0, -0.02, 1.2);
    rig.root.rotation.y = Math.PI;
  } else if (sub === 'film') {
    rig.root.position.set(0.08, -0.02, 1.18);
    rig.root.rotation.y = Math.PI - 0.08;
  } else if (sub === 'family') {
    rig.root.position.set(-0.25, -0.02, 1.22);
    rig.root.rotation.y = Math.PI + 0.18;
  } else {
    rig.root.position.set(0, -0.02, 1.2);
    rig.root.rotation.y = Math.PI;
  }
  group.add(rig.root);

  let sleepSprite: THREE.Sprite | null = null;
  let familySprite: THREE.Sprite | null = null;
  if (sub === 'nap') {
    sleepSprite = makeSprite('💤');
    if (sleepSprite) {
      sleepSprite.position.set(0.5, 1.5, 1.2);
      group.add(sleepSprite);
    }
  } else if (sub === 'family') {
    familySprite = makeSprite('❤️');
    if (familySprite) {
      familySprite.position.set(0.7, 1.65, 1.2);
      familySprite.scale.set(0.45, 0.45, 0.45);
      group.add(familySprite);
    }
  } else if (sub === 'shooter') {
    const shooterSprite = makeSprite('🎯', 'rgba(255,80,80,0.95)');
    if (shooterSprite) {
      shooterSprite.position.set(0, 1.9, 0.9);
      shooterSprite.scale.set(0.35, 0.35, 0.35);
      group.add(shooterSprite);
    }
  }

  const cameraMap: Record<HomeVariant, LifeSceneBuild['camera']> = {
    'game-fifa': { radius: 4.6, phi: 1.16, theta: 0.4, targetY: 1.05, targetX: 0, targetZ: 0.8, fov: 48, maxPhi: 1.26 },
    'game-shooter': { radius: 4.2, phi: 1.22, theta: 0.55, targetY: 1.08, targetX: 0.15, targetZ: 0.75, fov: 50, maxPhi: 1.26 },
    'game-manager': { radius: 5.0, phi: 1.12, theta: 0.3, targetY: 1.02, targetX: -0.1, targetZ: 0.8, fov: 46, maxPhi: 1.28 },
    'rest-nap': { radius: 3.5, phi: 1.05, theta: -1.5, targetY: 0.78, targetX: 0, targetZ: 1.15, fov: 52, maxPhi: 1.3 },
    'rest-film': { radius: 4.0, phi: 1.14, theta: -1.25, targetY: 0.95, targetX: 0.12, targetZ: 0.55, fov: 50, maxPhi: 1.32 },
    'rest-family': { radius: 4.4, phi: 1.10, theta: -1.35, targetY: 1.02, targetX: 0.18, targetZ: 1.05, fov: 48, maxPhi: 1.3 },
  };
  const camera = cameraMap[variant] ?? cameraMap['rest-nap'];

  const update = (t: number, dt: number) => {
    if (isGame) {
      poseGaming(rig, t);
      // shooter biraz daha hızlı kafa hareketi
      if (sub === 'shooter') {
        rig.head.rotation.y = Math.sin(t * 4.2) * 0.12;
        rig.head.rotation.x = -0.12 + Math.sin(t * 5.5) * 0.06;
      } else if (sub === 'manager') {
        rig.head.rotation.x = -0.20 + Math.sin(t * 1.8) * 0.03;
        rig.torso.rotation.y = Math.sin(t * 0.9) * 0.06;
      }
      if (screenTex) screenTex.offset.x = (screenTex.offset.x + dt * 0.018) % 1;
      tvLight.intensity = tvLightIntensity + Math.sin(t * (sub === 'shooter' ? 14 : 9)) * (sub === 'shooter' ? 9 : 6);
    } else if (sub === 'nap') {
      poseResting(rig, t);
      if (sleepSprite) {
        sleepSprite.position.y = 1.45 + ((t * 0.5) % 1) * 0.5;
        const mat = sleepSprite.material as THREE.SpriteMaterial;
        mat.opacity = 1 - ((t * 0.5) % 1);
      }
      lampLight.intensity = 28 + Math.sin(t * 1.2) * 3;
    } else if (sub === 'film') {
      // film: oturarak izleme — gaming'e benzer ama daha gevşek
      rig.hips.position.y = 0.64;
      rig.hips.rotation.set(0, 0, 0);
      rig.torso.rotation.x = 0.08 + Math.sin(t * 0.7) * 0.02;
      rig.head.rotation.x = -0.18 + Math.sin(t * 1.1) * 0.03;
      rig.head.rotation.y = Math.sin(t * 0.55) * 0.08;
      rig.leftLeg.rotation.set(1.05, 0, 0.08);
      rig.rightLeg.rotation.set(1.05, 0, -0.08);
      rig.leftShin.rotation.set(-1.15, 0, 0);
      rig.rightShin.rotation.set(-1.15, 0, 0);
      rig.leftArm.rotation.set(-0.45, 0, 0.28);
      rig.rightArm.rotation.set(-0.45, 0, -0.28);
      rig.leftForearm.rotation.x = -0.95;
      rig.rightForearm.rotation.x = -0.95;
      // TV titremesi
      tvLight.intensity = 16 + Math.sin(t * 8) * 5;
      lampLight.intensity = 9 + Math.sin(t * 1.0) * 1.5;
      if (familySprite) {
        // yok
      }
    } else if (sub === 'family') {
      poseResting(rig, t);
      // ailede daha dik oturma, kollar açık jest
      rig.torso.rotation.x = -0.35;
      rig.leftArm.rotation.set(0.1, 0, 0.42);
      rig.rightArm.rotation.set(0.1, 0, -0.42);
      if (familySprite) {
        familySprite.position.y = 1.65 + Math.sin(t * 1.6) * 0.06;
      }
      lampLight.intensity = 24 + Math.sin(t * 1.1) * 2;
    }
  };

  const baseSky = sub === 'nap' ? '#151a24' : sub === 'film' ? '#0f0f2a' : sub === 'family' ? '#1b2130' : sub === 'shooter' ? '#1a0f1f' : sub === 'manager' ? '#14213d' : '#1b2130';
  const sky = applyTimeAndSeasonToSky(baseSky, opts);
  if (opts.lowPerf) {
    group.traverse(o => {
      const m = o as THREE.Mesh;
      if ((m as any).castShadow !== undefined) (m as any).castShadow = false;
      if ((m as any).receiveShadow !== undefined) (m as any).receiveShadow = false;
    });
  }
  return { group, update, camera, sky };
}

/* ══════════════ SAHNE 3: ŞEHİR / SAHİL / DAĞ ══════════════ */

type CityVariant = 'walk' | 'fans' | 'dinner' | 'beach' | 'mountain';

function buildCityScene(variant: CityVariant, opts: LifeSceneOptions): LifeSceneBuild {
  const group = new THREE.Group();
  const cars: { obj: THREE.Group; speed: number; offset: number }[] = [];
  const trees: THREE.Object3D[] = [];
  let sky = '#87b7e8';
  let fog: [string, number, number] | undefined;

  if (variant === 'beach') {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 60),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.25, metalness: 0.35 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.1, -26);
    group.add(sea);

    const sand = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshStandardMaterial({ color: 0xf1d7a8, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0, 6);
    group.add(sand);

    const foam = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(0, 0.02, 3);
    group.add(foam);

    [[-7, 4], [7.5, 2], [-3.5, 7.5]].forEach(([x, z], i) => {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 4, 8), new THREE.MeshStandardMaterial({ color: 0x7c5c3a, roughness: 0.9 }));
      trunk.position.y = 2;
      trunk.rotation.z = 0.08 * (i % 2 === 0 ? 1 : -1);
      palm.add(trunk);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9, side: THREE.DoubleSide });
      for (let k = 0; k < 6; k++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), leafMat);
        leaf.position.set(0, 4, 0);
        leaf.rotation.y = (k / 6) * Math.PI * 2;
        leaf.rotation.z = -0.35;
        leaf.position.x = Math.cos((k / 6) * Math.PI * 2) * 1.1;
        leaf.position.z = Math.sin((k / 6) * Math.PI * 2) * 1.1;
        palm.add(leaf);
        trees.push(leaf);
      }
      palm.position.set(x, 0, z);
      group.add(palm);
    });

    const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 }));
    lounger.position.set(-2.2, 0.35, 4.5);
    lounger.rotation.y = 0.2;
    group.add(lounger);
    const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0xd1d5db }));
    umbrellaPole.position.set(-4, 1.2, 4.2);
    group.add(umbrellaPole);
    const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 12), new THREE.MeshStandardMaterial({ color: opts.clubColor ?? 0xef4444, roughness: 0.75, side: THREE.DoubleSide }));
    umbrella.position.set(-4, 2.45, 4.2);
    group.add(umbrella);

    const sun = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: new THREE.Color(0xfbbf24), emissiveIntensity: 1.5 }));
    sun.position.set(16, 12, -30);
    group.add(sun);

    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0xf1d7a8, 0.95);
    group.add(hemi);
    const sunLight = new THREE.DirectionalLight(0xfff3c4, 1.5);
    sunLight.position.set(14, 12, -8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.normalBias = 0.5;
    group.add(sunLight);
    sky = '#7dd3fc';
    fog = ['#a5d8ff', 40, 120];
  } else if (variant === 'mountain') {
    // Dağ evi: yeşil vadi + orman + dağ silueti + kabin
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 90), new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 8);
    group.add(ground);
    const snowPatch = new THREE.Mesh(new THREE.PlaneGeometry(50, 40), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.9 }));
    snowPatch.rotation.x = -Math.PI / 2;
    snowPatch.position.set(0, 0.02, -18);
    group.add(snowPatch);
    // uzak dağ sırtları (üç beyaz-gri prizma)
    [-22, 0, 22].forEach((x, i) => {
      const h = i === 1 ? 18 : 14;
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(11, h, 5), new THREE.MeshStandardMaterial({ color: i === 1 ? 0xf8fafc : 0xcbd5e1, roughness: 0.9 }));
      mtn.position.set(x, h / 2 - 0.5, -38);
      group.add(mtn);
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.5, 5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
      snowCap.position.set(x, h - 1.2, -38);
      group.add(snowCap);
    });
    // kabin
    const cabin = new THREE.Group();
    const cabinW = 4.2, cabinD = 3.2, cabinH = 1.9;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinD), new THREE.MeshStandardMaterial({ color: 0x7c4a29, roughness: 0.85 }));
    walls.position.y = cabinH / 2;
    cabin.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.4, 4), new THREE.MeshStandardMaterial({ color: 0x5b2c14, roughness: 0.9 }));
    roof.position.y = cabinH + 0.45;
    roof.rotation.y = Math.PI / 4;
    cabin.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.05), new THREE.MeshStandardMaterial({ color: 0x2b1d0f }));
    door.position.set(0, 0.62, cabinD / 2 + 0.02);
    cabin.add(door);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 0.45), new THREE.MeshStandardMaterial({ color: 0x374151 }));
    chimney.position.set(1.2, 1.6, -0.7);
    cabin.add(chimney);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: new THREE.Color(0xf59e0b), emissiveIntensity: 1.2, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    glow.position.set(0, 0.62, cabinD / 2 + 0.04);
    cabin.add(glow);
    cabin.position.set(2.8, 0, 4.2);
    group.add(cabin);
    // göl
    const lake = new THREE.Mesh(new THREE.CircleGeometry(5, 22), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.25, metalness: 0.55 }));
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(-7.5, 0.02, 5);
    group.add(lake);
    // çam ormanı
    for (let i = 0; i < 14; i++) {
      const x = -14 + (i % 7) * 4.5 + (i % 2 ? 1.2 : 0);
      const z = 10 + Math.floor(i / 7) * 4.5 + (i % 3) * 0.6;
      const pine = makePine(x, z, 0.85 + (i % 3) * 0.16);
      group.add(pine);
      trees.push(pine);
    }
    // ateş çukuru dumanı (sprite)
    const smoke = makeSprite('💨', 'rgba(255,255,255,0.55)');
    if (smoke) {
      smoke.position.set(4.2, 2.1, 4.0);
      smoke.scale.set(0.55, 0.55, 0.55);
      group.add(smoke);
    }
    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x2f3a22, 0.9);
    group.add(hemi);
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
    sunLight.position.set(14, 18, -8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.normalBias = 0.6;
    group.add(sunLight);
    sky = '#a5c9ff';
    fog = ['#dbeafe', 34, 108];
  } else {
    // Şehir varyantları: walk / fans / dinner ortak altyapı, detaylar farklı
    const isDinner = variant === 'dinner';
    const isFans = variant === 'fans';

    // Asfalt + kaldırım
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.95 }));
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.receiveShadow = true;
    group.add(asphalt);

    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.95 });
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(90, 0.16, 6), sidewalkMat);
    sidewalk.position.set(0, 0.08, 9);
    group.add(sidewalk);

    for (let i = -22; i <= 22; i += 4) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.18), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      line.position.set(i, 0.02, 0);
      group.add(line);
    }

    const park = new THREE.Mesh(new THREE.PlaneGeometry(90, 20), new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 1 }));
    park.rotation.x = -Math.PI / 2;
    park.position.set(0, -0.01, 22);
    group.add(park);

    const buildingColors = [0x64748b, 0x7c8698, 0x556070, 0x8993a4, 0x5b6472];
    for (let i = 0; i < 12; i++) {
      const h = 12 + Math.random() * 26;
      const w = 6 + Math.random() * 5;
      const b = makeBuilding(w, h, 6, buildingColors[i % buildingColors.length]);
      b.position.set(-44 + i * 8, 0, -16 - Math.random() * 6);
      group.add(b);
    }

    for (let i = 0; i < 9; i++) {
      const tree = makeTree(-34 + i * 8.5, 17 + (i % 3) * 2.5, 0.9 + (i % 3) * 0.15);
      group.add(tree);
      trees.push(tree);
    }

    for (let i = -20; i <= 20; i += 10) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 8), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6 }));
      pole.position.y = 2.5;
      const col = isDinner ? 0xffe4b5 : 0xfff4c2;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.35), new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: isDinner ? 1.4 : 0.9 }));
      head.position.set(0, 5, 0);
      lamp.add(pole, head);
      lamp.position.set(i, 0, 6.4);
      group.add(lamp);
    }

    // Banklar
    [[-6, 14], [8, 15.5]].forEach(([x, z]) => {
      const bench = new THREE.Group();
      const seatB = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }));
      seatB.position.y = 0.5;
      const backB = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }));
      backB.position.set(0, 0.75, -0.24);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.5 });
      [-0.9, 0.9].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.5), legMat);
        leg.position.set(lx, 0.25, 0);
        bench.add(leg);
      });
      bench.add(seatB, backB);
      bench.position.set(x, 0, z);
      group.add(bench);
    });

    // Fans varyantı: taraftar NPC'leri + atkılar + konfeti
    if (isFans) {
      const fanConfigs: [number, number, string, string][] = [
        [-2.2, 10.4, '#ef4444', '#fde68a'],
        [2.4, 10.6, '#1d4ed8', '#ffffff'],
        [-0.2, 11.1, '#22c55e', '#facc15'],
      ];
      fanConfigs.forEach(([x, z, shirt, scarf], i) => {
        const fan = buildCharacter({ shirt, shorts: '#1f2937', skin: '#e8b48a' });
        fan.root.position.set(x, 0, z);
        fan.root.rotation.y = Math.PI;
        poseStanding(fan);
        // atkı
        const scarfMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: new THREE.Color(scarf) }));
        scarfMesh.position.set(0, 0.58, 0.08);
        fan.torso.add(scarfMesh);
        fan.rightArm.rotation.x = -0.5 - i * 0.25;
        fan.rightForearm.rotation.x = -0.9;
        group.add(fan.root);
      });
      // banner
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.65), new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.clubColor ?? '#1d4ed8'), side: THREE.DoubleSide }));
      banner.position.set(0, 1.9, 12.2);
      banner.rotation.y = Math.PI;
      group.add(banner);
      const bannerText = makeSprite('★ ' + (opts.clubLogo ?? 'FORZA') + ' ★', 'rgba(255,255,255,0.95)');
      if (bannerText) {
        bannerText.position.set(0, 1.95, 12.35);
        bannerText.scale.set(1.2, 0.45, 0.45);
        group.add(bannerText);
      }
    }

    // Dinner varyantı: restoran terası (masalar, sandalyeler, şemsiyeler)
    if (isDinner) {
      const terrace = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.95 }));
      terrace.rotation.x = -Math.PI / 2;
      terrace.position.set(0, 0.03, 11.8);
      group.add(terrace);
      [
        [-3.2, 11.2], [3.1, 11.5], [-3.0, 13.8], [3.3, 14.0],
      ].forEach(([x, z], i) => {
        const tbl = new THREE.Group();
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xfaf5ef }));
        top.position.y = 0.74;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.74, 8), new THREE.MeshStandardMaterial({ color: 0x4b5563 }));
        leg.position.y = 0.37;
        tbl.add(top, leg);
        // sandalyeler
        [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]].forEach(([dx, dz], idx) => {
          if (idx > 1 && i % 2 === 0) return;
          const chair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), new THREE.MeshStandardMaterial({ color: 0x374151 }));
          chair.position.set(dx, 0.46, dz);
          tbl.add(chair);
        });
        // tabak & kadeh
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        plate.position.set(0, 0.79, 0.08);
        tbl.add(plate);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.7 }));
        glass.position.set(0.22, 0.86, 0.08);
        tbl.add(glass);
        tbl.position.set(x, 0, z);
        group.add(tbl);
        // şemsiye
        if (i < 2) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0xd1d5db }));
          pole.position.set(x, 1.1, z);
          group.add(pole);
          const umb = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 12), new THREE.MeshStandardMaterial({ color: 0xfef3c7, side: THREE.DoubleSide, emissive: new THREE.Color(0xf59e0b), emissiveIntensity: 0.12 }));
          umb.position.set(x, 2.0, z);
          group.add(umb);
        }
      });
      // string lights
      for (let lx = -5; lx <= 5; lx += 2.5) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff7cc, emissive: new THREE.Color(0xfff0a0), emissiveIntensity: 1.6 }));
        bulb.position.set(lx, 2.6, 10.4);
        group.add(bulb);
        const bulbLight = new THREE.PointLight(0xfff0a0, 7, 5, 2);
        bulbLight.position.copy(bulb.position);
        group.add(bulbLight);
      }
    }

    // Arabalar — dinnerde daha seyrek, fans'ta korna efekti gibi
    const carCount = isDinner ? 2 : 4;
    const palette = isDinner ? [0x111827, 0x9ca3af, 0x374151, 0xffffff] : [0xef4444, 0xeab308, 0x3b82f6, 0xffffff];
    for (let i = 0; i < carCount; i++) {
      const car = makeCar(palette[i % palette.length]);
      car.position.set(-40 + i * 22, 0, i % 2 === 0 ? -5 : 4.5);
      car.rotation.y = i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(car);
      cars.push({ obj: car, speed: i % 2 === 0 ? (isFans ? 11 : 9) : (isFans ? -10 : -8), offset: -40 + i * 22 });
    }

    const hemi = new THREE.HemisphereLight(isDinner ? 0xffecd2 : 0xcfe8ff, isDinner ? 0x4a3722 : 0x3f4a33, isDinner ? 0.75 : 0.85);
    group.add(hemi);
    const sunLight = new THREE.DirectionalLight(isDinner ? 0xffd9a0 : 0xfff2cc, isDinner ? 0.9 : 1.25);
    if (isDinner) {
      // akşam güneşi alçak
      sunLight.position.set(-14, 10, 12);
      sky = '#2d1b3a';
      fog = ['#4a2f5a', 28, 92];
      // ay
      const moon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: new THREE.Color(0xfff7cc), emissiveIntensity: 0.9 }));
      moon.position.set(18, 16, -28);
      group.add(moon);
    } else if (isFans) {
      sunLight.position.set(20, 26, 12);
      sky = '#7ec8ff';
      fog = ['#7ec8ff', 70, 160];
    } else {
      sunLight.position.set(20, 26, 12);
      sky = '#87b7e8';
      fog = ['#87b7e8', 70, 160];
    }
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.normalBias = 0.6;
    group.add(sunLight);
  }

  const rig = buildCharacter({
    shirt: opts.outfit === 'black' ? '#111827' : (opts.clubColor ?? '#1d4ed8'),
    shorts: variant === 'beach' ? '#0ea5e9' : variant === 'mountain' ? '#14532d' : '#111827',
    shoes: '#f8fafc',
    skin: opts.skin,
    hair: opts.hair,
  });

  let rigPos = new THREE.Vector3(0, 0, 10.4);
  let rigRy = Math.PI / 2;
  let rigCam: LifeSceneBuild['camera'] = { radius: 7.5, phi: 1.14, theta: 0.75, targetY: 1.5, targetX: 0, targetZ: 10.2, fov: 50 };

  if (variant === 'beach') {
    rigPos = new THREE.Vector3(-2.4, 0, 4.2);
    rigRy = Math.PI * 0.6;
    rig.mats.shorts.color = new THREE.Color(0x0ea5e9);
    rigCam = { radius: 6.6, phi: 1.24, theta: 0.35, targetY: 1.3, targetX: -2.4, targetZ: 4.0, fov: 52 };
  } else if (variant === 'mountain') {
    rigPos = new THREE.Vector3(1.2, 0, 5.2);
    rigRy = Math.PI * 0.3;
    rig.mats.shorts.color = new THREE.Color(0x14532d);
    rigCam = { radius: 6.2, phi: 1.18, theta: 0.9, targetY: 1.4, targetX: 1.2, targetZ: 5.0, fov: 52 };
  } else if (variant === 'fans') {
    rigPos = new THREE.Vector3(0.2, 0, 11.0);
    rigRy = Math.PI;
    rigCam = { radius: 7.0, phi: 1.12, theta: 0.15, targetY: 1.5, targetX: 0, targetZ: 11.0, fov: 50 };
  } else if (variant === 'dinner') {
    rigPos = new THREE.Vector3(-0.4, 0, 11.8);
    rigRy = Math.PI * 0.22;
    rigCam = { radius: 5.2, phi: 1.18, theta: 0.7, targetY: 1.15, targetX: -0.35, targetZ: 11.8, fov: 48, maxPhi: 1.28 };
  } else {
    // walk
    rigPos = new THREE.Vector3(0, 0, 10.4);
    rigRy = Math.PI / 2;
  }
  rig.root.position.copy(rigPos);
  rig.root.rotation.y = rigRy;
  group.add(rig.root);

  // ek sprite'lar
  if (variant === 'fans') {
    const s = makeSprite('📣');
    if (s) { s.position.set(0.2, 2.15, 10.9); s.scale.set(0.55, 0.55, 0.55); group.add(s); }
  } else if (variant === 'dinner') {
    const s = makeSprite('🍽️');
    if (s) { s.position.set(0.3, 1.95, 11.7); s.scale.set(0.45, 0.45, 0.45); group.add(s); }
  } else if (variant === 'mountain') {
    const s = makeSprite('🏔️');
    if (s) { s.position.set(1.2, 2.25, 5.1); s.scale.set(0.5, 0.5, 0.5); group.add(s); }
  }

  const update = (t: number, dt: number) => {
    if (variant === 'beach') {
      poseWalking(rig, t * 0.6, 2.2);
      trees.forEach((leaf, i) => {
        (leaf as THREE.Object3D & { rotation: THREE.Euler }).rotation.z = -0.35 + Math.sin(t * 1.3 + i) * 0.08;
      });
      rig.root.position.z = 4.2 + Math.sin(t * 0.35) * 0.9;
      rig.root.rotation.y = Math.PI * 0.6 + Math.sin(t * 0.3) * 0.3;
    } else if (variant === 'mountain') {
      poseWalking(rig, t * 0.9, 1.9);
      rig.root.position.x = 1.2 + Math.sin(t * 0.38) * 1.1;
      rig.root.rotation.y = Math.cos(t * 0.38) > 0 ? Math.PI * 0.3 : -Math.PI * 0.7;
      trees.forEach((p, i) => {
        p.rotation.y = Math.sin(t * 0.6 + i) * 0.04;
      });
    } else if (variant === 'dinner') {
      // restoranda oturma — hafif jest
      poseResting(rig, t);
      // oturma pozu yerine hafif öne eğik konuşma
      rig.torso.rotation.x = -0.25;
      rig.leftArm.rotation.set(-0.55, 0, 0.34);
      rig.rightArm.rotation.set(-0.55, 0, -0.34);
      rig.leftForearm.rotation.x = -0.95 + Math.sin(t * 1.8) * 0.06;
      rig.rightForearm.rotation.x = -0.95 + Math.cos(t * 1.8) * 0.06;
      rig.hips.position.y = 0.62;
      rig.hips.rotation.set(0, 0.22, 0);
      trees.forEach((tree, i) => {
        if ((tree as THREE.Group).children?.length) (tree as THREE.Group).children[1] && (((tree as THREE.Group).children[1] as THREE.Object3D & { rotation: THREE.Euler }).rotation.y = Math.sin(t * 0.8 + i) * 0.05);
      });
    } else if (variant === 'fans') {
      poseStanding(rig);
      rig.torso.rotation.y = Math.sin(t * 1.0) * 0.14;
      rig.head.rotation.y = Math.sin(t * 1.3) * 0.16;
      rig.rightArm.rotation.x = -0.65 + Math.sin(t * 2.2) * 0.18;
      rig.rightForearm.rotation.x = -0.85 + Math.cos(t * 2.2) * 0.12;
      rig.leftArm.rotation.x = -0.4 + Math.cos(t * 2.0) * 0.15;
      cars.forEach(car => {
        car.obj.position.x += car.speed * dt;
        if (car.obj.position.x > 42) car.obj.position.x = -42;
        if (car.obj.position.x < -42) car.obj.position.x = 42;
      });
    } else {
      poseWalking(rig, t);
      rig.root.position.x = Math.sin(t * 0.5) * 2.4;
      rig.root.rotation.y = Math.cos(t * 0.5) > 0 ? Math.PI / 2 : -Math.PI / 2;
      cars.forEach(car => {
        car.obj.position.x += car.speed * dt;
        if (car.obj.position.x > 42) car.obj.position.x = -42;
        if (car.obj.position.x < -42) car.obj.position.x = 42;
      });
      trees.forEach((tree, i) => {
        if ((tree as THREE.Group).children?.length) (tree as THREE.Group).children[1] && (((tree as THREE.Group).children[1] as THREE.Object3D & { rotation: THREE.Euler }).rotation.y = Math.sin(t * 0.8 + i) * 0.05);
      });
    }
  };

  const camera = rigCam;
  const finalSky = applyTimeAndSeasonToSky(sky, opts);
  let finalFog = fog as [string, number, number] | undefined;
  if (finalFog && (opts.timeOfDay === 'evening' || opts.timeOfDay === 'night')) {
    // Gecede sisi koyulaştır
    const fogCol = new THREE.Color(finalFog[0]);
    if (opts.timeOfDay === 'night') fogCol.lerp(new THREE.Color('#1e293b'), 0.35);
    else fogCol.lerp(new THREE.Color('#2d1b4a'), 0.22);
    finalFog = ['#' + fogCol.getHexString(), finalFog[1], finalFog[2]];
  }
  if (opts.lowPerf) {
    group.traverse(obj => {
      const m = obj as THREE.Mesh;
      if ((m as any).castShadow !== undefined) (m as any).castShadow = false;
      if ((m as any).receiveShadow !== undefined) (m as any).receiveShadow = false;
    });
  }
  return { group, update, camera, sky: finalSky, fog: finalFog };
}

/* ══════════════ SAHNE 4: BASIN TOPLANTISI ══════════════ */

type PressVariant = 'humble' | 'confident' | 'joke';

function buildStudioScene(variant: PressVariant, opts: LifeSceneOptions): LifeSceneBuild {
  const group = new THREE.Group();
  const W = 10, D = 8, H = 3.9;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat(0x23272f));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // backdrop rengi varyanta göre
  const backdropColor = variant === 'confident'
    ? new THREE.Color(opts.clubColor ?? '#dc2626')
    : variant === 'joke'
      ? new THREE.Color(0x1e3a5f)
      : new THREE.Color(opts.clubColor ?? '#1d4ed8').multiplyScalar(0.7);
  const backdrop = new THREE.Mesh(
    new THREE.BoxGeometry(W, 2.6, 0.2),
    new THREE.MeshStandardMaterial({ color: backdropColor, roughness: 0.9 })
  );
  backdrop.position.set(0, 1.3, -D / 2 + 0.5);
  group.add(backdrop);

  // joke'de balonlar, confident'ta büyük logo, humble'da sade
  if (variant === 'joke') {
    ['🎈', '😄', '🎈'].forEach((_, i) => {
      const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: i === 1 ? 0xfacc15 : 0xf87171 }));
      balloon.position.set(-2 + i * 2, 2.4, -D / 2 + 0.22);
      group.add(balloon);
    });
  } else if (variant === 'confident') {
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.85, 22), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xfacc15), emissiveIntensity: 0.25 }));
    crest.position.set(0, 1.95, -D / 2 + 0.28);
    group.add(crest);
    crest.rotation.y = Math.PI;
  }

  const logoPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, emissive: new THREE.Color(0xffffff), emissiveIntensity: variant === 'confident' ? 0.22 : 0.12 })
  );
  logoPanel.position.set(0, 1.9, -D / 2 + 0.62);
  group.add(logoPanel);
  // logo yazısı
  const logoSprite = makeSprite(opts.clubLogo ?? '★', 'rgba(0,0,0,0.85)');
  if (logoSprite) {
    logoSprite.position.set(0, 1.9, -D / 2 + 0.70);
    logoSprite.scale.set(0.85, 0.45, 0.45);
    group.add(logoSprite);
  }

  const sideWalls = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.95 });
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, H, D), sideWalls);
  leftWall.position.set(-W / 2, H / 2, 0);
  group.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, H, D), sideWalls);
  rightWall.position.set(W / 2, H / 2, 0);
  group.add(rightWall);

  const podium = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 0.7), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.2 }));
  podium.position.set(0, 0.52, -0.6);
  group.add(podium);
  const podiumTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.85), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.35 }));
  podiumTop.position.set(0, 1.08, -0.6);
  group.add(podiumTop);

  [-0.45, 0.05, 0.5].forEach(x => {
    const mic = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6 }));
    stem.position.y = 0.25;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 }));
    head.position.y = 0.55;
    mic.add(stem, head);
    mic.position.set(x, 1.12, -0.52);
    mic.rotation.x = -0.25;
    group.add(mic);
  });

  const flashes: THREE.Mesh[] = [];
  const camCount = variant === 'confident' ? 4 : 3;
  const camPositions: [number, number, number][] = variant === 'confident'
    ? [[-3.2, 3.4, Math.PI * 0.15], [3.4, 3.2, -Math.PI * 0.18], [0, 4.2, 0], [-1.9, 3.9, 0.1]]
    : [[-3.2, 3.4, Math.PI * 0.15], [3.4, 3.2, -Math.PI * 0.18], [0, 4.2, 0]];
  camPositions.slice(0, camCount).forEach(([x, z, ry]) => {
    const camGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 }));
    body.position.y = 1.35;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5 }));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 1.35, 0.55);
    const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.4 }));
    tripod.position.y = 0.6;
    camGroup.add(body, lens, tripod);
    const flash = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0 })
    );
    flash.position.set(0, 1.62, 0.2);
    camGroup.add(flash);
    flashes.push(flash);
    camGroup.position.set(x, 0, z);
    camGroup.rotation.y = ry;
    group.add(camGroup);
  });

  const npcCount = variant === 'joke' ? 4 : 3;
  const npcCfgs = [
    [-2.4, 2.6, '#111827', '#e8b48a'],
    [2.6, 2.4, '#374151', '#c98b5e'],
    [-1.1, 3.4, '#7f1d1d', '#f2d2b3'],
    [1.2, 3.1, '#1e3a5f', '#eab49a'],
  ].slice(0, npcCount) as [number, number, string, string][];
  npcCfgs.forEach(([x, z, shirt, skin]) => {
    const npc = buildCharacter({ shirt, shorts: '#1f2937', skin });
    npc.root.position.set(x, 0, z);
    npc.root.rotation.y = Math.PI;
    poseStanding(npc);
    npc.rightArm.rotation.x = -0.9;
    npc.rightForearm.rotation.x = -1.2;
    if (variant === 'joke') {
      // gazeteciler gülüyor
      npc.head.rotation.x = -0.15;
    }
    group.add(npc.root);
  });

  const lightColor = variant === 'confident' ? 0xfff7cc : variant === 'joke' ? 0xffe4b5 : 0xfff1dd;
  const lightIntensity = variant === 'confident' ? 1.45 : variant === 'joke' ? 1.0 : 1.15;
  const mainLight = indoorLighting(group, lightColor, timeIntensity(lightIntensity, opts.timeOfDay), !!opts.lowPerf);
  const spotIntensity = variant === 'confident' ? 130 : variant === 'joke' ? 70 : 90;
  [[-3, 1.2], [3, 1.2]].forEach(([x, z]) => {
    const spot = new THREE.SpotLight(0xffffff, spotIntensity, 14, 0.7, 0.4, 1.6);
    spot.position.set(x, 3.2, z);
    spot.target.position.set(0, 0.8, -0.6);
    group.add(spot);
    group.add(spot.target);
  });

  const rig = buildCharacter({
    shirt: opts.outfit === 'black' ? '#111827' : (opts.clubColor ?? '#1d4ed8'),
    shorts: '#111827', shoes: '#f8fafc', skin: opts.skin, hair: opts.hair
  });
  rig.root.position.set(0, 0, -0.1);
  rig.root.rotation.y = Math.PI;
  group.add(rig.root);

  let camera: LifeSceneBuild['camera'];
  let baseSky: string;
  if (variant === 'confident') {
    camera = { radius: 3.7, phi: 1.12, theta: 0.25, targetY: 1.18, targetX: 0, targetZ: 0.15, fov: 46, maxPhi: 1.24 };
    baseSky = '#0d1328';
  } else if (variant === 'joke') {
    camera = { radius: 4.6, phi: 1.18, theta: 0.45, targetY: 1.05, targetX: 0.12, targetZ: 0.28, fov: 50, maxPhi: 1.28 };
    baseSky = '#1a2332';
  } else {
    camera = { radius: 4.2, phi: 1.14, theta: 0.3, targetY: 1.1, targetX: 0, targetZ: 0.2, fov: 48, maxPhi: 1.26 };
    baseSky = '#12161f';
  }

  // varyanta göre ek emoji sprite
  let extraSprite: THREE.Sprite | null = null;
  if (variant === 'humble') extraSprite = makeSprite('🙏', 'rgba(255,255,255,0.9)');
  else if (variant === 'confident') extraSprite = makeSprite('🔥', 'rgba(255,220,120,0.95)');
  else extraSprite = makeSprite('😄', 'rgba(255,255,255,0.9)');
  if (extraSprite) {
    extraSprite.position.set(variant === 'confident' ? 0.55 : 0.45, 1.95, -0.02);
    extraSprite.scale.set(0.45, 0.45, 0.45);
    group.add(extraSprite);
  }

  const update = (t: number, _dt: number) => {
    void _dt;
    poseSpeaking(rig, t);
    // varyanta göre jest yoğunluğu
    if (variant === 'confident') {
      rig.rightArm.rotation.x = -0.9 - Math.sin(t * 3.0) * 0.35;
      rig.leftArm.rotation.x = -0.65 - Math.cos(t * 2.6) * 0.22;
      rig.torso.rotation.y = Math.sin(t * 1.4) * 0.16;
      rig.head.rotation.y = Math.sin(t * 1.6) * 0.14;
    } else if (variant === 'joke') {
      rig.torso.rotation.y = Math.sin(t * 0.9) * 0.10;
      rig.head.rotation.x = -0.08 + Math.sin(t * 2.0) * 0.08;
      rig.rightArm.rotation.x = -0.55 - Math.sin(t * 1.8) * 0.12;
    } else {
      // humble daha sakin
      rig.torso.rotation.y = Math.sin(t * 0.6) * 0.07;
    }
    const flashSpeed = variant === 'confident' ? 5.2 : variant === 'joke' ? 2.2 : 3;
    const flashThreshold = variant === 'confident' ? 0.78 : 0.92;
    flashes.forEach((flash, i) => {
      const mat = flash.material as THREE.MeshStandardMaterial;
      const pulse = Math.max(0, Math.sin(t * flashSpeed + i * 2.1));
      mat.emissiveIntensity = pulse > flashThreshold ? (variant === 'confident' ? 4.5 : 3.5) : 0;
    });
    mainLight.key.intensity = lightIntensity + Math.sin(t * 2) * 0.05;
    if (extraSprite) {
      extraSprite.position.y = 1.95 + Math.sin(t * 1.5) * 0.07;
    }
  };

  const sky = applyTimeAndSeasonToSky(baseSky, opts);
  if (opts.lowPerf) {
    group.traverse(o => {
      const m = o as THREE.Mesh;
      if ((m as any).castShadow !== undefined) (m as any).castShadow = false;
      if ((m as any).receiveShadow !== undefined) (m as any).receiveShadow = false;
    });
  }
  return { group, update, camera, sky };
}

/* ══════════════ DIŞA AÇILAN FABRİKA ══════════════ */

export function buildLifeScene(
  activityId: LifeActivityId,
  variantId: string,
  opts: LifeSceneOptions = {}
): LifeSceneBuild {
  switch (activityId) {
    case 'gym': {
      const variant = (variantId === 'lift' || variantId === 'bike' ? variantId : 'run') as 'run' | 'lift' | 'bike';
      return buildGymScene(variant, opts);
    }
    case 'games': {
      const v = variantId === 'shooter' ? 'game-shooter' : variantId === 'managerGame' ? 'game-manager' : 'game-fifa';
      return buildHomeScene(v as HomeVariant, opts);
    }
    case 'rest': {
      const v = variantId === 'film' ? 'rest-film' : variantId === 'family' ? 'rest-family' : 'rest-nap';
      return buildHomeScene(v as HomeVariant, opts);
    }
    case 'goOut': {
      const v = variantId === 'fans' ? 'fans' : variantId === 'dinner' ? 'dinner' : 'walk';
      return buildCityScene(v as CityVariant, opts);
    }
    case 'vacation': {
      const v = variantId === 'mountain' ? 'mountain' : 'beach';
      return buildCityScene(v as CityVariant, opts);
    }
    case 'press': {
      const v = variantId === 'confident' ? 'confident' : variantId === 'joke' ? 'joke' : 'humble';
      return buildStudioScene(v as PressVariant, opts);
    }
    default:
      return buildHomeScene('rest-nap', opts);
  }
}
