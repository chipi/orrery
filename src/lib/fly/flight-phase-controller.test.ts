import { describe, it, expect } from 'vitest';
import {
  createFlightPhaseController,
  reduceFlyAct,
  deriveFlightPhaseState,
  type FlightPhaseInputs,
  type FlyAct,
} from './flight-phase-controller';

// The /fly phase machine reducer (RFC-036 WS-A). These lock the A0 transition
// table — including the exact regression this session kept hitting by hand:
// a crewed / earth-orbit mission must route ascent → COAST → descent, never the
// heliocentric cruise fallback.

const base: FlightPhaseInputs = {
  isMoonMission: false,
  launchAvailable: true,
  earthCoast: false,
  descentAvailable: true,
  descentBody: null,
  deepLink: { launch: false, descent: false, missionMatches: false },
};
const inputs = (over: Partial<FlightPhaseInputs> = {}): FlightPhaseInputs => ({
  ...base,
  ...over,
});

describe('reduceFlyAct — transition table', () => {
  it('startLaunch → ascent when a launch profile is available', () => {
    expect(reduceFlyAct('opening', inputs(), { type: 'startLaunch' })).toBe('ascent');
  });

  it('startLaunch is a no-op when no launch profile (guard)', () => {
    expect(
      reduceFlyAct('cruise', inputs({ launchAvailable: false }), { type: 'startLaunch' }),
    ).toBe('cruise');
  });

  // THE earth-orbit routing bug this whole refactor is meant to make un-missable.
  it('launchComplete → COAST for an earth-orbit mission (NOT heliocentric cruise)', () => {
    expect(reduceFlyAct('ascent', inputs({ earthCoast: true }), { type: 'launchComplete' })).toBe(
      'coast',
    );
  });

  it('launchComplete → cruise for a non-earth-orbit mission', () => {
    expect(reduceFlyAct('ascent', inputs({ earthCoast: false }), { type: 'launchComplete' })).toBe(
      'cruise',
    );
  });

  it('coastComplete → descent once the descent profile is loaded', () => {
    expect(
      reduceFlyAct('coast', inputs({ earthCoast: true, descentAvailable: true }), {
        type: 'coastComplete',
      }),
    ).toBe('descent');
  });

  it('coastComplete holds (no blank scene) while the descent profile is still loading', () => {
    expect(
      reduceFlyAct('coast', inputs({ earthCoast: true, descentAvailable: false }), {
        type: 'coastComplete',
      }),
    ).toBe('coast');
  });

  it('startDescent → descent (guarded on descentAvailable)', () => {
    expect(reduceFlyAct('cruise', inputs(), { type: 'startDescent' })).toBe('descent');
    expect(
      reduceFlyAct('cruise', inputs({ descentAvailable: false }), { type: 'startDescent' }),
    ).toBe('cruise');
  });

  it('touchdown → recovery for an earth reentry', () => {
    expect(reduceFlyAct('descent', inputs({ descentBody: 'earth' }), { type: 'touchdown' })).toBe(
      'recovery',
    );
  });

  it('touchdown for moon/mars/venus stays descent (page navigates to the surface route)', () => {
    for (const body of ['moon', 'mars', 'venus'] as const) {
      expect(reduceFlyAct('descent', inputs({ descentBody: body }), { type: 'touchdown' })).toBe(
        'descent',
      );
    }
  });

  it('skipOpening → ascent for an earth-orbit mission, else reveals cruise', () => {
    expect(
      reduceFlyAct('opening', inputs({ earthCoast: true, launchAvailable: true }), {
        type: 'skipOpening',
      }),
    ).toBe('ascent');
    expect(reduceFlyAct('opening', inputs({ earthCoast: false }), { type: 'skipOpening' })).toBe(
      'cruise',
    );
    // earth-orbit but no launch profile → can't launch, falls to cruise.
    expect(
      reduceFlyAct('opening', inputs({ earthCoast: true, launchAvailable: false }), {
        type: 'skipOpening',
      }),
    ).toBe('cruise');
  });

  it('scrubTo maps bands to acts; cruise band → coast for earth-orbit missions', () => {
    expect(reduceFlyAct('cruise', inputs(), { type: 'scrubTo', phase: 'ascent' })).toBe('ascent');
    expect(reduceFlyAct('ascent', inputs(), { type: 'scrubTo', phase: 'descent' })).toBe('descent');
    expect(
      reduceFlyAct('ascent', inputs({ earthCoast: false }), { type: 'scrubTo', phase: 'cruise' }),
    ).toBe('cruise');
    expect(
      reduceFlyAct('ascent', inputs({ earthCoast: true }), { type: 'scrubTo', phase: 'cruise' }),
    ).toBe('coast');
  });

  it('enterOpening returns to opening (mission swap / scrub-to-MET-0 replay)', () => {
    expect(reduceFlyAct('cruise', inputs(), { type: 'enterOpening' })).toBe('opening');
    expect(reduceFlyAct('ascent', inputs(), { type: 'enterOpening' })).toBe('opening');
  });

  it('openingComplete fades to cruise (timed auto-end)', () => {
    expect(reduceFlyAct('opening', inputs(), { type: 'openingComplete' })).toBe('cruise');
  });

  it('closeRecovery dismisses the card back to cruise', () => {
    expect(
      reduceFlyAct('recovery', inputs({ descentBody: 'earth' }), { type: 'closeRecovery' }),
    ).toBe('cruise');
  });

  it('is pure — same (act, inputs, event) always yields the same act', () => {
    const a = reduceFlyAct('ascent', inputs({ earthCoast: true }), { type: 'launchComplete' });
    const b = reduceFlyAct('ascent', inputs({ earthCoast: true }), { type: 'launchComplete' });
    expect(a).toBe(b);
  });
});

