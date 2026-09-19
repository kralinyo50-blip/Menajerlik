import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { LiveMatch } from '../types/online';
import { isSoftwareWebGL } from '../utils/webgl';

const HOME = '#38bdf8', AWAY = '#fb7185';

/** Both renderers consume exactly the same server positions; neither rolls a match RNG. */
export function OnlineMatchPitch({ match, connected }: { match: LiveMatch; connected: boolean }) {
  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const [failed, setFailed] = useState(false);
  const snapshot = useRef(match);
  snapshot.current = match;
  const host = useRef<HTMLDivElement>(null);
  const cameraMode = useRef<'broadcast' | 'sideline'>('broadcast');
  const [camera, setCamera] = useState<'broadcast' | 'sideline'>('broadcast');
  cameraMode.current = camera;

  useEffect(() => {
    if (mode !== '3d' || failed || !host.current) return;
    const element = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    } catch { setFailed(true); setMode('2d'); return; }
    renderer.setPixelRatio(isSoftwareWebGL() ? 0.65 : Math.min(1.25, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1729');
    scene.fog = new THREE.Fog('#0b1729', 125, 230);
    const cam = new THREE.PerspectiveCamera(48, 1, 0.1, 260);
    scene.add(new THREE.HemisphereLight('#d8f1ff', '#142918', 2.5));
    const sun = new THREE.DirectionalLight('#fff7e5', 2.4); sun.position.set(-25, 70, 25); scene.add(sun);
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const mat = (color: string) => { const m = new THREE.MeshLambertMaterial({ color }); materials.push(m); return m; };
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const g = new THREE.BoxGeometry(w, h, d); geometries.push(g);
      const mesh = new THREE.Mesh(g, material); mesh.position.set(x, y, z); scene.add(mesh); return mesh;
    };
    const turf = mat('#197446'), turf2 = mat('#21854c'), white = mat('#d3e5df'), concrete = mat('#263b50');
    box(117, 0.5, 80, 0, -0.4, 0, turf);
    for (let i = 0; i < 10; i++) box(10.5, 0.03, 68, -47.25 + i * 10.5, -0.1, 0, i % 2 ? turf : turf2);
    const line = (points: number[][]) => {
      const g = new THREE.BufferGeometry().setFromPoints(points.map(([x,z]) => new THREE.Vector3(x, 0.03, z)));
      const m = new THREE.LineBasicMaterial({ color: '#d3e5df' }); geometries.push(g); materials.push(m); scene.add(new THREE.Line(g, m));
    };
    line([[-52.5,-34],[52.5,-34],[52.5,34],[-52.5,34],[-52.5,-34]]);
    line([[0,-34],[0,34]]);
    line(Array.from({ length: 65 }, (_, i) => [Math.cos(i / 64 * Math.PI * 2) * 9.15, Math.sin(i / 64 * Math.PI * 2) * 9.15]));
    for (const sign of [-1, 1]) {
      line([[sign*52.5,-20],[sign*36,-20],[sign*36,20],[sign*52.5,20]]);
      line([[sign*52.5,-9],[sign*47,-9],[sign*47,9],[sign*52.5,9]]);
      box(.15,2.44,.15,sign*52.6,1.22,-3.66,white); box(.15,2.44,.15,sign*52.6,1.22,3.66,white);
      box(.15,.15,7.5,sign*52.6,2.44,0,white);
      for (let net = -3; net <= 3; net++) box(2,.04,.04,sign*53.6,.2,net,white);
      for (let tier = 0; tier < 5; tier++) {
        box(112,2,3,0,1+tier*2,sign*(40+tier*3),tier % 2 ? concrete : mat(sign === -1 ? '#235778' : '#793d57'));
        box(3,2,78,sign*(59+tier*3),1+tier*2,0,concrete);
      }
    }
    const actorGeo = new THREE.CylinderGeometry(.55,.43,1.5,8); geometries.push(actorGeo);
    const headGeo = new THREE.SphereGeometry(.34,8,6); geometries.push(headGeo);
    const limbGeo = new THREE.BoxGeometry(.25,.9,.3); geometries.push(limbGeo);
    const homeMat = mat(HOME), awayMat = mat(AWAY), keeperMat = mat('#fbbf24'), skinMat = mat('#d9a878'), shortsMat = mat('#182238');
    const actors = new Map<string, { group: THREE.Group; left: THREE.Mesh; right: THREE.Mesh }>();
    // Stable slots: substitutions replace the footballer in the authoritative slot.
    for (const side of ['home','away']) for (let i = 0; i < 11; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(actorGeo, i === 0 ? keeperMat : side === 'home' ? homeMat : awayMat); body.position.y = 1.4; group.add(body);
      const head = new THREE.Mesh(headGeo, skinMat); head.position.y = 2.5; group.add(head);
      const left = new THREE.Mesh(limbGeo, shortsMat), right = new THREE.Mesh(limbGeo, shortsMat);
      left.position.set(-.23,.5,0); right.position.set(.23,.5,0); group.add(left,right);
      scene.add(group); actors.set(`${side}:${i+1}`, { group, left, right });
    }
    const ballGeo = new THREE.SphereGeometry(.36,12,8); geometries.push(ballGeo);
    const ball = new THREE.Mesh(ballGeo, white); scene.add(ball);
    const resize = () => {
      const w = Math.max(240, element.clientWidth), h = Math.max(220, element.clientHeight);
      renderer.setSize(w,h,false); cam.aspect = w/h; cam.updateProjectionMatrix();
    };
    element.appendChild(renderer.domElement); resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    const lost = (e: Event) => { e.preventDefault(); setFailed(true); setMode('2d'); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    let raf = 0, frame = -1, receivedAt = 0, previous = snapshot.current, current = snapshot.current;
    let previousRender = 0, slowFrames = 0;
    const animate = (time: number) => {
      if (time - previousRender < 32) { raf = requestAnimationFrame(animate); return; }
      if (frame !== snapshot.current.frame) {
        previous = current; current = snapshot.current; frame = current.frame; receivedAt = time;
        if (Math.abs(current.elapsedMs - previous.elapsedMs) > 5000) previous = current;
      }
      const alpha = Math.min(1, (time - receivedAt) / 450);
      const lerp = (a: number, b: number) => a + (b-a)*alpha;
      for (const a of actors.values()) a.group.visible = false;
      for (const p of current.players) {
        const a = actors.get(`${p.side}:${p.number}`)!;
        const prev = previous.players.find(q => q.side === p.side && q.number === p.number) || p;
        a.group.visible = true;
        a.group.position.set((lerp(prev.x,p.x)-50)*1.05,0,(lerp(prev.y,p.y)-50)*.68);
        a.group.rotation.y = p.side === 'home' ? Math.PI/2 : -Math.PI/2;
        const gait = Math.sin(lerp(previous.elapsedMs,current.elapsedMs)/130 + p.number) * .45;
        a.left.rotation.x = gait; a.right.rotation.x = -gait;
      }
      ball.position.set((lerp(previous.ball.x,current.ball.x)-50)*1.05,.38+lerp(previous.ball.z,current.ball.z),(lerp(previous.ball.y,current.ball.y)-50)*.68);
      if (cameraMode.current === 'broadcast') cam.position.set(0,82,78);
      else cam.position.set(-18,17,53);
      cam.lookAt(0,0,0);
      renderer.render(scene,cam);
      if (previousRender && time-previousRender > 180 && !document.hidden) slowFrames++; else slowFrames = Math.max(0,slowFrames-1);
      previousRender = time;
      if (slowFrames > 15) { setFailed(true); setMode('2d'); return; }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost',lost);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [match.id, mode, failed]);

  return <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950" data-testid="live-pitch" data-frame={match.frame}>
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
      <div className="flex gap-3"><span className="text-sky-300">● {match.home.name} (EV)</span><span className="text-rose-300">● {match.away.name} (DEP)</span></div>
      <div className="flex gap-2">
        {mode === '3d' && <button className="text-slate-300 px-2 py-1 rounded bg-slate-800" onClick={() => setCamera(camera === 'broadcast' ? 'sideline' : 'broadcast')}>{camera === 'broadcast' ? 'Kenar kamerası' : 'Yayın kamerası'}</button>}
        <button className="text-emerald-300 px-2 py-1 rounded bg-slate-800" onClick={() => { setFailed(false); setMode(mode === '3d' ? '2d' : '3d'); }}>{mode === '3d' ? '2D saha' : '3D saha'}</button>
      </div>
    </div>
    {mode === '3d' && !failed ? <div ref={host} className="w-full h-[260px] sm:h-[420px]" aria-label="Sunucuyla senkronize canlı 3D saha" /> : <svg viewBox="-5 -5 110 78" className="w-full max-h-[420px]" role="img" aria-label="Sunucuyla senkronize canlı 2D saha">
      <rect x="-5" y="-5" width="110" height="78" fill="#17643c" />
      {Array.from({length:10},(_,i) => <rect key={i} x={i*10} y="0" width="10" height="68" fill={i%2 ? '#197544' : '#20844b'} />)}
      <g stroke="#cae8db" strokeWidth=".3" fill="none"><rect width="100" height="68" /><path d="M50 0V68M0 14H16V54H0M100 14H84V54H100M0 25H5V43H0M100 25H95V43H100" /><circle cx="50" cy="34" r="9" /></g>
      {match.players.map(p => <g key={`${p.side}-${p.number}`} style={{transform:`translate(${p.x}px, ${p.y*.68}px)`,transition:'transform 450ms linear'}}><circle r="1.7" fill={p.number === 1 ? '#fbbf24' : p.side === 'home' ? HOME : AWAY} stroke="#0f172a" strokeWidth=".4" /><text textAnchor="middle" dy=".6" fill="#0f172a" fontSize="1.8" fontWeight="bold">{p.number}</text></g>)}
      <circle cx={match.ball.x} cy={match.ball.y*.68} r=".9" fill="white" stroke="#0f172a" strokeWidth=".25" />
    </svg>}
    <p className={`px-3 py-2 text-[11px] ${connected ? 'text-slate-500' : 'text-amber-300'}`}>{connected ? 'Aynı saha, aynı top: konumlar sunucudan gelir. Kamera seçimi sadece sana özeldir.' : 'Bağlantı kesildi — son saha karesi gösteriliyor, yerel maç hesaplanmıyor.'}{failed && ' Cihaz için 2D görünüme geçildi.'}</p>
  </div>;
}
