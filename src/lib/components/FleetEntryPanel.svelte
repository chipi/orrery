<script lang="ts">
  import Panel from './Panel.svelte';
  import { base } from '$app/paths';
  import { spacecraftDiagramPath } from '$lib/spacecraft-diagrams';
  import type { FleetEntry, FleetSiteLink } from '$types/fleet';

  /**
   * Fleet detail panel. Six tabs (OVERVIEW / GALLERY / ANATOMY / CREW /
   * MISSIONS / LEARN) per PRD-012 v0.2; tabs render conditionally based
   * on what the entry actually has (skeleton entries from Phase A only
   * have OVERVIEW + LEARN populated; later phases progressively unlock
   * GALLERY, ANATOMY, CREW, MISSIONS).
   *
   * Cloned/streamlined from StationModulePanel.svelte (RFC-016 OQ-4) so
   * station-specific concerns (microgravity-axes, station context links)
   * stay out. A unified EntityDetailPanel refactor is tracked for v0.7+.
   */

  type Tab = 'overview' | 'gallery' | 'anatomy' | 'crew' | 'missions' | 'learn';

  type Props = {
    entry: FleetEntry | null;
    open: boolean;
    onClose: () => void;
    galleryFetcher: (id: string) => Promise<string[]>;
  };
  let { entry, open, onClose, galleryFetcher }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let lastId = $state<string | null>(null);
  let lightboxSrc = $state<string | null>(null);

  $effect(() => {
    if (entry && entry.id !== lastId) {
      tab = 'overview';
      lastId = entry.id;
      lightboxSrc = null;
      gallery = [];
      void galleryFetcher(entry.id).then((urls) => {
        if (entry && entry.id === lastId) gallery = urls;
      });
    }
  });

  // ANATOMY tab gates on whether a /diagrams/spacecraft/{id}.svg exists —
  // reuses the manifest from the station-visitor anatomy work
  // (RFC-016 OQ-13: same path, /fleet IDs added to SPACECRAFT_DIAGRAMS
  // as new SVGs land in Phase F).
  let diagramPath = $derived(entry ? spacecraftDiagramPath(entry.id) : null);
  let hasDiagram = $derived(diagramPath !== null);

  let hasGallery = $derived(gallery.length > 0);
  let hasFlights = $derived((entry?.flights?.length ?? 0) > 0);
  let hasMissions = $derived((entry?.linked_missions?.length ?? 0) > 0);
  let hasLinks = $derived((entry?.links?.length ?? 0) > 0);

  let linksByTier = $derived.by(() => {
    const out = {
      intro: [] as NonNullable<FleetEntry['links']>,
      core: [] as NonNullable<FleetEntry['links']>,
      deep: [] as NonNullable<FleetEntry['links']>,
    };
    for (const link of entry?.links ?? []) out[link.t].push(link);
    return out;
  });

  // Render the spec grid in a stable order — only fields actually
  // present in the entry render, so skeleton entries with empty
  // specs simply show fewer rows.
  type SpecRow = { label: string; value: string };
  let specRows = $derived.by(() => {
    if (!entry) return [] as SpecRow[];
    const rows: SpecRow[] = [];
    const s = entry.specs ?? {};
    const fmt = (v: number | string | boolean | undefined): string | null => {
      if (v === undefined || v === null || v === '') return null;
      if (typeof v === 'number') return v.toLocaleString();
      return String(v);
    };
    const push = (label: string, key: string, suffix = '') => {
      const v = fmt(s[key]);
      if (v !== null) rows.push({ label, value: v + suffix });
    };
    // Common
    push('Height', 'height_m', ' m');
    push('Length', 'length_m', ' m');
    push('Diameter', 'diameter_m', ' m');
    push('Mass', 'mass_kg', ' kg');
    push('Thrust', 'thrust_n', ' N');
    push('Stages', 'stages');
    push('Payload to LEO', 'payload_to_leo_kg', ' kg');
    push('Payload to Mars', 'payload_to_mars_kg', ' kg');
    push('Crew capacity', 'crew_capacity');
    push('Mission duration', 'mission_duration_days', ' d');
    push('Pressurised volume', 'pressurized_volume_m3', ' m³');
    push('Power source', 'power_source');
    push('Primary mirror', 'primary_mirror_m', ' m');
    push('Wavelength', 'wavelengths');
    push('Mission target', 'mission_target');
    push('Instruments', 'instruments_count');
    return rows;
  });

  function siteRoute(ls: FleetSiteLink): string {
    if (ls.type === 'moon') return `${base}/moon?site=${encodeURIComponent(ls.site_id)}`;
    if (ls.type === 'mars') return `${base}/mars?site=${encodeURIComponent(ls.site_id)}`;
    return `${base}/earth?id=${encodeURIComponent(ls.site_id)}`;
  }

  function siteLabel(ls: FleetSiteLink): string {
    if (ls.type === 'moon') return `Moon · ${ls.site_id}`;
    if (ls.type === 'mars') return `Mars · ${ls.site_id}`;
    return `Earth orbit · ${ls.site_id}`;
  }

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: 'Active',
    FLOWN: 'Flown',
    RETIRED: 'Retired',
    FAILED: 'Failed',
    PLANNED: 'Planned',
  };
