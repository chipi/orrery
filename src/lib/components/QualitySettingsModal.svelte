<!--
  Shared graphics-quality settings popup (#339 + 2026-06-17 consolidation).

  Pre-2026-06-17 this component rendered a fixed-position ⚙ button +
  a click-out popup; each route (/fly, /explore, /iss, /tiangong) had
  the button materialise on top of its canvas.

  Now: the ⚙ button lives in `<Nav>` permanently (enabled on routes
  that mount this component; disabled-with-tooltip elsewhere). This
  component:
    - Registers settings availability + the active quality tier in
      the shared store (`quality-settings-store.svelte.ts`) on mount,
      clears on unmount.
    - Renders only the popup panel, gated on `settingsState.open`.

  Usage is unchanged from the route's POV:

    <script>
      import QualitySettingsModal from '$lib/components/QualitySettingsModal.svelte';
      // …after `const quality = resolveQualitySync(url);` in onMount:
      activeQualityTier = quality.tier;
    </script>

    <QualitySettingsModal {activeQualityTier} />
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import {
    type QualityChoice,
    type QualityTier,
    readUserChoice,
    writeUserChoice,
    ALL_TIERS,
  } from '$lib/quality/quality-tier';
  import {
    settingsState,
    setSettingsAvailable,
    clearSettingsAvailable,
    closeSettings,
  } from '$lib/quality/quality-settings-store.svelte';

  let { activeQualityTier }: { activeQualityTier: QualityTier } = $props();

  let qualityChoice = $state<QualityChoice>('auto');
  let qualityDirty = $state(false);

  // Register availability + the active tier on mount. Re-runs when
  // activeQualityTier changes (e.g. a route that resolves tier
  // asynchronously) so the popup's "Active:" hint stays accurate.
  $effect(() => {
    setSettingsAvailable(activeQualityTier);
  });
  onDestroy(() => {
    clearSettingsAvailable();
  });

  // Read the persisted choice the first time the popup opens — saves a
  // localStorage hit on every mount.
  let pristineLoaded = false;
  $effect(() => {
    if (settingsState.open && !pristineLoaded) {
      qualityChoice = readUserChoice();
      pristineLoaded = true;
    }
  });

  function onQualityChange(next: QualityChoice) {
    qualityChoice = next;
    writeUserChoice(next);
    qualityDirty = true;
  }
  function reloadForQuality() {
    if (typeof window !== 'undefined') window.location.reload();
  }
</script>

{#if settingsState.open}
  <div class="settings-panel" role="dialog" aria-label={m.settings_aria()}>
    <div class="settings-header">
      <span class="settings-title">SETTINGS</span>
      <button
        type="button"
        class="settings-close"
        onclick={closeSettings}
        aria-label={m.settings_close_aria()}>×</button
      >
    </div>
    <div class="settings-section">
      <div class="settings-section-title">Graphics Quality</div>
      <div class="settings-section-hint">
        Active: <span class="settings-active-tier">{activeQualityTier}</span>
      </div>
      <label class="settings-radio">
        <input
          type="radio"
          name="quality"
          value="auto"
          checked={qualityChoice === 'auto'}
          onchange={() => onQualityChange('auto')}
        />
        <span>Auto (detect GPU)</span>
      </label>
      {#each ALL_TIERS as tier (tier)}
        <label class="settings-radio">
          <input
            type="radio"
            name="quality"
            value={tier}
            checked={qualityChoice === tier}
            onchange={() => onQualityChange(tier)}
          />
          <span>{tier}</span>
        </label>
      {/each}
      {#if qualityDirty}
        <div class="settings-reload-hint">
          Reload required to apply.
          <button type="button" class="settings-reload-btn" onclick={reloadForQuality}
            >Reload now</button
          >
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .settings-panel {
    position: fixed;
    top: calc(var(--nav-height) + 8px);
    right: 16px;
    z-index: 37;
    width: 240px;
    background: rgba(10, 14, 28, 0.95);
    border: 1px solid rgba(78, 205, 196, 0.45);
    border-radius: 6px;
    padding: 12px 14px;
    color: rgba(220, 230, 245, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
  }
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .settings-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 3px;
    color: #4ecdc4;
  }
  .settings-close {
    background: transparent;
    border: none;
    color: rgba(220, 230, 245, 0.7);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 6px;
  }
  .settings-close:hover {
    color: #4ecdc4;
  }
  .settings-section-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 2.5px;
    margin-bottom: 4px;
    color: rgba(220, 230, 245, 0.9);
  }
  .settings-section-hint {
    font-size: 10px;
    color: rgba(220, 230, 245, 0.6);
    margin-bottom: 8px;
  }
  .settings-active-tier {
    color: #4ecdc4;
    text-transform: uppercase;
  }
  .settings-radio {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    cursor: pointer;
    text-transform: capitalize;
  }
  .settings-radio input {
    accent-color: #4ecdc4;
    cursor: pointer;
  }
  .settings-reload-hint {
    margin-top: 10px;
    padding: 8px;
    background: rgba(255, 200, 80, 0.15);
    border: 1px solid rgba(255, 200, 80, 0.5);
    border-radius: 4px;
    font-size: 11px;
    color: #ffd870;
  }
  .settings-reload-btn {
    display: inline-block;
    margin-top: 6px;
    background: rgba(78, 205, 196, 0.2);
    border: 1px solid #4ecdc4;
    color: #4ecdc4;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
  }
  .settings-reload-btn:hover {
    background: rgba(78, 205, 196, 0.35);
  }
</style>
