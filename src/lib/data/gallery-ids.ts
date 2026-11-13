/**
 * Id variants to probe across the gallery manifests, shared by the site gallery loaders
 * (galleries.ts) and the list-thumbnail manifest builder (scripts/build-entity-thumbs.ts), so a
 * list row's thumb comes from the folder the site's panel would show. Pure, no imports.
 */

/**
 * Hand-curated aliases for cases where a site id and its gallery's
 * curated id are semantically related but not derivable by
 * normalization. Add cautiously — only when a real gallery exists
 * under a name that wouldn't be reached by the variant generator.
 */
const GALLERY_ID_ALIASES: Record<string, string> = {
  // Luna 21's surface mission was the Lunokhod 2 rover; the gallery
  // under fleet-galleries/lunokhod-2/ is the right surface imagery
  // for the luna21 site, but neither "luna21" nor "luna-21" derives
  // from "lunokhod-2" by id-variant rules.
  luna21: 'lunokhod-2',
};

/**
 * Generate id-variants to probe across manifests with inconsistent
 * naming conventions. fleet-galleries.json was hand-curated with
 * dash-separated names ("viking-1", "luna-16"); mission-galleries
 * and site-id conventions tend toward no-dash ("viking1", "luna16",
 * with site ids sometimes carrying a "-lander" / "-orbiter" suffix).
 * Try every reasonable form so a single canonical-id callsite hits
 * whatever the manifests happen to have.
 *
 * Examples:
 *   viking1-lander → [viking1-lander, viking1, viking-1, viking-1-lander]
 *   luna16          → [luna16, luna-16]
 *   change5         → [change5, change-5]
 */
export function gallerySiteIdVariants(id: string): string[] {
  const variants = new Set<string>([id]);
  const stripped = id.replace(/-(lander|orbiter|rover)$/, '');
  if (stripped !== id) variants.add(stripped);
  // Insert a dash before trailing digits. "viking1" → "viking-1".
  for (const candidate of [id, stripped]) {
    const dashed = candidate.replace(/^([a-z]+)(\d+)$/, '$1-$2');
    if (dashed !== candidate) variants.add(dashed);
  }
  // Hand-curated alias (e.g. luna21 → lunokhod-2).
  if (GALLERY_ID_ALIASES[id]) variants.add(GALLERY_ID_ALIASES[id]);
  return Array.from(variants);
}
