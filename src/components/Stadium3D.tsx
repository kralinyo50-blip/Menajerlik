import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { StadiumDesign } from '../types/game';
import { buildStadiumGroup } from './stadium/scene';
import { isBackgroundRenderPaused } from '../utils/renderGate';
import { isSoftwareWebGL } from '../utils/webgl';

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
}

/**
 * WebGL ile 3D stadyum görüntüleyici.
 * Kendi orbit kontrolü: sürükle = döndür, tekerlek/pinch = yakınlaştır, çift tık = sıfırla.
 */
export const Stadium3D: React.FC<Stadium3DProps> = ({
  design, capacity, logo, sponsorText, night = false, cinematic = false, height = 420, className = '', crowdIntensity = 50, wet = false, teamName = 'STADYUM'
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    let bundle = buildStadiumGroup(design, { capacity, logo, sponsorText, teamName, night: nightRef.current, wet: wetRef.current });
    scene.add(bundle.group);
    // Gökyüzü: prosedürel gradyan dokusu (yoksa düz renk)
    scene.background = bundle.skyTexture ?? new THREE.Color(bundle.sky);
    // Sis rengini gökyüzünün ufuk tonuna eşitle → ufukta dikiş görünmez
    scene.fog = new THREE.Fog(nightRef.current ? 0x22314e : 0xd9eaf7, baseRadius * 1.35, baseRadius * 3.4);
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
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      // 🏟️ Maç ekranı açıkken (veya sekme arkadayken) GPU'yu yorma — kareyi atla
      if (isBackgroundRenderPaused() || document.hidden) return;
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

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

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
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
      });
      bundle.group.clear();
      // Sahne arka planı olarak kullanılan gökyüzü dokusunu da serbest bırak
      bundle.skyTexture?.dispose();
      renderer.dispose();
      // WebGL bağlamını hemen terk et — GPU belleği GC'yi beklemesin
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      void bundle;
      setReady(false);
    };
  }, [design, capacity, logo, sponsorText, teamName, height, night, wet]);

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
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-300 text-sm animate-pulse">🏟️ Stadyum yükleniyor…</span>
        </div>
      )}
    </div>
  );
};
