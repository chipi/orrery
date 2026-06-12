import { describe, it, expect } from 'vitest';
import { markerStateFor, intensityToOpacity } from './cislunar-marker-reveal';

describe('markerStateFor — phase marker reveal state machine', () => {
  it('returns ghosted before the event', () => {
    const r = markerStateFor(3.13, 1.0);
    expect(r.state).toBe('ghosted');
    expect(r.intensity).toBe(0);
    expect(r.labelVisible).toBe(false);
  });

  it('returns ghosted exactly at delta = -epsilon', () => {
    const r = markerStateFor(3.13, 3.13 - 1e-6);
    expect(r.state).toBe('ghosted');
  });

  it('transitions to fresh at delta = 0', () => {
    const r = markerStateFor(3.13, 3.13);
    expect(r.state).toBe('fresh');
    expect(r.intensity).toBe(0); // delta/freshFadeInDays = 0/0.04
  });

  it('ramps intensity from 0 to 1 across the freshFadeInDays window', () => {
    const event = 3.13;
    const fadeIn = 0.04;
    expect(markerStateFor(event, event).intensity).toBe(0);
    expect(markerStateFor(event, event + fadeIn / 2).intensity).toBeCloseTo(0.5, 5);
    expect(markerStateFor(event, event + fadeIn).intensity).toBe(1);
    expect(markerStateFor(event, event + fadeIn * 2).intensity).toBe(1);
  });

  it('keeps fresh state until freshDurationDays elapses', () => {
    const event = 3.13;
    const r1 = markerStateFor(event, event + 0.1);
    const r2 = markerStateFor(event, event + 0.24);
    expect(r1.state).toBe('fresh');
    expect(r2.state).toBe('fresh');
  });

  it('transitions to visited at delta >= freshDurationDays', () => {
    const event = 3.13;
    const r = markerStateFor(event, event + 0.25);
    expect(r.state).toBe('visited');
    expect(r.intensity).toBe(0.4);
    expect(r.labelVisible).toBe(false);
  });

  it('labelVisible flips on once intensity > 0.05 inside fresh window', () => {
    const event = 3.13;
    // intensity = 0.05 boundary: delta = 0.05 × 0.04 = 0.002
    expect(markerStateFor(event, event + 0.001).labelVisible).toBe(false);
    expect(markerStateFor(event, event + 0.003).labelVisible).toBe(true);
  });

  it('reducedMotion snaps to full label/intensity inside fresh window', () => {
    const event = 3.13;
    const r = markerStateFor(event, event + 0.0001, { reducedMotion: true });
    expect(r.state).toBe('fresh');
    expect(r.intensity).toBe(1);
    expect(r.labelVisible).toBe(true);
  });

  it('reducedMotion does not affect ghosted state before event', () => {
    const r = markerStateFor(3.13, 1.0, { reducedMotion: true });
    expect(r.state).toBe('ghosted');
    expect(r.intensity).toBe(0);
  });

  it('reducedMotion does not affect visited state after fresh window', () => {
    const event = 3.13;
    const r = markerStateFor(event, event + 1.0, { reducedMotion: true });
    expect(r.state).toBe('visited');
    expect(r.intensity).toBe(0.4);
  });

  it('options override defaults — custom freshDurationDays + visitedIntensity', () => {
    const event = 3.13;
    const r = markerStateFor(event, event + 1.5, {
      freshDurationDays: 1.0,
      visitedIntensity: 0.7,
    });
    expect(r.state).toBe('visited');
    expect(r.intensity).toBe(0.7);
  });
});

describe('intensityToOpacity', () => {
  it('intensity 0 → opacity 0.18 (ghosted markers stay subtly visible)', () => {
    expect(intensityToOpacity(0)).toBeCloseTo(0.18, 5);
  });
  it('intensity 1 → opacity 1.0', () => {
    expect(intensityToOpacity(1)).toBe(1.0);
  });
  it('mid-range intensity 0.5 → opacity 0.59', () => {
    expect(intensityToOpacity(0.5)).toBeCloseTo(0.59, 5);
  });
  it('clamps negative input to 0', () => {
    expect(intensityToOpacity(-1)).toBeCloseTo(0.18, 5);
  });
  it('clamps > 1 input to 1', () => {
    expect(intensityToOpacity(2)).toBe(1.0);
  });
});
