/**
 * Deep-Sky gallery (#391) — the curated record shape shared by the route's
 * loader (`+page.ts`) and its component (`+page.svelte`). The image set +
 * captions live in `static/data/deep-sky.json` (hand-curated; not a generated
 * manifest).
 */
export type DeepSkyImage = {
  key: string;
  telescope: string;
  subject: string;
  title: string;
  caption: string;
  credit: string;
  licence: string;
  source: string;
  w: number;
  h: number;
  /** Agency display string (e.g. "NASA / ESA / CSA") — resolved to vetted
   *  logos via $lib/agency-logo. */
  agency: string;
  type: string;
  constellation: string;
  distance: string;
  taken: string;
  instrument: string;
  /** Object catalogue code, e.g. "NGC 3324" / "M16". */
  designation: string;
  /** Full observatory name, e.g. "James Webb Space Telescope". */
  fullscope: string;
};

/**
 * Join helper (/explore v2 Slice 4). Resolve a deep-sky object's `photoKey`
 * to its curated gallery entry, so the in-sky DeepSkyPanel can show the same
 * caption / credit / telescope as the /gallery/deep-sky wall. Returns
 * undefined for catalogue-only objects (no photoKey) or a stale key.
 */
export function findDeepSkyImage(
  images: DeepSkyImage[],
  photoKey: string | null | undefined,
): DeepSkyImage | undefined {
  if (!photoKey) return undefined;
  return images.find((img) => img.key === photoKey);
}
