/**
 * Node önizleme aracı için minimal DOM + canvas köprüsü.
 * @napi-rs/canvas sayesinde 3D sahnelerdeki prosedürel dokular
 * (çim, cephe pencereleri, tabelalar, LED ekran) önizlemede de görünür.
 *
 * Önemli: bu dosya, sahne modüllerinden ÖNCE import edilmelidir —
 * sahneler `typeof document !== 'undefined'` kontrolünü modül yüklenirken yapar.
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

interface FakeCanvas {
  width: number;
  height: number;
  getContext: (type: '2d') => unknown;
}

const g = globalThis as unknown as { document?: unknown };

if (!g.document) {
  g.document = {
    createElement(tag: string): FakeCanvas {
      if (tag !== 'canvas') {
        // Sahneler yalnızca canvas ister; diğerleri için boş nesne yeterli
        return { width: 0, height: 0, getContext: () => null };
      }
      const canvas = createCanvas(1, 1);
      return canvas as unknown as FakeCanvas;
    },
  };
  // Emoji/glyph desteği olan bir yazı tipi kaydı (tabela ve ekran metinleri için)
  try {
    GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'system-ui');
  } catch {
    // Yazı tipi bulunamazsa varsayılan kullanılır — kritik değil
  }
}
