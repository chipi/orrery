<!--
  Auto-tour guided mode for Tier-3 panorama (PRD-022 / ADR-074, #286
  Phase 3C).

  Pans the camera through the panorama's annotations in order, opening
  each caption card for ~4 seconds before advancing. Useful for sites
  with multiple curated features (Apollo 11, Curiosity, Perseverance,
  Chang'e 4, Chandrayaan-3) — the user clicks "Play tour" and gets a
  hands-free narrative pan.

  Reduced-motion users get a manual stepper (← prev / next →) instead
  of the auto-pan. Same annotation focus + caption card open; just no
  camera animation between stops.

  Visible affordance: small chip top-center between the cycler counter
  and the compass rose. Hidden when the site has < 2 annotations
  (nothing to tour) or when the panorama is not active.

  The component owns:
    - tour playing state (idle / playing)
    - tour cursor (index into annotations)
    - the per-stop 4-second timer (clears on pause / unmount)
    - the prefers-reduced-motion check
  It does NOT own the camera. It calls back to the parent with the
  target annotation; the parent decides how to move the camera (animate
  yaw/pitch, or snap when reduced-motion).
-->
<script lang="ts">
  import type { PanoramaAnnotation } from '$types/surface-site';
  import { onReducedMotionChange } from '$lib/reduced-motion';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    active: boolean;
    annotations: PanoramaAnnotation[];
    /** Called when the tour advances to a new annotation. Parent
     *  decides camera animation (smooth pan when not reduced-motion;
     *  snap when reduced). Returns when the visual move has settled. */
    onStep: (annotation: PanoramaAnnotation, reducedMotion: boolean) => void;
    /** Called when the user stops the tour or it finishes naturally. */
    onStop: () => void;
  }
  let { active, annotations, onStep, onStop }: Props = $props();

  let playing = $state(false);
  let cursor = $state(0);
  let reducedMotion = $state(false);

  // Per-stop dwell — long enough to read the caption card body without
  // feeling stuck. 4.5 s matches the existing PanoramaCycler's
  // counter live-region cadence, so the screen-reader announcement
  // doesn't pile up on top of itself.
  const STOP_MS = 4500;
  let dwellTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);

  $effect(() => {
    const stop = onReducedMotionChange((r) => (reducedMotion = r));
    return stop;
  });

  function clearDwell(): void {
    if (dwellTimer !== undefined) {
      clearTimeout(dwellTimer);
      dwellTimer = undefined;
    }
  }

  function start(): void {
    if (annotations.length < 2) return;
    playing = true;
    cursor = 0;
    step();
  }

  function stop(): void {
    if (!playing) return;
    playing = false;
    clearDwell();
    onStop();
  }

  function step(): void {
    if (!playing) return;
    onStep(annotations[cursor], reducedMotion);
    // When reduced-motion, no auto-advance — user clicks Next manually.
    if (reducedMotion) return;
    clearDwell();
    dwellTimer = setTimeout(() => {
      if (cursor + 1 < annotations.length) {
        cursor += 1;
        step();
      } else {
        stop();
      }
    }, STOP_MS);
  }

  function manualNext(): void {
    if (cursor + 1 < annotations.length) {
      cursor += 1;
      step();
    } else {
      stop();
    }
  }

  function manualPrev(): void {
    if (cursor > 0) {
      cursor -= 1;
      step();
    }
  }

  // Stop the tour when panorama exits or annotations change set.
  $effect(() => {
    if (!active) {
      if (playing) {
        playing = false;
        clearDwell();
      }
      return;
    }
  });
  $effect(() => {
    // Reset cursor when annotation list changes (cycler swap).
    void annotations;
    if (playing) {
      playing = false;
      clearDwell();
      onStop();
    }
    cursor = 0;
  });

  // Cleanup timer on unmount.
  $effect(() => {
    return () => clearDwell();
  });
</script>

{#if active && annotations.length >= 2}
  <div class="auto-tour" data-testid="panorama-auto-tour">
    {#if !playing}
      <button
        type="button"
        class="play-btn"
        aria-label={reducedMotion ? m.panorama_tour_step_aria() : m.panorama_tour_play_aria()}
        onclick={start}
      >
        <span aria-hidden="true">▶</span>
        {reducedMotion ? m.panorama_tour_step_label() : m.panorama_tour_play_label()}
      </button>
    {:else}
      <div class="tour-controls" role="group" aria-label={m.panorama_tour_controls_aria()}>
        {#if reducedMotion}
          <button
            type="button"
            class="ctl-btn"
            aria-label={m.panorama_tour_prev_aria()}
            disabled={cursor === 0}
            onclick={manualPrev}
          >
            ‹
          </button>
        {/if}
        <span class="counter mono" aria-live="polite">
          {cursor + 1} / {annotations.length} — {annotations[cursor]?.label ?? ''}
        </span>
        {#if reducedMotion}
          <button
            type="button"
            class="ctl-btn"
            aria-label={m.panorama_tour_next_aria()}
            onclick={manualNext}
          >
            ›
          </button>
        {/if}
        <button
          type="button"
          class="ctl-btn"
          aria-label={m.panorama_tour_stop_aria()}
          onclick={stop}
        >
          <span aria-hidden="true">■</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .auto-tour {
    position: fixed;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 60;
    /* When the cycler is also present, both sit at top-center — give
       the auto-tour an offset so they don't overlap. (Cycler counter
       is centered; we sit ~52 px below it.) */
    margin-top: 36px;
  }

  .play-btn,
  .ctl-btn {
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--color-text-on-dark, #ffffff);
    cursor: pointer;
    backdrop-filter: blur(6px);
    font-size: 12px;
    padding: 6px 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .play-btn:hover,
  .play-btn:focus-visible,
  .ctl-btn:hover:not(:disabled),
  .ctl-btn:focus-visible:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.4);
  }
  .ctl-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .ctl-btn {
    padding: 6px 10px;
    font-size: 14px;
    line-height: 1;
  }

  .tour-controls {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .counter {
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 6px 12px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 11px;
    letter-spacing: 0.04em;
    backdrop-filter: blur(6px);
  }

  .mono {
    font-family: 'Space Mono', 'Courier New', monospace;
  }
</style>
