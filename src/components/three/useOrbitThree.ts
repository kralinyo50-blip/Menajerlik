import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface OrbitSceneLike {
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
    /** Kameranın yükselebileceği en dik açı (iç mekanlarda tavanı delmemek için) */
    maxPhi?: number;
  };
  sky: string;
  fog?: [string, number, number];
}

export interface OrbitThreeState {
  hostRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
  failed: boolean;
  /** Kamerayı varsayılan açıya döndürür */
  resetCamera: () => void;
}

/**
 * WebGL renderer + kendi orbit kontrolümüz + animasyon döngüsü.
 * Hayat sahneleri (spor salonu, ev, şehir, stüdyo) için ortak altyapı.
 */
export function useOrbitThree(
  build: () => OrbitSceneLike,
  deps: unknown[],
  opts: { height: number; cinematic?: boolean; interactive?: boolean } = { height: 320 }
): OrbitThreeState {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const resetRef = useRef<() => void>(() => {});
  const cinematicRef = useRef(opts.cinematic ?? false);
  const interactiveRef = useRef(opts.interactive ?? true);
  cinematicRef.current = opts.cinematic ?? false;
  interactiveRef.current = opts.interactive ?? true;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }

    const height = opts.height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth || 640, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = `${height}px`;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.borderRadius = '14px';
    renderer.domElement.style.touchAction = 'none';
    host.appendChild(renderer.domElement);

    const bundle = build();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bundle.sky);
    if (bundle.fog) scene.fog = new THREE.Fog(new THREE.Color(bundle.fog[0]).getHex(), bundle.fog[1], bundle.fog[2]);
    scene.add(bundle.group);

    const cam = bundle.camera;
    const target = new THREE.Vector3(cam.targetX ?? 0, cam.targetY, cam.targetZ ?? 0);
    const spherical = new THREE.Spherical(cam.radius, cam.phi, cam.theta);
    const minRadius = Math.max(1.6, cam.radius * 0.32);
    const maxRadius = cam.radius * 3.2;
    const camera = new THREE.PerspectiveCamera(cam.fov ?? 45, (host.clientWidth || 640) / height, 0.1, cam.radius * 40);

    const applyCamera = () => {
      camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(target));
      camera.lookAt(target);
    };
    const resetCamera = () => {
      spherical.radius = cam.radius;
      spherical.phi = cam.phi;
      spherical.theta = cam.theta;
      applyCamera();
    };
    resetRef.current = resetCamera;
    applyCamera();

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinch = 0;
    const el = renderer.domElement;

    const onDown = (e: PointerEvent) => {
      if (!interactiveRef.current) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      spherical.theta -= dx * 0.006;
      spherical.phi = Math.max(0.2, Math.min(cam.maxPhi ?? 1.45, spherical.phi - dy * 0.004));
      applyCamera();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      if (!interactiveRef.current) return;
      e.preventDefault();
      spherical.radius = Math.max(minRadius, Math.min(maxRadius, spherical.radius + e.deltaY * (cam.radius / 700)));
      applyCamera();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch > 0) {
        spherical.radius = Math.max(minRadius, Math.min(maxRadius, spherical.radius * (pinch / dist)));
        applyCamera();
      }
      pinch = dist;
    };
    const onTouchEnd = () => { pinch = 0; };
    const onDblClick = () => resetCamera();

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('dblclick', onDblClick);

    const onResize = () => {
      const w = host.clientWidth || 640;
      renderer.setSize(w, height, false);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(host);

    setReady(true);
    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.getElapsedTime();
      if (cinematicRef.current && !dragging) {
        spherical.theta += dt * 0.16;
        applyCamera();
      }
      bundle.update(t, dt);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('dblclick', onDblClick);
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
      });
      bundle.group.clear();
      renderer.dispose();
      if (el.parentNode === host) host.removeChild(el);
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { hostRef, ready, failed, resetCamera: () => resetRef.current() };
}
