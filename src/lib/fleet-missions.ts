import type { FleetFlight } from '$types/fleet';

/** One line of an entry's Missions list. `missionId` is set only when the mission is in the catalogue. */
export type FleetMissionRow = {
  key: string;
  missionId: string | null;
  title: string;
  sub: string | null;
  agency: string | null;
  crew: string[];
};

type IndexRow = { id: string; year: number; agency: string };

/**
 * The missions of one fleet entry as a single list: the union of its flights and its
 * linked_missions, oldest first. A mission that exists gets its name (via `missionName`, which
 * knows the locale) and its year; a flight whose mission is not in the catalogue keeps the
 * flight designation as plain text. Panel tab, OVERVIEW count and /fleet/<id> all read this one
 * list, so they cannot disagree.
 */
export function fleetMissionRows(
  entry: { flights?: FleetFlight[]; linked_missions?: string[] },
  missionIndex: readonly IndexRow[],
  missionName: (id: string) => string | undefined,
): FleetMissionRow[] {
  const known = new Map(missionIndex.map((m) => [m.id, m]));
  const flights = new Map((entry.flights ?? []).map((f) => [f.mission_id, f]));
  const keys = [...new Set([...flights.keys(), ...(entry.linked_missions ?? [])])];

  const rows = keys.map((key) => {
    const flight = flights.get(key);
    const mission = known.get(key);
    const crew = (flight?.crew ?? []).map((c) => c.name);
    if (mission) {
      const row: FleetMissionRow = {
        key,
        missionId: key,
        title: missionName(key) ?? key,
        sub: String(mission.year),
        agency: mission.agency,
        crew,
      };
      return { row, year: mission.year };
    }
    // Designations read "Demo-2 (2020-05-30) · first commercial human spaceflight".
    const [head, ...rest] = (flight?.flight_designation ?? key).split(' · ');
    const year = Number(/\b(\d{4})\b/.exec(head)?.[1] ?? NaN);
    const row: FleetMissionRow = {
      key,
      missionId: null,
      title: head,
      sub: rest.join(' · ') || null,
      agency: null,
      crew,
    };
    return { row, year: Number.isFinite(year) ? year : Infinity };
  });
  // Array#sort is stable: rows of one year keep flights-first order.
  return rows.sort((a, b) => a.year - b.year).map((r) => r.row);
}
