/**
 * Insert figure blocks into the navigation essay overlay body, after the block
 * whose prose contains a given anchor substring. Idempotent: skips a figure if
 * its image is already present. Also sets the base-record hero.
 *
 * Run: node scripts/essays/wire-nav-figures.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const overlayPath = path.join(ROOT, 'i18n-src', 'en-US', 'essays', 'navigation.json');
const basePath = path.join(ROOT, 'static', 'data', 'essays', 'navigation.json');

const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));

const fig = (image, kind, caption, credit, align = 'wide') => {
  const f = { type: 'figure', image, kind, caption, align };
  if (credit) f.credit = credit;
  return f;
};

// figures keyed by an anchor substring found in the prose block they follow
const inserts = [
  {
    anchor: 'inertial measurement unit',
    figure: fig(
      'essays/navigation/dead-reckoning',
      'diagram',
      'Dead reckoning — the oldest trick at sea, and still the one underneath. Hold the known start, add every push you have felt since, and a running guess at where you are slowly rots; a star sighting resets the drift to zero.',
    ),
  },
  {
    anchor: 'Jim Lovell at a telescope and sextant',
    figure: fig(
      'missions/apollo8/01',
      'photo',
      'Apollo 8, December 1968 — the first crew to leave Earth and navigate to another world, correcting a drifting count the way a sailor would: a sextant, the stars, and the Earth’s horizon.',
      'NASA',
    ),
  },
  {
    anchor: 'fraction of a millimetre per second',
    figure: fig(
      'essays/navigation/deep-space-network',
      'diagram',
      'The Deep Space Network: three great dishes spaced roughly 120° apart, so one always faces deep space. Range comes from the round-trip light-time; speed from the radio’s Doppler shift. The ground does the flying.',
    ),
  },
  {
    anchor: 'interpolation between glimpses of it',
    figure: fig(
      'essays/navigation/reference-frame',
      'diagram',
      'Which way is up, when there is no up: a star tracker photographs a patch of sky, matches the pattern to an onboard catalogue, and knows at once how the craft is oriented in the fixed J2000 frame. Between fixes, the gyros carry the count.',
    ),
  },
  {
    anchor: 'only time anything has visited the ice giants',
    figure: fig(
      'essays/navigation/gravity-assist',
      'diagram',
      'You never fly straight at it. A Hohmann transfer coasts along the cheapest arc to a moving planet; a gravity assist steals a whisper of a planet’s own motion for free — the trick that let one probe bank Jupiter into Saturn into Uranus into Neptune.',
    ),
  },
  {
    anchor: 'in seven minutes, alone',
    figure: fig(
      'missions/perseverance/01',
      'photo',
      'Perseverance lands itself. Mars is light-minutes away, so by the time Earth hears the craft has hit the atmosphere it is already down, one way or the other — the rover reads the terrain rushing up and chooses its own safe spot.',
      'NASA/JPL-Caltech',
    ),
  },
];

let added = 0;
const have = new Set(overlay.body.filter((b) => b.type === 'figure').map((b) => b.image));
// Walk from the end so earlier insertions don't shift later anchor indices.
for (const { anchor, figure } of [...inserts].reverse()) {
  if (have.has(figure.image)) continue;
  const idx = overlay.body.findIndex((b) => b.type === 'prose' && b.md.includes(anchor));
  if (idx === -1) {
    console.warn(`! anchor not found: "${anchor}"`);
    continue;
  }
  overlay.body.splice(idx + 1, 0, figure);
  added++;
}

// hero: the bespoke opener art
base.hero = 'essays/navigation/hero';

fs.writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
fs.writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');
console.log(
  `✓ inserted ${added} figures; body now ${overlay.body.length} blocks; hero set to ${base.hero}`,
);
