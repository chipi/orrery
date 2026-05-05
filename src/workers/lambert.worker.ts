/**
 * Lambert worker — runs the porkchop computation off the main thread (ADR-008).
 *
 * **DORMANT as of v0.1.6+ (ADR-026, ADR-028).** The 9 default destinations
 * (Mercury–Saturn + Uranus, Neptune, Pluto, Ceres) ship with pre-computed grids
 * at `static/data/porkchop/`, so /plan loads them directly via
 * `$lib/data#getPorkchopGrid` without spinning up a worker. This file
 * is preserved for future custom-range computation (e.g. user-driven
 * date-range editor outside the [0, 1460]d default window) — when
 * such a feature lands, /plan can re-import via Vite's `?worker`
 * suffix:
 *
 *   import LambertWorker from '$workers/lambert.worker?worker';
 *
 * Protocol per RFC-003 + ADR-022, generalised by ADR-026:
 *   Main → Worker: { id, depRange, arrRange, steps, destinationId? }
 *   Worker → Main: { id, progress }                        (every 10 rows)
 *   Worker → Main: { id, grid, depDays, arrDays }          (final result)
 *
 * `destinationId` defaults to 'mars' for back-compat with the
 * pre-v0.1.6 contract. Cancellation by monotonic id: if a new request
 * arrives mid-computation, the worker compares its current id against
 * the latest request and bails before posting stale results.
 *
 * The actual grid math lives in `$lib/lambert-grid.ts` so it can be
 * unit-tested without a Worker context. This file is the thin shell
 * that wires `self.addEventListener('message', …)` to that function.
 */

import { computePorkchopGrid } from '$lib/lambert-grid';
import type { LambertGrid, LambertProgress, LambertRequest } from '$lib/lambert-grid';

let currentId = -1;

self.addEventListener('message', (event: MessageEvent<LambertRequest>) => {
  const req = event.data;
  currentId = req.id;

  const partial = computePorkchopGrid(
    req,
    (progress) => {
      if (req.id !== currentId) return; // newer request superseded us
      const msg: LambertProgress = { id: req.id, progress };
      self.postMessage(msg);
    },
    () => req.id !== currentId,
  );

  if (!partial) return; // cancelled mid-compute
  if (req.id !== currentId) return; // raced with a newer request at the finish line

  const result: LambertGrid = { id: req.id, ...partial };
  self.postMessage(result);
});
