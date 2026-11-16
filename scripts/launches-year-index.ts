/**
 * Rewrites static/data/launches-years.json from the manifests on disk, without a network fetch
 * (`npm run fetch:launches` writes it too, after the manifests). Run: npx tsx scripts/launches-year-index.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildYearIndex } from '../src/lib/launches/year-index.js';

const ROOT = 'static/data';
const read = (p: string) =>
  Object.values(
    (
      JSON.parse(readFileSync(p, 'utf8')) as {
        entries: Record<string, { net: string; agency_name: string }>;
      }
    ).entries,
  );

const entries = [
  ...read(join(ROOT, 'launches.json')),
  ...readdirSync(join(ROOT, 'launches-historic'))
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => read(join(ROOT, 'launches-historic', f))),
];
writeFileSync(
  join(ROOT, 'launches-years.json'),
  JSON.stringify(buildYearIndex(entries), null, 2) + '\n',
);
console.log(`launches-years.json: ${entries.length} launches`);
