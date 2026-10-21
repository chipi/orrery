import { describe, expect, it } from 'vitest';
import { cacheGaps } from './validate-image-phash-dupes';

const cache = { phashes: { '/images/a/01.jpg': 'aa', '/images/a/02.jpg': 'bb' } };

describe('cacheGaps', () => {
  it('passes when every master has a cached hash', () => {
    expect(cacheGaps(cache, ['/images/a/01.jpg', '/images/a/02.jpg'])).toEqual([]);
  });

  it('reports a master with no cached hash (the scan would silently skip it)', () => {
    expect(cacheGaps(cache, ['/images/a/01.jpg', '/images/b/01.jpg'])).toEqual([
      '/images/b/01.jpg',
    ]);
  });
});
