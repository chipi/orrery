import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, 'add-card-rungs.mjs');
let cwd = '';

const put = (rel: string, data: string | Buffer) => {
  const p = path.join(cwd, rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, data);
};

// The tool reads every path relative to cwd, so a fixture tree in a temp dir is a full run.
beforeAll(async () => {
  cwd = mkdtempSync(path.join(tmpdir(), 'card-rungs-'));
  const img = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#789' },
  })
    .jpeg()
    .toBuffer();
  put('static/data/mission-galleries.json', JSON.stringify({ live: [], overridden: [] }));
  put('static/data/mars-site-galleries.json', JSON.stringify({ mro: [] }));
  put(
    'static/data/missions-hero-overrides.json',
    JSON.stringify({ overrides: { overridden: { slot: '03.jpg' } } }),
  );
  put(
    'static/data/image-ladder.json',
    JSON.stringify({
      '/images/missions/live/01': [1200],
      '/images/missions/overridden/03': [1200],
      '/images/mars-sites/mro/01': [1200],
    }),
  );
  for (const rel of ['missions/live/01', 'missions/overridden/03', 'mars-sites/mro/01']) {
    put(`masters/${rel}.jpg`, img);
    put(`static/images/${rel}.webp`, 'x');
  }
  // A retired gallery's leftover dir and the trajectory-PNG dir: no gallery key, so not heroes.
  put('static/images/mars-sites/curiosity/route/leftover.webp', 'x');
  put('static/images/missions/thumbnails/apollo11.png', 'x');
});

afterAll(() => rmSync(cwd, { recursive: true, force: true }));

describe('add-card-rungs hero enumeration', () => {
  it('only treats entities with a gallery key as card heroes', () => {
    const out = execFileSync('node', [SCRIPT, '--dry-run'], { cwd, encoding: 'utf8' });
    // live + overridden + mro = 3 heroes x (320, 640)
    expect(out).toContain('6 rungs would be written');
    expect(out).toContain('0 heroes without a ladder entry');
  });
});
