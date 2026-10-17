// Origin-language names in hotspot-metadata overlays (English lives in surface-hotspots.json,
// so the overlay converter skipped them). Same rules: whole words, ru vehicles in «», checked.
import fs from 'node:fs';
import { designations, knownNamesIn, problems } from '../lib/translate-quality.mjs';
import { ORIGIN_NAMES, nativeName } from '../lib/name-origins.mjs';
const R = 'i18n-src';
const side = JSON.parse(fs.readFileSync('static/data/surface-hotspots.json', 'utf8')).entries;
const QUOTED = new Set([
  'Soyuz',
  'Progress',
  'Vostok',
  'Voskhod',
  'Luna',
  'Lunokhod',
  'Mars',
  'Venera',
  'Proton',
  'Molniya',
  'Sputnik',
  'Zenit',
  'Salyut',
  'Mir',
  'Buran',
]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const base = (loc, n) =>
  Object.keys(ORIGIN_NAMES[loc])
    .sort((a, b) => b.length - a.length)
    .find((k) => n === k || (n.startsWith(k) && /^[ -]/.test(n.slice(k.length))));
let n = 0;
for (const loc of ['ru', 'zh-CN', 'ja', 'ko', 'hi']) {
  for (const [site, e] of Object.entries(side)) {
    const p = `${R}/${loc}/hotspot-metadata/${site}.json`;
    if (!fs.existsSync(p)) continue;
    const t = JSON.parse(fs.readFileSync(p, 'utf8'));
    const pairs = [];
    if (t.panorama_caption)
      pairs.push([
        'panorama_caption',
        e.panorama_metadata?.caption,
        (v) => (t.panorama_caption = v),
        t.panorama_caption,
      ]);
    for (const a of t.panorama_annotations ?? []) {
      const ea = e.panorama_annotations.find((x) => x.id === a.id);
      pairs.push(
        ['label', ea.label, (v) => (a.label = v), a.label],
        ['body', ea.body, (v) => (a.body = v), a.body],
      );
    }
    let dirty = false;
    for (const [field, en, set, tr] of pairs) {
      if (!en || !tr) continue;
      const serials = Object.keys(ORIGIN_NAMES[loc]).flatMap((k) =>
        [
          ...en.matchAll(
            new RegExp(`(?<![A-Za-z])${esc(k)}(?:[ -](?:[A-Z]{1,3}(?:-\\d+)?|\\d+[A-Za-z]?))`, 'g'),
          ),
        ].map((m) => m[0]),
      );
      const cands = [
        ...new Set([
          ...serials,
          ...designations(en),
          ...knownNamesIn(en),
          ...Object.keys(ORIGIN_NAMES[loc]).filter((k) =>
            new RegExp(`(^|[^A-Za-z])${esc(k)}(?![A-Za-z])`).test(en),
          ),
        ]),
      ]
        .filter((x) => nativeName(loc, x))
        .sort((a, b) => b.length - a.length);
      let out = tr;
      for (const c of cands) {
        const nat = nativeName(loc, c);
        out = out.replace(
          new RegExp(`(«)?(?<![A-Za-z0-9])${esc(c)}(?![A-Za-z0-9])(»)?`, 'g'),
          (m, q1, q2) =>
            q1 || q2
              ? `${q1 ?? ''}${nat}${q2 ?? ''}`
              : loc === 'ru' && field !== 'label' && QUOTED.has(base(loc, c))
                ? `«${nat}»`
                : nat,
        );
      }
      if (out === tr) continue;
      const added = problems(loc, en, out).filter((x) => !problems(loc, en, tr).includes(x));
      if (added.length) {
        console.log(`REFUSED ${loc} ${site} ${field}: ${added[0]}`);
        continue;
      }
      console.log(`${loc} ${site} ${field}\n   - ${tr.slice(0, 120)}\n   + ${out.slice(0, 120)}`);
      set(out);
      dirty = true;
      n++;
    }
    if (dirty && process.argv.includes('--write'))
      fs.writeFileSync(p, JSON.stringify(t, null, 2) + '\n');
  }
}
console.log(`${n} strings`);
