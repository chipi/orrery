// Second half of en-fix-workfile.mjs: the translators' output → apply-edits.mjs files, checked.
//   node scripts/i18n-tools/en-fix-edits.mjs <workdir> <outdir> <editsdir>
// For each locale: entries must line up with the work file. A changed field is listed for reading
// when its numbers differ from en_new's. Fields whose text changed since the work file are skipped.
// Writes <editsdir>/<loc>.json [{rel, at, old, new}] and prints, per locale, changed / unchanged /
// flagged — the per-locale check for a fact or number changed in all 14 locales.
import fs from 'node:fs';
import path from 'node:path';

const [work, out, editsDir] = process.argv.slice(2);
if (!work || !out || !editsDir) {
  console.error('usage: en-fix-edits.mjs <workdir> <outdir> <editsdir>');
  process.exit(2);
}
const at = (doc, p) => p.split('.').reduce((a, k) => a?.[/^\d+$/.test(k) ? +k : k], doc);
// Western digits only: CJK/Arabic-Indic numerals are not compared (they are rare in these overlays).
const digits = (s) =>
  (s.match(/\d+(?:[.,\u00a0\u202f]\d+)*/g) ?? [])
    .map((n) => n.replace(/\D/g, ''))
    .sort()
    .join(' ');
fs.mkdirSync(editsDir, { recursive: true });
let bad = 0;
for (const f of fs.readdirSync(work).filter((f) => f.endsWith('.json'))) {
  const loc = f.slice(0, -5);
  const items = JSON.parse(fs.readFileSync(path.join(work, f), 'utf8'));
  const outFile = path.join(out, f);
  if (!fs.existsSync(outFile)) {
    console.log(`${loc}: NO OUTPUT`);
    bad++;
    continue;
  }
  const dec = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  const edits = [];
  const flags = [];
  let same = 0;
  let stale = 0;
  items.forEach((it, i) => {
    const d = dec[i];
    if (!d || d.rel !== it.rel || d.at !== it.at || typeof d.new !== 'string' || !d.new.trim()) {
      console.log(`${loc} #${i} ${it.rel}:${it.at} — no matching output`);
      bad++;
      return;
    }
    if (d.new === it.tr) return void same++;
    const now = at(JSON.parse(fs.readFileSync(`i18n-src/${loc}/${it.rel}`, 'utf8')), it.at);
    if (now !== it.tr) return void stale++;
    if (digits(d.new) !== digits(it.en_new))
      flags.push(`${it.rel}:${it.at} numbers ${digits(it.en_new)} → ${digits(d.new)}`);
    edits.push({ rel: it.rel, at: it.at, old: it.tr, new: d.new });
  });
  fs.writeFileSync(path.join(editsDir, f), JSON.stringify(edits, null, 1));
  console.log(
    `${loc}: ${edits.length} changed · ${same} unchanged · ${stale} stale · ${flags.length} flagged`,
  );
  for (const x of flags) console.log(`  ${x}`);
}
process.exit(bad ? 1 : 0);
