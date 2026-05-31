<!--
  Fullscreen toggle for Tier-3 panorama view (PRD-022 / ADR-074, #286
  Phase 3A).

  Small button bottom-left of the HUD that toggles the document's
  fullscreen state. F key shortcut while panorama is active. Same
  panorama still rendering, just full-viewport — useful for immersive
  reads on laptops + tablets.

  Browser fullscreen API is supported everywhere we care about
  (Chrome / Firefox / Safari / mobile Safari iOS 16.4+). Falls back
  gracefully when unsupported — button stays visible but click is a
  no-op, with the title text honest about it.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    active: boolean;
  }
  let { active }: Props = $props();

  let isFullscreen = $state(false);
  let isSupported = $state(true);

  $effect(() => {
    if (typeof document === 'undefined') return;
    isSupported = !!document.documentElement.requestFullscreen;
    const onChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  });

  // F key shortcut while panorama active.
  $effect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      void toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function toggle(): Promise<void> {
    if (!isSupported || typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen().catch(() => {
        // Some browsers reject if not triggered by direct user gesture;
        // swallow — no fullscreen, no breakage.
      });
    }
  }
</script>

{#if active}
  <button
    type="button"
    class="fullscreen-toggle"
    aria-label={isFullscreen
      ? m.panorama_fullscreen_exit_aria()
      : m.panorama_fullscreen_enter_aria()}
    title={isSupported
      ? isFullscreen
        ? m.panorama_fullscreen_exit_aria()
        : m.panorama_fullscreen_enter_aria()
      : m.panorama_fullscreen_unsupported_title()}
    onclick={() => void toggle()}
    data-testid="panorama-fullscreen-toggle"
    disabled={!isSupported}
  >
    {#if isFullscreen}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M6 1v5H1M12 1v5h5M6 17v-5H1M12 17v-5h5" stroke="currentColor" stroke-width="1.5" />
      </svg>
    {:else}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M1 6V1h5M17 6V1h-5M1 12v5h5M17 12v5h-5" stroke="currentColor" stroke-width="1.5" />
      </svg>
    {/if}
  </button>
{/if}

<style>
  .fullscreen-toggle {
    position: fixed;
    bottom: 24px;
    left: 64px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--color-text-on-dark, #ffffff);
    cursor: pointer;
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 60;
    /* Sit to the right of the caption-overlay's dismiss-reopen ⓘ button
       so they don't overlap when caption is dismissed. */
  }
  .fullscreen-toggle:hover:not(:disabled),
  .fullscreen-toggle:focus-visible:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.4);
  }
  .fullscreen-toggle:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
