#!/usr/bin/env node
/**
 * Manager Pro 2026 — İnternet üzerinden tek tıkla online paylaşım.
 *
 * Ne yapar?
 *   1. Oyunun üretim sunucusunu başlatır (arayüz + online lig API'si).
 *   2. Ücretsiz bir Cloudflare hızlı tüneliyle bilgisayarını internete açar.
 *      Hesap açmak, port yönlendirmek, IP bulmak gerekmez.
 *   3. Arkadaşlarına göndereceğin herkese-açık oyun linkini ekrana yazar.
 *
 * Kullanım:
 *   paylas.bat (Windows)ifieri çift tıkla
 *   ./paylas.sh (Mac/Linux)
 *   npm run share [-- --port 5173] [--tunnel auto|cloudflared|localtunnel] [--build] [--no-open]
 *
 * Not: link her başlatışta değişir; pencere kapanınca oyun da kapanır.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IS_WINDOWS = process.platform === 'win32';
const NPM = IS_WINDOWS ? 'npm.cmd' : 'npm';
const NPX = IS_WINDOWS ? 'npx.cmd' : 'npx';
const TUNNEL_TIMEOUT_MS = 120_000;

/**
 * Windows'ta `npm.cmd`, `npx.cmd` gibi kabuk betikleri "shell" olmadan
 * çalıştırılamaz: Node 18.20.2 / 20.12.2 / 21.7.3 sürümlerinden itibaren bu
 * çağrılar güvenlik sertleştirmesi (CVE-2024-27980) yüzünden `spawn EINVAL`
 * hatasıyla reddedilir. Bu yüzden .cmd/.bat dosyalarını cmd.exe üzerinden
 * başlatıyoruz. (paylas.bat → "spawn EINVAL" hatasının nedeni buydu.)
 */
export function needsShell(command, platform = process.platform) {
  if (platform !== 'win32') return false;
  return /\.(cmd|bat)$/i.test(command) || command === 'npm' || command === 'npx';
}

/** Çalışan tünel süreçleri: Ctrl+C'de hepsi kapatılır (URL beklerken bile). */
const activeCleanups = new Set();
function trackCleanup(fn) {
  activeCleanups.add(fn);
  return () => { activeCleanups.delete(fn); };
}

/** cloudflared çıktısından https://xxx.trycloudflare.com linkini yakalar. */
export function parseTryCloudflareUrl(text) {
  return text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com(?![a-z0-9.-])/i)?.[0] ?? null;
}

/** localtunnel çıktısından https://xxx.loca.lt linkini yakalar. */
export function parseLocaltunnelUrl(text) {
  return text.match(/https:\/\/[a-z0-9-]+\.loca\.lt(?![a-z0-9.-])/i)?.[0] ?? null;
}

export function parseArgs(argv) {
  const args = { port: Number(process.env.PORT) || 5173, tunnel: 'auto', build: false, open: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port') args.port = Number(argv[++i]) || args.port;
    else if (arg === '--tunnel' && ['auto', 'cloudflared', 'localtunnel'].includes(argv[i + 1])) args.tunnel = argv[++i];
    else if (arg === '--build') args.build = true;
    else if (arg === '--no-open') args.open = false;
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function run(command, params, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const { shell, ...rest } = options;
    const child = spawn(command, params, {
      cwd: ROOT,
      stdio: 'inherit',
      ...rest,
      shell: shell ?? needsShell(command),
    });
    child.on('error', reject);
    child.on('exit', code => (code === 0 ? resolvePromise() : reject(new Error(`${command} çıkış kodu: ${code}`))));
  });
}

/**
 * Derleme adımı: npm yerine yerel Vite'ı doğrudan Node ile çalıştırır.
 * Böylece Windows'ta npm.cmd sorunları ve PATH farklılıkları devre dışı kalır.
 */
export function buildParams(root = ROOT) {
  const viteBin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js');
  return existsSync(viteBin)
    ? { command: process.execPath, params: [viteBin, 'build'], label: 'vite build' }
    : { command: NPM, params: ['run', 'build'], label: 'npm run build' };
}

