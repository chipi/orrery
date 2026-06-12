<!--
  Bridge that lets a page register a template-defined snippet as the
  Page tab content for the root-layout DebugPanel. Snippets defined in
  a page's template can't be read from <script> directly — passing the
  snippet through a child component's prop is the canonical Svelte 5
  workaround.

  Usage in a page:
    {#snippet pageDebugContent()} ... {/snippet}
    <DebugPanelRegistrar label="FLY" content={pageDebugContent} />

  Label-only (no Page tab, just header label):
    <DebugPanelRegistrar label="MARS" />
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { setPageDebugContent } from './debug-panel-context';

  let { label, content }: { label: string; content?: Snippet } = $props();

  $effect(() => {
    setPageDebugContent({ label, content: content ?? null });
    return () => setPageDebugContent({ label: '', content: null });
  });
</script>
