/**
 * Gallery-credit validator: every image a detail-panel gallery shows has a
 * credit row in static/data/image-provenance.json, and the number of
 * placeholder credits does not grow.
 *
 * The provenance check in validate-data only goes one way (each row's file
 * exists, its licence is allowed), so rows could disappear unnoticed: the
 * WebP move (786116478dc) dropped 59 gallery rows, and the viewer showed those
 * images with no credit. Restored 2026-11-01 where the old row and picture
 * survived; the rest are listed in KNOWN_MISSING until they are sourced.
 *
 * A gallery is a folder `static/images/<surface>/<id>/` with 2+ numbered
 * slots (`NN.webp|jpg|png`). A placeholder credit is one that does not name
 * the image: a NASA search page ("NASA Images search result") or an
 * "Uncurated / Curated panel image" row. PLACEHOLDER_CEILING may only go
 * down; lower it when credits are fixed.
 *
 * Usage: tsx scripts/validate-gallery-credits.ts   (wired into validate-data)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';

const PROVENANCE = 'static/data/image-provenance.json';
const IMAGES = 'static/images';

/** Gallery slots with no credit row (no old row to restore). Source them, then delete the line. */
const KNOWN_MISSING = new Set([
  '/images/belts/kuiper/02',
  '/images/belts/kuiper/04',
  '/images/belts/kuiper/05',
  '/images/belts/kuiper/06',
  '/images/satellites/callisto/05',
  '/images/satellites/charon/04',
  '/images/satellites/enceladus/05',
  '/images/satellites/europa/05',
  '/images/satellites/oberon/04',
  '/images/satellites/phobos/05',
  '/images/satellites/titan/05',
]);

/** Placeholder credits in galleries on 2026-11-01. Ratchet: lower it as they are fixed. */
const PLACEHOLDER_CEILING = 411;

interface Row {
  path: string;
  title?: string;
  modifications?: string[];
}

const isPlaceholder = (e: Row) =>
  /search result|uncurated panel image|curated panel image/i.test(e.title ?? '') ||
  (e.modifications ?? []).includes('curated-no-upstream-record');

const rows = (JSON.parse(readFileSync(PROVENANCE, 'utf8')) as { entries: Row[] }).entries;
const byPath = new Map(rows.map((e) => [e.path, e]));
const rowFor = (stem: string) =>
  ['webp', 'jpg', 'jpeg', 'png'].map((x) => byPath.get(`${stem}.${x}`)).find(Boolean);

const missing: string[] = [];
const staleKnown: string[] = [];
let placeholders = 0;
let images = 0;

for (const surface of readdirSync(IMAGES)) {
  if (!statSync(`${IMAGES}/${surface}`).isDirectory()) continue;
  for (const id of readdirSync(`${IMAGES}/${surface}`)) {
    const dir = `${IMAGES}/${surface}/${id}`;
    if (!statSync(dir).isDirectory()) continue;
    const slots = [
      ...new Set(
        readdirSync(dir)
          .filter((f) => /^\d+\.(webp|jpe?g|png)$/i.test(f))
          .map((f) => f.replace(/\.\w+$/, '')),
      ),
    ];
    if (slots.length < 2) continue;
    for (const slot of slots) {
      images++;
      const stem = `/images/${surface}/${id}/${slot}`;
      const row = rowFor(stem);
      if (!row) {
        if (!KNOWN_MISSING.has(stem)) missing.push(stem);
        continue;
      }
      if (KNOWN_MISSING.has(stem)) staleKnown.push(stem);
      if (isPlaceholder(row)) placeholders++;
    }
  }
}

const problems: string[] = [];
if (missing.length) {
  problems.push(
    `${missing.length} gallery image(s) have no credit row in ${PROVENANCE}:\n` +
      missing.map((s) => `    ${s}`).join('\n'),
  );
}
if (staleKnown.length) {
  problems.push(
    `${staleKnown.length} KNOWN_MISSING entr(ies) now have a credit row; delete them from the list:\n` +
      staleKnown.map((s) => `    ${s}`).join('\n'),
  );
}
if (placeholders > PLACEHOLDER_CEILING) {
  problems.push(
    `placeholder credits rose to ${placeholders} (ceiling ${PLACEHOLDER_CEILING}): a new gallery image ` +
      `was credited with a search page or "uncurated panel image" instead of its real source.`,
  );
}

if (problems.length) {
  console.error(`✗ gallery credits:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const lower =
  placeholders < PLACEHOLDER_CEILING ? ` — lower PLACEHOLDER_CEILING to ${placeholders}` : '';
console.log(
  `✅ gallery credits: ${images} images, ${KNOWN_MISSING.size} known without a credit, ` +
    `${placeholders} placeholder credits (ceiling ${PLACEHOLDER_CEILING})${lower}.`,
);
