import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
});

export function createStaticHandler(rootDir) {
  const root = path.resolve(rootDir);

  return async function serveStatic(req, res, pathname) {
    let relative;
    try {
      relative = decodeURIComponent(pathname);
    } catch {
      return false;
    }
    if (relative.includes('\0') || relative.includes('\\')) return false;
    if (relative.endsWith('/')) relative += 'index.html';

    const filePath = path.resolve(root, `.${path.posix.normalize(relative)}`);
    if (!filePath.startsWith(root + path.sep)) return false;
    if (path.relative(root, filePath).split(path.sep).some((segment) => segment.startsWith('.'))) return false;

    const type = MIME_TYPES[path.extname(filePath).toLowerCase()];
    if (!type) return false;

    let stat;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return false;
    }
    if (!stat.isFile()) return false;

    // Browsers may keep a copy but must revalidate, so a redeploy is picked up immediately.
    const lastModified = new Date(Math.floor(stat.mtimeMs / 1000) * 1000).toUTCString();
    const cacheHeaders = { 'Cache-Control': 'no-cache', 'Last-Modified': lastModified };
    const since = Date.parse(req.headers['if-modified-since'] ?? '');
    if (!Number.isNaN(since) && since >= Date.parse(lastModified)) {
      res.writeHead(304, cacheHeaders);
      res.end();
      return true;
    }

    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, ...cacheHeaders });
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    await pipeline(fs.createReadStream(filePath), res);
    return true;
  };
}
