<script lang="ts">
  /*
    Card render stage (#547). Resolves ONE entity's CollectibleCard for the
    Playwright generator: it navigates here, waits for `data-card-ready`,
    screenshots `.card`, writes the JPEG that serves as both the Share-card
    file and the og:image. Kinds map 1:1 to the resolvers in card-spec —
    aliased duplicates (fleet/site entries that ARE missions) are never
    requested here; the generator enumerates canonical cards only.

    Ready gating: the spec must be resolved AND the hero + figure images
    decoded — a screenshot before decode ships a black hero or a half-
    rendered trajectory/anatomy figure (sputnik1's trajectory raced on the
    2026-09-12 hero pass).
  */
  import { page } from '$app/state';
  import { getMission, getMissionIndex } from '$lib/data/missions';
  import {
    getMissionGallery,
    getFleet,
    getFleetGallery,
    getFleetIndex,
    getMoonSites,
    getMarsSites,
    getMoonSiteGallery,
    getMarsSiteGallery,
    getPlanets,
    getPlanetGallery,
    getSatellites,
    getSatelliteGallery,
    getSatelliteI18n,
    getSmallBodyGallery,
    getSmallBodyI18n,
  } from '$lib/data';
  import smallBodiesData from '$data/small-bodies.json';
  import { spacecraftDiagramPath, launcherCutawayPath } from '$lib/spacecraft-diagrams';
  import CollectibleCard from '$lib/cards/CollectibleCard.svelte';
  import {
    cardForFleet,
    cardForMission,
    cardForPlanet,
    cardForSatellite,
    cardForSite,
    cardForSmallBody,
    type CardSpec,
    type SmallBodyLike,
  } from '$lib/cards/card-spec';

  let spec = $state<CardSpec | null>(null);
  let ready = $state(false);
  let failed = $state(false);

  async function resolve(kind: string, id: string): Promise<CardSpec | null> {
    if (kind === 'mission') {
      const index = await getMissionIndex();
      const entry = index.find((mi) => mi.id === id);
      if (!entry) return null;
      const [mission, gallery] = await Promise.all([
        getMission(id, entry.dest),
        getMissionGallery(id).catch(() => [] as string[]),
      ]);
      if (!mission) return null;
      return cardForMission(mission, index, gallery[0]);
    }
    if (kind === 'fleet') {
      const index = await getFleetIndex();
      const row = index.find((fi) => fi.id === id);
      if (!row) return null;
      const [entry, gallery] = await Promise.all([
        getFleet(id, row.category),
        getFleetGallery(id).catch(() => [] as string[]),
      ]);
      if (!entry) return null;
      return cardForFleet(
        entry,
        index,
        gallery[0],
        spacecraftDiagramPath(id) ?? launcherCutawayPath(id) ?? undefined,
      );
    }
    if (kind === 'moon-site' || kind === 'mars-site') {
      const body = kind === 'moon-site' ? 'moon' : 'mars';
      const sites = body === 'moon' ? await getMoonSites('en-US') : await getMarsSites('en-US');
      const site = sites.find((s) => s.id === id);
      if (!site) return null;
      const gallery = await (
        body === 'moon'
          ? getMoonSiteGallery(id, site.mission_id)
          : getMarsSiteGallery(id, site.mission_id)
      ).catch(() => [] as string[]);
      return cardForSite(site, sites, body, gallery[0]);
    }
    if (kind === 'planet') {
      const planets = await getPlanets('en-US');
      const planet = planets.find((p) => p.id === id);
      if (!planet) return null;
      const gallery = await getPlanetGallery(id).catch(() => [] as string[]);
      return cardForPlanet(planet, planets, gallery[0]);
    }
    if (kind === 'moon') {
      const satellites = await getSatellites();
      const sat = satellites.find((s) => s.id === id);
      if (!sat) return null;
      const [gallery, i18n] = await Promise.all([
        getSatelliteGallery(id).catch(() => [] as string[]),
        getSatelliteI18n('en-US', id).catch(() => null),
      ]);
      const entry = i18n ? { ...sat, description: i18n.description ?? sat.description } : sat;
      return cardForSatellite(entry, satellites, gallery[0]);
    }
    if (kind === 'small-body') {
      const bodies = smallBodiesData.bodies as SmallBodyLike[];
      const body = bodies.find((b) => b.id === id);
      if (!body) return null;
      const [gallery, i18n] = await Promise.all([
        getSmallBodyGallery(id).catch(() => [] as string[]),
        getSmallBodyI18n('en-US', id).catch(() => null),
      ]);
      const entry = i18n ? { ...body, description: i18n.description ?? body.description } : body;
      return cardForSmallBody(entry, bodies, gallery[0]);
    }
    return null;
  }

  $effect(() => {
    const { kind, id } = page.params;
    if (!kind || !id) return;
    void (async () => {
      try {
        const s = await resolve(kind, id);
        if (!s) {
          failed = true;
          return;
        }
        // Decode hero + figure before declaring ready (screenshot fidelity).
        const decode = (url: string) =>
          new Promise<void>((resolveDecode) => {
            const img = new Image();
            img.onload = () => resolveDecode();
            img.onerror = () => resolveDecode();
            img.src = url;
          });
        await Promise.all([s.heroUrl, s.figureUrl].filter(Boolean).map((u) => decode(u!)));
        spec = s;
        ready = true;
      } catch {
        failed = true;
      }
    })();
  });
</script>

<svelte:head>
  <title>Card · Orrery</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="stage" data-card-ready={ready} data-card-failed={failed}>
  {#if spec}
    <CollectibleCard {spec} />
  {/if}
</div>

<style>
  .stage {
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #000;
    padding: 24px;
  }
</style>
