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
    /** Display label. Either a static string OR an accessor for
     *  cycling chips whose label updates with state (e.g. /earth's
     *  unified SURFACE chip cycles AUTO/HIGH/LOW/OFF). When supplied
     *  as a function it's called each render so the label tracks the
     *  underlying state reactively. */
    label: string | (() => string);
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
    /** Render as a group header (section label + master switch for the
     *  chips that follow it), e.g. /earth's ON EARTH / IN SPACE. */
    header?: boolean;
  }

  interface Props {
    chips: LayerChip[];
  }
  let { chips }: Props = $props();
</script>

{#each chips as chip (chip.testid)}
  {#if chip.visible !== false && chip.header}
    <button
      type="button"
      class="chip-group"
      class:active={chip.active()}
      aria-pressed={chip.active()}
      onclick={chip.toggle}
      title={chip.title}
      data-testid={chip.testid}
    >
      <span class="dot" aria-hidden="true"></span>
      <span class="group-label">{typeof chip.label === 'function' ? chip.label() : chip.label}</span
      >
    </button>
  {:else if chip.visible !== false}
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
      {typeof chip.label === 'function' ? chip.label() : chip.label}
    </button>
  {/if}
{/each}

<style>
  /* Group header: a quiet section label with a hairline rule, not a pill.
     The dot is filled when the group is on. Full row width so it starts a
     new line in the wrapped mobile row as well as the desktop column. */
  .chip-group {
    flex-basis: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    margin-top: 6px;
    padding: 0 4px;
    background: none;
    border: 0;
    color: rgba(255, 255, 255, 0.72);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9.5px;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-align: left;
    cursor: pointer;
    pointer-events: auto;
  }
  .chip-group::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.16);
  }
  .chip-group .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    border: 1px solid var(--body-tint, #4ecdc4);
  }
  .chip-group.active .dot {
    background: var(--body-tint, #4ecdc4);
  }
  .chip-group:not(.active) {
    color: rgba(255, 255, 255, 0.45);
  }
  .chip-group:hover,
  .chip-group:focus-visible {
    color: #fff;
  }
  .chip-group:focus-visible {
    outline: 1px solid var(--body-tint, #4ecdc4);
    outline-offset: 2px;
  }
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
