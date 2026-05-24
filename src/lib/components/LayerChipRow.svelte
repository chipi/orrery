<!--
  Layer-toggle chip row for canvas routes (#42).

  Both /moon (3 chips: surface, orbiters, orbits) and /mars (4 chips:
  + traverses) inlined ~12 lines per chip × N chips. Generic config
  array binds chip state via accessor functions so each route owns
  its own `let layer* = $state()` declarations and the component
  reads/writes through the bindings.

  Caller wires per-chip data-testid + i18n tooltip; the component
  renders the button row + class:active + aria-pressed wiring.
-->
<script lang="ts">
  interface LayerChip {
    /** Test-id for Playwright (e.g. 'layer-surface'). */
    testid: string;
    /** Display label (already-resolved Paraglide message). */
    label: string;
    /** Tooltip (already-resolved Paraglide message). */
    title: string;
    /** Reactive state accessor. Used both for class:active + aria-pressed
     *  and for the toggle handler — caller provides getter + setter so the
     *  underlying $state stays in the route scope. */
    active: () => boolean;
    toggle: () => void;
    /** Optional visibility gate — when false, chip is not rendered. Default true. */
    visible?: boolean;
  }

  interface Props {
    chips: LayerChip[];
  }
  let { chips }: Props = $props();
</script>

{#each chips as chip (chip.testid)}
  {#if chip.visible !== false}
    <button
      type="button"
      class="chip"
      class:active={chip.active()}
      aria-pressed={chip.active()}
      onclick={chip.toggle}
      title={chip.title}
      data-testid={chip.testid}
    >
      {chip.label}
    </button>
  {/if}
{/each}
