import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Integration test: build a fake build/ tree, run the prune with cwd = temp
// dir, assert exactly the streamed buckets are removed and the on-device
// buckets survive. The script operates on `process.cwd()/build`.

const SCRIPT = path.resolve('scripts/mobile/prune-streamed-assets.mjs');

let dir: string;

function seed(root: string) {
  const b = path.join(root, 'build');
  mkdirSync(path.join(b, 'images/fleet-galleries/dawn'), { recursive: true });
  mkdirSync(path.join(b, 'audio/episodes'), { recursive: true });
  mkdirSync(path.join(b, 'textures'), { recursive: true });
  mkdirSync(path.join(b, 'data/i18n/en-US/missions'), { recursive: true });
  mkdirSync(path.join(b, 'data/i18n/de/missions'), { recursive: true });
  writeFileSync(path.join(b, 'images/fleet-galleries/dawn/01.jpg'), 'x');
  writeFileSync(path.join(b, 'audio/episodes/a.mp3'), 'x');
  writeFileSync(path.join(b, 'textures/2k_mars.jpg'), 'x'); // bundled — must survive
  writeFileSync(path.join(b, 'data/i18n/en-US.json'), '{}'); // default — must survive
  writeFileSync(path.join(b, 'data/i18n/de.json'), '{}'); // non-default — pruned
  writeFileSync(path.join(b, 'data/i18n/en-US/missions/x.json'), '{}'); // raw tree — pruned
  writeFileSync(path.join(b, 'data/i18n/de/missions/x.json'), '{}'); // raw tree — pruned
  writeFileSync(path.join(b, 'app.js'), 'x'); // survives
  writeFileSync(path.join(b, 'app.js.br'), 'x'); // dead compressed sibling — pruned
  return b;
}

const run = (cwd: string, mobile: boolean) =>
  execFileSync('node', [SCRIPT], {
    cwd,
    env: { ...process.env, MOBILE: mobile ? '1' : '' },
  });

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'prune-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('prune-streamed-assets (MOBILE=1)', () => {
  it('prunes streamed buckets, keeps on-device buckets', () => {
    const b = seed(dir);
    run(dir, true);
    // pruned
    expect(existsSync(path.join(b, 'images'))).toBe(false);
    expect(existsSync(path.join(b, 'audio'))).toBe(false);
    expect(existsSync(path.join(b, 'data/i18n/de.json'))).toBe(false);
    expect(existsSync(path.join(b, 'data/i18n/en-US'))).toBe(false); // raw tree
    expect(existsSync(path.join(b, 'data/i18n/de'))).toBe(false);
    expect(existsSync(path.join(b, 'app.js.br'))).toBe(false);
    // kept
    expect(existsSync(path.join(b, 'textures/2k_mars.jpg'))).toBe(true);
    expect(existsSync(path.join(b, 'data/i18n/en-US.json'))).toBe(true); // default locale
    expect(existsSync(path.join(b, 'app.js'))).toBe(true);
  });
});

describe('prune-streamed-assets (MOBILE unset)', () => {
  it('is a no-op — the browser build is untouched', () => {
    const b = seed(dir);
    run(dir, false);
    expect(existsSync(path.join(b, 'images/fleet-galleries/dawn/01.jpg'))).toBe(true);
    expect(existsSync(path.join(b, 'data/i18n/de.json'))).toBe(true);
    expect(existsSync(path.join(b, 'app.js.br'))).toBe(true);
  });
});
