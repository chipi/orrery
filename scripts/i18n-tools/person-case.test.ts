import { describe, expect, it } from 'vitest';
import { declinePersonRu } from './ru-case.mjs';
import { declinePersonSr } from './sr-case.mjs';

describe('declinePersonRu', () => {
  it('declines a Russian man, with -ым for his surname', () => {
    expect(declinePersonRu('Юрий Гагарин', 'gen', false, true)).toBe('Юрия Гагарина');
    expect(declinePersonRu('Юрий Гагарин', 'acc', false, true)).toBe('Юрия Гагарина');
    expect(declinePersonRu('Юрий Гагарин', 'ins', false, true)).toBe('Юрием Гагариным');
  });
  it('gives a foreign -ин surname -ом', () => {
    expect(declinePersonRu('Базз Олдрин', 'ins')).toBe('Баззом Олдрином');
  });
  it('declines adjectival surnames and Russian women', () => {
    expect(declinePersonRu('Константин Циолковский', 'dat', false, true)).toBe(
      'Константину Циолковскому',
    );
    expect(declinePersonRu('Валентина Терешкова', 'acc', true, true)).toBe('Валентину Терешкову');
    expect(declinePersonRu('Валентина Терешкова', 'gen', true, true)).toBe('Валентины Терешковой');
  });
  it("leaves a woman's foreign surname and vowel-final names", () => {
    expect(declinePersonRu('Пегги Уитсон', 'gen', true)).toBe('Пегги Уитсон');
    expect(declinePersonRu('Энрико Ферми', 'gen')).toBe('Энрико Ферми');
  });
});

describe('declinePersonSr', () => {
  it('declines a man, accusative = genitive', () => {
    expect(declinePersonSr('Јуриј Гагарин', 'acc')).toBe('Јурија Гагарина');
    expect(declinePersonSr('Јуриј Гагарин', 'ins')).toBe('Јуријем Гагарином');
    expect(declinePersonSr('Енрико Ферми', 'gen')).toBe('Енрика Фермија');
  });
  it('declines Russian women like adjectives and leaves foreign women', () => {
    expect(declinePersonSr('Валентина Терешкова', 'dat', true)).toBe('Валентини Терешковој');
    expect(declinePersonSr('Пеги Витсон', 'gen', true)).toBe('Пеги Витсон');
  });
});
