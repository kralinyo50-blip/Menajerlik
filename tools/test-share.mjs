import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, parseLocaltunnelUrl, parseTryCloudflareUrl, spawnAndParse } from './share-online.mjs';

test('cloudflared çıktısından herkese-açık link yakalanır', () => {
  assert.equal(parseTryCloudflareUrl('2026-09-19INF | Your quick Tunnel has been created! Visit it at https://rough-donkeys-jump.trycloudflare.com'), 'https://rough-donkeys-jump.trycloudflare.com');
  assert.equal(parseTryCloudflareUrl('bağlantı kuruluyor…'), null);
  assert.equal(parseTryCloudflareUrl('https://EVIL.trycloudflare.com.evil.com'), null);
});

test('localtunnel çıktısından herkese-açık link yakalanır', () => {
  assert.equal(parseLocaltunnelUrl('your url is: https://tiny-pandas-dance.loca.lt'), 'https://tiny-pandas-dance.loca.lt');
  assert.equal(parseLocaltunnelUrl('bağlantı kuruluyor…'), null);
});

test('tünel süreci çıktısından link yakalanır ve süreç durdurulabilir', async () => {
  const mock = 'console.log("baglaniyor...");setTimeout(()=>console.log("your url is: https://mock-test-123.loca.lt"),200);setInterval(()=>{},5000);';
  const tunnel = await spawnAndParse(process.execPath, ['-e', mock], parseLocaltunnelUrl, 'localtunnel');
  assert.equal(tunnel.url, 'https://mock-test-123.loca.lt');
  assert.equal(tunnel.kind, 'localtunnel');
  tunnel.stop();
});

test('paylaşım argümanları varsayılanlarla okunur', () => {
  assert.deepEqual(parseArgs([]), { port: 5173, tunnel: 'auto', build: false, open: true });
  assert.deepEqual(parseArgs(['--port', '5180', '--tunnel', 'localtunnel', '--build', '--no-open']), { port: 5180, tunnel: 'localtunnel', build: true, open: false });
  assert.equal(parseArgs(['--tunnel', 'yanlış']).tunnel, 'auto');
});
