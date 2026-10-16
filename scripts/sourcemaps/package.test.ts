/**
 * scripts/sourcemaps/package.mjs (#595) runs for the first time inside the prod
 * deploy job, so a broken packager blocks a deploy. This drives the real script
 * (and the real sentry-cli inject) over a throwaway build directory.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliCompressSync, brotliDecompressSync, gunzipSync, gzipSync } from 'node:zlib';

const SCRIPT = join(process.cwd(), 'scripts/sourcemaps/package.mjs');

function run(build: string, out: string): { code: number; output: string } {
  try {
    const output = execFileSync('node', [SCRIPT, build, out], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { code: 0, output };
  } catch (e) {
    const err = e as { status: number; stdout?: string; stderr?: string };
    return { code: err.status, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

describe('sourcemaps/package.mjs', () => {
  it('injects debug ids, recompresses, packages the pairs, and strips every map from the build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sourcemaps-pkg-'));
    try {
      const build = join(dir, 'build');
      const out = join(dir, 'out');
      const app = join(build, '_app', 'immutable', 'chunks');
      execFileSync('mkdir', ['-p', app]);
      const js = 'export function add(a,b){return a+b}\n';
      writeFileSync(join(app, 'a.js'), js);
      writeFileSync(
        join(app, 'a.js.map'),
        JSON.stringify({
          version: 3,
          sources: ['a.ts'],
          names: [],
          mappings: 'AAAA',
          file: 'a.js',
        }),
      );
      writeFileSync(join(app, 'a.js.br'), brotliCompressSync(js));
      writeFileSync(join(app, 'a.js.gz'), gzipSync(js));
      writeFileSync(join(app, 'a.js.map.br'), brotliCompressSync('{}'));
      writeFileSync(join(build, 'index.html'), '<html></html>');

      const { code, output } = run(build, out);
      expect(code, output).toBe(0);

      const injected = readFileSync(join(app, 'a.js'), 'utf8');
      const id = /\/\/# debugId=([0-9a-f-]+)/.exec(injected)?.[1];
      expect(id).toBeTruthy();
      // nginx serves the precompressed siblings: they must match the injected file.
      expect(brotliDecompressSync(readFileSync(join(app, 'a.js.br'))).toString()).toBe(injected);
      expect(gunzipSync(readFileSync(join(app, 'a.js.gz'))).toString()).toBe(injected);
      // The artifact carries the pair with matching ids.
      const rel = join('_app', 'immutable', 'chunks');
      expect(readFileSync(join(out, rel, 'a.js'), 'utf8')).toBe(injected);
      const map = JSON.parse(readFileSync(join(out, rel, 'a.js.map'), 'utf8'));
      expect(map.debugId ?? map.debug_id).toBe(id);
      // No map of any kind is left to be served.
      expect(readdirSync(app).filter((f) => /\.map(\.br|\.gz)?$/.test(f))).toEqual([]);
      expect(existsSync(join(build, 'index.html'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

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
