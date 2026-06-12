<!--
  Generic debug side panel — surfaced on any route by appending `?debug=1`
  to the URL. Wraps page-specific debug content (passed via the default
  slot or named "page" slot) inside a floating panel with shared tabs:

    Page (slot)   — page-specific debug surface (mission state, camera
                    math, scene introspection, etc.)
    Perf          — frame time / FPS rolling readouts (stubbed; we can
                    wire it to the existing $lib/quality/frame-monitor.
    i18n          — current locale + untranslated-key warnings (stub).
    Route         — current URL + search params + breadcrumb info.

  Each page wires its own debug slot — see /fly + /mars for examples.
  Pattern reference: src/lib/surface-scene/SurfaceScene.svelte's
  `showDebug = $page.url.searchParams.get('debug') === '1'`.

  Hidden by default. Use `?debug=1` to open, click × to dismiss.
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, type Snippet } from 'svelte';

  /** Page label shown in the panel header (e.g. "FLY", "MARS"). */
  let { pageLabel = '', children }: { pageLabel?: string; children?: Snippet } = $props();

  let mounted = $state(false);
  let open = $state(false);
  let activeTab = $state<'page' | 'perf' | 'i18n' | 'route'>('page');

  // Rolling FPS counter — minimal stub. Wire to frame-monitor later
  // for accurate readings (we already have $lib/quality/frame-monitor).
  let fps = $state(0);
  let frameTimeMs = $state(0);

  onMount(() => {
    mounted = true;
    const url = $page.url;
    if (url.searchParams.get('debug') === '1') open = true;

    // Lightweight FPS sampling — once per second is enough for the
    // header readout. Don't tax the main loop with per-frame counters.
    let last = performance.now();
    let frameCount = 0;
    let rafId = 0;
    const tick = (now: number) => {
      frameCount++;
      const elapsed = now - last;
      if (elapsed >= 1000) {
        fps = Math.round((frameCount * 1000) / elapsed);
        frameTimeMs = Math.round(elapsed / Math.max(1, frameCount));
        last = now;
        frameCount = 0;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  });

  function toggleOpen() {
    open = !open;
  }
</script>

{#if mounted && open}
  <aside class="debug-panel" data-testid="debug-panel" aria-label="Debug panel">
    <header class="debug-header">
      <div class="debug-title">
        <span class="debug-label">DEBUG</span>
        {#if pageLabel}<span class="debug-page-label">· {pageLabel}</span>{/if}
      </div>
      <div class="debug-meta">
        <span class="debug-fps">{fps} fps · {frameTimeMs}ms</span>
        <button
          type="button"
          class="debug-close"
          onclick={toggleOpen}
          aria-label="Close debug panel"
        >×</button>
      </div>
    </header>
    <div class="debug-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="debug-tab"
        class:active={activeTab === 'page'}
        onclick={() => (activeTab = 'page')}
      >Page</button>
      <button
        type="button"
        role="tab"
        class="debug-tab"
        class:active={activeTab === 'perf'}
        onclick={() => (activeTab = 'perf')}
      >Perf</button>
      <button
        type="button"
        role="tab"
        class="debug-tab"
        class:active={activeTab === 'i18n'}
        onclick={() => (activeTab = 'i18n')}
      >i18n</button>
      <button
        type="button"
        role="tab"
        class="debug-tab"
        class:active={activeTab === 'route'}
        onclick={() => (activeTab = 'route')}
      >Route</button>
    </div>
    <div class="debug-body">
      {#if activeTab === 'page'}
        {@render children?.()}
      {:else if activeTab === 'perf'}
        <div class="debug-section">
          <div class="debug-row">
            <span class="debug-key">FPS</span>
            <span class="debug-val">{fps}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Frame time</span>
            <span class="debug-val">{frameTimeMs}ms</span>
          </div>
          <div class="debug-stub">
            Wire to frame-monitor for rolling avg + low-1% (stub).
          </div>
        </div>
      {:else if activeTab === 'i18n'}
        <div class="debug-section">
          <div class="debug-row">
            <span class="debug-key">Locale</span>
            <span class="debug-val">{document?.documentElement?.lang || 'en-US'}</span>
          </div>
          <div class="debug-stub">
            i18n key-resolution warnings: not yet wired (stub).
          </div>
        </div>
      {:else if activeTab === 'route'}
        <div class="debug-section">
          <div class="debug-row">
            <span class="debug-key">Path</span>
            <span class="debug-val">{$page.url.pathname}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Search</span>
            <span class="debug-val">{$page.url.search || '—'}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Hash</span>
            <span class="debug-val">{$page.url.hash || '—'}</span>
          </div>
        </div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .debug-panel {
    position: fixed;
    top: 80px;
    right: 16px;
    width: 360px;
    max-height: calc(100vh - 100px);
    z-index: 90;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(94, 234, 212, 0.4);
    border-radius: 6px;
    color: rgba(220, 230, 245, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .debug-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(94, 234, 212, 0.25);
    background: rgba(8, 10, 22, 0.5);
  }
  .debug-title {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .debug-label {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 12px;
    letter-spacing: 3px;
    color: #4ecdc4;
  }
  .debug-page-label {
    font-size: 10px;
    color: rgba(220, 230, 245, 0.7);
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .debug-meta {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .debug-fps {
    font-size: 10px;
    color: rgba(220, 230, 245, 0.7);
  }
  .debug-close {
    background: transparent;
    border: none;
    color: rgba(220, 230, 245, 0.7);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 6px;
  }
  .debug-close:hover {
    color: #4ecdc4;
  }
  .debug-tabs {
    display: flex;
    border-bottom: 1px solid rgba(94, 234, 212, 0.2);
  }
  .debug-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(220, 230, 245, 0.7);
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 6px 8px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition:
      color 100ms ease,
      border-color 100ms ease;
  }
  .debug-tab:hover {
    color: rgba(220, 230, 245, 0.95);
  }
  .debug-tab.active {
    color: #4ecdc4;
    border-bottom-color: #4ecdc4;
  }
  .debug-body {
    flex: 1;
    padding: 10px 12px;
    overflow-y: auto;
  }
  .debug-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .debug-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 3px 0;
  }
  .debug-key {
    color: rgba(94, 234, 212, 0.8);
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .debug-val {
    color: rgba(220, 230, 245, 0.95);
    font-size: 11px;
    text-align: right;
    word-break: break-all;
  }
  .debug-stub {
    margin-top: 8px;
    font-size: 10px;
    color: rgba(220, 230, 245, 0.5);
    font-style: italic;
  }
</style>
