/**
 * What the two outer-scale entity pages (/explore/galaxies/<id>, /explore/structures/<id>) share:
 * the row and Related-section shapes their server loads build and `OuterEntityPage.svelte` renders.
 */
import * as m from '$lib/paraglide/messages';
import type { RelatedGroup, RelatedLink } from '$lib/data/outer-entity';

/** `src` is the catalogue the value comes from, linked to its record (#658). */
export type OuterRow = {
  label: string;
  value: string;
  src?: { label: string; url: string } | null;
};

export interface OuterSection {
  kind: RelatedGroup['kind'];
  heading: string;
  links: RelatedLink[];
}

const HEADING: Record<RelatedGroup['kind'], () => string> = {
  'part-of': m.explore_related_part_of,
  members: m.explore_related_members,
  'same-scale': m.explore_related_same_scale,
};

export const relatedSections = (related: RelatedGroup[]): OuterSection[] =>
  related.map((r) => ({ kind: r.kind, heading: HEADING[r.kind](), links: r.links }));

/** The link into the scene: the scale's own select function, with the member picked (UXD-019). */
export const openInOrreryPath = (scale: string, id: string): string =>
  `/explore?context=${scale}&pick=${id}`;
