<script lang="ts">
  /*
    Share stub (#547 S3) — carries the Open Graph card for crawlers and
    forwards humans straight into the app view. The visible content is a
    single link, for the no-JS case and as the crawl-able anchor.
  */
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  onMount(() => {
    void goto(`${base}${data.target}`, { replaceState: true });
  });
</script>

<svelte:head>
  <title>{data.title} · Orrery</title>
  <!-- noindex: 407 thin instant-redirect pages would read as soft-404s /
       duplicate content. Social scrapers (FB/X/Slack/iMessage) ignore robots
       meta, so link unfurls are unaffected. -->
  <meta name="robots" content="noindex" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Orrery" />
  <meta property="og:title" content={data.title} />
  <meta property="og:description" content={data.description} />
  <meta property="og:image" content={data.image} />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1440" />
  <meta property="og:url" content={data.pageUrl} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.title} />
  <meta name="twitter:description" content={data.description} />
  <meta name="twitter:image" content={data.image} />
</svelte:head>

<main class="stub">
  <a href="{base}{data.target}">{data.title} → Orrery</a>
</main>

<style>
  .stub {
    min-height: 60vh;
    display: grid;
    place-items: center;
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .stub a {
    color: rgba(255, 255, 255, 0.8);
  }
</style>
