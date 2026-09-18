/**
 * Tarayıcının WebGL'i gerçek GPU ile mi, yoksa yazılımsal (CPU) rasterizer ile mi
 * çizdiğini söyler.
 *
 * SwiftShader / llvmpipe / softpipe gibi yazılımsal render'lerde ağır 3D sahneler
 * kare başına saniyeler sürer; sayfa "stadyum yükleniyor…" aşamasında donar ve
 * tarayıcı sekmeyi çökertir. Bu tespit sayesinde:
 *  - maç 3D'si bu cihazlarda doğrudan düşük kaliteyle kurulur,
 *  - yine de kaldıramazsa kare-süresi bekçisi 2D sahaya otomatik geçirir.
 */

let cached: boolean | null = null;

export function isSoftwareWebGL(): boolean {
  if (cached !== null) return cached;
  cached = false;
  try {
    if (typeof document === 'undefined') return cached;
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return cached; // WebGL hiç yok — 3D zaten açılamaz, 2D kullanılacak
    let renderer = '';
    let vendor = '';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '');
      vendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) ?? '');
    } else {
      renderer = String(gl.getParameter(gl.RENDERER) ?? '');
      vendor = String(gl.getParameter(gl.VENDOR) ?? '');
    }
    // Test bağlamını hemen bırak (GPU belleği işgal etmesin)
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    const hay = `${renderer} ${vendor}`.toLowerCase();
    cached = /swiftshader|llvmpipe|softpipe|software rasterizer|software webgl|basic render/.test(hay);
  } catch {
    cached = false;
  }
  return cached;
}
