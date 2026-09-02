/**
 * lab-api — Orrery identity container (D · #533).
 *
 * The one guest list both doors consume (RFC-037 A01.7/A01.8): a minimal
 * OAuth 2.1 authorization server (as.ts) federating to Google OIDC (google.ts)
 * over a JSON-file allowlist (allowlist.ts), issuing ES256 JWTs (tokens.ts)
 * that Door 1 (/ask, slice F's client) and Door 2 (the MCP resource server,
 * slice E) verify. Zero cookies anywhere — which dissolves CSRF (pre-review C).
 *
 * All absolute URLs derive from LAB_ISSUER (env), never from the Host header.
 * Fail-closed startup: production refuses to boot without the Google + Claude
 * client config (mirrors mcp's MCP_DEV_BEARER gate).
 *
 * Startup lives in main.ts — importing this module never binds a port.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { applyCors } from './cors';
import { AuthServer, type AsConfig, type StaticClient } from './as';
import { googleConfigFromEnv } from './google';
import { TokenCore } from './tokens';
import { isAllowed } from './allowlist';
import { ask, askDepsFromEnv, LlmUnavailableError } from './ask';

export const PORT = Number(process.env.LAB_PORT ?? 8093);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_CONCURRENT_ASKS = Number(process.env.LAB_ASK_MAX_CONCURRENT || 4);

export interface LabApiConfig {
  issuer: string;
  mcpResource: string;
  statePath: string;
  allowlistPath: string;
}

export function configFromEnv(): LabApiConfig {
  const issuer = process.env.LAB_ISSUER ?? 'https://lab-api.orrerylearn.com';
  return {
    issuer,
    mcpResource: process.env.LAB_MCP_RESOURCE ?? 'https://mcp.orrerylearn.com',
    statePath: process.env.LAB_STATE_PATH ?? '/srv/lab-api-state/state.json',
    allowlistPath: process.env.LAB_ALLOWLIST_PATH ?? '/srv/lab-api-state/allowlist.json',
  };
}

export function staticClients(cfg: LabApiConfig): StaticClient[] {
  const clients: StaticClient[] = [];
  const claudeSecret = process.env.LAB_CLAUDE_CLIENT_SECRET;
  if (claudeSecret) {
    clients.push({
      clientId: process.env.LAB_CLAUDE_CLIENT_ID ?? 'claude-ai',
      clientSecret: claudeSecret,
      redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
      scope: 'physics:read',
      // Door 2 ONLY — a connector token must never open /ask (MINOR-1).
      resources: [cfg.mcpResource],
    });
  }
  // The /lab SPA — public client, PKCE-only (no secret to keep in a browser).
  // localhost redirects are a dev affordance a public AS shouldn't carry
  // (holistic MINOR-5) — gated out of production unless explicitly configured.
  const prod = process.env.NODE_ENV === 'production';
  const defaultRedirects = [
    'https://orrerylearn.com/lab/callback',
    'https://chipi.github.io/orrery/lab/callback',
    ...(prod ? [] : ['http://localhost:5373/lab/callback', 'http://localhost:5273/lab/callback']),
  ].join(',');
  clients.push({
    clientId: 'orrery-lab-web',
    // `||` not `??`: compose passes '' when the operator hasn't set the var.
    redirectUris: (process.env.LAB_WEB_REDIRECT_URIS || defaultRedirects)
      .split(',')
      .map((u) => u.trim()),
    scope: 'physics:ask',
    // Door 1 ONLY — an SPA token must never pass #534's aud check (MINOR-1).
    resources: [cfg.issuer],
  });
  return clients;
}

/**
 * Sliding-window rate limit (pre-auth endpoints). Behind the Caddy vhost every
 * request arrives from 127.0.0.1, so keying on remoteAddress alone would be one
 * GLOBAL bucket for the whole internet (holistic MAJOR-2) — the true client is
 * the first X-Forwarded-For hop, trustable here because only loopback Caddy can
 * reach the port. Keys are attacker-influenced, so the map is pruned: emptied
 * windows are dropped, and a full sweep runs whenever the map grows past the
 * cap. Limit read lazily so tests can vary it per server instance.
 */
const windows = new Map<string, number[]>();
const MAX_RATE_KEYS = 10_000;

function clientKey(req: IncomingMessage): string {
  const xff = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0].trim();
  return first || req.socket.remoteAddress || 'unknown';
}

function rateLimited(key: string): boolean {
  const limit = Number(process.env.LAB_RATE_LIMIT_PER_MIN || 120);
  const now = Date.now();
  if (windows.size > MAX_RATE_KEYS) {
    for (const [k, v] of windows) if (now - (v[v.length - 1] ?? 0) > 60_000) windows.delete(k);
  }
  const stamps = (windows.get(key) ?? []).filter((t) => now - t < 60_000);
  if (stamps.length >= limit) {
    windows.set(key, stamps);
    return true;
  }
  stamps.push(now);
  windows.set(key, stamps);
  return false;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

class BodyTooLargeError extends Error {}

/** Buffer a request body with a hard cap (holistic MAJOR-3) — never trust the edge to limit bytes. */
async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    // No req.destroy() here — that would tear down the socket before the 413
    // can be written; the error path responds, then the connection closes.
    if (size > MAX_BODY_BYTES) throw new BodyTooLargeError();
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  return new URLSearchParams((await readBody(req)).toString('utf8'));
}

