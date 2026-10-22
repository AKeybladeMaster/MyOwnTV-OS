import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/files.mjs';

const root = path.join(ROOT, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.md': 'text/plain' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403); return response.end(); }
    const data = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch (_) { response.writeHead(404); response.end('Not found'); }
});
const port = Number(process.env.MYOWNTV_PREVIEW_PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port.');
server.listen(port, '127.0.0.1', () => console.log('Browser preview: http://127.0.0.1:' + port));
