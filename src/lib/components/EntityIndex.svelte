<!--
  A–Z index of a hub's entity pages (0.9.8 SEO): a collapsed <details> whose
  links are in the prerendered HTML, so crawlers reach every /<hub>/<id> page
  from the hub. The links come from a server load (`getEntityIndex`), never
  from client JS. `floating` pins it to the bottom of a full-screen scene
  (/moon /mars /venus /explore); otherwise it sits at the foot of the page.
  On a phone the floating tab leaves the bottom edge (the HUD bar and the tab row
  own it) for a left-edge "A–Z" tab above the INDEX tab; the links stay in this
  same prerendered element, only the layout moves.
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
    <summary
      ><span class="ei-full">{title}</span><span class="ei-short" aria-hidden="true">A–Z</span
      ></summary
    >
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

  .ei-short {
    display: none;
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

  /* A window with a mouse that is narrower than the bottom row (PLANET SCALES card,
     time dock to 542 px, footer More button): the centred tab would sit under the
     dock, so it parks left of the footer's More button instead. */
  @media (max-width: 1450px) and (hover: hover) and (pointer: fine) {
    .entity-index.floating {
      inset-inline-start: auto;
      inset-inline-end: 80px;
      transform: none;
      width: auto;
    }
    .floating ul {
      inset-inline-start: auto;
      inset-inline-end: 0;
      transform: none;
    }
  }
  /* Wide window with a mouse: the footer strip is ~720 px wide at the right, so the
     centred tab would run into it; it sits just right of the time dock (542 px). */
  @media (min-width: 1451px) and (hover: hover) and (pointer: fine) {
    .entity-index.floating {
      inset-inline-start: 556px;
      transform: none;
    }
  }
  /* Below 700 px the short "A–Z" label keeps it clear of the dock (below 601 px
     the dock sits above the bottom row; 601-700 px lifts the tab over the dock). */
  @media (max-width: 700px) and (hover: hover) and (pointer: fine) {
    .floating .ei-full {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .floating .ei-short {
      display: inline;
    }
  }
  @media (min-width: 601px) and (max-width: 700px) and (hover: hover) and (pointer: fine) {
    .entity-index.floating {
      bottom: 70px;
    }
  }
  @media (max-width: 600px) and (hover: hover) and (pointer: fine) {
    .floating ul {
      position: fixed;
      inset-inline-start: 10px;
      inset-inline-end: 10px;
      bottom: 44px;
      width: auto;
    }
  }

  /* Phone: a left-edge pull tab just above the INDEX tab (--index-handle-top is
     published on <html> by the scene; 50 % where there is none), the list opening
     as a panel beside it. Out of the way of the bottom bar, the tab row and the
     time dock, under the detail panels (z 30). */
  @media (hover: none), (pointer: coarse) {
    .entity-index.floating {
      inset-inline-start: auto;
      left: 0;
      transform: none;
      bottom: calc(100% - var(--index-handle-top, 50%) + 48px);
      width: auto;
      max-width: none;
    }
    .floating .ei-full {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .floating .ei-short {
      display: inline;
    }
    .floating summary {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      padding: 12px 6px;
      min-height: 0;
      border-left: none;
      border-radius: 0 6px 6px 0;
      letter-spacing: 2px;
    }
    .floating ul {
      position: fixed;
      inset-inline-start: 40px;
      right: 8px;
      top: calc(var(--nav-height, 56px) + 56px);
      bottom: calc(64px + env(safe-area-inset-bottom, 0px));
      transform: none;
      width: auto;
      max-height: none;
    }
    /* The flat ground view and the panorama own the whole screen. */
    :global(html[data-surface-flat]) .entity-index.floating,
    :global(html[data-surface-panorama]) .entity-index.floating {
      display: none;
    }
  }
</style>
