<!--
  A–Z index of a hub's entity pages (0.9.8 SEO): a collapsed <details> at the foot of
  /missions and /fleet whose links are in the prerendered HTML, so crawlers reach every
  /<hub>/<id> page from the hub. The links come from a server load (`getEntityIndex`),
  never from client JS. The scene routes (/moon /mars /venus /explore) have no page foot:
  their INDEX panel carries these links instead (SurfaceIndexPanel, ScaleIndex).
-->
<script lang="ts">
  import { localHref } from '$lib/locale';

  let {
    hub,
    title,
    links,
  }: {
    hub: string;
    title: string;
    links: { id: string; name: string }[];
  } = $props();
</script>

{#if links.length > 0}
  <details class="entity-index" data-testid="entity-index-{hub}">
    <summary>{title}</summary>
    <ul>
      {#each links as link (link.id)}
        <li><a href={localHref(`/${hub}/${link.id}`)}>{link.name}</a></li>
      {/each}
    </ul>
  </details>
{/if}

<style>
  .entity-index {
    margin: 28px auto 0;
    max-width: 1400px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.4px;
    color: rgba(255, 255, 255, 0.6);
  }
  summary {
    cursor: pointer;
    padding: 6px 0;
    min-height: 32px;
    display: flex;
    align-items: center;
  }
  summary:hover,
  summary:focus-visible {
    color: var(--color-state);
    outline: none;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 8px 0 12px;
    columns: 2;
    column-gap: 16px;
  }
  li {
    break-inside: avoid;
  }
  a {
    display: block;
    padding: 5px 0;
    color: inherit;
    text-decoration: none;
  }
  a:hover,
  a:focus-visible {
    color: var(--color-accent);
    outline: none;
  }
  @media (min-width: 640px) {
    ul {
      columns: 3;
    }
  }
  @media (min-width: 1024px) {
    ul {
      columns: 5;
    }
  }
</style>
