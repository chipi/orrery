// Tests for Orrery's parallel-worktree runtime layer (.config/workspace/README.md):
// the .env.workspace reader, with-env.mjs, the setup/teardown scripts (run for
// real with bash, against temp dirs, a stub `wb-workspace` and a stub `docker`),
// and the repo invariants (compose file, package scripts, .gitignore).
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WORKSPACE_ENV_FILE, parseWorkspaceEnv, pick, readWorkspaceEnv } from './env.mjs';
import { buildEnv, parseArgs } from './with-env.mjs';

const REPO = resolve(import.meta.dirname, '..', '..');
const SETUP = join(REPO, '.config', 'workspace', 'setup');
const TEARDOWN = join(REPO, '.config', 'workspace', 'teardown');
const WITH_ENV = join(REPO, 'scripts', 'workspace', 'with-env.mjs');

let T: string;
beforeEach(() => {
  T = mkdtempSync(join(tmpdir(), 'orrery-ws-'));
});
afterEach(() => {
  rmSync(T, { recursive: true, force: true });
});

function exe(path: string, body: string) {
  writeFileSync(path, body);
  chmodSync(path, 0o755);
}

describe('env.mjs', () => {
  it('parses KEY=value, skipping comments, blanks and invalid keys', () => {
    const env = parseWorkspaceEnv(
      '# header\n\nVITE_DEV_PORT=15001\r\nLAB_CORS_ORIGINS=http://localhost:1=2\n lower=x\n=nokey\nNOEQ\n  E2E_PORT = 15002 \n',
    );
    expect(env).toEqual({
      VITE_DEV_PORT: '15001',
      LAB_CORS_ORIGINS: 'http://localhost:1=2',
      E2E_PORT: '15002',
    });
  });

  it('reads the checkout file, {} when absent, rethrows other errors', () => {
    expect(readWorkspaceEnv(T)).toEqual({});
    writeFileSync(join(T, WORKSPACE_ENV_FILE), 'MCP_PORT=15005\n');
    expect(readWorkspaceEnv(T)).toEqual({ MCP_PORT: '15005' });
    const d = join(T, 'dir');
    mkdirSync(join(d, WORKSPACE_ENV_FILE), { recursive: true });
    expect(() => readWorkspaceEnv(d)).toThrow();
  });

  it('reads from the current directory by default', () => {
    const cwd = process.cwd();
    try {
      process.chdir(T);
      writeFileSync(WORKSPACE_ENV_FILE, 'E2E_PORT=15009\n');
      expect(readWorkspaceEnv()).toEqual({ E2E_PORT: '15009' });
    } finally {
      process.chdir(cwd);
    }
  });

  it('pick: explicit > workspace > fallback, empty strings skipped', () => {
    expect(pick('1', '2', '3')).toBe('1');
    expect(pick(undefined, '2', '3')).toBe('2');
    expect(pick('', '', '3')).toBe('3');
    expect(pick(undefined, undefined, '3')).toBe('3');
  });
});

