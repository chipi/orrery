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

  const groupLabel = (mem: LocalGroupMember): string => {
    if (mem.id === 'milky-way') return m.explore_lg_group_self();
    // An anchor galaxy (Andromeda) is a major member, not a satellite of anything.
    if (mem.id === mem.parent) return m.explore_lg_group_anchor();
    if (mem.parent === 'milky-way') return m.explore_lg_group_mw();
    if (mem.parent === 'andromeda') return m.explore_lg_group_andromeda();
    return m.explore_lg_group_independent();
  };

  const blurb = (k: LocalGroupKind): string =>
    k === 'spiral'
      ? m.explore_lg_blurb_spiral()
      : k === 'irregular'
        ? m.explore_lg_blurb_irregular()
        : m.explore_lg_blurb_dwarf();

  // Three significant figures: the catalogue distance is whole kiloparsecs.
  const fmt = (n: number): string => n.toLocaleString(undefined, { maximumSignificantDigits: 3 });
  let distSrc = $derived(sourceLink(member?.catalogue?.dist_mly));

  let facts = $derived(
    member
      ? [
          { label: m.explore_lg_label_group(), value: groupLabel(member), accent: true },
          ...(member.dist_mly > 0
            ? [
                {
                  label: m.explore_lg_label_distance(),
                  value: `${fmt(member.dist_mly * 1e6)} ly`,
                  source: distSrc ?? undefined,
                },
              ]
            : []),
          ...(member.diam_kly > 0
            ? [{ label: m.explore_lg_label_diameter(), value: `${fmt(member.diam_kly * 1e3)} ly` }]
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
