import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { StadiumDesign } from '../types/game';
import { buildStadiumGroup } from './stadium/scene';
import { isBackgroundRenderPaused } from '../utils/renderGate';
import { isSoftwareWebGL } from '../utils/webgl';

/** Stadyum 3D izleyicinin dışarıdan kumandası (kamera ön ayarları) */
export interface StadiumViewerApi {
  focusPreset: (preset: 'overview' | 'plaza' | 'pitch') => void;
}

interface Stadium3DProps {
  design: StadiumDesign;
  capacity: number;
  logo?: string;
  sponsorText?: string;
  /** Gece modu — projektörler yanar */
  night?: boolean;
  /** Sinematik mod: kamera yavaşça döner */
  cinematic?: boolean;
  /** Sahne yüksekliği (px) */
  height?: number;
  className?: string;
  /** Tribün doluluğu 0-100 — bayrak dalgalanma hızını etkiler */
  crowdIntensity?: number;
  /** Yağmur yağıyor ve çatı korumuyor → zemin ıslak / parlak */
  wet?: boolean;
  /** Kulüp adı — skorbord ve giriş tabelasında görünür */
  teamName?: string;
  /** İç tesis seviyeleri (büfe, mağaza, otopark …) — 3D'de görünür */
  facilities?: Record<string, number>;
  /** 🍔 Büfe marka sponsoru — kulübe tabelaları ve marka panosu bu markanın olur */
  buffetBrand?: { name: string; color: string; ink?: string; icon?: string } | null;
  /** Ön izlenen / yeni alınan tesis — 3D'de halka + ışık sütunu ile işaretlenir */
  highlightFacility?: string | null;
  /** İşaretin üstünde görünen etiket (ör. "🍔 Büfe • Seviye 3 ön izleme") */
  previewLabel?: string | null;
  /** Kamera ön ayarı — sahne kurulduğunda uygulanır */
  initialView?: 'overview' | 'plaza' | 'pitch';
  /** Izleyici kumandası: tab buradan kamerayı istediği noktaya çevirir */
  viewerApi?: React.MutableRefObject<StadiumViewerApi | null>;
}

/** Tesis işareti için canvas'tan metin etiketi üretir (sprite) */
function makeLabelSprite(text: string, accent = '#fbbf24'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  if (ctx) {
    ctx.fillStyle = 'rgba(2,6,23,0.82)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    const r = 26;
    ctx.beginPath();
    ctx.moveTo(12 + r, 14);
    ctx.lineTo(628 - r, 14);
    ctx.quadraticCurveTo(628, 14, 628, 14 + r);
    ctx.lineTo(628, 114 - r);
    ctx.quadraticCurveTo(628, 114, 628 - r, 114);
    ctx.lineTo(12 + r, 114);
    ctx.quadraticCurveTo(12, 114, 12, 114 - r);
    ctx.lineTo(12, 14 + r);
    ctx.quadraticCurveTo(12, 14, 12 + r, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 56px Inter, Segoe UI, sans-serif';
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 34), 320, 67);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    sprite.material.map = tex;
    sprite.material.needsUpdate = true;
  }
  sprite.scale.set(30, 6, 1);
  return sprite;
}

/**
 * WebGL ile 3D stadyum görüntüleyici.
 * Kendi orbit kontrolü: sürükle = döndür, tekerlek/pinch = yakınlaştır, çift tık = sıfırla.
 * İç tesisler (büfe, mağaza, otopark…) tesis seviyelerine göre sahneye eklenir; ön izleme
 * yapılan tesis halka + ışık sütunu ile işaretlenir ve kamera oraya bakar.
 */
