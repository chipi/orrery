/**
 * One-shot post-processor for the Opus-via-tool_use translations
 * landed in commit f7ef36548 (#56 close). The model output JSON
 * objects matching the tool's input_schema, but for `narrative_101`
 * and `body_paragraphs` (typed `array` in the schema) it returned
 * a STRING containing a JSON-encoded array instead of a real
 * array. validate-data rejects (`/narrative_101 must be array`).
 *
 * This script walks the 12 affected files (de / sr-Cyrl / zh-CN ×
 * 4 planets articles), JSON.parses any field that's a string but
 * looks like a JSON array (`[…]`), and writes the result back.
 * Idempotent — safe to re-run.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TARGETS = [
  ['de', 'axial-tilt-and-seasons'],
  ['de', 'moons-of-the-system'],
  ['de', 'planetary-stats'],
  ['de', 'active-spacecraft-survey'],
  ['sr-Cyrl', 'axial-tilt-and-seasons'],
  ['sr-Cyrl', 'moons-of-the-system'],
  ['sr-Cyrl', 'planetary-stats'],
  ['sr-Cyrl', 'active-spacecraft-survey'],
  ['zh-CN', 'axial-tilt-and-seasons'],
  ['zh-CN', 'moons-of-the-system'],
  ['zh-CN', 'planetary-stats'],
  ['zh-CN', 'active-spacecraft-survey'],
];

const ARRAY_FIELDS = ['narrative_101', 'body_paragraphs', 'paragraphs'];

let fixed = 0;
let skipped = 0;
for (const [locale, id] of TARGETS) {
  const p = path.join(ROOT, 'static/data/i18n', locale, 'science/planets', `${id}.json`);
  if (!fs.existsSync(p)) {
    console.log(`skip ${locale}/${id}.json — not found`);
    continue;
  }
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  let dirty = false;
  for (const field of ARRAY_FIELDS) {
    if (typeof obj[field] === 'string' && obj[field].trimStart().startsWith('[')) {
      try {
        const parsed = JSON.parse(obj[field]);
        if (Array.isArray(parsed)) {
          obj[field] = parsed;
          dirty = true;
        }
      } catch (err) {
        console.log(`  ${locale}/${id} ${field}: JSON.parse failed — ${err.message}`);
      }
    }
  }
  if (dirty) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
    console.log(`fixed ${locale}/${id}.json`);
    fixed++;
  } else {
    console.log(`ok    ${locale}/${id}.json (already array-shaped)`);
    skipped++;
  }
}
console.log(`\nDone: fixed=${fixed} skipped=${skipped}`);
