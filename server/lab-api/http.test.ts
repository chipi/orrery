/**
 * Security behavior of the http layer itself (holistic MINOR-6/7): CORS
 * allow/deny branches, the fail-closed production config gate, and the
 * X-Forwarded-For-keyed rate limiter — none of which the OAuth-flow suite
 * exercises.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLabApi, assertProductionConfig, type LabApiConfig } from './index';

let dir: string;
let server: Server;
let base: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'lab-api-http-'));
  writeFileSync(join(dir, 'allowlist.json'), JSON.stringify({ emails: [] }));
  process.env.LAB_CLAUDE_CLIENT_SECRET = 'secret';
  process.env.LAB_RATE_LIMIT_PER_MIN = '3';
  const cfg: LabApiConfig = {
    issuer: 'http://127.0.0.1:9',
    mcpResource: 'https://mcp.test',
    statePath: join(dir, 'state.json'),
    allowlistPath: join(dir, 'allowlist.json'),
  };
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((r) => probe.close(() => r()));
  const built = await buildLabApi({ ...cfg, issuer: `http://127.0.0.1:${port}` });
  await new Promise<void>((r) => built.server.listen(port, '127.0.0.1', r));
  server = built.server;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server?.close();
  rmSync(dir, { recursive: true, force: true });
  process.env.LAB_RATE_LIMIT_PER_MIN = '';
});

describe('CORS', () => {
  it('allowed origin is echoed exactly, without allow-credentials', async () => {
    const resp = await fetch(`${base}/health`, {
      headers: { origin: 'https://orrerylearn.com', 'x-forwarded-for': '10.0.0.1' },
    });
    expect(resp.headers.get('access-control-allow-origin')).toBe('https://orrerylearn.com');
    expect(resp.headers.get('access-control-allow-credentials')).toBeNull();
    expect(resp.headers.get('vary')).toBe('origin');
  });

  it('disallowed origin gets NO ACAO header', async () => {
    const resp = await fetch(`${base}/health`, {
      headers: { origin: 'https://evil.example', 'x-forwarded-for': '10.0.0.2' },
    });
    expect(resp.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('preflight OPTIONS answers 204 with methods/headers for an allowed origin', async () => {
    const resp = await fetch(`${base}/token`, {
      method: 'OPTIONS',
      headers: { origin: 'https://chipi.github.io', 'x-forwarded-for': '10.0.0.3' },
    });
    expect(resp.status).toBe(204);
    expect(resp.headers.get('access-control-allow-headers')).toBe('authorization, content-type');
    expect(resp.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
  });
});

describe('rate limiter', () => {
  it('keys on X-Forwarded-For; exceeding the limit → 429; other clients unaffected', async () => {
    const hit = (xff: string) =>
      fetch(`${base}/jwks`, { headers: { 'x-forwarded-for': xff } }).then((r) => r.status);
    expect(await hit('10.9.9.9')).toBe(200);
    expect(await hit('10.9.9.9')).toBe(200);
    expect(await hit('10.9.9.9')).toBe(200);
    expect(await hit('10.9.9.9')).toBe(429); // 4th within the window, limit=3
    expect(await hit('10.8.8.8')).toBe(200); // separate bucket
  });

  it('/health is exempt from the limiter (container healthcheck safety)', async () => {
    for (let i = 0; i < 6; i++) {
      const resp = await fetch(`${base}/health`, { headers: { 'x-forwarded-for': '10.7.7.7' } });
      expect(resp.status).toBe(200);
    }
  });
});

describe('assertProductionConfig', () => {
  const saved = () => ({
    env: process.env.NODE_ENV,
    gid: process.env.LAB_GOOGLE_CLIENT_ID,
    gsec: process.env.LAB_GOOGLE_CLIENT_SECRET,
    csec: process.env.LAB_CLAUDE_CLIENT_SECRET,
  });

  it('throws in production when client config is missing, naming the vars', () => {
    const s = saved();
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.LAB_GOOGLE_CLIENT_ID;
      delete process.env.LAB_GOOGLE_CLIENT_SECRET;
      process.env.LAB_CLAUDE_CLIENT_SECRET = 'x';
      expect(() => assertProductionConfig()).toThrow(
        /LAB_GOOGLE_CLIENT_ID, LAB_GOOGLE_CLIENT_SECRET/,
      );
    } finally {
      Object.assign(process.env, {
        NODE_ENV: s.env,
        LAB_GOOGLE_CLIENT_ID: s.gid,
        LAB_GOOGLE_CLIENT_SECRET: s.gsec,
        LAB_CLAUDE_CLIENT_SECRET: s.csec,
      });
    }
  });

  it('passes in production with full config, and always outside production', () => {
    const s = saved();
    try {
      process.env.NODE_ENV = 'production';
      process.env.LAB_GOOGLE_CLIENT_ID = 'id';
      process.env.LAB_GOOGLE_CLIENT_SECRET = 'sec';
      process.env.LAB_CLAUDE_CLIENT_SECRET = 'csec';
      expect(() => assertProductionConfig()).not.toThrow();
      process.env.NODE_ENV = 'test';
      delete process.env.LAB_GOOGLE_CLIENT_ID;
      expect(() => assertProductionConfig()).not.toThrow();
    } finally {
      Object.assign(process.env, {
        NODE_ENV: s.env,
        LAB_GOOGLE_CLIENT_ID: s.gid,
        LAB_GOOGLE_CLIENT_SECRET: s.gsec,
        LAB_CLAUDE_CLIENT_SECRET: s.csec,
      });
    }
  });
});
