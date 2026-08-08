<!--
  CosmicWebPanel (#457, WS-5d) — detail panel for a structure in the /explore
  Cosmic Web schematic. Mirrors the LaniakeaPanel / shared Panel family; the view
  carries the "schematic · not to scale" badge, the numbers are real order-of-
  magnitude values (distance in Mpc, span in Mly).
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import type { CosmicWebMember, CosmicWebKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    member: CosmicWebMember | null;
    open: boolean;
    onClose: () => void;
  };
  let { member, open, onClose }: Props = $props();

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
</script>

<Panel {open} {onClose} title={member?.name ?? ''} mobileSheet="partial">
  {#if member}
    <div class="head">
      <div class="kind">{kindLabel(member.kind)}</div>
      <div class="name">{member.name}</div>
    </div>

    <p class="prose">{blurb(member)}</p>

    <div class="grid">
      {#if member.dist_mpc > 0}
        <div class="cell">
          <div class="cell-label">{m.explore_lg_label_distance()}</div>
          <div class="cell-value teal">{fmt(member.dist_mpc * 3.26e6)} ly</div>
        </div>
      {/if}
      {#if member.diam_mly > 0}
        <div class="cell">
          <div class="cell-label">{m.explore_cosmic_web_label_span()}</div>
          <div class="cell-value">{fmt(member.diam_mly * 1e6)} ly</div>
        </div>
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .head {
    margin-bottom: 0.5rem;
  }
  .kind {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted, #9aa4bf);
  }
  .name {
    font-size: 1.1rem;
    font-weight: 700;
  }
  .prose {
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text, #e9eefc);
    margin: 0.5rem 0 0.75rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .cell {
    min-width: 0;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;
    padding: 0.4rem 0.55rem;
  }
  .cell-label {
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted, #9aa4bf);
  }
  .cell-value {
    font-size: 0.82rem;
    font-weight: 600;
  }
  .cell-value.teal {
    color: #4ecdc4;
  }
</style>
