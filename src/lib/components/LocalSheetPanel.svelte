<!--
  LocalSheetPanel (#454, WS-1) — detail panel for a galaxy group in the /explore
  Local Sheet schematic. On the shared UniversePanelBody (B3); the view carries the
  "schematic · not to scale" badge, the numbers are real catalogue values (distance in
  Mpc, diameter in Mly).
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { LocalSheetMember, LocalSheetKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { structureDistance, structureSpan } from '$lib/explore/format';

  type Props = {
    member: LocalSheetMember | null;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
  };
  let { member, open, onClose, covered = false }: Props = $props();

  const kindLabel = (k: LocalSheetKind): string =>
    k === 'cloud' ? m.explore_ls_kind_cloud() : m.explore_ls_kind_group();

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
  heroOf={member ? { level: 'local-sheet', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member?.name}
  lead={member
    ? [member.id === 'local-group' ? m.explore_ls_anchor_blurb() : m.explore_ls_blurb()]
    : []}
  {facts}
/>
