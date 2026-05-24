/**
 * Historical Mars-mission trajectory arcs (PRD-014 #PF Step 2b / GH #255).
 *
 * Reads `static/data/missions/mars/*.json` at build/load time, derives
 * a heliocentric transfer-ellipse for each one using `transferEllipse`
 * from `mission-arc.ts`. /fly renders these as faded background arcs
 * so users see the constellation of past + planned Mars missions
 * alongside the active simulation.
 *
 * Epoch: sim-day 0 = 2026-01-01 (matches `src/lib/porkchop.ts:dayToDate`).
 * Historical missions land at negative sim-days, which the orbital
 * mean-motion math handles correctly (periodic).
 */
import { earthPos, marsPos, transferEllipse, type Vec2 } from './mission-arc';

const SIM_EPOCH_MS = new Date(2026, 0, 1).getTime();
const MS_PER_DAY = 86_400_000;

export function dateToSimDay(iso: string): number {
  return Math.round((new Date(iso).getTime() - SIM_EPOCH_MS) / MS_PER_DAY);
}

export interface HistoricalMarsArc {
  id: string;
  name: string;
  agency: string;
  year: number;
  status: string;
  /** Heliocentric trajectory points (units: AU; y plane = ecliptic). */
  points: Vec2[];
  /** Sim-day of departure (negative for missions before 2026). */
  depDay: number;
  /** Sim-day of arrival. */
  arrDay: number;
}

export interface MarsMissionInput {
  id: string;
  agency?: string;
  agency_full?: string;
  year?: number;
  status?: string;
  departure_date?: string | null;
  arrival_date?: string | null;
  name?: string;
}

/**
 * Build heliocentric trajectory arcs for every Mars mission with a
 * departure_date + arrival_date pair. Skips missions missing either
 * date (planned-only or research-stage missions).
 *
 * @param missions Array of mission JSONs from static/data/missions/mars/
 * @param steps Number of points per arc (default 96 — smoother than active /fly arc at 64 since these aren't animated).
 */
export function buildHistoricalMarsArcs(
  missions: ReadonlyArray<MarsMissionInput>,
  steps: number = 96,
): HistoricalMarsArc[] {
  const out: HistoricalMarsArc[] = [];
  for (const m of missions) {
    if (!m.departure_date || !m.arrival_date) continue;
    const depDay = dateToSimDay(m.departure_date);
    const arrDay = dateToSimDay(m.arrival_date);
    if (!Number.isFinite(depDay) || !Number.isFinite(arrDay)) continue;
    const earthDep = earthPos(depDay);
    const marsArr = marsPos(arrDay);
    const points = transferEllipse(earthDep, marsArr, steps);
    out.push({
      id: m.id,
      name: m.name ?? m.id,
      agency: m.agency ?? 'unknown',
      year: m.year ?? new Date(m.departure_date).getFullYear(),
      status: m.status ?? 'unknown',
      points,
      depDay,
      arrDay,
    });
  }
  return out;
}

/** Per-status color tints — keeps successful flights neutral white,
 *  failed missions slightly red-tinged, planned missions teal. Match
 *  the broader app palette. RGB in [0,1]. */
export function arcColorForStatus(status: string): [number, number, number] {
  const s = status.toUpperCase();
  if (s === 'FLOWN' || s === 'ACTIVE' || s === 'COMPLETE') return [0.9, 0.9, 0.95];
  if (s === 'FAILED' || s === 'LOST') return [0.95, 0.55, 0.55];
  if (s === 'PLANNED' || s === 'CONCEPT') return [0.5, 0.9, 0.95];
  return [0.7, 0.7, 0.7];
}
