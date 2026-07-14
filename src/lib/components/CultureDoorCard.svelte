<!--
  CultureDoorCard — a badged "culture door" story card (PRD-030 / RFC-032 S3).
  Attaches a fiction / message / visitor story to a real object, clearly badged so
  the story reads as a labelled layer over the science, never as fact (UXS-014).
  Localized blurb + non-translatable metadata come from getCultureDoors().
-->
<script lang="ts">
  import LearnLink from './LearnLink.svelte';
  import type { LocalizedCultureDoor } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = { door: LocalizedCultureDoor };
  let { door }: Props = $props();

  let badge = $derived(
    door.type === 'fiction'
      ? m.culture_badge_fiction()
      : door.type === 'visitor'
        ? m.culture_badge_visitor()
        : m.culture_badge_message(),
  );
</script>

<div class="culture-door cd-{door.type}">
  <div class="cd-head">
    <span class="cd-badge">{badge}</span>
    <span class="cd-work">{door.work}{door.year ? ` · ${door.year}` : ''}</span>
  </div>
  <div class="cd-meta">{door.author}{door.media ? ` · ${door.media}` : ''}</div>
  {#if door.blurb}<p class="cd-blurb">{door.blurb}</p>{/if}
  {#if door.links && door.links.length > 0}
    <ul class="cd-links">
      {#each door.links as l (l.u)}
        <li><LearnLink entityId={door.id} url={l.u} label={l.l} /></li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .culture-door {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-left: 3px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    padding: 10px 12px;
    margin: 0 0 10px;
    background: rgba(255, 255, 255, 0.03);
  }
  .cd-fiction {
    border-left-color: #c792ea;
  }
  .cd-message {
    border-left-color: #4ecdc4;
  }
  .cd-visitor {
    border-left-color: #ffc850;
  }
  .cd-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .cd-badge {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    flex: 0 0 auto;
  }
  .cd-fiction .cd-badge {
    background: rgba(199, 146, 234, 0.18);
    color: #c792ea;
  }
  .cd-message .cd-badge {
    background: rgba(78, 205, 196, 0.16);
    color: #4ecdc4;
  }
  .cd-visitor .cd-badge {
    background: rgba(255, 200, 80, 0.16);
    color: #ffc850;
  }
  .cd-work {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 17px;
    letter-spacing: 1px;
    color: var(--color-text);
  }
  .cd-meta {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 3px;
  }
  .cd-blurb {
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.82);
    margin: 8px 0 0;
  }
  .cd-links {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
  }
  .cd-links :global(a) {
    color: #4ecdc4;
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
  }
  .cd-links :global(a:hover) {
    text-decoration: underline;
  }
</style>
