<!--
  Hidden tour anchors (PRD-016 §S11 / RFC-019 §12).

  Programmatic click targets for the audio-tour executor's `click`
  action — the narration says "Click Curiosity" and the executor
  clicks this offscreen button, which calls SurfaceScene's
  `__surfaceSceneSelectSite` window-hook to drive the canvas-only
  scene.

  Extracted 2026-06-17 from /moon, /mars, /earth — the three routes
  had a near-identical copy of this block (same wrapper div, same
  `tabindex="-1"`, same window-hook call) with only the data list
  differing. The host route now supplies the list as a prop:

    <TourAnchors route="moon" anchors={[
      { audio: 'apollo11', site: 'apollo11' },
      { audio: 'change4', site: 'change4' },
      …
    ]} />

  Aria-hidden + tabindex=-1 keep these out of the user-visible tab
  order and off the screen reader; CSS in src/lib/styles/app.css
  positions them offscreen. They're only ever click()ed
  programmatically.

  Why a 3-way conditional on route instead of one templated attribute:
  the audio-tour test (src/lib/audio-tour.test.ts) scans source files
  for the literal substring `data-audio-stage="moon-select-` (and
  `mars-select-`, `earth-select-`). With a single `{route}-select-…`
  template the literal disappears from the compiled source and the
  test goes red. The conditional keeps each literal in the file.
-->
<script lang="ts">
  type Anchor = { audio: string; site: string };
  interface Props {
    route: 'moon' | 'mars' | 'earth';
    anchors: ReadonlyArray<Anchor>;
  }
  let { route, anchors }: Props = $props();

  function selectSite(siteId: string): void {
    (
      window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
    ).__surfaceSceneSelectSite?.(siteId);
  }
</script>

<div class="tour-anchors" aria-hidden="true">
  {#each anchors as a (a.audio)}
    {#if route === 'moon'}
      <button
        type="button"
        data-audio-stage="moon-select-{a.audio}"
        tabindex="-1"
        onclick={() => selectSite(a.site)}>select {a.audio}</button
      >
    {:else if route === 'mars'}
      <button
        type="button"
        data-audio-stage="mars-select-{a.audio}"
        tabindex="-1"
        onclick={() => selectSite(a.site)}>select {a.audio}</button
      >
    {:else}
      <button
        type="button"
        data-audio-stage="earth-select-{a.audio}"
        tabindex="-1"
        onclick={() => selectSite(a.site)}>select {a.audio}</button
      >
    {/if}
  {/each}
</div>
