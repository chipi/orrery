<!--
  ScienceChip — the small "info" chip that links a label to its
  `/science/[tab]/[section]` explainer (ADR-036, PRD-008 Phase 2).

  Visual: a 14×14 px outlined teal circle with a lowercase `i` glyph
  inside. The glyph is hand-drawn in SVG (not a text character) so it
  renders identically across font stacks AND sits exactly in the
  geometric centre of the circle — text glyphs have baseline + sidebearing
  offsets that fight visual centring.

  Hit target: a 24×24 px transparent outer wrap (mobile-friendly per
  ADR-018's 44px guideline; we relax for inline label adornments but
  stay above 24px).

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
  <!-- Geometric `i` (info) icon: outer ring + tiny round dot above a
       short stem. Coordinates are tuned to the 14×14 viewBox so the
       glyph sits in the geometric centre of the circle, regardless of
       the user's font. -->
  <svg
    class="dot"
    viewBox="0 0 14 14"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1" />
    <circle cx="7" cy="4.2" r="0.85" fill="currentColor" />
    <rect x="6.25" y="6" width="1.5" height="4.4" rx="0.4" fill="currentColor" />
  </svg>
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
  /* SVG-based `i` icon. Width/height match the 14×14 viewBox; the
     ring's stroke + the glyph's fills both inherit currentColor so the
     hover state only needs to flip color (no border-color hack). */
  .dot {
    display: block;
    width: 14px;
    height: 14px;
    color: rgba(78, 205, 196, 0.85);
    background: transparent;
    border-radius: 50%;
    transition:
      background 120ms,
      color 120ms;
  }
  .chip:hover .dot,
  .chip:focus-visible .dot {
    background: rgba(78, 205, 196, 0.18);
    color: #4ecdc4;
  }
  .chip:focus-visible {
    outline: 2px solid rgba(78, 205, 196, 0.6);
    outline-offset: 2px;
    border-radius: 50%;
  }
</style>
