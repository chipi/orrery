<!--
  Compass rose HUD for Tier-3 panorama view (PRD-022 / ADR-074, #286).

  Top-right circular dial with N/E/S/W markers. The agency-gold
  N-arrow rotates with the inverse of camera yaw so it points to the
  panorama's declared "north" (the panorama's 0° yaw direction, named
  per-site in `panorama_metadata.compass_zero_direction`).

  When the site has no `compass_zero_direction` declared, the N-arrow
  is hidden (no false orientation claim) — only the cardinal labels
  show as a generic "you're looking ↺ this way from start" indicator.

  Updated per-frame from SurfaceScene's animate() loop via the
  `yawDeg` prop. Cheap — a CSS transform + a `aria-label` update.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    active: boolean;
    /** Camera yaw in degrees, 0 = panorama's 0° direction. */
    yawDeg: number;
    /**
     * Human-readable name of the panorama's 0° yaw direction
     * ("rover forward", "LM forward" etc.). When null, the N-arrow
     * is hidden — honest behaviour when we don't know real orientation.
     */
    compassZeroDirection: string | null | undefined;
  }
  let { active, yawDeg, compassZeroDirection }: Props = $props();

  // The N-arrow points to "where 0° yaw is" relative to the camera.
  // If the camera has rotated +30° (looking east of the panorama's
  // forward direction), the N-arrow should be at -30° on the dial.
  let arrowAngle = $derived(-yawDeg);

  // Cardinal-letter visible when the user faces in that direction.
  // Approximate: 0° = N, 90° = E, 180° = S, 270° = W. Used for
  // screen-reader aria-label.
  let facingCardinal = $derived.by(() => {
    const yaw = ((yawDeg % 360) + 360) % 360;
    if (yaw < 22.5 || yaw >= 337.5) return m.panorama_facing_north();
    if (yaw < 67.5) return m.panorama_facing_north_east();
    if (yaw < 112.5) return m.panorama_facing_east();
    if (yaw < 157.5) return m.panorama_facing_south_east();
    if (yaw < 202.5) return m.panorama_facing_south();
    if (yaw < 247.5) return m.panorama_facing_south_west();
    if (yaw < 292.5) return m.panorama_facing_west();
    return m.panorama_facing_north_west();
  });

  let ariaLabel = $derived(
    compassZeroDirection
      ? m.panorama_compass_aria_template({
          cardinal: facingCardinal,
          direction: compassZeroDirection,
        })
      : m.panorama_compass_aria_generic(),
  );
  let titleAttr = $derived(
    compassZeroDirection
      ? m.panorama_compass_title_template({ direction: compassZeroDirection })
      : m.panorama_compass_title_generic(),
  );
</script>

{#if active}
  <div
    class="compass-rose"
    role="img"
    aria-label={ariaLabel}
    data-testid="panorama-compass-rose"
    title={titleAttr}
  >
    <svg width="68" height="68" viewBox="-34 -34 68 68" aria-hidden="true">
      <circle r="30" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.8" />
      <text x="0" y="-22" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.65)">N</text>
      <text x="22" y="3" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.25)">E</text>
      <text x="0" y="26" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.25)">S</text>
      <text x="-22" y="3" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.25)">W</text>
      <!-- The arrow always renders so the compass gives visual
           feedback as the user pans the camera. When the site
           declares a compass_zero_direction (e.g. "rover forward",
           "lander north"), the title/aria-label carries that name
           and the arrow is agency-gold (calibrated). When the site
           has no declared direction (Viking 2, Mars 3 etc.), the
           arrow uses a dimmer neutral colour so the calibration
           distinction is visually honest — the arrow still tracks
           the panorama's 0° yaw, but the user isn't being told
           that direction is "north" without ground truth. -->
      <g style:transform="rotate({arrowAngle}deg)" style:transform-origin="0 0">
        <polygon
          points="0,-18 -4,4 0,1 4,4"
          fill={compassZeroDirection ? '#ffc850' : 'rgba(255,255,255,0.45)'}
        />
      </g>
    </svg>
  </div>
{/if}

<style>
  .compass-rose {
    position: fixed;
    /* Single-row bottom-left panorama-controls layout (#286 audit).
       Compass anchors the left edge of the row. Fullscreen, mission
       cross-link, and caption sit to its right at left: 110px+. The
       exit chip moved out of this row and floats top-left whenever
       the right-side detail panel is hidden. */
    bottom: 24px;
    left: 24px;
    width: 78px;
    height: 78px;
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 60;
    animation: fade-in 200ms ease-out;
    pointer-events: auto;
  }

  /* SVG `text-family` uses the same mono font as the rest of the
     panorama HUD for consistent cardinal letters. */
  .compass-rose svg text {
    font-family: 'Space Mono', 'Courier New', monospace;
    letter-spacing: 0.05em;
  }

  /* Smooth transition when yaw updates per-frame — keeps the arrow
     from jittering between frames at high yaw velocities. 80 ms is
     short enough to feel responsive but long enough to smooth small
     RAF jitter. */
  .compass-rose svg g {
    transition: transform 80ms linear;
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
    .compass-rose {
      animation: none;
    }
    .compass-rose svg g {
      transition: none;
    }
  }
</style>
