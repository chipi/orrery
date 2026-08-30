import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Wiring guard for the /moon live terminator (#48). The phase/libration/sub-solar
// math is unit-tested in moon-observer.test.ts and the render was validated
// in-browser across new/quarter/full; this just pins the two-call wiring so a
// refactor can't silently drop the terminator (leaving a flat, fully-lit globe).
const moon = readFileSync(
  fileURLToPath(new URL('../../../routes/moon/+page.svelte', import.meta.url)),
  'utf8',
);
const scene = readFileSync(
  fileURLToPath(new URL('../../surface-scene/SurfaceScene.svelte', import.meta.url)),
  'utf8',
);

describe('/moon live terminator wiring', () => {
  it('orients to the sub-Earth point AND lights from the sub-solar point', () => {
    expect(moon).toMatch(/faceLatLon\(\s*view\.libration\.latDeg/);
    expect(moon).toMatch(/aimSunAtBodyLatLon\(\s*view\.subSolar\.latDeg/);
  });

  it('SurfaceScene exposes both handles', () => {
    expect(scene).toMatch(/export function faceLatLon\(/);
    expect(scene).toMatch(/export function aimSunAtBodyLatLon\(/);
    // The sun aim must position the DirectionalLight along the body-frame point.
    expect(scene).toMatch(/aimSunAtBodyLatLonImpl\s*=/);
    expect(scene).toMatch(/sun\.position\.copy/);
  });
});
