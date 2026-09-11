<!--
  The illustration register (G · #536 · T3) — the ONLY component that renders
  generated art, and it is structurally incapable of rendering kernel output:
  it takes a LabIllustration, not a FigureSpec, imports nothing from
  figure-style.ts, and mounts only in the Notebook's goal header (narrative
  chrome — never a card's figure slot). The on-image AI badge + credit
  caption were removed 2026-09-11 (operator: no other generated-art surface
  carries an in-UI note — /posters and anatomy disclose via /colophon +
  original-work.json, and the lab illustrations do the same). The share/print
  report card keeps its badge line; kernel figures stay unbadged and are
  distinguishable by register (computed frames), not by disclaimer.
-->
<script lang="ts">
  import { assetUrl } from '$lib/asset-url';
  import type { LabIllustration } from './illustration';

  type Props = {
    illustration: LabIllustration;
    t: (key: string, params?: Record<string, string | number>) => string;
  };
  let { illustration, t }: Props = $props();
</script>

<figure class="illus">
  <img
    class="illus__img"
    src={assetUrl(`/${illustration.file}`)}
    alt={t(illustration.altKey)}
    loading="lazy"
    decoding="async"
  />
</figure>

<style>
  .illus {
    margin: 0 0 1rem;
    display: grid;
    gap: 0.35rem;
  }
  .illus__img {
    width: 100%;
    height: auto;
    border-radius: 10px;
    display: block;
  }
  /* Mobile density (UX review): tighter lesson rhythm on small screens. */
  @media (max-width: 640px) {
    .illus {
      margin-bottom: 0.6rem;
      gap: 0.25rem;
    }
  }
</style>
