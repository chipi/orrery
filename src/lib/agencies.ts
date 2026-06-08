/**
 * Unified agency registry. Single source of truth for:
 *   - logo file lookup (used by /fleet, /missions, /missions/launches,
 *     ISS/Tiangong module + visitor lists)
 *   - canonical short-name display (chip labels, trigger pills)
 *   - full-name tooltips
 *
 * Each AgencyInfo entry carries every alias under which that agency
 * appears in source data — short slugs ("nasa"), display names
 * ("Northrop Grumman"), full LL2 names ("national aeronautics and
 * space administration"), and any historical variants. Add a new
 * agency by appending one entry here and the lookup is picked up by
 * every consumer automatically.
 *
 * Compound agencies (e.g. "NASA / ESA" on Hubble) are resolved by
 * resolveAgencyCompound() which splits on " / ", " + ", " & " and
 * strips a "Multi (...)" wrapper if present.
 */
import { base } from '$app/paths';

export interface AgencyInfo {
  /** Canonical short name shown in chips / pills. */
  short: string;
  /** Spelled-out full name shown in tooltips / accessibility labels. */
  full: string;
  /**
   * Filename under `static/logos/` (e.g. `"nasa.svg"`), or null if no
   * logo asset ships for this agency. Callers prepend `${base}/logos/`.
   */
  logo: string | null;
  /**
   * Canonical brand color hex (e.g. `"#0B3D91"` for NASA blue). Used as
   * the mission-card / fleet-card accent. Pull from the agency's own
   * brand identity where possible (matches the logo SVG fill where the
   * SVG carries a brand color). null when no canonical brand color
   * applies (e.g. defunct concepts, brand-agnostic shorthands).
   */
  color: string | null;
  /**
   * Every lowercased input string that should resolve to this agency.
   * Include: the slug ("nasa"), the display short name ("NASA" lowercased),
   * spelled-out variants, LL2 full names, and any historical aliases.
   */
  aliases: string[];
}

