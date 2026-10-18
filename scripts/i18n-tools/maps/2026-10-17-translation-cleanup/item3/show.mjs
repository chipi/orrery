// Show fixes whose old or new text matches a pattern, with context.
//   node show.mjs '<regex>' fixes/<file>.json ...
import fs from 'node:fs';

const [pattern, ...files] = process.argv.slice(2);
const re = new RegExp(`.{0,30}(?:${pattern}).{0,30}`, 'gu');
for (const f of files)
  for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const o = e.old.match(re),
      n = e.new.match(re);
    if (!o && !n) continue;
    console.log(`${f.split('/').pop()} ${e.rel}:${e.at}`);
    if (o) console.log(`   OLD ${o.join(' || ')}`);
    if (n) console.log(`   NEW ${n.join(' || ')}`);
  }
