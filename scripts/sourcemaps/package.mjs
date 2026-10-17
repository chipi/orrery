#!/usr/bin/env node
/**
 * Package prod source maps for GlitchTip (#595, option (c): CI builds, the homelab
 * mini uploads). Run after `SENTRY_SOURCEMAPS=1 npm run build`.
 *
 *   node scripts/sourcemaps/package.mjs [buildDir=build] [outDir=sourcemaps-out]
 *
 * Debug ids are injected DURING the build by sentryVitePlugin (vite.config.ts), so
 * each chunk's content-hashed name already covers its injected bytes and this
 * script never modifies a served file. An earlier version injected here, after
 * Vite had named the chunks; Cloudflare's immutable cache then served pre-injection
 * copies under the same names (2026-10-17).
 *
 * 1. For every .js with a hidden .map, read the plugin's id from its snippet
 *    (`sentry-dbid-<uuid>`).
 * 2. Copy the pair into outDir (the run artifact `sourcemaps-<release>` the mini
 *    uploads), with the id written the way the uploader pairs files: a
 *    `//# debugId=<id>` comment on the artifact's .js copy, and `debugId` /
 *    `debug_id` in its map. The SDK reports the same id at runtime from the snippet.
 * 3. Remove every *.map, *.map.br, *.map.gz from buildDir, so maps are never served.
 * Exits non-zero if a packaged file has no id, if any served .js / .br / .gz changed,
 * or if a map is left behind.
 */
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
const ID = /sentry-dbid-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;

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
// Every served variant of a packaged file, to prove none of them changes.
const served = paired.flatMap((js) => [js, `${js}.br`, `${js}.gz`].filter((f) => existsSync(f)));
const before = new Map(served.map((f) => [f, sha(f)]));

const problems = [];
rmSync(OUT, { recursive: true, force: true });
for (const js of paired) {
  const src = readFileSync(js, 'utf8');
  const id = ID.exec(src)?.[1];
  if (!id) {
    problems.push(`${js}: no sentry-dbid snippet (was sentryVitePlugin in the build?)`);
    continue;
  }
  const map = JSON.parse(readFileSync(`${js}.map`, 'utf8'));
  map.debugId = id;
  map.debug_id = id;
  const rel = path.relative(BUILD, js);
  mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  writeFileSync(path.join(OUT, rel), `${src.replace(/\n?$/, '\n')}//# debugId=${id}\n`);
  writeFileSync(path.join(OUT, `${rel}.map`), JSON.stringify(map));
}

for (const f of walk(BUILD)) if (/\.map(\.br|\.gz)?$/.test(f)) rmSync(f);
const left = walk(BUILD).filter((f) => /\.map(\.br|\.gz)?$/.test(f));
if (left.length) problems.push(`${left.length} map files still in ${BUILD}`);
const changed = served.filter((f) => sha(f) !== before.get(f));
if (changed.length) problems.push(`${changed.length} served files changed (e.g. ${changed[0]})`);

for (const p of problems.slice(0, 20)) console.error(`[sourcemaps] ✗ ${p}`);
console.log(
  `[sourcemaps] ${paired.length} js+map pairs packaged to ${OUT} · ${changed.length} served files changed · ` +
    `${problems.length} problems · maps removed from ${BUILD}`,
);
process.exit(problems.length ? 1 : 0);
