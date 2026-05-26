<!--
  Sr-only live-region overlay for panorama (ground-view) mode (#42).

  The visible exit affordance is rendered separately by the detail
  panel's Stand-at-site slot (2026-05-21 feedback). This overlay only
  exists for screen reader users — the `role="region"` + aria-live
  label announces panorama entry, and the sr-only span describes the
  scene + how to exit.

  Per-route sr-only text differs ("on Mars" qualifier, ESC vs button
  wording) — pass it via the `description` prop.
-->
<script lang="ts">
  interface Props {
    active: boolean;
    description: string;
  }
  let { active, description }: Props = $props();
</script>

{#if active}
  <div
    class="panorama-overlay"
    role="region"
    aria-label="Ground-view panorama mode — press ESC to return to orbit"
    data-testid="panorama-overlay"
  >
    <span class="po-sr">{description}</span>
  </div>
{/if}

<style>
  .panorama-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
  }
  .po-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
