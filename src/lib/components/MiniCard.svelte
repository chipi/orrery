<!--
  MiniCard — a 176 px link card: a 16:9 hero, a one-line kind label, a title, one meta line
  (E1, UXD-032). The programs index card reduced for a CardRail: same border, radius and hover edge,
  no tagline. The hero is decorative (the title is beside it). `hero` is a root-relative path.
-->
<script lang="ts">
  import { responsive } from '$lib/responsive-image.svelte';
  import { assetUrl } from '$lib/asset-url';
  import { IMAGE_SIZES } from '$lib/image-sizes';

  interface Props {
    href: string;
    hero: string | null;
    kind: string;
    title: string;
    meta?: string | null;
  }
  let { href, hero, kind, title, meta = null }: Props = $props();
</script>

<a class="mini-card" {href}>
  {#if hero}
    <img
      class="mc-hero"
      {...responsive(assetUrl(hero), IMAGE_SIZES.miniCard)}
      alt=""
      loading="lazy"
      decoding="async"
    />
  {:else}
    <span class="mc-hero mc-none" aria-hidden="true"></span>
  {/if}
  <span class="mc-kind">{kind}</span>
  <span class="mc-title" {title}>{title}</span>
  {#if meta}<span class="mc-meta">{meta}</span>{/if}
</a>

<style>
  .mini-card {
    display: flex;
    flex-direction: column;
    width: 176px;
    text-decoration: none;
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    padding-bottom: 10px;
    background: rgba(255, 255, 255, 0.02);
    transition: border-color 0.15s;
  }
  .mini-card:hover,
  .mini-card:focus-visible {
    border-color: rgba(127, 176, 224, 0.5);
  }
  .mc-hero {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    display: block;
  }
  .mc-none {
    background: rgba(255, 255, 255, 0.04);
  }
  .mc-kind,
  .mc-meta {
    display: block;
    padding: 0 10px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-text-label);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .mc-kind {
    margin-top: 9px;
  }
  .mc-title {
    display: block;
    padding: 2px 10px 0;
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 20px;
    letter-spacing: 1px;
    line-height: 1.2;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .mc-meta {
    margin-top: 2px;
  }
</style>
