<script lang="ts">
  /**
   * Insolation / Goldilocks readout (#386 diagram G) — the "Sun is life"
   * panel. How much sunlight this world gets vs Earth (solar flux ∝ 1/d²),
   * and whether its air keeps the heat. The Moon's punchline: it gets
   * Earth-level sunlight (1.0×) but keeps none — no air.
   *
   * Self-gates on the `climate` science-lens layer. Bottom-centre, hidden
   * on phones (<601px) like the Tactical Scan. Decorative → aria-hidden.
   */
  import { onMount } from 'svelte';
  import { onLayerChange } from '$lib/science-layers';
  import {
    PLANET_STATS,
    SURFACE_BODY_KINEMATICS,
    LIGHT_MINUTES_PER_AU,
  } from '$lib/physics/util/planet-stats';
  import { BODY_PALETTE } from '$lib/body-palette';
  import * as m from '$lib/paraglide/messages';

  let { bodyKey, inline = false }: { bodyKey: string; inline?: boolean } = $props();

  let on = $state(false);
  onMount(() => {
    const stop = onLayerChange('climate', (v) => (on = v));
    return () => stop?.();
  });

  const stats = $derived(PLANET_STATS[bodyKey] ?? null);
  const kin = $derived(SURFACE_BODY_KINEMATICS[bodyKey as 'moon' | 'mars' | 'earth'] ?? null);
  const flux = $derived(
    kin ? Math.round(1361 / Math.pow(kin.lightTime.fromSunMin / LIGHT_MINUTES_PER_AU, 2)) : 0,
  );
  const ratio = $derived((flux / 1361).toFixed(2));
  const retention = $derived(
    !stats
      ? ''
      : stats.atmoBar >= 0.5
        ? m.climate_retain_kept()
        : stats.atmoBar > 0
          ? m.climate_retain_thin()
          : m.climate_retain_none(),
  );
  const accent = $derived(BODY_PALETTE[bodyKey]?.bright ?? '#7fe0ff');
</script>

{#if (inline || on) && stats && kin}
  <div class="climate-readout" class:inline aria-hidden="true" style="--accent:{accent}">
    <div class="cr-flux">
      <span class="cr-sun">☀</span>
      {m.climate_sun_line({ flux: flux.toLocaleString(), ratio })}
    </div>
    <div class="cr-retain">{retention}</div>
  </div>
{/if}

<style>
  .climate-readout {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    padding: 7px 14px;
    text-align: center;
    background: rgba(8, 10, 22, 0.72);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    display: none;
  }
  .cr-flux {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.92);
  }
  .cr-sun {
    color: var(--accent);
    margin-right: 2px;
  }
  .cr-retain {
    margin-top: 3px;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.6);
  }
  @media (min-width: 601px) {
    .climate-readout {
      display: block;
    }
  }
  /* Inline mode (mobile drawer): static, always shown, no floating chrome. */
  .climate-readout.inline {
    display: block;
    position: static;
    left: auto;
    bottom: auto;
    transform: none;
    width: 100%;
    padding: 0;
    background: transparent;
    border: 0;
    backdrop-filter: none;
    text-align: left;
  }
</style>
