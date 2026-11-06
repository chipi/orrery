/**
 * Do the mission events' MET values land on the date their own description gives? For every
 * event in static/data/missions/**: the date /fly and the mission panel show
 * (departure_date + met_days) against the first ISO date the description states ("… on
 * 2020-10-15", "2025-08-31. …"). Prints each disagreement and a fixes.json for
 * scripts/remap-event-dates.ts (dates taken from the descriptions — read before applying).
 *
 *   npx tsx scripts/fly/event-date-check.ts [--fixes=<out.json>]
 *
 * Read-only unless --fixes is given (then it writes only that file).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const fixesOut = process.argv.find((a) => a.startsWith('--fixes='))?.slice(8);
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const iso = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10);

const fixes: { mission: string; label: string; realDate: string; from: string }[] = [];
let n = 0;
for (const dir of readdirSync(resolve(ROOT, 'static/data/missions'), { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const f of readdirSync(resolve(ROOT, 'static/data/missions', dir.name))) {
    if (!f.endsWith('.json')) continue;
    const m = JSON.parse(readFileSync(resolve(ROOT, 'static/data/missions', dir.name, f), 'utf8'));
    if (!m.departure_date || !m.flight?.events) continue;
    const dep = day(m.departure_date.slice(0, 10));
    for (const e of m.flight.events as {
      met_days: number;
      label: string;
      description?: string;
    }[]) {
      n++;
      const desc = e.description ?? '';
      // The event's own date: "on YYYY-MM-DD" or a description that opens with the date.
      const hit = desc.match(/\bon (\d{4}-\d{2}-\d{2})\b/) ?? desc.match(/^(\d{4}-\d{2}-\d{2})\b/);
      if (!hit) continue;
      const shown = iso(Math.floor(dep + e.met_days));
      if (shown === hit[1]) continue;
      const gap = day(shown) - day(hit[1]);
      console.log(
        `${dir.name}/${f.replace('.json', '')}`.padEnd(34),
        `MET ${String(e.met_days).padStart(8)} → ${shown}  text ${hit[1]}  (${gap > 0 ? '+' : ''}${gap} d)  ${e.label}`,
      );
      fixes.push({
        mission: `${dir.name}/${f.replace('.json', '')}`,
        label: e.label,
        realDate: hit[1],
        from: desc.slice(0, 120),
      });
    }
  }
}
console.log(`${fixes.length} of ${n} events disagree with their own description's date`);
if (fixesOut) writeFileSync(fixesOut, JSON.stringify(fixes, null, 2) + '\n');
