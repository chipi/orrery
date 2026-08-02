<!--
  Hover-label overlay for 3D-canvas routes (#57).

  Replaces the 4-state-var + 7-line div + matching CSS block that
  /iss + /tiangong both carry identically. /moon + /mars currently
  use a different hover surface (DOM tooltips on markers) so this
  isn't their pattern, but they could adopt it later.

  Usage:
    <HoverLabel bind:this={hover} />
    // in raycaster:
    hover.show(text, screenX, screenY);
    // ...or...
    hover.hide();
-->
<script lang="ts">
  let text = $state('');
  let visible = $state(false);
  let left = $state(0);
  let top = $state(0);

  interface Props {
    /** When true, hides the label regardless of `show()` state.
     *  Used by /iss + /tiangong to hide the label outside 3D viewMode. */
    suppressed?: boolean;
  }
  let { suppressed = false }: Props = $props();

  export function show(t: string, x: number, y: number): void {
    text = t;
    left = x;
    top = y;
    visible = true;
  }
  export function hide(): void {
    visible = false;
  }
</script>

<div
  class="hover-label"
  class:hidden={!visible || suppressed}
  style="left: {left}px; top: {top}px"
  aria-hidden="true"
>
  {text}
</div>

<style>
  /* Visual matches the pre-extraction styles in /iss + /tiangong
     verbatim — the canonical reference. */
  .hover-label {
    position: absolute;
    z-index: 5;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 12px));
    padding: 4px 8px;
    background: rgba(8, 10, 22, 0.85);
    border: 1px solid rgba(78, 205, 196, 0.5);
    border-radius: 4px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: #4ecdc4;
    white-space: nowrap;
    text-transform: uppercase;
    backdrop-filter: blur(4px);
  }
  .hover-label.hidden {
    display: none;
  }
</style>
