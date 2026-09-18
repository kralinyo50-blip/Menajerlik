/**
 * 3D sahneler için global "arka planı duraklat" anahtarı.
 *
 * Maç ekranı (MatchEngine) açıkken alttaki sekmenin 3D saheleri
 * (Stadyum / Antrenman Kompleksi / Hayat) görünmeseler de her karede
 * çizilmeye devam ederdi — zayıf GPU'larda maç sırasında cihazun
 * yükünü ikiye katlar ve donma/çökmeye zemin hazırlar.
 * Maç ekranı mount olurken bayrak açılır, unmount olurken kapanır;
 * arka plan 3D döngüleri bu bayrağa bakarak uyur.
 */

let backgroundPaused = false;

export function setBackgroundRenderPaused(paused: boolean): void {
  backgroundPaused = paused;
}

export function isBackgroundRenderPaused(): boolean {
  return backgroundPaused;
}
