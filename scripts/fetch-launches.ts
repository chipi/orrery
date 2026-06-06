/**
 * Orchestrator for the v0.7 Launches Calendar (PRD-020 / RFC-023 §1+§4).
 *
 * Pulls every registered `LaunchSource` in priority order, dedupes by
 * stable Orrery-internal id, merges with first-seen-wins, applies the
 * curation override file, writes the manifest files + an audit-report
 * stub.
 *
 * v0.1 ships with two providers: GcatSource (historic primary) and
 * LL2Source (upcoming fallback). Agency-direct providers (NASA, SpaceX,
 * ESA) land in slices S4 / S5 / S6.
 *
 * Run via `npm run fetch:launches`.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { GcatSource, GCAT_RELEASE_PIN } from '../src/lib/launches/sources/gcat.js';
import { LL2Source } from '../src/lib/launches/sources/ll2.js';
import { NasaSource } from '../src/lib/launches/sources/nasa.js';
import { SpaceXSource } from '../src/lib/launches/sources/spacex.js';
import { EsaSource } from '../src/lib/launches/sources/esa.js';
import { mergeAllContributions, type SourceContribution } from '../src/lib/launches/merge.js';
import {
  buildFirstFlightMap,
  computeTier,
  type CurationFile as TierCurationFile,
} from '../src/lib/launches/tier.js';
import type { LaunchSource } from '../src/lib/launches/sources/provider.js';
import type { RawLaunchEntry } from '../src/lib/launches/types.js';
import { resolveSpacecraftRefs } from '../src/lib/launches/resolve-spacecraft-refs.js';

const DATA_ROOT = 'static/data';
const HISTORIC_DIR = join(DATA_ROOT, 'launches-historic');

type CurationFile = {
  version: 1;
  featured: Array<{ launch_id: string; reason: string; editorial_note?: string }>;
  demoted: Array<{ launch_id: string; reason: string }>;
};

type RocketMappingFile = {
  version: 1;
  families: Record<string, string>;
  config_exceptions?: Record<string, string>;
};

type CatalogMission = { id: string; year: number };

type ManifestEntry = Omit<RawLaunchEntry, 'source_name' | 'source_url' | 'source_observed_at'> & {
  orrery_launcher_ref: string | null;
  orrery_mission_ref: string | null;
  orrery_spacecraft_refs?: string[];
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  tier_reason: string;
  editorial_note: string | null;
  provenance_chain: Array<{
    source: string;
    source_url?: string;
    fetched_at: string;
    role: 'primary' | 'confirmed-via' | 'augmented-with' | 'fallback-primary';
  }>;
  fetched_at: string;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function decadeKey(iso: string): string {
  const year = Number(iso.slice(0, 4));
  if (year < 1970) return '1957-1969';
  if (year < 1980) return '1970-1979';
  if (year < 1990) return '1980-1989';
  if (year < 2000) return '1990-1999';
  if (year < 2010) return '2000-2009';
  if (year < 2020) return '2010-2019';
  return '2020-2026';
}

function resolveLauncherRef(
  rocketConfigName: string,
  rocketFamily: string,
  mapping: RocketMappingFile,
): string | null {
  return (
    mapping.config_exceptions?.[rocketConfigName] ??
    mapping.families[rocketFamily] ??
    mapping.families[rocketConfigName] ??
    null
  );
}

/**
 * Conservative best-effort match against the 37-mission catalogue
 * (PRD-020 M17). Returns the matching mission id when:
 *   - the launch entry's year equals the catalogue mission's year, AND
 *   - the catalogue id (normalised to lowercase alphanumeric) appears
 *     as a substring of the launch entry's name + mission_name (same
 *     normalisation).
 * False-positives must NOT happen, so the heuristic intentionally
 * misses launches like Apollo 11 whose LL2/GCAT name is "Apollo CM-107".
 */
function normaliseForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findCatalogMatch(
  entry: { net: string; name: string; mission_name?: string },
  catalogue: CatalogMission[],
): string | null {
  const year = new Date(entry.net).getUTCFullYear();
  const haystack = normaliseForMatch(`${entry.name} ${entry.mission_name ?? ''}`);
  for (const m of catalogue) {
    if (m.year !== year) continue;
    const id = normaliseForMatch(m.id);
    if (id.length >= 4 && haystack.includes(id)) return m.id;
  }
  return null;
}

function loadCatalogue(): CatalogMission[] {
  try {
    const idx = readJson<Array<{ id: string; year: number }>>(
      join(DATA_ROOT, 'missions', 'index.json'),
    );
    return idx.map((m) => ({ id: m.id, year: m.year }));
  } catch {
    return [];
  }
}

async function pullSource(
  source: LaunchSource,
  window: { mode: 'upcoming' | 'historic'; fromIso: string; toIso: string },
): Promise<RawLaunchEntry[]> {
  try {
    return await source.fetchWindow(window);
  } catch (e) {
    console.error(`  ! ${source.name} (${window.mode}) failed:`, (e as Error).message);
    return [];
  }
}