export const Stadium3D: React.FC<Stadium3DProps> = ({
  design, capacity, logo, sponsorText, night = false, cinematic = false, height = 420, className = '',
  crowdIntensity = 50, wet = false, teamName = 'STADYUM', facilities, highlightFacility = null, previewLabel = null,
  initialView = 'overview', viewerApi, buffetBrand = null,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const nightRef = useRef(night);
  const cinematicRef = useRef(cinematic);
  const crowdRef = useRef(crowdIntensity);
  const wetRef = useRef(wet);
  nightRef.current = night;
  cinematicRef.current = cinematic;
  crowdRef.current = crowdIntensity;
  wetRef.current = wet;

  const viewRef = useRef(initialView);
  viewRef.current = initialView;

  /** Tesis imzası — seviye değişince sahne yeniden kurulur (büfe satın alınınca görünür) */
  const facilityKey = useMemo(() => {
    if (!facilities) return '';
    return Object.keys(facilities).sort().map(k => `${k}:${facilities[k] ?? 0}`).join(',');
  }, [facilities]);
  /** Marka imzası — sponsor değişince tabelalar yeniden çizilir */
  const brandKey = buffetBrand ? `${buffetBrand.name}|${buffetBrand.color}` : '';

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      // Yazılımsal WebGL'de antialias + yüksek piksel oranı sayfayı kilitler — kıs
      const soft = isSoftwareWebGL();
      renderer = new THREE.WebGLRenderer({ antialias: !soft, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, soft ? 1 : 2));
    } catch {
      setFailed(true);
      return;
    }
    renderer.setSize(mount.clientWidth || 640, height, false);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Geceyi bembeyaz yapmaması için pozlamayı kıs — gece daha loş, gündüz canlı
    renderer.toneMappingExposure = nightRef.current ? 0.88 : 1.02;
    // ⚠️ PCFSoftShadowMap r186'da kaldırıldı (three.js konsola uyarı basıyor) → PCFShadowMap
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = `${height}px`;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.borderRadius = '14px';
    renderer.domElement.style.touchAction = 'none';
    mount.appendChild(renderer.domElement);

    // Kamera mesafesi stadyumun büyüklüğüne göre ölçeklenir (küçük stadyumda içeri girmeyiz)
    const rows = Math.max(4, Math.min(30, Math.round(capacity / 1600)));
    const span = 105 + rows * 4.6;
    const baseRadius = Math.max(165, span * 1.3);
    const minRadius = Math.max(120, span * 0.85);
    const maxRadius = span * 2.6;
    const targetY = Math.max(6, rows * 1.1);

    const scene = new THREE.Scene();
    const skyColor = nightRef.current ? 0x0a102a : 0x7fb2e5;
    scene.background = new THREE.Color(skyColor);
    // Gece sisi daha koyu ve yakın — bembeyaz pus olmayacak
    scene.fog = new THREE.Fog(skyColor, baseRadius * 1.35, baseRadius * 3.4);

    const camera = new THREE.PerspectiveCamera(46, (mount.clientWidth || 640) / height, 0.6, baseRadius * 7);

    /* ── Orbit kontrolü (harici kütüphane yok) ── */
    const target = new THREE.Vector3(0, targetY, 0);
    const spherical = new THREE.Spherical(baseRadius, 0.98, 0.85);
    const applyCamera = () => {
      const pos = new THREE.Vector3().setFromSpherical(spherical).add(target);
      camera.position.copy(pos);
      camera.lookAt(target);
    };
    applyCamera();

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      spherical.theta -= dx * 0.006;
      spherical.phi = Math.max(0.18, Math.min(1.5, spherical.phi - dy * 0.004));
      applyCamera();
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(minRadius, Math.min(maxRadius, spherical.radius + e.deltaY * (baseRadius / 800)));
      applyCamera();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (pinchDist > 0) {
          spherical.radius = Math.max(minRadius, Math.min(maxRadius, spherical.radius * (pinchDist / dist)));
          applyCamera();
        }
        pinchDist = dist;
      }
    };
    const onTouchEnd = () => { pinchDist = 0; };
    const onDoubleClick = () => {
      spherical.radius = baseRadius;
      spherical.phi = 0.98;
      spherical.theta = 0.85;
      applyCamera();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);

    /* ── Sahne ── */
    const bundle = buildStadiumGroup(design, {
      capacity, logo, sponsorText, teamName, night: nightRef.current, wet: wetRef.current,
      facilities: facilities as any,
      buffetBrand: buffetBrand ?? null,
    });
    scene.add(bundle.group);
    // Gökyüzü: prosedürel gradyan dokusu (yoksa düz renk)
    scene.background = bundle.skyTexture ?? new THREE.Color(bundle.sky);
    // Sis rengini gökyüzünün ufuk tonuna eşitle → ufukta dikiş görünmez
    scene.fog = new THREE.Fog(nightRef.current ? 0x22314e : 0xd9eaf7, baseRadius * 1.35, baseRadius * 3.4);

    /* ── Kamera ön ayarları: Genel / Çarşı (büfeler) / Saha ── */
    const applyPreset = (preset: 'overview' | 'plaza' | 'pitch') => {
      const anchor = preset === 'plaza' ? bundle.anchors.plaza : preset === 'pitch' ? bundle.anchors.pitch : { x: 0, y: targetY, z: 0 };
      target.set(anchor.x, anchor.y, anchor.z);
      if (preset === 'overview') {
        spherical.radius = baseRadius; spherical.phi = 0.98; spherical.theta = 0.85;
      } else if (preset === 'plaza') {
        // Taraftar çarşısı: alçak ve yakın açı — büfe kulübeleri, masalar, mağaza görünür
        spherical.radius = Math.max(minRadius, baseRadius * 0.62); spherical.phi = 1.02; spherical.theta = 0.7;
      } else {
        // Saha: tribünlerin üstünden sahaya bakış
        spherical.radius = Math.max(minRadius, baseRadius * 0.95); spherical.phi = 1.22; spherical.theta = 0.85;
      }
      applyCamera();
    };
    if (viewerApi) viewerApi.current = { focusPreset: applyPreset };
    if (initialView !== 'overview' && !highlightFacility) applyPreset(initialView);

    /* ── Tesisi işaretle: halka + ışık sütunu + etiket + kamera odağı ──
       Ön izlemede satın alınmamış tesisin 3D'de tam olarak nerede olacağını gösterir. */
    const markers: { mesh: THREE.Mesh; baseOpacity: number; kind: 'ring' | 'beam' }[] = [];
    if (highlightFacility) {
      const all = bundle.facilities?.[highlightFacility] ?? [];
      // Halka giriş meydanındaki yapıya çizilir: iç (koridor) ve saha kenarı parçaları
      // sahne boyunca dağıldığı için işaret hesaplanırken dışarıda bırakılır.
      const outdoor = all.filter(o => !o.userData.facilityIndoor && o.userData.facilitySpot !== 'pitchside');
      const use = outdoor.length ? outdoor : all;
      if (use.length) {
        const box = new THREE.Box3();
        use.forEach(o => { o.updateWorldMatrix(true, true); box.expandByObject(o); });
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        // Halka tesisin etrafını sarar ama çarşı gibi uzun dizilerde devleşmez (üst sınır 26 m)
        const radius = Math.min(26, Math.max(5.5, Math.max(size.x, size.z) * 0.55));
        const top = Math.max(6, box.max.y);
        const groundY = Math.max(0.14, box.min.y + 0.14);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius, radius * 1.1, 56),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(center.x, groundY, center.z);
        scene.add(ring);
        markers.push({ mesh: ring, baseOpacity: 0.6, kind: 'ring' });

        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(radius * 0.45, radius * 0.7, top + 26, 24, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xfbbf24, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
            depthWrite: false, blending: THREE.AdditiveBlending,
          })
        );
        beam.position.set(center.x, (top + 26) / 2, center.z);
        scene.add(beam);
        markers.push({ mesh: beam, baseOpacity: 0.14, kind: 'beam' });

        if (previewLabel) {
          const sprite = makeLabelSprite(previewLabel);
          sprite.position.set(center.x, top + 20, center.z);
          scene.add(sprite);
        }

        // Kamerayı tesise çevir: kullanıcı yeni büfeyi/mağazayı hemen görsün
        target.set(center.x, Math.max(3, Math.min(top, size.y * 0.9 + 3)), center.z);
        spherical.phi = Math.min(spherical.phi, 1.05);
        spherical.radius = Math.max(minRadius, Math.min(maxRadius, Math.max(radius * 6, baseRadius * 0.5)));
        applyCamera();
      }
    }
    setReady(true);

    const onResize = () => {
      const w = mount.clientWidth || 640;
      renderer.setSize(w, height, false);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(mount);

    let raf = 0;
    // ⚠️ THREE.Clock r183'te kaldırıldı (konsola deprecation uyarısı basıyor) → THREE.Timer
    const timer = new THREE.Timer();
    if (typeof document !== 'undefined') timer.connect(document);
    timer.reset();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      timer.update();
      // 🏟️ Maç ekranı açıkken (veya sekme arkadayken) GPU'yu yorma — kareyi atla
      if (isBackgroundRenderPaused() || document.hidden) return;
      const t = timer.getElapsed();
      const dt = Math.min(0.05, timer.getDelta());

      if (cinematicRef.current && !dragging) {
        spherical.theta += dt * 0.09;
        applyCamera();
      }

      // Bayraklar dalgalanır — doluluk arttıkça hızlı ve geniş dalga (coşku)
      const intensity = Math.max(0, Math.min(100, crowdRef.current)) / 100; // 0..1
      const flagSpeed = 0.7 + intensity * 1.8; // seyrek 0.7 → dolu 2.5
      const flagAmp = 0.18 + intensity * 0.32; // seyrek 0.18 → dolu 0.5
      bundle.animated.flags.forEach((flag, i) => {
        flag.rotation.y = Math.sin(t * flagSpeed + i * 0.7) * flagAmp;
        // dolu tribünde bayrak biraz daha sallansın + hafif Z eğimi
        flag.rotation.z = Math.sin(t * flagSpeed * 0.7 + i) * intensity * 0.12;
      });
      // LED panolar kayar
      bundle.animated.ledTextures.forEach(tex => {
        tex.offset.x = (tex.offset.x + dt * 0.12) % 1;
      });
      // Projektör parlaklığı hafifçe nefes alır — gece için kısık tutuluyor (bembeyaz önlendi)
      if (nightRef.current) {
        bundle.animated.floodlights.forEach((fl, i) => {
          const mat = (fl as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat && 'emissiveIntensity' in mat) {
            mat.emissiveIntensity = 0.85 + Math.sin(t * 1.2 + i) * 0.18;
          }
        });
      }
      // Tesis işareti nabız gibi atar (halka döner, ışık sütunu nefes alır)
      markers.forEach(({ mesh, baseOpacity, kind }, i) => {
        const pulse = 0.6 + Math.sin(t * 3 + i) * 0.35;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = kind === 'ring' ? baseOpacity * pulse : baseOpacity * (0.6 + pulse * 0.6);
        if (kind === 'ring') mesh.rotation.z = t * 0.35;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      timer.dispose();
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);

      // GPU kaynaklarını serbest bırak
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
        const spriteMap = (obj as THREE.Sprite).material?.map;
        if (spriteMap) spriteMap.dispose();
      });
      bundle.group.clear();
      // Sahne arka planı olarak kullanılan gökyüzü dokusunu da serbest bırak
      bundle.skyTexture?.dispose();
      renderer.dispose();
      if (viewerApi) viewerApi.current = null;
      // WebGL bağlamını hemen terk et — GPU belleği GC'yi beklemesin
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, capacity, logo, sponsorText, teamName, height, night, wet, facilityKey, highlightFacility, brandKey]);

  if (failed) {
    return (
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 text-center" style={{ height }}>
        <div className="text-4xl mb-2">🏟️</div>
        <div className="text-slate-300 text-sm">
          3D görüntüleyici bu cihazda/tarayıcıda açılamadı (WebGL kapalı olabilir).
        </div>
        <div className="text-slate-500 text-xs mt-1">Tasarım seçimlerin yine de maç gelirlerini etkiler.</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mountRef} style={{ height }} className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-700" />
      <div className="absolute bottom-2 left-2 bg-black/55 backdrop-blur px-2.5 py-1.5 rounded-lg text-[10px] text-slate-200 pointer-events-none">
        🖱️ Sürükle: döndür • Tekerlek: yakınlaştır • Çift tık: sıfırla
      </div>
      {highlightFacility && previewLabel && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-3 py-1.5 rounded-full text-[11px] font-black shadow-lg whitespace-nowrap">
          🎯 {previewLabel}
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-300 text-sm animate-pulse">🏟️ Stadyum yükleniyor…</span>
        </div>
      )}
    </div>
  );
};
