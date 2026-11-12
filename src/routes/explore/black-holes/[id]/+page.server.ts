import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getBlackHoleEntity } from '$lib/data/black-hole-entity';
import * as m from '$lib/paraglide/messages';
import { assetOrigin } from '$lib/asset-url';
import { dataSourceItems, recordLinks, sourceLink } from '$lib/catalogue';
import { blackHolePageIds } from '../../../../../scripts/site-routes.mjs';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /explore/black-holes/<id> — one black hole as an indexable page (0.9.9 SEO): the panel's
 * text and figures, in prerendered HTML, with a link into the scene (?bh=<id>). Gargantua is
 * fiction and carries a badge and no figures. Typed under /explore/black-holes so a hole id
 * never meets a planet, moon, small-body or star id.
 */
export const prerender = true;

export const entries: EntryGenerator = () => blackHolePageIds().map((id: string) => ({ id }));

/**
 * 4.3 million / 6.5 billion / 27,000 in the page's locale: compact long form from a million up,
 * three significant figures below (the catalogue values are good to a few per cent).
 */
function big(locale: string, v: number): string {
  return v >= 1e6
    ? new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'long',
        maximumFractionDigits: 1,
      }).format(v)
    : new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 }).format(v);
}

const KIND = {
  supermassive: m.explore_bh_kind_supermassive,
  stellar: m.explore_bh_kind_stellar,
  fictional: m.explore_bh_kind_fictional,
};

const FIELD_LABEL: Record<string, () => string> = {
  mass_solar: m.explore_bh_label_mass,
  dist_ly: m.explore_bh_label_distance,
};

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const hole = await getBlackHoleEntity(params.id, locale, fetch);
  if (!hole) throw error(404, `Unknown black hole: ${params.id}`);
  const rows: {
    label: string;
    value: string;
    src?: { label: string; url: string } | null;
  }[] = [];
  if (hole.massSolar !== null)
    rows.push({
      label: m.explore_bh_label_mass(),
      value: `${big(locale, hole.massSolar)} ${m.explore_bh_solar_masses()}`,
      src: sourceLink(hole.catalogue.mass_solar),
    });
  if (hole.distLy !== null)
    rows.push({
      label: m.explore_bh_label_distance(),
      value: `${big(locale, hole.distLy)} ly`,
      src: sourceLink(hole.catalogue.dist_ly),
    });
  if (hole.rsKm !== null)
    rows.push({ label: m.explore_bh_label_rs(), value: `~${big(locale, hole.rsKm)} km` });
  return {
    hole,
    kind: KIND[hole.kind](),
    rows,
    sources: dataSourceItems(hole.catalogue, (k) => FIELD_LABEL[k]?.() ?? null),
    recordLinks: recordLinks(hole.records),
    hero: hole.hero ? { src: `${assetOrigin}${hole.hero.src}`, alt: hole.hero.alt } : null,
  };
};
