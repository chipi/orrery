import * as m from '$lib/paraglide/messages';
import type { ExploreContextId } from '$lib/three/explore-scene-host';
import type { LocaleCode } from '$lib/locale';
import type { DeepSkyCategory, OuterTextOverlay } from '$lib/data/universe';
import { constellationName } from '$lib/universe/iau-constellations';

// Localised label for an anonymous star's catalogue colour (enum → message).
export const anonColorLabel = (c: string): string => {
  switch (c) {
    case 'blue-white':
      return m.star_color_blue_white();
    case 'white':
      return m.star_color_white();
    case 'yellow-white':
      return m.star_color_yellow_white();
    case 'yellow':
      return m.star_color_yellow();
    case 'orange':
      return m.star_color_orange();
    case 'red':
      return m.star_color_red();
    default:
      return c;
  }
};

export const fmtScale = (value: number): string =>
  value >= 1000 || value < 0.01
    ? value.toLocaleString(undefined, { maximumSignificantDigits: 3 })
    : String(value);
// A distance from scale-readout ({value, unit: 'km' | 'AU' | 'ly' | 'pc'}) in the locale's own
// unit form (style guide §1a: ru а. е. / св. год / пк, de AE, ar و.ف …).
export const distanceWithUnit = (value: string, unit: string): string => {
  switch (unit) {
    case 'AU':
      return m.unit_au_value({ value });
    case 'ly':
      return m.unit_ly_value({ value });
    case 'pc':
      return m.unit_pc_value({ value });
    case 'km':
      return m.mp_flight_unit_km({ value });
    case 'm':
      return m.unit_m_value({ value });
    default:
      return `${value} ${unit}`;
  }
};
// The bare unit, for a toggle chip with no number next to it.
export const distanceUnitLabel = (unit: string): string => distanceWithUnit('', unit).trim();

// Localize the light-travel unit words emitted by scale-readout.
export const lightUnitLabel = (unit: string): string => {
  switch (unit) {
    case 'light-seconds':
      return m.explore_light_seconds();
    case 'light-minutes':
      return m.explore_light_minutes();
    case 'light-hours':
      return m.explore_light_hours();
    case 'light-days':
      return m.explore_light_days();
    default:
      return m.explore_light_years();
  }
};
export const contextLabel = (contextId: ExploreContextId, bodyHostName: string): string =>
  contextId === 'body-scene'
    ? bodyHostName
    : contextId === 'neighborhood'
      ? m.explore_ctx_stellar_neighborhood()
      : contextId === 'milky-way'
        ? m.explore_ctx_milky_way()
        : contextId === 'local-group'
          ? m.explore_ctx_local_group()
          : m.explore_ctx_solar_system();

// Satellite stats for the Earth-for-scale widget when a moon is
// selected. Real diameters in km. Keyed by satellite id (without
// the parent-planet prefix used in selectedSatelliteKey). Only
// diameter info is needed today — the tactical-scan overlay still
// gates on `cameraState.focusedOnPlanet` so the gravity / atmo / temp rows
// stay planet-only. Earth = 12 742 km.
export const SATELLITE_STATS: Record<string, { diameterKm: number; diameterRatioEarth: number }> = {
  moon: { diameterKm: 3474, diameterRatioEarth: 0.273 },
  phobos: { diameterKm: 22.4, diameterRatioEarth: 0.00176 },
  deimos: { diameterKm: 12.4, diameterRatioEarth: 0.00097 },
  io: { diameterKm: 3643, diameterRatioEarth: 0.286 },
  europa: { diameterKm: 3122, diameterRatioEarth: 0.245 },
  ganymede: { diameterKm: 5268, diameterRatioEarth: 0.413 },
  callisto: { diameterKm: 4821, diameterRatioEarth: 0.378 },
  titan: { diameterKm: 5150, diameterRatioEarth: 0.404 },
  enceladus: { diameterKm: 504, diameterRatioEarth: 0.04 },
  miranda: { diameterKm: 471, diameterRatioEarth: 0.037 },
  ariel: { diameterKm: 1158, diameterRatioEarth: 0.091 },
  umbriel: { diameterKm: 1169, diameterRatioEarth: 0.092 },
  titania: { diameterKm: 1577, diameterRatioEarth: 0.124 },
  oberon: { diameterKm: 1523, diameterRatioEarth: 0.12 },
  triton: { diameterKm: 2706, diameterRatioEarth: 0.212 },
};

// Time-dilation readout: √(1 − rₛ/r) at r = k·rₛ, as a percentage of a far clock.
export const dilationPct = (k: number): string => `${Math.round(Math.sqrt(1 - 1 / k) * 100)}%`;

// ── Deep-sky objects: one formatter for the panel, the /explore/deep-sky/<id> page and the INDEX.

const DEEP_SKY_CATEGORY_LABEL: Record<DeepSkyCategory, () => string> = {
  galaxy: m.explore_ds_cat_galaxy,
  'galaxy-cluster': m.explore_ds_cat_galaxy_cluster,
  nebula: m.explore_ds_cat_nebula,
  'planetary-nebula': m.explore_ds_cat_planetary_nebula,
  'supernova-remnant': m.explore_ds_cat_supernova_remnant,
  'star-forming-region': m.explore_ds_cat_star_forming_region,
  'dark-nebula': m.explore_ds_cat_dark_nebula,
  'star-cluster': m.explore_ds_cat_star_cluster,
  'globular-cluster': m.explore_ds_cat_globular_cluster,
  star: m.explore_ds_cat_star,
  other: m.explore_ds_cat_other,
};
export const deepSkyCategoryLabel = (c: DeepSkyCategory): string => DEEP_SKY_CATEGORY_LABEL[c]();

