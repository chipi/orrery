/**
 * Wire asteroid-mining figures: hero (wrong-treasure) + 3 diagrams + 2 reused photos.
 * Run: node scripts/essays/wire-asteroid-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'asteroid-mining.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'asteroid-mining.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/asteroid-mining/wrong-treasure';
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
    'The well is the problem',
    [
      fig(
        'essays/asteroid-mining/the-well',
        'diagram',
        'Every kilogram launched from Earth pays a brutal toll in delta-v just to climb out of the planet’s gravity well. Anything already in space — an asteroid drifting above the rim — has that price paid. Which is why a litre of water parked in orbit is worth more than a litre of gold sitting on the ground.'
      ),
    ],
  ],
  [
    'Water is the ore',
    [
      fig(
        'essays/asteroid-mining/water-is-the-ore',
        'diagram',
        'Split asteroid water and you have hydrogen and oxygen — rocket propellant — plus air to breathe, water to drink, and bulk rock for radiation shielding. The prize was never metal to sell back home; it is a fuel depot that is already in the sky.'
      ),
    ],
  ],
  [
    'We have already touched them',
    [
      fig(
        'essays/asteroid-mining/the-recon',
        'diagram',
        'Three robotic missions have already touched and sampled asteroids: Japan’s Hayabusa (Itokawa, 2010, the first ever), Hayabusa2 (Ryugu, 2020), and NASA’s OSIRIS-REx (Bennu, 2023). What came back was water-bearing clay and organics — from loose rubble, not solid metal.'
      ),
      fig(
        'missions/hayabusa2/01',
        'photo',
        'Hayabusa2 at Ryugu — JAXA’s second asteroid sample return, and the mission bold enough to fire a copper impactor into the surface to blast open a fresh crater before scooping up what it exposed.',
        'JAXA'
      ),
    ],
  ],
  [
    'Rubble, not rock',
    [
      fig(
        'missions/osiris-rex/01',
        'photo',
        'OSIRIS-REx reaching down to touch Bennu — and finding not solid ground but a rubble pile so loosely bound that the sampling head sank straight in, nearly swallowing the arm. “Mining” a body like this is unlike anything ever done on Earth.',
        'NASA/Goddard/University of Arizona'
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
console.log('wired asteroid-mining:', body.filter((b) => b.type === 'figure').length, 'figures; hero =', base.hero);
