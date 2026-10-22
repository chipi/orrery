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

/** `needle` occurs in `hay` as a whole token: not glued to a letter or digit on
 *  either side. Plain substring matching took Plesetsk's "NIIP-53" for Baikonur's
 *  "niip-5" and pad "LC132/2" for "LC1", crediting 566 Plesetsk launches to
 *  Gagarin's Start. Both arguments are lower-case. */
function hasToken(hay: string, needle: string): boolean {
  let from = 0;
  for (;;) {
    const i = hay.indexOf(needle, from);
    if (i < 0) return false;
    const before = hay[i - 1];
    const after = hay[i + needle.length];
    if (!(before && /[a-z0-9]/.test(before)) && !(after && /[a-z0-9]/.test(after))) return true;
    from = i + 1;
  }
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
  // Pad codes repeat between cosmodromes ("LC1" is Baikonur 1/5, but also
  // Naro, Sohae and Hainan), so when the launch has a location and the site
  // lists its location anchors, the name match must sit at one of them.
  if (padNameLc) {
    for (const [siteId, rule] of Object.entries(mapping.sites)) {
      const names = rule.pad_name ?? [];
      const locs = rule.pad_location_includes ?? [];
      if (padLocLc && locs.length && !locs.some((l) => hasToken(padLocLc, l.toLowerCase())))
        continue;
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
      const locHit = locs.some((l) => hasToken(padLocLc, l.toLowerCase()));
      if (!locHit) continue;
      const nameHit = names.some((n) => hasToken(padNameLc, n.toLowerCase()));
      if (nameHit) return siteId;
    }
  }

  return null;
}
