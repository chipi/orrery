/**
 * Compound-agency logo resolver for module / visitor list rendering.
 *
 * The `agency` field on ISS / Tiangong modules + visitors uses display
 * strings like "NASA", "NASA / ESA", "Northrop Grumman", "Multi (NASA /
 * ESA / ASI)". This helper returns one logo path per recognised
 * component agency, deduplicated and ordered as listed in the source
 * string. Components not in the registry (or with no logo asset) are
 * silently dropped.
 *
 * Thin wrapper over the unified registry at $lib/agencies. Add agencies
 * + logos there, not here.
 */
import { resolveAgencyCompound, type AgencyInfo } from '$lib/agencies';
import { base } from '$app/paths';

export function agencyToLogoPaths(agency: string | undefined): string[] {
  const out: string[] = [];
  for (const a of resolveAgencyCompound(agency)) {
    if (!a.logo) continue;
    const path = `${base}/logos/${a.logo}`;
    if (!out.includes(path)) out.push(path);
  }
  return out;
}

/** Same as agencyToLogoPaths but pairs each path with the resolved
 *  short + full agency names — for per-logo tooltips. */
export interface AgencyLogoEntry {
  path: string;
  short: string;
  full: string;
}

export function agencyToLogoEntries(agency: string | undefined): AgencyLogoEntry[] {
  const out: AgencyLogoEntry[] = [];
  const seen = new Set<string>();
  for (const a of resolveAgencyCompound(agency)) {
    if (!a.logo) continue;
    const path = `${base}/logos/${a.logo}`;
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({ path, short: a.short, full: a.full });
  }
  return out;
}

export type { AgencyInfo };
