<!--
  The one scale bar (UXD-021): a bar of constant pixel width with end ticks and the value it
  spans beside it. The caller passes the width from `scaleBarWidth()` and the label from
  `fixedScaleBar()`; the bar never changes length with the zoom, only the label does.
  `stacked` puts the label under the bar instead of beside it: the Explore strip's box is a fixed
  width that holds the bar OR the longest label (de "1.230 Lichtjahre" ~108 px), not both side by
  side.
-->
<script lang="ts">
  let {
    widthPx,
    label,
    stacked = false,
  }: { widthPx: number; label: string; stacked?: boolean } = $props();
</script>

<span class="scale-bar-row" class:stacked>
  <span class="scale-bar" data-testid="scale-bar" style:width="{widthPx}px"></span>
  <span class="scale-bar-label" data-testid="scale-bar-label">{label}</span>
</span>

<style>
  .scale-bar-row {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .scale-bar-row.stacked {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .scale-bar {
    flex: none;
    display: inline-block;
    height: 3px;
    background: rgba(255, 255, 255, 0.8);
    border-left: 1px solid rgba(255, 255, 255, 0.8);
    border-right: 1px solid rgba(255, 255, 255, 0.8);
    box-sizing: border-box;
  }
  .scale-bar-label {
    font-size: var(--size-label);
    color: rgba(255, 255, 255, 0.7);
    white-space: nowrap;
  }
</style>
