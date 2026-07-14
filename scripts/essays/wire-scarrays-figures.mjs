/**
 * Wire space-comm-arrays figures: hero (the-bottleneck) + 3 diagrams + 2 reused photos.
 * Run: node scripts/essays/wire-scarrays-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'space-comm-arrays.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'space-comm-arrays.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/space-comm-arrays/the-bottleneck';
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
    'Many ears instead of one',
    [
      fig(
        'essays/space-comm-arrays/arraying',
        'diagram',
        'Rather than build ever-larger single dishes, the future is to array many smaller ones so their signals combine into one enormous virtual aperture — cheaper to grow, redundant, degrading gracefully. It was arraying, across four continents, that pulled Voyager 2’s whisper out of the noise at Neptune in 1989.'
      ),
      fig(
        'missions/voyager-2/01',
        'photo',
        'Voyager 2 at Neptune, 1989 — by then so faint that catching its full data rate meant combining dishes on four continents at once. It was the case that proved arraying works.',
        'NASA/JPL-Caltech'
      ),
    ],
  ],
  [
    'The turn to light',
    [
      fig(
        'missions/psyche-mission/01',
        'photo',
        'NASA’s Psyche carried the Deep Space Optical Communications demonstrator, which in 2023–24 streamed high-definition video home from tens of millions of kilometres on a beam of laser light — ten to a hundred times the data a radio link could carry.',
        'NASA/JPL-Caltech'
      ),
    ],
  ],
  [
    'An internet with a light-hour of lag',
    [
      fig(
        'essays/space-comm-arrays/interplanetary-internet',
        'diagram',
        'The other half of the answer is software. Delay/Disruption-Tolerant Networking drops the ordinary internet’s assumption of a live end-to-end link: each node holds a data “bundle” and forwards it only when the next hop is reachable. Mars orbiters already relay for rovers this way — a real, standardised interplanetary internet, not a metaphor.'
      ),
    ],
  ],
  [
    'What it still cannot do',
    [
      fig(
        'essays/space-comm-arrays/the-lightspeed-floor',
        'diagram',
        'None of it beats the speed of light. Optical links and arrays carry more of the story, and delay-tolerant networking keeps it from being lost — but a signal to Mars is still three to twenty-two minutes each way. There is no bandwidth, anywhere, that buys a real-time conversation with another planet.'
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
console.log('wired space-comm-arrays:', body.filter((b) => b.type === 'figure').length, 'figures; hero =', base.hero);
