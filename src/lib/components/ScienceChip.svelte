<!--
  ScienceChip — the small `?` chip that links a label to its
  `/science/[tab]/[section]` explainer (ADR-036, PRD-008 Phase 2).

  Visual: a 14×14 px outlined teal circle with a `?` inside.
  Hit target: a 24×24 px transparent outer wrap (mobile-friendly per
  ADR-018's 44px guideline; we relax for inline label adornments
  but stay above 24px).

  Behaviour:
    - Click → navigate to /science/[tab]/[section]
    - Desktop hover → native browser tooltip via `title` attribute
      (intro sentence from the linked section, passed in by the caller)
    - Mobile → click-only, no popover modal
    - Keyboard → standard <a> focus + Enter
-->
<script lang="ts">
  import { base } from '$app/paths';
  import type { ScienceTabId } from '$types/science';

  type Props = {
    /** Encyclopedia tab the chip links into. */
    tab: ScienceTabId;
    /** Section id within the tab (matches the JSON file basename). */
    section: string;
    /** Short tooltip shown on desktop hover — typically the section's intro_sentence. */
    label?: string;
    /** Optional aria-label override; defaults to "Learn more: <label>". */
    ariaLabel?: string;
  };
  let { tab, section, label, ariaLabel }: Props = $props();

  const tooltip = $derived(label ?? 'Open in /science');
  const aria = $derived(ariaLabel ?? `Learn more about ${label ?? `${tab}/${section}`}`);
</script>

<a
  class="chip"
  href="{base}/science/{tab}/{section}"
  title={tooltip}
  aria-label={aria}
  data-science-chip
>
  <span class="dot" aria-hidden="true">?</span>
</a>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: 0 2px;
    text-decoration: none;
    vertical-align: middle;
  }
  .dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(78, 205, 196, 0.5);
    color: rgba(78, 205, 196, 0.85);
    background: transparent;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    transition:
      background 120ms,
      color 120ms,
      border-color 120ms;
  }
  .chip:hover .dot,
  .chip:focus-visible .dot {
    background: rgba(78, 205, 196, 0.18);
    color: #4ecdc4;
    border-color: #4ecdc4;
  }
  .chip:focus-visible {
    outline: 2px solid rgba(78, 205, 196, 0.6);
    outline-offset: 2px;
    border-radius: 50%;
  }
</style>