describe('with-env.mjs', () => {
  it('buildEnv: shell wins over workspace, workspace over --default, ${} expands', () => {
    const env = buildEnv(
      { LAB_PORT: '', KEEP: 'shell', MCP_PORT: '9000' },
      { LAB_PORT: '15004', MCP_PORT: '15005', KEEP: 'ws' },
      ['LAB_PORT=8093', 'LAB_ISSUER=http://localhost:${LAB_PORT}', 'EMPTY=${NOPE}'],
    );
    expect(env.KEEP).toBe('shell');
    expect(env.MCP_PORT).toBe('9000');
    expect(env.LAB_PORT).toBe('15004');
    expect(env.LAB_ISSUER).toBe('http://localhost:15004');
    expect(env.EMPTY).toBe('');
    const primary = buildEnv({}, {}, ['LAB_PORT=8093', 'LAB_ISSUER=http://localhost:${LAB_PORT}']);
    expect(primary.LAB_ISSUER).toBe('http://localhost:8093');
    expect(() => buildEnv({}, {}, ['=x'])).toThrow(/KEY=VALUE/);
  });

  it('parseArgs: --default specs, then the command after --', () => {
    expect(parseArgs(['--default', 'A=1', '--', 'tsx', 'x.ts'])).toEqual({
      defaults: ['A=1'],
      command: ['tsx', 'x.ts'],
    });
    expect(() => parseArgs(['--default', 'A=1'])).toThrow(/no command/);
    expect(() => parseArgs(['--bogus', '--', 'x'])).toThrow(/unexpected argument/);
  });

  it('runs the command with the merged env and passes its exit code through', () => {
    writeFileSync(join(T, WORKSPACE_ENV_FILE), 'LAB_PORT=15004\nFROM_WS=yes\n');
    exe(join(T, 'show.sh'), '#!/bin/sh\necho "$LAB_PORT $LAB_ISSUER $FROM_WS"\nexit 5\n');
    const r = spawnSync(
      process.execPath,
      [
        WITH_ENV,
        '--default',
        'LAB_PORT=8093',
        '--default',
        'LAB_ISSUER=http://localhost:${LAB_PORT}',
        '--',
        './show.sh',
      ],
      { cwd: T, encoding: 'utf8', env: { PATH: process.env.PATH } },
    );
    expect(r.stdout.trim()).toBe('15004 http://localhost:15004 yes');
    expect(r.status).toBe(5);
    const bad = spawnSync(process.execPath, [WITH_ENV, '--bogus'], { cwd: T, encoding: 'utf8' });
    expect(bad.status).toBe(2);
    const missing = spawnSync(process.execPath, [WITH_ENV, '--', './does-not-exist'], {
      cwd: T,
      encoding: 'utf8',
    });
    expect(missing.status).toBe(127);
  });
});

// --- setup -------------------------------------------------------------------
const PORTS = ['15001', '15002', '15003', '15004', '15005'];

function setupFixture(stream: string) {
  const primary = join(T, 'orrery', 'main');
  const path = stream === 'main' ? primary : join(T, 'orrery', 'worktrees', stream);
  mkdirSync(primary, { recursive: true });
  mkdirSync(path, { recursive: true });
  const stub = join(T, 'wb-workspace');
  exe(
    stub,
    `#!/bin/sh\necho "$*" >> "${T}/wb.calls"\n[ -n "$STUB_FAIL" ] && { echo "collision" >&2; exit 3; }\nprintf '%s\\n' ${PORTS.join(' ')}\n`,
  );
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    WB_WORKSPACE: stub,
    WORKSPACE_PROJECT: 'orrery',
    WORKSPACE_STREAM: stream,
    WORKSPACE_ID: `orrery-${stream}`,
    WORKSPACE_PRIMARY: primary,
    WORKSPACE_PATH: path,
    COMPOSE_PROJECT_NAME: `orrery-${stream}`,
  };
  const run = (args: string[] = [], extra: Record<string, string> = {}) =>
    spawnSync('bash', [SETUP, ...args], { cwd: T, encoding: 'utf8', env: { ...env, ...extra } });
  return { primary, path, run };
}

