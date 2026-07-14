/**
 * Wire interstellar-exploration figures: hero (the-scale-jump) + 3 diagrams + 2 reused photos.
 * Run: node scripts/essays/wire-interstellar-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'interstellar-exploration.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'interstellar-exploration.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/interstellar-exploration/the-scale-jump';
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
    'The humbling speed of everything we have launched',
    [
      fig(
        'essays/interstellar-exploration/voyagers-speed',
        'diagram',
        'Voyager 1, launched in 1977, is the fastest-receding object humanity has ever built — and at roughly seventeen kilometres a second it would still take on the order of 73,000 years to cross the distance to the nearest star. It isn’t even going there. Against interstellar distance, our fastest is a crawl.',
      ),
      fig(
        'missions/voyager-1/01',
        'photo',
        'Voyager 1 — now more than twenty-four billion kilometres out, the most distant object humans have ever made, and still, on any interstellar scale, barely out the door.',
        'NASA/JPL-Caltech',
      ),
    ],
  ],
  [
    'The serious proposals — and the walls they meet',
    [
      fig(
        'essays/interstellar-exploration/the-proposals',
        'diagram',
        'Three concepts survive honest scrutiny: a laser-pushed nanosail (Breakthrough Starshot) that could fly past a nearby star in decades, a fusion starship (Project Daedalus) the size of a building, and antimatter’s perfect but unmakeable fuel. None is forbidden by physics — all are forbidden by energy, distance, and patience.',
      ),
    ],
  ],
  [
    'The message problem',
    [
      fig(
        'essays/interstellar-exploration/the-message',
        'diagram',
        'Even if a probe arrives, the news takes years to come home. At Proxima a signal is 4.24 years each way; a decades-long crossing yields a few hours of flyby data, then years more to hear it. Interstellar exploration is, above all, an exercise in patience.',
      ),
    ],
  ],
  [
    'The honest horizon',
    [
      fig(
        'missions/new-horizons/01',
        'photo',
        'New Horizons, which crossed nearly five billion kilometres to Pluto and on into the Kuiper Belt — the newest of our outbound craft, and a reminder that even our boldest deep-space missions are still voyages within the solar system’s own front garden.',
        'NASA/JHUAPL/SwRI',
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
console.log(
  'wired interstellar-exploration:',
  body.filter((b) => b.type === 'figure').length,
  'figures; hero =',
  base.hero,
);
