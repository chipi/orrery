<script lang="ts">
  import { page } from '$app/state';
  import PanelGalleryGrid from './PanelGalleryGrid.svelte';
  import PanelTabRow from './PanelTabRow.svelte';
  import PanelHeroImage from './PanelHeroImage.svelte';
  import PanelLightbox from './PanelLightbox.svelte';
  import Panel from './Panel.svelte';
  import { getSmallBodyGallery, getSmallBodyI18n, type SmallBodyI18n } from '$lib/data';
  import smallBodiesData from '$data/small-bodies.json';
  import type { CardSpec, SmallBodyLike } from '$lib/cards/card-spec';
  import { loadCardModules, type CardModules } from '$lib/cards/lazy-card';
  import {
    linkifyMission,
    loadMissionIndex,
    onMissionLinkClick,
    sortNewestFirst,
  } from '$lib/missions-linkify';
  import { formatKm } from '$lib/format';
  import type { ScienceSectionRef } from '$types/planet';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import LearnLink from './LearnLink.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import WhyPopover from './WhyPopover.svelte';
  import type { ScienceTabId } from '$types/science';
  import { dataLoadFailed } from '$lib/data/core';

  /** /science cross-sections relevant to small bodies — eccentric, often
   * inclined orbits with extreme apsides. */
  const SMALL_BODY_SCIENCE_SECTIONS: ScienceSectionRef[] = [
    { tab: 'orbits', section: 'keplerian-orbit' },
    { tab: 'orbits', section: 'eccentricity' },
    { tab: 'orbits', section: 'inclination' },
    { tab: 'orbits', section: 'apsides' },
    { tab: 'orbits', section: 'semi-major-axis' },
  ];

  // Mirrors the SmallBody type used in /explore. Kept inline because
  // the data file is the only consumer outside this component.
  type SmallBody = {
    id: string;
    name: string;
    type: 'dwarf' | 'comet' | 'interstellar' | 'asteroid' | 'kbo';
    a: number;
    e: number;
    T: number;
    L0: number;
    incl: number;
    color: string;
    radius_km?: number;
    discovered?: string;
    mission_visited?: string | null;
    /** Spacecraft visits — preferred over mission_visited (singular,
     *  back-compat for /explore). Each entry is a one-line BeltPanel-
     *  style string: "Mission — Agency, year (context)". */
    mission_visits?: string[];
    next_perihelion?: string;
    description?: string;
    wiki?: string;
    note?: string;
    /** Curated learn-more links (same shape as SatelliteEntry.library
     *  + BeltEntry.library). Rendered at the bottom of TECHNICAL via
     *  the LIBRARY section, matching the B2 tab pattern. */
    library?: Array<{
      id: string;
      label: string;
      url: string;
      tier: 'intro' | 'core' | 'deep';
      kind?: string;
    }>;
    /** Per-body curated science-card selection. Falls back to the
     *  panel default SMALL_BODY_SCIENCE_SECTIONS when absent. Overlay
     *  takes precedence; see scienceSections derived. */
    science_sections?: ScienceSectionRef[];
  };

  // LEARN folds into SCIENCE — Phase 4 cleanup, less crowded tab strip.
  // 2026-06-21 — SCIENCE tab removed. Chips → bottom of OVERVIEW;
  // library link(s) → bottom of TECHNICAL. /science/<body> deep page
  // still owns the long-form articles. 4 tabs uniform across detail
  // panels on /explore.
  type Tab = 'overview' | 'gallery' | 'technical' | 'missions';

  type Props = {
    body: SmallBody | null;
    open: boolean;
    onClose: () => void;
    /** A mission link opens the mission in place (the host's mission panel); absent: navigate. */
    onMissionOpen?: (missionId: string) => void;
  };
  let { body, open, onClose, onMissionOpen }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let lightboxSrc = $state<string | null>(null);
  let overlay = $state<SmallBodyI18n | null>(null);
  // Effective science-section list: overlay overrides body.science_sections
  // when present; the panel-default for small-bodies is empty (opt-in
  // per body via overlay or base data).
  let scienceSections = $derived<ScienceSectionRef[]>(
    overlay?.science_sections ?? body?.science_sections ?? SMALL_BODY_SCIENCE_SECTIONS,
  );
  const loc = $derived(localeFromPage(page));

  // #547 S5c — the collectible card. The bundled data file provides the
  // collection list for numbering; the overlay description (translated)
  // feeds the story when loaded.
  let cardOpen = $state(false);
  // The card code loads on demand (lazy-card.ts): fetched when a body opens.
  let cards = $state<CardModules | null>(null);
  $effect(() => {
    if (body && !cards)
      void loadCardModules().then(
        (c) => (cards = c),
        () => {},
      );
  });
  let cardSpec = $derived<CardSpec | null>(
    body && cards
      ? cards.spec.cardForSmallBody(
          { ...body, description: overlay?.description ?? body.description },
          smallBodiesData.bodies as SmallBodyLike[],
          gallery[0],
        )
      : null,
  );

  let lastId = $state<string | null>(null);
  $effect(() => {
    if (body && body.id !== lastId) {
      tab = 'overview';
      lastId = body.id;
      lightboxSrc = null;
      gallery = [];
      overlay = null;
      cardOpen = false;
      void getSmallBodyGallery(body.id)
        .then((urls) => {
          if (body && body.id === lastId) gallery = urls;
        })
        .catch(dataLoadFailed);
      const fetchId = body.id;
      void getSmallBodyI18n(loc, fetchId)
        .then((o) => {
          if (body && body.id === lastId) overlay = o;
        })
        .catch(dataLoadFailed);
      // Warm /missions + /fleet index for the MISSIONS tab linkifier.
      void loadMissionIndex();
    }
  });
  let missionEntries = $derived<string[]>(
    sortNewestFirst(
      body?.mission_visits && body.mission_visits.length > 0
        ? body.mission_visits
        : body?.mission_visited
          ? [body.mission_visited]
          : [],
    ),
  );

  // Period in years (T is days in the data file).
  let periodYears = $derived(body ? body.T / 365.25 : 0);
  // Apsides — perihelion and aphelion distances in AU. For interstellar
  // hyperbolic trajectories, perihelion = |a|(e²-1)/(1+e); no aphelion.
  let perihelion = $derived(
    body
      ? body.type === 'interstellar'
        ? Math.abs(body.a) * (body.e + 1)
        : body.a * (1 - body.e)
      : 0,
  );
  let aphelion = $derived(body ? body.a * (1 + body.e) : 0);

  let typeLabel = $derived(
    !body
      ? ''
      : body.type === 'dwarf'
        ? m.sbp_kind_dwarf()
        : body.type === 'comet'
          ? m.sbp_kind_comet()
          : body.type === 'asteroid'
            ? m.card_kind_asteroid()
            : body.type === 'kbo'
              ? m.card_kind_kbo()
              : m.sbp_kind_interstellar(),
  );
