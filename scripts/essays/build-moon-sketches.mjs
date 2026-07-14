/**
 * going-to-the-moon essay ("The Practice Ground") — diagram SKETCHES (blend basis).
 * Same palette + pipeline as build-delta-v-sketches.mjs (docs/guides/diagram-art-style.md).
 * Run: node scripts/essays/build-moon-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'going-to-the-moon');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18';
const LINE = '#7fb0e0';
const ACC = '#cfe3fb';
const FAINT = 'rgba(127,176,224,0.14)';
const WHITE = '#ffffff';
const GOLD = '#ffd27f';
const W = 1600;
const H = 900;

const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const stars = (() => {
  let s = '';
  let seed = 137;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // Three days out — the forgiving distance: 1.3 light-seconds vs Mars minutes.
  proximity: frame(`
    ${stars}
    ${label(80, 90, 'CLOSE ENOUGH TO STAY IN REACH', 30, 'start', LINE)}
    ${label(80, 128, 'the Moon is the one place beyond Earth we can still talk to in near-real time', 20)}
    ${dot(300, 470, 60, '#4a6a9a')} ${label(300, 560, 'EARTH', 15, 'middle')}
    ${dot(660, 440, 26, ACC)} ${label(660, 400, 'MOON', 15, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="360" y1="465" x2="632" y2="445"/></g>
    ${label(500, 500, '1.3 light-seconds', 17, 'middle', GOLD)}
    ${label(500, 524, 'a warning arrives before the mistake', 14, 'middle')}
    <g stroke="${FAINT}" stroke-width="1.6" stroke-dasharray="7 7"><line x1="360" y1="480" x2="1420" y2="600"/></g>
    ${dot(1400, 600, 14, '#e08a6a')} ${label(1400, 640, 'MARS', 15, 'middle')}
    ${label(1080, 545, '3–22 light-MINUTES — on its own', 16, 'middle')}
    ${label(740, 800, 'far enough to teach the real lessons, near enough to forgive a mistake', 18, 'middle', LINE)}
  `),

  // The thing we did and forgot — the fifty-year erasure.
  'the-gap': frame(`
    ${stars}
    ${label(80, 90, 'WE DID THIS ONCE', 30, 'start', LINE)}
    ${label(80, 128, 'not a pause — an erasure; the knowledge left with the people who held it', 20)}
    <line x1="180" y1="470" x2="1440" y2="470" stroke="${FAINT}" stroke-width="1.6"/>
    <rect x="200" y="440" width="150" height="60" fill="rgba(255,210,127,0.18)" stroke="${GOLD}" stroke-width="2"/>
    ${label(275, 425, '1969–1972', 16, 'middle', GOLD)}
    ${label(275, 478, 'APOLLO', 15, 'middle')}
    ${label(275, 540, '12 walked · 382 kg', 13, 'middle')}
    ${dot(400, 470, 7, WHITE)} ${label(400, 560, '1973: Saturn V line shut', 13, 'middle')}
    <line x1="430" y1="470" x2="1150" y2="470" stroke="rgba(224,120,120,0.5)" stroke-width="2" stroke-dasharray="4 8"/>
    ${label(790, 445, 'FIFTY-YEAR ERASURE', 20, 'middle', '#e08a6a')}
    ${label(790, 505, 'tooling scrapped · the hands retired · the memory perished', 14, 'middle')}
    <rect x="1180" y="440" width="200" height="60" fill="rgba(127,176,224,0.16)" stroke="${LINE}" stroke-width="2"/>
    ${label(1280, 425, '2022', 16, 'middle', LINE)}
    ${label(1280, 478, 'ARTEMIS I (uncrewed)', 14, 'middle')}
    ${label(1280, 540, 'relearning from records', 13, 'middle')}
    ${label(790, 800, '“we did this” is a different sentence from “we can do this now”', 18, 'middle', LINE)}
  `),

  // Not the same Moon we left — flags at the equator vs ice at the pole.
  'south-pole-turn': frame(`
    ${stars}
    ${label(80, 90, 'FROM FLAGS TO FUEL', 30, 'start', LINE)}
    ${label(80, 128, 'Apollo went to the equator; the new race goes to the poles, for the ice', 20)}
    <circle cx="780" cy="490" r="240" fill="rgba(127,176,224,0.08)" stroke="${LINE}" stroke-width="2"/>
    <g stroke="${FAINT}" stroke-width="1.2"><line x1="540" y1="490" x2="1020" y2="490"/></g>
    ${label(1035, 494, 'equator', 13, 'start')}
    ${dot(720, 490, 6, GOLD)} ${dot(800, 490, 6, GOLD)} ${dot(760, 490, 6, GOLD)}
    ${label(760, 470, 'APOLLO — flags, footprints, six landings', 14, 'middle', GOLD)}
    <g fill="rgba(207,227,251,0.5)"><circle cx="780" cy="712" r="18"/><circle cx="740" cy="700" r="10"/><circle cx="820" cy="700" r="10"/></g>
    ${label(780, 760, 'SOUTH POLE — permanently shadowed craters', 15, 'middle', ACC)}
    ${label(780, 786, 'water ice: propellant · air · water · shielding', 14, 'middle', WHITE)}
    ${label(1200, 360, 'Apollo visited.', 18, 'middle', GOLD)}
    ${label(1200, 388, 'The pole is about', 16, 'middle')}
    ${label(1200, 412, 'staying.', 18, 'middle', LINE)}
  `),

  // A crowded sky — the global chorus of landers, near side and far.
  'crowded-sky': frame(`
    ${stars}
    ${label(80, 90, 'A CROWDED SKY AGAIN', 30, 'start', LINE)}
    ${label(80, 128, 'the busiest the Moon has been since the 1970s — and now, a global chorus', 20)}
    <!-- near side -->
    <circle cx="470" cy="500" r="200" fill="rgba(127,176,224,0.08)" stroke="${LINE}" stroke-width="2"/>
    ${label(470, 270, 'NEAR SIDE', 15, 'middle')}
    ${dot(430, 470, 6, GOLD)} ${label(360, 455, 'APOLLO (USA)', 12, 'end')}
    ${dot(500, 440, 6, WHITE)} ${label(560, 430, 'LUNA (USSR)', 12, 'start')}
    ${dot(470, 560, 6, WHITE)} ${label(470, 585, 'CHANG’E-5 (China) — sample return', 12, 'middle')}
    ${dot(430, 660, 6, ACC)} ${label(430, 688, 'CHANDRAYAAN-3 (India) — south pole', 12, 'middle')}
    ${dot(540, 620, 6, ACC)} ${label(600, 640, 'SLIM (Japan) — pinpoint', 12, 'start')}
    <!-- far side -->
    <circle cx="1080" cy="500" r="200" fill="rgba(127,176,224,0.05)" stroke="${FAINT}" stroke-width="2"/>
    ${label(1080, 270, 'FAR SIDE', 15, 'middle')}
    ${dot(1080, 500, 7, GOLD)} ${label(1080, 470, 'CHANG’E-4 — first farside landing (2019)', 12, 'middle', GOLD)}
    ${label(1080, 720, 'CHANG’E-6 — first farside sample return (2024)', 12, 'middle')}
    ${label(790, 800, 'more of the species asking the Moon its oldest question than ever before', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'moon sketches');
