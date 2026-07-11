// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { orientationVectors, createSpatialSource, updateArListener } from './ar-audio';

describe('orientationVectors', () => {
  it('identity quaternion → forward −Z, up +Y', () => {
    const { forward, up } = orientationVectors([0, 0, 0, 1]);
    expect(forward.map((n) => Math.round(n) || 0)).toEqual([0, 0, -1]);
    expect(up.map((n) => Math.round(n) || 0)).toEqual([0, 1, 0]);
  });

  it('180° yaw flips forward to +Z', () => {
    // quaternion for 180° about Y = (0, 1, 0, 0)
    const { forward } = orientationVectors([0, 1, 0, 0]);
    expect(forward.map((n) => Math.round(n) || 0)).toEqual([0, 0, 1]);
  });
});

// Web Audio mock — enough for the panner + listener paths.
class FakeListener {
  positionX = { value: 0 };
  positionY = { value: 0 };
  positionZ = { value: 0 };
  forwardX = { value: 0 };
  forwardY = { value: 0 };
  forwardZ = { value: 0 };
  upX = { value: 0 };
  upY = { value: 0 };
  upZ = { value: 0 };
}
class FakePanner {
  panningModel = '';
  distanceModel = '';
  refDistance = 1;
  setPosition = vi.fn();
  connect = vi.fn();
  disconnect = vi.fn();
}
class FakeGain {
  gain = {
    value: 1,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
  connect = vi.fn();
}
class FakeCtx {
  currentTime = 0;
  state = 'running';
  destination = {};
  listener = new FakeListener();
  createGain = () => new FakeGain();
  createPanner = () => new FakePanner();
  resume = () => Promise.resolve();
  suspend = () => Promise.resolve();
}

beforeEach(() => vi.stubGlobal('AudioContext', FakeCtx as unknown as typeof AudioContext));
afterEach(() => vi.unstubAllGlobals());

describe('spatial audio', () => {
  it('createSpatialSource builds an HRTF panner at a world position', () => {
    const src = createSpatialSource([1, 0, -2]);
    expect(src).not.toBeNull();
    expect(() => src!.setPosition(0, 1, 0)).not.toThrow();
    expect(() => src!.disconnect()).not.toThrow();
  });

  it('updateArListener moves the listener without throwing', () => {
    expect(() => updateArListener({ position: [0, 1.5, 0], rotation: [0, 0, 0, 1] })).not.toThrow();
  });
});
