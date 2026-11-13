import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getGalaxyEntity } from '$lib/data/outer-entity';
import * as m from '$lib/paraglide/messages';
import { dataSourceItems, sourceLink } from '$lib/catalogue';
import {
  galaxyDiameter,
  galaxyDistance,
  galaxyGroupLabel,
  galaxyKindLabel,
} from '$lib/explore/format';
import { openInOrreryPath, relatedSections, type OuterRow } from '$lib/explore/outer-page';
import { galaxyPageIds } from '../../../../../scripts/site-routes.mjs';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /explore/galaxies/<id> — one Local Group galaxy as an indexable page (ADR-096 item 18): the
 * panel's values, the overlay's fact and bio, a Related list built from the census, and a link
 * into the scene (?context=local-group&pick=<id>). The ids are the galaxies with an overlay under
 * i18n-src/en-US/universe/galaxies/ (the files decide, so there is no page before its text); the
 * four twins of a deep-sky object keep their /explore/deep-sky/<id> page.
 */
export const prerender = true;

export const entries: EntryGenerator = () => galaxyPageIds().map((id: string) => ({ id }));

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const entity = await getGalaxyEntity(params.id, locale, fetch);
  if (!entity) throw error(404, `Unknown galaxy: ${params.id}`);
  const rows: OuterRow[] = [
    {
      label: m.explore_lg_label_group(),
      value: galaxyGroupLabel(entity.id, entity.parent),
    },
  ];
  if (entity.distMly > 0)
    rows.push({
      label: m.explore_lg_label_distance(),
      value: galaxyDistance(entity.distMly, locale),
      src: sourceLink(entity.catalogue.dist_mly),
    });
  if (entity.diamKly > 0)
    rows.push({
      label: m.explore_lg_label_diameter(),
      value: galaxyDiameter(entity.diamKly, locale),
    });
  return {
    text: { fact: entity.fact, bio: entity.bio, links: entity.links },
    path: `/explore/galaxies/${entity.id}`,
    title: entity.name,
    kind: galaxyKindLabel(entity.kind),
    rows,
    sources: dataSourceItems(entity.catalogue, (k) =>
      k === 'dist_mly' ? m.explore_lg_label_distance() : null,
    ),
    sections: relatedSections(entity.related),
    openPath: openInOrreryPath(entity.scale, entity.id),
  };
};
