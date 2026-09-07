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

describe('E · production fail-closed startup (inverted S4 gate — pre-review F4)', () => {
  it('refuses to start WITH a dev bearer when NODE_ENV=production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MCP_DEV_BEARER', 'staging-leak');
    const { startServer } = await import('./index');
    expect(() => startServer()).toThrow(/MCP_DEV_BEARER must NOT/);
  });

  it('boots clean in production with NO dev bearer (the real deploy shape)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MCP_DEV_BEARER', '');
    vi.stubEnv('MCP_PORT', '0');
    const { startServer } = await import('./index');
    const server: HttpServer = startServer();
    await new Promise<void>((resolve) => server.on('listening', resolve));
    const { port } = server.address() as AddressInfo;
    vi.stubEnv('MCP_JWKS_URL', 'http://127.0.0.1:1/jwks'); // closed port — fails fast
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { authorization: 'Bearer staging-leak' },
      body: '{}',
    });
    expect(res.status).toBe(401);
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }, 15_000);

  it('the request-level kill-switch: a SET bearer stops matching the moment NODE_ENV=production', async () => {
    // Boot in test env WITH the bearer (startup gate allows it), verify it
    // works, then flip NODE_ENV — bearerMatches reads it per-request
    // (holistic MINOR-2: this is the branch the boot-gate test can't reach).
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('MCP_DEV_BEARER', 'kill-switch-bearer');
    vi.stubEnv('MCP_PORT', '0');
    vi.stubEnv('MCP_RATE_LIMIT_PER_MIN', '1000');
    vi.stubEnv('MCP_JWKS_URL', 'http://127.0.0.1:1/jwks'); // JWT path fails fast
    const { startServer } = await import('./index');
    const server: HttpServer = startServer();
    await new Promise<void>((resolve) => server.on('listening', resolve));
    const { port } = server.address() as AddressInfo;
    const post = () =>
      fetch(`http://127.0.0.1:${port}/mcp`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer kill-switch-bearer',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: '{"jsonrpc":"2.0","id":1,"method":"ping"}',
      });
    expect((await post()).status).not.toBe(401); // dev path alive in test env
    vi.stubEnv('NODE_ENV', 'production');
    expect((await post()).status).toBe(401); // same bearer, dead in production
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }, 15_000);
});
