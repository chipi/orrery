import type { MissionEvent } from './mission';

/**
 * A synthesized teaching trajectory (e.g., ORRERY-1 free-return).
 * Distinct from historical missions — scenarios live in
 * `static/data/scenarios/` and never appear in the mission library;
 * they're flown via /fly?mission=[id] only.
 *
 * The base record (Scenario) carries language-neutral physical
 * parameters; the overlay (ScenarioOverlay) carries every user-facing
 * string per ADR-017's editorial-content rule.
 */
export interface Scenario {
  id: string;
  vehicle: string;
  payload: string;
  dep_day: number;
  flyby_day: number;
  arr_day: number;
  dv_total_km_s: number;
  dv_used_km_s: number;
}

export interface ScenarioOverlay {
  name: string;
  dep_label: string;
  arr_label: string;
  events: MissionEvent[];
}

/** A scenario merged with its locale overlay — the shape /fly consumes. */
export interface LocalizedScenario extends Scenario, ScenarioOverlay {}
