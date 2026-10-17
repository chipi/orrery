// Serbian (Cyrillic) declension for glossary forms, a case guess from the preceding word,
// and the case named by a hyphenated ending the text already carries ("до Mars-а").
// Cases used: nom, gen, dat, acc, ins, loc (vocative never occurs in this text).
// Head word of a phrase declines; adjectives before it agree; Кејп Канаверал declines
// its last word. Every edit is read before it is applied.

const GENERIC =
  /^(море|океан|кратер|равница|плато|долина|планина|формација|висораван|комета|космодром|центар|база|станица|залив)$/i;
const INDECL = /^(Ио|Калисто|Бену|Рјугу|Куру|МСС|ГЛОНАСС|Цзјоуцјуен|Ђиуцјуен|Тајјуен)$/;

function noun(w, c) {
  if (c === 'nom' || INDECL.test(w) || /^[A-Z0-9]/.test(w)) return w;
  const l = w.toLowerCase();
  if (/^(море|сунце)$/.test(l))
    return w.slice(0, -1) + { gen: 'а', dat: 'у', acc: 'е', ins: 'ем', loc: 'у' }[c];
  // fleeting a: центар → центра, центру, центром
  if (l === 'центар')
    return w.slice(0, -2) + { gen: 'ра', dat: 'ру', acc: 'ар', ins: 'ром', loc: 'ру' }[c];
  if (l === 'плато') return w + { gen: 'а', dat: 'у', acc: '', ins: 'ом', loc: 'у' }[c];
  // feminine i-stem: висораван → висоравни
  if (l === 'висораван') return w + { gen: 'и', dat: 'и', acc: '', ins: 'и', loc: 'и' }[c];
  if (/ија$/.test(w))
    return w.slice(0, -1) + { gen: 'е', dat: 'и', acc: 'у', ins: 'ом', loc: 'и' }[c];
  if (/а$/.test(w))
    return w.slice(0, -1) + { gen: 'е', dat: 'и', acc: 'у', ins: 'ом', loc: 'и' }[c];
  if (/[о]$/.test(w)) return w;
  if (/[бвгдђжзклљмнњпрстћфхцчџш]$/i.test(w))
    return (
      w + { gen: 'а', dat: 'у', acc: '', ins: /[јљњћђчџшж]$/.test(w) ? 'ем' : 'ом', loc: 'у' }[c]
    );
  return w;
}
function adj(w, c, fem) {
  if (fem && /а$/.test(w))
    return w.slice(0, -1) + { gen: 'е', dat: 'ој', acc: 'у', ins: 'ом', loc: 'ој' }[c];
  if (!fem && /и$/.test(w))
    return w.slice(0, -1) + { gen: 'ог', dat: 'ом', acc: 'и', ins: 'им', loc: 'ом' }[c];
  return w;
}

/** Decline a glossary form in Serbian. */
export function declineSr(form, c) {
  if (c === 'nom') return form;
  const words = form.split(' ');
  if (form === 'Кејп Канаверал') return `Кејп ${noun('Канаверал', c)}`;
  if (form === 'Халејева комета') return `${adj('Халејева', c, true)} ${noun('комета', c)}`;
  let head = words.findIndex((w) => GENERIC.test(w));
  if (head < 0) head = /^(Велика)$/.test(words[0]) ? words.length - 1 : 0;
  const fem = /а$|^висораван$/i.test(words[head]);
  for (let i = 0; i < head; i++) words[i] = adj(words[i], c, fem);
  words[head] = noun(words[head], c);
  return words.join(' ');
}

/** Case named by a hyphenated ending glued to a Latin name ("Mars-а", "ISS-у"). */
export function caseFromSuffix(suffix, fem) {
  if (!suffix) return null;
  const s = suffix.replace(/^-/, '');
  if (fem) return { е: 'gen', и: 'loc', у: 'acc', ом: 'ins' }[s] ?? null;
  return { а: 'gen', у: 'loc', ом: 'ins', ем: 'ins', е: 'gen', и: 'loc' }[s] ?? null;
}

