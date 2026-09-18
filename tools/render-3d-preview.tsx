/**
 * 3D sahne önizleme aracı (Node.js — WebGL gerekmez).
 *
 * Tarayıcı olmadan sahneleri küçük bir yazılım rasterizer ile PNG'ye çizer.
 * Amaç: yeni 3D içeriği gözle denetlemek (geometri bozulması, eksik nesne, yanlış kamera).
 *
 * Kullanım:  npm run preview:3d
 * Çıktı:     docs/preview-*.png
 */
import * as THREE from 'three';
import zlib from 'node:zlib';
import fs from 'node:fs';
import { buildStadiumGroup } from '../src/components/stadium/scene';
import { buildLifeScene } from '../src/components/life/scenes';
import { buildTrainingComplex } from '../src/components/facility/scene';
import { defaultStadium } from '../src/data/stadium';
import { LifeActivityId, StadiumDesign, FacilityState } from '../src/types/game';

const W = 820;
const H = 500;
const OUT_DIR = 'docs';

/* ── PNG yazıcı ── */
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function pngChunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  let crc = 0xffffffff;
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  const c = Buffer.alloc(4);
  c.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([len, body, c]);
}
function writePNG(path: string, rgb: Uint8Array, w: number, h: number) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    rgba[j] = rgb[i * 3];
    rgba[j + 1] = rgb[i * 3 + 1];
    rgba[j + 2] = rgb[i * 3 + 2];
    rgba[j + 3] = 255;
  }
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]));
}

interface RenderOptions {
  sky: string;
  fog?: [string, number, number];
  night?: boolean;
  /** animasyon zamanı (saniye) — pozu yakalamak için */
  time?: number;
}

