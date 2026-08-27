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
  import { getDebugPanelContext, setPageDebugContent } from './debug-panel-context';

  let { label, content }: { label: string; content?: Snippet } = $props();

  // Capture the context at init — getContext MUST NOT run inside the
  // effect/teardown below (#466), which fires on unmount with no
  // component context and would throw lifecycle_outside_component.
  const debugCtx = getDebugPanelContext();

  $effect(() => {
    setPageDebugContent(debugCtx, { label, content: content ?? null });
    return () => setPageDebugContent(debugCtx, { label: '', content: null });
  });
</script>
