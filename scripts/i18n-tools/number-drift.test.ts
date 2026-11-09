import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dateTokens, drift, numbers } from './number-drift.mjs';

const missing = (en: string, tr: string, loc: string) => drift(en, tr, loc).missing;

describe('number-drift: dates are compared as dates', () => {
  const same: [string, string, string, string][] = [
    ['de', 'On February 12, 1997 it flew.', 'Am 12.02.1997 flog es.', 'dd.mm.yyyy'],
    ['de', 'launched February 12', 'startete am 12.02. und kam an', 'dd.mm. mid-sentence'],
    ['de', '5 May 1961', '5. Mai 1961', 'month name with ordinal dot'],
    ['de', 'landed 1969-07-20', 'landete am 20.07.1969', 'ISO to numeric'],
    ['fr', 'on 27 January 1967', 'le 27 janvier 1967', 'month name'],
    ['fr', 'January 1', 'le 1er janvier', 'ordinal suffix'],
    ['es', '14 Jul 2015', '14 jul 2015', 'short name without period'],
    ['es', 'on 1 January 1969', 'el 1 de enero de 1969', 'de connectors'],
    ['it', 'on October 4, 1957', 'il 4 ottobre 1957', 'month first to day first'],
    ['pt-BR', 'on 12 February', 'em 12 de fevereiro', 'de connector'],
    ['nl', '7 Nov 2023', '7 nov 2023', 'short name'],
    ['ru', 'on February 12', '12 февраля', 'genitive month'],
    ['ru', 'on 27 January 1967', '27 января 1967 года', 'genitive month and year'],
    ['ru', 'May 5', '5 мая', 'May'],
    ['ru', 'in October 1995', 'в октябре 1995 года', 'declined month with a year only'],
    [
      'sr-Cyrl',
      'August 15, 1977',
      'Дана 15. августа 1977.',
      'genitive without a vowel of the stem',
    ],
    ['sr-Cyrl', '2023-09-24', '24. 9. 2023', 'spaced numeric'],
    ['sr-Cyrl', 'December 14, 1972', '14. децембра 1972.', 'децембар → децембра'],
    ['zh-CN', 'on 27 January 1967', '1967年1月27日', 'CJK 年月日'],
    ['zh-CN', 'on February 12', '2月12日', 'CJK 月日'],
    ['zh-CN', 'December 2024', '2024 年 12 月', 'spaced CJK, month dropped'],
    ['ja', 'on 20 July 1969', '1969年7月20日', 'CJK 年月日'],
    ['ja', '11-15 November 1966', '1966年11月11～15日', 'range with a fullwidth tilde'],
    ['ja', '1985-10-03', '1985年10月3日', 'ISO to CJK'],
    ['ko', 'on 13–14 October', '10월 13~14일', 'range'],
    ['ko', 'on 2004-01-04', '2004년 1월 4일', 'ISO to Korean'],
    ['ar', 'on 12 February 2020', 'في ١٢ فبراير ٢٠٢٠', 'Eastern Arabic digits, Intl month'],
    ['ar', '12 February 2020', '12 شباط 2020', 'Levantine month'],
    ['hi', 'on October 4, 1957', '4 अक्तूबर 1957 को', 'Hindi month spelling'],
    ['hi', 'February 3, 1966', '3 फ़रवरी 1966', 'nukta'],
    ['hi', 'August 5/6 2012', '5/6 अगस्त 2012', 'slash range'],
  ];
  for (const [loc, en, tr, why] of same)
    it(`${loc}: ${en} = ${tr} (${why})`, () => expect(missing(en, tr, loc)).toEqual([]));

  it('reduces every form of one date to the same token', () => {
    const tok = (s: string, loc: string) => dateTokens(s, loc).tokens;
    const want = ['md:02-12'];
    expect(tok('February 12', 'en-US')).toEqual(want);
    expect(tok('12 Feb.', 'en-US')).toEqual(want);
    expect(tok('12.02.', 'de')).toEqual(want);
    expect(tok('12 февраля', 'ru')).toEqual(want);
    expect(tok('2月12日', 'zh-CN')).toEqual(want);
    expect(tok('12 de febrero', 'es')).toEqual(want);
    expect(tok('12 فبراير', 'ar')).toEqual(want);
  });

  it('keeps the year a plain number', () => {
    expect(dateTokens('27 January 1967', 'en-US').tokens).toEqual(['md:01-27', '1967']);
    expect(dateTokens('1967年1月27日', 'ja').tokens).toEqual(['md:01-27', '1967']);
  });
});

