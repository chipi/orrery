import { describe, it, expect, vi, beforeEach } from 'vitest';

const { pulse } = vi.hoisted(() => ({ pulse: vi.fn() }));
vi.mock('../sensory/haptics', () => ({ pulse }));

import { arHaptic } from './ar-haptics';

beforeEach(() => pulse.mockClear());

describe('arHaptic (RFC-021 §8)', () => {
  it('anchor-placed → light impact', () => {
    arHaptic('anchor-placed');
    expect(pulse).toHaveBeenCalledWith('light');
  });

  it('narrator-section → light impact', () => {
    arHaptic('narrator-section');
    expect(pulse).toHaveBeenCalledWith('light');
  });

  it('narrator-end → success notification', () => {
    arHaptic('narrator-end');
    expect(pulse).toHaveBeenCalledWith('success');
  });
});
