import * as THREE from 'three';
import { buildCharacter, CharacterRig } from '../life/character';

/** Sahadaki bir figürün görünüm seçenekleri */
export interface FootballerLook {
  shirt: string;
  shorts: string;
  socks: string;
  shoes: string;
  /** Sırt numarası (0 = numara yok: hakem, personel) */
  number?: number;
  /** Numara rengi */
  numberColor?: string;
  scale?: number;
  skin?: string;
  hair?: string;
}

export interface Footballer {
  rig: CharacterRig;
  root: THREE.Group;
  /** Yumuşak yer gölgesi (blob shadow) — gerçek gölgelerden çok daha ucuz */
  shadow: THREE.Mesh;
  look: FootballerLook;
}

const SKIN_TONES = ['#f1c9a5', '#e8b48a', '#d9a06b', '#c68642', '#a0653c', '#8d5524', '#6b4423', '#f6d7c4'] as const;
const HAIR_TONES = ['#1b1208', '#2b1d15', '#4a2c17', '#6b4423', '#8a6a3f', '#c9a227', '#3d3d3d', '#101010'] as const;

let blobTex: THREE.Texture | null = null;
const numberTextures = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Yuvarlak, yumuşak yer gölgesi dokusu (tüm figürler paylaşır) */
export function blobShadowTexture(): THREE.Texture | null {
  if (blobTex) return blobTex;
  const c = makeCanvas(64, 64);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  blobTex = tex;
  return tex;
}

/** Forma sırt numarası dokusu — aynı numaralar paylaşılır */
function numberTexture(n: number, color: string): THREE.Texture | null {
  const key = `${n}:${color}`;
  const cached = numberTextures.get(key);
  if (cached) return cached;
  const c = makeCanvas(64, 80);
  if (!c) return null;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, 64, 80);
  ctx.fillStyle = color;
  ctx.font = 'bold 54px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 32, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  numberTextures.set(key, tex);
  return tex;
}

let shadowGeo: THREE.CircleGeometry | null = null;
let shadowMat: THREE.MeshBasicMaterial | null = null;

/**
 * 3D futbolcu: mevcut menajer karakteri rig'i + forma renkleri + sırt numarası + yer gölgesi.
 * Eklemler ayrı gruplarda olduğu için koşu/şut/kutlama/yere düşme animasyonları kolayca verilir.
 */
export function buildFootballer(look: FootballerLook, seed = 0): Footballer {
  const skin = look.skin ?? SKIN_TONES[seed % SKIN_TONES.length];
  const hair = look.hair ?? HAIR_TONES[(seed * 3 + 1) % HAIR_TONES.length];
  const rig = buildCharacter({
    shirt: look.shirt,
    shorts: look.shorts,
    skin,
    hair,
    shoes: look.shoes,
    scale: look.scale ?? 1
  });

  // Çorap rengi: baldır materyalini forma çorabıyla eşitle (şort + çorap ayrımı)
  rig.mats.shorts.color.set(look.shorts);
  // Tozluk hissi: baldır/kaval kısmını çorap rengine boyamak için küçük bir kılıf eklenir
  const sockMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.socks), roughness: 0.9 });
  [rig.leftShin, rig.rightShin].forEach(shin => {
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.26, 8), sockMat);
    sock.position.y = -0.28;
    shin.add(sock);
  });

  // Sırt numarası
  if (look.number && look.number > 0) {
    const tex = numberTexture(look.number, look.numberColor ?? '#ffffff');
    if (tex) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.3),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      plane.position.set(0, 0.36, -0.145);
      plane.rotation.y = Math.PI;
      rig.torso.add(plane);
    }
  }

  // Yer gölgesi
  if (!shadowGeo) shadowGeo = new THREE.CircleGeometry(0.42, 16);
  if (!shadowMat) {
    const tex = blobShadowTexture();
    shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: tex ? 0.75 : 0.3,
      alphaMap: tex ?? undefined,
      depthWrite: false
    });
  }
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.045;
  shadow.renderOrder = 1;

  const root = rig.root;
  return { rig, root, shadow, look };
}

/* ══════════════════ POZLAR ══════════════════
   phase: koşu döngüsü fazı (radyan), intensity: 0 yürüyüş → 1 tam sprint */

/** Koşu / sprint — hız arttıkça adımlar ve gövde eğimi büyür */
export function poseRun(rig: CharacterRig, phase: number, intensity: number) {
  const amp = 0.35 + intensity * 0.75;
  const s = Math.sin(phase);
  const c = Math.sin(phase + Math.PI);
  rig.root.rotation.x = 0;
  rig.root.position.y = Math.abs(Math.sin(phase)) * (0.012 + intensity * 0.045);
  rig.hips.position.y = 0.92;
  rig.hips.rotation.set(0, 0, Math.sin(phase) * 0.04);
  rig.torso.rotation.set(0.05 + intensity * 0.22, Math.sin(phase) * 0.07, 0);
  rig.head.rotation.set(-0.05 - intensity * 0.08, Math.sin(phase * 0.5) * 0.06, 0);
  rig.leftLeg.rotation.x = s * amp;
  rig.rightLeg.rotation.x = c * amp;
  rig.leftShin.rotation.x = Math.max(0, -s) * (0.5 + intensity * 1.0);
  rig.rightShin.rotation.x = Math.max(0, -c) * (0.5 + intensity * 1.0);
  rig.leftArm.rotation.x = c * (0.3 + intensity * 0.65);
  rig.rightArm.rotation.x = s * (0.3 + intensity * 0.65);
  rig.leftArm.rotation.z = 0.16;
  rig.rightArm.rotation.z = -0.16;
  rig.leftForearm.rotation.x = -0.5 - intensity * 0.9;
  rig.rightForearm.rotation.x = -0.5 - intensity * 0.9;
}

