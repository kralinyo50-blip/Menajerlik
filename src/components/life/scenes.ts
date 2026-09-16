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
  /** Işığın gökyüzü rengi */
  sky: string;
  fog?: [string, number, number];
}

export interface LifeSceneOptions {
  /** Kulüp rengi — kıyafet ve dekorasyon buna göre */
  clubColor?: string;
  clubLogo?: string;
  playerName?: string;
}

/* ══════════════ YARDIMCI PARÇALAR ══════════════ */

function floorMat(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
}

/** Ekran/televizyon dokusu — canlı renklerle yanıp söner */
function screenTexture(w = 256, h = 160, mode: 'game' | 'off' | 'sky' = 'game') {
  if (!hasDom) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (mode === 'game') {
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
  } else if (mode === 'off') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
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

function indoorLighting(scene: THREE.Group, color = 0xfff3d6, intensity = 0.9) {
  const ambient = new THREE.HemisphereLight(0xffffff, 0x5b6472, 1.05);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, intensity);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.normalBias = 0.4;
  scene.add(key);
  const warm = new THREE.PointLight(color, 60, 20, 2);
  warm.position.set(0, 3.2, 1.5);
  scene.add(warm);
  return { ambient, key };
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

  // Ayna duvar (solda) — parlak yüzey
  // Zemin şeritleri
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

  // Tavan aydınlatma panelleri
  [-3.5, 0, 3.5].forEach(x => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.1, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: new THREE.Color(0xfff2c4), emissiveIntensity: 1.25 })
    );
    panel.position.set(x, H - 0.12, 0);
    room.add(panel);
  });

  // Dış cephe penceresi (manzara dokusu)
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

  // Duvar televizyonu
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

  // Ağırlık rafı + dambıllar
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

  // Su sebili
  const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.4 }));
  cooler.position.set(-W / 2 + 1, 0.55, D / 2 - 1.2);
  room.add(cooler);

  // Koşu bandı
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
  // Yan korkuluklar
  [-0.62, 0.62].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.6), new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.55, roughness: 0.4 }));
    rail.position.set(x, 0.92, 0);
    treadmill.add(rail);
  });
  treadmill.add(belt, deck, console1, screen1, bar1);
  treadmill.position.set(-3.6, 0, 0.6);
  treadmill.rotation.y = Math.PI * 0.06;
  room.add(treadmill);

  // Bench press istasyonu
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

  // Barbell + ağırlık plakaları (bench üstünde, animasyonda hareket eder)
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

  // Kondisyon bisikleti (spin bike): yerel +z = sele tarafı
  const bike = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.4, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.35, roughness: 0.6 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.75, roughness: 0.3 });

  // Ayaklar (ön/arka) + orta kiriş
  const frontFoot = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.16), darkMat);
  frontFoot.position.set(0, 0.06, -0.6);
  const rearFoot = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.16), darkMat);
  rearFoot.position.set(0, 0.06, 0.52);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.2), frameMat);
  beam.position.set(0, 0.16, -0.04);

  // Ön direk + gidon
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

  // Sele direği + sele
  const seatPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.86, 0.12), frameMat);
  seatPost.position.set(0, 0.66, 0.42);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.52), darkMat);
  saddle.position.set(0, 1.06, 0.42);
  const saddleNose = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.22), darkMat);
  saddleNose.position.set(0, 1.05, 0.18);

  // Volan (döner)
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

  // Krank + pedallar
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

  // Diğer sporcular (NPC): dambıl çalışan ve esneme yapan
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
  const lights = indoorLighting(group, 0xfff0c9, 1.25);

  const rig = buildCharacter({
    shirt: opts.clubColor ?? '#1d4ed8',
    shorts: '#0f172a',
    shoes: '#f8fafc',
  });
  rig.root.castShadow = true;
  group.add(rig.root);

  let camera: LifeSceneBuild['camera'] = { radius: 5.2, phi: 1.12, theta: 0.7, targetY: 1.1, targetX: 0, targetZ: 0, fov: 45 };

  if (variant === 'run') {
    rig.root.position.set(-3.6, 0.32, 0.6);   // bant yüzeyi hizası
    rig.root.rotation.y = Math.PI * 0.06 + Math.PI;   // banda dönük (konsola bakar)
    // Kamera: karakterin ön-çaprazından — koşu pozu ve konsol birlikte görünür
    camera = { radius: 4.3, phi: 1.14, theta: 0.8, targetY: 1.05, targetX: -3.6, targetZ: 0.5, fov: 48, maxPhi: 1.26 };
  } else if (variant === 'lift') {
    rig.root.position.set(2.6, 0.42, 0.8);    // sırt mindere oturur (bant yüzeyi hizası)
    rig.root.rotation.y = -0.25;
    // Karakter bench üstünde sırt üstü; kamera yandan, bar ve göğüs kadrajda
    camera = { radius: 3.3, phi: 1.08, theta: -0.85, targetY: 1.0, targetX: 2.55, targetZ: 0.75, fov: 50, maxPhi: 1.2 };
  } else {
    // Sele dünya konumu: bisiklet grubu (yaw 0.5) içinde yerel (0, ·, 0.42)
    const bikeYaw = 0.5;
    const seatOffset = 0.42;
    const seatX = -4.4 + Math.sin(bikeYaw) * seatOffset;
    const seatZ = -1.6 + Math.cos(bikeYaw) * seatOffset;
    // Kalça yüksekliği (0.88) seleye oturacak şekilde kök yüksekliği
    rig.root.position.set(seatX, 1.06 - 0.88, seatZ);
    rig.root.rotation.y = bikeYaw + Math.PI;
    // Kamera: sürücünün baktığı yönden 3/4 ön görünüm
    camera = { radius: 3.6, phi: 1.22, theta: -2.9, targetY: 0.95, targetX: seatX, targetZ: seatZ, fov: 48, maxPhi: 1.3 };
  }

  const update = (t: number, dt: number) => {
    // NPC'ler canlı kalsın (dambıl curl + esneme)
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
      beltMat.map = beltMat.map ?? null;
      // Bandın kaymasını temsil eden hafif doku hareketi (doku yoksa renk titremesi)
      beltMat.color.offsetHSL(0, 0, 0.0004 * Math.sin(t * 12));
    } else if (variant === 'lift') {
      poseBenchPress(rig, t);
      // Bar, karakterin elleriyle birlikte yükselip iner
      const push = (Math.sin(t * 3) + 1) / 2;
      barbell.position.y = 1.02 + push * 0.62;
      barbell.position.z = 0.78 - push * 0.06;
    } else {
      poseBike(rig, t);
      bikeWheel.rotation.z -= dt * 6;
    }
    // Tavan ışıklarında hafif nefes
    lights.key.intensity = 1.0 + Math.sin(t * 1.4) * 0.05;
  };

  return { group, update, camera, sky: '#1b1f27' };
}

