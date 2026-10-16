#!/usr/bin/env node
/**
 * Package prod source maps for GlitchTip (#595, option (c): CI builds, the homelab
 * mini uploads). Run after `SENTRY_SOURCEMAPS=1 npm run build`.
 *
 *   node scripts/sourcemaps/package.mjs [buildDir=build] [outDir=sourcemaps-out]
 *
 * 1. `sentry-cli sourcemaps inject` stamps a debug id into every JS file that has a
 *    hidden map (a runtime snippet plus a `//# debugId=` comment) and into the map.
 *    The deployed bundle must carry it: GlitchTip matches an error's frames to the
 *    uploaded map by that id.
 * 2. inject rewrites the .js AFTER vite-plugin-compression2 wrote its .br/.gz
 *    siblings, and nginx serves those precompressed files. Every rewritten file
 *    gets fresh .br/.gz, or users would load the stale, id-less bytes.
 * 3. Each injected .js and its .map are copied to outDir (the run artifact
 *    `sourcemaps-<release>` the mini picks up) and every *.map, *.map.br, *.map.gz
 *    is removed from buildDir, so maps are never served.
 * Exits non-zero if any packaged file lacks a debug id, or if a map is left behind.
 */
import { execFileSync } from 'node:child_process';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const BUILD = process.argv[2] ?? 'build';
const OUT = process.argv[3] ?? 'sourcemaps-out';

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const paired = walk(BUILD).filter((f) => f.endsWith('.js') && existsSync(`${f}.map`));
if (paired.length === 0) {
  console.error(
    `[sourcemaps] no .js with a sibling .map under ${BUILD} — was SENTRY_SOURCEMAPS=1 set?`,
  );
  process.exit(1);
}
const before = new Map(paired.map((f) => [f, sha(f)]));

// --no-install: never fetch a package called "sentry-cli" from the registry if the
// local @sentry/cli (a transitive dependency) is missing; fail instead.
execFileSync('npx', ['--no-install', 'sentry-cli', 'sourcemaps', 'inject', BUILD], {
  stdio: 'inherit',
});

let recompressed = 0;
const problems = [];
rmSync(OUT, { recursive: true, force: true });
for (const js of paired) {
  const src = readFileSync(js);
  const id = /\/\/# debugId=([0-9a-f-]+)/.exec(src.toString('utf8'))?.[1];
  const map = JSON.parse(readFileSync(`${js}.map`, 'utf8'));
  if (!id) problems.push(`${js}: no //# debugId= after inject`);
  else if ((map.debugId ?? map.debug_id) !== id)
    problems.push(`${js}.map: debug id does not match the .js`);
  if (sha(js) !== before.get(js)) {
    if (existsSync(`${js}.br`)) {
      writeFileSync(
        `${js}.br`,
        brotliCompressSync(src, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
      );
    }
    if (existsSync(`${js}.gz`)) writeFileSync(`${js}.gz`, gzipSync(src, { level: 9 }));
    recompressed += 1;
  }
  const rel = path.relative(BUILD, js);
  mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  writeFileSync(path.join(OUT, rel), src);
  writeFileSync(path.join(OUT, `${rel}.map`), readFileSync(`${js}.map`));
}

for (const f of walk(BUILD)) if (/\.map(\.br|\.gz)?$/.test(f)) rmSync(f);
const left = walk(BUILD).filter((f) => /\.map(\.br|\.gz)?$/.test(f));
if (left.length) problems.push(`${left.length} map files still in ${BUILD}`);

for (const p of problems.slice(0, 20)) console.error(`[sourcemaps] ✗ ${p}`);
console.log(
  `[sourcemaps] ${paired.length} js+map pairs packaged to ${OUT} · ${recompressed} recompressed (.br/.gz) · ` +
    `${problems.length} problems · maps removed from ${BUILD}`,
);
process.exit(problems.length ? 1 : 0);
