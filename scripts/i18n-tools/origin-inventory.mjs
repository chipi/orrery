// Inventory of named entities by origin country, from base data fields (country / nation / agency).
import fs from 'node:fs';
import path from 'node:path';
const D = 'static/data';
const ORIGIN = (v) => {
  const s = String(v ?? '').toUpperCase();
  if (/USSR|SOVIET|RUSSIA|ROSCOSMOS|LAVOCHKIN|ENERGIA|KHRUNICHEV|OKB/.test(s)) return 'ru';
  if (/CHINA|CNSA|CMSA|CASC|CALT/.test(s)) return 'zh-CN';
  if (/JAPAN|JAXA|ISAS|NASDA/.test(s)) return 'ja';
  if (/KOREA|KARI/.test(s)) return 'ko';
  if (/INDIA|ISRO/.test(s)) return 'hi';
  if (/UAE|EMIRATES|MBRSC/.test(s)) return 'ar';
  if (/ISRAEL|SPACEIL/.test(s)) return 'he';
  return null;
};
const out = {};
const add = (loc, name, where) => {
  if (!loc || !name) return;
  ((out[loc] ||= {})[name] ||= new Set()).add(where);
};
const walk = (d, o = []) => {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (n === 'i18n' || n === 'site-stories') continue;
    if (fs.statSync(p).isDirectory()) walk(p, o);
    else if (n.endsWith('.json')) o.push(p);
  }
  return o;
};
const visit = (v, file) => {
  if (Array.isArray(v)) return v.forEach((x) => visit(x, file));
  if (!v || typeof v !== 'object') return;
  const loc = ORIGIN(v.country) || ORIGIN(v.nation) || ORIGIN(v.agency);
  if (loc && typeof v.name === 'string' && v.id)
    add(loc, v.name, path.relative(D, file).split('/')[0]);
  if (loc && typeof v.vehicle === 'string') add(loc, v.vehicle, 'vehicle');
  for (const x of Object.values(v)) if (x && typeof x === 'object') visit(x, file);
};
for (const f of walk(D)) {
  if (
    /provenance|salvage|dryrun|image-|launches|curation|overrides|sources|audit|ledger|schemas/.test(
      f,
    )
  )
    continue;
  try {
    visit(JSON.parse(fs.readFileSync(f, 'utf8')), f);
  } catch {
    /* not a JSON object we read */
  }
}
// Overlay names for ids whose base lacks `name` (missions): en-US name + base agency.
for (const p of walk(`${D}/missions`)) {
  const b = JSON.parse(fs.readFileSync(p, 'utf8'));
  const loc = ORIGIN(b.agency) || ORIGIN(b.agency_full);
  const ep = p.replace(`${D}/`, 'i18n-src/en-US/');
  if (loc && fs.existsSync(ep)) add(loc, JSON.parse(fs.readFileSync(ep, 'utf8')).name, 'missions');
}
const res = Object.fromEntries(Object.entries(out).map(([l, m]) => [l, Object.keys(m).sort()]));
fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
for (const [l, ns] of Object.entries(res)) console.log(l, ns.length);
