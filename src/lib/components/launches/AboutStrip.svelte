<script lang="ts">
  /**
   * Always-visible "About this calendar" panel. Lives in the right
   * column of the page header so the explainer (sources + what FEATURED
   * means + provenance affordance) is always on screen, occupying the
   * white space next to the title rather than stealing vertical room.
   *
   * Marko 2026-05-21 feedback: no collapse toggle; always available.
   */

  let { gcatRelease }: { gcatRelease?: string } = $props();
</script>

<aside class="about-panel" aria-label="About this calendar">
  <h2 class="eyebrow">About this calendar</h2>
  <dl>
    <dt>Sources</dt>
    <dd>
      Agency-first: NASA · SpaceX · ESA. Gap-fill from
      <a
        href="https://thespacedevs.com/llapi"
        rel="noopener noreferrer external"
        hreflang="en">LL2</a
      >. Historic from
      <a
        href="https://planet4589.org/space/gcat/"
        rel="noopener noreferrer external"
        hreflang="en"
        >McDowell's GCAT{gcatRelease ? ` r${gcatRelease}` : ''}</a
      >
      (CC&nbsp;BY&nbsp;4.0).
    </dd>
    <dt><span class="featured-pill">FEATURED</span></dt>
    <dd>Crewed flights, beyond-LEO missions (Moon, Mars, deep space), or first flights of new vehicles. Operator can promote / demote.</dd>
    <dt>Provenance</dt>
    <dd>Every row traces to a primary source. Hover/tap the source chip on any launch to see the full chain.</dd>
  </dl>
</aside>

<style>
  .about-panel {
    border: 1px solid rgba(78, 205, 196, 0.22);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(78, 205, 196, 0.05), rgba(78, 205, 196, 0.015));
    padding: 12px 14px;
    color: rgba(230, 232, 238, 0.85);
    font-family: 'Crimson Pro', serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .eyebrow {
    margin: 0 0 8px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #4ecdc4;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }

  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    align-items: baseline;
  }

  dt {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(230, 232, 238, 0.55);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
    white-space: nowrap;
  }

  dd {
    margin: 0;
  }

  a {
    color: #4ecdc4;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .featured-pill {
    display: inline-block;
    padding: 0 5px;
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
    border: 1px solid rgba(255, 200, 80, 0.5);
    border-radius: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.5px;
    text-transform: none;
  }
</style>
