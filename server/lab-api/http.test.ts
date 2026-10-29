/**
 * Security behavior of the http layer itself (holistic MINOR-6/7): CORS
 * allow/deny branches, the fail-closed production config gate, and the
 * client-ip-keyed rate limiter — none of which the OAuth-flow suite
 * exercises.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
      headers: { origin: 'https://orrerylearn.com', 'x-orrery-client-ip': '10.0.0.1' },
    });
    expect(resp.headers.get('access-control-allow-origin')).toBe('https://orrerylearn.com');
    expect(resp.headers.get('access-control-allow-credentials')).toBeNull();
    expect(resp.headers.get('vary')).toBe('origin');
  });

  it('disallowed origin gets NO ACAO header', async () => {
    const resp = await fetch(`${base}/health`, {
      headers: { origin: 'https://evil.example', 'x-orrery-client-ip': '10.0.0.2' },
    });
    expect(resp.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('preflight OPTIONS answers 204 with methods/headers for an allowed origin', async () => {
    const resp = await fetch(`${base}/token`, {
      method: 'OPTIONS',
      headers: { origin: 'https://chipi.github.io', 'x-orrery-client-ip': '10.0.0.3' },
    });
    expect(resp.status).toBe(204);
    expect(resp.headers.get('access-control-allow-headers')).toBe('authorization, content-type');
    expect(resp.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
  });
});

describe('rate limiter', () => {
  it('keys on X-Orrery-Client-Ip; exceeding the limit → 429; other clients unaffected', async () => {
    const hit = (ip: string) =>
      fetch(`${base}/jwks`, { headers: { 'x-orrery-client-ip': ip } }).then((r) => r.status);
    expect(await hit('10.9.9.9')).toBe(200);
    expect(await hit('10.9.9.9')).toBe(200);
    expect(await hit('10.9.9.9')).toBe(200);
    expect(await hit('10.9.9.9')).toBe(429); // 4th within the window, limit=3
    expect(await hit('10.8.8.8')).toBe(200); // separate bucket
  });

  it('ignores X-Forwarded-For: rotating it does not open new buckets (#597)', async () => {
    // Behind the Cloudflare-trusting edge the first XFF hop is client-written;
    // keying on it let a client reset its bucket per request.
    const hit = (xff: string) =>
      fetch(`${base}/jwks`, {
        headers: { 'x-orrery-client-ip': '10.6.6.6', 'x-forwarded-for': xff },
      }).then((r) => r.status);
    expect(await hit('1.1.1.1')).toBe(200);
    expect(await hit('2.2.2.2')).toBe(200);
    expect(await hit('3.3.3.3')).toBe(200);
    expect(await hit('4.4.4.4')).toBe(429);
  });

  it('warns once when a proxied request lacks the client-ip header', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await fetch(`${base}/jwks`, { headers: { 'x-forwarded-for': '9.9.9.9' } });
      await fetch(`${base}/jwks`, { headers: { 'x-forwarded-for': '9.9.9.8' } });
      const hits = warn.mock.calls.filter((c) => String(c[0]).includes('X-Orrery-Client-Ip'));
      expect(hits).toHaveLength(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('/health is exempt from the limiter (container healthcheck safety)', async () => {
    for (let i = 0; i < 6; i++) {
      const resp = await fetch(`${base}/health`, { headers: { 'x-orrery-client-ip': '10.7.7.7' } });
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
    llm: process.env.LITELLM_BASE_URL,
  });

  it('throws in production when client config is missing, naming the vars', () => {
    const s = saved();
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.LAB_GOOGLE_CLIENT_ID;
      delete process.env.LAB_GOOGLE_CLIENT_SECRET;
      process.env.LAB_CLAUDE_CLIENT_SECRET = 'x';
      process.env.LITELLM_BASE_URL = 'http://gw:4001';
      expect(() => assertProductionConfig()).toThrow(
        /LAB_GOOGLE_CLIENT_ID, LAB_GOOGLE_CLIENT_SECRET$/,
      );
    } finally {
      Object.assign(process.env, {
        NODE_ENV: s.env,
        LAB_GOOGLE_CLIENT_ID: s.gid,
        LAB_GOOGLE_CLIENT_SECRET: s.gsec,
        LAB_CLAUDE_CLIENT_SECRET: s.csec,
        LITELLM_BASE_URL: s.llm,
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
      process.env.LITELLM_BASE_URL = 'http://gw:4001';
      expect(() => assertProductionConfig()).not.toThrow();
      delete process.env.LITELLM_BASE_URL;
      expect(() => assertProductionConfig()).toThrow(/LITELLM_BASE_URL/);
      process.env.LITELLM_BASE_URL = 'http://gw:4001';
      process.env.NODE_ENV = 'test';
      delete process.env.LAB_GOOGLE_CLIENT_ID;
      expect(() => assertProductionConfig()).not.toThrow();
    } finally {
      Object.assign(process.env, {
        NODE_ENV: s.env,
        LAB_GOOGLE_CLIENT_ID: s.gid,
        LAB_GOOGLE_CLIENT_SECRET: s.gsec,
        LAB_CLAUDE_CLIENT_SECRET: s.csec,
        LITELLM_BASE_URL: s.llm,
      });
    }
  });
});
