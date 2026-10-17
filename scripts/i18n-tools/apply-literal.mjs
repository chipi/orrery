// Literal one-shot replacements: <file under i18n-src>\t<from>\t<to>; each `from` must occur exactly once.
import fs from 'node:fs';
const R = 'i18n-src/';
const rows = fs
  .readFileSync(process.argv[2], 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => l.split('\t'));
const files = new Map();
const errs = [];
for (const [f, from, to] of rows) {
  const s = files.get(f) ?? fs.readFileSync(R + f, 'utf8');
  const n = s.split(from).length - 1;
  if (n !== 1) {
    errs.push(`${f}: "${from}" found ${n}×`);
    continue;
  }
  files.set(
    f,
    s.replace(from, () => to),
  );
}
if (errs.length) {
  console.log(errs.join('\n'));
  process.exit(1);
}
for (const [f, s] of files) {
  JSON.parse(s);
  fs.writeFileSync(R + f, s);
}
console.log(`✓ ${rows.length} replacements in ${files.size} files`);
