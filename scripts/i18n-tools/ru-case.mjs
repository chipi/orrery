// Russian declension for glossary forms, and a case guess from the preceding word.
// Covers the noun types in native-terms.json: hard masculine (Марс, кратер, космодром),
// -ий (Меркурий), -а/-я feminine (Венера, Земля, равнина), -е neuter (Море, Солнце),
// indeclinables (Ио, Бенну, Куру, МКС, Chinese place names). In a multi-word form the
// head noun declines (first generic word, or the body itself); the rest stays
// ("Море Спокойствия" → "Моря Спокойствия", "кратер Гейл" → "кратера Гейл").
// The guess is only a proposal: every edit is read before it is applied.

export const CASES = ['nom', 'gen', 'dat', 'acc', 'ins', 'pre'];
const GENERIC =
  /^(море|океан|кратер|равнина|плато|долина|мыс|космодром|центр|база|пик|гора|формация|нагорье|комета|станция|залив)$/i;
const INDECL =
  /(о|у|и|э|ю|е́|МКС|ГЛОНАСС)$|^(Цзюцюань|Тайюань|Куру|Ио|Каллисто|Бенну|Рюгу|Шрихарикота-|Плато)$/;
const SOFT_SIBILANT = /[кгхжшщч]$/;

function declineWord(w, c) {
  if (c === 'nom') return w;
  const lower = w.toLowerCase();
  if (/ость$/.test(lower))
    return w.slice(0, -1) + { gen: 'и', dat: 'и', acc: 'ь', ins: 'ью', pre: 'и' }[c];
  if (/^облако$/i.test(w))
    return w.slice(0, -1) + { gen: 'а', dat: 'у', acc: 'о', ins: 'ом', pre: 'е' }[c];
  if (INDECL.test(w) || /^[A-Z0-9]/.test(w)) return w;
  if (lower === 'море')
    return w.slice(0, -1) + { gen: 'я', dat: 'ю', acc: 'е', ins: 'ем', pre: 'е' }[c];
  if (lower === 'солнце')
    return w.slice(0, -1) + { gen: 'а', dat: 'у', acc: 'е', ins: 'ем', pre: 'е' }[c];
  if (lower === 'нагорье')
    return w.slice(0, -1) + { gen: 'я', dat: 'ю', acc: 'е', ins: 'ем', pre: 'е' }[c];
  if (/ий$/.test(w))
    return w.slice(0, -2) + { gen: 'ия', dat: 'ию', acc: 'ий', ins: 'ием', pre: 'ии' }[c];
  if (/ия$/.test(w))
    return w.slice(0, -2) + { gen: 'ии', dat: 'ии', acc: 'ию', ins: 'ией', pre: 'ии' }[c];
  if (/я$/.test(w)) {
    const stem = w.slice(0, -1);
    return (
      stem + { gen: 'и', dat: 'е', acc: 'ю', ins: lower === 'земля' ? 'ёй' : 'ей', pre: 'е' }[c]
    );
  }
  if (/а$/.test(w)) {
    const stem = w.slice(0, -1);
    return (
      stem +
      { gen: SOFT_SIBILANT.test(stem) ? 'и' : 'ы', dat: 'е', acc: 'у', ins: 'ой', pre: 'е' }[c]
    );
  }
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(w))
    return w + { gen: 'а', dat: 'у', acc: '', ins: /[жшщчц]$/.test(w) ? 'ем' : 'ом', pre: 'е' }[c];
  return w;
}

