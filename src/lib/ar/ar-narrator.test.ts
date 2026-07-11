import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { guideEpisodeId, scheduleArNarration } from './ar-narrator';

describe('guideEpisodeId', () => {
  it('maps each globe scene to its Guide episode', () => {
    expect(guideEpisodeId('explore')).toBe('guide-explore');
    expect(guideEpisodeId('earth')).toBe('guide-earth');
    expect(guideEpisodeId('moon')).toBe('guide-moon');
    expect(guideEpisodeId('mars')).toBe('guide-mars');
  });
});

describe('scheduleArNarration', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays the scene Guide after the 2s delay', () => {
    const play = vi.fn();
    scheduleArNarration('moon', play);
    expect(play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(play).toHaveBeenCalledWith('guide-moon');
  });

  it('cancel() stops the pending auto-play', () => {
    const play = vi.fn();
    const handle = scheduleArNarration('mars', play);
    handle.cancel();
    vi.advanceTimersByTime(5000);
    expect(play).not.toHaveBeenCalled();
  });
});