describe('.config/workspace/setup', () => {
  it('primary: identity + Compose name only, today’s default ports, user files untouched', () => {
    const { path, run } = setupFixture('main');
    writeFileSync(join(path, '.env.local'), 'VITE_DEV_PORT=5373\n');
    writeFileSync(join(path, '.env'), 'ANTHROPIC_API_KEY=sk-secret\n');
    const r = run();
    expect(r.status).toBe(0);
    const ws = parseWorkspaceEnv(readFileSync(join(path, '.env.workspace'), 'utf8'));
    expect(ws).toMatchObject({ WORKSPACE_STREAM: 'main', COMPOSE_PROJECT_NAME: 'orrery-main' });
    for (const k of ['VITE_DEV_PORT', 'E2E_PORT', 'LAB_PORT', 'MCP_PORT', 'ORRERY_WEB_PORT'])
      expect(ws[k]).toBeUndefined();
    const override = readFileSync(join(path, 'docker-compose.override.yml'), 'utf8');
    expect(override).toMatch(/^name: orrery-main$/m);
    expect(override).not.toMatch(/ports/);
    expect(readFileSync(join(path, '.env.local'), 'utf8')).toBe('VITE_DEV_PORT=5373\n');
    expect(readFileSync(join(path, '.env'), 'utf8')).toBe('ANTHROPIC_API_KEY=sk-secret\n');
    expect(existsSync(join(T, 'wb.calls'))).toBe(false); // the primary asks for no ports
  });

  it('side stream: one port call for all slots, values + derived URLs, override with !override port', () => {
    const { path, run } = setupFixture('feat-x');
    const r = run();
    expect(r.status).toBe(0);
    expect(readFileSync(join(T, 'wb.calls'), 'utf8').trim()).toBe(
      'port web e2e docker-web lab-api mcp',
    );
    const ws = parseWorkspaceEnv(readFileSync(join(path, '.env.workspace'), 'utf8'));
    expect(ws).toMatchObject({
      VITE_DEV_PORT: '15001',
      E2E_PORT: '15002',
      ORRERY_WEB_PORT: '15003',
      LAB_PORT: '15004',
      LAB_ISSUER: 'http://localhost:15004',
      VITE_LAB_API_URL: 'http://localhost:15004',
      LAB_CORS_ORIGINS: 'http://localhost:15001',
      LAB_WEB_REDIRECT_URIS: 'http://localhost:15001/lab/callback',
      MCP_PORT: '15005',
      COMPOSE_PROJECT_NAME: 'orrery-feat-x',
    });
    const override = readFileSync(join(path, 'docker-compose.override.yml'), 'utf8');
    expect(override).toMatch(/^name: orrery-feat-x$/m);
    expect(override).toMatch(/ports: !override\n\s+- '15003:80'/);
    expect(r.stdout).toMatch(/no \.env: +secrets are not copied/);
  });

  it('is idempotent: a rerun reports unchanged and leaves the files byte-identical', () => {
    const { path, run } = setupFixture('feat-x');
    expect(run().status).toBe(0);
    const before = ['.env.workspace', 'docker-compose.override.yml'].map((f) => [
      readFileSync(join(path, f), 'utf8'),
      statSync(join(path, f)).mtimeMs,
    ]);
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout.match(/unchanged/g)).toHaveLength(2);
    const after = ['.env.workspace', 'docker-compose.override.yml'].map((f) => [
      readFileSync(join(path, f), 'utf8'),
      statSync(join(path, f)).mtimeMs,
    ]);
    expect(after).toEqual(before);
  });

  it('refuses to overwrite a file it did not generate', () => {
    const { path, run } = setupFixture('feat-x');
    writeFileSync(join(path, 'docker-compose.override.yml'), 'services: {}\n');
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/docker-compose.override.yml exists and was not generated/);
    expect(readFileSync(join(path, 'docker-compose.override.yml'), 'utf8')).toBe('services: {}\n');
    expect(existsSync(join(path, '.env.workspace'))).toBe(false);
  });

  it('propagates a port failure (collision) and writes nothing', () => {
    const { path, run } = setupFixture('feat-x');
    const r = run([], { STUB_FAIL: '1' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/could not derive ports/);
    expect(existsSync(join(path, '.env.workspace'))).toBe(false);
    expect(existsSync(join(path, 'docker-compose.override.yml'))).toBe(false);
  });

  it('never copies secrets; --link-env makes a symlink to the primary .env, only on request', () => {
    const { primary, path, run } = setupFixture('feat-x');
    writeFileSync(join(primary, '.env'), 'ANTHROPIC_API_KEY=sk-secret\n');
    expect(run().status).toBe(0);
    expect(existsSync(join(path, '.env'))).toBe(false);
    for (const f of ['.env.workspace', 'docker-compose.override.yml']) {
      expect(readFileSync(join(path, f), 'utf8')).not.toMatch(/sk-secret|ANTHROPIC/);
    }
    const linked = run(['--link-env']);
    expect(linked.status).toBe(0);
    expect(lstatSync(join(path, '.env')).isSymbolicLink()).toBe(true);
    expect(readlinkSync(join(path, '.env'))).toBe(join(primary, '.env'));
    expect(run(['--link-env']).stdout).toMatch(/unchanged \.env ->/);
  });

  it('--link-env refuses in the primary, over an existing .env, and without a primary .env', () => {
    const main = setupFixture('main');
    expect(main.run(['--link-env']).status).toBe(1);
    rmSync(join(T, 'orrery'), { recursive: true });
    const side = setupFixture('feat-x');
    const none = side.run(['--link-env']);
    expect(none.status).toBe(1);
    expect(none.stderr).toMatch(/primary has no \.env/);
    writeFileSync(join(side.primary, '.env'), 'X=1\n');
    writeFileSync(join(side.path, '.env'), 'MINE=1\n');
    const clash = side.run(['--link-env']);
    expect(clash.status).toBe(1);
    expect(readFileSync(join(side.path, '.env'), 'utf8')).toBe('MINE=1\n');
  });

  it('warns when a user env file pins a port the stream derives', () => {
    const { path, run } = setupFixture('feat-x');
    writeFileSync(join(path, '.env.local'), 'VITE_DEV_PORT=5373\n');
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/\.env\.local sets VITE_DEV_PORT/);
  });

  it('fails without the wb-workspace identity, and on unknown arguments', () => {
    const r = spawnSync('bash', [SETUP], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '' },
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/run this through 'wb-workspace setup'/);
    expect(setupFixture('feat-x').run(['--bogus']).status).toBe(1);
  });
});

