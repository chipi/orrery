<!--
  #258 / #45 — the /explore scale picker: a quick-jump between the eight nested
  scale shells (Solar System → Stellar Neighbourhood → Milky Way → Local Group →
  … → Cosmic Web) that the scene already crosses via wheel/pinch. Each rung drives
  the host's `contextDeepLinkFn`, which walks OUT or IN the shell ladder (see
  `scale-shell-controller` · `planShellJump`).

  #45 promoted this into the top scale-navigator: on EVERY viewport it renders as
  one "Scale" chip (`◉ <current shell> ▾`) that opens the ladder as a popover
  DOWNWARD and auto-closes on pick. It replaces both the old always-on desktop
  rail and the redundant breadcrumb — the chip is the single "where am I + jump to
  any scale" control, flanked by the host's back/reset affordances. The parent
  positions it (this component is layout-neutral: `position: relative`).

  The caller hides this entirely during full-screen sub-views (body-scene /
  black-hole / deep-sky) — `contextDeepLinkFn` only knows the shells, not those
  takeovers, so the ladder is only meaningful in a shell context.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';
  import { CTX_ORDER, type ShellId } from '$lib/explore/scale-shell-controller';

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
  const rungs = [...CTX_ORDER].reverse();

  // Mobile popover open state; ignored on desktop (the rail is always shown).
  let open = $state(false);

  function labelFor(shell: ShellId): string {
    switch (shell) {
      case 'solar-system':
        return m.explore_ctx_solar_system();
      case 'neighborhood':
        return m.explore_ctx_stellar_neighborhood();
      case 'milky-way':
        return m.explore_ctx_milky_way();
      case 'local-group':
        return m.explore_ctx_local_group();
      case 'local-sheet':
        return m.explore_ctx_local_sheet();
      case 'virgo':
        return m.explore_ctx_virgo();
      case 'laniakea':
        return m.explore_ctx_laniakea();
      case 'cosmic-web':
        return m.explore_ctx_cosmic_web();
    }
  }

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
  <!-- Mobile-only trigger: shows the current shell + a caret; opens the ladder. -->
  <Chip
    bind:ref={toggleButton}
    kind="action"
    dot
    active={open}
    data-testid="explore-scale-toggle"
    aria-haspopup="true"
    aria-expanded={open}
    aria-label={m.explore_scale_change()}
    {disabled}
    onclick={() => (open = !open)}
  >
    <span class="toggle-label">{labelFor(activeShell)}</span>
    <span class="caret" aria-hidden="true">{open ? '▴' : '▾'}</span>
  </Chip>

  <nav
    bind:this={railEl}
    class="rail"
    style:left={railLeft === null ? undefined : `${railLeft}px`}
    style:right={railLeft === null ? undefined : 'auto'}
    aria-label={m.explore_scale_jump_aria()}
  >
    {#each rungs as shell, i (shell)}
      <Chip
        bind:ref={rungButtons[i]}
        kind="action"
        active={shell === activeShell}
        data-testid="explore-scale-rung-{shell}"
        aria-current={shell === activeShell ? 'true' : undefined}
        {disabled}
        onclick={() => pick(shell)}
        onkeydown={(e: KeyboardEvent) => onRungKeydown(e, i)}
      >
        <span class="rung-label">{labelFor(shell)}</span>
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
</style>
