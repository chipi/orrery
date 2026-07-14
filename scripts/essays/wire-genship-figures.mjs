/**
 * Wire generational-starships figures: hero (the-ship-as-world) + 3 diagrams + 2 reused photos.
 * Apollo 8 Earthrise closes "The mirror" — and the whole collection.
 * Run: node scripts/essays/wire-genship-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'generational-starships.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'generational-starships.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/generational-starships/the-ship-as-world';
fs.writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');

const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
const body = overlay.body;
const fig = (image, kind, caption, credit) => {
  const f = { type: 'figure', image, kind, caption, align: 'wide' };
  if (credit) f.credit = credit;
  return f;
};

const inserts = [
  [
    'A closed world',
    [
      fig(
        'essays/generational-starships/closed-loop',
        'diagram',
        'Nothing arrives and nothing leaves. The ecology has to run unbroken for centuries — air, water, and food cycled endlessly, with no resupply and no ground control to call. Biosphere 2, a sealed three-acre ecosystem, could not hold its own oxygen steady for even two years.'
      ),
      fig(
        'fleet/iss/01',
        'photo',
        'The International Space Station is the closest thing we have built to a closed world — and it is resupplied from Earth every few weeks. A ship that must close the loop completely, for a thousand years, is a different order of problem entirely.',
        'NASA'
      ),
    ],
  ],
  [
    'The crew is a population',
    [
      fig(
        'essays/generational-starships/the-population',
        'diagram',
        'The passengers are not a crew but a population, and it has to stay genetically healthy across dozens of generations. One study puts the minimum near 14,000 people for a 150-year voyage — not a crew you train, but a society you launch, with its own governance, culture, and drift.'
      ),
    ],
  ],
  [
    'Will they arrive first?',
    [
      fig(
        'essays/generational-starships/the-wait-calculation',
        'diagram',
        'And there is a paradox in even leaving. A ship launched slowly now might be overtaken by a faster one built centuries later — arriving to find the destination already settled. If waiting can always beat you there, when, if ever, is it rational to go?'
      ),
    ],
  ],
  [
    'The mirror',
    [
      fig(
        'missions/apollo8/01',
        'photo',
        'Earthrise, photographed from Apollo 8 in 1968 — the whole of the only closed, finite world we have ever known, carrying its lineage through the dark with no resupply and no ground control. The generation ship is a thought experiment about this one: we are already the crew of one.',
        'NASA / William Anders'
      ),
    ],
  ],
];

const headingIndex = (text) => body.findIndex((b) => b.type === 'heading' && b.text === text);
const nextHeadingAfter = (i) => {
  for (let j = i + 1; j < body.length; j++) if (body[j].type === 'heading') return j;
  return body.length;
};
const planned = inserts
  .map(([h, figs]) => ({ at: nextHeadingAfter(headingIndex(h)), figs, h }))
  .sort((a, b) => b.at - a.at);
for (const p of planned) {
  if (headingIndex(p.h) < 0) throw new Error(`heading not found: ${p.h}`);
  body.splice(p.at, 0, ...p.figs);
}
fs.writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
console.log('wired generational-starships:', body.filter((b) => b.type === 'figure').length, 'figures; hero =', base.hero);
