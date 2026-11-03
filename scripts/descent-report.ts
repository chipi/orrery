/**
 * descent-report.ts — what the descent model produces for a set of profiles, as a table:
 * duration from entry interface, peak g (and its altitude), each beat's time and altitude, and
 * the touchdown speed. The input to fitting a profile against a sourced timeline (the handover
 * method: research JSON → fit `estimatedFields` → re-derive arrival → test bands).
 *
 *   npx tsx scripts/descent-report.ts                 # every profile
 *   npx tsx scripts/descent-report.ts --body earth    # one body
 *   npx tsx scripts/descent-report.ts apollo7 gemini4 # named profiles
 *   npx tsx scripts/descent-report.ts --json          # machine-readable
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expandDescentProfile,
  type RawDescentProfile,
} from '../src/lib/physics/descent/descent-profile-registry';
import { integrateDescent } from '../src/lib/physics/descent/descent-physics';

const DIR = resolve(import.meta.dirname, '..', 'static/data/descent-profiles');
const args = process.argv.slice(2);
const json = args.includes('--json');
const bodyIdx = args.indexOf('--body');
const body = bodyIdx >= 0 ? args[bodyIdx + 1] : null;
const named = args.filter((a, i) => !a.startsWith('--') && (bodyIdx < 0 || i !== bodyIdx + 1));

const ids = named.length
  ? named
  : readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));

const rows = [];
for (const id of ids.sort()) {
  const raw = JSON.parse(readFileSync(resolve(DIR, `${id}.json`), 'utf8')) as RawDescentProfile;
  if (body && raw.body !== body) continue;
  const s = integrateDescent(expandDescentProfile(raw));
  rows.push({
    id,
    body: raw.body,
    durationS: Math.round(s.totalDurationS),
    peakG: +s.peakDecel.g.toFixed(2),
    peakGAltKm: +s.peakDecel.altKm.toFixed(1),
    touchdownMs: +s.touchdownVelocityMs.toFixed(1),
    success: s.touchdownSuccess,
    events: s.events.map((e) => ({
      type: e.type,
      t: Math.round(e.t),
      altKm: +(e.altKm ?? 0).toFixed(1),
    })),
  });
}

if (json) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  for (const r of rows) {
    const ev = r.events.map((e) => `${e.type}@${e.t}s/${e.altKm}km`).join(' ');
    console.log(
      `${r.id.padEnd(16)} ${String(r.durationS).padStart(6)} s  peak ${String(r.peakG).padStart(5)} g @${r.peakGAltKm} km  TD ${r.touchdownMs} m/s ${r.success ? '' : 'CRASH'}\n    ${ev}`,
    );
  }
}
