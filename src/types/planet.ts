export interface PlanetConstants {
  /** Heliocentric gravitational parameter (AU³/yr²; ≈ 4π²) */
  mu_sun: number;
  /** km per AU (IAU 2012) */
  au_to_km: number;
  /** Light-minutes per AU */
  au_to_lmin: number;
  /** km/s per AU/yr */
  aupyr_to_kms: number;
}

export interface Planet {
  /** Planet name, e.g. "Earth". */
  name: string;
  /** Semi-major axis (AU). */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Orbital period (days). */
  T: number;
  /** Mean longitude at J2000 epoch (radians). */
  L0: number;
  /** Inclination to ecliptic (degrees). */
  incl: number;
  /** Axial tilt (degrees). */
  axialTilt: number;
  /** Rotation period (days). Negative for retrograde rotation. */
  rotPeriod: number;
  /** Spacecraft that have visited this planet. Each entry is a one-
   *  line string in the BeltPanel format: "Mission Name — Agency,
   *  year(s) (brief context)". Rendered in the panel MISSIONS tab
   *  with the leading mission name linkified to /missions/<id> or
   *  /fleet/<id> when an index match exists. Optional — absent or
   *  empty array hides the MISSIONS tab for that planet. */
  mission_visits?: string[];
}

export interface PlanetsData {
  constants: PlanetConstants;
  planets: Planet[];
}

/**
 * Pointer to a /science encyclopedia section, plus an optional
 * one-line "why this matters for THIS body" string rendered as an
 * italic prefix above the ScienceCard title. Shared across overlay
 * types (planets, sun, satellites) so all body panels can carry
 * curated science-section selections per body per locale.
 *
 * `tab` + `section` resolve to /science/<tab>/<section>; the lens
 * article itself is shared across all bodies — only the selection
 * and the `why` prefix are per-body.
 */
export interface ScienceSectionRef {
  /** Encyclopedia tab id — same union as ScienceTabId, but kept as a
   *  string here so this type can be JSON-imported without circular
   *  dependencies into $types/science. The panel coerces via a cast
   *  at render time. */
  tab: string;
  /** Section id within the tab (e.g. 'eccentricity', 'tidal-locking'). */
  section: string;
  /** Optional: one short sentence saying why this concept matters for
   *  the specific body the panel is showing. Per-locale, translatable.
   *  Renders as a small italic prefix above the card title. */
  why?: string;
}

/**
 * Editorial overlay per planet per locale (ADR-017). Lives in
 * `static/data/i18n/[locale]/planets/[id].json` where `id` is the
 * lowercase planet name.
 */
export interface PlanetOverlay {
  /** Display name in the user's locale. */
  name: string;
  /** One-line classification (e.g. "Terrestrial planet"). */
  type: string;
  /** Editorial summary surfaced in the OVERVIEW tab. */
  fact: string;
  /** Editorial paragraph surfaced in the TECHNICAL tab. */
  bio: string;
  /** When true, the panel surfaces the "PLAN A MISSION" CTA. */
  missionable?: boolean;
  /** Tiered learn-more links surfaced in the LEARN tab (v0.1.10). */
  links?: Array<{ l: string; u: string; t: 'intro' | 'core' | 'deep' }>;
  /** Per-body curated science-card selection with optional `why`
   *  prefix. When present, the panel renders these instead of the
   *  panel-wide default list. Falls back to the default when absent. */
  science_sections?: ScienceSectionRef[];
}

/**
 * A planet record merged from `planets.json` (orbital constants, IAU
 * J2000) with its locale overlay (editorial). Returned by `getPlanets`.
 */
export interface LocalizedPlanet extends Planet, PlanetOverlay {
  /** Lowercase identifier used as URL slug & overlay filename. */
  id: string;
}
