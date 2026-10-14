// Tests for scripts/docker-e2e.mjs (`npm run docker:e2e`): argument handling,
// the Compose-target guard, the smoke contract, and the orchestration against
// a fake docker/npm — no daemon needed.
import { describe, expect, it } from 'vitest';
import { parseArgs, playwrightArgs, resolveTarget, run, smokeCheck } from './docker-e2e.mjs';

const WS = { COMPOSE_PROJECT_NAME: 'orrery-s1', ORRERY_WEB_PORT: '16989' };
const config = (name = 'orrery-s1', published: string | number = '16989') => ({
  name,
  services: { web: { ports: [{ target: 80, published }] } },
});

describe('parseArgs / playwrightArgs', () => {
  it('flags, then everything after -- goes to Playwright', () => {
    expect(parseArgs([])).toEqual({ skipBuild: false, smokeOnly: false, playwright: [] });
    expect(parseArgs(['--skip-build', '--smoke-only', '--', '--skip-build', 'x.spec.ts'])).toEqual({
      skipBuild: true,
      smokeOnly: true,
      playwright: ['--skip-build', 'x.spec.ts'],
    });
    expect(() => parseArgs(['--project=x'])).toThrow(/unexpected argument '--project=x'/);
  });

  it('defaults to one worker + desktop-chromium unless the caller chose', () => {
    expect(playwrightArgs([])).toEqual([
      'playwright',
      'test',
      '--workers=1',
      '--project=desktop-chromium',
    ]);
    expect(playwrightArgs(['--project=mobile-chromium', '-j', '2', 'a.spec.ts'])).toEqual([
      'playwright',
      'test',
      '--project=mobile-chromium',
      '-j',
      '2',
      'a.spec.ts',
    ]);
    expect(playwrightArgs(['--workers', '3', '--project', 'x'])).toEqual([
      'playwright',
      'test',
      '--workers',
      '3',
      '--project',
      'x',
    ]);
  });
});

describe('resolveTarget', () => {
  it('returns the project + published port when they match the workspace', () => {
    expect(resolveTarget(config(), WS, {})).toEqual({ project: 'orrery-s1', port: '16989' });
    expect(resolveTarget(config('orrery-s1', 16989), WS, {}).port).toBe('16989');
  });

  it('no .env.workspace (CI, fresh clone): whatever Compose resolves, e.g. :8080', () => {
    expect(resolveTarget(config('orrery', '8080'), {}, {})).toEqual({
      project: 'orrery',
      port: '8080',
    });
  });

  it('refuses another project — e.g. COMPOSE_PROJECT_NAME=orrery-main leaking into the shell', () => {
    expect(() => resolveTarget(config('orrery-main', '16989'), WS, {})).toThrow(
      /project is 'orrery-main' but .env.workspace says 'orrery-s1'/,
    );
  });

  it('refuses a port that is not this stream’s (stale override, or :8080)', () => {
    expect(() => resolveTarget(config('orrery-s1', '8080'), WS, {})).toThrow(
      /publishes :8080 but ORRERY_WEB_PORT is 16989/,
    );
    // The shell's ORRERY_WEB_PORT wins over the workspace file, as everywhere.
    expect(() => resolveTarget(config(), WS, { ORRERY_WEB_PORT: '17000' })).toThrow(
      /ORRERY_WEB_PORT is 17000/,
    );
  });

  it('fails on a config without a name or a published :80', () => {
    expect(() => resolveTarget({}, {}, {})).toThrow(/no project name/);
    expect(() => resolveTarget({ name: 'x', services: { web: {} } }, {}, {})).toThrow(
      /no host port/,
    );
    expect(() =>
      resolveTarget(
        { name: 'x', services: { web: { ports: [{ target: 443, published: '1' }] } } },
        {},
        {},
      ),
    ).toThrow(/no host port/);
  });
});

