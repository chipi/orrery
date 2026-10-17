// Write i18n-src/<loc>/site-stories/<id>.json overlays from hand-written specs shaped like
// stories-en.json ({ id: { intro, ch: { chapterId: { s, c: [captions in base order] } } } }).
// Captions are matched to images by order in the base story; every string is checked with
// problems() against its English twin. Several spec files can be passed (halves of one locale).
import fs from 'node:fs';
import { problems } from '../lib/translate-quality.mjs';
const D = 'static/data/site-stories';
const R = 'i18n-src';
const [loc, ...srcs] = process.argv.slice(2);
const spec = Object.assign({}, ...srcs.map((p) => JSON.parse(fs.readFileSync(p, 'utf8'))));
const errs = [];
const chk = (where, en, tr) => {
  if (typeof tr !== 'string' || !tr.trim()) return errs.push(`${where}: missing`);
  for (const p of problems(loc, en, tr)) errs.push(`${where}: ${p.slice(0, 130)}`);
};
const writes = [];
for (const [id, t] of Object.entries(spec)) {
  const base = JSON.parse(fs.readFileSync(`${D}/${id}.json`, 'utf8'));
  if (!base) {
    errs.push(`${id}: no base story`);
    continue;
  }
  const ov = {};
  if (base.intro) {
    chk(`${id}.intro`, base.intro, t.intro);
    ov.intro = t.intro;
  }
  ov.chapters = base.chapters.map((c) => {
    const tc = t.ch?.[c.id];
    if (!tc) {
      errs.push(`${id}.${c.id}: chapter missing`);
      return { id: c.id };
    }
    const o = { id: c.id };
    if (c.subtitle) {
      chk(`${id}.${c.id}.s`, c.subtitle, tc.s);
      o.subtitle = tc.s;
    }
    if ((tc.c?.length ?? 0) !== c.images.length)
      errs.push(`${id}.${c.id}: ${tc.c?.length} captions vs ${c.images.length}`);
    o.images = c.images.map((img, i) => {
      chk(`${id}.${c.id}.c${i}`, img.caption, tc.c?.[i]);
      return { src: img.src, caption: tc.c?.[i] };
    });
    return o;
  });
  writes.push([`${R}/${loc}/site-stories/${id}.json`, ov]);
}
if (errs.length) {
  console.log(`✗ ${loc}\n  ${errs.join('\n  ')}`);
  process.exit(1);
}
fs.mkdirSync(`${R}/${loc}/site-stories`, { recursive: true });
for (const [p, ov] of writes) fs.writeFileSync(p, JSON.stringify(ov, null, 2) + '\n');
console.log(`✓ ${loc}: ${writes.length} stories`);
