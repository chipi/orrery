/**
 * Round list photos of the neighbourhood and the outer-scale INDEXes, and of the Related lists of the
 * galaxy and structure pages (L46, UXD-025). Pure: the server hands in the data, nothing here fetches.
 *
 * A star's thumb is the 192 px crop of its blessed gallery slot (`thumbOf('stars', id)`); a deep-sky
 * object's is the 192 px WebP of its gallery photo (`/credit-thumbs/images/deep-sky/<photoKey>.webp`);
 * an outer row's is the photo its panel hero names (`universe/panel-heroes.json`), else the photo of
 * its deep-sky twin. A hero marked `pictured` shows a part of the row (NGC 253 for the Sculptor Group):
 * the row says what is pictured.
 */

/** One entry of universe/panel-heroes.json. */
export interface PanelHeroEntry {
  photoKey?: string;
  src?: string;
  pictured?: boolean;
  position?: string;
}

export interface IndexThumbSource {
  /** Star id -> 192 px thumb path, for the stars that have one. */
  star: Record<string, string>;
  /** `<level>/<id>` -> panel hero entry. */
  heroes: Record<string, PanelHeroEntry>;
  /** Deep-sky gallery key -> title in the reader's language (names the pictured part). */
  titles: Record<string, string>;
  /** Deep-sky object id -> gallery key of its photo. */
  photoKeyOf: Record<string, string | null | undefined>;
}

export interface RowThumb {
  thumb: string;
  /** What the photo shows when it is a part of the row (a stand-in), in the reader's language. */
  pictured?: string;
}

/** The 192 px credit thumb of a deep-sky gallery photo. */
export const deepSkyThumb = (photoKey: string): string =>
  `/credit-thumbs/images/deep-sky/${photoKey}.webp`;

/** A deep-sky object's own photo, by object id. */
export function deepSkyObjectThumb(
  ts: IndexThumbSource | undefined,
  objectId: string,
): RowThumb | null {
  const key = ts?.photoKeyOf[objectId];
  return key ? { thumb: deepSkyThumb(key) } : null;
}

/**
 * The thumb of an outer-scale row (`milky-way`, `local-group`, `local-sheet`, `virgo`, `laniakea`,
 * `cosmic-web`, `black-holes`): its panel hero when that names a gallery photo, else the photo of its
 * deep-sky twin (`twinId`: the object the row is the same thing as). A hero with only a `src` has no
 * thumb here.
 */
export function outerThumb(
  ts: IndexThumbSource | undefined,
  level: string,
  id: string,
  twinId?: string,
): RowThumb | null {
  if (!ts) return null;
  const hero = ts.heroes[`${level}/${id}`];
  if (hero?.photoKey) {
    return {
      thumb: deepSkyThumb(hero.photoKey),
      ...(hero.pictured && ts.titles[hero.photoKey] ? { pictured: ts.titles[hero.photoKey] } : {}),
    };
  }
  return deepSkyObjectThumb(ts, twinId ?? id);
}
