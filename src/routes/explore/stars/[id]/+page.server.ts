import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getStarEntity, type StarPlanet } from '$lib/data/star-entity';
import * as m from '$lib/paraglide/messages';
import { constellationName } from '$lib/universe/iau-constellations';
import { bvToKelvin } from '$lib/universe/bv-to-rgb';
import { colorNameForKelvin } from '$lib/universe/anonymous-star';
import { starPageIds } from '../../../../../scripts/site-routes.mjs';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /explore/stars/<id> — one named star, with its exoplanet system (if it has one) as a
 * section, as an indexable page (0.9.9 SEO). The scene's ?goto= / ?system= panels stay the
 * in-app view; this page links to them. Typed under /explore/stars so a star id never meets
 * a planet, moon or small-body id.
 */
export const prerender = true;

export const entries: EntryGenerator = () => starPageIds().map((id: string) => ({ id }));

const PC_TO_LY = 3.2615638;

/** Same maximum-fraction-digit rounding as the panels (no trailing zeros), in the page's locale. */
const num = (locale: string, v: number, maxFraction: number) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: maxFraction }).format(v);

type Row = { label: string; value: string };

function colourLabel(bv: number): { label: string; kelvin: number } {
  const kelvin = Math.round(bvToKelvin(bv));
  const names: Record<string, () => string> = {
    'blue-white': m.star_color_blue_white,
    white: m.star_color_white,
    'yellow-white': m.star_color_yellow_white,
    yellow: m.star_color_yellow,
    orange: m.star_color_orange,
    red: m.star_color_red,
  };
  const name = colorNameForKelvin(kelvin);
  return { label: names[name]?.() ?? name, kelvin };
}

/** The TECHNICAL rows of the star panel, in its order. */
function starRows(
  s: {
    bv: number | null;
    distPc: number;
    mag?: number;
    absmag?: number;
    spect: string | null;
    con: string | null;
    hip: number | null;
  },
  locale: string,
): Row[] {
  const rows: Row[] = [];
  if (s.bv !== null) {
    const c = colourLabel(s.bv);
    rows.push({
      label: m.star_label_colour(),
      value: `${c.label} · ~${c.kelvin.toLocaleString(locale)} K`,
    });
  }
  rows.push(
    { label: m.star_label_distance(), value: `${num(locale, s.distPc * PC_TO_LY, 2)} ly` },
    { label: m.star_label_distance_pc(), value: `${num(locale, s.distPc, 2)} pc` },
  );
  if (s.mag !== undefined)
    rows.push({ label: m.star_label_apparent_mag(), value: num(locale, s.mag, 2) });
  if (s.absmag !== undefined)
    rows.push({ label: m.star_label_absolute_mag(), value: num(locale, s.absmag, 2) });
  if (s.spect) rows.push({ label: m.sun_label_spectral_class(), value: s.spect });
  if (s.con) rows.push({ label: m.star_label_constellation(), value: constellationName(s.con) });
  if (s.hip) rows.push({ label: m.star_label_catalogue(), value: `HIP ${s.hip}` });
  return rows;
}

/** The exoplanet panel's rows for one planet. */
function planetRows(p: StarPlanet, locale: string): Row[] {
  const rows: Row[] = [
    {
      label: m.exo_label_period(),
      value: `${num(locale, p.period_days, 3)} ${m.exo_days()}`,
    },
    { label: m.exo_label_axis(), value: `${num(locale, p.a_au, 4)} AU` },
    { label: m.exo_label_eccentricity(), value: num(locale, p.e, 3) },
  ];
  if (p.radius_earth != null)
    rows.push({ label: m.exo_label_radius(), value: `${num(locale, p.radius_earth, 2)} R⊕` });
  if (p.mass_earth != null)
    rows.push({ label: m.exo_label_mass(), value: `${num(locale, p.mass_earth, 2)} M⊕` });
  if (p.disc_year != null)
    rows.push({
      label: m.exo_label_discovery(),
      value: `${p.disc_year}${p.disc_method ? ` · ${p.disc_method}` : ''}`,
    });
  return rows;
}

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const star = await getStarEntity(params.id, locale, fetch);
  if (!star) throw error(404, `Unknown star: ${params.id}`);
  return {
    star,
    kind: [star.spect, star.con ? constellationName(star.con) : null].filter(Boolean).join(' · '),
    rows: starRows(star, locale),
    planetCount: star.planets.length
      ? m.star_system_planet_count({ count: star.planets.length })
      : null,
    planetRows: Object.fromEntries(star.planets.map((p) => [p.id, planetRows(p, locale)])),
  };
};
