/**
 * Is a shipped image the same picture as a candidate source image?
 * Prints dHash distance (64-bit; ≤ 8 = same picture) and aspect ratio for each
 * candidate, best first. Used to find the real source of a credit row before
 * rewriting it (runbook: orrery-link-health, credits).
 *
 * Usage: node scripts/image-match.mjs <local image> <candidate url> [<candidate url> …]
 */
import { readFileSync } from 'node:fs';
import { dhash, distance, aspect } from './lib/dhash.mjs';
import { USER_AGENT } from './lib/link-probe.mjs';

const [local, ...cands] = process.argv.slice(2);
if (!local || !cands.length) {
  console.error('usage: node scripts/image-match.mjs <local image> <candidate url> …');
  process.exit(2);
}
const mine = readFileSync(local.startsWith('/images/') ? `static${local}` : local);
const [h0, a0] = [await dhash(mine), await aspect(mine)];
const rows = [];
for (const url of cands) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    rows.push({ url, d: distance(h0, await dhash(buf)), a: await aspect(buf) });
  } catch (e) {
    rows.push({ url, d: 99, a: 0, err: e.message });
  }
}
rows.sort((x, y) => x.d - y.d);
console.log(`local aspect ${a0.toFixed(3)}`);
for (const r of rows)
  console.log(
    `${String(r.d).padStart(2)}  aspect ${r.a.toFixed(3)}  ${r.d <= 8 ? 'MATCH' : '     '}  ${r.url}${r.err ? '  ' + r.err : ''}`,
  );
