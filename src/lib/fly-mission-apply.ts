import {
  destinationPos,
  earthPos,
  returnArc,
  type MissionTimeline,
  type Vec2,
} from '$lib/mission-arc';
import { type DestinationId } from '$lib/lambert-grid.constants';
import { ARC_STEPS, moonHelioPos, moonHelioArc, buildArcs } from '$lib/fly-moon-arc';
import {
  buildSplineFromTrajectoryWaypoints,
  parseWaypointDateToMet,
  type TrajectoryWaypoint,
} from '$lib/trajectory-spline';
import { buildCislunarTrajectory, type CislunarTrajectory } from '$lib/cislunar-geometry';
import {
  buildInterplanetaryTrajectory,
  type InterplanetaryTrajectory,
} from '$lib/interplanetary-geometry';
import { parseDeltaV } from '$lib/parse-delta-v';
import { dateToSimDay } from '$lib/sim-day';
import { mergeFlightEvents } from '$lib/mission-event-merge';
import { missionDestToHeliocentricDestinationId } from '$lib/mission-dest';
import type { FlightDataQuality, FlightParams, Mission, MissionEvent } from '$types/mission';
import type { LocalizedScenario } from '$types/scenario';

/**
 * Pure mission → /fly state transition. Extracted from
 * src/routes/fly/+page.svelte applyMissionAsLoaded during W9 (#279).
 *
 * Separation of concern:
 *   - Math layer (this module): given a Mission + sensible defaults,
 *     derive every value that drives the /fly scene — timeline,
 *     destination, trajectory arcs, cislunar / interplanetary
 *     trajectory objects, sim-speed cadence, merged events,
 *     LoadedMission DTO.
 *   - UX layer (component): writes the result to $state, calls
 *     analytics, calls the Three.js ref callbacks in the right
 *     order.
 *
 * Nothing here touches Svelte $state, Three.js, or the DOM —
 * everything is plain functions over plain data. Unit tests exercise
 * the timeline + arc derivation directly without mounting a scene.
 */

/**
 * Subset of the LoadedMission shape that lives in /fly +page.svelte.
 * Re-exported here so the component can import the type from the
 * same module that produces it.
 */
export interface LoadedMission {
  name: string;
  vehicle: string;
  payload: string;
  dv_total: number;
  dv_used: number;
  dep_label: string;
  arr_label: string;
  timeline: MissionTimeline;
  isFromData: boolean;
  /** Real flight params from the mission JSON (ADR-027). Optional;
   *  surfaces in the FLIGHT PARAMS HUD group when present. */
  flight?: FlightParams;
  flight_data_quality?: FlightDataQuality;
}

export interface MissionApplyDefaults {
  /** Fallback when m.departure_date is missing / unparseable. */
  depFallback: number;
  /** Fallback when m.delta_v doesn't parse and m.flight.totals is absent. */
  dvFallback: number;
  /** Fallback for the LAUNCH label when m.departure_date is missing. */
  depLabelFallback: string;
  /** Fallback for the ARRIVAL label when m.arrival_date is missing. */
  arrLabelFallback: string;
}

export interface MissionApplyResult {
  timeline: MissionTimeline;
  /** Always false for mission-driven flows; free-return arcs come
   *  from scenarios. Surfaced so the component can assign it the
   *  same way as scenario / plan results. */
  isFreeReturn: false;
  isMoonMission: boolean;
  activeDestination: DestinationId;
  /** True for SAMPLE RETURN + CREWED mission types; drives the
   *  doubled arr_day and the return-arc construction. */
  isReturnTrip: boolean;
  outPts: Vec2[];
  retPts: Vec2[];
  cislunarTrajectory: CislunarTrajectory | null;
  interplanetaryTrajectory: InterplanetaryTrajectory | null;
  missionMeta: LoadedMission;
  /** Default sim-speed — slower on Moon missions so 0.6-day lunar
   *  phases get enough playback time for the camera-auto-zoom to
   *  read cleanly. */
  simSpeed: number;
  /** Editorial overlay events fused with structural flight events. */
  missionEvents: MissionEvent[];
}

/** Detect SAMPLE RETURN / CREWED missions from the mission's `type`
 *  string. Round-trip missions get doubled arr_day + a return arc. */