</script>

<Panel {open} {onClose} title={entry?.name ?? entry?.id ?? ''}>
  {#if entry}
    <div class="head">
      <div class="agency-row">
        <span class="agency-badge">{entry.agency}</span>
        <span class="status status-{entry.status.toLowerCase()}">
          {STATUS_LABEL[entry.status] ?? entry.status}
        </span>
        <span class="category-chip">{entry.category}</span>
      </div>
      <h1 class="name">{entry.name}</h1>
      {#if entry.tagline ?? entry.best_known_for}
        <p class="tagline">{entry.tagline ?? entry.best_known_for}</p>
      {/if}
    </div>

    {#if hasGallery}
      <div class="panel-hero">
        <button
          type="button"
          class="panel-hero-btn"
          onclick={() => (lightboxSrc = gallery[0]!)}
          aria-label="View hero photo for {entry.name}"
        >
          <img src={gallery[0]} alt="" fetchpriority="high" decoding="async" />
        </button>
      </div>
    {/if}

    <div class="tabs" role="tablist">
      <button
        type="button"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}>OVERVIEW</button
      >
      {#if hasGallery}
        <button
          type="button"
          class:active={tab === 'gallery'}
          onclick={() => (tab = 'gallery')}
          role="tab"
          aria-selected={tab === 'gallery'}>GALLERY</button
        >
      {/if}
      {#if hasDiagram}
        <button
          type="button"
          class:active={tab === 'anatomy'}
          onclick={() => (tab = 'anatomy')}
          role="tab"
          aria-selected={tab === 'anatomy'}>ANATOMY</button
        >
      {/if}
      {#if entry.category === 'crewed-spacecraft' && hasFlights}
        <button
          type="button"
          class:active={tab === 'crew'}
          onclick={() => (tab = 'crew')}
          role="tab"
          aria-selected={tab === 'crew'}>CREW</button
        >
      {/if}
      {#if hasMissions}
        <button
          type="button"
          class:active={tab === 'missions'}
          onclick={() => (tab = 'missions')}
          role="tab"
          aria-selected={tab === 'missions'}>MISSIONS</button
        >
      {/if}
      {#if hasLinks}
        <button
          type="button"
          class:active={tab === 'learn'}
          onclick={() => (tab = 'learn')}
          role="tab"
          aria-selected={tab === 'learn'}>LEARN</button
        >
      {/if}
    </div>

    <div class="tab-body">
      {#if tab === 'overview'}
        {#if entry.explorer_route}
          <a
            class="explorer-cta"
            href="{base}{entry.explorer_route}?id={entry.id}"
            data-sveltekit-preload-data="hover"
          >
            Open {entry.name} Explorer →
          </a>
        {/if}

        {#if entry.description}
          <p class="description">{entry.description}</p>
        {/if}

        <dl class="spec-grid">
          <div class="spec">
            <dt>Builder</dt>
            <dd>{entry.manufacturer}</dd>
          </div>
          <div class="spec">
            <dt>Country</dt>
            <dd>{entry.country}</dd>
          </div>
          <div class="spec">
            <dt>First flight</dt>
            <dd>{entry.first_flight === 'planned' ? 'Planned' : entry.first_flight}</dd>
          </div>
          {#if entry.last_flight}
            <div class="spec">
              <dt>Last flight</dt>
              <dd>{entry.last_flight}</dd>
            </div>
          {/if}
          <div class="spec">
            <dt>Era</dt>
            <dd>{entry.era}</dd>
          </div>
          <div class="spec">
            <dt>Epoch</dt>
            <dd>{entry.epoch.replace(/-/g, ' ')}</dd>
          </div>
          {#each specRows as row (row.label)}
            <div class="spec">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          {/each}
        </dl>

        {#if entry.linked_sites && entry.linked_sites.length > 0}
          <h3 class="section-h">Operating sites</h3>
          <ul class="site-list">
            {#each entry.linked_sites as ls (ls.type + ls.site_id)}
              <li>
                <a class="site-link" href={siteRoute(ls)} data-sveltekit-preload-data="hover">
                  {siteLabel(ls)} →
                </a>
              </li>
            {/each}
          </ul>
        {/if}

        <p class="credit">{entry.credit}</p>
      {:else if tab === 'gallery'}
        {#if hasGallery}
          <div class="gallery-grid">
            {#each gallery.slice(1) as src (src)}
              <button
                type="button"
                class="thumb"
                onclick={() => (lightboxSrc = src)}
                aria-label="View photo"
              >
                <img {src} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
        {/if}
      {:else if tab === 'anatomy' && diagramPath}
        <div class="anatomy">
          <img src={diagramPath} alt="Anatomy diagram for {entry.name}" />
          <p class="anatomy-caption">
            Hand-drawn schematic in the canonical /science chapter style.
          </p>
        </div>
      {:else if tab === 'crew' && hasFlights}
        <ul class="flights">
          {#each entry.flights ?? [] as flight (flight.mission_id)}
            <li class="flight">
              <header class="flight-head">
                <span class="flight-designation">{flight.flight_designation}</span>
                <a
                  class="mission-link"
                  href="{base}/missions?id={flight.mission_id}"
                  data-sveltekit-preload-data="hover"
                >
                  Mission →
                </a>
              </header>
              {#if flight.patch_path}
                <img class="patch" src={flight.patch_path} alt="" />
              {/if}
              {#if flight.crew && flight.crew.length > 0}
                <ul class="crew-grid">
                  {#each flight.crew as crew (crew.name)}
                    <li class="crew-card">
                      {#if crew.portrait_path}
                        <img src={crew.portrait_path} alt="" loading="lazy" />
                      {:else}
                        <div class="crew-portrait-empty" aria-hidden="true">—</div>
                      {/if}
                      <span class="crew-name">{crew.name}</span>
                      <span class="crew-role">{crew.role}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      {:else if tab === 'missions' && hasMissions}
        <ul class="missions-list">
          {#each entry.linked_missions ?? [] as mid (mid)}
            <li>
              <a
                class="mission-link"
                href="{base}/missions?id={mid}"
                data-sveltekit-preload-data="hover"
              >
                {mid}
                <span class="mission-arrow">→</span>
              </a>
            </li>
          {/each}
        </ul>
      {:else if tab === 'learn' && hasLinks}
        <ul class="links">
          {#if linksByTier.intro.length > 0}
            <li class="tier">
              <h4>Intro</h4>
              <ul>
                {#each linksByTier.intro as link (link.u)}
                  <li>
                    <a href={link.u} target="_blank" rel="noopener noreferrer external">
                      {link.l}
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
          {/if}
          {#if linksByTier.core.length > 0}
            <li class="tier">
              <h4>Core</h4>
              <ul>
                {#each linksByTier.core as link (link.u)}
                  <li>
                    <a href={link.u} target="_blank" rel="noopener noreferrer external">
                      {link.l}
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
          {/if}
          {#if linksByTier.deep.length > 0}
            <li class="tier">
              <h4>Deep</h4>
              <ul>
                {#each linksByTier.deep as link (link.u)}
                  <li>
                    <a href={link.u} target="_blank" rel="noopener noreferrer external">
                      {link.l}
                    </a>
                  </li>
                {/each}
              </ul>
            </li>
          {/if}
        </ul>
      {/if}
    </div>
  {/if}
</Panel>

{#if lightboxSrc}
  <button
    type="button"
    class="lightbox"
    onclick={() => (lightboxSrc = null)}
    aria-label="Close photo"
  >
    <img src={lightboxSrc} alt="" />
  </button>
{/if}

<style>
  .head {
    padding: 12px 16px 4px;
  }
  .agency-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-family: 'Space Mono', monospace;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .agency-badge {
    background: rgba(78, 205, 196, 0.16);
    color: #4ecdc4;
    padding: 2px 8px;
    border-radius: 3px;
  }
  .status {
    padding: 2px 8px;
    border-radius: 3px;
  }
  .status-active {
    background: rgba(78, 205, 196, 0.16);
    color: #4ecdc4;
  }
  .status-flown {
    background: rgba(75, 156, 211, 0.18);
    color: #4b9cd3;
  }
  .status-retired {
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
  }
  .status-failed {
    background: rgba(193, 68, 14, 0.22);
    color: #ff6b3a;
  }
  .status-planned {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.78);
  }
  .category-chip {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
    padding: 2px 8px;
    border-radius: 3px;
  }

  .name {
    margin: 8px 0 4px;
    font-family: 'Bebas Neue', system-ui, sans-serif;
    font-size: 28px;
    letter-spacing: 0.02em;
    color: #fff;
  }
  .tagline {
    margin: 0 0 6px;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.4;
  }

  .panel-hero {
    margin: 4px 0 8px;
    aspect-ratio: 16 / 9;
    background: rgba(255, 255, 255, 0.02);
    overflow: hidden;
  }
  .panel-hero-btn {
    width: 100%;
    height: 100%;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .panel-hero-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 1px;
    margin: 8px 12px 0;
    padding: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .tabs button {
    background: transparent;
    border: 0;
    padding: 8px 12px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
  .tabs button:hover {
    color: rgba(255, 255, 255, 0.85);
  }
  .tabs button.active {
    color: #4ecdc4;
    border-bottom-color: #4ecdc4;
  }

  .tab-body {
    padding: 14px 16px 20px;
  }

  .explorer-cta {
    display: block;
    text-align: center;
    background: rgba(78, 205, 196, 0.1);
    border: 1px solid rgba(78, 205, 196, 0.4);
    color: #4ecdc4;
    padding: 10px 14px;
    border-radius: 4px;
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 12px;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .explorer-cta:hover {
    background: rgba(78, 205, 196, 0.18);
    border-color: #4ecdc4;
  }

  .description {
    margin: 0 0 14px;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.5;
  }

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px 12px;
    margin: 0 0 14px;
    padding: 0;
  }
  .spec {
    margin: 0;
  }
  .spec dt {
    font-family: 'Space Mono', monospace;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 1px;
  }
  .spec dd {
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: #fff;
    word-break: break-word;
  }

  .section-h {
    margin: 14px 0 6px;
    font-family: 'Space Mono', monospace;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.55);
    font-weight: normal;
  }
  .site-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .site-link,
  .mission-link {
    display: inline-block;
    color: #4ecdc4;
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 3px;
    background: rgba(78, 205, 196, 0.08);
    transition: background 0.15s;
  }
  .site-link:hover,
  .mission-link:hover {
    background: rgba(78, 205, 196, 0.18);
    text-decoration: underline;
  }
  .mission-arrow {
    margin-left: 6px;
    color: rgba(78, 205, 196, 0.7);
  }

  .credit {
    margin: 16px 0 0;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.5;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
  }
  .thumb {
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    aspect-ratio: 4 / 3;
    overflow: hidden;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .anatomy {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 12px;
    text-align: center;
  }
  .anatomy img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .anatomy-caption {
    margin: 8px 0 0;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic;
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.5);
  }

  .flights {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .flight {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 10px;
  }
  .flight-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .flight-designation {
    font-family: 'Bebas Neue', system-ui, sans-serif;
    font-size: 16px;
    color: #fff;
  }
  .patch {
    width: 90px;
    height: 90px;
    object-fit: contain;
    margin-bottom: 8px;
  }
  .crew-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 8px;
  }
  .crew-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
  }
  .crew-card img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 50%;
  }
  .crew-portrait-empty {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    font-size: 18px;
  }
  .crew-name {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #fff;
    line-height: 1.2;
  }
  .crew-role {
    font-family: 'Space Mono', monospace;
    font-size: 9.5px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .missions-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .links {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tier {
    margin-bottom: 12px;
  }
  .tier h4 {
    margin: 0 0 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.5);
    font-weight: normal;
  }
  .tier ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tier ul a {
    color: #4ecdc4;
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
  }
  .tier ul a:hover {
    text-decoration: underline;
  }

  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.92);
    border: 0;
    padding: 0;
    cursor: zoom-out;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lightbox img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  }
</style>
