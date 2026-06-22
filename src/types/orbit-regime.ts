/**
 * Orbit-regime reference data for /earth's orbit-ruler + regime panel
 * (#354). Companion to the orbit-ring colour table in
 * `earth-launch-sites-config.ts` — keyed on the same `Regime` codes
 * (LEO/MEO/GEO/HEO/MOON/L2). Locale text lives in per-locale overlay
 * JSON under `static/data/i18n/<locale>/orbit-regimes/<id>.json` and
 * gets merged at fetch time by `getOrbitRegimes()`.
 */
export interface OrbitRegimeResident {
  /** EarthObject id this resident points at (links the regime panel to
   *  the same satellite panel a click on the dot would open). */
  id: string;
  /** Display label — kept localised because mission names can be
   *  written differently per locale (e.g. JWST vs ジェイムズ・ウェッブ). */
  label: string;
  /** Agency tag for the badge colour — must match a key the existing
   *  `nationChipFor` / `surface-site` agency enum already understands
   *  so the regime panel can reuse the same badge component. */
  agency: string;
}

export interface OrbitRegimeFirst {
  /** Year the first orbiter reached this regime (e.g. 1957 for Sputnik 1
   *  reaching LEO, 1996 for SOHO reaching Sun–Earth L2). */
  year: number;
  /** Short label like "Sputnik 1 (USSR)" — localised. */
  label: string;
  /** Optional mission catalogue id under static/data/missions/. When
   *  present, the regime panel renders the first as an anchor to
   *  `/missions?id=<mission_id>` so the user can jump straight into
   *  the mission detail panel. Omit when the entry refers to a
   *  programme / constellation that isn't a single missions-catalogue
   *  entry (e.g. "GLONASS Block I", "Herschel + Planck"). */
  mission_id?: string;
}

export interface OrbitRegime {
  /** Regime code that matches `EarthObject.regime` for /earth, or a
   *  surface-relative band id for /moon, /mars. /explore uses
   *  heliocentric zone ids (SUN, TERRESTRIAL, GIANTS, KUIPER, …). */
  id: string;
  /** Altitude band above the parent body's surface — used by /earth,
   *  /moon, /mars rulers. Single value for parked / synchronous regimes
   *  (GEO, AREOSTATIONARY, L2), `[low, high]` for ranged regimes (LEO,
   *  LMO, NRHO). Kilometres above mean sea level.
   *
   *  EXACTLY ONE of altitude_km / distance_au must be set per entry. */
  altitude_km?: number | [number, number];
  /** Heliocentric distance band in astronomical units — used by
   *  /explore's zone ruler (#357). Single value for an iconic distance
   *  (heliopause at ~120 AU), `[low, high]` for a range (gas giants
   *  5-30 AU). Mutually exclusive with altitude_km. */
  distance_au?: number | [number, number];
  /** Hex colour mirroring `REGIME_COLORS` in
   *  `src/routes/earth/earth-launch-sites-config.ts`. Stored here so
   *  the ruler component doesn't have to import the config (and the
   *  data file is the single source of truth for "what colour is GEO"
   *  if the config ever drifts). */
  color: string;
  /** Locale overlay fields (merged in by `getOrbitRegimes()`). */
  name?: string;
  short?: string;
  story?: string;
  comparison?: string;
  residents?: OrbitRegimeResident[];
  firsts?: OrbitRegimeFirst[];
  /** Deep-link into /science for users who want the underlying physics.
   *  Stored as a `(tab, section)` pair so the regime panel can render
   *  the standard `<ScienceCard>` (title + intro + preview + "Read full
   *  section →" link) instead of a bespoke anchor — matches every other
   *  detail panel's /science cross-link UX. Optional because not every
   *  regime has a 1:1 section yet — when absent the panel hides the
   *  cross-link row. */
  science_link?: { tab: string; section: string };
}
