import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const W = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const RATIOS = [
  { id: '1x1', w: 1, h: 1 },
  { id: '4x3', w: 4, h: 3 },
  { id: '16x9', w: 16, h: 9 },
];

const SPEC = JSON.parse(readFileSync('/tmp/spacecraft-images.json', 'utf8'));
const SOURCES = JSON.parse(readFileSync('static/data/fleet-image-sources.json', 'utf8'));
const GALLERIES = JSON.parse(readFileSync('static/data/fleet-galleries.json', 'utf8'));

let ok = 0,
  fail = 0;
for (const [spacecraft, items] of Object.entries(SPEC)) {
  const dir = `static/images/fleet-galleries/${spacecraft}`;
  mkdirSync(dir, { recursive: true });
  let saved = 0;
  for (let i = 0; i < items.length; i++) {
    const slot = String(i + 1).padStart(2, '0');
    const [agency, filename] = items[i];
    const url = `${W}/${filename}?width=1600`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const baseJpg = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
      writeFileSync(`${dir}/${slot}.jpg`, baseJpg);
      const meta = await sharp(baseJpg).metadata();
      const { width: W2, height: H } = meta;
      for (const r of RATIOS) {
        const target = r.w / r.h,
          src = W2 / H;
        let cw, ch;
        if (src > target) {
          ch = H;
          cw = Math.round(H * target);
        } else {
          cw = W2;
          ch = Math.round(W2 / target);
        }
        const left = Math.round((W2 - cw) / 2),
          top = Math.round((H - ch) / 2);
        const out = await sharp(baseJpg)
          .extract({ left, top, width: cw, height: ch })
          .jpeg({ quality: 85 })
          .toBuffer();
        writeFileSync(`${dir}/${slot}.${r.id}.jpg`, out);
      }
      SOURCES[`${spacecraft}/${slot}.jpg`] = { agency, sourceUrl: `${W}/${filename}` };
      saved++;
      ok++;
      // 250ms rate limit
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      console.error(`  ✗ ${spacecraft}/${slot}: ${e.message}`);
      fail++;
    }
  }
  GALLERIES[spacecraft] = saved;
  console.log(`✓ ${spacecraft}: ${saved} images`);
}
writeFileSync('static/data/fleet-image-sources.json', JSON.stringify(SOURCES, null, 2) + '\n');
const sortedGal = Object.fromEntries(Object.entries(GALLERIES).sort());
writeFileSync('static/data/fleet-galleries.json', JSON.stringify(sortedGal, null, 2) + '\n');
console.log(`\nDone — ${ok} images saved, ${fail} failed`);
