<!--
  Generic debug side panel — surfaced on every route via the root
  layout. Opens with ?debug=1. Pages can OPTIONALLY register their
  own page-specific debug surface via the context helper:

    import { setPageDebugContent } from '$lib/components/debug-panel-context';
    setPageDebugContent({ label: 'FLY', content: pageDebugSnippet });

  If no page registers content, the "Page" tab is hidden and only
  the generic Perf / i18n / Route tabs show.
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getDebugPanelContext } from '$lib/components/debug-panel-context';
  import { createAnimateLoop } from '$lib/three/animate-loop';

  // Read the page-registration state from context (set up in
  // +layout.svelte). The layout owns the reactive object so siblings
  // of <main> can both observe it and let descendants mutate it.
  const debugCtx = getDebugPanelContext();
  const pageReg = debugCtx?.registration ?? { label: '', content: null };
  // Rendering registration is a boxed slot so 3D-route mounts / unmounts
  // flow through reactively. `null` when no 3D route is active — the
  // "Rendering" tab stays hidden in that case.
  let renderingReg = $derived(debugCtx?.rendering.value ?? null);

  let mounted = $state(false);
  let open = $state(false);
  let activeTab = $state<'page' | 'perf' | 'i18n' | 'route' | 'rendering'>('perf');

  let fps = $state(0);
  let frameTimeMs = $state(0);
  // Live renderer.info snapshot — refreshed on the same raf as fps so
  // it tracks the 3D route's actual draw activity, not stale init state.
  let drawCalls = $state(0);
  let triangles = $state(0);
  let points = $state(0);
  let lines = $state(0);
  // Live GPU resource counts (#363) — these only climb if textures /
  // geometries aren't disposed, so they're the leak canary for the
  // surface scenes.
  let texCount = $state(0);
  let geoCount = $state(0);
  // Frame-monitor rolling avg (#334 slice 34). Same number the auto-
  // demote toast reads; 0 until the 5-sample noise-floor clears.
  let frameMonitorAvgMs = $state(0);
  let frameMonitorLastStruggleAt = $state(-Infinity);

  onMount(() => {
    mounted = true;
    const url = $page.url;
    if (url.searchParams.get('debug') === '1') open = true;

    let last = performance.now();
    let frameCount = 0;
    const loop = createAnimateLoop({
      onFrame: () => {
        const now = performance.now();
        frameCount++;
        const elapsed = now - last;
        if (elapsed >= 1000) {
          fps = Math.round((frameCount * 1000) / elapsed);
          frameTimeMs = Math.round(elapsed / Math.max(1, frameCount));
          last = now;
          frameCount = 0;
          // Sample renderer.info once per second; the values reset on
          // every render call so reading them between frames is fine.
          const rdr = debugCtx?.rendering.value?.renderer;
          if (rdr) {
            drawCalls = rdr.info.render.calls;
            triangles = rdr.info.render.triangles;
            points = rdr.info.render.points;
            lines = rdr.info.render.lines;
            texCount = rdr.info.memory.textures;
            geoCount = rdr.info.memory.geometries;
          }
          const fm = debugCtx?.rendering.value?.frameMonitor;
          if (fm) {
            frameMonitorAvgMs = fm.getAvgFrameMs();
            frameMonitorLastStruggleAt = fm.getLastStruggleAt();
          }
        }
      },
      reducedMotion: () => false,
    });
    loop.start();
    return () => loop.cleanup();
  });

  function toggleOpen() {
    open = !open;
  }

  // If a page registers content, default to the Page tab; otherwise
  // start on Perf.
  $effect(() => {
    if (pageReg.content && activeTab === 'perf') activeTab = 'page';
  });
</script>

