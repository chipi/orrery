/**
 * Wire the-body-in-the-dark figures: hero (fragile-payload) + 3 diagrams + 2 reused photos.
 * Run: node scripts/essays/wire-body-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'the-body-in-the-dark.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'the-body-in-the-dark.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/the-body-in-the-dark/fragile-payload';
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
    'The invisible weather',
    [
      fig(
        'essays/the-body-in-the-dark/radiation-weather',
        'diagram',
        'The hardest problem is the one you cannot see. Beyond Earth’s magnetic field there is no shelter from galactic cosmic rays, and a solar storm can deliver an acute dose in hours. Shielding heavy enough to stop them is far too heavy to fly — so on a long voyage, the crew simply absorbs the weather.'
      ),
    ],
  ],
  [
    'The body forgets gravity',
    [
      fig(
        'essays/the-body-in-the-dark/microgravity-toll',
        'diagram',
        'A body optimised for one gravity quietly comes apart in free fall: bone drains at around one percent a month, muscle wastes, fluid pools in the head and flattens the back of the eye. Two hours of exercise a day only slows the losses — no one has made them stop.'
      ),
    ],
  ],
  [
    'What we know because someone stayed',
    [
      fig(
        'essays/the-body-in-the-dark/the-record',
        'diagram',
        'Almost everything we know about the body in space we know because particular people stayed up there long enough to measure it — and the record is global. Valeri Polyakov’s 437 days aboard Mir still stands; the ISS and now Tiangong add crew-years to the dataset one rotation at a time.'
      ),
      fig(
        'fleet/iss/01',
        'photo',
        'The International Space Station — for a quarter-century the single laboratory where the long-term effects of weightlessness have been studied, on a rotating international crew who are, unavoidably, the experiment.',
        'NASA'
      ),
    ],
  ],
  [
    'The mind in a can',
    [
      fig(
        'missions/polaris-dawn/01',
        'photo',
        'A private astronaut in the open hatch of a Crew Dragon during Polaris Dawn, 2024 — a human being with only a suit between them and the vacuum. The engineering can be made reliable; the mind that has to endure the confinement, the risk, and the years cannot be re-specced.',
        'Polaris Program / SpaceX'
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
console.log('wired the-body-in-the-dark:', body.filter((b) => b.type === 'figure').length, 'figures; hero =', base.hero);
