<script lang="ts">
  /**
   * Chronological strip view for ISS / Tiangong modules + visitors.
   * Each marker is colored by the canonical agency color of its launch
   * vehicle (via $lib/agencies), positioned along a year axis between
   * the earliest and latest launch_date. Click → opens the module
   * panel via the parent's onSelect callback.
   *
   * One reusable component, mounted on both /iss and /tiangong.
   */
  import { resolveAgency } from '$lib/agencies';
  import { base } from '$app/paths';

  type StationItem = {
    id: string;
    name?: string;
    launch_date: string;
    agency: string;
    launch_vehicle_fleet_id?: string;
    launch_vehicle?: string;
    status: 'ACTIVE' | 'RETIRED';
  };

  interface Props {
    modules: StationItem[];
    visitors: StationItem[];
    selectedId?: string | null;
    hoveredId?: string | null;
    onSelect?: (item: StationItem) => void;
    onHover?: (id: string | null) => void;
    /** Localised heading for the strip. */
    heading?: string;
    /** Image-root directory for per-item thumbnails (2026-06-15 user
     *  direction: "next to each item add small hero image of that
     *  module to make it more interesting panel"). When supplied, each
     *  marker prefixes its label with an <img> sourced from
     *  `${base}/images/${heroDir}/${item.id}/01.jpg`. Set to
     *  'iss-modules' on /iss and 'tiangong-modules' on /tiangong;
     *  omit for routes without per-item imagery. onerror handler hides
     *  the img so missing assets don't show a broken-image icon. */
    heroDir?: string;
  }

  let {
    modules,
    visitors,
    selectedId = null,
    hoveredId = null,
    onSelect,
    onHover,
    heading,
    heroDir,
  }: Props = $props();

  // Combined chronological list. Tag each item so we can style modules
  // vs visitors distinctly in the legend even though they share the axis.
  type StripItem = StationItem & { _kind: 'module' | 'visitor'; year: number; t: number };

  const items: StripItem[] = $derived.by(() => {
    const combined: StripItem[] = [
      ...modules.map((mod) => ({
        ...mod,
        _kind: 'module' as const,
        year: new Date(mod.launch_date).getUTCFullYear(),
        t: new Date(mod.launch_date).getTime(),
      })),
      ...visitors.map((v) => ({
        ...v,
        _kind: 'visitor' as const,
        year: new Date(v.launch_date).getUTCFullYear(),
        t: new Date(v.launch_date).getTime(),
      })),
    ];
    combined.sort((a, b) => a.t - b.t);
    return combined;
  });

  // Axis bounds: round to 5-year ticks
  const minYear = $derived(items.length ? Math.floor(items[0].year / 5) * 5 : 1998);
  const maxYear = $derived(
    items.length ? Math.ceil(items[items.length - 1].year / 5) * 5 + 1 : 2026,
  );
  const span = $derived(maxYear - minYear);

  const ticks: number[] = $derived.by(() => {
    const out: number[] = [];
    for (let y = minYear; y <= maxYear; y += 5) out.push(y);
    return out;
  });

  const moduleItems: StripItem[] = $derived(items.filter((i) => i._kind === 'module'));
  const visitorItems: StripItem[] = $derived(items.filter((i) => i._kind === 'visitor'));

  /** Position along the strip (0..1) for a given launch_date. */
  function tFor(item: StripItem): number {
    const yearFrac = item.year + (new Date(item.launch_date).getUTCMonth() + 0.5) / 12;
    return (yearFrac - minYear) / span;
  }

  // Greedy row-packing so markers that overlap horizontally stack vertically
  // instead of hiding each other (e.g. Tianhe + Chinarm both 2021-04-29,
  // Tranquility + Cupola both 2010-02-08 on STS-130, Zarya 1998-11-20 +
  // Unity 1998-12-06 only 16 days apart). MIN_GAP is the minimum
  // fractional separation we want between two markers before treating them
  // as overlapping — sized so a labelled marker doesn't crowd its
  // neighbour on a typical desktop viewport.
  const MIN_GAP = 0.1;

  type PackedItem = StripItem & { row: number };

  function packRows(list: StripItem[]): PackedItem[] {
    const rowEnd: number[] = []; // last-used t per row
    const out: PackedItem[] = [];
    for (const item of list) {
      const t = tFor(item);
      let row = 0;
      while (row < rowEnd.length && t - rowEnd[row] < MIN_GAP) row++;
      rowEnd[row] = t;
      out.push({ ...item, row });
    }
    return out;
  }

  const packedModules: PackedItem[] = $derived(packRows(moduleItems));
  const packedVisitors: PackedItem[] = $derived(packRows(visitorItems));
  const moduleRowCount = $derived(packedModules.reduce((max, m) => Math.max(max, m.row + 1), 1));
  const visitorRowCount = $derived(packedVisitors.reduce((max, v) => Math.max(max, v.row + 1), 1));
  const ROW_HEIGHT = 48; // marker height (40) + a touch of breathing room

  /** Canonical agency color for the launch vehicle. Falls back to the
   *  operating agency color, then a neutral grey. */
  function colorFor(item: StripItem): string {
    // Prefer launcher's agency (so a Russian-built ISS module launched
    // on Proton lights up Roscosmos red even though the agency field
    // may be "Roscosmos / NASA").
    if (item.launch_vehicle_fleet_id) {
      // Without a fleet-by-id lookup here, fall back to the agency field
      // — agencies.ts resolves via splitAgencies' first component.
      const a = resolveAgency(item.agency.split(/[/+&]/)[0].trim());
      if (a?.color) return a.color;
    }
    const a = resolveAgency(item.agency.split(/[/+&]/)[0].trim());
    return a?.color ?? '#888';
  }

  function shortName(item: StripItem): string {
    return (item.name ?? item.id).slice(0, 20);
  }
