<!--
  Tier-context attribution card for surface-map routes (#42).

  Lives in the bottom-left of /moon + /mars whenever the LOD dispatcher
  hands the camera a tier with published imagery. One stacked block per
  active layer; the bottom block also carries the published positional
  uncertainty (±N m) when known.

  scaleNote is an optional trailing block — Mars uses it for the
  "CTX disc 10 km, HiRISE disc 500 m, not to scale" caveat; Moon
  doesn't need it (single regional source per site).
-->
<script lang="ts">
  import type { TierContext } from '$lib/surface-map/tier-context';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    tierContext: TierContext;
    scaleNote?: string;
  }
  let { tierContext, scaleNote }: Props = $props();
</script>

<div class="tier-context-card" aria-live="polite">
  <div class="tcc-head">
    <span class="tcc-site">{tierContext.siteName}</span>
    <span class="tcc-chip" style="color: {tierContext.nationColor};">{tierContext.nation}</span>
  </div>
  {#if tierContext.missionContext}
    <div class="tcc-mission">{tierContext.missionContext}</div>
  {/if}
  {#each tierContext.layers as layer, i (layer.layerLabel)}
    <div class="tcc-layer-block" class:tcc-layer-block-next={i > 0}>
      <div class="tcc-layer">{layer.layerLabel} · {layer.resolutionText}</div>
      <div class="tcc-source">{layer.sourceTitle}</div>
      <div class="tcc-author">{layer.sourceAuthor}</div>
      <div class="tcc-footer">
        <span class="tcc-license">{layer.licenseShort}</span>
        {#if layer.uncertaintyM != null}
          <span class="tcc-uncertainty">±{layer.uncertaintyM} m</span>
        {:else if i === tierContext.layers.length - 1 && tierContext.uncertaintyM != null}
          <span class="tcc-uncertainty">±{tierContext.uncertaintyM} m</span>
        {/if}
        {#if layer.sourceUrl}
          <a
            class="tcc-link"
            href={layer.sourceUrl}
            target="_blank"
            rel="noopener noreferrer external"
            title={m.source_open_new_tab_title()}>source ↗</a
          >
        {/if}
      </div>
    </div>
  {/each}
  {#if scaleNote}
    <div class="tcc-scale-note">{scaleNote}</div>
  {/if}
</div>

<style>
  .tier-context-card {
    position: absolute;
    left: 12px;
    bottom: 56px;
    z-index: 6;
    max-width: 360px;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(6px);
    animation: tcc-fade-in 600ms ease-out;
  }
  .tcc-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 4px;
  }
  .tcc-site {
    font-size: 13px;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .tcc-chip {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .tcc-mission {
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    margin-bottom: 6px;
  }
  .tcc-layer-block-next {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .tcc-layer {
    color: #4ecdc4;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .tcc-source {
    color: rgba(255, 255, 255, 0.9);
    font-size: 11px;
  }
  .tcc-author {
    color: rgba(255, 255, 255, 0.55);
    font-size: 10px;
    margin-bottom: 6px;
  }
  .tcc-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
  }
  .tcc-license {
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 3px;
    padding: 1px 6px;
    letter-spacing: 0.5px;
  }
  .tcc-uncertainty {
    color: rgba(255, 200, 100, 0.7);
  }
  .tcc-link {
    margin-left: auto;
    color: rgba(78, 205, 196, 0.85);
    text-decoration: none;
  }
  .tcc-link:hover {
    text-decoration: underline;
  }
  .tcc-scale-note {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 9.5px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
  }
  @keyframes tcc-fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
