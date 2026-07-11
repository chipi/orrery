// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { blip, pulse } = vi.hoisted(() => ({ blip: vi.fn(), pulse: vi.fn() }));
vi.mock('./audio-engine', () => ({ audioEngine: { blip } }));
vi.mock('./haptics', () => ({ pulse }));

import { cue } from './feedback';
import { sensory } from './state.svelte';

// jsdom seeds a desktop device → capabilities { audio:true, gyro:false, haptic:false }.
beforeEach(() => {
  blip.mockClear();
  pulse.mockClear();
  sensory.on = false;
  sensory.audioWanted = true;
  sensory.hapticWanted = true;
});

describe('cue() gating', () => {
  it('fires nothing while master is OFF', () => {
    cue('select');
    expect(blip).not.toHaveBeenCalled();
    expect(pulse).not.toHaveBeenCalled();
  });

  it('fires the tone when audio is active', () => {
    sensory.on = true;
    cue('select');
    expect(blip).toHaveBeenCalledTimes(1);
  });

  it('never fires haptics on a device that cannot vibrate (desktop)', () => {
    sensory.on = true;
    cue('select');
    expect(pulse).not.toHaveBeenCalled();
  });

  it('respects the audio channel toggle', () => {
    sensory.on = true;
    sensory.audioWanted = false;
    cue('confirm');
    expect(blip).not.toHaveBeenCalled();
  });
});
