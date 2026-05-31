<!--
  Caption overlay for Tier-3 panorama view (PRD-022 / ADR-074, #286).

  Renders the sol / date / instrument header, body caption, and
  imaging-team credit footer. Agency-tinted left border keeps the
  panel visually attributed.

  Visible only when `active` is true. Fades in 200 ms on entry per
  the v0.7 SurfaceScene HUD pattern; reduced-motion users get an
  instant cut. Dismissible by clicking the small × button; the
  ⓘ button at the same position re-opens it.

  Metadata source: `selected.panorama_metadata` from the surface-
  hotspots sidecar. When metadata is absent, the overlay renders a
  generic fallback ("Surface panorama · <agency>") so we never lie
  about what the data is.
-->
<script lang="ts">
  import type { PanoramaMetadata } from '$types/surface-site';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    active: boolean;
    metadata: PanoramaMetadata | null | undefined;
    agency: string;
    agencyColor: string;
    fallbackCaption: string;
  }
  let { active, metadata, agency, agencyColor, fallbackCaption }: Props = $props();

  let dismissed = $state(false);
  $effect(() => {
    void metadata;
    dismissed = false;
  });

  let header = $derived.by(() => {
    const parts: string[] = [];
    if (metadata?.sol != null) parts.push(`SOL ${metadata.sol}`);
    if (metadata?.date) parts.push(metadata.date);
    if (metadata?.instrument) parts.push(metadata.instrument);
    return parts.join(' · ');
  });

  let captionText = $derived(metadata?.caption ?? fallbackCaption);
  let credit = $derived(metadata?.credit_team ?? `${agency} · Surface panorama`);
</script>

{#if active && !dismissed}
  <div
    class="caption-overlay"
    style:--agency-color={agencyColor}
    role="region"
    aria-label={m.panorama_caption_aria_label()}
    data-testid="panorama-caption-overlay"
  >
    {#if header}
      <div class="meta-line">{header}</div>
    {/if}
    <p class="caption">{captionText}</p>
    <div class="footer">
      <span class="credit">{credit}</span>
      {#if metadata?.nasa_id}
        <span class="nasa-id mono">{metadata.nasa_id}</span>
      {/if}
    </div>
    <button
      type="button"
      class="dismiss"
      aria-label={m.panorama_caption_dismiss_aria()}
      onclick={() => (dismissed = true)}
    >
      ×
    </button>
  </div>
{:else if active && dismissed}
  <button
    type="button"
    class="caption-reopen"
    aria-label={m.panorama_caption_reopen_aria()}
    onclick={() => (dismissed = false)}
  >
    ⓘ
  </button>
{/if}

<style>
  .caption-overlay {
    position: fixed;
    bottom: 24px;
    left: 24px;
    max-width: 560px;
    background: rgba(4, 4, 12, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-left: 3px solid var(--agency-color);
    padding: 14px 38px 14px 18px;
    backdrop-filter: blur(6px);
    color: var(--color-text-on-dark, #ffffff);
    font-size: 13px;
    line-height: 1.5;
    z-index: 60;
    animation: fade-in 200ms ease-out;
    pointer-events: auto;
  }
  .caption-overlay:focus-within {
    outline: 2px solid var(--agency-color);
    outline-offset: 2px;
  }

  .meta-line {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.65);
    letter-spacing: 0.08em;
    margin-bottom: 6px;
  }

  .caption {
    font-size: 14px;
    margin: 0 0 6px 0;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }

  .credit {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.45);
  }

  .nasa-id {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
  }
  .mono {
    font-family: 'Space Mono', 'Courier New', monospace;
  }

  .dismiss {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 6px;
  }
  .dismiss:hover,
  .dismiss:focus-visible {
    color: rgba(255, 255, 255, 0.9);
  }

  .caption-reopen {
    position: fixed;
    bottom: 24px;
    left: 24px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(4, 4, 12, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.65);
    font-size: 14px;
    backdrop-filter: blur(6px);
    cursor: pointer;
    z-index: 60;
    animation: fade-in 150ms ease-out;
  }
  .caption-reopen:hover,
  .caption-reopen:focus-visible {
    color: rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 255, 255, 0.4);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .caption-overlay,
    .caption-reopen {
      animation: none;
    }
  }
</style>
