import { readFileSync } from 'node:fs';
import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getBodyEntity, type BodyStats } from '$lib/data/body-entity';
import { getScienceSection } from '$lib/data';
import { formatNumber } from '$lib/format';
import * as m from '$lib/paraglide/messages';
import type { LocaleCode } from '$lib/locale';
import type { ScienceTabId } from '$types/science';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /explore/<id> — one planet, moon or small body as an indexable page (0.9.8
 * SEO). The 3D explorer's ?id= panel stays the in-app view; this page links to it.
 */
export const prerender = true;

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

// Pluto is in both planets.json and small-bodies.json; one page (the loader
// takes the planet record first).
export const entries: EntryGenerator = () =>
  [
    ...new Set([
      ...read<{ planets: { name: string }[] }>('static/data/planets.json').planets.map((p) =>
        p.name.toLowerCase(),
      ),
      ...read<{ satellites: { id: string }[] }>('static/data/satellites.json').satellites.map(
        (s) => s.id,
      ),
      ...read<{ bodies: { id: string }[] }>('static/data/small-bodies.json').bodies.map(
        (b) => b.id,
      ),
    ]),
  ].map((id) => ({ id }));

// Moon and small-body names are English in the data; the glossary holds each
// locale's native form (planets carry theirs in the overlay).
const GLOSSARY = read<{ body: Record<string, Record<string, string>> }>(
  'scripts/i18n-tools/native-terms.json',
).body;

/** The panels' numbers as "label: value" rows, in the order the panels show them. */
function factRows(stats: BodyStats, locale: LocaleCode) {
  const n = (v: number, d = 0) => formatNumber(v, locale, d);
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, value: string | undefined) => value && rows.push({ label, value });
  const au = (v?: number) => (v === undefined ? undefined : `${n(v, 3)} AU`);
  const km = (v?: number) => (v === undefined ? undefined : `${n(v)} km`);
  const bound = stats.eccentricity === undefined || stats.eccentricity < 1;
  add(m.panel_label_semi_major_axis(), au(stats.semiMajorAxisAu));
  add(m.panel_satellite_orbit_label(), km(stats.semiMajorAxisKm));
  add(
    m.panel_label_eccentricity(),
    stats.eccentricity === undefined ? undefined : n(stats.eccentricity, 4),
  );
  add(
    m.panel_label_inclination(),
    stats.inclinationDeg === undefined ? undefined : `${n(stats.inclinationDeg, 2)}°`,
  );
  if (bound && stats.periodDays !== undefined)
    add(
      m.panel_label_orbital_period(),
      m.panel_satellite_period_unit_days({
        value: n(stats.periodDays, stats.periodDays < 1000 ? 2 : 0),
      }),
    );
  add(m.panel_satellite_radius_label(), km(stats.radiusKm));
  add(
    m.panel_label_axial_tilt(),
    stats.axialTiltDeg === undefined ? undefined : `${n(stats.axialTiltDeg, 2)}°`,
  );
  add(m.panel_satellite_discovered_label(), stats.discovered);
  return rows;
}

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const body = await getBodyEntity(params.id, locale, fetch);
  if (!body) throw error(404, `Unknown body: ${params.id}`);
  if (body.kind !== 'planet') body.name = GLOSSARY[body.name]?.[locale] ?? body.name;

  // The /science sections the body points at: title and one-liner in this locale, plus the
  // body-specific reason the overlay carries.
  const science = (
    await Promise.all(
      body.science.map(async (ref) => {
        const sec = await getScienceSection(ref.tab as ScienceTabId, ref.section, locale, fetch);
        return sec
          ? {
              href: `/science/${ref.tab}/${ref.section}`,
              title: sec.title,
              intro: sec.intro_sentence,
              why: ref.why,
            }
          : null;
      }),
    )
  ).filter((x) => x !== null);
  return { body, facts: factRows(body.stats, locale as LocaleCode), science };
};
