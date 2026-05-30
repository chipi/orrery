import { describe, it, expect, beforeEach } from 'vitest';
import { audio, type Episode } from './audio-state.svelte';

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
      mp3: `/audio/en-US/${persona}/${id}.aaaa.mp3`,
      vtt: `/audio/en-US/${persona}/${id}.aaaa.vtt`,
      txt: `/audio/en-US/${persona}/${id}.aaaa.txt`,
    },
    {
      provider: 'elevenlabs',
      voice_id: `e-${persona}`,
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
});
