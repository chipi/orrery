import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { dropEdits, mergeFix, parseRefused } from './edit-fixes.mjs';
import { pyRegex } from './garble-lib.mjs';
import { tally } from './garble-tally.mjs';
import { missingNumbers, normalise } from './number-loss.mjs';
import { loadCaps, overCap } from './schema-caps.mjs';
import { splitWork } from './split-work.mjs';
import { missesToKeeps } from './term-misses.mjs';

describe('number-loss normalisation', () => {
  it('reads every thousands separator as one number', () => {
    for (const t of ['1,578', '1 578', '1 578', '1 578', '1.578'])
      expect(missingNumbers('1,578 km', `${t} km`)).toEqual({});
  });
  it('reads the decimal comma as a dot', () => {
    expect(normalise('2,8')).toBe('2.8');
    expect(missingNumbers('2.8 km', '2,8 km', 1)).toEqual({});
    expect(missingNumbers('12.5 km', '12,5 км')).toEqual({});
  });
  it('expands the CJK multipliers', () => {
    expect(normalise('33万')).toBe('330000');
    expect(normalise('1.5亿')).toBe('150000000');
    expect(normalise('2万亿')).toBe('2000000000000');
    expect(normalise('3만')).toBe('30000');
    expect(normalise('4억')).toBe('400000000');
    expect(normalise('5億')).toBe('500000000');
    expect(missingNumbers('330,000 km', '约33万公里')).toEqual({});
  });
  it('strips a separator that is followed by CJK text', () => {
    expect(missingNumbers('100,000 bodies', '超过100,000个天体')).toEqual({});
  });
  it('lists a number that is really missing, and ignores small ones', () => {
    expect(missingNumbers('1,578 km and 3 moons', '1,579 км и 3 луны')).toEqual({ '1578': 1 });
    expect(missingNumbers('about 5 km', 'около 6 км')).toEqual({});
    expect(missingNumbers('15 and 15', 'только 15')).toEqual({ '15': 1 });
  });
});

describe('schema-caps', () => {
  const schemaMax = (file: string, ...p: string[]) =>
    (
      p.reduce<unknown>(
        (o, k) => (o as Record<string, unknown>)[k],
        JSON.parse(fs.readFileSync(`static/data/schemas/${file}.schema.json`, 'utf8')),
      ) as { maxLength: number }
    ).maxLength;
  const caps = loadCaps();
  const cap = (name: string) =>
    caps.find((c: { name: string; cap: number }) => c.name === name)?.cap;

  it('reads the caps from the schemas', () => {
    expect(cap('intro_sentence')).toBe(
      schemaMax('science-section-overlay', 'properties', 'intro_sentence'),
    );
    expect(cap('headline')).toBe(schemaMax('science-tab-intro', 'properties', 'headline'));
    expect(cap('tagline')).toBe(schemaMax('fleet-overlay', 'properties', 'tagline'));
    expect([cap('intro_sentence'), cap('headline'), cap('tagline')]).toEqual([240, 160, 140]);
  });
  it('follows the schema directory it is given', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caps-'));
    fs.writeFileSync(
      path.join(dir, 'science-tab-intro.schema.json'),
      JSON.stringify({ properties: { headline: { maxLength: 5 } } }),
    );
    expect(loadCaps(dir).map((c: { name: string; cap: number }) => [c.name, c.cap])).toEqual([
      ['headline', 5],
    ]);
  });
  it('lists only the edits over their field cap, counting code points', () => {
    const e = (at: string, n: number) => ({
      rel: 'r.json',
      at,
      en: 'EN',
      old: 'o',
      new: '😀'.repeat(n),
    });
    const over = overCap(
      [e('intro_sentence', 240), e('intro_sentence', 241), e('headline', 161), e('body', 999)],
      new Map([['r.json:headline', 'EN headline']]),
      caps,
    );
    expect(
      over.map((o: { at: string; cap: number; len: number; en: string }) => [
        o.at,
        o.cap,
        o.len,
        o.en,
      ]),
    ).toEqual([
      ['intro_sentence', 240, 241, 'EN'],
      ['headline', 160, 161, 'EN headline'],
    ]);
  });
});

