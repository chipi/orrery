/**
 * Pure-function helpers extracted from `validate-data.ts` so they can be
 * unit-tested without the file-system + ajv + console-error scaffolding.
 *
 * Anything in this file MUST be a pure function: no `readFileSync`, no
 * `console.*`, no `process.exit`, no state. Caller wires the side
 * effects (logging + counters + exit code) in `validate-data.ts`.
 *
 * Slice S3 of the test-coverage gap-closure plan. Covers:
 *
 * - ADR-046 / ADR-047 image-provenance license waivers (`isWaived`)
 * - ADR-052 bidirectional fleet ↔ missions cross-reference drift
 * - ADR-052 bidirectional fleet ↔ sites/earth-objects cross-reference drift
 */

// ─── Image-provenance license waiver matching ────────────────────────

/**
 * One row from `static/data/license-waivers.json` — narrowly scoped
 * carve-out for a single image path, a glob prefix (`scope` ending in
 * `/*`), or every image carrying a given license (`scope === 'all'`).
 */
export type LicenseWaiver = {
  license_short: string;
  scope: string;
};

/**
 * Returns true when `licenseShort` is permitted for image `path` via at
 * least one waiver in `waivers`. Used by ADR-047 image-provenance
 * integrity check after the license-allowlist check fails — the waiver
 * is the explicit carve-out for restricted-license partners (e.g.
 * airandspacehistory.com per ADR-053).
 *
 * Scope semantics:
 *   - `'all'`        — every path with this license
 *   - `'<exact>'`    — only the exact path
 *   - `'<prefix>/*'` — every path starting with `<prefix>/`
 */
export function isWaived(waivers: LicenseWaiver[], licenseShort: string, path: string): boolean {
  return waivers.some((w) => {
    if (w.license_short !== licenseShort) return false;
    if (w.scope === 'all') return true;
    if (w.scope === path) return true;
    if (w.scope.endsWith('/*')) return path.startsWith(w.scope.slice(0, -2));
    return false;
  });
}

// ─── ADR-052 bidirectional cross-reference drift detection ───────────

export type FleetRole = 'launcher' | 'spacecraft' | 'payload' | 'station';
export type FleetRef = { id: string; role: FleetRole };
export type FleetEntryMinimal = {
  id: string;
  category: string;
  linked_missions?: string[];
  linked_sites?: Array<{ type: 'moon' | 'mars' | 'earth-object'; site_id: string }>;
};

/**
 * Three kinds of bidirectional-drift error the validator surfaces.
 * `kind` drives which message template `validate-data.ts` formats; the
 * fields below carry the data needed to format it. All identifying
 * fields are string-typed so callers can plug them into a template
 * without further lookups.
 */
export type FleetMissionDriftError =
  | {
      kind: 'fleet-linked-mission-unresolved';
      fleet_id: string;
      fleet_category: string;
      missing_mission_id: string;
    }
  | {
      kind: 'mission-fleet-ref-unresolved';
      mission_id: string;
      fleet_id: string;
      role: FleetRole;
    }
  | {
      kind: 'bidirectional-drift-mission';
      mission_id: string;
      fleet_id: string;
      role: FleetRole;
    };

/**
 * Pure drift detector for the fleet ↔ missions bidirectional contract
 * (ADR-052; RFC-016 OQ-2). Three checks, in order:
 *
 *   1. Every `fleet_entry.linked_missions[*]` resolves to a real mission.
 *      → `fleet-linked-mission-unresolved`
 *   2. Every `mission.fleet_refs[*].id` resolves to a real fleet entry.
 *      → `mission-fleet-ref-unresolved`
 *   3. SYMMETRY — if mission M references fleet F via `fleet_refs`, then
 *      F's `linked_missions` MUST include M.
 *      → `bidirectional-drift-mission`
 *
 * Returns an empty array when the contract holds. The order of returned
 * errors matches the order `validate-data.ts` emits them today so
 * console output stays byte-identical post-refactor.
 */
export function findBidirectionalFleetMissionDrift(args: {
  missionIds: ReadonlySet<string>;
  missionFleetRefs: ReadonlyMap<string, ReadonlyArray<FleetRef>>;
  fleetEntries: ReadonlyArray<FleetEntryMinimal>;
}): FleetMissionDriftError[] {
  const { missionIds, missionFleetRefs, fleetEntries } = args;
  const errors: FleetMissionDriftError[] = [];

  const fleetIdsSet = new Set(fleetEntries.map((e) => e.id));
  const fleetLinkedMissions = new Map<string, Set<string>>(
    fleetEntries.map((e) => [e.id, new Set(e.linked_missions ?? [])]),
  );

  // Check 1: fleet → missions
  for (const entry of fleetEntries) {
    if (!entry.linked_missions || entry.linked_missions.length === 0) continue;
    for (const mid of entry.linked_missions) {
      if (!missionIds.has(mid)) {
        errors.push({
          kind: 'fleet-linked-mission-unresolved',
          fleet_id: entry.id,
          fleet_category: entry.category,
          missing_mission_id: mid,
        });
      }
    }
  }

  // Checks 2 + 3: missions.fleet_refs → fleet, and symmetric inclusion.
  for (const [missionId, refs] of missionFleetRefs.entries()) {
    for (const ref of refs) {
      if (!fleetIdsSet.has(ref.id)) {
        errors.push({
          kind: 'mission-fleet-ref-unresolved',
          mission_id: missionId,
          fleet_id: ref.id,
          role: ref.role,
        });
        continue;
      }
      const linked = fleetLinkedMissions.get(ref.id);
      if (!linked || !linked.has(missionId)) {
        errors.push({
          kind: 'bidirectional-drift-mission',
          mission_id: missionId,
          fleet_id: ref.id,
          role: ref.role,
        });
      }
    }
  }

  return errors;
}

