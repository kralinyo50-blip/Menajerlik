import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, MatchEvent, Player, StadiumDesign, Weather } from '../types/game';
import { FORMATIONS, WEATHER_INFO } from '../data/constants';
import { stadiumCapacity } from '../utils/stadium';
import { isSoftwareWebGL } from '../utils/webgl';
import { buildMatchScene, Match3DInput, ShapeSlot, Side } from './match3d/scene';
import { awayVenue, hashText, homeVenue, kitFrom, opponentKit, Venue } from './match3d/venue';

export type MatchCameraMode = 'manager' | 'broadcast';

export interface Match3DProps {
  gameState: GameState;
  opponent: { name: string; logo: string };
  /** Kullanıcı kendi sahasında mı? (ev = oyuncunun tasarladığı stadyum) */
  userIsHome: boolean;
  weather: Weather;
  minute: number;
  /** Kullanıcının top hakimiyeti (0-100) */
  possession: number;
  phase: string;
  scoreUser: number;
  scoreOpp: number;
  lineup: Player[];
  /** Sahada kalan kullanıcı oyuncusu sayısı (kart/sakatlık sonrası) */
  userOnPitch: number;
  oppOnPitch: number;
  events: MatchEvent[];
  paused: boolean;
  slowMo: boolean;
  lowPerf?: boolean;
  /** WebGL açılamazsa 2D sahaya dön */
  onFallback?: () => void;
  className?: string;
}

/** Forma numaraları: rol sırasına göre dağıtılır */
const NUMBERS_BY_ROLE: Record<string, number[]> = {
  KL: [1], STP: [4, 5], SB: [2, 3], OS: [6, 8, 10], FW: [9, 11, 7]
};

/** Oyuncu listesinden 3D diziliş (2D yüzde konumlar + forma no) */
function shapeFromLineup(list: Player[]): ShapeSlot[] {
  const used: Record<string, number> = {};
  const slots: ShapeSlot[] = [];
  list.slice(0, 11).forEach(p => {
    const role = NUMBERS_BY_ROLE[p.role] ? p.role : 'OS';
    const pool = NUMBERS_BY_ROLE[role];
    const idx = used[role] ?? 0;
    used[role] = idx + 1;
    slots.push({
      t: typeof p.t === 'number' ? p.t : 50,
      l: typeof p.l === 'number' ? p.l : 50,
      n: pool[idx % pool.length],
      name: p.name
    });
  });
  while (slots.length < 11) slots.push({ t: 50, l: 50, n: slots.length + 1 });
  // Kaleci 1 numarayı alır ve kendi kalesine sabitlenir
  const gkIdx = slots.findIndex(s => s.n === 1);
  if (gkIdx > 0) { const tmp = slots[0]; slots[0] = slots[gkIdx]; slots[gkIdx] = tmp; }
  slots[0].t = Math.max(slots[0].t, 86);
  return slots;
}

/** Rakip için deterministik diziliş (rakip adına göre aynı kalır) */
function shapeFromFormation(key: string): ShapeSlot[] {
  const keys = Object.keys(FORMATIONS);
  const f = FORMATIONS[key] ?? FORMATIONS[keys[hashText(key) % keys.length]];
  const nums: Record<string, number[]> = { KL: [1], SB: [2, 3], STP: [4, 5], OS: [6, 8, 10], FW: [7, 9, 11] };
  const used: Record<string, number> = {};
  return f.map(slot => {
    const pool = nums[slot.r] ?? [6, 8, 10];
    const i = used[slot.r] ?? 0;
    used[slot.r] = i + 1;
    return { t: slot.t, l: slot.l, n: pool[i % pool.length] };
  });
}

/**
 * 🎥 3D maç simülasyonu — kamera teknik direktörlerin durduğu kenarda.
 * Ev maçlarında oyuncunun kendi stadyumu, deplasmanda rakibe özgü rastgele statlar.
 * Sahne bir kez kurulur; dakika/skor/olaylar her frame içeri verilir (yeniden kurulum yok).
 */