</script>

<Panel
  {open}
  {onClose}
  title={body?.name ?? ''}
  onShare={cardSpec ? () => (cardOpen = true) : undefined}
>
  {#if body}
    <div class="head" style:--accent={body.color}>
      <div class="kind-row">
        <span class="kind">{typeLabel}</span>
      </div>
      <div class="name">{body.name}</div>
    </div>

    <!-- No PanelActions row: a small body has no entity action. Share is in the Panel bar. -->

    {#if gallery.length > 0}
      <PanelHeroImage
        src={gallery[0]}
        name={body.name}
        onOpen={() => (lightboxSrc = gallery[0]!)}
      />
    {/if}

    <PanelTabRow
      idPrefix="sbp"
      tabs={[
        { id: 'overview', label: m.panel_tab_overview() },
        { id: 'gallery', label: m.panel_tab_gallery(), visible: gallery.length > 0 },
        { id: 'technical', label: m.panel_tab_technical() },
        { id: 'missions', label: m.panel_tab_missions(), visible: missionEntries.length > 0 },
      ]}
      bind:active={tab}
    />

    <div class="tab-content" role="tabpanel" id="sbp-tabpanel" aria-labelledby="sbp-tab-{tab}">
      {#if tab === 'overview'}
        {#if overlay?.description ?? body.description}
          <p class="editorial">{overlay?.description ?? body.description}</p>
        {:else}
          <p class="editorial empty">{m.sbp_empty_description()}</p>
        {/if}
        {#if body.note}
          <p class="note">{body.note}</p>
        {/if}
        {#if scienceSections.length > 0}
          <div class="science-section">
            <h3 class="library-heading">{m.panel_tab_science()}</h3>
            {#each scienceSections as sec (sec.tab + sec.section)}
              <ScienceCard tab={sec.tab as ScienceTabId} section={sec.section} why={sec.why} />
            {/each}
          </div>
        {/if}
      {:else if tab === 'technical'}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_semi_major_axis()}<WhyPopover
                title={m.why_semi_major_axis_title()}
                body={m.why_semi_major_axis_body()}
                tab="orbits"
                section="semi-major-axis"
              />
            </div>
            <div class="cell-value">{body.a.toFixed(3)} AU</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_eccentricity()}<WhyPopover
                title={m.why_eccentricity_title()}
                body={m.why_eccentricity_body()}
                tab="orbits"
                section="eccentricity"
              />
            </div>
            <div class="cell-value">e = {body.e.toFixed(4)}</div>
          </div>
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_inclination()}<WhyPopover
                title={m.why_inclination_title()}
                body={m.why_inclination_body()}
                tab="orbits"
                section="inclination"
              />
            </div>
            <div class="cell-value accent">{body.incl.toFixed(2)}°</div>
          </div>
          {#if body.type !== 'interstellar'}
            <div class="cell">
              <div class="cell-label">
                {m.panel_label_orbital_period()}<WhyPopover
                  title={m.why_orbital_period_title()}
                  body={m.why_orbital_period_body()}
                  tab="orbits"
                  section="keplers-laws"
                />
              </div>
              <div class="cell-value">
                {m.sbp_years({
                  value:
                    periodYears < 100 ? periodYears.toFixed(2) : String(Math.round(periodYears)),
                })}
              </div>
            </div>
          {/if}
          <div class="cell">
            <div class="cell-label">
              {m.panel_label_perihelion()}<WhyPopover
                title={m.why_perihelion_title()}
                body={m.why_perihelion_body()}
                tab="orbits"
                section="apsides"
              />
            </div>
            <div class="cell-value">{perihelion.toFixed(3)} AU</div>
          </div>
          {#if body.type !== 'interstellar'}
            <div class="cell">
              <div class="cell-label">
                {m.panel_label_aphelion()}<WhyPopover
                  title={m.why_aphelion_title()}
                  body={m.why_aphelion_body()}
                  tab="orbits"
                  section="apsides"
                />
              </div>
              <div class="cell-value">{aphelion.toFixed(3)} AU</div>
            </div>
          {/if}
          {#if body.radius_km}
            <div class="cell">
              <div class="cell-label">{m.sbp_label_radius()}</div>
              <div class="cell-value">
                {formatKm(body.radius_km, localeFromPage(page))}
              </div>
            </div>
          {/if}
          {#if body.discovered}
            <div class="cell">
              <div class="cell-label">{m.sbp_label_discovered()}</div>
              <div class="cell-value">{body.discovered}</div>
            </div>
          {/if}
        </div>
        {#if body.next_perihelion}
          <div class="dist-row">
            <span>{m.sbp_next_perihelion_prefix()} <strong>{body.next_perihelion}</strong></span>
          </div>
        {/if}
        {#if (body.library ?? []).length > 0}
          <div class="science-library">
            <h3 class="library-heading">{m.panel_tab_learn()}</h3>
            <ul class="learn-list">
              {#each body.library ?? [] as link (link.id)}
                <li>
                  <LearnLink entityId={body.id} url={link.url} label={link.label} />
                </li>
              {/each}
            </ul>
          </div>
        {:else if body.wiki}
          <div class="science-library">
            <h3 class="library-heading">{m.panel_tab_learn()}</h3>
            <ul class="learn-list">
              <li>
                <LearnLink
                  entityId={body.id}
                  url={body.wiki}
                  label={m.sbp_wikipedia_link({ name: body.name })}
                />
              </li>
            </ul>
          </div>
        {/if}
      {:else if tab === 'missions'}
        {#if missionEntries.length === 0}
          <p class="empty-tab">{m.panel_smallbody_no_spacecraft()}</p>
        {:else}
          <ul class="mission-list">
            {#each missionEntries as entry (entry)}
              {@const link = linkifyMission(entry)}
              <li>
                {#if link}
                  <a
                    href={link.href}
                    class="mission-link"
                    onclick={(e) => onMissionLinkClick(e, link, onMissionOpen)}>{link.label}</a
                  ><span>{link.rest}</span>
                {:else}
                  {entry}
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      {:else if tab === 'gallery'}
        {#if gallery.length === 0}
          <p class="empty-tab">{m.panel_gallery_empty()}</p>
        {:else}
          <PanelGalleryGrid
            images={galleryGrid}
            gridLabel={m.panel_gallery_aria({ name: body.name })}
            thumbLabel={body.name}
            onOpen={(src) => (lightboxSrc = src)}
          />
          <p class="gallery-credit">{m.panel_gallery_credit()}</p>
        {/if}
      {/if}
    </div>

    <PanelLightbox src={lightboxSrc} images={gallery} onClose={() => (lightboxSrc = null)} />
  {/if}
</Panel>

{#if cardSpec && cards}
  <cards.CardOverlay spec={cardSpec} open={cardOpen} onClose={() => (cardOpen = false)} />
{/if}

<style>
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .kind-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kind {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--accent, rgba(255, 255, 255, 0.6));
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 6px 0 12px;
  }
  /* Tab base styles inherited from src/lib/styles/panel-tabs.css —
     matches the rest of the detail-panel family (Planet, Sun, Mission,
     Fleet, Station). */
  .editorial.empty {
    color: var(--color-text-label);
  }
  .note {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.8);
    margin-top: 12px;
    padding: 8px 10px;
    border-left: 2px solid rgba(255, 200, 80, 0.5);
    background: rgba(255, 200, 80, 0.06);
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }
  .cell-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
    margin-bottom: 2px;
  }
  .cell-value {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.92);
  }
  .cell-value.accent {
    color: var(--color-state);
  }
  .dist-row {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: rgba(255, 255, 255, 0.7);
  }
  .learn-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* `:global(a)` because the anchor is rendered inside the
     <LearnLink/> component which has its own scoped style; the
     route-level visual is what the panel wants. */
  .learn-list :global(a) {
    color: var(--color-state);
    text-decoration: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    border-radius: 3px;
    display: block;
  }
  .learn-list :global(a:hover),
  .learn-list :global(a:focus-visible) {
    background: var(--color-accent-soft);
    border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
    outline: none;
  }
  /* .panel-hero, .gallery-grid, .lightbox → src/lib/styles/panel-tabs.css */
</style>
