import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  deepSkyObjectThumb,
  deepSkyThumb,
  outerThumb,
  type IndexThumbSource,
} from './index-thumbs';

const ts: IndexThumbSource = {
  star: {},
  heroes: {
    'local-sheet/sculptor-group': { photoKey: 'sculptor-group', pictured: true },
    'local-group/leo-i': { photoKey: 'leo-i' },
  },
  titles: { 'sculptor-group': 'NGC 253' },
  photoKeyOf: { m13: 'm13', m18: null },
};

describe('outerThumb (L46)', () => {
  it('uses the panel hero and names what a stand-in pictures', () => {
    expect(outerThumb(ts, 'local-sheet', 'sculptor-group')).toEqual({
      thumb: '/credit-thumbs/images/deep-sky/sculptor-group.webp',
      pictured: 'NGC 253',
    });
    expect(outerThumb(ts, 'local-group', 'leo-i')).toEqual({
      thumb: '/credit-thumbs/images/deep-sky/leo-i.webp',
    });
  });
  it('falls back to the deep-sky twin, and to nothing', () => {
    expect(outerThumb(ts, 'milky-way', 'm13')?.thumb).toBe(deepSkyThumb('m13'));
    expect(outerThumb(ts, 'local-group', 'andromeda', 'm13')?.thumb).toBe(deepSkyThumb('m13'));
    expect(outerThumb(ts, 'milky-way', 'm18')).toBeNull();
    expect(outerThumb(undefined, 'milky-way', 'm13')).toBeNull();
    expect(deepSkyObjectThumb(ts, 'unknown')).toBeNull();
  });
});

describe('the committed data (L46)', () => {
  const read = (f: string) => JSON.parse(readFileSync(`static/data/${f}`, 'utf8'));
  it('every photoKey of an object and of a panel hero has its 192 px thumb on disk', () => {
    const keys = new Set<string>();
    for (const o of read('universe/deep-sky-objects.json').objects)
      if (o.photoKey) keys.add(o.photoKey);
    for (const h of Object.values(read('universe/panel-heroes.json').heroes) as {
      photoKey?: string;
    }[])
      if (h.photoKey) keys.add(h.photoKey);
    expect(keys.size).toBeGreaterThan(100);
    for (const k of keys) expect(existsSync(`static${deepSkyThumb(k)}`), `${k} thumb`).toBe(true);
  });
  it('every stand-in (pictured) hero has a gallery title to name', () => {
    const titles = new Set(read('deep-sky.json').map((g: { key: string }) => g.key));
    for (const [k, h] of Object.entries(read('universe/panel-heroes.json').heroes) as [
      string,
      { photoKey?: string; pictured?: boolean },
    ][])
      if (h.pictured) expect(titles.has(h.photoKey!), k).toBe(true);
  });
});
