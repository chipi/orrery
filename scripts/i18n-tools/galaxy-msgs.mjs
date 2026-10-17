// Build the galaxy_name_<id> message spec for all locales from per-locale templates:
// the proper name stays as written, the generic word is translated.
import fs from 'node:fs';
const S = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const data = JSON.parse(fs.readFileSync('static/data/local-group-galaxies.json', 'utf8'));
// galaxy(X), dwarf(X), sph(X) = dwarf spheroidal, large/small Magellanic Cloud, barnard.
const T = {
  de: {
    g: '{X}-Galaxie',
    d: '{X}-Zwerggalaxie',
    s: 'Sphäroidale {X}-Zwerggalaxie',
    L: 'Große Magellan-Wolke',
    S: 'Kleine Magellan-Wolke',
    b: 'Barnard-Galaxie',
  },
  fr: {
    g: 'Galaxie {X}',
    d: 'Galaxie naine {X}',
    s: 'Galaxie naine sphéroïdale {X}',
    L: 'Grand Nuage de Magellan',
    S: 'Petit Nuage de Magellan',
    b: 'Galaxie de Barnard',
  },
  es: {
    g: 'Galaxia {X}',
    d: 'Galaxia enana {X}',
    s: 'Galaxia enana esferoidal {X}',
    L: 'Gran Nube de Magellan',
    S: 'Pequeña Nube de Magellan',
    b: 'Galaxia de Barnard',
  },
  it: {
    g: 'Galassia {X}',
    d: 'Galassia nana {X}',
    s: 'Galassia nana sferoidale {X}',
    L: 'Grande Nube di Magellan',
    S: 'Piccola Nube di Magellan',
    b: 'Galassia di Barnard',
  },
  'pt-BR': {
    g: 'Galáxia {X}',
    d: 'Galáxia anã {X}',
    s: 'Galáxia anã esferoidal {X}',
    L: 'Grande Nuvem de Magellan',
    S: 'Pequena Nuvem de Magellan',
    b: 'Galáxia de Barnard',
  },
  nl: {
    g: '{X}-stelsel',
    d: '{X}-dwergstelsel',
    s: 'Sferoïdaal {X}-dwergstelsel',
    L: 'Grote Magellan-wolk',
    S: 'Kleine Magellan-wolk',
    b: 'Barnard-stelsel',
  },
  ru: {
    g: 'Галактика {X}',
    d: 'Карликовая галактика {X}',
    s: 'Карликовая сфероидальная галактика {X}',
    L: 'Большое облако Magellan',
    S: 'Малое облако Magellan',
    b: 'Галактика Barnard',
  },
  'sr-Cyrl': {
    g: 'Галаксија {X}',
    d: 'Патуљаста галаксија {X}',
    s: 'Патуљаста сфероидна галаксија {X}',
    L: 'Велики облак Magellan',
    S: 'Мали облак Magellan',
    b: 'Галаксија Barnard',
  },
  ar: {
    g: 'مجرة {X}',
    d: 'مجرة {X} القزمة',
    s: 'مجرة {X} القزمة الكروية',
    L: 'سحابة Magellan الكبرى',
    S: 'سحابة Magellan الصغرى',
    b: 'مجرة Barnard',
  },
  hi: {
    g: '{X} आकाशगंगा',
    d: '{X} बौनी आकाशगंगा',
    s: '{X} गोलाभ बौनी आकाशगंगा',
    L: 'बड़ा Magellan बादल',
    S: 'छोटा Magellan बादल',
    b: 'Barnard आकाशगंगा',
  },
  ja: {
    g: '{X} 銀河',
    d: '{X} 矮小銀河',
    s: '{X} 矮小楕円体銀河',
    L: '大 Magellan 雲',
    S: '小 Magellan 雲',
    b: 'Barnard 銀河',
  },
  ko: {
    g: '{X} 은하',
    d: '{X} 왜소은하',
    s: '{X} 왜소 타원체 은하',
    L: '대 Magellan 은하',
    S: '소 Magellan 은하',
    b: 'Barnard 은하',
  },
  'zh-CN': {
    g: '{X} 星系',
    d: '{X} 矮星系',
    s: '{X} 矮椭球星系',
    L: '大 Magellan 云',
    S: '小 Magellan 云',
    b: 'Barnard 星系',
  },
};
const spec = {};
for (const e of data.entries) {
  const key = `galaxy_name_${e.id.replace(/-/g, '_')}`;
  const t = { 'en-US': e.name };
  const n = e.name;
  for (const [loc, p] of Object.entries(T)) {
    const X = (x) => (loc === 'de' || loc === 'nl' ? x.replace(/ /g, '-') : x);
    let m;
    if ((m = n.match(/^(.+) Galaxy( \(.+\))?$/)) && !n.startsWith("Barnard's"))
      t[loc] = p.g.replace('{X}', X(m[1])) + (m[2] ?? '');
    else if (n === 'Large Magellanic Cloud') t[loc] = p.L;
    else if (n === 'Small Magellanic Cloud') t[loc] = p.S;
    else if ((m = n.match(/^(.+) Dwarf Spheroidal$/))) t[loc] = p.s.replace('{X}', X(m[1]));
    else if ((m = n.match(/^(.+) Dwarf$/))) t[loc] = p.d.replace('{X}', X(m[1]));
    else if ((m = n.match(/^Barnard's Galaxy( \(.+\))$/))) t[loc] = p.b + m[1];
    else t[loc] = n; // IC 1613, WLM (Wolf-Lundmark-Melotte): catalogue names
  }
  spec[key] = t;
}
fs.writeFileSync(`${S}/msgs-galaxies.json`, JSON.stringify(spec, null, 1));
for (const [k, t] of Object.entries(spec)) console.log(k, '|', t.de, '|', t.ru, '|', t['zh-CN']);