export const AGENCIES: AgencyInfo[] = [
  // ─── Government / inter-government space agencies ──────────────────
  {
    short: 'NASA',
    full: 'NASA',
    logo: 'nasa.svg',
    color: '#0B3D91',
    aliases: ['nasa', 'national aeronautics and space administration'],
  },
  {
    short: 'ESA',
    full: 'European Space Agency',
    logo: 'esa.svg',
    color: '#003247',
    aliases: ['esa', 'european space agency'],
  },
  {
    short: 'JAXA',
    full: 'Japan Aerospace Exploration Agency',
    logo: 'jaxa.svg',
    color: '#003087',
    aliases: ['jaxa', 'japan aerospace exploration agency'],
  },
  {
    short: 'ISRO',
    full: 'Indian Space Research Organisation',
    logo: 'isro.svg',
    color: '#FF9933',
    aliases: ['isro', 'indian space research organisation', 'indian space research organization'],
  },
  {
    short: 'CNSA',
    full: 'China National Space Administration',
    logo: 'cnsa.svg',
    color: '#DE2910',
    aliases: ['cnsa', 'china national space administration'],
  },
  {
    // China Manned Space Agency — operates the Tiangong programme under
    // the CNSA umbrella. Reuses CNSA's mark per existing agency-logo.ts.
    short: 'CMSA',
    full: 'China Manned Space Agency',
    logo: 'cnsa.svg',
    color: '#DE2910',
    aliases: ['cmsa', 'china manned space agency'],
  },
  {
    // CASC builds most Chinese launchers under contract to CNSA. The
    // launches feed surfaces it as the operating agency for many missions.
    short: 'CASC',
    full: 'China Aerospace Science and Technology Corporation',
    logo: 'cnsa.svg',
    color: '#DE2910',
    aliases: ['casc', 'china aerospace science and technology corporation'],
  },
  {
    short: 'Roscosmos',
    full: 'Roscosmos',
    logo: 'roscosmos.svg',
    color: '#cc4444',
    aliases: [
      'roscosmos',
      'russian federal space agency',
      'russian federal space agency (roscosmos)',
      'russian space agency',
    ],
  },
  {
    short: 'CSA',
    full: 'Canadian Space Agency',
    logo: 'csa.svg',
    color: '#D52B1E',
    aliases: ['csa', 'canadian space agency'],
  },
  {
    short: 'UAESA',
    full: 'MBRSC / UAE Space Agency',
    logo: 'uaesa.svg',
    color: '#00833F',
    aliases: ['uaesa', 'mbrsc', 'mohammed bin rashid space centre', 'uae space agency'],
  },
  {
    short: 'USSF',
    full: 'United States Space Force',
    logo: 'ussf.svg',
    color: '#1D2951',
    aliases: ['ussf', 'united states space force', 'us space force'],
  },
  {
    short: 'NOAA',
    full: 'National Oceanic and Atmospheric Administration',
    logo: 'noaa.svg',
    color: '#003087',
    aliases: ['noaa', 'national oceanic and atmospheric administration'],
  },
  {
    short: 'USGS',
    full: 'United States Geological Survey',
    logo: 'usgs.svg',
    color: '#00833F',
    aliases: ['usgs', 'united states geological survey'],
  },
  {
    short: 'ASI',
    full: 'Agenzia Spaziale Italiana',
    logo: 'asi.svg',
    color: '#008C45',
    aliases: ['asi', 'agenzia spaziale italiana', 'italian space agency'],
  },

  // ─── Launch providers + spacecraft manufacturers ───────────────────
  {
    short: 'SpaceX',
    full: 'SpaceX',
    logo: 'spacex.svg',
    color: '#005288',
    aliases: ['spacex'],
  },
  {
    short: 'Boeing',
    full: 'Boeing',
    logo: 'boeing.svg',
    color: '#1D4E89',
    aliases: ['boeing', 'boeing defense, space & security'],
  },
  {
    short: 'Northrop Grumman',
    full: 'Northrop Grumman',
    logo: 'northrop-grumman.svg',
    color: '#005EB8',
    aliases: [
      'northrop grumman',
      'northrop-grumman',
      'northropgrumman',
      'northrop grumman space systems',
    ],
  },
  {
    short: 'ULA',
    full: 'United Launch Alliance',
    // No PD/CC-BY SVG of the ULA corporate mark on Wikimedia Commons
    // (only rocket-specific Vulcan/Delta marks). Falls back to text-only.
    logo: null,
    color: '#1A3668',
    aliases: ['ula', 'united launch alliance'],
  },
  {
    short: 'Blue Origin',
    full: 'Blue Origin',
    logo: 'blue-origin.svg',
    color: '#00264D',
    aliases: ['blue origin', 'blue-origin'],
  },
  {
    short: 'Arianespace',
    full: 'Arianespace',
    logo: 'arianespace.svg',
    color: '#0033A0',
    aliases: ['arianespace'],
  },

  // ─── New-space crew + lunar / lander companies ─────────────────────
  {
    short: 'Axiom Space',
    full: 'Axiom Space',
    logo: 'axiom-space.svg',
    color: '#1F3A93',
    aliases: ['axiom space', 'axiom-space'],
  },
  {
    short: 'Intuitive Machines',
    full: 'Intuitive Machines',
    logo: 'intuitive-machines.svg',
    color: '#00A3E0',
    aliases: ['intuitive machines', 'intuitive-machines'],
  },
  {
    short: 'ispace',
    full: 'ispace',
    logo: 'ispace.svg',
    color: '#003E7E',
    aliases: ['ispace'],
  },
  {
    short: 'SpaceIL',
    full: 'SpaceIL',
    // No SpaceIL SVG on Wikimedia Commons. Falls back to text-only.
    logo: null,
    color: '#0038B8',
    aliases: ['spaceil'],
  },

  // ─── Commercial constellation operators ────────────────────────────
  {
    short: 'Amazon',
    full: 'Amazon',
    logo: 'amazon.svg',
    color: '#FF9900',
    aliases: ['amazon'],
  },
  {
    short: 'SES',
    full: 'SES',
    logo: 'ses.svg',
    color: '#003C71',
    aliases: ['ses'],
  },
  {
    short: 'Sirius XM',
    full: 'Sirius XM',
    logo: 'siriusxm.svg',
    color: '#0067B1',
    aliases: ['sirius xm', 'sirius-xm', 'siriusxm'],
  },
  {
    short: 'Viasat',
    full: 'Viasat',
    logo: 'viasat.svg',
    color: '#005CAB',
    aliases: ['viasat', 'viasat (formerly inmarsat plc)'],
  },
  {
    short: 'Eutelsat OneWeb',
    full: 'Eutelsat OneWeb',
    logo: 'eutelsat-oneweb.svg',
    color: '#003DA5',
    aliases: ['eutelsat oneweb', 'eutelsat-oneweb', 'oneweb'],
  },
  {
    short: 'Iridium',
    full: 'Iridium Communications',
    logo: 'iridium.svg',
    color: '#00477F',
    aliases: ['iridium', 'iridium communications'],
  },
  {
    short: 'Planet Labs',
    full: 'Planet Labs PBC',
    logo: 'planet-labs.svg',
    color: '#1B9E77',
    aliases: ['planet labs', 'planet-labs', 'planet labs pbc'],
  },
];

