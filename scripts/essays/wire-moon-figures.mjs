/**
 * Wire going-to-the-moon figures: hero (proximity) + 3 diagrams + 2 reused moon photos.
 * Run: node scripts/essays/wire-moon-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'going-to-the-moon.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'going-to-the-moon.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/going-to-the-moon/proximity';
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
    'The thing we did and then forgot',
    [
      fig(
        'essays/going-to-the-moon/the-gap',
        'diagram',
        'Apollo was the anomaly, not the start of a trend. The Saturn V line was shut down before the last crew even flew; over the fifty years that followed, the tooling was scrapped and the people who held the knowledge in their hands retired and died. We are climbing the first rung again — from records, not from living memory.'
      ),
    ],
  ],
  [
    'Not the same Moon we left',
    [
      fig(
        'essays/going-to-the-moon/south-pole-turn',
        'diagram',
        'Apollo went to the equator, where landing and operating are easiest. The new race goes to the poles, for what the permanently shadowed craters are thought to hold: water ice — hydrogen and oxygen, which is to say propellant, air, water, and shielding. The shift is from visiting to staying.'
      ),
      fig(
        'missions/chandrayaan3/01',
        'photo',
        'Chandrayaan-3’s Vikram lander on the southern highlands, August 2023 — the first craft to set down near the lunar south pole, closer to the ice than anything before it. It worked for a single lunar day before the fortnight-long night claimed it.',
        'ISRO'
      ),
    ],
  ],
  [
    'A crowded sky',
    [
      fig(
        'essays/going-to-the-moon/crowded-sky',
        'diagram',
        'The Moon is busier than it has been since the 1970s, and for the first time the cast is genuinely global: the Soviet Luna firsts, American Apollo, China reaching the farside twice, India at the south pole, Japan’s pinpoint touchdown. The oldest question spaceflight asks, now asked by more of the species than ever.'
      ),
    ],
  ],
  [
    'Dust and the long dark',
    [
      fig(
        'missions/apollo17/01',
        'photo',
        'Apollo 17, December 1972 — the last time anyone walked on the Moon. The crews came back grey to the elbows: lunar dust clings, abrades, and works into every seal, and no one has yet had to keep it out for the months a settled presence would demand.',
        'NASA'
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
console.log('wired going-to-the-moon:', body.filter((b) => b.type === 'figure').length, 'figures; hero =', base.hero);
