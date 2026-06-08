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
    aliases: ['nasa', 'national aeronautics and space administration'],
  },
  {
    short: 'ESA',
    full: 'European Space Agency',
    logo: 'esa.svg',
    aliases: ['esa', 'european space agency'],
  },
  {
    short: 'JAXA',
    full: 'Japan Aerospace Exploration Agency',
    logo: 'jaxa.svg',
    aliases: ['jaxa', 'japan aerospace exploration agency'],
  },
  {
    short: 'ISRO',
    full: 'Indian Space Research Organisation',
    logo: 'isro.svg',
    aliases: ['isro', 'indian space research organisation', 'indian space research organization'],
  },
  {
    short: 'CNSA',
    full: 'China National Space Administration',
    logo: 'cnsa.svg',
    aliases: ['cnsa', 'china national space administration'],
  },
  {
    // China Manned Space Agency — operates the Tiangong programme under
    // the CNSA umbrella. Reuses CNSA's mark per existing agency-logo.ts.
    short: 'CMSA',
    full: 'China Manned Space Agency',
    logo: 'cnsa.svg',
    aliases: ['cmsa', 'china manned space agency'],
  },
  {
    // CASC builds most Chinese launchers under contract to CNSA. The
    // launches feed surfaces it as the operating agency for many missions.
    short: 'CASC',
    full: 'China Aerospace Science and Technology Corporation',
    logo: 'cnsa.svg',
    aliases: ['casc', 'china aerospace science and technology corporation'],
  },
  {
    short: 'Roscosmos',
    full: 'Roscosmos',
    logo: 'roscosmos.svg',
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
    aliases: ['csa', 'canadian space agency'],
  },
  {
    short: 'UAESA',
    full: 'MBRSC / UAE Space Agency',
    logo: 'uaesa.svg',
    aliases: ['uaesa', 'mbrsc', 'mohammed bin rashid space centre', 'uae space agency'],
  },
  {
    short: 'USSF',
    full: 'United States Space Force',
    logo: 'ussf.svg',
    aliases: ['ussf', 'united states space force', 'us space force'],
  },
  {
    short: 'NOAA',
    full: 'National Oceanic and Atmospheric Administration',
    logo: 'noaa.svg',
    aliases: ['noaa', 'national oceanic and atmospheric administration'],
  },
  {
    short: 'USGS',
    full: 'United States Geological Survey',
    logo: 'usgs.svg',
    aliases: ['usgs', 'united states geological survey'],
  },
  {
    short: 'ASI',
    full: 'Agenzia Spaziale Italiana',
    logo: 'asi.svg',
    aliases: ['asi', 'agenzia spaziale italiana', 'italian space agency'],
  },

  // ─── Launch providers + spacecraft manufacturers ───────────────────
  {
    short: 'SpaceX',
    full: 'SpaceX',
    logo: 'spacex.svg',
    aliases: ['spacex'],
  },
  {
    short: 'Boeing',
    full: 'Boeing',
    logo: 'boeing.svg',
    aliases: ['boeing', 'boeing defense, space & security'],
  },
  {
    short: 'Northrop Grumman',
    full: 'Northrop Grumman',
    logo: 'northrop-grumman.svg',
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
    logo: 'ula.svg',
    aliases: ['ula', 'united launch alliance'],
  },
  {
    short: 'Blue Origin',
    full: 'Blue Origin',
    logo: 'blue-origin.svg',
    aliases: ['blue origin', 'blue-origin'],
  },
  {
    short: 'Arianespace',
    full: 'Arianespace',
    logo: 'arianespace.svg',
    aliases: ['arianespace'],
  },

  // ─── New-space crew + lunar / lander companies ─────────────────────
  {
    short: 'Axiom Space',
    full: 'Axiom Space',
    logo: 'axiom-space.svg',
    aliases: ['axiom space', 'axiom-space'],
  },
  {
    short: 'Intuitive Machines',
    full: 'Intuitive Machines',
    logo: 'intuitive-machines.svg',
    aliases: ['intuitive machines', 'intuitive-machines'],
  },
  {
    short: 'ispace',
    full: 'ispace',
    logo: 'ispace.svg',
    aliases: ['ispace'],
  },
  {
    short: 'SpaceIL',
    full: 'SpaceIL',
    logo: 'spaceil.svg',
    aliases: ['spaceil'],
  },

  // ─── Commercial constellation operators ────────────────────────────
  {
    short: 'Amazon',
    full: 'Amazon',
    logo: 'amazon.svg',
    aliases: ['amazon'],
  },
  {
    short: 'SES',
    full: 'SES',
    logo: 'ses.svg',
    aliases: ['ses'],
  },
  {
    short: 'Sirius XM',
    full: 'Sirius XM',
    logo: 'siriusxm.svg',
    aliases: ['sirius xm', 'sirius-xm', 'siriusxm'],
  },
  {
    short: 'Viasat',
    full: 'Viasat',
    logo: 'viasat.svg',
    aliases: ['viasat', 'viasat (formerly inmarsat plc)'],
  },
  {
    short: 'Eutelsat OneWeb',
    full: 'Eutelsat OneWeb',
    logo: 'eutelsat-oneweb.svg',
    aliases: ['eutelsat oneweb', 'eutelsat-oneweb', 'oneweb'],
  },
  {
    short: 'Iridium',
    full: 'Iridium Communications',
    logo: 'iridium.svg',
    aliases: ['iridium', 'iridium communications'],
  },
  {
    short: 'Planet Labs',
    full: 'Planet Labs PBC',
    logo: 'planet-labs.svg',
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
 * Resolve a possibly-compound agency string (e.g. "NASA / ESA",
 * "Multi (NASA / ESA / ASI)", "Northrop Grumman + Lockheed Martin")
 * to all matching registry entries, preserving order, de-duplicated.
 * Components that don't resolve are silently dropped.
 */
export function resolveAgencyCompound(input: string | null | undefined): AgencyInfo[] {
  if (!input) return [];
  const inner = input.replace(/^\s*Multi\s*\((.*)\)\s*$/i, '$1');
  const out: AgencyInfo[] = [];
  for (const part of inner.split(/\s*[/+&]\s*/)) {
    const a = resolveAgency(part);
    if (a && !out.includes(a)) out.push(a);
  }
  return out;
}

/**
 * Logo URL (with SvelteKit base path prepended) for an agency string,
 * or null if no logo ships for that agency.
 */
export function agencyLogo(input: string | null | undefined): string | null {
  const a = resolveAgency(input);
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
