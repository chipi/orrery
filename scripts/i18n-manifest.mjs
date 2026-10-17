/**
 * Build a manifest for scripts/retranslate-fields.mjs: every translatable string
 * path in the given overlay files (or every file under the given subtrees) for one
 * locale. Paths whose key is an identifier/URL/credit are skipped, as are strings
 * that are not strings in en-US.
 *
 *   node scripts/i18n-manifest.mjs --loc=sr-Cyrl --files=essays/comms,missions/moon/apollo12 > m.json
 *   node scripts/i18n-manifest.mjs --loc=sr-Cyrl --trees=essays,programs,science > m.json
 *   node scripts/i18n-manifest.mjs --loc=sr-Cyrl --trees=missions --match='events\.\d+\.note' > m.json
 *   node scripts/i18n-manifest.mjs --from-hits=hits.json [--locales=de,fr] [--kinds=truncated] > m.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
export const SKIP_KEY =
  /(^|\.)(u|url|href|src|image|id|slug|credit|credits|license|source|sources|wiki|file|links|code|met|type|kind|align|layout|variant|icon|color|alt_source|section|date|iso|year)(\.|$)/i;

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}
function strings(v, at, out) {
  if (typeof v === 'string') out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}.${i}`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) strings(x, at ? `${at}.${k}` : k, out);
  return out;
}
const get = (o, at) => at.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

export function manifestFor(loc, relFiles, match) {
  const out = [];
  for (const rel of relFiles) {
    const en = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'i18n-src', 'en-US', `${rel}.json`), 'utf8'),
    );
    const tgt = path.join(ROOT, 'i18n-src', loc, `${rel}.json`);
    if (!fs.existsSync(tgt)) continue;
    const paths = strings(en, '', [])
      .filter(([at, s]) => !SKIP_KEY.test(at) && /\p{L}{2}/u.test(s) && (!match || match.test(at)))
      .filter(([at]) => get(JSON.parse(fs.readFileSync(tgt, 'utf8')), at) !== undefined)
      .map(([at]) => at);
    if (paths.length) out.push({ loc, file: rel, paths });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=')];
    }),
  );
  if (args['from-hits']) {
    // i18n-detect.mjs --out=hits.json → one manifest entry per (locale, file);
    // --locales / --kinds narrow it.
    const hits = JSON.parse(fs.readFileSync(args['from-hits'], 'utf8'));
    const locs = args.locales ? new Set(args.locales.split(',')) : null;
    const kinds = args.kinds ? new Set(args.kinds.split(',')) : null;
    const byFile = new Map();
    for (const [loc, perKind] of Object.entries(hits)) {
      if (locs && !locs.has(loc)) continue;
      for (const [kind, list] of Object.entries(perKind)) {
        if (kinds && !kinds.has(kind)) continue;
        for (const h of list) {
          const [file, at] = h.split(' :: ');
          if (file !== 'messages' && SKIP_KEY.test(at)) continue;
          const k = `${loc}\u0000${file}`;
          if (!byFile.has(k)) byFile.set(k, new Set());
          byFile.get(k).add(at);
        }
      }
    }
    const m = [...byFile].map(([k, paths]) => {
      const [loc, file] = k.split('\u0000');
      return { loc, file, paths: [...paths] };
    });
    process.stdout.write(JSON.stringify(m, null, 1) + '\n');
    console.error(`${m.length} files, ${m.reduce((a, x) => a + x.paths.length, 0)} fields`);
    process.exit(0);
  }
  const enRoot = path.join(ROOT, 'i18n-src', 'en-US');
  let files = args.files ? args.files.split(',') : [];
  if (args.trees)
    for (const t of args.trees.split(','))
      files.push(
        ...walk(path.join(enRoot, t)).map((p) => path.relative(enRoot, p).replace(/\.json$/, '')),
      );
  const m = manifestFor(args.loc, files, args.match ? new RegExp(args.match) : null);
  process.stdout.write(JSON.stringify(m, null, 1) + '\n');
  console.error(`${m.length} files, ${m.reduce((a, x) => a + x.paths.length, 0)} fields`);
}
