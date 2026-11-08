import { assetOrigin } from '$lib/asset-url';

interface HeroOverrides {
  overrides: Record<string, { slot?: string } | undefined>;
}

/**
 * The hero photo of a gallery entity (mission, fleet entry) for a prerendered
 * page: the reviewed override slot when there is one, else slot 01; null when
 * the entity has no gallery. image-hero's loadHeroOverrides() is browser-only,
 * so pages built on the server pass the imported override file in.
 */
export function entityHero(
  dir: string,
  id: string,
  counts: Record<string, number>,
  overrides: HeroOverrides,
): string | null {
  if (!((counts[id] ?? 0) > 0)) return null;
  const slot = overrides.overrides[id]?.slot;
  const stem = slot ? slot.replace(/\.[^.]+$/, '') : '01';
  return `${assetOrigin}/images/${dir}/${id}/${stem}.webp`;
}
