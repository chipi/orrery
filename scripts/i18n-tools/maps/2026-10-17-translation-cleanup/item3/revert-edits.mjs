// Build reverse edits (new → old) for the applied edits whose "rel:at" matches a pattern, so a
// wrong glossary application can be undone through apply-edits.mjs.
//   node revert-edits.mjs '<regex on rel:at>' applied.json out.json
import fs from 'node:fs';

const [pattern, inFile, outFile] = process.argv.slice(2);
const re = new RegExp(pattern);
const rev = JSON.parse(fs.readFileSync(inFile, 'utf8'))
  .filter((e) => re.test(`${e.rel}:${e.at}`))
  .map((e) => ({ rel: e.rel, at: e.at, old: e.new, new: e.old }));
fs.writeFileSync(outFile, JSON.stringify(rev, null, 1));
console.log(`${rev.length} reverse edits`);
