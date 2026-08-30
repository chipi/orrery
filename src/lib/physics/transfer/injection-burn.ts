/**
 * Orbital-injection burn resolution (RFC-034 §3.1).
 *
 * After SECO the launch vehicle is in a low Earth parking orbit; a kick / upper
 * stage then fires to leave it and build the transfer speed (trans-lunar,
 * trans-Mars, or a generic escape/interplanetary injection). This is the beat
 * `LaunchScene` plays at the launch→cruise seam — the "booster fires up to
 * create the initial speed" moment. This module is the PURE resolver: given a
 * mission's launcher + flight data, it names the stage, the burn type, and the
 * Δv, or returns null when the mission has no injection stage (LEO-only, or an
 * unmodelled launcher) so the beat is simply absent.
 *
 * The stage name prefers the mission's authored `flight.launch.vehicle_stage`
 * (most accurate — e.g. New Horizons' STAR 48B); otherwise it falls back to the
 * launcher's standard injection stage. The Δv reuses the already-authored
 * `flight.totals.tli_or_tmi_dv_km_s`.
 */

import type { Destination } from '$types/mission';

/** The kind of injection — drives the HUD callout wording. */
export type InjectionBurnType = 'TLI' | 'TMI' | 'INJECTION';

export interface InjectionBurnParams {
  /** Human-readable injection stage, e.g. "Centaur upper stage". */
  stageName: string;
  /** Injection Δv (km·s⁻¹); null when the stage is known but no Δv is published. */
  dvKms: number | null;
  /** TLI (Moon) · TMI (Mars) · INJECTION (everything else). */
  burnType: InjectionBurnType;
}

/**
 * Standard injection / kick stage per launcher, used when a mission doesn't
 * author its own `vehicle_stage`. Only launchers that actually restart an upper
 * stage (or fly a dedicated kick stage) to leave parking orbit appear here;
 * LEO-direct launchers (Mercury-Atlas, Titan II GLV, Vostok) are absent so they
 * resolve to no beat.
 */
const LAUNCHER_INJECTION_STAGE: Record<string, string> = {
  'saturn-v': 'Saturn V S-IVB (third stage)',
  'saturn-ib': 'Saturn IB S-IVB (second stage)',
  'atlas-v': 'Centaur upper stage',
  'falcon-9': 'Falcon 9 second stage',
  'falcon-heavy': 'Falcon Heavy second stage',
  'proton-k': 'Blok D upper stage',
  'proton-m': 'Briz-M upper stage',
  'ariane-5': 'ESC-A upper stage',
  'h-iia': 'H-IIA second stage',
  'delta-ii': 'Delta II second stage',
};

/** Burn type from the destination: Moon → TLI, Mars → TMI, else generic. */
export function injectionBurnType(dest: Destination | undefined): InjectionBurnType {
  if (dest === 'MOON') return 'TLI';
  if (dest === 'MARS') return 'TMI';
  return 'INJECTION';
}

/** Long callout wording for a burn type ("TRANS-LUNAR INJECTION", …). */
export function injectionBurnLabel(burnType: InjectionBurnType): string {
  switch (burnType) {
    case 'TLI':
      return 'TRANS-LUNAR INJECTION';
    case 'TMI':
      return 'TRANS-MARS INJECTION';
    default:
      return 'ORBITAL INJECTION';
  }
}

/**
 * Resolve the injection burn for a mission, or null when it has none.
 *
 * @param launcherId  the flagship/generic launcher id (fleet_refs launcher role)
 * @param vehicleStage  the mission's `flight.launch.vehicle_stage`, if authored
 * @param tliOrTmiDvKms  the mission's `flight.totals.tli_or_tmi_dv_km_s`, if authored
 * @param dest  the mission destination (for the burn type)
 */
export function resolveInjectionBurn(
  launcherId: string | undefined,
  vehicleStage: string | undefined,
  tliOrTmiDvKms: number | undefined,
  dest: Destination | undefined,
): InjectionBurnParams | null {
  // Authored stage wins; else the launcher's standard injection stage.
  const stageName = vehicleStage ?? (launcherId ? LAUNCHER_INJECTION_STAGE[launcherId] : undefined);
  if (!stageName) return null; // LEO-direct or unmodelled launcher → no beat
  return {
    stageName,
    dvKms: tliOrTmiDvKms ?? null,
    burnType: injectionBurnType(dest),
  };
}