const PREP = [
  [/(^|[\s(„"—–-])(ка|к|према|упркос|насупрот)$/i, 'dat'],
  [
    /(судар[а-я]*|сударио|сударила|резонанс[а-я]*|пар[уа]|заједно|упоређ[а-я]*|поређењу|везан[а-я]*|упарен[а-я]*|спојен[а-я]*)\s+(са|с)$/i,
    'ins',
  ],
  [
    /(^|[\s(„"—–-])(са|с|од|до|из|без|код|близу|попут|поред|око|после|преко|изнад|испод|иза|осим|уместо|дуж|ради|због|између|ван|унутар|изван|почев)$/i,
    'gen',
  ],
  [/(^|[\s(„"—–-])(о|по|при)$/i, 'loc'],
  [/(^|[\s(„"—–-])(под|над|пред|међу)$/i, 'ins'],
  [/(^|[\s(„"—–-])(кроз|низ|уз|за)$/i, 'acc'],
  [/(^|[\s(„"—–-])(на|у)$/i, 'loc'],
  [
    /(орбит[аеуи]|површин[аеуи]|атмосфер[аеуи]|мас[аеуи]|полупречник[а]?|пречник[а]?|сателит[аи]?|пол[а]?|систем[аеуи]|гравитациј[аеуи]|дан[а]?|годин[аеу]|период[а]?|прстенов[аи]|магнетосфер[аеуи]|пољ[аеу]|истраживањ[аеу]|узор(ак|ци|ка|аке)|снимак|снимци|прелет[а]?|удаљеност[и]?|центр[аеу]|регион[а]?|облас[тиу]|материјал[а]?|наклон[а]?|радијациј[аеи]|лансирањ[аеу]|старт[а]?|територ[ијаеу]+|модул[а]?|сегмент[а]?|станиц[аеуи]|мисиј[аеуи]|програм[а]?|преко|масивниј[аеиоу]+|мањ[аеиоу]+|већ[аеиоу]+|ближ[аеиоу]+|даљ[аеиоу]+|прелети|насељивост[и]?|%|ширин[аеу]|дубин[аеу]|откриће|открића|осматрањ[аеу]|температур[аеу]|језгр[оа]|кор[аеу]|перјаниц[аеи]|гејзер[аи]?|океан[а]?|кратер[а]?|месец[а]?|месеца)$/i,
    'gen',
  ],
];
/** Proposed case from the text right before the name. */
export function guessCaseSr(before) {
  // a markdown link's "[" stands between the preposition and the name ("до [Плутона](…)")
  const b = before
    .replace(/\[$/, '')
    .trimEnd()
    .replace(/\s+\(?\d+\)?$/, '');
  if (
    /(^|\s)(на|у)$/i.test(b) &&
    /(лет|ракет|лансир|послат|упућ|пао|пала|спуст|слет[аеи]|слећ|стиг|достав|пут|путу|курс|прешао|кренуо|полетео|преименован)[а-я]*\s+(\S+\s+)?(на|у)$/i.test(
      b,
    )
  )
    return 'acc';
  for (const [re, c] of PREP) if (re.test(b)) return c;
  return 'nom';
}

// People. Every word of the name declines (Јуриј Гагарин → Јурија Гагарина); a man's
// accusative is his genitive. A woman's name on a consonant does not decline (Пеги Витсон).
function personWordSr(w, c, female, isLast) {
  if (c === 'nom' || /^[A-Z0-9]|\.$|^(фон|де|ван|дер|да|ди|ле|ла)$/.test(w)) return w;
  if (female) {
    // Russian women's surnames decline like adjectives: Терешкове, Терешковој
    if (isLast && /(ова|ева|ина|ска|цка)$/.test(w))
      return w.slice(0, -1) + { gen: 'е', dat: 'ој', acc: 'у', ins: 'ом', loc: 'ој' }[c];
    if (/ија$/.test(w) || /а$/.test(w))
      return w.slice(0, -1) + { gen: 'е', dat: 'и', acc: 'у', ins: 'ом', loc: 'и' }[c];
    return w;
  }
  if (/(ски|цки|шки|чки)$/.test(w))
    return w.slice(0, -1) + { gen: 'ог', dat: 'ом', acc: 'ог', ins: 'им', loc: 'ом' }[c];
  if (/а$/.test(w))
    return w.slice(0, -1) + { gen: 'е', dat: 'и', acc: 'у', ins: 'ом', loc: 'и' }[c];
  if (/о$/.test(w))
    return w.slice(0, -1) + { gen: 'а', dat: 'у', acc: 'а', ins: 'ом', loc: 'у' }[c];
  if (/[еиу]$/.test(w)) return w + { gen: 'ја', dat: 'ју', acc: 'ја', ins: 'јем', loc: 'ју' }[c];
  if (/[бвгдђжзјклљмнњпрстћфхцчџш]$/.test(w))
    return (
      w + { gen: 'а', dat: 'у', acc: 'а', ins: /[јљњћђчџшж]$/.test(w) ? 'ем' : 'ом', loc: 'у' }[c]
    );
  return w;
}
/** Decline a person's name (all words) in Serbian. */
export function declinePersonSr(name, c, female = false) {
  if (c === 'nom') return name;
  const ws = name.split(' ');
  return ws
    .map((w, i) =>
      w
        .split('-')
        .map((p) => personWordSr(p, c, female, i === ws.length - 1))
        .join('-'),
    )
    .join(' ');
}
