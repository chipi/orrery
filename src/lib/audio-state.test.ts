import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the cookie helpers — they touch document.cookie which is fine in jsdom,
// but we want to isolate AudioState logic from ADR-075 write scheduling.
vi.mock('./audio-tour-cookie', () => ({
  clearTourCookie: vi.fn(),
  flushTourCookieWrite: vi.fn(),
  writeTourCookie: vi.fn(),
  writeTourCookieDebounced: vi.fn(),
}));

import { audio, type Episode } from './audio-state.svelte';
import {
  clearTourCookie,
  writeTourCookie,
  writeTourCookieDebounced,
  flushTourCookieWrite,
} from './audio-tour-cookie';

const ep = (id: string, persona: 'curator' | 'guide' | 'enthusiast' = 'curator'): Episode => ({
  id,
  title: id,
  locale: 'en-US',
  persona,
  durationSec: 60,
  mp3: `/audio/en-US/${persona}/${id}.aaaa.mp3`,
  vtt: `/audio/en-US/${persona}/${id}.aaaa.vtt`,
  txt: `/audio/en-US/${persona}/${id}.aaaa.txt`,
  variants: [
    {
      provider: 'google',
      voice_id: `g-${persona}`,
      tts_model: 'neural2',
      mp3: `/audio/en-US/${persona}/${id}.aaaa.mp3`,
      vtt: `/audio/en-US/${persona}/${id}.aaaa.vtt`,
      txt: `/audio/en-US/${persona}/${id}.aaaa.txt`,
    },
    {
      provider: 'elevenlabs',
      voice_id: `e-${persona}`,
      tts_model: 'eleven_multilingual_v2',
      mp3: `/audio/en-US/${persona}/${id}.bbbb.mp3`,
      vtt: `/audio/en-US/${persona}/${id}.bbbb.vtt`,
      txt: `/audio/en-US/${persona}/${id}.bbbb.txt`,
    },
  ],
  activeProvider: 'google',
});

