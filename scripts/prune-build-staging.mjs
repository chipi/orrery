// Post-build served-tree prune (RFC-029 / #363, Slice 5).
//
// adapter-static copies ALL of static/ into build/, so files that live in
// static/ for tooling/provenance reasons but are never served would otherwise
// ship to production + be served by nginx/docker. Strip them after
// `vite build`. Two concerns:
//
//   1. build/images/_staging — the gitignored review scratch area. Asserted
//      gone afterwards; a non-empty _staging fails the build.
//   2. build/textures/*.{4x3,16x9}.jpg — dead planet-texture aspect crops.
//      No scene loads them (spheres use the full equirect texture); they exist
//      only so build-image-provenance can attribute them. ~28 MB of dead
//      weight in every deploy (bloats GitHub Pages #373) and the Capacitor
//      bundle. Kept in static/ so the provenance manifest stays valid.
//   3. build/data/<dev-only>.json — salvage/vision pipeline intermediates that
//      only the /dev/* tooling reads. That subtree always-404s in prod
//      (src/routes/dev/+layout.ts: `import.meta.env.DEV` is compile-time false),
//      so nothing on the live site ever fetches them — ~5 MB of dead weight in
//      every deploy. Kept in static/ so the dev server can still read them.
import { rm, readdir, access, stat } from 'node:fs/promises';

const STAGING = 'build/images/_staging';

// Dev-only pipeline JSON — never fetched by a served (non-/dev) route.
const DEV_ONLY_DATA = [
  'build/data/slice-a-salvage-result.json',
  'build/data/bodies-salvage-result.json',
  'build/data/image-vision.json',
];

try {
  await access('build');
} catch {
  console.log('prune-build-staging: no build/ dir — nothing to do.');
  process.exit(0);
}

await rm(STAGING, { recursive: true, force: true });

// Dead texture aspect crops — remove from the served tree (both builds).
async function pruneTextureCrops() {
  const dir = 'build/textures';
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // no textures/ (nothing to do)
  }
  let count = 0;
  let bytes = 0;
  for (const e of entries) {
    if (e.isFile() && /\.(4x3|16x9)\.jpg$/.test(e.name)) {
      const p = `${dir}/${e.name}`;
      bytes += (await stat(p)).size;
      await rm(p, { force: true });
      count += 1;
    }
  }
  if (count) {
    console.log(
      `prune-build-staging: − ${count} dead texture crops (${(bytes / 1048576).toFixed(1)} MB)`,
    );
  }
}
await pruneTextureCrops();

// Dev-only pipeline JSON — remove from the served tree (both builds).
async function pruneDevOnlyData() {
  let count = 0;
  let bytes = 0;
  for (const p of DEV_ONLY_DATA) {
    try {
      bytes += (await stat(p)).size;
    } catch {
      continue; // absent — nothing to prune
    }
    await rm(p, { force: true });
    count += 1;
  }
  if (count) {
    console.log(
      `prune-build-staging: − ${count} dev-only data files (${(bytes / 1048576).toFixed(1)} MB)`,
    );
  }
}
await pruneDevOnlyData();

// Belt + suspenders — scan build/ for any lingering _staging path.
async function findStaging(dir) {
  const hits = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return hits;
  }
  for (const e of entries) {
    const p = `${dir}/${e.name}`;
    if (e.name === '_staging') hits.push(p);
    else if (e.isDirectory()) hits.push(...(await findStaging(p)));
  }
  return hits;
}

const leaks = await findStaging('build');
if (leaks.length) {
  console.error(`prune-build-staging: ✗ _staging leaked into build/:\n  ${leaks.join('\n  ')}`);
  process.exit(1);
}
console.log('prune-build-staging: ✓ no _staging in build/');
