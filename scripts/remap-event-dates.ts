/**
 * remap-event-dates.ts — move flight events to their sourced dates, consistently everywhere.
 *
 * An event's MET (days after `departure_date`) is repeated in three places: the base mission's
 * `flight.events[].met_days`, its trajectory waypoints (`interplanetary_profile.waypoints_helio_au`
 * anchors a flyby at the same MET) and every locale overlay's `flight_events[].met` (matched to the
 * base event by MET). This sets each corrected event to `realDate − departure_date` and remaps the
 * mission's whole time axis piecewise-linearly between its events, so cruise waypoints keep their
 * place between the flybys and the overlays stay matched. Refuses a change that reorders events.
 *
 *   npx tsx scripts/remap-event-dates.ts <fixes.json> [--write]
 *
 * fixes.json: [{ "mission": "mercury/messenger", "label": "Mercury #1 — gravity assist",
 *               "realDate": "2008-01-14", "source": { "l": "…", "u": "…" } }, …]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Fix {
  mission: string;
  label: string;
  realDate: string;
}
const ROOT = resolve(import.meta.dirname, '..');
const [fixesPath, ...rest] = process.argv.slice(2);
const write = rest.includes('--write');
const fixes = JSON.parse(readFileSync(fixesPath, 'utf8')) as Fix[];

const dayOf = (iso: string): number => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86400000;
const locales = readdirSync(resolve(ROOT, 'i18n-src'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const byMission = new Map<string, Fix[]>();
for (const f of fixes) byMission.set(f.mission, [...(byMission.get(f.mission) ?? []), f]);

let failed = 0;
for (const [mission, list] of byMission) {
  const path = resolve(ROOT, `static/data/missions/${mission}.json`);
  const m = JSON.parse(readFileSync(path, 'utf8'));
  const events: { met_days: number; label?: string; type: string }[] = m.flight?.events ?? [];
  const dep = dayOf(m.departure_date);
  const moves = new Map<number, number>();
  for (const f of list) {
    const e = events.find((x) => x.label === f.label);
    if (!e) {
      console.log(`✘ ${mission}: no event labelled "${f.label}"`);
      failed++;
      continue;
    }
    moves.set(e.met_days, Math.round(dayOf(f.realDate) - dep));
  }
  // Anchors: every event (moved or not), 0 → 0.
  const anchors = [
    [0, 0],
    ...events.map((e) => [e.met_days, moves.get(e.met_days) ?? e.met_days]),
  ].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i][0] > anchors[i - 1][0] && anchors[i][1] <= anchors[i - 1][1]) {
      console.log(`✘ ${mission}: the move reorders events at MET ${anchors[i][0]}`);
      failed++;
    }
  }
  const remap = (t: number): number => {
    if (moves.has(t)) return moves.get(t) as number;
    for (let i = 1; i < anchors.length; i++) {
      const [a0, b0] = anchors[i - 1];
      const [a1, b1] = anchors[i];
      if (t <= a1 && a1 > a0)
        return Math.round((b0 + ((t - a0) / (a1 - a0)) * (b1 - b0)) * 1000) / 1000;
    }
    const [aL, bL] = anchors[anchors.length - 1];
    return t + (bL - aL);
  };
  const changes = [...moves].filter(([a, b]) => a !== b);
  console.log(`${mission}: ${changes.map(([a, b]) => `${a}→${b}`).join(', ') || 'no change'}`);
  for (const e of events) e.met_days = remap(e.met_days);
  const wp = m.flight?.interplanetary_profile?.waypoints_helio_au as number[][] | undefined;
  if (wp) for (const w of wp) w[0] = remap(w[0]);
  if (write) writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
  // Locale overlays: flight_events[].met keyed to the base event MET, and the mission panel's
  // events[].met (the HUD's NEXT line reads it).
  for (const loc of locales) {
    const op = resolve(ROOT, `i18n-src/${loc}/missions/${mission}.json`);
    if (!existsSync(op)) continue;
    // Edited in place, not re-serialised: overlays keep their one-line event objects.
    const text = readFileSync(op, 'utf8');
    let n = 0;
    const out = text.replace(
      /("met"\s*:\s*)(-?\d+(?:\.\d+)?)/g,
      (_all, key: string, num: string) => {
        const to = remap(Number(num));
        if (to !== Number(num)) n++;
        return `${key}${to}`;
      },
    );
    if (n && write) writeFileSync(op, out);
  }
}
console.log(failed ? `remap-event-dates: ${failed} problem(s)` : 'remap-event-dates: ok');
process.exit(failed ? 1 : 0);
