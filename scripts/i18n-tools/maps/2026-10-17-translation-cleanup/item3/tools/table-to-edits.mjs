// Like slbuild but rel 'messages' reads messages/<loc>.json (flat keys). One hit per find required.
import fs from 'node:fs';
const T = (await import(process.argv[2])).default,
  out = process.argv[3],
  tag = process.argv[4];
const load = (loc, rel) =>
  rel === 'messages'
    ? JSON.parse(fs.readFileSync(`messages/${loc}.json`, 'utf8'))
    : JSON.parse(fs.readFileSync(`i18n-src/${loc}/${rel}`, 'utf8'));
const get = (o, rel, at) =>
  rel === 'messages' ? o[at] : at.split('.').reduce((a, k) => a?.[k], o);
const cur = new Map(),
  by = {};
for (const [loc, rel, at, find, rep] of T) {
  const key = `${loc}|${rel}|${at}`;
  if (!cur.has(key)) cur.set(key, { loc, rel, at, old: get(load(loc, rel), rel, at) });
  const c = cur.get(key),
    v = c.new ?? c.old;
  const hits =
    typeof v !== 'string'
      ? -1
      : typeof find === 'string'
        ? v.split(find).length - 1
        : (v.match(new RegExp(find, 'g')) ?? []).length;
  if (hits < 1 || (hits > 1 && !(find instanceof RegExp && find.global))) {
    console.log(`MISS(${hits}) ${loc} ${rel}:${at} ${find}`);
    continue;
  }
  c.new = typeof find === 'string' ? v.replace(find, () => rep) : v.replace(find, rep);
}
for (const c of cur.values())
  if (c.new && c.new !== c.old)
    (by[c.loc] ??= []).push({ rel: c.rel, at: c.at, old: c.old, new: c.new });
for (const [loc, es] of Object.entries(by)) {
  fs.writeFileSync(`${out}/${tag}-${loc}.json`, JSON.stringify(es, null, 2) + '\n');
  console.log(loc, es.length);
}