describe('audio-state', () => {
  beforeEach(() => {
    audio.closeOverlay();
    audio.currentEpisode = null;
    audio.positionSec = 0;
    audio.durationSec = 0;
    audio.playing = false;
    audio.speed = 1;
    audio.captionsOn = false;
    audio.currentCaption = '';
    audio.heardEpisodeIds = new Set();
    audio.stopTour();
    audio.tourSequence = [];
    audio.tourIndex = 0;
    audio.compact = false;
  });

  describe('overlay toggle', () => {
    it('open / close / toggle all flip the open flag', () => {
      expect(audio.open).toBe(false);
      audio.openOverlay();
      expect(audio.open).toBe(true);
      audio.closeOverlay();
      expect(audio.open).toBe(false);
      audio.toggle();
      expect(audio.open).toBe(true);
      audio.toggle();
      expect(audio.open).toBe(false);
    });
  });

  describe('loadEpisode', () => {
    it('sets currentEpisode + resets position + stops playback', () => {
      audio.playing = true;
      audio.positionSec = 30;
      audio.currentCaption = 'leftover from previous episode';
      const e = ep('test-load');
      audio.loadEpisode(e);
      expect(audio.currentEpisode).toBe(e);
      expect(audio.positionSec).toBe(0);
      expect(audio.durationSec).toBe(60);
      expect(audio.playing).toBe(false);
      expect(audio.currentCaption).toBe('');
    });
  });

  describe('play / pause / togglePlay', () => {
    it('play() sets playing=true; pause() sets false', () => {
      audio.play();
      expect(audio.playing).toBe(true);
      audio.pause();
      expect(audio.playing).toBe(false);
    });

    it('togglePlay flips the playing state', () => {
      audio.togglePlay();
      expect(audio.playing).toBe(true);
      audio.togglePlay();
      expect(audio.playing).toBe(false);
    });

    it('play() is idempotent — calling twice stays true without re-emitting', () => {
      audio.play();
      audio.play();
      expect(audio.playing).toBe(true);
    });

    it('pause() on already-paused is idempotent', () => {
      expect(audio.playing).toBe(false);
      audio.pause();
      expect(audio.playing).toBe(false);
    });
  });

  describe('heard-state', () => {
    it('markHeard adds an id', () => {
      audio.markHeard('signal-delay');
      expect(audio.isHeard('signal-delay')).toBe(true);
    });

    it('markHeard is idempotent', () => {
      audio.markHeard('porkchop');
      audio.markHeard('porkchop');
      const set = audio.heardEpisodeIds;
      expect([...set]).toEqual(['porkchop']);
    });

    it('endEpisode marks the current episode heard + emits ended', () => {
      const e = ep('guide-mars');
      audio.loadEpisode(e);
      expect(audio.isHeard('guide-mars')).toBe(false);
      audio.endEpisode();
      expect(audio.isHeard('guide-mars')).toBe(true);
      expect(audio.playing).toBe(false);
    });
  });

  describe('variant switching (A/B)', () => {
    it('switchVariant updates active URLs + activeProvider', () => {
      const e = ep('pale-blue-dot');
      audio.loadEpisode(e);
      expect(audio.currentEpisode?.activeProvider).toBe('google');
      audio.switchVariant('elevenlabs');
      expect(audio.currentEpisode?.activeProvider).toBe('elevenlabs');
      expect(audio.currentEpisode?.mp3).toContain('.bbbb.mp3');
    });

    it('switchVariant to an unknown provider is a no-op', () => {
      const e = ep('pale-blue-dot');
      audio.loadEpisode(e);
      const before = audio.currentEpisode?.activeProvider;
      audio.switchVariant('openai');
      expect(audio.currentEpisode?.activeProvider).toBe(before);
    });
  });

  describe('tour state machine', () => {
    const seq = ['pale-blue-dot', 'guide-explore', 'guide-earth'];

    it('startTour activates + seeks to index 0', () => {
      audio.startTour(seq);
      expect(audio.tourActive).toBe(true);
      expect(audio.tourIndex).toBe(0);
      expect(audio.tourSequence).toEqual(seq);
      expect(audio.tourCurrentId()).toBe('pale-blue-dot');
    });

    it('nextTourId advances index and returns next id; null at end', () => {
      audio.startTour(seq);
      expect(audio.nextTourId()).toBe('guide-explore');
      expect(audio.tourIndex).toBe(1);
      expect(audio.nextTourId()).toBe('guide-earth');
      expect(audio.tourIndex).toBe(2);
      expect(audio.nextTourId()).toBeNull();
      expect(audio.tourActive).toBe(false);
    });

    it('prevTourId rewinds index; null at start', () => {
      audio.startTour(seq);
      audio.nextTourId();
      audio.nextTourId();
      expect(audio.tourIndex).toBe(2);
      expect(audio.prevTourId()).toBe('guide-explore');
      expect(audio.tourIndex).toBe(1);
      expect(audio.prevTourId()).toBe('pale-blue-dot');
      expect(audio.tourIndex).toBe(0);
      expect(audio.prevTourId()).toBeNull();
    });

    it('stopTour deactivates without resetting sequence/index', () => {
      audio.startTour(seq);
      audio.nextTourId();
      audio.stopTour();
      expect(audio.tourActive).toBe(false);
      expect(audio.tourIndex).toBe(1); // preserved
    });

    it('tourCurrentId returns null when tour not active', () => {
      expect(audio.tourCurrentId()).toBeNull();
    });
  });

  describe('compact mode (PRD-016 §S8)', () => {
    it('defaults to expanded (compact=false)', () => {
      expect(audio.compact).toBe(false);
    });

    it('toggleCompact flips the flag', () => {
      audio.toggleCompact();
      expect(audio.compact).toBe(true);
      audio.toggleCompact();
      expect(audio.compact).toBe(false);
    });

    it('compact is independent of open — overlay can be open in either form', () => {
      audio.openOverlay();
      audio.toggleCompact();
      expect(audio.open).toBe(true);
      expect(audio.compact).toBe(true);
      audio.closeOverlay();
      // closing overlay does not reset compact — next open returns in the
      // same form, matching the resume-cookie persistence in S9.
      expect(audio.compact).toBe(true);
    });

    it('round-trip expanded → compact → expanded preserves tour + episode state', () => {
      const seq = ['pale-blue-dot', 'guide-explore'];
      audio.startTour(seq);
      audio.loadEpisode(ep('pale-blue-dot'));
      audio.positionSec = 42;

      audio.toggleCompact();
      audio.toggleCompact();

      expect(audio.tourActive).toBe(true);
      expect(audio.tourIndex).toBe(0);
      expect(audio.tourSequence).toEqual(seq);
      expect(audio.currentEpisode?.id).toBe('pale-blue-dot');
      expect(audio.positionSec).toBe(42);
      expect(audio.compact).toBe(false);
    });
  });

  // ── resumeTour ────────────────────────────────────────────────────────
  describe('resumeTour', () => {
    it('restores sequence + index without resetting index to 0', () => {
      const seq = ['pale-blue-dot', 'guide-explore', 'guide-earth'];
      audio.resumeTour(seq, 2);
      expect(audio.tourActive).toBe(true);
      expect(audio.tourIndex).toBe(2);
      expect(audio.tourSequence).toEqual(seq);
    });

    it('clamps index below 0 to 0', () => {
      audio.resumeTour(['a', 'b'], -5);
      expect(audio.tourIndex).toBe(0);
    });

    it('clamps index beyond end to last index', () => {
      audio.resumeTour(['a', 'b', 'c'], 99);
      expect(audio.tourIndex).toBe(2);
    });

    it('does not call persistTourImmediate (no cookie write on resume)', () => {
      vi.mocked(writeTourCookie).mockClear();
      audio.resumeTour(['a'], 0);
      // writeTourCookie is what persistTourImmediate calls
      expect(writeTourCookie).not.toHaveBeenCalled();
    });
  });

  // ── jumpTourToId ──────────────────────────────────────────────────────
  describe('jumpTourToId', () => {
    const seq = ['pale-blue-dot', 'guide-explore', 'guide-earth'];

    it('returns false when tour is not active', () => {
      // tour is stopped in beforeEach
      expect(audio.jumpTourToId('guide-explore')).toBe(false);
    });

    it('returns false when id is not in the sequence', () => {
      audio.startTour(seq);
      expect(audio.jumpTourToId('not-in-sequence')).toBe(false);
    });

    it('jumps the pointer and returns true when id is found', () => {
      audio.startTour(seq);
      const moved = audio.jumpTourToId('guide-earth');
      expect(moved).toBe(true);
      expect(audio.tourIndex).toBe(2);
    });

    it('returns true without moving pointer when already pointing at id', () => {
      audio.startTour(seq);
      // starts at index 0 = pale-blue-dot
      const moved = audio.jumpTourToId('pale-blue-dot');
      expect(moved).toBe(true);
      expect(audio.tourIndex).toBe(0);
    });
  });

  // ── persistTourThrottled / persistTourImmediate ───────────────────────
  describe('persist helpers', () => {
    it('persistTourThrottled calls writeTourCookieDebounced when tour is active', () => {
      audio.startTour(['pale-blue-dot', 'guide-explore']);
      audio.loadEpisode(ep('pale-blue-dot'));
      audio.positionSec = 10;
      audio.persistTourThrottled();
      expect(writeTourCookieDebounced).toHaveBeenCalled();
    });

    it('persistTourThrottled is a no-op when tour is not active', () => {
      vi.mocked(writeTourCookieDebounced).mockClear();
      audio.persistTourThrottled();
      expect(writeTourCookieDebounced).not.toHaveBeenCalled();
    });

    it('persistTourImmediate flushes then writes the cookie', () => {
      audio.startTour(['pale-blue-dot', 'guide-explore']);
      audio.loadEpisode(ep('pale-blue-dot'));
      vi.mocked(writeTourCookie).mockClear();
      vi.mocked(flushTourCookieWrite).mockClear();
      audio.persistTourImmediate();
      expect(flushTourCookieWrite).toHaveBeenCalled();
      expect(writeTourCookie).toHaveBeenCalled();
    });

    it('currentResumeState encodes compact, speed, and captions flags', () => {
      audio.startTour(['pale-blue-dot', 'guide-explore']);
      audio.loadEpisode(ep('pale-blue-dot'));
      audio.positionSec = 42;
      audio.compact = true;
      audio.speed = 1.5;
      audio.captionsOn = true;
      vi.mocked(writeTourCookie).mockClear();
      audio.persistTourImmediate();
      const arg = vi.mocked(writeTourCookie).mock.calls[0][0];
      expect(arg.cmp).toBe(1);
      expect(arg.spd).toBe(1.5);
      expect(arg.cc).toBe(1);
      expect(arg.pos).toBe(42);
    });

    it('currentResumeState clamps negative positionSec to 0', () => {
      audio.startTour(['pale-blue-dot', 'guide-explore']);
      audio.loadEpisode(ep('pale-blue-dot'));
      audio.positionSec = -5;
      vi.mocked(writeTourCookie).mockClear();
      audio.persistTourImmediate();
      const arg = vi.mocked(writeTourCookie).mock.calls[0][0];
      expect(arg.pos).toBe(0);
    });
  });

  // ── closeOverlay with active tour (flush path) ────────────────────────
  describe('closeOverlay with active tour', () => {
    it('calls persistTourImmediate before closing', () => {
      audio.startTour(['pale-blue-dot', 'guide-explore']);
      audio.loadEpisode(ep('pale-blue-dot'));
      vi.mocked(writeTourCookie).mockClear();
      vi.mocked(flushTourCookieWrite).mockClear();
      audio.closeOverlay();
      expect(audio.open).toBe(false);
      expect(flushTourCookieWrite).toHaveBeenCalled();
    });
  });

  // ── stopTour calls clearTourCookie ────────────────────────────────────
  describe('stopTour', () => {
    it('calls clearTourCookie', () => {
      audio.startTour(['pale-blue-dot']);
      vi.mocked(clearTourCookie).mockClear();
      audio.stopTour();
      expect(clearTourCookie).toHaveBeenCalled();
    });
  });

  // ── edge branches ─────────────────────────────────────────────────────
  describe('endEpisode with no current episode', () => {
    it('does not throw when currentEpisode is null', () => {
      audio.currentEpisode = null;
      expect(() => audio.endEpisode()).not.toThrow();
      expect(audio.playing).toBe(false);
    });
  });

  describe('switchVariant with no current episode', () => {
    it('is a no-op when currentEpisode is null', () => {
      audio.currentEpisode = null;
      expect(() => audio.switchVariant('google')).not.toThrow();
      expect(audio.currentEpisode).toBeNull();
    });
  });

  describe('pause() while tour is active flushes cookie', () => {
    it('calls persistTourImmediate on pause when tour is active', () => {
      audio.startTour(['pale-blue-dot', 'guide-explore']);
      audio.loadEpisode(ep('pale-blue-dot'));
      audio.play();
      vi.mocked(writeTourCookie).mockClear();
      vi.mocked(flushTourCookieWrite).mockClear();
      audio.pause();
      expect(flushTourCookieWrite).toHaveBeenCalled();
    });
  });

  describe('currentResumeState returns null when sequence is empty', () => {
    it('persistTourThrottled is a no-op when tourSequence is empty despite tourActive', () => {
      audio.startTour(['pale-blue-dot']);
      // Empty the sequence without stopping the tour
      audio.tourSequence = [];
      vi.mocked(writeTourCookieDebounced).mockClear();
      audio.persistTourThrottled();
      expect(writeTourCookieDebounced).not.toHaveBeenCalled();
    });

    it('persistTourImmediate skips writeTourCookie when sequence is empty', () => {
      audio.startTour(['pale-blue-dot']);
      audio.tourSequence = [];
      vi.mocked(writeTourCookie).mockClear();
      audio.persistTourImmediate();
      // flushTourCookieWrite is still called; writeTourCookie is skipped
      expect(flushTourCookieWrite).toHaveBeenCalled();
      expect(writeTourCookie).not.toHaveBeenCalled();
    });
  });

  describe('nextTourId / prevTourId when tour is not active', () => {
    it('nextTourId returns null when tour is not active', () => {
      // tour is stopped in beforeEach
      expect(audio.nextTourId()).toBeNull();
    });

    it('prevTourId returns null when tour is not active', () => {
      expect(audio.prevTourId()).toBeNull();
    });
  });

  describe('tourCurrentId with out-of-range index', () => {
    it('returns null via ?? null when index is beyond sequence', () => {
      audio.startTour(['pale-blue-dot']);
      // Force tourIndex past the end to trigger the ?? null branch
      audio.tourIndex = 99;
      expect(audio.tourCurrentId()).toBeNull();
    });
  });
});
