/**
 * Diagram integrity check (ADR-035).
 *
 * Walks every base section JSON under static/data/science/ and asserts
 * that any declared `diagram` field has a matching SVG file at
 * static/diagrams/science/<diagram>. Run via `npm run validate-data`
 * (chained from validate-data.ts) so a single integrity command covers
 * all data.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATA_ROOT = 'static/data';
const SCIENCE_DIR = join(DATA_ROOT, 'science');
const DIAGRAMS_DIR = 'static/diagrams/science';

interface ScienceSectionBase {
  id: string;
  diagram?: string;
}

let missing = 0;
let checked = 0;

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== '_index.json')
    .map((f) => join(dir, f));
}

if (!existsSync(SCIENCE_DIR)) {
  console.log('Validating /science diagrams... 0 sections found (skipping).');
  process.exit(0);
}

console.log('\nValidating /science diagrams (ADR-035)...');
for (const tab of readdirSync(SCIENCE_DIR)) {
  const tabDir = join(SCIENCE_DIR, tab);
  if (!statSync(tabDir).isDirectory()) continue;
  for (const file of listJson(tabDir)) {
    const section: ScienceSectionBase = JSON.parse(readFileSync(file, 'utf8'));
    if (!section.diagram) continue;
    checked++;
    const svgPath = join(DIAGRAMS_DIR, section.diagram);
    if (!existsSync(svgPath)) {
      missing++;
      console.error(`  ✗ ${file}: diagram '${section.diagram}' not found at ${svgPath}`);
    }
  }
}

if (missing === 0) {
  console.log(`  ✓ ${checked} diagram references resolved`);
} else {
  console.error(`  ${missing} missing diagram(s) — author SVG or remove diagram field`);
  process.exit(1);
}
