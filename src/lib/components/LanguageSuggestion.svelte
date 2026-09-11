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
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { canonicalRoute } from '$lib/seo';
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

  // Full-viewport 3D/canvas routes carry their own fixed bottom controls
  // (the /fly scrubber, per-scene HUD), which the bottom-center pill would
  // overlap. Suppress there — those users still have the nav locale picker, and
  // the banner's real value is on the content/landing pages people arrive on
  // from search anyway. Kept as a small explicit set: these routes are stable
  // and a stray banner on a new one is a review-visible nit, not a crash.
  const IMMERSIVE_ROUTES = new Set([
    '/explore',
    '/fly',
    '/earth',
    '/moon',
    '/mars',
    '/venus',
    '/iss',
    '/tiangong',
    '/plan',
  ]);

  let active = $derived<LocaleCode>(localeFromPage(page));
  let route = $derived(canonicalRoute(page.url.pathname, base));
  let dismissed = $state(dismissedThisSession);

  let suggested = $derived.by<LocaleEntry | null>(() => {
    if (!browser || dismissed) return null;
    if (IMMERSIVE_ROUTES.has('/' + route.split('/')[1])) return null;
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
    <!-- globe (left) and ✕ (right) are identical, mirrored bookends; the language
         name sits dead-center between them. Native name is self-localizing, so
         the bar ships no untranslated prose (translate-all rule). -->
    <span class="corner globe" aria-hidden="true">🌐</span>
    <button
      type="button"
      class="switch"
      aria-label="{suggested.nativeName} ({suggested.code})"
      onclick={() => accept(suggested)}
    >
      <span class="native">{suggested.nativeName}</span>
    </button>
    <button
      type="button"
      class="corner dismiss"
      aria-label={m.explore_anon_dismiss()}
      onclick={dismiss}>✕</button
    >
  </div>
{/if}

<style>
  /* Bottom-center floating pill, NOT an in-flow top bar (#521 review L1): a
     conditional bar that appears post-hydration would reflow the page (CLS — a
     Core Web Vital this SEO feature shouldn't hurt) and permanently squeeze the
     full-viewport 3D scenes on /explore, /fly, etc. Fixed positioning avoids
     both. z-index below the nav (40) so nav menus stay on top. */
  .lang-suggest {
    position: fixed;
    left: 50%;
    bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 35;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Symmetric horizontal padding: the ✕ is absolute-positioned in the right
       zone and the equal left zone balances it, so the language cluster centers
       on the pill's horizontal midline (operator: language centered). */
    padding: 5px 38px;
    max-width: calc(100vw - 24px);
    background: rgba(15, 18, 35, 0.96);
    border: 1px solid rgba(78, 205, 196, 0.4);
    border-radius: 999px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  /* No inner border: the pill container is the single teal frame. The switch
     used to carry its own teal border ~10px inside the pill's — two concentric
     borders that visually crowded the pill's edge (operator report). It's now a
     borderless clickable region with a hover-background tint instead. */
  /* The centered language name — the only thing in normal flow, so it sits dead
     center between the two absolute corner bookends. */
  .switch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 6px;
    background: transparent;
    border: none;
    border-radius: 999px;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 17px;
    line-height: 1;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .switch:hover {
    color: #4ecdc4;
  }
  .native {
    display: inline-flex;
    align-items: center;
    line-height: 1;
    /* Optical centering: the display face (Bebas Neue) seats its caps ~1.5px above
       the line-box center, so the box-centered text reads as high next to the
       emoji/✕ bookends. Nudge the ink down onto the pill's true midline (value
       measured: canvas ink-scan → 0.0px offset from the pill center at 1.5px). */
    transform: translateY(1.5px);
  }
  /* globe (left) and ✕ (right): identical, mirrored corner bookends — same box,
     same 34px size, same 4px inset, both vertically centered. */
  .corner {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    line-height: 1;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .globe {
    left: 4px;
    font-size: 15px;
    opacity: 0.8;
    pointer-events: none;
  }
  .dismiss {
    right: 4px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.55);
    transition: color 0.15s ease;
  }
  .dismiss:hover {
    color: var(--color-text);
  }
</style>
