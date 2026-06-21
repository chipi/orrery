export interface Sun {
  /** Solar mass (kg). */
  mass_kg: number;
  /** Solar radius, equatorial (km). */
  radius_km: number;
  /** Bolometric luminosity (W). */
  luminosity_w: number;
  /** Photospheric (effective) temperature (K). */
  surface_temp_k: number;
  /** Core temperature (K). */
  core_temp_k: number;
  /** Age (Gyr). */
  age_gyr: number;
  /** Tilt of the rotation axis to the ecliptic (degrees). */
  axial_tilt: number;
  /** Sidereal rotation period at the equator (days). The Sun rotates differentially. */
  equatorial_rot_days: number;
  /** Sidereal rotation period near the poles (days). */
  polar_rot_days: number;
  /** Spectral classification (e.g. "G2V"). */
  spectral_class: string;
  /** Absolute visual magnitude. */
  absolute_magnitude: number;
  /** Percent of the solar system's mass contained in the Sun. */
  mass_fraction_pct: number;
  /** Heliophysics missions and observatories that have studied the
   *  Sun. Each entry is a one-line string in the BeltPanel format:
   *  "Mission — Agency, year(s) (context)". Rendered in the panel
   *  MISSIONS tab with the leading mission name linkified to
   *  /missions/<id> or /fleet/<id> when an index match exists.
   *  Optional — absent or empty hides the MISSIONS tab. */
  mission_visits?: string[];
}

/** Editorial overlay strings (ADR-017). */
export interface SunOverlay {
  name: string;
  type: string;
  fact: string;
  bio: string;
  /** Tiered learn-more links surfaced in the LEARN tab (v0.1.10). */
  links?: Array<{ l: string; u: string; t: 'intro' | 'core' | 'deep' }>;
  /** Per-body curated science-card selection. Same pattern as
   *  PlanetOverlay.science_sections — pointers into /science/<tab>/
   *  <section> with an optional `why` prefix per entry. Falls back
   *  to SunPanel's default list when absent. */
  science_sections?: import('./planet').ScienceSectionRef[];
}

/** Sun base record merged with its locale overlay. */
export interface LocalizedSun extends Sun, SunOverlay {}
