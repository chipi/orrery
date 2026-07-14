/**
 * Wire new-propulsion figures: hero (solar-sail) + 3 diagrams + 1 reused Dawn photo.
 * Supports multiple figures per section (inserted in order at the section end).
 * Run: node scripts/essays/wire-propulsion-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'new-propulsion.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'new-propulsion.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/new-propulsion/solar-sail';
fs.writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');

const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
const body = overlay.body;
const fig = (image, kind, caption, credit) => {
  const f = { type: 'figure', image, kind, caption, align: 'wide' };
  if (credit) f.credit = credit;
  return f;
};

// heading text → ordered list of figures to place at the end of that section
const inserts = [
  [
    'The slow push',
    [
      fig(
        'essays/new-propulsion/ion-drive',
        'diagram',
        'A chemical rocket spends its whole life in a few minutes of fury, then coasts. An ion engine pushes with the weight of a coin — but never stops. Given enough time it quietly overtakes the rocket that shoved hardest, and keeps climbing.',
      ),
      fig(
        'missions/dawn/01',
        'photo',
        'Dawn ran on a xenon-ion engine whose thrust you could have balanced on your palm — and rode that whisper for years, becoming the only craft ever to orbit two separate worlds beyond Earth: first Vesta, then Ceres.',
        'NASA/JPL-Caltech',
      ),
    ],
  ],
  [
    'The heat of the nucleus',
    [
      fig(
        'essays/new-propulsion/nuclear-thermal',
        'diagram',
        'There is no flame here at all. A reactor heats hydrogen past any temperature a chemical fire can reach and throws it from the nozzle at roughly twice the speed — the same fuel, worth twice the push, and a shorter, less-irradiated road to Mars.',
      ),
    ],
  ],
  [
    'Where the exits lead',
    [
      fig(
        'essays/new-propulsion/isp-ladder',
        'diagram',
        'Line the exits up by efficiency and the pattern is plain: every road out of the chemical era trades brute thrust for the patience to keep pushing. All of them were sketched on paper before the first satellite ever flew.',
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
  'wired propulsion:',
  body.filter((b) => b.type === 'figure').length,
  'figures; hero =',
  base.hero,
);
