<!--
  DeepSkyPanel — detail panel for a deep-sky object in the /explore v2 immersive
  view (Slice 4). On the shared UniversePanelBody (B3): the object's photo as the hero
  (the same photo is the immersive main area), type / distance / telescope + the curated
  gallery caption, a link back to the /gallery/deep-sky wall, and — for star-forming
  regions — a "forming-system" gateway action into an exoplanet BodyScene. Gallery text is
  English-only (matching the #391 gallery); only the chrome is localized.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import Chip from './Chip.svelte';
  import type { DeepSkyObject, DeepSkyTextOverlay } from '$lib/data';
  import type { DeepSkyImage } from '$lib/deep-sky';
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import {
    deepSkyCategoryLabel,
    deepSkyConstellation,
    deepSkyDistance,
    deepSkyTitle,
  } from '$lib/explore/format';
  import { dataSourceItems, recordLinks, sourceLink } from '$lib/catalogue';
  import DataSources from './DataSources.svelte';
  import ConstellationFinder from './ConstellationFinder.svelte';
  import UniverseFacts, { type Fact } from './UniverseFacts.svelte';
  import {
    getConstellationLines,
    getNamedStars,
    getSunEphemeris,
    getNamedStarI18n,
    type NamedStar,
  } from '$lib/data';
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

  // The Sun table behind BEST MONTHS: a proper noun, never translated (like the Exoplanet Archive).
  const HORIZONS = { label: 'JPL Horizons', url: 'https://ssd.jpl.nasa.gov/horizons/' };

  type Props = {
    object: DeepSkyObject | null;
    image?: DeepSkyImage | undefined;
    /** The object's reviewed fact + bio in the reader's locale (null until loaded or when none exists). */
    overlay?: DeepSkyTextOverlay | null;
    galleryHref: string;
    open: boolean;
    onClose: () => void;
    /** Called when the forming-system gateway CTA is used (star-forming only). */
    onGateway?: (hostId: string) => void;
    /** Optional extra content — e.g. a culture door (#410: the Arecibo message
     *  was beamed at M13). */
    children?: Snippet;
  };
  let {
    object,
    image,
    overlay = null,
    galleryHref,
    open,
    onClose,
    onGateway,
    children,
  }: Props = $props();

  let categoryLabel = $derived(object ? deepSkyCategoryLabel(object.category) : '');
  let title = $derived(object ? deepSkyTitle(object) : '');
  let distance = $derived(
    object?.dist_ly != null ? deepSkyDistance(object.dist_ly, getLocale()) : object?.dist_label,
  );
  let distSrc = $derived(sourceLink(object?.catalogue?.dist_ly));
  let magSrc = $derived(sourceLink(object?.catalogue?.mag));
  let sources = $derived(
    dataSourceItems(object?.catalogue, (k) =>
      k === 'dist_ly'
        ? m.explore_ds_distance()
        : k === 'mag'
          ? `${m.star_label_apparent_mag()} (V)`
          : null,
    ),
  );
  let facts = $derived(
    object
      ? [
          ...(distance
            ? [
                {
                  label: m.explore_ds_distance(),
                  value: distance,
                  accent: true,
                  source: distSrc ?? undefined,
                },
              ]
            : []),
          ...(object.mag !== null && magSrc
            ? [
                {
                  label: `${m.star_label_apparent_mag()} (V)`,
                  value: object.mag.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                  source: magSrc,
                },
              ]
            : []),
          ...(image?.telescope
            ? [{ label: m.explore_ds_telescope(), value: image.telescope }]
            : []),
          ...(object.con
            ? [{ label: m.explore_ds_constellation(), value: deepSkyConstellation(object.con) }]
            : []),
        ]
      : [],
  );
  // IN THE SKY (L42, UXD-049): the figure of the object's constellation with the object ringed,
  // and rows computed from its own RA / Dec / magnitude, the JPL Horizons Sun and the reader's
  // latitude (src/lib/universe/sky-finder.ts).
  let lastId = $state<string | null>(null);
  let conVertices = $state<number[] | null>(null);
  let namedStars = $state<NamedStar[]>([]);
  let sun = $state<SunEphemeris | null>(null);
  let hopNames = $state<Record<string, string>>({});
  $effect(() => {
    if (object && object.id !== lastId) {
      lastId = object.id;
      conVertices = null;
      const forId = object.id;
      const con = object.con;
      void getConstellationLines()
        .then((all) => {
          if (object && object.id === forId) conVertices = figureVertices(all, con);
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
  let skyDir = $derived(object ? raDecToHyg(object.ra, object.dec) : null);
  let hop = $derived(skyDir ? nearestNamedStar(skyDir, namedStars, 15) : null);
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
    if (!object) return [];
    const locale = getLocale();
    const month = (i: number) =>
      new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2001, i, 15)),
      );
    const lat = viewerLatLon()?.latDeg;
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
      {
        label: m.sky_label_position(),
        value: `${formatRa(object.ra)} · ${formatDec(object.dec)}`,
      },
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

  let hero = $derived(
    object?.photoKey && image
      ? {
          src: `/images/deep-sky/${object.photoKey}.thumb.jpg`,
          full: `/images/deep-sky/${object.photoKey}.jpg`,
        }
      : null,
  );
</script>

<UniversePanelBody
  {open}
  {onClose}
  {title}
  entityId={object?.id ?? ''}
  {hero}
  kind={object ? `${categoryLabel} · ${object.designation}` : undefined}
  name={object ? title : undefined}
  lead={[overlay?.fact, overlay?.bio, image?.caption].filter((t): t is string => !!t)}
  {facts}
  idPrefix="deepsky"
  tabs={[{ id: 'sky', label: m.panel_tab_sky(), visible: !!object?.con }]}
>
  {#snippet tabContent(active)}
    {#if object && active === 'sky'}
      {#if conVertices && skyDir}
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
        <Chip kind="action" onclick={showConstellationLines}>{m.star_show_constellations()}</Chip>
      </div>
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if object?.gatewaySystem && onGateway}
      <Chip kind="action" onclick={() => onGateway?.(object.gatewaySystem!)}
        >{m.explore_ds_gateway()} →</Chip
      >
    {/if}
    {#if object}<Chip kind="link" href={galleryHref}>{m.explore_ds_gallery_link()} →</Chip>{/if}
  {/snippet}
  {#snippet extra()}
    {#if object}
      {#if object.gatewaySystem && onGateway}<p class="gateway-note">
          {m.explore_ds_gateway_note()}
        </p>{/if}
      <DataSources variant="panel" items={sources} links={recordLinks(object.records)} />
      {#if children}<div class="doors">{@render children()}</div>{/if}
    {/if}
  {/snippet}
</UniversePanelBody>

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
  .gateway-note {
    font-size: var(--size-meta);
    line-height: 1.4;
    color: var(--color-text-label);
    margin: 0 0 12px;
  }
</style>