// --- teardown ----------------------------------------------------------------
function teardownFixture(stream: string, docker: Record<string, string> = {}, withDocker = true) {
  const path = join(T, 'wt');
  mkdirSync(path, { recursive: true });
  const bin = join(T, 'bin');
  mkdirSync(bin, { recursive: true });
  const bash = spawnSync('bash', ['-c', 'command -v bash'], { encoding: 'utf8' }).stdout.trim();
  symlinkSync(bash, join(bin, 'bash'));
  if (withDocker) {
    exe(
      join(bin, 'docker'),
      `#!${bash}
echo "$*" >> "${T}/docker.calls"
case "$1 $2" in
  "info "*) [ -z "$INFO_FAIL" ] ;;
  "ps "*) [ -n "$PS_OUT" ] && echo "$PS_OUT"; exit 0 ;;
  "network ls") exit 0 ;;
  "compose "*) [ -z "$DOWN_FAIL" ] ;;
  "volume ls") case "$*" in *disposable*) [ -n "$VOLS_DISPOSABLE" ] && echo "$VOLS_DISPOSABLE" ;; *) [ -n "$VOLS_ALL" ] && echo "$VOLS_ALL" ;; esac; exit 0 ;;
  "volume rm") [ -z "$RM_FAIL" ] ;;
  *) echo "unexpected: $*" >&2; exit 99 ;;
esac
`,
    );
  }
  const r = spawnSync(join(bin, 'bash'), [TEARDOWN], {
    encoding: 'utf8',
    env: {
      PATH: bin,
      WORKSPACE_STREAM: stream,
      WORKSPACE_PATH: path,
      COMPOSE_PROJECT_NAME: `orrery-${stream}`,
      ...docker,
    },
  });
  const calls = existsSync(join(T, 'docker.calls'))
    ? readFileSync(join(T, 'docker.calls'), 'utf8').trim().split('\n')
    : [];
  return { r, calls };
}