/** Ayakta bekleme — nefes alma, hafif salınım */
export function poseIdle(rig: CharacterRig, t: number, seed = 0) {
  const b = Math.sin(t * 1.8 + seed);
  rig.root.rotation.set(0, 0, 0);
  rig.root.position.y = 0;
  rig.hips.position.y = 0.92 + b * 0.012;
  rig.hips.rotation.set(0, 0, 0);
  rig.torso.rotation.set(0.02, Math.sin(t * 0.9 + seed) * 0.05, 0);
  rig.head.rotation.set(-0.03 + b * 0.03, Math.sin(t * 0.7 + seed) * 0.12, 0);
  rig.leftArm.rotation.set(b * 0.05, 0, 0.1);
  rig.rightArm.rotation.set(-b * 0.05, 0, -0.1);
  rig.leftForearm.rotation.set(-0.12, 0, 0);
  rig.rightForearm.rotation.set(-0.12, 0, 0);
  rig.leftLeg.rotation.set(0, 0, 0.02);
  rig.rightLeg.rotation.set(0, 0, -0.02);
  rig.leftShin.rotation.set(0, 0, 0);
  rig.rightShin.rotation.set(0, 0, 0);
}

/** Topa vuruş — destek bacağı sabit, vuran bacak savrulur */
export function poseKick(rig: CharacterRig, phase: number, power = 1) {
  const p = Math.max(0, Math.min(1, phase));
  const wind = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
  const strike = p < 0.4 ? 0 : (p - 0.4) / 0.6;
  rig.root.rotation.x = 0;
  rig.root.position.y = 0;
  rig.hips.position.y = 0.9 - wind * 0.04;
  rig.torso.rotation.set(-0.12 - strike * 0.22 * power, 0.18 * power, 0);
  rig.head.rotation.set(0.16, 0, 0);
  rig.leftLeg.rotation.x = -0.12;
  rig.leftShin.rotation.x = 0.1;
  rig.rightLeg.rotation.x = wind * 0.85 - strike * 1.35 * power;
  rig.rightShin.rotation.x = wind * 1.1 - strike * 0.35;
  rig.leftArm.rotation.set(-0.5 * power, 0, 0.55);
  rig.rightArm.rotation.set(0.35, 0, -0.75);
  rig.leftForearm.rotation.x = -0.5;
  rig.rightForearm.rotation.x = -0.35;
}

/** Gol sevinci — kollar havada, zıplama, koşma */
export function poseCelebrate(rig: CharacterRig, t: number, seed = 0, jumping = true) {
  const j = jumping ? Math.abs(Math.sin(t * 5.2 + seed)) : 0;
  rig.root.rotation.x = 0;
  rig.root.position.y = j * 0.22;
  rig.hips.position.y = 0.92;
  rig.torso.rotation.set(-0.12, Math.sin(t * 3 + seed) * 0.14, 0);
  rig.head.rotation.set(-0.22, Math.sin(t * 2 + seed) * 0.2, 0);
  rig.leftArm.rotation.set(-2.5 - Math.sin(t * 6 + seed) * 0.25, 0, 0.35);
  rig.rightArm.rotation.set(-2.5 - Math.cos(t * 6 + seed) * 0.25, 0, -0.35);
  rig.leftForearm.rotation.x = -0.35;
  rig.rightForearm.rotation.x = -0.35;
  rig.leftLeg.rotation.x = j > 0.05 ? -0.5 - j : 0.05;
  rig.rightLeg.rotation.x = j > 0.05 ? 0.35 : -0.05;
  rig.leftShin.rotation.x = j > 0.05 ? 0.9 : 0;
  rig.rightShin.rotation.x = j > 0.05 ? 0.25 : 0;
}

/** Yerde yatma (sakatlık) — hafif kıvranma */
export function poseLying(rig: CharacterRig, t: number, seed = 0) {
  const w = Math.sin(t * 2.4 + seed);
  rig.root.rotation.set(-Math.PI / 2 + 0.06, 0, 0.16);
  rig.root.position.y = 0.2;
  rig.hips.position.y = 0.92;
  rig.torso.rotation.set(0.05, w * 0.08, 0);
  rig.head.rotation.set(0.1, w * 0.16, 0);
  rig.leftArm.rotation.set(-0.35 + w * 0.25, 0, 0.5);
  rig.rightArm.rotation.set(-0.2 - w * 0.2, 0, -0.55);
  rig.leftForearm.rotation.x = -0.7 + w * 0.2;
  rig.rightForearm.rotation.x = -0.5;
  rig.leftLeg.rotation.set(0.25 + w * 0.12, 0, 0.08);
  rig.rightLeg.rotation.set(0.42, 0, -0.08);
  rig.leftShin.rotation.x = -0.7;
  rig.rightShin.rotation.x = -0.35;
}

