<!--
  ScaleIndex (UXD-017) — the INDEX of one /explore scale: a searchable, keyboard-reachable list of
  every selectable object of that scale's scene. It is the DOM mirror of the canvas (TA.md "Canvas
  object indexes"): the keyboard / screen-reader / TV way in, and selecting a row does exactly what
  a canvas click does (no camera move, no new URL). Roving list: one Tab stop, ↑↓ / D-pad move,
  Enter selects. The page owns which rows exist and what a select does; this component owns the
  query, the filter chip and the list.

  /explore mounts one instance per scale, hidden while closed or while another scale is on screen.
  A row whose object has an entity page carries a real link to it (ADR-096 items 11, 13, 16). Before
  hydration only those rows are in the HTML, as plain link rows, so the prerendered page links every
  entity page and holds no dead button; once hydrated every row is a button, with the ↗ link beside
  it where a page exists. The look is src/lib/styles/index-panel.css.
-->
<script module lang="ts">
  import * as m from '$lib/paraglide/messages';
  import type { ShellId } from '$lib/explore/scale-shell-controller';
  import type { IndexBadge, IndexFilterId } from '$lib/explore/scale-index';

  const ARIA: Record<ShellId, () => string> = {
    'solar-system': m.explore_body_index_aria,
    neighborhood: m.explore_index_aria_neighborhood,
    'milky-way': m.explore_index_aria_milky_way,
    'local-group': m.explore_index_aria_local_group,
    'local-sheet': m.explore_index_aria_local_sheet,
    virgo: m.explore_index_aria_virgo,
    laniakea: m.explore_index_aria_laniakea,
    'cosmic-web': m.explore_index_aria_cosmic_web,
  };

  /** What the INDEX of a scale is called: the handle's and the panel's accessible name. */
  export function indexAriaLabel(scale: ShellId): string {
    return ARIA[scale]();
  }

  const KIND_LABELS: Record<string, () => string> = {
    'bh:supermassive': m.explore_bh_kind_supermassive,
    'bh:stellar': m.explore_bh_kind_stellar,
    'bh:fictional': m.explore_bh_kind_fictional,
    'solar:dwarf': m.explore_tt_kind_dwarf,
    'solar:comet': m.explore_tt_kind_comet,
    'solar:interstellar': m.explore_tt_kind_interstellar,
    'ds:galaxy': m.explore_ds_cat_galaxy,
    'ds:galaxy-cluster': m.explore_ds_cat_galaxy_cluster,
    'ds:nebula': m.explore_ds_cat_nebula,
    'ds:planetary-nebula': m.explore_ds_cat_planetary_nebula,
    'ds:supernova-remnant': m.explore_ds_cat_supernova_remnant,
    'ds:star-forming-region': m.explore_ds_cat_star_forming_region,
    'ds:dark-nebula': m.explore_ds_cat_dark_nebula,
    'ds:star-cluster': m.explore_ds_cat_star_cluster,
    'ds:globular-cluster': m.explore_ds_cat_globular_cluster,
    'ds:star': m.explore_ds_cat_star,
    'ds:other': m.explore_ds_cat_other,
    'mw:star': m.explore_mw_kind_star,
    'mw:globular-cluster': m.explore_mw_kind_globular,
    'mw:satellite-galaxy': m.explore_mw_kind_satellite,
    'mw:spiral-arm': m.explore_mw_kind_arm,
    'lg:spiral': m.explore_lg_kind_spiral,
    'lg:irregular': m.explore_lg_kind_irregular,
    'lg:dwarf-elliptical': m.explore_lg_kind_dwarf_elliptical,
    'lg:dwarf-spheroidal': m.explore_lg_kind_dwarf_spheroidal,
    'lg:dwarf-irregular': m.explore_lg_kind_dwarf_irregular,
    'ls:group': m.explore_ls_kind_group,
    'ls:cloud': m.explore_ls_kind_cloud,
    'virgo:group': m.explore_virgo_kind_group,
    'virgo:cloud': m.explore_virgo_kind_cloud,
    'virgo:cluster': m.explore_virgo_kind_cluster,
    'laniakea:supercluster': m.explore_laniakea_kind_supercluster,
    'laniakea:cluster': m.explore_laniakea_kind_cluster,
    'laniakea:attractor': m.explore_laniakea_kind_attractor,
    'cosmic-web:supercluster': m.explore_cosmic_web_kind_supercluster,
    'cosmic-web:wall': m.explore_cosmic_web_kind_wall,
    'cosmic-web:void': m.explore_cosmic_web_kind_void,
    'cosmic-web:concentration': m.explore_cosmic_web_kind_concentration,
  };

  const KIND_SCOPE: Record<ShellId, string> = {
    'solar-system': 'solar',
    neighborhood: 'ds',
    'milky-way': 'mw',
    'local-group': 'lg',
    'local-sheet': 'ls',
    virgo: 'virgo',
    laniakea: 'laniakea',
    'cosmic-web': 'cosmic-web',
  };

  const SECTION_LABELS: Record<string, () => string> = {
    stars: m.explore_index_section_stars,
    'deep-sky': m.explore_index_section_deep_sky,
    planets: m.explore_index_section_planets,
    'small-bodies': m.explore_index_section_small_bodies,
    moons: m.explore_index_section_moons,
    belts: m.explore_index_section_belts,
    objects: m.explore_index_section_objects,
    globulars: m.explore_index_section_globulars,
    satellites: m.explore_index_section_satellites,
    arms: m.explore_index_section_arms,
    'black-holes': m.star_index_black_holes,
    fiction: m.explore_index_section_fiction,
  };

  const FILTER_LABELS: Record<IndexFilterId, () => string> = {
    system: m.star_index_filter_planets,
    culture: m.star_index_filter_culture,
    'deep-sky': m.explore_index_section_deep_sky,
    headliner: m.explore_index_filter_headliner,
    planet: m.ui_layer_planets,
    dwarf: m.ui_layer_dwarfs,
    comet: m.ui_layer_comets,
    globular: m.explore_mw_kind_globular,
    satellite: m.explore_mw_kind_satellite,
    arm: m.explore_mw_kind_arm,
    'black-hole': m.star_index_black_holes,
    spiral: m.explore_lg_kind_spiral,
    irregular: m.explore_lg_kind_irregular,
    'dwarf-galaxy': m.explore_index_filter_dwarf_galaxies,
    group: m.explore_virgo_kind_group,
    cloud: m.explore_virgo_kind_cloud,
    cluster: m.explore_virgo_kind_cluster,
    supercluster: m.explore_laniakea_kind_supercluster,
    attractor: m.explore_laniakea_kind_attractor,
    wall: m.explore_cosmic_web_kind_wall,
    void: m.explore_cosmic_web_kind_void,
    concentration: m.explore_cosmic_web_kind_concentration,
  };

  const BADGES: Record<IndexBadge, { glyph: string; title: () => string }> = {
    system: { glyph: '⊕', title: m.star_index_planetary_system },
    culture: { glyph: '◈', title: m.star_index_culture_door },
    headliner: { glyph: '★', title: m.explore_index_filter_headliner },
    'black-hole': { glyph: '●', title: m.star_index_black_holes },
  };

  /** A chip carries the glyph of the badge it filters on. */
  const FILTER_GLYPH: Partial<Record<IndexFilterId, string>> = {
    system: '⊕',
    culture: '◈',
    headliner: '★',
    'black-hole': '●',
  };
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { roving } from '$lib/a11y/roving';
  import { localHref } from '$lib/locale';
  import {
    FILTER_TESTS,
    SCALE_FILTERS,
    filterRows,
    groupBySection,
    type ScaleIndexRow,
  } from '$lib/explore/scale-index';
  import '$lib/styles/index-panel.css';
  import Chip from './Chip.svelte';
  import ChipGroup from './ChipGroup.svelte';

  type Props = {
    scale: ShellId;
    rows: ScaleIndexRow[];
    open: boolean;
    selectedId: string | null;
    onSelect: (row: ScaleIndexRow) => void;
    onClose: () => void;
  };
  let { scale, rows, open, selectedId, onSelect, onClose }: Props = $props();

  let query = $state('');
  let filter = $state<IndexFilterId | null>(null);
  // The server HTML holds only the rows with a page, as link rows; the buttons come with hydration.
  let hydrated = $state(false);
  onMount(() => {
    hydrated = true;
  });

  const shown = $derived(hydrated ? rows : rows.filter((r) => r.href));
  const kindLabel = (r: ScaleIndexRow): string =>
    r.badges?.includes('black-hole')
      ? (KIND_LABELS[`bh:${r.kind}`]?.() ?? '')
      : (KIND_LABELS[`${KIND_SCOPE[scale]}:${r.kind}`]?.() ?? '');
  // Local Group members say which galaxy they belong to, as LocalGroupPanel's group line does.
  const lgGroup = (r: ScaleIndexRow): string => {
    if (r.id === 'milky-way') return m.explore_lg_group_self();
    if (r.id === r.parent) return m.explore_lg_group_anchor();
    if (r.parent === 'milky-way') return m.explore_lg_group_mw();
    if (r.parent === 'andromeda') return m.explore_lg_group_andromeda();
    return m.explore_lg_group_independent();
  };
  const metaOf = (r: ScaleIndexRow): string =>
    r.meta ?? (scale === 'local-group' ? lgGroup(r) : kindLabel(r));
  const filtered = $derived(filterRows(shown, filter, query, metaOf));
  const groups = $derived(groupBySection(filtered));
  const filterIds = $derived(SCALE_FILTERS[scale].filter((id) => shown.some(FILTER_TESTS[id])));
  const pageHref = (r: ScaleIndexRow) => (r.href ? localHref(r.href) : undefined);

  // Starts just under the HUD chip row, which wraps on narrow windows (nothing on touch: HUD hidden).
  let indexTopPx = $state<number | null>(null);
  $effect(() => {
    if (!open) return;
    const hud = document.querySelector('.hud-controls');
    if (!hud) {
      indexTopPx = null;
      return;
    }
    const measure = () => {
      const r = hud.getBoundingClientRect();
      indexTopPx = r.width && r.height ? Math.round(r.bottom + 8) : null;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hud);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  });