const ADJ = /(ая|яя|ое|ее|ый|ий|ой)$/;
// short possessive adjectives before a noun: Магелланово (Облако), Галлеева
const SHORT = /^[А-ЯЁ].*(ово|ова|ево|ева|ино|ина)$/;
function agreeAdj(w, c) {
  if (/(ово|ево|ино)$/.test(w))
    return w.slice(0, -1) + { gen: 'а', dat: 'у', acc: 'о', ins: 'ым', pre: 'ом' }[c];
  if (/(ова|ева|ина)$/.test(w))
    return w.slice(0, -1) + { gen: 'ой', dat: 'ой', acc: 'у', ins: 'ой', pre: 'ой' }[c];
  if (/ая$/.test(w))
    return w.slice(0, -2) + { gen: 'ой', dat: 'ой', acc: 'ую', ins: 'ой', pre: 'ой' }[c];
  if (/яя$/.test(w))
    return w.slice(0, -2) + { gen: 'ей', dat: 'ей', acc: 'юю', ins: 'ей', pre: 'ей' }[c];
  if (/ое$/.test(w))
    return (
      w.slice(0, -2) +
      { gen: 'ого', dat: 'ому', acc: 'ое', ins: /[кгхжшщч]ое$/.test(w) ? 'им' : 'ым', pre: 'ом' }[c]
    );
  if (/(ий|ый|ой)$/.test(w)) {
    const soft = /[кгхжшщч](ий|ой)$/.test(w) || /ний$/.test(w);
    return (
      w.slice(0, -2) +
      { gen: 'ого', dat: 'ому', acc: w.slice(-2), ins: soft ? 'им' : 'ым', pre: 'ом' }[c]
    );
  }
  return w;
}
/** Decline a glossary form: its head word (first generic noun, else the first noun). */
export function declineRu(form, c) {
  if (c === 'nom') return form;
  if (form === 'Великая Северная равнина')
    return {
      gen: 'Великой Северной равнины',
      dat: 'Великой Северной равнине',
      acc: 'Великую Северную равнину',
      ins: 'Великой Северной равниной',
      pre: 'Великой Северной равнине',
    }[c];
  const words = form.split(' ');
  const head = words.findIndex((w) => GENERIC.test(w));
  // without a generic word the head is the first word that is not an adjective
  // ("Солнечная система", "Крабовидная туманность", "Местная группа галактик")
  const i =
    head >= 0
      ? head
      : Math.max(
          0,
          words.findIndex((w, k) => !ADJ.test(w) && !(SHORT.test(w) && k < words.length - 1)),
        );
  // a lone body/place declines; with a generic head only the head does
  words[i] = declineWord(words[i], c);
  // adjectives before the head agree with it ("Космического центра", "Солнечной системы")
  for (let k = 0; k < i; k++) words[k] = agreeAdj(words[k], c);
  return words.join(' ');
}

