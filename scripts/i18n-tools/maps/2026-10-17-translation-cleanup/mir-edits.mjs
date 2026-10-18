// Mars Polar Lander description: the English now names the station ("Shuttle and Mir epoch"),
// so each locale gets the site's form — «Мир» in Russian, Mir elsewhere — plus the English
// verb "Flew" (de, fr) and "Fuggite" (it, "flee") translated. Writes mir-edits-<loc>.json.
import fs from 'node:fs';

const DIR = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const REL = 'fleet/lander/mars-polar-lander.json';
const FIX = {
  ru: [['эпохи шаттла и мира.', 'эпохи шаттлов и станции «Мир».']],
  ja: [['宇宙ステーション・ミール時代', '宇宙ステーションMir時代']],
  'zh-CN': [['航天飞机与米尔时代', '航天飞机与Mir时代']],
  hi: [['शटल और मीर युग', 'शटल और Mir युग']],
  ar: [['عصر المكوك وعصر mir', 'عصر المكوك ومحطة Mir']],
  'sr-Cyrl': [['станице mir', 'станице Mir']],
  de: [
    ['Flew im Jahr 1999, aber gescheitert', 'Flog 1999, scheiterte aber'],
    ['des Shuttle und mir epoch', 'der Shuttle- und Mir-Ära'],
  ],
  fr: [
    ['Flew en 1999', 'A volé en 1999'],
    ['de la navette et mir époque', "de l'époque de la navette et de Mir"],
  ],
  it: [
    ['Fuggite nel 1999 ma fallite', 'Ha volato nel 1999 ma è fallito'],
    ["dell'epoca mir", "dell'epoca Mir"],
  ],
  nl: [['van de shuttle en mir tijdperk', 'van het Shuttle- en Mir-tijdperk']],
  'pt-BR': [['da época do mir', 'da época da Mir']],
};
for (const [loc, pairs] of Object.entries(FIX)) {
  const old = JSON.parse(fs.readFileSync(`i18n-src/${loc}/${REL}`, 'utf8')).description;
  const neu = pairs.reduce((s, [a, b]) => {
    if (!s.includes(a)) throw new Error(`${loc}: "${a}" not found`);
    return s.replace(a, b);
  }, old);
  fs.writeFileSync(
    `${DIR}/mir-edits-${loc}.json`,
    JSON.stringify([{ rel: REL, at: 'description', old, new: neu }], null, 1),
  );
}
