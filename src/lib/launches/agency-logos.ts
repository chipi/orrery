/**
 * Agency logo + short-name lookups for /missions/launches.
 *
 * LL2 returns full agency names like "National Aeronautics and Space
 * Administration" and "China Aerospace Science and Technology
 * Corporation". The dropdown shows the full name in option rows but
 * uses the short name on the trigger pill so it stays compact.
 *
 * Thin wrapper over the unified registry at $lib/agencies. Add
 * agencies / logos / LL2 aliases there, not here.
 */
import { agencyLogo, agencyShortName } from '$lib/agencies';

export function launchAgencyLogo(agency: string): string | null {
  return agencyLogo(agency);
}

export function launchAgencyShortName(agency: string): string {
  return agencyShortName(agency);
}
