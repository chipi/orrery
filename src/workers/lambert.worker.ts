/**
 * Lambert worker — runs the porkchop computation off the main thread (ADR-008).
 *
 * Protocol per RFC-003, locked in ADR-022 (2026-04-28):
 *   Main → Worker: { id, depRange, arrRange, steps }
 *   Worker → Main: { id, progress }                        (every 10 rows)
 *   Worker → Main: { id, grid, depDays, arrDays }          (final result)
 *
 * Cancellation by monotonic id: if a new request arrives mid-computation,
 * the worker compares its current id against the latest request and bails
 * before posting stale results. The main thread also checks the id on
 * received messages and discards anything not matching the current request.
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
