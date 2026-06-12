/**
 * `RemoteData<E, T>` — discriminated union for fetched data (#330 C.2).
 *
 * The codebase had 15+ state blocks shaped like:
 *
 *   let missions = $state<Mission[]>([]);
 *   let loading = $state(false);
 *   let loadFailed = $state(false);
 *
 * Three orthogonal nullable fields encode three valid states (loading,
 * error, success) but the type also admits five impossible ones
 * (e.g. loading=true && loadFailed=true, missions populated but
 * loading=true, …). Template rendering then has to defend against
 * every one — usually with a wrong-order `if` chain that flickers
 * "no missions" between fetch start and resolve.
 *
 * The discriminated union eliminates the impossibility at compile time:
 * exactly one of three shapes, exhaustively matchable.
 *
 * Usage:
 *
 *   import { type RemoteData, loading, success, error, isSuccess } from '$lib/types/remote-data';
 *
 *   let missions = $state<RemoteData<Error, Mission[]>>(loading());
 *
 *   onMount(async () => {
 *     try {
 *       missions = success(await getMissions());
 *     } catch (e) {
 *       missions = error(e instanceof Error ? e : new Error(String(e)));
 *     }
 *   });
 *
 *   // Template:
 *   {#if isSuccess(missions)}
 *     <MissionList items={missions.data} />
 *   {:else if isError(missions)}
 *     <ErrorBanner message={missions.error.message} />
 *   {:else}
 *     <Skeleton />
 *   {/if}
 */

export type RemoteData<E, T> =
  | { readonly type: 'loading' }
  | { readonly type: 'error'; readonly error: E }
  | { readonly type: 'success'; readonly data: T };

// ─── Constructors ─────────────────────────────────────────────────
// Singleton for the loading variant — no state, so we can share one
// frozen object across every callsite instead of allocating per call.
const LOADING_INSTANCE = Object.freeze({ type: 'loading' as const });

/** The loading variant — initial state before the fetch resolves. */
export function loading<E, T>(): RemoteData<E, T> {
  return LOADING_INSTANCE as RemoteData<E, T>;
}

/** Error variant — the fetch threw or returned a non-2xx response. */
export function error<E, T>(e: E): RemoteData<E, T> {
  return { type: 'error', error: e };
}

/** Success variant — the fetch resolved with usable data. */
export function success<E, T>(data: T): RemoteData<E, T> {
  return { type: 'success', data };
}

// ─── Type guards ──────────────────────────────────────────────────
// Type guards (not boolean predicates) so `if (isSuccess(rd))` narrows
// to the success shape inside the block — no `as` casts at call sites.

export function isLoading<E, T>(rd: RemoteData<E, T>): rd is { readonly type: 'loading' } {
  return rd.type === 'loading';
}

export function isError<E, T>(
  rd: RemoteData<E, T>,
): rd is { readonly type: 'error'; readonly error: E } {
  return rd.type === 'error';
}

export function isSuccess<E, T>(
  rd: RemoteData<E, T>,
): rd is { readonly type: 'success'; readonly data: T } {
  return rd.type === 'success';
}

// ─── Combinators ──────────────────────────────────────────────────

/**
 * Run a function over the success-branch data, leaving loading / error
 * branches untouched. Mirrors `Promise.then`'s mapping role. Useful when
 * a downstream `$derived` only needs a derived value (e.g. filtered list,
 * sort order) but the loading / error states should pass through.
 */
export function map<E, T, U>(rd: RemoteData<E, T>, fn: (data: T) => U): RemoteData<E, U> {
  return rd.type === 'success' ? success(fn(rd.data)) : rd;
}

/**
 * Reduce the union to a single value by supplying a handler per variant.
 * Exhaustive at the type level — TypeScript will surface a missing case.
 * Useful in render expressions that need to compute a value (not just
 * an `{#if}` branch), e.g. an aria-label that summarises the state.
 */
export function fold<E, T, R>(
  rd: RemoteData<E, T>,
  cases: {
    loading: () => R;
    error: (e: E) => R;
    success: (data: T) => R;
  },
): R {
  switch (rd.type) {
    case 'loading':
      return cases.loading();
    case 'error':
      return cases.error(rd.error);
    case 'success':
      return cases.success(rd.data);
  }
}
