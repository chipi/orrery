// Most common translation of mission event labels per locale, plus whether sibling files translate links/library_labels.
import fs from 'node:fs';
import path from 'node:path';
const R = 'i18n-src';
const walk = (d, o = []) => {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p, o);
    else if (n.endsWith('.json')) o.push(p);
  }
  return o;
};
const WANT = ['LAUNCH', 'ORBIT INSERT', 'SPLASHDOWN', 'APOGEE', 'POWER FAILURE'];
const locs = fs.readdirSync(R).filter((l) => l !== 'en-US');
for (const loc of locs) {
  const counts = {};
  for (const p of walk(`${R}/en-US/missions`)) {
    const lp = p.replace('/en-US/', `/${loc}/`);
    if (!fs.existsSync(lp)) continue;
    const e = JSON.parse(fs.readFileSync(p, 'utf8')).events ?? [];
    const t = JSON.parse(fs.readFileSync(lp, 'utf8')).events ?? [];
    e.forEach((x, i) => {
      if (WANT.includes(x.label) && t[i]?.label)
        (counts[x.label] ||= {})[t[i].label] = (counts[x.label][t[i].label] || 0) + 1;
    });
  }
  const best = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [
      k,
      Object.entries(v)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([s, n]) => `${s}(${n})`)
        .join(' / '),
    ]),
  );
  const pluto = JSON.parse(fs.readFileSync(`${R}/${loc}/planets/pluto.json`, 'utf8'));
  const titan = JSON.parse(fs.readFileSync(`${R}/${loc}/satellites/titan.json`, 'utf8'));
  console.log(
    loc,
    JSON.stringify(best),
    '| pluto.links:',
    pluto.links?.[0]?.l ?? '-',
    '| titan.mission_visits:',
    titan.mission_visits?.[0]?.slice(0, 40) ?? '-',
  );
}
