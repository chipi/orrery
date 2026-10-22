import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const dir = process.argv[2];
const out = process.argv[3] ?? dir;
const load = (f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
const m = load('merged.json');
const objs = Object.fromEntries(load('all_objects.json').map((o) => [o.ref, o]));
const rows = m.rows.map((r) => {
  const mu = m.museums[r.museum] ?? {};
  const o = objs[r.ref];
  return {
    id: createHash('sha1').update(`${r.ref}|${r.museum}|${r.item}`).digest('hex').slice(0, 12),
    ref: r.ref,
    object: o?.name ?? r.ref.replace('/science/history/', 'History: '),
    category: o?.category ?? 'history-page',
    museum: mu.name ?? r.museum,
    city: mu.city ?? '',
    country: (mu.country ?? '?').toUpperCase(),
    website: mu.website ?? '',
    item: r.item ?? '',
    kind: r.kind,
    status: r.status,
    evidence: r.evidence ?? '',
    notes: [r.notes, r.why].filter(Boolean).join(' · '),
  };
});
const checked = [];
for (const f of ['out3_ru', 'out3_eastern', 'out3_zh', 'out3_jako', 'out3_asia', 'out3_eu_south', 'out3_eu_north', 'out3_world', 'out3_us']) {
  if (!existsSync(`${dir}/raw/${f}.json`)) continue;
  for (const c of load(`raw/${f}.json`).museums_checked ?? []) checked.push({ name: c.name, city: c.city ?? '', country: (c.country ?? '?').toUpperCase(), result: String(c.result ?? '') });
}
writeFileSync(`${out}/pagedata.json`, JSON.stringify({ generated: '2026-10-22', rows, checked }));
console.log('rows', rows.length, 'checked museums', checked.length, 'bytes', JSON.stringify({ rows, checked }).length);
const ids = new Set(rows.map((r) => r.id));
console.log('unique ids', ids.size);
