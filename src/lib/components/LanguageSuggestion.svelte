<script module lang="ts">
  // Session-scoped dismissal. ADR-057 bans client storage beyond the 3 approved
  // cookies and ADR-092 spent the third, so this is NOT persisted — module scope
  // survives SPA navigation and resets on reload / return visit, the same
  // lifetime as ADR-093's journey dedup. A visitor who dismisses is not
  // re-nagged within the session; a genuine return visit may suggest again.
  let dismissedThisSession = false;
</script>

<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { setLocale } from '$lib/paraglide/runtime';
  import {
    SUPPORTED_LOCALES,
    localeFromPage,
    matchPreferredLocale,
    type LocaleCode,
    type LocaleEntry,
  } from '$lib/locale';
  import { track } from '$lib/analytics';
  import * as m from '$lib/paraglide/messages';

  // NB: we intentionally do NOT gate on the paraglide locale cookie. Paraglide's
  // getLocale() auto-writes that cookie to the resolved locale on every load
  // (strategy is url-first, so `/` always resolves to the base locale), so its
  // presence is not a signal of a deliberate choice. The "I want this locale
  // anyway" case is handled by session dismissal instead (ADR-057-safe, in-memory).
  function preferredSupportedLocale(): LocaleCode | null {
    if (!browser) return null;
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    return matchPreferredLocale(langs);
  }

  let active = $derived<LocaleCode>(localeFromPage(page));
  let dismissed = $state(dismissedThisSession);

  let suggested = $derived.by<LocaleEntry | null>(() => {
    if (!browser || dismissed) return null;
    const pref = preferredSupportedLocale();
    if (!pref || pref === active) return null;
    return SUPPORTED_LOCALES.find((l) => l.code === pref) ?? null;
  });

  // Fire the shown event once per distinct suggested locale (measures the
  // opportunity; `locale-suggest-accepted ÷ shown` = the take rate).
  let shownFor: string | null = null;
  $effect(() => {
    if (suggested && shownFor !== suggested.code) {
      shownFor = suggested.code;
      track('locale-suggest-shown', { to: suggested.code, from: active });
    }
  });

  function accept(entry: LocaleEntry | null) {
    if (!entry) return;
    track('locale-suggest-accepted', { to: entry.code, from: active });
    // setLocale does a FULL-PAGE reload (paraglide navigateOrReload → location.href),
    // which would cancel the just-queued beacon — and the banner shows from first
    // paint, exactly when the deferred Umami script may not have run yet, so the
    // event is in the pending buffer. Defer the reload briefly so the event gets
    // out first. The delay is imperceptible against a reload the user just asked for.
    setTimeout(() => setLocale(entry.code), 250);
  }
  function dismiss() {
    dismissedThisSession = true;
    dismissed = true;
  }
</script>

{#if suggested}
  <div class="lang-suggest" role="region" aria-label={m.nav_locale_suggest_label()}>
    <!-- Language-neutral by construction: the native name is self-localizing, so
         the bar ships no untranslated prose (translate-all rule). -->
    <button
      type="button"
      class="switch"
      aria-label="{suggested.nativeName} ({suggested.code})"
      onclick={() => accept(suggested)}
    >
      <span class="globe" aria-hidden="true">🌐</span>
      <span class="flag" aria-hidden="true">{suggested.flag}</span>
      <span class="native">{suggested.nativeName}</span>
      <span class="arrow" aria-hidden="true">→</span>
    </button>
    <button type="button" class="dismiss" aria-label={m.explore_anon_dismiss()} onclick={dismiss}
      >✕</button
    >
  </div>
{/if}

<style>
  .lang-suggest {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: center;
    padding: 6px 10px;
    background: rgba(15, 18, 35, 0.92);
    border-bottom: 1px solid rgba(78, 205, 196, 0.35);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 4px 14px;
    background: transparent;
    border: 1px solid rgba(78, 205, 196, 0.5);
    border-radius: 4px;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }
  .switch:hover {
    border-color: rgba(78, 205, 196, 0.9);
  }
  .globe {
    opacity: 0.75;
    font-size: 13px;
  }
  .flag {
    font-size: 15px;
  }
  .arrow {
    color: #4ecdc4;
  }
  .dismiss {
    min-width: 40px;
    min-height: 40px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.55);
    font-size: 14px;
    cursor: pointer;
  }
  .dismiss:hover {
    color: var(--color-text);
  }
</style>
