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
  import { CTX_ORDER, type ShellId } from '$lib/explore/scale-shell-controller';

  let {
    activeShell,
    onJump,
    disabled = false,
  }: {
    activeShell: ShellId;
    /** Jump to a shell; a no-op walk (same shell) is handled upstream. */
    onJump: (shell: ShellId) => void;
    /** True until the host has wired `contextDeepLinkFn` (scene not ready). */
    disabled?: boolean;
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

  let rungButtons: HTMLButtonElement[] = $state([]);
  let toggleButton = $state<HTMLButtonElement | null>(null);
</script>

<div class="scale-picker" class:open data-testid="explore-scale-picker">
  <!-- Mobile-only trigger: shows the current shell + a caret; opens the ladder. -->
  <button
    bind:this={toggleButton}
    type="button"
    class="toggle"
    data-testid="explore-scale-toggle"
    aria-haspopup="true"
    aria-expanded={open}
    aria-label={m.explore_scale_change()}
    {disabled}
    onclick={() => (open = !open)}
  >
    <span class="toggle-label">{labelFor(activeShell)}</span>
    <span class="caret" aria-hidden="true">{open ? '▴' : '▾'}</span>
  </button>

  <nav class="rail" aria-label={m.explore_scale_jump_aria()}>
    {#each rungs as shell, i (shell)}
      <button
        bind:this={rungButtons[i]}
        type="button"
        class="rung"
        data-testid="explore-scale-rung-{shell}"
        class:active={shell === activeShell}
        aria-current={shell === activeShell ? 'true' : undefined}
        {disabled}
        onclick={() => pick(shell)}
        onkeydown={(e) => onRungKeydown(e, i)}
      >
        <span class="dot" aria-hidden="true"></span>
        <span class="rung-label">{labelFor(shell)}</span>
      </button>
    {/each}
  </nav>
</div>

<style>
  /* #45 — one chip on every viewport; the parent (the top scale-navigator)
     positions it, so this stays layout-neutral. `position: relative` anchors the
     popover ladder, which drops DOWNWARD from the chip. Slate glass tokens mirror
     the surrounding nav chrome so it reads as native, not a new widget. */
  .scale-picker {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    font-family: var(--font-mono, 'Space Mono', monospace);
  }

  /* The trigger chip: current shell + a caret. Shown on all viewports now. */
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 6px 12px;
    background: rgba(10, 14, 24, 0.62);
    border: 1px solid rgba(90, 200, 210, 0.5);
    border-radius: 5px;
    backdrop-filter: blur(5px);
    color: #d7f6f6;
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .toggle::before {
    /* The ◉ "you are here" dot from the mockup. */
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #5ac8d2;
    box-shadow: 0 0 8px rgba(90, 200, 210, 0.7);
    flex: none;
  }
  .toggle:hover:not(:disabled),
  .toggle:focus-visible:not(:disabled) {
    background: rgba(90, 200, 210, 0.18);
    border-color: rgba(90, 200, 210, 0.7);
    color: #eaffff;
    outline: none;
  }
  .toggle:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .caret {
    opacity: 0.7;
    font-size: 10px;
  }

  /* Popover ladder: hidden until open, then drops down below the chip. */
  .rail {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: rgba(8, 18, 26, 0.95);
    border: 1px solid rgba(90, 200, 210, 0.3);
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.55);
    z-index: 2;
  }
  .scale-picker.open .rail {
    display: flex;
  }

  .rung {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 6px 12px;
    background: rgba(10, 14, 24, 0.62);
    border: 1px solid rgba(154, 166, 189, 0.34);
    border-radius: 5px;
    color: rgba(200, 210, 228, 0.82);
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .rung:hover:not(:disabled),
  .rung:focus-visible:not(:disabled) {
    background: rgba(154, 166, 189, 0.18);
    border-color: rgba(154, 166, 189, 0.55);
    color: #eaf1ff;
    outline: none;
  }
  .rung.active {
    background: rgba(90, 200, 210, 0.16);
    border-color: rgba(90, 200, 210, 0.66);
    color: #d7f6f6;
    cursor: default;
  }
  .rung:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.6;
    flex: none;
  }
  .rung.active .dot {
    opacity: 1;
    box-shadow: 0 0 8px rgba(90, 200, 210, 0.7);
  }

  /* Touch: bigger tap targets. */
  @media (max-width: 640px) {
    .toggle {
      min-height: 44px;
      padding: 8px 12px;
    }
    .rung {
      min-height: 44px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rung,
    .toggle {
      transition: none;
    }
  }
</style>