function renderToBuffer(
  group: THREE.Group,
  cameraSpec: { radius: number; phi: number; theta: number; targetY: number; targetX?: number; targetZ?: number; fov?: number },
  opts: RenderOptions
): Uint8Array {
  group.updateMatrixWorld(true);

  const sky = new THREE.Color(opts.sky);
  const camera = new THREE.PerspectiveCamera(cameraSpec.fov ?? 45, W / H, 0.2, cameraSpec.radius * 30);
  const target = new THREE.Vector3(cameraSpec.targetX ?? 0, cameraSpec.targetY, cameraSpec.targetZ ?? 0);
  camera.position.copy(new THREE.Vector3().setFromSpherical(new THREE.Spherical(cameraSpec.radius, cameraSpec.phi, cameraSpec.theta)).add(target));
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const buf = new Uint8Array(W * H * 3);
  const zbuf = new Float32Array(W * H).fill(Infinity);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      buf[i] = Math.round(sky.r * 255);
      buf[i + 1] = Math.round(sky.g * 255);
      buf[i + 2] = Math.round(sky.b * 255);
    }
  }

  const lightDir = new THREE.Vector3(0.45, 0.82, 0.35).normalize();
  const ambient = opts.night ? 0.4 : 0.55;
  const diffuse = opts.night ? 0.6 : 0.8;

  interface Tri { x: number[]; y: number[]; z: number[]; col: number[]; alpha: number }
  const tris: Tri[] = [];
  const near = camera.near + 0.01;
  const viewOf = (v: THREE.Vector3) => v.clone().applyMatrix4(camera.matrixWorldInverse);
  const projOf = (v: THREE.Vector3) => {
    const p = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(camera.projectionMatrix);
    if (p.w <= 0.001) return null;
    return { x: (p.x / p.w * 0.5 + 0.5) * W, y: (1 - (p.y / p.w * 0.5 + 0.5)) * H, z: p.z / p.w };
  };
  /**
   * Kamera yakın düzleminin arkasına taşan üçgenleri kırpar.
   * (Kırpma olmadan tek köşesi arkada kalan dev zemin düzlemleri tamamen kayboluyordu.)
   */
  const clipNear = (poly: THREE.Vector3[]): THREE.Vector3[] => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const da = -a.z - near;   // view uzayında ileri yön -z
      const db = -b.z - near;
      const aIn = da >= 0;
      const bIn = db >= 0;
      if (aIn) out.push(a);
      if (aIn !== bIn) {
        const t = da / (da - db);
        out.push(new THREE.Vector3().lerpVectors(a, b, t));
      }
    }
    return out;
  };

  group.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pa = geo.attributes.position as THREE.BufferAttribute;
    if (!pa) return;
    const idx = geo.index;
    const count = idx ? idx.count : pa.count;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const mat = mats[0] as THREE.MeshStandardMaterial;
    const baseCol = mesh.userData.previewColor !== undefined
      ? new THREE.Color(mesh.userData.previewColor as number)
      : (mat?.color ?? new THREE.Color(0x888888)).clone();
    const em = (mat as any)?.emissive
      ? (mat as any).emissive.clone().multiplyScalar(Math.min(1.2, ((mat as any).emissiveIntensity ?? 1) * 1.1))
      : new THREE.Color(0, 0, 0);
    const alpha = (mat as any)?.transparent ? ((mat as any).opacity ?? 1) : 1;

    for (let i = 0; i < count; i += 3) {
      const i0 = idx ? idx.getX(i) : i;
      const i1 = idx ? idx.getX(i + 1) : i + 1;
      const i2 = idx ? idx.getX(i + 2) : i + 2;
      const w0 = new THREE.Vector3().fromBufferAttribute(pa, i0).applyMatrix4(mesh.matrixWorld);
      const w1 = new THREE.Vector3().fromBufferAttribute(pa, i1).applyMatrix4(mesh.matrixWorld);
      const w2 = new THREE.Vector3().fromBufferAttribute(pa, i2).applyMatrix4(mesh.matrixWorld);
      const n = new THREE.Vector3().subVectors(w1, w0).cross(new THREE.Vector3().subVectors(w2, w0));
      if (n.lengthSq() < 1e-9) continue;
      n.normalize();
      const shade = ambient + diffuse * Math.abs(n.dot(lightDir));
      const col = baseCol.clone().multiplyScalar(shade).add(em);
      const shaded = [Math.min(255, col.r * 255), Math.min(255, col.g * 255), Math.min(255, col.b * 255)];
      // Kamera uzayında yakın düzleme göre kırp, sonra yelpaze ile üçgenle
      const clipped = clipNear([viewOf(w0), viewOf(w1), viewOf(w2)]);
      for (let k = 1; k + 1 < clipped.length; k++) {
        const q0 = projOf(clipped[0]);
        const q1 = projOf(clipped[k]);
        const q2 = projOf(clipped[k + 1]);
        if (!q0 || !q1 || !q2) continue;
        tris.push({
          x: [q0.x, q1.x, q2.x],
          y: [q0.y, q1.y, q2.y],
          z: [q0.z, q1.z, q2.z],
          col: shaded,
          alpha,
        });
      }
    }
  });

  for (const t of tris) {
    let [x0, y0, x1, y1, x2, y2] = [t.x[0], t.y[0], t.x[1], t.y[1], t.x[2], t.y[2]];
    let [z0, z1, z2] = [t.z[0], t.z[1], t.z[2]];
    let det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (Math.abs(det) < 1e-9) continue;
    if (det < 0) {
      [x1, x0] = [x0, x1]; [y1, y0] = [y0, y1]; [z1, z0] = [z0, z1];
      det = -det;
    }
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const l0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / det;
        const l1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / det;
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
        const z = l0 * z0 + l1 * z1 + l2 * z2;
        const pi = y * W + x;
        if (z >= zbuf[pi]) continue;
        zbuf[pi] = z;
        const i3 = pi * 3;
        if (t.alpha < 1) {
          for (let c = 0; c < 3; c++) buf[i3 + c] = Math.round(buf[i3 + c] * (1 - t.alpha) + t.col[c] * t.alpha);
        } else {
          buf[i3] = t.col[0];
          buf[i3 + 1] = t.col[1];
          buf[i3 + 2] = t.col[2];
        }
      }
    }
  }

  return buf;
}

/** Birden çok sahneyi tek görselde birleştirir (kontak sayfası) */
function composeSheet(tiles: { buf: Uint8Array; label: string }[], cols: number, outPath: string) {
  const tw = Math.floor(W / 2);
  const th = Math.floor(H / 2);
  const rows = Math.ceil(tiles.length / cols);
  const sw = tw * cols;
  const sh = th * rows;
  const sheet = new Uint8Array(sw * sh * 3);
  tiles.forEach((tile, index) => {
    const cx = index % cols;
    const cy = Math.floor(index / cols);
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const sx = Math.min(W - 1, x * 2);
        const sy = Math.min(H - 1, y * 2);
        const src = (sy * W + sx) * 3;
        const dst = ((cy * th + y) * sw + cx * tw + x) * 3;
        sheet[dst] = tile.buf[src];
        sheet[dst + 1] = tile.buf[src + 1];
        sheet[dst + 2] = tile.buf[src + 2];
      }
    }
  });
  writePNG(outPath, sheet, sw, sh);
  return `${outPath} → ${tiles.length} sahne (${cols}×${rows})`;
}

/* ── Önizlemeler ── */
fs.mkdirSync(OUT_DIR, { recursive: true });
const clubColor = '#1d4ed8';

