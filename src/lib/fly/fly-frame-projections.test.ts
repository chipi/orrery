// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  makeProjectorFactory,
  buildPhaseMarkerScreens,
  buildFdPhaseMarkerScreens,
  buildMilestoneScreens,
  focusMilestones,
  type MilestoneRender,
  type FdStage,
} from './fly-frame-projections';

// Pure HUD-projection builders (RFC-036 WS-B/B4). These lock the guard semantics
// (null → page clears $state) + the array shapes. Vector3.project is GL-free math,
// so a real PerspectiveCamera works in jsdom.

function cam(): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(50, 1.6, 0.1, 10000);
  c.position.set(0, 200, 400);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld(true);
  return c;
}
const container = { clientWidth: 1280, clientHeight: 800 } as HTMLElement;

describe('makeProjectorFactory', () => {
  it('returns null with no container, a factory otherwise', () => {
    expect(makeProjectorFactory(null)).toBeNull();
    const f = makeProjectorFactory(container);
    expect(typeof f).toBe('function');
    expect(f!(1, 2, 3).project(cam())).toBeInstanceOf(THREE.Vector3);
  });
});

describe('buildPhaseMarkerScreens', () => {
  const base = {
    hasPhaseMarkers: true,
    container,
    factory: makeProjectorFactory(container),
    viewMode: 'heliocentric' as const,
    phaseMarkers: [],
    interplanetaryPhaseMarkers: [],
    cislunarCamera: cam(),
    camera: cam(),
    simMet: 100,
    reducedMotion: false,
  };

  it('returns null when the guard fails (no markers / no container)', () => {
    expect(buildPhaseMarkerScreens({ ...base, hasPhaseMarkers: false })).toBeNull();
    expect(buildPhaseMarkerScreens({ ...base, container: null })).toBeNull();
  });

  it('projects interplanetary markers in heliocentric mode', () => {
    const out = buildPhaseMarkerScreens({
      ...base,
      interplanetaryPhaseMarkers: [
        {
          event: { type: 'flyby', met_days: 50 } as never,
          scienceRef: null,
          posAu: { x: 10, y: 0, z: 5 },
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out![0].screen).toBeTruthy();
    expect(typeof out![0].eventLabel).toBe('string');
  });
});

describe('buildFdPhaseMarkerScreens', () => {
  const stages: FdStage[] = [
    { id: 'injection', leg: 'out', tickArc: 0, arcThreshold: 0, label: () => 'INJECTION' },
    { id: 'cruise', leg: 'out', tickArc: 0.5, arcThreshold: 0.1, label: () => 'CRUISE' },
    { id: 'arrival', leg: 'out', tickArc: 1, arcThreshold: 0.95, label: () => 'ARRIVAL' },
    { id: 'cruise-return', leg: 'return', tickArc: 0.5, arcThreshold: 0.1, label: () => 'RETURN' },
  ];
  const outPts = [
    { x: 0, y: 0, z: 0 },
    { x: 5, y: 0, z: 5 },
    { x: 10, y: 0, z: 0 },
  ];

  it('returns null outside heliocentric or with <2 outPts', () => {
    const base = {
      viewMode: 'cislunar' as const,
      outPts,
      retPts: [],
      container,
      factory: makeProjectorFactory(container),
      camera: cam(),
      stages,
      scPhase: 'outbound',
      scProgress: 0.25,
    };
    expect(buildFdPhaseMarkerScreens(base)).toBeNull();
    expect(
      buildFdPhaseMarkerScreens({ ...base, viewMode: 'heliocentric', outPts: [outPts[0]] }),
    ).toBeNull();
  });

  it('skips return-leg stages on a one-way mission (no retPts), hides injection tick', () => {
    const out = buildFdPhaseMarkerScreens({
      viewMode: 'heliocentric',
      outPts,
      retPts: [],
      container,
      factory: makeProjectorFactory(container),
      camera: cam(),
      stages,
      scPhase: 'outbound',
      scProgress: 0.5,
    });
    expect(out!.map((s) => s.id)).toEqual(['injection', 'cruise', 'arrival']); // no cruise-return
    expect(out!.find((s) => s.id === 'injection')!.showTick).toBe(false);
    // outbound @ progress 0.5 → outboundT 1.0 → all thresholds met.
    expect(out!.every((s) => s.revealed)).toBe(true);
  });
});

describe('buildMilestoneScreens', () => {
  const arcTimeline = { dep_day: 0, flyby_day: 50, arr_day: 100 } as never;
  const mission = {
    flight: { events: [{ label: 'Venus flyby', met_days: 40, description: 'GA' }] },
  } as never;

  it('returns null outside heliocentric', () => {
    expect(
      buildMilestoneScreens({
        viewMode: 'cislunar',
        container,
        factory: makeProjectorFactory(container),
        camera: cam(),
        mission,
        simDay: 45,
        arcTimeline,
        outPts: [{ x: 0, z: 0 }],
        retPts: [],
      }),
    ).toBeNull();
  });

  it('projects the active milestone at the current MET', () => {
    const out = buildMilestoneScreens({
      viewMode: 'heliocentric',
      container,
      factory: makeProjectorFactory(container),
      camera: cam(),
      mission,
      simDay: 45,
      arcTimeline,
      outPts: [
        { x: 0, z: 0 },
        { x: 5, z: 5 },
        { x: 10, z: 0 },
      ],
      retPts: [],
    });
    expect(out).toHaveLength(1);
    expect(out![0].label).toBe('Venus flyby');
    expect(out![0].state).toBe('active');
    expect(out![0].active).toBe(true);
  });

  it('draws none while the ship flies a pass off the arc (a flyby after the arrival)', () => {
    // Giotto at Grigg-Skjellerup sits at the arc's end, under the Halley arrival chip.
    const out = buildMilestoneScreens({
      viewMode: 'heliocentric',
      container,
      factory: makeProjectorFactory(container),
      camera: cam(),
      mission,
      simDay: 45,
      arcTimeline,
      outPts: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
      ],
      retPts: [],
      offArc: true,
    });
    expect(out).toEqual([]);
  });

  it('leaves out events after the flown window', () => {
    const out = buildMilestoneScreens({
      viewMode: 'heliocentric',
      container,
      factory: makeProjectorFactory(container),
      camera: cam(),
      mission: {
        flight: {
          events: [
            { label: 'Perihelion', met_days: 100 },
            { label: 'Venus flyby 2', met_days: 900 },
          ],
        },
      } as never,
      simDay: 100,
      arcTimeline,
      outPts: [
        { x: 0, z: 0 },
        { x: 5, z: 5 },
      ],
      retPts: [],
    });
    expect(out!.map((m) => m.label)).toEqual(['Perihelion']);
  });
});

describe('focusMilestones — the flyby label rules (review call 7)', () => {
  const m = (label: string, x: number, state: 'past' | 'active' | 'future'): MilestoneRender => ({
    label,
    met_days: 0,
    screen: { x, y: 300, onScreen: true } as MilestoneRender['screen'],
    active: state === 'active',
    state,
  });
  const set = [
    m('VENUS', 640, 'past'),
    m('MERCURY #1', 650, 'active'),
    m('MERCURY #2', 660, 'future'),
  ];

  it('marks only the active event while a flyby holds the frame', () => {
    const out = focusMilestones(set, { activeOnly: true, hideActiveLabel: false, width: 1280 });
    expect(out.map((x) => x.label)).toEqual(['MERCURY #1']);
  });

  it('keeps every marker outside a flyby', () => {
    const out = focusMilestones(set, { activeOnly: false, hideActiveLabel: false, width: 1280 });
    expect(out).toHaveLength(3);
  });

  it('hides the active label at the hero beat, keeping its diamond', () => {
    const [a] = focusMilestones(set, { activeOnly: true, hideActiveLabel: true, width: 1280 });
    expect(a.labelHidden).toBe(true);
  });

  it('runs a label inward near either edge', () => {
    const out = focusMilestones([m('A', 20, 'past'), m('B', 640, 'past'), m('C', 370, 'past')], {
      activeOnly: false,
      hideActiveLabel: false,
      width: 390,
    });
    expect(out.map((x) => x.align)).toEqual(['start', 'end', 'end']);
  });
});