/* ══════════════ SAHNE 2: EV ══════════════ */

function buildHomeScene(variant: 'game' | 'rest', opts: LifeSceneOptions): LifeSceneBuild {
  const group = new THREE.Group();
  const W = 9, D = 7.5, H = 3.7;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat(0xb08a5e));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Halı (kulüp renginde)
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 3.2),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.clubColor ?? '#1d4ed8').multiplyScalar(0.75).getHex(), roughness: 0.98 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.012, 0.55);
  group.add(rug);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0e7d8, roughness: 0.95 });
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

  // Tavan lambası
  const ceilingLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: new THREE.Color(0xfff0c0), emissiveIntensity: 1.2 })
  );
  ceilingLamp.position.set(0, H - 0.2, 0.2);
  group.add(ceilingLamp);
  const ceilingLight = new THREE.PointLight(0xffeec4, 30, 12, 2);
  ceilingLight.position.set(0, H - 0.4, 0.2);
  group.add(ceilingLight);

  // Duvar posterleri (kulüp renkleri)
  for (let i = 0; i < 3; i++) {
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.8),
      new THREE.MeshStandardMaterial({ color: i === 1 ? (opts.clubColor ?? '#1d4ed8') : 0x334155, roughness: 0.9 })
    );
    poster.position.set(-2.6 + i * 1.6, 1.9, -D / 2 + 0.14);
    group.add(poster);
  }

  // Kanepe
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3f4a5a, roughness: 0.95 });
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

  // Sehpa + kumanda + bardak
  const table = new THREE.Group();
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.8), new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.8 }));
  tableTop.position.y = 0.42;
  const tableLeg = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 0.6), new THREE.MeshStandardMaterial({ color: 0x4b3524, roughness: 0.85 }));
  tableLeg.position.y = 0.2;
  table.add(tableTop, tableLeg);
  table.position.set(0, 0, -0.3);
  group.add(table);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
  mug.position.set(0.45, 0.54, -0.3);
  group.add(mug);

  // Televizyon (oyun modunda ekran yanar)
  const screenTex = screenTexture(240, 150, variant === 'game' ? 'game' : 'off');
  const tvMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissiveIntensity: variant === 'game' ? 1.15 : 0.12 });
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
  const tvLight = new THREE.PointLight(0x9ad7ff, variant === 'game' ? 22 : 0, 8, 2);
  tvLight.position.set(0, 1.6, -D / 2 + 1.2);
  group.add(tvLight);

  // Konsol
  if (variant === 'game') {
    const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.45), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 }));
    consoleBox.position.set(-1.2, 0.46, -D / 2 + 0.5);
    group.add(consoleBox);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: new THREE.Color(0x22d3ee), emissiveIntensity: 1.4 })
    );
    led.position.set(-1.2, 0.53, -D / 2 + 0.5);
    group.add(led);
  }

  // Lambader
  const lamp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.5 }));
  pole.position.y = 0.85;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.45, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0xfde68a, side: THREE.DoubleSide, emissive: new THREE.Color(0xfbbf24), emissiveIntensity: variant === 'rest' ? 1.1 : 0.5 }));
  shade.position.y = 1.75;
  lamp.add(pole, shade);
  lamp.position.set(-3.4, 0, -1.4);
  group.add(lamp);
  const lampLight = new THREE.PointLight(0xffd98a, variant === 'rest' ? 26 : 14, 9, 2);
  lampLight.position.set(-3.4, 1.8, -1.4);
  group.add(lampLight);

  // Pencere (şehir manzarası)
  const viewTex = screenTexture(200, 140, 'sky');
  const viewMat = new THREE.MeshStandardMaterial({ color: 0x9ec9ff, roughness: 0.15, metalness: 0.2 });
  if (viewTex) {
    viewMat.map = viewTex;
    viewMat.emissiveMap = viewTex;
    viewMat.emissive = new THREE.Color(0xffffff);
    viewMat.emissiveIntensity = variant === 'rest' ? 0.35 : 0.5;
  }
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), viewMat);
  windowMesh.position.set(3.3, 1.6, 0);
  windowMesh.rotation.y = -Math.PI / 2;
  group.add(windowMesh);

  // Bitki
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }));
  pot.position.set(3.5, 0.17, -1.6);
  const plantLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.95 }));
  plantLeaves.position.set(3.5, 0.65, -1.6);
  group.add(pot, plantLeaves);

  indoorLighting(group, variant === 'rest' ? 0xffd9a0 : 0xfff4d6, variant === 'rest' ? 0.7 : 1.1);

  // Karakter: oyun oynarken oturur, dinlenirken uzanır
  const rig = buildCharacter({
    shirt: opts.clubColor ?? '#1d4ed8',
    shorts: '#111827',
    shoes: '#e5e7eb',
  });
  rig.root.position.set(0, -0.02, 1.2);
  rig.root.rotation.y = Math.PI;
  group.add(rig.root);

  let sleepSprite: THREE.Sprite | null = null;
  if (variant === 'rest') {
    sleepSprite = makeSprite('💤');
    if (sleepSprite) {
      sleepSprite.position.set(0.5, 1.5, 1.2);
      group.add(sleepSprite);
    }
  }

  // Oyun: kanepe arkası omuz üstü — ekran parıltısı ve karakter birlikte görünür
  // Dinlenme: kanepenin yanından, uzanma pozu tamamen kadrajda
  const camera = variant === 'game'
    ? { radius: 4.6, phi: 1.16, theta: 0.4, targetY: 1.05, targetX: 0, targetZ: 0.8, fov: 48, maxPhi: 1.26 }
    : { radius: 3.5, phi: 1.05, theta: -1.5, targetY: 0.78, targetX: 0, targetZ: 1.15, fov: 52, maxPhi: 1.3 };

  const update = (t: number, dt: number) => {
    if (variant === 'game') {
      poseGaming(rig, t);
      if (screenTex) screenTex.offset.x = (screenTex.offset.x + dt * 0.02) % 1;
      tvLight.intensity = 20 + Math.sin(t * 9) * 6;
    } else {
      poseResting(rig, t);
      if (sleepSprite) {
        sleepSprite.position.y = 1.45 + ((t * 0.5) % 1) * 0.5;
        const mat = sleepSprite.material as THREE.SpriteMaterial;
        mat.opacity = 1 - ((t * 0.5) % 1);
      }
      lampLight.intensity = 24 + Math.sin(t * 1.2) * 3;
    }
  };

  return { group, update, camera, sky: variant === 'rest' ? '#151a24' : '#1b2130' };
}