describe('deriveFlightPhaseState — the read-only view', () => {
  it('exactly one show* flag is true per act, and it matches the act', () => {
    const map: Record<FlyAct, keyof ReturnType<typeof deriveFlightPhaseState>> = {
      opening: 'showOpening',
      ascent: 'showLaunch',
      coast: 'showCoast',
      descent: 'showDescent',
      recovery: 'showRecovery',
      cruise: 'showCruise',
    };
    for (const act of Object.keys(map) as FlyAct[]) {
      const s = deriveFlightPhaseState(act, inputs());
      const flags = [
        s.showOpening,
        s.showLaunch,
        s.showCoast,
        s.showDescent,
        s.showRecovery,
        s.showCruise,
      ];
      expect(flags.filter(Boolean).length).toBe(1);
      expect(s[map[act]]).toBe(true);
    }
  });

  it('viewMode follows isMoonMission', () => {
    expect(deriveFlightPhaseState('cruise', inputs({ isMoonMission: true })).viewMode).toBe(
      'cislunar',
    );
    expect(deriveFlightPhaseState('cruise', inputs({ isMoonMission: false })).viewMode).toBe(
      'heliocentric',
    );
  });

  it('segment matches the legacy flySegment derivation (opening/cruise/recovery → cruise)', () => {
    expect(deriveFlightPhaseState('ascent', inputs()).segment).toBe('ascent');
    expect(deriveFlightPhaseState('coast', inputs()).segment).toBe('coast');
    expect(deriveFlightPhaseState('descent', inputs()).segment).toBe('descent');
    expect(deriveFlightPhaseState('opening', inputs()).segment).toBe('cruise');
    expect(deriveFlightPhaseState('cruise', inputs()).segment).toBe('cruise');
    expect(deriveFlightPhaseState('recovery', inputs()).segment).toBe('cruise');
  });
});

describe('createFlightPhaseController — the full flight of an earth-orbit capsule', () => {
  it('opening → ascent → coast → descent → recovery (Friendship-7-class)', () => {
    const c = createFlightPhaseController(
      inputs({
        earthCoast: true,
        launchAvailable: true,
        descentAvailable: true,
        descentBody: 'earth',
      }),
    );
    expect(c.state.act).toBe('opening');
    expect(c.dispatch({ type: 'startLaunch' }).act).toBe('ascent');
    expect(c.dispatch({ type: 'launchComplete' }).act).toBe('coast'); // NOT cruise — the bug
    expect(c.dispatch({ type: 'coastComplete' }).act).toBe('descent');
    expect(c.dispatch({ type: 'touchdown' }).act).toBe('recovery');
  });

  it('a heliocentric mission goes opening → ascent → cruise', () => {
    const c = createFlightPhaseController(inputs({ earthCoast: false, launchAvailable: true }));
    expect(c.dispatch({ type: 'startLaunch' }).act).toBe('ascent');
    expect(c.dispatch({ type: 'launchComplete' }).act).toBe('cruise');
    expect(c.state.showCruise).toBe(true);
  });

  it('setInputs re-derives the view (mission swap flips cislunar/heliocentric)', () => {
    const c = createFlightPhaseController(inputs({ isMoonMission: false }));
    expect(c.state.viewMode).toBe('heliocentric');
    c.setInputs(inputs({ isMoonMission: true }));
    expect(c.state.viewMode).toBe('cislunar');
  });
});
