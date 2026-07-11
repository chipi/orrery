import { describe, it, expect } from 'vitest';
import { backAction } from './back-gesture';

describe('backAction', () => {
  it('pops history while the WebView can still go back', () => {
    expect(backAction(true)).toBe('back');
  });
  it('exits the app when there is no history left', () => {
    expect(backAction(false)).toBe('exit');
  });
});
