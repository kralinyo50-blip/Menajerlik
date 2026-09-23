/**
 * 🎛️ Grafik & Performans merkezi (v5.0)
 *
 * - PC donanımını otomatik algılar (GPU adı, çekirdek sayısı, RAM, yazılımsal WebGL)
 * - Hızlı GPU kıyaslaması (benchmark) ile en uygun kalite profilini önerir
 * - Ayarlar: çözünürlük ölçeği, gölge, anti-alias, tribün yoğunluğu, partiküller,
 *   FPS sınırı ve **Uyarlanabilir Çözünürlük** (fps düşünce render ölçeğini
 *   otomatik kısar; sahne kalitesi/3D modelleri ASLA kısılmaz — sadece piksel sayısı)
 *
 * Tüm 3D sahneler (maç, stadyum, antrenman, hayat) bu ayarları okur.
 */

export type QualityTier = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsSettings {
  tier: QualityTier;
  /** Donanım algılamasını yeniden çalıştır (Ayarlar'daki "PC'imi Tara" düğmesi) */
  autoTuned: boolean;
  /** Render ölçeği: 0.5 (yarım çözünürlük) … 1.5 (keskin) */
  renderScale: number;
  /** Gerçek zamanlı gölge (maçta gölgeler zaten 1 kez pişirilir) */
  shadows: boolean;
  antialias: boolean;
  /** Tribün seyirci yoğunluğu 0.25-1 */
  crowdDensity: number;
  /** Yağmur/kar/konfeti partikülleri */
  particles: boolean;
  /** 0 = sınırsız (VSync), 30 / 60 / 120 = FPS üst sınırı */
  fpsCap: number;
  /** FPS düşünce render ölçeğini otomatik küçült (görüntü netliği hariç hiçbir şey kısılmaz) */
  adaptiveResolution: boolean;
  /** Ekranda FPS göstergesi */
  showFps: boolean;
}

export const TIER_INFO: Record<QualityTier, { label: string; icon: string; desc: string }> = {
  low: { label: 'Düşük', icon: '🪶', desc: 'Zayıf iGPU / çok eski PC için. Akıcılık önce gelir.' },
  medium: { label: 'Orta', icon: '⚙️', desc: 'Intel HD / eski dizüstü için dengeli profil.' },
  high: { label: 'Yüksek', icon: '✨', desc: 'Modern PC. Tam görsel kalite.' },
  ultra: { label: 'Ultra', icon: '💎', desc: 'Güçlü GPU. Maksimum netlik ve detay.' },
};

export const PRESETS: Record<QualityTier, Omit<GraphicsSettings, 'tier' | 'autoTuned'>> = {
  low: { renderScale: 0.7, shadows: false, antialias: false, crowdDensity: 0.3, particles: false, fpsCap: 60, adaptiveResolution: true, showFps: false },
  medium: { renderScale: 1.0, shadows: true, antialias: false, crowdDensity: 0.55, particles: true, fpsCap: 60, adaptiveResolution: true, showFps: false },
  high: { renderScale: 1.25, shadows: true, antialias: true, crowdDensity: 0.8, particles: true, fpsCap: 0, adaptiveResolution: true, showFps: false },
  ultra: { renderScale: 1.5, shadows: true, antialias: true, crowdDensity: 1.0, particles: true, fpsCap: 0, adaptiveResolution: true, showFps: false },
};

const STORAGE_KEY = 'mp26:graphics:v1';

export const defaultGraphics = (tier: QualityTier = 'high'): GraphicsSettings => ({
  tier,
  autoTuned: false,
  ...PRESETS[tier],
});

/* ═══════════ Yükle / kaydet ═══════════ */

let cache: GraphicsSettings | null = null;

export function loadGraphics(): GraphicsSettings {
  if (cache) return cache;
  cache = defaultGraphics();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<GraphicsSettings>;
      cache = { ...cache, ...p, ...PRESETS[(p.tier as QualityTier) || 'high'], tier: (p.tier as QualityTier) || 'high' };
      // Açıkça kaydedilmiş değerler preset üzerine yazılır
      const saved = JSON.parse(raw) as Partial<GraphicsSettings>;
      for (const k of Object.keys(PRESETS.high) as (keyof typeof PRESETS.high)[]) {
        if (saved[k] !== undefined) (cache as any)[k] = saved[k];
      }
    }
  } catch { /* bozuk kayıt — varsayılan */ }
  return cache;
}

