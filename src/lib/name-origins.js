/**
 * Names keep their English form in every locale except the locale of their origin,
 * where the native form is used (operator decision 2026-10-17): Soyuz MS-24 is
 * "Союз МС-24" in ru and "Soyuz MS-24" everywhere else; Chang'e 5 is "嫦娥五号" in
 * zh-CN. ORIGIN_NAMES maps an English base name to its native base per origin locale;
 * nativeName() derives the full native form of a serial name ("Luna 9" → "Луна-9").
 */

/** @type {Record<string, Record<string, string>>} */
export const ORIGIN_NAMES = {
  ru: {
    Soyuz: 'Союз',
    Progress: 'Прогресс',
    Vostok: 'Восток',
    Voskhod: 'Восход',
    Luna: 'Луна',
    Lunokhod: 'Луноход',
    Mars: 'Марс',
    Venera: 'Венера',
    Vega: 'Вега',
    Phobos: 'Фобос',
    Salyut: 'Салют',
    Mir: 'Мир',
    Buran: 'Буран',
    Energia: 'Энергия',
    Proton: 'Протон',
    Molniya: 'Молния',
    Sputnik: 'Спутник',
    Zenit: 'Зенит',
    Angara: 'Ангара',
    Fregat: 'Фрегат',
    Almaz: 'Алмаз',
    Kosmos: 'Космос',
    Zarya: 'Заря',
    Zvezda: 'Звезда',
    Nauka: 'Наука',
    Poisk: 'Поиск',
    Rassvet: 'Рассвет',
    Prichal: 'Причал',
    Pirs: 'Пирс',
    Kvant: 'Квант',
    Kristall: 'Кристалл',
    Priroda: 'Природа',
    Spektr: 'Спектр',
    'Spektr-RG': 'Спектр-РГ',
    Sokol: 'Сокол',
    Orlan: 'Орлан',
    Krechet: 'Кречет',
    GLONASS: 'ГЛОНАСС',
    Roscosmos: 'Роскосмос',
    Baikonur: 'Байконур',
    Plesetsk: 'Плесецк',
    Vostochny: 'Восточный',
    "Gagarin's Start": 'Гагаринский старт',
    'Baikonur Site 1': 'Байконур, площадка 1',
    'Baikonur Site 1/5': 'Байконур, площадка 1/5',
    'Baikonur Site 200': 'Байконур, площадка 200',
    'Baikonur Site 31/6': 'Байконур, площадка 31/6',
    'Plesetsk Site 43': 'Плесецк, площадка 43',
    'Plesetsk LC-41/1': 'Плесецк, площадка 41/1',
    'Venera 7-class': 'Венера-7',
    N1: 'Н1',
    PTK: 'ПТК',
    Orel: 'Орёл',
    'R-7': 'Р-7',
    'RD-107': 'РД-107',
    'RD-108': 'РД-108',
    'RD-170': 'РД-170',
    'RD-180': 'РД-180',
    'RD-181': 'РД-181',
    'RD-191': 'РД-191',
    'RD-253': 'РД-253',
    'RD-0110': 'РД-0110',
    Semyorka: 'Семёрка',
    Briz: 'Бриз',
    Persei: 'Персей',
    Rokot: 'Рокот',
    Dnepr: 'Днепр',
    Strela: 'Стрела',
    Polyot: 'Полёт',
    "Shtil'": 'Штиль',
    Tsyklon: 'Циклон',
    'Start-1': 'Старт-1',
    Gagarin: 'Гагарин',
    'Yuri Gagarin': 'Юрий Гагарин',
    Titov: 'Титов',
    Tereshkova: 'Терешкова',
    'Valentina Tereshkova': 'Валентина Терешкова',
    Leonov: 'Леонов',
    'Alexei Leonov': 'Алексей Леонов',
    Komarov: 'Комаров',
    Feoktistov: 'Феоктистов',
    Yegorov: 'Егоров',
    Belyayev: 'Беляев',
    Korolev: 'Королёв',
    'Sergei Korolev': 'Сергей Королёв',
    Khrushchev: 'Хрущёв',
    Savinykh: 'Савиных',
    Dzhanibekov: 'Джанибеков',
    Krikalev: 'Крикалёв',
    Polyakov: 'Поляков',
    Tsiolkovsky: 'Циолковский',
    'Konstantin Tsiolkovsky': 'Константин Циолковский',
    Nikolayev: 'Николаев',
    Popovich: 'Попович',
    Bykovsky: 'Быковский',
    Volkov: 'Волков',
    Patsayev: 'Пацаев',
    Dobrovolsky: 'Добровольский',
    Artyukhin: 'Артюхин',
    Gubarev: 'Губарев',
    Grechko: 'Гречко',
    Klimuk: 'Климук',
    Sevastyanov: 'Севастьянов',
    Lazarev: 'Лазарев',
    Makarov: 'Макаров',
    Kubasov: 'Кубасов',
    Solovyev: 'Соловьёв',
    Gidzenko: 'Гидзенко',
    Kononenko: 'Кононенко',
    Kornienko: 'Корниенко',
    Glushko: 'Глушко',
    Chelomei: 'Челомей',
    Tikhonravov: 'Тихонравов',
    Keldysh: 'Келдыш',
    Khrunichev: 'Хруничев',
    Lavochkin: 'Лавочкин',
    Energomash: 'Энергомаш',
    Yarkovsky: 'Ярковский',
    Gusev: 'Гусев',
    Churyumov: 'Чурюмов',
    Gerasimenko: 'Герасименко',
    Laika: 'Лайка',
    Zond: 'Зонд',
    Kurs: 'Курс',
    Igla: 'Игла',
    Agat: 'Агат',
    Polyus: 'Полюс',
    Tselina: 'Целина',
    Resurs: 'Ресурс',
    Lotos: 'Лотос',
    Yamal: 'Ямал',
    Elektron: 'Электрон',
    Vozdukh: 'Воздух',
    Berkut: 'Беркут',
    Kazachok: 'Казачок',
    Interkosmos: 'Интеркосмос',
    Glonass: 'ГЛОНАСС',
  },
  'zh-CN': {
    Shenzhou: '神舟',
    Tiangong: '天宫',
    Tianhe: '天和',
    Wentian: '问天',
    Mengtian: '梦天',
    Tianzhou: '天舟',
    "Chang'e": '嫦娥',
    Yutu: '玉兔',
    Queqiao: '鹊桥',
    Tianwen: '天问',
    Zhurong: '祝融',
    'Long March': '长征',
    'Chang Zheng': '长征',
    Kuaizhou: '快舟',
    Zhuque: '朱雀',
    Jielong: '捷龙',
    Lijian: '力箭',
    Tianlong: '天龙',
    BeiDou: '北斗',
    Feitian: '飞天',
    Xuntian: '巡天',
    Jiuquan: '酒泉',
    CNSA: '国家航天局',
    CMSA: '中国载人航天工程办公室',
    CAST: '中国空间技术研究院',
    CASC: '中国航天科技集团',
    CALT: '中国运载火箭技术研究院',
    Apstar: '亚太卫星',
    AsiaSat: '亚洲卫星',
    Asiasat: '亚洲卫星',
    Sinosat: '鑫诺卫星',
    Wenchang: '文昌',
    Xichang: '西昌',
    Taiyuan: '太原',
    'Jiuquan Satellite Launch Center': '酒泉卫星发射中心',
    'Wenchang Space Launch Site': '文昌航天发射场',
    'Wenchang Space Launch Center': '文昌航天发射场',
    'Xichang Satellite Launch Center': '西昌卫星发射中心',
    'Taiyuan Satellite Launch Center': '太原卫星发射中心',
    'Yang Liwei': '杨利伟',
    'Wang Yaping': '王亚平',
    'Zhai Zhigang': '翟志刚',
  },
  ja: {
    'Mitsubishi Heavy Industries': '三菱重工業',
    Himawari: 'ひまわり',
    Hayabusa: 'はやぶさ',
    Hayabusa2: 'はやぶさ2',
    Akatsuki: 'あかつき',
    Hitomi: 'ひとみ',
    Kounotori: 'こうのとり',
    Kibo: 'きぼう',
    Kaguya: 'かぐや',
    Ikaros: 'イカロス',
    IKAROS: 'イカロス',
    Tanegashima: '種子島',
    Uchinoura: '内之浦',
    Itokawa: 'イトカワ',
    Ryugu: 'リュウグウ',
  },
  ko: { Danuri: '다누리', Nuri: '누리', Naro: '나로' },
  hi: {
    Chandrayaan: 'चंद्रयान',
    Mangalyaan: 'मंगलयान',
    Gaganyaan: 'गगनयान',
    Vikram: 'विक्रम',
    Pragyan: 'प्रज्ञान',
    'Shiv Shakti': 'शिव शक्ति',
    'Shiv Shakti Point': 'शिव शक्ति बिंदु',
    'Satish Dhawan Space Centre': 'सतीश धवन अंतरिक्ष केंद्र',
    ISRO: 'इसरो',
    Sriharikota: 'श्रीहरिकोटा',
    Aditya: 'आदित्य',
    Vikas: 'विकास',
  },
  ar: { Hope: 'الأمل', Rashid: 'راشد', MBRSC: 'مركز محمد بن راشد للفضاء' },
};

