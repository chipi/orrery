import { get } from './core';
import type { PorkchopGrid } from '$types/porkchop-grid';
import type { DestinationId } from '$lib/lambert-grid.constants';

/**
 * Pre-computed porkchop grid for a destination (v0.1.6 / ADR-026).
 * Files live in static/data/porkchop/ and are generated at build time
 * by scripts/precompute-porkchops.ts. /plan loads them via this
 * function for instant first paint and full offline capability.
 */
export async function getPorkchopGrid(destinationId: DestinationId): Promise<PorkchopGrid | null> {
  try {
    return await get<PorkchopGrid>(`porkchop/earth-to-${destinationId}.json`);
  } catch {
    return null;
  }
}
