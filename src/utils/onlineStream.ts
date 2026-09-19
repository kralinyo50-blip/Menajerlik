// SSE paketlerinin tek doğruluk kaynağı: sunucu `data:` satırının yanında
// `event: expired` (oturum bitti) ve `event: superseded` (akışı başka sekme/sunucu devraldı)
// olaylarını gönderir. `superseded` paketinde oda verisi yoktur; onu oda karesi sanmak
// arayüzü bozar, bu yüzden ayrıştırma tek yerde ve testlidir.

export type StreamPacket =
  | { type: 'room'; payload: { room: unknown; serverTime?: number } }
  | { type: 'expired' }
  | { type: 'superseded'; reason: string }
  | { type: 'ignore' };

/** Tek bir SSE paketini (çift satır sonu ile ayrılmış blok) çözer. */
export function parseStreamPacket(packet: string): StreamPacket {
  if (packet.includes('event: expired')) return { type: 'expired' };
  const line = packet.split('\n').find(entry => entry.startsWith('data: '));
  let payload: unknown;
  try { payload = JSON.parse(line ? line.slice(6) : '{}'); } catch { return { type: 'ignore' }; }
  if (packet.includes('event: superseded')) {
    const reason = payload && typeof payload === 'object' ? String((payload as { reason?: unknown }).reason ?? '') : '';
    return { type: 'superseded', reason };
  }
  const room = payload && typeof payload === 'object' ? (payload as { room?: unknown }).room : undefined;
  if (!room) return { type: 'ignore' };
  return { type: 'room', payload: payload as { room: unknown; serverTime?: number } };
}

/** Gelen tampondan tamamlanmış paketleri sırayla çıkarır; artan yarım paketi döndürür. */
export function splitStreamPackets(buffer: string): { packets: string[]; rest: string } {
  const packets: string[] = [];
  let rest = buffer;
  let end = rest.indexOf('\n\n');
  while (end >= 0) {
    packets.push(rest.slice(0, end));
    rest = rest.slice(end + 2);
    end = rest.indexOf('\n\n');
  }
  return { packets, rest };
}
