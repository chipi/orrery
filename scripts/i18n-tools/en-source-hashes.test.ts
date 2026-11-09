import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const TOOL = path.resolve('scripts/i18n-tools/stale-overlays.mjs');

const put = (root: string, rel: string, json: unknown) => {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), JSON.stringify(json));
};
const run = (root: string, mode: 'check' | 'write') => {
  try {
    return {
      code: 0,
      out: execFileSync('node', [TOOL, `--manifest=${mode}`], { cwd: root, encoding: 'utf8' }),
    };
  } catch (e) {
    return { code: (e as { status: number }).status, out: (e as { stdout: string }).stdout };
  }
};
const corpus = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'en-hashes-'));
  put(root, 'i18n-src/en-US/page.json', { title: 'Hello', list: ['one', 'two'] });
  put(root, 'messages/en-US.json', { $schema: 'x', 'nav.home': 'Home' });
  mkdirSync(path.join(root, 'scripts/i18n-tools'), { recursive: true });
  return root;
};

describe('English source-hash manifest', () => {
  it('passes right after a write, with no git history in the directory', () => {
    const root = corpus();
    expect(run(root, 'write').out).toContain('wrote 4 strings in 2 files');
    expect(run(root, 'check')).toMatchObject({ code: 0 });
    rmSync(root, { recursive: true });
  });

  it('fails on an English string edited after the manifest, naming the field', () => {
    const root = corpus();
    run(root, 'write');
    put(root, 'i18n-src/en-US/page.json', { title: 'Hello there', list: ['one', 'two'] });
    const r = run(root, 'check');
    expect(r.code).toBe(1);
    expect(r.out).toContain('changed\tpage.json\ttitle');
    expect(r.out).toContain('1 changed, 0 new');
    run(root, 'write');
    expect(run(root, 'check')).toMatchObject({ code: 0 });
    rmSync(root, { recursive: true });
  });

  it('fails on a new English string and on a changed UI message; ignores $-meta keys', () => {
    const root = corpus();
    run(root, 'write');
    put(root, 'i18n-src/en-US/page.json', { title: 'Hello', list: ['one', 'two', 'three'] });
    put(root, 'messages/en-US.json', { $schema: 'y', 'nav.home': 'Start' });
    const r = run(root, 'check');
    expect(r.code).toBe(1);
    expect(r.out).toContain('new\tpage.json\tlist.2');
    expect(r.out).toContain('changed\tmessages\tnav.home');
    expect(r.out).not.toContain('$schema');
    rmSync(root, { recursive: true });
  });

  it('only counts an English string that was removed', () => {
    const root = corpus();
    run(root, 'write');
    put(root, 'i18n-src/en-US/page.json', { title: 'Hello', list: ['one'] });
    const r = run(root, 'check');
    expect(r.code).toBe(0);
    expect(r.out).toContain('1 removed');
    rmSync(root, { recursive: true });
  });
});

describe('English source-hash manifest · the real corpus', () => {
  it('every English string matches the manifest (re-check the translations, then --manifest=write)', () => {
    const r = run(path.resolve('.'), 'check');
    expect(r.out.split('\n').slice(-12).join('\n')).toContain(' 0 changed, 0 new');
    expect(r.code).toBe(0);
  });
});