</script>

<section class="strip" aria-label={heading ?? 'Chronological timeline'}>
  {#if heading}
    <h2 class="strip-heading">{heading}</h2>
  {/if}
  <div class="axis-wrap">
    <!-- Year ticks -->
    <div class="ticks" aria-hidden="true">
      {#each ticks as y (y)}
        <div class="tick" style:left="{((y - minYear) / span) * 100}%">
          <span class="tick-label">{y}</span>
        </div>
      {/each}
    </div>

    <!-- Marker rail. Modules above, visitors below. Overlapping markers
         get stacked vertically via packRows() so nothing hides anything. -->
    <div class="rail rail-modules" style:height="{moduleRowCount * ROW_HEIGHT}px">
      {#each packedModules as item (item.id)}
        <button
          type="button"
          class="marker"
          class:active={selectedId === item.id}
          class:hovered={hoveredId === item.id}
          class:retired={item.status === 'RETIRED'}
          style:left="{tFor(item) * 100}%"
          style:top="{item.row * ROW_HEIGHT + 4}px"
          style:background-color={colorFor(item)}
          aria-label="{item.name ?? item.id} ({item.launch_date}, {item.agency})"
          title="{item.name ?? item.id} · {item.launch_date} · {item.agency}"
          onclick={() => onSelect?.(item)}
          onmouseenter={() => onHover?.(item.id)}
          onmouseleave={() => onHover?.(null)}
          onfocus={() => onHover?.(item.id)}
          onblur={() => onHover?.(null)}
        >
          {#if heroDir}
            <img
              class="marker-thumb"
              src="{base}/images/{heroDir}/{item.id}/01.jpg"
              alt=""
              loading="lazy"
              decoding="async"
              onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
          {/if}
          <span class="marker-text">
            <span class="marker-name">{shortName(item)}</span>
            <span class="marker-year">{item.year} · {item.agency.split(/[/+&]/)[0].trim()}</span>
          </span>
        </button>
      {/each}
    </div>

    {#if visitorItems.length > 0}
      <div class="rail-divider" aria-hidden="true"></div>
      <div class="rail rail-visitors" style:height="{visitorRowCount * ROW_HEIGHT}px">
        {#each packedVisitors as item (item.id)}
          <button
            type="button"
            class="marker marker-visitor"
            class:active={selectedId === item.id}
            class:hovered={hoveredId === item.id}
            style:left="{tFor(item) * 100}%"
            style:top="{item.row * ROW_HEIGHT + 4}px"
            style:background-color={colorFor(item)}
            aria-label="{item.name ?? item.id} ({item.launch_date}, {item.agency})"
            title="{item.name ?? item.id} · {item.launch_date} · {item.agency}"
            onclick={() => onSelect?.(item)}
            onmouseenter={() => onHover?.(item.id)}
            onmouseleave={() => onHover?.(null)}
            onfocus={() => onHover?.(item.id)}
            onblur={() => onHover?.(null)}
          >
            {#if heroDir}
              <img
                class="marker-thumb"
                src="{base}/images/{heroDir}/{item.id}/01.jpg"
                alt=""
                loading="lazy"
                decoding="async"
                onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            {/if}
            <span class="marker-text">
            <span class="marker-name">{shortName(item)}</span>
            <span class="marker-year">{item.year} · {item.agency.split(/[/+&]/)[0].trim()}</span>
          </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .strip {
    width: 100%;
    padding: 1rem 1.25rem;
    background: rgba(15, 20, 30, 0.6);
    backdrop-filter: blur(6px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .strip-heading {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 0.75rem 0;
    font-weight: 600;
  }
  .axis-wrap {
    position: relative;
    width: 100%;
    min-height: 140px;
    padding: 24px 0 8px 0;
  }
  .ticks {
    position: absolute;
    inset: 0 0 0 0;
    pointer-events: none;
  }
  .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.07);
  }
  .tick-label {
    position: absolute;
    top: 0;
    left: 4px;
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.4);
    font-variant-numeric: tabular-nums;
  }
  .rail {
    position: relative;
    /* height is set inline (style:height) by the component so the rail
       grows with the number of vertically-stacked rows. */
    margin-top: 4px;
  }
  .rail-modules {
    border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
  }
  .rail-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    margin: 4px 0;
  }
  .marker {
    position: absolute;
    /* top is set inline (style:top) by the component for vertical stacking. */
    transform: translateX(-50%);
    min-width: 9px;
    height: 40px;
    padding: 0 8px 0 0;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.95);
    cursor: pointer;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-flex;
    align-items: center;
    line-height: 1;
    transition:
      transform 100ms,
      box-shadow 100ms,
      filter 100ms;
  }
  .marker:hover,
  .marker.hovered,
  .marker:focus-visible {
    transform: translateX(-50%) translateY(-2px) scale(1.08);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 0 2px rgba(255, 255, 255, 0.5);
    z-index: 2;
    outline: none;
  }
  .marker.active {
    transform: translateX(-50%) translateY(-3px) scale(1.15);
    box-shadow:
      0 6px 18px rgba(0, 0, 0, 0.55),
      0 0 0 2px #fff;
    z-index: 3;
  }
  .marker.retired {
    filter: grayscale(0.5) brightness(0.7);
    border-style: dashed;
  }
  .marker.marker-visitor {
    border-radius: 12px;
  }
  /* Two-line text column to the right of the thumbnail: module name on
     top, launch year + lead agency below (2026-06-28 user direction:
     "bigger thumbs and a bit more info"). pointer-events:none so
     overlapping markers don't intercept each other's clicks. */
  .marker-text {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    margin-left: 7px;
    min-width: 0;
    pointer-events: none;
  }
  .marker-name {
    display: block;
    max-width: 104px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .marker-year {
    display: block;
    max-width: 104px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.56rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.62);
    font-variant-numeric: tabular-nums;
  }
  /* Per-item thumbnail (heroDir prop). Tiny rounded rect at the start
     of each marker; pulls the actual module / visitor hero from the
     same asset tree used by the panel's GALLERY tab. Falls back to
     hidden via onerror so missing assets don't show a broken-image
     icon (2026-06-15 user direction: "add small hero image of that
     module to make it more interesting"). */
  .marker-thumb {
    flex: 0 0 auto;
    width: 50px;
    height: 38px;
    object-fit: cover;
    border-radius: 3px 0 0 3px;
    margin-left: -1px;
    display: block;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    .strip {
      padding: 0.6rem 0.5rem;
    }
    /* Mobile keeps the compact thumb-only marker — the text column would
       crowd the narrow strip. Thumb shrinks but stays visible. */
    .marker-text {
      display: none;
    }
    .marker {
      min-width: 30px;
      width: 30px;
      height: 24px;
      padding: 0;
    }
    .marker-thumb {
      width: 30px;
      height: 22px;
      border-radius: 3px;
    }
  }
</style>
