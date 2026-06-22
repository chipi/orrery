<!--
  RegimeChip — clickable badge sitting in the orbiter detail-panel's
  chip row, tagging the orbiter back to its orbital regime panel
  (#354 → #355 → #356 — Marko 2026-06-22 "tag orbiters back to orbit
  panels with some chip at top").

  Rendered alongside the existing agency-badge + status chip. Click →
  parent route opens the matching regime panel underneath the current
  orbiter panel (z-stacking at z=28 vs z=30 keeps the orbiter visible).

  Visually mirrors the agency-badge dimensions but uses the regime's
  own colour, with a small leading dot so the chip reads as a "category
  tag" rather than as primary metadata. Body of the chip is the regime
  short code (LEO / LLO / NRHO / L2).
-->
<script lang="ts">
  import type { OrbitRegime } from '$types/orbit-regime';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    regime: OrbitRegime;
    onClick: () => void;
  }
  let { regime, onClick }: Props = $props();
</script>

<!--
  Styled to match the sibling `.agency-badge` + `.status` chips
  exactly (Space Mono 7px / letter-spacing 2px / radius 3px / padding
  3px 8px). Same `.status`-style 1px border + tinted background pattern,
  but tinted to the regime's own colour. Reads as "one more chip of the
  same kind" per 2026-06-22 user direction — no pill shape, no leading
  dot, no enlarged padding.
-->
<button
  type="button"
  class="regime-chip"
  style:--regime-color={regime.color}
  style:color={regime.color}
  style:border-color="color-mix(in srgb, {regime.color} 50%, transparent)"
  style:background="color-mix(in srgb, {regime.color} 10%, transparent)"
  onclick={onClick}
  aria-label={m.earth_regime_chip_aria({ regime: regime.name ?? regime.id })}
  title={regime.name ?? regime.id}
>
  {regime.short ?? regime.id}
</button>

<style>
  .regime-chip {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid;
    cursor: pointer;
    text-transform: uppercase;
    line-height: 1;
    transition: background 120ms ease;
  }
  .regime-chip:hover,
  .regime-chip:focus-visible {
    background: color-mix(in srgb, var(--regime-color) 22%, transparent) !important;
    outline: none;
  }
</style>
