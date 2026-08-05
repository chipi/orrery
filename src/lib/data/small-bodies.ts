import { get } from './core';
import type { ScienceSectionRef } from '$types/planet';

/**
 * Per-locale small-body overlay (introduced 2026-06-21 for science_sections
 * but designed for future translations of description / note / library
 * labels too). Mirrors SatelliteI18n: optional fields override the base
 * small-bodies.json entry when present.
 *
 * Files at `static/data/i18n/<locale>/small-bodies/<id>.json`.
 */
export type SmallBodyI18n = {
  name?: string;
  description?: string;
  note?: string;
  mission_visits?: string[];
  library_labels?: Record<string, string>;
  science_sections?: ScienceSectionRef[];
};

export async function getSmallBodyI18n(
  locale: string,
  bodyId: string,
): Promise<SmallBodyI18n | null> {
  try {
    return await get<SmallBodyI18n>(`i18n/${locale}/small-bodies/${bodyId}.json`);
  } catch {
    return null;
  }
}

/**
 * /explore satellite panel (Moon + other natural satellites). GH
 * #304 Slice 2. Single JSON manifest containing all satellite
 * entries — fetched once, cached for subsequent panel opens. Gallery
 * + library tabs read from sibling manifest files added in Slices 4–5.
 */
export type SatelliteLibraryLink = {
  id: string;
  label: string;
  url: string;
  /** Tier ranks how prominently the link surfaces in the panel:
   *  - intro: first row, anchor link (Wikipedia / NASA overview)
   *  - core: second-tier, mission or science deep-dive
   *  - extra: third-tier, niche / interactive / video */
  tier: 'intro' | 'core' | 'extra';
  kind: 'wikipedia' | 'nasa' | 'mission' | 'video' | 'article';
};
export type SatelliteEntry = {
  id: string;
  name: string;
  parent_planet_id: string;
  parent_planet_name: string;
  radius_km: number;
  mass_kg: number;
  semi_major_axis_km: number;
  orbital_period_days: number;
  axial_tilt_deg?: number;
  discovered: string;
  mission_visits: string[];
  surface_composition?: string;
  description: string;
  wiki?: string;
  library?: SatelliteLibraryLink[];
  /** Per-body curated science-card selection — merged from
   *  SatelliteI18n.science_sections in mergeOverlay. Optional;
   *  empty/absent means SatellitePanel renders no science cards
   *  (no panel-wide default for satellites — selection is per-moon). */
  science_sections?: ScienceSectionRef[];
};
export async function getSatellites(): Promise<SatelliteEntry[]> {
  try {
    const data = await get<{ satellites: SatelliteEntry[] }>('satellites.json');
    return data.satellites ?? [];
  } catch {
    return [];
  }
}

/**
 * Per-locale satellite overlay (#304 Slice 6). Mirrors the
 * mission / science overlay pattern: each locale ships a
 * `static/data/i18n/<locale>/satellites/<id>.json` file with the
 * translatable fields (description, surface_composition,
 * mission_visits, library labels). The panel reads the English
 * base from satellites.json and overlays the locale-specific
 * strings; missing fields fall back to English. Empty overlay
 * files are valid — they just mean the satellite renders fully
 * in English until the wave23 translation batch lands.
 */
export type SatelliteI18n = {
  description?: string;
  surface_composition?: string;
  mission_visits?: string[];
  library_labels?: Record<string, string>;
  /** Per-body curated science-card selection. Same shape as
   *  PlanetOverlay.science_sections — pointers into /science/<tab>/
   *  <section> with an optional `why` prefix per entry. Falls back
   *  to SatellitePanel's default list when absent. */
  science_sections?: ScienceSectionRef[];
};
export async function getSatelliteI18n(
  locale: string,
  satelliteId: string,
): Promise<SatelliteI18n | null> {
  try {
    return await get<SatelliteI18n>(`i18n/${locale}/satellites/${satelliteId}.json`);
  } catch {
    return null;
  }
}

/**
 * Population belt (v0.7.x — asteroid belt + Kuiper Belt). Surfaces via
 * the /explore BeltPanel. Belts are regions, not bodies — entries
 * carry inner/outer AU bounds, population estimates, total mass, the
 * largest known members, and a tiered library. Loaded once on first
 * panel-open and cached via the data layer's standard `get()` cache.
 */
export type BeltLibraryLink = {
  id: string;
  label: string;
  url: string;
  tier: 'intro' | 'core' | 'extra';
  kind: 'wikipedia' | 'nasa' | 'mission' | 'article';
};
export type BeltEntry = {
  id: string;
  name: string;
  kind: string;
  location: string;
  inner_au: number;
  outer_au: number;
  population_estimate: string;
  total_mass_relative: string;
  largest_members: string[];
  description: string;
  discovered: string;
  mission_visits: string[];
  library?: BeltLibraryLink[];
  /** Per-belt curated science-card selection — merged from
   *  BeltI18n.science_sections in BeltPanel.mergeOverlay. Renders
   *  in the SCIENCE section at the bottom of OVERVIEW (belts have
   *  no TECHNICAL tab). */
  science_sections?: ScienceSectionRef[];
};
export async function getBelts(): Promise<BeltEntry[]> {
  try {
    const data = await get<{ belts: BeltEntry[] }>('belts.json');
    return data.belts ?? [];
  } catch {
    return [];
  }
}

/**
 * Belt gallery — curated NASA imagery presented as portraits of the
 * belt's largest catalogued members. Image paths reuse the existing
 * /images/small-bodies tree (Ceres for the Asteroid Belt; Pluto +
 * Eris + Haumea + Makemake for the Kuiper Belt) so the gallery
 * doubles as a tour of the belt's giants without duplicating assets.
 */
/** Kept as a re-export for any callers that still import the type
 *  (e.g. older overlay code); the field is no longer used now that
 *  the belt manifest is a flat {id: count} map matching other
 *  *-galleries.json shapes and captions are gone. */
export type BeltGallerySlot = { src: string; caption: string };

/**
 * Per-locale belt overlay (v0.7.x — translation pipeline pattern
 * mirrors satellites). Each locale ships a
 * `static/data/i18n/<locale>/belts/<id>.json` file with translatable
 * fields. Missing fields fall back to the English base. Empty
 * overlay files are valid — the panel renders fully in English until
 * the wave23 batch lands.
 */
export type BeltI18n = {
  name?: string;
  kind?: string;
  location?: string;
  population_estimate?: string;
  total_mass_relative?: string;
  largest_members?: string[];
  description?: string;
  discovered?: string;
  mission_visits?: string[];
  library_labels?: Record<string, string>;
  /** Per-belt curated science-card selection. Same pattern as
   *  PlanetOverlay.science_sections — pointers into /science/<tab>/
   *  <section> with an optional `why` prefix per entry. */
  science_sections?: ScienceSectionRef[];
};
export async function getBeltI18n(locale: string, beltId: string): Promise<BeltI18n | null> {
  try {
    return await get<BeltI18n>(`i18n/${locale}/belts/${beltId}.json`);
  } catch {
    return null;
  }
}
