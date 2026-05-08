/**
 * Agency-string → logo-path resolver for module/visitor list rendering.
 *
 * The `agency` field in iss-modules.json / iss-visitors.json /
 * tiangong-* uses display names ("NASA", "Roscosmos", "Northrop Grumman",
 * "NASA / ESA", "CMSA", etc.). This helper resolves each known display
 * name to the local SVG asset path under `/logos/`. Compound names
 * separated by "/" return multiple paths.
 *
 * Returns an empty array if no logo asset is available for that agency
 * (caller falls back to text-only display).
 */
import { base } from '$app/paths';

const AGENCY_TO_LOGO: Record<string, string> = {
  // Direct local matches.
  nasa: 'nasa.svg',
  roscosmos: 'roscosmos.svg',
  esa: 'esa.svg',
  jaxa: 'jaxa.svg',
  isro: 'isro.svg',
  cnsa: 'cnsa.svg',
  spacex: 'spacex.svg',
  uaesa: 'uaesa.svg',
  csa: 'csa.svg',
  boeing: 'boeing.svg',
  'northrop grumman': 'northrop-grumman.svg',

  // CMSA = China Manned Space Agency, under CNSA umbrella — reuse CNSA mark.
  cmsa: 'cnsa.svg',

  // Aliases for compound names.
  'european space agency': 'esa.svg',
  'japan aerospace exploration agency': 'jaxa.svg',
  'china national space administration': 'cnsa.svg',
  'china manned space agency': 'cnsa.svg',
  'canadian space agency': 'csa.svg',
  'northrop grumman space systems': 'northrop-grumman.svg',
  'boeing defense, space & security': 'boeing.svg',
};

/**
 * Resolve an agency display string to a list of logo paths. Compound
 * agencies separated by "/" or "+" return multiple paths.
 */
export function agencyToLogoPaths(agency: string | undefined): string[] {
  if (!agency) return [];
  const tokens = agency
    .split(/[/+&]/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
  const paths: string[] = [];
  for (const token of tokens) {
    const file = AGENCY_TO_LOGO[token];
    if (file) {
      const path = `${base}/logos/${file}`;
      if (!paths.includes(path)) paths.push(path);
    }
  }
  return paths;
}
