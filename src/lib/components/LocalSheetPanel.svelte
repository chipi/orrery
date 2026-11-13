<!--
  LocalSheetPanel (#454, WS-1) — detail panel for a galaxy group in the /explore
  Local Sheet schematic. On the shared UniversePanelBody (B3); the view carries the
  "schematic · not to scale" badge, the numbers are real catalogue values (distance in
  Mpc, diameter in Mly).
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { OuterTextOverlay, LocalSheetMember, LocalSheetKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { outerLead, structureDistance, structureSpan } from '$lib/explore/format';
  import { sourceLink } from '$lib/catalogue';

  type Props = {
    member: LocalSheetMember | null;
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
  heroOf={member ? { level: 'local-sheet', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member ? shown : undefined}
  lead={member
    ? outerLead(
        overlay,
        member.id === 'local-group' ? m.explore_ls_anchor_blurb() : m.explore_ls_blurb(),
      )
    : []}
  {facts}
/>