export function saveGraphics(s: GraphicsSettings): void {
  cache = s;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* kota dolu */ }
  listeners.forEach(l => l(s));
}

const listeners = new Set<(s: GraphicsSettings) => void>();
export function subscribeGraphics(fn: (s: GraphicsSettings) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function applyTier(tier: QualityTier): GraphicsSettings {
  const next: GraphicsSettings = { ...loadGraphics(), tier, ...PRESETS[tier], autoTuned: false };
  saveGraphics(next);
  return next;
}

/* ═══════════ Donanım algılama ═══════════ */

export interface HardwareInfo {
  gpu: string;
  vendor: string;
  cores: number;
  memoryGB: number | null;
  isMobile: boolean;
  softwareWebGL: boolean;
  webgl2: boolean;
  screenPx: number;
  recommended: QualityTier;
  score: number | null; // benchmark skoru (0-100+), çalıştırılmadıysa null
}

let gpuCache: { gpu: string; vendor: string; webgl2: boolean } | null = null;

export function detectGpu(): { gpu: string; vendor: string; webgl2: boolean } {
  if (gpuCache) return gpuCache;
  gpuCache = { gpu: 'Bilinmiyor', vendor: '—', webgl2: false };
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      gpuCache.webgl2 = !!canvas.getContext('webgl2');
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      gpuCache.gpu = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) ?? 'Bilinmiyor');
      gpuCache.vendor = String(dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR) ?? '—');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch { /* yok */ }
  return gpuCache;
}

/** GPU adından ham güç tahmini — benchmark çalışmadan ön öneri için */
function gpuFamilyScore(gpu: string): number {
  const g = gpu.toLowerCase();
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(g)) return 5;
  // NVIDIA
  if (/rtx\s*(40|50)\d{2}/.test(g)) return 100;
  if (/rtx\s*(20|30)\d{2}/.test(g)) return 88;
  if (/gtx\s*16\d{2}/.test(g)) return 72;
  if (/gtx\s*(10|9)\d{2}/.test(g)) return 62;
  if (/nvidia|geforce/.test(g)) return 60;
  // AMD
  if (/rx\s*(6|7|9)\d{3}/.test(g)) return 85;
  if (/rx\s*5\d{2}/.test(g)) return 60;
  if (/radeon/.test(g)) return 50;
  // Intel iGPU'lar — eski HD grafikler zayıftır (3. nesil i3 ≈ HD 2500/4000)
  if (/uhd graphics (6|7)\d{2}/.test(g)) return 38;
  if (/iris/.test(g)) return 34;
  if (/hd graphics (4|5)\d{3}/.test(g)) return 22;
  if (/hd graphics/.test(g)) return 12;
  if (/apple/.test(g)) return 70;
  return 30;
}

export function detectHardware(): HardwareInfo {
  const { gpu, vendor, webgl2 } = detectGpu();
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
  const memoryGB = (typeof navigator !== 'undefined' && (navigator as any).deviceMemory) || null;
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
  // yazılımsal WebGL kontrolü (webgl.ts ile aynı kaynak)
  const softwareWebGL = /swiftshader|llvmpipe|softpipe|software rasterizer|software webgl|basic render/i.test(`${gpu} ${vendor}`);
  const screenPx = (typeof window !== 'undefined' ? window.innerWidth * (window.devicePixelRatio || 1) * window.innerHeight * (window.devicePixelRatio || 1) : 1e6);

  let score = gpuFamilyScore(gpu);
  // Çok düşük çekirdek sayısı (2) → muhtemelen eski düşük güçlü PC
  if (cores <= 2) score = Math.min(score, 20);
  else if (cores <= 4) score = Math.min(score, 45);
  if (memoryGB !== null && memoryGB <= 4) score = Math.min(score, 30);
  if (isMobile) score = Math.min(score, 45);

  let recommended: QualityTier;
  if (softwareWebGL) recommended = 'low';
  else if (score >= 80) recommended = 'ultra';
  else if (score >= 50) recommended = 'high';
  else if (score >= 22) recommended = 'medium';
  else recommended = 'low';

  return { gpu, vendor, cores, memoryGB, isMobile, softwareWebGL, webgl2, screenPx, recommended, score: null };
}

