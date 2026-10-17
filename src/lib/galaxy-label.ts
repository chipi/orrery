import * as m from '$lib/paraglide/messages';

/** Localised Local Group galaxy label (galaxy_name_<id> message), or the data's
 *  English name when a galaxy has no message. Proper names stay as written, the
 *  generic word ("Galaxy", "Dwarf", "Cloud") is translated. */
export function galaxyLabel(g: { id: string; name: string }): string {
  const fn = (m as unknown as Record<string, (() => string) | undefined>)[
    `galaxy_name_${g.id.replace(/-/g, '_')}`
  ];
  return typeof fn === 'function' ? fn() : g.name;
}
