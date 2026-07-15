<!--
  BlackHolePanel — detail panel for the /explore v2 black-hole lensing render
  (Slice 6). Mirrors the MilkyWayPanel / DeepSkyPanel family: mass / distance /
  spin / Schwarzschild radius + a link into the /science black-holes article.
  Gargantua carries the Interstellar culture door (Slice 6 Part 5) via the
  optional children slot. Real holes cite EHT/GRAVITY; Gargantua is badged fiction.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Panel from './Panel.svelte';
  import type { BlackHole, BlackHoleKind } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    hole: BlackHole | null;
    learnHref: string;
    open: boolean;
    onClose: () => void;
    /** Optional extra content (e.g. Gargantua's culture door). */
    children?: Snippet;
  };
  let { hole, learnHref, open, onClose, children }: Props = $props();

  const KIND: Record<BlackHoleKind, () => string> = {
    supermassive: m.explore_bh_kind_supermassive,
    stellar: m.explore_bh_kind_stellar,
    fictional: m.explore_bh_kind_fictional,
  };
  let kindLabel = $derived(hole ? KIND[hole.kind]() : '');
  let title = $derived(hole?.name ?? '');

  // Human-friendly big-number formatting for mass + radius.
  function bigNum(n: number): string {
    if (n >= 1e9)
      return `${(n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })} billion`;
    if (n >= 1e6)
      return `${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} million`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  function dist(ly: number): string {
    if (ly >= 1e6)
      return `${(ly / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M ly`;
    return `${ly.toLocaleString(undefined, { maximumFractionDigits: 0 })} ly`;
  }
  function rs(km: number): string {
    if (km >= 1e9)
      return `~${(km / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })}B km`;
    if (km >= 1e6)
      return `~${(km / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M km`;
    return `~${km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
  }
</script>

<Panel {open} {onClose} {title} mobileSheet="partial">
  {#if hole}
    <div class="head">
      <div class="kind">{kindLabel}</div>
      <div class="name">{hole.name}</div>
    </div>

    <p class="prose">{hole.discovery}</p>

    <div class="grid">
      <div class="cell">
        <div class="cell-label">{m.explore_bh_label_mass()}</div>
        <div class="cell-value teal">
          {bigNum(hole.mass_solar)}
          <span class="unit">{m.explore_bh_solar_masses()}</span>
        </div>
      </div>
      <div class="cell">
        <div class="cell-label">{m.explore_bh_label_distance()}</div>
        <div class="cell-value">{dist(hole.dist_ly)}</div>
      </div>
      <div class="cell">
        <div class="cell-label">{m.explore_bh_label_spin()}</div>
        <div class="cell-value">
          {hole.spin.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
      <div class="cell">
        <div class="cell-label">{m.explore_bh_label_rs()}</div>
        <div class="cell-value">{rs(hole.rs_km)}</div>
      </div>
    </div>

    {@render children?.()}

    <a class="learn-link" href={learnHref}>{m.explore_bh_learn_more()} →</a>
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
