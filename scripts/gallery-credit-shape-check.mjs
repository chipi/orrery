// Gallery credit check: every mission gallery image credited to a Commons file must have the
// credited file's shape (aspect within 2 %, our width ≤ theirs). A mismatch means the credit names
// another picture (found 17 on 2026-11-07). Read-only; prints the mismatches.
//   node scripts/gallery-credit-shape-check.mjs
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const ROOT = '/work/orrery/worktrees/0.9.5/';
const UA = 'orrery-provenance-check/1.0 (https://github.com/chipi/orrery)';
const prov = JSON.parse(readFileSync(ROOT + 'static/data/image-provenance.json', 'utf8'));
const src = JSON.parse(readFileSync(ROOT + 'static/data/mission-image-sources.json', 'utf8'));
const entries = Array.isArray(prov) ? prov : (prov.entries ?? Object.values(prov));
const byPath = new Map(entries.map((e) => [e.path, e]));
const title = (t) => (t.startsWith('File:') ? t : `File:${t}`).replace(/_/g, ' ');

const rows = [];
for (const m of readdirSync(ROOT + 'static/images/missions')) {
  const dir = ROOT + 'static/images/missions/' + m;
  const slots = [
    ...new Set(
      readdirSync(dir)
        .map((f) => f.match(/^(\d\d)\./)?.[1])
        .filter(Boolean),
    ),
  ];
  for (const n of slots) {
    const k = `${m}/${n}`;
    const p = byPath.get(`/images/missions/${k}.webp`);
    if (!p || p.source_type !== 'wikimedia-commons' || !p.title?.startsWith('File:')) continue;
    const master = [`${ROOT}masters/missions/${k}.jpg`, `${ROOT}masters/missions/${k}.png`].find(
      existsSync,
    );
    const file = master ?? `${dir}/${n}.webp`;
    let md;
    try {
      md = await sharp(file).metadata();
    } catch {
      md = await sharp(`${dir}/${n}.webp`).metadata();
    }
    rows.push({
      k,
      credit: title(p.title),
      w: md.width,
      h: md.height,
      cand: src[k]?.commons_file ? title(src[k].commons_file) : null,
    });
  }
}
const want = [...new Set(rows.flatMap((r) => [r.credit, r.cand].filter(Boolean)))];
const dims = new Map();
for (let i = 0; i < want.length; i += 40) {
  const batch = want.slice(i, i + 40);
  const r = await fetch(
    'https://commons.wikimedia.org/w/api.php?' +
      new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'imageinfo',
        iiprop: 'size',
        titles: batch.join('|'),
      }),
    { headers: { 'User-Agent': UA } },
  );
  const j = await r.json();
  const back = new Map((j.query.normalized ?? []).map((x) => [x.to, x.from]));
  for (const pg of Object.values(j.query.pages)) {
    const ii = pg.imageinfo?.[0];
    const t = back.get(pg.title) ?? pg.title;
    dims.set(t, ii ? { w: ii.width, h: ii.height } : null);
  }
}
const fits = (r, d) => d && Math.abs(r.w / r.h - d.w / d.h) / (d.w / d.h) < 0.02 && r.w <= d.w + 2;
let ok = 0;
const bad = [];
for (const r of rows) {
  const d = dims.get(r.credit);
  if (fits(r, d)) {
    ok++;
    continue;
  }
  const c = r.cand && r.cand !== r.credit ? dims.get(r.cand) : null;
  bad.push(
    `${r.k.padEnd(26)} ours ${r.w}×${r.h} · credit ${d ? `${d.w}×${d.h}` : 'MISSING'} ${r.credit}\n${''.padEnd(26)} candidate ${r.cand ?? '-'} ${c ? `${c.w}×${c.h}${fits(r, c) ? ' ✓ FITS' : ''}` : ''}`,
  );
}
console.log(bad.join('\n'));
console.log(
  `${rows.length} Commons-credited gallery images · ${ok} fit their credit · ${bad.length} do not`,
);
writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify({ rows, dims: [...dims] }, null, 1));
