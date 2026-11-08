import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve('scripts/drop-gallery-slots.mjs');
let root = '';

// A tiny repo tree: one fleet gallery with three slots and a program that reuses two of them.
function fixture(reuses: string[]) {
  root = mkdtempSync(join(tmpdir(), 'drop-slots-'));
  const gal = join(root, 'static/images/fleet-galleries/x');
  mkdirSync(gal, { recursive: true });
  for (const nn of ['01', '02', '03']) writeFileSync(join(gal, `${nn}.webp`), nn);
  for (const d of ['static/data', 'scripts/i18n-tools', 'i18n-src/en-US/programs'])
    mkdirSync(join(root, d), { recursive: true });
  const prog = {
    body: reuses.map((r) => ({ type: 'figure', image: { reuse: r }, caption: 'A caption.' })),
  };
  writeFileSync(join(root, 'i18n-src/en-US/programs/p.json'), JSON.stringify(prog, null, 2) + '\n');
}
const run = (...args: string[]) => {
  try {
    return {
      code: 0,
      out: execFileSync('node', [SCRIPT, ...args], { cwd: root, encoding: 'utf8' }),
    };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: err.stdout + err.stderr };
  }
};
const program = () =>
  JSON.parse(readFileSync(join(root, 'i18n-src/en-US/programs/p.json'), 'utf8'));

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('drop-gallery-slots: program figures (reuse refs)', () => {
  it('renumbers a fleet/<id>/<NN> figure that points past the dropped slot, and lists it', () => {
    fixture(['fleet/x/01', 'fleet/x/03']);
    const r = run('--apply', 'fleet-galleries/x/02');
    expect(r.code).toBe(0);
    expect(r.out).toContain('fleet/x/03 → fleet/x/02');
    expect(program().body.map((f: { image: { reuse: string } }) => f.image.reuse)).toEqual([
      'fleet/x/01',
      'fleet/x/02',
    ]);
    expect(readFileSync(join(root, 'static/images/fleet-galleries/x/02.webp'), 'utf8')).toBe('03');
  });

  it('refuses (dry run and apply) when a figure reuses a dropped slot, writing nothing', () => {
    fixture(['fleet/x/02']);
    for (const args of [['fleet-galleries/x/02'], ['--apply', 'fleet-galleries/x/02']]) {
      const r = run(...args);
      expect(r.code).toBe(1);
      expect(r.out).toContain('fleet/x/02');
    }
    expect(program().body[0].image.reuse).toBe('fleet/x/02');
    expect(existsSync(join(root, 'static/images/fleet-galleries/x/03.webp'))).toBe(true);
  });
});
