/**
 * `useUrlParam<T>` — typed two-way URL ↔ state binding (#331).
 *
 * The audit identified ~20 sites that manually read `$page.url.searchParams.get(...)`,
 * `parse()` + coerce, set local `$state`, then write back via `goto()` inside an
 * `$effect` block. Every site re-invents the same wheel and most of them forget
 * the `untrack()` discipline (project memory `feedback_svelte5_effect_untrack`) —
 * which means a paste-in `?id=` deep-link can trip `effect_update_depth_exceeded`.
 *
 * This rune is the canonical pattern:
 *
 *   const dest = useUrlParam(
 *     'dest',
 *     (s) => s ?? 'mars',
 *     (t) => (t === 'mars' ? null : t),  // null = remove the param
 *   );
 *
 *   // read reactively:
 *   $derived(dest.value)
 *
 *   // write — debounced URL update happens automatically:
 *   dest.value = 'venus';
 *
 * Guarantees baked in:
 *  1. The URL→state write is wrapped in `untrack()` so a caller can't accidentally
 *     re-introduce the effect_update_depth_exceeded gotcha.
 *  2. The state→URL write is debounced (default 200 ms) — slider scrubs no longer
 *     spam the history stack.
 *  3. `replaceState: true` by default — most URL params are filter / camera state
 *     that shouldn't pollute the back button. Pass `replaceState: false` only for
 *     navigation-worthy params (e.g. `?site=apollo11` where back should rewind).
 *  4. The rune is a no-op on the server / during prerender — `parse(null)` runs
 *     once and the goto-based write side stays dormant until hydration.
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { untrack } from 'svelte';

// ─── Pure helpers (exported for testability) ────────────────────────
//
// The runtime rune below is built around `$state` + `$effect` and is
// hard to unit-test without a live component scope. We split out the
// genuinely pure transforms so the round-trip + URL-mutation logic
// can be exercised by ordinary vitest assertions, leaving only the
// reactive glue for the rune body itself.

/**
 * Build the next URL string for the given param key + serialized value.
 * `serialized === null` removes the key. Other search params + hash are
 * preserved verbatim.
 */
export function buildNextUrl(currentUrl: URL, key: string, serialized: string | null): string {
  const url = new URL(currentUrl.toString());
  if (serialized === null) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, serialized);
  }
  return url.pathname + url.search + url.hash;
}

/**
 * True when the proposed serialized value matches what the URL already
 * holds (so we should skip the goto). Distinguishes "param absent"
 * (`null`) from "param empty string" — `?dest=` and no `?dest=` are
 * different states in the URL spec.
 */
export function urlValueMatches(currentUrl: URL, key: string, serialized: string | null): boolean {
  const present = currentUrl.searchParams.get(key);
  return serialized === null ? present === null : present === serialized;
}

export interface UseUrlParamOptions {
  /**
   * Delay between a state mutation and the URL write, in milliseconds.
   * The slider use case (camera yaw / pitch on /moon panoramas) flips this
   * value many times per frame; without debouncing we'd push a new history
   * entry per pointer-move event. Default 200 ms.
   *
   * Pass `0` for navigation-tier params where the URL should reflect state
   * immediately (e.g. `?site=apollo11`).
   */
  debounceMs?: number;
  /**
   * Whether the URL write uses `history.replaceState` (true, default) or
   * `pushState` (false). True for filter / camera state; false for params
   * that should leave a back-button trail (e.g. selected mission id).
   */
  replaceState?: boolean;
}

export interface UrlParam<T> {
  /** Reactive read — calls inside `$derived` / `$effect` track URL changes. */
  get value(): T;
  /** Write — schedules a debounced URL update. */
  set value(v: T);
}

/**
 * Two-way bind a URL search-param to a typed `$state`.
 *
 * The caller supplies `parse` (URL string → T) and `serialize` (T → URL string,
 * or `null` to remove the param). Both are pure; the rune calls them on each
 * read/write boundary so non-string types stay typed end-to-end.
 *
 * Behaviour:
 *  - On mount: reads the current URL via `$page.url`, calls `parse`, seeds the
 *    initial state.
 *  - On URL change (browser back / forward / external `goto`): re-parses + sets
 *    state. The state write is `untrack()`-wrapped so the reverse effect doesn't
 *    self-fire.
 *  - On state change: serializes + schedules a debounced `goto()`. If the
 *    serialized value matches the URL already, the write is skipped. Pending
 *    timers are cancelled on subsequent state writes and on component unmount.
 */
export function useUrlParam<T>(
  key: string,
  parse: (raw: string | null) => T,
  serialize: (value: T) => string | null,
  opts: UseUrlParamOptions = {},
): UrlParam<T> {
  const debounceMs = opts.debounceMs ?? 200;
  const replaceState = opts.replaceState ?? true;

  // Initial read — on the server (prerender), $page.url has no search params
  // for runtime users, so this collapses to `parse(null)` and lets the caller
  // pick its own default. On the client, take the live URL via $page store.
  const initialRaw = browser ? page.url.searchParams.get(key) : null;
  const state = $state<{ current: T }>({ current: parse(initialRaw) });
  // Track what we last pushed to the URL so the state→URL effect can short-
  // circuit when the state matches the URL already (avoids the URL→state→URL
  // self-fire that would otherwise need a manual untrack at every caller).
  let lastSerialized = serialize(state.current);

  // URL → state. `page.url` (rune-backed, $app/state) is fine-grained reactive:
  // reading it here re-runs this effect on every navigation (incl. browser
  // back / forward / external goto) without re-firing when unrelated page
  // fields change. The write is wrapped in untrack() so it can't self-fire the
  // state→URL effect below.
  $effect(() => {
    const next = parse(page.url.searchParams.get(key));
    untrack(() => {
      if (!Object.is(state.current, next)) {
        state.current = next;
        lastSerialized = serialize(next);
      }
    });
  });

  // State → URL. Debounced — slider scrub use case fires this many times per
  // frame, and a per-frame goto() blows the history stack and triggers a
  // layout flush.
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  const cancelPending = () => {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  };

  $effect(() => {
    const serialized = serialize(state.current); // tracking dep
    if (!browser) return;
    cancelPending();
    if (serialized === lastSerialized) return;
    const fire = () => {
      pendingTimer = null;
      untrack(() => {
        // Re-read the current URL right before writing — between schedule and
        // fire the user may have navigated elsewhere; building from the live
        // URL keeps unrelated params intact. The pure buildNextUrl helper
        // mirrors what's covered by unit tests.
        const url = new URL(window.location.href);
        if (urlValueMatches(url, key, serialized)) {
          lastSerialized = serialized;
          return;
        }
        lastSerialized = serialized;
        void goto(buildNextUrl(url, key, serialized), {
          replaceState,
          keepFocus: true,
          noScroll: true,
        });
      });
    };
    if (debounceMs === 0) {
      fire();
    } else {
      pendingTimer = setTimeout(fire, debounceMs);
    }
    return cancelPending;
  });

  return {
    get value(): T {
      return state.current;
    },
    set value(v: T) {
      state.current = v;
    },
  };
}
