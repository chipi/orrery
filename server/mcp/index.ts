/**
 * Orrery MCP server — S4 scaffold (#462 · RFC-037 §6 + Amendment 01).
 *
 * A standalone Node process exposing the physics kernel as MCP tools over
 * Streamable HTTP (the remote transport Claude.ai custom connectors speak).
 * Tools are auto-derived from the formula registry (`registry-tools.ts`) —
 * S4 gates to the `transfer` domain; the gate lifts in S6 (#464).
 *
 * AUTH (D3-updated, A01.7): bearer here is an INTERNAL DEV CONVENIENCE only —
 * `MCP_DEV_BEARER` unset means the server refuses to start outside NODE_ENV
 * test/dev. Real auth is OAuth 2.1 via lab-api (#533/#534, spike doc
 * docs/wip/2026-09-01-infra-auth-spike.md).
 *
 * ABUSE GUARDS (2026-09-01 plan review MAJOR-1):
 *  - validate-REJECT boundary in registry-tools (never clamp agent input);
 *  - per-token sliding-window rate limit;
 *  - compute cost: every transfer-domain formula is bounded — the worst case is
 *    `porkchop` at a FIXED 48×40 grid (~1,920 Lambert solves, low seconds), and
 *    compute is SYNCHRONOUS, so the actual S4 bound is event-loop
 *    serialization: one compute at a time, the rate limit bounding how many a
 *    token can queue per minute. The `activeComputes` cap below is inert until
 *    compute moves off-loop — it becomes real when S6 lifts the domain gate and
 *    the multi-second descent solvers (`entry-range-control`) move to a worker
 *    thread with a wall-clock kill (tracked on #464). Known S4 trade-off: a
 *    valid-token client can stall /health for its burst; acceptable for the
 *    single operator-held bearer.
 *
 * LOCALE (operator 2026-09-01, ×14): `?locale=<tag>` on the endpoint localizes
 * tool descriptions in tools/list; a `locale` argument on any call localizes
 * the returned status/assumption strings. Keys always ride alongside. en-US
 * default.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { REGISTRY } from '$lib/physics/registry';
import {
  deriveTools,
  callTool,
  UnknownToolError,
  InvalidArgumentsError,
  InjectedInputUnavailableError,
  type DerivedTool,
} from './registry-tools';
import { LOCALES, makeT, resolveLocale, type Locale } from './i18n';

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = Number(process.env.MCP_PORT ?? 8091);
const DEV_BEARER = process.env.MCP_DEV_BEARER;
const S4_DOMAINS: Parameters<typeof deriveTools>[1]['domains'] = ['transfer'];
const RATE_LIMIT_PER_MIN = Number(process.env.MCP_RATE_LIMIT_PER_MIN ?? 60);
const MAX_CONCURRENT_COMPUTES = Number(process.env.MCP_MAX_CONCURRENT ?? 4);

// ─── Abuse guards ───────────────────────────────────────────────────────────

/** Sliding-window request stamps per bearer token (one token in S4, but shaped for E). */
const windows = new Map<string, number[]>();

function rateLimited(token: string): boolean {
  const now = Date.now();
  const stamps = (windows.get(token) ?? []).filter((t) => now - t < 60_000);
  if (stamps.length >= RATE_LIMIT_PER_MIN) {
    windows.set(token, stamps);
    return true;
  }
  stamps.push(now);
  windows.set(token, stamps);
  return false;
}

let activeComputes = 0;

// ─── Tool derivation (per-locale, memoized) ─────────────────────────────────

const toolCache = new Map<Locale, DerivedTool[]>();

function toolsFor(locale: Locale): DerivedTool[] {
  const hit = toolCache.get(locale);
  if (hit) return hit;
  const derived = deriveTools(REGISTRY, { domains: S4_DOMAINS, t: makeT(locale) });
  // Every tool additionally accepts `locale` — result-string localization.
  for (const tool of derived) {
    tool.inputSchema.properties.locale = {
      type: 'string',
      description: 'Locale for returned descriptions/assumptions (keys always included).',
      enum: [...LOCALES],
      default: 'en-US',
    };
  }
  toolCache.set(locale, derived);
  return derived;
}

