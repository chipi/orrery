<!--
  LaniakeaPanel — detail panel for a member of the Laniakea Supercluster in the /explore
  Laniakea schematic. On the shared UniversePanelBody (B3); the view carries the "schematic ·
  not to scale" badge, the numbers are real catalogue values. No member has a photograph, so
  none has a hero.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { LaniakeaMember, LaniakeaKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    member: LaniakeaMember | null;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
  };
  let { member, open, onClose, covered = false }: Props = $props();

  const kindLabel = (k: LaniakeaKind): string =>
    k === 'attractor'
      ? m.explore_laniakea_kind_attractor()
      : k === 'cluster'
        ? m.explore_laniakea_kind_cluster()
        : m.explore_laniakea_kind_supercluster();

  const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  let facts = $derived(
    member
      ? [
          ...(member.dist_mpc > 0
            ? [
                {
                  label: m.explore_lg_label_distance(),
                  value: `${fmt(member.dist_mpc * 3.26e6)} ly`,
                  accent: true,
                },
              ]
            : []),
          ...(member.diam_mly > 0
            ? [{ label: m.explore_lg_label_diameter(), value: `${fmt(member.diam_mly * 1e6)} ly` }]
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
  heroOf={member ? { level: 'laniakea', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member?.name}
  lead={member
    ? [
        member.kind === 'attractor'
          ? m.explore_laniakea_attractor_blurb()
          : member.id === 'virgo-supercluster'
            ? m.explore_laniakea_anchor_blurb()
            : m.explore_laniakea_blurb(),
      ]
    : []}
  {facts}
/>
