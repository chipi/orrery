import { describe, it, expect, vi } from 'vitest';
import { audioBus } from './audio-bus';
import type { Episode } from './audio-state.svelte';

const fakeEpisode = (id: string): Episode => ({
  id,
  title: id,
  locale: 'en-US',
  persona: 'curator',
  durationSec: 60,
  mp3: `/audio/en-US/curator/${id}.aaaaaaaa.mp3`,
  vtt: `/audio/en-US/curator/${id}.aaaaaaaa.vtt`,
  txt: `/audio/en-US/curator/${id}.aaaaaaaa.txt`,
  variants: [
    {
      provider: 'google',
      voice_id: 'en-US-Neural2-J',
      tts_model: 'neural2',
      mp3: `/audio/en-US/curator/${id}.aaaaaaaa.mp3`,
      vtt: `/audio/en-US/curator/${id}.aaaaaaaa.vtt`,
      txt: `/audio/en-US/curator/${id}.aaaaaaaa.txt`,
    },
  ],
  activeProvider: 'google',
});

describe('audioBus', () => {
  it('emits play/pause/ended events with episode detail', () => {
    const playHandler = vi.fn();
    const pauseHandler = vi.fn();
    const endedHandler = vi.fn();

    const off1 = audioBus.on('play', playHandler);
    const off2 = audioBus.on('pause', pauseHandler);
    const off3 = audioBus.on('ended', endedHandler);

    const ep = fakeEpisode('test-episode-1');
    audioBus.emit('play', { episode: ep });
    audioBus.emit('pause', { episode: ep });
    audioBus.emit('ended', { episode: ep });

    expect(playHandler).toHaveBeenCalledTimes(1);
    expect(pauseHandler).toHaveBeenCalledTimes(1);
    expect(endedHandler).toHaveBeenCalledTimes(1);
    expect(playHandler.mock.calls[0][0].detail.episode).toBe(ep);

    off1();
    off2();
    off3();
  });

  it('on() returns an unsubscribe fn that stops further emissions', () => {
    const handler = vi.fn();
    const off = audioBus.on('play', handler);

    audioBus.emit('play', { episode: null });
    off();
    audioBus.emit('play', { episode: null });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('events with null episode (e.g. global pause) still fire', () => {
    const handler = vi.fn();
    const off = audioBus.on('pause', handler);

    audioBus.emit('pause', { episode: null });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.episode).toBeNull();

    off();
  });

  it('handlers do not receive events for other types', () => {
    const playOnly = vi.fn();
    const off = audioBus.on('play', playOnly);

    audioBus.emit('pause', { episode: null });
    audioBus.emit('ended', { episode: null });

    expect(playOnly).not.toHaveBeenCalled();

    off();
  });
});
