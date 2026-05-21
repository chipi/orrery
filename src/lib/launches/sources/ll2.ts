/**
 * `LL2Source` — Launch Library 2 (TheSpaceDevs), priority 90, fallback-only.
 *
 * LL2 is the de-facto public aggregator. Per PRD-020's "we're not building
 * a UI for someone else's database" posture, LL2 is the LAST provider the
 * orchestrator consults and `fallback-primary` is its default role (used
 * only when no agency-direct source covered the launch).
 *
 * Free tier: 15 req/hour anonymous. We paginate at the max page size
 * (100) and respect Retry-After on 429.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildStableId } from '../id.js';
import type { LaunchSource, LaunchSourceAttribution, LaunchSourceWindow } from './provider.js';
import type {
  LaunchNetPrecision,
  LaunchStatus,
  LaunchStatusCode,
  RawLaunchEntry,
} from '../types.js';

export const LL2_BASE = 'https://ll.thespacedevs.com/2.3.0';
const CACHE_ROOT = '.launches-cache/ll2';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 8; // 800 entries max — well over typical ~350 upcoming queue.

const STATUS_MAP: Record<number, LaunchStatusCode> = {
  1: 'GO',
  2: 'TBD',
  3: 'SUCCESS',
  4: 'FAILURE',
  5: 'HOLD',
  6: 'IN_FLIGHT',
  7: 'PARTIAL',
  8: 'TBD',
};

function mapLL2Status(raw: { id?: number; name?: string; abbrev?: string }): LaunchStatus {
  const code = raw?.id != null ? STATUS_MAP[raw.id] : undefined;
  return {
    code: code ?? 'TBD',
    label: raw?.name ?? raw?.abbrev ?? 'Unknown',
  };
}

function mapLL2NetPrecision(raw: { name?: string } | undefined): LaunchNetPrecision {
  const n = raw?.name?.toLowerCase() ?? 'minute';
  if (n.includes('second')) return 'second';
  if (n.includes('hour')) return 'hour';
  if (n.includes('day')) return 'day';
  if (n.includes('month')) return 'month';
  if (n.includes('year')) return 'year';
  return 'minute';
}

function mapLL2Agency(
  lsp:
    | {
        id?: number;
        name?: string;
        type?: { name?: string };
        country?: Array<{ alpha_2_code?: string }>;
      }
    | undefined,
): {
  agency_id: string;
  agency_name: string;
  agency_type: RawLaunchEntry['agency_type'];
  country?: string;
} {
  const typeName = (lsp?.type?.name ?? 'Unknown') as string;
  const type = (
    ['Government', 'Commercial', 'Educational', 'Multinational'].includes(typeName)
      ? typeName
      : 'Unknown'
  ) as RawLaunchEntry['agency_type'];
  return {
    agency_id: lsp?.id != null ? `ll2-${lsp.id}` : 'unknown',
    agency_name: lsp?.name ?? 'Unknown',
    agency_type: type,
    country: lsp?.country?.[0]?.alpha_2_code,
  };
}

type LL2LaunchRaw = {
  id: string;
  url?: string;
  name: string;
  net: string;
  net_precision?: { name?: string };
  status?: { id?: number; name?: string; abbrev?: string };
  window_start?: string;
  window_end?: string;
  mission?: {
    name?: string;
    type?: string;
    orbit?: { name?: string; abbrev?: string };
  };
  launch_service_provider?: {
    id?: number;
    name?: string;
    type?: { name?: string };
    country?: Array<{ alpha_2_code?: string }>;
  };
  rocket?: {
    configuration?: {
      id?: number;
      full_name?: string;
      name?: string;
      family?: string | null;
    };
  };
  pad?: {
    name?: string;
    location?: { name?: string };
  };
  image?: { image_url?: string; credit?: string } | string | null;
  webcast_live?: boolean;
};

/**
 * Maps one LL2 launch payload to RawLaunchEntry. Pure function (no fs/network).
 * Exported for parser tests.
 */
