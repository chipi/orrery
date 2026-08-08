<!--
  MilkyWayPanel — detail panel for a pin in the /explore v2 Milky Way schematic
  (Slice 5). Mirrors the shared Panel + detail-panel family. Sagittarius A* shows
  its mass + distance and links into the /science black-holes article; the Sun
  shows its galactic address. The view itself carries the "schematic · not to
  scale" honesty badge; the panel numbers are real, cited astrometry.
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import type { MilkyWayObject } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    object: MilkyWayObject | null;
    /** Absolute href into the matching /science/observation article. */
    learnHref: string;
    open: boolean;
    onClose: () => void;
  };
  let { object, learnHref, open, onClose }: Props = $props();

  let kindLabel = $derived.by(() => {
    switch (object?.kind) {
      case 'supermassive-black-hole':
        return m.explore_mw_kind_black_hole();
      case 'globular-cluster':
        return m.explore_mw_kind_globular();
      case 'satellite-galaxy':
        return m.explore_mw_kind_satellite();
      case 'spiral-arm':
        return m.explore_mw_kind_arm();
      default:
        return m.explore_mw_kind_star();
    }
  });
  let blurb = $derived.by(() => {
    switch (object?.kind) {
      case 'supermassive-black-hole':
        return m.explore_mw_sag_a_blurb();
      case 'globular-cluster':
        return m.explore_mw_globular_blurb();
      case 'satellite-galaxy':
        return m.explore_mw_satellite_blurb();
      case 'spiral-arm':
        return m.explore_mw_arm_blurb();
      default:
        return m.explore_mw_sun_blurb();
    }
  });
  let title = $derived(object?.name ?? '');
  const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
</script>

<Panel {open} {onClose} {title} mobileSheet="partial">
  {#if object}
    <div class="head">
      <div class="kind">{kindLabel}</div>
      <div class="name">{object.name}</div>
    </div>

    <p class="prose">{blurb}</p>

    <div class="grid">
      {#if object.mass_solar}
        <div class="cell">
          <div class="cell-label">{m.explore_mw_label_mass()}</div>
          <div class="cell-value teal">
            {fmt(object.mass_solar)}
            <span class="unit">{m.explore_mw_solar_masses()}</span>
          </div>
        </div>
      {/if}
      {#if object.dist_from_sun_ly}
        <div class="cell">
          <div class="cell-label">{m.explore_mw_label_dist_sun()}</div>
          <div class="cell-value">{fmt(object.dist_from_sun_ly)} ly</div>
        </div>
      {/if}
      {#if object.galactocentric_ly}
        <div class="cell">
          <div class="cell-label">{m.explore_mw_label_dist_centre()}</div>
          <div class="cell-value">{fmt(object.galactocentric_ly)} ly</div>
        </div>
      {/if}
      {#if object.diam_kly}
        <div class="cell">
          <div class="cell-label">{m.explore_mw_label_diam()}</div>
          <div class="cell-value">{fmt(object.diam_kly * 1000)} ly</div>
        </div>
      {/if}
      {#if object.arm}
        <div class="cell">
          <div class="cell-label">{m.explore_mw_label_location()}</div>
          <div class="cell-value">{object.arm}</div>
        </div>
      {/if}
    </div>

    <a class="learn-link" href={learnHref}>{m.explore_mw_learn_more()} →</a>
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
  .unit {
    font-size: 0.68rem;
    font-weight: 400;
    color: var(--muted, #9aa4bf);
  }
  .learn-link {
    display: inline-block;
    font-size: 0.8rem;
    color: #4ecdc4;
    text-decoration: none;
    font-weight: 600;
  }
  .learn-link:hover {
    text-decoration: underline;
  }
</style>