describe('.config/workspace/teardown', () => {
  it('side stream: stops only its Compose project, removes only labelled disposable volumes', () => {
    const { r, calls } = teardownFixture('feat-x', {
      PS_OUT: 'abc123',
      VOLS_DISPOSABLE: 'orrery-feat-x_orrery-cache',
      VOLS_ALL: 'orrery-feat-x_keepme',
    });
    expect(r.status).toBe(0);
    expect(calls).toContain('compose -p orrery-feat-x down --remove-orphans');
    expect(calls).toContain('volume rm orrery-feat-x_orrery-cache');
    expect(calls.filter((c) => c.startsWith('volume rm'))).toEqual([
      'volume rm orrery-feat-x_orrery-cache',
    ]);
    expect(r.stdout).toMatch(/kept: orrery-feat-x_keepme/);
    for (const c of calls.filter((c) => /^(ps|network ls|volume ls)/.test(c))) {
      expect(c).toContain('label=com.docker.compose.project=orrery-feat-x');
    }
    expect(calls.join('\n')).not.toMatch(/prune|down -v|--volumes|system /);
  });

  it('primary: stops the project but never removes volumes, even disposable ones', () => {
    const { r, calls } = teardownFixture('main', {
      PS_OUT: 'abc',
      VOLS_DISPOSABLE: 'orrery-main_orrery-cache',
    });
    expect(r.status).toBe(0);
    expect(calls).toContain('compose -p orrery-main down --remove-orphans');
    expect(calls.some((c) => c.startsWith('volume'))).toBe(false);
  });

  it('idempotent: nothing running → no compose down, exit 0', () => {
    const { r, calls } = teardownFixture('feat-x');
    expect(r.status).toBe(0);
    expect(calls.some((c) => c.startsWith('compose'))).toBe(false);
    expect(r.stdout).toMatch(/nothing running/);
  });

  it('no docker, or no daemon: nothing to stop, exit 0 (removal not blocked)', () => {
    expect(teardownFixture('feat-x', {}, false).r.status).toBe(0);
    rmSync(join(T, 'bin'), { recursive: true });
    const { r, calls } = teardownFixture('feat-x', { INFO_FAIL: '1' });
    expect(r.status).toBe(0);
    expect(calls).toEqual(['info']);
  });

  it('compose down failure → exit 1 (blocks wt remove); a stuck volume does not', () => {
    const down = teardownFixture('feat-x', { PS_OUT: 'abc', DOWN_FAIL: '1' });
    expect(down.r.status).toBe(1);
    expect(down.r.stderr).toMatch(/could not stop Compose project orrery-feat-x/);
    rmSync(T, { recursive: true });
    mkdirSync(T);
    const vol = teardownFixture('feat-x', { VOLS_DISPOSABLE: 'v1', RM_FAIL: '1' });
    expect(vol.r.status).toBe(0);
    expect(vol.r.stderr).toMatch(/could not remove disposable volume v1/);
  });

  it('fails without the wb-workspace identity', () => {
    const r = spawnSync('bash', [TEARDOWN], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '' },
    });
    expect(r.status).toBe(1);
  });
});

// --- repo invariants -----------------------------------------------------------
describe('repo invariants for parallel checkouts', () => {
  const compose = readFileSync(join(REPO, 'docker-compose.yml'), 'utf8');
  const code = compose
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n');

  it('docker-compose.yml names nothing globally', () => {
    expect(code).not.toMatch(/container_name:/);
    expect(code).not.toMatch(/^\s+image:/m);
    // The top-level volumes block, structurally: orrery-cache, labelled
    // disposable, and no global `name:`.
    const volumes = compose.slice(compose.search(/^volumes:$/m));
    expect(volumes).toMatch(
      /^volumes:\n {2}orrery-cache:\n(?: {4}#.*\n)* {4}labels:\n {6}org\.orrery\.workspace\.disposable: 'true'\n?$/,
    );
    expect(code).toMatch(/- '8080:80'/); // primary default unchanged
  });

  it('web: build/ is never auto-created — the nested ./static/data mount needs a real build', () => {
    // A checkout without `npm run build` (e.g. a fresh side worktree) must fail
    // with "bind source path does not exist", not get a root-owned empty build/
    // whose read-only mount can't hold the /usr/share/nginx/html/data mountpoint.
    expect(compose).toMatch(
      /- type: bind\n {8}source: \.\/build\n {8}target: \/usr\/share\/nginx\/html\n {8}read_only: true\n {8}bind:\n {10}create_host_path: false\n/,
    );
    expect(code).not.toMatch(/- \.\/build:/);
    expect(code).toMatch(/- \.\/static\/data:\/usr\/share\/nginx\/html\/data:ro/);
  });

  it('package scripts: project-scoped reset, workspace-aware servers', () => {
    const scripts = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).scripts as Record<
      string,
      string
    >;
    expect(scripts['docker:reset-data']).toBe('docker compose down -v');
    expect(Object.values(scripts).join('\n')).not.toMatch(
      /docker volume rm|docker system prune|docker volume prune/,
    );
    expect(scripts['lab-api:dev']).toMatch(
      /with-env\.mjs .*LAB_ISSUER=http:\/\/localhost:\$\{LAB_PORT\}/,
    );
    expect(scripts['mcp:dev']).toMatch(/with-env\.mjs/);
  });

  it('generated files are git-ignored; the project scripts are executable', () => {
    const r = spawnSync('git', ['check-ignore', '.env.workspace', 'docker-compose.override.yml'], {
      cwd: REPO,
      encoding: 'utf8',
    });
    expect(r.stdout.trim().split('\n')).toEqual(['.env.workspace', 'docker-compose.override.yml']);
    for (const f of [SETUP, TEARDOWN]) expect(statSync(f).mode & 0o111).not.toBe(0);
  });
});
