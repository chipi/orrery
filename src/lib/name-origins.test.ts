import { describe, expect, it } from 'vitest';
import { nativeCompound, nativeName, nativePattern, nameRendered } from './name-origins.js';

describe('nativeName', () => {
  it('maps plain names in their origin locale only', () => {
    expect(nativeName('ru', 'Mir')).toBe('Мир');
    expect(nativeName('zh-CN', 'Tiangong')).toBe('天宫');
    expect(nativeName('de', 'Mir')).toBeNull();
    expect(nativeName('ru', 'Tiangong')).toBeNull();
  });

  it('builds Russian serial forms', () => {
    expect(nativeName('ru', 'Luna 9')).toBe('Луна-9');
    expect(nativeName('ru', 'Soyuz MS-24')).toBe('Союз МС-24');
    expect(nativeName('ru', 'Soyuz MS')).toBe('Союз МС');
    expect(nativeName('ru', 'Proton-M')).toBe('Протон-М');
    expect(nativeName('ru', 'Soyuz TMA')).toBe('Союз ТМА');
    expect(nativeName('ru', 'Salyut 3 (OPS-2)')).toBe('Салют-3 (OPS-2)');
    expect(nativeName('ru', 'Soyuz XYZ')).toBeNull();
    // Shared bases convert only for the Soviet names; English prose after a serial does not.
    expect(nativeName('ru', 'Mars 3')).toBe('Марс-3');
    expect(nativeName('ru', 'Mars 2020')).toBeNull();
    expect(nativeName('ru', 'Vega C')).toBeNull();
    expect(nativeName('ru', 'Vega 2')).toBe('Вега-2');
    expect(nativeName('ru', 'Mars 3 Orbiter')).toBeNull();
    expect(nativeName('ru', 'Vega')).toBeNull();
    expect(nativeName('ru', 'Soyuz 7K-OK')).toBe('Союз 7К-ОК');
    expect(nativeName('ru', 'Sokol KV-2')).toBe('Сокол КВ-2');
    expect(nativeName('ru', 'Luna-25')).toBe('Луна-25');
    expect(nativeName('ru', 'Mars-500')).toBe('Марс-500');
    expect(nativeName('zh-CN', 'Xichang LC-3')).toBe('西昌 LC-3');
    expect(nativeName('ru', 'Mars')).toBeNull();
    expect(nativeName('zh-CN', 'Long March 3B / E')).toBeNull();
  });

  it('builds Chinese serial forms', () => {
    expect(nativeName('zh-CN', "Chang'e 5")).toBe('嫦娥五号');
    expect(nativeName('zh-CN', 'Long March 5')).toBe('长征五号');
    expect(nativeName('zh-CN', 'Long March 3B')).toBe('长征三号B');
    expect(nativeName('zh-CN', 'Shenzhou 13')).toBe('神舟十三号');
    expect(nativeName('zh-CN', 'Shenzhou 21')).toBe('神舟二十一号');
    expect(nativeName('zh-CN', 'Tianwen-1')).toBe('天问一号');
    expect(nativeName('zh-CN', 'Yutu')).toBe('玉兔');
  });

  it('keeps the serial as written elsewhere', () => {
    expect(nativeName('hi', 'Chandrayaan-3')).toBe('चंद्रयान-3');
    expect(nativeName('ja', 'Hayabusa2')).toBe('はやぶさ2');
    expect(nativeName('ar', 'Hope')).toBe('الأمل');
  });
});

describe('nativeCompound (launch vehicles)', () => {
  it('converts each part of a compound name', () => {
    expect(nativeCompound('ru', 'Proton-M/Briz-M')).toBe('Протон-М/Бриз-М');
    expect(nativeCompound('ru', 'Proton-K/DM-2')).toBe('Протон-К/ДМ-2');
    expect(nativeCompound('ru', 'Kosmos 11K65M')).toBe('Космос 11К65М');
    expect(nativeCompound('ru', 'Soyuz 2.1b')).toBe('Союз 2.1б');
    expect(nativeCompound('ru', 'Soyuz-2-1A')).toBe('Союз-2-1А');
    expect(nativeCompound('zh-CN', 'Chang Zheng 3B/YZ-1')).toBe('长征三号B/YZ-1');
    expect(nativeCompound('zh-CN', 'Kuaizhou-1A')).toBe('快舟一号A');
  });

  it('leaves other origins and other locales alone', () => {
    expect(nativeCompound('ru', 'Falcon 9')).toBeNull();
    expect(nativeCompound('de', 'Proton-M/Briz-M')).toBeNull();
    expect(nativeCompound('ru', 'Mars Express')).toBeNull();
  });
});

describe('nativePattern / nameRendered', () => {
  it('accepts Russian case endings and quotes', () => {
    expect(nativePattern('ru', 'Luna 9')!.test('посадка Луны-9')).toBe(true);
    expect(nameRendered('ru', 'Soyuz MS-24', 'на борту «Союза МС-24»')).toBe(true);
    expect(nameRendered('ru', 'Mir', 'станция «Мир»')).toBe(true);
  });

  it('accepts the English form in every locale and rejects other spellings', () => {
    expect(nameRendered('de', 'Mir', 'die Station Mir')).toBe(true);
    expect(nameRendered('de', 'Mir', 'die Station Мир')).toBe(false);
    expect(nameRendered('ru', 'Tiangong', 'станция Тяньгун')).toBe(false);
    expect(nameRendered('zh-CN', "Chang'e 5", '嫦娥五号着陆')).toBe(true);
    expect(nativePattern('de', 'Mir')).toBeNull();
    expect(nameRendered('ru', 'MS-15', 'вплоть до «Союз МС-15»')).toBe(true);
    expect(nameRendered('de', 'MS-15', 'bis МС-15')).toBe(false);
    expect(nameRendered('ru', 'Baikonur Site 200', 'На площадке «Байконур, площадка 200»')).toBe(
      true,
    );
  });
});
