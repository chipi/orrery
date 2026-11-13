<!--
  CosmicWebPanel (#457, WS-5d) — detail panel for a structure in the /explore Cosmic Web
  schematic. On the shared UniversePanelBody (B3); the view carries the "schematic · not to
  scale" badge, the numbers are real order-of-magnitude values (distance in Mpc, span in Mly).
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { OuterTextOverlay, CosmicWebMember, CosmicWebKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { outerLead, structureDistance, structureSpan } from '$lib/explore/format';
  import { sourceLink } from '$lib/catalogue';

  type Props = {
    member: CosmicWebMember | null;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
    /** The structure's reviewed fact and bio in the reader's language; null until loaded or written. */
    overlay?: OuterTextOverlay | null;
    /** The name in the reader's language, as the INDEX row prints it. */
    name?: string;
  };
  let { member, open, onClose, covered = false, overlay = null, name }: Props = $props();
  let shown = $derived(name ?? member?.name ?? '');

  const kindLabel = (k: CosmicWebKind): string =>
    k === 'void'
      ? m.explore_cosmic_web_kind_void()
      : k === 'wall'
        ? m.explore_cosmic_web_kind_wall()
        : k === 'concentration'
          ? m.explore_cosmic_web_kind_concentration()
          : m.explore_cosmic_web_kind_supercluster();

  const blurb = (mem: CosmicWebMember): string =>
    mem.id === 'laniakea'
      ? m.explore_cosmic_web_anchor_blurb()
      : mem.kind === 'void'
        ? m.explore_cosmic_web_void_blurb()
        : m.explore_cosmic_web_blurb();

  let facts = $derived(
    member
      ? [
          ...(member.dist_mpc > 0
            ? [
                {
                  label: m.explore_lg_label_distance(),
                  value: structureDistance(member.dist_mpc, getLocale()),
                  accent: true,
                  source: sourceLink(member.catalogue?.dist_mpc) ?? undefined,
                },
              ]
            : []),
          ...(member.diam_mly > 0
            ? [
                {
                  label: m.explore_cosmic_web_label_span(),
                  value: structureSpan(member.diam_mly, getLocale()),
                },
              ]
            : []),
        ]
      : [],
  );
</script>

<UniversePanelBody
  {open}
  {onClose}
  {covered}
  title={shown}
  entityId={member?.id ?? ''}
  heroOf={member ? { level: 'cosmic-web', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member ? shown : undefined}
  lead={member ? outerLead(overlay, blurb(member)) : []}
  {facts}
/>
