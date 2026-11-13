import { error } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime';
import { getStructureEntity } from '$lib/data/outer-entity';
import * as m from '$lib/paraglide/messages';
import { dataSourceItems, sourceLink } from '$lib/catalogue';
import { structureDistance, structureKindLabel, structureSpan } from '$lib/explore/format';
import { openInOrreryPath, relatedSections, type OuterRow } from '$lib/explore/outer-page';
import { structurePageIds } from '../../../../../scripts/site-routes.mjs';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /explore/structures/<id> — one galaxy group, cloud, cluster, supercluster, wall, void or other
 * structure of the four outer scales as an indexable page (ADR-096 item 18): the panel's values,
 * the overlay's fact and bio, a Related list built from the scale files, and a link into the scene
 * (?context=<scale>&pick=<id>). The ids are the structures with an overlay under
 * i18n-src/en-US/universe/structures/ (the files decide). `local-group` is one page, though two
 * scales list it.
 */
export const prerender = true;

export const entries: EntryGenerator = () => structurePageIds().map((id: string) => ({ id }));

/** A wall, a void or a concentration has a span, not a diameter. */
const SPAN_KINDS = new Set(['wall', 'void', 'concentration']);

export const load: PageServerLoad = async ({ params, fetch }) => {
  const locale = getLocale();
  const entity = await getStructureEntity(params.id, locale, fetch);
  if (!entity) throw error(404, `Unknown structure: ${params.id}`);
  const rows: OuterRow[] = [];
  if (entity.distMpc > 0)
    rows.push({
      label: m.explore_lg_label_distance(),
      value: structureDistance(entity.distMpc, locale),
      src: sourceLink(entity.catalogue.dist_mpc),
    });
  if (entity.diamMly > 0)
    rows.push({
      label: SPAN_KINDS.has(entity.kind)
        ? m.explore_cosmic_web_label_span()
        : m.explore_lg_label_diameter(),
      value: structureSpan(entity.diamMly, locale),
    });
  return {
    text: { fact: entity.fact, bio: entity.bio, links: entity.links },
    path: `/explore/structures/${entity.id}`,
    title: entity.name,
    kind: structureKindLabel(entity.kind),
    rows,
    sources: dataSourceItems(entity.catalogue, (k) =>
      k === 'dist_mpc' ? m.explore_lg_label_distance() : null,
    ),
    sections: relatedSections(entity.related),
    openPath: openInOrreryPath(entity.scale, entity.id),
    hero: entity.hero,
  };
};
