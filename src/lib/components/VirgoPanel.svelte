<!--
  VirgoPanel — detail panel for a member of the Virgo Supercluster in the /explore Virgo
  schematic. On the shared UniversePanelBody (B3); the view carries the "schematic · not to
  scale" badge, the numbers are real catalogue values.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { OuterTextOverlay, VirgoMember, VirgoKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { outerLead, structureDistance, structureSpan } from '$lib/explore/format';
  import { sourceLink } from '$lib/catalogue';

  type Props = {
    member: VirgoMember | null;
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

  const kindLabel = (k: VirgoKind): string =>
    k === 'cluster'
      ? m.explore_virgo_kind_cluster()
      : k === 'cloud'
        ? m.explore_virgo_kind_cloud()
        : m.explore_virgo_kind_group();

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
                  label: m.explore_lg_label_diameter(),
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
  heroOf={member ? { level: 'virgo', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member ? shown : undefined}
  lead={member
    ? outerLead(
        overlay,
        member.id === 'local-group' ? m.explore_virgo_anchor_blurb() : m.explore_virgo_blurb(),
      )
    : []}
  {facts}
/>
