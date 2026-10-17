// Strings identical to en-US, grouped by field name (last path segment, indices dropped), all locales.
import fs from 'node:fs';
import path from 'node:path';
import { SKIP_KEY } from '../i18n-manifest.mjs';
const R = 'i18n-src';
const walk = (d, o = []) => {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p, o);
    else if (n.endsWith('.json')) o.push(p);
  }
  return o;
};
const pairs = (e, t, at, out) => {
  if (typeof e === 'string') {
    if (typeof t === 'string') out.push([at, e, t]);
    return out;
  }
  if (Array.isArray(e)) e.forEach((x, i) => pairs(x, t?.[i], `${at}.${i}`, out));
  else if (e && typeof e === 'object')
    for (const k of Object.keys(e)) pairs(e[k], t?.[k], at ? `${at}.${k}` : k, out);
  return out;
};
const locs = fs.readdirSync(R).filter((l) => l !== 'en-US');
const byKey = {};
for (const p of walk(`${R}/en-US`)) {
  const e = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const loc of locs) {
    const lp = p.replace('/en-US/', `/${loc}/`);
    if (!fs.existsSync(lp)) continue;
    const t = JSON.parse(fs.readFileSync(lp, 'utf8'));
    for (const [at, en, tr] of pairs(e, t, '', [])) {
      if (SKIP_KEY.test(at) || en !== tr || !/[A-Za-z]{3,}/.test(en)) continue;
      // Has at least one ordinary English word (lowercase, or an all-caps common word).
      if (
        !/\b[a-z]{3,}\b/.test(en) &&
        !/\b(LAUNCH|LANDING|ORBIT|SPLASHDOWN|TOUCHDOWN|ASCENT|DESCENT|RETURN|ARRIVAL|FLYBY|END|OPS|BURN|INSERTION|INSERT|ENTRY|DOCKING|SAMPLE|IMPACT|FAILURE|ANOMALY|DEPLOY|MISSION|SEPARATION|CRUISE|EARTH|MARS|MOON)\b/.test(
          en,
        )
      )
        continue;
      const k = at
        .split('.')
        .filter((s) => !/^\d+$/.test(s))
        .pop();
      const r = (byKey[k] ||= { n: 0, ex: new Set() });
      r.n++;
      if (r.ex.size < 4) r.ex.add(`${en.slice(0, 50)}  [${path.relative(`${R}/en-US`, p)}]`);
    }
  }
}
for (const [k, r] of Object.entries(byKey).sort((a, b) => b[1].n - a[1].n))
  console.log(String(r.n).padStart(6), k.padEnd(28), [...r.ex].join(' | '));
