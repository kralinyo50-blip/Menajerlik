import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { resolve, sep, extname } from 'node:path';
import { createOnlineApi } from './online.mjs';

const root = resolve('dist');
if (!existsSync(resolve(root, 'index.html'))) throw new Error('Önce npm run build komutunu çalıştır.');
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css' };
const api = createOnlineApi();
const server = createServer((req, res) => {
  api(req, res, () => {
    try {
      const path = decodeURIComponent(new URL(req.url || '/', 'http://server').pathname);
      const file = resolve(root, path === '/' ? 'index.html' : `.${path}`);
      if (!['GET', 'HEAD'].includes(req.method) || !file.startsWith(root + sep) || path.split('/').some(p => p.startsWith('.')) || !statSync(file).isFile()) {
        res.writeHead(404); res.end('Bulunamadı'); return;
      }
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') res.end();
      else createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch {
      res.writeHead(404); res.end('Bulunamadı');
    }
  });
});
server.once('close', api.close);
const port = Number(process.env.PORT || 5173);
server.listen(port, '0.0.0.0', () => {
  console.log(`Manager Pro Online: http://localhost:${port}`);
  // Arkadaşların localhost'u açamaz; aynı ağdaki adresleri de yazdır.
  for (const list of Object.values(networkInterfaces())) for (const net of list || []) {
    if (net.family === 'IPv4' && !net.internal) console.log(`Aynı ağdan katılım: http://${net.address}:${port}`);
  }
});