/** Vite 7'nin istediği Node sürümleri: 20.19+ veya 22.12+ (21.x desteklenmiyor). */
export function nodeVersionOk(version = process.versions.node) {
  const [major, minor] = String(version).split('.').map(Number);
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return false;
  if (major > 22) return true;
  if (major === 22) return minor >= 12;
  if (major === 20) return minor >= 19;
  return false;
}

async function runBuild(log) {
  if (!nodeVersionOk()) {
    throw new Error(`Node.js sürümün eski (${process.versions.node}). Derleme için Node.js 20.19+ veya 22.12+ gerekir: https://nodejs.org adresinden LTS sürümü kurup tekrar dene.`);
  }
  const { command, params, label } = buildParams();
  log(`  [..] Oyun derleniyor (${label})…`);
  try {
    await run(command, params);
  } catch (error) {
    // Beklenmedik bir engel olursa EINVAL'i anlaşılır bir mesaja çevir.
    if (error?.code === 'EINVAL' && IS_WINDOWS) {
      throw new Error('Windows bu komutu çalıştırmayı reddetti (spawn EINVAL). Klasörde "npm install" komutunu elle çalıştırıp tekrar dene.');
    }
    throw new Error(`Derleme başarısız: ${error.message}`);
  }
}

function portFree(port) {
  return new Promise(resolvePromise => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolvePromise(false); });
    socket.once('error', () => resolvePromise(true));
    socket.setTimeout(1000, () => { socket.destroy(); resolvePromise(true); });
  });
}

async function findFreePort(preferred) {
  for (let port = preferred; port < preferred + 10; port++) {
    if (await portFree(port)) return port;
  }
  throw new Error('Boş port bulunamadı. Başka bir oyun sunucusu çalışıyor olabilir.');
}

async function waitForHealth(port, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/online/health`);
      if (response.ok) return true;
    } catch { /* sunucu daha açılmadı */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function openBrowser(url) {
  const opener = IS_WINDOWS ? process.env.ComSpec || 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const params = IS_WINDOWS ? ['/c', 'start', '', url] : [url];
  try { spawn(opener, params, { stdio: 'ignore', detached: true }).unref(); } catch { /* elle açılır */ }
}

/** İşlem ağacını kapat (Windows'ta npx alt işlemleri için taskkill gerekir). */
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGINT');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* kapandı */ } }, 3000);
  } catch { /* kapandı */ }
}

/** Birincil yol: cloudflared npm paketi üzerinden hızlı tünel (hesapsız, ücretsiz). */
async function startCloudflaredTunnel(port, log) {
  const require = createRequire(import.meta.url);
  let cf;
  try {
    cf = require('cloudflared');
  } catch {
    throw new Error('cloudflared paketi kurulu değil. `npm install` çalıştır.');
  }
  if (!existsSync(cf.bin)) {
    log('  [..] İlk kurulum: tünel programı indiriliyor (~40 MB, bir kez)…');
    await cf.install(cf.bin);
  }
  const tunnel = cf.Tunnel.quick(`http://127.0.0.1:${port}`, { '--no-autoupdate': true });
  const untrack = trackCleanup(() => { try { tunnel.stop(); } catch { /* kapandı */ } killTree(tunnel.process); });
  const url = await new Promise((resolvePromise, reject) => {
    let settled = false;
    const done = fn => value => { if (!settled) { settled = true; clearTimeout(timer); fn(value); } };
    const timer = setTimeout(() => done(reject)(new Error('Tünel zaman aşımına uğradı. İnternetini kontrol edip tekrar dene.')), TUNNEL_TIMEOUT_MS);
    tunnel.on('url', done(resolvePromise));
    tunnel.on('error', error => {
      if (!settled) done(reject)(error instanceof Error ? error : new Error(String(error)));
      else log(`  [..] Tünel notu: ${error?.message || error}`);
    });
    tunnel.on('exit', code => done(reject)(new Error(`Tünel beklenmedik şekilde kapandı (kod ${code}).`)));
  });
  const stop = () => { untrack(); try { tunnel.stop(); } catch { /* kapandı */ } killTree(tunnel.process); };
  tunnel.process?.on?.('exit', untrack);
  return { url, kind: 'cloudflared', stop };
}

