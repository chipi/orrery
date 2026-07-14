/**
 * Wire going-to-mars figures: hero (three-walls) + 3 diagrams + 2 reused Mars photos.
 * Run: node scripts/essays/wire-mars-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'going-to-mars.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'going-to-mars.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/going-to-mars/three-walls';
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
    'You cannot leave when you want',
    [
      fig(
        'essays/going-to-mars/launch-window',
        'diagram',
        'You do not leave for Mars when you are ready; you leave when the two planets line up, which happens for a few weeks about every twenty-six months. Miss it and you wait two years. And once the transfer burn commits you to the six-to-nine-month coast, there is no abort back to Earth.',
      ),
    ],
  ],
  [
    'Everything, for years',
    [
      fig(
        'essays/going-to-mars/isru-return',
        'diagram',
        'Hauling enough propellant from Earth to lift a crew back off Mars is close to impossible, so the plan is to make it on arrival. Perseverance’s MOXIE experiment pulled oxygen from the CO₂ atmosphere — a few grams an hour, but the first time a factory has ever run on another world.',
      ),
    ],
  ],
  [
    'The seven minutes, again — and then some',
    [
      fig(
        'missions/perseverance/01',
        'photo',
        'Perseverance in the last seconds of its own landing, lowered on cables from the sky crane over Jezero — the hardest arrival in the solar system, flown entirely by the spacecraft. A crewed lander would mass tens of times more, and no one yet knows how to set that down.',
        'NASA/JPL-Caltech',
      ),
    ],
  ],
  [
    'The body keeps the score',
    [
      fig(
        'essays/going-to-mars/radiation',
        'diagram',
        'Mars lost its global magnetic field when its core cooled, so it has no shield against galactic cosmic rays or solar storms. A crew takes roughly 300 millisieverts on the six-month transit alone — and across a three-year round trip, a dose no shielding light enough to fly can stop.',
      ),
    ],
  ],
  [
    'The wall is the point',
    [
      fig(
        'missions/tianwen1/01',
        'photo',
        'China’s Tianwen-1 delivered an orbiter, a lander, and the Zhurong rover to Mars on its very first attempt in 2021 — a sequence no other nation has managed in a single mission. Mars is the wall precisely because so many have broken on it, and a few, from more and more of the world, have not.',
        'CNSA',
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
  'wired going-to-mars:',
  body.filter((b) => b.type === 'figure').length,
  'figures; hero =',
  base.hero,
);