/* ═══════════ Hızlı GPU benchmark ═══════════ */

/**
 * ~1 saniyelik gerçek render testi: binlerce üçgen + yarı saydam yüzeyler.
 * Ortalama FPS → skor. Ana thread'i kitlemez; 3D açılamazsa null döner.
 */
export function runGpuBenchmark(): Promise<{ fps: number; score: number }> {
  return new Promise(resolve => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 320;
      canvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none';
      document.body.appendChild(canvas);
      // Saf WebGL testi — three'e bağımlılık yok, modül döngüsü yaratmaz
      const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'high-performance' }) as WebGLRenderingContext | null;
      if (!gl) {
        canvas.remove();
        resolve({ fps: 0, score: 0 });
        return;
      }

      // Instanced benzeri ağır sahne: 4000 döner kutu = ~48k üçgen, fill-heavy
      const vs = `
        attribute vec3 aPos; attribute vec3 aColor;
        uniform mat4 uMVP;
        varying vec3 vColor;
        void main(){ vColor=aColor; gl_Position=uMVP*vec4(aPos,1.0); }`;
      const fs = `
        precision mediump float; varying vec3 vColor;
        void main(){ gl_FragColor=vec4(vColor*(0.5+0.5*sin(gl_FragCoord.x*0.05)),1.0); }`;
      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src); gl.compileShader(sh);
        return sh;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      // Küp geometrisi
      const P = 1;
      const cube = new Float32Array([
        -P,-P,-P,  P,-P,-P,  P,P,-P,  -P,-P,-P,  P,P,-P,  -P,P,-P,
        -P,-P, P,  P,-P, P,  P,P, P,  -P,-P, P,  P,P, P,  -P,P, P,
        -P,-P,-P, -P,P,-P, -P,P,P,  -P,-P,-P, -P,P,P, -P,-P,P,
         P,-P,-P,  P,P,-P,  P,P,P,   P,-P,-P,  P,P,P,  P,-P,P,
        -P,-P,-P,  P,-P,-P, P,-P,P,  -P,-P,-P, P,-P,P, -P,-P,P,
        -P,P,-P,   P,P,-P,  P,P,P,   -P,P,-P,  P,P,P,  -P,P,P,
      ]);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, cube, gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

      const COLS = 64, ROWS = 64, COUNT = COLS * ROWS; // 4096 küp
      const colors = new Float32Array(6 * 3 * COUNT);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = (i % 7) / 7; colors[i + 1] = (i % 5) / 5; colors[i + 2] = (i % 11) / 11;
      }
      const cbuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cbuf);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
      const aColor = gl.getAttribLocation(prog, 'aColor');
      gl.enableVertexAttribArray(aColor);
      gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
      // Aynı küpü tüm ızgaraya taşımak için tek MVP + derinlik ile overload:
      // (basitlik için çizim çağrısı başına uniform güncellenir)

      const uMVP = gl.getUniformLocation(prog, 'uMVP');
      gl.enable(gl.DEPTH_TEST);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.05, 0.09, 0.14, 1);

      const proj = (() => {
        const f = 1 / Math.tan(60 * Math.PI / 360);
        const near = 0.1, far = 200, ar = canvas.width / canvas.height;
        return new Float32Array([
          f / ar, 0, 0, 0,
          0, f, 0, 0,
          0, 0, (far + near) / (near - far), -1,
          0, 0, 2 * far * near / (near - far), 0,
        ]);
      })();

      let frames = 0;
      const t0 = performance.now();
      const DURATION = 900;
      const step = (now: number) => {
        const t = now * 0.001;
        // Izgara çizimi — her küp için uniform mat4 (drawArrays 36 vert)
        // 4096 * 36 = 147k vert/kare — eski iGPU için bile ağır ama adil bir test
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(uMVP, false, proj);
        const cos = Math.cos, sin = Math.sin;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const x = (c / COLS - 0.5) * 30 + sin(t + c * 0.3) * 2;
            const y = (r / ROWS - 0.5) * 20 + cos(t + r * 0.25) * 2;
            const z = -((c % 8) * 4 + (r % 8) * 4) - 20;
            // Model matrisini projeye çarpmak yerine pozisyonu MVP'ye ekleyen
            // küçük bir dolap: uniform mat4 yaz + draw
            M_TMP[12] = x; M_TMP[13] = y; M_TMP[14] = z;
            gl.uniformMatrix4fv(uMVP, false, mul(proj, M_TMP));
            gl.drawArrays(gl.TRIANGLES, 0, 36);
          }
        }
        frames++;
        if (now - t0 < DURATION) {
          requestAnimationFrame(step);
        } else {
          const secs = (now - t0) / 1000;
          const fps = frames / secs;
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          canvas.remove();
          const score = Math.max(0, Math.min(140, Math.round(fps * 1.1)));
          resolve({ fps: Math.round(fps), score });
        }
      };
      const M_TMP = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
      ]);
      const mul = (a: Float32Array, b: Float32Array) => {
        const o = new Float32Array(16);
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 4; j++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
            o[i * 4 + j] = s;
          }
        }
        return o;
      };
      requestAnimationFrame(step);
    } catch {
      resolve({ fps: 0, score: 0 });
    }
  });
}

