// After the 2026-11-07 Mars 2 slot replacements: the vision rows of 01 and 04 describe the new
// images (set by hand, not scored — no vision API call), and 04's curation deny-list entry
// ("off-subject", re-source it) is resolved and removed.
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/mars2-vision.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const V = 'static/data/image-vision.json';
const C = 'static/data/image-curation.json';
const v = JSON.parse(readFileSync(V, 'utf8'));
const set = (k, subject, category) => {
  const e = v.entries[k];
  if (!e) throw new Error(`no vision row ${k}`);
  Object.assign(e, {
    subject,
    category,
    focal_point: { x: 0.5, y: 0.55 },
    subject_match: true,
    rejected_by: null,
    scored_at: '2026-11-07T00:00:00.000Z',
    scoring_cost_usd: 0,
  });
};
set(
  '/images/missions/mars2/01.jpg',
  'Render of PrOP-M, the small rover on skis that Mars 2 and Mars 3 carried, on a stony Martian surface.',
  'render',
);
set(
  '/images/missions/mars2/04.jpg',
  'Museum model of the Mars 3 descent module, the same lander design Mars 2 carried, petals open and antennas raised.',
  'hardware',
);
writeFileSync(V, JSON.stringify(v, null, 2) + '\n');
const c = JSON.parse(readFileSync(C, 'utf8'));
const before = c.entries.length;
c.entries = c.entries.filter((e) => e.path !== '/images/missions/mars2/04.jpg');
writeFileSync(C, JSON.stringify(c, null, 2) + '\n');
console.log(`vision 2 rows set; curation ${before} → ${c.entries.length}`);