function detectReturnTrip(missionType: string | undefined): boolean {
  const t = (missionType ?? '').toUpperCase();
  return t.includes('SAMPLE RETURN') || t.includes('CREWED');
}

/** Derive the mission timeline from m.departure_date + m.transit_days.
 *  For one-way landings flyby_day == arr_day (no idle gap on scrub);
 *  for round-trips arr_day = dep + 2*transit (outbound then return). */
function computeTimeline(
  m: Mission,
  depFallback: number,
): { timeline: MissionTimeline; isReturnTrip: boolean } {
  const totalT = m.transit_days || 250;
  const depDay = dateToSimDay(m.departure_date) ?? depFallback;
  const isReturnTrip = detectReturnTrip(m.type);
  const flybyOffset = totalT;
  const arrOffset = isReturnTrip ? totalT * 2 : totalT;
  return {
    timeline: {
      dep_day: depDay,
      flyby_day: depDay + flybyOffset,
      arr_day: depDay + arrOffset,
    },
    isReturnTrip,
  };
}

/** Cislunar outbound + (round-trip) return arcs in heliocentric AU.
 *  Renders the trip as Earth+Moon riding Earth's orbital motion so
 *  the heliocentric scale matches Mars missions. */
function buildCislunarArcs(
  timeline: MissionTimeline,
  isReturnTrip: boolean,
): { outPts: Vec2[]; retPts: Vec2[] } {
  const earthAtDep = earthPos(timeline.dep_day);
  const moonAtFlyby = moonHelioPos(timeline.flyby_day);
  const outPts = moonHelioArc(
    timeline.dep_day,
    timeline.flyby_day,
    earthAtDep,
    moonAtFlyby,
    ARC_STEPS,
  );
  const earthAtReturnArr = earthPos(timeline.arr_day);
  const retPts = isReturnTrip
    ? moonHelioArc(timeline.flyby_day, timeline.arr_day, moonAtFlyby, earthAtReturnArr, ARC_STEPS)
    : [];
  return { outPts, retPts };
}

/** Heliocentric outbound + (sample-return) return arcs. */
function buildHelioArcs(
  timeline: MissionTimeline,
  destination: DestinationId,
  isReturnTrip: boolean,
  arrivalVInfKms: number | null,
): { outPts: Vec2[]; retPts: Vec2[] } {
  const arcs = buildArcs(timeline, false, destination, arrivalVInfKms);
  if (!isReturnTrip) return { outPts: arcs.out, retPts: arcs.ret };
  const earthRet = earthPos(timeline.arr_day);
  const retPts = returnArc(arcs.out[arcs.out.length - 1], earthRet, ARC_STEPS);
  return { outPts: arcs.out, retPts };
}

/** Build the LoadedMission DTO. Prefers the structured
 *  `flight.totals.total_dv_km_s` when present (ADR-027 backward-
 *  compat shim); falls back to parseDeltaV(). */
function buildMissionMeta(
  m: Mission,
  timeline: MissionTimeline,
  defaults: MissionApplyDefaults,
): LoadedMission {
  const dvTotal = parseDeltaV(m.delta_v, defaults.dvFallback);
  const dvTotalCanonical = m.flight?.totals?.total_dv_km_s ?? dvTotal;
  return {
    name: m.name ?? m.id,
    vehicle: m.vehicle ?? '—',
    payload: m.payload ?? '—',
    dv_total: dvTotalCanonical,
    dv_used: dvTotalCanonical * 0.94,
    dep_label: m.departure_date ?? defaults.depLabelFallback,
    arr_label: m.arrival_date ?? defaults.arrLabelFallback,
    timeline,
    isFromData: true,
    flight: m.flight,
    flight_data_quality: m.flight_data_quality,
  };
}

/**
 * The full transition. Pass in the Mission + default fallbacks; get
 * back every value the component needs to write to $state.
 */
/** Optional shape passed alongside the Mission when /fly has loaded
 *  the matching /static/data/trajectories/<id>.json. When supplied,
 *  computeMissionApply uses a Catmull-Rom spline through the labeled
 *  waypoints instead of the single Keplerian half-ellipse — gives
 *  grand-tour missions (Cassini's VVEJGA, Voyager's planetary tour,
 *  etc.) a trajectory that actually passes through each flyby planet. */
