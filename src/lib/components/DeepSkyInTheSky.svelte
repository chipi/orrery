<!--
  DeepSkyInTheSky — the IN THE SKY body of a deep-sky object (L42, UXD-049): the figure of its
  constellation with the object ringed, and rows computed from its own RA / Dec / magnitude, the
  JPL Horizons Sun and the reader's latitude (src/lib/universe/sky-finder.ts). Shared by the
  DeepSkyPanel tab and the /explore/deep-sky/<id> page (plan D1), so the two cannot drift. On a
  prerendered page the latitude rows (BEST MONTHS, FROM YOUR LATITUDE) appear after hydration:
  the browser's time zone is the reader's, never the build machine's.
-->
<script lang="ts">
  import Chip from './Chip.svelte';
  import ConstellationFinder from './ConstellationFinder.svelte';
  import UniverseFacts, { type Fact } from './UniverseFacts.svelte';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { constellationName as deepSkyConstellation } from '$lib/universe/iau-constellations';
  import {
    getConstellationLines,
    getNamedStars,
    getSunEphemeris,
    getNamedStarI18n,
    type NamedStar,
  } from '$lib/data/universe';
  import { dataLoadFailed } from '$lib/data/core';
  import { isZodiacConstellation } from '$lib/universe/iau-constellations';
  import { showConstellationLines } from '$lib/universe/constellation-actions';
  import {
    altitudeBand,
    bestMonths,
    eyeBand,
    figureVertices,
    formatDec,
    formatRa,
    maxAltitude,
    nearestNamedStar,
    raDecToHyg,
    toDate,
    type SunEphemeris,
  } from '$lib/universe/sky-finder';
  import { viewerLatLon } from '$lib/viewer-location';
  import { onMount } from 'svelte';

  // The Sun table behind BEST MONTHS: a proper noun, never translated (like the Exoplanet Archive).
  const HORIZONS = { label: 'JPL Horizons', url: 'https://ssd.jpl.nasa.gov/horizons/' };

  type Props = {
    object: { id: string; con: string; ra: number; dec: number; mag: number | null };
    /** On a page outside the explorer: the action turns the lines on and opens this link. */
    explorerHref?: string;
  };
  let { object, explorerHref }: Props = $props();

  let lastId = $state<string | null>(null);
  let conVertices = $state<number[] | null>(null);
  let namedStars = $state<NamedStar[]>([]);
  let sun = $state<SunEphemeris | null>(null);
  let hopNames = $state<Record<string, string>>({});
  // The latitude is the browser's: read only once mounted, so a prerendered page never bakes in
  // the build machine's time zone.
  let mounted = $state(false);
  onMount(() => (mounted = true));
  $effect(() => {
    if (object.id !== lastId) {
      lastId = object.id;
      conVertices = null;
      const forId = object.id;
      const con = object.con;
      void getConstellationLines()
        .then((all) => {
          if (object.id === forId) conVertices = figureVertices(all, con);
        })
        .catch(dataLoadFailed);
      if (namedStars.length === 0) {
        void getNamedStars()
          .then((s) => (namedStars = s))
          .catch(dataLoadFailed);
      }
      if (sun === null) {
        void getSunEphemeris()
          .then((s) => (sun = s))
          .catch(dataLoadFailed);
      }
    }
  });

  // The object's own direction from RA / Dec in the HYG frame: its scene x, y, z is a different frame.
  let skyDir = $derived(raDecToHyg(object.ra, object.dec));
  let hop = $derived(nearestNamedStar(skyDir, namedStars, 15));
  $effect(() => {
    const star = hop?.star;
    const locale = getLocale();
    if (!star) return;
    const key = `${locale}:${star.id}`;
    if (hopNames[key]) return;
    void getNamedStarI18n(locale, star.id)
      .then((o) => (hopNames = { ...hopNames, [key]: o?.name ?? star.proper }))
      .catch(() => (hopNames = { ...hopNames, [key]: star.proper }));
  });
  let hopName = $derived(hop ? (hopNames[`${getLocale()}:${hop.star.id}`] ?? hop.star.proper) : '');

  let skyFacts = $derived.by((): Fact[] => {
    const locale = getLocale();
    const month = (i: number) =>
      new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2001, i, 15)),
      );
    const lat = mounted ? viewerLatLon()?.latDeg : undefined;
    // Both rows read the object's position at the date of the Sun table (J2000 precessed).
    const eq = toDate(object.ra, object.dec);
    const months = lat !== undefined && sun ? bestMonths(eq.ra, eq.dec, lat, sun) : null;
    const alt = lat === undefined ? null : altitudeBand(maxAltitude(eq.dec, lat));
    const eye = eyeBand(object.mag);
    return [
      {
        label: m.star_label_constellation(),
        value: deepSkyConstellation(object.con),
        accent: true,
      },
      { label: m.sky_label_position(), value: `${formatRa(object.ra)} · ${formatDec(object.dec)}` },
      ...(hop
        ? [
            {
              label: m.sky_label_hop(),
              value: m.sky_hop_value({
                star: hopName,
                deg: hop.sepDeg.toLocaleString(locale, { maximumFractionDigits: 1 }),
              }),
            },
          ]
        : []),
      ...(months
        ? [
            {
              label: m.sky_label_best_months(),
              value:
                months.from === months.to
                  ? month(months.from)
                  : m.sky_months_range({ from: month(months.from), to: month(months.to) }),
              source: HORIZONS,
            },
          ]
        : []),
      ...(alt
        ? [
            {
              label: m.sky_label_altitude(),
              value:
                alt === 'high'
                  ? m.sky_alt_high()
                  : alt === 'low'
                    ? m.sky_alt_low()
                    : m.sky_alt_never(),
            },
          ]
        : []),
      ...(eye
        ? [
            {
              label: m.sky_label_eye(),
              value:
                eye === 'naked'
                  ? m.sky_eye_naked()
                  : eye === 'binoculars'
                    ? m.sky_eye_binoculars()
                    : m.sky_eye_telescope(),
            },
          ]
        : []),
    ];
  });
</script>

{#if conVertices}
  <div class="sky-finder">
    <ConstellationFinder
      vertices={conVertices}
      starXYZ={[skyDir[0], skyDir[1], skyDir[2]]}
      marker="object"
      label={deepSkyConstellation(object.con)}
      hop={hop ? { xyz: [hop.star.x, hop.star.y, hop.star.z], label: hopName } : undefined}
    />
    <p class="finder-caption">
      {m.star_finder_caption({ con: deepSkyConstellation(object.con) })}
    </p>
  </div>
{/if}
<UniverseFacts facts={skyFacts} />
{#if isZodiacConstellation(object.con)}
  <p class="editorial">{m.star_zodiac_note({ con: deepSkyConstellation(object.con) })}</p>
{/if}
<div class="ui-chip-group">
  {#if explorerHref}
    <Chip kind="link" href={explorerHref} onclick={showConstellationLines}
      >{m.star_show_constellations()}</Chip
    >
  {:else}
    <Chip kind="action" onclick={showConstellationLines}>{m.star_show_constellations()}</Chip>
  {/if}
</div>

<style>
  .sky-finder {
    margin-bottom: 12px;
  }
  .finder-caption {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-text-label);
    margin: 4px 0 0;
  }
</style>
