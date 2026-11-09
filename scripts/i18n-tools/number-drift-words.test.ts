import { describe, expect, it } from 'vitest';
import { drift, numbers } from './number-drift.mjs';
import { cjkNumbers, romanNumbers, wordNumbers } from './number-words.mjs';

const missing = (en: string, tr: string, loc: string) => drift(en, tr, loc).missing;

describe('number-drift: CJK numerals and scales', () => {
  const same: [string, string, string, string][] = [
    ['zh-CN', 'Long March 5', '长征五号', 'hanzi digit'],
    ['zh-CN', 'Chang’e 4', '嫦娥四号', 'hanzi digit'],
    ['zh-CN', 'Chang’e-1', '嫦娥一号', 'one before 号'],
    ['zh-CN', 'a 20th-century mission', '二十世纪任务', 'tens'],
    ['zh-CN', '11 launches', '十一次发射', 'teens'],
    ['zh-CN', '384,000 km', '38万4,000 km', 'mixed 万 and digits'],
    ['zh-CN', '600 million people', '6 亿人', 'space before 亿'],
    ['zh-CN', '9.46 trillion km', '9.46万亿千米', '万亿'],
    ['zh-CN', '1.4 billion km', '14亿公里', 'digits and 亿'],
    ['zh-CN', 'a $10-quintillion asteroid', '价值一千亿亿美元的小行星', 'repeated 亿'],
    ['zh-CN', '1/6th the distance', '六分之一', 'one in a fraction'],
    ['zh-CN', '347 kN', '347千牛', '千 as kilo is not 1000'],
    ['zh-CN', '25 megabits', '25兆比特', '兆 as mega is not 10^12'],
    ['ja', '4 crew', '四人', 'kanji digit'],
    ['ja', '$243M', '2億4300万ドル', '億 and 万'],
    ['ja', '1972', '一九七二', 'positional kanji year'],
    ['ja', '~2 Gyr', '約20億年', 'Gyr'],
    ['ja', '3-4 Gyr', '三十〜四十億年', 'kanji range sharing 億'],
    ['ja', '$10-quintillion', '1,000京ドル', '京'],
    ['ja', '36k tracked', '36k追跡', 'k beside CJK'],
    ['ko', '$243M', '2억 4,300만 달러', 'ko 억 and 만'],
    ['ko', '$74M', '7천 4백만 달러', 'ko 천 백 만'],
    ['ko', '9.46 trillion km', '9조 4,600억 km', 'ko 조'],
    ['ko', '~45–65 million ly', '약 4,500~6,500만 광년', 'range sharing 만'],
    ['ko', '1,000 times', '천 배', 'bare 천 before a counter'],
    ['ko', '30–50 AU', '30~50 천문단위', '천 in 천문 is not 1000'],
    ['ko', 'Voyager 2 only', 'Voyager 2만이 촬영했다', '만 as "only"'],
  ];
  for (const [loc, en, tr, why] of same)
    it(`${loc}: ${en} = ${tr} (${why})`, () => expect(missing(en, tr, loc)).toEqual([]));

  it('reads positional and scaled values', () => {
    expect(cjkNumbers('一九七二年', 'ja', '#').values).toEqual(['1972']);
    expect(cjkNumbers('三百八十四万', 'zh-CN', '#').values).toEqual(['3840000']);
    expect(cjkNumbers('1억 4,000만', 'ko', '#').values).toEqual(['140000000']);
  });
  it('does not merge a number with the hanzi after it', () => {
    expect(numbers('NIIP-5一号工位', 'zh-CN').sort()).toEqual(['1', '5']);
    expect(numbers('Surveyor 3 163 米', 'zh-CN')).toEqual(['3', '163']);
  });
  it('a changed or dropped value is still reported', () => {
    expect(missing('Long March 5', '长征六号', 'zh-CN')).toEqual(['5']);
    expect(missing('$243M', '2億5300万ドル', 'ja')).toEqual(['243000000']);
    expect(missing('22 watts', '23ワット', 'ja')).toEqual(['22']);
    expect(missing('7 months', '6개월', 'ko')).toEqual(['7']);
  });
});

