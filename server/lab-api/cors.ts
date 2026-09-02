/**
 * lab-api CORS (D · #533 · pre-review C).
 *
 * Exact-origin allowlist. No `Access-Control-Allow-Credentials` — lab-api sets
 * zero cookies, and bearer-in-header is not "credentials" in the CORS sense;
 * leaving it off is a hardening win. Origins are scheme+host only (the
 * /orrery base path is irrelevant to CORS).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export function allowedOrigins(): string[] {
  const env = process.env.LAB_CORS_ORIGINS;
  if (env) return env.split(',').map((o) => o.trim());
  return [
    'https://orrerylearn.com',
    'https://chipi.github.io',
    // Dev affordance only — a public AS shouldn't trust http origins (MINOR-5).
    ...(process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:5373', 'http://localhost:5273']),
  ];
}

/** Returns true when the request was a preflight and has been fully answered. */
export function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'origin');
    res.setHeader('access-control-allow-headers', 'authorization, content-type');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}
