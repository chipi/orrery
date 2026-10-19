// Pack every string of the given locale × segment cells (segment rules = scripts/i18n-segment-sample.mjs)
// into review batches: [{rel, at, en, tr}], at most MAX per batch.
//   node pack-cells.mjs <outDir> <max> "ru|universe" "ja|UI strings — long" ...
import fs from 'node:fs';
import path from 'node:path';
const { SKIP_KEY } = await import(path.resolve('scripts/i18n-manifest.mjs'));
const [outDir, max, ...cells] = process.argv.slice(2);
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(d, e.name))
        : e.name.endsWith('.json')
          ? [path.join(d, e.name)]
          : [],
    );
const strings = (v, at, out) => {
  if (typeof v === 'string') out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}.${i}`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) strings(x, at ? `${at}.${k}` : k, out);
  return out;
};
const get = (o, at) => at.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function segmentOf(rel, at) {
  const top = rel.split(path.sep)[0].replace(/\.json$/, '');
  if (top === 'essays') return 'essays';
  if (top === 'programs') return 'programs';
  if (top === 'science') return 'science';
  if (top === 'missions')
    return /events\.\d+\.note/.test(at) ? 'mission event notes' : 'mission descriptions';
  if (top === 'fleet') return 'fleet';
  if (['planets', 'moon-sites', 'mars-sites', 'small-bodies', 'belts', 'sun'].includes(top))
    return 'planets';
  if (top === 'universe') return 'universe';
  return 'other';
}
fs.mkdirSync(outDir, { recursive: true });
for (const cell of cells) {
  const [loc, want] = cell.split('|');
  const rows = [];
  if (want.startsWith('UI strings')) {
    const m = JSON.parse(fs.readFileSync(`messages/${loc}.json`, 'utf8')),
      me = JSON.parse(fs.readFileSync('messages/en-US.json', 'utf8'));
    const long = want.includes('long');
    for (const [k, v] of Object.entries(m)) {
      if (typeof v !== 'string' || typeof me[k] !== 'string' || v.length < 4) continue;
      if (me[k].length > 40 === long) rows.push({ rel: 'messages', at: k, en: me[k], cur: v });
    }
  } else {
    const base = `i18n-src/${loc}`;
    for (const f of walk(base)) {
      const rel = path.relative(base, f);
      let j, en;
      try {
        j = JSON.parse(fs.readFileSync(f, 'utf8'));
        en = JSON.parse(fs.readFileSync(`i18n-src/en-US/${rel}`, 'utf8'));
      } catch {
        continue;
      }
      for (const [at, v] of strings(j, '', [])) {
        if (SKIP_KEY.test(at) || v.length < 20) continue;
        const e = get(en, at);
        if (typeof e !== 'string') continue;
        if (segmentOf(rel, at) === want) rows.push({ rel, at, en: e, cur: v });
      }
    }
  }
  const slug = `${loc}-${want.replace(/[^a-z]+/gi, '-').replace(/-+$/, '')}`.toLowerCase();
  for (let i = 0, b = 1; i < rows.length; i += +max, b++)
    fs.writeFileSync(
      `${outDir}/${slug}-${b}.json`,
      JSON.stringify(rows.slice(i, i + +max), null, 1),
    );
  console.log(slug, rows.length, 'strings ->', Math.ceil(rows.length / +max), 'batch(es)');
}
