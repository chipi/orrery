/**
 * scripts/sourcemaps/package.mjs (#595) runs inside the prod deploy job, so a broken
 * packager blocks a deploy. This drives the real script over a throwaway build
 * directory shaped like a SENTRY_SOURCEMAPS=1 build (chunks carrying the
 * sentryVitePlugin snippet, hidden maps, .br/.gz siblings).
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const SCRIPT = join(process.cwd(), 'scripts/sourcemaps/package.mjs');
const ID = 'faadf528-409f-4c15-b37d-f1b5aa51beb5';
const SNIPPET = `!function(){try{var e=globalThis;e._sentryDebugIdIdentifier="sentry-dbid-${ID}"}catch(e){}}();`;
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

function run(build: string, out: string): { code: number; output: string } {
  try {
    const output = execFileSync('node', [SCRIPT, build, out], { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, output };
  } catch (e) {
    const err = e as { status: number; stdout?: string; stderr?: string };
    return { code: err.status, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

function fixture(js: string) {
  const dir = mkdtempSync(join(tmpdir(), 'sourcemaps-pkg-'));
  const build = join(dir, 'build');
  const app = join(build, '_app', 'immutable', 'chunks');
  execFileSync('mkdir', ['-p', app]);
  writeFileSync(join(app, 'a.js'), js);
  writeFileSync(
    join(app, 'a.js.map'),
    JSON.stringify({ version: 3, sources: ['a.ts'], names: [], mappings: 'AAAA', file: 'a.js' }),
  );
  writeFileSync(join(app, 'a.js.br'), brotliCompressSync(js));
  writeFileSync(join(app, 'a.js.gz'), gzipSync(js));
  writeFileSync(join(app, 'a.js.map.br'), brotliCompressSync('{}'));
  writeFileSync(join(build, 'index.html'), '<html></html>');
  return { dir, build, out: join(dir, 'out'), app };
}

describe('sourcemaps/package.mjs', () => {
  it('pairs the build-time id into the artifact, never touches served files, strips maps', () => {
    const js = `${SNIPPET}export function add(a,b){return a+b}\n`;
    const f = fixture(js);
    try {
      const served = ['a.js', 'a.js.br', 'a.js.gz'].map((n) => join(f.app, n));
      const before = served.map(sha);

      const { code, output } = run(f.build, f.out);
      expect(code, output).toBe(0);

      // Served bytes are exactly as built (their content-hashed names stay true).
      expect(served.map(sha)).toEqual(before);
      // The artifact copy carries the id the way the uploader pairs files.
      const rel = join('_app', 'immutable', 'chunks');
      const artJs = readFileSync(join(f.out, rel, 'a.js'), 'utf8');
      expect(artJs.startsWith(js)).toBe(true);
      expect(artJs.trimEnd().endsWith(`//# debugId=${ID}`)).toBe(true);
      const map = JSON.parse(readFileSync(join(f.out, rel, 'a.js.map'), 'utf8'));
      expect(map.debugId).toBe(ID);
      expect(map.debug_id).toBe(ID);
      // No map of any kind is left to be served.
      expect(readdirSync(f.app).filter((n) => /\.map(\.br|\.gz)?$/.test(n))).toEqual([]);
      expect(existsSync(join(f.build, 'index.html'))).toBe(true);
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it('fails when a chunk has no build-time id (plugin missing from the build)', () => {
    const f = fixture('export const x = 1;\n');
    try {
      const { code, output } = run(f.build, f.out);
      expect(code).toBe(1);
      expect(output).toMatch(/no sentry-dbid snippet/);
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it('fails when the build has no js+map pairs (SENTRY_SOURCEMAPS unset)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sourcemaps-pkg-'));
    try {
      const build = join(dir, 'build');
      execFileSync('mkdir', ['-p', build]);
      writeFileSync(join(build, 'a.js'), 'x\n');
      const { code, output } = run(build, join(dir, 'out'));
      expect(code).toBe(1);
      expect(output).toMatch(/SENTRY_SOURCEMAPS=1/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
