// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { sensory } from './state.svelte';

// jsdom (no matchMedia, no Capacitor, no navigator.vibrate) → the store seeds as a
// desktop device: capabilities = { audio:true, gyro:false, haptic:false }. That's
// exactly the surface we want to lock: master/wanted/capable gating in active().

beforeEach(() => {
  sensory.on = false;
  sensory.gyroWanted = false;
  sensory.audioWanted = true;
  sensory.hapticWanted = false;
  sensory.settingsOpen = false;
});

describe('sensory state — gating', () => {
  it('defaults to master OFF, nothing active', () => {
    expect(sensory.on).toBe(false);
    expect(sensory.active('audio')).toBe(false);
    expect(sensory.anyActive).toBe(false);
  });

  it('audio activates only when master ON + wanted + capable', () => {
    sensory.toggleMaster();
    expect(sensory.on).toBe(true);
    expect(sensory.active('audio')).toBe(true);
    expect(sensory.anyActive).toBe(true);

    sensory.setChannel('audio', false);
    expect(sensory.active('audio')).toBe(false);
  });

  it('a channel the device cannot offer never activates (gyro on desktop)', () => {
    sensory.toggleMaster();
    sensory.setChannel('gyro', true);
    expect(sensory.gyroWanted).toBe(true);
    expect(sensory.capabilities.gyro).toBe(false);
    expect(sensory.active('gyro')).toBe(false);
  });

  it('toggleMaster flips both ways', () => {
    sensory.toggleMaster();
    expect(sensory.on).toBe(true);
    sensory.toggleMaster();
    expect(sensory.on).toBe(false);
    expect(sensory.active('audio')).toBe(false);
  });

  it('settings open/close', () => {
    sensory.openSettings();
    expect(sensory.settingsOpen).toBe(true);
    sensory.closeSettings();
    expect(sensory.settingsOpen).toBe(false);
  });
});
