/**
 * /programs/<id>: which sections the page draws and in what order (E1, UXD-032), and the pure
 * helpers its rails use. A section with no rows draws nothing, label included.
 */
import type { ProgramBase, ProgramRosterItem, ProgramSeeAlso } from '$types/program';

export type ProgramSection = 'missions' | 'surface' | 'hardware' | 'related' | 'deeper' | 'sources';

type SectionInput = Pick<
  ProgramBase,
  'roster' | 'surface_sites' | 'see_also' | 'related_programs' | 'links'
>;

/** The timeline rows: linked missions and named context rows, undated ones last. */
export function missionRows(roster: ProgramRosterItem[]): ProgramRosterItem[] {
  return roster
    .filter((r) => r.ref === 'mission' || (!r.ref && !!r.name))
    .slice()
    .sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity));
}

export const hardwareRows = (roster: ProgramRosterItem[]): ProgramRosterItem[] =>
  roster.filter((r) => r.ref === 'fleet');

/**
 * "Go deeper" drops its `program` rows: every one repeats an entry of `related_programs`, which the
 * related rail already shows (the data keeps them).
 */
export const deeperLinks = (seeAlso: ProgramSeeAlso[] | undefined): ProgramSeeAlso[] =>
  (seeAlso ?? []).filter((s) => s.kind !== 'program');

/** The sections that have rows, in page order. */
export function programSections(p: SectionInput): ProgramSection[] {
  const out: ProgramSection[] = [];
  if (missionRows(p.roster).length) out.push('missions');
  if (p.surface_sites?.length) out.push('surface');
  if (hardwareRows(p.roster).length) out.push('hardware');
  if (p.related_programs?.length) out.push('related');
  if (deeperLinks(p.see_also).length) out.push('deeper');
  if (p.links.length) out.push('sources');
  return out;
}

/**
 * The Worlds' URL of a surface site, without the locale prefix. Moon, Mars and Venus read `site`;
 * Earth's objects (ISS, telescopes, constellations) are a different layer and read `object`.
 */
export function surfaceSiteHref(surface: string, site: string): string {
  return `/${surface}?${surface === 'earth' ? 'object' : 'site'}=${site}`;
}

/** The served path of a `missions/<id>/<n>` or `fleet/<id>/<n>` hero reference (programs index `hero`). */
export function reuseHeroPath(hero: string | undefined): string | null {
  if (!hero) return null;
  const parts = hero.split('/');
  const id = parts.slice(1, -1).join('/');
  const n = parts[parts.length - 1];
  if (parts[0] === 'missions') return `/images/missions/${id}/${n}.webp`;
  if (parts[0] === 'fleet') return `/images/fleet-galleries/${id}/${n}.webp`;
  return null;
}
