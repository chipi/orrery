// Apply reviewed term substitutions [{rel, at, term, decision, find, replace}] for one
// locale (the output of a term fix round, see term-drift.mjs). Each `change` must find
// its text exactly once in the field as it stands after the earlier changes to the same
// field; anything else is refused and reported. The result goes through apply-edits.mjs,
// which writes surgically and refuses an edit that adds a translate-quality problem.
//   node scripts/i18n-tools/term-apply.mjs <loc> <edits.json> [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [loc, file] = process.argv.slice(2);
const dry = process.argv.includes('--dry');
if (!loc || !file) {
  console.error('usage: term-apply.mjs <loc> <edits.json> [--dry]');
  process.exit(2);
}
const decisions = JSON.parse(fs.readFileSync(file, 'utf8'));
const get = (doc, at) => at.split('.').reduce((a, k) => a?.[/^\d+$/.test(k) ? +k : k], doc);

const byField = new Map();
for (const d of decisions) {
  if (d.decision !== 'change') continue;
  const k = `${d.rel}|${d.at}`;
  (byField.get(k) ?? byField.set(k, []).get(k)).push(d);
}

const edits = [];
const refused = [];
for (const [k, ds] of byField) {
  const [rel, at] = k.split('|');
  const doc = JSON.parse(fs.readFileSync(path.join('i18n-src', loc, rel), 'utf8'));
  const old = get(doc, at);
  if (typeof old !== 'string') {
    refused.push(`${k}: no string at that key`);
    continue;
  }
  let text = old;
  let ok = true;
  for (const d of ds) {
    const n = d.find ? text.split(d.find).length - 1 : 0;
    if (n !== 1) {
      refused.push(`${k} [${d.term}]: "${String(d.find).slice(0, 50)}" found ${n}×`);
      ok = false;
      break;
    }
    text = text.replace(d.find, () => d.replace);
  }
  if (ok && text !== old) edits.push({ rel, at, old, new: text });
}

const counts = decisions.reduce((a, d) => ((a[d.decision] = (a[d.decision] ?? 0) + 1), a), {});
console.log(
  `${loc}: decisions ${JSON.stringify(counts)} → ${edits.length} field edits, ${refused.length} refused before writing`,
);
for (const r of refused) console.log(`  refused: ${r}`);
if (dry || !edits.length) process.exit(0);

const tmp = path.join(path.dirname(file), `${loc}-apply-edits.json`);
fs.writeFileSync(tmp, JSON.stringify(edits, null, 1));
process.stdout.write(
  execFileSync('node', ['scripts/i18n-tools/apply-edits.mjs', loc, tmp], { encoding: 'utf8' }),
);
