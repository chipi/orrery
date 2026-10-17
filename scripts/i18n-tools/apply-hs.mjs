// Write per-locale hotspot-metadata overlays from a hand-written spec:
// { "<site>": { hotspot_annotations?: [{id,label}], panorama_caption?, compass_zero_direction?,
//               panorama_annotations?: [{id,label,body}] } }
// Every id must exist in the sidecar; every string is checked with problems() against the
// sidecar English. Existing keys in the overlay file are kept unless the spec sets them.
import fs from 'node:fs';
import path from 'node:path';
import { problems } from '../lib/translate-quality.mjs';
const R = process.cwd();
const [loc, src] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(src, 'utf8'));
const side = JSON.parse(fs.readFileSync(`${R}/static/data/surface-hotspots.json`, 'utf8')).entries;
const errs = [];
const check = (where, en, tr) => {
  if (typeof tr !== 'string' || !tr.trim()) return errs.push(`${where}: empty`);
  for (const p of problems(loc, en, tr)) errs.push(`${where}: ${p.slice(0, 150)}`);
};
const files = {};
for (const [site, o] of Object.entries(spec)) {
  const e = side[site];
  if (!e) {
    errs.push(`${site}: not in sidecar`);
    continue;
  }
  const want = {};
  if (o.hotspot_annotations) {
    const ids = new Map((e.hotspot_annotations ?? []).map((a) => [a.id, a]));
    if (o.hotspot_annotations.length !== ids.size)
      errs.push(
        `${site}: hotspot_annotations ${o.hotspot_annotations.length} vs sidecar ${ids.size}`,
      );
    for (const a of o.hotspot_annotations)
      if (ids.has(a.id)) check(`${site} ha.${a.id}`, ids.get(a.id).label, a.label);
      else errs.push(`${site}: unknown hotspot id ${a.id}`);
    want.hotspot_annotations = o.hotspot_annotations.map(({ id, label }) => ({ id, label }));
  }
  const m = e.panorama_metadata ?? {};
  for (const k of ['panorama_caption', 'compass_zero_direction']) {
    const en = k === 'panorama_caption' ? m.caption : m.compass_zero_direction;
    if (!!en !== (o[k] !== undefined))
      errs.push(`${site}: ${k} ${en ? 'missing' : 'not in sidecar'}`);
    if (en && o[k] !== undefined) {
      check(`${site} ${k}`, en, o[k]);
      want[k] = o[k];
    }
  }
  const pa = new Map((e.panorama_annotations ?? []).map((a) => [a.id, a]));
  if ((o.panorama_annotations?.length ?? 0) !== pa.size)
    errs.push(
      `${site}: panorama_annotations ${o.panorama_annotations?.length ?? 0} vs sidecar ${pa.size}`,
    );
  if (o.panorama_annotations) {
    for (const a of o.panorama_annotations) {
      const en = pa.get(a.id);
      if (!en) {
        errs.push(`${site}: unknown panorama id ${a.id}`);
        continue;
      }
      check(`${site} pa.${a.id}.label`, en.label, a.label);
      check(`${site} pa.${a.id}.body`, en.body, a.body);
    }
    want.panorama_annotations = o.panorama_annotations.map(({ id, label, body }) => ({
      id,
      label,
      body,
    }));
  }
  files[site] = want;
}
// Coverage: every sidecar site with panorama strings must be in the spec.
for (const [site, e] of Object.entries(side)) {
  const has =
    e.panorama_metadata?.caption ||
    e.panorama_metadata?.compass_zero_direction ||
    e.panorama_annotations?.length;
  if (has && !spec[site]) errs.push(`${site}: missing from spec`);
}
if (errs.length) {
  console.log(`✗ ${loc}\n  ${errs.join('\n  ')}`);
  process.exit(1);
}
for (const [site, want] of Object.entries(files)) {
  const p = `${R}/i18n-src/${loc}/hotspot-metadata/${site}.json`;
  const cur = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ...cur, ...want }, null, 2) + '\n');
}
console.log(`✓ ${loc}: ${Object.keys(files).length} site overlays written`);
