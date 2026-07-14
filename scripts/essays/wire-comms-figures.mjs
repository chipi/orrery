/**
 * Wire comms figures: hero (base) + 3 diagrams + 2 reused mission photos (overlay).
 * Each figure is inserted at the END of its section (just before the next heading).
 * Run: node scripts/essays/wire-comms-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'comms.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'comms.json');

// --- base: set the hero (the three-sites coverage diagram opens the piece) ---
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/comms/coverage';
fs.writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');

// --- overlay: splice figures in at the end of each named section ---
const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
const body = overlay.body;

const fig = (image, kind, caption, credit) => {
  const f = { type: 'figure', image, kind, caption, align: 'wide' };
  if (credit) f.credit = credit;
  return f;
};

// heading text → figure to place at the end of that section
const inserts = [
  [
    '22 watts across the void',
    fig(
      'essays/comms/link-budget',
      'diagram',
      'A spacecraft answers on roughly twenty watts — less than the bulb in a refrigerator. Spread across a billion kilometres by nothing but the inverse-square law, what reaches the dish is around a millionth of a billionth of a watt. The genius of deep-space comms is not the shout; it is the listening.'
    ),
  ],
  [
    'The patience required',
    fig(
      'essays/comms/light-time',
      'diagram',
      'The whole enterprise runs on delay. A word to the Moon is answered in under three seconds; to Mars, in minutes to the better part of an hour; to Voyager, in nearly two days. You cannot fly these craft in real time — you write ahead, and wait for the echo.'
    ),
  ],
  [
    'What patience costs',
    fig(
      'missions/voyager-1/01',
      'photo',
      'Voyager 1, more than twenty-four billion kilometres out, still answers — but a question sent today waits some forty-five hours for its reply. You do not converse with it so much as leave a letter and come back for the answer.',
      'NASA/JPL-Caltech'
    ),
  ],
  [
    'The turn toward light',
    fig(
      'essays/comms/optical',
      'diagram',
      'The next turn is toward light. A laser’s pencil-thin beam carries ten to a hundred times the data of a radio’s wide cone: Psyche’s demonstration streamed high-definition video from thirty million kilometres away, on a beam you could have blocked with a coin.'
    ),
  ],
  [
    'The weight of the whisper',
    fig(
      'missions/pioneer-10/01',
      'photo',
      'Pioneer 10 was the first craft tracked into the outer dark. Its final faint signal reached the Deep Space Network in 2003, from beyond the orbit of Pluto — a whisper that at last fell below hearing, still outbound.',
      'NASA/Ames Research Center'
    ),
  ],
];

const headingIndex = (text) =>
  body.findIndex((b) => b.type === 'heading' && b.text === text);
const nextHeadingAfter = (i) => {
  for (let j = i + 1; j < body.length; j++) if (body[j].type === 'heading') return j;
  return body.length;
};

// insert bottom-up so earlier indices stay valid
const planned = inserts
  .map(([h, f]) => ({ at: nextHeadingAfter(headingIndex(h)), f, h }))
  .sort((a, b) => b.at - a.at);

for (const p of planned) {
  if (headingIndex(p.h) < 0) throw new Error(`heading not found: ${p.h}`);
  body.splice(p.at, 0, p.f);
}

fs.writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
console.log(
  'wired comms:',
  body.filter((b) => b.type === 'figure').length,
  'figures; hero =',
  base.hero
);
