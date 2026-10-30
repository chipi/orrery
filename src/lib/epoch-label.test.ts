import { describe, expect, it } from 'vitest';
import { EPOCH_BANDS } from './epoch-bands';
import { epochLabel } from './epoch-label';

describe('epochLabel', () => {
  it('names every epoch band, each differently', () => {
    const labels = EPOCH_BANDS.map((b) => epochLabel(b.id));
    for (const [i, l] of labels.entries()) expect(l, EPOCH_BANDS[i].id).toBeTruthy();
    expect(new Set(labels).size).toBe(EPOCH_BANDS.length);
    expect(epochLabel('shuttle-and-mir')).toBe('Shuttle & Mir');
  });
});
