/**
 * Per-launch → fleet/launch-site id resolver (#306 follow-up — Earth
 * launch-complex panels).
 *
 * Mirrors `resolveSpacecraftRefs` but produces a single nullable
 * launch-site reference for use by `LauncherFlightsWidget` on the
 * /earth surface site panels. Match policy: a full pad_name match
 * (case-insensitive) wins first; falls back to a substring match
 * against `pad_location` if any of the site's `pad_location_includes`
 * patterns hit.
 *
 * Mapping table lives in `static/data/launches-pad-mapping.json` so
 * editorial owners can add new sites without touching code.
 */

export interface PadMappingFile {
  version: 1;
  sites: Record<
    string,
    {
      pad_name?: string[];
      pad_location_includes?: string[];
    }
  >;
}

export function resolveLaunchSiteRef(
  padName: string | null | undefined,
  padLocation: string | null | undefined,
  mapping: PadMappingFile,
): string | null {
  const padNameLc = (padName ?? '').trim().toLowerCase();
  const padLocLc = (padLocation ?? '').trim().toLowerCase();

  // First pass: exact pad_name match (case-insensitive). This is the
  // strongest signal — the LL2 / GCAT feeds use canonical pad codes
  // (LC40, SLC4E, ELA-3, 1/5, etc.) that map 1-to-1 to fleet sites.
  if (padNameLc) {
    for (const [siteId, rule] of Object.entries(mapping.sites)) {
      const names = rule.pad_name ?? [];
      for (const n of names) {
        if (n.toLowerCase() === padNameLc) return siteId;
      }
    }
  }

  // Second pass: pad_location includes one of the site's anchor
  // strings AND pad_name partially matches. Catches "Launch Complex
  // 39A" vs "LC39A" naming drift.
  if (padNameLc && padLocLc) {
    for (const [siteId, rule] of Object.entries(mapping.sites)) {
      const locs = rule.pad_location_includes ?? [];
      const names = rule.pad_name ?? [];
      const locHit = locs.some((l) => padLocLc.includes(l.toLowerCase()));
      if (!locHit) continue;
      const nameHit = names.some((n) => padNameLc.includes(n.toLowerCase()));
      if (nameHit) return siteId;
    }
  }

  return null;
}
