import fs from 'node:fs';
import sharp from 'sharp';
// node sheet-pick.mjs <regex> <out.png> [cols] [cellW] [cellH] — frames of SHOT_DIR whose file name matches <regex>.
const DIR = process.env.SHOT_DIR ?? 'test-results/shots';
const [rx, out, colsArg, wArg, hArg] = process.argv.slice(2);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png') && !f.startsWith('sheet') && !f.startsWith('view') && new RegExp(rx).test(f)).sort();
const cols = Number(colsArg ?? 4), W = Number(wArg ?? 480), H = Number(hArg ?? 300), L = 20;
const comp = [];
for (const [i, f] of files.entries()) {
  const x = (i % cols) * (W + 6), y = Math.floor(i / cols) * (H + L + 6);
  comp.push({ input: Buffer.from(`<svg width="${W}" height="${L}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="14" font-size="12" fill="#ff0" font-family="sans-serif">${f.replace('.png', '')}</text></svg>`), left: x, top: y });
  comp.push({ input: await sharp(`${DIR}/${f}`).resize(W, H, { fit: 'contain', background: '#333' }).toBuffer(), left: x, top: y + L });
}
const rows = Math.ceil(files.length / cols);
await sharp({ create: { width: cols * (W + 6), height: rows * (H + L + 6), channels: 3, background: '#333' } }).composite(comp).png().toFile(`${DIR}/${out}`);
console.log(out, files.length);
