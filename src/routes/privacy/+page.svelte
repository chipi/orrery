<script lang="ts">
  /*
    /privacy — what Orrery measures, and the switch to turn it off (ADR-092).

    This page is the transparency half of the "no consent banner" position:
    Umami is cookieless and self-hosted, so ePrivacy Art. 5(3) is not engaged
    and no banner is required — but GDPR Art. 13 disclosure is mandatory
    regardless of lawful basis, and the audience-measurement exemptions expect
    a means to object. That is this page.

    The toggle writes `orrery_analytics_optout` (functional cookie #3) and then
    RELOADS. The reload is not cosmetic: Umami's autotrack binds history
    listeners when its script loads, and those cannot be unbound, so the only
    honest way to stop pageview collection mid-session is to reload into a
    state where `initAnalytics()` never injects the script.
  */
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { readOptOutCookie, writeOptOutCookie, browserPrivacySignal } from '$lib/analytics-optout';

  // Resolved on mount — all three depend on `document` / `navigator`, so they
  // stay at their SSR-safe defaults during prerender.
  let optedOut = $state(false);
  let signalled = $state(false);
  let ready = $state(false);

  onMount(() => {
    signalled = browserPrivacySignal();
    optedOut = readOptOutCookie();
    ready = true;
  });

  function onToggle(e: Event): void {
    const on = (e.currentTarget as HTMLInputElement).checked;
    writeOptOutCookie(!on);
    // Reload so Umami's already-bound autotrack listeners go away with the
    // document. See the header comment.
    location.reload();
  }

  // The browser signal wins over the cookie and locks the control.
  const analyticsOn = $derived(ready && !signalled && !optedOut);
</script>

<svelte:head>
  <title>{m.privacy_page_title()} — Orrery</title>
</svelte:head>

<section class="privacy" aria-labelledby="privacy-title" data-route-ready="true">
  <header class="head">
    <h1 id="privacy-title">{m.privacy_page_title()}</h1>
    <p class="intro">{m.privacy_page_intro()}</p>
  </header>

  <article class="card control-card" aria-labelledby="privacy-controls-title">
    <h2 id="privacy-controls-title">{m.privacy_controls_heading()}</h2>

    {#if signalled}
      <p class="signal-note" role="status">{m.privacy_optout_signal_note()}</p>
    {/if}

    <div class="toggle-row">
      <label class="toggle">
        <input
          type="checkbox"
          checked={analyticsOn}
          disabled={!ready || signalled}
          onchange={onToggle}
        />
        <span class="toggle-label">{m.privacy_optout_label()}</span>
      </label>
      <p class="toggle-state" aria-live="polite">
        {analyticsOn ? m.privacy_optout_on() : m.privacy_optout_off()}
      </p>
    </div>

    <p class="fine">{m.privacy_controls_body()}</p>
  </article>

  <article class="card" aria-labelledby="privacy-collect-title">
    <h2 id="privacy-collect-title">{m.privacy_collect_heading()}</h2>
    <p>{m.privacy_collect_intro()}</p>
    <ul>
      <li>{m.privacy_collect_pages()}</li>
      <li>{m.privacy_collect_interactions()}</li>
      <li>{m.privacy_collect_search()}</li>
      <li>{m.privacy_collect_outbound()}</li>
      <li>{m.privacy_collect_build()}</li>
    </ul>
  </article>

  <article class="card" aria-labelledby="privacy-never-title">
    <h2 id="privacy-never-title">{m.privacy_never_heading()}</h2>
    <p>{m.privacy_never_body()}</p>
  </article>

  <article class="card" aria-labelledby="privacy-signals-title">
    <h2 id="privacy-signals-title">{m.privacy_signals_heading()}</h2>
    <p>{m.privacy_signals_body()}</p>
  </article>

  <article class="card" aria-labelledby="privacy-cookies-title">
    <h2 id="privacy-cookies-title">{m.privacy_cookies_heading()}</h2>
    <p>{m.privacy_cookies_body()}</p>
    <p class="fine">
      <a href="{base}/credits">{m.layout_footer_credits()}</a>
    </p>
  </article>

  <article class="card" aria-labelledby="privacy-errors-title">
    <h2 id="privacy-errors-title">{m.privacy_errors_heading()}</h2>
    <p>{m.privacy_errors_body()}</p>
  </article>

  <article class="card" aria-labelledby="privacy-where-title">
    <h2 id="privacy-where-title">{m.privacy_where_heading()}</h2>
    <p>{m.privacy_where_body()}</p>
  </article>
</section>

<style>
  .privacy {
    max-width: 760px;
    margin: 0 auto;
    padding: 24px 16px 96px;
    color: var(--fg, #e8e8ea);
  }
  .head h1 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: clamp(24px, 5vw, 34px);
    margin: 0 0 12px;
    letter-spacing: 0.02em;
  }
  .intro {
    font-size: 15px;
    line-height: 1.65;
    opacity: 0.9;
    margin: 0 0 28px;
  }
  .card {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 18px 18px 16px;
    margin-bottom: 16px;
    background: rgba(255, 255, 255, 0.02);
  }
  .card h2 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 12px;
    opacity: 0.85;
  }
  .card p {
    font-size: 14px;
    line-height: 1.7;
    margin: 0 0 10px;
  }
  .card ul {
    margin: 0;
    padding-inline-start: 20px;
  }
  .card li {
    font-size: 14px;
    line-height: 1.7;
    margin-bottom: 8px;
  }
  .control-card {
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.045);
  }
  .toggle-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    margin-bottom: 12px;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }
  .toggle input[disabled] {
    cursor: not-allowed;
  }
  .toggle input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent, #7cc7ff);
  }
  .toggle-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
    letter-spacing: 0.04em;
  }
  .toggle-state {
    font-size: 13px;
    opacity: 0.75;
    margin: 0;
  }
  .signal-note {
    font-size: 13px;
    line-height: 1.6;
    padding: 10px 12px;
    border-inline-start: 3px solid var(--accent, #7cc7ff);
    background: rgba(124, 199, 255, 0.08);
    border-radius: 4px;
    margin: 0 0 14px;
  }
  .fine {
    font-size: 12.5px;
    opacity: 0.7;
    line-height: 1.6;
  }
  .card a {
    color: var(--accent, #7cc7ff);
  }
  @media (max-width: 480px) {
    .privacy {
      padding-inline: 14px;
    }
  }
</style>
