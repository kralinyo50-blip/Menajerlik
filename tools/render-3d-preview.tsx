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
  /**
   * Tone mapping pozlaması — izleyicinin kullandığı değerle AYNI olmalı
   * (Match3D gece 0.92 / gündüz 1.04, Stadium3D 0.88 / 1.02, useOrbitThree 1.05).
   */
  exposure?: number;
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

  /* ══ IŞIKLAR: sahnenin kendisinden okunur ══════════════════════════════
     Önizleme artık ışık değerlerini kopyalamaz; buildStadiumGroup / buildMatchScene /
     buildTrainingComplex hangi ışığı kurduysa onu kullanır. (Eskiden buradaki sabit
     kopyalar oyunla kopmuştu: araç şiddeti 4π'e bölüyordu, oyun bölmüyordu → gece
     maçları tarayıcıda bembeyaz yanıyordu ama önizlemede "normal" görünüyordu.)

     three.js fiziksel modeli birebir uygulanır:
       E = ambient + Σ gökyüzü(hemi) + Σ yönlü·|N·L| + Σ nokta·(1/d^decay)·pencere·|N·L|
       L = albedo·E/π + emissive    →    ACES(L · pozlama)    →    sRGB
  ──────────────────────────────────────────────────────────────────────── */
  const hemiLights: { sky: THREE.Color; ground: THREE.Color; dir: THREE.Vector3; intensity: number }[] = [];
  const dirLights: { color: THREE.Color; dir: THREE.Vector3; intensity: number }[] = [];
  const pointLights: { pos: THREE.Vector3; color: THREE.Color; intensity: number; distance: number; decay: number }[] = [];
  /** Projektörler: konik hüzme — three'nin spot bilgisiyle birebir aynı alanlar */
  const spotLights: { pos: THREE.Vector3; dir: THREE.Vector3; color: THREE.Color; intensity: number; distance: number; decay: number; coneCos: number; penumbraCos: number }[] = [];
  const ambientColor = new THREE.Color(0, 0, 0);
  group.traverse(obj => {
    const light = obj as THREE.Light;
    if (!light.isLight) return;
    const pos = new THREE.Vector3().setFromMatrixPosition(light.matrixWorld);
    const hemi = light as THREE.HemisphereLight;
    const dir = light as THREE.DirectionalLight;
    const point = light as THREE.PointLight;
    const spot3 = light as THREE.SpotLight;
    const amb = light as THREE.AmbientLight;
    if (hemi.isHemisphereLight) {
      // three: hemi yönü = ışığın konum vektörü (varsayılan 0,1,0 → yukarıdan)
      const hDir = pos.lengthSq() > 1e-8 ? pos.clone().normalize() : new THREE.Vector3(0, 1, 0);
      hemiLights.push({ sky: hemi.color.clone(), ground: hemi.groundColor.clone(), dir: hDir, intensity: hemi.intensity });
    } else if (dir.isDirectionalLight) {
      // three: uniforms.direction = lightPos − targetPos (yüzeyden ışığa bakan vektör)
      const target = new THREE.Vector3().setFromMatrixPosition(dir.target.matrixWorld);
      dirLights.push({ color: dir.color.clone(), dir: pos.clone().sub(target).normalize(), intensity: dir.intensity });
    } else if (point.isPointLight) {
      pointLights.push({ pos, color: point.color.clone(), intensity: point.intensity, distance: point.distance, decay: point.decay });
    } else if (spot3.isSpotLight) {
      // DİKKAT: three, spot yönünü shader'a "hedeften lambaya" (geri vektör) verir:
      // WebGLLights: uniforms.direction = lightPos - targetPos. Aynı kuralı kullanmalıyız.
      const target = new THREE.Vector3().setFromMatrixPosition(spot3.target.matrixWorld);
      const dir = pos.clone().sub(target).normalize();
      spotLights.push({
        pos, dir, color: spot3.color.clone(), intensity: spot3.intensity,
        distance: spot3.distance, decay: spot3.decay,
        coneCos: Math.cos(spot3.angle),
        penumbraCos: Math.cos(spot3.angle * (1 - spot3.penumbra)),
      });
    } else if (amb.isAmbientLight) {
      ambientColor.add(amb.color.clone().multiplyScalar(amb.intensity));
    }
  });
  const _tmpVec = new THREE.Vector3();
  const _wpVec = new THREE.Vector3();
  /** Yönlü + gökyüzü bileşenleri (üçgen başına sabit) */
  const irradianceBase = (n: THREE.Vector3): [number, number, number] => {
    let r = ambientColor.r, g = ambientColor.g, b = ambientColor.b;
    for (const h of hemiLights) {
      const w = 0.5 * n.dot(h.dir) + 0.5;
      r += (h.ground.r + (h.sky.r - h.ground.r) * w) * h.intensity;
      g += (h.ground.g + (h.sky.g - h.ground.g) * w) * h.intensity;
      b += (h.ground.b + (h.sky.b - h.ground.b) * w) * h.intensity;
    }
    for (const d of dirLights) {
      const k = Math.max(0, n.dot(d.dir)) * d.intensity;
      r += d.color.r * k; g += d.color.g * k; b += d.color.b * k;
    }
    return [r, g, b];
  };
  /** Nokta ışıklar piksel başına (konuma bağlı) */
  const pointLightAt = (p: THREE.Vector3, n: THREE.Vector3): [number, number, number] => {
    let r = 0, g = 0, b = 0;
    /** three: getDistanceAttenuation */
    const distanceAttenuation = (d: number, cutoff: number, decay: number) => {
      let f = 1 / Math.max(Math.pow(d, decay), 0.01);
      if (cutoff > 0) {
        const w = Math.max(0, 1 - Math.pow(d / cutoff, 4));
        f *= w * w;
      }
      return f;
    };
    for (const l of pointLights) {
      const dx = l.pos.x - p.x, dy = l.pos.y - p.y, dz = l.pos.z - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (l.distance > 0 && d >= l.distance) continue;
      const falloff = distanceAttenuation(d, l.distance, l.decay);
      const k = Math.max(0, (dx * n.x + dy * n.y + dz * n.z) / Math.max(d, 1e-4)) * l.intensity * falloff;
      r += l.color.r * k; g += l.color.g * k; b += l.color.b * k;
    }
    for (const l of spotLights) {
      const dx = l.pos.x - p.x, dy = l.pos.y - p.y, dz = l.pos.z - p.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < 1e-4) continue;
      // three: getSpotLightInfo → önce koni, sonra mesafe sönümü
      const cosine = (dx * l.dir.x + dy * l.dir.y + dz * l.dir.z) / d;
      if (cosine <= l.coneCos) continue;
      const t = Math.min(1, Math.max(0, (cosine - l.coneCos) / Math.max(l.penumbraCos - l.coneCos, 1e-6)));
      const spotAtt = t * t * (3 - 2 * t);      // GLSL smoothstep
      if (spotAtt <= 0) continue;
      const falloff = distanceAttenuation(d, l.distance, l.decay);
      const k = spotAtt * Math.max(0, (dx * n.x + dy * n.y + dz * n.z) / d) * l.intensity * falloff;
      r += l.color.r * k; g += l.color.g * k; b += l.color.b * k;
    }
    return [r, g, b];
  };

  interface Tri {
    x: number[]; y: number[]; z: number[];
    /** Üçgen başına sabit aydınlanma (ambient + gökyüzü + yönlü ışıklar) */
    irr: number[];
    alpha: number;
    uv?: number[] | null;
    map?: THREE.Texture | null;
    emap?: THREE.Texture | null;
    /** Lineer emissive katkısı */
    em: number[];
    /** Lineer albedo (malzeme rengi × doku) */
    albedo: number[];
    /** Köşe başına dünya normali (perspektif interpolasyonu için 3 köşe) */
    nrm: number[][];
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
    const na = geo.attributes.normal as THREE.BufferAttribute | undefined;
    const idx = geo.index;
    const count = idx ? idx.count : pa.count;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    // Ön yüz malzemesi + varsa yan yüz (ExtrudeGeometry) malzemesi
    const mat = mats[0] as THREE.MeshStandardMaterial;
    /* GPU davranışı: kapalı yüzeylerde arka yüzler çizilmez (kapalı cisimlerin içini
       görmeyelim). Çift taraflı malzemelerde ise three normali bakana çevirir. */
    const doubleSided = mat?.side === THREE.DoubleSide;
    const backSided = mat?.side === THREE.BackSide;

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
    const emArr = [em.r, em.g, em.b];   // lineer (ColorManagement açık: Color bileşenleri lineer)
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
      const nmat = new THREE.Matrix3().getNormalMatrix(world);
      for (let i = 0; i < count; i += 3) {
        const i0 = idx ? idx.getX(i) : i;
        const i1 = idx ? idx.getX(i + 1) : i + 1;
        const i2 = idx ? idx.getX(i + 2) : i + 2;
        const w0 = new THREE.Vector3().fromBufferAttribute(pa, i0).applyMatrix4(world);
        const w1 = new THREE.Vector3().fromBufferAttribute(pa, i1).applyMatrix4(world);
        const w2 = new THREE.Vector3().fromBufferAttribute(pa, i2).applyMatrix4(world);
        const face = new THREE.Vector3().subVectors(w1, w0).cross(new THREE.Vector3().subVectors(w2, w0));
        if (face.lengthSq() < 1e-9) continue;
        face.normalize();
        // Köşe normalleri (GPU'daki gibi); yoksa yüz normali
        const vn = (k: number) => {
          if (!na) return face;
          const v = new THREE.Vector3().fromBufferAttribute(na, k).applyMatrix3(nmat);
          return v.lengthSq() > 1e-9 ? v.normalize() : face;
        };
        const n0 = vn(i0), n1 = vn(i1), n2 = vn(i2);
        const centroid = new THREE.Vector3().addVectors(w0, w1).add(w2).multiplyScalar(1 / 3);
        const towardCamera = camera.position.clone().sub(centroid);
        const facing = face.dot(towardCamera) >= 0;
        // Tek taraflı malzemede arka yüz çizilmez; çift taraflıda three normali bakana çevirir
        if (!doubleSided && !backSided && !facing) continue;
        const flip = (doubleSided || backSided) && !facing;
        if (flip) { n0.negate(); n1.negate(); n2.negate(); }
        // Aydınlanma köşe normalinden: yönlü ışıklar N·L, lore yerine köşe ortalaması
        const nAvg = new THREE.Vector3().addVectors(n0, n1).add(n2).normalize();
        const irr = irradianceBase(nAvg);
        const uv = ua ? [ua.getX(i0), ua.getY(i0), ua.getX(i1), ua.getY(i1), ua.getX(i2), ua.getY(i2)] : null;
        // Kamera uzayında yakın düzleme göre kırp
        const clipped = clipNear([viewOf(w0), viewOf(w1), viewOf(w2)]);
        for (let k = 1; k + 1 < clipped.length; k++) {
          const q0 = projOf(clipped[0]);
          const q1 = projOf(clipped[k]);
          const q2 = projOf(clipped[k + 1]);
          if (!q0 || !q1 || !q2) continue;
          const wpTri = pointLights.length + spotLights.length
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
            irr,
            alpha,
            uv: uv && (hasMap || hasEmap) ? uv : null,
            map: hasMap ? map : null,
            emap: hasEmap ? emap : null,
            em: emArr,
            albedo: [baseCol.r, baseCol.g, baseCol.b],
            nrm: [[n0.x, n0.y, n0.z], [n1.x, n1.y, n1.z], [n2.x, n2.y, n2.z]],
            wp: wpTri,
          });
        }
      }
    }
  });

  /* ── three.js ACESFilmicToneMapping (birebir aynı katsayılar) + sRGB kodlama ──
     Oyunun izleyicileri ACESFilmicToneMapping kullanıyor; önizleme bunu taklit etmezse
     "önizlemede iyi, tarayıcıda bembeyaz" tuzağına düşülür. */
  const exposure = opts.exposure ?? (opts.night ? 0.92 : 1.04);
  const RRTAndODTFit = (v: number[]) => {
    const a = [v[0] * (v[0] + 0.0245786) - 0.000090537, v[1] * (v[1] + 0.0245786) - 0.000090537, v[2] * (v[2] + 0.0245786) - 0.000090537];
    const b = [v[0] * (0.983729 * v[0] + 0.432951) + 0.238081, v[1] * (0.983729 * v[1] + 0.432951) + 0.238081, v[2] * (0.983729 * v[2] + 0.432951) + 0.238081];
    return [a[0] / b[0], a[1] / b[1], a[2] / b[2]];
  };
  const mat3Mul = (m: number[][], v: number[]) => [
    m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
    m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
    m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
  ];
  const ACES_INPUT = [[0.59719, 0.35458, 0.04823], [0.076, 0.90834, 0.01566], [0.0284, 0.13383, 0.83777]];
  const ACES_OUTPUT = [[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]];
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toSRGB = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  /** Lineer renk → ACES → sRGB (0-255) */
  const tonemap = (v: number[]) => {
    const scaled = [v[0] * exposure / 0.6, v[1] * exposure / 0.6, v[2] * exposure / 0.6];
    const fitted = RRTAndODTFit(mat3Mul(ACES_INPUT, scaled));
    const out = mat3Mul(ACES_OUTPUT, fitted);
    return out.map(c => Math.max(0, Math.min(1, toSRGB(Math.max(0, Math.min(1, c))))) * 255);
  };
  const INV_PI = 1 / Math.PI;

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
        // 1) Aydınlanma: üçgen katkısı + (varsa) pikselde nokta ışıkları
        const nrmV = _tmpVec.set(
          l0 * t.nrm[0][0] + l1 * t.nrm[1][0] + l2 * t.nrm[2][0],
          l0 * t.nrm[0][1] + l1 * t.nrm[1][1] + l2 * t.nrm[2][1],
          l0 * t.nrm[0][2] + l1 * t.nrm[1][2] + l2 * t.nrm[2][2]
        );
        if (nrmV.lengthSq() > 1e-9) nrmV.normalize();
        let e0 = t.irr[0], e1 = t.irr[1], e2 = t.irr[2];
        if (t.wp.length === 3 && (pointLights.length > 0 || spotLights.length > 0)) {
          const wx = l0 * t.wp[0].x + l1 * t.wp[1].x + l2 * t.wp[2].x;
          const wy = l0 * t.wp[0].y + l1 * t.wp[1].y + l2 * t.wp[2].y;
          const wz = l0 * t.wp[0].z + l1 * t.wp[1].z + l2 * t.wp[2].z;
          const pl = pointLightAt(_wpVec.set(wx, wy, wz), nrmV);
          e0 += pl[0]; e1 += pl[1]; e2 += pl[2];
        }
        // 2) Lambert: albedo · E / π  (three.js BRDF_Lambert)
        let lr = t.albedo[0] * e0 * INV_PI;
        let lg = t.albedo[1] * e1 * INV_PI;
        let lb = t.albedo[2] * e2 * INV_PI;
        // 3) Doku (sRGB → lineer) ve emissive katkısı (lineer)
        if ((mapData || emapData) && (u0 !== 0 || v0 !== 0 || u1 !== 0 || v1 !== 0 || u2 !== 0 || v2 !== 0)) {
          const uu = l0 * u0 + l1 * u1 + l2 * u2;
          const vv = l0 * v0 + l1 * v1 + l2 * v2;
          if (mapData && t.map) {
            const [tr, tg, tb] = sampleTexture(t.map, mapData, uu, vv);
            lr *= toLinear(tr / 255); lg *= toLinear(tg / 255); lb *= toLinear(tb / 255);
          }
          if (emapData && t.emap) {
            const [er, eg, eb] = sampleTexture(t.emap, emapData, uu, vv);
            lr += toLinear(er / 255) * t.em[0];
            lg += toLinear(eg / 255) * t.em[1];
            lb += toLinear(eb / 255) * t.em[2];
          }
        } else {
          lr += t.em[0]; lg += t.em[1]; lb += t.em[2];
        }
        // 4) Tone mapping + sRGB kodlama (oyunun izleyicileriyle aynı)
        const mapped = tonemap([lr, lg, lb]);
        const cr = mapped[0], cg = mapped[1], cb = mapped[2];
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
  /** Ev sahibinin iç tesisleri (büfe vb) — maçta görünürlüğünü denetlemek için */
  facilities?: Record<string, number>;
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
    logo: '🦁',
    // Ev sahibi maçında oyuncunun stadı: tesisler (büfe, mağaza…) sahneye girer
    facilities: cfg.facilities
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

  const buffer = renderToBuffer(bundle.group, {
    radius, phi, theta,
    targetX: bundle.cam.target.x, targetY: bundle.cam.target.y, targetZ: bundle.cam.target.z,
    fov: bundle.cam.fov
  }, {
    sky: cfg.venue.night ? '#0b1026' : '#7ab0e0',
    night: cfg.venue.night,
    time: cfg.sim,
    // Match3D.tsx ile aynı pozlama
    exposure: cfg.venue.night ? 0.92 : 1.04,
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
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-tesisler.png', venue: homeNight, weather: 'sunny', kitHome: homeNight.kit, kitAway: opponentKit('KIZIL YILDIZ', 3, homeNight.kit.shirt), minute: 34, phase: 'first', scoreHome: 1, scoreAway: 0, possession: 58, sim: 26, cam: 'manager', facilities: { buffet: 4, fanShop: 3, restaurant: 2, bar: 2, parking: 2, toilets: 2, security: 3, ledScreen: 2, soundSystem: 2, museum: 0, kidsZone: 0, medicalRoom: 1 } }), label: '🍔 tesisler (büfe) • menajer kamerası' });
  tiles.push({ buf: renderMatchPreview({ name: 'preview-mac-yayin.png', venue: homeV, weather: 'sunny', kitHome: homeV.kit, kitAway: opponentKit('KIZIL YILDIZ', 3, homeV.kit.shirt), minute: 34, phase: 'first', scoreHome: 1, scoreAway: 0, possession: 58, sim: 26, cam: 'broadcast' }), label: '📺 yayın kamerası' });
  console.log(`\n📄 ${composeSheet(tiles, 3, `${OUT_DIR}/preview-mac-tumu.png`)}`);
  process.exit(0);
}

/* ── Önizlemeler ── */
fs.mkdirSync(OUT_DIR, { recursive: true });
const clubColor = '#1d4ed8';
/** STADIUM_ONLY=1 → yalnızca stadyum kareleri (tesis 3D denetimi için hızlı mod) */
const STADIUM_ONLY = !!process.env.STADIUM_ONLY;

const stadiumPreviews: { name: string; design: StadiumDesign; capacity: number; night: boolean; dPhi: number; dTheta: number; zoom: number; facilities?: Record<string, number>; focus?: { x: number; y: number; z: number; radius: number } }[] = [
  { name: 'preview-stadyum-gunduz.png', design: { ...defaultStadium().design, roof: 'canopy', flags: true }, capacity: 17000, night: false, dPhi: 0, dTheta: 0, zoom: 1 },
  { name: 'preview-stadyum-gece.png', design: { seatColor: '#dc2626', accentColor: '#facc15', roof: 'full', stands: 'double', pitchPattern: 'stripes', flags: true, logoOnPitch: false, floodlights: true }, capacity: 40000, night: true, dPhi: 0, dTheta: 0.25, zoom: 1.05 },
  // Tasarım seçenekleri galerisi: her kare farklı bir özelleştirme seçimini gösterir
  // Vitrin kareleri: alçak sinematik açı (gece projektörler açık)
  { name: 'preview-stadyum-kahraman-gece.png', design: { seatColor: '#dc2626', accentColor: '#facc15', roof: 'full', stands: 'double', pitchPattern: 'stripes', flags: true, logoOnPitch: true, floodlights: true }, capacity: 40000, night: true, dPhi: 0.04, dTheta: -0.83, zoom: 0.8 },
  { name: 'preview-stadyum-kahraman-gunduz.png', design: { seatColor: '#1d4ed8', accentColor: '#f8fafc', roof: 'canopy', stands: 'stepped', pitchPattern: 'stripes', flags: true, logoOnPitch: true, floodlights: true }, capacity: 26000, night: false, dPhi: 0.04, dTheta: -0.83, zoom: 0.82 },
  { name: 'preview-stadyum-tasarim-cati-yok.png', design: { seatColor: '#2563eb', accentColor: '#f8fafc', roof: 'none', stands: 'classic', pitchPattern: 'stripes', flags: false, logoOnPitch: false, floodlights: false }, capacity: 9000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
  { name: 'preview-stadyum-tasarim-canopy.png', design: { seatColor: '#16a34a', accentColor: '#facc15', roof: 'canopy', stands: 'stepped', pitchPattern: 'plain', flags: true, logoOnPitch: true, floodlights: true }, capacity: 17000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
  { name: 'preview-stadyum-tasarim-cam-cati.png', design: { seatColor: '#7c3aed', accentColor: '#e5e7eb', roof: 'glass', stands: 'double', pitchPattern: 'rings', flags: true, logoOnPitch: true, floodlights: true }, capacity: 26000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
  { name: 'preview-stadyum-tasarim-bowl.png', design: { seatColor: '#dc2626', accentColor: '#111827', roof: 'full', stands: 'bowl', pitchPattern: 'stripes', flags: false, logoOnPitch: false, floodlights: true }, capacity: 34000, night: false, dPhi: 0.06, dTheta: -0.18, zoom: 1.02 },
  // ── İç tesisler (büfe, mağaza, restoran…) — 3D'de görünürlük denetimi ──
  // theta ≈ -0.85 → kamera giriş meydanının (büfe çarşısı) karşısına gelir
  { name: 'preview-stadyum-tesisler-gunduz.png', design: { ...defaultStadium().design, roof: 'canopy', flags: true }, capacity: 34000, night: false, dPhi: 0.04, dTheta: -0.15, zoom: 1, focus: { x: 0, y: 2, z: 104.55, radius: 162 }, facilities: { buffet: 5, fanShop: 4, restaurant: 3, bar: 3, parking: 3, toilets: 3, security: 4, ledScreen: 2, soundSystem: 3, museum: 2, kidsZone: 3, medicalRoom: 2 } },
  { name: 'preview-stadyum-tesisler-gece.png', design: { seatColor: '#dc2626', accentColor: '#facc15', roof: 'glass', stands: 'double', pitchPattern: 'stripes', flags: true, logoOnPitch: false, floodlights: true }, capacity: 46000, night: true, dPhi: 0.04, dTheta: -0.15, zoom: 1, focus: { x: 0, y: 2, z: 116.95, radius: 186 }, facilities: { buffet: 5, fanShop: 5, restaurant: 4, bar: 5, parking: 4, toilets: 4, security: 5, ledScreen: 4, soundSystem: 4, museum: 3, kidsZone: 4, medicalRoom: 3 } },
];

const stadiumTiles: { buf: Uint8Array; label: string }[] = [];
stadiumPreviews.forEach(p => {
  const bundle = buildStadiumGroup(p.design, { capacity: p.capacity, logo: '🦁', sponsorText: 'SPONSOR •', teamName: 'ANADOLU SPOR', night: p.night, facilities: p.facilities });
  const rows = Math.max(4, Math.min(30, Math.round(p.capacity / 1600)));
  const baseRadius = Math.max(165, (105 + rows * 4.6) * 1.3);
  const buffer = renderToBuffer(bundle.group, {
    radius: p.focus ? p.focus.radius : baseRadius * p.zoom, phi: 0.98 + p.dPhi, theta: 0.85 + p.dTheta,
    targetX: p.focus?.x, targetZ: p.focus?.z,
    targetY: p.focus ? p.focus.y : Math.max(6, rows * 1.1) + (p.name.includes('kahraman') ? 2 : 0), fov: 46,
  }, {
    sky: p.night ? '#0b1026' : '#7ab0e0',
    night: p.night,
    // Stadium3D.tsx ile aynı pozlama
    exposure: p.night ? 0.88 : 1.02,
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

if (STADIUM_ONLY) {
  console.log(`\n🏟️  Stadyum kareleri hazır: ${stadiumPreviews.map(p => p.name).join(', ')}`);
  process.exit(0);
}

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
    exposure: 1.05,   // useOrbitThree ile aynı
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
  }, { sky: bundle.sky, fog: bundle.fog, night: false, exposure: 1.05 });
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
    }, { sky: bundle.sky, fog: bundle.fog, night: false, exposure: 1.05 });
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
      exposure: 1.05,   // useOrbitThree ile aynı
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