export function ll2RawToRawEntry(
  raw: LL2LaunchRaw,
  source_observed_at: string,
): RawLaunchEntry | null {
  if (!raw?.id || !raw?.net) return null;
  const isoMatch = raw.net.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  if (!isoMatch) return null;
  const iso = new Date(raw.net).toISOString();

  const lvFull =
    raw.rocket?.configuration?.full_name ?? raw.rocket?.configuration?.name ?? 'Unknown vehicle';
  const lvFamily = raw.rocket?.configuration?.family ?? raw.rocket?.configuration?.name ?? lvFull;
  const missionName = raw.mission?.name ?? raw.name ?? 'Unknown mission';

  const agency = mapLL2Agency(raw.launch_service_provider);
  const imageObj = typeof raw.image === 'object' && raw.image != null ? raw.image : null;

  return {
    id: buildStableId({
      iso,
      rocketFamily: lvFamily,
      missionName,
    }),
    net: iso,
    net_precision: mapLL2NetPrecision(raw.net_precision),
    window_start: raw.window_start ? new Date(raw.window_start).toISOString() : undefined,
    window_end: raw.window_end ? new Date(raw.window_end).toISOString() : undefined,
    status: mapLL2Status(raw.status ?? {}),
    name: raw.name,
    mission_name: raw.mission?.name,
    mission_type: raw.mission?.type,
    orbit_abbrev: raw.mission?.orbit?.abbrev,
    orbit_name: raw.mission?.orbit?.name,
    ...agency,
    rocket_config_id: raw.rocket?.configuration?.id?.toString(),
    rocket_config_name: lvFull,
    rocket_family: lvFamily,
    pad_name: raw.pad?.name,
    pad_location: raw.pad?.location?.name,
    image_url: imageObj?.image_url || undefined,
    image_credit: imageObj?.credit || undefined,
    webcast_live: raw.webcast_live ?? false,
    source_observed_at,
    source_name: 'll2',
    source_url: raw.url,
  };
}

async function fetchLL2Page(
  endpoint: string,
): Promise<{ results: LL2LaunchRaw[]; next: string | null }> {
  const res = await fetch(endpoint);
  if (res.status === 429) {
    const wait = Number(res.headers.get('retry-after') ?? '60') * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return fetchLL2Page(endpoint);
  }
  if (!res.ok) throw new Error(`LL2 ${endpoint}: ${res.status} ${res.statusText}`);
  return (await res.json()) as { results: LL2LaunchRaw[]; next: string | null };
}

function cacheKey(input: LaunchSourceWindow): string {
  return join(
    CACHE_ROOT,
    `${input.mode}-${input.fromIso.slice(0, 10)}_${input.toIso.slice(0, 10)}.json`,
  );
}

async function fetchLL2WithCache(input: LaunchSourceWindow): Promise<LL2LaunchRaw[]> {
  const cachePath = cacheKey(input);
  if (existsSync(cachePath)) {
    const age = Date.now() - statSync(cachePath).mtimeMs;
    if (age < ONE_DAY_MS / 4) {
      return JSON.parse(readFileSync(cachePath, 'utf8')) as LL2LaunchRaw[];
    }
  }
  mkdirSync(dirname(cachePath), { recursive: true });
  const endpoint =
    input.mode === 'upcoming'
      ? `${LL2_BASE}/launches/upcoming/?format=json&limit=${PAGE_LIMIT}`
      : `${LL2_BASE}/launches/previous/?format=json&limit=${PAGE_LIMIT}&net__gte=${input.fromIso}&net__lt=${input.toIso}`;
  const all: LL2LaunchRaw[] = [];
  let url: string | null = endpoint;
  let pages = 0;
  try {
    while (url && pages < MAX_PAGES) {
      const page = await fetchLL2Page(url);
      all.push(...page.results);
      url = page.next;
      pages++;
    }
    writeFileSync(cachePath, JSON.stringify(all, null, 2), 'utf8');
  } catch (e) {
    if (existsSync(cachePath)) {
      return JSON.parse(readFileSync(cachePath, 'utf8')) as LL2LaunchRaw[];
    }
    throw e;
  }
  return all;
}

export class LL2Source implements LaunchSource {
  readonly name = 'll2';
  readonly priority = 90;
  readonly mode = 'both';
  readonly defaultRole = 'fallback-primary';

  constructor(
    private readonly downloader: (
      input: LaunchSourceWindow,
    ) => Promise<LL2LaunchRaw[]> = fetchLL2WithCache,
  ) {}

  async fetchWindow(input: LaunchSourceWindow): Promise<RawLaunchEntry[]> {
    // v0.1: only upcoming. Historic = GCAT primary; LL2 historic comes
    // online in v0.2 augmentation pass.
    if (input.mode !== 'upcoming') return [];
    const raws = await this.downloader(input);
    const observed_at = new Date().toISOString();
    const fromMs = Date.parse(input.fromIso);
    const toMs = Date.parse(input.toIso);
    const entries: RawLaunchEntry[] = [];
    for (const r of raws) {
      const e = ll2RawToRawEntry(r, observed_at);
      if (!e) continue;
      const t = Date.parse(e.net);
      if (t >= fromMs && t < toMs) entries.push(e);
    }
    return entries;
  }

  attribution(): LaunchSourceAttribution {
    return {
      citation: 'Launch Library 2 — The Space Devs (CC-BY-style permissive)',
      url: 'https://thespacedevs.com/llapi',
      license: 'permissive',
      citation_id: 'll2-thespacedevs',
    };
  }
}
