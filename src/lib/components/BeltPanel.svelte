<script lang="ts">
  /**
   * BeltPanel — detail panel for the asteroid + Kuiper belts on
   * /explore (v0.7.x — user feedback 2026-06-06: "we have comet belt
   * in front of Jupiter… can we make it clickable and add details
   * panel?"). Mirrors SatellitePanel + SmallBodyPanel typography so
   * it reads as a peer of the existing detail panels.
   *
   * Belts are regions, not bodies — the panel surfaces population
   * estimates, mass ratios, location range in AU, a gallery of the
   * belt's largest catalogued members (re-using small-body imagery),
   * mission flybys, and a tiered library. Members in the MEMBERS tab
   * cross-link to the SmallBodyPanel for any name that matches an id
   * in static/data/small-bodies.json (Ceres / Pluto / Eris / Haumea /
   * Makemake all resolve today).
   */
  import Panel from './Panel.svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import { localeFromPage, DEFAULT_LOCALE } from '$lib/locale';
  import {
    getBelts,
    getBeltGallery,
    getBeltI18n,
    type BeltEntry,
    type BeltGallerySlot,
    type BeltI18n,
  } from '$lib/data';

  const loc = $derived(localeFromPage($page));

  type Tab = 'overview' | 'gallery' | 'members' | 'missions' | 'library';

  type Props = {
    beltId: string | null;
    open: boolean;
    onClose: () => void;
  };
  let { beltId, open, onClose }: Props = $props();

  let belts: BeltEntry[] = $state([]);
  let loaded = $state(false);
  $effect(() => {
    if (!loaded) {
      void getBelts().then((b) => {
        belts = b;
        loaded = true;
      });
    }
  });

  let tab: Tab = $state('overview');
  let lastKey = $state<string | null>(null);
  let gallery: BeltGallerySlot[] = $state([]);
  let overlay: BeltI18n | null = $state(null);

  let baseEntry = $derived<BeltEntry | null>(
    beltId ? (belts.find((b) => b.id === beltId) ?? null) : null,
  );
  function mergeOverlay(base: BeltEntry, ov: BeltI18n | null): BeltEntry {
    if (!ov) return base;
    return {
      ...base,
      name: ov.name ?? base.name,
      kind: ov.kind ?? base.kind,
      location: ov.location ?? base.location,
      population_estimate: ov.population_estimate ?? base.population_estimate,
      total_mass_relative: ov.total_mass_relative ?? base.total_mass_relative,
      largest_members: ov.largest_members ?? base.largest_members,
      description: ov.description ?? base.description,
      discovered: ov.discovered ?? base.discovered,
      mission_visits: ov.mission_visits ?? base.mission_visits,
      library: base.library?.map((l) => ({
        ...l,
        label: ov.library_labels?.[l.id] ?? l.label,
      })),
    };
  }
  let entry = $derived<BeltEntry | null>(baseEntry ? mergeOverlay(baseEntry, overlay) : null);

  $effect(() => {
    if (baseEntry && baseEntry.id !== lastKey) {
      tab = 'overview';
      lastKey = baseEntry.id;
      gallery = [];
      overlay = null;
      const id = baseEntry.id;
      void getBeltGallery(id).then((g) => {
        if (baseEntry && baseEntry.id === id) gallery = g;
      });
      void getBeltI18n(loc, id).then((o) => {
        if (baseEntry && baseEntry.id === id) overlay = o;
      });
    }
  });

  // Cross-link table — the largest_members strings begin with a body
  // name then a dash. If the leading word matches a small-body id we
  // ship today (Ceres / Pluto / Eris / Haumea / Makemake), make the
  // list item clickable; it deep-links into /explore?id=<small-body>
  // which the existing $effect resolves to a SmallBodyPanel open.
  // Quaoar etc. that aren't in our small-bodies.json render as plain
  // text — fall back, not error.
  const SMALL_BODY_IDS: Record<string, string> = {
    ceres: 'ceres',
    pluto: 'pluto',
    eris: 'eris',
    haumea: 'haumea',
    makemake: 'makemake',
  };
  function memberLink(member: string): string | null {
    const firstWord = member
      .split(/[\s—–-]/)[0]
      ?.toLowerCase()
      .trim();
    if (!firstWord) return null;
    const sbId = SMALL_BODY_IDS[firstWord];
    if (!sbId) return null;
    const qs = loc === DEFAULT_LOCALE ? '' : `&lang=${encodeURIComponent(loc)}`;
    return `${base}/explore?id=${sbId}${qs}`;
  }
  function openMember(href: string, event: Event) {
    event.preventDefault();
    void goto(href);
  }
</script>

