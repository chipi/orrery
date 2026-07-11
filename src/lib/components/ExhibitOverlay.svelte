<!--
  Exhibit Mode overlay (#215 / RFC-021 §9). Renders only while `exhibit.active`:
  the QR handoff (bottom-right) + the two hidden exit affordances (Escape key +
  a corner long-press) so an operator can leave a chrome-less kiosk.

  QR is a placeholder box for now — a real QR needs a small encoder lib (dep
  decision pending). It still shows the scan target so the handoff is usable.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { exhibit } from '$lib/exhibit.svelte';

  const EXIT_HOLD_MS = 800;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  // Real scannable QR (#215). qrcode is dynamic-imported so it stays out of the
  // main bundle and only loads when a kiosk enters exhibit mode (RFC-021 §9.3).
  let qrDataUrl = $state('');
  $effect(() => {
    const target = exhibit.qrTarget;
    if (!exhibit.active || !target) {
      qrDataUrl = '';
      return;
    }
    void (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        qrDataUrl = await QRCode.toDataURL(target, { margin: 1, width: 192 });
      } catch {
        qrDataUrl = ''; // fall back to the text placeholder
      }
    })();
  });

  function exit() {
    exhibit.deactivate();
    void goto(`${base}${exhibit.exitHref()}`);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      exit();
    }
  }

  function startHold() {
    clearTimeout(holdTimer);
    holdTimer = setTimeout(exit, EXIT_HOLD_MS);
  }
  function cancelHold() {
    clearTimeout(holdTimer);
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if exhibit.active}
  <!-- Hidden top-left corner long-press → exit (touch kiosks with no keyboard). -->
  <button
    type="button"
    class="exhibit-exit-corner"
    aria-label={m.exhibit_exit_aria()}
    onpointerdown={startHold}
    onpointerup={cancelHold}
    onpointerleave={cancelHold}
    onpointercancel={cancelHold}
  ></button>

  <!-- QR handoff, bottom-right. Placeholder until a QR encoder lands. -->
  <div class="exhibit-qr" aria-hidden="true">
    <div class="qr-box">
      {#if qrDataUrl}
        <img src={qrDataUrl} alt="" width="96" height="96" />
      {:else}
        QR
      {/if}
    </div>
    <span class="qr-caption">{m.exhibit_qr_caption()}</span>
    <span class="qr-url">{exhibit.qrTarget}</span>
  </div>
{/if}

<style>
  .exhibit-exit-corner {
    position: fixed;
    top: 0;
    left: 0;
    width: 64px;
    height: 64px;
    z-index: 9999;
    background: transparent;
    border: none;
    cursor: default;
    /* Invisible but hit-testable — the discreet operator exit. */
    opacity: 0;
  }

  .exhibit-qr {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 9998;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .qr-box {
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    color: #000;
    font-family: var(--font-display, monospace);
    font-size: 20px;
    letter-spacing: 2px;
    border-radius: 4px;
  }
  .qr-caption {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    text-align: center;
    line-height: 1.3;
  }
  .qr-url {
    max-width: 160px;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.45);
    word-break: break-all;
    text-align: center;
  }
</style>
