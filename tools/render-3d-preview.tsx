/**
 * 3D sahne önizleme aracı (Node.js — WebGL gerekmez).
 *
 * Tarayıcı olmadan sahneleri küçük bir yazılım rasterizer ile PNG'ye çizer.
 * Amaç: yeni 3D içeriği gözle denetlemek (geometri bozulması, eksik nesne, yanlış kamera).
 *
 * Kullanım:  npm run preview:3d
 * Çıktı:     docs/preview-*.png
 */
import './canvas-polyfill'; // sahne modüllerinden önce: canvas dokuları için
import * as THREE from 'three';
import zlib from 'node:zlib';
import fs from 'node:fs';
import { buildStadiumGroup } from '../src/components/stadium/scene';
import { buildMatchScene, Match3DInput, ShapeSlot } from '../src/components/match3d/scene';
import { awayVenue, homeVenue, opponentKit, Kit, Venue } from '../src/components/match3d/venue';
import { FORMATIONS } from '../src/data/constants';
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
  /** Sahnede gerçekten bulunan nokta ışıkları (gece projektörleri) */
  pointLights?: { x: number; y: number; z: number; intensity: number; distance: number; color: number }[];
}

/* ── Doku örnekleyici: canvas → piksel verisi (önbellekli) ── */
const texCache = new Map<unknown, { data: Uint8ClampedArray; w: number; h: number } | null>();
function texturePixels(tex: THREE.Texture | null | undefined) {
  if (!tex) return null;
  const img = tex.image as { width?: number; height?: number; getContext?: (t: string) => unknown } | undefined;
  if (!img || typeof img.getContext !== 'function') return null;
  if (texCache.has(img)) return texCache.get(img) ?? null;
  let entry: { data: Uint8ClampedArray; w: number; h: number } | null = null;
  try {
    const ctx = img.getContext('2d') as { getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray } } | null;
    if (ctx && img.width && img.height) {
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      entry = { data, w: img.width, h: img.height };
    }
  } catch {
    entry = null;
  }
  texCache.set(img, entry);
  return entry;
}

