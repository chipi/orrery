#!/usr/bin/env node
// docker-e2e.mjs — one-command local Docker e2e gate (`npm run docker:e2e`).
//
//   npm run docker:e2e                                   # build → recreate web → smoke → desktop suite
//   npm run docker:e2e -- --skip-build -- --project=mobile-chromium tests/e2e/smoke.spec.ts
//
// The local mirror of .github/workflows/docker-e2e.yml, for THIS checkout's
// Compose project and host port (.config/workspace/README.md) — never another
// stream's, never a hard-coded :8080.
//
// Why `--force-recreate`: `web` bind-mounts ./build, and adapter-static's
// build deletes build/ and creates a new directory. A container started
// before the build keeps the deleted directory mounted (empty), so every
// request falls through try_files to a missing /index.html and nginx answers
// 500 — while `docker compose up` alone reports the service as up to date.
// Any fresh container start re-resolves the mount; recreating (not just
// restarting) also applies compose/nginx.conf image changes. The
// /_app/version.json smoke check proves the served bundle IS the host build.
//
// The service is left running afterwards (like the primary's); stop it with
// `npm run docker:down`. Worktree removal stops it via .config/workspace/teardown.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pick, readWorkspaceEnv } from './workspace/env.mjs';

const USAGE =
  'usage: docker-e2e.mjs [--skip-build] [--smoke-only] [-- <playwright args>]\n' +
  '  default Playwright args: --workers=1 --project=desktop-chromium';

/**
 * @param {string[]} argv
 * @returns {{ skipBuild: boolean, smokeOnly: boolean, playwright: string[] }}
 */
export function parseArgs(argv) {
  const opts = { skipBuild: false, smokeOnly: false, playwright: /** @type {string[]} */ ([]) };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      opts.playwright = argv.slice(i + 1);
      break;
    }
    if (a === '--skip-build') opts.skipBuild = true;
    else if (a === '--smoke-only') opts.smokeOnly = true;
    else throw new Error(`unexpected argument '${a}'\n${USAGE}`);
  }
  return opts;
}

/**
 * Playwright argv: CI's single worker and the desktop project unless the
 * caller chose their own.
 * @param {string[]} userArgs
 * @returns {string[]}
 */
export function playwrightArgs(userArgs) {
  const has = (/** @type {string} */ flag) =>
    userArgs.some((a) => a === flag || a.startsWith(`${flag}=`));
  return [
    'playwright',
    'test',
    ...(has('--workers') || has('-j') ? [] : ['--workers=1']),
    ...(has('--project') ? [] : ['--project=desktop-chromium']),
    ...userArgs,
  ];
}

/**
 * Which Compose project and host port `docker compose` in this checkout will
 * use, cross-checked against the checkout's `.env.workspace` before anything
 * is started or recreated. A mismatch means the run would touch another
 * stream's (or the primary's) service — refuse.
 * @param {{ name?: string, services?: Record<string, { ports?: Array<{ target?: number, published?: string | number }> }> }} config
 *   `docker compose config --format json`
 * @param {Record<string, string>} workspaceEnv
 * @param {Record<string, string | undefined>} shellEnv
 * @returns {{ project: string, port: string }}
 */
export function resolveTarget(config, workspaceEnv, shellEnv) {
  const project = config.name;
  if (!project) throw new Error('docker compose config has no project name');
  const expectedProject = workspaceEnv.COMPOSE_PROJECT_NAME;
  if (expectedProject && project !== expectedProject) {
    throw new Error(
      `Compose project is '${project}' but .env.workspace says '${expectedProject}' — ` +
        'is COMPOSE_PROJECT_NAME set in the shell, or docker-compose.override.yml stale? ' +
        "Rerun 'wb-workspace setup'.",
    );
  }
  const mapping = (config.services?.web?.ports ?? []).find((p) => p.target === 80);
  if (!mapping?.published) throw new Error('web service publishes no host port for :80');
  const port = String(mapping.published);
  const expectedPort = pick(shellEnv.ORRERY_WEB_PORT, workspaceEnv.ORRERY_WEB_PORT, '');
  if (expectedPort && port !== expectedPort) {
    throw new Error(
      `web publishes :${port} but ORRERY_WEB_PORT is ${expectedPort} — ` +
        "docker-compose.override.yml is stale; rerun 'wb-workspace setup'.",
    );
  }
  return { project, port };
}

/**
 * The production-shape serving contract (same checks as the docker-e2e
 * workflow's smoke step) plus build freshness: the served
 * /_app/version.json must be the host build's.
 * @param {string} base e.g. http://localhost:16989
 * @param {string} hostVersion `version` from build/_app/version.json
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<string[]>} failures; empty = pass
 */
export async function smokeCheck(base, hostVersion, fetchImpl) {
  /** @type {string[]} */
  const failures = [];
  /** @param {string} path @param {(r: Response) => Promise<string | null>} check */
  const probe = async (path, check, method = 'GET') => {
    try {
      const r = await fetchImpl(`${base}${path}`, { method, redirect: 'manual' });
      const problem = r.status === 200 ? await check(r) : `HTTP ${r.status}`;
      if (problem) failures.push(`${method} ${path}: ${problem}`);
    } catch (err) {
      failures.push(`${method} ${path}: ${/** @type {Error} */ (err).message}`);
    }
  };
  const ok = async () => null;
  await probe('/', ok);
  await probe('/missions/launches', ok);
  await probe(
    '/data/launches.json',
    async (r) => {
      const cc = r.headers.get('cache-control') ?? '';
      const ct = r.headers.get('content-type') ?? '';
      if (!/no-cache/i.test(cc)) return `cache-control '${cc}', want no-cache`;
      if (!/application\/json/i.test(ct)) return `content-type '${ct}', want application/json`;
      return null;
    },
    'HEAD',
  );
  await probe('/_app/version.json', async (r) => {
    const served = /** @type {{ version?: string }} */ (await r.json()).version;
    return served === hostVersion
      ? null
      : `serves build ${served}, host build/ is ${hostVersion} — stale bind mount`;
  });
  return failures;
}

