import { describe, it, expect } from 'vitest';
import { stripTracking } from './strip-tracking';

describe('stripTracking', () => {
  it('drops the utm_* parameters Commons imageinfo appends, keeps everything else', () => {
    expect(
      stripTracking(
        'https://upload.wikimedia.org/wikipedia/commons/3/39/Ground_track.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
      ),
    ).toBe('https://upload.wikimedia.org/wikipedia/commons/3/39/Ground_track.jpg');
    expect(stripTracking('https://example.org/a?id=4&utm_medium=x')).toBe(
      'https://example.org/a?id=4',
    );
    expect(stripTracking('https://commons.wikimedia.org/wiki/File:A_(b).png')).toBe(
      'https://commons.wikimedia.org/wiki/File:A_(b).png',
    );
  });

  it('passes empty and unparseable values through', () => {
    expect(stripTracking(null)).toBeNull();
    expect(stripTracking(undefined)).toBeUndefined();
    expect(stripTracking('not a url')).toBe('not a url');
  });
});