// Bases shared with names from elsewhere (NASA's Mars 2020, ESA's Vega rocket): only
// these full Soviet names convert.
/** @type {Record<string, Record<string, RegExp>>} */
const AMBIGUOUS = {
  ru: { Mars: /^Mars[ -]([1-7]|500)$/, Vega: /^Vega[ -][12]$/, Luna: /^Luna[ -]\d+$/ },
};
// Latin letters in Russian designations are Cyrillic look-alikes or plain transliterations.
/** @type {Record<string, string>} */
const RU_LETTER = {
  A: 'А',
  B: 'Б',
  D: 'Д',
  E: 'Е',
  F: 'Ф',
  G: 'Г',
  I: 'И',
  K: 'К',
  L: 'Л',
  M: 'М',
  N: 'Н',
  O: 'О',
  P: 'П',
  R: 'Р',
  S: 'С',
  T: 'Т',
  U: 'У',
  V: 'В',
  Z: 'З',
};

const ZH_DIGIT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
/**
 * A Russian designation code in Cyrillic ("MS-24" → "МС-24", "11K65M" → "11К65М",
 * "2.1b" → "2.1б"), or null when it is not a code (a lowercase word with no digit,
 * or a letter with no Cyrillic counterpart).
 * @param {string} code
 * @returns {string | null}
 */
