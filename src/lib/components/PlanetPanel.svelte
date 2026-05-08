<script lang="ts">
  import Panel from './Panel.svelte';
  import { getPlanetGallery } from '$lib/data';
  import type { LocalizedPlanet } from '$types/planet';
  import * as m from '$lib/paraglide/messages';
  import ImageCredit from './ImageCredit.svelte';
  import LearnLink from './LearnLink.svelte';
  import ScienceChip from './ScienceChip.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import type { ScienceTabId } from '$types/science';

  // LEARN folds into SCIENCE (Phase 4 cleanup) — one tab destination, less
  // strip crowding. Tiered link list renders below the curated ScienceCards.
  type Tab = 'overview' | 'gallery' | 'technical' | 'science';

  // Curated /science cross-section list — the Keplerian-mechanics core.
  // Same for every planet; the user's planet-specific values live on the
  // TECHNICAL tab and the cards here unpack what those values mean.
  const PLANET_SCIENCE_SECTIONS: { tab: ScienceTabId; section: string }[] = [
    { tab: 'orbits', section: 'keplerian-orbit' },
    { tab: 'orbits', section: 'semi-major-axis' },
    { tab: 'orbits', section: 'eccentricity' },
    { tab: 'orbits', section: 'inclination' },
    { tab: 'orbits', section: 'apsides' },
    { tab: 'orbits', section: 'vis-viva' },
    { tab: 'orbits', section: 'keplers-laws' },
  ];

  type Props = {
    planet: LocalizedPlanet | null;
    open: boolean;
    onClose: () => void;
    onPlanMission?: () => void;
  };
  let { planet, open, onClose, onPlanMission }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let lightboxSrc = $state<string | null>(null);

  // Reset to overview + reload gallery each time a different planet is selected.
  let lastId = $state<string | null>(null);
  $effect(() => {
    if (planet && planet.id !== lastId) {
      tab = 'overview';
      lastId = planet.id;
      lightboxSrc = null;
      gallery = [];
      void getPlanetGallery(planet.id).then((urls) => {
        if (planet && planet.id === lastId) gallery = urls;
      });
    }
  });

  // Group LEARN-tab links by tier (intro/core/deep).
  let linksByTier = $derived.by(() => {
    if (!planet?.links) return { intro: [], core: [], deep: [] };
    const out = {
      intro: [] as NonNullable<typeof planet.links>,
      core: [] as NonNullable<typeof planet.links>,
      deep: [] as NonNullable<typeof planet.links>,
    };
    for (const link of planet.links) out[link.t].push(link);
    return out;
  });
  let hasLinks = $derived((planet?.links?.length ?? 0) > 0);

  // ─── Derived technical figures (canonical, IAU-grounded) ─────────
  // mu_sun ≈ 4π² in AU³/yr², AU/yr → km/s = 4.7404 (IAU 2012).
  const MU_SUN = 4 * Math.PI ** 2;
  const AUPYR_TO_KMS = 4.7404;
  const AU_TO_MKM = 149.5978707;

  let perihelion = $derived(planet ? planet.a * (1 - planet.e) : 0);
  let aphelion = $derived(planet ? planet.a * (1 + planet.e) : 0);
  let meanVelKms = $derived(
    planet ? Math.sqrt(MU_SUN * (2 / planet.a - 1 / planet.a)) * AUPYR_TO_KMS : 0,
  );
  let speedRatio = $derived(planet ? (1 + planet.e) / (1 - planet.e) : 1);
  let orbitShape = $derived(
    !planet
      ? ''
      : planet.e < 0.05
        ? m.panel_orbit_shape_circular()
        : planet.e < 0.1
          ? m.panel_orbit_shape_slightly()
          : planet.e < 0.2
            ? m.panel_orbit_shape_notably()
            : m.panel_orbit_shape_highly(),
  );
  let mkmFromSun = $derived(planet ? planet.a * AU_TO_MKM : 0);
  let auLabel = $derived(planet ? `${planet.a.toFixed(2)} AU` : '');
  let periodLabel = $derived(
    !planet
      ? ''
      : planet.T < 365.25 * 1.5
        ? `${planet.T.toFixed(1)} days`
        : `${(planet.T / 365.25).toFixed(1)} yrs`,
  );
</script>

