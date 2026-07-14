/**
 * space-comm-arrays essay ("Louder Than a Whisper") — diagram SKETCHES (blend basis).
 * Distinct from the comms essay's set. docs/guides/diagram-art-style.md.
 * Run: node scripts/essays/build-scarrays-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'space-comm-arrays');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18', LINE = '#7fb0e0', ACC = '#cfe3fb', FAINT = 'rgba(127,176,224,0.14)', WHITE = '#ffffff', GOLD = '#ffd27f';
const W = 1600, H = 900;
const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const dish = (x, y, s = 1, fill = LINE) =>
  `<g transform="translate(${x},${y}) scale(${s})" stroke="${fill}" stroke-width="2.5" fill="none"><path d="M -22 0 A 22 22 0 0 1 22 0"/><line x1="0" y1="0" x2="0" y2="18"/><line x1="-12" y1="18" x2="12" y2="18"/></g>`;
const stars = (() => { let s = '', seed = 733; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++) s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s; })();

const diagrams = {
  // Hero — the ground is the bottleneck now.
  'the-bottleneck': frame(`
    ${stars}
    ${label(80, 90, 'THE BOTTLENECK IS THE GROUND', 30, 'start', LINE)}
    ${label(80, 128, 'the spacecraft are fine — it is the three dishes everyone has to share', 20)}
    ${dish(300, 500, 2.6, ACC)} ${dish(430, 520, 2.6, ACC)} ${dish(560, 500, 2.6, ACC)}
    ${label(430, 590, 'ONE DEEP SPACE NETWORK · THREE COMPLEXES', 15, 'middle')}
    ${[220,300,380,460].map((y,i)=>`${dot(1180, y, 6, i===0?GOLD:LINE)} ${label(1210, y+4, ['Mars orbiters','a rover','an outer-system probe','the next mission …'][i], 15, 'start', i===0?GOLD:ACC)}`).join('')}
    <g stroke="${FAINT}" stroke-width="1.4" stroke-dasharray="6 8">${[220,300,380,460].map(y=>`<line x1="620" y1="500" x2="1160" y2="${y}"/>`).join('')}</g>
    ${label(880, 540, 'all queuing for the same antenna-hours', 15, 'middle', GOLD)}
    ${label(760, 800, 'as the traffic grows, the network — not the craft — is what runs out', 18, 'middle', LINE)}
  `),

  // Many ears instead of one.
  arraying: frame(`
    ${stars}
    ${label(80, 90, 'MANY EARS INSTEAD OF ONE', 30, 'start', LINE)}
    ${label(80, 128, 'combine a crowd of small antennas so they act as one enormous dish', 20)}
    ${(() => { let g = ''; const xs = [220,320,420,300,400,500,360,460]; const ys = [560,600,560,660,660,620,720,720];
      for (let i = 0; i < xs.length; i++) g += dish(xs[i], ys[i], 1.5, ACC);
      for (let i = 0; i < xs.length; i++) g += `<line x1="${xs[i]}" y1="${ys[i]}" x2="720" y2="470" stroke="${FAINT}" stroke-width="1.2"/>`;
      return g; })()}
    ${dot(720, 470, 10, GOLD)} ${label(720, 440, 'combined → one virtual giant', 16, 'middle', GOLD)}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="760" y1="460" x2="1160" y2="400"/><polygon points="1160,400 1144,398 1148,414" fill="${GOLD}"/></g>
    ${dot(1220, 390, 8, LINE)} ${label(1220, 360, 'the faint probe', 14, 'middle')}
    ${label(1080, 560, 'cheaper to grow · fails gracefully', 15, 'middle')}
    ${label(1080, 588, 'it caught Voyager 2 at Neptune', 15, 'middle', LINE)}
    ${label(760, 810, 'the future is not one bigger dish — it is many small ones, listening together', 18, 'middle', LINE)}
  `),

  // An internet that tolerates the dark — DTN store-and-forward.
  'interplanetary-internet': frame(`
    ${stars}
    ${label(80, 90, 'AN INTERNET THAT TOLERATES THE DARK', 30, 'start', LINE)}
    ${label(80, 128, 'store-and-forward: each node holds a “bundle” until the next hop opens', 20)}
    ${dot(220, 460, 34, '#4a6a9a')} ${label(220, 530, 'EARTH', 15, 'middle')}
    ${dot(760, 460, 12, ACC)} ${label(760, 420, 'MARS ORBITER', 14, 'middle')} ${label(760, 500, '(relay)', 13, 'middle')}
    ${dot(1240, 520, 9, '#e08a6a')} ${label(1240, 560, 'ROVER', 14, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="10 8">
      <line x1="256" y1="460" x2="728" y2="460"/><polygon points="728,460 712,452 712,468" fill="${GOLD}"/>
      <line x1="790" y1="470" x2="1214" y2="512"/><polygon points="1214,512 1196,508 1200,524" fill="${GOLD}"/>
    </g>
    ${label(500, 430, 'hold the bundle …', 14, 'middle')}
    ${label(1010, 460, '… forward when the link opens', 14, 'middle')}
    ${label(760, 700, 'it waits out the outage instead of failing — the ordinary internet cannot', 18, 'middle', LINE)}
    ${label(760, 800, 'Bundle Protocol (RFC 9171); the architecture Vint Cerf helped design', 16, 'middle')}
  `),

  // What bandwidth cannot fix — the lightspeed floor.
  'the-lightspeed-floor': frame(`
    ${stars}
    ${label(80, 90, 'WHAT BANDWIDTH CANNOT FIX', 30, 'start', LINE)}
    ${label(80, 128, 'more bits per second, yes — but never less delay', 20)}
    ${dot(300, 470, 36, '#4a6a9a')} ${label(300, 540, 'EARTH', 15, 'middle')}
    <g stroke="${FAINT}" stroke-width="1.6" stroke-dasharray="8 8"><line x1="360" y1="470" x2="1220" y2="470"/></g>
    ${dot(1280, 470, 22, '#e08a6a')} ${label(1280, 540, 'MARS', 15, 'middle')}
    ${label(790, 435, '3–22 light-MINUTES each way — always', 17, 'middle', GOLD)}
    ${label(790, 640, 'a bigger pipe carries more of the story,', 16, 'middle')}
    ${label(790, 666, 'but the news still leaves minutes ago', 16, 'middle', GOLD)}
    ${label(790, 800, 'no bandwidth on Earth buys a real-time conversation with another planet', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'space-comm-arrays sketches');
