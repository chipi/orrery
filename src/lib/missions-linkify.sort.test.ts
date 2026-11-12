import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$lib/locale', () => ({ localHref: (p: string) => p }));
vi.mock('$lib/data/core', () => ({ loadI18nBundle: async () => ({}) }));

const { entryYear, sortNewestFirst, onMissionLinkClick } = await import('./missions-linkify');

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const LOCALES = readdirSync('i18n-src').filter((l) => l !== 'en-US');

type Source = { kind: string; id: string; visits: string[] };
const sources: Source[] = [
  ...(
    read('static/data/planets.json').planets as { name: string; mission_visits?: string[] }[]
  ).map((p) => ({ kind: 'planets', id: p.name.toLowerCase(), visits: p.mission_visits ?? [] })),
  ...(
    read('static/data/satellites.json').satellites as { id: string; mission_visits?: string[] }[]
  ).map((s) => ({ kind: 'satellites', id: s.id, visits: s.mission_visits ?? [] })),
  ...(read('static/data/belts.json').belts as { id: string; mission_visits?: string[] }[]).map(
    (b) => ({ kind: 'belts', id: b.id, visits: b.mission_visits ?? [] }),
  ),
  ...(
    read('static/data/small-bodies.json').bodies as { id: string; mission_visits?: string[] }[]
  ).map((b) => ({ kind: 'small-bodies', id: b.id, visits: b.mission_visits ?? [] })),
];
const listsOfTwo = sources.filter((s) => s.visits.length >= 2);

describe('entryYear', () => {
  it('reads the first four-digit year', () => {
    expect(entryYear('Voyager 2 — NASA, 1989 (only spacecraft to visit Neptune)')).toBe(1989);
    expect(entryYear('Galileo orbiter — USA, 1995–2003 (many flybys)')).toBe(1995);
    expect(entryYear('Juno — NASA, 2016 –')).toBe(2016);
  });

  it('gives null without a year, and ignores numbers that are not years', () => {
    expect(entryYear('Pioneer 10 — NASA')).toBeNull();
    expect(entryYear('Mariner 10 — flyby')).toBeNull();
  });
});

describe('sortNewestFirst', () => {
  it('orders newest first and keeps the order of equal years', () => {
    expect(sortNewestFirst(['A — 1989', 'B — 2016', 'C — 1989', 'D — 1995'])).toEqual([
      'B — 2016',
      'D — 1995',
      'A — 1989',
      'C — 1989',
    ]);
  });

  it('puts entries without a year last, in their order', () => {
    expect(sortNewestFirst(['X', 'Y — 1979', 'Z'])).toEqual(['Y — 1979', 'X', 'Z']);
  });

  it('applies the permutation of the base list to a translated list', () => {
    const base = ['Voyager 2 — NASA, 1989', 'Juno — NASA, 2016'];
    expect(sortNewestFirst(['Вояджер-2', 'Юнона'], base)).toEqual(['Юнона', 'Вояджер-2']);
  });

  it('falls back to the entries when the base list has another length', () => {
    expect(sortNewestFirst(['A — 1999', 'B — 2001'], ['A — 1999'])).toEqual([
      'B — 2001',
      'A — 1999',
    ]);
  });

  it('does not change its input', () => {
    const list = ['A — 1999', 'B — 2001'];
    sortNewestFirst(list);
    expect(list).toEqual(['A — 1999', 'B — 2001']);
  });
});

describe('every body mission list in the data', () => {
  it('has 15 lists of two or more entries (6 planets, 9 moons)', () => {
    expect(listsOfTwo.filter((s) => s.kind === 'planets')).toHaveLength(6);
    expect(listsOfTwo.filter((s) => s.kind === 'satellites')).toHaveLength(9);
  });

  it('sorts newest first by the en-US years', () => {
    for (const s of listsOfTwo) {
      const years = sortNewestFirst(s.visits).map((e) => entryYear(e) ?? -Infinity);
      expect(years, `${s.kind}/${s.id}`).toEqual([...years].sort((a, b) => b - a));
    }
  });

  it('gives every locale the permutation of the en-US list, read from the base or from its own digits', () => {
    let checked = 0;
    for (const s of listsOfTwo) {
      const baseOrder = sortNewestFirst(s.visits).map((e) => s.visits.indexOf(e));
      for (const loc of LOCALES) {
        const file = `i18n-src/${loc}/${s.kind}/${s.id}.json`;
        if (!existsSync(file)) continue;
        const overlay = read(file).mission_visits as string[] | undefined;
        if (!overlay || overlay.length !== s.visits.length) continue;
        const viaBase = sortNewestFirst(overlay, s.visits).map((e) => overlay.indexOf(e));
        const viaOwn = sortNewestFirst(overlay).map((e) => overlay.indexOf(e));
        expect(viaBase, `${loc}/${s.kind}/${s.id} via base`).toEqual(baseOrder);
        expect(viaOwn, `${loc}/${s.kind}/${s.id} via own digits`).toEqual(baseOrder);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('onMissionLinkClick', () => {
  const click = (init: Partial<MouseEvent> = {}) => {
    const e = { button: 0, preventDefault: vi.fn(), ...init } as unknown as MouseEvent;
    return e;
  };

  it('opens a mission in place and stops the navigation', () => {
    const open = vi.fn();
    const e = click();
    onMissionLinkClick(e, { kind: 'mission', id: 'voyager-2' }, open);
    expect(open).toHaveBeenCalledWith('voyager-2');
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('leaves a fleet link, a modified click and a missing handler to the anchor', () => {
    const open = vi.fn();
    const fleet = click();
    onMissionLinkClick(fleet, { kind: 'fleet', id: 'mro' }, open);
    const ctrl = click({ ctrlKey: true });
    onMissionLinkClick(ctrl, { kind: 'mission', id: 'viking-1' }, open);
    const none = click();
    onMissionLinkClick(none, { kind: 'mission', id: 'viking-1' }, undefined);
    expect(open).not.toHaveBeenCalled();
    for (const e of [fleet, ctrl, none]) expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