<Panel {open} {onClose} title={planet?.name ?? ''}>
  {#if planet}
    <div class="head">
      <div class="type">{planet.type.toUpperCase()}</div>
      <div class="name">{planet.name}</div>
      <div class="stat-row">
        <div class="stat">
          <div class="stat-label">{m.panel_label_from_sun()}</div>
          <div class="stat-value">{auLabel}</div>
        </div>
        <div class="stat">
          <div class="stat-label">{m.panel_label_orbital_period()}</div>
          <div class="stat-value">{periodLabel}</div>
        </div>
      </div>
    </div>

    {#if gallery.length > 0}
      <div class="panel-hero">
        <button
          type="button"
          class="panel-hero-btn"
          onclick={() => (lightboxSrc = gallery[0]!)}
          aria-label={m.panel_hero_aria({ name: planet.name })}
        >
          <img src={gallery[0]} alt="" fetchpriority="high" decoding="async" />
        </button>
      </div>
    {/if}

    <div class="tabs" role="tablist">
      <button
        type="button"
        id="pp-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="pp-tabpanel">{m.panel_tab_overview()}</button
      >
      {#if gallery.length > 0}
        <button
          type="button"
          id="pp-tab-gallery"
          class:active={tab === 'gallery'}
          onclick={() => (tab = 'gallery')}
          role="tab"
          aria-selected={tab === 'gallery'}
          aria-controls="pp-tabpanel">{m.panel_tab_gallery()}</button
        >
      {/if}
      <button
        type="button"
        id="pp-tab-technical"
        class:active={tab === 'technical'}
        onclick={() => (tab = 'technical')}
        role="tab"
        aria-selected={tab === 'technical'}
        aria-controls="pp-tabpanel">{m.panel_tab_technical()}</button
      >
      <button
        type="button"
        id="pp-tab-science"
        class:active={tab === 'science'}
        onclick={() => (tab = 'science')}
        role="tab"
        aria-selected={tab === 'science'}
        aria-controls="pp-tabpanel">SCIENCE</button
      >
    </div>

    <div class="tab-content" role="tabpanel" id="pp-tabpanel" aria-labelledby="pp-tab-{tab}">
      {#if tab === 'overview'}
        <p class="editorial">{planet.fact}</p>
        <p class="editorial">{planet.bio}</p>
      {:else if tab === 'technical'}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_semi_major_axis()}<ScienceChip
                tab="orbits"
                section="semi-major-axis"
                label={m.chip_label_semi_major_axis()}
              />
            </div>
            <div class="cell-value">{planet.a.toFixed(4)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_orbital_period()}</div>
            <div class="cell-value">{planet.T.toFixed(1)} days</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_eccentricity()}<ScienceChip
                tab="orbits"
                section="eccentricity"
                label={m.chip_label_eccentricity()}
              />
            </div>
            <div class="cell-value">e = {planet.e.toFixed(4)}</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_inclination()}<ScienceChip
                tab="orbits"
                section="inclination"
                label={m.chip_label_inclination()}
              />
            </div>
            <div class="cell-value teal">{planet.incl.toFixed(2)}°</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_perihelion()}<ScienceChip
                tab="orbits"
                section="apsides"
                label={m.chip_label_apsides_perihelion()}
              />
            </div>
            <div class="cell-value">{perihelion.toFixed(4)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_aphelion()}<ScienceChip
                tab="orbits"
                section="apsides"
                label={m.chip_label_apsides_aphelion()}
              />
            </div>
            <div class="cell-value">{aphelion.toFixed(4)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_axial_tilt()}</div>
            <div class="cell-value" class:gold={planet.axialTilt > 10}>
              {planet.axialTilt.toFixed(2)}°
            </div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.panel_label_mean_velocity()}</div>
            <div class="cell-value">{meanVelKms.toFixed(2)} km/s</div>
          </div>
        </div>

        <div class="shape-row">
          <div class="shape-meta">
            {m.panel_orbit_shape_meta({ e: planet.e.toFixed(3), ratio: speedRatio.toFixed(2) })}
          </div>
          <div class="shape-display">
            <div
              class="shape-ellipse"
              style:--shape-w="{Math.max(50, 70 - Math.round(planet.e * 180))}px"
            ></div>
            <span>{orbitShape}</span>
          </div>
        </div>

        <div class="dist-row">
          <span>
            {m.panel_dist_row({
              mkm: mkmFromSun.toFixed(0),
              rot: planet.rotPeriod.toFixed(2),
            })}
          </span>
        </div>

        <div class="src">{m.panel_source_iau()}</div>
      {:else if tab === 'science'}
        <div class="science-tab">
          <p class="science-blurb">
            The orbital mechanics that move {planet.name} around the Sun. Every number on the TECHNICAL
            tab is one of these concepts.
          </p>
          {#each PLANET_SCIENCE_SECTIONS as { tab: t, section } (t + section)}
            <ScienceCard tab={t} {section} />
          {/each}
          {#if hasLinks}
            <div class="science-library">
              <h3 class="library-heading">{m.panel_tab_learn()}</h3>
              {#if linksByTier.intro.length > 0}
                <section class="link-tier tier-intro">
                  <h3>{m.panel_links_intro()}</h3>
                  <ul>
                    {#each linksByTier.intro as link (link.u)}
                      <li><LearnLink entityId={planet.id} url={link.u} label={link.l} /></li>
                    {/each}
                  </ul>
                </section>
              {/if}
              {#if linksByTier.core.length > 0}
                <section class="link-tier tier-core">
                  <h3>{m.panel_links_core()}</h3>
                  <ul>
                    {#each linksByTier.core as link (link.u)}
                      <li><LearnLink entityId={planet.id} url={link.u} label={link.l} /></li>
                    {/each}
                  </ul>
                </section>
              {/if}
              {#if linksByTier.deep.length > 0}
                <section class="link-tier tier-deep">
                  <h3>{m.panel_links_deep()}</h3>
                  <ul>
                    {#each linksByTier.deep as link (link.u)}
                      <li><LearnLink entityId={planet.id} url={link.u} label={link.l} /></li>
                    {/each}
                  </ul>
                </section>
              {/if}
            </div>
          {/if}
        </div>
      {:else if tab === 'gallery'}
        {#if gallery.length === 0}
          <p class="empty-tab">{m.panel_gallery_empty()}</p>
        {:else}
          <div class="gallery-grid" aria-label={m.panel_gallery_aria({ name: planet.name })}>
            {#each galleryGrid as src (src)}
              <button
                type="button"
                class="gallery-thumb"
                onclick={() => (lightboxSrc = src)}
                aria-label={planet.name}
              >
                <img {src} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">{m.panel_gallery_credit()}</p>
        {/if}
      {/if}
    </div>

    {#if lightboxSrc}
      <button
        type="button"
        class="lightbox"
        aria-label={m.panel_lightbox_close()}
        onclick={() => (lightboxSrc = null)}
      >
        <img src={lightboxSrc} alt="" />
        <span class="lightbox-close" aria-hidden="true">×</span>
      </button>
      <div class="lightbox-meta">
        <ImageCredit src={lightboxSrc} />
      </div>
    {/if}

    {#if planet.missionable && onPlanMission}
      <div class="cta-bar">
        <button type="button" class="cta" onclick={onPlanMission}>
          {m.panel_plan_mission_cta({ name: planet.name.toUpperCase() })}
        </button>
      </div>
    {/if}
  {/if}
</Panel>

<style>
  .head {
    padding: 0 0 12px 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .type {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 4px;
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
  }
  .stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-top: 12px;
  }
  .stat {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .stat-label,
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .stat-value,
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .cell-value.teal {
    color: #4ecdc4;
  }
  .cell-value.gold {
    color: #ffc850;
  }

  /* .tabs / .tab-content moved to src/lib/styles/panel-tabs.css (v0.1.10) */

  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 12px 0;
  }
  .science-tab {
    padding-top: 4px;
  }
  .science-blurb {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 14px;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 12px;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }

  .shape-row {
    margin-bottom: 12px;
    padding: 10px 11px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  .shape-meta {
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.22);
    margin-bottom: 6px;
  }
  .shape-display {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.4);
  }
  .shape-ellipse {
    width: var(--shape-w, 70px);
    height: 26px;
    border: 1.5px solid #4466ff;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dist-row {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.35);
    margin-bottom: 10px;
  }

  .src {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.15);
    line-height: 1.8;
  }

  .cta-bar {
    padding: 12px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    margin-top: 12px;
  }
  .cta {
    width: 100%;
    min-height: 44px;
    padding: 12px;
    background: #1a33bb;
    border: 1px solid rgba(68, 102, 255, 0.55);
    border-radius: 4px;
    cursor: pointer;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    font-weight: 700;
    transition:
      background 120ms,
      border-color 120ms;
  }
  .cta:hover,
  .cta:focus-visible {
    background: #2244dd;
    border-color: #4466ff;
    outline: none;
  }

  /* GALLERY + LEARN tab CSS moved to src/lib/styles/panel-tabs.css (v0.1.10) */
</style>