export interface TrajectoryOverride {
  waypoints: TrajectoryWaypoint[];
}

export function computeMissionApply(
  m: Mission,
  defaults: MissionApplyDefaults,
  trajectoryOverride?: TrajectoryOverride,
): MissionApplyResult {
  const { timeline, isReturnTrip } = computeTimeline(m, defaults.depFallback);
  // EARTH (Earth-orbit missions: Apollo 7/9, Mercury/Gemini/Skylab, Shuttle
  // LEO sorties, ISS expeditions) reuses the cislunar / Earth-centric view
  // since there is no heliocentric trajectory to draw — Apollo 7 + 9 ride
  // this branch with /fly's cislunar parametric fallback.
  const isMoonMission = m.dest === 'MOON' || m.dest === 'EARTH';
  const activeDestination =
    missionDestToHeliocentricDestinationId(m.dest) ?? ('mars' as DestinationId);

  let cislunarTrajectory: CislunarTrajectory | null = null;
  let interplanetaryTrajectory: InterplanetaryTrajectory | null = null;
  let outPts: Vec2[];
  let retPts: Vec2[];

  if (isMoonMission) {
    cislunarTrajectory = buildCislunarTrajectory(m.flight?.cislunar_profile, {
      dep_day_sim: timeline.dep_day,
      transit_days: m.transit_days ?? 0,
      is_return_trip: isReturnTrip,
    });
    ({ outPts, retPts } = buildCislunarArcs(timeline, isReturnTrip));
  } else {
    const interplanetaryReturnType = m.flight?.interplanetary_profile?.return?.type;
    const isInterplanetaryReturnTrip =
      !!interplanetaryReturnType && interplanetaryReturnType !== 'none';
    if (m.flight?.events && m.flight.events.length > 0) {
      interplanetaryTrajectory = buildInterplanetaryTrajectory(m.flight?.interplanetary_profile, {
        dep_day_sim: timeline.dep_day,
        transit_days: m.transit_days ?? 0,
        is_return_trip: isInterplanetaryReturnTrip,
        arrival_vinf_kms: m.flight?.arrival?.v_infinity_km_s ?? null,
      });
    }
    const vInfKms = m.flight?.arrival?.v_infinity_km_s ?? null;
    // Spline branch — replace LABELED waypoints (Launch, Venus #1,
    // Earth, Jupiter, Saturn etc.) with the actual heliocentric
    // position of the matched planet at that MET, so the trajectory
    // anchors land ON the real planet positions. The spacecraft glyph
    // + milestone diamond + planet mesh then all coincide at flyby
    // moments — acceptance criteria from the iterative debug session.
    // CRUISE waypoints (the unlabeled in-between control points) stay
    // raw from /explore for shape — their large y values give the
    // trajectory its 3D climb between the ecliptic-anchored flybys.
    let splineOut: Vec2[] | null = null;
    if (trajectoryOverride && trajectoryOverride.waypoints.length >= 2 && m.departure_date) {
      const remapped: TrajectoryWaypoint[] = trajectoryOverride.waypoints.map((wp) => {
        const planet = wp.label ? labelToPlanetId(wp.label) : null;
        if (!planet) return wp; // cruise waypoint — use /explore data raw
        const met = parseWaypointDateToMet(wp.date, m.departure_date!);
        if (isNaN(met)) return wp;
        const realPos =
          planet === ('earth' as DestinationId)
            ? earthPos(timeline.dep_day + met)
            : destinationPos(timeline.dep_day + met, planet);
        return {
          date: wp.date,
          label: wp.label,
          x: realPos.x,
          y: 0,
          z: realPos.z,
        };
      });
      // Drop any post-arrival waypoints (Cassini's Grand Finale at MET
      // 7269 is in the trajectory file but the mission arc proper ends
      // at SOI MET 2451). Without this clamp, the spline spans MET 0
      // → 7269 while spacecraftPos's t parameter maps 0..1 over MET
      // 0..2451 (arr_day - dep_day), so outPts[39] (where the ship
      // looks up its position at t≈0.08) is at spline-MET ~568 not
      // MET 193 — every planet anchor drifts further outboard than
      // it should. transit_days is the canonical arrival MET.
      const arrMet = m.transit_days ?? 0;
      const inMission = remapped.filter((wp) => {
        const met = parseWaypointDateToMet(wp.date, m.departure_date!);
        return !isNaN(met) && met <= arrMet + 1;
      });
      // Sample density: 500 points across the mission so the linear
      // lerpPoint between adjacent samples doesn't miss the planet
      // anchors. With 97 samples (the Keplerian-arc default), a 2451-
      // day Cassini mission has samples 25 days apart — Venus at
      // MET 193 falls between samples at 178 and 204, and the lerp
      // overshoots/undershoots Venus's actual position. 500 samples
      // = 4.9 days/sample, so the lerp lands within a few fractions
      // of an AU of every waypoint.
      const samples = buildSplineFromTrajectoryWaypoints(
        inMission.length >= 2 ? inMission : remapped,
        m.departure_date,
        500,
      );
      if (samples && samples.length >= 2) {
        splineOut = samples.map((p) => ({ x: p.x, y: p.y, z: p.z }));
      }
    }
    if (splineOut) {
      outPts = splineOut;
      retPts = []; // grand-tour spline missions are one-way (Cassini → Saturn, Voyagers → outward)
    } else {
      ({ outPts, retPts } = buildHelioArcs(timeline, activeDestination, isReturnTrip, vInfKms));
    }
  }

  return {
    timeline,
    isFreeReturn: false,
    isMoonMission,
    activeDestination,
    isReturnTrip,
    outPts,
    retPts,
    cislunarTrajectory,
    interplanetaryTrajectory,
    missionMeta: buildMissionMeta(m, timeline, defaults),
    // Moon missions are 4-12 days vs Mars's 200+. Default 0.4 ×
    // gives a typical lunar phase ~1.5–2 s of playback so the
    // camera auto-zoom has time to read. Mars + outer-system stick
    // with the 7 d/s baseline.
    simSpeed: isMoonMission ? 0.4 : 7,
    missionEvents: mergeFlightEvents(m.events, m.flight?.events),
  };
}