type Reply = { status?: number; headers?: Record<string, string>; json?: unknown } | Error;
function fakeFetch(replies: Record<string, Reply>) {
  const calls: string[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    const r = replies[path] ?? {};
    if (r instanceof Error) throw r;
    return new Response(r.json === undefined ? '' : JSON.stringify(r.json), {
      status: r.status ?? 200,
      headers: r.headers,
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const healthy: Record<string, Reply> = {
  '/data/launches.json': {
    headers: { 'cache-control': 'no-cache', 'content-type': 'application/json' },
  },
  '/_app/version.json': { json: { version: 'v2' } },
};

describe('smokeCheck', () => {
  it('passes the serving contract against this checkout’s port', async () => {
    const f = fakeFetch(healthy);
    expect(await smokeCheck('http://localhost:16989', 'v2', f.impl)).toEqual([]);
    expect(f.calls).toEqual([
      'GET http://localhost:16989/',
      'GET http://localhost:16989/missions/launches',
      'HEAD http://localhost:16989/data/launches.json',
      'GET http://localhost:16989/_app/version.json',
    ]);
  });

  it('flags a stale build mount: served version ≠ host build/', async () => {
    const f = fakeFetch(healthy);
    expect(await smokeCheck('http://h', 'v3', f.impl)).toEqual([
      'GET /_app/version.json: serves build v2, host build/ is v3 — stale bind mount',
    ]);
  });

  it('flags the deleted-mount symptom (500 / 404), wrong headers and network errors', async () => {
    const f = fakeFetch({
      '/': { status: 500 },
      '/missions/launches': new Error('ECONNREFUSED'),
      '/data/launches.json': { headers: { 'cache-control': 'max-age=60' } },
      '/_app/version.json': { status: 404 },
    });
    expect(await smokeCheck('http://h', 'v2', f.impl)).toEqual([
      'GET /: HTTP 500',
      'GET /missions/launches: ECONNREFUSED',
      "HEAD /data/launches.json: cache-control 'max-age=60', want no-cache",
      'GET /_app/version.json: HTTP 404',
    ]);
    const ct = fakeFetch({
      ...healthy,
      '/data/launches.json': {
        headers: { 'cache-control': 'no-cache', 'content-type': 'text/html' },
      },
    });
    expect(await smokeCheck('http://h', 'v2', ct.impl)).toEqual([
      "HEAD /data/launches.json: content-type 'text/html', want application/json",
    ]);
  });
});

// --- orchestration -------------------------------------------------------------
function harness(over: { status?: Record<string, number>; ps?: string; port?: string } = {}) {
  const calls: string[] = [];
  const envs: Array<Record<string, string | undefined> | undefined> = [];
  const logs: string[] = [];
  const out: Record<string, string> = {
    'docker compose config --format json': JSON.stringify(config()),
    'docker compose ps --format json web':
      over.ps ?? '{"Name":"orrery-s1-web-1","Project":"orrery-s1","Health":"healthy"}\n',
    'docker compose port web 80': over.port ?? '0.0.0.0:16989\n',
  };
  const deps = {
    exec: (
      cmd: string,
      args: string[],
      opts: { env?: Record<string, string | undefined> } = {},
    ) => {
      const line = [cmd, ...args].join(' ');
      calls.push(line);
      envs.push(opts.env);
      const key = Object.keys(over.status ?? {}).find((k) => line.startsWith(k));
      return { status: key ? over.status![key] : 0, stdout: out[line] ?? '' };
    },
    fetch: fakeFetch(healthy).impl,
    readFile: (p: string) => {
      if (p !== 'build/_app/version.json') throw new Error(`unexpected read ${p}`);
      return '{"version":"v2"}';
    },
    log: (m: string) => logs.push(m),
    env: { PATH: '/bin' },
    workspaceEnv: WS,
  };
  return { deps, calls, envs, logs };
}

describe('run', () => {
  it('build → recreate on the fresh build → verify → smoke → Playwright on this port', async () => {
    const h = harness();
    expect(await run([], h.deps)).toBe(0);
    expect(h.calls).toEqual([
      'docker compose config --format json',
      'npm run build',
      'docker compose up -d --build --force-recreate --no-deps --wait --wait-timeout 120 web',
      'docker compose ps --format json web',
      'docker compose port web 80',
      'npx playwright test --workers=1 --project=desktop-chromium',
    ]);
    expect(h.envs.at(-1)).toEqual({ PATH: '/bin', PLAYWRIGHT_BASE_URL: 'http://localhost:16989' });
    // Only ever this checkout's `docker compose` — never -p, down, rm or prune.
    expect(h.calls.join('\n')).not.toMatch(/ -p |down|\brm\b|prune|docker (?!compose)/);
    expect(h.logs.at(-1)).toMatch(/PASS — orrery-s1-web-1 left running on :16989/);
  });

  it('--skip-build --smoke-only, with Playwright args passed through', async () => {
    const h = harness();
    expect(await run(['--skip-build', '--smoke-only'], h.deps)).toBe(0);
    expect(h.calls).not.toContain('npm run build');
    expect(h.calls.some((c) => c.startsWith('npx'))).toBe(false);
    const p = harness();
    expect(
      await run(['--skip-build', '--', '--project=mobile-chromium', 'a.spec.ts'], p.deps),
    ).toBe(0);
    expect(p.calls.at(-1)).toBe(
      'npx playwright test --workers=1 --project=mobile-chromium a.spec.ts',
    );
  });

  it('refuses before touching anything when the target is not this stream', async () => {
    const h = harness();
    h.deps.workspaceEnv = { ...WS, COMPOSE_PROJECT_NAME: 'orrery-main' };
    expect(await run([], h.deps)).toBe(1);
    expect(h.calls).toEqual(['docker compose config --format json']);
    expect(h.logs.join('\n')).toMatch(/FAIL at target resolution/);
  });

  it('usage error → 2; config / build failures pass their status through', async () => {
    expect(await run(['--nope'], harness().deps)).toBe(2);
    const c = harness({ status: { 'docker compose config': 14 } });
    expect(await run([], c.deps)).toBe(14);
    const b = harness({ status: { 'npm run build': 3 } });
    expect(await run([], b.deps)).toBe(3);
    expect(b.calls.some((x) => x.includes(' up '))).toBe(false);
  });

  it('--skip-build without a build/ fails before Compose up', async () => {
    const h = harness();
    h.deps.readFile = () => {
      throw new Error('ENOENT');
    };
    expect(await run(['--skip-build'], h.deps)).toBe(1);
    expect(h.calls).toEqual(['docker compose config --format json']);
  });

  it('unhealthy web, a post-up mismatch, failed smoke or Playwright → non-zero + web logs', async () => {
    const up = harness({ status: { 'docker compose up': 1 } });
    expect(await run([], up.deps)).toBe(1);
    expect(up.calls.at(-1)).toBe('docker compose logs --tail=80 web');

    const port = harness({ port: '0.0.0.0:8080\n' });
    expect(await run([], port.deps)).toBe(1);
    expect(port.logs.join('\n')).toMatch(/post-up verification/);

    const ps = harness({ ps: 'not json' });
    expect(await run([], ps.deps)).toBe(1);

    const smoke = harness();
    smoke.deps.fetch = fakeFetch({ ...healthy, '/': { status: 500 } }).impl;
    expect(await run([], smoke.deps)).toBe(1);
    expect(smoke.logs).toContain('  ✗ GET /: HTTP 500');
    expect(smoke.calls.some((c) => c.startsWith('npx'))).toBe(false);

    const pw = harness({ status: { 'npx playwright': 7 } });
    expect(await run([], pw.deps)).toBe(7);
    expect(pw.calls.at(-1)).toBe('docker compose logs --tail=80 web');
  });
});
