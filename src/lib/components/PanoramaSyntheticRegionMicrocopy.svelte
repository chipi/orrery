<!--
  Synthetic-region honest microcopy (PRD-022 / ADR-074, #286 Phase 2D).

  Fires when the camera's pitch falls inside a declared
  `panorama_metadata.synthetic_regions` range. Dashed-border centred
  banner: "This region of the sky was not photographed at this site
  — the visible pattern is synthetic."

  The text varies slightly per `kind` so we don't over-promise:
    - synthetic_sky: above-horizon region, sky we couldn't see
    - synthetic_nadir: below-horizon region (lander deck, blocked)
    - no_data: missing data we filled in (Mars 3-style historical fragments)

  Sites without `synthetic_regions` declared never see this — only
  sites with honest provenance metadata trip it.
-->
<script lang="ts">
  import type { PanoramaMetadata } from '$types/surface-site';

  interface Props {
    active: boolean;
    /** Current camera pitch in degrees, 0 = horizon, +90 = zenith, -90 = nadir. */
    pitchDeg: number;
    syntheticRegions: PanoramaMetadata['synthetic_regions'] | null | undefined;
  }
  let { active, pitchDeg, syntheticRegions }: Props = $props();

  // Find the active region (first one whose pitch range contains
  // pitchDeg). Returns null when none match.
  let activeRegion = $derived.by(() => {
    if (!active || !syntheticRegions || syntheticRegions.length === 0) return null;
    return (
      syntheticRegions.find(
        (r) => pitchDeg >= r.pitch_min_deg && pitchDeg <= r.pitch_max_deg,
      ) ?? null
    );
  });

  let microcopy = $derived.by(() => {
    if (!activeRegion) return null;
    switch (activeRegion.kind) {
      case 'synthetic_sky':
        return {
          tag: 'SYNTHETIC SKY',
          body: 'This region of the sky was not photographed at this site. The visible pattern is synthetic.',
        };
      case 'synthetic_nadir':
        return {
          tag: 'SYNTHETIC NADIR',
          body: "This region below the horizon was not captured (or is blocked by the lander deck). The visible pattern is synthetic.",
        };
      case 'no_data':
        return {
          tag: 'NO DATA',
          body: "No transmitted data covers this region — the visible pattern is synthetic fill honouring the historical artifact.",
        };
      default:
        return null;
    }
  });
</script>

{#if microcopy}
  <div
    class="microcopy"
    role="status"
    aria-live="polite"
    data-testid="panorama-synthetic-microcopy"
  >
    <div class="tag mono">{microcopy.tag}</div>
    <div class="body">{microcopy.body}</div>
  </div>
{/if}

<style>
  .microcopy {
    position: fixed;
    top: 48%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.55);
    border: 1px dashed rgba(255, 255, 255, 0.25);
    padding: 18px 32px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    text-align: center;
    max-width: 480px;
    backdrop-filter: blur(3px);
    z-index: 55;
    pointer-events: none;
    animation: fade-in 200ms ease-out;
  }

  .tag {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.12em;
    margin-bottom: 6px;
  }

  .mono {
    font-family: 'Space Mono', 'Courier New', monospace;
  }

  .body {
    line-height: 1.5;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .microcopy {
      animation: none;
    }
  }
</style>