/* ══════════════ SAHNE 3: ŞEHİR / SAHİL ══════════════ */

function buildCityScene(variant: 'walk' | 'beach', opts: LifeSceneOptions): LifeSceneBuild {
  const group = new THREE.Group();
  const isBeach = variant === 'beach';
  const cars: { obj: THREE.Group; speed: number; offset: number }[] = [];
  const trees: THREE.Object3D[] = [];

  if (isBeach) {
    // Deniz
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

    // Dalga köpüğü
    const foam = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(0, 0.02, 3);
    group.add(foam);

    // Palmiyeler
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

    // Şezlong + şemsiye
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

    // Güneş
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
  } else {
    // Şehir: asfalt + kaldırım
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.95 }));
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.receiveShadow = true;
    group.add(asphalt);

    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.95 });
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(90, 0.16, 6), sidewalkMat);
    sidewalk.position.set(0, 0.08, 9);
    group.add(sidewalk);

    // Yol çizgileri
    for (let i = -22; i <= 22; i += 4) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 0.18), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      line.position.set(i, 0.02, 0);
      group.add(line);
    }

    // Yürüyüş yolu (park)
    const park = new THREE.Mesh(new THREE.PlaneGeometry(90, 20), new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 1 }));
    park.rotation.x = -Math.PI / 2;
    park.position.set(0, -0.01, 22);
    group.add(park);

    // Binalar (arka plan)
    const buildingColors = [0x64748b, 0x7c8698, 0x556070, 0x8993a4, 0x5b6472];
    for (let i = 0; i < 12; i++) {
      const h = 12 + Math.random() * 26;
      const w = 6 + Math.random() * 5;
      const b = makeBuilding(w, h, 6, buildingColors[i % buildingColors.length]);
      b.position.set(-44 + i * 8, 0, -16 - Math.random() * 6);
      group.add(b);
    }

    // Ağaçlar (park tarafı)
    for (let i = 0; i < 9; i++) {
      const tree = makeTree(-34 + i * 8.5, 17 + (i % 3) * 2.5, 0.9 + (i % 3) * 0.15);
      group.add(tree);
      trees.push(tree);
    }

    // Sokak lambaları
    for (let i = -20; i <= 20; i += 10) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 8), new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6 }));
      pole.position.y = 2.5;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.35), new THREE.MeshStandardMaterial({ color: 0xfff4c2, emissive: new THREE.Color(0xffe9a8), emissiveIntensity: 0.9 }));
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

    // Arabalar
    [0xef4444, 0xeab308, 0x3b82f6, 0xffffff].forEach((color, i) => {
      const car = makeCar(color);
      car.position.set(-40 + i * 22, 0, i % 2 === 0 ? -5 : 4.5);
      car.rotation.y = i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(car);
      cars.push({ obj: car, speed: i % 2 === 0 ? 9 : -8, offset: -40 + i * 22 });
    });

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3f4a33, 0.85);
    group.add(hemi);
    const sunLight = new THREE.DirectionalLight(0xfff2cc, 1.25);
    sunLight.position.set(20, 26, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.normalBias = 0.6;
    group.add(sunLight);
  }

  // Karakter
  const rig = buildCharacter({
    shirt: opts.clubColor ?? '#1d4ed8',
    shorts: isBeach ? '#0ea5e9' : '#111827',
    shoes: '#f8fafc',
  });
  if (isBeach) {
    rig.root.position.set(-2.4, 0, 4.2);
    rig.root.rotation.y = Math.PI * 0.6;
    // Şort + tişört yazlık
    rig.mats.shorts.color = new THREE.Color(0x0ea5e9);
  } else {
    rig.root.position.set(0, 0, 10.4);
    rig.root.rotation.y = Math.PI / 2;
  }
  group.add(rig.root);

  const camera = isBeach
    ? { radius: 6.6, phi: 1.24, theta: 0.35, targetY: 1.3, targetX: -2.4, targetZ: 4.0, fov: 52 }
    : { radius: 7.5, phi: 1.14, theta: 0.75, targetY: 1.5, targetX: 0, targetZ: 10.2, fov: 50 };

  const update = (t: number, dt: number) => {
    if (isBeach) {
      poseWalking(rig, t * 0.6, 2.2);
      // Dalgalar
      trees.forEach((leaf, i) => {
        leaf.rotation.z = -0.35 + Math.sin(t * 1.3 + i) * 0.08;
      });
      rig.root.position.z = 4.2 + Math.sin(t * 0.35) * 0.9;
      rig.root.rotation.y = Math.PI * 0.6 + Math.sin(t * 0.3) * 0.3;
    } else {
      poseWalking(rig, t);
      // Karakter kaldırımda ileri geri yürür (kamera hedefi sabit kaldığı için mesafe dar tutuldu)
      rig.root.position.x = Math.sin(t * 0.5) * 2.4;
      rig.root.rotation.y = Math.cos(t * 0.5) > 0 ? Math.PI / 2 : -Math.PI / 2;
      cars.forEach(car => {
        car.obj.position.x += car.speed * dt;
        if (car.obj.position.x > 42) car.obj.position.x = -42;
        if (car.obj.position.x < -42) car.obj.position.x = 42;
      });
      trees.forEach((tree, i) => {
        if (tree.children?.length) tree.children[1] && (tree.children[1].rotation.y = Math.sin(t * 0.8 + i) * 0.05);
      });
    }
  };

  return { group, update, camera, sky: isBeach ? '#7dd3fc' : '#87b7e8', fog: isBeach ? ['#a5d8ff', 40, 120] : ['#87b7e8', 70, 160] };
}

