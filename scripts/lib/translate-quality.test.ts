import { describe, expect, it } from 'vitest';
import { problems } from './translate-quality.mjs';

const nameProblem = (loc: string, src: string, out: string) =>
  problems(loc, src, out).filter((p) => /^names (translated|changed) or missing/.test(p));

describe('problems — names that contain a glossary term', () => {
  it('flags a vehicle name translated with its body word (Mars Express → 화성 익스프레스)', () => {
    expect(
      nameProblem(
        'ko',
        'Mars Express — flight over Nili Fossae',
        '화성 익스프레스 — 닐리 포새 상공 비행',
      ),
    ).not.toEqual([]);
  });
  it('accepts the vehicle name kept while the body word elsewhere is native', () => {
    expect(
      nameProblem(
        'ko',
        'Mars Express — flight over Nili Fossae',
        'Mars Express — 닐리 포새 상공 비행',
      ),
    ).toEqual([]);
  });
  it('accepts a pad designation whose generic words are translated', () => {
    expect(
      nameProblem('ru', 'Starbase Orbital Pad A', 'Starbase, орбитальный стартовый стол A'),
    ).toEqual([]);
  });
  it('still accepts a native place with its code kept (Cape Canaveral SLC-40)', () => {
    expect(
      nameProblem('ru', 'Launched from Cape Canaveral SLC-40.', 'Запуск с мыса Канаверал, SLC-40.'),
    ).toEqual([]);
  });
});