// Reverse-lookup map built once at module load.
const BY_ALIAS = new Map<string, AgencyInfo>();
for (const a of AGENCIES) {
  for (const alias of a.aliases) {
    BY_ALIAS.set(alias.trim().toLowerCase(), a);
  }
}

/**
 * Resolve a single agency string to its registry entry. Trims +
 * lowercases the input before lookup. Returns null if no agency
 * matches.
 */
export function resolveAgency(input: string | null | undefined): AgencyInfo | null {
  if (!input) return null;
  return BY_ALIAS.get(input.trim().toLowerCase()) ?? null;
}

/**
 * Split a possibly-compound agency string into its component agency
 * strings (raw, not registry-resolved). Strips a "Multi (...)" wrapper
 * if present, then splits on " / ", " + ", " & ". Whitespace-trimmed,
 * empties dropped.
 *
 * Use this for chip-building + filter-equality checks where the chip
 * label needs to be the raw agency name as it appears in data. Use
 * resolveAgencyCompound() when you need the registry entries instead.
 */
export function splitAgencies(input: string | null | undefined): string[] {
  if (!input) return [];
  const inner = input.replace(/^\s*Multi\s*\((.*)\)\s*$/i, '$1');
  return inner
    .split(/\s*[/+&]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolve a possibly-compound agency string (e.g. "NASA / ESA",
 * "Multi (NASA / ESA / ASI)", "Northrop Grumman + Lockheed Martin")
 * to all matching registry entries, preserving order, de-duplicated.
 * Components that don't resolve are silently dropped.
 */
export function resolveAgencyCompound(input: string | null | undefined): AgencyInfo[] {
  const out: AgencyInfo[] = [];
  for (const part of splitAgencies(input)) {
    const a = resolveAgency(part);
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

/**
 * Logo URL (with SvelteKit base path prepended) for an agency string,
 * or null if no logo ships. For compound strings like "NASA / ESA / ASI"
 * the FIRST resolved component's logo is returned (the primary agency
 * convention — matches how mission / fleet cards take their accent
 * from the lead partner). For multi-logo stacks use AgencyBadge /
 * agencyToLogoPaths instead.
 */
export function agencyLogo(input: string | null | undefined): string | null {
  const a = resolveAgency(input) ?? resolveAgencyCompound(input)[0] ?? null;
  return a?.logo ? `${base}/logos/${a.logo}` : null;
}

/**
 * Canonical short name (e.g. "NASA", "Roscosmos"). Falls back to the
 * input string if the agency isn't in the registry.
 */
export function agencyShortName(input: string | null | undefined): string {
  return resolveAgency(input)?.short ?? input ?? '';
}

/**
 * Spelled-out full name (e.g. "National Aeronautics and Space
 * Administration"). Falls back to the input string if not registered.
 */
export function agencyFullName(input: string | null | undefined): string {
  return resolveAgency(input)?.full ?? input ?? '';
}

/**
 * Canonical brand color for the (possibly-compound) agency string, or
 * null when no color is registered. For compound agencies the FIRST
 * resolved component's color wins — matches the convention that a
 * mission card takes its accent from the primary partner.
 */
export function agencyColor(input: string | null | undefined): string | null {
  const compound = resolveAgencyCompound(input);
  return compound[0]?.color ?? null;
}