export type SiteType = 'moon' | 'mars' | 'earth-object';

export type FleetSiteDriftError =
  | {
      kind: 'fleet-linked-site-unresolved';
      fleet_id: string;
      fleet_category: string;
      site_type: SiteType;
      site_id: string;
    }
  | {
      kind: 'site-fleet-ref-unresolved';
      site_type: SiteType;
      site_id: string;
      fleet_id: string;
      role: FleetRole;
    }
  | {
      kind: 'bidirectional-drift-site';
      site_type: SiteType;
      site_id: string;
      fleet_id: string;
      role: FleetRole;
    };

/**
 * Pure drift detector for the fleet ↔ surface-sites/earth-objects
 * bidirectional contract (ADR-052; RFC-016 OQ-16). Mirrors the
 * mission-drift check but keyed by `(type, site_id)` since site IDs
 * can collide across moon/mars/earth-object scopes.
 *
 * Returns errors in the same order `validate-data.ts` emits them today.
 */
export function findBidirectionalFleetSiteDrift(args: {
  siteIdsByType: ReadonlyMap<SiteType, ReadonlySet<string>>;
  siteFleetRefs: ReadonlyMap<
    string,
    ReadonlyArray<{ type: SiteType; refs: ReadonlyArray<FleetRef> }>
  >;
  fleetEntries: ReadonlyArray<FleetEntryMinimal>;
}): FleetSiteDriftError[] {
  const { siteIdsByType, siteFleetRefs, fleetEntries } = args;
  const errors: FleetSiteDriftError[] = [];

  const fleetIdsSet = new Set(fleetEntries.map((e) => e.id));
  const fleetLinkedSitesKey = new Map<string, Set<string>>();
  for (const entry of fleetEntries) {
    const set = new Set<string>();
    for (const ls of entry.linked_sites ?? []) {
      set.add(`${ls.type}::${ls.site_id}`);
    }
    fleetLinkedSitesKey.set(entry.id, set);
  }

  // Check 1: fleet.linked_sites[*] resolves to a real site/object.
  for (const entry of fleetEntries) {
    if (!entry.linked_sites || entry.linked_sites.length === 0) continue;
    for (const ls of entry.linked_sites) {
      const ids = siteIdsByType.get(ls.type);
      if (!ids || !ids.has(ls.site_id)) {
        errors.push({
          kind: 'fleet-linked-site-unresolved',
          fleet_id: entry.id,
          fleet_category: entry.category,
          site_type: ls.type,
          site_id: ls.site_id,
        });
      }
    }
  }

  // Check 2 + 3: site/object.fleet_refs → fleet, and symmetric inclusion.
  for (const [siteId, sources] of siteFleetRefs.entries()) {
    for (const { type, refs } of sources) {
      for (const ref of refs) {
        if (!fleetIdsSet.has(ref.id)) {
          errors.push({
            kind: 'site-fleet-ref-unresolved',
            site_type: type,
            site_id: siteId,
            fleet_id: ref.id,
            role: ref.role,
          });
          continue;
        }
        const linkedKeys = fleetLinkedSitesKey.get(ref.id);
        const expectedKey = `${type}::${siteId}`;
        if (!linkedKeys || !linkedKeys.has(expectedKey)) {
          errors.push({
            kind: 'bidirectional-drift-site',
            site_type: type,
            site_id: siteId,
            fleet_id: ref.id,
            role: ref.role,
          });
        }
      }
    }
  }

  return errors;
}

// ─── ADR-047 image-provenance row integrity ──────────────────────────

export type ProvenanceRow = {
  path: string;
  license_short: string;
};

export type ProvenanceFailure =
  | { kind: 'duplicate-path'; path: string }
  | { kind: 'license-not-allowed'; path: string; license_short: string }
  | { kind: 'missing-file'; path: string; on_disk_path: string };

/**
 * Pure provenance-integrity check (ADR-047 Milestone C, three invariants):
 *
 *   1. No duplicate `entry.path` values.
 *   2. Every `entry.license_short` is in the allowlist OR covered by a waiver.
 *   3. Every `entry.path` resolves to a real file on disk.
 *
 * `isAllowed(license)` and `existsOnDisk(path)` are injected so the caller
 * controls the allowlist source (a top-level import) and the file-system
 * boundary (so this function stays pure-by-default and tests can inject
 * fakes).
 *
 * Returns an empty array when the manifest is clean.
 */
export function findProvenanceFailures(args: {
  entries: ReadonlyArray<ProvenanceRow>;
  waivers: ReadonlyArray<LicenseWaiver>;
  isAllowed: (licenseShort: string) => boolean;
  existsOnDisk: (onDiskPath: string) => boolean;
}): ProvenanceFailure[] {
  const { entries, waivers, isAllowed, existsOnDisk } = args;
  const failures: ProvenanceFailure[] = [];
  const seenPaths = new Set<string>();

  for (const e of entries) {
    if (seenPaths.has(e.path)) {
      failures.push({ kind: 'duplicate-path', path: e.path });
    } else {
      seenPaths.add(e.path);
    }
    if (
      !isAllowed(e.license_short) &&
      !isWaived(waivers as LicenseWaiver[], e.license_short, e.path)
    ) {
      failures.push({
        kind: 'license-not-allowed',
        path: e.path,
        license_short: e.license_short,
      });
    }
    // Manifest paths look like /images/foo.jpg → check static/images/foo.jpg.
    const onDiskPath = `static${e.path.startsWith('/') ? '' : '/'}${e.path}`;
    if (!existsOnDisk(onDiskPath)) {
      failures.push({
        kind: 'missing-file',
        path: e.path,
        on_disk_path: onDiskPath,
      });
    }
  }

  return failures;
}
