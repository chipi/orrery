/**
 * Nation-colour palette + helpers shared by /moon and /mars surface
 * maps (#42 SurfaceMap extraction).
 *
 * Pre-extraction each route declared its own NATION_COLORS + nationKey
 * + colorFor + nationChipFor. /moon had 5 entries; /mars had 7
 * (adds Europe + UAE for ESA + UAESA missions). The union of both
 * covers /moon's smaller set without breaking — unused entries are
 * harmless.
 */
import type { SurfaceSite } from '$types/surface-site';

/** Union of every nation tag any surface site uses on /moon + /mars. */
export const NATION_COLORS: Record<string, string> = {
  USA: '#0B3D91',
  'USSR/Russia': '#8B0000',
  Europe: '#003299',
  China: '#DE2910',
  India: '#FF9933',
  Japan: '#003087',
  UAE: '#00732F',
  Israel: '#0038B8',
};

/** Collapse USSR + Russia to a single legend key (the lineage reads
 *  as one space programme). */
export function nationKey(nation: string): string {
  if (nation === 'USSR' || nation === 'Russia') return 'USSR/Russia';
  return nation;
}

/** Hex colour for a surface site, falling back to neutral grey. */
export function colorFor(site: Pick<SurfaceSite, 'nation'>): string {
  return NATION_COLORS[nationKey(site.nation)] ?? '#888';
}

/** Per-site nation-+-agency badge used by the side panel + tier-context
 *  card. Returns `{ label, color }` for direct render. Falls back to
 *  the raw nation string when no specific mapping matches. */
export function nationChipFor(site: Pick<SurfaceSite, 'nation' | 'agency'>): {
  label: string;
  color: string;
} {
  const nation = site.nation ?? '';
  const agency = site.agency ?? '';
  if (nation === 'USA' || agency === 'NASA') return { label: 'USA · NASA', color: '#3b82f6' };
  if (nation === 'USSR' || nation === 'Russia' || agency === 'ROSCOSMOS')
    return { label: 'USSR · Roscosmos', color: '#ef4444' };
  if (nation === 'China' || agency === 'CNSA') return { label: 'China · CNSA', color: '#dc2626' };
  if (nation === 'India' || agency === 'ISRO') return { label: 'India · ISRO', color: '#f97316' };
  if (nation === 'Japan' || agency === 'JAXA') return { label: 'Japan · JAXA', color: '#1d4ed8' };
  if (nation === 'Israel' || agency === 'SpaceIL')
    return { label: 'Israel · SpaceIL', color: '#1d4ed8' };
  if (nation === 'Europe' || agency === 'ESA' || agency === 'Arianespace')
    return { label: 'Europe · ESA', color: '#1d4ed8' };
  if (nation === 'UK' || agency === 'ESA-UK') return { label: 'UK · ESA', color: '#1d4ed8' };
  if (nation === 'UAE' || agency === 'UAESA') return { label: 'UAE · UAESA', color: '#00732F' };
  // SpaceX-operated pads on USSF property (#285 Phase 2). Distinct
  // from NASA — the operating agency drives the badge attribution.
  if (agency === 'SpaceX') return { label: 'USA · SpaceX', color: '#3b82f6' };
  return { label: nation || agency || '—', color: 'rgba(255,255,255,0.5)' };
}

/**
 * Map an operating-agency string to a NATION_COLORS key, for objects that
 * carry only an agency (e.g. /earth's EarthObjects expose `agencies[]`, not a
 * `nation`). Keys returned MUST equal NATION_COLORS keys so the nation legend
 * filter can match. Returns null when the agency has no legend nation (e.g.
 * CSA / Canada has no palette entry) — callers treat null as "unattributed,
 * always visible". Commercial operators bucket to their home nation.
 */
export function agencyNationKey(agency: string | undefined | null): string | null {
  if (!agency) return null;
  const a = agency.toLowerCase();
  // USA — civil, military + the US commercial operators in the EarthObject set.
  if (
    /\b(nasa|noaa|usgs|ussf|spacex|amazon|planet labs|iridium|sirius|viasat|globalstar|maxar)\b/.test(
      a,
    )
  )
    return 'USA';
  if (/\b(roscosmos|russia|ussr)\b/.test(a)) return 'USSR/Russia';
  if (/\b(cnsa|china)\b/.test(a)) return 'China';
  if (/\b(isro|india)\b/.test(a)) return 'India';
  if (/\b(jaxa|japan)\b/.test(a)) return 'Japan';
  if (/\b(uaesa|uae)\b/.test(a)) return 'UAE';
  // Europe — ESA + EU bodies + the European commercial operators.
  if (/\b(esa|arianespace|european commission|eutelsat|oneweb|ses)\b/.test(a)) return 'Europe';
  return null;
}

/**
 * Nation key for an object identified by its agency list — buckets by the
 * FIRST (primary) agency that resolves to a nation, matching the primary-
 * attribution convention (ADR-046). Null when none resolve.
 */
export function objectNationKey(obj: { agencies?: string[] | null }): string | null {
  for (const a of obj.agencies ?? []) {
    const key = agencyNationKey(a);
    if (key) return key;
  }
  return null;
}
