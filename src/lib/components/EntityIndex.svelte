<!--
  A–Z index of a hub's entity pages (0.9.8 SEO): a collapsed <details> whose
  links are in the prerendered HTML, so crawlers reach every /<hub>/<id> page
  from the hub. The links come from a server load (`getEntityIndex`), never
  from client JS. `floating` pins it to the bottom of a full-screen scene
  (/moon /mars /venus /explore); otherwise it sits at the foot of the page.
-->
<script lang="ts">
  import { localHref } from '$lib/locale';

  let {
    hub,
    title,
    links,
    floating = false,
  }: {
    hub: string;
    title: string;
    links: { id: string; name: string }[];
    floating?: boolean;
  } = $props();
</script>

{#if links.length > 0}
  <details class="entity-index" class:floating data-testid="entity-index-{hub}">
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
    color: #4ecdc4;
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
    color: #4ecdc4;
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

  /* Full-screen scenes have no page foot: a small tab at the bottom edge that
     opens upward, below the detail panels (z 30) so it never covers one. */
  .entity-index.floating {
    position: fixed;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    bottom: max(6px, env(safe-area-inset-bottom));
    z-index: 29;
    margin: 0;
    width: max-content;
    max-width: calc(100vw - 20px);
  }
  .floating summary {
    padding: 4px 10px;
    min-height: 28px;
    background: rgba(4, 4, 12, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .floating ul {
    position: absolute;
    bottom: calc(100% + 4px);
    inset-inline-start: 50%;
    transform: translateX(-50%);
    width: min(92vw, 560px);
    max-height: 50vh;
    overflow-y: auto;
    padding: 8px 12px;
    background: rgba(4, 4, 12, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    columns: 2;
  }
</style>
