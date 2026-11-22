import type { AscentSummary, PartRecovery } from '$lib/physics/ascent/ascent-physics';
import type { DescentSummary } from '$lib/physics/descent/descent-physics';
import { injectionBurnLabel, type InjectionBurnParams } from '$lib/physics/transfer/injection-burn';
import { INJECTION_COAST_S, buildAscentBeats, injectionSepT, secoTimeS } from './ascent-hud';
import { buildDescentBeats } from './descent-hud';
import { terminalStartTime, unwarpDescentTime } from './descent-timewarp';

/**
 * The flight plan, one source for the launch HUD's FLIGHT PLAN list and the marker row on
 * /fly's play bar (UXD-042), so the two cannot disagree. Labels are the English codes the
 * HUD modules use as identifiers; every renderer passes them through `hudLabel`.
 */
export interface PlanBeat {
  label: string;
  t: number;
  /** A cinematic-clock beat after SECO: it has a position, not a real mission time. */
  untimed?: boolean;
}

/**
 * Liftoff, the ascent beats, then the parking orbit, injection burn and spacecraft
 * separation when the mission leaves orbit (`injection` set); without one, a separation
 * `separationDelayS` after SECO when the vehicle publishes that delay (backlog F1).
 */
export function buildPlanBeats(
  summary: AscentSummary,
  injection: Pick<InjectionBurnParams, 'burnType'> | null,
  separationDelayS = 0,
  /** The flight's booster landings (`landingsFor`): BOOSTER LANDING or TOWER CATCH at touchdown,
   *  in time order with the rest (0.9.11 F2). */
  landings: (Pick<PartRecovery, 'outcome'> & { touchdownS: number })[] = [],
): PlanBeat[] {
  const duration = summary.totalDurationS;
  const beats = buildAscentBeats(summary);
  const plan: PlanBeat[] = [
    { label: 'LIFTOFF', t: 0 },
    // ORBIT and SECO land on the same second: the cutoff is the beat.
    ...beats.filter(
      (b) =>
        !(b.label === 'ORBIT' && beats.some((x) => x.label === 'SECO' && Math.abs(x.t - b.t) < 2)),
    ),
    ...(injection
      ? [
          { label: 'PARKING ORBIT', t: duration, untimed: true },
          {
            label: injectionBurnLabel(injection.burnType),
            t: duration + INJECTION_COAST_S,
            untimed: true,
          },
          { label: 'SPACECRAFT SEP', t: injectionSepT(duration), untimed: true },
        ]
      : separationDelayS > 0
        ? [{ label: 'SPACECRAFT SEP', t: secoTimeS(summary) + separationDelayS }]
        : []),
  ];
  const landingBeats = landings.map((l) => ({
    label: l.outcome === 'caught' ? 'TOWER CATCH' : 'BOOSTER LANDING',
    t: l.touchdownS,
  }));
  return [...plan, ...landingBeats].sort((a, b) => a.t - b.t);
}

/**
 * The descent beats in the bar's own clock. The descent scene warps its sample clock so the
 * terminal EDL stays reachable (descent-timewarp), so a beat's trajectory time is unwarped to
 * where the scrubber (and the scene's clock readout) puts it.
 */
export function descentPlanBeats(summary: DescentSummary): Array<{ label: string; t: number }> {
  const dur = summary.totalDurationS;
  const tB = terminalStartTime(summary.states, dur);
  return buildDescentBeats(summary).map((b) => ({
    label: b.label,
    t: unwarpDescentTime(b.t, dur, tB),
  }));
}
