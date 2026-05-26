/**
 * Group panel-LEARN links by tier (#42).
 *
 * Both /moon and /mars's Panel → Learn tab partitions the site's
 * links array into `intro` / `core` / `deep` buckets and renders one
 * section per tier. Identical 10-line `$derived.by()` block in both
 * routes pre-extraction.
 *
 * Generic over the link shape — moon and mars carry route-specific
 * link types (`MoonSite['links']` etc.) that both have a `t` discriminator.
 */

export type LinkTier = 'intro' | 'core' | 'deep';
export type LinkTiers<L> = { intro: L[]; core: L[]; deep: L[] };

export function groupLinksByTier<L extends { t: LinkTier }>(
  links: readonly L[] | undefined | null,
): LinkTiers<L> {
  const out: LinkTiers<L> = { intro: [], core: [], deep: [] };
  if (!links) return out;
  for (const link of links) out[link.t].push(link);
  return out;
}

/**
 * Truthy when the site exists and has at least one Learn-tab link.
 * Used both as a Panel tab `visible` gate and as an empty-state guard
 * inside the Learn tab body.
 */
export function siteHasLinks(
  site: { links?: { length: number } | null } | null | undefined,
): boolean {
  return site != null && (site.links?.length ?? 0) > 0;
}
