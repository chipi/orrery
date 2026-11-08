// The Zhurong route stop "selfie-with-lander" kept its own copy of the gallery picture
// mars-sites/zhurong/04 (pHash d=0). Operator rule (2026-11-08): routes and stories reuse gallery
// photos, they don't duplicate them. The route stop now points at the gallery image and the copy
// (served WebPs, master, and every data row keyed on it) is removed.
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/zhurong-route-selfie-2026-11-08.mjs
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
const OLD = '/images/mars-sites/zhurong/route/selfie-with-lander';
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const isOld = (k) => typeof k === 'string' && k.startsWith(OLD);

const RP = 'static/data/mars-traverses/zhurong.route-photos.json';
const rp = readJson(RP);
const stop = rp.photos.find((p) => p.id === 'selfie-with-lander');
if (!stop) throw new Error('no selfie-with-lander stop');
stop.image = '/images/mars-sites/zhurong/04.webp';
stop.thumb = '/images/mars-sites/zhurong/04-320.webp';
writeJson(RP, rp);

for (const f of readdirSync('static/data/image-alt-text').map(
  (f) => `static/data/image-alt-text/${f}`,
)) {
  const j = readJson(f);
  const m = j.entries ?? j;
  for (const k of Object.keys(m)) if (isOld(k)) delete m[k];
  writeJson(f, j);
}
const LAD = 'static/data/image-ladder.json';
const lad = readJson(LAD);
for (const k of Object.keys(lad)) if (isOld(k)) delete lad[k];
writeJson(LAD, lad);
const PH = 'static/data/image-phashes.json';
const ph = readJson(PH);
for (const k of Object.keys(ph.phashes)) if (isOld(k)) delete ph.phashes[k];
writeJson(PH, ph);
const PROV = 'static/data/image-provenance.json';
const prov = readJson(PROV);
prov.entries = prov.entries.filter((e) => !isOld(e.path));
writeJson(PROV, prov);
const AP = 'static/data/image-approved.json';
const ap = readJson(AP);
ap.approved = ap.approved.filter((p) => !isOld(p));
ap.count = ap.approved.length;
writeJson(AP, ap);

const dir = 'static/images/mars-sites/zhurong/route';
for (const f of readdirSync(dir)) if (f.startsWith('selfie-with-lander')) rmSync(`${dir}/${f}`);
const master = 'masters/mars-sites/zhurong/route/selfie-with-lander.jpg';
if (existsSync(master)) rmSync(master);
console.log('zhurong route selfie now reuses mars-sites/zhurong/04; duplicate removed');
