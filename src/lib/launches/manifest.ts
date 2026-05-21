/**
 * Frontend manifest loader (PRD-020 / RFC-023 §8.1).
 *
 * Loads `launches.json` (upcoming) at first paint via Vite static-asset
 * import; lazy-loads per-decade `launches-historic/<decade>.json` on
 * year-range filter change.
 *
 * No runtime third-party API calls — ADR-016 strictly respected.
 */

import { base } from '$app/paths';

export type Tier = 'T1' | 'T2' | 'T3' | 'T4';

export type ProvenanceLink = {
  source: string;
  source_url?: string;
  fetched_at: string;
  role: 'primary' | 'confirmed-via' | 'augmented-with' | 'fallback-primary';
};

export type LaunchEntry = {
  id: string;
  net: string;
  net_precision: string;
  window_start?: string;
  window_end?: string;
  status: { code: string; label: string };
  name: string;
  mission_name?: string;
  mission_type?: string;
  orbit_abbrev?: string;
  orbit_name?: string;
  agency_id?: string;
  agency_name: string;
  agency_type?: string;
  country?: string;
  rocket_config_name: string;
  rocket_family: string;
  orrery_launcher_ref: string | null;
  orrery_mission_ref?: string | null;
  pad_name?: string;
  pad_location?: string;
  image_url?: string;
  image_credit?: string;
  webcast_live?: boolean;
  tier: Tier;
  tier_reason: string;
  editorial_note: string | null;
  provenance_chain: ProvenanceLink[];
  fetched_at: string;
};

export type Manifest = {
  version: 1;
  generated_at: string | null;
  sources_active: string[];
  gcat_release?: string;
  entries: Record<string, LaunchEntry>;
};

export async function loadUpcoming(): Promise<Manifest> {
  const res = await fetch(`${base}/data/launches.json`);
  if (!res.ok) {
    return { version: 1, generated_at: null, sources_active: [], entries: {} };
  }
  return (await res.json()) as Manifest;
}

export async function loadHistoricDecade(decade: string): Promise<Manifest> {
  const res = await fetch(`${base}/data/launches-historic/${decade}.json`);
  if (!res.ok) {
    return { version: 1, generated_at: null, sources_active: [], entries: {} };
  }
  return (await res.json()) as Manifest;
}

export function decadeForYear(year: number): string {
  if (year < 1970) return '1957-1969';
  if (year < 1980) return '1970-1979';
  if (year < 1990) return '1980-1989';
  if (year < 2000) return '1990-1999';
  if (year < 2010) return '2000-2009';
  if (year < 2020) return '2010-2019';
  return '2020-2026';
}

export const ALL_DECADES = [
  '1957-1969',
  '1970-1979',
  '1980-1989',
  '1990-1999',
  '2000-2009',
  '2010-2019',
  '2020-2026',
] as const;

/** Format ISO date → "MMM YYYY" or "MMM DD, YYYY" or T-0 countdown. */
export function formatNet(iso: string, precision: string): string {
  const dt = new Date(iso);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (precision === 'year') return String(dt.getUTCFullYear());
  if (precision === 'month') return `${months[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  if (precision === 'day') {
    return `${months[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
  }
  // minute / second / hour: show HH:MM UTC
  const h = String(dt.getUTCHours()).padStart(2, '0');
  const m = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${months[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()} ${h}:${m}Z`;
}

/** Build a "T-0 in 2d 4h" countdown string for upcoming launches. */
export function formatCountdown(iso: string, now = new Date()): string {
  const target = new Date(iso).getTime();
  const ms = target - now.getTime();
  if (ms < 0) return 'in flight';
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d >= 1) return `T-0 in ${d}d ${h}h`;
  if (h >= 1) return `T-0 in ${h}h ${m}m`;
  return `T-0 in ${m}m`;
}

/** Group entries by YYYY-MM for the month strip / timeline rendering. */
export function groupByMonth(
  entries: LaunchEntry[],
): Array<{ key: string; label: string; entries: LaunchEntry[] }> {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const map = new Map<string, LaunchEntry[]>();
  for (const e of entries) {
    const dt = new Date(e.net);
    const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  const out: Array<{ key: string; label: string; entries: LaunchEntry[] }> = [];
  for (const [key, list] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [y, m] = key.split('-');
    out.push({
      key,
      label: `${months[Number(m) - 1]} '${y.slice(2)}`,
      entries: list.sort((a, b) => a.net.localeCompare(b.net)),
    });
  }
  return out;
}
