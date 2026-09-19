import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildParams, needsShell, nodeVersionOk, openTunnel, parseArgs, parseLocaltunnelUrl, parseTryCloudflareUrl, spawnAndParse, tunnelAttempts } from './share-online.mjs';

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

test('tünel denemeleri sırayla yapılır, ilk başarılı tünel kullanılır', async () => {
  assert.deepEqual(tunnelAttempts('auto'), ['cloudflared', 'system', 'localtunnel']);
  assert.deepEqual(tunnelAttempts('cloudflared'), ['cloudflared']);
  assert.deepEqual(tunnelAttempts('localtunnel'), ['localtunnel']);

  // "tunnel is not defined" hatasının geri gelmemesi için: açılan tünel döndürülür.
  const tried = [];
  const logs = [];
  const starters = {
    cloudflared: async () => { tried.push('cloudflared'); throw new Error('yok'); },
    system: async () => { tried.push('system'); throw new Error('yok'); },
    localtunnel: async () => {
      tried.push('localtunnel');
      return { url: 'https://sahte.trycloudflare.com', kind: 'cloudflared', stop() {} };
    },
  };
  const tunnel = await openTunnel('auto', 5173, message => logs.push(message), starters);
  assert.equal(tunnel.url, 'https://sahte.trycloudflare.com');
  assert.deepEqual(tried, ['cloudflared', 'system', 'localtunnel']);
  assert.equal(logs.filter(line => line.includes('olmadi')).length, 2);
});

test('hiçbir tünel açılamazsa son hata fırlatılır', async () => {
  const starters = {
    cloudflared: async () => { throw new Error('birinci hata'); },
    system: async () => { throw new Error('ikinci hata'); },
    localtunnel: async () => { throw new Error('son hata'); },
  };
  await assert.rejects(() => openTunnel('auto', 5173, () => {}, starters), /son hata/);
});

test('Windows\'ta .cmd/.bat dosyaları cmd.exe üzerinden çalıştırılır (spawn EINVAL önlenir)', () => {
  // Node 18.20.2+ / 20.12.2+ sürümlerinde shell olmadan çalıştırılamazlar.
  assert.equal(needsShell('npm.cmd', 'win32'), true);
  assert.equal(needsShell('npx.cmd', 'win32'), true);
  assert.equal(needsShell('npm', 'win32'), true);
  assert.equal(needsShell('cloudflared', 'win32'), false);
  assert.equal(needsShell('npm.cmd', 'linux'), false);
});

test('derleme için gereken Node sürümü denetlenir', () => {
  assert.equal(nodeVersionOk('20.19.0'), true);
  assert.equal(nodeVersionOk('20.18.9'), false);
  assert.equal(nodeVersionOk('21.7.3'), false);
  assert.equal(nodeVersionOk('22.12.0'), true);
  assert.equal(nodeVersionOk('22.11.0'), false);
  assert.equal(nodeVersionOk('23.1.0'), true);
  assert.equal(nodeVersionOk('bilinmiyor'), false);
  assert.equal(nodeVersionOk(), true); // testleri çalıştıran Node yeterli
});

test('derleme komutu npm yerine yerel Vite ile çalıştırılır', () => {
  const fakeRoot = mkdtempSync(join(tmpdir(), 'mpro-share-'));
  try {
    // Vite kurulu değilse güvenli yedek: npm run build.
    const fallback = buildParams(fakeRoot);
    assert.deepEqual(fallback.params, ['run', 'build']);
    assert.equal(/npm(\.cmd)?$/.test(fallback.command), true);

    // Vite kuruluysa doğrudan Node ile çalışır: Windows'ta npm.cmd sorunu yaşanmaz.
    const viteDir = join(fakeRoot, 'node_modules', 'vite', 'bin');
    mkdirSync(viteDir, { recursive: true });
    writeFileSync(join(viteDir, 'vite.js'), '// sahte\n');
    const direct = buildParams(fakeRoot);
    assert.equal(direct.command, process.execPath);
    assert.equal(direct.label, 'vite build');
    assert.equal(direct.params[0], join(viteDir, 'vite.js'));
    assert.deepEqual(direct.params.slice(1), ['build']);
  } finally {
    rmSync(fakeRoot, { recursive: true, force: true });
  }
});
