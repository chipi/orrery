import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const W = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const RATIOS = [
  { id: '1x1', w: 1, h: 1 },
  { id: '4x3', w: 4, h: 3 },
  { id: '16x9', w: 16, h: 9 },
];

const SPEC = JSON.parse(readFileSync('/tmp/phase3c-images.json', 'utf8'));
const SOURCES = JSON.parse(readFileSync('static/data/fleet-image-sources.json', 'utf8'));
const GALLERIES = JSON.parse(readFileSync('static/data/fleet-galleries.json', 'utf8'));

let ok = 0,
  fail = 0,
  skipped = 0;

for (const [entry, items] of Object.entries(SPEC)) {
  const dir = `static/images/fleet-galleries/${entry}`;
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < items.length; i++) {
    const slot = String(i + 1).padStart(2, '0');
    const dest = `${dir}/${slot}.jpg`;
    if (existsSync(dest)) {
      skipped++;
      continue;
    }
    const [agency, filename] = items[i];
    const url = `${W}/${encodeURIComponent(filename)}?width=1600`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const baseJpg = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
      writeFileSync(dest, baseJpg);
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
      SOURCES[`${entry}/${slot}.jpg`] = {
        agency,
        sourceUrl: `${W}/${encodeURIComponent(filename)}`,
      };
      ok++;
      // 1.5s rate-limit (Wikimedia is generous on smaller batches but 429s on aggressive bursts)
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`  ✗ ${entry}/${slot}: ${e.message}`);
      fail++;
    }
  }
  // Update gallery count to actual on-disk
  let actual = 0;
  for (let i = 1; i <= 5; i++) {
    if (existsSync(`${dir}/${String(i).padStart(2, '0')}.jpg`)) actual = i;
  }
  GALLERIES[entry] = actual;
  console.log(`✓ ${entry}: ${actual} images on disk`);
}

writeFileSync('static/data/fleet-image-sources.json', JSON.stringify(SOURCES, null, 2) + '\n');
const sortedGal = Object.fromEntries(Object.entries(GALLERIES).sort());
writeFileSync('static/data/fleet-galleries.json', JSON.stringify(sortedGal, null, 2) + '\n');
console.log(`\nPhase 3c images: ${ok} saved, ${skipped} skipped, ${fail} failed`);
