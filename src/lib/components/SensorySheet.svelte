<!--
  Unified settings panel (2026-07-13 merge of the sensory sheet + graphics ⚙).
  Opened from the single nav settings button. Bottom-sheet on mobile, dropdown on
  desktop. Sections:
    • Sound / Haptics / Tilt — the sensory channels (master switch + per-channel),
      capability-gated (RFC-020 §7.3). Available on every route.
    • Graphics quality — only when the current route surfaces it
      (settingsState.available), read from the shared quality-settings store.
  Dismiss on Escape, backdrop, or the close button — focus restored to the opener.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { sensory } from '$lib/sensory/state.svelte';
  import { gyro } from '$lib/sensory/device-orientation';
  import type { SensoryChannel } from '$lib/sensory/capabilities';
  import { settingsState, closeSettings } from '$lib/quality/quality-settings-store.svelte';
  import {
    type QualityChoice,
    readUserChoice,
    writeUserChoice,
    ALL_TIERS,
  } from '$lib/quality/quality-tier';

  let dialogEl = $state<HTMLDivElement | null>(null);
  let opener: HTMLElement | null = null;
  let gyroDenied = $state(false);

  // ── Graphics quality (moved from QualitySettingsModal) ─────────────────────
  let qualityChoice = $state<QualityChoice>('auto');
  let qualityDirty = $state(false);
  let pristineLoaded = false;
  $effect(() => {
    if (sensory.settingsOpen && settingsState.available && !pristineLoaded) {
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

  // Enabling GYRO must request the iOS motion permission from the tap gesture
  // (P-A). Denial leaves the row visible with a tooltip; the other channels are
  // unaffected. Sound/Vibration flip synchronously.
  async function toggleChannel(ch: SensoryChannel): Promise<void> {
    if (ch === 'gyro' && !sensory.gyroWanted) {
      const granted = await gyro.requestPermission();
      gyroDenied = !granted;
      if (!granted) return;
    }
    sensory.setChannel(ch, !wanted(ch));
  }

  // Focus the panel on open; restore focus to the opener on close.
  $effect(() => {
    if (sensory.settingsOpen) {
      opener = document.activeElement as HTMLElement | null;
      void tick().then(() => dialogEl?.querySelector<HTMLElement>('[data-first]')?.focus());
    } else if (opener) {
      opener.focus();
      opener = null;
    }
  });

  function onClose(): void {
    sensory.closeSettings();
    closeSettings(); // keep the graphics store's open flag in sync
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }

  // Per-channel section metadata, in display order.
  const channels: Array<{
    ch: SensoryChannel;
    label: () => string;
    desc: () => string;
  }> = [
    { ch: 'audio', label: m.sensory_row_audio_label, desc: m.sensory_row_audio_desc },
    { ch: 'haptic', label: m.sensory_row_haptic_label, desc: m.sensory_row_haptic_desc },
    { ch: 'gyro', label: m.sensory_row_gyro_label, desc: m.sensory_row_gyro_desc },
  ];

  function wanted(ch: SensoryChannel): boolean {
    return ch === 'gyro'
      ? sensory.gyroWanted
      : ch === 'audio'
        ? sensory.audioWanted
        : sensory.hapticWanted;
  }
</script>

{#if sensory.settingsOpen}
  <button
    type="button"
    class="sensory-backdrop"
    aria-label={m.sensory_sheet_close_aria()}
    onclick={onClose}
  ></button>

  <div
    bind:this={dialogEl}
    id="sensory-sheet"
    class="sensory-sheet"
    role="dialog"
    tabindex="-1"
    aria-modal="false"
    aria-labelledby="sensory-sheet-title"
    onkeydown={onKeydown}
  >
    <header class="sheet-head">
      <h2 id="sensory-sheet-title">{m.settings_title()}</h2>
      <button
        type="button"
        class="sheet-close"
        aria-label={m.sensory_sheet_close_aria()}
        onclick={onClose}>×</button
      >
    </header>

    <!-- Master switch — gates the three sensory channels below. -->
    <div class="row master">
      <div class="row-text">
        <span class="row-label">{m.sensory_master_label()}</span>
        <span class="row-desc">{m.sensory_master_hint()}</span>
      </div>
      <button
        type="button"
        class="switch"
        role="switch"
        data-first
        aria-checked={sensory.on}
        aria-label={m.sensory_master_label()}
        onclick={() => sensory.toggleMaster()}
      >
        <span class="knob"></span>
      </button>
    </div>

    <!-- One section per capable sensory channel (Sound / Haptics / Tilt). -->
    {#each channels as { ch, label, desc } (ch)}
      {#if sensory.capabilities[ch]}
        <section class="section" class:dimmed={!sensory.on}>
          <div class="section-title">{label()}</div>
          <div class="row sub">
            <div class="row-text">
              <span class="row-desc">{desc()}</span>
            </div>
            <button
              type="button"
              class="switch"
              role="switch"
              aria-checked={wanted(ch)}
              aria-label={label()}
              onclick={() => void toggleChannel(ch)}
            >
              <span class="knob"></span>
            </button>
          </div>
          {#if ch === 'gyro' && gyroDenied}
            <p class="sheet-note" role="alert">{m.sensory_gyro_denied()}</p>
          {/if}
          {#if ch === 'gyro'}
            <p class="sheet-help">{m.sensory_recalibrate_help()}</p>
          {/if}
        </section>
      {/if}
    {/each}

    <!-- Graphics quality — only where the route surfaces it. -->
    {#if settingsState.available}
      <section class="section">
        <div class="section-title">{m.settings_graphics_quality()}</div>
        <div class="section-hint">
          {m.settings_active_label()}
          <span class="active-tier">{settingsState.activeTier}</span>
        </div>
        <label class="radio">
          <input
            type="radio"
            name="quality"
            value="auto"
            checked={qualityChoice === 'auto'}
            onchange={() => onQualityChange('auto')}
          />
          <span>{m.settings_auto_detect()}</span>
        </label>
        {#each ALL_TIERS as tier (tier)}
          <label class="radio">
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
          <div class="reload-hint">
            {m.settings_reload_required()}
            <button type="button" class="reload-btn" onclick={reloadForQuality}
              >{m.settings_reload_now()}</button
            >
          </div>
        {/if}
      </section>
    {/if}
  </div>
{/if}

<style>
  .sensory-backdrop {
    position: fixed;
    inset: 0;
    top: var(--nav-height);
    z-index: 88;
    background: transparent;
    border: none;
    cursor: default;
  }

  .sensory-sheet {
    position: fixed;
    top: calc(var(--nav-height) + 6px);
    right: 8px;
    width: min(340px, calc(100vw - 16px));
    max-height: calc(100vh - var(--nav-height) - 20px);
    overflow-y: auto;
    z-index: 90;
    background: var(--color-nav-bg);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 6px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
  }

  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 10px;
    border-bottom: 1px solid var(--color-border);
  }
  .sheet-head h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 1px;
    color: var(--color-text);
  }
  .sheet-close {
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    border-radius: 6px;
  }
  .sheet-close:hover,
  .sheet-close:focus-visible {
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }

  /* Section grouping — a labelled subsection (Sound / Haptics / Tilt / Graphics). */
  .section {
    padding: 8px 2px 6px;
    border-bottom: 1px solid var(--color-border);
  }
  .section:last-child {
    border-bottom: none;
  }
  .section.dimmed {
    opacity: 0.5;
  }
  .section-title {
    font-family: var(--font-display);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 0 10px;
    color: rgba(255, 255, 255, 0.85);
  }
  .section-hint {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
    padding: 2px 10px 4px;
  }
  .active-tier {
    color: #4ecdc4;
    text-transform: uppercase;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 6px 10px;
  }
  .row.master {
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 2px;
  }
  .row-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .row-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
  }
  .row-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.3;
  }

  /* Switch — 44px hit area, animated knob ≤150ms (PRD-017 S3). */
  .switch {
    flex-shrink: 0;
    position: relative;
    width: 44px;
    height: 26px;
    padding: 0;
    border-radius: 13px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    transition:
      background 140ms,
      border-color 140ms;
  }
  .switch .knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    transition: transform 140ms ease;
  }
  .switch[aria-checked='true'] {
    background: rgba(78, 205, 196, 0.28);
    border-color: rgba(78, 205, 196, 0.7);
  }
  .switch[aria-checked='true'] .knob {
    transform: translateX(18px);
    background: #4ecdc4;
  }
  .switch:focus-visible {
    outline: 2px solid var(--color-accent, #4466ff);
    outline-offset: 2px;
  }

  .radio {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    cursor: pointer;
    text-transform: capitalize;
    font-size: 13px;
    color: var(--color-text);
  }
  .radio input {
    accent-color: #4ecdc4;
    cursor: pointer;
  }
  .reload-hint {
    margin: 8px 10px 2px;
    padding: 8px;
    background: rgba(255, 200, 80, 0.15);
    border: 1px solid rgba(255, 200, 80, 0.5);
    border-radius: 4px;
    font-size: 11px;
    color: #ffd870;
  }
  .reload-btn {
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
  .reload-btn:hover {
    background: rgba(78, 205, 196, 0.35);
  }

  .sheet-note {
    margin: -2px 10px 4px;
    font-size: 11px;
    color: #ffb454;
    line-height: 1.3;
  }
  .sheet-help {
    margin: 2px 10px 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    font-family: var(--font-mono, 'Space Mono', monospace);
    letter-spacing: 0.5px;
  }

  @media (prefers-reduced-motion: reduce) {
    .switch,
    .switch .knob {
      transition: none;
    }
  }

  /* Bottom-sheet on phones (WhyPopover pattern). */
  @media (max-width: 600px) {
    .sensory-sheet {
      top: auto;
      left: 8px;
      right: 8px;
      bottom: 8px;
      width: auto;
      max-height: 70vh;
      border-radius: 14px;
    }
  }
</style>
