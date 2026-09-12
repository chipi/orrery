<script lang="ts">
  /*
    Card render stage (#547 S4) — one fleet entry's CollectibleCard for the
    Playwright generator (see /cards/mission/[id] for the pattern). Fleet
    entries that alias a mission (shared id) are NOT rendered here — the
    generator skips them; their canonical card is mission/<id>.
  */
  import { page } from '$app/state';
  import { getFleet, getFleetGallery, getFleetIndex } from '$lib/data';
  import { spacecraftDiagramPath, launcherCutawayPath } from '$lib/spacecraft-diagrams';
  import CollectibleCard from '$lib/cards/CollectibleCard.svelte';
  import { cardForFleet, type CardSpec } from '$lib/cards/card-spec';
  import { pickCardHero } from '$lib/cards/pick-card-hero';

  let spec = $state<CardSpec | null>(null);
  let ready = $state(false);
  let failed = $state(false);

  $effect(() => {
    const id = page.params.id;
    if (!id) return;
    void (async () => {
      try {
        const index = await getFleetIndex();
        const row = index.find((fi) => fi.id === id);
        if (!row) {
          failed = true;
          return;
        }
        const [entry, gallery] = await Promise.all([
          getFleet(id, row.category),
          getFleetGallery(id).catch(() => [] as string[]),
        ]);
        if (!entry) {
          failed = true;
          return;
        }
        const s = cardForFleet(
          entry,
          index,
          await pickCardHero(gallery),
          spacecraftDiagramPath(id) ?? launcherCutawayPath(id) ?? undefined,
        );
        // Decode the hero before declaring ready (screenshot fidelity).
        if (s.heroUrl) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = s.heroUrl!;
          });
        }
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