/** Yedek yol: PATH'teki cloudflared kurulumu (kullanıcı elle kurmuşsa). */
async function startSystemCloudflared(port, log) {
  const available = await new Promise(resolvePromise => {
    const probe = spawn('cloudflared', ['--version'], { stdio: 'ignore' });
    probe.on('error', () => resolvePromise(false));
    probe.on('exit', code => resolvePromise(code === 0));
  });
  if (!available) throw new Error('Sistemde cloudflared yok.');
  log('  [..] Sistemdeki cloudflared kullanılıyor…');
  return spawnAndParse('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], parseTryCloudflareUrl, 'cloudflared');
}

/** Son yedek: localtunnel (npx ile, hesapsız). İlk açılışta bir onay sayfası çıkar. */
async function startLocaltunnel(port, log) {
  log('  [..] Yedek yol deneniyor: localtunnel…');
  return spawnAndParse(NPX, ['-y', 'localtunnel', '--port', String(port)], parseLocaltunnelUrl, 'localtunnel');
}

/** Tünel yöntemleri sırayla denenir; biri açılırsa diğerleri denenmez. */
const TUNNEL_STARTERS = {
  cloudflared: startCloudflaredTunnel,
  system: startSystemCloudflared,
  localtunnel: startLocaltunnel,
};

export function tunnelAttempts(mode) {
  if (mode === 'cloudflared') return ['cloudflared'];
  if (mode === 'localtunnel') return ['localtunnel'];
  return ['cloudflared', 'system', 'localtunnel'];
}

/**
 * Sırayla tünel açmayı dener. İlk başarılı tüneli döndürür; hepsi başarısız
 * olursa son hatayı fırlatır. (Burada `tunnel` değişkenini tanımlamayı unutmak
 * paylaşımı "tunnel is not defined" ile çökertiyordu.)
 */
export async function openTunnel(mode, port, log, starters = TUNNEL_STARTERS) {
  let lastError;
  for (const kind of tunnelAttempts(mode)) {
    try {
      return await starters[kind](port, log);
    } catch (error) {
      lastError = error;
      log(`  [..] ${kind} olmadi (${error.message})`);
    }
  }
  throw lastError || new Error('Tünel acilamadi.');
}

/** Dış tünel sürecini başlatıp çıktısından linki yakalar (test edilebilir). */
export function spawnAndParse(command, params, parse, kind) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, params, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: needsShell(command) });
    const untrack = trackCleanup(() => killTree(child));
    child.on('exit', untrack);
    let buffer = '';
    let settled = false;
    const done = fn => value => { if (!settled) { settled = true; clearTimeout(timer); fn(value); } };
    const timer = setTimeout(() => { killTree(child); done(reject)(new Error('Tünel zaman aşımına uğradı.')); }, TUNNEL_TIMEOUT_MS);
    child.on('error', error => done(reject)(error));
    child.on('exit', code => done(reject)(new Error(`Tünel kapandı (kod ${code}).`)));
    const onData = chunk => {
      buffer += String(chunk);
      if (buffer.length > 200_000) buffer = buffer.slice(-50_000);
      const url = parse(buffer);
      if (url) done(resolvePromise)({ url, kind, stop: () => { untrack(); killTree(child); } });
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Kullanım: npm run share [-- --port 5173] [--tunnel auto|cloudflared|localtunnel] [--build] [--no-open]');
    return;
  }
  const log = message => console.log(message);
  console.log('');
  console.log('  ============================================');
  console.log('    MANAGER PRO 2026 - Internet Paylasimi');
  console.log('  ============================================');
  console.log('');

  if (!existsSync(resolve(ROOT, 'node_modules'))) {
    log('  [..] Bagimliliklar yukleniyor (npm install)…');
    await run(NPM, ['install', '--no-fund']);
  }
  if (args.build || !existsSync(resolve(ROOT, 'dist', 'index.html'))) {
    await runBuild(log);
  }
  const port = await findFreePort(args.port);
  log(`  [..] Sunucu baslatiliyor (port ${port})…`);
  const server = spawn(process.execPath, [resolve(ROOT, 'server', 'index.mjs')], {
    cwd: ROOT, stdio: 'inherit', env: { ...process.env, PORT: String(port) },
  });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    log('\n  [..] Kapatiliyor…');
    for (const cleanup of [...activeCleanups]) {
      try { cleanup(); } catch { /* kapandı */ }
    }
    activeCleanups.clear();
    killTree(server);
    setTimeout(() => process.exit(0), 800);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  if (process.platform === 'win32') process.on('SIGBREAK', shutdown);
  server.on('error', error => { console.error(`  [HATA] Sunucu baslatilamadi: ${error.message}`); process.exit(1); });
  server.on('exit', code => { if (!stopping) { console.error(`  [HATA] Sunucu kapandi (kod ${code}).`); process.exit(1); } });

  if (!await waitForHealth(port)) {
    stopping = true; // kasıtlı kapatma: yanıltıcı "Sunucu kapandi" mesajı çıkmasın
    killTree(server);
    throw new Error(`Sunucu saglik kontrolune yanit vermedi (port ${port}). Baska bir program bu portu kullaniyor olabilir.`);
  }
  log('  [OK] Sunucu acik.');
  log('  [..] Internet tüneli aciliyor (10-30 sn surebilir)…');

  let tunnel;
  try {
    tunnel = await openTunnel(args.tunnel, port, log);
  } catch (error) {
    // Tünel açılamadıysa sunucuyu geride yetim bırakma ve yanıltıcı
    // "Sunucu kapandi" mesajı yerine gerçek nedeni yaz.
    stopping = true;
    killTree(server);
    await new Promise(r => setTimeout(r, 500));
    console.error('');
    console.error(`  [HATA] Internet tüneli açılamadı: ${error.message}`);
    console.error('  İpuçları:');
    console.error('   - Aynı Wi-Fi\'daysanız paylaşıma gerek yok: baslat.bat (Mac/Linux: ./start.sh)');
    console.error('   - Güvenlik duvarı veya okul/iş ağı tünelleri engelliyor olabilir.');
    console.error('   - İnternet bağlantını kontrol edip paylas.bat dosyasını tekrar çalıştır.');
    console.error('');
    process.exit(1);
  }

  const local = `http://localhost:${port}`;
  console.log('');
  console.log('  ############################################################');
  console.log('  #  OYUNUN INTERNETTE ACIK!                                  #');
  console.log('  ############################################################');
  console.log('');
  console.log('   Arkadaslarina SUNU gonder (herkes bunu acsin, sen dahil):');
  console.log('');
  console.log(`     ${tunnel.url}`);
  console.log('');
  console.log('   Nasil oynanir:');
  console.log('   1. Herkes yukaridaki linki tarayicida acsin.');
  console.log('   2. Online Oyna -> bir kisi lig kursun, oda kodunu paylassin.');
  console.log('   3. Digerleri kodu girip ayni lige katilsin.');
  if (tunnel.kind === 'localtunnel') {
    console.log('');
    console.log('   NOT (localtunnel): ilk acilista bir onay sayfasi cikar;');
    console.log('   "Click to Continue" de, sonra oyun sorunsuz calisir.');
  }
  console.log('');
  console.log(`   Kendi bilgisayarindan oynamak icin: ${local}`);
  console.log('   (Davet baglantilarinin dogru calismasi icin sen de');
  console.log('   internet linkinden oynamalisin.)');
  console.log('');
  console.log('   Bu pencereyi kapatma! Kapatirsan oyun herkese kapanir.');
  console.log('   Durdurmak icin: Ctrl+C');
  console.log('');
  if (args.open) openBrowser(tunnel.url);
  await new Promise(() => { /* Ctrl+C gelene kadar açık kal */ });
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invoked) main().catch(error => { console.error(`  [HATA] ${error.message}`); process.exit(1); });
