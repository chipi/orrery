// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

import {
  TOUR_COOKIE_NAME,
  TOUR_COOKIE_MAX_AGE_SEC,
  readTourCookie,
  writeTourCookie,
  writeTourCookieDebounced,
  clearTourCookie,
  flushTourCookieWrite,
  __resetTourCookieDebounceForTest,
  type TourResumeState,
} from './audio-tour-cookie';

function wipeCookies(): void {
  for (const raw of document.cookie.split(';')) {
    const name = raw.split('=')[0]?.trim();
    if (!name) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

const validState: TourResumeState = {
  ep: 'pale-blue-dot',
  pos: 42,
  idx: 0,
  cmp: 0,
};

describe('audio-tour-cookie', () => {
  beforeEach(() => {
    wipeCookies();
    __resetTourCookieDebounceForTest();
    vi.useRealTimers();
  });

  describe('readTourCookie', () => {
    it('returns null when the cookie is absent', () => {
      expect(readTourCookie()).toBeNull();
    });

    it('round-trips a valid payload through write → read', () => {
      writeTourCookie(validState);
      expect(readTourCookie()).toEqual(validState);
    });

    it('returns null on malformed JSON', () => {
      document.cookie = `${TOUR_COOKIE_NAME}=${encodeURIComponent('not-json')}; Path=/`;
      expect(readTourCookie()).toBeNull();
    });

    it('returns null when ep is missing', () => {
      document.cookie = `${TOUR_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify({ pos: 0, idx: 0, cmp: 0 }),
      )}; Path=/`;
      expect(readTourCookie()).toBeNull();
    });

    it('returns null when pos is negative', () => {
      document.cookie = `${TOUR_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify({ ep: 'x', pos: -5, idx: 0, cmp: 0 }),
      )}; Path=/`;
      expect(readTourCookie()).toBeNull();
    });

    it('returns null when idx is a non-integer', () => {
      document.cookie = `${TOUR_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify({ ep: 'x', pos: 0, idx: 1.5, cmp: 0 }),
      )}; Path=/`;
      expect(readTourCookie()).toBeNull();
    });

    it('returns null when cmp is anything other than 0 or 1', () => {
      document.cookie = `${TOUR_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify({ ep: 'x', pos: 0, idx: 0, cmp: 'true' }),
      )}; Path=/`;
      expect(readTourCookie()).toBeNull();
    });

    it('returns null when ep exceeds the 80-char guard', () => {
      const longEp = 'a'.repeat(81);
      document.cookie = `${TOUR_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify({ ep: longEp, pos: 0, idx: 0, cmp: 0 }),
      )}; Path=/`;
      expect(readTourCookie()).toBeNull();
    });
  });

  describe('writeTourCookie', () => {
    it('sets a Max-Age of 30 days', () => {
      writeTourCookie(validState);
      // jsdom strips Max-Age from document.cookie reads, so re-check via
      // round-trip and the explicit constant.
      expect(TOUR_COOKIE_MAX_AGE_SEC).toBe(2592000);
      expect(readTourCookie()).toEqual(validState);
    });

    it('no-ops on an invalid state (refuses to corrupt the cookie)', () => {
      writeTourCookie(validState);
      // @ts-expect-error — deliberately invalid input
      writeTourCookie({ ep: 'still-valid', pos: 'not-a-number', idx: 0, cmp: 0 });
      expect(readTourCookie()).toEqual(validState);
    });

    it('overwrites with the latest state', () => {
      writeTourCookie(validState);
      writeTourCookie({ ...validState, pos: 99 });
      expect(readTourCookie()?.pos).toBe(99);
    });
  });

  describe('clearTourCookie', () => {
    it('removes the cookie', () => {
      writeTourCookie(validState);
      expect(readTourCookie()).not.toBeNull();
      clearTourCookie();
      expect(readTourCookie()).toBeNull();
    });
  });

  describe('writeTourCookieDebounced', () => {
    it('coalesces multiple writes inside the throttle window into the final state', () => {
      vi.useFakeTimers();
      writeTourCookieDebounced({ ...validState, pos: 10 }, 5000);
      writeTourCookieDebounced({ ...validState, pos: 20 }, 5000);
      writeTourCookieDebounced({ ...validState, pos: 30 }, 5000);
      // Cookie not yet written.
      expect(readTourCookie()).toBeNull();
      vi.advanceTimersByTime(4999);
      expect(readTourCookie()).toBeNull();
      vi.advanceTimersByTime(1);
      expect(readTourCookie()?.pos).toBe(30);
    });

    it('flush forces the pending write immediately', () => {
      vi.useFakeTimers();
      writeTourCookieDebounced({ ...validState, pos: 77 }, 5000);
      expect(readTourCookie()).toBeNull();
      flushTourCookieWrite();
      expect(readTourCookie()?.pos).toBe(77);
    });

    it('flush is a no-op when nothing is pending', () => {
      flushTourCookieWrite();
      expect(readTourCookie()).toBeNull();
    });
  });
});
