// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { askSwitch, initAskSwitch } from './ask-switch.svelte';

describe('ask switch (?ask=on|off)', () => {
  beforeEach(() => {
    localStorage.clear();
    askSwitch.on = false;
  });

  it('is off by default — visitors never see the ask box', () => {
    initAskSwitch('');
    expect(askSwitch.on).toBe(false);
  });

  it('?ask=on turns it on and persists it (survives the sign-in redirect)', () => {
    initAskSwitch('?ask=on');
    expect(askSwitch.on).toBe(true);
    askSwitch.on = false;
    initAskSwitch('');
    expect(askSwitch.on).toBe(true);
  });

  it('?ask=off turns it off and forgets it', () => {
    initAskSwitch('?ask=on');
    initAskSwitch('?ask=off');
    expect(askSwitch.on).toBe(false);
    initAskSwitch('');
    expect(askSwitch.on).toBe(false);
  });

  it('ignores any other value', () => {
    initAskSwitch('?ask=1');
    expect(askSwitch.on).toBe(false);
  });
});
