/**
 * Fleet → SurfaceSite adapter for /earth launchpad markers (#285 Phase 2 B3).
 *
 * `static/data/fleet/launch-site/*.json` ships in the fleet catalogue
 * shape (PRD-012 / RFC-016) with lat/lon already populated per #285
 * Phase 1. SurfaceScene expects `SurfaceSite[]` descriptors. This
 * adapter translates at runtime — no parallel surface-site JSON files
 * are persisted to disk for Earth launchpads. The fleet entry stays
 * the source of truth; SurfaceScene sees a derived view.
 *
 * Mapping rules:
 *   - id           → id (already lowercase-kebab)
 *   - kind         → 'surface' (constant; every launch-site is a
 *                    geographic place)
 *   - agency       → mapped via AGENCY_MAP (fleet uses 'Roscosmos',
 *                    SurfaceSite enum uses 'ROSCOSMOS'; SpaceX +
 *                    Arianespace added to the enum to honestly
 *                    represent operators)
 *   - nation       → derived from country + year (Baikonur pre-1992 =
 *                    USSR; post-1992 = Russia)
 *   - year         → parsed from first_flight (YYYY-MM-DD prefix)
 *   - lat, lon     → direct passthrough
 *   - status       → mapped (fleet 'RETIRED' → SurfaceSite 'ENDED')
 *   - surface_status → derived from status (ACTIVE→ongoing, RETIRED→
 *                    completed, PLANNED→planned)
 *   - credit, links → direct passthrough
 *   - name         → from locale overlay (already merged by getFleet)
 */
import { getFleetByCategory, getFleetGallery } from '$lib/data';
import type {
  SurfaceSite,
  SurfaceAgency,
  SurfaceNation,
  SiteStatus,
  SurfaceStatus,
} from '$types/surface-site';
import type { FleetEntry, FleetStatus } from '$types/fleet';

const AGENCY_MAP: Record<string, SurfaceAgency> = {
  NASA: 'NASA',
  Roscosmos: 'ROSCOSMOS',
  ROSCOSMOS: 'ROSCOSMOS',
  CNSA: 'CNSA',
  ISRO: 'ISRO',
  JAXA: 'JAXA',
  ESA: 'ESA',
  'ESA / Arianespace': 'ESA',
  Arianespace: 'Arianespace',
  SpaceX: 'SpaceX',
  // Cape Canaveral SLC-40 + Vandenberg SLC-4E are pads on USSF
  // property operated by SpaceX. The operating agency is what
  // matters for the panel attribution badge.
  'USSF / SpaceX': 'SpaceX',
  USSF: 'NASA', // fallback if a pad entry uses bare USSF (no SpaceX op)
};

/**
 * Country (fleet field) + year → SurfaceSite nation enum. Roscosmos
 * pads in Baikonur sit on Kazakhstani territory but historically
 * belonged to USSR (pre-1992) and to Russia under lease (1992+).
 * Surface-site convention is to attribute by the operating space-
 * faring nation, not the territorial nation.
 */
function mapNation(country: string, year: number): SurfaceNation {
  if (country === 'USA') return 'USA';
  if (country === 'China') return 'China';
  if (country === 'India') return 'India';
  if (country === 'Japan') return 'Japan';
  if (country === 'French Guiana') return 'Europe';
  // Russia / Kazakhstan / Soviet-era — split by year.
  if (country === 'Russia' || country === 'Kazakhstan') {
    return year < 1992 ? 'USSR' : 'Russia';
  }
  // Fallback. Unknown country strings shouldn't reach this point —
  // the launch-site catalogue is curated. If they do, default to the
  // most permissive nation so the entry still renders.
  return 'USA';
}

function mapStatus(s: FleetStatus | undefined): SiteStatus {
  switch (s) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'PLANNED':
      return 'PLANNED';
    case 'FAILED':
      return 'CRASHED';
    case 'RETIRED':
      return 'ENDED';
    case 'FLOWN':
      return 'FLOWN';
    default:
      return 'ENDED';
  }
}

function mapSurfaceStatus(s: FleetStatus | undefined): SurfaceStatus {
  switch (s) {
    case 'ACTIVE':
      return 'ongoing';
    case 'PLANNED':
      return 'planned';
    default:
      return 'completed';
  }
}

function adaptFleetToSurfaceSite(f: FleetEntry): SurfaceSite | null {
  if (typeof f.lat !== 'number' || typeof f.lon !== 'number') return null;
  const yearMatch = (f.first_flight ?? '').match(/^(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 1957;
  const agency = AGENCY_MAP[f.agency] ?? 'NASA';
  const nation = mapNation(f.country ?? '', year);
  return {
    id: f.id,
    kind: 'surface',
    agency,
    nation,
    year,
    lat: f.lat,
    lon: f.lon,
    status: mapStatus(f.status),
    surface_status: mapSurfaceStatus(f.status),
    data_quality: 'good',
    credit: f.credit ?? '',
    links: f.links ?? [],
    name: f.name,
    linked_missions: f.linked_missions,
  };
}

/**
 * Load all launch-site fleet entries (locale-merged) and adapt each
 * to a SurfaceSite descriptor. Used by /earth surface-mode's
 * SurfaceScene `loadSites` prop.
 */
export async function getEarthLaunchSites(locale = 'en-US'): Promise<SurfaceSite[]> {
  const fleetEntries = await getFleetByCategory('launch-site', locale);
  return fleetEntries.map(adaptFleetToSurfaceSite).filter((s): s is SurfaceSite => s !== null);
}

/**
 * Per-site gallery URLs for a launchpad. Thin wrapper around
 * getFleetGallery — galleries are stored under
 * /images/fleet-galleries/{id}/ from #285 Phase 1 follow-up.
 *
 * The second `missionIdFallback` arg matches SurfaceScene's
 * `loadGallery` contract signature; we ignore it here because
 * launch-sites don't share gallery imagery with missions.
 */
export async function getEarthLaunchSiteGallery(
  siteId: string,
  _missionIdFallback?: string,
): Promise<string[]> {
  return getFleetGallery(siteId);
}
