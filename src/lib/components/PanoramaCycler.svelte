<!--
  Multi-panorama cycler for Tier-3 view (PRD-022 / ADR-074, #286
  Phase 2F).

  Sites with a `panorama_set` carrying ≥ 2 entries get left/right
  arrows + a top-centre counter ("Sol 3573 · 4 panoramas at this
  site"). Single-pano sites render nothing — the cycler is hidden.

  The cycler emits onCycle(entry) when arrows are clicked or arrow
  keys are pressed; caller swaps the skybox texture + annotations +
  metadata. The current entry is owned by the caller (route state).
-->
<script lang="ts">
  import type { PanoramaSetEntry } from '$types/surface-site';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    active: boolean;
    /** Full set of panoramas for the current site (≥ 2 to render). */
    set: PanoramaSetEntry[] | null | undefined;
    /** Currently-selected entry id; matches `set[i].id`. */
    currentId: string | null;
    onCycle: (entry: PanoramaSetEntry) => void;
  }
  let { active, set, currentId, onCycle }: Props = $props();

  let totalCount = $derived(set?.length ?? 0);
  let currentIndex = $derived.by(() => {
    if (!set || !currentId) return 0;
    const i = set.findIndex((e) => e.id === currentId);
    return i < 0 ? 0 : i;
  });
  let currentEntry = $derived(set?.[currentIndex] ?? null);

  function step(dir: 1 | -1): void {
    if (!set || set.length < 2) return;
    const next = (currentIndex + dir + set.length) % set.length;
    onCycle(set[next]);
  }

  // Arrow-key shortcuts when panorama active + cycler has ≥ 2 entries.
  $effect(() => {
    if (!active || totalCount < 2) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack when the user is typing in an input.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

{#if active && totalCount >= 2 && currentEntry}
  <button
    type="button"
    class="arrow arrow-left"
    aria-label={m.panorama_cycler_prev_aria()}
    onclick={() => step(-1)}
  >
    ‹
  </button>
  <button
    type="button"
    class="arrow arrow-right"
    aria-label={m.panorama_cycler_next_aria()}
    onclick={() => step(1)}
  >
    ›
  </button>
  <div class="counter mono" role="status" aria-live="polite" data-testid="panorama-cycler-counter">
    {m.panorama_cycler_counter_template({
      label:
        currentEntry.metadata?.sol != null
          ? `Sol ${currentEntry.metadata.sol}`
          : (currentEntry.id ?? ''),
      count: totalCount,
    })}
  </div>
{/if}

<style>
  .arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--color-text-on-dark, #ffffff);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    backdrop-filter: blur(6px);
    z-index: 60;
  }
  .arrow:hover,
  .arrow:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 1);
  }
  .arrow-left {
    left: 24px;
  }
  .arrow-right {
    right: 24px;
  }

  .counter {
    position: fixed;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 6px 14px;
    color: rgba(255, 255, 255, 0.65);
    font-size: 11px;
    letter-spacing: 0.08em;
    backdrop-filter: blur(6px);
    z-index: 60;
    pointer-events: none;
  }
  .mono {
    font-family: 'Space Mono', 'Courier New', monospace;
  }
</style>
