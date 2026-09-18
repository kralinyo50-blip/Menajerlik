import * as THREE from 'three';

/* ══════════════════════════════════════════════════════════════
   SAHNE IŞIKLANDIRMA YARDIMCILARI

   three.js (r155+) ışıkları "fiziksel" birimlerle çalışır:
   • Yönlü ışık (güneş) şiddeti ≈ yüzeye düşen aydınlanma (E ~ 1 = tam aydınlık yüzey)
   • Nokta/spot ışık şiddeti candela; aydınlanma      E = I / d^decay
     (decay = 2 → ters kare yasası, d = lambanın yüzeye uzaklığı)

   Bu yüzden nokta ışıklara sabit bir sayı yazmak yanıltıcıdır: aynı şiddet, lamba
   uzaklaştıkça (büyük stadyum, yüksek direk) aniden söner. Değerler mutlaka
   "hedef aydınlanma + mesafe" üzerinden hesaplanmalıdır.

   ⚠️ Bu projede gece projektörleri eskiden elle yazılmış sabit değerlerle
   (78000 / 28000 / 22000 ...) kuruluyordu. Bu sayılar üç katmanlı bir hatanın
   ürünüydü: 4π kat fazla şiddet → gece maçlarında saha bembeyaz yanıyordu.
   Aşağıdaki yardımcılar bu hatayı yapısal olarak imkânsız kılar.
   ══════════════════════════════════════════════════════════════ */

/**
 * Hedef aydınlanmayı (E) verecek nokta ışık şiddetini hesaplar.
 *
 * @param targetIrradiance Lambanın aydınlattığı yüzeyde istenen aydınlanma
 *                        (1.0 ≈ güneşli gündüz seviyesi; 0.4-0.9 ≈ gece projektörü)
 * @param distance        Lamba ile aydınlatılan nokta arasındaki mesafe (m)
 * @param decay           three.js ışık sönüm katsayısı (2 = fiziksel ters kare)
 */
export function pointLightPower(targetIrradiance: number, distance: number, decay = 2): number {
  return targetIrradiance * Math.pow(Math.max(distance, 1), decay);
}

/**
 * Sahnedeki gece ışıklarını tek yerden kurmak için küçük bir tanım.
 * (Konum + şiddet aynı nesnede durur; hem sahne hem önizleme aracı bunu okur.)
 */
export interface NightLightSpec {
  x: number;
  y: number;
  z: number;
  /** three.js nokta ışık şiddeti (candela) — pointLightPower() ile hesaplayın */
  intensity: number;
  /** Sönümün tamamen bittiği mesafe (ışık penceresi) */
  distance: number;
  decay: number;
  color: number;
}

/** Tanımdan gerçek THREE.PointLight üretir. */
export function makePointLight(spec: NightLightSpec): THREE.PointLight {
  const light = new THREE.PointLight(spec.color, spec.intensity, spec.distance, spec.decay);
  light.position.set(spec.x, spec.y, spec.z);
  return light;
}

/**
 * Projektör kulesi tanımı — ışık sahaya yönlendirilir (konik hüzme).
 * Böylece tribünler hüzmenin dışında kalır: gece maçında saha aydınlık,
 * tribün normal seviyede kalır (projektörün "stadyumu yıkaması" önlenir).
 */
export interface NightSpotSpec extends NightLightSpec {
  /** Işık hedefi (genelde saha merkezi) */
  target: { x: number; y: number; z: number };
  /** Koninin yarı açısı (radyan) */
  angle: number;
  /** Koninin kenar yumuşaklığı (0-1) */
  penumbra: number;
}

/** Tanımdan gerçek THREE.SpotLight üretir (hedefi gruba ekler). */
export function makeSpotLight(spec: NightSpotSpec): THREE.SpotLight {
  const light = new THREE.SpotLight(spec.color, spec.intensity, spec.distance, spec.angle, spec.penumbra, spec.decay);
  light.position.set(spec.x, spec.y, spec.z);
  light.target.position.set(spec.target.x, spec.target.y, spec.target.z);
  return light;
}
