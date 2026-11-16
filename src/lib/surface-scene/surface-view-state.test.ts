import { describe, it, expect } from 'vitest';
import {
  DETAIL_FLY_TARGET_R,
  mobileDrawerHidden,
  nationFilterAway,
  ORBIT_RULER_HIDE_RADII,
  orbitsInViewNext,
  shouldFlyToDetail,
} from './surface-view-state';

const base = {
  view: '3d' as const,
  tagStageOn: true,
  altitudeKm: 5000,
  radiusKm: 3390,
  routeViewActive: false,
  flatPatchActive: false,
};

describe('nationFilterAway', () => {
  it('shows the filter on the globe once site icons are out', () => {
    expect(nationFilterAway(base)).toBe(false);
  });
  it('hides it on the bare globe', () => {
    expect(nationFilterAway({ ...base, tagStageOn: false })).toBe(true);
  });
  it('hides it in route view even at route-view altitude (was shown)', () => {
    expect(nationFilterAway({ ...base, routeViewActive: true })).toBe(true);
  });
  it('hides it in flat-patch zoom', () => {
    expect(nationFilterAway({ ...base, flatPatchActive: true })).toBe(true);
  });
  it('hides it for the whole Zoom-in fly (altitude is still above threshold)', () => {
    expect(nationFilterAway({ ...base, detailFlying: true })).toBe(true);
  });
  it('the 2D map always shows it', () => {
    expect(nationFilterAway({ ...base, view: '2d', routeViewActive: true })).toBe(false);
  });
});

describe('mobileDrawerHidden', () => {
  it('hides in route view and flat patch only', () => {
    expect(mobileDrawerHidden({ routeViewActive: true, flatPatchActive: false })).toBe(true);
    expect(mobileDrawerHidden({ routeViewActive: false, flatPatchActive: true })).toBe(true);
    expect(
      mobileDrawerHidden({ routeViewActive: false, flatPatchActive: false, detailFlying: true }),
    ).toBe(true);
    expect(mobileDrawerHidden({ routeViewActive: false, flatPatchActive: false })).toBe(false);
  });
});

describe('shouldFlyToDetail', () => {
  it('flies from a route view framed at 31.6 (the old camR < 32 guard made it dead)', () => {
    expect(shouldFlyToDetail(31.6)).toBe(true);
  });
  it('flies from the default landing and from a wide route view', () => {
    expect(shouldFlyToDetail(37)).toBe(true);
    expect(shouldFlyToDetail(70)).toBe(true);
  });
  it('is a no-op when already at the target', () => {
    expect(shouldFlyToDetail(DETAIL_FLY_TARGET_R)).toBe(false);
    expect(shouldFlyToDetail(30.1)).toBe(false);
  });
});

describe('orbitsInViewNext', () => {
  const radiusKm = 1737;
  const lroFlyInKm = 1129;
  it('hides once the camera is under one radius when nothing is focused', () => {
    expect(
      orbitsInViewNext({
        altitudeKm: lroFlyInKm,
        radiusKm,
        wasInView: true,
        focusOnOrbiter: false,
      }),
    ).toBe(false);
  });

  it('keeps the orbits in view under one radius while an orbiter is the focus (W3)', () => {
    expect(
      orbitsInViewNext({ altitudeKm: lroFlyInKm, radiusKm, wasInView: true, focusOnOrbiter: true }),
    ).toBe(true);
    expect(
      orbitsInViewNext({ altitudeKm: 10, radiusKm, wasInView: false, focusOnOrbiter: true }),
    ).toBe(true);
  });

  it('returns to the old rule the frame the focus clears', () => {
    expect(
      orbitsInViewNext({
        altitudeKm: lroFlyInKm,
        radiusKm,
        wasInView: true,
        focusOnOrbiter: false,
      }),
    ).toBe(false);
  });

  it('shows again only past the 12 % band, and holds inside it', () => {
    const hideKm = radiusKm * ORBIT_RULER_HIDE_RADII;
    const args = { radiusKm, focusOnOrbiter: false, wasInView: false };
    expect(orbitsInViewNext({ ...args, altitudeKm: hideKm * 1.05 })).toBe(false);
    expect(orbitsInViewNext({ ...args, altitudeKm: hideKm * 1.13 })).toBe(true);
    expect(orbitsInViewNext({ ...args, wasInView: true, altitudeKm: hideKm * 1.05 })).toBe(true);
  });
});
