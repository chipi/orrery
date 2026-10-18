// Correct a reviewer's output before applying: replace a pattern in the "new" text of every
// fix in the given files (the "old" text is never touched).
//   node fix-output.mjs '<regex>' '<replacement>' fixes/<loc>-<seg>-NN.json ...
import fs from 'node:fs';

const [pattern, replacement, ...files] = process.argv.slice(2);
const re = new RegExp(pattern, 'gu');
for (const f of files) {
  const edits = JSON.parse(fs.readFileSync(f, 'utf8'));
  let n = 0;
  for (const e of edits) {
    const before = e.new;
    e.new = e.new.replace(re, replacement);
    if (e.new !== before) n++;
  }
  fs.writeFileSync(f, JSON.stringify(edits, null, 1));
  if (n) console.log(`${f}: ${n} fixed`);
}
