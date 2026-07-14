/**
 * interstellar-exploration essay ("The Honest Arithmetic") — diagram SKETCHES (blend basis).
 * docs/guides/diagram-art-style.md. Run: node scripts/essays/build-interstellar-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'interstellar-exploration');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18', LINE = '#7fb0e0', ACC = '#cfe3fb', FAINT = 'rgba(127,176,224,0.14)', WHITE = '#ffffff', GOLD = '#ffd27f';
const W = 1600, H = 900;
const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const stars = (() => { let s = '', seed = 523; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 90; i++) s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s; })();

const diagrams = {
  // Hero — the scale jump from light-hours to light-years.
  'the-scale-jump': frame(`
    ${stars}
    ${label(80, 90, 'A DIFFERENT KIND OF FAR', 30, 'start', LINE)}
    ${label(80, 128, 'the solar system is measured in light-HOURS; the nearest star, in light-YEARS', 20)}
    ${dot(160, 460, 16, GOLD)} ${label(160, 502, 'SUN', 14, 'middle')}
    <line x1="180" y1="460" x2="470" y2="460" stroke="${LINE}" stroke-width="2.5"/>
    ${dot(470, 460, 8, ACC)} ${label(470, 430, 'PLUTO', 13, 'middle')} ${label(470, 500, '~5.5 light-hours', 13, 'middle')}
    <line x1="490" y1="460" x2="1180" y2="460" stroke="${FAINT}" stroke-width="1.6" stroke-dasharray="4 10"/>
    ${label(835, 440, '. . . nothing, for four light-years . . .', 16, 'middle')}
    ${dot(1300, 460, 13, GOLD)} ${label(1300, 420, 'PROXIMA CENTAURI', 15, 'middle', GOLD)} ${label(1300, 500, '4.24 light-YEARS', 15, 'middle', GOLD)}
    ${label(800, 720, 'from the edge of the solar system to the nearest star is a leap of ~7,000×', 18, 'middle', LINE)}
  `),

  // Voyager's real speed — the humbling number.
  'voyagers-speed': frame(`
    ${stars}
    ${label(80, 90, 'THE FASTEST THING WE HAVE LAUNCHED', 30, 'start', LINE)}
    ${label(80, 128, 'and it is glacial against the gap', 20)}
    ${dot(220, 460, 8, ACC)} ${label(220, 420, 'VOYAGER 1', 15, 'middle')} ${label(220, 500, '~17 km/s', 14, 'middle')}
    <g stroke="${LINE}" stroke-width="3"><line x1="250" y1="460" x2="470" y2="460"/><polygon points="470,460 452,451 452,469" fill="${LINE}"/></g>
    <line x1="470" y1="460" x2="1360" y2="460" stroke="${FAINT}" stroke-width="1.6" stroke-dasharray="4 12"/>
    ${dot(1360, 460, 12, GOLD)} ${label(1360, 420, 'PROXIMA', 14, 'middle', GOLD)}
    ${label(860, 560, '≈ 73,000 years to cross that distance', 20, 'middle', GOLD)}
    ${label(860, 592, 'and Voyager is not even aimed there', 15, 'middle')}
    ${label(800, 760, 'the whole of recorded human history, ten times over, to reach one neighbour', 18, 'middle', LINE)}
  `),

  // The serious proposals — and their walls.
  'the-proposals': frame(`
    ${stars}
    ${label(80, 90, 'THE SERIOUS ROADS OUT', 30, 'start', LINE)}
    ${label(80, 128, 'three concepts that are physically sound — and each walled off', 20)}
    ${[
      ['BREAKTHROUGH STARSHOT', 'laser-pushed sail · ~20% c', 'a 20-year flyby — no brakes, grams of payload', 300, GOLD],
      ['PROJECT DAEDALUS', 'fusion rocket · ~12% c', 'a starship the size of a skyscraper; no reactor yet', 440, LINE],
      ['ANTIMATTER', '100% of mass → energy', 'the perfect fuel we cannot make or store', 580, ACC],
    ].map(([name, how, wall, y, col]) =>
      `<rect x="120" y="${y - 40}" width="1360" height="96" rx="10" fill="rgba(127,176,224,0.05)" stroke="${col}" stroke-width="1.6"/>` +
      label(150, y - 6, name, 20, 'start', col) +
      label(150, y + 26, how, 15, 'start') +
      label(1450, y + 6, wall, 15, 'end', 'rgba(207,227,251,0.8)')
    ).join('')}
    ${label(800, 720, 'not forbidden by physics — forbidden by energy, distance, and patience', 18, 'middle', LINE)}
  `),

  // The message problem — mostly waiting.
  'the-message': frame(`
    ${stars}
    ${label(80, 90, 'MOSTLY, IT IS WAITING', 30, 'start', LINE)}
    ${label(80, 128, 'even a signal takes years each way — there is no conversation', 20)}
    ${dot(280, 460, 40, '#4a6a9a')} ${label(280, 540, 'EARTH', 15, 'middle')}
    <g stroke="${FAINT}" stroke-width="1.6" stroke-dasharray="8 8"><line x1="340" y1="460" x2="1240" y2="460"/></g>
    ${dot(1300, 460, 22, GOLD)} ${label(1300, 540, 'PROXIMA', 15, 'middle', GOLD)}
    ${label(800, 425, '4.24 years each way, at the speed of light', 17, 'middle')}
    ${label(800, 640, 'a decades-long crossing buys a few hours of flyby data —', 16, 'middle')}
    ${label(800, 666, 'then years more to hear it', 16, 'middle', GOLD)}
    ${label(800, 800, 'interstellar exploration is, above all, an exercise in patience', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'interstellar sketches');
