import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getBlackHoleEntity } from '$lib/data/black-hole-entity';
import * as m from '$lib/paraglide/messages';
import { assetOrigin } from '$lib/asset-url';
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

/** 4.3 million / 6.5 billion / 27,000 in the page's locale (compact long form from a million up). */
function big(locale: string, v: number): string {
  return v >= 1e6
    ? new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'long',
        maximumFractionDigits: 1,
      }).format(v)
    : new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v);
}

const KIND = {
  supermassive: m.explore_bh_kind_supermassive,
  stellar: m.explore_bh_kind_stellar,
  fictional: m.explore_bh_kind_fictional,
};

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const hole = await getBlackHoleEntity(params.id, locale, fetch);
  if (!hole) throw error(404, `Unknown black hole: ${params.id}`);
  const rows: { label: string; value: string }[] = [];
  if (hole.massSolar !== null)
    rows.push({
      label: m.explore_bh_label_mass(),
      value: `${big(locale, hole.massSolar)} ${m.explore_bh_solar_masses()}`,
    });
  if (hole.distLy !== null)
    rows.push({ label: m.explore_bh_label_distance(), value: `${big(locale, hole.distLy)} ly` });
  if (hole.rsKm !== null)
    rows.push({ label: m.explore_bh_label_rs(), value: `~${big(locale, hole.rsKm)} km` });
  return {
    hole,
    kind: KIND[hole.kind](),
    rows,
    hero: hole.hero ? { src: `${assetOrigin}${hole.hero.src}`, alt: hole.hero.alt } : null,
  };
};
