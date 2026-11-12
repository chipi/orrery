<script lang="ts">
  import Chip from '$lib/components/Chip.svelte';
  import ExploreScalePicker from '$lib/components/ExploreScalePicker.svelte';
  import ResetViewButton from '$lib/components/ResetViewButton.svelte';
  import type { ShellId } from '$lib/explore/scale-shell-controller';
  import * as m from '$lib/paraglide/messages';
  import { cue } from '$lib/sensory/feedback';

  let {
    atSolar,
    back,
    showPicker,
    activeShell,
    pickerDisabled,
    onJump,
    showReset,
    onReset,
  }: {
    atSolar: boolean;
    back: { run: () => void; label: string } | null;
    showPicker: boolean;
    activeShell: ShellId;
    pickerDisabled: boolean;
    onJump: (shell: ShellId) => void;
    showReset: boolean;
    onReset: () => void;
  } = $props();
</script>

<nav class="scale-nav" class:at-solar={atSolar} aria-label={m.explore_location_aria()}>
  {#if back}
    <Chip
      kind="action"
      onclick={() => {
        cue('select');
        back.run();
      }}
      aria-label={back.label}
      title={back.label}
      data-testid="explore-scale-back"
    >
      {#snippet icon()}‹{/snippet}
    </Chip>
  {/if}

  {#if showPicker}
    <ExploreScalePicker
      {activeShell}
      disabled={pickerDisabled}
      onJump={(shell) => {
        cue('select');
        onJump(shell);
      }}
    />
    {#if showReset}
      <ResetViewButton onclick={onReset} data-testid="explore-scale-reset" />
    {/if}
  {/if}
</nav>

<style>
  /* #45 top scale-navigator — one row under the nav: back · scale chip · reset.
     Flush LEFT by default (neighborhood+ hide the solar-system control cluster, so
     the top-left is free and the row sits exactly where the old breadcrumb did).
     `top: 8px` lines it up with the mobile control row (.hud-top-mobile, top nav+8)
     so they share a baseline. At the SOLAR SYSTEM scale the top-left is taken by
     that cluster (2D / AR / SKY + layer chips), so the nav flips to flush RIGHT
     (.at-solar) to clear it — no overlap with the SKY button. */
  .scale-nav {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 8;
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: calc(100vw - 16px);
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .scale-nav.at-solar {
    left: auto;
    right: 8px;
  }
  /* Landscape phone: the left-edge pull tabs sit near the back button;
     the row starts past them. */
  @media ((hover: none) or (pointer: coarse)) and (max-height: 520px) {
    .scale-nav:not(.at-solar) {
      left: 40px;
    }
  }
  /* Phone: the reset chip keeps its glyph and name, the label drops out so the
     row (back · scale · reset) fits 390 px. */
  @media (max-width: 767px) {
    .scale-nav :global(.ui-reset-label) {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }
  }
</style>