/* ══════════════ SAHNE 4: BASIN TOPLANTISI ══════════════ */

function buildStudioScene(opts: LifeSceneOptions): LifeSceneBuild {
  const group = new THREE.Group();
  const W = 10, D = 8, H = 3.9;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat(0x23272f));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const backdrop = new THREE.Mesh(
    new THREE.BoxGeometry(W, 2.6, 0.2),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.clubColor ?? '#1d4ed8').multiplyScalar(0.7), roughness: 0.9 })
  );
  backdrop.position.set(0, 1.3, -D / 2 + 0.5);
  group.add(backdrop);

  // Kulüp logosu
  const logoPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.12 })
  );
  logoPanel.position.set(0, 1.9, -D / 2 + 0.62);
  group.add(logoPanel);

  const sideWalls = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.95 });
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, H, D), sideWalls);
  leftWall.position.set(-W / 2, H / 2, 0);
  group.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, H, D), sideWalls);
  rightWall.position.set(W / 2, H / 2, 0);
  group.add(rightWall);

  // Kürsü
  const podium = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 0.7), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.2 }));
  podium.position.set(0, 0.52, -0.6);
  group.add(podium);
  const podiumTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.85), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.35 }));
  podiumTop.position.set(0, 1.08, -0.6);
  group.add(podiumTop);

  // Mikrofonlar
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

  // Kameralar ve flaşlar
  const flashes: THREE.Mesh[] = [];
  [[-3.2, 3.4, Math.PI * 0.15], [3.4, 3.2, -Math.PI * 0.18], [0, 4.2, 0]].forEach(([x, z, ry]) => {
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

  // Gazeteci NPC'leri
  [[-2.4, 2.6], [2.6, 2.4], [-1.1, 3.4]].forEach(([x, z], i) => {
    const npc = buildCharacter({ shirt: ['#111827', '#374151', '#7f1d1d'][i], shorts: '#1f2937', skin: ['#e8b48a', '#c98b5e', '#f2d2b3'][i] });
    npc.root.position.set(x, 0, z);
    npc.root.rotation.y = Math.PI;
    poseStanding(npc);
    npc.rightArm.rotation.x = -0.9;
    npc.rightForearm.rotation.x = -1.2;
    group.add(npc.root);
  });

  const mainLight = indoorLighting(group, 0xfff1dd, 1.15);
  // Sahne ışıkları (spotlar)
  [[-3, 1.2], [3, 1.2]].forEach(([x, z]) => {
    const spot = new THREE.SpotLight(0xffffff, 90, 14, 0.7, 0.4, 1.6);
    spot.position.set(x, 3.2, z);
    spot.target.position.set(0, 0.8, -0.6);
    group.add(spot);
    group.add(spot.target);
  });

  const rig = buildCharacter({ shirt: opts.clubColor ?? '#1d4ed8', shorts: '#111827', shoes: '#f8fafc' });
  rig.root.position.set(0, 0, -0.1);
  rig.root.rotation.y = Math.PI;
  group.add(rig.root);

  const camera = { radius: 4.2, phi: 1.14, theta: 0.3, targetY: 1.1, targetX: 0, targetZ: 0.2, fov: 48, maxPhi: 1.26 };

  const update = (t: number, _dt: number) => {
    void _dt;
    poseSpeaking(rig, t);
    flashes.forEach((flash, i) => {
      const mat = flash.material as THREE.MeshStandardMaterial;
      const pulse = Math.max(0, Math.sin(t * 3 + i * 2.1));
      mat.emissiveIntensity = pulse > 0.92 ? 3.5 : 0;
    });
    mainLight.key.intensity = 1.15 + Math.sin(t * 2) * 0.05;
  };

  return { group, update, camera, sky: '#12161f' };
}

/* ══════════════ DIŞA AÇILAN FABRİKA ══════════════ */

/**
 * Aktivite + varyanta karşılık gelen 3D sahneyi kurar.
 * Her sahne kendi kamera önerisini ve animasyon fonksiyonunu döndürür.
 */
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
    case 'games':
    case 'rest':
      return buildHomeScene(activityId === 'games' ? 'game' : 'rest', opts);
    case 'goOut':
    case 'vacation':
      return buildCityScene(activityId === 'vacation' ? 'beach' : 'walk', opts);
    case 'press':
      return buildStudioScene(opts);
    default:
      return buildHomeScene('rest', opts);
  }
}