const stadiumPreviews: { name: string; design: StadiumDesign; capacity: number; night: boolean; dPhi: number; dTheta: number; zoom: number }[] = [
  { name: 'preview-stadyum-gunduz.png', design: { ...defaultStadium().design, roof: 'canopy', flags: true }, capacity: 17000, night: false, dPhi: 0, dTheta: 0, zoom: 1 },
  { name: 'preview-stadyum-gece.png', design: { seatColor: '#dc2626', accentColor: '#facc15', roof: 'full', stands: 'double', pitchPattern: 'stripes', flags: true, logoOnPitch: false, floodlights: true }, capacity: 40000, night: true, dPhi: 0, dTheta: 0.25, zoom: 1.05 },
];

stadiumPreviews.forEach(p => {
  const bundle = buildStadiumGroup(p.design, { capacity: p.capacity, logo: '🦁', sponsorText: 'SPONSOR •', night: p.night });
  const rows = Math.max(4, Math.min(30, Math.round(p.capacity / 1600)));
  const baseRadius = Math.max(165, (105 + rows * 4.6) * 1.3);
  const buffer = renderToBuffer(bundle.group, {
    radius: baseRadius * p.zoom, phi: 0.98 + p.dPhi, theta: 0.85 + p.dTheta, targetY: Math.max(6, rows * 1.1), fov: 46,
  }, { sky: p.night ? '#0b1026' : '#7ab0e0', night: p.night });
  writePNG(`${OUT_DIR}/${p.name}`, buffer, W, H);
  console.log(`🏟️  ${p.name} üretildi`);
});

const lifeScenes: { activity: LifeActivityId; variant: string; time: number; name: string }[] = [
  { activity: 'gym', variant: 'run', time: 0.4, name: 'preview-hayat-spor-kosu.png' },
  { activity: 'gym', variant: 'lift', time: 0.8, name: 'preview-hayat-spor-agirlik.png' },
  { activity: 'gym', variant: 'bike', time: 1.2, name: 'preview-hayat-spor-bisiklet.png' },
  { activity: 'games', variant: 'fifa', time: 1.0, name: 'preview-hayat-ev-oyun.png' },
  { activity: 'rest', variant: 'nap', time: 2.0, name: 'preview-hayat-ev-dinlenme.png' },
  { activity: 'goOut', variant: 'walk', time: 0.5, name: 'preview-hayat-sehir-gezme.png' },
  { activity: 'vacation', variant: 'beach', time: 1.4, name: 'preview-hayat-tatil-sahil.png' },
  { activity: 'press', variant: 'humble', time: 0.9, name: 'preview-hayat-basin-toplantisi.png' },
];

/* ── 3D Antrenman Kompleksi önizlemeleri ── */
const dayBuffer: Uint8Array = new Uint8Array(W * H * 3);
const nightBuffer: Uint8Array = new Uint8Array(W * H * 3);
const complexScenes: { name: string; facility: FacilityState; night: boolean; dTheta: number; zoom: number; highlight?: any }[] = [
  {
    name: 'preview-antrenman-kompleksi-gunduz.png',
    facility: { pitch: 3, gym: 3, recovery: 3, tactics: 2, youth: 2 },
    night: false, dTheta: 0, zoom: 1,
  },
  {
    name: 'preview-antrenman-kompleksi-gece.png',
    facility: { pitch: 5, gym: 5, recovery: 5, tactics: 5, youth: 5 },
    night: true, dTheta: 0.35, zoom: 1.08, highlight: 'recovery' as any,
  },
];

const complexBuffers: Uint8Array[] = [];
complexScenes.forEach(scene => {
  const bundle = buildTrainingComplex({ facility: scene.facility, logo: '🦁', night: scene.night, clubColor: '#1d4ed8', accentColor: '#facc15', highlight: scene.highlight });
  bundle.update(1.4, 0.016);
  const buffer = renderToBuffer(bundle.group, {
    radius: bundle.camera.radius * scene.zoom,
    phi: bundle.camera.phi,
    theta: bundle.camera.theta + scene.dTheta,
    targetY: bundle.camera.targetY,
    fov: bundle.camera.fov,
  }, { sky: bundle.sky, fog: bundle.fog, night: scene.night });
  writePNG(`${OUT_DIR}/${scene.name}`, buffer, W, H);
  complexBuffers.push(buffer);
  console.log(`🏋️  ${scene.name} üretildi (${bundle.triCount()} üçgen)`);
});

