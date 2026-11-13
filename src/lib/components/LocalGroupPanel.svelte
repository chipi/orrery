<!--
  LocalGroupPanel — detail panel for a member galaxy in the /explore v2 Local Group
  schematic (Slice 8). On the shared UniversePanelBody (B3). The view carries the
  "schematic · not to scale" honesty badge; the panel numbers (distance, diameter, type) are
  real catalogue values.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { LocalGroupMember, LocalGroupKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { galaxyDiameter, galaxyDistance, galaxyGroupLabel } from '$lib/explore/format';
  import { sourceLink } from '$lib/catalogue';

  type Props = {
    member: LocalGroupMember | null;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
  };
  let { member, open, onClose, covered = false }: Props = $props();

  const kindLabel = (k: LocalGroupKind): string =>
    k === 'spiral'
      ? m.explore_lg_kind_spiral()
      : k === 'irregular'
        ? m.explore_lg_kind_irregular()
        : k === 'dwarf-elliptical'
          ? m.explore_lg_kind_dwarf_elliptical()
          : k === 'dwarf-spheroidal'
            ? m.explore_lg_kind_dwarf_spheroidal()
            : m.explore_lg_kind_dwarf_irregular();

  const blurb = (k: LocalGroupKind): string =>
    k === 'spiral'
      ? m.explore_lg_blurb_spiral()
      : k === 'irregular'
        ? m.explore_lg_blurb_irregular()
        : m.explore_lg_blurb_dwarf();

  let distSrc = $derived(sourceLink(member?.catalogue?.dist_mly));

  let facts = $derived(
    member
      ? [
          {
            label: m.explore_lg_label_group(),
            value: galaxyGroupLabel(member.id, member.parent),
            accent: true,
          },
          ...(member.dist_mly > 0
            ? [
                {
                  label: m.explore_lg_label_distance(),
                  value: galaxyDistance(member.dist_mly, getLocale()),
                  source: distSrc ?? undefined,
                },
              ]
            : []),
          ...(member.diam_kly > 0
            ? [
                {
                  label: m.explore_lg_label_diameter(),
                  value: galaxyDiameter(member.diam_kly, getLocale()),
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
  heroOf={member ? { level: 'local-group', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member?.name}
  lead={member ? [blurb(member.kind)] : []}
  {facts}
/>
