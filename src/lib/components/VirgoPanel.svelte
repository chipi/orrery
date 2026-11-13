<!--
  VirgoPanel — detail panel for a member of the Virgo Supercluster in the /explore Virgo
  schematic. On the shared UniversePanelBody (B3); the view carries the "schematic · not to
  scale" badge, the numbers are real catalogue values.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { VirgoMember, VirgoKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { structureDistance, structureSpan } from '$lib/explore/format';

  type Props = {
    member: VirgoMember | null;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
  };
  let { member, open, onClose, covered = false }: Props = $props();

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
  title={member?.name ?? ''}
  entityId={member?.id ?? ''}
  heroOf={member ? { level: 'virgo', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member?.name}
  lead={member
    ? [member.id === 'local-group' ? m.explore_virgo_anchor_blurb() : m.explore_virgo_blurb()]
    : []}
  {facts}
/>