/**
 * @typedef {{ status: number | null, stdout: string }} ExecResult
 * @typedef {{
 *   exec: (cmd: string, args: string[], opts?: { capture?: boolean, env?: Record<string, string | undefined> }) => ExecResult,
 *   fetch: typeof fetch,
 *   readFile: (path: string) => string,
 *   log: (msg: string) => void,
 *   env: Record<string, string | undefined>,
 *   workspaceEnv: Record<string, string>,
 * }} Deps
 */

/**
 * @param {string[]} argv
 * @param {Deps} deps
 * @returns {Promise<number>} exit code
 */
export async function run(argv, deps) {
  const { exec, log } = deps;
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    log(`docker-e2e: ${/** @type {Error} */ (err).message}`);
    return 2;
  }
  const fail = (/** @type {string} */ stage, /** @type {number | null} */ status) => {
    log(`docker-e2e: FAIL at ${stage}`);
    return status || 1;
  };
  const step = (/** @type {string} */ msg) => log(`\n==> docker-e2e: ${msg}`);
  const compose = (/** @type {string[]} */ args, capture = false) =>
    exec('docker', ['compose', ...args], { capture });

  step('resolving this checkout’s Compose project + web port');
  const cfg = compose(['config', '--format', 'json'], true);
  if (cfg.status !== 0) return fail('docker compose config', cfg.status);
  let target;
  try {
    target = resolveTarget(JSON.parse(cfg.stdout), deps.workspaceEnv, deps.env);
  } catch (err) {
    log(`docker-e2e: ${/** @type {Error} */ (err).message}`);
    return fail('target resolution', 1);
  }
  log(`project=${target.project} port=${target.port}`);

  if (!opts.skipBuild) {
    step('npm run build');
    const b = exec('npm', ['run', 'build']);
    if (b.status !== 0) return fail('npm run build', b.status);
  }
  let hostVersion;
  try {
    hostVersion = JSON.parse(deps.readFile('build/_app/version.json')).version;
  } catch (err) {
    log(
      `docker-e2e: no usable build/ (${/** @type {Error} */ (err).message}) — run without --skip-build`,
    );
    return fail('build check', 1);
  }

  const dumpLogs = () => compose(['logs', '--tail=80', 'web']);

  step(`recreating web on the fresh build/ and waiting for healthy (${target.project})`);
  const up = compose([
    'up',
    '-d',
    '--build',
    '--force-recreate',
    '--no-deps',
    '--wait',
    '--wait-timeout',
    '120',
    'web',
  ]);
  if (up.status !== 0) {
    dumpLogs();
    return fail('docker compose up --wait (web not healthy)', up.status);
  }

  const ps = compose(['ps', '--format', 'json', 'web'], true);
  /** @type {{ Name?: string, Project?: string, Health?: string }} */
  let svc = {};
  try {
    svc = JSON.parse(ps.stdout.trim().split('\n')[0] || '{}');
  } catch {
    // reported below as missing fields
  }
  const portOut = compose(['port', 'web', '80'], true).stdout.trim();
  const livePort = portOut.slice(portOut.lastIndexOf(':') + 1);
  log(`container=${svc.Name} project=${svc.Project} health=${svc.Health} published=${portOut}`);
  if (svc.Project !== target.project || livePort !== target.port || svc.Health !== 'healthy') {
    dumpLogs();
    return fail('post-up verification (project/port/health mismatch)', 1);
  }

  const base = `http://localhost:${target.port}`;
  step(`smoke checks against ${base}`);
  const failures = await smokeCheck(base, hostVersion, deps.fetch);
  for (const f of failures) log(`  ✗ ${f}`);
  if (failures.length) {
    dumpLogs();
    return fail('smoke checks', 1);
  }
  log(`  ✓ 4 checks (serving build ${hostVersion})`);

  if (!opts.smokeOnly) {
    const pwArgs = playwrightArgs(opts.playwright);
    step(`npx ${pwArgs.join(' ')} (PLAYWRIGHT_BASE_URL=${base})`);
    const pw = exec('npx', pwArgs, { env: { ...deps.env, PLAYWRIGHT_BASE_URL: base } });
    if (pw.status !== 0) {
      dumpLogs();
      return fail('playwright', pw.status);
    }
  }

  step(`PASS — ${svc.Name} left running on :${target.port} (npm run docker:down to stop)`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  /** @type {Deps} */
  const deps = {
    exec: (cmd, args, opts = {}) => {
      const r = spawnSync(cmd, args, {
        stdio: opts.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
        encoding: 'utf8',
        env: opts.env ?? process.env,
      });
      if (r.error) console.error(`docker-e2e: ${cmd}: ${r.error.message}`);
      return { status: r.error ? 127 : r.status, stdout: r.stdout ?? '' };
    },
    fetch,
    readFile: (p) => readFileSync(p, 'utf8'),
    log: (m) => console.log(m),
    env: process.env,
    workspaceEnv: readWorkspaceEnv(),
  };
  process.exitCode = await run(process.argv.slice(2), deps);
}