/** Parse a /explore waypoint label like "Venus #1 — gravity assist"
 *  or "Saturn orbit insertion" to a /fly DestinationId. Returns null
 *  when no planet name appears (e.g. unlabeled cruise waypoints). */
function labelToPlanetId(label: string): DestinationId | null {
  const lower = label.toLowerCase();
  const planets: DestinationId[] = [
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
  ];
  for (const p of planets) {
    if (lower.includes(p)) return p;
  }
  if (lower.includes('earth') || lower.includes('launch')) return 'earth' as DestinationId;
  return null;
}

/** Result of applying a LocalizedScenario (e.g. ORRERY DEMO free-
 *  return) to the /fly scene. Narrower than MissionApplyResult: all
 *  scenarios are heliocentric, Mars-bound, free-return; cislunar /
 *  interplanetary trajectories don't apply. */
export interface ScenarioApplyResult {
  timeline: MissionTimeline;
  /** Always true — scenarios are free-return demos. */
  isFreeReturn: true;
  /** Always false — scenarios never run cislunar. */
  isMoonMission: false;
  /** Always 'mars' — current scenario corpus is Mars-bound. */
  activeDestination: DestinationId;
  outPts: Vec2[];
  retPts: Vec2[];
  /** Always null — heliocentric flow. */
  cislunarTrajectory: null;
  /** Always null — synthesised scenarios don't ship structural events. */
  interplanetaryTrajectory: null;
  missionMeta: LoadedMission;
  missionEvents: MissionEvent[];
}

/**
 * Pure scenario → /fly state transition. Used for the default ORRERY
 * DEMO bootstrap and any future free-return teaching scenarios.
 */
