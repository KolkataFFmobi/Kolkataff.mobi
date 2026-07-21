'use strict';

/*
 * serve.js — tiny dependency-free local preview server for /dist.
 *
 * Node stdlib only. NOT part of the deploy — a dev convenience for previewing
 * the built site with clean URLs, the custom 404, and the real _headers CSP
 * applied locally (so you can confirm the zero-JS lockdown does not break the
 * page: inline styles + favicon must still load under default-src 'none').
 *
 * Usage:  npm run serve            (http://localhost:8787)
 *         PORT=9000 npm run serve
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8787;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

// Parse the `/*` block of dist/_headers so the local preview applies the same
// response headers Cloudflare Pages will (CSP, X-Frame-Options, etc.).
function loadHeaders() {
  const file = path.join(DIST, '_headers');
  const out = {};
  if (!fs.existsSync(file)) return out;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inStar = false;
  for (const raw of lines) {
    if (/^\S/.test(raw)) {
      inStar = raw.trim() === '/*';
      continue;
    }
    if (inStar) {
      const m = /^\s+([A-Za-z0-9-]+):\s*(.+)$/.exec(raw);
      if (m) out[m[1]] = m[2];
    }
  }
  return out;
}
// Re-read _headers on every request (dev QoL): a rebuild can change the CSP
// while the server runs, and a stale cached copy here once made local audits
// block gtag.js that production (Cloudflare, reads _headers fresh) allows.
function extraHeaders() { return loadHeaders(); }

function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

// Resolve a request path to a file inside DIST, trying clean-URL variants.
function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = path.normalize(clean).replace(/^(\.\.[/\\])+/, '');
  const base = path.join(DIST, rel);
  if (!base.startsWith(DIST)) return null; // path traversal guard
  const candidates = [];
  if (clean.endsWith('/')) {
    candidates.push(path.join(base, 'index.html'));
  } else {
    candidates.push(base);
    candidates.push(base + '.html');
    candidates.push(path.join(base, 'index.html'));
  }
  for (const c of candidates) {
    if (c.startsWith(DIST) && fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url === '/' ? '/index.html' : req.url);
  const headers = Object.assign({}, extraHeaders());

  if (file) {
    let body = fs.readFileSync(file);
    const type = contentType(file);
    headers['Content-Type'] = type;
    const st = fs.statSync(file);
    headers['Last-Modified'] = st.mtime.toUTCString();
    // Gzip text responses (mirrors production: Cloudflare Pages serves
    // compressed) so local perf audits aren't skewed by uncompressed HTML.
    const accept = String(req.headers['accept-encoding'] || '');
    if (/gzip/.test(accept) && /^(text\/|application\/(xml|json))/.test(type)) {
      body = zlib.gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
    console.log(`200 ${req.method} ${req.url} -> ${path.relative(DIST, file)}`);
    return;
  }

  // Custom 404 page (served with 404 status), mirroring Cloudflare behaviour.
  const notFound = path.join(DIST, '404.html');
  headers['Content-Type'] = 'text/html; charset=utf-8';
  res.writeHead(404, headers);
  res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
  console.log(`404 ${req.method} ${req.url}`);
});

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`Kolkata FF preview: http://localhost:${PORT}/`);
  console.log(`Serving ${DIST}`);
  console.log('Applied _headers:', Object.keys(extraHeaders()).join(', ') || '(none)');
  console.log('Press Ctrl+C to stop.');
});
