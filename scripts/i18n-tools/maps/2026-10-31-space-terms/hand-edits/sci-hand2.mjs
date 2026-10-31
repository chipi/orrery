// Hand fixes for the last science term misses: the fr Oberth intro (garbled, half missing)
// and "at real thrust" dropped from the nuclear-thermal intro in ru/fr/pt-BR.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const R = 'i18n-src/';
// Output dir: argv[2], else a fresh private temp dir (record script; it ran once on 2026-10-31).
const OUT = (process.argv[2] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-hand-'))).replace(
  /\/?$/,
  '/',
);
const NT = 'science/propulsion/nuclear-thermal.json';
const OB = 'science/propulsion/oberth-effect.json';
const NEW = {
  fr: {
    [OB]: "Allume ton moteur au fond d'un puits gravitationnel et ton carburant travaille davantage : le même moteur produit physiquement plus d'énergie orbitale quand il va vite.",
    [NT]: "Une fusée nucléo-thermique remplace la chambre de combustion par un réacteur à fission : l'hydrogène, chauffé au-delà de toute flamme chimique, se détend dans une tuyère — deux fois l'Isp des moteurs chimiques, avec une forte poussée.",
  },
  ru: {
    [NT]: 'Ядерно-тепловая ракета заменяет камеру сгорания реактором деления: водород нагревается в ядре сильнее любого химического пламени и истекает через сопло — вдвое выше удельный импульс, чем у химических двигателей, при значительной тяге.',
  },
  'pt-BR': {
    [NT]: 'Um foguete nuclear térmico troca a câmara de combustão por um reator de fissão: o hidrogênio aquece no núcleo além de qualquer chama química e se expande por um bocal — o dobro do impulso específico dos motores químicos, com alto empuxo.',
  },
};
for (const [loc, files] of Object.entries(NEW)) {
  const edits = [];
  for (const [rel, nu] of Object.entries(files)) {
    const doc = JSON.parse(fs.readFileSync(`${R}${loc}/${rel}`, 'utf8'));
    console.log(loc, rel.split('/').pop(), [...nu].length);
    edits.push({ rel, at: 'intro_sentence', old: doc.intro_sentence, new: nu });
  }
  fs.writeFileSync(`${OUT}hand2-${loc}.json`, JSON.stringify(edits, null, 1));
}