export interface LabApi {
  server: ReturnType<typeof createServer>;
  tokens: TokenCore;
}

export async function buildLabApi(cfg: LabApiConfig): Promise<LabApi> {
  const tokens = await TokenCore.load(cfg.statePath, cfg.issuer);
  const asConfig: AsConfig = {
    issuer: cfg.issuer,
    clients: staticClients(cfg),
    allowlistPath: cfg.allowlistPath,
    google: googleConfigFromEnv(cfg.issuer),
  };
  const auth = new AuthServer(asConfig, tokens);
  let activeAsks = 0;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (applyCors(req, res)) return;
    const url = new URL(req.url ?? '/', cfg.issuer);
    // /health is exempt: the container healthcheck must not share a bucket
    // with (or be starved by) public traffic (MAJOR-2).
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true });
    }
    if (rateLimited(clientKey(req))) {
      res.writeHead(429, { 'retry-after': '30', 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'rate limit exceeded' }));
      return;
    }

    switch (`${req.method} ${url.pathname}`) {
      case 'GET /.well-known/oauth-authorization-server':
      case 'GET /.well-known/openid-configuration':
        return json(res, 200, auth.metadata());
      case 'GET /jwks':
        return json(res, 200, tokens.jwks());
      case 'GET /authorize': {
        const out = auth.authorize(url.searchParams);
        if (out.kind === 'redirect') {
          res.writeHead(302, { location: out.location });
          res.end();
        } else {
          res.writeHead(out.status, { 'content-type': 'text/plain' });
          res.end(out.body);
        }
        return;
      }
      case 'GET /auth/google/callback': {
        const out = await auth.googleCallback(url.searchParams);
        if (out.kind === 'redirect') {
          res.writeHead(302, { location: out.location });
          res.end();
        } else {
          res.writeHead(out.status, { 'content-type': 'text/plain' });
          res.end(out.body);
        }
        return;
      }
      case 'POST /token': {
        const out = await auth.token(await readForm(req));
        if (out.kind === 'ok') return json(res, 200, out.body);
        return json(res, out.status, { error: out.error, error_description: out.description });
      }
      case 'POST /ask': {
        const header = req.headers.authorization ?? '';
        const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
        // Door-1 tokens carry aud = the lab-api issuer itself.
        const claims = await tokens.verifyAccessToken(bearer, cfg.issuer);
        if (!claims || claims.scope !== 'physics:ask') {
          res.writeHead(401, {
            'WWW-Authenticate': 'Bearer realm="lab-api"',
            'content-type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'unauthorized' }));
          return;
        }
        // Live allowlist re-check — a de-allowlisted account dies here too,
        // not just at the refresh grant (pre-review D's 403 path).
        if (!isAllowed(cfg.allowlistPath, claims.email)) {
          return json(res, 403, { error: 'account not allowlisted' });
        }
        let body: { question?: unknown; locale?: unknown };
        try {
          body = JSON.parse((await readBody(req)).toString('utf8')) as typeof body;
        } catch (e) {
          if (e instanceof BodyTooLargeError) throw e;
          return json(res, 400, { error: 'body must be JSON' });
        }
        if (typeof body.question !== 'string' || !body.question.trim()) {
          return json(res, 400, { error: "'question' (non-empty string) is required" });
        }
        // Each request can burn MAX_TOOL_ROUNDS LLM calls — cap concurrency so
        // an authed client can't run up the LiteLLM bill unboundedly (MINOR-3).
        if (activeAsks >= MAX_CONCURRENT_ASKS) {
          res.writeHead(503, { 'retry-after': '10', 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'busy' }));
          return;
        }
        activeAsks += 1;
        try {
          return json(res, 200, await ask(body.question, body.locale, askDepsFromEnv()));
        } catch (e) {
          if (e instanceof LlmUnavailableError) {
            console.error('[lab-api] /ask LLM unavailable:', e.message);
            return json(res, 502, { error: 'llm_unavailable' });
          }
          throw e;
        } finally {
          activeAsks -= 1;
        }
      }
      default:
        res.writeHead(404);
        res.end();
    }
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (e instanceof BodyTooLargeError) {
        if (!res.headersSent) {
          res.writeHead(413, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'body too large' }));
        } else {
          res.end();
        }
        return;
      }
      console.error('[lab-api] request failed:', e);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal' }));
    });
  });
  return { server, tokens };
}

export function assertProductionConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = [
    'LAB_GOOGLE_CLIENT_ID',
    'LAB_GOOGLE_CLIENT_SECRET',
    'LAB_CLAUDE_CLIENT_SECRET',
  ].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`lab-api refuses to start in production without: ${missing.join(', ')}`);
  }
}
