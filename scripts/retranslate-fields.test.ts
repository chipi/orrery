import { describe, expect, it } from 'vitest';
import { problems } from './lib/translate-quality.mjs';

const SRC =
  'The capsule dips into the upper atmosphere, then coasts back out above the sensible air.';

describe('retranslate-fields problems()', () => {
  it('accepts clean Serbian Cyrillic', () => {
    expect(
      problems(
        'sr-Cyrl',
        SRC,
        'Капсула зарони у горње слојеве атмосфере, па се по инерцији врати изнад густог ваздуха.',
      ),
    ).toEqual([]);
  });

  it('rejects the defects the 2026-10-17 sample found in sr-Cyrl', () => {
    expect(problems('sr-Cyrl', SRC, 'Это је урађено два пута.')).toContain(
      'contains Russian/Ukrainian letters',
    );
    expect(problems('sr-Cyrl', SRC, 'Тромиnutни пиктограм.')).toContain(
      'Latin letters inside a Cyrillic word',
    );
    expect(problems('sr-Cyrl', SRC, 'Умјесто једног пролаза.')).toContain('ijekavian form');
    expect(problems('sr-Cyrl', SRC, 'Конфигурисан витх боостерс ин тхе ловер стаге.')).toContain(
      'English spelled phonetically in Cyrillic',
    );
    expect(problems('sr-Cyrl', SRC, 'Станица __АЦР0__ кружи.')).toContain('placeholder token');
    expect(problems('sr-Cyrl', SRC, '첫 번째 단계, 모든 행성간 여행')).toEqual(
      expect.arrayContaining([expect.stringMatching(/another script/)]),
    );
  });

  it('rejects untranslated English and leftover English words', () => {
    expect(problems('de', SRC, SRC)).toContain('returned the English unchanged');
    expect(problems('de', SRC, 'The capsule dips and then coasts back from the air.')).toContain(
      'English words left in the translation',
    );
  });

  it('rejects CJK leaking into Hindi/Korean, but not Han in Japanese', () => {
    expect(problems('hi', SRC, 'मंगल पर पहली नरम着陸। लैंडर सफलतापूर्वक उतरा।')).toEqual(
      expect.arrayContaining([expect.stringMatching(/another script/)]),
    );
    expect(problems('ja', SRC, 'カプセルは上層大気に突入し、慣性で大気圏外へ戻る。')).toEqual([]);
  });

  it('rejects empty output', () => {
    expect(problems('fr', SRC, '  ')).toEqual(['empty']);
  });
});

describe('name guard (NAME_POLICY)', () => {
  const src =
    'Surveyor 3 soft-landed in April 1967; DSS-43 at Canberra tracks Voyager 2 over the Pacific 1969 route.';
  it('does not force dates, years or articles to stay English', () => {
    const out =
      'Surveyor 3 је меко слетео у априлу 1967; DSS-43 у Canberra-и прати Voyager 2 изнад пацифичке руте из 1969.';
    expect(problems('sr-Cyrl', src, out)).toEqual([]);
  });
  it('rejects a changed designation and a case ending glued onto a Latin name', () => {
    expect(
      problems(
        'sr-Cyrl',
        src,
        'Сурвејор 3 је меко слетео у априлу 1967; DSS-43 у Canberra-и прати Voyager 2.',
      ),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/Surveyor 3/)]));
    expect(
      problems('sr-Cyrl', src, 'Surveyor 3 у априлу 1967; DSS-43 у Canberri прати Voyager 2.'),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/Canberri/)]));
  });
  it('allows the name behind an adjective (Keplerian → Kepler), not other words', () => {
    expect(problems('ja', 'Keplerian Orbit', 'Kepler軌道')).toEqual([]);
    expect(problems('ja', 'Vis-Viva Equation', 'vis-viva方程式')).toEqual(
      expect.arrayContaining([expect.stringMatching(/vis, viva/)]),
    );
  });
  it('counts a designation as kept when the longer name holding it is rendered natively', () => {
    expect(problems('ru', 'Plesetsk LC-41/1', 'Плесецк, площадка 41/1')).toEqual([]);
    expect(problems('ru', 'Plesetsk LC-41/1', 'Плесецк')).toEqual(
      expect.arrayContaining([expect.stringMatching(/names changed or missing/)]),
    );
  });
});

describe('fixHomoglyphs', () => {
  it('maps Latin lookalikes inside Cyrillic words, leaves names alone', async () => {
    const { fixHomoglyphs } = await import('./lib/translate-quality.mjs');
    expect(fixHomoglyphs('sr-Cyrl', 'Врaтио је намеравa на Voyager 2 и NASA-ин halо')).toBe(
      'Вратио је намерава на Voyager 2 и NASA-ин halо'.replace('halо', 'halо'),
    );
    expect(fixHomoglyphs('sr-Cyrl', '[Вojаџеров')).toBe('[Војаџеров');
    expect(fixHomoglyphs('de', 'Врaтио')).toBe('Врaтио');
  });
});
