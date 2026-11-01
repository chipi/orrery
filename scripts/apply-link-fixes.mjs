/**
 * Apply a reviewed map of outbound-link replacements everywhere the old URL is
 * written: static/data (not the generated i18n bundles), i18n-src/<locale>/,
 * messages/ and src/. Companion to link-fix-candidates.mjs (runbook:
 * orrery-link-health).
 *
 * Map file: { "<old url>": { "new": "<replacement>", "why": "<how it was chosen>",
 *                              "label": ["<old label>", "<new label>"] } }
 * "label" (optional) rewrites the link text where the publisher or document
 * changed — only in files that held the old URL, and it must be found there.
 * Each old URL must be found at least once (a typo in the map fails the run);
 * an "&" in an old URL also matches its "&amp;" form inside HTML strings.
 *
 * Every replacement is probed first; the run refuses if any is not OK (a dead
 * link must not be swapped for another). --no-verify skips that.
 *
 * Usage: node scripts/apply-link-fixes.mjs <map.json> [--dry-run] [--no-verify]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { probeAll } from './lib/link-probe.mjs';

const ROOT = process.cwd();
const [mapPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry-run');
if (!mapPath) {
  console.error('usage: node scripts/apply-link-fixes.mjs <map.json> [--dry-run]');
  process.exit(2);
}
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

if (!process.argv.includes('--no-verify')) {
  const targets = [...new Set(Object.values(map).map((e) => e.new))];
  const results = await probeAll(targets);
  const bad = targets.filter((u) => results.get(u)?.status !== 'ok');
  if (bad.length) {
    console.error(`✗ ${bad.length} replacement(s) are not OK:`);
    for (const u of bad) {
      const r = results.get(u);
      console.error(`  ${r?.http_status ?? r?.status} ${u}`);
    }
    process.exit(1);
  }
  console.log(`✓ all ${targets.length} replacements answer OK`);
}

function walk(dir, keep) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p === join(ROOT, 'static/data/i18n')) continue;
    if (statSync(p).isDirectory()) out.push(...walk(p, keep));
    else if (keep(name)) out.push(p);
  }
  return out;
}
const files = [
  ...walk(join(ROOT, 'static/data'), (n) => n.endsWith('.json')),
  ...walk(join(ROOT, 'i18n-src'), (n) => n.endsWith('.json')),
  ...walk(join(ROOT, 'messages'), (n) => n.endsWith('.json')),
  ...walk(join(ROOT, 'src'), (n) => /\.(svelte|ts)$/.test(n) && !/\.test\.ts$/.test(n)),
];

// Longest first, so a URL that is a prefix of another is not replaced inside it.
const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
const hits = new Map(entries.map(([old]) => [old, 0]));
const labelHits = new Map();
let changedFiles = 0;
for (const f of files) {
  const before = readFileSync(f, 'utf8');
  let text = before;
  for (const [old, { new: next, label }] of entries) {
    let replacedHere = false;
    for (const [o, n] of [
      [old, next],
      [old.replace(/&/g, '&amp;'), next.replace(/&/g, '&amp;')],
    ]) {
      if (o === n && o !== old) continue;
      // Only whole URLs: the next character must end the URL.
      // Whole URLs only: not preceded by a URL character (a Wayback replacement
      // embeds the old URL — "…/web/2024…/https://old" — and a re-run must not
      // match it there), and followed by a character that ends the URL.
      const re = new RegExp(
        '(?<![\\w/:.%-])' + o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=["\'\\s)<\\]`|]|$)',
        'g',
      );
      const count = (text.match(re) ?? []).length;
      if (count) {
        text = text.replace(re, () => n);
        hits.set(old, hits.get(old) + count);
        replacedHere = true;
      }
    }
    if (label && replacedHere) {
      // As written in JSON: plain, or with non-ASCII escaped (\u00b7).
      const asJson = (l) => JSON.stringify(l).slice(1, -1);
      const escaped = (l) =>
        asJson(l).replace(/[^ -~]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
      for (const form of [asJson, escaped]) {
        const [from, to] = label.map(form);
        if (text.includes(from)) {
          text = text.split(from).join(to);
          labelHits.set(old, (labelHits.get(old) ?? 0) + 1);
          break;
        }
      }
    }
  }
  if (text !== before) {
    changedFiles++;
    if (!dry) writeFileSync(f, text);
  }
}
// An old URL that is gone while its replacement is present was applied by an
// earlier run of the same (cumulative) map.
const allText = files.map((f) => readFileSync(f, 'utf8')).join('\n');
const applied = [...hits]
  .filter(([u, n]) => n === 0 && allText.includes(map[u].new))
  .map(([u]) => u);
const missing = [...hits].filter(([u, n]) => n === 0 && !applied.includes(u)).map(([u]) => u);
if (applied.length) console.log(`  ${applied.length} already applied earlier`);
const labelMissing = entries
  .filter(([old, e]) => e.label && !labelHits.get(old) && !applied.includes(old))
  .map(([u]) => u);
const total = [...hits.values()].reduce((a, b) => a + b, 0);
console.log(
  `${dry ? '(dry run) ' : ''}${entries.length} replacements, ${total} occurrences in ${changedFiles} files`,
);
if (missing.length) {
  console.error(`✗ not found anywhere (${missing.length}):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
if (labelMissing.length) {
  console.error(
    `✗ label not found next to (${labelMissing.length}):\n  ${labelMissing.join('\n  ')}`,
  );
  process.exit(1);
}