// Seviye karşılaştırma sayfası: aynı açı, tesis seviyeleri 1 → 5
const levelTiles: { buf: Uint8Array; label: string }[] = [];
[1, 2, 3, 4, 5].forEach(lvl => {
  const bundle = buildTrainingComplex({
    facility: { pitch: lvl, gym: lvl, recovery: lvl, tactics: lvl, youth: lvl },
    logo: '🦁', night: false, clubColor: '#1d4ed8', accentColor: '#facc15',
  });
  bundle.update(1.4, 0.016);
  const buffer = renderToBuffer(bundle.group, {
    radius: bundle.camera.radius * 1.02,
    phi: bundle.camera.phi,
    theta: bundle.camera.theta,
    targetY: bundle.camera.targetY,
    fov: bundle.camera.fov,
  }, { sky: bundle.sky, fog: bundle.fog, night: false });
  writePNG(`${OUT_DIR}/preview-antrenman-seviye-${lvl}.png`, buffer, W, H);
  levelTiles.push({ buf: buffer, label: `seviye ${lvl}` });
});
if (levelTiles.length > 0) {
  console.log(`\n📄 ${composeSheet(levelTiles, 2, `${OUT_DIR}/preview-antrenman-seviyeler.png`)}`);
}

// Bölge yakın çekimleri: güney altyapı alanı + kuzey bina sırası (düzen kontrolü)
{
  const zoneCases: { name: string; facility: FacilityState; theta: number; zoom: number; target: { x: number; z: number }; dPhi?: number }[] = [
    { name: 'preview-antrenman-bolge-guney.png', facility: { pitch: 3, gym: 3, recovery: 3, tactics: 3, youth: 4 }, theta: 0.15, zoom: 0.62, target: { x: 0, z: 92 }, dPhi: -0.18 },
    { name: 'preview-antrenman-bolge-kuzey.png', facility: { pitch: 3, gym: 3, recovery: 3, tactics: 3, youth: 4 }, theta: 0.9, zoom: 0.68, target: { x: 0, z: -48 }, dPhi: -0.2 },
  ];
  const zoneTiles: { buf: Uint8Array; label: string }[] = [];
  zoneCases.forEach(z => {
    const bundle = buildTrainingComplex({ facility: z.facility, logo: '🦁', night: false, clubColor: '#1d4ed8', accentColor: '#f8fafc' });
    bundle.update(1.2, 0.016);
    const buffer = renderToBuffer(bundle.group, {
      radius: bundle.camera.radius * z.zoom,
      phi: bundle.camera.phi + (z.dPhi ?? 0),
      theta: z.theta,
      targetX: z.target.x,
      targetY: 3,
      targetZ: z.target.z,
      fov: 46,
    }, { sky: bundle.sky, fog: bundle.fog, night: false });
    writePNG(`${OUT_DIR}/${z.name}`, buffer, W, H);
    zoneTiles.push({ buf: buffer, label: z.name });
    console.log(`🔍 ${z.name} üretildi`);
  });
  console.log(`\n📄 ${composeSheet(zoneTiles, 2, `${OUT_DIR}/preview-antrenman-bolgeler.png`)}`);
}

// Özet montaj: gündüz (sv.3) • gece (sv.5) • sv.1 • sv.5 — tek görselde
{
  const montage: { buf: Uint8Array; label: string }[] = [
    { buf: complexBuffers[0] ?? dayBuffer, label: 'gündüz sv.3' },
    { buf: complexBuffers[1] ?? nightBuffer, label: 'gece sv.5' },
    levelTiles[0],
    levelTiles[levelTiles.length - 1],
  ];
  console.log(`📄 ${composeSheet(montage, 2, `${OUT_DIR}/preview-antrenman-tumu.png`)}`);
}

let failures = 0;
const tiles: { buf: Uint8Array; label: string }[] = [];
lifeScenes.forEach(scene => {
  try {
    const built = buildLifeScene(scene.activity, scene.variant, { clubColor, clubLogo: '🦁' });
    built.update(scene.time, 0.016);
    const buffer = renderToBuffer(built.group, built.camera, {
      sky: built.sky,
      fog: built.fog,
      night: scene.activity === 'vacation' ? false : ['games', 'press', 'rest'].includes(scene.activity),
    });
    writePNG(`${OUT_DIR}/${scene.name}`, buffer, W, H);
    tiles.push({ buf: buffer, label: scene.name });
    console.log(`🎬 ${scene.name} üretildi (${scene.activity}:${scene.variant})`);
  } catch (e) {
    failures++;
    console.error(`❌ ${scene.activity}:${scene.variant} → ${(e as Error).message}`);
  }
});

if (tiles.length > 0) {
  console.log(`\n📄 ${composeSheet(tiles, 2, `${OUT_DIR}/preview-hayat-tumu.png`)}`);
}

console.log(failures === 0 ? `\n✅ Tüm önizlemeler üretildi (${OUT_DIR}/)` : `\n❌ ${failures} sahne üretilemedi`);
process.exit(failures === 0 ? 0 : 1);
