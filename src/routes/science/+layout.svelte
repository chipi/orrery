<!--
  /science layout — imports KaTeX CSS once for the entire route tree
  (ADR-034). All section pages render KaTeX-compiled HTML; the CSS
  here ensures the math glyphs display correctly.
-->
<script lang="ts">
  import 'katex/dist/katex.min.css';
  import type { Snippet } from 'svelte';
  type Props = { children: Snippet };
  let { children }: Props = $props();
</script>

<div class="science-root">
  {@render children?.()}
</div>

<style>
  .science-root {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow-y: auto;
    background: var(--color-bg);
    color: var(--color-text);
    -webkit-overflow-scrolling: touch;
  }
</style>
