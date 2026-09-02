/**
 * S4 live round-trip (#462 acceptance): a real MCP client (SDK) against the
 * in-process server — list tools, call one, get values + FigureSpec; bearer
 * gates; caps + rejects enforced.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BEARER = 'test-bearer-s4';
process.env.MCP_DEV_BEARER = BEARER;
process.env.MCP_PORT = '0'; // ephemeral
process.env.MCP_RATE_LIMIT_PER_MIN = '1000';

let httpServer: HttpServer;
let baseUrl: string;

beforeAll(async () => {
  const { startServer } = await import('./index');
  httpServer = startServer();
  await new Promise<void>((resolve) => httpServer.on('listening', resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
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
