/**
 * 🔔 Bildirim (toast) merkezi — v5.4
 *
 * Eskiden her bildirim OfflineGame'in kendi state'iydi (`setToast`) ve bu yüzden
 * "maaş yatırıldı" gibi minik bir mesaj **tüm oyunu** (aktif sekme dahil, hatta
 * arka plandaki 3D sahne ağacı bile) yeniden çiziyordu. Artık bildirimler
 * React dışı küçük bir depoda tutulur; yalnızca <ToastHost /> yeniden çizilir.
 *
 * Kullanım:  notify('Oyun kaydedildi 💾')  /  notify('Yetersiz bütçe', { tone: 'bad' })
 */

export type ToastTone = 'ok' | 'info' | 'warn' | 'bad';

export interface ToastItem {
  id: number;
  message: string;
  icon: string;
  tone: ToastTone;
  ttl: number;
}

export interface NotifyOptions {
  tone?: ToastTone;
  /** Milisaniye; 0 verilirse kendiliğinden kapanmaz */
  ttl?: number;
  /** Mesajın başındaki emojiyi kendim belirlemek istersem */
  icon?: string;
}

let seq = 0;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

/** Mesajın başındaki emojiyi ayıkla (rozet olarak gösterilir, metinden düşer) */
function splitLeadingEmoji(msg: string): { icon: string | null; text: string } {
  const trimmed = msg.trimStart();
  // Emoji + isteğe bağlı varyasyon seçici (VS16) — basit ama pratik eşleşme
  const m = trimmed.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u);
  if (!m) return { icon: null, text: msg };
  return { icon: m[1], text: trimmed.slice(m[0].length) };
}

function toneFromMessage(msg: string, explicit?: ToastTone): ToastTone {
  if (explicit) return explicit;
  if (/❌|hata|yetersiz|olmaz|başarısız|geçersiz|yasak/i.test(msg)) return 'bad';
  if (/⚠️|uyarı|dikkat|kilitli|bekle/i.test(msg)) return 'warn';
  if (/💡|ℹ️|bilgi/i.test(msg)) return 'info';
  return 'ok';
}

function emit() {
  items = items.slice();
  listeners.forEach(fn => fn());
}

export function notify(message: string, opts: NotifyOptions = {}): number {
  const { icon, text } = splitLeadingEmoji(message);
  const tone = toneFromMessage(message, opts.tone);
  const id = ++seq;
  const item: ToastItem = {
    id,
    message: text || message,
    icon: opts.icon ?? icon ?? (tone === 'bad' ? '!' : tone === 'warn' ? '!' : '✓'),
    tone,
    ttl: opts.ttl ?? 3400,
  };
  // En fazla 4 bildirim: eskisi düşsün (üst üste yığılıp ekranı kaplamasın)
  items = [...items, item].slice(-4);
  if (item.ttl > 0) {
    timers.set(id, setTimeout(() => dismissToast(id), item.ttl));
  }
  emit();
  return id;
}

export function dismissToast(id: number): void {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
  const next = items.filter(i => i.id !== id);
  if (next.length === items.length) return;
  items = next;
  emit();
}

export function clearToasts(): void {
  timers.forEach(t => clearTimeout(t));
  timers.clear();
  items = [];
  emit();
}

export function subscribeToasts(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getToasts(): ToastItem[] {
  return items;
}
