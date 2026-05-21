<script lang="ts">
  /**
   * About / data-sources strip for /missions/launches. Lives near the
   * top of the page so the provenance + "what does FEATURED mean?" hint
   * is visible without the user having to scroll to the page footer
   * (PRD-020 M14, Marko 2026-05-21 feedback).
   *
   * Collapsible to keep vertical real-estate tight after first read.
   */

  let { gcatRelease }: { gcatRelease?: string } = $props();
  let open = $state(false);
</script>

<aside class="about-strip" data-open={open}>
  <button
    type="button"
    class="toggle"
    aria-expanded={open}
    aria-controls="about-strip-body"
    onclick={() => (open = !open)}
  >
    <span class="eyebrow">About this calendar</span>
    <span class="chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
  </button>
  {#if open}
    <div id="about-strip-body" class="body">
      <p>
        <strong>Sources.</strong> Agency-first: NASA, SpaceX, ESA press feeds; gap-fill from
        <a
          href="https://thespacedevs.com/llapi"
          rel="noopener noreferrer external"
          hreflang="en">Launch Library 2</a
        >. Historic launches come directly from Jonathan McDowell's
        <a
          href="https://planet4589.org/space/gcat/"
          rel="noopener noreferrer external"
          hreflang="en"
          >General Catalog of Artificial Space Objects (GCAT){gcatRelease
            ? ` Release ${gcatRelease}`
            : ''}</a
        >
        (CC&nbsp;BY&nbsp;4.0).
      </p>
      <p>
        <strong>What's a <span class="featured-pill">FEATURED</span> launch?</strong> Crewed
        flights, missions going beyond low-Earth orbit (Moon, Mars, deep space), or first
        flights of new vehicles. Operator picks can promote or demote any specific launch via
        the curation file.
      </p>
      <p>
        <strong>Every row has a provenance chain.</strong> Hover (desktop) or tap (mobile) any
        launch's source chip to see which agency or aggregator the data came from, in priority
        order.
      </p>
    </div>
  {/if}
</aside>

<style>
  .about-strip {
    margin: 0 12px 14px;
    border: 1px solid rgba(78, 205, 196, 0.2);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(78, 205, 196, 0.06), rgba(78, 205, 196, 0.02));
  }

  @media (min-width: 768px) {
    .about-strip {
      margin: 0 24px 16px;
    }
  }

  .toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: transparent;
    border: none;
    color: #e6e8ee;
    font-family: 'Space Mono', monospace;
    cursor: pointer;
    min-height: 40px;
    text-align: left;
  }

  .toggle:hover {
    background: rgba(78, 205, 196, 0.06);
  }

  .eyebrow {
    font-size: 11px;
    color: #4ecdc4;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }

  .chevron {
    color: rgba(230, 232, 238, 0.5);
    font-size: 12px;
  }

  .body {
    padding: 4px 14px 14px;
    font-family: 'Crimson Pro', serif;
    font-size: 14px;
    line-height: 1.55;
    color: rgba(230, 232, 238, 0.85);
    border-top: 1px solid rgba(78, 205, 196, 0.12);
  }

  .body p {
    margin: 10px 0;
  }

  .body strong {
    color: #fff;
    font-weight: 600;
  }

  .body a {
    color: #4ecdc4;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .featured-pill {
    display: inline-block;
    padding: 1px 6px;
    margin: 0 2px;
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
    border: 1px solid rgba(255, 200, 80, 0.5);
    border-radius: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    vertical-align: baseline;
  }
</style>