export { deepSkyTitle } from './deep-sky-title';

const roundSig = (n: number, sig: number): number => {
  const p = 10 ** (sig - Math.ceil(Math.log10(Math.abs(n))));
  return Math.round(n * p) / p;
};

// "~24,000 ly", "~55 million ly" in the reader's number format and unit form, from `dist_ly`. Two
// significant figures from ten thousand light-years up, three below: the same rounding as the
// English `dist_label` the data carries, which stays the fallback only where `dist_ly` is null.
export function deepSkyDistance(distLy: number, locale: string): string {
  const r = roundSig(distLy, distLy >= 1e4 ? 2 : 3);
  const value =
    r >= 1e6
      ? new Intl.NumberFormat(locale, {
          notation: 'compact',
          compactDisplay: 'long',
          maximumFractionDigits: 1,
        }).format(r)
      : new Intl.NumberFormat(locale).format(r);
  return m.unit_ly_value({ value: `~${value}` });
}

// The constellation spelled out ("Her" → "Hercules"); the page and the panel both show this.
export const deepSkyConstellation = (code: string): string => constellationName(code);

/** A planet's name in the viewer's language (`lab_body_*`); an id without a message keeps `fallback`. */
export const planetName = (id: string, fallback: string, locale?: LocaleCode): string => {
  const name = PLANET_NAME[id];
  return name ? name({}, locale ? { locale } : undefined) : fallback;
};
const PLANET_NAME: Record<string, typeof m.lab_body_earth> = {
  mercury: m.lab_body_mercury,
  venus: m.lab_body_venus,
  earth: m.lab_body_earth,
  mars: m.lab_body_mars,
  jupiter: m.lab_body_jupiter,
  saturn: m.lab_body_saturn,
  uranus: m.lab_body_uranus,
  neptune: m.lab_body_neptune,
};

// ── Galaxies and structures (the six outer-scale panels and their /explore/galaxies and
// /explore/structures pages): one string per value, so a panel and its page cannot disagree.

const lightYears = (ly: number, locale: string, o: Intl.NumberFormatOptions): string =>
  m.unit_ly_value({ value: new Intl.NumberFormat(locale, o).format(ly) });

// Three significant figures: the Local Group catalogue's distances are whole kiloparsecs.
export const galaxyDistance = (distMly: number, locale: string): string =>
  lightYears(distMly * 1e6, locale, { maximumSignificantDigits: 3 });
export const galaxyDiameter = (diamKly: number, locale: string): string =>
  lightYears(diamKly * 1e3, locale, { maximumSignificantDigits: 3 });
// The four schematic files hold hand values in Mpc and Mly; shown to the light-year, as the panels did.
export const structureDistance = (distMpc: number, locale: string): string =>
  lightYears(distMpc * 3.26e6, locale, { maximumFractionDigits: 0 });
export const structureSpan = (diamMly: number, locale: string): string =>
  lightYears(diamMly * 1e6, locale, { maximumFractionDigits: 0 });

const GALAXY_KIND_LABEL: Record<string, () => string> = {
  spiral: m.explore_lg_kind_spiral,
  irregular: m.explore_lg_kind_irregular,
  'dwarf-elliptical': m.explore_lg_kind_dwarf_elliptical,
  'dwarf-spheroidal': m.explore_lg_kind_dwarf_spheroidal,
  'dwarf-irregular': m.explore_lg_kind_dwarf_irregular,
};
export const galaxyKindLabel = (kind: string): string => GALAXY_KIND_LABEL[kind]?.() ?? kind;

const STRUCTURE_KIND_LABEL: Record<string, () => string> = {
  group: m.explore_ls_kind_group,
  cloud: m.explore_ls_kind_cloud,
  cluster: m.explore_virgo_kind_cluster,
  supercluster: m.explore_laniakea_kind_supercluster,
  attractor: m.explore_laniakea_kind_attractor,
  wall: m.explore_cosmic_web_kind_wall,
  void: m.explore_cosmic_web_kind_void,
  concentration: m.explore_cosmic_web_kind_concentration,
};
export const structureKindLabel = (kind: string): string => STRUCTURE_KIND_LABEL[kind]?.() ?? kind;

// A galaxy's place in the Local Group: our own, a major member, a satellite of one, or a free dwarf.
export function galaxyGroupLabel(id: string, parent: string): string {
  if (id === 'milky-way') return m.explore_lg_group_self();
  // An anchor galaxy (Andromeda) is a major member, not a satellite of anything.
  if (id === parent) return m.explore_lg_group_anchor();
  if (parent === 'milky-way') return m.explore_lg_group_mw();
  if (parent === 'andromeda') return m.explore_lg_group_andromeda();
  return m.explore_lg_group_independent();
}

/** The panel's lead paragraphs: the entity's reviewed fact and bio, else the kind blurb. */
export const outerLead = (overlay: OuterTextOverlay | null | undefined, blurb: string): string[] =>
  overlay?.fact && overlay.bio ? [overlay.fact, overlay.bio] : [blurb];