/** Kaleci kurtarışı — yana uzanma */
export function poseDive(rig: CharacterRig, side: number, p: number) {
  const ext = Math.sin(Math.max(0, Math.min(1, p)) * Math.PI);
  rig.root.rotation.set(0, 0, -side * ext * 1.35);
  rig.root.position.y = ext * 0.35;
  rig.hips.position.y = 0.92;
  rig.torso.rotation.set(0.1, 0, side * ext * 0.2);
  rig.head.rotation.set(0.05, -side * ext * 0.3, 0);
  rig.leftArm.rotation.set(-1.9 - ext * 0.5, 0, 0.25);
  rig.rightArm.rotation.set(-1.9 - ext * 0.5, 0, -0.25);
  rig.leftForearm.rotation.x = -0.15;
  rig.rightForearm.rotation.x = -0.15;
  rig.leftLeg.rotation.set(0.25 + ext * 0.35, 0, 0.18);
  rig.rightLeg.rotation.set(-0.15 - ext * 0.45, 0, -0.22);
  rig.leftShin.rotation.x = -0.35;
  rig.rightShin.rotation.x = -0.2;
}

/** Oturuyor (yedek kulübesi) */
export function poseSeated(rig: CharacterRig, t: number, seed = 0) {
  const b = Math.sin(t * 1.3 + seed) * 0.03;
  rig.root.rotation.set(0, 0, 0);
  rig.root.position.y = -0.34;
  rig.hips.position.y = 0.92;
  rig.torso.rotation.set(0.12 + b, Math.sin(t * 0.6 + seed) * 0.08, 0);
  rig.head.rotation.set(-0.05 + b, Math.sin(t * 0.5 + seed) * 0.2, 0);
  rig.leftArm.rotation.set(-0.35, 0, 0.22);
  rig.rightArm.rotation.set(-0.35, 0, -0.22);
  rig.leftForearm.rotation.x = -0.75;
  rig.rightForearm.rotation.x = -0.75;
  rig.leftLeg.rotation.set(1.25, 0, 0.06);
  rig.rightLeg.rotation.set(1.25, 0, -0.06);
  rig.leftShin.rotation.x = -1.2;
  rig.rightShin.rotation.x = -1.2;
}

/** Hakem kart gösteriyor — kol havada, kart düzlemi görünür */
export function poseCard(rig: CharacterRig, t: number, up: number) {
  const raise = Math.max(0, Math.min(1, up));
  rig.root.rotation.set(0, 0, 0);
  rig.root.position.y = 0;
  rig.hips.position.y = 0.92;
  rig.torso.rotation.set(-0.06 * raise, 0, 0);
  rig.head.rotation.set(-0.1 * raise, 0, 0);
  rig.rightArm.rotation.set(-0.2 - raise * 2.7, 0, -0.12 * raise);
  rig.rightForearm.rotation.x = -0.2 * (1 - raise);
  rig.leftArm.rotation.set(-0.15, 0, 0.2);
  rig.leftForearm.rotation.x = -0.5;
  rig.leftLeg.rotation.set(0, 0, 0.04);
  rig.rightLeg.rotation.set(0, 0, -0.04 + Math.sin(t * 2) * 0.02);
  rig.leftShin.rotation.x = 0;
  rig.rightShin.rotation.x = 0;
}

/** Elleriyle yön gösteren teknik direktör jesti */
export function poseCoach(rig: CharacterRig, t: number) {
  const g = Math.sin(t * 1.7);
  rig.root.rotation.set(0, 0, 0);
  rig.root.position.y = 0;
  rig.hips.position.y = 0.92 + Math.sin(t * 2.4) * 0.012;
  rig.torso.rotation.set(0.03, g * 0.1, 0);
  rig.head.rotation.set(-0.04, g * 0.16, 0);
  rig.rightArm.rotation.set(-0.55 - Math.max(0, g) * 0.85, 0, -0.28);
  rig.rightForearm.rotation.x = -0.35 - Math.max(0, g) * 0.4;
  rig.leftArm.rotation.set(-0.12, 0, 0.22);
  rig.leftForearm.rotation.x = -0.55;
  rig.leftLeg.rotation.set(0.03, 0, 0.03);
  rig.rightLeg.rotation.set(-0.03, 0, -0.03);
  rig.leftShin.rotation.x = 0;
  rig.rightShin.rotation.x = 0;
}

/** Küçük bir kart düzlemi (hakemin eline takılır) */
export function makeCardMesh(color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.16),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color), side: THREE.DoubleSide, roughness: 0.55 })
  );
  mesh.position.set(0, -0.36, 0.03);
  return mesh;
}
