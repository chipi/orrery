import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getDeepSkyEntity } from '$lib/data/deep-sky-entity';
import * as m from '$lib/paraglide/messages';
import { dataSourceItems, recordLinks, sourceLink } from '$lib/catalogue';
import {
  deepSkyCategoryLabel,
  deepSkyConstellation,
  deepSkyDistance,
  deepSkyTitle,
} from '$lib/explore/format';
import { deepSkyPageIds } from '../../../../../scripts/site-routes.mjs';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /explore/deep-sky/<id> — one deep-sky object as an indexable page (0.9.9 SEO): the panel's
 * text (fact, bio) and values, in prerendered HTML, with a link into the scene (?deepsky=<id>).
 * One page per real object: the Milky Way globular and Local Group INDEX rows that name the
 * same object link this page (DEEP_SKY_ALIAS), never a second one. Typed under
 * /explore/deep-sky so an object id never meets a planet, moon, small-body, star or hole id.
 */
export const prerender = true;

export const entries: EntryGenerator = () => deepSkyPageIds().map((id: string) => ({ id }));

/** `src` is the catalogue the value comes from, linked to its record (#658). */
type Row = { label: string; value: string; src?: { label: string; url: string } | null };

/** The label the page shows for each catalogue-derived value, for the Data sources block. */
const FIELD_LABEL: Record<string, () => string> = {
  dist_ly: m.explore_ds_distance,
  mag: () => `${m.star_label_apparent_mag()} (V)`,
};

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const object = await getDeepSkyEntity(params.id, locale, fetch);
  if (!object) throw error(404, `Unknown deep-sky object: ${params.id}`);
  const rows: Row[] = [];
  if (object.distLy !== null)
    rows.push({
      label: m.explore_ds_distance(),
      value: deepSkyDistance(object.distLy, locale),
      src: sourceLink(object.catalogue.dist_ly),
    });
  if (object.mag !== null)
    rows.push({
      label: `${m.star_label_apparent_mag()} (V)`,
      value: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(object.mag),
      src: sourceLink(object.catalogue.mag),
    });
  if (object.gallery)
    rows.push({ label: m.explore_ds_telescope(), value: object.gallery.telescope });
  if (object.con)
    rows.push({
      label: m.explore_ds_constellation(),
      value: deepSkyConstellation(object.con),
    });
  return {
    object,
    title: deepSkyTitle(object),
    kind: `${deepSkyCategoryLabel(object.category)} · ${object.designation}`,
    rows,
    sources: dataSourceItems(object.catalogue, (k) => FIELD_LABEL[k]?.() ?? null),
    recordLinks: recordLinks(object.records),
  };
};