describe('number-drift: number words', () => {
  const same: [string, string, string, string][] = [
    ['de', '6-hour', 'sechsstündig', 'compound'],
    ['de', 'two-stage', 'zweistufig', 'compound'],
    ['de', '27 years', 'siebenundzwanzig Jahre', 'unit first'],
    ['de', '120', 'einhundertzwanzig', 'hundred'],
    ['de', '3-D', 'dreidimensionalen', 'prefix'],
    ['de', '2 billion', 'Zwei Milliarden', 'scale word'],
    ['de', '1960s', 'in den Sechzigerjahren', 'decade'],
    ['fr', '27-year-old', 'vingt-sept ans', 'tens and unit'],
    ['fr', '90', 'quatre-vingt-dix', 'quatre-vingt-dix'],
    ['fr', '1900', 'mille neuf cent', 'thousand hundred'],
    ['fr', '22', 'vingt-deux', 'tens and unit'],
    ['fr', '2nd stage', 'second étage', 'ordinal'],
    ['fr', '1960s', 'les années soixante', 'decade'],
    ['es', '27', 'veintisiete', 'veinti'],
    ['es', '16', 'dieciséis', 'dieci'],
    ['es', '32', 'treinta y dos', 'y'],
    ['es', '300', 'trescientos', 'hundreds'],
    ['es', '1950s', 'los años cincuenta', 'decade'],
    ['it', '27-year-old', 'ventisettenne', 'compound'],
    ['it', '50-year', 'cinquantennale', 'compound'],
    ['it', '1950s', 'anni Cinquanta', 'decade'],
    ['it', '2000s', 'anni Duemila', 'decade'],
    ['it', '2nd stage', 'secondo stadio', 'ordinal'],
    ['nl', '10-year', 'tienjarige', 'compound'],
    ['nl', '1960s', 'de jaren zestig', 'decade'],
    ['pt-BR', '16', 'dezesseis', 'teen'],
    ['pt-BR', '1st cycle', 'PRIMEIRO CICLO', 'first'],
    ['ru', '2 days', 'двух суток', 'case form'],
    ['ru', '7-month', 'семимесячный', 'compound'],
    ['ru', '27', 'двадцать семь', 'two words'],
    ['ru', '1960s', 'шестидесятые', 'decade'],
    ['ru', '3-orbit', 'трёхвитковый', 'ё'],
    ['ru', '2,000', 'две тысячи', 'thousand'],
    ['sr-Cyrl', '12', 'дванаест', 'teen'],
    ['sr-Cyrl', '14-day', 'четрнаестодневну', 'compound'],
    ['sr-Cyrl', '1980s', 'осамдесетих година', 'decade'],
    ['sr-Cyrl', '4.5-day', 'четвородневног и по', 'and a half'],
    ['sr-Cyrl', '10-billion-year', 'десетомилијарданског', 'binding vowel'],
    ['ar', '12', 'اثني عشر', 'teen'],
    ['ar', '22', 'اثنين وعشرين', 'unit first'],
    ['ar', '28th', 'الثامنة والعشرين', 'ordinal'],
    ['ar', '1960s', 'ستينيات القرن العشرين', 'decade'],
    ['ar', '2030s', 'للثلاثينيات', 'prefixed decade'],
    ['ar', '2 wheels', 'عجلتَي', 'dual'],
    ['hi', '10th flight', 'दसवीं उड़ान', 'ordinal'],
    ['hi', '2.5', 'ढाई', 'half'],
  ];
  for (const [loc, en, tr, why] of same)
    it(`${loc}: ${en} = ${tr} (${why})`, () => expect(missing(en, tr, loc)).toEqual([]));

  it('a lone article is not the number one', () => {
    expect(wordNumbers('ein Haus', 'de')).toEqual([]);
    expect(wordNumbers('un hombre', 'es')).toEqual([]);
    expect(wordNumbers('Sessanta e un ritardo', 'it')).toEqual(['60']);
    expect(wordNumbers('het jaren zestig een budget', 'nl')).toEqual(['60']);
  });
  it('a changed or dropped value is still reported', () => {
    expect(missing('6-hour', 'fünfstündig', 'de')).toEqual(['6']);
    expect(missing('27 years', 'ventotto anni', 'it')).toEqual(['27']);
    expect(missing('1960s', 'in den Siebzigerjahren', 'de')).toEqual(['1960']);
    expect(missing('3 stages', 'Stufen', 'de')).toEqual(['3']);
    expect(missing('2 days', 'три дня', 'ru')).toEqual(['2']);
  });
});

describe('number-drift: Roman numerals', () => {
  it('reads centuries and ordinals, not names', () => {
    expect(romanNumbers('XXI secolo, XXIII Congreso, siècle XXᵉ')).toEqual(['21', '23', '20']);
    expect(romanNumbers('Saturn V, LC-39A, MIX, I')).toEqual([]);
    expect(romanNumbers('ХХ века')).toEqual(['20']);
  });
  it('20th century = XX века = XXe siècle', () => {
    expect(missing('the 20th century', 'ХХ века', 'ru')).toEqual([]);
    expect(missing('the 20th century', 'du XXᵉ siècle', 'fr')).toEqual([]);
    expect(missing('the 20th century', 'del siglo XXI', 'es')).toEqual(['20']);
  });
  it('the English side never reads "Saturn V" as 5', () => expect(numbers('Saturn V')).toEqual([]));
});