<Panel {open} {onClose} title={entry?.name ?? ''}>
  {#if entry}
    <div class="head">
      <div class="kind-row">
        <span class="kind">{entry.kind}</span>
      </div>
      <div class="name">{entry.name}</div>
      <div class="stat-row">
        <div class="stat">
          <div class="stat-label">LOCATION</div>
          <div class="stat-value">{entry.inner_au}–{entry.outer_au} AU</div>
        </div>
        <div class="stat">
          <div class="stat-label">TOTAL MASS</div>
          <div class="stat-value">{entry.total_mass_relative}</div>
        </div>
      </div>
    </div>

    {#if gallery.length > 0}
      <div class="panel-hero">
        <img src={`${base}${gallery[0].src}`} alt="" fetchpriority="high" decoding="async" />
      </div>
    {/if}

    <div class="tabs" role="tablist">
      <button
        type="button"
        id="belt-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="belt-tabpanel">OVERVIEW</button
      >
      <button
        type="button"
        id="belt-tab-gallery"
        class:active={tab === 'gallery'}
        onclick={() => (tab = 'gallery')}
        role="tab"
        aria-selected={tab === 'gallery'}
        aria-controls="belt-tabpanel">GALLERY</button
      >
      <button
        type="button"
        id="belt-tab-members"
        class:active={tab === 'members'}
        onclick={() => (tab = 'members')}
        role="tab"
        aria-selected={tab === 'members'}
        aria-controls="belt-tabpanel">MEMBERS</button
      >
      <button
        type="button"
        id="belt-tab-missions"
        class:active={tab === 'missions'}
        onclick={() => (tab = 'missions')}
        role="tab"
        aria-selected={tab === 'missions'}
        aria-controls="belt-tabpanel">MISSIONS</button
      >
      <button
        type="button"
        id="belt-tab-library"
        class:active={tab === 'library'}
        onclick={() => (tab = 'library')}
        role="tab"
        aria-selected={tab === 'library'}
        aria-controls="belt-tabpanel">LIBRARY</button
      >
    </div>

    <div class="tab-content" role="tabpanel" id="belt-tabpanel" aria-labelledby="belt-tab-{tab}">
      {#if tab === 'overview'}
        <p class="editorial">{entry.description}</p>
        <div class="composition">
          <div class="cell-label">LOCATION</div>
          <div class="cell-value">{entry.location}</div>
        </div>
        <div class="composition">
          <div class="cell-label">POPULATION</div>
          <div class="cell-value">{entry.population_estimate}</div>
        </div>
        <div class="composition">
          <div class="cell-label">DISCOVERED</div>
          <div class="cell-value">{entry.discovered}</div>
        </div>
      {:else if tab === 'gallery'}
        {#if gallery.length > 0}
          <ul class="gallery-grid">
            {#each gallery as slot (slot.src)}
              <li>
                <img
                  src={`${base}${slot.src}`}
                  alt={slot.caption}
                  loading="lazy"
                  decoding="async"
                />
                <p class="caption">{slot.caption}</p>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="editorial empty">Gallery is still being assembled.</p>
        {/if}
      {:else if tab === 'members'}
        <p class="editorial">The largest catalogued members of the {entry.name}.</p>
        <ul class="member-list">
          {#each entry.largest_members as member (member)}
            {@const href = memberLink(member)}
            <li>
              {#if href}
                <a {href} onclick={(e) => openMember(href, e)} class="member-link">
                  {member}
                  <span class="member-cta" aria-hidden="true">→ open panel</span>
                </a>
              {:else}
                {member}
              {/if}
            </li>
          {/each}
        </ul>
      {:else if tab === 'missions'}
        {#if entry.mission_visits.length > 0}
          <ul class="member-list">
            {#each entry.mission_visits as mission (mission)}
              <li>{mission}</li>
            {/each}
          </ul>
        {:else}
          <p class="editorial empty">No spacecraft have visited this belt yet.</p>
        {/if}
      {:else if tab === 'library'}
        {#if entry.library && entry.library.length > 0}
          <ul class="learn-list">
            {#each entry.library as link (link.id)}
              <li>
                <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
                <span class="tier-pill tier-{link.tier}">{link.tier}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="editorial empty">Library links arrive in a follow-up.</p>
        {/if}
      {/if}
    </div>
  {/if}
</Panel>

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
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(184, 164, 112, 0.85);
    text-transform: uppercase;
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 6px 0 12px;
  }
  .stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .stat-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .stat-value {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: var(--color-text);
  }
  .panel-hero {
    margin: 0 0 14px;
    border-radius: 3px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
  }
  .panel-hero img {
    display: block;
    width: 100%;
    height: auto;
  }
  .tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 14px;
  }
  .tabs button {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 4px;
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition:
      color 120ms,
      border-color 120ms;
  }
  .tabs button.active {
    color: rgba(184, 164, 112, 0.9);
    border-color: rgba(184, 164, 112, 0.7);
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 12px;
  }
  .editorial.empty {
    color: rgba(255, 255, 255, 0.5);
  }
  .composition {
    margin: 0 0 10px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.55);
    margin-bottom: 4px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.4;
  }
  .gallery-grid {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .gallery-grid img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.4);
  }
  .caption {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.7);
    margin: 6px 0 0;
  }
  .member-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .member-list li {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    line-height: 1.4;
  }
  .member-list li:last-child {
    border-bottom: none;
  }
  .member-link {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    color: inherit;
    text-decoration: none;
    transition: color 120ms;
  }
  .member-link:hover,
  .member-link:focus-visible {
    color: rgba(78, 205, 196, 0.95);
    outline: none;
  }
  .member-cta {
    font-size: 9px;
    letter-spacing: 1.4px;
    color: rgba(78, 205, 196, 0.7);
    white-space: nowrap;
  }
  .learn-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .learn-list li {
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .learn-list li:last-child {
    border-bottom: none;
  }
  .learn-list a {
    color: rgba(78, 205, 196, 0.95);
    font-size: 12px;
    text-decoration: none;
    flex: 1;
  }
  .learn-list a:hover {
    text-decoration: underline;
  }
  .tier-pill {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.08);
  }
  .tier-intro {
    background: rgba(78, 205, 196, 0.18);
    color: rgba(78, 205, 196, 0.95);
  }
  .tier-core {
    background: rgba(184, 164, 112, 0.18);
    color: rgba(212, 188, 130, 0.95);
  }
  .tier-extra {
    background: rgba(160, 160, 200, 0.14);
    color: rgba(180, 180, 220, 0.85);
  }
</style>
