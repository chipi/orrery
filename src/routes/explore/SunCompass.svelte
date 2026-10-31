<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let { ang, ly }: { ang: number; ly: number } = $props();
</script>

<div class="sun-compass" title={m.explore_hr_sun()}>
  <div class="sc-dial">
    <span class="sc-needle" style:transform="translate(-50%, -100%) rotate({90 - ang}deg)"></span>
    <span class="sc-core">☉</span>
  </div>
  <span class="sc-ly"
    >{m.unit_ly_value({ value: ly.toFixed(ly < 10 ? 1 : 0) })} · {m.explore_compass_sun()}</span
  >
</div>

<style>
  /* v2 neighborhood layer toggles — bottom-left (solar chrome is hidden here). */
  .sun-compass {
    position: absolute;
    bottom: 62px;
    left: 14px;
    z-index: 6;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    pointer-events: none;
    user-select: none;
  }
  .sc-dial {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 1px solid rgba(255, 207, 143, 0.35);
    background: radial-gradient(circle, rgba(10, 14, 26, 0.5), rgba(6, 10, 22, 0.3));
    backdrop-filter: blur(4px);
  }
  .sc-needle {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 19px solid #ffcf8f;
    transform-origin: 50% 100%;
    filter: drop-shadow(0 0 3px rgba(255, 207, 143, 0.6));
    transition: transform 0.18s linear;
  }
  .sc-core {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #ffcf8f;
    text-shadow: 0 0 6px rgba(255, 207, 143, 0.7);
  }
  .sc-ly {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 224, 190, 0.82);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }
</style>
