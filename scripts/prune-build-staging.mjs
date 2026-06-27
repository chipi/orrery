// Post-build staging prune (RFC-029 / #363, Slice 5).
//
// adapter-static copies ALL of static/ into build/, so build/images/_staging
// (the gitignored review scratch area) would otherwise ship to production +
// be served by nginx/docker. Strip it after `vite build`, then assert none
// of it survived — a non-empty _staging in build/ fails the build.
import { rm, readdir, access } from 'node:fs/promises';

const STAGING = 'build/images/_staging';

try {
  await access('build');
} catch {
  console.log('prune-build-staging: no build/ dir — nothing to do.');
  process.exit(0);
}

await rm(STAGING, { recursive: true, force: true });

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
