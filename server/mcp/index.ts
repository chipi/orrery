/**
 * Orrery MCP server — S4 scaffold (#462 · RFC-037 §6 + Amendment 01).
 *
 * A standalone Node process exposing the physics kernel as MCP tools over
 * Streamable HTTP (the remote transport Claude.ai custom connectors speak).
 * Tools are auto-derived from the formula registry (`registry-tools.ts`) — all
 * 64 formulas are listed (H · #464 lifted the S4 transfer-only discovery filter;
 * calls were never domain-gated). Injected-input tools (iss-pass's TLE) are
 * served via the `resolveInjected` adapter below; the compute-budget test bounds
 * the heaviest (`entry-range-control`), so no worker thread is needed.
 *
 * AUTH (E · #534): OAuth 2.1 resource server. Bearer JWTs are verified against
 * lab-api's /jwks (ES256, iss + aud + scope — auth.ts); RFC 9728 protected-
 * resource metadata is served unauthenticated at both well-known paths (the
 * origin form AND the /mcp path form — pre-review F1), and 401/403 responses
 * carry RFC 6750 WWW-Authenticate with the resource_metadata pointer.
 * `MCP_DEV_BEARER` survives ONLY outside production (local dev/tests without a
 * lab-api); in production a SET dev bearer refuses startup (pre-review F4 —
 * fail-closed inverted: the backdoor cannot exist where it matters).
 *
 * ABUSE GUARDS (2026-09-01 plan review MAJOR-1):
 *  - validate-REJECT boundary in registry-tools (never clamp agent input);
 *  - per-token sliding-window rate limit;
 *  - compute cost: EVERY formula in the registry is bounded — every input is
 *    box-constrained by its FieldSpec min/max, and the two heaviest are fixed-
 *    size: `porkchop` at a 48×40 grid (~1,920 Lambert solves) and
 *    `entry-range-control` at 28 bisections over a 26-sim footprint sweep, each
 *    sim ≤ 28,000 fixed-step integrations (~250 ms worst case, pinned by the
 *    compute-budget test). Compute is SYNCHRONOUS, so the real bound is event-
 *    loop serialization: one compute at a time, the 60/min rate limit capping
 *    how many a token can queue — worst-case aggregate is a few seconds of CPU
 *    per token per minute. There is NO worker thread (operator decision on
 *    H/#464: the bound is small enough that off-loop compute isn't warranted);
 *    the `activeComputes` cap stays inert and exists only to shape E's
 *    multi-token future. Known trade-off: a valid-token client can stall
 *    /health for its burst; acceptable for the small allowlisted beta.
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
import { stationTleBlock } from '$lib/physics/satellite/stations';
import {
  deriveTools,
  callTool,
  UnknownToolError,
  InvalidArgumentsError,
  InjectedInputUnavailableError,
  type DerivedTool,
  type InjectedResolver,
} from './registry-tools';
import { LOCALES, makeT, resolveLocale, type Locale } from './i18n';
import { mcpAuthIssuer, mcpResource, verifyRequestToken, REQUIRED_SCOPE } from './auth';

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = Number(process.env.MCP_PORT ?? 8091);
const DEV_BEARER = process.env.MCP_DEV_BEARER;
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

/**
 * TLE adapter (H · #464). Supplies the adapter-owned injected inputs a formula
 * declares. Only `iss-pass` has one today: the current ISS element set, baked
 * into the image from station-tles.json (refreshed daily on main by
 * refresh-station-tles.yml; a manually-deployed container can lag, which the
 * kernel discloses via `epochAgeDays`). H4c re-homes the source to the served
 * /data overlay without changing this contract.
 */
const resolveInjected: InjectedResolver = (def) => {
  if (def.id === 'iss-pass') return { tle: stationTleBlock('iss') };
  return null;
};

// ─── Tool derivation (per-locale, memoized) ─────────────────────────────────

const toolCache = new Map<Locale, DerivedTool[]>();