export const Match3D: React.FC<Match3DProps> = ({
  gameState, opponent, userIsHome, weather, minute, possession, phase,
  scoreUser, scoreOpp, lineup, userOnPitch, oppOnPitch, events,
  paused, slowMo, lowPerf = false, onFallback, className = ''
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [camMode, setCamMode] = useState<MatchCameraMode>('manager');
  const [hud, setHud] = useState({ min: 0, sh: 0, sa: 0, poss: 50 });
  const camModeRef = useRef<MatchCameraMode>(camMode);
  camModeRef.current = camMode;
  const lookRef = useRef({ yaw: 0, pitch: 0, zoom: 1 });
  const fallbackRef = useRef(onFallback);
  fallbackRef.current = onFallback;

  /* ── Stat: ev = oyuncunun tasarımı, deplasman = rakibe özgü rastgele ── */
  const designSig = JSON.stringify(gameState.stadium?.design ?? {});
  const venue = useMemo<Venue>(() => {
    const design: StadiumDesign = JSON.parse(designSig) as StadiumDesign;
    const evening = hashText(`${opponent.name}|${gameState.season}|${gameState.week}`) % 10 < 5;
    if (userIsHome) {
      return homeVenue({
        teamName: gameState.teamName,
        design,
        capacity: stadiumCapacity(gameState),
        night: evening
      });
    }
    return awayVenue(opponent.name, gameState.season * 31 + gameState.week);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designSig, userIsHome, opponent.name, gameState.season, gameState.week, gameState.teamName, gameState.stadiumLvl]);
  const venueKey = useMemo(
    () => `${userIsHome ? 'H' : 'A'}|${venue.name}|${venue.capacity}|${venue.night}|${designSig}`,
    [venue, userIsHome, designSig]
  );

  /* ── Formalar: kullanıcı kulüp renginden, rakip deterministik ── */
  const kits = useMemo(() => {
    const design = venue.design;
    const userKit = kitFrom(design.seatColor, design.accentColor, hashText(gameState.teamName), undefined);
    const oppKit = userIsHome
      ? opponentKit(opponent.name, gameState.season, userKit.shirt)
      : venue.kit;
    return userIsHome ? { home: userKit, away: oppKit } : { home: oppKit, away: userKit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueKey, gameState.teamName, userIsHome, opponent.name, gameState.season]);

  /* ── Kadrolar ── */
  const homeShape = useMemo<ShapeSlot[]>(
    () => (userIsHome ? shapeFromLineup(lineup) : shapeFromFormation(opponent.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [venueKey, userIsHome, opponent.name]
  );
  const awayShape = useMemo<ShapeSlot[]>(
    () => (userIsHome ? shapeFromFormation(opponent.name) : shapeFromLineup(lineup)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [venueKey, userIsHome, opponent.name]
  );

  /* ── Canlı girdi: her frame okunur, sahneyi yeniden kurdurmaz ── */
  const inputRef = useRef<Match3DInput>({
    phase: 'pre', minute: 0, possession: 50, timeScale: 0, scoreHome: 0, scoreAway: 0,
    homeOnPitch: 11, awayOnPitch: 11, energy: 80, event: null
  });

  const sceneSideUser: Side = userIsHome ? 'home' : 'away';
  const sceneSideOpp: Side = userIsHome ? 'away' : 'home';

  // Son önemli olay → 3D senaryosu (gol, şut, kart, sakatlık, değişiklik…)
  const lastEvent = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (!['goal', 'chance', 'save', 'card', 'injury', 'substitution', 'foul'].includes(ev.type)) continue;
      let side: Side = ev.team === 'home' ? sceneSideUser : sceneSideOpp;
      let type = ev.type;
      // "Savunma araya girdi" → kurtaran kullanıcı, şutu çeken rakip
      if (ev.type === 'save' && /savunma araya girdi|boşa çıktı/i.test(ev.description)) side = sceneSideOpp;
      if (/penaltı|penalti/i.test(ev.description) && (ev.type === 'chance' || ev.type === 'save' || ev.type === 'goal')) type = 'penalty';
      return { key: i, type, team: side, minute: ev.minute, text: ev.description };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, sceneSideUser, sceneSideOpp]);

  inputRef.current = {
    phase,
    minute,
    possession: userIsHome ? possession : 100 - possession,
    // ⏸️ dondurulduysa 0 → sahne tamamen durur; 🐢 yavaş çekim → 0.3
    timeScale: paused ? 0 : slowMo ? 0.3 : 1,
    scoreHome: userIsHome ? scoreUser : scoreOpp,
    scoreAway: userIsHome ? scoreOpp : scoreUser,
    homeOnPitch: userIsHome ? userOnPitch : oppOnPitch,
    awayOnPitch: userIsHome ? oppOnPitch : userOnPitch,
    energy: Math.max(28, (lineup.reduce((a, p) => a + (p.energy ?? 70), 0) / Math.max(1, lineup.length)) * (1 - minute / 170)),
    event: lastEvent
  };

  /* ── Sahne kurulumu (yalnızca stat/hava/perf değişince) ── */
  useEffect(() => {
    const host = hostRef.current;
    if (!host || failed) return;
    // 🩺 Yazılımsal WebGL (SwiftShader/llvmpipe) tespiti: bu cihazlarda ağır sahne
    // ana thread'i saniyelerce kilitler → sayfa donar/çöker. Tespit edilirse sahne
    // baştan düşük kaliteyle kurulur; yine kaldırmazsa aşağıdaki bekçi 2D'ye düşer.
    const softGl = isSoftwareWebGL();
    const perf = lowPerf || softGl;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !perf, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      fallbackRef.current?.();
      return;
    }

    const width = Math.max(320, host.clientWidth);
    const height = Math.max(240, host.clientHeight);
    // Piksel oranı: 1.25 üstü bu sahne boyutunda göz farkı yaratmaz, GPU'yu gereksiz şişirir
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf ? 1 : 1.25));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = venue.night ? 0.92 : 1.04;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bundle = buildMatchScene({
      venue,
      homeKit: kits.home,
      awayKit: kits.away,
      weather,
      night: venue.night,
      lowPerf: perf,
      homeShape,
      awayShape,
      homeName: userIsHome ? gameState.teamName : opponent.name,
      awayName: userIsHome ? opponent.name : gameState.teamName,
      sponsorText: gameState.activeSponsor
        ? `${gameState.activeSponsor.name.toUpperCase()} • RESMİ SPONSOR • `
        : `${gameState.teamName.toUpperCase()} • RESMİ SPONSOR • `,
      logo: userIsHome ? gameState.teamLogo : opponent.logo
    });
    scene.add(bundle.group);
    // Eğik açıda çim/tribün dokuları keskin kalsın
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    scene.traverse(o => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const std = m as THREE.MeshStandardMaterial;
        [std.map, std.emissiveMap].forEach(tex => {
          if (tex) { tex.anisotropy = Math.min(8, maxAniso); tex.needsUpdate = true; }
        });
      });
    });
    // 🩺 Gölge haritasını makula indir: 2048² PCFSoft pişirme zayıf GPU'da sayfayı
    // kilitler. Statik sahneye 512/1024 görsel olarak yeter, bellek/dolgu maliyeti 4-16× azalır.
    // (İlk render'dan ÖNCE ayarlanmalı — harita ilk karede bu boyutta tahsis edilir.)
    const shadowRes = perf ? 512 : 1024;
    scene.traverse(o => {
      const light = o as THREE.DirectionalLight;
      if (light.isDirectionalLight && light.castShadow) light.shadow.mapSize.set(shadowRes, shadowRes);
    });
    if (bundle.skyTexture) scene.background = bundle.skyTexture;
    else scene.background = new THREE.Color(bundle.sky);
    if (bundle.fog) scene.fog = new THREE.Fog(bundle.fog[0], bundle.fog[1], bundle.fog[2]);

    const camera = new THREE.PerspectiveCamera(bundle.cam.fov, width / height, 0.35, 900);
    camera.position.copy(bundle.cam.position);
    camera.lookAt(bundle.cam.target);

    // Gölgeler bir kez pişirilir (stadyum statik) → kare başına gölge maliyeti yok.
    // Pişirme, kurulumu kilitlememesi için İLK ANİMASYON KARESİ'nde olur (aşağıda).
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;

    /* — etkileşim: sürükle = etrafa bak, tekerlek = yakınlaştır, çift tık = sıfırla — */
    /** Bekçi/context-kaybı sonrası çift geçişi önler (tek seferlik 2D düşüş) */
    const fellBackRef = { current: false };
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      el.style.cursor = 'grabbing';
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      lookRef.current.yaw = Math.max(-1.05, Math.min(1.05, lookRef.current.yaw - dx * 0.0042));
      lookRef.current.pitch = Math.max(-0.32, Math.min(0.42, lookRef.current.pitch - dy * 0.0026));
    };
    const onUp = () => { dragging = false; el.style.cursor = 'grab'; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      lookRef.current.zoom = Math.max(0.55, Math.min(1.8, lookRef.current.zoom + e.deltaY * 0.0011));
    };
    const onDbl = () => { lookRef.current.yaw = 0; lookRef.current.pitch = 0; lookRef.current.zoom = 1; };
    // 🧯 GPU context kaybolduğunda (zayıf GPU'da bellek baskısı) stadyum donuk karede
    // kalakalır. preventDefault + otomatik 2D geçiş ile maç sorunsuz devam eder.
    const onCtxLost = (e: Event) => {
      e.preventDefault();
      if (!fellBackRef.current) {
        fellBackRef.current = true;
        setFailed(true);
        fallbackRef.current?.();
      }
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('dblclick', onDbl);
    el.addEventListener('webglcontextlost', onCtxLost);

    const ro = new ResizeObserver(() => {
      const w = Math.max(320, host.clientWidth);
      const h = Math.max(240, host.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(host);

    let raf = 0;
    let prev = performance.now();
    let hudT = 0;
    let readyShown = false;
    // 🩺 Kare süresi bekçisi: kurulduktan sonraki ilk 6 saniyede ortalama kare süresi
    // 350 ms'yi aşarsa (yazılımsal WebGL / çok zayıf GPU) 3D yerine sorunsuz çalışan
    // 2D sahaya otomatik geçilir — maç asla donup kalmaz. İlk pişirmede yavaşlayıp
    // sonra rahatlayan cihazlar affedilir (bekçi kare sayısına da bakar).
    const guardStart = performance.now();
    let guardFrames = 0;
    let guardDone = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (document.hidden) return;            // sekme arka planda → GPU'yu yorma

      bundle.setCameraMode(camModeRef.current);
      bundle.update(now / 1000, dt, inputRef.current);

      const look = lookRef.current;
      camera.position.copy(bundle.cam.position);
      camera.fov = Math.max(18, Math.min(95, bundle.cam.fov * look.zoom));
      camera.updateProjectionMatrix();
      camera.lookAt(bundle.cam.target);
      if (look.yaw || look.pitch) {
        camera.rotateY(look.yaw);
        camera.rotateX(look.pitch);
      }
      renderer.render(scene, camera);

      // İlk kare başarıyla çizildi → "Stadyum hazırlanıyor…" perdesini kaldır
      if (!readyShown) { readyShown = true; setReady(true); }

      if (!guardDone) {
        guardFrames++;
        if (guardFrames > 150) {
          guardDone = true;                   // 150 kareyi gördüyse makul sayılır
        } else if (now - guardStart > 6000) {
          guardDone = true;
          const avgMs = (now - guardStart) / Math.max(1, guardFrames);
          if (avgMs > 350 && !fellBackRef.current) {
            fellBackRef.current = true;
            setFailed(true);
            fallbackRef.current?.();          // 🎬 2D sahaya otomatik geç
          }
        }
      }

      hudT += dt;
      if (hudT > 0.25) {
        hudT = 0;
        const inp = inputRef.current;
        setHud(h => (h.min === inp.minute && h.sh === inp.scoreHome && h.sa === inp.scoreAway && h.poss === inp.possession)
          ? h
          : { min: inp.minute, sh: inp.scoreHome, sa: inp.scoreAway, poss: inp.possession });
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('dblclick', onDbl);
      el.removeEventListener('webglcontextlost', onCtxLost);
      bundle.dispose();
      scene.remove(bundle.group);
      // 🧹 GPU kaynaklarını TAM bırak: geometri + materyaller (dokular bundle.dispose'ta).
      // Eskiden yalnızca birkaç doku serbest bırakılıyordu; her maç yüzlerce MB'lik yeni
      // bir WebGL bağlamı açıyor, eskiler GC'yi beklerken birikip GPU sürecini
      // çökertebiliyordu ("birkaç maç sonrası sekme çökmesi").
      bundle.group.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
      });
      bundle.group.clear();
      bundle.skyTexture?.dispose();
      renderer.dispose();
      // Bağlamı hemen terk et — GC'ye güvenip GPU belleğinde bekleme
      renderer.forceContextLoss();
      if (el.parentElement) el.parentElement.removeChild(el);
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueKey, weather, lowPerf, failed]);

  if (failed) {
    return (
      <div className={`rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 text-center text-xs text-slate-400 ${className}`}>
        🖥️ Bu cihazda 3D maç açılamadı.
        {onFallback && (
          <button onClick={onFallback} className="ml-2 px-2 py-1 rounded bg-slate-700 text-white font-bold">2D Sahaya Dön</button>
        )}
      </div>
    );
  }

  const wInfo = WEATHER_INFO[weather] ?? { icon: '☀️', label: 'Açık' };
  const homeName = userIsHome ? gameState.teamName : opponent.name;
  const awayName = userIsHome ? opponent.name : gameState.teamName;
  const homeLogo = userIsHome ? gameState.teamLogo : opponent.logo;
  const awayLogo = userIsHome ? opponent.logo : gameState.teamLogo;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${className}`}>
      <div ref={hostRef} className="relative w-full h-full min-h-[300px]" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-slate-300 text-xs font-bold">
          <span className="animate-pulse">🏟️ Stadyum hazırlanıyor…</span>
        </div>
      )}

      {/* Üst şerit: stat bilgisi + kamera modu */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 pointer-events-none">
        <div className="pointer-events-auto rounded-lg bg-black/55 backdrop-blur px-2 py-1 border border-white/10">
          <div className="text-[11px] font-black text-white leading-tight flex items-center gap-1">
            🏟️ {venue.name}
            {venue.night && <span className="text-[9px] px-1 rounded bg-indigo-500/40 text-indigo-100">GECE</span>}
            {userIsHome
              ? <span className="text-[9px] px-1 rounded bg-emerald-500/30 text-emerald-200">EVİN</span>
              : <span className="text-[9px] px-1 rounded bg-amber-500/30 text-amber-200">DEPLASMAN</span>}
          </div>
          <div className="text-[9px] text-slate-300 leading-tight">
            {venue.city} • {venue.capacity.toLocaleString()} kapasite • {wInfo.icon} {wInfo.label}
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-1">
          <button
            onClick={() => setCamMode('manager')}
            title="Teknik direktörün durduğu yerden izle"
            className={`px-2 py-1 rounded text-[10px] font-black border transition-all ${
              camMode === 'manager' ? 'bg-emerald-500 text-slate-950 border-emerald-300' : 'bg-black/55 text-white/80 border-white/10 hover:bg-black/75'
            }`}
          >
            🧑‍💼 MENAJER
          </button>
          <button
            onClick={() => setCamMode('broadcast')}
            title="Yüksek yayın kamerası"
            className={`px-2 py-1 rounded text-[10px] font-black border transition-all ${
              camMode === 'broadcast' ? 'bg-sky-500 text-slate-950 border-sky-300' : 'bg-black/55 text-white/80 border-white/10 hover:bg-black/75'
            }`}
          >
            📺 YAYIN
          </button>
          {onFallback && (
            <button
              onClick={onFallback}
              title="3D yerine 2D canlı saha"
              className="px-2 py-1 rounded text-[10px] font-black bg-black/55 text-white/70 border border-white/10 hover:bg-black/75"
            >
              2D
            </button>
          )}
        </div>
      </div>

      {/* Donmuş / yavaş çekim rozeti */}
      {(paused || slowMo) && (
        <div className={`absolute left-1/2 top-12 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black shadow-lg whitespace-nowrap ${paused ? 'bg-sky-500 text-white' : 'bg-amber-400 text-black'}`}>
          {paused ? '⏸️ DONDURULDU — sahne bekliyor' : '🐢 YAVAŞ ÇEKİM'}
        </div>
      )}

      {/* Alt şerit: skor + dakika + top hakimiyeti */}
      <div className="absolute inset-x-0 bottom-0 p-2 pointer-events-none">
        <div className="mx-auto max-w-md rounded-lg bg-black/60 backdrop-blur px-2 py-1.5 border border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-base">{homeLogo}</span>
              <span className="text-[10px] font-black text-white truncate">{homeName}</span>
              {userIsHome && <span className="text-[8px] px-1 rounded bg-emerald-500/30 text-emerald-200">SEN</span>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-lg font-black text-white leading-none">{hud.sh}</span>
              <span className="text-[10px] font-black text-amber-300 bg-black/50 px-1.5 py-0.5 rounded">
                {String(Math.round(hud.min)).padStart(2, '0')}&#39;
              </span>
              <span className="text-lg font-black text-white leading-none">{hud.sa}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0 justify-end">
              {!userIsHome && <span className="text-[8px] px-1 rounded bg-emerald-500/30 text-emerald-200">SEN</span>}
              <span className="text-[10px] font-black text-white truncate">{awayName}</span>
              <span className="text-base">{awayLogo}</span>
            </div>
          </div>
          <div className="mt-1 h-1 w-full rounded-full overflow-hidden bg-red-500/70 flex">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${hud.poss}%` }} />
          </div>
          <div className="flex items-center justify-between text-[8px] font-bold text-slate-300 mt-0.5">
            <span>%{Math.round(hud.poss)} {userIsHome ? homeName : awayName}</span>
            <span className="text-slate-400">🖱️ sürükle: bak • tekerlek: zoom • çift tık: sıfırla</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Match3D;
