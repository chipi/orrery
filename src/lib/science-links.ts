/**
 * Science links in panels: the one place the cap lives (UXD-022).
 *
 * A panel or entity page that offers `/science/<tab>/<section>` destinations as a set runs its list
 * through `pickScienceLinks`: deduped by tab/section, order kept, at most `SCIENCE_LINK_MAX`. Lists are
 * curated per body (overlay `science_sections`), per module / Earth object (`science` slugs) and
 * ranked per mission (`rankMissionScience`); there is no per-type default list.
 *
 * Pure TypeScript, no Svelte, so the data tests in `science-links.test.ts` can run it over every file.
 */
import type { Destination } from '$types/mission';

export const SCIENCE_LINK_MAX = 5;

export interface ScienceRef {
  tab: string;
  section: string;
  /** One sentence on why the section matters for this body; per locale, optional. */
  why?: string;
}

/** Dedupe by tab/section (first wins), keep order, cut at `max`. */
export function pickScienceLinks<T extends ScienceRef>(
  refs: readonly T[] | null | undefined,
  max: number = SCIENCE_LINK_MAX,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of refs ?? []) {
    const k = `${r.tab}/${r.section}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

/** `['tab/section', …]` (modules, Earth objects, fleet) to refs; a malformed slug is dropped. */
export function refsFromSlugs(slugs: readonly string[] | null | undefined): ScienceRef[] {
  const out: ScienceRef[] = [];
  for (const s of slugs ?? []) {
    const [tab, section, ...rest] = s.split('/');
    if (tab && section && rest.length === 0) out.push({ tab, section });
  }
  return out;
}

/** The language-neutral facts of a mission that decide its science picks (never the translated `type`). */
export interface MissionScienceInput {
  id?: string;
  dest: Destination | string;
  crewed?: boolean;
  year?: number;
  flight?: {
    launch?: { c3_km2_s2?: number | null } | null;
    cruise?: { tcm_count?: number | null } | null;
    arrival?: {
      orbit_insertion_dv_km_s?: number | null;
      entry_velocity_km_s?: number | null;
      v_infinity_km_s?: number | null;
    } | null;
  } | null;
}

export type MissionClass =
  | 'crewed-early'
  | 'crewed-earth-orbit'
  | 'crewed-lunar'
  | 'lunar-lander'
  | 'lunar-orbiter'
  | 'mars-lander'
  | 'mars-orbiter'
  | 'outer-planet'
  | 'small-body'
  | 'inner-system'
  | 'earth-uncrewed';

// Mercury, Vostok, Voskhod and Gemini: the first flights, before Apollo and the stations.
const EARLY_CREWED_LAST_YEAR = 1966;

const OUTER = new Set(['JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO']);
const INNER = new Set(['VENUS', 'MERCURY', 'SUN']);

const has = (n: number | null | undefined): boolean => n != null;

export function classifyMission(m: MissionScienceInput): MissionClass {
  const entry = has(m.flight?.arrival?.entry_velocity_km_s);
  switch (m.dest) {
    case 'EARTH':
      if (!m.crewed) return 'earth-uncrewed';
      return (m.year ?? Infinity) <= EARLY_CREWED_LAST_YEAR ? 'crewed-early' : 'crewed-earth-orbit';
    case 'MOON':
      if (m.crewed) return 'crewed-lunar';
      return entry ? 'lunar-lander' : 'lunar-orbiter';
    case 'MARS':
      return entry ? 'mars-lander' : 'mars-orbiter';
    default:
      if (OUTER.has(m.dest)) return 'outer-planet';
      if (INNER.has(m.dest)) return 'inner-system';
      return 'small-body';
  }
}

/**
 * The ordered picks after the defining-phase slot, per class. Literals `tab: …, section: …` on purpose:
 * `science-orphan-detector.test.ts` reads them as inbound links (pattern B).
 */
export const MISSION_SCIENCE_CLASSES: Record<MissionClass, ScienceRef[]> = {
  'crewed-early': [
    { tab: 'mission-phases', section: 'launch' },
    { tab: 'mission-phases', section: 'max-q' },
    { tab: 'life-in-space', section: 'microgravity-physiology' },
    { tab: 'mission-phases', section: 'entry-heating' },
    { tab: 'mission-phases', section: 'ballistic-coefficient' },
  ],
  'crewed-earth-orbit': [
    { tab: 'mission-phases', section: 'launch' },
    { tab: 'mission-phases', section: 'max-q' },
    { tab: 'life-in-space', section: 'microgravity-physiology' },
    { tab: 'mission-phases', section: 'deorbit-corridor' },
    { tab: 'mission-phases', section: 'entry-heating' },
  ],
  'crewed-lunar': [
    { tab: 'transfers', section: 'free-return' },
    { tab: 'mission-phases', section: 'trans-x-injection' },
    { tab: 'orbits', section: 'cislunar-orbits' },
    { tab: 'life-in-space', section: 'radiation-exposure' },
    { tab: 'mission-phases', section: 'edl' },
  ],
  'lunar-lander': [
    { tab: 'mission-phases', section: 'propulsive-landing' },
    { tab: 'propulsion', section: 'throttling-and-gimbaling' },
    { tab: 'planets', section: 'regolith' },
    { tab: 'planets', section: 'moon-surface-imagery' },
    { tab: 'mission-phases', section: 'dsn' },
  ],
  'lunar-orbiter': [
    { tab: 'orbits', section: 'cislunar-orbits' },
    { tab: 'mission-phases', section: 'orbit-insertion' },
    { tab: 'planets', section: 'moon-surface-imagery' },
    { tab: 'planets', section: 'lunar-ice' },
    { tab: 'orbits', section: 'inclination' },
  ],
  'mars-lander': [
    { tab: 'mission-phases', section: 'edl' },
    { tab: 'mission-phases', section: 'ballistic-coefficient' },
    { tab: 'planets', section: 'mars-surface-imagery' },
    { tab: 'transfers', section: 'hohmann-transfer' },
    { tab: 'mission-phases', section: 'dsn' },
  ],
  'mars-orbiter': [
    { tab: 'mission-phases', section: 'orbit-insertion' },
    { tab: 'scales-time', section: 'sidereal-synodic' },
    { tab: 'transfers', section: 'hohmann-transfer' },
    { tab: 'orbits', section: 'eccentricity' },
    { tab: 'orbits', section: 'true-anomaly' },
  ],
  'outer-planet': [
    { tab: 'transfers', section: 'gravity-assist' },
    { tab: 'mission-phases', section: 'dsn' },
    { tab: 'propulsion', section: 'c3' },
    { tab: 'scales-time', section: 'light-minute' },
    { tab: 'mission-phases', section: 'tcm' },
  ],
  'small-body': [
    { tab: 'mission-phases', section: 'orbit-insertion' },
    { tab: 'orbits', section: 'semi-major-axis' },
    { tab: 'orbits', section: 'eccentricity' },
    { tab: 'mission-phases', section: 'star-trackers' },
    { tab: 'transfers', section: 'gravity-assist' },
  ],
  'inner-system': [
    { tab: 'transfers', section: 'gravity-assist' },
    { tab: 'mission-phases', section: 'orbit-insertion' },
    { tab: 'orbits', section: 'eccentricity' },
    { tab: 'orbits', section: 'apsides' },
    { tab: 'scales-time', section: 'au' },
  ],
  'earth-uncrewed': [
    { tab: 'mission-phases', section: 'launch' },
    { tab: 'propulsion', section: 'rocket-stages' },
    { tab: 'orbits', section: 'orbit-regimes' },
    { tab: 'orbits', section: 'inclination' },
    { tab: 'orbits', section: 'space-debris' },
  ],
};

/**
 * Per-mission picks that only that mission earns: its own history article, the sky crane that landed
 * Curiosity and Perseverance, the ion drive of Dawn, Hayabusa and Psyche, Lucy's Trojans. They take
 * the slots after the defining phase.
 */
export const MISSION_SCIENCE_PINS: Record<string, ScienceRef[]> = {
  apollo11: [{ tab: 'history', section: 'apollo-11-1969' }],
  sputnik1: [
    { tab: 'history', section: 'sputnik-1957' },
    { tab: 'history', section: 'tsiolkovsky-equation-1903' },
    { tab: 'history', section: 'goddard-liquid-rocket-1926' },
  ],
  curiosity: [{ tab: 'mission-phases', section: 'skycrane' }],
  perseverance: [{ tab: 'mission-phases', section: 'skycrane' }],
  dawn: [
    { tab: 'propulsion', section: 'ion-drive' },
    { tab: 'planets', section: 'asteroid-belt' },
  ],
  'psyche-mission': [
    { tab: 'propulsion', section: 'ion-drive' },
    { tab: 'planets', section: 'asteroid-belt' },
  ],
  hayabusa1: [{ tab: 'propulsion', section: 'ion-drive' }],
  hayabusa2: [{ tab: 'propulsion', section: 'ion-drive' }],
  lucy: [{ tab: 'orbits', section: 'lagrange-points' }],
  'parker-solar-probe': [{ tab: 'propulsion', section: 'oberth-effect' }],
  'solar-orbiter': [{ tab: 'propulsion', section: 'oberth-effect' }],
};

/**
 * Sections that only fit a mission whose flight data has the phase they teach. A mission with no
 * `flight` block has no gate: it gets its class list as written.
 */
const GATES: Record<string, (f: NonNullable<MissionScienceInput['flight']>) => boolean> = {
  'propulsion/c3': (f) => has(f.launch?.c3_km2_s2),
  'propulsion/v-infinity': (f) => has(f.arrival?.v_infinity_km_s),
  'mission-phases/edl': (f) => has(f.arrival?.entry_velocity_km_s),
  'mission-phases/skycrane': (f) => has(f.arrival?.entry_velocity_km_s),
  'mission-phases/propulsive-landing': (f) => has(f.arrival?.entry_velocity_km_s),
  'mission-phases/orbit-insertion': (f) => has(f.arrival?.orbit_insertion_dv_km_s),
  'mission-phases/aerobraking': (f) => has(f.arrival?.orbit_insertion_dv_km_s),
  'mission-phases/tcm': (f) => (f.cruise?.tcm_count ?? 0) > 0,
};

const MAX_PER_TAB = 3;

/** The slot-1 section: the phase that defines this mission, from the flight fields it has. */
function phaseSlot(m: MissionScienceInput, cls: MissionClass): ScienceRef {
  const a = m.flight?.arrival;
  if (has(a?.entry_velocity_km_s))
    return cls === 'lunar-lander'
      ? { tab: 'mission-phases', section: 'propulsive-landing' }
      : { tab: 'mission-phases', section: 'edl' };
  if (has(a?.orbit_insertion_dv_km_s)) return { tab: 'mission-phases', section: 'orbit-insertion' };
  if ((m.flight?.cruise?.tcm_count ?? 0) > 0) return { tab: 'mission-phases', section: 'tcm' };
  if (m.flight?.launch != null) return { tab: 'mission-phases', section: 'trans-x-injection' };
  return { tab: 'mission-phases', section: 'launch' };
}

/**
 * The ranked pick for a mission: defining phase, the picks pinned to that mission, then
 * its class list, at most three per tab, at most `SCIENCE_LINK_MAX`. Same input, same output.
 */
export function rankMissionScience(m: MissionScienceInput): ScienceRef[] {
  const cls = classifyMission(m);
  const chosen: ScienceRef[] = [];
  const perTab = new Map<string, number>();
  const take = (r: ScienceRef, gated: boolean) => {
    if (chosen.length >= SCIENCE_LINK_MAX) return;
    if (chosen.some((c) => c.tab === r.tab && c.section === r.section)) return;
    if ((perTab.get(r.tab) ?? 0) >= MAX_PER_TAB) return;
    if (gated && m.flight != null) {
      const gate = GATES[`${r.tab}/${r.section}`];
      if (gate && !gate(m.flight)) return;
    }
    chosen.push(r);
    perTab.set(r.tab, (perTab.get(r.tab) ?? 0) + 1);
  };
  take(phaseSlot(m, cls), false);
  for (const pin of m.id ? (MISSION_SCIENCE_PINS[m.id] ?? []) : []) take(pin, false);
  for (const r of MISSION_SCIENCE_CLASSES[cls]) take(r, true);
  return chosen;
}
