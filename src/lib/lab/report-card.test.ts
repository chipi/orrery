// @vitest-environment jsdom
/**
 * Share-card compositor under the coverage ratchet (G holistic m-1) — jsdom +
 * the node `canvas` package give a real 2D context. Pixel output is checked
 * with real art later (none exists yet); here: the compositor produces a PNG
 * blob, survives a dead art URL gracefully, and the illustration lookup's
 * empty-manifest path answers undefined (m-3).
 */
import { describe, it, expect } from 'vitest';
import { composeReportCard } from './report-card';
import { illustrationFor } from './illustration';

const baseInput = {
  title: 'Launch a rocket into the black',
  lines: [
    { label: 'Δv', value: '9.40 km/s' },
    { label: 'Time of flight', value: '258.90 day' },
  ],
  illustrationBadge: 'illustration',
  shareUrl: 'https://orrerylearn.com/lab?nb=abc',
  wordmark: 'Orrery · Physics Lab',
};

describe('composeReportCard', () => {
  it('composes a PNG blob from kernel lines without art', async () => {
    const blob = await composeReportCard(baseInput);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe('image/png');
    expect(blob!.size).toBeGreaterThan(1000);
  });

  it('a dead illustration URL degrades gracefully — card still composes, no throw', async () => {
    // jsdom fires neither onload nor onerror — this exercises the 4s
    // never-hang timeout path, which browsers also need for stalled loads.
    const blob = await composeReportCard({
      ...baseInput,
      illustrationUrl: 'http://127.0.0.1:1/nope.webp',
    });
    expect(blob).toBeInstanceOf(Blob);
  }, 10_000);
});

describe('illustrationFor (m-3)', () => {
  it('answers the manifest entry for an approved goal, undefined for an unknown id', () => {
    // The FB1b batch (operator-approved 2026-09-09) populated the manifest — the
    // empty-manifest era this test guarded is over; graceful-absent still holds
    // for ids with no art (a restored/custom notebook has no goalId identity).
    const hit = illustrationFor('launch-a-rocket');
    expect(hit?.file).toBe('images/lab/goals/launch-a-rocket.webp');
    expect(hit?.altKey).toBe('lab.illustration.alt.launch-a-rocket');
    expect(illustrationFor('not-a-goal')).toBeUndefined();
  });
});