describe('number-drift: decades, short years, centuries', () => {
  it('1960s = années 60 = 60er', () => {
    expect(missing('the 1960s', 'les années 60', 'fr')).toEqual([]);
    expect(missing('the 1960s', 'die 60er Jahre', 'de')).toEqual([]);
  });
  it('1946-47 = 1946–1947', () => expect(missing('1946-47', '1946–1947', 'ru')).toEqual([]));
  it('the 2100s = 22nd century', () => {
    expect(missing('the 2100s', '22. веку', 'sr-Cyrl')).toEqual([]);
    expect(missing('the 2100s', 'в 23. веку', 'sr-Cyrl')).toEqual(['2100']);
  });
  it('a wrong decade is still reported', () =>
    expect(missing('the 1960s', 'les années 70', 'fr')).toEqual(['1960']));
});

describe('number-drift: scale and unit words', () => {
  it('4.6 Gyr = 4,6 Mrd. Jahre = 46億年', () => {
    expect(numbers('4.6 Gyr')).toEqual(['4600000000']);
    expect(numbers('4,6 Mrd. Jahre', 'de')).toEqual(['4600000000']);
    expect(numbers('46億年', 'ja')).toEqual(['4600000000']);
    expect(numbers('4,6 млрд лет', 'ru')).toEqual(['4600000000']);
  });
  it('Myr, Mpc, Ga, bn, $100M, 36k', () => {
    expect(numbers('~2 Myr')).toEqual(['2000000']);
    expect(numbers('3 Mpc')).toEqual(['3000000']);
    expect(numbers('3.5 Ga')).toEqual(['3500000000']);
    expect(numbers('$1.5bn')).toEqual(['1500000000']);
    expect(numbers('($100M)')).toEqual(['100000000']);
    expect(numbers('36k tracked')).toEqual(['36000']);
  });
  it('TMA-19M and Falcon 9 are not scaled', () => {
    expect(numbers('Soyuz TMA-19M')).toEqual(['19']);
    expect(numbers('Falcon 9 Mk 5')).toEqual(['9', '5']);
  });
  it('million and billion in each locale', () => {
    expect(numbers('290 миллионов', 'ru')).toEqual(['290000000']);
    expect(numbers('290 मिलियन', 'hi')).toEqual(['290000000']);
    expect(numbers('4 مليار سنة', 'ar')).toEqual(['4000000000']);
    expect(numbers('5 مليون', 'ar')).toEqual(['5000000']);
    expect(numbers('243 M$', 'fr')).toEqual(['243000000']);
    expect(numbers('54 миллионах километров', 'ru')).toEqual(['54000000']);
  });
  it('0.7–1.3 billion: the scale is shared across a range', () => {
    expect(numbers('0.7–1.3 billion')).toEqual(['700000000', '1300000000']);
    expect(numbers('von 10 bis 20 Millionen', 'de')).toEqual(['10000000', '20000000']);
    expect(numbers('Apollo 11 — 4.1 billion years')).toEqual(['11', '4100000000']);
  });
  it('SI prefix words: 3.2-gigapixel = 32億画素', () =>
    expect(missing('3.2-gigapixel camera', '32億画素のカメラ', 'ja')).toEqual([]));
  it('a changed value is still reported', () => {
    expect(missing('4.6 Gyr', '4,5 Mrd. Jahre', 'de')).toEqual(['4600000000']);
    expect(missing('$74M', '75 M$', 'fr')).toEqual(['74000000']);
  });
});

describe('number-drift: other equivalences', () => {
  it('23 and a half = 23,5', () =>
    expect(missing('23 and a half hours', '23,5 Stunden', 'de')).toEqual([]));
  it('2.5-hour = two and a half', () => {
    expect(missing('2.5-hour', 'двух с половиной часов', 'ru')).toEqual([]);
    expect(missing('2.5-hour', 'ساعتين ونصفًا', 'ar')).toEqual([]);
    expect(missing('2.5-hour', 'dwie godziny', 'ru')).toEqual(['2.5']);
  });
  it('10:00 is 10 h', () => expect(missing('10:00 local', '10 h locale', 'it')).toEqual([]));
  it('3,33,000 is 333000 (Indian grouping)', () =>
    expect(numbers('3,33,000 गुना', 'hi')).toEqual(['333000']));
  it('a number said once covers a name said twice', () =>
    expect(missing('Launch Complex 17 (LC-17)', 'LC-17', 'de')).toEqual([]));
  it('1/6 g: the numerator is a word', () =>
    expect(missing('1/6 g', 'gravité au sixième de g', 'fr')).toEqual([]));
});
