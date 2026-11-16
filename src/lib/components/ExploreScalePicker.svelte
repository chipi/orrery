<!--
  #258 / #45 — the /explore scale picker: a quick-jump between the eight nested
  scale shells (Solar System → Stellar Neighbourhood → Milky Way → Local Group →
  … → Cosmic Web) that the scene already crosses via wheel/pinch. Each rung drives
  the host's `contextDeepLinkFn`, which walks OUT or IN the shell ladder (see
  `scale-shell-controller` · `planShellJump`).

  #45 promoted this into the top scale-navigator: on EVERY viewport it renders as
  one chip (`<level glyph> <current shell> ▾`) that opens the ladder as a popover
  DOWNWARD and auto-closes on pick. It replaced the old always-on desktop rail
  (the breadcrumb was retired earlier) — the chip is the single "where am I + jump to
  any scale" control, flanked by the host's back/reset affordances. The parent
  positions it (this component is layout-neutral: `position: relative`).

  C8 (UXD-027): the levels come from `SCALE_SHELLS`; the chip and every rung lead with the
  level's glyph (`ScaleGlyphIcon`, the one the home grid and hub draw), and a rung adds the
  home-grid line under its name where there is a pointer to read it with.

  The caller hides this entirely during full-screen sub-views (body-scene /
  black-hole / deep-sky) — `contextDeepLinkFn` only knows the shells, not those
  takeovers, so the ladder is only meaningful in a shell context.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';
  import ScaleGlyphIcon from './ScaleGlyphIcon.svelte';
  import type { ShellId } from '$lib/explore/scale-shell-controller';
  import { SCALE_SHELLS, SCALE_SHELL_LIST } from '$lib/explore/scale-shells';

  let {
    activeShell,
    onJump,
    disabled = false,
    align = 'left',
  }: {
    activeShell: ShellId;
    /** Jump to a shell; a no-op walk (same shell) is handled upstream. */
    onJump: (shell: ShellId) => void;
    /** True until the host has wired `contextDeepLinkFn` (scene not ready). */
    disabled?: boolean;
    /** The screen edge the ladder lines up with: `right` opens it leftward from a chip that
     *  sits flush right (the solar system), so it cannot pass the edge. Physical, not
     *  logical: the navigator's flush-right is `right: 8px` in every direction, so in RTL a
     *  logical `end` would put the ladder past the right edge instead of away from it. */
    align?: 'left' | 'right';
  } = $props();

  // Top-to-bottom the rail reads outermost → innermost, so "zoom out" is "up".
  const rungs = [...SCALE_SHELL_LIST].reverse();
  const uid = $props.id();

  // Mobile popover open state; ignored on desktop (the rail is always shown).
  let open = $state(false);

  function pick(shell: ShellId) {
    open = false;
    if (shell === activeShell) return;
    onJump(shell);
  }

  // Roving arrow-key nav between rungs; Escape closes the mobile popover.
  function onRungKeydown(e: KeyboardEvent, index: number) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = e.key === 'ArrowUp' ? index - 1 : index + 1;
      const target = rungButtons[(next + rungs.length) % rungs.length];
      target?.focus();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      open = false;
      toggleButton?.focus();
    }
  }

  let rungButtons: HTMLElement[] = $state([]);
  let toggleButton = $state<HTMLElement | undefined>();

  // The ladder's position is clamped to [8, viewport - 8], not only its width: its natural edge
  // (the chip's left, or its right with `align="right"`) can lie within a long label's width of
  // the screen edge in any language or direction. Offsets are relative to the picker, so the
  // clamp holds wherever the navigator sits.
  const EDGE_GAP = 8;
  let pickerEl = $state<HTMLElement | undefined>();
  let railEl = $state<HTMLElement | undefined>();
  let railLeft = $state<number | null>(null);
  function placeRail() {
    if (!pickerEl || !railEl) return;
    const p = pickerEl.getBoundingClientRect();
    const w = railEl.getBoundingClientRect().width;
    const vw = document.documentElement.clientWidth;
    const want = align === 'right' ? p.right - w : p.left;
    const left = Math.min(Math.max(want, EDGE_GAP), Math.max(EDGE_GAP, vw - EDGE_GAP - w));
    railLeft = left - p.left;
  }
  $effect(() => {
    if (!open) return;
    placeRail();
    window.addEventListener('resize', placeRail);
    return () => window.removeEventListener('resize', placeRail);
  });
