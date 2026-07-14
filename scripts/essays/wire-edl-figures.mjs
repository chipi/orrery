/**
 * Wire seven-minutes figures: hero (entry-heat) + 3 diagrams + 2 reused Mars photos.
 * Run: node scripts/essays/wire-edl-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'seven-minutes.json');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'seven-minutes.json');

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
base.hero = 'essays/seven-minutes/entry-heat';
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
    'Why the same answer never works twice',
    [
      fig(
        'essays/seven-minutes/edl-toolkit',
        'diagram',
        'Every world hands you a different problem. The Moon has no air, so you fall on rockets alone; Mars has just enough to cook you but not enough to catch you; Earth and Titan have enough that a parachute does most of the work. No arrival is ever quite the arrival before it.',
      ),
    ],
  ],
  [
    'The worlds that do not forgive',
    [
      fig(
        'essays/seven-minutes/mars-edl',
        'diagram',
        'Mars is the cruel middle case — too thin an atmosphere to parachute down, too thick to ignore. It all happens in about seven minutes: entry, peak heating, a supersonic parachute, heat-shield separation, powered descent, and a sky crane lowering the rover on cables. Every step must fire on its own, on time, or the mission ends in a crater.',
      ),
      fig(
        'missions/perseverance/01',
        'photo',
        'Perseverance hangs beneath its descent stage in the final seconds over Jezero Crater, moments before the sky crane pays out its cables — a manoeuvre flown entirely by the spacecraft itself, with Earth a spectator eleven minutes behind.',
        'NASA/JPL-Caltech',
      ),
    ],
  ],
  [
    'The failure record',
    [
      fig(
        'missions/schiaparelli/01',
        'photo',
        'Schiaparelli was meant to prove Europe could land on Mars. In 2016 its computer, briefly confused by its own sensors, decided it had already touched down — let go of its parachute, cut its thrusters, and fell the last kilometres. The record of arrivals is written as much in craters as in triumphs.',
        'ESA/ATG medialab',
      ),
    ],
  ],
  [
    'The part you cannot test',
    [
      fig(
        'essays/seven-minutes/blackout',
        'diagram',
        'And you cannot help it through any of it. Mars is light-minutes away — the whole descent fits inside the radio lag. By the time the first word of entry reaches Earth, the craft is already down, safe or dead, the outcome decided minutes before anyone here knew it had begun.',
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
  'wired seven-minutes:',
  body.filter((b) => b.type === 'figure').length,
  'figures; hero =',
  base.hero,
);
