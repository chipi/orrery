/**
 * S4 abuse-guard paths the main server test can't reach (holistic MINOR-6):
 * the 429 rate-limit and the production fail-closed startup guard. index.ts
 * reads env at module load, so each case stubs env then dynamically imports a
 * fresh module registry.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('S4 · rate limit', () => {
  it('the request after the per-minute budget gets 429 with retry-after', async () => {
    vi.stubEnv('MCP_DEV_BEARER', 'rl-bearer');
    vi.stubEnv('MCP_PORT', '0');
    vi.stubEnv('MCP_RATE_LIMIT_PER_MIN', '2');
    const { startServer } = await import('./index');
    const server: HttpServer = startServer();
    await new Promise<void>((resolve) => server.on('listening', resolve));
    const { port } = server.address() as AddressInfo;
    const post = () =>
      fetch(`http://127.0.0.1:${port}/mcp`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer rl-bearer',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: '{"jsonrpc":"2.0","id":1,"method":"ping"}',
      });
    const first = await post();
    const second = await post();
    const third = await post();
    expect(first.status).not.toBe(429);
    expect(second.status).not.toBe(429);
    expect(third.status).toBe(429);
    expect(third.headers.get('retry-after')).toBeTruthy();
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }, 15_000);
});

describe('S4 · production fail-closed startup', () => {
  it('refuses to start without a bearer when NODE_ENV=production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MCP_DEV_BEARER', '');
    const { startServer } = await import('./index');
    expect(() => startServer()).toThrow(/MCP_DEV_BEARER/);
  });
});