</script>

<div
  bind:this={pickerEl}
  class="scale-picker"
  class:open
  data-align={align}
  data-testid="explore-scale-picker"
>
  <!-- The trigger: the current level's glyph + name + a caret; opens the ladder. -->
  <Chip
    bind:ref={toggleButton}
    kind="action"
    active={open}
    data-testid="explore-scale-toggle"
    aria-haspopup="true"
    aria-expanded={open}
    aria-label={m.explore_scale_change()}
    {disabled}
    onclick={() => (open = !open)}
  >
    {#snippet icon()}<ScaleGlyphIcon glyph={SCALE_SHELLS[activeShell].glyph} size={20} />{/snippet}
    <span class="toggle-label">{SCALE_SHELLS[activeShell].name()}</span>
    <span class="caret" aria-hidden="true">{open ? '▴' : '▾'}</span>
  </Chip>

  <nav
    bind:this={railEl}
    class="rail"
    style:left={railLeft === null ? undefined : `${railLeft}px`}
    style:right={railLeft === null ? undefined : 'auto'}
    aria-label={m.explore_scale_jump_aria()}
  >
    {#each rungs as s, i (s.id)}
      <Chip
        bind:ref={rungButtons[i]}
        kind="action"
        active={s.id === activeShell}
        class="rung"
        data-testid="explore-scale-rung-{s.id}"
        aria-current={s.id === activeShell ? 'true' : undefined}
        aria-describedby="{uid}-desc-{s.id}"
        {disabled}
        onclick={() => pick(s.id)}
        onkeydown={(e: KeyboardEvent) => onRungKeydown(e, i)}
      >
        {#snippet icon()}<ScaleGlyphIcon glyph={s.glyph} size={24} />{/snippet}
        <span class="rung-text">
          <span class="rung-label">{s.name()}</span>
          <span class="rung-desc" id="{uid}-desc-{s.id}">{s.desc()}</span>
        </span>
      </Chip>
    {/each}
  </nav>
</div>

<style>
  /* #45 — one chip on every viewport; the parent (the top scale-navigator)
     positions it, so this stays layout-neutral. `position: relative` anchors the
     popover ladder, which drops DOWNWARD from the chip. */
  .scale-picker {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .caret {
    opacity: 0.7;
  }

  /* Popover ladder: hidden until open, then drops down below the chip. */
  .rail {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    max-inline-size: calc(100vw - 16px);
    /* Eight rungs are taller than a landscape phone: the ladder scrolls inside. */
    max-block-size: calc(100dvh - 130px);
    overflow-y: auto;
    overscroll-behavior: contain;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: rgba(8, 18, 26, 0.95);
    border: 1px solid var(--color-accent-edge);
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.55);
    z-index: 2;
  }
  .scale-picker[data-align='right'] .rail {
    left: auto;
    right: 0;
  }
  .scale-picker.open .rail {
    display: flex;
  }
  .rail :global(.ui-chip) {
    justify-content: flex-start;
  }
  /* A rung: the level's glyph, its name, and (with a pointer) the home-grid line under it, cut
     to one line. Phones and coarse pointers get the glyph and name only: the card under the
     row carries the full text. */
  .rail :global(.ui-chip.rung) {
    padding-block: 4px;
    text-align: start;
  }
  .rung-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-inline-size: 0;
  }
  .rung-desc {
    display: none;
    inline-size: 15rem;
    max-inline-size: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: var(--color-text-label);
  }
  @media (hover: hover) and (pointer: fine) and (min-width: 700px) {
    .rung-desc {
      display: block;
    }
  }
</style>
