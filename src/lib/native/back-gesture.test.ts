import { describe, it, expect } from 'vitest';
import { backAction, initBackButton } from './back-gesture';

describe('backAction', () => {
  it('pops history while the WebView can still go back', () => {
    expect(backAction(true)).toBe('back');
  });
  it('exits the app when there is no history left', () => {
    expect(backAction(false)).toBe('exit');
  });
});

describe('initBackButton', () => {
  it('is a no-op off-device and returns a disposer', () => {
    // Not a Capacitor native platform under vitest → returns a safe teardown.
    const dispose = initBackButton();
    expect(typeof dispose).toBe('function');
    expect(() => dispose()).not.toThrow();
  });
});
