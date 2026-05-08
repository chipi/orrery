<!--
  ConicSectionPanel — bottom-right HTML overlay on /fly that names the
  current arc shape (circle / ellipse / parabola / hyperbola) computed
  from heliocentric specific orbital energy. Phase I.

  Lens-gated on the 'conics' layer. Click → /science/transfers/conic-sections.

  Classification helper (`classifyConic`) lives in orbit-overlays.ts so
  it can be unit-tested without DOM.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { onLayerChange } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages.js';

  type Shape = 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
  type Props = {
    /** 'circle' | 'ellipse' | 'parabola' | 'hyperbola' — current arc. */
    shape: Shape;
    /** Semi-major axis in AU (negative for hyperbolic). */
    a: number;
    /** Eccentricity (dimensionless). */
    e: number;
    /** Specific orbital energy in AU²/day². */
    epsilon: number;
  };
  let { shape, a, e, epsilon }: Props = $props();

  let layerOn = $state(false);
  let stop: (() => void) | undefined;

  onMount(() => {
    stop = onLayerChange('conics', (on) => {
      layerOn = on;
    });
  });
  onDestroy(() => stop?.());

  function shapeLabel(s: Shape): string {
    switch (s) {
      case 'circle':
        return m.conics_shape_circle();
      case 'ellipse':
        return m.conics_shape_ellipse();
      case 'parabola':
        return m.conics_shape_parabola();
      case 'hyperbola':
        return m.conics_shape_hyperbola();
    }
  }

  function shapeBlurb(s: Shape): string {
    switch (s) {
      case 'circle':
        return m.conics_blurb_circle();
      case 'ellipse':
        return m.conics_blurb_ellipse();
      case 'parabola':
        return m.conics_blurb_parabola();
      case 'hyperbola':
        return m.conics_blurb_hyperbola();
    }
  }

  function fmtAU(au: number): string {
    if (!isFinite(au)) return '∞';
    if (Math.abs(au) >= 100) return au.toFixed(0);
    if (Math.abs(au) >= 1) return au.toFixed(2);
    return au.toFixed(3);
  }
</script>

{#if layerOn}
  <a
    class="panel"
    href="{base}/science/transfers/conic-sections"
    data-testid="conic-section-panel"
    data-shape={shape}
  >
    <div class="eyebrow">{m.conics_eyebrow()}</div>
    <div class="shape">
      <!-- Inline SVG family, swapped by the current shape. Coord-pinned
           at 32×20 so the icon sits crisp next to the label regardless
           of font-size at the consuming site. -->
      {#if shape === 'circle'}
        <svg viewBox="0 0 32 20" width="32" height="20" aria-hidden="true">
          <circle cx="16" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.4" />
          <circle cx="16" cy="10" r="1.2" fill="currentColor" />
        </svg>
      {:else if shape === 'ellipse'}
        <svg viewBox="0 0 32 20" width="32" height="20" aria-hidden="true">
          <ellipse
            cx="16"
            cy="10"
            rx="13"
            ry="6"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
          />
          <circle cx="22" cy="10" r="1.2" fill="currentColor" />
        </svg>
      {:else if shape === 'parabola'}
        <svg viewBox="0 0 32 20" width="32" height="20" aria-hidden="true">
          <path d="M3 3 Q 16 22 29 3" fill="none" stroke="currentColor" stroke-width="1.4" />
          <circle cx="16" cy="14" r="1.2" fill="currentColor" />
        </svg>
      {:else}
        <svg viewBox="0 0 32 20" width="32" height="20" aria-hidden="true">
          <path d="M3 3 Q 12 10 3 17" fill="none" stroke="currentColor" stroke-width="1.4" />
          <path d="M29 3 Q 20 10 29 17" fill="none" stroke="currentColor" stroke-width="1.4" />
          <circle cx="11.5" cy="10" r="1.2" fill="currentColor" />
        </svg>
      {/if}
      <span class="shape-label">{shapeLabel(shape)}</span>
    </div>
    <p class="blurb">{shapeBlurb(shape)}</p>
    <dl class="vitals">
      <div class="vital">
        <dt>a</dt>
        <dd>{fmtAU(a)}<span class="unit">AU</span></dd>
      </div>
      <div class="vital">
        <dt>e</dt>
        <dd>{e.toFixed(3)}</dd>
      </div>
      <div class="vital">
        <dt>ε</dt>
        <dd>
          {epsilon >= 0 ? '+' : ''}{epsilon.toExponential(1)}
        </dd>
      </div>
    </dl>
    <div class="link">{m.conics_read_more()}</div>
  </a>
{/if}

<style>
  .panel {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 31;
    display: block;
    width: 240px;
    padding: 10px 12px 8px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    color: var(--color-text);
    text-decoration: none;
    transition:
      border-color 120ms,
      transform 200ms;
  }
  .panel:hover,
  .panel:focus-visible {
    border-color: rgba(255, 200, 80, 0.85);
    transform: translateY(-2px);
    outline: none;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: #ffc850;
    margin-bottom: 4px;
  }
  .shape {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    color: rgba(255, 200, 80, 0.92);
  }
  .shape :global(svg) {
    flex-shrink: 0;
  }
  .shape-label {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.95);
    text-transform: uppercase;
  }
  .blurb {
    margin: 0 0 6px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.7);
  }
  .vitals {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin: 6px 0 4px;
    padding: 6px 0;
    border-top: 1px solid rgba(255, 200, 80, 0.18);
    border-bottom: 1px solid rgba(255, 200, 80, 0.18);
  }
  .vital {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  .vital dt {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }
  .vital dd {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.92);
    margin: 0;
  }
  .unit {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 2px;
  }
  .link {
    margin-top: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.85);
  }

  /* Mobile: bottom-center stacked above the timeline scrubber. */
  @media (max-width: 600px) {
    .panel {
      right: 8px;
      left: 8px;
      bottom: 84px;
      width: auto;
    }
  }
</style>
