<!--
  The welcome hint (E1 on /explore, W1 on the four Worlds, UXD-027): one line near the bottom
  centre that invites the viewer to zoom in and look around. The same component on both; the
  caller passes its own wording. It goes after the first wheel turn, pinch, drag or tap on the canvas,
  when closed, or after twelve seconds, and is not remembered (`hint-state.ts`). A polite status
  region; the fade is a CSS transition, so reduced motion (the global catch-all) cuts it.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { dismissesHint, HINT_TIMEOUT_MS, type HintEvent } from '$lib/hint-state';

  let {
    text,
    testid = 'explore-hint',
    topOnTouch = false,
  }: {
    text: string;
    testid?: string;
    /** Hang under the top row on a touch screen instead of above the bottom edge. */
    topOnTouch?: boolean;
  } = $props();

  let leaving = $state(false);
  let gone = $state(false);

  function dismiss(e: HintEvent) {
    if (gone || leaving || !dismissesHint(e)) return;
    leaving = true;
    setTimeout(() => (gone = true), 300);
  }

  onMount(() => {
    const started = performance.now();
    const timer = setTimeout(
      () => dismiss({ type: 'timeout', elapsedMs: performance.now() - started }),
      HINT_TIMEOUT_MS,
    );
    const onCanvas = (e: Event) => e.target instanceof HTMLCanvasElement;
    const pointers = new Map<number, { x: number; y: number }>();
    const onWheel = (e: WheelEvent) => {
      if (onCanvas(e)) dismiss({ type: 'wheel' });
    };
    const onDown = (e: PointerEvent) => {
      if (!onCanvas(e)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1) dismiss({ type: 'pinch' });
    };
    const onMove = (e: PointerEvent) => {
      const from = pointers.get(e.pointerId);
      if (from)
        dismiss({ type: 'drag', travelPx: Math.hypot(e.clientX - from.x, e.clientY - from.y) });
    };
    const onUp = (e: PointerEvent) => void pointers.delete(e.pointerId);
    const onClick = (e: MouseEvent) => {
      if (onCanvas(e)) dismiss({ type: 'tap' });
    };
    window.addEventListener('wheel', onWheel, { capture: true, passive: true });
    window.addEventListener('click', onClick, true);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };
  });
</script>

{#if !gone}
  <div
    class="hint"
    class:leaving
    class:top-on-touch={topOnTouch}
    role="status"
    aria-live="polite"
    data-testid={testid}
  >
    <span class="text">{text}</span>
    <button
      type="button"
      class="close ui-hit"
      aria-label={m.explore_anon_dismiss()}
      data-testid="{testid}-close"
      onclick={() => dismiss({ type: 'close' })}
    >
      <span aria-hidden="true">×</span>
    </button>
  </div>
{/if}

<style>
  .hint {
    position: absolute;
    left: 0;
    right: 0;
    margin-inline: auto;
    inline-size: max-content;
    bottom: var(--hint-bottom, 64px);
    z-index: 6;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 10px;
    max-inline-size: calc(100% - 32px);
    padding: 5px 6px 5px 12px;
    background: rgba(8, 10, 22, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(6px);
    opacity: 1;
    transition: opacity 300ms ease;
    pointer-events: none;
  }
  .hint.leaving {
    opacity: 0;
  }
  .text {
    min-inline-size: 0;
  }
  .close {
    flex: none;
    inline-size: 24px;
    block-size: 24px;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.7);
    font: inherit;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    pointer-events: auto;
  }
  .close:hover,
  .close:focus-visible {
    color: #889fe7;
    background: rgba(136, 159, 231, 0.1);
  }
  .close:focus-visible {
    outline: 2px solid #889fe7;
    outline-offset: -2px;
  }
  /* A small window with a mouse has no free bottom edge either (ruler, time dock, scale strip):
     the hint hangs left-aligned in the upper part of the scene, 48 px in (clear of the INDEX tab)
     and, where the scale strip sits at the right edge (600 px and wider), ending before it. */
  @media (hover: hover) and (pointer: fine) and ((max-width: 899px) or (max-height: 559px)) {
    .hint {
      bottom: auto;
      top: 40%;
      left: 48px;
      right: auto;
      margin-inline: 0;
      max-inline-size: calc(100% - 96px);
    }
  }
  @media (hover: hover) and (pointer: fine) and (min-width: 600px) and ((max-width: 899px) or (max-height: 559px)) {
    .hint {
      max-inline-size: calc(100% - 300px);
    }
  }
  @media (hover: none), (pointer: coarse) {
    .close::after {
      width: 44px;
      height: 44px;
    }
    /* On a touch screen the bottom edge is the scale strip, the time dock and the tab row: the
       hint hangs under the top row instead (and under the level card's header). */
    .hint.top-on-touch {
      bottom: auto;
      top: var(--hint-top-touch, 110px);
    }
  }
</style>
