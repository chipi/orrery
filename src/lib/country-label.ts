import * as m from '$lib/paraglide/messages';

/**
 * Fleet, program and launch-site records carry the country in English
 * ("USA", "USSR / Russia", "Multi (Europe)"). Geography is written in the
 * viewer's language (style guide §2), so the label is resolved here: a whole
 * value first, else each "/"-separated part. An unknown value is shown as
 * stored.
 */
const COUNTRY: Record<string, () => string> = {
  USA: m.country_usa,
  USSR: m.country_ussr,
  China: m.country_china,
  Russia: m.country_russia,
  Japan: m.country_japan,
  India: m.country_india,
  Europe: m.country_europe,
  'Multi (Europe)': m.country_multi_europe,
  'Multi (ESA members)': m.country_multi_esa,
  'French Guiana': m.country_french_guiana,
  Kazakhstan: m.country_kazakhstan,
  Israel: m.country_israel,
  Australia: m.country_australia,
  'United Kingdom': m.country_uk,
  UK: m.country_uk,
  International: m.country_international,
  UAE: m.country_uae,
  'South Korea': m.country_south_korea,
  'North Korea': m.country_north_korea,
  'New Zealand': m.country_new_zealand,
  Luxembourg: m.country_luxembourg,
  Kenya: m.country_kenya,
  Iran: m.country_iran,
  France: m.country_france,
  Italy: m.country_italy,
  Brazil: m.country_brazil,
  Algeria: m.country_algeria,
  Netherlands: m.country_netherlands,
  Canada: m.country_canada,
  'USA + partners': m.country_usa_partners,
  'USA (commercial)': m.country_usa_commercial,
};

export function countryLabel(value: string): string {
  const whole = COUNTRY[value.trim()];
  if (whole) return whole();
  return value
    .split(/\s*\/\s*/)
    .map((part) => COUNTRY[part.trim()]?.() ?? part)
    .join(' / ');
}