// ─── MCP server wiring ──────────────────────────────────────────────────────

export function buildMcpServer(listLocale: Locale): Server {
  const server = new Server(
    { name: 'orrery-physics', version: process.env.npm_package_version ?? '0.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: toolsFor(listLocale),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (activeComputes >= MAX_CONCURRENT_COMPUTES) {
      return {
        content: [{ type: 'text', text: 'busy: concurrent compute cap reached — retry shortly' }],
        isError: true,
      };
    }
    activeComputes += 1;
    try {
      const rawArgs = { ...(req.params.arguments ?? {}) } as Record<string, unknown>;
      // `locale` is agent input under the validate-REJECT posture (holistic
      // MINOR-5): an unsupported tag is an error naming the domain, not a
      // silent en-US coercion (that coercion is only for the ?locale= query).
      if (rawArgs.locale !== undefined && !LOCALES.includes(rawArgs.locale as Locale)) {
        return {
          content: [{ type: 'text', text: `'locale' must be one of: ${LOCALES.join(', ')}` }],
          isError: true,
        };
      }
      const locale = resolveLocale(rawArgs.locale);
      delete rawArgs.locale;
      const { result, localized } = callTool(REGISTRY, req.params.name, rawArgs, makeT(locale));
      // `localized` rides beside the verbatim FormulaResult spread — if the
      // frozen contract ever gains a field of that name, nest this instead.
      return {
        content: [{ type: 'text', text: JSON.stringify({ ...result, localized }, null, 2) }],
        structuredContent: { ...result, localized } as Record<string, unknown>,
      };
    } catch (e) {
      if (
        e instanceof UnknownToolError ||
        e instanceof InvalidArgumentsError ||
        e instanceof InjectedInputUnavailableError
      ) {
        return { content: [{ type: 'text', text: e.message }], isError: true };
      }
      throw e;
    } finally {
      activeComputes -= 1;
    }
  });

  return server;
}

// ─── HTTP transport + bearer gate ───────────────────────────────────────────

/**
 * Timing-safe bearer check (S4 holistic MINOR-3): hash both sides to equal
 * length, then constant-time compare. NOTE: the rate limiter deliberately keys
 * on the VALID token only (post-auth) — keying on attacker-supplied strings
 * would grow `windows` unboundedly.
 */
function bearerMatches(token: string): boolean {
  if (!DEV_BEARER) return false;
  const a = createHash('sha256').update(token).digest();
  const b = createHash('sha256').update(DEV_BEARER).digest();
  return timingSafeEqual(a, b);
}

function unauthorized(res: ServerResponse): void {
  res.writeHead(401, { 'WWW-Authenticate': 'Bearer realm="orrery-mcp"' });
  res.end(JSON.stringify({ error: 'unauthorized' }));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, tools: toolsFor('en-US').length }));
    return;
  }
  if (url.pathname !== '/mcp') {
    res.writeHead(404);
    res.end();
    return;
  }

  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!DEV_BEARER || !bearerMatches(token)) {
    unauthorized(res);
    return;
  }
  if (rateLimited(token)) {
    res.writeHead(429, { 'retry-after': '30' });
    res.end(JSON.stringify({ error: 'rate limit exceeded' }));
    return;
  }

  // Stateless mode: each request gets a fresh transport/server pair — no session
  // state exists server-side (tools are pure), which keeps horizontal scaling and
  // restart semantics trivial for the beta.
  const locale = resolveLocale(url.searchParams.get('locale'));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = buildMcpServer(locale);
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

export function startServer(): ReturnType<typeof createServer> {
  if (!DEV_BEARER && process.env.NODE_ENV === 'production') {
    throw new Error('MCP_DEV_BEARER must be set in production (S4 dev gate)');
  }
  const httpServer = createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error('[mcp] request failed:', e);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  httpServer.listen(PORT, () => {
    console.log(`[mcp] orrery-physics listening on :${PORT} (${toolsFor('en-US').length} tools)`);
  });
  return httpServer;
}

// Startup lives in `main.ts` (the bundle/dev entry) so importing this module —
// tests, the derivation script — never binds a port.
