import type { MissionEvent } from '$types/mission';

/** Warning / ledger state behind the CAPCOM anomaly banner. */
export type AnomalyLevel = 'nominal' | 'caution' | 'critical';

/** Remaining Δv under which a real ledger reads CRITICAL (the prototype's threshold). */
export const CRITICAL_DV_REMAINING_KMS = 0.3;

/**
 * Δv left on the ledger, km/s. Null when the source carries no ledger
 * (`dvUsed` null: missions and /plan picks) — never a stand-in margin.
 */
export function dvRemaining(dvTotal: number, dvUsed: number | null): number | null {
  return dvUsed == null ? null : Math.max(0, dvTotal - dvUsed);
}

/** Events with `met <= nowMet`, most recent first. Does not mutate `events`. */
export function pastEvents(events: readonly MissionEvent[], nowMet: number): MissionEvent[] {
  return events
    .filter((e) => e.met <= nowMet)
    .slice()
    .reverse();
}

/**
 * Collapses past `warning` events into a worst-case banner: CAUTION when one
 * is present, NOMINAL otherwise, CRITICAL when a real ledger has under
 * {@link CRITICAL_DV_REMAINING_KMS} km/s left.
 */
export function anomalyLevel(
  remainingDv: number | null,
  past: readonly MissionEvent[],
): AnomalyLevel {
  if (remainingDv != null && remainingDv < CRITICAL_DV_REMAINING_KMS) return 'critical';
  return past.some((e) => e.type === 'warning') ? 'caution' : 'nominal';
}