/** UV → doku rengi (repeat + offset destekli, THREE flipY davranışıyla) */
function sampleTexture(tex: THREE.Texture, entry: { data: Uint8ClampedArray; w: number; h: number }, u: number, v: number) {
  const repX = tex.repeat?.x ?? 1;
  const repY = tex.repeat?.y ?? 1;
  const offX = tex.offset?.x ?? 0;
  const offY = tex.offset?.y ?? 0;
  let uu = (u * repX + offX) % 1; if (uu < 0) uu += 1;
  let vv = (v * repY + offY) % 1; if (vv < 0) vv += 1;
  const px = Math.min(entry.w - 1, Math.max(0, Math.floor(uu * entry.w)));
  const py = Math.min(entry.h - 1, Math.max(0, Math.floor((1 - vv) * entry.h)));
  const i = (py * entry.w + px) * 4;
  return [entry.data[i], entry.data[i + 1], entry.data[i + 2]];
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

  // Gerçek sahnedeki gökyüzü gradyanını taklit et (düz renk yerine ufuk→zenit geçişi)
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
  const skyStops: number[][] = opts.night
    ? [[5, 7, 15], [13, 23, 48], [36, 53, 83]]
    : [[47, 111, 181], [132, 182, 230], [216, 233, 246]];
  const rowColor = (y: number) => {
    const t = y / (H - 1);
    if (t < 0.55) return mix(skyStops[0], skyStops[1], t / 0.55);
    return mix(skyStops[1], skyStops[2], (t - 0.55) / 0.45);
  };
  const starry = opts.night;
  for (let y = 0; y < H; y++) {
    const [r0, g0, b0] = rowColor(y);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const star = starry && y < H * 0.45 && ((x * 7919 + y * 104729) % 997) < 3;
      buf[i] = Math.min(255, Math.round(r0 + (star ? 120 : 0)));
      buf[i + 1] = Math.min(255, Math.round(g0 + (star ? 120 : 0)));
      buf[i + 2] = Math.min(255, Math.round(b0 + (star ? 130 : 0)));
    }
  }
  void sky;

  const lightDir = new THREE.Vector3(0.45, 0.82, 0.35).normalize();
  const ambient = opts.night ? 0.46 : 0.55;
  const diffuse = opts.night ? 0.6 : 0.8;
  // Sahnede tanımlı nokta ışıkları (projektörler) — fiziksel yaklaşım
  const pointLights = (opts.pointLights ?? []).map(l => ({
    pos: new THREE.Vector3(l.x, l.y, l.z),
    color: new THREE.Color(l.color),
    gain: l.intensity / (4 * Math.PI),
    distance: l.distance,
  }));
  const _tmpVec = new THREE.Vector3();
  const pointLightAt = (p: THREE.Vector3) => {
    const acc = new THREE.Color(0, 0, 0);
    for (const l of pointLights) {
      const d = l.pos.distanceTo(p);
      if (d >= l.distance) continue;
      const t = 1 - d / l.distance;
      const falloff = t * t;
      const irradiance = (l.gain / Math.max(d * d, 4)) * falloff;
      acc.r += l.color.r * irradiance;
      acc.g += l.color.g * irradiance;
      acc.b += l.color.b * irradiance;
    }
    return acc;
  };

  interface Tri {
    x: number[]; y: number[]; z: number[];
    col: number[]; alpha: number;
    uv?: number[] | null;
    map?: THREE.Texture | null;
    emap?: THREE.Texture | null;
    em: number[];
    /** Piksel başına ışık için: albedo, gölgesiz gölge çarpanı ve dünya konumları */
    albedo: number[];
    shade: number;
    wp: THREE.Vector3[];
  }
  const tris: Tri[] = [];
  const near = camera.near + 0.01;
  const viewOf = (v: THREE.Vector3) => v.clone().applyMatrix4(camera.matrixWorldInverse);
  const projOf = (v: THREE.Vector3) => {
    const p = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(camera.projectionMatrix);
    if (p.w <= 0.001) return null;
    return { x: (p.x / p.w * 0.5 + 0.5) * W, y: (1 - (p.y / p.w * 0.5 + 0.5)) * H, z: p.z / p.w };
  };
  const clipNear = (poly: THREE.Vector3[]): THREE.Vector3[] => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const da = -a.z - near;
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
    const mesh = obj as THREE.Mesh & { isInstancedMesh?: boolean; instanceColor?: THREE.InstancedBufferAttribute | null; count?: number };
    if (!mesh.isMesh || !mesh.geometry) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pa = geo.attributes.position as THREE.BufferAttribute;
    if (!pa) return;
    const ua = geo.attributes.uv as THREE.BufferAttribute | undefined;
    const idx = geo.index;
    const count = idx ? idx.count : pa.count;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // Ön yüz malzemesi + varsa yan yüz (ExtrudeGeometry) malzemesi
    const mat = mats[0] as THREE.MeshStandardMaterial;

    // InstancedMesh → her örnek için ayrı dünya matrisi
    const matrices: THREE.Matrix4[] = [];
    const instColors: (THREE.Color | null)[] = [];
    if (mesh.isInstancedMesh) {
      const im = mesh as unknown as THREE.InstancedMesh;
      const m = new THREE.Matrix4();
      const c = new THREE.Color();
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        matrices.push(new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, m));
        if (im.instanceColor) {
          c.fromBufferAttribute(im.instanceColor as THREE.BufferAttribute, i);
          instColors.push(c.clone());
        } else {
          instColors.push(null);
        }
      }
    } else {
      matrices.push(mesh.matrixWorld);
      instColors.push(null);
    }

    const baseColPlain = mesh.userData.previewColor !== undefined
      ? new THREE.Color(mesh.userData.previewColor as number)
      : (mat?.color ?? new THREE.Color(0x888888)).clone();
    const em = (mat as any)?.emissive
      ? (mat as any).emissive.clone().multiplyScalar(Math.min(1.2, ((mat as any).emissiveIntensity ?? 1) * 1.1))
      : new THREE.Color(0, 0, 0);
    const emArr = [em.r * 255, em.g * 255, em.b * 255];
    const alpha = (mat as any)?.transparent ? ((mat as any).opacity ?? 1) : 1;
    const map = (mat as any)?.map as THREE.Texture | null | undefined;
    const emap = (mat as any)?.emissiveMap as THREE.Texture | null | undefined;
    const hasMap = !!map && !!texturePixels(map);
    const hasEmap = !!emap && !!texturePixels(emap);
    if ((map && !hasMap) || (emap && !hasEmap)) {
      // Doku verisi okunamadı — düz renk ile devam
    }

    for (let mi = 0; mi < matrices.length; mi++) {
      const world = matrices[mi];
      const inst = instColors[mi];
      const baseCol = inst ? baseColPlain.clone().multiply(inst) : baseColPlain;
      for (let i = 0; i < count; i += 3) {
        const i0 = idx ? idx.getX(i) : i;
        const i1 = idx ? idx.getX(i + 1) : i + 1;
        const i2 = idx ? idx.getX(i + 2) : i + 2;
        const w0 = new THREE.Vector3().fromBufferAttribute(pa, i0).applyMatrix4(world);
        const w1 = new THREE.Vector3().fromBufferAttribute(pa, i1).applyMatrix4(world);
        const w2 = new THREE.Vector3().fromBufferAttribute(pa, i2).applyMatrix4(world);
        const n = new THREE.Vector3().subVectors(w1, w0).cross(new THREE.Vector3().subVectors(w2, w0));
        if (n.lengthSq() < 1e-9) continue;
        n.normalize();
        const shade = ambient + diffuse * Math.abs(n.dot(lightDir));
        const shaded = [Math.min(255, baseCol.r * shade * 255), Math.min(255, baseCol.g * shade * 255), Math.min(255, baseCol.b * shade * 255)];
        const uv = ua ? [ua.getX(i0), ua.getY(i0), ua.getX(i1), ua.getY(i1), ua.getX(i2), ua.getY(i2)] : null;
        // Kamera uzayında yakın düzleme göre kırp
        const clipped = clipNear([viewOf(w0), viewOf(w1), viewOf(w2)]);
        for (let k = 1; k + 1 < clipped.length; k++) {
          const q0 = projOf(clipped[0]);
          const q1 = projOf(clipped[k]);
          const q2 = projOf(clipped[k + 1]);
          if (!q0 || !q1 || !q2) continue;
          const wpTri = pointLights.length
            ? [
                clipped[0].clone().applyMatrix4(camera.matrixWorld),
                clipped[k].clone().applyMatrix4(camera.matrixWorld),
                clipped[k + 1].clone().applyMatrix4(camera.matrixWorld),
              ]
            : [];
          tris.push({
            x: [q0.x, q1.x, q2.x],
            y: [q0.y, q1.y, q2.y],
            z: [q0.z, q1.z, q2.z],
            col: shaded,
            alpha,
            uv: uv && (hasMap || hasEmap) ? uv : null,
            map: hasMap ? map : null,
            emap: hasEmap ? emap : null,
            em: emArr,
            albedo: [baseCol.r, baseCol.g, baseCol.b],
            shade: shade * (inst ? 1 : 1),
            wp: wpTri,
          });
        }
      }
    }
  });

  // Yumuşak ton eğrisi (Reinhard benzeri) — projektör altındaki yüzeyler bembeyaz patlamaz
  const tonemap = (v: number) => {
    const n = v / 255;
    return 255 * (n * (1 + n / 9)) / (1 + n);
  };

  for (const t of tris) {
    let [x0, y0, x1, y1, x2, y2] = [t.x[0], t.y[0], t.x[1], t.y[1], t.x[2], t.y[2]];
    let [z0, z1, z2] = [t.z[0], t.z[1], t.z[2]];
    let [u0, v0, u1, v1, u2, v2] = t.uv ? t.uv : [0, 0, 0, 0, 0, 0];
    let det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (Math.abs(det) < 1e-9) continue;
    if (det < 0) {
      [x1, x0] = [x0, x1]; [y1, y0] = [y0, y1]; [z1, z0] = [z0, z1];
      [u1, u0] = [u0, u1]; [v1, v0] = [v0, v1];
      det = -det;
    }
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    const mapData = t.map ? texturePixels(t.map) : null;
    const emapData = t.emap ? texturePixels(t.emap) : null;
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
        let cr = t.col[0], cg = t.col[1], cb = t.col[2];
        if (t.wp.length === 3) {
          // Dünya konumunu barycentric interpolasyonla bul → nokta ışığını pikselde hesapla
          const wx = l0 * t.wp[0].x + l1 * t.wp[1].x + l2 * t.wp[2].x;
          const wy = l0 * t.wp[0].y + l1 * t.wp[1].y + l2 * t.wp[2].y;
          const wz = l0 * t.wp[0].z + l1 * t.wp[1].z + l2 * t.wp[2].z;
          const pl = pointLightAt(_tmpVec.set(wx, wy, wz));
          cr = Math.min(255, t.albedo[0] * (t.shade + pl.r) * 255);
          cg = Math.min(255, t.albedo[1] * (t.shade + pl.g) * 255);
          cb = Math.min(255, t.albedo[2] * (t.shade + pl.b) * 255);
        }
        if ((mapData || emapData) && (u0 !== 0 || v0 !== 0 || u1 !== 0 || v1 !== 0 || u2 !== 0 || v2 !== 0)) {
          const uu = l0 * u0 + l1 * u1 + l2 * u2;
          const vv = l0 * v0 + l1 * v1 + l2 * v2;
          if (mapData && t.map) {
            const [tr, tg, tb] = sampleTexture(t.map, mapData, uu, vv);
            cr = cr * (tr / 255);
            cg = cg * (tg / 255);
            cb = cb * (tb / 255);
          }
          if (emapData && t.emap) {
            const [er, eg, eb] = sampleTexture(t.emap, emapData, uu, vv);
            cr += er * (t.em[0] / 255) * 0.55;
            cg += eg * (t.em[1] / 255) * 0.55;
            cb += eb * (t.em[2] / 255) * 0.55;
          }
        } else {
          cr += t.em[0] * 0.6;
          cg += t.em[1] * 0.6;
          cb += t.em[2] * 0.6;
        }
        cr = tonemap(Math.min(400, cr)); cg = tonemap(Math.min(400, cg)); cb = tonemap(Math.min(400, cb));
        if (t.alpha < 1) {
          for (let c = 0; c < 3; c++) {
            const src = c === 0 ? cr : c === 1 ? cg : cb;
            buf[i3 + c] = Math.round(buf[i3 + c] * (1 - t.alpha) + src * t.alpha);
          }
        } else {
          buf[i3] = Math.round(cr);
          buf[i3 + 1] = Math.round(cg);
          buf[i3 + 2] = Math.round(cb);
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

/* ── 🎥 3D MAÇ SİMÜLASYONU önizlemeleri (menajer kamerası) ──
   Sadece bu bölümü çalıştırmak için:  MATCH_ONLY=1 npm run preview:3d */
function renderMatchPreview(cfg: {
  name: string;
  venue: Venue;
  weather: string;
  kitHome: Kit;
  kitAway: Kit;
  minute: number;
  phase: string;
  scoreHome: number;
  scoreAway: number;
  possession: number;
  /** kaç saniye simüle edilsin (açık oyun pozisyonları otursun diye) */
  sim: number;
  cam?: 'manager' | 'broadcast';
  event?: { type: string; team: 'home' | 'away' };
}) {
  const shape = (name: string, mirror: boolean): ShapeSlot[] => {
    const f = FORMATIONS['4-3-3'];
    const nums: Record<string, number[]> = { KL: [1], SB: [2, 3], STP: [4, 5], OS: [6, 8, 10], FW: [7, 9, 11] };
    const used: Record<string, number> = {};
    return f.map(slot => {
      const pool = nums[slot.r] ?? [6, 8, 10];
      const i = used[slot.r] ?? 0;
      used[slot.r] = i + 1;
      return { t: mirror ? slot.t : slot.t, l: mirror ? 100 - slot.l : slot.l, n: pool[i % pool.length] };
    });
    void name;
  };
  const bundle = buildMatchScene({
    venue: cfg.venue,
    homeKit: cfg.kitHome,
    awayKit: cfg.kitAway,
    weather: cfg.weather,
    night: cfg.venue.night,
    lowPerf: true,
    homeShape: shape('home', false),
    awayShape: shape('away', true),
    homeName: 'ANADOLU SPOR',
    awayName: 'KIZIL YILDIZ',
    sponsorText: 'MANAGER PRO 2026 • RESMİ SPONSOR • ',
    logo: '🦁'
  });
  bundle.setCameraMode(cfg.cam ?? 'manager');
  const input: Match3DInput = {
    phase: cfg.phase, minute: cfg.minute, possession: cfg.possession, timeScale: 1,
    scoreHome: cfg.scoreHome, scoreAway: cfg.scoreAway, homeOnPitch: 11, awayOnPitch: 11,
    energy: 72, event: cfg.event ? { key: 1, type: cfg.event.type, team: cfg.event.team, minute: cfg.minute } : null
  };
  // Önce fazı oturt (başlama vuruşu), sonra açık oyunu çalıştır;
  // olayı son ~3 saniyede ver ki sevinç/kart anı kareye yakalansın
  bundle.update(0, 0.016, { ...input, phase: 'first', minute: 0 });
  const steps = Math.round(cfg.sim / 0.033);
  const evStep = steps - Math.round(2.6 / 0.033);
  for (let i = 0; i < steps; i++) {
    bundle.update(i * 0.033, 0.033, i >= evStep ? input : { ...input, event: null });
  }

  const off = bundle.cam.position.clone().sub(bundle.cam.target);
  const radius = Math.max(1, off.length());
  const phi = Math.acos(THREE.MathUtils.clamp(off.y / radius, -1, 1));
  const theta = Math.atan2(off.x, off.z);

  const rows = Math.max(4, Math.min(30, Math.round(cfg.venue.capacity / 1600)));
  const spotX = 105 / 2 + 8 + rows * 1.6 * 0.7;
  const spotZ = 68 / 2 + 8 + rows * 1.6 * 0.7;
  const spotY = rows * 1.6 + 16;
  const buffer = renderToBuffer(bundle.group, {
    radius, phi, theta,
    targetX: bundle.cam.target.x, targetY: bundle.cam.target.y, targetZ: bundle.cam.target.z,
    fov: bundle.cam.fov
  }, {
    sky: cfg.venue.night ? '#0b1026' : '#7ab0e0',
    night: cfg.venue.night,
    time: cfg.sim,
    pointLights: cfg.venue.night
      ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([lx, lz]) => ({
          x: lx * spotX, y: spotY, z: lz * spotZ, intensity: 78000, distance: 300, color: 0xffe9a8
        }))
      : undefined
  });
  writePNG(`${OUT_DIR}/${cfg.name}`, buffer, W, H);
  bundle.dispose();
  console.log(`🎥 ${cfg.name} üretildi (kamera ${cfg.cam ?? 'manager'}, ${cfg.sim}s sim)`);
  return buffer;
}

if (process.env.MATCH_ONLY) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const homeV = homeVenue({ teamName: 'ANADOLU SPOR', design: defaultStadium().design, capacity: 34000, night: false });
  const homeNight = homeVenue({ teamName: 'ANADOLU SPOR', design: { ...defaultStadium().design, seatColor: '#dc2626', accentColor: '#facc15', roof: 'full', stands: 'bowl' }, capacity: 46000, night: true });
  const awayV = awayVenue('KIZIL YILDIZ', 3);
  const awayV2 = awayVenue('DENİZLİ SPOR', 7);
  const tiles: { buf: Uint8Array; label: string }[] = [];
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-menajer-gunduz.png', venue: homeV, weather: 'sunny', kitHome: homeV.kit, kitAway: opponentKit('KIZIL YILDIZ', 3, homeV.kit.shirt), minute: 34, phase: 'first', scoreHome: 1, scoreAway: 0, possession: 58, sim: 26 }), label: 'menajer • gündüz (ev)' });
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-menajer-gece.png', venue: homeNight, weather: 'rain', kitHome: homeNight.kit, kitAway: opponentKit('KIZIL YILDIZ', 3, homeNight.kit.shirt), minute: 71, phase: 'second', scoreHome: 2, scoreAway: 2, possession: 44, sim: 40 }), label: 'menajer • gece+yağmur' });
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-gol.png', venue: homeV, weather: 'cloudy', kitHome: homeV.kit, kitAway: opponentKit('KIZIL YILDIZ', 3, homeV.kit.shirt), minute: 58, phase: 'second', scoreHome: 2, scoreAway: 0, possession: 61, sim: 30, event: { type: 'goal', team: 'home' } }), label: 'gol sevinci' });
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-kart.png', venue: awayV, weather: 'sunny', kitHome: awayV.kit, kitAway: opponentKit('ANADOLU SPOR', 3, awayV.kit.shirt), minute: 41, phase: 'first', scoreHome: 0, scoreAway: 1, possession: 39, sim: 24, event: { type: 'card', team: 'away' } }), label: 'kart (deplasman)' });
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-deplasman.png', venue: awayV2, weather: 'snow', kitHome: awayV2.kit, kitAway: opponentKit('ANADOLU SPOR', 7, awayV2.kit.shirt), minute: 22, phase: 'first', scoreHome: 0, scoreAway: 0, possession: 52, sim: 30 }), label: 'deplasman • kar' });
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-yayin.png', venue: homeV, weather: 'sunny', kitHome: homeV.kit, kitAway: opponentKit('KIZIL YILDIZ', 3, homeV.kit.shirt), minute: 34, phase: 'first', scoreHome: 1, scoreAway: 0, possession: 58, sim: 26, cam: 'broadcast' }), label: '📺 yayın kamerası' });
  console.log(`\n📄 ${composeSheet(tiles, 2, `${OUT_DIR}/preview-mac-tumu.png`)}`);
  process.exit(0);
}