export function scoreToTier(score: number): QualityTier {
  if (score >= 70) return 'ultra';
  if (score >= 35) return 'high';
  if (score >= 12) return 'medium';
  return 'low';
}

/* ═══════════ Render-yardımcıları ═══════════ */

/** Etkili piksel oranı: cihaz DPR × kullanıcı ölçeği, 0.4-2.2 aralığında */
export function effectivePixelRatio(renderScale: number): number {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  return Math.max(0.4, Math.min(2.2, dpr * renderScale));
}

/**
 * FPS sınırı + uyarlanabilir çözünürlük + FPS ölçümü.
 * Her 3D döngüde `gov.tick(now)` çağrılır; false dönerse kare çizilmez.
 */
export class FpsGovernor {
  private lastRender = 0;
  private emaFrame = 16.7;
  private scale = 1;
  private baseScale = 1;
  private downSince = 0;
  private upSince = 0;
  fps = 60;
  /** adaptif kısma devre dışı bırakıldığında bile fps sayar */
  constructor(
    private cap: number,
    private adaptive: boolean,
    private applyScale: (scale: number) => void,
    baseScale = 1
  ) {
    this.scale = baseScale;
    this.baseScale = baseScale;
  }

  /** Ayarlar değiştiğinde çağır */
  configure(cap: number, adaptive: boolean, baseScale: number): void {
    this.cap = cap;
    this.adaptive = adaptive;
    if (baseScale !== this.baseScale) {
      this.baseScale = baseScale;
      this.scale = baseScale;
      this.applyScale(this.scale);
    }
  }

  /** Her kare başında; true → sahneyi çiz */
  tick(now: number): boolean {
    const dt = now - this.lastRender;
    // FPS sınırı: bu kareyi atla
    if (this.cap > 0 && dt < 1000 / this.cap - 0.6) return false;
    if (dt > 0 && dt < 400) {
      this.emaFrame = this.emaFrame * 0.92 + dt * 0.08;
      this.fps = Math.round(1000 / this.emaFrame);
    }
    this.lastRender = now;

    if (this.adaptive) {
      // 45 fps altına 1.5 sn düşerse ölçeği %8 kıs (min 0.5×)
      if (this.fps < 45) {
        if (!this.downSince) this.downSince = now;
        else if (now - this.downSince > 1500 && this.scale > this.baseScale * 0.55) {
          this.scale = Math.max(this.baseScale * 0.55, this.scale * 0.92);
          this.applyScale(this.scale);
          this.downSince = now;
        }
      } else this.downSince = 0;
      // Başa dön: 58+ fps 4 sn sürdüyse ölçeği yavaşça geri aç
      if (this.fps > 58) {
        if (!this.upSince) this.upSince = now;
        else if (now - this.upSince > 4000 && this.scale < this.baseScale) {
          this.scale = Math.min(this.baseScale, this.scale * 1.06);
          this.applyScale(this.scale);
          this.upSince = now;
        }
      } else this.upSince = 0;
    }
    return true;
  }
}
