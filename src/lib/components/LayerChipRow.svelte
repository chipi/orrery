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
    /** Optional disabled gate — when the accessor returns true, the chip
     *  renders dimmed and ignores clicks. Used for sub-toggles that are
     *  gated by a master toggle (e.g. Earth's STATIONS / OBSERVATORIES /
     *  CONSTELLATIONS / COMSATS / MOON ORBITERS sub-chips are inert when
     *  the master ORBITERS chip is off). Read each render for reactivity. */
    disabled?: () => boolean;
  }

  interface Props {
    chips: LayerChip[];
  }
  let { chips }: Props = $props();
</script>

{#each chips as chip (chip.testid)}
  {#if chip.visible !== false}
    {@const isDisabled = chip.disabled?.() ?? false}
    <button
      type="button"
      class="chip"
      class:active={chip.active()}
      class:disabled={isDisabled}
      aria-pressed={chip.active()}
      aria-disabled={isDisabled || undefined}
      disabled={isDisabled}
      onclick={chip.toggle}
      title={chip.title}
      data-testid={chip.testid}
    >
      {chip.label}
    </button>
  {/if}
{/each}

<style>
  /* Sub-chip dimming when its master is off. The native :disabled
     state on the button drops pointer events automatically; the class
     hook just adds the visual cue so the user sees "I can't act here
     yet" rather than "this chip is broken" (2026-06-15 user note:
     "grayed out solution please and disable in UI"). */
  .chip:disabled,
  .chip.disabled {
    opacity: 0.42;
    cursor: not-allowed;
    pointer-events: none;
  }
</style>
