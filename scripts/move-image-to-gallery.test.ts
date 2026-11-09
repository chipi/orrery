import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const TSX = resolve('node_modules/.bin/tsx');
const SCRIPT = resolve('scripts/move-image-to-gallery.ts');
let root = '';

const idOf = (p: string) => createHash('sha256').update(p).digest('hex').slice(0, 16);
const put = (rel: string, body: string | Buffer = 'x') => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
};
const putJson = (rel: string, v: unknown) => put(rel, JSON.stringify(v, null, 2) + '\n');
const readJson = (rel: string) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const has = (rel: string) => existsSync(join(root, rel));
const jpeg = Buffer.alloc(2000, 1);

// A site gallery with one built slot (ladder, 1x1, master, credit thumb) beside a mission gallery
// with five; the sidecar and the manifests name the site slot.
function fixture(masterBody: Buffer = jpeg) {
  root = mkdtempSync(join(tmpdir(), 'move-slot-'));
  for (const n of ['01', '02', '03', '04', '05']) put(`static/images/missions/m/${n}.webp`);
  for (const f of ['01.webp', '01-320.webp', '01-640.webp', '01.1x1.jpg'])
    put(`static/images/moon-sites/m/${f}`);
  put('masters/moon-sites/m/01.jpg', masterBody);
  put('static/credit-thumbs/images/moon-sites/m/01.1x1.webp');
  putJson('scripts/i18n-tools/maps/alt-text-sources.json', {
    '/images/moon-sites/m/01.webp': 'h1',
    '/images/moon-sites/m/01.1x1.jpg': 'h1',
  });
  putJson('static/data/image-provenance.json', {
    entries: [
      { id: idOf('/images/moon-sites/m/01.1x1.jpg'), path: '/images/moon-sites/m/01.1x1.jpg' },
      { id: idOf('/images/moon-sites/m/01.webp'), path: '/images/moon-sites/m/01.webp' },
    ],
  });
  putJson('static/data/image-ladder.json', { '/images/moon-sites/m/01': [320, 640] });
  putJson('static/data/moon-annotation-photos.json', {
    m: {
      ring: {
        image: '/images/moon-sites/m/01.webp',
        thumb: '/images/moon-sites/m/01-320.webp',
        nasa_id: 'as1-1-1',
      },
    },
  });
}
const run = (...args: string[]) => {
  try {
    return { code: 0, out: execFileSync(TSX, [SCRIPT, ...args], { cwd: root, encoding: 'utf8' }) };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: err.stdout + err.stderr };
  }
};

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('move-image-to-gallery: a slot of another gallery', () => {
  it('dry run writes nothing', () => {
    fixture();
    const r = run('moon-sites/m/01=missions/m/06');
    expect(r.code).toBe(0);
    expect(r.out).toContain('[dry run]');
    expect(has('static/images/moon-sites/m/01.webp')).toBe(true);
    expect(has('static/images/missions/m/06.webp')).toBe(false);
  });

  it('moves the ladder, 1x1, master and credit thumb, and rewrites every reference', () => {
    fixture();
    const r = run('--apply', 'moon-sites/m/01=missions/m/06');
    expect(r.code).toBe(0);
    for (const f of ['06.webp', '06-320.webp', '06-640.webp', '06.1x1.jpg'])
      expect(has(`static/images/missions/m/${f}`)).toBe(true);
    expect(has('static/images/moon-sites/m/01.webp')).toBe(false);
    expect(has('static/images/moon-sites/m/01.1x1.jpg')).toBe(false);
    expect(has('masters/missions/m/06.jpg')).toBe(true);
    expect(has('masters/moon-sites/m/01.jpg')).toBe(false);
    expect(has('static/credit-thumbs/images/missions/m/06.1x1.webp')).toBe(true);

    expect(readJson('static/data/moon-annotation-photos.json').m.ring).toEqual({
      image: '/images/missions/m/06.webp',
      thumb: '/images/missions/m/06-320.webp',
      nasa_id: 'as1-1-1',
    });
    expect(readJson('static/data/image-ladder.json')).toEqual({
      '/images/missions/m/06': [320, 640],
    });
    // provenance ids follow the path, and the file stays sorted by path
    expect(readJson('static/data/image-provenance.json').entries).toEqual([
      { id: idOf('/images/missions/m/06.1x1.jpg'), path: '/images/missions/m/06.1x1.jpg' },
      { id: idOf('/images/missions/m/06.webp'), path: '/images/missions/m/06.webp' },
    ]);
    expect(readJson('scripts/i18n-tools/maps/alt-text-sources.json')).toEqual({
      '/images/missions/m/06.1x1.jpg': 'h1',
      '/images/missions/m/06.webp': 'h1',
    });
  });

  it('does not touch a longer slot name that merely starts with the moved one', () => {
    fixture();
    put('static/images/moon-sites/m/010.webp');
    putJson('static/data/other.json', { a: '/images/moon-sites/m/010.webp' });
    expect(run('--apply', 'moon-sites/m/01=missions/m/06').code).toBe(0);
    expect(readJson('static/data/other.json').a).toBe('/images/moon-sites/m/010.webp');
  });

  it('refuses a target that is not the next free slot, writing nothing', () => {
    fixture();
    const r = run('--apply', 'moon-sites/m/01=missions/m/08');
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('next free slot of missions/m is 06');
    expect(has('static/images/moon-sites/m/01.webp')).toBe(true);
    expect(readJson('static/data/image-ladder.json')).toHaveProperty('/images/moon-sites/m/01');
  });

  it('refuses a master that is an LFS pointer, writing nothing', () => {
    fixture(Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 9\n'));
    const r = run('--apply', 'moon-sites/m/01=missions/m/06');
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('LFS pointer');
    expect(has('static/images/moon-sites/m/01.webp')).toBe(true);
    expect(readJson('static/data/moon-annotation-photos.json').m.ring.image).toBe(
      '/images/moon-sites/m/01.webp',
    );
  });
});

describe('move-image-to-gallery: a bare image gets what a gallery slot carries', () => {
  it('adds the 1x1 crop, provenance row, alt text, vision row and approved entries', async () => {
    const { default: sharp } = await import('sharp');
    const master = await sharp({
      create: { width: 400, height: 300, channels: 3, background: '#808080' },
    })
      .jpeg()
      .toBuffer();
    root = mkdtempSync(join(tmpdir(), 'move-bare-'));
    for (const n of ['01', '02']) put(`static/images/missions/m/${n}.webp`);
    put('static/images/moon-sites/annotations/s1.webp');
    put('static/images/moon-sites/annotations/s1-320.webp');
    put('masters/moon-sites/annotations/s1.jpg', master);
    const from = '/images/moon-sites/annotations/s1.webp';
    const to = '/images/missions/m/03.webp';
    putJson('static/data/image-provenance.json', {
      entries: [{ id: idOf(from), path: from, credit: 'NASA' }],
    });
    for (const l of ['en-US', 'de'])
      putJson(`static/data/image-alt-text/${l}.json`, { [from]: `alt ${l}` });
    putJson('scripts/i18n-tools/maps/alt-text-sources.json', { [from]: 'old' });
    putJson('static/data/image-vision.json', { entries: {} });
    putJson('static/data/image-approved.json', {
      approved: ['/images/moon-sites/annotations/s1-320.webp', '/images/missions/m/01.jpg'],
      count: 2,
    });
    putJson('static/data/moon-annotation-photos.json', { m: { image: from } });

    const r = run('--apply', 'moon-sites/annotations/s1=missions/m/03@0.25,0.75');
    expect(r.code).toBe(0);
    expect(has('static/images/missions/m/03.1x1.jpg')).toBe(true);
    expect(has('static/images/missions/m/03-320.webp')).toBe(true);
    expect(readJson('static/data/moon-annotation-photos.json').m.image).toBe(to);

    const prov = readJson('static/data/image-provenance.json').entries;
    expect(prov.map((e: { path: string }) => e.path)).toEqual([
      '/images/missions/m/03.1x1.jpg',
      to,
    ]);
    expect(prov[1].id).toBe(idOf(to));
    expect(prov[0]).toMatchObject({ id: idOf('/images/missions/m/03.1x1.jpg'), credit: 'NASA' });

    for (const l of ['en-US', 'de'])
      expect(readJson(`static/data/image-alt-text/${l}.json`)).toEqual({
        [to]: `alt ${l}`,
        '/images/missions/m/03.1x1.jpg': `alt ${l}`,
      });
    const sources = readJson('scripts/i18n-tools/maps/alt-text-sources.json');
    expect(sources[to]).toBe(sources['/images/missions/m/03.1x1.jpg']);
    expect(sources[to]).not.toBe('old');

    const vision = readJson('static/data/image-vision.json').entries['/images/missions/m/03.jpg'];
    expect(vision).toMatchObject({
      score: 8,
      subject: 'alt en-US',
      focal_point: { x: 0.25, y: 0.75 },
    });
    expect(readJson('static/data/image-approved.json')).toEqual({
      approved: [
        '/images/missions/m/01.jpg',
        '/images/missions/m/03.1x1.jpg',
        '/images/missions/m/03.jpg',
      ],
      count: 3,
    });
  });
});
