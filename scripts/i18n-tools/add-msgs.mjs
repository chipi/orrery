// Add UI message keys to messages/<loc>.json for every locale (keeps the file's key order
// style: inserted alphabetically when the file is sorted, appended otherwise).
import fs from 'node:fs';
const [specPath] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')); // { key: { 'en-US': ..., de: ..., ... } }
const D = 'messages';
for (const f of fs.readdirSync(D).filter((n) => n.endsWith('.json'))) {
  const loc = f.replace(/\.json$/, '');
  const j = JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'));
  const keys = Object.keys(j).filter((k) => !k.startsWith('$'));
  const sorted = keys.every((k, i) => i === 0 || keys[i - 1].localeCompare(k) <= 0);
  for (const [k, t] of Object.entries(spec)) {
    if (!t[loc]) throw new Error(`${k}: no ${loc}`);
    j[k] = t[loc];
  }
  let out = j;
  if (sorted) {
    out = {};
    for (const k of Object.keys(j).filter((x) => x.startsWith('$'))) out[k] = j[k];
    for (const k of Object.keys(j)
      .filter((x) => !x.startsWith('$'))
      .sort((a, b) => a.localeCompare(b)))
      out[k] = j[k];
  }
  fs.writeFileSync(`${D}/${f}`, JSON.stringify(out, null, 2) + '\n');
  console.log(`${loc}: sorted=${sorted}`);
}
