// ar programs: «اللقاء المداري» → «الالتقاء المداري», the binding the essays round applied
// (one name per language). Writes apply-edits rows for every field that has it.
//   node …/ar-rendezvous-programs.mjs <out.json>
import fs from 'node:fs';
import path from 'node:path';
const edits = [];
const walk = (o, pre, rel) => {
  if (typeof o === 'string') {
    if (o.includes('اللقاء المداري'))
      edits.push({ rel, at: pre, old: o, new: o.replaceAll('اللقاء المداري', 'الالتقاء المداري') });
  } else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) walk(v, pre ? `${pre}.${k}` : k, rel);
};
for (const f of fs.readdirSync('i18n-src/ar/programs')) {
  const rel = path.join('programs', f);
  walk(JSON.parse(fs.readFileSync(`i18n-src/ar/${rel}`, 'utf8')), '', rel);
}
fs.writeFileSync(process.argv[2], JSON.stringify(edits, null, 1));
console.log(edits.length, 'fields');
