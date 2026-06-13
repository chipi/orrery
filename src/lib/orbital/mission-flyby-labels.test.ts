/**
 * Regression check: every shipped `flyby` / `edl_or_oi` event label across
 * the mission corpus must contain a keyword that lets the planet-from-label
 * resolver pick a real `PlanetId`. Mirror of the inline `findFlybyPlanetFromLabel`
 * closure in `src/routes/fly/+page.svelte` (post-#332 punch-list §1 will lift
 * it into `$lib/orbital/` properly).
 *
 * Why this is here: without a corpus check, a mission JSON that ships
 * `label: "Asteroid Ida — flyby"` (no planet keyword) silently falls back to
 * `findClosestPlanetToShip` at runtime — and the iconic-shot composition
 * targets whichever planet is heliocentrically closest, which is almost
 * never what the user expects (Juno Earth-as-Mars era).
 *
 * Asteroid / comet flybys are EXCLUDED — they're labeled distinctly and
 * the runtime is expected to use the closest-planet fallback for them
 * (no asteroid mesh in /fly scene yet).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { PlanetId } from './flyby-camera-plan';

const PLANET_KEYWORDS: PlanetId[] = [
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  // Earth is checked separately in the resolver — the substring 'earth'
  // overlaps 'earth-moon' / 'earthrise' etc., so the keyword order
  // matters in the runtime closure. We match the resolver's behaviour
  // by also accepting it here.
  'earth' as PlanetId,
];

function resolvePlanetIdFromLabel(label: string): PlanetId | null {
  const lower = label.toLowerCase();
  for (const p of PLANET_KEYWORDS) {
    if (lower.includes(p)) return p;
  }
  return null;
}

interface MissionEvent {
  met_days?: number;
  type?: string;
  label?: string;
}

interface Mission {
  id?: string;
  flight?: { events?: MissionEvent[] };
}

const MISSIONS_DIR = join(process.cwd(), 'static', 'data', 'missions');

function walkMissionJson(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkMissionJson(full));
    } else if (entry.endsWith('.json') && entry !== 'index.json') {
      out.push(full);
    }
  }
  return out;
}

// Asteroids / comets / lunar-EDL / cislunar events that legitimately
// don't carry a planet keyword. The runtime composes for the nearest
// planet for these. Tracked separately so the corpus check stays
// authoritative for everything else.
const NON_PLANET_LABEL_PATTERNS = [
  /asteroid/i,
  /\bcomet\b/i,
  /churyumov/i,
  /lunar/i, // 'Earth-Moon LEGA' contains 'earth' so it still passes;
  // distinct 'Lunar' labels (Apollo etc.) fall through to closest-planet
  /\bpluto\b/i, // Pluto isn't a major-planet PlanetId; closest-planet
  // resolver returns the nearest planet to the spacecraft (Neptune ≈ the
  // only outer body big enough to compose against; effectively a void shot).
  /arrokoth/i, // New Horizons KBO flyby
  /\bmoon\b/i, // Cislunar flybys (Apollo 13, Artemis 2) handled by closest-planet → Earth.
  /halley|grigg-skjellerup|steins|lutetia/i, // Specific comet / asteroid names without "asteroid" / "comet" keyword
  /\bceres\b/i, // Dwarf-planet target (Dawn) — same rationale as Pluto.
  /\bphobos\b|\bdeimos\b/i, // Martian moons (MMX, future Mars-moon missions).
];

describe('mission flyby-label corpus', () => {
  const missionPaths = walkMissionJson(MISSIONS_DIR);
  // Sanity: corpus is non-empty + we actually walked the right path.
  it(`walks the corpus and finds at least 50 mission files`, () => {
    expect(missionPaths.length).toBeGreaterThanOrEqual(50);
  });

  it('every flyby + edl_or_oi event has a resolvable planet keyword (or is a known non-planet)', () => {
    const unresolved: Array<{ path: string; label: string; type: string }> = [];
    for (const path of missionPaths) {
      const raw = readFileSync(path, 'utf-8');
      let mission: Mission;
      try {
        mission = JSON.parse(raw);
      } catch {
        continue; // malformed JSON is the schema validator's problem
      }
      const events = mission.flight?.events ?? [];
      for (const ev of events) {
        if (ev.type !== 'flyby' && ev.type !== 'edl_or_oi') continue;
        if (!ev.label) continue; // unlabeled events surface in a different test
        const planet = resolvePlanetIdFromLabel(ev.label);
        if (planet != null) continue;
        const nonPlanet = NON_PLANET_LABEL_PATTERNS.some((re) => re.test(ev.label!));
        if (nonPlanet) continue;
        unresolved.push({
          path: path.replace(MISSIONS_DIR + '/', ''),
          label: ev.label,
          type: ev.type,
        });
      }
    }
    expect(
      unresolved,
      `Labels that don't resolve to a planet:\n${JSON.stringify(unresolved, null, 2)}`,
    ).toEqual([]);
  });

  it('every multi-target FLYBY event has a label (edl_or_oi at destination is exempt)', () => {
    // `flyby` events can land on any body on the way to the destination
    // — without a label, the closest-planet fallback picks whoever is
    // heliocentrically nearest, which is often WRONG mid-cruise (Juno
    // Earth-as-Mars era). `edl_or_oi` is at the destination and the
    // closest-planet fallback always picks the right planet because
    // the spacecraft IS at that planet — labels are nice-to-have but
    // not load-bearing.
    const missing: Array<{ path: string; metDays: number | undefined }> = [];
    for (const path of missionPaths) {
      const raw = readFileSync(path, 'utf-8');
      let mission: Mission;
      try {
        mission = JSON.parse(raw);
      } catch {
        continue;
      }
      const rel = path.replace(MISSIONS_DIR + '/', '');
      const events = mission.flight?.events ?? [];
      for (const ev of events) {
        if (ev.type !== 'flyby') continue;
        if (!ev.label) {
          missing.push({
            path: rel,
            metDays: ev.met_days,
          });
        }
      }
    }
    expect(missing, `Flyby events without labels:\n${JSON.stringify(missing, null, 2)}`).toEqual(
      [],
    );
  });
});
