<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import SectionHub from '$lib/components/SectionHub.svelte';

  // Worlds hub (RFC-038 nav split) — the worlds you can stand on, home-first:
  // Earth, Moon, Mars, Venus. Primarily the TV (10-foot / D-pad) landing for the
  // WORLDS nav group, mirroring /explore/hub, /catalog, /learn. The roster is
  // exactly the bodies with a dedicated SurfaceScene route; it grows as new
  // surface scenes ship. Names are the nav labels; titles/descs reuse the shared
  // landing_card_* catalogue (localized to 14 locales).
  const cards = $derived([
    {
      route: '/earth',
      name: m.nav_earth(),
      title: m.landing_card_earth_title(),
      desc: m.landing_card_earth_desc(),
    },
    {
      route: '/moon',
      name: m.nav_moon(),
      title: m.landing_card_moon_title(),
      desc: m.landing_card_moon_desc(),
    },
    {
      route: '/mars',
      name: m.nav_mars(),
      title: m.landing_card_mars_title(),
      desc: m.landing_card_mars_desc(),
    },
    {
      route: '/venus',
      name: m.nav_venus(),
      title: m.landing_card_venus_title(),
      desc: m.landing_card_venus_desc(),
    },
  ]);
</script>

<svelte:head>
  <title>{m.nav_group_worlds()} · ORRERY</title>
</svelte:head>

<SectionHub
  heading={m.nav_group_worlds()}
  intro={m.worlds_hub_intro()}
  {cards}
  gridTestId="worlds-hub-cards"
  gridAudioStage="worlds-hub-grid"
/>
