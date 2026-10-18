// Copy chosen fixes (by "rel:at") out of reviewer output into a new file, so they can be
// corrected with fix-output.mjs and re-applied on their own.
//   node salvage.mjs out.json 'rel:at' ... -- fixes/a.json fixes/b.json
import fs from 'node:fs';

const args = process.argv.slice(2);
const out = args[0];
const sep = args.indexOf('--');
const keys = new Set(args.slice(1, sep));
const picked = args
  .slice(sep + 1)
  .flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')))
  .filter((e) => keys.has(`${e.rel}:${e.at}`));
fs.writeFileSync(out, JSON.stringify(picked, null, 1));
console.log(`${picked.length} of ${keys.size} picked`);