function ruCode(code) {
  if (/[a-z]/.test(code) && !/\d/.test(code)) return null;
  let out = '';
  for (const ch of code) {
    const up = ch.toUpperCase();
    if (!/[A-Za-z]/.test(ch)) out += ch;
    else if (RU_LETTER[up]) out += ch === up ? RU_LETTER[up] : RU_LETTER[up].toLowerCase();
    else return null;
  }
  return out;
}

/**
 * Compound vehicle names ("Proton-M/Briz-M", "Proton-K/DM-2", "Chang Zheng 3B/YZ-1"):
 * each part converts on its own; a bare code after a converted Russian part is
 * transliterated. Null unless the first part has a native form.
 * @param {string} locale
 * @param {string} en
 * @returns {string | null}
 */
export function nativeCompound(locale, en) {
  if (!en) return null;
  const parts = en.split('/');
  const first = nativeName(locale, parts[0]);
  if (!first) return null;
  const rest = parts
    .slice(1)
    .map((p) => nativeName(locale, p) ?? (locale === 'ru' && /\d/.test(p) ? ruCode(p) : null) ?? p);
  return [first, ...rest].join('/');
}

/** @param {number} n */
const zhNumber = (n) =>
  n <= 10
    ? ZH_DIGIT[n]
    : n < 20
      ? `十${ZH_DIGIT[n - 10]}`
      : n < 100
        ? `${ZH_DIGIT[Math.floor(n / 10)]}十${n % 10 ? ZH_DIGIT[n % 10] : ''}`
        : String(n);

/** The native form of an English name in `locale`, or null when the name is not
 *  from that locale's origin. Handles serial forms: "Luna 9" → "Луна-9",
 *  "Soyuz MS-24" → "Союз МС-24", "Chang'e 5" → "嫦娥五号", "Chandrayaan-3" → "चंद्रयान-3". */
