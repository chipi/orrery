<!--
  LocalGroupPanel — detail panel for a member galaxy in the /explore v2 Local Group
  schematic (Slice 8). Mirrors the MilkyWayPanel / shared Panel family. The view
  carries the "schematic · not to scale" honesty badge; the panel numbers (distance,
  diameter, type) are real catalogue values.
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import type { LocalGroupMember, LocalGroupKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    member: LocalGroupMember | null;
    open: boolean;
    onClose: () => void;
  };
  let { member, open, onClose }: Props = $props();

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

  const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
</script>

<Panel {open} {onClose} title={member?.name ?? ''} mobileSheet="partial">
  {#if member}
    <div class="head">
      <div class="kind">{kindLabel(member.kind)}</div>
      <div class="name">{member.name}</div>
    </div>

    <p class="prose">{blurb(member.kind)}</p>

    <div class="grid">
      <div class="cell">
        <div class="cell-label">{m.explore_lg_label_group()}</div>
        <div class="cell-value teal">{groupLabel(member)}</div>
      </div>
      {#if member.dist_mly > 0}
        <div class="cell">
          <div class="cell-label">{m.explore_lg_label_distance()}</div>
          <div class="cell-value">{fmt(member.dist_mly * 1e6)} ly</div>
        </div>
      {/if}
      {#if member.diam_kly > 0}
        <div class="cell">
          <div class="cell-label">{m.explore_lg_label_diameter()}</div>
          <div class="cell-value">{fmt(member.diam_kly * 1e3)} ly</div>
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
    margin-bottom: 0.25rem;
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
