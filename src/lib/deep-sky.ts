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
