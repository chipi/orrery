<!--
  PhasePanel — modal teaching panel for /fly's current mission phase
  (#358 micro-enhancement, replacing the deferred phase ruler).

  Reuses the shared `<Panel>` shell + `<ScienceCard>` from the orbit-
  ruler regime panel pattern. Opens when the user clicks the HUD's
  phase pill — surfaces a richer in-route preview of the matching
  `/science/mission-phases/<section>` instead of navigating straight
  to /science.

  Translation: the panel chrome flows through paraglide; the
  `<ScienceCard>` body fetches the locale's /science overlay (already
  translated to all 13 non-en-US locales).
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { ScienceTabId } from '$types/science';

  interface Props {
    open: boolean;
    onClose: () => void;
    phaseLabel: string;
    /** /science cross-link the HUD pill already computed (the same
     *  ScienceRef the existing `<ScienceChip>` used). Drives the
     *  embedded ScienceCard. */
    scienceRef: { tab: string; slug: string } | null;
  }
  let { open, onClose, phaseLabel, scienceRef }: Props = $props();
</script>

<!--
  zIndex=40 sits ABOVE /fly's persistent HUD chrome (.hud-stack +
  .capcom-panel both at z=30). The orbit-ruler regime panel used z=28
  because it stacked UNDER detail panels (z=30); /fly has no detail
  panel — the persistent CAPCOM + HUD are the things to clear, so
  PhasePanel needs to paint on top of them (2026-06-22 user direction:
  "mission phase opens in panel that is under capcom").
-->
<Panel {open} {onClose} title={phaseLabel} zIndex={40}>
  <div class="phase-head">
    <div class="eyebrow">{m.fly_phase_panel_eyebrow()}</div>
    <h2 class="phase-name">{phaseLabel}</h2>
  </div>

  {#if scienceRef}
    <div class="phase-science">
      <ScienceCard tab={scienceRef.tab as ScienceTabId} section={scienceRef.slug} />
    </div>
  {/if}
</Panel>

<style>
  .phase-head {
    padding: 0 0 14px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 14px;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(160, 200, 255, 0.85);
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .phase-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0;
  }
  .phase-science {
    margin-top: 4px;
  }
</style>
