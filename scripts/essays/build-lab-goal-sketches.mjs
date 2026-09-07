/**
 * Geometry reference sketches for the 12 geometry-bearing Lab goal
 * illustrations (G · #536). NOT shipped assets — these are Higgsfield
 * composition references (docs/wip/2026-09-07-lab-goal-illustration-prompts.md):
 * the art is text-free, so unlike the /science diagrams these carry NO labels;
 * their one job is CORRECT GEOMETRY (ellipse tangency, the free-return
 * figure-eight, phase arcs) that freestyle generation reliably gets wrong.
 *
 * Run: node scripts/essays/build-lab-goal-sketches.mjs
 * Out: docs/wip/essay-diagram-sources/lab-goals/<goal-id>.{svg,png}
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'lab-goals');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18',
  LINE = '#7fb0e0',
  ACC = '#cfe3fb',
  WHITE = '#ffffff',
  GOLD = '#ffd27f';
const W = 1600,
  H = 900;

const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/>${inner}</svg>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const circle = (x, y, r, col = LINE, w = 2.5, dash = '') =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const ellipse = (cx, cy, rx, ry, col = LINE, w = 2.5, rot = 0, dash = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${col}" stroke-width="${w}" transform="rotate(${rot} ${cx} ${cy})"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const pathEl = (d, col = LINE, w = 2.5, dash = '') =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const body = (x, y, r, col = LINE) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" fill-opacity="0.25" stroke="${col}" stroke-width="2.5"/>`;

const sketches = {
  // Ascent arc bending from vertical into a closed orbit (gravity turn).
  'reach-orbit': () => {
    const ex = 500,
      ey = 620,
      er = 210;
    return (
      body(ex, ey, er) +
      // Gravity-turn ascent: vertical off the pad, easing to horizontal and
      // ENDING ON the orbit, tangent at the top (holistic MINOR-1 — the
      // insertion point must sit on the circle, not float beyond it).
      pathEl(
        `M ${ex - 40} ${ey - er} C ${ex - 60} ${ey - er - 140}, ${ex - 220} ${ey - er - 230}, ${ex} ${ey - er - 250}`,
        GOLD,
        4,
      ) +
      // The achieved circular orbit.
      circle(ex, ey, er + 250, LINE, 3) +
      dot(ex, ey - er - 250, 9, GOLD)
    );
  },
  // Sun-centred Hohmann: two circular orbits + the TANGENT transfer ellipse.
  'get-to-mars': () => {
    const sx = 800,
      sy = 450,
      r1 = 180,
      r2 = 360;
    const a = (r1 + r2) / 2; // semi-major axis; ellipse centre offset from Sun
    const c = a - r1;
    return (
      dot(sx, sy, 26, GOLD) +
      circle(sx, sy, r1, LINE, 2.5) +
      circle(sx, sy, r2, LINE, 2.5) +
      // Transfer ellipse: perihelion tangent to r1 (right), aphelion tangent to r2 (left).
      ellipse(sx - c, sy, a, Math.sqrt(a * a - c * c), GOLD, 3.5, 0, '') +
      dot(sx + r1, sy, 9, WHITE) +
      dot(sx - r2, sy, 9, WHITE)
    );
  },
  // One frame, whole journey: launch arc → parking orbit → transfer → arrival orbit.
  'plan-a-mission': () => {
    const ex = 380,
      ey = 640,
      mr = 120;
    return (
      body(ex, ey, mr) +
      pathEl(
        `M ${ex - 20} ${ey - mr} C ${ex - 30} ${ey - mr - 90}, ${ex + 90} ${ey - mr - 130}, ${ex + 190} ${ey - mr - 120}`,
        GOLD,
        3.5,
      ) +
      circle(ex, ey, mr + 130, LINE, 2.5) +
      pathEl(
        `M ${ex + mr + 130} ${ey} C ${ex + 480} ${ey - 260}, ${ex + 720} ${ey - 300}, ${ex + 920} ${ey - 180}`,
        GOLD,
        3.5,
        '',
      ) +
      body(ex + 940, ey - 160, 70) +
      circle(ex + 940, ey - 160, 120, LINE, 2.5)
    );
  },
  // The Apollo free-return figure-eight around Earth and Moon.
  'apollo-round-trip': () => {
    const ex = 480,
      ey = 460,
      mx = 1180,
      my = 420;
    return (
      body(ex, ey, 150) +
      body(mx, my, 60) +
      // Figure-eight: out above, loop behind the Moon, back beneath.
      pathEl(
        `M ${ex + 60} ${ey - 160} C ${ex + 380} ${ey - 320}, ${mx - 260} ${my - 260}, ${mx + 40} ${my - 140} C ${mx + 220} ${my - 60}, ${mx + 220} ${my + 60}, ${mx + 40} ${my + 130} C ${mx - 260} ${my + 240}, ${ex + 380} ${ey + 300}, ${ex + 60} ${ey + 160}`,
        GOLD,
        4,
      )
    );
  },
  // Translunar transfer: Earth, Moon on its orbit, the long transfer ellipse.
  'reach-the-moon': () => {
    const ex = 430,
      ey = 520,
      mx = 1240,
      my = 330;
    return (
      body(ex, ey, 170) +
      circle(ex, ey, Math.hypot(mx - ex, my - ey), LINE, 2, '10 10') +
      body(mx, my, 55) +
      pathEl(
        `M ${ex + 130} ${ey - 110} C ${ex + 420} ${ey - 300}, ${mx - 320} ${my + 40}, ${mx - 70} ${my + 20}`,
        GOLD,
        4,
      )
    );
  },
  // Hyperbolic escape leaving nested planet orbits; Sun shrunk small.
  'leave-the-solar-system': () => {
    const sx = 430,
      sy = 560;
    return (
      dot(sx, sy, 16, GOLD) +
      [110, 190, 290, 420].map((r) => circle(sx, sy, r, LINE, 2)).join('') +
      // Hyperbolic path unbending to a straight asymptote.
      pathEl(
        `M ${sx + 90} ${sy + 60} C ${sx + 260} ${sy - 60}, ${sx + 420} ${sy - 220}, ${sx + 1050} ${sy - 430}`,
        GOLD,
        4,
      ) +
      dot(sx + 1050, sy - 430, 8, WHITE)
    );
  },
  // The lunar phase arc: crescent → full across the frame.
  'moon-phases': () => {
    const y = 420,
      r = 78;
    const phases = [0.05, 0.25, 0.5, 0.75, 0.95];
    return phases
      .map((f, i) => {
        const x = 240 + i * 280;
        const sweep = (f - 0.5) * 2 * r;
        return (
          circle(x, y, r, LINE, 2.5) +
          `<path d="M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r} A ${Math.abs(sweep)} ${r} 0 0 ${sweep > 0 ? 1 : 0} ${x} ${y - r} Z" fill="${ACC}" fill-opacity="0.85"/>`
        );
      })
      .join('');
  },
  // Nested orbit family, one highlighted: LEO / MEO / GEO / a tilted ellipse.
  'choose-an-orbit': () => {
    const ex = 800,
      ey = 460,
      er = 130;
    return (
      body(ex, ey, er) +
      circle(ex, ey, er + 60, LINE, 2.5) +
      circle(ex, ey, er + 150, LINE, 2.5) +
      circle(ex, ey, er + 260, GOLD, 3.5) +
      ellipse(ex + 110, ey, er + 320, er + 90, LINE, 2.5, -25, '8 8')
    );
  },
  // Rendezvous: target orbit + a lower, faster phasing orbit closing on it.
  'catch-the-iss': () => {
    const ex = 800,
      ey = 480,
      er = 150;
    return (
      body(ex, ey, er) +
      circle(ex, ey, er + 180, LINE, 3) +
      dot(ex, ey - er - 180, 11, WHITE) +
      ellipse(ex - 30, ey, er + 130, er + 100, GOLD, 3, 0, '') +
      dot(ex + er + 100, ey - 60, 9, GOLD)
    );
  },
  // Ascent guidance: the flown arc plus the steered correction vector.
  'flying-computer': () => {
    const ex = 420,
      ey = 700;
    return (
      pathEl(
        `M ${ex} ${ey} C ${ex + 30} ${ey - 260}, ${ex + 330} ${ey - 420}, ${ex + 800} ${ey - 470}`,
        LINE,
        3,
      ) +
      pathEl(
        `M ${ex + 500} ${ey - 445} C ${ex + 700} ${ey - 470}, ${ex + 900} ${ey - 480}, ${ex + 1080} ${ey - 470}`,
        GOLD,
        3.5,
        '12 8',
      ) +
      dot(ex + 500, ey - 445, 10, WHITE)
    );
  },
  // Landing guidance: descent-rate curve easing to zero at the surface.
  'landing-computer': () => {
    const gy = 700;
    return (
      pathEl(`M 200 ${gy} L 1400 ${gy}`, LINE, 2.5) +
      pathEl(`M 320 180 C 500 420, 760 590, 1150 ${gy - 6}`, GOLD, 4) +
      dot(1150, gy - 6, 10, WHITE) +
      dot(320, 180, 9, WHITE)
    );
  },
  // Entry steering: the corridor narrowing to a landing target.
  'entry-computer': () => {
    return (
      pathEl(`M 220 220 C 560 300, 900 430, 1280 640`, LINE, 3) +
      pathEl(`M 220 360 C 560 430, 900 520, 1280 660`, LINE, 3) +
      pathEl(`M 260 290 C 620 370, 940 480, 1270 650`, GOLD, 4, '') +
      dot(1278, 651, 11, GOLD)
    );
  },
};

for (const [id, make] of Object.entries(sketches)) {
  const svg = frame(make());
  const svgPath = path.join(OUT, `${id}.svg`);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg))
    .resize(2048)
    .png()
    .toFile(path.join(OUT, `${id}.png`));
  console.log(`✓ ${id}`);
}
console.log(`\n${Object.keys(sketches).length} geometry sketches → ${OUT}`);
