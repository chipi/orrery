<!--
  CosmicWebPanel (#457, WS-5d) — detail panel for a structure in the /explore Cosmic Web
  schematic. On the shared UniversePanelBody (B3); the view carries the "schematic · not to
  scale" badge, the numbers are real order-of-magnitude values (distance in Mpc, span in Mly).
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import type { CosmicWebMember, CosmicWebKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    member: CosmicWebMember | null;
    open: boolean;
    onClose: () => void;
    /** Another panel is stacked on this one (a black hole opened from its pin). */
    covered?: boolean;
  };
  let { member, open, onClose, covered = false }: Props = $props();

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
            ? [
                {
                  label: m.explore_cosmic_web_label_span(),
                  value: `${fmt(member.diam_mly * 1e6)} ly`,
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
  heroOf={member ? { level: 'cosmic-web', id: member.id } : undefined}
  kind={member ? kindLabel(member.kind) : undefined}
  name={member?.name}
  lead={member ? [blurb(member)] : []}
  {facts}
/>
