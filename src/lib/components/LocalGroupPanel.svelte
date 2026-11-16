<!--
  LocalGroupPanel — detail panel for a member galaxy in the /explore v2 Local Group
  schematic (Slice 8). On the shared UniversePanelBody (B3). The view carries the
  "schematic · not to scale" honesty badge; the panel numbers (distance, diameter, type) are
  real catalogue values.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { LocalGroupMember, LocalGroupKind, OuterTextOverlay } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { galaxyFacts, outerLead } from '$lib/explore/format';

  type Props = {
    member: LocalGroupMember | null;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
    /** The galaxy's reviewed fact and bio in the reader's language; null until loaded or written. */
    overlay?: OuterTextOverlay | null;
  };
  let { member, open, onClose, covered = false, overlay = null }: Props = $props();

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

  let facts = $derived(
    member
      ? galaxyFacts(member, getLocale()).map(({ src, ...f }, i) => ({
          ...f,
          ...(i === 0 ? { accent: true } : {}),
          source: src ?? undefined,
        }))
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
  lead={member ? outerLead(overlay, blurb(member.kind)) : []}
  {facts}
/>
