/**
 * Wrap an async, side-effecting function so it never runs concurrently with
 * itself.
 *
 * While a call is in flight, a later call does NOT start a second run — the
 * latest argument is remembered and run once the current run settles
 * (last-call-wins; intermediate calls made during the same run are dropped).
 *
 * Used to serialise the /explore scale-picker transitions (#46): each transition
 * awaits animated camera dollies, so a second picker click mid-transition would
 * otherwise start a concurrent walker that races the first over shared scene /
 * camera state and can wedge the route on slower (mobile) GPUs.
 */
export function coalesceLatest<T>(fn: (arg: T) => Promise<void>): (arg: T) => Promise<void> {
  let inFlight = false;
  // Boxed so a genuine `null`/`undefined` argument is distinguishable from
  // "nothing pending".
  let pending: { arg: T } | null = null;
  return async (arg: T): Promise<void> => {
    if (inFlight) {
      pending = { arg };
      return;
    }
    inFlight = true;
    try {
      let next: { arg: T } | null = { arg };
      while (next != null) {
        pending = null;
        // A failed transition is the transition's own concern; the runner just
        // serialises. Swallow here so one failure neither strands the queued
        // latest request nor leaks as an unhandled rejection (callers fire this
        // and forget).
        try {
          await fn(next.arg);
        } catch {
          /* keep draining — honour the latest pending request below */
        }
        next = pending;
      }
    } finally {
      // Always clear, even on an unexpected throw — a stuck `inFlight` would
      // silently swallow every future call.
      inFlight = false;
      pending = null;
    }
  };
}
