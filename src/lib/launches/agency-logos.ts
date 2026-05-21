/**
 * Agency-name → logo & short-name mapping for /missions/launches.
 *
 * LL2 returns full agency names like "National Aeronautics and Space
 * Administration" and "China Aerospace Science and Technology
 * Corporation". The dropdown shows the full name in option rows but
 * uses the short name on the trigger pill so it stays compact.
 */

import { base } from '$app/paths';

const AGENCY_TO_LOGO: Record<string, string> = {
  // Direct matches (lowercase keys)
  nasa: 'nasa',
  spacex: 'spacex',
  esa: 'esa',
  jaxa: 'jaxa',
  isro: 'isro',
  cnsa: 'cnsa',
  roscosmos: 'roscosmos',
  uaesa: 'uaesa',
  boeing: 'boeing',
  csa: 'csa',
  'northrop grumman': 'northrop-grumman',
  // LL2 full-name aliases
  'national aeronautics and space administration': 'nasa',
  'european space agency': 'esa',
  'japan aerospace exploration agency': 'jaxa',
  'indian space research organization': 'isro',
  'indian space research organisation': 'isro',
  'china national space administration': 'cnsa',
  'china aerospace science and technology corporation': 'cnsa',
  'russian federal space agency (roscosmos)': 'roscosmos',
  'russian federal space agency': 'roscosmos',
  'russian space agency': 'roscosmos',
  'canadian space agency': 'csa',
  mbrsc: 'uaesa',
  'mohammed bin rashid space centre': 'uaesa',
  'uae space agency': 'uaesa',
};

/**
 * Compact display name for the dropdown trigger. Long LL2 names are
 * collapsed to their canonical short form (NASA, CASC, ESA, …) so
 * the pill doesn't blow out the filter strip.
 */
const SHORT_NAMES: Record<string, string> = {
  'national aeronautics and space administration': 'NASA',
  'european space agency': 'ESA',
  'japan aerospace exploration agency': 'JAXA',
  'indian space research organization': 'ISRO',
  'indian space research organisation': 'ISRO',
  'china national space administration': 'CNSA',
  'china aerospace science and technology corporation': 'CASC',
  'russian federal space agency (roscosmos)': 'Roscosmos',
  'russian federal space agency': 'Roscosmos',
  'russian space agency': 'Roscosmos',
  'canadian space agency': 'CSA',
  'mohammed bin rashid space centre': 'MBRSC',
  'uae space agency': 'UAESA',
  'united launch alliance': 'ULA',
  'northrop grumman': 'Northrop Grumman',
  arianespace: 'Arianespace',
};

export function launchAgencyLogo(agency: string): string | null {
  const key = AGENCY_TO_LOGO[agency.toLowerCase()];
  return key ? `${base}/logos/${key}.svg` : null;
}

export function launchAgencyShortName(agency: string): string {
  return SHORT_NAMES[agency.toLowerCase()] ?? agency;
}