</script>

{#if hydrated || shown.length > 0}
  <aside
    class="scale-index"
    data-scale={scale}
    hidden={!open}
    style:--index-top={indexTopPx != null ? `${indexTopPx}px` : undefined}
    aria-label={indexAriaLabel(scale)}
  >
    <div class="si-top">
      <input
        bind:value={query}
        type="search"
        class="si-input"
        placeholder={m.surface_index_search()}
        aria-label={m.surface_index_search()}
        data-testid="scale-index-search"
      />
      <Chip
        kind="action"
        class="si-close ui-chip--close"
        aria-label={m.star_index_close()}
        onclick={onClose}>×</Chip
      >
    </div>
    {#if filterIds.length > 0}
      <ChipGroup class="si-filter-row" role="radiogroup" label={m.explore_index_filter_aria()}>
        <Chip kind="choice" active={filter === null} onclick={() => (filter = null)}
          >{m.star_index_filter_all()}</Chip
        >
        {#each filterIds as id (id)}
          <Chip kind="choice" active={filter === id} onclick={() => (filter = id)}
            >{FILTER_GLYPH[id] ? `${FILTER_GLYPH[id]} ` : ''}{FILTER_LABELS[id]()}</Chip
          >
        {/each}
      </ChipGroup>
    {/if}
    <div class="si-count">{filtered.length} / {shown.length}</div>
    <ul
      class="si-list"
      use:roving={{
        orientation: 'vertical',
        wrap: true,
        itemSelector: 'button.si-row, a.si-row, a.si-page',
        active: open,
      }}
    >
      {#each groups as group (group.section ?? '')}
        {#if group.section}
          <li class="si-section">{SECTION_LABELS[group.section]()}</li>
        {/if}
        {#each group.rows as row (row.id)}
          <li class="si-item">
            {#if hydrated}
              <button
                type="button"
                class="si-row"
                class:selected={row.id === selectedId}
                class:si-row--fiction={row.kind === 'fictional'}
                data-index-id={row.id}
                aria-current={row.id === selectedId ? 'true' : undefined}
                disabled={!row.selectable}
                title={row.kind === 'fictional' ? m.bh_fiction_badge() : undefined}
                onclick={() => onSelect(row)}
              >
                <span class="si-lead" aria-hidden="true">
                  {#if row.color || scale === 'solar-system'}<span
                      class="si-dot"
                      style:background={row.color}
                    ></span>{/if}
                  {#each row.badges ?? [] as badge (badge)}<span
                      class="si-badge--{badge}"
                      title={BADGES[badge].title()}>{BADGES[badge].glyph}</span
                    >{/each}
                </span>
                <span class="si-name">{row.name}</span>
                {#if metaOf(row)}<span class="si-meta">{metaOf(row)}</span>{/if}
              </button>
              {#if row.href}
                <a
                  class="si-page"
                  href={pageHref(row)}
                  title={m.surface_index_open_page()}
                  aria-label="{m.surface_index_open_page()}: {row.name}"
                  data-testid="scale-index-page-link"
                  data-index-id={row.id}>↗</a
                >
              {/if}
            {:else}
              <a
                class="si-row"
                href={pageHref(row)}
                data-testid="scale-index-page-link"
                data-index-id={row.id}><span class="si-name">{row.name}</span></a
              >
            {/if}
          </li>
        {/each}
      {/each}
      {#if filtered.length === 0}
        <li class="si-empty">{m.explore_index_no_match({ query })}</li>
      {/if}
    </ul>
  </aside>
{/if}
