import fs from 'node:fs';
const rel = 'science/propulsion/nuclear-thermal.json';
const doc = JSON.parse(fs.readFileSync('/work/orrery/main/i18n-src/ru/' + rel, 'utf8'));
const nu =
  'Ядерно-тепловая ракета заменяет камеру сгорания реактором деления: водород нагревается в активной зоне сильнее любого химического пламени и истекает через сопло — удельный импульс вдвое выше химического, при значительной тяге.';
console.log([...nu].length);
fs.writeFileSync(
  process.argv[2],
  JSON.stringify([{ rel, at: 'intro_sentence', old: doc.intro_sentence, new: nu }]),
);
