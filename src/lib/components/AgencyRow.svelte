<script lang="ts">
  /**
   * AgencyRow — the shared top-row treatment for every detail panel
   * (missions, fleet, station modules, surface sites, explore iconic).
   * Renders the agency badge + a slot for the trailing chips (status,
   * quality, regime…). Canonical styling lifted from MissionPanel so all
   * panels read identically. Badge text is the agency only — callers drop
   * any nation/extra prefix before passing it in.
   */
  import { agencyColor } from '$lib/agencies';
  import type { Snippet } from 'svelte';

  interface Props {
    agency: string | null | undefined;
    /** Badge background. Defaults to the agency's brand colour. */
    color?: string | null;
    /** Trailing chips: <span class="status …">, <span class="quality">, <RegimeChip /> … */
    children?: Snippet;
  }

  let { agency, color = null, children }: Props = $props();
  const bg = $derived(color ?? agencyColor(agency) ?? 'rgba(78, 205, 196, 0.16)');
</script>

<div class="agency-row">
  {#if agency}
    <span class="agency-badge" style:background-color={bg}>{agency}</span>
  {/if}
  {@render children?.()}
</div>

<style>
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  /* Badge + any slotted chip share the same Space Mono pill treatment. */
  .agency-badge,
  .agency-row :global(.status),
  .agency-row :global(.quality) {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
  }
  .agency-badge {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  /* width + style only — leave border-color to each panel's .status-* /
     inline tone so their overrides (lower specificity) still win. */
  .agency-row :global(.status) {
    border-width: 1px;
    border-style: solid;
  }
</style>
