import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { LiveMatch } from '../types/online';
import { isSoftwareWebGL } from '../utils/webgl';

const HOME = '#38bdf8', AWAY = '#fb7185';
const RESTART_LABELS: Record<string, string> = {
  kickoff: 'Santra', 'throw-in': 'Taç atışı', corner: 'Korner', 'goal-kick': 'Kale vuruşu',
  'free-kick': 'Serbest vuruş', penalty: 'Penaltı',
};
const ACTION_LABELS: Record<string, string> = {
  shoot: 'şut', pass: 'pas', header: 'kafa', dive: 'kurtarış', rush: 'ileri çıkış', tackle: 'müdahale',
  press: 'baskı', control: 'kontrol', dribble: 'sürüş', sprint: 'depar',
};

/**
 * Ortak canlı saha: 2D ve 3D izleyiciler sunucunun gönderdiği aynı kareyi çizer.
 * İstemci hiçbir zaman maç simülasyonu yapmaz; top, oyuncu yönleri, şut, kaleci
 * kurtarışı ve duran top bilgisi sunucudan gelir.
 */
export function OnlineMatchPitch({ match, connected }: { match: LiveMatch; connected: boolean }) {
  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const [failed, setFailed] = useState(false);
  const [camera, setCamera] = useState<'broadcast' | 'sideline'>('broadcast');
  const [banner, setBanner] = useState<{ text: string; kind: 'goal' | 'save' } | null>(null);
  const snapshot = useRef(match);
  snapshot.current = match;
  const cameraMode = useRef<'broadcast' | 'sideline'>('broadcast');
  cameraMode.current = camera;
  const host = useRef<HTMLDivElement>(null);
  const lastEvent = useRef(0);

  // Gol ve kurtarış anları sahada bağırır: skorbord dışında görsel geri bildirim.
  useEffect(() => {
    const fresh = match.events.filter(e => e.id > lastEvent.current);
    lastEvent.current = match.eventSeq;
    const goal = fresh.find(e => e.type === 'goal');
    const save = fresh.find(e => e.type === 'save');
    if (goal) setBanner({ text: `GOL! ${goal.text.replace(/^GOL!\s*/, '')}`, kind: 'goal' });
    else if (save) setBanner({ text: `🧤 ${save.text}`, kind: 'save' });
  }, [match.eventSeq, match.events]);
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), banner.kind === 'goal' ? 4200 : 2600);
    return () => clearTimeout(timer);
  }, [banner]);

  const carrier = match.players.find(p => p.id === match.carrierId) ?? null;
  const carrierName = carrier ? match[carrier.side].lineup.find(p => p.id === carrier.id)?.name ?? '' : '';
  const restartLabel = match.restart ? RESTART_LABELS[match.restart.type] ?? 'Duran top' : null;
  const home = match.home, away = match.away;

  /* ------------------------------- 3D saha ------------------------------- */
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
    const line = (points: number[][], color = '#d3e5df') => {
      const g = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.03, z)));
      const m = new THREE.LineBasicMaterial({ color }); geometries.push(g); materials.push(m);
      const ln = new THREE.Line(g, m); scene.add(ln); return ln;
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
    const armGeo = new THREE.BoxGeometry(.2,.75,.22); geometries.push(armGeo);
    const homeMat = mat(HOME), awayMat = mat(AWAY), keeperMat = mat('#fbbf24'), skinMat = mat('#d9a878'), shortsMat = mat('#182238'), armMat = mat('#e6d3bd');
    type Actor = { group: THREE.Group; body: THREE.Mesh; left: THREE.Mesh; right: THREE.Mesh; armL: THREE.Mesh; armR: THREE.Mesh };
    const actors = new Map<string, Actor>();
    // Sabit slotlar: oyuncu değişikliği sahadaki futbolcuyu değiştirir, aktör yerinde kalır.
    for (const side of ['home', 'away'] as const) for (let i = 0; i < 11; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(actorGeo, i === 0 ? keeperMat : side === 'home' ? homeMat : awayMat); body.position.y = 1.4; group.add(body);
      const head = new THREE.Mesh(headGeo, skinMat); head.position.y = 2.5; group.add(head);
      const left = new THREE.Mesh(limbGeo, shortsMat), right = new THREE.Mesh(limbGeo, shortsMat);
      left.position.set(-.23,.5,0); right.position.set(.23,.5,0); group.add(left,right);
      const armL = new THREE.Mesh(armGeo, armMat), armR = new THREE.Mesh(armGeo, armMat);
      armL.position.set(-.62,1.55,0); armR.position.set(.62,1.55,0); group.add(armL, armR);
      scene.add(group); actors.set(`${side}:${i + 1}`, { group, body, left, right, armL, armR });
    }
    const ringGeo = new THREE.RingGeometry(.85, 1.15, 20); geometries.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.85, side: THREE.DoubleSide }); materials.push(ringMat);
    const carrierRing = new THREE.Mesh(ringGeo, ringMat); carrierRing.rotation.x = -Math.PI / 2; carrierRing.position.y = 0.06; scene.add(carrierRing);
    const restartRing = new THREE.Mesh(ringGeo, mat('#f97316')); restartRing.rotation.x = -Math.PI / 2; restartRing.position.y = 0.05; restartRing.visible = false; scene.add(restartRing);
    const ballGeo = new THREE.SphereGeometry(.36,12,8); geometries.push(ballGeo);
    const ball = new THREE.Mesh(ballGeo, white); scene.add(ball);
    const shadowGeo = new THREE.CircleGeometry(.4, 12); geometries.push(shadowGeo);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: '#0b1729', transparent: true, opacity: 0.35 })); materials.push(shadow.material as THREE.Material);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; scene.add(shadow);
    // Şut izi: topun son konumlarından oluşan kuyruk.
    const trailCount = 16;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3)); geometries.push(trailGeo);
    const trailMat = new THREE.LineBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.8 }); materials.push(trailMat);
    const trail = new THREE.Line(trailGeo, trailMat); trail.visible = false; scene.add(trail);
    const resize = () => {
      const w = Math.max(240, element.clientWidth), h = Math.max(220, element.clientHeight);
      renderer.setSize(w,h,false); cam.aspect = w/h; cam.updateProjectionMatrix();
    };
    element.appendChild(renderer.domElement); resize();
    const observer = new ResizeObserver(resize); observer.observe(element);
    const lost = (e: Event) => { e.preventDefault(); setFailed(true); setMode('2d'); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const toWorldX = (x: number) => (x - 50) * 1.05;
    const toWorldZ = (y: number) => (y - 50) * 0.68;
    const positions = trailPositions;
    let raf = 0, frame = -1, receivedAt = 0, previous = snapshot.current, current = snapshot.current;
    let previousRender = 0, slowFrames = 0, serverClock = 0;
    const trailPoints: THREE.Vector3[] = [];
    const animate = (time: number) => {
      if (time - previousRender < 32) { raf = requestAnimationFrame(animate); return; }
      if (frame !== snapshot.current.frame) {
        previous = current; current = snapshot.current; frame = current.frame; receivedAt = time;
        // İstemci kendi saatini işletmez: sunucudan gelen maç zamanı yumuşatılır.
        if (Math.abs(current.elapsedMs - previous.elapsedMs) > 5000) previous = current;
      }
      const alpha = Math.min(1, (time - receivedAt) / 450);
      const lerp = (a: number, b: number) => a + (b-a)*alpha;
      serverClock = lerp(previous.elapsedMs, current.elapsedMs);
      for (const a of actors.values()) a.group.visible = false;
      const celebrateSide = current.celebrating ? (current.events.slice(-6).reverse().find(e => e.type === 'goal')?.team ?? null) : null;
      for (const p of current.players) {
        if (p.sentOff) continue;
        const a = actors.get(`${p.side}:${p.number}`);
        if (!a) continue;
        const prev = previous.players.find(q => q.side === p.side && q.number === p.number) || p;
        const x = lerp(prev.x, p.x), y = lerp(prev.y, p.y);
        const vx = lerp(prev.vx ?? 0, p.vx ?? 0), vy = lerp(prev.vy ?? 0, p.vy ?? 0);
        const speed = Math.hypot(vx, vy);
        a.group.visible = true;
        a.group.position.set(toWorldX(x), 0, toWorldZ(y));
        // Yön: koşarken hıza, dururken sunucunun verdiği yöne göre.
        const faceX = speed > 1.4 ? vx * 1.05 : Math.cos(p.facing ?? 0) * 1.05;
        const faceZ = speed > 1.4 ? vy * 0.68 : Math.sin(p.facing ?? 0) * 0.68;
        a.group.rotation.y = Math.atan2(faceX, faceZ);
        a.group.rotation.z = 0;
        const gaitSpeed = Math.max(2, speed) * 1.4;
        const gait = Math.sin(serverClock / 1000 * gaitSpeed + p.number) * Math.min(0.75, 0.12 + speed * 0.09);
        a.left.rotation.x = gait; a.right.rotation.x = -gait;
        a.armL.rotation.x = -gait * 0.7; a.armR.rotation.x = gait * 0.7;
        if (p.action === 'dive') {
          // Kaleci köşeye uzanır.
          const diveSide = (vx * (p.side === 'home' ? -1 : 1)) < 0 ? 1 : -1;
          a.group.rotation.z = diveSide * 1.25;
          a.group.position.y = -0.35;
          a.armL.rotation.x = -2.2; a.armR.rotation.x = -2.2;
        } else if (p.action === 'shoot' || p.action === 'pass') {
          a.right.rotation.x = -1.5; a.armL.rotation.x = -0.9;
        } else if (celebrateSide === p.side) {
          // Gol sevinci: kollar havada, zıplayarak.
          const hop = Math.abs(Math.sin(time / 180 + p.number)) * 0.55;
          a.group.position.y = hop;
          a.armL.rotation.x = -2.6; a.armR.rotation.x = -2.6;
        }
      }
      const ballX = lerp(previous.ball.x, current.ball.x);
      const ballY = lerp(previous.ball.y, current.ball.y);
      const ballZ = Math.max(0, lerp(previous.ball.z ?? 0, current.ball.z ?? 0));
      ball.position.set(toWorldX(ballX), 0.38 + ballZ, toWorldZ(ballY));
      ball.rotation.x += 0.25; ball.rotation.z += 0.12;
      shadow.position.set(toWorldX(ballX), 0.05, toWorldZ(ballY));
      const shadowScale = Math.max(0.55, 1 - ballZ * 0.12);
      shadow.scale.set(shadowScale, shadowScale, shadowScale);
      const ballSpeed = Math.hypot(current.ball.vx ?? 0, current.ball.vy ?? 0);
      if (current.ball.shot || ballSpeed > 13) {
        trailPoints.push(new THREE.Vector3(toWorldX(ballX), 0.4 + ballZ, toWorldZ(ballY)));
        if (trailPoints.length > trailCount) trailPoints.shift();
        for (let i = 0; i < trailCount; i++) {
          const point = trailPoints[Math.min(i, trailPoints.length - 1)] ?? trailPoints[0];
          positions[i * 3] = point.x; positions[i * 3 + 1] = point.y; positions[i * 3 + 2] = point.z;
        }
        trailGeo.attributes.position.needsUpdate = true;
        trail.visible = trailPoints.length > 1;
      } else {
        trail.visible = false; trailPoints.length = 0;
      }
      const carrierFrame = current.players.find(p => p.id === current.carrierId);
      carrierRing.visible = !!carrierFrame && !current.celebrating;
      if (carrierFrame) carrierRing.position.set(toWorldX(carrierFrame.x), 0.06, toWorldZ(carrierFrame.y));
      if (current.restart) {
        restartRing.visible = true;
        restartRing.position.set(toWorldX(current.restart.x), 0.05, toWorldZ(current.restart.y));
        const pulse = 1 + Math.sin(time / 220) * 0.18;
        restartRing.scale.set(pulse, pulse, pulse);
      } else restartRing.visible = false;
      if (cameraMode.current === 'broadcast') {
        // Top oyunun olduğu yere doğru hafifçe kayar: yayın kamerası hissi.
        cam.position.set(toWorldX(ballX) * 0.45, 82, 78);
      } else {
        cam.position.set(toWorldX(ballX) * 0.7 - 18, 17, 53);
      }
      cam.lookAt(toWorldX(ballX) * 0.6, 0, toWorldZ(ballY) * 0.5);
      if (current.celebrating) cam.position.y += Math.sin(time / 90) * 0.6;
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

  /* ------------------------------- 2D saha ------------------------------- */
  const shotTrail = match.ball.shot
    ? (() => {
        const { x, y, vx, vy } = match.ball;
        const len = Math.hypot(vx, vy) || 1;
        const back = Math.min(14, len * 0.35);
        return { x1: x - (vx / len) * back, y1: y - (vy / len) * back, x2: x, y2: y };
      })()
    : null;

  const stat = (label: string, h: number, a: number) => (
    <div key={label} className="text-center">
      <span className="block text-white font-bold tabular-nums">{h} – {a}</span>{label}
    </div>
  );

  return <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950" data-testid="live-pitch" data-frame={match.frame}>
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
      <div className="flex flex-wrap gap-3">
        <span className="text-sky-300">● {match.home.name} (EV)</span>
        <span className="text-rose-300">● {match.away.name} (DEP)</span>
        {(restartLabel || carrierName) && <span className="text-slate-400">
          {restartLabel ? `⏱ ${restartLabel} — ${match.restart?.side === 'home' ? match.home.name : match.away.name}` : `⚽ ${carrierName} ${carrier ? ACTION_LABELS[carrier.action] ?? 'topla oynuyor' : ''}`}
        </span>}
      </div>
      <div className="flex gap-2">
        {mode === '3d' && <button className="text-slate-300 px-2 py-1 rounded bg-slate-800" onClick={() => setCamera(camera === 'broadcast' ? 'sideline' : 'broadcast')}>{camera === 'broadcast' ? 'Kenar kamerası' : 'Yayın kamerası'}</button>}
        <button className="text-emerald-300 px-2 py-1 rounded bg-slate-800" onClick={() => { setFailed(false); setMode(mode === '3d' ? '2d' : '3d'); }}>{mode === '3d' ? '2D saha' : '3D saha'}</button>
      </div>
    </div>
    <div className="relative">
      {mode === '3d' && !failed ? <div ref={host} className="w-full h-[260px] sm:h-[420px]" aria-label="Sunucuyla senkronize canlı 3D saha" /> : <svg viewBox="-5 -5 110 78" className="w-full max-h-[420px]" role="img" aria-label="Sunucuyla senkronize canlı 2D saha">
        <rect x="-5" y="-5" width="110" height="78" fill="#17643c" />
        {Array.from({length:10},(_,i) => <rect key={i} x={i*10} y="0" width="10" height="68" fill={i%2 ? '#197544' : '#20844b'} />)}
        <g stroke="#cae8db" strokeWidth=".3" fill="none"><rect width="100" height="68" /><path d="M50 0V68M0 14H16V54H0M100 14H84V54H100M0 25H5V43H0M100 25H95V43H100" /><circle cx="50" cy="34" r="9" /></g>
        {match.restart && <g>
          <circle cx={match.restart.x} cy={match.restart.y * 0.68} r="2.6" fill="none" stroke="#fb923c" strokeWidth=".4" strokeDasharray="1 1" />
          <text x={match.restart.x} y={match.restart.y * 0.68 - 3.4} textAnchor="middle" fill="#fdba74" fontSize="2.2">{RESTART_LABELS[match.restart.type] ?? 'Duran top'}</text>
        </g>}
        {shotTrail && <line x1={shotTrail.x1} y1={shotTrail.y1 * 0.68} x2={shotTrail.x2} y2={shotTrail.y2 * 0.68} stroke="#fde047" strokeWidth=".5" strokeDasharray="1.4 1.1" />}
        {match.players.filter(p => !p.sentOff).map(p => {
          const isCarrier = p.id === match.carrierId;
          const speed = Math.hypot(p.vx ?? 0, p.vy ?? 0);
          const dirX = speed > 1.4 ? p.vx / speed : Math.cos(p.facing ?? 0);
          const dirY = speed > 1.4 ? p.vy / speed : Math.sin(p.facing ?? 0);
          return <g key={`${p.side}-${p.number}`} style={{transform:`translate(${p.x}px, ${p.y*0.68}px)`,transition:'transform 450ms linear'}}>
            {isCarrier && <circle r="2.6" fill="none" stroke="#fde047" strokeWidth=".45" />}
            {(p.action === 'dive' || p.action === 'shoot') && <circle r="2.2" fill="none" stroke="#f97316" strokeWidth=".35" strokeDasharray="1 0.8" />}
            <line x1={dirX * 1.4} y1={dirY * 1.4} x2={dirX * 2.6} y2={dirY * 2.6} stroke="#e2e8f0" strokeWidth=".28" />
            <circle r="1.7" fill={p.number === 1 ? '#fbbf24' : p.side === 'home' ? HOME : AWAY} stroke="#0f172a" strokeWidth=".4" />
            <text textAnchor="middle" dy=".6" fill="#0f172a" fontSize="1.8" fontWeight="bold">{p.number}</text>
          </g>;
        })}
        {(match.ball.z ?? 0) > 0.2 && <circle cx={match.ball.x} cy={match.ball.y * 0.68 + match.ball.z * 0.4} r=".8" fill="#0b1729" opacity=".35" />}
        <g style={{transform:`translate(${match.ball.x}px, ${match.ball.y*0.68}px) translateY(${-(match.ball.z ?? 0) * 0.45}px)`,transition:'transform 450ms linear'}}>
          <circle r={0.8 + Math.min(0.6, (match.ball.z ?? 0) * 0.12)} fill="white" stroke="#0f172a" strokeWidth=".25" />
        </g>
      </svg>}
      {banner && <div className={`absolute inset-x-0 top-6 mx-auto w-fit px-5 py-2 rounded-xl text-lg font-black shadow-lg ${banner.kind === 'goal' ? 'bg-emerald-500 text-slate-950 animate-pulse' : 'bg-slate-900/85 text-emerald-200 border border-emerald-400/40'}`}>
        {banner.text}
      </div>}
      {match.celebrating && <div className="absolute inset-0 pointer-events-none bg-emerald-400/10" />}
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 px-3 pt-3 text-[11px] text-slate-400">
      {stat('Topa sahip olma', match.possession, 100 - match.possession)}
      {stat('Şut / isabet', home.stats.shots, away.stats.shots)}
      {stat('Kurtarış', home.stats.saves, away.stats.saves)}
      {stat('Korner', home.stats.corners, away.stats.corners)}
      {stat('Faul', home.stats.fouls, away.stats.fouls)}
      {stat('Kart', home.stats.yellow + home.stats.red, away.stats.yellow + away.stats.red)}
    </div>
    <p className={`px-3 py-2 text-[11px] ${connected ? 'text-slate-500' : 'text-amber-300'}`}>{connected
      ? 'Aynı saha, aynı top: konumlar, şutlar ve kurtarışlar sunucudaki maç motorundan gelir. Kamera seçimi sadece sana özeldir.'
      : 'Bağlantı kesildi — son saha karesi gösteriliyor, yerel maç hesaplanmıyor.'}{failed && ' Cihaz için 2D görünüme geçildi.'}</p>
  </div>;
}
