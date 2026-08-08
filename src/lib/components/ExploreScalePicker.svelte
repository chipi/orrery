<!--
  #258 — the /explore scale picker: a quick-jump between the four nested scale
  shells (Solar System → Stellar Neighbourhood → Milky Way → Local Group) that the
  scene already crosses via wheel/pinch. Each rung drives the host's
  `contextDeepLinkFn`, which walks OUT or IN the shell ladder (see
  `scale-shell-controller` · `planShellJump`).

  Responsive: desktop shows an always-on vertical rail (Local Group at top →
  Solar System at bottom, mirroring "zoom out is up"); mobile collapses to one
  "Scale" chip that opens the same ladder as a popover and auto-closes on pick,
  so it never fights the packed bottom control stack.

  The caller hides this entirely during full-screen sub-views (body-scene /
  black-hole / deep-sky) — `contextDeepLinkFn` only knows the four shells, not
  those takeovers, so the ladder is only meaningful in a shell context.
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
  /* Desktop: an always-on vertical rail, lower-right above the scale bar. Slate
     glass tokens mirror the .context-crumbs breadcrumb so it reads as native
     chrome, not a new widget. */
  .scale-picker {
    position: absolute;
    right: 16px;
    bottom: 64px;
    z-index: 7;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    font-family: var(--font-mono, 'Space Mono', monospace);
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .rung {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 6px 12px;
    background: rgba(10, 14, 24, 0.62);
    border: 1px solid rgba(154, 166, 189, 0.34);
    border-radius: 5px;
    backdrop-filter: blur(5px);
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

  /* The mobile trigger chip is hidden on desktop — the rail is always open. */
  .toggle {
    display: none;
  }

  /* Mobile: collapse to the trigger chip; the rail becomes a popover above it,
     shown only when open. Sits in empty scene space so the bottom control stack
     (scale bar / ruler-missions-controls / time bar) is never covered. */
  @media (max-width: 640px) {
    .scale-picker {
      right: 12px;
      bottom: 210px;
      align-items: flex-end;
    }
    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 8px 12px;
      background: rgba(10, 14, 24, 0.82);
      border: 1px solid rgba(90, 200, 210, 0.5);
      border-radius: 6px;
      backdrop-filter: blur(6px);
      color: #d7f6f6;
      font: inherit;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: nowrap;
      cursor: pointer;
    }
    .toggle:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .caret {
      opacity: 0.7;
      font-size: 10px;
    }
    /* Popover: hidden until open, then floats above the trigger. */
    .rail {
      display: none;
      order: -1;
      padding: 8px;
      background: rgba(8, 18, 26, 0.95);
      border: 1px solid rgba(90, 200, 210, 0.3);
      border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.55);
    }
    .scale-picker.open .rail {
      display: flex;
    }
    .rung {
      min-height: 44px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rung {
      transition: none;
    }
  }
</style>
