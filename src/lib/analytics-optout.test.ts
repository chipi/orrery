// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true, dev: false }));

import {
  OPTOUT_COOKIE_NAME,
  readOptOutCookie,
  writeOptOutCookie,
  browserPrivacySignal,
  analyticsSuppressed,
} from './analytics-optout';

function clearCookies(): void {
  for (const raw of document.cookie.split(';')) {
    const name = raw.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

function setSignal(prop: 'globalPrivacyControl' | 'doNotTrack' | 'msDoNotTrack', value: unknown) {
  Object.defineProperty(navigator, prop, { value, configurable: true, writable: true });
}
function clearSignals(): void {
  for (const p of ['globalPrivacyControl', 'doNotTrack', 'msDoNotTrack'] as const) {
    Object.defineProperty(navigator, p, { value: undefined, configurable: true, writable: true });
  }
  Object.defineProperty(window, 'doNotTrack', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  clearCookies();
  clearSignals();
});
afterEach(() => {
  clearCookies();
  clearSignals();
});

describe('analytics opt-out cookie (ADR-092)', () => {
  it('defaults to opted-IN — a user who never touches the toggle stores nothing', () => {
    expect(readOptOutCookie()).toBe(false);
    expect(document.cookie).not.toContain(OPTOUT_COOKIE_NAME);
    expect(analyticsSuppressed()).toBe(false);
  });

  it('writes the opt-out and reads it back', () => {
    writeOptOutCookie(true);
    expect(document.cookie).toContain(`${OPTOUT_COOKIE_NAME}=1`);
    expect(readOptOutCookie()).toBe(true);
    expect(analyticsSuppressed()).toBe(true);
  });

  it('opting back in clears the cookie rather than storing a "0"', () => {
    writeOptOutCookie(true);
    expect(readOptOutCookie()).toBe(true);

    writeOptOutCookie(false);
    expect(readOptOutCookie()).toBe(false);
    expect(document.cookie).not.toContain(`${OPTOUT_COOKIE_NAME}=1`);
  });

  it('ignores an unrelated cookie whose name merely contains ours', () => {
    document.cookie = `not_${OPTOUT_COOKIE_NAME}=1; Path=/`;
    expect(readOptOutCookie()).toBe(false);
  });
});

describe('browser privacy signals', () => {
  it('honours Global Privacy Control — the signal with legal force', () => {
    setSignal('globalPrivacyControl', true);
    expect(browserPrivacySignal()).toBe(true);
    expect(analyticsSuppressed()).toBe(true);
  });

  it('honours DNT === "1"', () => {
    setSignal('doNotTrack', '1');
    expect(browserPrivacySignal()).toBe(true);
  });

  it('honours the legacy "yes" and msDoNotTrack spellings', () => {
    setSignal('doNotTrack', 'yes');
    expect(browserPrivacySignal()).toBe(true);
    clearSignals();
    setSignal('msDoNotTrack', '1');
    expect(browserPrivacySignal()).toBe(true);
  });

  it('does NOT suppress on DNT === "0" (an explicit "tracking is fine")', () => {
    setSignal('doNotTrack', '0');
    expect(browserPrivacySignal()).toBe(false);
    expect(analyticsSuppressed()).toBe(false);
  });

  it('does NOT suppress when globalPrivacyControl is false', () => {
    setSignal('globalPrivacyControl', false);
    expect(browserPrivacySignal()).toBe(false);
  });

  it('a browser signal suppresses even with no opt-out cookie set', () => {
    expect(readOptOutCookie()).toBe(false);
    setSignal('globalPrivacyControl', true);
    expect(analyticsSuppressed()).toBe(true);
  });
});
