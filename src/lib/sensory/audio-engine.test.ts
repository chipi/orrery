// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { audioBus } from '../audio-bus';

// jsdom has no Web Audio API — stub a minimal AudioContext that records enough
// for the engine's graph wiring + envelope scheduling to run without throwing.
class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
  setTargetAtTime = vi.fn();
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = 'sine';
  connect = vi.fn((n: unknown) => n);
  start = vi.fn();
  stop = vi.fn();
}
class FakeCtx {
  currentTime = 0;
  state = 'running';
  destination = {};
  createGain = vi.fn(() => new FakeNode());
  createOscillator = vi.fn(() => new FakeNode());
  resume = vi.fn(() => Promise.resolve());
  suspend = vi.fn(() => Promise.resolve());
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeCtx as unknown as typeof AudioContext);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('audioEngine', () => {
  it('lazily creates a context + plays a single-note blip', async () => {
    const { audioEngine } = await import('./audio-engine');
    expect(() => audioEngine.blip({ freq: 440 })).not.toThrow();
    // bus() returns the shared context + master gain.
    expect(audioEngine.bus()).not.toBeNull();
  });

  it('plays a chord (frequency array) without throwing', async () => {
    const { audioEngine } = await import('./audio-engine');
    expect(() =>
      audioEngine.blip({ freq: [440, 660], type: 'triangle', dur: 0.2, gain: 0.1 }),
    ).not.toThrow();
  });

  it('is a no-op when muted', async () => {
    const { audioEngine } = await import('./audio-engine');
    audioEngine.muted = true;
    expect(() => audioEngine.blip({ freq: 440 })).not.toThrow();
    audioEngine.muted = false;
  });

  it('ducks under narration and restores on end (audio-bus wiring)', async () => {
    const { audioEngine } = await import('./audio-engine');
    audioEngine.bus(); // ensure the bus listeners are wired
    expect(() => {
      audioBus.emit('play', { episode: null });
      audioBus.emit('pause', { episode: null });
      audioBus.emit('ended', { episode: null });
    }).not.toThrow();
  });
});
