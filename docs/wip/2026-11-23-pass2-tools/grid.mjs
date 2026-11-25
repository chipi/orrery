import fs from 'node:fs';
import sharp from 'sharp';
// node docs/wip/2026-11-23-pass2-tools/grid.mjs <prefix> <out.png> [cols] — desktop-frame grid of
// the shots with that prefix, ordered by their time label (T327, f0.5, -6 …), not by name.
const DIR = process.env.SHOT_DIR ?? 'test-results/shots';
const [prefix, out, colsArg] = process.argv.slice(2);
const key = (f) => {
  const m = f.replace(/\.png$/, '').match(/-(T|f|L|C)?(-?[\d.]+)$/);
  return m ? Number(m[2]) + (m[1] === 'f' ? 0 : 0) : 0;
};
const files = fs
  .readdirSync(DIR)
  .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith('.png'))
  .sort((a, b) => key(a) - key(b));
const cols = Number(colsArg ?? 3);
const [W, H] = (process.env.GRID_TILE ?? '640x400').split('x').map(Number);
const L = 18;
const comp = [];
for (const [i, f] of files.entries()) {
  const x = (i % cols) * W;
  const y = Math.floor(i / cols) * (H + L);
  comp.push({
    input: Buffer.from(
      `<svg width="${W}" height="${L}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="13" font-size="13" fill="#ff0" font-family="sans-serif">${f.replace('.png', '')}</text></svg>`,
    ),
    left: x,
    top: y,
  });
  comp.push({ input: await sharp(`${DIR}/${f}`).resize(W, H, { fit: 'contain', background: '#333' }).toBuffer(), left: x, top: y + L });
}
await sharp({
  create: { width: cols * W, height: Math.ceil(files.length / cols) * (H + L), channels: 3, background: '#222' },
})
  .composite(comp)
  .png()
  .toFile(`${DIR}/${out}`);
console.log(out, files.length);
