import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Serve only the animation and its fallback image, on loopback only.
const files = new Map([
  ['/', ['../index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['../index.html', 'text/html; charset=utf-8']],
  ['/assets/CrAnE.svg', ['../assets/CrAnE.svg', 'image/svg+xml']],
]);
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = files.get(pathname);
  if (!file || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const contents = await readFile(new URL(file[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch {
    response.writeHead(500).end('Unable to read the preview file.');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(4173, '127.0.0.1', () => console.log('CrAnE animation: http://127.0.0.1:4173'));