function toolsFor(locale: Locale): DerivedTool[] {
  const hit = toolCache.get(locale);
  if (hit) return hit;
  const derived = deriveTools(REGISTRY, { t: makeT(locale) }); // H (#464): no domain filter — all 64 tools
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
      const { result, localized } = callTool(
        REGISTRY,
        req.params.name,
        rawArgs,
        makeT(locale),
        resolveInjected,
      );
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

// ─── HTTP transport + auth gate ─────────────────────────────────────────────

/**
 * Timing-safe dev-bearer check (S4 holistic MINOR-3), NON-PRODUCTION ONLY as
 * of E (pre-review F4): local dev and unit tests run without a lab-api; in
 * production a set MCP_DEV_BEARER refuses startup. Hash both sides to equal
 * length, then constant-time compare. NOTE: the rate limiter keys on
 * post-auth identities only (JWT `sub`, or the valid dev bearer) — keying on
 * attacker-supplied strings would grow `windows` unboundedly.
 */
function bearerMatches(token: string): boolean {
  if (!DEV_BEARER || process.env.NODE_ENV === 'production') return false;
  const a = createHash('sha256').update(token).digest();
  const b = createHash('sha256').update(DEV_BEARER).digest();
  return timingSafeEqual(a, b);
}

/** RFC 9728 protected-resource metadata for one resource-identifier form. */
function prmDocument(resource: string): Record<string, unknown> {
  return {
    resource,
    authorization_servers: [mcpAuthIssuer()],
    bearer_methods_supported: ['header'],
    scopes_supported: [REQUIRED_SCOPE],
  };
}

function wwwAuthenticate(error?: 'invalid_token' | 'insufficient_scope'): string {
  const parts = [
    `Bearer resource_metadata="${mcpResource()}/.well-known/oauth-protected-resource"`,
  ];
  // RFC 6750 §3: omit the error attribute when no token was presented at all.
  if (error) parts.push(`error="${error}"`);
  if (error === 'insufficient_scope') parts.push(`scope="${REQUIRED_SCOPE}"`);
  return parts.join(', ');
}

function authFailure(
  res: ServerResponse,
  error: 'invalid_token' | 'insufficient_scope' | undefined,
  description: string,
): void {
  const status = error === 'insufficient_scope' ? 403 : 401;
  res.writeHead(status, {
    'WWW-Authenticate': wwwAuthenticate(error),
    'content-type': 'application/json',
  });
  res.end(JSON.stringify({ error: error ?? 'unauthorized', error_description: description }));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, tools: toolsFor('en-US').length }));
    return;
  }
  // PRM is public by design (RFC 9728) — it's how a client FINDS the AS.
  // Both identifier forms are served because the connector URL includes /mcp
  // and §3.3 requires the returned `resource` to match the client-computed
  // identifier exactly (pre-review F1).
  if (req.method === 'GET' && url.pathname === '/.well-known/oauth-protected-resource') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(prmDocument(mcpResource())));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/.well-known/oauth-protected-resource/mcp') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(prmDocument(`${mcpResource()}/mcp`)));
    return;
  }
  if (url.pathname !== '/mcp') {
    res.writeHead(404);
    res.end();
    return;
  }

  const auth = req.headers.authorization ?? '';
  // RFC 7235: the auth scheme is case-insensitive (holistic m-2).
  const token = /^bearer /i.test(auth) ? auth.slice(7) : '';
  if (!token) {
    authFailure(res, undefined, 'no bearer token presented');
    return;
  }
  let rateKey: string;
  if (bearerMatches(token)) {
    rateKey = token; // dev path (non-production only)
  } else {
    const verdict = await verifyRequestToken(token);
    if (!verdict.ok) {
      authFailure(res, verdict.error, verdict.description);
      return;
    }
    // Keyed on the verified subject: bounded by the allowlist's cardinality.
    rateKey = verdict.sub;
  }
  if (rateLimited(rateKey)) {
    res.writeHead(429, { 'retry-after': '30', 'content-type': 'application/json' });
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
  // Inverted S4 gate (E · pre-review F4): production must NOT carry the dev
  // bearer — real auth is the lab-api JWT path; a staged bearer would be a
  // standing backdoor with zero legitimate users.
  if (DEV_BEARER && process.env.NODE_ENV === 'production') {
    throw new Error('MCP_DEV_BEARER must NOT be set in production (E · #534 — JWT auth only)');
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
