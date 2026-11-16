/**
 * Honest labels (Rule B) and photograph heroes (Rule A) for flown vehicles — see
 * scripts/image-depiction.ts for the rules and ADR-053 for why.
 *
 *   tsx scripts/validate-image-depiction.ts                    gate
 *   tsx scripts/validate-image-depiction.ts --write-baseline   regenerate the frozen hero baseline
 *
 * The baseline (static/data/hero-concept-baseline.json) was generated once on 2026-11-13; the
 * hero-review slice (plan row L47) clears it, hero by hero, with the operator's side-by-side and yes.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  blessedHeroes,
  collectSlots,
  diffBaseline,
  heroFindings,
  heroId,
  heroesWithoutStatus,
  labelFindings,
  scopeSet,
} from './image-depiction';

const DATA = 'static/data';
const read = <T>(f: string): T => JSON.parse(readFileSync(join(DATA, f), 'utf8')) as T;
const byId = (rows: { id: string; status?: string }[]): Record<string, string> =>
  Object.fromEntries(rows.filter((r) => r.status).map((r) => [r.id, r.status as string]));

const BASELINE = join(DATA, 'hero-concept-baseline.json');

const prov = read<{ entries: { path: string; title?: string }[] }>('image-provenance.json');
const alt = read<Record<string, string>>('image-alt-text/en-US.json');
const waivers = read<{
  artistic_impressions?: { scope: string }[];
  not_concept?: { scope: string }[];
}>('license-waivers.json');
const notConcept = scopeSet(waivers.not_concept);
const waived = scopeSet(waivers.artistic_impressions);

const moonSites = byId(read('moon-sites.json'));
const marsSites = byId(read('mars-sites.json'));
const statuses = {
  missions: byId(read('missions/index.json')),
  fleet: byId(read('fleet/index.json')),
  'earth-objects': byId(read('earth-objects.json')),
  'iss-modules': byId(read('iss-modules.json')),
  'tiangong-modules': byId(read('tiangong-modules.json')),
  'moon-sites': moonSites,
  'mars-sites': marsSites,
  'site:moon': moonSites,
  'site:mars': marsSites,
};

const slots = collectSlots(prov.entries, alt);
const heroes = blessedHeroes(read('entity-thumbs.json'), statuses);
const found = heroFindings(heroes, slots, notConcept, waived);
const foundIds = found.map(heroId).sort();
const missingStatus = heroesWithoutStatus(heroes).map(heroId).sort();

if (process.argv.includes('--write-baseline')) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comment:
          'Frozen 2026-11-13: flown-vehicle heroes whose picture is an artist concept, illustration, computer graphic or painting (ADR-053). validate-image-depiction fails on a hero not listed here and on a listed hero that has since been fixed or waived, so this list only shrinks. The hero-review slice (plan row L47) clears it, one vehicle at a time, with the operator side-by-side and yes. missing_status lists heroes whose entity has no status, which counts as not planned-only: fill the status in the data.',
        heroes: foundIds,
        missing_status: missingStatus,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `wrote ${BASELINE}: ${foundIds.length} heroes, ${missingStatus.length} without status`,
  );
  process.exit(0);
}

let failed = 0;
const fail = (msg: string) => {
  console.error(`  ✗ ${msg}`);
  failed++;
};

console.log('Validating honest depiction labels (Rule B, ADR-053)...');
const labels = labelFindings(slots, notConcept);
for (const f of labels) {
  const s = slots.find((x) => x.key === f.key);
  fail(
    f.problem === 'alt-says-concept-title-does-not'
      ? `${f.key}: the alt text says concept, the provenance title does not ("${s?.title}"). Add the label to the title, or list the slot in not_concept (license-waivers.json) with a reason.`
      : `${f.key}: the provenance title says concept, the alt text does not ("${s?.alt}"). Fix the alt text in all 14 locales, or list the slot in not_concept.`,
  );
}
const allKeys = new Set(slots.map((s) => s.key));
for (const [name, set] of [
  ['not_concept', notConcept],
  ['artistic_impressions', waived],
] as const) {
  for (const k of set)
    if (!allKeys.has(k)) fail(`${name}: ${k} is not a slot in the vehicle galleries`);
}

console.log('Validating photograph heroes (Rule A, ADR-053)...');
if (!existsSync(BASELINE)) {
  fail(`${BASELINE} is missing (tsx scripts/validate-image-depiction.ts --write-baseline)`);
} else {
  const baseline = read<{ heroes: string[] }>('hero-concept-baseline.json').heroes;
  const { added, cleared } = diffBaseline(foundIds, baseline);
  for (const id of added) {
    const h = found.find((x) => heroId(x) === id);
    fail(
      `${id}: the hero is an artist concept or computer graphic ("${h?.title}"). Use a photograph, or add an artistic_impressions waiver (no photograph exists).`,
    );
  }
  for (const id of cleared)
    fail(`${id}: no longer a concept hero — remove it from hero-concept-baseline.json`);
}

if (failed > 0) {
  console.error(`\nvalidate-image-depiction: ${failed} problem(s)`);
  process.exit(1);
}
console.log(
  `validate-image-depiction: OK — ${slots.length} vehicle slots labelled, ${heroes.length} heroes, ${foundIds.length} in the frozen baseline, ${missingStatus.length} heroes without a status`,
);
