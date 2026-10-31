// After term-apply: which `change` decisions did not land? A field is refused as a whole when
// any of its finds is missing (e.g. two edits where the first already removed the second's
// text), and term-apply reports that on a line a `| tail -1` hides. This checks every change
// against the file as it is now: the replace text must be present.
//   node scripts/i18n-tools/term-apply-check.mjs <loc> <edits.json> [<loc> <edits.json> …]
import fs from 'node:fs';
const args = process.argv.slice(2);
const get = (o, at) => at.split('.').reduce((v, k) => v?.[/^\d+$/.test(k) ? +k : k], o);
let missing = 0;
for (let i = 0; i < args.length; i += 2) {
  const [loc, file] = [args[i], args[i + 1]];
  for (const d of JSON.parse(fs.readFileSync(file, 'utf8'))) {
    if (d.decision !== 'change') continue;
    const doc = JSON.parse(fs.readFileSync(`i18n-src/${loc}/${d.rel}`, 'utf8'));
    const now = get(doc, d.at) ?? '';
    if (!now.includes(d.replace)) {
      missing++;
      console.log(
        `${loc} ${d.rel} :: ${d.at} [${d.term}] not applied: "${d.find}" → "${d.replace}"`,
      );
    }
  }
}
console.log(`${missing} change decisions not present in the files`);
process.exit(missing ? 1 : 0);