describe('term-misses keeps', () => {
  const miss = (term: string, extra = {}) => ({
    term,
    loc: 'zh-CN',
    where: 'science/a.json :: body.1',
    en: 'e',
    tr: 't',
    ...extra,
  });
  it('writes rel and at from "where", and the staleKeep reason before the default', () => {
    expect(
      missesToKeeps([miss('orbit', { staleKeep: 'verb form' }), miss('thrust')], {
        orbit: 'default',
        thrust: 'noun',
      }),
    ).toEqual([
      { term: 'orbit', loc: 'zh-CN', rel: 'science/a.json', at: 'body.1', why: 'verb form' },
      { term: 'thrust', loc: 'zh-CN', rel: 'science/a.json', at: 'body.1', why: 'noun' },
    ]);
  });
  it('refuses a miss with no reason', () => {
    expect(() => missesToKeeps([miss('burn')], { orbit: 'x' })).toThrow(/no reason for burn/);
  });
});

describe('split-work', () => {
  it('splits in order into ceil(len/n) items per part', () => {
    const parts = splitWork([1, 2, 3, 4, 5, 6, 7], 3);
    expect(parts).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
  it('keeps n parts when the list is short', () => {
    expect(splitWork([1, 2], 4)).toEqual([[1], [2], [], []]);
  });
});

describe('edit-fixes', () => {
  const edits = () => [
    { rel: 'a.json', at: 'x', old: 'o', new: '1' },
    { rel: 'a.json', at: 'y', old: 'o', new: '2' },
  ];
  it('merges new texts by rel:at and counts them', () => {
    const e = edits();
    expect(
      mergeFix(e, [
        { rel: 'a.json', at: 'y', new: 'Y' },
        { rel: 'b.json', at: 'z', new: 'Z' },
      ]),
    ).toEqual({
      n: 1,
      of: 2,
    });
    expect(e.map((x) => x.new)).toEqual(['1', 'Y']);
  });
  it('drops edits by rel:at', () => {
    expect(dropEdits(edits(), new Set(['a.json:x'])).map((x) => x.at)).toEqual(['y']);
  });
  it('reads the guard of each refused field from the apply-edits output', () => {
    const out =
      'ru: applied 0 in 1 files; skipped 0; refused 1\na.json:x — Latin-script words — fix\n';
    expect([...parseRefused(out)]).toEqual([['a.json:x', 'Latin-script words — fix']]);
  });
});

describe('garble-tally', () => {
  it('counts OK/MINOR/BROKEN per locale and tree and flags cells with 2+ BROKEN', () => {
    const items = (tree: string, ...g: string[]) => g.map((grade) => ({ tree, grade }));
    const lines = tally(
      [
        {
          loc: 'ru',
          items: [...items('science', 'OK', 'BROKEN', 'BROKEN', 'MINOR'), ...items('prose', 'OK')],
        },
      ],
      { pools: { science: 10 } },
    );
    expect(lines[1]).toMatch(/^ru\s+1\/1\/2\s+1\/0\/0$/);
    expect(lines).toContain('flagged 1');
    expect(lines).toContain('  ru science: 2 BROKEN, 10 fields');
  });
});

describe('pyRegex', () => {
  it('lets \\w and \\b see non-ASCII letters, as the Python tools did', () => {
    expect('диаграммы «'.match(pyRegex('[Дд]иаграмм\\w* «'))?.[0]).toBe('диаграммы «');
    expect(pyRegex('\\bмера\\b').test('мера')).toBe(true);
    expect(pyRegex('\\bмера\\b').test('примера')).toBe(false);
  });
});
