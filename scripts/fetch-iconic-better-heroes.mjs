#!/usr/bin/env node
// Replace the slot-01 hero image for 5 iconic missions on /explore
// per Marko's call-out: vega-1, vega-2, pioneer-11, venera-13, giotto.
// Mirrors the Tier-D image fetch shape: base + 1x1/4x3/16x9 variants.
//
// Source data in /tmp/iconic-better-heroes.json — { id: [credit, filename] }.
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const W = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const RATIOS = [
  { id: '1x1', w: 1, h: 1 },
  { id: '4x3', w: 4, h: 3 },
  { id: '16x9', w: 16, h: 9 },
];

const SPEC = JSON.parse(readFileSync('/tmp/iconic-better-heroes.json', 'utf8'));
const SOURCES = JSON.parse(readFileSync('static/data/fleet-image-sources.json', 'utf8'));

let ok = 0,
  fail = 0;
for (const [entry, item] of Object.entries(SPEC)) {
  const dir = `static/images/fleet-galleries/${entry}`;
  mkdirSync(dir, { recursive: true });
  const slot = '01';
  const dest = `${dir}/${slot}.jpg`;
  // Force-overwrite: remove existing variants so sharp doesn't blend.
  for (const v of ['', ...RATIOS.map((r) => '-' + r.id)]) {
    const p = `${dir}/${slot}${v}.jpg`;
    if (existsSync(p)) unlinkSync(p);
  }
  const [agency, filename] = item;
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
      const left = Math.round((W2 - cw) / 2);
      const top = Math.round((H - ch) / 2);
      await sharp(baseJpg)
        .extract({ left, top, width: cw, height: ch })
        .jpeg({ quality: 90 })
        .toFile(`${dir}/${slot}-${r.id}.jpg`);
    }
    const key = `${entry}/${slot}`;
    SOURCES[key] = {
      commons_file: filename,
      commons_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
      credit: agency,
      license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
      fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
    };
    ok++;
    console.log(`✓ ${key} ← ${filename} (${agency})`);
    await new Promise((r) => setTimeout(r, 1500));
  } catch (e) {
    fail++;
    console.log(`✗ ${entry}: ${e.message}`);
  }
}
writeFileSync('static/data/fleet-image-sources.json', JSON.stringify(SOURCES, null, 2) + '\n');
console.log(`\nresult: ${ok} replaced, ${fail} failed`);
