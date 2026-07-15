<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import SectionHub from '$lib/components/SectionHub.svelte';

  // Learn hub — The Long View essays first, then the Science encyclopedia.
  // Mirrors the nav Learn group order (essays before science).
  const cards = $derived([
    {
      route: '/essays',
      name: m.nav_essays(),
      title: m.landing_card_essays_title(),
      desc: m.landing_card_essays_desc(),
    },
    {
      route: '/science',
      name: m.nav_science(),
      title: m.landing_card_science_title(),
      desc: m.landing_card_science_desc(),
    },
  ]);
</script>

<svelte:head>
  <title>{m.nav_learn()} · ORRERY</title>
</svelte:head>

<SectionHub
  heading={m.nav_learn()}
  intro={m.learn_hub_intro()}
  {cards}
  gridTestId="learn-hub-cards"
  gridAudioStage="learn-hub-grid"
/>
