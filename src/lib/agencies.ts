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
   * The agency's data colour: the mission-card accent and badge, the agency filter dot. The 14
   * agencies that fly on /missions carry the one palette of UXD-048 (4.5:1 on the page and the
   * card, told apart under colour-blind simulation, no cyan or teal); the rest keep their brand
   * colour. null when no colour applies (e.g. defunct concepts, brand-agnostic shorthands).
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
    color: '#2e72fa', // UXD-048 palette
    aliases: ['nasa', 'national aeronautics and space administration'],
  },
  {
    short: 'ESA',
    full: 'European Space Agency',
    logo: 'esa.svg',
    color: '#e444c9', // UXD-048 palette
    aliases: ['esa', 'european space agency'],
  },
  {
    short: 'JAXA',
    full: 'Japan Aerospace Exploration Agency',
    logo: 'jaxa.svg',
    color: '#eb7085', // UXD-048 palette
    aliases: ['jaxa', 'japan aerospace exploration agency'],
  },
  {
    short: 'ISRO',
    full: 'Indian Space Research Organisation',
    logo: 'isro.svg',
    color: '#fa942e', // UXD-048 palette
    aliases: ['isro', 'indian space research organisation', 'indian space research organization'],
  },
  {
    short: 'CNSA',
    full: 'China National Space Administration',
    logo: 'cnsa.svg',
    color: '#fa2e2e', // UXD-048 palette
    aliases: ['cnsa', 'china national space administration'],
  },
  {
    // China Manned Space Agency — runs China's crewed programme (Shenzhou,
    // Tiangong, Tianzhou), separate from CNSA, so CNSA's insignia is not its
    // mark. No free emblem exists (Commons has only a text wordmark, unreadable
    // at badge size): the badge shows the name alone.
    short: 'CMSA',
    full: 'China Manned Space Agency',
    logo: null,
    color: '#fc92b5', // UXD-048 palette
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
    color: '#f1ab9d', // UXD-048 palette
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
    color: '#60fb7a', // UXD-048 palette
    aliases: ['uaesa', 'mbrsc', 'mohammed bin rashid space centre', 'uae space agency'],
  },
  {
    short: 'USSF',
    full: 'United States Space Force',
    logo: 'ussf.svg',
    color: '#ab9df1', // UXD-048 palette
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
    color: '#9df1b9', // UXD-048 palette
    aliases: ['asi', 'agenzia spaziale italiana', 'italian space agency'],
  },

  // ─── Launch providers + spacecraft manufacturers ───────────────────
  {
    short: 'SpaceX',
    full: 'SpaceX',
    logo: 'spacex.svg',
    color: '#d5d9e2', // UXD-048 palette
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
    color: '#2e94fa', // UXD-048 palette
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
    color: '#e44494', // UXD-048 palette
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
    color: '#92c7fc', // UXD-048 palette
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
    color: '#1B9E77', // a3-keep: agency identity colour, confirmed by the operator 2026-11-13
    aliases: ['planet labs', 'planet-labs', 'planet labs pbc'],
  },

  // ─── Newspace launch operators surfaced via LL2 — no logo SVG yet ──
  {
    short: 'Rocket Lab',
    full: 'Rocket Lab',
    logo: null,
    color: '#000000',
    aliases: ['rocket lab', 'rocket lab usa'],
  },
  {
    short: 'Avio',
    full: 'Avio S.p.A',
    logo: null,
    color: '#003c71',
    aliases: ['avio', 'avio s.p.a', 'avio spa'],
  },
  {
    short: 'Firefly',
    full: 'Firefly Aerospace',
    logo: null,
    color: '#ff6600',
    aliases: ['firefly', 'firefly aerospace'],
  },
  {
    short: 'Relativity',
    full: 'Relativity Space',
    logo: null,
    color: '#5d2a86',
    aliases: ['relativity', 'relativity space'],
  },
  {
    short: 'MHI',
    full: 'Mitsubishi Heavy Industries',
    logo: null,
    color: '#cc0000',
    aliases: ['mitsubishi heavy industries', 'mhi'],
  },
  {
    short: 'Astra',
    full: 'Astra Space',
    logo: null,
    color: '#000000',
    aliases: ['astra', 'astra space'],
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

/**
 * The colour to draw an agency as a DATA mark (a dot, a bar) on the dark page: its registry colour,
 * lifted toward white until it clears 4.5:1 on the page and the card for the agencies that still
 * carry a dark brand colour (the 14 agencies of /missions already do, so they are returned as
 * they are). null when the agency has no colour.
 */
export function agencyDataColor(input: string | null | undefined): string | null {
  const c = agencyColor(input);
  if (!c || !/^#[0-9a-f]{6}$/i.test(c)) return c;
  const lum = (hex: string) => {
    const lin = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (hex: string) => (lum(hex) + 0.05) / (lum('#0a0a16') + 0.05);
  let out = c;
  for (let t = 0.1; ratio(out) < 4.5 && t <= 1; t += 0.1) {
    const mix = [1, 3, 5].map((i) => {
      const v = parseInt(c.slice(i, i + 2), 16);
      return Math.round(v + (255 - v) * t)
        .toString(16)
        .padStart(2, '0');
    });
    out = '#' + mix.join('');
  }
  return out;
}