export function computeScenarioApply(s: LocalizedScenario): ScenarioApplyResult {
  const timeline: MissionTimeline = {
    dep_day: s.dep_day,
    flyby_day: s.flyby_day,
    arr_day: s.arr_day,
  };
  const activeDestination: DestinationId = 'mars';
  const arcs = buildArcs(timeline, true);
  return {
    timeline,
    isFreeReturn: true,
    isMoonMission: false,
    activeDestination,
    outPts: arcs.out,
    retPts: arcs.ret,
    cislunarTrajectory: null,
    interplanetaryTrajectory: null,
    missionMeta: {
      name: s.name,
      vehicle: s.vehicle,
      payload: s.payload,
      dv_total: s.dv_total_km_s,
      dv_used: s.dv_used_km_s,
      dep_label: s.dep_label,
      arr_label: s.arr_label,
      timeline,
      isFromData: true,
    },
    missionEvents: s.events,
  };
}

/**
 * Closest-approach moment as a fraction of total transit time for
 * LANDING (one-way) plan selections. 0.95 is a teaching simplification
 * — actual closest-approach varies per Lambert solution but isn't
 * returned by the pre-computed porkchop grid. Documented here so a
 * future improvement (real closest-approach from the solver) has a
 * single knob.
 */
export const FLYBY_OFFSET_FRACTION = 0.95;

export type PlanSelectionType = 'LANDING' | 'FLYBY';

export interface PlanApplyDefaults {
  /** Fallback dv (km/s) — used as both dv_total + dv_used×0.94 since
   *  the porkchop grid doesn't return per-mission delta-v. */
  dvFallback: number;
}

export interface PlanApplyResult {
  timeline: MissionTimeline;
  /** FLYBY = free-return; LANDING = one-way. */
  isFreeReturn: boolean;
  /** Always false — /plan flow is heliocentric only. */
  isMoonMission: false;
  activeDestination: DestinationId;
  outPts: Vec2[];
  retPts: Vec2[];
  /** Always null. */
  cislunarTrajectory: null;
  /** Always null — synthesised plan paths don't carry structural events. */
  interplanetaryTrajectory: null;
  missionMeta: LoadedMission;
  /** Always [] — no editorial events. */
  missionEvents: MissionEvent[];
  /** Test-hook signal for the URL-load gate; matches the prior
   *  `plan-<dest>-<type>` shape exactly. */
  appliedId: string;
}

/**
 * Pure /plan selection → /fly state. Used when /fly receives
 * `?dest=...&type=...&dep=N&tof=N` (no `?mission=`), per ADR-026
 * §FLY-button experience.
 *
 * - FLYBY = free-return: outbound terminates at depDay + tof (the
 *   porkchop's TOF is time-to-target); return leg sweeps back to a
 *   synthesised arr_day = dep + 2·tof (approximation — the
 *   porkchop solves outbound only). returnArc geometry adjusts to
 *   whatever Earth position arr_day picks out.
 * - LANDING = one-way: flyby_day at FLYBY_OFFSET_FRACTION·tof for
 *   the visual waypoint, arr_day = dep + tof for landing.
 */
export function computePlanApply(
  dest: DestinationId,
  type: PlanSelectionType,
  depDay: number,
  tofDays: number,
  defaults: PlanApplyDefaults,
): PlanApplyResult {
  const isFlyby = type === 'FLYBY';
  const flybyOffset = isFlyby ? tofDays : Math.floor(tofDays * FLYBY_OFFSET_FRACTION);
  const arrOffset = isFlyby ? tofDays * 2 : tofDays;
  const timeline: MissionTimeline = {
    dep_day: depDay,
    flyby_day: depDay + flybyOffset,
    arr_day: depDay + arrOffset,
  };
  const arcs = buildArcs(timeline, isFlyby, dest);
  const destLabel = dest.charAt(0).toUpperCase() + dest.slice(1);
  return {
    timeline,
    isFreeReturn: isFlyby,
    isMoonMission: false,
    activeDestination: dest,
    outPts: arcs.out,
    retPts: arcs.ret,
    cislunarTrajectory: null,
    interplanetaryTrajectory: null,
    missionMeta: {
      name: `EARTH → ${destLabel.toUpperCase()} · ${type}`,
      vehicle: '—',
      payload: '—',
      dv_total: defaults.dvFallback,
      dv_used: defaults.dvFallback * 0.94,
      dep_label: `Day ${depDay}`,
      arr_label: `Day ${depDay + arrOffset}`,
      timeline,
      isFromData: true,
    },
    missionEvents: [],
    appliedId: `plan-${dest}-${type}`,
  };
}
