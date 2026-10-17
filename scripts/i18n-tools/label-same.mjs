// Event labels (and other short label fields) left identical to English, per locale.
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
const locs = fs.readdirSync(R).filter((l) => l !== 'en-US');
const enFiles = walk(`${R}/en-US`);
const all = {};
const rows = [];
for (const loc of locs) {
  let n = 0;
  const labels = {};
  for (const p of enFiles) {
    const lp = p.replace('/en-US/', `/${loc}/`);
    if (!fs.existsSync(lp)) continue;
    const e = JSON.parse(fs.readFileSync(p, 'utf8'));
    const t = JSON.parse(fs.readFileSync(lp, 'utf8'));
    (e.events ?? []).forEach((x, i) => {
      const tl = t.events?.[i]?.label;
      // Uppercase common-word labels (not a name like "TLI" or "MOI" — those are designations).
      if (
        tl &&
        tl === x.label &&
        /[A-Z]{4,}/.test(x.label) &&
        /\b(LAUNCH|ORBIT|SPLASHDOWN|LANDING|INSERT|ARRIVAL|FLYBY|DOCK|UNDOCK|RE-ENTRY|REENTRY|SEPARATION|BURN|DEPLOY|IGNITION|END|LOSS|CONTACT|TOUCHDOWN|IMPACT|DEPARTURE|CAPTURE|RETURN|RECOVERY|LIFTOFF|STAGING|FAILURE|APOGEE|PERIGEE|COAST|CRUISE|EVA|SAMPLE|ENTRY|DESCENT|ASCENT|RENDEZVOUS|MISSION|FIRST|LAST)\b/.test(
          x.label,
        )
      ) {
        n++;
        labels[x.label] = (labels[x.label] || 0) + 1;
        rows.push(`${loc}\t${path.relative(`${R}/en-US`, p)}\tevents.${i}.label\t${x.label}`);
      }
    });
  }
  all[loc] = n;
  console.log(
    loc.padEnd(8),
    String(n).padStart(4),
    Object.entries(labels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `${k}×${v}`)
      .join(', '),
  );
}
fs.writeFileSync(process.argv[2], rows.join('\n') + '\n');