const PREP = [
  [/(^|[\s(«"—–-])(к|ко|по)$/i, 'dat'],
  [/(^|[\s(«"—–-])(о|об|при)$/i, 'pre'],
  [/(^|[\s(«"—–-])(на|в|во)$/i, 'pre'],
  [
    /(вместе|образует|наряду|сравнению|связи|пар[еуа]|столкн[а-я]*|захват[а-я]*|резонанс[а-я]*|встреч[а-я]*|сближени[а-я]*|сближ[а-я]*|взаимодейств[а-я]*|орбит[а-я]* вместе)\s+(с|со)$/i,
    'ins',
  ],
  [/(^|[\s(«"—–-])(с|со)$/i, 'gen'],
  [/(^|[\s(«"—–-])(над|под|между|за|перед)$/i, 'ins'],
  [/[а-яё]+ее$/i, 'gen'],
  [
    /(^|[\s(«"—–-])(до|от|из|у|около|вокруг|для|без|после|вблизи|возле|мимо|среди|кроме|вместо|вдоль|против|из-за|относительно|напротив)$/i,
    'gen',
  ],
  [
    /(орбит[аеуы]|поверхност[ьи]|атмосфер[аеуы]|масс[аеуы]|радиус[а]?|диаметр[а]?|спутник[аи]?|спутников|полюс[а]?|систем[аеуы]|гравитаци[яи]|притяжени[яе]|сутки|года?|период[а]?|кольца|колец|магнитосфер[аеуы]|пол[ея]|исследовани[яе]|изучени[яе]|образц(ы|ов)|снимк(и|ов)|облёт[а]?|пролёт[а]?|облет[а]?|пролет[а]?|расстояни[яе]|дн[оа]|зон[аеуы]|центр[а]?|запуск[а]?|старт[а]?|территори[яи]|окрестност(ь|и|ях)|орбиту|экипаж[а]?|модул(ь|я|и)|сегмент[а]?|борт[уе]?|станци[яи]|миссии|программ[аы]|реголит[а]?|образ[ец]ц?[аы]?|материал[а]?|пригодност[ьи]|преимуществ[оа]?|площадк[аи]|океан[а]?|луны|кольц[аео]|моделировани[яе]|геологи[яи]|климат[а]?|лёд|льд[а]|грунт[а]?|рельеф[а]?|недр|гравитаци[и]|открыти[яе]|приливы|приливов|регион[еа]?|склон[ыа]?|центре|башн[яи]|радиаци[яи]|достиг[а-я]*|пыл[ьи]|наклонени[яе]|долготы|широты|ядр[ао]|кор[аы]|честь|отец|отца|спутник|дымк[уаи]|льдом|лёд|льда|цикл[а]?|плюм[ыа]?|гейзер[ыа]?|наклон[а]?|устойчивост[ьи]|размер[ыа]?|нагрев[а]?|дости[гч][а-я]*|поля|полем|недрах|глубин[аеуы])$/i,
    'gen',
  ],
];
/** The form without its generic head when the text already ends with that head word
 * ("с мыса Cape Canaveral" → "с мыса Канаверал", "к комете Halley" → "к комете Галлея"). */
export function dropHeadIfRepeated(form, before) {
  const words = form.split(' ');
  const head = words.findIndex((w) => GENERIC.test(w));
  if (head !== 0 || words.length < 2) return null;
  const stem = words[0].toLowerCase().slice(0, Math.max(3, words[0].length - 2));
  if (/^база$/i.test(words[0]) && /(авиабаз|баз[аеыуой]+ ВВС)[а-я]*\s*$/i.test(before))
    return words.slice(words[1] === 'ВВС' ? 2 : 1).join(' ');
  const prev = (before.trimEnd().match(/([А-Яа-яЁё]+)$/) || [])[1]?.toLowerCase() ?? '';
  return prev.startsWith(stem) ? words.slice(1).join(' ') : null;
}

/** Proposed case from the text right before the name. */
export function guessCaseRu(before) {
  // a catalogue number between preposition and name ("к 25143 Итокаве") does not change the case
  const b = before.trimEnd().replace(/\s+\(?\d+\)?$/, '');
  if (
    /(^|\s)(на|в|во)$/i.test(b) &&
    /(полёт|полет|ракет|запуск|запуст|отправ|направ|упа[лд]|сел[аи]?|садит|опусти|сброс|доставк|достав|перелёт|перелет|путь|пути|курс|переименован|прибыв|прибыл|летит|летел|вывод|вывел)[а-я]*\s+(\S+\s+)?(на|в|во)$/i.test(
      b,
    )
  )
    return 'acc';
  const adj = b.match(/([а-яё]+)(ого|его|ому|ему|ым|им|ой|ую)$/i);
  if (adj && /(^|\s)(мимо|к|ко|с|со|у|от|до|для|на|в|о|при)\s+[а-яё]+$/i.test(b)) {
    const e = adj[2];
    if (/^(ого|его)$/.test(e)) return 'gen';
    if (/^(ому|ему)$/.test(e)) return 'dat';
    if (/^(ым|им)$/.test(e)) return 'ins';
  }
  for (const [re, c] of PREP) if (re.test(b)) return c;
  return 'nom';
}

// People. Every word of the name declines (Юрий Гагарин → Юрия Гагарина); the accusative
// of a man is the genitive. `slavic` (the Wikidata label carried a patronymic) gives
// -ов/-ин surnames their own instrumental (Гагариным); foreign ones take -ом (Олдрином).
// A woman's foreign surname on a consonant or vowel does not decline (Пегги Уитсон).
function personWordRu(w, c, female, slavic, isLast) {
  if (c === 'nom' || /^[A-Z0-9]|\.$|^(фон|де|ван|дер|да|ди|ле|ла|дю)$/.test(w)) return w;
  if (female) {
    if (/(ова|ева|ёва|ина|ына)$/.test(w) && isLast)
      return w.slice(0, -1) + { gen: 'ой', dat: 'ой', acc: 'у', ins: 'ой', pre: 'ой' }[c];
    if (/ая$/.test(w))
      return w.slice(0, -2) + { gen: 'ой', dat: 'ой', acc: 'ую', ins: 'ой', pre: 'ой' }[c];
    if (/ия$/.test(w))
      return w.slice(0, -2) + { gen: 'ии', dat: 'ии', acc: 'ию', ins: 'ией', pre: 'ии' }[c];
    if (/[ая]$/.test(w)) return declineWord(w, c);
    return w;
  }
  if (/(ский|цкий|ской)$/.test(w))
    return w.slice(0, -2) + { gen: 'ого', dat: 'ому', acc: 'ого', ins: 'им', pre: 'ом' }[c];
  if (/ий$/.test(w))
    return w.slice(0, -2) + { gen: 'ия', dat: 'ию', acc: 'ия', ins: 'ием', pre: 'ии' }[c];
  if (/[ейоауя]й$/.test(w))
    return w.slice(0, -1) + { gen: 'я', dat: 'ю', acc: 'я', ins: 'ем', pre: 'е' }[c];
  if (/ь$/.test(w))
    return w.slice(0, -1) + { gen: 'я', dat: 'ю', acc: 'я', ins: 'ем', pre: 'е' }[c];
  if (/[ая]$/.test(w)) return declineWord(w, c);
  if (/[бвгджзклмнпрстфхцчшщ]$/.test(w)) {
    const ins =
      slavic && isLast && /(ов|ев|ёв|ин|ын)$/.test(w) ? 'ым' : /[жшщчц]$/.test(w) ? 'ем' : 'ом';
    return w + ({ gen: 'а', dat: 'у', acc: 'а', ins, pre: 'е' }[c] ?? '');
  }
  return w;
}
/** Decline a person's name (all words) in Russian. */
export function declinePersonRu(name, c, female = false, slavic = false) {
  if (c === 'nom') return name;
  const ws = name.split(' ');
  return ws
    .map((w, i) =>
      w
        .split('-')
        .map((p) => personWordRu(p, c, female, slavic, i === ws.length - 1))
        .join('-'),
    )
    .join(' ');
}
