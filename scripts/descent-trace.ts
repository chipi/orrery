/**
 * descent-trace.ts — one profile's trajectory around its beats: time, altitude, speed, felt g and
 * phase, every N seconds (default 10), plus the peak g within each phase. Companion to
 * descent-report.ts for fitting a profile against a sourced timeline.
 *
 *   npx tsx scripts/descent-trace.ts apollo7 [stepS]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expandDescentProfile,
  type RawDescentProfile,
} from '../src/lib/physics/descent/descent-profile-registry';
import { integrateDescent } from '../src/lib/physics/descent/descent-physics';

const [id, stepArg] = process.argv.slice(2);
const step = Number(stepArg ?? 10);
const raw = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '..', `static/data/descent-profiles/${id}.json`),
    'utf8',
  ),
) as RawDescentProfile;
const s = integrateDescent(expandDescentProfile(raw));
let next = 0;
const peakByPhase = new Map<string, { g: number; t: number; altKm: number }>();
for (const st of s.states) {
  const key = `${st.phaseIndex}:${st.phaseKind}`;
  const p = peakByPhase.get(key);
  if (!p || st.decelG > p.g) peakByPhase.set(key, { g: st.decelG, t: st.t, altKm: st.altKm });
  if (st.t >= next) {
    console.log(
      `t=${String(Math.round(st.t)).padStart(5)}s  alt ${st.altKm.toFixed(1).padStart(6)} km  v ${st.velocityMs.toFixed(0).padStart(5)} m/s  ${st.decelG.toFixed(2).padStart(5)} g  ${st.phaseKind}`,
    );
    next += step;
  }
}
for (const [k, p] of peakByPhase)
  console.log(`peak ${k}: ${p.g.toFixed(2)} g at t=${Math.round(p.t)}s ${p.altKm.toFixed(1)} km`);
console.log('events:', s.events.map((e) => `${e.type}@${Math.round(e.t)}`).join(' '));
