// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildMicrogravityAxes } from './microgravity-axes';

/**
 * Microgravity-axis overlay structural guardrails. Pure THREE.js
 * function — no DOM, no canvas. The Sprite tip-labels in
 * `buildArrowTipLabel` do use a CanvasTexture, hence the jsdom env.
 */

describe('buildMicrogravityAxes', () => {
  it('returns a THREE.Group named "microgravity_axes"', () => {
    const g = buildMicrogravityAxes();
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.name).toBe('microgravity_axes');
  });

  it('group is hidden by default (toggled on by the lens-layer hook)', () => {
    const g = buildMicrogravityAxes();
    expect(g.visible).toBe(false);
  });

  it('contains 6 ArrowHelper instances — one per local-frame axis', () => {
    const g = buildMicrogravityAxes();
    let arrowCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.ArrowHelper) arrowCount++;
    });
    expect(arrowCount).toBe(6);
  });

  it('arrows are named axis_zenith / axis_nadir / axis_prograde / axis_retrograde / axis_starboard / axis_port', () => {
    const g = buildMicrogravityAxes();
    const expected = new Set([
      'axis_zenith',
      'axis_nadir',
      'axis_prograde',
      'axis_retrograde',
      'axis_starboard',
      'axis_port',
    ]);
    const found = new Set<string>();
    g.traverse((obj) => {
      if (obj instanceof THREE.ArrowHelper) found.add(obj.name);
    });
    expect(found).toEqual(expected);
  });

  it('contains 6 Sprite tip-labels (one per axis)', () => {
    const g = buildMicrogravityAxes();
    let spriteCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Sprite) spriteCount++;
    });
    expect(spriteCount).toBe(6);
  });

  it('every Sprite tip-label tags its axis via userData.axisLabel', () => {
    const g = buildMicrogravityAxes();
    const labels = new Set<string>();
    g.traverse((obj) => {
      if (obj instanceof THREE.Sprite && typeof obj.userData.axisLabel === 'string') {
        labels.add(obj.userData.axisLabel);
      }
    });
    expect(labels).toEqual(
      new Set(['ZENITH', 'NADIR', 'PROGRADE', 'RETROGRADE', 'STARBOARD', 'PORT']),
    );
  });

  it('zenith + nadir share the TEAL color (paired axis grouping)', () => {
    const g = buildMicrogravityAxes();
    const colors = new Map<string, number>();
    g.traverse((obj) => {
      if (obj instanceof THREE.ArrowHelper) {
        // ArrowHelper exposes the line material whose color the user sees.
        const line = obj.line as THREE.Line;
        const mat = line.material as THREE.LineBasicMaterial;
        colors.set(obj.name, mat.color.getHex());
      }
    });
    expect(colors.get('axis_zenith')).toBe(colors.get('axis_nadir'));
    expect(colors.get('axis_prograde')).toBe(colors.get('axis_retrograde'));
    expect(colors.get('axis_starboard')).toBe(colors.get('axis_port'));
    // The three pair-colors must all be distinct (teal / red / blue).
    const distinct = new Set([
      colors.get('axis_zenith'),
      colors.get('axis_prograde'),
      colors.get('axis_starboard'),
    ]);
    expect(distinct.size).toBe(3);
  });

  it('scales head dimensions with the length parameter', () => {
    // Building at length=2 should produce arrows half the size of length=4.
    // Hard to inspect ArrowHelper geometry directly, so assert via Sprite
    // tip-label positions which sit at `length * 1.18` along each axis.
    const g2 = buildMicrogravityAxes(2);
    const g4 = buildMicrogravityAxes(4);
    let zenithPos2 = 0;
    let zenithPos4 = 0;
    g2.traverse((obj) => {
      if (obj instanceof THREE.Sprite && obj.userData.axisLabel === 'ZENITH') {
        zenithPos2 = obj.position.y;
      }
    });
    g4.traverse((obj) => {
      if (obj instanceof THREE.Sprite && obj.userData.axisLabel === 'ZENITH') {
        zenithPos4 = obj.position.y;
      }
    });
    // 4 / 2 = 2, so g4's ZENITH sprite should sit at exactly 2× g2's.
    expect(zenithPos4 / zenithPos2).toBeCloseTo(2.0, 5);
  });

  it('uses default length=4 when invoked with no argument', () => {
    const g = buildMicrogravityAxes();
    let zenithY = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Sprite && obj.userData.axisLabel === 'ZENITH') {
        zenithY = obj.position.y;
      }
    });
    // Sprite sits at length * 1.18 = 4 * 1.18 = 4.72.
    expect(zenithY).toBeCloseTo(4.72, 2);
  });

  it('axis directions are correctly oriented (Sprite positions confirm direction signs)', () => {
    const g = buildMicrogravityAxes(4);
    const positions: Record<string, THREE.Vector3> = {};
    g.traverse((obj) => {
      if (obj instanceof THREE.Sprite && typeof obj.userData.axisLabel === 'string') {
        positions[obj.userData.axisLabel] = obj.position.clone();
      }
    });
    expect(positions.ZENITH.y).toBeGreaterThan(0);
    expect(positions.NADIR.y).toBeLessThan(0);
    expect(positions.PROGRADE.x).toBeGreaterThan(0);
    expect(positions.RETROGRADE.x).toBeLessThan(0);
    expect(positions.STARBOARD.z).toBeGreaterThan(0);
    expect(positions.PORT.z).toBeLessThan(0);
  });
});
