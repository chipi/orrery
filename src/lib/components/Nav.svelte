<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import type { Snippet } from 'svelte';

  type Props = { right?: Snippet };
  let { right }: Props = $props();

  const links = [
    { href: `${base}/moon`, label: m.nav_moon() },
    { href: `${base}/explore`, label: m.nav_explore() },
    { href: `${base}/plan`, label: m.nav_plan() },
    { href: `${base}/fly`, label: m.nav_fly() },
    { href: `${base}/missions`, label: m.nav_missions() },
    { href: `${base}/earth`, label: m.nav_earth() },
  ];

  function isActive(href: string, pathname: string): boolean {
    return pathname === href || pathname.startsWith(href + '/');
  }
</script>

<nav>
  <div class="left">
    <span class="wordmark">ORRERY</span>
    <span class="subtitle">{m.nav_subtitle()}</span>
  </div>

  <div class="center">
    {#each links as { href, label } (href)}
      <a {href} class="link" class:active={isActive(href, $page.url.pathname)}>{label}</a>
    {/each}
  </div>

  <div class="right">
    {@render right?.()}
  </div>
</nav>

<style>
  nav {
    position: sticky;
    top: 0;
    z-index: 20;
    height: var(--nav-height);
    background: var(--color-nav-bg);
    border-bottom: 1px solid var(--color-border);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
  }

  .left {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-shrink: 0;
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: var(--size-nav-title);
    letter-spacing: 4px;
    color: var(--color-text);
  }

  .subtitle {
    font-size: var(--size-label);
    color: rgba(255, 255, 255, 0.22);
    letter-spacing: 2px;
  }

  .center {
    display: flex;
    gap: 3px;
    align-items: center;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .center::-webkit-scrollbar {
    display: none;
  }

  .link {
    padding: 5px 12px;
    font-size: var(--size-link);
    letter-spacing: 2px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.28);
    text-decoration: none;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .link:hover {
    color: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .link.active {
    color: var(--color-text);
    background: rgba(68, 102, 255, 0.28);
    border-color: rgba(68, 102, 255, 0.55);
  }

  .right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }

  /* Mobile: 44px touch targets per ADR-018, hide subtitle on narrow screens */
  @media (max-width: 768px) {
    .link {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
  }

  @media (max-width: 500px) {
    nav {
      padding: 0 12px;
    }
    .subtitle {
      display: none;
    }
  }
</style>
