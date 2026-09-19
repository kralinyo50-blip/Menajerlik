// Online lig bağlantı politikası: canlı akış (SSE) birincil yol, kopunca yoklama (polling) yedeği.
// Sunucu 429/503 gibi yanıtlarda ne kadar beklenmesi gerektiğini `Retry-After` ile söyler.

/** Akış iki kez üst üste veri getirmezse yoklamaya geçilir (tünel/proxy SSE'yi tamponluyor olabilir). */
export const STREAM_FAILURES_BEFORE_POLL = 2;
/** Yoklama aralığı: canlı maç kareleri gecikmeli ama akıcı gelir. */
export const POLL_INTERVAL_MS = 2_000;
/** Yoklama sırasında yeniden akış denenmeden önce beklenecek süre. */
export const STREAM_RETRY_WHILE_POLLING_MS = 45_000;
/** Yoklama da üst üste başarısız olursa akış yeniden denenir. */
export const POLL_FAILURES_BEFORE_STREAM = 3;
/** Tek bir yeniden deneme arasındaki en uzun bekleme. */
export const MAX_RECONNECT_DELAY_MS = 10_000;
/** Akıştan bu süre boyunca hiç veri gelmezse bağlantı ölü sayılıp yeniden kurulur. */
export const STREAM_WATCHDOG_MS = 15_000;

/**
 * Yeniden deneme gecikmesi: üstel geri çekilme + jitter (aynı anda kopan istemciler
 * sunucuya birlikte yüklenmesin). Sunucunun verdiği `Retry-After` bu süreyi kısaltmaz.
 */
export function reconnectDelay(attempt: number, waitMs = 0, random: () => number = Math.random): number {
  const backoff = Math.min(MAX_RECONNECT_DELAY_MS, 500 * 2 ** Math.max(0, attempt - 1));
  const jittered = Math.min(MAX_RECONNECT_DELAY_MS, Math.round(backoff * (0.75 + random() * 0.5)));
  // Sunucunun açıkça istediği bekleme kısaltılmaz.
  return Math.max(jittered, Math.max(0, waitMs));
}

/** Sunucunun `Retry-After` başlığını milisaniyeye çevirir; yoksa 0. */
export function retryAfterMs(response: { headers: { get(name: string): string | null } }): number {
  const seconds = Number(response.headers.get('retry-after'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 120_000) : 0;
}

/**
 * Akışı sunucu mu kapattı? `tab`/`limit` ise başka bir sekme devraldı: bu sekme hemen
 * yeniden bağlanırsa sekmeler birbirini sonsuz düşürür, o yüzden yoklamaya geçilir.
 */
export function supersededByOtherTab(reason: string | null | undefined): boolean {
  return reason === 'tab' || reason === 'limit';
}
