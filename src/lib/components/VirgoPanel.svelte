<!--
  VirgoPanel (#455, WS-5b) — detail panel for a member of the /explore Virgo
  Supercluster schematic. Mirrors the LocalSheetPanel / shared Panel family; the
  view carries the "schematic · not to scale" badge, the numbers are real
  catalogue values (distance in Mpc, diameter in Mly).
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import type { VirgoMember, VirgoKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    member: VirgoMember | null;
    open: boolean;
    onClose: () => void;
  };
  let { member, open, onClose }: Props = $props();

  const kindLabel = (k: VirgoKind): string =>
    k === 'cluster'
      ? m.explore_virgo_kind_cluster()
      : k === 'cloud'
        ? m.explore_virgo_kind_cloud()
        : m.explore_virgo_kind_group();

  const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
</script>

<Panel {open} {onClose} title={member?.name ?? ''} mobileSheet="partial">
  {#if member}
    <div class="head">
      <div class="kind">{kindLabel(member.kind)}</div>
      <div class="name">{member.name}</div>
    </div>

    <p class="prose">
      {member.id === 'local-group' ? m.explore_virgo_anchor_blurb() : m.explore_virgo_blurb()}
    </p>

    <div class="grid">
      {#if member.dist_mpc > 0}
        <div class="cell">
          <div class="cell-label">{m.explore_lg_label_distance()}</div>
          <div class="cell-value teal">{fmt(member.dist_mpc * 3.26e6)} ly</div>
        </div>
      {/if}
      {#if member.diam_mly > 0}
        <div class="cell">
          <div class="cell-label">{m.explore_lg_label_diameter()}</div>
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
