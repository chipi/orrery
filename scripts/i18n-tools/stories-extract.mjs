// Compact English extraction of every site story: { id: { intro?, ch: { chapterId: { t?, s?, c: [captions] } } } }.
// t only for chapter ids without a UI-string title (hardware/launch/surface/science/people have one).
import fs from 'node:fs';
const D = 'static/data/site-stories';
const CANON = new Set(['hardware', 'launch', 'surface', 'science', 'people']);
const out = {};
let n = 0;
for (const f of fs.readdirSync(D).sort()) {
  if (f === 'index.json') continue;
  const s = JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'));
  if (!s) continue;
  const e = {};
  if (s.intro) {
    e.intro = s.intro;
    n++;
  }
  e.ch = {};
  for (const c of s.chapters) {
    const o = {};
    if (!CANON.has(c.id) && c.title) {
      o.t = c.title;
      n++;
    }
    if (c.subtitle) {
      o.s = c.subtitle;
      n++;
    }
    o.c = c.images.map((i) => i.caption);
    n += o.c.length;
    e.ch[c.id] = o;
  }
  out[f.replace(/\.json$/, '')] = e;
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, 'stories,', n, 'strings');
