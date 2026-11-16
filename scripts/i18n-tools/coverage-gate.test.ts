import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { textHash } from './term-match.mjs';

const SCAN = path.resolve('scripts/i18n-coverage-scan.mjs');
const PROSE = 'The probe landed softly on the plain and sent its first pictures home';

const put = (root: string, rel: string, json: unknown) => {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), JSON.stringify(json));
};
const fixture = (de: unknown, reviewed: unknown = {}) => {
  const root = mkdtempSync(path.join(tmpdir(), 'coverage-gate-'));
  put(root, 'i18n-src/en-US/page.json', { title: PROSE, intro: 'A second field to translate' });
  put(root, 'i18n-src/de/page.json', de);
  put(root, 'messages/en-US.json', { a: 'Hello there and welcome back' });
  put(root, 'messages/de.json', { a: 'Hallo' });
  mkdirSync(path.join(root, 'static/data'), { recursive: true });
  const rf = path.join(root, 'reviewed.json');
  writeFileSync(rf, JSON.stringify(reviewed));
  return { root, rf };
};
const gate = (f: { root: string; rf: string }) => {
  try {
    const out = execFileSync('node', [SCAN, '--gate'], {
      encoding: 'utf8',
      env: { ...process.env, I18N_COVERAGE_ROOT: f.root, I18N_COVERAGE_REVIEWED: f.rf },
    });
    return { code: 0, out };
  } catch (e) {
    return { code: (e as { status: number }).status, out: (e as { stdout: string }).stdout };
  }
};

describe('i18n-coverage gate', () => {
  it('passes a fully translated locale', () => {
    const f = fixture({ title: 'Die Sonde landete sanft', intro: 'Ein zweites Feld' });
    expect(gate(f)).toMatchObject({ code: 0 });
    rmSync(f.root, { recursive: true });
  });

  it('fails on a planted English string, a missing key and an empty one', () => {
    const f = fixture({ title: PROSE, intro: '' });
    const r = gate(f);
    expect(r.code).toBe(1);
    expect(r.out).toContain('sameAsEnglish\tpage.json title');
    expect(r.out).toContain('empty\tpage.json intro');
    const g = fixture({ title: 'Die Sonde landete sanft' });
    expect(gate(g).out).toContain('missingKey\tpage.json intro');
    rmSync(f.root, { recursive: true });
    rmSync(g.root, { recursive: true });
  });

  it('a reviewed exception passes until either text changes, then it is stale', () => {
    const h = textHash(PROSE);
    const key = 'de|page.json|title';
    const ok = { [key]: { why: 'kept on purpose', en: h, tr: h } };
    const f = fixture({ title: PROSE, intro: 'Ein zweites Feld' }, ok);
    expect(gate(f)).toMatchObject({ code: 0 });
    writeFileSync(
      path.join(f.root, 'i18n-src/de/page.json'),
      JSON.stringify({ title: 'Die Sonde landete sanft', intro: 'Ein zweites Feld' }),
    );
    const r = gate(f);
    expect(r.code).toBe(1);
    expect(r.out).toContain(`stale exception (no longer matches a finding): ${key}`);
    rmSync(f.root, { recursive: true });
  });

  it('fails on a message left in English', () => {
    const f = fixture({ title: 'Die Sonde landete sanft', intro: 'Ein zweites Feld' });
    writeFileSync(
      path.join(f.root, 'messages/de.json'),
      JSON.stringify({ a: 'Hello there and welcome back' }),
    );
    expect(gate(f).out).toContain('messages:sameAsEnglish');
    rmSync(f.root, { recursive: true });
  });
});

describe('i18n-coverage · program roster text', () => {
  const scan = (root: string, ...extra: string[]) => {
    try {
      return execFileSync('node', [SCAN, '--examples=10', ...extra], {
        encoding: 'utf8',
        env: { ...process.env, I18N_COVERAGE_ROOT: root },
      });
    } catch (e) {
      return (e as { stdout: string }).stdout;
    }
  };
  const withRoster = (deRoster: unknown) => {
    const f = fixture({ title: 'Die Sonde landete sanft', intro: 'Ein zweites Feld' });
    put(f.root, 'static/data/programs/p.json', {
      roster: [
        { linked_id: 'a', ref: 'mission', note: 'a note in English' },
        { linked_id: 'b', ref: 'mission', note: 'another note in English' },
        { linked_id: 'c', ref: 'fleet' },
        { name: 'Event one', note: 'an event note in English' },
      ],
    });
    put(f.root, 'i18n-src/en-US/programs/p.json', { name: 'P' });
    put(f.root, 'i18n-src/de/programs/p.json', { name: 'P', roster: deRoster });
    return f;
  };

  it('reports each untranslated note and name-only name per locale, and does not fail the gate', () => {
    const f = withRoster({ 'mission:a': { note: 'eine Notiz' } });
    const out = scan(f.root);
    expect(out).toMatch(/3\s+rosterMissing/);
    expect(out).toContain('programs/p.json :: roster.mission:b.note');
    expect(out).toContain('programs/p.json :: roster.Event one.name');
    expect(out).toContain('programs/p.json :: roster.Event one.note');
    expect(out).not.toContain('roster.mission:a');
    expect(out).not.toContain('extraKey');
    expect(gate(f)).toMatchObject({ code: 0 });
    rmSync(f.root, { recursive: true });
  });

  it('counts a locale with no roster overlay as missing every row, and flags an orphan key', () => {
    const f = withRoster({ 'mission:gone': { note: 'verwaist' } });
    const out = scan(f.root);
    expect(out).toMatch(/4\s+rosterMissing/);
    expect(out).toMatch(/1\s+extraKey/);
    expect(out).toContain('roster.mission:gone');
    rmSync(f.root, { recursive: true });
  });
});

describe('i18n-coverage · reviewed exceptions', () => {
  const reviewed = JSON.parse(
    readFileSync('scripts/i18n-tools/coverage-reviewed.json', 'utf8'),
  ) as Record<string, { why: string; en: string; tr: string }>;
  it('every exception names a locale, a file and field, a reason and both text hashes', () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(reviewed)) {
      if (k.split('|').length !== 3) bad.push(`${k}: malformed`);
      if (!v.why?.trim()) bad.push(`${k}: needs a reason`);
      if (!/^[0-9a-f]{10}$/.test(v.en) || !/^[0-9a-f]{10}$/.test(v.tr))
        bad.push(`${k}: needs a hash of both texts`);
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });
  it('no unreviewed findings, no stale exceptions, in the real corpus', () => {
    const r = gate({
      root: path.resolve('.'),
      rf: path.resolve('scripts/i18n-tools/coverage-reviewed.json'),
    });
    expect(r.out.split('\n').slice(-6).join('\n')).toContain(' 0 unreviewed,');
    expect(r.code).toBe(0);
  }, 60_000);
});
