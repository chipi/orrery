/**
 * `createRouteLifecycle` — single funnel for `addEventListener` +
 * generic teardown registration on 3D routes (#329 B.4).
 *
 * 7 routes today spread their listener registrations across `onMount`
 * and their teardown across `onDestroy`, with `removeEventListener`
 * calls living far from the matching `addEventListener` that defined
 * them. The matchup is hand-managed; the day someone forgets one is
 * the day a leak ships.
 *
 * This registry gives each route a single `lifecycle` object that:
 *   1. Wraps `addEventListener` to auto-register its matching
 *      removeEventListener for teardown. No manually-stowed
 *      `() => removeEventListener(...)` thunks.
 *   2. Accepts arbitrary `dispose()` callbacks (Three.js disposables,
 *      raf cancels, etc.) into the same teardown chain.
 *   3. Tears down everything LIFO via `cleanup()` so listeners
 *      added later (cinematic transitions, post-mount panels) are
 *      removed before their underlying systems.
 *
 * Usage:
 *
 *   const lifecycle = createRouteLifecycle();
 *   lifecycle.on(window, 'resize', handleResize);
 *   lifecycle.on(canvas, 'wheel', handleWheel, { passive: false });
 *   lifecycle.add(() => composer.dispose());
 *   lifecycle.add(loop.cleanup);
 *
 *   onDestroy(lifecycle.cleanup);
 *
 * Adding a cross-cutting concern (e.g. an idle-tick throttle that
 * needs every 3D route to register a new listener) becomes one edit
 * in the route's lifecycle setup, not seven.
 */

export interface RouteLifecycle {
  /**
   * Register an event listener + matching removeEventListener in one
   * call. The listener is added immediately; the matching removal
   * runs as part of `cleanup()`.
   *
   * The signature mirrors the native DOM `addEventListener` so route
   * code reads identically whether or not it's going through the
   * lifecycle. Specifically, the WindowEventMap / DocumentEventMap /
   * HTMLElementEventMap overloads each preserve the typed event arg
   * (`MouseEvent`, `PointerEvent`, etc.) without an `as any` cast.
   */
  on<E extends keyof WindowEventMap>(
    target: Window,
    event: E,
    listener: (this: Window, ev: WindowEventMap[E]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  on<E extends keyof DocumentEventMap>(
    target: Document,
    event: E,
    listener: (this: Document, ev: DocumentEventMap[E]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  on<T extends HTMLElement, E extends keyof HTMLElementEventMap>(
    target: T,
    event: E,
    listener: (this: T, ev: HTMLElementEventMap[E]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  on(
    target: EventTarget,
    event: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  /**
   * Register a teardown callback. Runs as part of `cleanup()` in
   * LIFO order with the `on` removals interleaved.
   */
  add(dispose: () => void): void;
  /**
   * Run every registered teardown in LIFO order. Idempotent — a
   * second call is a no-op (so onDestroy + onUnmount duplicates
   * don't double-fire).
   */
  cleanup(): void;
  /** True after cleanup() has run; useful for guarding late callbacks. */
  readonly disposed: boolean;
}

export function createRouteLifecycle(): RouteLifecycle {
  // Single typed array of teardown thunks. The `on` helper wraps
  // addEventListener so the removal closure captures (target, event,
  // listener, options) and gets stowed here alongside arbitrary
  // disposables — both kinds run through the same LIFO drain.
  const teardowns: (() => void)[] = [];
  let disposed = false;

  return {
    on(
      target: EventTarget,
      event: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      target.addEventListener(event, listener, options);
      const removeOptions: EventListenerOptions | boolean | undefined =
        typeof options === 'object' ? { capture: options.capture } : options;
      teardowns.push(() => target.removeEventListener(event, listener, removeOptions));
    },
    add(dispose) {
      teardowns.push(dispose);
    },
    cleanup() {
      if (disposed) return;
      disposed = true;
      // LIFO so listeners registered after a system (e.g. an overlay
      // observer added after its parent scene) tear down before the
      // system they referenced.
      for (let i = teardowns.length - 1; i >= 0; i--) {
        try {
          teardowns[i]();
        } catch (err) {
          // One faulty teardown shouldn't block the rest of the chain —
          // log + carry on.
          console.error('[route-lifecycle] teardown failed', err);
        }
      }
      teardowns.length = 0;
    },
    get disposed() {
      return disposed;
    },
  };
}