/**
 * @param {string} locale
 * @param {string} en
 * @returns {string | null}
 */
export function nativeName(locale, en) {
  const table = ORIGIN_NAMES[locale];
  if (!table || !en) return null;
  if (AMBIGUOUS[locale]?.[en]) return null; // bare "Mars", "Vega" (the star), "Luna"
  if (table[en]) return table[en];
  // Longest base that prefixes the name, followed by a space or hyphen.
  const base = Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .find((k) => en.startsWith(k) && /^[ -]/.test(en.slice(k.length)));
  if (!base) return null;
  const amb = AMBIGUOUS[locale]?.[base];
  if (amb && !amb.test(en)) return null;
  const rest = en.slice(base.length + 1);
  const nat = table[base];
  if (locale === 'ru') {
    // "MS-24" / "TMA" / "9" / "2 (OPS-1)" — suffix letters in Cyrillic, number after a hyphen.
    // Anything after the serial other than a bracketed designation is English prose
    // ("Mars 3 Orbiter"): no native form for the whole.
    const m = rest.match(/^([A-Za-z0-9][A-Za-z0-9.-]*)((?: \([^)]*\))?)$/);
    if (!m) return null;
    const [, code, tail] = m;
    const sep = en[base.length]; // "Proton-M" keeps the hyphen, "Soyuz MS" the space
    // A plain serial takes the Russian hyphen: "Luna 9" → "Луна-9".
    if (/^\d+$/.test(code)) return `${nat}-${code}${tail}`;
    const ru = ruCode(code);
    return ru === null ? null : `${nat}${sep}${ru}${tail}`;
  }
  if (locale === 'zh-CN') {
    // Pads and other codes stay Latin after the native name: "Xichang LC-3" → "西昌 LC-3".
    if (/^[A-Z][A-Z0-9/-]*\d[A-Z0-9/-]*$/.test(rest)) return `${nat} ${rest}`;
    const m = rest.match(/^(\d+)([A-Z]?)((?: \([^)]*\))?)$/);
    if (!m) return null;
    return `${nat}${zhNumber(Number(m[1]))}号${m[2]}${m[3]}`;
  }
  // Other locales keep the serial as written: "Chandrayaan-3" → "चंद्रयान-3".
  return `${nat}${en.slice(base.length)}`;
}

/** @param {string} s */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A pattern matching the native form inside origin-locale text, tolerant of
 *  Russian case endings ("Луны-9", "Союза МС-24", «Союз»). */
/**
 * @param {string} locale
 * @param {string} en
 * @returns {RegExp | null}
 */
export function nativePattern(locale, en) {
  const nat = nativeName(locale, en);
  if (!nat) return null;
  if (locale !== 'ru') return new RegExp(esc(nat));
  const words = nat.split(' ').map((w, i) => {
    if (i > 0) return esc(w); // suffix letters/numbers never decline
    const [head, ...tail] = w.split('-');
    const stem = head.length > 3 ? head.replace(/[аеёийоуыьэюя]$/, '') : head;
    return `${esc(stem)}[а-яё]{0,3}${tail.length ? `-${tail.map(esc).join('-')}` : ''}`;
  });
  return new RegExp(words.join(' '));
}

/** True when `out` names `en` the way `locale` should: English form, or the native
 *  form in the name's origin locale. */
/**
 * @param {string} locale
 * @param {string} en
 * @param {string} out
 * @param {(x: string) => string} [norm]
 * @returns {boolean}
 */
export function nameRendered(locale, en, out, norm = (x) => x) {
  if (norm(out).includes(norm(en))) return true;
  // A bare Russian code inside a converted name ("MS-15" of «Союз МС-15»).
  if (
    locale === 'ru' &&
    /^[A-Z][A-Z0-9-]*\d[A-Z0-9-]*$/.test(en) &&
    [...en].every((ch) => !/[A-Z]/.test(ch) || RU_LETTER[ch])
  )
    if (out.includes(en.replace(/[A-Z]/g, (ch) => RU_LETTER[ch]))) return true;
  const re = nativePattern(locale, en);
  return !!re && re.test(out);
}
