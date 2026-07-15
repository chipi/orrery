<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import SectionHub from '$lib/components/SectionHub.svelte';

  // Catalog hub — Programs first (national arcs), then Missions, then Fleet.
  // Mirrors the nav Catalog group order.
  const cards = $derived([
    {
      route: '/programs',
      name: m.nav_programs(),
      title: m.landing_card_programs_title(),
      desc: m.landing_card_programs_desc(),
    },
    {
      route: '/missions',
      name: m.nav_missions(),
      title: m.landing_card_missions_title(),
      desc: m.landing_card_missions_desc(),
    },
    {
      route: '/fleet',
      name: m.nav_fleet(),
      title: m.landing_card_fleet_title(),
      desc: m.landing_card_fleet_desc(),
    },
  ]);
</script>

<svelte:head>
  <title>{m.nav_catalog()} · ORRERY</title>
</svelte:head>

<SectionHub
  heading={m.nav_catalog()}
  intro={m.catalog_hub_intro()}
  {cards}
  gridTestId="catalog-hub-cards"
  gridAudioStage="catalog-hub-grid"
/>
