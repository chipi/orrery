<script lang="ts">
  /*
    Card render stage (#547 S2). Renders ONE mission's CollectibleCard on a
    bare page for the Playwright generator: it navigates here, waits for
    `data-card-ready`, screenshots `.card`, writes the PNG that serves as
    both the Share-card file and the og:image (S3).

    Ready gating: the spec must be resolved AND the hero image decoded —
    a screenshot before decode would ship a card with a black hero.
  */
  import { page } from '$app/state';
  import { getMission, getMissionIndex } from '$lib/data/missions';
  import { getMissionGallery } from '$lib/data';
  import CollectibleCard from '$lib/cards/CollectibleCard.svelte';
  import { cardForMission, type CardSpec } from '$lib/cards/card-spec';
  import { pickCardHero } from '$lib/cards/pick-card-hero';

  let spec = $state<CardSpec | null>(null);
  let ready = $state(false);
  let failed = $state(false);

  $effect(() => {
    const id = page.params.id;
    if (!id) return;
    void (async () => {
      try {
        const index = await getMissionIndex();
        const entry = index.find((mi) => mi.id === id);
        if (!entry) {
          failed = true;
          return;
        }
        const [mission, gallery] = await Promise.all([
          getMission(id, entry.dest),
          getMissionGallery(id).catch(() => [] as string[]),
        ]);
        if (!mission) {
          failed = true;
          return;
        }
        const s = cardForMission(mission, index, await pickCardHero(gallery));
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
