/**
 * Wire reusable-launchers figures: hero (base) + 3 diagrams + 2 reused fleet photos.
 * Each figure inserted at the END of its section. Run: node scripts/essays/wire-reuse-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'reusable-launchers.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'reusable-launchers.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/reusable-launchers/expendable-cost';
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
    'The simplest possible trick',
    fig(
      'essays/reusable-launchers/landing-profile',
      'diagram',
      'The trick is almost insultingly simple to state and brutal to fly: hold back enough propellant, flip the booster around, and burn three times on the way down — boostback, entry, landing — until it settles onto its legs. The same stage is then inspected, refuelled, and flown again.'
    ),
  ],
  [
    'Catching it with your hands',
    fig(
      'essays/reusable-launchers/tower-catch',
      'diagram',
      'Then a stranger idea: don’t give the booster legs at all. Let the launch tower catch it — two arms closing on a seventy-metre stage as it hovers, so the mass that would have been landing gear becomes payload instead. The first clean catch came in October 2024.'
    ),
  ],
  [
    'The second mover',
    fig(
      'fleet/falcon-9/01',
      'photo',
      'A Falcon 9 first stage stands back on its legs after delivering a payload to orbit — the moment a sixty-year assumption quietly collapsed. Once one company proved a booster could be flown again, everyone else had to learn to keep theirs too.',
      'SpaceX'
    ),
  ],
  [
    'What reuse actually changes',
    fig(
      'essays/reusable-launchers/cost-curve',
      'diagram',
      'The number that gates everything is the price of a kilogram to orbit. The Shuttle promised to lower it and never did; reusable Falcon 9 cut it roughly twenty-fold. Drop it far enough and missions that were once unthinkable become merely scheduled.'
    ),
  ],
  [
    'The question that landed',
    fig(
      'fleet/starship/01',
      'photo',
      'Starship is the larger wager: that the whole vehicle — booster and ship alike — comes home and flies again within days. If it holds, the cost of reaching orbit stops being the thing that decides what humanity is allowed to attempt.',
      'SpaceX'
    ),
  ],
];

const headingIndex = (text) => body.findIndex((b) => b.type === 'heading' && b.text === text);
const nextHeadingAfter = (i) => {
  for (let j = i + 1; j < body.length; j++) if (body[j].type === 'heading') return j;
  return body.length;
};
const planned = inserts
  .map(([h, f]) => ({ at: nextHeadingAfter(headingIndex(h)), f, h }))
  .sort((a, b) => b.at - a.at);
for (const p of planned) {
  if (headingIndex(p.h) < 0) throw new Error(`heading not found: ${p.h}`);
  body.splice(p.at, 0, p.f);
}
fs.writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
console.log('wired reuse:', body.filter((b) => b.type === 'figure').length, 'figures; hero =', base.hero);
