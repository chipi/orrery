// Step 0: in each origin locale, replace the English (Latin) form of names from that origin
// with the native form. Candidates come from the English twin (designations + gazetteer +
// table bases); replaced only as whole words; ru vehicle names in running text get «» quotes
// (standard Russian style, and quoted names do not decline). Fleet `name` overrides are added
// for entries whose base name has a native form. Dry run unless --write.
import fs from 'node:fs';
import path from 'node:path';
import { designations, knownNamesIn, problems } from '../lib/translate-quality.mjs';
import { ORIGIN_NAMES, nativeName } from '../lib/name-origins.mjs';
const ROOT = process.cwd();
const R = `${ROOT}/i18n-src`;
const WRITE = process.argv.includes('--write');
const LOCS = ['ru', 'zh-CN', 'ja', 'ko', 'hi'];
const QUOTED = new Set([
  'Soyuz',
  'Progress',
  'Vostok',
  'Voskhod',
  'Luna',
  'Lunokhod',
  'Mars',
  'Venera',
  'Vega',
  'Phobos',
  'Salyut',
  'Mir',
  'Buran',
  'Energia',
  'Proton',
  'Molniya',
  'Sputnik',
  'Zenit',
  'Angara',
  'Fregat',
  'Almaz',
  'Kosmos',
  'Zarya',
  'Zvezda',
  'Nauka',
  'Poisk',
  'Rassvet',
  'Prichal',
  'Pirs',
  'Kvant',
  'Kristall',
  'Priroda',
  'Spektr',
  'Spektr-RG',
  'Sokol',
  'Orlan',
  'Krechet',
]);
const HEADING = /(^|\.)(name|short_name|short|title|label|site_name|tagline|mission_type)$/;
const walk = (d, o = []) => {
  if (!fs.existsSync(d)) return o;
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p, o);
    else if (n.endsWith('.json')) o.push(p);
  }
  return o;
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const baseOf = (loc, n) =>
  Object.keys(ORIGIN_NAMES[loc])
    .sort((a, b) => b.length - a.length)
    .find((k) => n === k || (n.startsWith(k) && /^[ -]/.test(n.slice(k.length))));

function candidates(loc, en) {
  const set = new Set([...designations(en), ...knownNamesIn(en)]);
  for (const k of Object.keys(ORIGIN_NAMES[loc]))
    if (new RegExp(`(^|[^A-Za-z])${esc(k)}(?![A-Za-z])`).test(en)) set.add(k);
  // Serial forms present in the English ("Luna 9", "Soyuz MS-24") even if not in the gazetteer.
  for (const k of Object.keys(ORIGIN_NAMES[loc]))
    for (const m of en.matchAll(
      new RegExp(`(?<![A-Za-z])${esc(k)}(?:[ -](?:[A-Z]{1,3}(?:-\\d+)?|\\d+[A-Za-z]?))`, 'g'),
    ))
      set.add(m[0]);
  return [...set].filter((n) => nativeName(loc, n)).sort((a, b) => b.length - a.length);
}

function convert(loc, en, tr, at) {
  let out = tr;
  const heading = HEADING.test(at);
  const caps = /^[^a-z]+$/.test(tr) && /[A-Z]{3}/.test(tr);
  for (const n of candidates(loc, en)) {
    let nat = nativeName(loc, n);
    const base = baseOf(loc, n);
    const needle = caps ? n.toUpperCase() : n;
    if (caps) nat = nat.toUpperCase();
    const re = new RegExp(`(«)?(?<![A-Za-z0-9])${esc(needle)}(?![A-Za-z0-9])(»)?`, 'g');
    out = out.replace(re, (m, q1, q2) => {
      if (q1 || q2) return `${q1 ?? ''}${nat}${q2 ?? ''}`;
      if (loc === 'ru' && !heading && !caps && QUOTED.has(base)) return `«${nat}»`;
      return nat;
    });
  }
  return out;
}

const get = (o, at) => at.split('.').reduce((a, k) => a?.[k], o);
const pairs = (e, t, at, out) => {
  if (typeof e === 'string' && typeof t === 'string') {
    if (!/(^|\.)(l|u|url|href|src)$/.test(at)) out.push(at);
  } else if (Array.isArray(e) && Array.isArray(t))
    e.forEach((x, i) => pairs(x, t[i], at ? `${at}.${i}` : `${i}`, out));
  else if (e && t && typeof e === 'object' && typeof t === 'object')
    for (const k of Object.keys(e)) if (k in t) pairs(e[k], t[k], at ? `${at}.${k}` : k, out);
  return out;
};
const setAt = (o, at, v) => {
  const ks = at.split('.');
  const last = ks.pop();
  ks.reduce((a, k) => a[k], o)[last] = v;
};

export { convert };
const stats = {};
const samples = {};
if (process.env.NO_MAIN) {
  /* imported */
} else
  for (const loc of LOCS) {
    let changed = 0,
      files = 0,
      refused = 0,
      names = 0;
    for (const p of walk(`${R}/${loc}`)) {
      const rel = path.relative(`${R}/${loc}`, p);
      const ep = `${R}/en-US/${rel}`;
      if (!fs.existsSync(ep)) continue;
      const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
      const t = JSON.parse(fs.readFileSync(p, 'utf8'));
      let dirty = false;
      for (const at of pairs(en, t, '', [])) {
        const e = get(en, at),
          tr = get(t, at);
        const nu = convert(loc, e, tr, at);
        if (nu === tr) continue;
        const before = problems(loc, e, tr),
          after = problems(loc, e, nu);
        if (after.some((x) => !before.includes(x))) {
          refused++;
          (samples[loc] ||= []).push(
            `REFUSED ${rel} ${at}: ${after.filter((x) => !before.includes(x))[0].slice(0, 100)}`,
          );
          continue;
        }
        setAt(t, at, nu);
        dirty = true;
        changed++;
        if ((samples[loc] ||= []).length < 400)
          samples[loc].push(`${rel} ${at}\n   - ${tr.slice(0, 160)}\n   + ${nu.slice(0, 160)}`);
      }
      // Fleet heading: base name with a native form → locale `name` override.
      if (rel.startsWith('fleet/') && !('name' in en)) {
        const bp = `${ROOT}/static/data/${rel}`;
        const b = fs.existsSync(bp) ? JSON.parse(fs.readFileSync(bp, 'utf8')) : null;
        const nat = b?.name && nativeName(loc, b.name);
        if (nat && t.name !== nat) {
          (samples[loc] ||= []).push(`${rel} name: ${t.name ?? '(base)'} → ${nat}`);
          t.name = nat;
          dirty = true;
          names++;
        }
      }
      if (dirty) {
        files++;
        if (WRITE) fs.writeFileSync(p, JSON.stringify(t, null, 2) + '\n');
      }
    }
    stats[loc] = { changed, names, files, refused };
  }
console.log(stats);
fs.writeFileSync(
  `${process.argv[2]}`,
  Object.entries(samples)
    .map(([l, s]) => `#### ${l}\n${s.join('\n')}`)
    .join('\n\n'),
);