describe('number-drift: a real change is still reported', () => {
  it('a different day', () => expect(missing('February 12', '13.02.', 'de')).toEqual(['md:02-12']));
  it('a different month', () =>
    expect(missing('February 12', '12 марта', 'ru')).toEqual(['md:02-12']));
  it('a different year', () =>
    expect(missing('27 January 1967', '27.01.1968', 'de')).toEqual(['1967']));
  it('a dropped year', () => expect(missing('27 January 1967', '27.01.', 'de')).toEqual(['1967']));
  it('the 2026-10-31 hill-sphere case: 333,000× became 80×', () =>
    expect(missing('about 333,000×', 'etwa 80×', 'de')).toEqual(['333000']));
  it('a changed number beside a date', () =>
    expect(
      missing('launched 4 October 1957 at 215 km', 'am 4. Oktober 1957 bei 251 km', 'de'),
    ).toEqual(['215']));

  it('a month name the locale does not know falls back to the day number, as before', () =>
    expect(missing('February 12', '12 Phantasmonat', 'de')).toEqual([]));
  it('the day lost entirely is reported', () =>
    expect(missing('February 12', 'im Februar', 'de')).toEqual(['md:02-12']));
});

describe('number-drift: things that look like dates and are not', () => {
  it('"Long March 5" is a rocket', () => {
    expect(dateTokens('Long March 5 uses 2 YF-77', 'en-US').tokens).toEqual([]);
    expect(missing('Long March 5', '长征', 'zh-CN')).toEqual(['5']);
  });
  it('fr "Mars 1,52" is the planet', () => {
    expect(dateTokens('Terre 1,0, Mars 1,52, Jupiter 5,20', 'fr').tokens).toEqual([]);
    expect(missing('Mars 1.52 AU', 'Mars 1,52 ua', 'fr')).toEqual([]);
  });
  it('a decimal at a sentence end is not dd.mm.', () => {
    expect(dateTokens('Spectral type M5.5.', 'de').tokens).toEqual([]);
    expect(dateTokens('نحو 3.6. أما الحقن', 'ar').tokens).toEqual([]);
  });
  it('"Apollo 11月面" is the Moon, not November', () =>
    expect(dateTokens('Apollo 11月面着陸', 'ja').tokens).toEqual([]));
  it('"MS-15 in September 2019" keeps 15 a plain number', () =>
    expect(missing('MS-15 in September 2019', 'MS-15 del settembre 2019', 'it')).toEqual([]));
  it('"Soyuz 14 jul 1974" read as a date by the translation still has its 14', () =>
    expect(missing('Soyuz 14 crew Jul 1974', 'Soyuz 14 jul 1974', 'es')).toEqual([]));
  it('English "may" the verb is not May', () =>
    expect(dateTokens('it may 5 times', 'en-US').tokens).toEqual([]));
});

describe('number-drift: number semantics are unchanged', () => {
  it('thousands separators and decimals are values', () => {
    expect(numbers('149,597,870,700')).toEqual(numbers('149.597.870.700', 'de'));
    expect(numbers('149 597 870 700')).toEqual(['149597870700']);
    expect(numbers('1,5', 'de')).toEqual(numbers('1.5'));
  });
  it('Eastern Arabic and Devanagari digits are digits', () => {
    expect(numbers('٣٫٦ كم', 'ar')).toEqual(['3.6']);
    expect(numbers('१२ किमी', 'hi')).toEqual(['12']);
  });
  it('CJK myriad units and scale words', () => {
    expect(numbers('38万', 'zh-CN')).toEqual(['380000']);
    expect(numbers('1.5 billion')).toEqual(['1500000000']);
    expect(numbers('1,5 Billionen', 'de')).toEqual(['1500000000000']);
  });
  it('--no-dates turns the date handling off', () =>
    expect(numbers('12.02.', 'de', false)).toEqual(['12.02']));
});

describe('number-drift --json', () => {
  it('prints per tree and locale counts and totals', () => {
    const out = JSON.parse(
      execFileSync('node', ['scripts/i18n-tools/number-drift.mjs', 'videos', 'de,ja', '--json'], {
        encoding: 'utf8',
      }),
    );
    expect(Object.keys(out.trees)).toEqual(['videos']);
    expect(Object.keys(out.trees.videos)).toEqual(['de', 'ja']);
    expect(out.trees.videos.de).toEqual({
      fields: expect.any(Number),
      withMissing: expect.any(Number),
      reviewed: expect.any(Number),
    });
    expect(out.totals.all).toBe(out.totals.de + out.totals.ja);
  });
});
