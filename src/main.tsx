import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
