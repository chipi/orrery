<script lang="ts">
  import Panel from '$lib/components/Panel.svelte';
  let panelOpen = $state(false);
</script>

<svelte:head><title>Solar System Explorer · Orrery</title></svelte:head>

<section>
  <h1>Solar System Explorer</h1>
  <p>Placeholder · full screen lands in Slice 3 (PRD-001 / UXS-001).</p>
  <button class="demo-btn" onclick={() => (panelOpen = true)}>Open demo panel</button>
</section>

<Panel open={panelOpen} onClose={() => (panelOpen = false)} title="Demo Panel">
  <p>Right drawer on desktop (≥768px), bottom sheet on mobile (&lt;768px).</p>
  <p>Close: × button · Escape · swipe down on mobile.</p>
  <p style="opacity: 0.5; margin-top: 12px;">Removed in Slice 3 when the real explorer lands.</p>
</Panel>

<style>
  section {
    padding: 32px;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 32px;
    letter-spacing: 2px;
    margin-bottom: 8px;
  }
  p {
    color: var(--color-text-dim);
    margin-bottom: 12px;
  }
  .demo-btn {
    margin-top: 12px;
    padding: 10px 16px;
    min-height: 44px;
    background: rgba(68, 102, 255, 0.2);
    border: 1px solid rgba(68, 102, 255, 0.5);
    border-radius: var(--border-radius);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 2px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .demo-btn:hover {
    background: rgba(68, 102, 255, 0.3);
  }
</style>