async function main(): Promise<void> {
  const now = new Date();
  const generatedAt = now.toISOString();
  console.log(`[fetch-launches] start ${generatedAt}`);

  const curation = readJson<CurationFile>(join(DATA_ROOT, 'launches-curation.json'));
  const rocketMapping = readJson<RocketMappingFile>(
    join(DATA_ROOT, 'launches-rocket-mapping.json'),
  );

  // ── Phase 1+2: pull providers in priority order ─────────────────
  const sources: LaunchSource[] = [
    new NasaSource(),
    new SpaceXSource(),
    new EsaSource(),
    new GcatSource(),
    new LL2Source(),
  ];
  sources.sort((a, b) => a.priority - b.priority);

  const upcomingWindow = {
    mode: 'upcoming' as const,
    fromIso: now.toISOString(),
    toIso: new Date(now.getFullYear() + 5, 11, 31).toISOString(),
  };
  const historicWindow = {
    mode: 'historic' as const,
    fromIso: '1957-01-01T00:00:00.000Z',
    toIso: now.toISOString(),
  };

  const upcomingContribs: SourceContribution[] = [];
  const historicContribs: SourceContribution[] = [];
  const sourcesActive = new Set<string>();

  for (const s of sources) {
    if (s.mode === 'upcoming' || s.mode === 'both') {
      const entries = await pullSource(s, upcomingWindow);
      if (entries.length > 0) {
        upcomingContribs.push({
          source_name: s.name,
          default_role: s.defaultRole,
          entries,
        });
        sourcesActive.add(s.name);
        console.log(`  ✓ ${s.name} upcoming: ${entries.length} entries`);
      }
    }
    if (s.mode === 'historic' || s.mode === 'both') {
      const entries = await pullSource(s, historicWindow);
      if (entries.length > 0) {
        historicContribs.push({
          source_name: s.name,
          default_role: s.defaultRole,
          entries,
        });
        sourcesActive.add(s.name);
        console.log(`  ✓ ${s.name} historic: ${entries.length} entries`);
      }
    }
  }

  // ── Phase 3: merge by stable id ─────────────────────────────────
  const { merged: mergedUpcoming } = mergeAllContributions(upcomingContribs);
  const { merged: mergedHistoric } = mergeAllContributions(historicContribs);

  // First-flight detection runs across both upcoming + historic so an
  // upcoming first-flight of a brand-new vehicle is tagged even when its
  // historic neighbours come from GCAT.
  const allEntries = [
    ...Object.values(mergedUpcoming).map((m) => m.entry),
    ...Object.values(mergedHistoric).map((m) => m.entry),
  ];
  const firstFlightByConfig = buildFirstFlightMap(allEntries);
  const tierContext = { firstFlightByConfig };
  const catalogue = loadCatalogue();

  // ── Phase 4+5: tier + curation + provenance_chain ───────────────
  function enrich(
    mergedMap: Record<string, ReturnType<typeof mergeAllContributions>['merged'][string]>,
  ): Record<string, ManifestEntry> {
    const out: Record<string, ManifestEntry> = {};
    for (const [id, m] of Object.entries(mergedMap)) {
      const tierBits = computeTier(m.entry, curation as TierCurationFile, tierContext);
      const launcherRef = resolveLauncherRef(
        m.entry.rocket_config_name,
        m.entry.rocket_family,
        rocketMapping,
      );
      // Strip the merge book-keeping fields (source_name / source_url /
      // source_observed_at) — they're not part of the manifest schema.
      // Provenance is fully expressed via provenance_chain.
      const {
        source_name: _src,
        source_observed_at: observed,
        source_url: _url,
        ...flat
      } = m.entry;
      void _src;
      void _url;
      const missionRef = findCatalogMatch(
        { net: m.entry.net, name: m.entry.name, mission_name: m.entry.mission_name },
        catalogue,
      );
      const spacecraftRefs = resolveSpacecraftRefs(launcherRef, m.entry.mission_name, m.entry.name);
      const entry: ManifestEntry = {
        ...(flat as Omit<RawLaunchEntry, 'source_name' | 'source_url' | 'source_observed_at'>),
        orrery_launcher_ref: launcherRef,
        orrery_mission_ref: missionRef,
        ...(spacecraftRefs.length > 0 ? { orrery_spacecraft_refs: spacecraftRefs } : {}),
        ...tierBits,
        provenance_chain: m.provenance_chain,
        fetched_at: observed,
      } as ManifestEntry;
      out[id] = entry;
    }
    return out;
  }

  const upcomingEntries = enrich(mergedUpcoming);
  const historicEntries = enrich(mergedHistoric);

  // ── Phase 6: write manifest files ───────────────────────────────
  const upcomingManifest = {
    version: 1 as const,
    generated_at: generatedAt,
    sources_active: [...sourcesActive].sort(),
    gcat_release: sourcesActive.has('gcat') ? GCAT_RELEASE_PIN : undefined,
    entries: upcomingEntries,
  };
  writeJson(join(DATA_ROOT, 'launches.json'), upcomingManifest);
  console.log(`  ✓ launches.json — ${Object.keys(upcomingEntries).length} upcoming entries`);

  // Page historic per decade for git friendliness.
  const byDecade: Record<string, Record<string, ManifestEntry>> = {};
  for (const [id, e] of Object.entries(historicEntries)) {
    const dk = decadeKey(e.net);
    byDecade[dk] = byDecade[dk] ?? {};
    byDecade[dk][id] = e;
  }
  mkdirSync(HISTORIC_DIR, { recursive: true });
  for (const [decade, entries] of Object.entries(byDecade)) {
    writeJson(join(HISTORIC_DIR, `${decade}.json`), {
      version: 1,
      generated_at: generatedAt,
      sources_active: [...sourcesActive].sort(),
      gcat_release: sourcesActive.has('gcat') ? GCAT_RELEASE_PIN : undefined,
      entries,
    });
    console.log(`  ✓ launches-historic/${decade}.json — ${Object.keys(entries).length} entries`);
  }

  console.log('[fetch-launches] done.');
}

main().catch((e) => {
  console.error('[fetch-launches] fatal:', e);
  process.exit(1);
});
