// Add/replace top-level keys in locale overlays from a hand-written spec:
//   { "<file path without .json>": { "<key>": <value> | "COPY" } }
// Value mirrors en-US; for lists of objects give only the string fields — every
// non-string field (met, type, u, t, id …) is taken from en-US by index. "COPY"
// copies the en-US value verbatim (source-title link lists). Every string leaf is
// checked with problems() against its en-US twin; the shape must match en-US.
import fs from 'node:fs';
import { problems } from '../lib/translate-quality.mjs';
const R = 'i18n-src';
const [loc, src] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(src, 'utf8'));
const errs = [];
function build(en, v, at) {
  if (v === 'COPY') return structuredClone(en);
  if (typeof en === 'string') {
    if (typeof v !== 'string' || !v.trim()) {
      errs.push(`${at}: missing string`);
      return en;
    }
    for (const p of problems(loc, en, v)) errs.push(`${at}: ${p.slice(0, 140)}`);
    return v;
  }
  if (Array.isArray(en)) {
    if (!Array.isArray(v) || v.length !== en.length) {
      errs.push(`${at}: list length ${v?.length} vs en ${en.length}`);
      return en;
    }
    return en.map((x, i) => build(x, v[i], `${at}.${i}`));
  }
  if (en && typeof en === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(en)) {
      if (typeof x === 'string' && v?.[k] === undefined && /^(u|t|type|id|url)$/.test(k))
        out[k] = x;
      else if (typeof x !== 'string' && typeof x !== 'object') out[k] = x;
      else out[k] = build(x, v?.[k], `${at}.${k}`);
    }
    return out;
  }
  return en;
}
const writes = [];
for (const [file, keys] of Object.entries(spec)) {
  const ep = `${R}/en-US/${file}.json`;
  const lp = `${R}/${loc}/${file}.json`;
  if (!fs.existsSync(ep) || !fs.existsSync(lp)) {
    errs.push(`${file}: file missing`);
    continue;
  }
  const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
  const t = JSON.parse(fs.readFileSync(lp, 'utf8'));
  for (const [k, v] of Object.entries(keys)) {
    if (!(k in en)) {
      errs.push(`${file}.${k}: not in en-US`);
      continue;
    }
    t[k] = build(en[k], v, `${file}.${k}`);
  }
  writes.push([lp, t]);
}
if (errs.length) {
  console.log(`✗ ${loc}\n  ${errs.join('\n  ')}`);
  process.exit(1);
}
for (const [p, t] of writes) fs.writeFileSync(p, JSON.stringify(t, null, 2) + '\n');
console.log(`✓ ${loc}: ${writes.length} files`);
