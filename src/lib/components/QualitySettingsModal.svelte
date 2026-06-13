<!--
  Shared graphics-quality settings modal (#339).

  Lifted from /fly's polish-wave-1 settings UI so every 3D-heavy route
  (/explore, /iss, /tiangong, /fly) ships the same in-app affordance
  to swap quality tier — no need to leave the route + visit /fly to
  change the global localStorage choice.

  Behaviour mirrors /fly's original modal exactly:
    - Button (⚙) fixed top-right under the nav bar
    - Click → small floating panel with auto + 5 tier radios
    - Selecting a value writes via `writeUserChoice` (the global
      localStorage key) so the change persists across routes
    - Dirty hint + "Reload now" button — the renderer reads the
      tier synchronously in onMount, so applying a new tier needs
      a reload (we don't rebuild the scene mid-flight)

  Usage:

    <script>
      import QualitySettingsModal from '$lib/components/QualitySettingsModal.svelte';
      // …after `const quality = resolveQualitySync(url);` in onMount:
      activeQualityTier = quality.tier;
    </script>

    <QualitySettingsModal {activeQualityTier} />

  `activeQualityTier` is the tier the renderer actually resolved at
  mount (shown in the "Active:" hint). Routes pass their own; the
  modal doesn't re-resolve.
-->
<script lang="ts">
  import {
    type QualityChoice,
    type QualityTier,
    readUserChoice,
    writeUserChoice,
    ALL_TIERS,
  } from '$lib/quality/quality-tier';

  let { activeQualityTier }: { activeQualityTier: QualityTier } = $props();

  let settingsOpen = $state(false);
  let qualityChoice = $state<QualityChoice>('auto');
  let qualityDirty = $state(false);

  function toggleSettings() {
    settingsOpen = !settingsOpen;
    if (settingsOpen) qualityChoice = readUserChoice();
  }
  function onQualityChange(next: QualityChoice) {
    qualityChoice = next;
    writeUserChoice(next);
    qualityDirty = true;
  }
  function reloadForQuality() {
    if (typeof window !== 'undefined') window.location.reload();
  }
</script>

<button
  type="button"
  class="settings-btn"
  onclick={toggleSettings}
  aria-label={settingsOpen ? 'Close settings' : 'Open settings'}
  aria-expanded={settingsOpen}
  title="Settings"
>
  ⚙
</button>

{#if settingsOpen}
  <div class="settings-panel" role="dialog" aria-label="Settings">
    <div class="settings-header">
      <span class="settings-title">SETTINGS</span>
      <button
        type="button"
        class="settings-close"
        onclick={toggleSettings}
        aria-label="Close settings">×</button
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
  .settings-btn {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    right: 16px;
    z-index: 36;
    min-width: 44px;
    min-height: 44px;
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.4);
    color: rgba(220, 230, 245, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 18px;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
  }
  .settings-btn:hover,
  .settings-btn:focus-visible {
    border-color: #4ecdc4;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }
  .settings-panel {
    position: fixed;
    top: calc(var(--nav-height) + 56px);
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