/* ── Önizlemeler ── */
fs.mkdirSync(OUT_DIR, { recursive: true });
const clubColor = '#1d4ed8';

const stadiumPreviews: { name: string; design: StadiumDesign; capacity: number; night: boolean; dPhi: number; dTheta: number; zoom: number; pointLights?: boolean }[] = [
  { name: 'preview-stadyum-gunduz.png', design: { ...defaultStadium().design, roof: 'canopy', flags: true }, capacity: 17000, night: false, dPhi: 0, dTheta: 0, zoom: 1 },
  { name: 'preview-stadyum-gece.png', design: { seatColor: '#dc2626', accentColor: '#facc15', roof: 'full', stands: 'double', pitchPattern: 'stripes', flags: true, logoOnPitch: false, floodlights: true }, capacity: 40000, night: true, dPhi: 0, dTheta: 0.25, zoom: 1.05, pointLights: true },
  // Tasarım seçenekleri galerisi: her kare farklı bir özelleştirme seçimini gösterir
  // Vitrin kareleri: alçak sinematik açı (gece projektörler açık)
  { name: 'preview-stadyum-kahraman-gece.png', design: { seatColor: '#dc2626', accentColor: '#facc15', roof: 'full', stands: 'double', pitchPattern: 'stripes', flags: true, logoOnPitch: true, floodlights: true }, capacity: 40000, night: true, dPhi: 0.04, dTheta: -0.83, zoom: 0.8, pointLights: true },
  { name: 'preview-stadyum-kahraman-gunduz.png', design: { seatColor: '#1d4ed8', accentColor: '#f8fafc', roof: 'canopy', stands: 'stepped', pitchPattern: 'stripes', flags: true, logoOnPitch: true, floodlights: true }, capacity: 26000, night: false, dPhi: 0.04, dTheta: -0.83, zoom: 0.82 },
  { name: 'preview-stadyum-tasarim-cati-yok.png', design: { seatColor: '#2563eb', accentColor: '#f8fafc', roof: 'none', stands: 'classic', pitchPattern: 'stripes', flags: false, logoOnPitch: false, floodlights: false }, capacity: 9000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
  { name: 'preview-stadyum-tasarim-canopy.png', design: { seatColor: '#16a34a', accentColor: '#facc15', roof: 'canopy', stands: 'stepped', pitchPattern: 'plain', flags: true, logoOnPitch: true, floodlights: true }, capacity: 17000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
  { name: 'preview-stadyum-tasarim-cam-cati.png', design: { seatColor: '#7c3aed', accentColor: '#e5e7eb', roof: 'glass', stands: 'double', pitchPattern: 'rings', flags: true, logoOnPitch: true, floodlights: true }, capacity: 26000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
  { name: 'preview-stadyum-tasarim-bowl.png', design: { seatColor: '#dc2626', accentColor: '#111827', roof: 'full', stands: 'bowl', pitchPattern: 'stripes', flags: false, logoOnPitch: false, floodlights: true }, capacity: 34000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
];

const stadiumTiles: { buf: Uint8Array; label: string }[] = [];
stadiumPreviews.forEach(p => {
  const bundle = buildStadiumGroup(p.design, { capacity: p.capacity, logo: '🦁', sponsorText: 'SPONSOR •', teamName: 'ANADOLU SPOR', night: p.night });
  const rows = Math.max(4, Math.min(30, Math.round(p.capacity / 1600)));
  const baseRadius = Math.max(165, (105 + rows * 4.6) * 1.3);
  const spotX = 105 / 2 + 8 + rows * 1.6 * 0.7;
  const spotZ = 68 / 2 + 8 + rows * 1.6 * 0.7;
  const spotY = rows * 1.6 + 16;
  const depth = (p.design.stands === 'stepped' ? 1.9 : 1.55) * rows;
  const halfZ = 68 / 2 + 8 + depth + 4;
  const buffer = renderToBuffer(bundle.group, {
    radius: baseRadius * p.zoom, phi: 0.98 + p.dPhi, theta: 0.85 + p.dTheta,
    targetY: Math.max(6, rows * 1.1) + (p.name.includes('kahraman') ? 2 : 0), fov: 46,
  }, {
    sky: p.night ? '#0b1026' : '#7ab0e0',
    night: p.night,
    // Sahnedeki gece projektörleri (scene.ts ile aynı konum/şiddet)
    pointLights: p.night
      ? [
          ...(p.pointLights
            ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([lx, lz]) => ({
                x: lx * spotX, y: spotY, z: lz * spotZ, intensity: 78000, distance: 300, color: 0xffe9a8,
              }))
            : []),
          // Giriş meydanı lambaları (scene.ts ile aynı)
          { x: -34, y: 7, z: halfZ + 30, intensity: 22000, distance: 120, color: 0xffe3a8 },
          { x: 34, y: 7, z: halfZ + 30, intensity: 22000, distance: 120, color: 0xffe3a8 },
        ]
      : undefined,
  });
  writePNG(`${OUT_DIR}/${p.name}`, buffer, W, H);
  if (p.name.includes('tasarim')) {
    const label = p.design.roof === 'none' ? 'çatısız • klasik'
      : p.design.roof === 'canopy' ? 'saçak çatı • basamaklı'
      : p.design.roof === 'glass' ? 'cam çatı • çift kat'
      : 'tam çatı • bowl';
    stadiumTiles.push({ buf: buffer, label });
  }
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
  }, {
    sky: bundle.sky,
    fog: bundle.fog,
    night: scene.night,
    // Sahnedeki gece projektörleri (scene.ts ile aynı konum/şiddet)
    pointLights: scene.night
      ? [
          { x: -64, y: 24, z: -40, intensity: 28000, distance: 240, color: 0xffe9a8 },
          { x: 64, y: 24, z: -40, intensity: 28000, distance: 240, color: 0xffe9a8 },
        ]
      : undefined,
  });
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
    { name: 'preview-antrenman-kampus.png', facility: { pitch: 3, gym: 3, recovery: 3, tactics: 3, youth: 4 }, theta: 0.62, zoom: 1.34, target: { x: 0, z: 22 }, dPhi: -0.02 },
    { name: 'preview-antrenman-bolge-guney.png', facility: { pitch: 3, gym: 3, recovery: 3, tactics: 3, youth: 4 }, theta: 0.15, zoom: 0.62, target: { x: 0, z: 92 }, dPhi: -0.18 },
    { name: 'preview-antrenman-bolge-kuzey.png', facility: { pitch: 3, gym: 3, recovery: 3, tactics: 3, youth: 4 }, theta: 0.9, zoom: 0.68, target: { x: 0, z: -48 }, dPhi: -0.2 },
    { name: 'preview-antrenman-tabela.png', facility: { pitch: 3, gym: 3, recovery: 3, tactics: 3, youth: 3 }, theta: 1.2, zoom: 0.42, target: { x: -74, z: -52 }, dPhi: 0.22 },
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
