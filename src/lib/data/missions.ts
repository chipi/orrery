import { get, type FetchLike } from './core';
import type { Destination, Mission, MissionIndex } from '$types/mission';

export async function getMissionIndex(fetchFn: FetchLike = fetch): Promise<MissionIndex[]> {
  return get<MissionIndex[]>('missions/index.json', fetchFn);
}

export async function getMission(
  id: string,
  dest: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<Mission | null> {
  const destLower = dest.toLowerCase();
  try {
    const baseRecord = await get<Mission>(`missions/${destLower}/${id}.json`, fetchFn);
    const overlay = await get<Partial<Mission>>(
      `i18n/${locale}/missions/${destLower}/${id}.json`,
      fetchFn,
    ).catch(() => ({}) as Partial<Mission>);
    const merged: Mission = { ...baseRecord, ...overlay };

    // Inject translated label / description into `flight.events[]` for
    // non-en-US locales (2026-06-22 — #358 micro-enhancement
    // "make sure they are translated in all languages"). The overlay
    // ships an editorial `events[]` array with shape `{met, label,
    // note}`; map it onto the structural `flight.events[]` by MET so
    // downstream consumers (milestone tooltip, PhaseMarkerLabel,
    // FlightDirectorBanner) get translated copy without their own
    // overlay-merge code. en-US is skipped to preserve the rich
    // base descriptions (the overlay is intentionally terser/curated
    // for the CAPCOM ticker; the tooltip wants the full prose).
    if (
      locale !== 'en-US' &&
      Array.isArray(overlay.events) &&
      Array.isArray(baseRecord.flight?.events)
    ) {
      const TOL = 0.05; // days
      const overlayEvents = overlay.events as Array<{
        met?: number;
        label?: string;
        note?: string;
      }>;
      const mergedEvents = baseRecord.flight.events.map((evt) => {
        if (evt.met_days == null) return evt;
        let ov = overlayEvents.find((o) => o.met === evt.met_days);
        if (!ov) ov = overlayEvents.find((o) => Math.abs((o.met ?? -1) - evt.met_days!) <= TOL);
        if (!ov) return evt;
        return {
          ...evt,
          label: ov.label ?? evt.label,
          description: ov.note ?? evt.description,
        };
      });
      merged.flight = { ...baseRecord.flight, events: mergedEvents };
    }
    return merged;
  } catch {
    return null;
  }
}

export interface MissionFilter {
  dest?: Destination;
  status?: 'ACTIVE' | 'FLOWN' | 'PLANNED';
  agency?: string;
}

export async function filterMissions(filters: MissionFilter = {}): Promise<MissionIndex[]> {
  const all = await getMissionIndex();
  return all.filter(
    (m) =>
      (!filters.dest || m.dest === filters.dest) &&
      (!filters.status || m.status === filters.status) &&
      (!filters.agency || m.agency === filters.agency),
  );
}

/**
 * Returns every mission with its locale overlay merged. Used by the
 * /missions library to render cards with the editorial fields (name,
 * type, first) without having to round-trip per-card.
 *
 * Fetches in parallel — 36 missions × ~2 KB each = ~72 KB total, well
 * within reason for a one-shot library load. The cache then services
 * any subsequent `getMission(id, dest)` call instantly.
 */
export async function getMissionsForLibrary(locale = 'en-US'): Promise<Mission[]> {
  const index = await getMissionIndex();
  const missions = await Promise.all(
    index.map(async (entry) => {
      const merged = await getMission(entry.id, entry.dest, locale);
      // Fall back to the index entry if the per-mission file is missing
      // for some reason — better an under-decorated card than a crash.
      return merged ?? ({ ...entry } as Mission);
    }),
  );
  return missions;
}
