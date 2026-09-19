// Online lig kodları için tek doğruluk kaynağı.
// Sunucu (server/online.mjs) ile aynı kurallar: 8 karakter, karışık harfler yok.
export const ONLINE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ONLINE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

// Kodlarda hiç kullanılmayan, sık karıştırılan karakterler.
const CONFUSABLES = new Set(['0', 'O', '1', 'I']);
const TURKISH_FIX: Record<string, string> = { İ: 'I', Ş: 'S', Ğ: 'G', Ü: 'U', Ö: 'O', Ç: 'C' };

/** Kodu tek biçime getir: büyük harf (İ sorunu olmadan), boşluk/çizgi temizliği. */
export function normalizeOnlineCode(raw: string): string {
  const upper = (raw ?? '').toLocaleUpperCase('en-US').replace(/[İŞĞÜÖÇ]/g, ch => TURKISH_FIX[ch] ?? ch);
  return upper.replace(/[\s\-_.:]/g, '').replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/** Kod yazılırken gösterilecek anlık ipucu; kod geçerliyse null döner. */
export function codeHint(code: string): string | null {
  if (!code) return null;
  const bad = [...new Set([...code].filter(ch => !ONLINE_CODE_ALPHABET.includes(ch)))];
  if (bad.length) {
    const confusable = bad.filter(ch => CONFUSABLES.has(ch));
    if (confusable.length) return `Kodda “${confusable.join('”, “')}” olamaz: kodlarda 0, O, 1, I harfleri hiç kullanılmaz (birbirine karışmasın diye). Kodu elle yazmak yerine davet bağlantısından kopyala.`;
    return `Kodda geçersiz karakter var (“${bad.join('”, “')}”). Kodu davet bağlantısından kopyala.`;
  }
  if (code.length < 8) return `Kod 8 karakter olmalı, ${8 - code.length} karakter eksik.`;
  return null;
}

export function isValidOnlineCode(code: string): boolean {
  return ONLINE_CODE_PATTERN.test(code);
}
