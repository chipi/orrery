<!--
  Synthetic-region honest microcopy (PRD-022 / ADR-074, #286 Phase 2D).

  Fires when the camera's pitch (and yaw, for an azimuth range) falls inside a declared
  `panorama_metadata.synthetic_regions` range. Dashed-border centred
  banner: "This region of the sky was not photographed at this site
  — the visible pattern is synthetic."

  The text varies slightly per `kind` so we don't over-promise:
    - synthetic_sky: above-horizon region, sky we couldn't see
    - synthetic_nadir: below-horizon region (lander deck, blocked)
    - no_data: missing data we filled in (Mars 3-style historical fragments)
    - unphotographed: the azimuth wedge a partial panorama never covered (#289)

  Sites without `synthetic_regions` declared never see this — only
  sites with honest provenance metadata trip it.
-->
<script lang="ts">
  import type { PanoramaMetadata } from '$types/surface-site';
  import * as m from '$lib/paraglide/messages';
  import { syntheticRegionAt } from '$lib/panorama-regions';

  interface Props {
    active: boolean;
    /** Current camera pitch in degrees, 0 = horizon, +90 = zenith, -90 = nadir. */
    pitchDeg: number;
    /** Current camera yaw in degrees (0–360, the `?yaw=` convention). */
    yawDeg?: number;
    syntheticRegions: PanoramaMetadata['synthetic_regions'] | null | undefined;
  }
  let { active, pitchDeg, yawDeg = 0, syntheticRegions }: Props = $props();

  // The first region whose pitch range — and azimuth range, if it has one —
  // contains the camera; null when none does.
  let activeRegion = $derived(
    active ? syntheticRegionAt(syntheticRegions, pitchDeg, yawDeg) : null,
  );

  let microcopy = $derived.by(() => {
    if (!activeRegion) return null;
    switch (activeRegion.kind) {
      case 'synthetic_sky':
        return { tag: m.panorama_synthetic_sky_tag(), body: m.panorama_synthetic_sky_body() };
      case 'synthetic_nadir':
        return { tag: m.panorama_synthetic_nadir_tag(), body: m.panorama_synthetic_nadir_body() };
      case 'no_data':
        return { tag: m.panorama_no_data_tag(), body: m.panorama_no_data_body() };
      case 'unphotographed':
        return {
          tag: m.panorama_unphotographed_tag(),
          body: m.panorama_unphotographed_body(),
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
