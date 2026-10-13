import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { loadGraphics, subscribeGraphics } from "./utils/graphics";

/* ── Geliştirme konsolunu temizle (yalnızca dev) ─────────────────────────────
   React'in geliştirme sürümü her açılışta şu bilgiyi basıyor:
     "Download the React DevTools for a better development experience: …"
   Bu bir hata değil, sadece bilgilendirme; oyuncu/kullanıcı konsolda gereksiz
   gürültü görmesin diye YALNIZCA bu satır süzülür. Diğer tüm log/uyarılar
   (gerçek hatalar dahil) olduğu gibi geçer.

   Süzgeci istemezsen: konsola  localStorage.setItem('mp:verboseConsole','1')
   yazıp sayfayı yenile — ya da adrese ?devtools ekle.                        */
if (import.meta.env.DEV && typeof window !== "undefined") {
  const verbose =
    window.localStorage?.getItem("mp:verboseConsole") === "1" ||
    window.location.search.includes("devtools");
  if (!verbose) {
    const originalInfo = console.info.bind(console);
    console.info = (...args: unknown[]) => {
      const first = typeof args[0] === "string" ? args[0] : "";
      if (first.includes("React DevTools")) return;
      originalInfo(...args);
    };
  }
}

/* ══════════ 🎛️ Grafik profili → belge düzeyinde sınıf ══════════════════════
   "perf-lite" artık <html> üzerinde: yalnızca oyun gövdesi değil, modallar ve
   mod seçim ekranı da hafif moddan faydalanır. Ayarlar değişince anında uygulanır. */
function applyPerfClass(s: { tier: string }) {
  if (typeof document === "undefined") return;
  const lite = s.tier === "low";
  document.documentElement.classList.toggle("perf-lite", lite);
  document.documentElement.dataset.gfxTier = s.tier;
}
applyPerfClass(loadGraphics());
subscribeGraphics(applyPerfClass);

const container = document.getElementById("root")!;
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/* ══════════ ⚽ Açılış perdesi ══════════════════════════════════════════════
   Paket 2 MB'lık tek dosya olduğu için tarayıcı JS'i çözene kadar ekran boş
   kalıyordu. index.html'deki perde ilk kare boyandıktan sonra (çift rAF)
   yumuşakça kapanır. */
const splashApi = (window as unknown as { mpSplash?: { done?: () => void } }).mpSplash;
if (splashApi?.done) {
  requestAnimationFrame(() => requestAnimationFrame(() => splashApi.done?.()));
}
