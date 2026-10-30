<script lang="ts">
  import ExploreScalePicker from '$lib/components/ExploreScalePicker.svelte';
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
    <button
      type="button"
      class="scale-back"
      onclick={() => {
        cue('select');
        back.run();
      }}
      aria-label={back.label}
      title={back.label}
      data-testid="explore-scale-back"
    >
      ‹
    </button>
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
      <button
        type="button"
        class="scale-reset"
        onclick={onReset}
        aria-label={m.ui_reset_view()}
        title={m.ui_reset_view()}
        data-testid="explore-scale-reset"
      >
        ⟲
      </button>
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
  /* Shared square affordances flanking the chip (back ‹ / reset ⟲). Slate glass
     to match the chip; generous tap target. */
  .scale-back,
  .scale-reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    min-height: 34px;
    padding: 0 8px;
    background: rgba(10, 14, 24, 0.62);
    border: 1px solid rgba(154, 166, 189, 0.34);
    border-radius: 5px;
    backdrop-filter: blur(5px);
    color: #c8d2e6;
    font-family: inherit;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .scale-back:hover,
  .scale-back:focus-visible,
  .scale-reset:hover,
  .scale-reset:focus-visible {
    background: rgba(154, 166, 189, 0.22);
    border-color: rgba(154, 166, 189, 0.6);
    color: #eaf1ff;
    outline: none;
  }

  @media (max-width: 767px) {
    .scale-back,
    .scale-reset {
      min-width: 44px;
      min-height: 44px;
    }
  }
</style>
