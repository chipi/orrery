/**
 * Schematic diagrams for the 2 new /science re-entry articles.
 * House style: docs/guides/diagram-art-style.md (deterministic in-palette sketch).
 * Run: node scripts/essays/build-reentry-science-sketches.mjs
 * Outputs BOTH the source .svg and the shipped .webp to static/diagrams/science/
 * (schematic quality — the polished Higgsfield pass is a later follow-up).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'static', 'diagrams', 'science');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18',
  LINE = '#7fb0e0',
  ACC = '#cfe3fb',
  WHITE = '#ffffff',
  GOLD = '#ffd27f',
  WARN = '#e08a6a';
const W = 1600,
  H = 900;

const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${esc(t)}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const arrow = (x1, y1, x2, y2, col = LINE, w = 2.5) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a = 14;
  const bx = x2 - a * Math.cos(ang - 0.4),
    by = y2 - a * Math.sin(ang - 0.4);
  const cx = x2 - a * Math.cos(ang + 0.4),
    cy = y2 - a * Math.sin(ang + 0.4);
  return `<g stroke="${col}" stroke-width="${w}" fill="${col}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon points="${x2},${y2} ${bx.toFixed(0)},${by.toFixed(0)} ${cx.toFixed(0)},${cy.toFixed(0)}"/></g>`;
};
const stars = (() => {
  let s = '',
    seed = 613;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 70; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.2 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  'deorbit-corridor': frame(`
    ${stars}
    ${label(80, 88, 'DEORBIT & THE RE-ENTRY CORRIDOR', 28, 'start', LINE)}
    ${label(80, 124, 'a retrograde burn drops perigee into the air — then the entry angle decides everything', 18)}
    <!-- Earth limb bottom-right -->
    <path d="M -100 1050 A 1300 1300 0 0 1 1750 780" fill="rgba(127,176,224,0.06)" stroke="${LINE}" stroke-width="2.2"/>
    ${label(1300, 860, 'EARTH', 18, 'middle', LINE)}
    <!-- entry interface line -->
    <path d="M 250 560 A 1500 1500 0 0 1 1520 470" fill="none" stroke="${ACC}" stroke-width="1.2" stroke-dasharray="7 8" opacity="0.7"/>
    ${label(300, 545, 'ENTRY INTERFACE  ~122 km', 15, 'start', ACC)}
    <!-- orbit + capsule + retro burn -->
    <path d="M 180 300 A 900 900 0 0 1 900 210" fill="none" stroke="${LINE}" stroke-width="1.6" opacity="0.8"/>
    ${dot(360, 262, 9, WHITE)} ${label(360, 240, 'capsule in orbit', 14, 'middle')}
    ${arrow(360, 262, 250, 285, GOLD, 3)}
    ${label(230, 320, 'retrograde burn  ~100 m/s', 14, 'start', GOLD)}
    <!-- three trajectories from a shared entry point -->
    <!-- shallow / skip-out -->
    <path d="M 560 505 Q 820 470 1120 300" fill="none" stroke="${WARN}" stroke-width="2.6" stroke-dasharray="10 7"/>
    ${arrow(1060, 340, 1130, 292, WARN, 2.6)}
    ${label(1140, 300, 'TOO SHALLOW → skips back to space', 16, 'start', WARN)}
    <!-- safe corridor -->
    <path d="M 560 505 Q 840 620 1030 815" fill="none" stroke="${GOLD}" stroke-width="3.4"/>
    ${label(1050, 800, 'SURVIVABLE CORRIDOR', 17, 'start', GOLD)}
    ${label(1050, 826, 'steep enough not to skip,', 14, 'start')}
    ${label(1050, 848, 'shallow enough to survive', 14, 'start')}
    <!-- steep / burn-up -->
    <path d="M 560 505 Q 640 640 700 830" fill="none" stroke="${WARN}" stroke-width="2.6"/>
    ${label(560, 700, 'TOO STEEP', 16, 'end', WARN)}
    ${label(560, 724, 'peak-g & heating', 13, 'end', WARN)}
    ${label(560, 744, 'exceed limits', 13, 'end', WARN)}
    ${dot(560, 505, 8, WHITE)}
    <!-- FPA callout -->
    <path d="M 560 505 l 150 22" stroke="${ACC}" stroke-width="1.2" opacity="0.6"/>
    ${label(600, 560, 'entry flight-path angle γ', 15, 'start', ACC)}
    ${label(600, 582, 'corridor < 2° wide for lunar return', 13, 'start')}
    ${label(800, 878, 'LEO ballistic entry ≈ 8 g   ·   Apollo lifting entry ≈ 6–7 g', 16, 'middle', LINE)}
  `),

  'comms-blackout': frame(`
    ${stars}
    ${label(80, 88, 'COMMUNICATIONS BLACKOUT', 28, 'start', LINE)}
    ${label(80, 124, 'the plasma sheath at peak heating turns the capsule into a mirror radio cannot cross', 18)}
    <!-- capsule + heat shield (shield faces down into the flow) -->
    <g transform="translate(740,395)">
      <path d="M -58 -66 L 58 -66 L 40 0 L -40 0 Z" fill="rgba(207,227,251,0.16)" stroke="${ACC}" stroke-width="2.4"/>
      <path d="M -40 0 Q 0 54 40 0 Z" fill="rgba(255,210,127,0.20)" stroke="${GOLD}" stroke-width="2.6"/>
      ${label(0, -86, 'capsule', 14, 'middle')}
    </g>
    <!-- plasma sheath arcs hugging the shield, glowing ahead of it -->
    <g fill="none" stroke="${GOLD}" opacity="0.9">
      <path d="M 660 452 Q 740 520 820 452" stroke-width="3.4"/>
      <path d="M 636 448 Q 740 552 844 448" stroke-width="2.2" opacity="0.6"/>
      <path d="M 612 444 Q 740 588 868 444" stroke-width="1.6" opacity="0.4"/>
    </g>
    ${label(740, 636, 'PLASMA SHEATH — ionised air, thousands of °C', 16, 'middle', GOLD)}
    ${label(740, 660, 'free electrons reflect & absorb radio below the plasma frequency', 13, 'middle')}
    <!-- blocked downlink: leaves shield, hits sheath, is reflected back -->
    ${arrow(716, 452, 486, 690, WARN, 2.6)}
    <g stroke="${WARN}" stroke-width="3"><line x1="600" y1="590" x2="636" y2="554"/><line x1="600" y1="554" x2="636" y2="590"/></g>
    ${label(470, 712, 'downlink BLOCKED', 15, 'end', WARN)}
    <!-- ground station + blocked uplink bouncing off the sheath -->
    <path d="M 350 762 l 44 -32 l 44 32 z" fill="none" stroke="${LINE}" stroke-width="2"/>
    ${label(394, 792, 'GROUND STATION', 14, 'middle', LINE)}
    ${arrow(430, 690, 648, 470, LINE, 1.8)}
    <path d="M 648 470 l 70 -30" stroke="${WARN}" stroke-width="2.4" stroke-dasharray="6 5"/>
    ${label(548, 452, 'uplink reflected', 13, 'middle', WARN)}
    <!-- TDRS relay over the top (Shuttle mitigation) -->
    ${dot(1200, 196, 8, WHITE)} ${label(1200, 172, 'relay satellite (TDRS)', 14, 'middle')}
    ${arrow(778, 348, 1178, 206, GOLD, 2.4)}
    ${label(1010, 300, 'link UP through thinner', 14, 'middle', GOLD)}
    ${label(1010, 322, 'plasma over the top', 14, 'middle', GOLD)}
    ${label(1340, 470, 'BLACKOUT', 20, 'middle', WARN)}
    ${label(1340, 500, '~90 km → ~40 km', 15, 'middle')}
    ${label(1340, 524, '3–4 minutes', 15, 'middle')}
    ${label(1340, 548, 'at peak heating', 13, 'middle')}
    ${label(800, 878, 'ends when the capsule slows into cooler air and the electron cloud thins', 16, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg))
    .resize(1600)
    .webp({ quality: 88 })
    .toFile(path.join(OUT, `${slug}.webp`));
  console.log(`✓ ${slug} → svg + webp`);
}
console.log('done:', Object.keys(diagrams).length, 're-entry science diagrams');
