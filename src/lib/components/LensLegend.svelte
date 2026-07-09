<script lang="ts">
  /**
   * Lens legend (#386 follow-up) — a contextual visual key for the
   * Science Lens. Whatever layers are ON, it shows the swatches / glyphs
   * that appear on the globe and what each means, matching the exact
   * colours the builders use. Auto-updates as layers toggle.
   *
   * Copy is English, consistent with the Science Lens panel (whose
   * labels are also hardcoded English today; full i18n of the lens
   * system is a separate en-US-first task).
   *
   * Decorative → aria-hidden. Hidden on phones (<601px) like the rest of
   * the surface HUD.
   */
  import { onMount } from 'svelte';
  import { onLayerChange } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages';

  let { bodyKey, inline = false }: { bodyKey: string; inline?: boolean } = $props();

  type Shape = 'swatch' | 'ring' | 'dot' | 'cap' | 'note';
  interface Item {
    shape: Shape;
    color?: string;
    label: string;
  }
  interface Entry {
    title: string;
    items: Item[];
  }

  // Mirrors the on-globe colours in surface-climate-layers.ts.
  const CLIMATE_COLORS: Record<string, { trop: string; temp: string; polar: string } | null> = {
    earth: { trop: '#2e8b57', temp: '#4a90a4', polar: '#dfeeff' },
    mars: { trop: '#b0673c', temp: '#8390a6', polar: '#e6eefb' },
    moon: null,
  };

  function entryFor(key: string): Entry | null {
    if (key === 'climate') {
      const c = CLIMATE_COLORS[bodyKey];
      if (!c)
        return {
          title: m.lens_legend_climate_title(),
          items: [{ shape: 'note', label: m.lens_legend_climate_none() }],
        };
      return {
        title: m.lens_legend_climate_title(),
        items: [
          { shape: 'swatch', color: c.trop, label: m.lens_legend_zone_tropical() },
          { shape: 'swatch', color: c.temp, label: m.lens_legend_zone_temperate() },
          { shape: 'swatch', color: c.polar, label: m.lens_legend_zone_polar() },
          { shape: 'ring', color: c.polar, label: m.lens_legend_circles() },
        ],
      };
    }
    if (key === 'sub-solar')
      return {
        title: m.lens_legend_subsolar_title(),
        items: [
          { shape: 'dot', color: '#fff2b0', label: m.lens_legend_subsolar_point() },
          { shape: 'ring', color: '#fff2b0', label: m.lens_legend_terminator() },
          { shape: 'note', label: m.lens_legend_subsolar_note() },
        ],
      };
    if (key === 'polar-caps')
      return {
        title: m.lens_legend_polarcaps_title(),
        items: [{ shape: 'cap', color: '#eaf3ff', label: m.lens_legend_polarcaps_item() }],
      };
    return null;
  }

  const KEYS = ['climate', 'sub-solar', 'polar-caps'] as const;
  let active = $state<Record<string, boolean>>({
    climate: false,
    'sub-solar': false,
    'polar-caps': false,
  });

  onMount(() => {
    const stops = KEYS.map((k) => onLayerChange(k, (on) => (active[k] = on)));
    return () => stops.forEach((s) => s?.());
  });

  const entries = $derived(
    KEYS.map((k) => (active[k] ? entryFor(k) : null)).filter((e): e is Entry => e !== null),
  );
</script>

{#if entries.length > 0}
  <div class="lens-legend" class:inline aria-hidden="true">
    <div class="ll-head">{m.lens_legend_head()}</div>
    {#each entries as e (e.title)}
      <div class="ll-group">
        <div class="ll-title">{e.title}</div>
        {#each e.items as it (it.label)}
          <div class="ll-item">
            {#if it.shape === 'note'}
              <span class="ll-glyph ll-note-dot"></span>
            {:else}
              <span class="ll-glyph ll-{it.shape}" style="--c:{it.color}"></span>
            {/if}
            <span class="ll-label" class:ll-note={it.shape === 'note'}>{it.label}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  .lens-legend {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    right: 12px;
    z-index: 20;
    max-width: 230px;
    padding: 8px 11px;
    background: rgba(8, 10, 22, 0.74);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: none;
    font-family: 'Space Mono', monospace;
    display: none;
  }
  .ll-head {
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 6px;
  }
  .ll-group + .ll-group {
    margin-top: 7px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .ll-title {
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .ll-item {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 1px 0;
  }
  .ll-glyph {
    flex: 0 0 auto;
    width: 11px;
    height: 11px;
  }
  .ll-swatch {
    background: var(--c);
    border-radius: 2px;
  }
  .ll-ring {
    border: 1.5px solid var(--c);
    border-radius: 50%;
    background: transparent;
  }
  .ll-dot {
    background: var(--c);
    border-radius: 50%;
    box-shadow: 0 0 5px var(--c);
  }
  .ll-cap {
    background: var(--c);
    border-radius: 50% 50% 3px 3px;
  }
  .ll-note-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    margin: 0 4px;
  }
  .ll-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.15;
  }
  .ll-note {
    font-style: italic;
    color: rgba(255, 255, 255, 0.5);
  }
  @media (min-width: 601px) {
    .lens-legend {
      display: block;
    }
  }
  /* Inline mode (mobile drawer): static, no floating chrome. */
  .lens-legend.inline {
    display: block;
    position: static;
    top: auto;
    right: auto;
    max-width: none;
    width: 100%;
    padding: 0;
    background: transparent;
    border: 0;
    backdrop-filter: none;
  }
</style>
