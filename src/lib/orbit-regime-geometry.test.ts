/**
 * Regime -> radius for the four ruler scenes. The numbers are checked against the functions that
 * place the objects (altToSurfaceScene, surfaceOrbitRadius, PLANETS[].orbitR), so a highlighted
 * band cannot drift from where its residents ride.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { altToSurfaceScene } from '$lib/scale';
import { PLANETS } from '$lib/explore-scene';
import type { OrbitRegime } from '$types/orbit-regime';
import {
  ASTEROID_BELT_R,
  KUIPER_BELT_R,
  SUN_RING_R,
  regimeShape,
  surfaceOrbitRadius,
  type RulerScene,
} from './orbit-regime-geometry';

const load = (b: string) =>
  JSON.parse(readFileSync(`static/data/${b}.json`, 'utf8')) as OrbitRegime[];
const SCENES: Record<RulerScene, OrbitRegime[]> = {
  earth: load('orbit-regimes'),
  moon: load('orbit-regimes-moon'),
  mars: load('orbit-regimes-mars'),
  explore: load('orbit-regimes-explore'),
};
const MOON_R = 132;
const shape = (scene: RulerScene, id: string) =>
  regimeShape(
    scene,
    SCENES[scene].find((r) => r.id === id)!,
    { planetRadius: 30, moonR: MOON_R },
  )!;

describe('regimeShape', () => {
  it.each(Object.keys(SCENES) as RulerScene[])('%s: every regime has a shape', (scene) => {
    for (const r of SCENES[scene]) {
      const s = regimeShape(scene, r, { planetRadius: 30, moonR: MOON_R });
      expect(s, `${scene} ${r.id}`).not.toBeNull();
      expect(s!.outer).toBeGreaterThanOrEqual(s!.inner);
    }
  });

  it('/earth: the numbers of the brief, from altToSurfaceScene', () => {
    const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 2);
    const leo = shape('earth', 'LEO');
    near(leo.inner, 31.33);
    near(leo.outer, 35.42);
    expect(leo.kind).toBe('band');
    near(shape('earth', 'MEO').outer, altToSurfaceScene(30, 35786));
    near(shape('earth', 'MEO').outer, 41.73);
    near(shape('earth', 'GEO').inner, 41.73);
    expect(shape('earth', 'GEO').kind).toBe('ring');
    near(shape('earth', 'HEO').inner, 34.05);
    near(shape('earth', 'HEO').outer, 42.48);
    near(shape('earth', 'L2').inner, 50.15);
    expect(shape('earth', 'L2').kind).toBe('marker');
  });

  it('/earth: MOON is a ring at the Moon ghost, not at its log-scale radius', () => {
    expect(shape('earth', 'MOON')).toMatchObject({ kind: 'ring', inner: MOON_R, outer: MOON_R });
    expect(
      regimeShape(
        'earth',
        SCENES.earth.find((r) => r.id === 'MOON')!,
        { planetRadius: 30 },
      ),
    ).toBeNull();
  });

  it('/moon: ring formula, L2 a marker, HILL a shell', () => {
    expect(shape('moon', 'LLO').inner).toBeCloseTo(surfaceOrbitRadius(30, 50), 10);
    expect(shape('moon', 'LLO').inner).toBeCloseTo(35.51, 2);
    expect(shape('moon', 'LLO').outer).toBeCloseTo(36.39, 2);
    expect(shape('moon', 'HLO').outer).toBeCloseTo(39.21, 2);
    expect(shape('moon', 'NRHO').inner).toBeCloseTo(42.93, 2);
    expect(shape('moon', 'NRHO').outer).toBeCloseTo(49.73, 2);
    expect(shape('moon', 'L2')).toMatchObject({ kind: 'marker' });
    expect(shape('moon', 'L2').inner).toBeCloseTo(49.55, 2);
    expect(shape('moon', 'HILL')).toMatchObject({ kind: 'shell' });
    expect(shape('moon', 'HILL').inner).toBeCloseTo(49.4, 2);
  });

  it('/mars: ring formula, AREOSTATIONARY a ring, HILL a shell', () => {
    expect(shape('mars', 'LMO').inner).toBeCloseTo(37.01, 2);
    expect(shape('mars', 'LMO').outer).toBeCloseTo(39.21, 2);
    expect(shape('mars', 'HMO').inner).toBeCloseTo(40.61, 2);
    expect(shape('mars', 'AREOSTATIONARY')).toMatchObject({ kind: 'ring' });
    expect(shape('mars', 'AREOSTATIONARY').inner).toBeCloseTo(46.67, 2);
    expect(shape('mars', 'DMO').inner).toBeCloseTo(47.02, 2);
    expect(shape('mars', 'DMO').outer).toBeCloseTo(48.68, 2);
    expect(shape('mars', 'HILL')).toMatchObject({ kind: 'shell' });
    expect(shape('mars', 'HILL').inner).toBeCloseTo(55.67, 2);
  });

  it('/explore: bands come from PLANETS[].orbitR and the belt constants', () => {
    const r = (id: string) => PLANETS.find((p) => p.id === id)!.orbitR;
    expect(shape('explore', 'TERRESTRIAL')).toMatchObject({
      kind: 'band',
      inner: r('mercury'),
      outer: r('mars'),
    });
    expect(shape('explore', 'GIANTS')).toMatchObject({ inner: r('jupiter'), outer: r('neptune') });
    expect(shape('explore', 'BELT')).toMatchObject({
      inner: ASTEROID_BELT_R[0],
      outer: ASTEROID_BELT_R[1],
    });
    expect(shape('explore', 'KUIPER')).toMatchObject({
      inner: KUIPER_BELT_R[0],
      outer: KUIPER_BELT_R[1],
    });
    expect(shape('explore', 'SUN')).toMatchObject({ kind: 'ring', inner: SUN_RING_R });
  });

  it('/explore: the three regimes beyond the scene are schematic, outside the Kuiper belt', () => {
    for (const id of ['SCATTERED', 'HELIOPAUSE', 'OORT']) {
      const s = shape('explore', id);
      expect(s.schematic, id).toBe(true);
      expect(s.inner, id).toBeGreaterThanOrEqual(KUIPER_BELT_R[1]);
    }
    expect(shape('explore', 'SCATTERED').kind).toBe('band');
    expect(shape('explore', 'HELIOPAUSE').kind).toBe('ring');
    expect(shape('explore', 'OORT').kind).toBe('ring');
  });

  it('/explore: shapes are ordered like the ruler, Sun outwards', () => {
    const order = [
      'SUN',
      'TERRESTRIAL',
      'BELT',
      'GIANTS',
      'KUIPER',
      'SCATTERED',
      'HELIOPAUSE',
      'OORT',
    ];
    const inners = order.map((id) => shape('explore', id).inner);
    expect([...inners].sort((a, b) => a - b)).toEqual(inners);
  });

  it('/earth: bands are ordered like the ruler, LEO outwards', () => {
    const order = ['LEO', 'MEO', 'GEO'];
    const outers = order.map((id) => shape('earth', id).outer);
    expect([...outers].sort((a, b) => a - b)).toEqual(outers);
  });
});
