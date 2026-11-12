<!--
  Layer-toggle chip row (#42, UXD-015): the one flat run of layer chips on /explore
  and every world (/earth /moon /mars /venus). No groups, no captions, no master
  switches; a route does not draw its own chip column.

  Generic config array binds chip state via accessor functions so each route owns
  its own `let layer* = $state()` declarations and the component reads/writes
  through the bindings.

  Caller wires per-chip data-testid + i18n tooltip; the component renders the
  <Chip> row (look: src/lib/styles/chip.css).
-->
<script lang="ts">
  import Chip from './Chip.svelte';

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
    /** Extra attributes passed to the chip (e.g. `data-audio-stage`). */
    attrs?: Record<string, string>;
  }

  interface Props {
    chips: LayerChip[];
  }
  let { chips }: Props = $props();
</script>

{#each chips as chip (chip.testid)}
  {#if chip.visible !== false}
    <Chip
      kind="toggle"
      active={chip.active()}
      onclick={chip.toggle}
      title={chip.title}
      data-testid={chip.testid}
      {...chip.attrs}
    >
      {typeof chip.label === 'function' ? chip.label() : chip.label}
    </Chip>
  {/if}
{/each}