{#if mounted && open}
  <aside class="debug-panel" data-testid="debug-panel" aria-label="Debug panel">
    <header class="debug-header">
      <div class="debug-title">
        <span class="debug-label">DEBUG</span>
        {#if pageReg.label}<span class="debug-page-label">· {pageReg.label}</span>{/if}
      </div>
      <div class="debug-meta">
        <span class="debug-fps">{fps} fps · {frameTimeMs}ms</span>
        <button
          type="button"
          class="debug-close"
          onclick={toggleOpen}
          title="Close panel · or set ?debug=0 in the URL to keep it closed"
          aria-label="Close debug panel">×</button
        >
      </div>
    </header>
    <div class="debug-tabs" role="tablist">
      {#if pageReg.content}
        <button
          type="button"
          role="tab"
          class="debug-tab"
          class:active={activeTab === 'page'}
          onclick={() => (activeTab = 'page')}>Page</button
        >
      {/if}
      <button
        type="button"
        role="tab"
        class="debug-tab"
        class:active={activeTab === 'perf'}
        onclick={() => (activeTab = 'perf')}>Perf</button
      >
      <button
        type="button"
        role="tab"
        class="debug-tab"
        class:active={activeTab === 'i18n'}
        onclick={() => (activeTab = 'i18n')}>i18n</button
      >
      <button
        type="button"
        role="tab"
        class="debug-tab"
        class:active={activeTab === 'route'}
        onclick={() => (activeTab = 'route')}>Route</button
      >
      {#if renderingReg}
        <button
          type="button"
          role="tab"
          class="debug-tab"
          class:active={activeTab === 'rendering'}
          onclick={() => (activeTab = 'rendering')}>Render</button
        >
      {/if}
    </div>
    <div class="debug-body">
      {#if activeTab === 'page' && pageReg.content}
        {@render pageReg.content()}
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
          <div class="debug-stub">Wire to frame-monitor for rolling avg + low-1% (stub).</div>
        </div>
      {:else if activeTab === 'i18n'}
        <div class="debug-section">
          <div class="debug-row">
            <span class="debug-key">Locale</span>
            <span class="debug-val">{document?.documentElement?.lang || 'en-US'}</span>
          </div>
          <div class="debug-stub">i18n key-resolution warnings: not yet wired (stub).</div>
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
      {:else if activeTab === 'rendering' && renderingReg}
        <div class="debug-section">
          <div class="debug-row">
            <span class="debug-key">Tier</span>
            <span class="debug-val">{renderingReg.quality.tier}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Source</span>
            <span class="debug-val">{renderingReg.qualitySource}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Pixel ratio cap</span>
            <span class="debug-val">{renderingReg.quality.pixelRatioCap}×</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Sphere segments</span>
            <span class="debug-val">{renderingReg.quality.sphereSegments}</span>
          </div>
        </div>
        <div class="debug-section debug-section-stack">
          <div class="debug-row debug-row-heading">
            <span class="debug-key">Post stack</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Post</span>
            <span class="debug-val">{renderingReg.quality.postEnabled ? 'on' : 'off'}</span>
          </div>
          {#if renderingReg.bloomPass}
            <!-- Live bloom controls (#334 slice 29). Mutating the pass
                 uniforms takes effect on the next composer.render(); no
                 reload required. -->
            <div class="debug-row debug-row-control">
              <span class="debug-key">Bloom</span>
              <label class="debug-toggle">
                <input
                  type="checkbox"
                  checked={renderingReg.bloomPass.enabled}
                  onchange={(e) => {
                    if (renderingReg?.bloomPass) {
                      renderingReg.bloomPass.enabled = e.currentTarget.checked;
                    }
                  }}
                />
                <span>{renderingReg.bloomPass.enabled ? 'on' : 'off'}</span>
              </label>
            </div>
            <div class="debug-row debug-row-control">
              <span class="debug-key">· threshold</span>
              <span class="debug-slider">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={renderingReg.bloomPass.threshold}
                  oninput={(e) => {
                    if (renderingReg?.bloomPass) {
                      renderingReg.bloomPass.threshold = Number(e.currentTarget.value);
                    }
                  }}
                />
                <span class="debug-slider-val">{renderingReg.bloomPass.threshold.toFixed(2)}</span>
              </span>
            </div>
            <div class="debug-row debug-row-control">
              <span class="debug-key">· strength</span>
              <span class="debug-slider">
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.05"
                  value={renderingReg.bloomPass.strength}
                  oninput={(e) => {
                    if (renderingReg?.bloomPass) {
                      renderingReg.bloomPass.strength = Number(e.currentTarget.value);
                    }
                  }}
                />
                <span class="debug-slider-val">{renderingReg.bloomPass.strength.toFixed(2)}</span>
              </span>
            </div>
            <div class="debug-row debug-row-control">
              <span class="debug-key">· radius</span>
              <span class="debug-slider">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={renderingReg.bloomPass.radius}
                  oninput={(e) => {
                    if (renderingReg?.bloomPass) {
                      renderingReg.bloomPass.radius = Number(e.currentTarget.value);
                    }
                  }}
                />
                <span class="debug-slider-val">{renderingReg.bloomPass.radius.toFixed(2)}</span>
              </span>
            </div>
          {:else}
            <div class="debug-row">
              <span class="debug-key">Bloom</span>
              <span class="debug-val"
                >{renderingReg.quality.bloomEnabled
                  ? `on · str ${renderingReg.quality.bloomStrength} · rad ${renderingReg.quality.bloomRadius} · thr ${renderingReg.quality.bloomThreshold}`
                  : 'off'}</span
              >
            </div>
          {/if}
          <!-- Per-pass live toggles (#334 slice 33). Each is a Pass.enabled
               flip (no composer rebuild) or Object3D.visible flip; mutated
               in place, takes effect next composer.render(). When the
               route didn't build the pass (lower tier) the row falls back
               to the static quality-config readout. -->
          {#if renderingReg.bokehPass}
            <div class="debug-row debug-row-control">
              <span class="debug-key">DoF</span>
              <label class="debug-toggle">
                <input
                  type="checkbox"
                  checked={renderingReg.bokehPass.enabled}
                  onchange={(e) => {
                    if (renderingReg?.bokehPass) {
                      renderingReg.bokehPass.enabled = e.currentTarget.checked;
                    }
                  }}
                />
                <span>{renderingReg.bokehPass.enabled ? 'on' : 'off'}</span>
              </label>
            </div>
          {:else}
            <div class="debug-row">
              <span class="debug-key">DoF</span>
              <span class="debug-val">{renderingReg.quality.dofEnabled ? 'on' : 'off'}</span>
            </div>
          {/if}
          {#if renderingReg.filmPass}
            <div class="debug-row debug-row-control">
              <span class="debug-key">Film grain</span>
              <label class="debug-toggle">
                <input
                  type="checkbox"
                  checked={renderingReg.filmPass.enabled}
                  onchange={(e) => {
                    if (renderingReg?.filmPass) {
                      renderingReg.filmPass.enabled = e.currentTarget.checked;
                    }
                  }}
                />
                <span>{renderingReg.filmPass.enabled ? 'on' : 'off'}</span>
              </label>
            </div>
          {:else}
            <div class="debug-row">
              <span class="debug-key">Film grain</span>
              <span class="debug-val">{renderingReg.quality.filmGrainEnabled ? 'on' : 'off'}</span>
            </div>
          {/if}
          {#if renderingReg.vignettePass}
            <div class="debug-row debug-row-control">
              <span class="debug-key">Vignette</span>
              <label class="debug-toggle">
                <input
                  type="checkbox"
                  checked={renderingReg.vignettePass.enabled}
                  onchange={(e) => {
                    if (renderingReg?.vignettePass) {
                      renderingReg.vignettePass.enabled = e.currentTarget.checked;
                    }
                  }}
                />
                <span>{renderingReg.vignettePass.enabled ? 'on' : 'off'}</span>
              </label>
            </div>
          {:else}
            <div class="debug-row">
              <span class="debug-key">Vignette</span>
              <span class="debug-val">{renderingReg.quality.vignetteEnabled ? 'on' : 'off'}</span>
            </div>
          {/if}
          {#if renderingReg.skydomeMesh}
            <div class="debug-row debug-row-control">
              <span class="debug-key">Skydome</span>
              <label class="debug-toggle">
                <input
                  type="checkbox"
                  checked={renderingReg.skydomeMesh.visible}
                  onchange={(e) => {
                    if (renderingReg?.skydomeMesh) {
                      renderingReg.skydomeMesh.visible = e.currentTarget.checked;
                    }
                  }}
                />
                <span>{renderingReg.skydomeMesh.visible ? 'on' : 'off'}</span>
              </label>
            </div>
          {:else}
            <div class="debug-row">
              <span class="debug-key">Skydome</span>
              <span class="debug-val">{renderingReg.quality.skydomeEnabled ? 'on' : 'off'}</span>
            </div>
          {/if}
          {#if renderingReg.sunLensFlareGroup}
            <div class="debug-row debug-row-control">
              <span class="debug-key">Lens flare</span>
              <label class="debug-toggle">
                <input
                  type="checkbox"
                  checked={renderingReg.sunLensFlareGroup.visible}
                  onchange={(e) => {
                    if (renderingReg?.sunLensFlareGroup) {
                      renderingReg.sunLensFlareGroup.visible = e.currentTarget.checked;
                    }
                  }}
                />
                <span>{renderingReg.sunLensFlareGroup.visible ? 'on' : 'off'}</span>
              </label>
            </div>
          {:else}
            <div class="debug-row">
              <span class="debug-key">Lens flare</span>
              <span class="debug-val">{renderingReg.quality.lensFlareEnabled ? 'on' : 'off'}</span>
            </div>
          {/if}
          <div class="debug-row">
            <span class="debug-key">Rim light</span>
            <span class="debug-val"
              >{renderingReg.quality.rimLightEnabled ? 'on' : 'off'}
              <em>(material swap — fixed)</em></span
            >
          </div>
        </div>
        <div class="debug-section debug-section-stack">
          <div class="debug-row debug-row-heading">
            <span class="debug-key">renderer.info (1Hz)</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Draw calls</span>
            <span class="debug-val">{drawCalls}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Triangles</span>
            <span class="debug-val">{triangles.toLocaleString()}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Points</span>
            <span class="debug-val">{points.toLocaleString()}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">Lines</span>
            <span class="debug-val">{lines.toLocaleString()}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">GPU textures</span>
            <span class="debug-val">{texCount.toLocaleString()}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">GPU geometries</span>
            <span class="debug-val">{geoCount.toLocaleString()}</span>
          </div>
        </div>
        {#if renderingReg.frameMonitor}
          <div class="debug-section debug-section-stack">
            <div class="debug-row debug-row-heading">
              <span class="debug-key">frame monitor (rolling avg)</span>
            </div>
            <div class="debug-row">
              <span class="debug-key">Avg frame</span>
              <span class="debug-val"
                >{frameMonitorAvgMs > 0 ? frameMonitorAvgMs.toFixed(1) + ' ms' : '— (warming up)'}
                {#if frameMonitorAvgMs > 0}<em>({(1000 / frameMonitorAvgMs).toFixed(0)} fps)</em
                  >{/if}</span
              >
            </div>
            <div class="debug-row">
              <span class="debug-key">Last struggle</span>
              <span class="debug-val">
                {frameMonitorLastStruggleAt > 0
                  ? ((performance.now() - frameMonitorLastStruggleAt) / 1000).toFixed(0) + ' s ago'
                  : 'never'}
              </span>
            </div>
          </div>
        {/if}
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  .debug-section-stack {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid rgba(94, 234, 212, 0.15);
  }
  .debug-row-heading {
    color: rgba(220, 230, 245, 0.85);
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 2px;
    padding-bottom: 4px;
  }
  .debug-row-control {
    align-items: center;
  }
  .debug-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 11px;
    color: rgba(220, 230, 245, 0.95);
  }
  .debug-toggle input {
    accent-color: #4ecdc4;
  }
  .debug-slider {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .debug-slider input[type='range'] {
    width: 120px;
    accent-color: #4ecdc4;
  }
  .debug-slider-val {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    color: rgba(94, 234, 212, 0.8);
    min-width: 32px;
    text-align: right;
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
  .debug-val em {
    color: rgba(220, 230, 245, 0.5);
    font-style: italic;
    font-size: 9px;
  }
</style>
