/**
 * S4 live round-trip (#462 acceptance): a real MCP client (SDK) against the
 * in-process server — list tools, call one, get values + FigureSpec; bearer
 * gates; caps + rejects enforced. E (#534) adds the http-level auth contract:
 * PRM documents, WWW-Authenticate pointers, JWT accept/reject, scope 403.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { TokenCore } from '../lab-api/tokens';

const BEARER = 'test-bearer-s4';
const ISSUER = 'https://lab-api.orrerylearn.com';
const RESOURCE = 'https://mcp.orrerylearn.com';
process.env.MCP_DEV_BEARER = BEARER;
process.env.MCP_PORT = '0'; // ephemeral
process.env.MCP_RATE_LIMIT_PER_MIN = '1000';
process.env.MCP_AUTH_ISSUER = ISSUER;
process.env.MCP_RESOURCE = RESOURCE;

let httpServer: HttpServer;
let baseUrl: string;
let jwksStub: HttpServer;
let core: TokenCore;
let stateDir: string;

beforeAll(async () => {
  // A real lab-api TokenCore behind a stub /jwks — the E gate verifies real
  // JWTs in the same process the S4 round-trip runs in.
  stateDir = mkdtempSync(join(tmpdir(), 'mcp-server-e-'));
  core = await TokenCore.load(join(stateDir, 'state.json'), ISSUER);
  jwksStub = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(core.jwks()));
  });
  await new Promise<void>((r) => jwksStub.listen(0, '127.0.0.1', r));
  process.env.MCP_JWKS_URL = `http://127.0.0.1:${(jwksStub.address() as AddressInfo).port}/jwks`;

  const { startServer } = await import('./index');
  httpServer = startServer();
  await new Promise<void>((resolve) => httpServer.on('listening', resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  jwksStub?.close();
  rmSync(stateDir, { recursive: true, force: true });
  await new Promise<void>((resolve, reject) =>
    httpServer.close((e) => (e ? reject(e) : resolve())),
  );
});

function client(locale?: string): { c: Client; connect: () => Promise<void> } {
  const c = new Client({ name: 'orrery-s4-test', version: '0.0.0' });
  const url = new URL(`${baseUrl}/mcp${locale ? `?locale=${locale}` : ''}`);
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers: { authorization: `Bearer ${BEARER}` } },
  });
  return { c, connect: () => c.connect(transport) };
}

describe('S4 · live MCP round-trip', () => {
  it('rejects a missing/wrong bearer with 401', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('Bearer');
    const wrong = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer nope' },
      body: '{}',
    });
    expect(wrong.status).toBe(401);
  });

  it('lists transfer-domain tools; ja locale localizes descriptions', async () => {
    const { c, connect } = client();
    await connect();
    const { tools } = await c.listTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t) => typeof t.description === 'string')).toBe(true);
    await c.close();

    const jaC = client('ja');
    await jaC.connect();
    const ja = await jaC.c.listTools();
    expect(ja.tools.map((t) => t.name)).toEqual(tools.map((t) => t.name));
    expect(ja.tools.some((t, i) => t.description !== tools[i].description)).toBe(true);
    await jaC.c.close();
  }, 20_000);

  it('calls launch-window with defaults → values + computed-fidelity FigureSpec', async () => {
    const { c, connect } = client();
    await connect();
    const out = await c.callTool({ name: 'launch-window', arguments: {} });
    expect(out.isError ?? false).toBe(false);
    const payload = out.structuredContent as {
      values: Record<string, { value: number; units: string }>;
      status: { ok: boolean };
      assumptions: string[];
      figure?: { provenance: { fidelity: string } };
      localized: { title: string; assumptions: string[] };
    };
    expect(payload.status.ok).toBe(true);
    expect(payload.values.synodic.value).toBeGreaterThan(700); // Earth→Mars ≈ 780 d
    expect(payload.values.synodic.value).toBeLessThan(820);
    expect(payload.figure?.provenance.fidelity).toBe('computed');
    expect(payload.localized.assumptions.length).toBe(payload.assumptions.length);
    await c.close();
  }, 20_000);

  it('REJECTS out-of-domain input with the offending field named (never clamps)', async () => {
    const { c, connect } = client();
    await connect();
    const out = await c.callTool({
      name: 'launch-window',
      arguments: { depart: 'krypton' },
    });
    expect(out.isError).toBe(true);
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('depart');
    await c.close();
  }, 20_000);

  it('locale argument localizes result strings while keys ride along', async () => {
    const { c, connect } = client();
    await connect();
    const en = await c.callTool({ name: 'launch-window', arguments: {} });
    const ja = await c.callTool({ name: 'launch-window', arguments: { locale: 'ja' } });
    const enLoc = (en.structuredContent as { localized: { title: string } }).localized;
    const jaLoc = (ja.structuredContent as { localized: { title: string } }).localized;
    expect(jaLoc.title).not.toBe(enLoc.title);
    await c.close();
  }, 20_000);

  it('/health answers without auth (container liveness)', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; tools: number };
    expect(body.ok).toBe(true);
    expect(body.tools).toBeGreaterThan(0);
  });
});

describe('E · #534 — OAuth resource-server http contract', () => {
  const mint = (scope = 'physics:read', aud = RESOURCE) =>
    core.issueAccessToken({
      sub: 'google-sub-e2e',
      email: 'marko@example.com',
      scope: scope as 'physics:read',
      aud,
    });

  it('serves RFC 9728 PRM at BOTH identifier forms, unauthenticated', async () => {
    const origin = await (await fetch(`${baseUrl}/.well-known/oauth-protected-resource`)).json();
    expect(origin).toEqual({
      resource: RESOURCE,
      authorization_servers: [ISSUER],
      bearer_methods_supported: ['header'],
      scopes_supported: ['physics:read'],
    });
    const pathForm = await (
      await fetch(`${baseUrl}/.well-known/oauth-protected-resource/mcp`)
    ).json();
    expect((pathForm as { resource: string }).resource).toBe(`${RESOURCE}/mcp`);
  });

  it('401 without a token carries the resource_metadata pointer and NO error attr (RFC 6750 §3)', async () => {
    const res = await fetch(`${baseUrl}/mcp`, { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
    const www = res.headers.get('www-authenticate') ?? '';
    expect(www).toContain(`resource_metadata="${RESOURCE}/.well-known/oauth-protected-resource"`);
    expect(www).not.toContain('error=');
  });

  it('401 with a bad token carries error="invalid_token"', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { authorization: 'Bearer garbage' },
      body: '{}',
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('error="invalid_token"');
  });

  it('403 with a wrong-scope token: insufficient_scope + the required scope named', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await mint('physics:ask', ISSUER)}` },
      body: '{}',
    });
    // aud=lab-api → invalid_token before scope; use the mcp aud with ask scope:
    const res2 = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await mint('physics:ask', RESOURCE)}` },
      body: '{}',
    });
    expect(res.status).toBe(401);
    expect(res2.status).toBe(403);
    const www = res2.headers.get('www-authenticate') ?? '';
    expect(www).toContain('error="insufficient_scope"');
    expect(www).toContain('scope="physics:read"');
  });

  it('a REAL lab-api JWT opens the full MCP round-trip (initialize + tools/list)', async () => {
    const token = await mint();
    const c = new Client({ name: 'orrery-e-test', version: '0.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
    });
    await c.connect(transport);
    const { tools } = await c.listTools();
    expect(tools.length).toBeGreaterThan(0);
    await c.close();
  }, 20_000);

  it('the /mcp path-form audience also opens the door (pre-review F1)', async () => {
    const token = await mint('physics:read', `${RESOURCE}/mcp`);
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'e', version: '0' },
        },
      }),
    });
    expect(res.status).toBe(200);
  });
});
