import { createReadStream, existsSync, statSync } from 'node:fs';
import {
  createServer,
  request as httpRequest,
  type OutgoingHttpHeaders,
  type Server,
} from 'node:http';
import { extname, resolve, sep } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export interface FrontendServerOptions {
  backendHost: string;
  backendPort: number;
  frontendHost: string;
  frontendPort: number;
  webRoot: string;
}

function isBackendPath(pathname: string): boolean {
  return pathname.startsWith('/api/') || pathname === '/health' || pathname === '/ready';
}

function applySecurityHeaders(headers: OutgoingHttpHeaders): void {
  headers['x-content-type-options'] = 'nosniff';
  headers['x-frame-options'] = 'SAMEORIGIN';
  headers['referrer-policy'] = 'same-origin';
  headers['content-security-policy'] =
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'";
}

function resolveStaticFile(webRoot: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const root = resolve(webRoot);
  const requested = decoded === '/' ? '/index.html' : decoded;
  const candidate = resolve(root, `.${requested}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  // Never return index.html for a missing browser asset. Serving HTML with a
  // CSS/JavaScript URL and MIME type leaves the browser on a blank screen.
  if (requested.startsWith('/assets/') || extname(requested) !== '') return null;

  const fallback = resolve(root, 'index.html');
  return existsSync(fallback) && statSync(fallback).isFile() ? fallback : null;
}

export async function startFrontendServer(options: FrontendServerOptions): Promise<Server> {
  const server = createServer((incoming, outgoing) => {
    const url = new URL(incoming.url ?? '/', 'http://mme.local');
    if (isBackendPath(url.pathname)) {
      const headers = {
        ...incoming.headers,
        host: `${options.backendHost}:${options.backendPort}`,
      };
      const upstream = httpRequest(
        {
          host: options.backendHost,
          port: options.backendPort,
          method: incoming.method,
          path: incoming.url,
          headers,
        },
        (response) => {
          outgoing.writeHead(response.statusCode ?? 502, response.headers);
          response.pipe(outgoing);
        },
      );
      upstream.on('error', (error) => {
        if (!outgoing.headersSent) {
          outgoing.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
        }
        outgoing.end(JSON.stringify({ success: false, error: { message: error.message } }));
      });
      incoming.pipe(upstream);
      return;
    }

    const file = resolveStaticFile(options.webRoot, url.pathname);
    if (!file) {
      outgoing.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      outgoing.end('MME frontend is not available.');
      return;
    }

    const headers: OutgoingHttpHeaders = {
      'content-type': MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': file.endsWith('index.html')
        ? 'no-store, max-age=0'
        : 'public, max-age=31536000, immutable',
    };
    applySecurityHeaders(headers);
    outgoing.writeHead(200, headers);
    if (incoming.method === 'HEAD') outgoing.end();
    else createReadStream(file).pipe(outgoing);
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(options.frontendPort, options.frontendHost, () => {
      server.off('error', reject);
      resolvePromise();
    });
  });
  return server;
}
