// The remaining grader fixes the checker refused (2026-10-18), adjusted by hand so each keeps
// the site's forms: the language's own word for an abbreviation the English spells out (ESA,
// TLI, SF), the zh station name, ISRO as the hi text writes it everywhere else, English quoted
// terms dropped from Arabic. old = current string. Writes graded-refused-<loc>.json.
import fs from 'node:fs';

const DIR = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const TAKE = {
  ja: {
    'essays/seven-minutes.json:body.19.md': [[/ESAの/, '欧州宇宙機関の']],
    'missions/moon/artemis2.json:events.1.note': [[/（TLI）/, '']],
    'universe/named-stars/proxima-centauri.json:cultural': [[/SF/, 'サイエンスフィクション']],
  },
  'zh-CN': { 'fleet/launcher/vostok-k.json:dispatch': [[/送往ISS/, '送往国际空间站']] },
  ko: {
    'fleet/lander/mars-polar-lander.json:description': [
      [/'faster-better-cheaper'/, "'더 빠르게, 더 좋게, 더 싸게'"],
    ],
    'missions/moon/apollo12.json:dispatch': [[/'SCE to AUX'/, '"SCE to AUX"']],
    'missions/moon/apollo12.json:events.0.note': [[/'SCE to AUX'/, '"SCE to AUX"']],
  },
  hi: {
    'messages:credits_intro_body_1': [[/इसरो/g, 'ISRO']],
    'missions/moon/chandrayaan1.json:description': [[/इसरो/g, 'ISRO']],
    'original-work.json:models3d./images/colophon/model-cruise-chandrayaan3_webp.what': [
      [/इसरो/g, 'ISRO'],
    ],
    'rockets/lvm3.json:description': [[/इसरो/g, 'ISRO']],
  },
  ar: {
    'missions/venus/magellan.json:description': [[/ \((tesserae|coronae)\)/g, '']],
    'missions/earth/sputnik1.json:events.1.note': [],
  },
};
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const get = (o, at) => at.split('.').reduce((v, k) => v?.[k], o);
for (const [loc, fixes] of Object.entries(TAKE)) {
  const out = read(`${DIR}/graded-2026-10-18/edits-${loc}.json`)
    .filter((e) => `${e.rel}:${e.at}` in fixes)
    .map((e) => ({
      rel: e.rel,
      at: e.at,
      old:
        e.rel === 'messages'
          ? read(`messages/${loc}.json`)[e.at]
          : get(read(`i18n-src/${loc}/${e.rel}`), e.at),
      new: fixes[`${e.rel}:${e.at}`].reduce((s, [re, to]) => s.replace(re, to), e.new),
    }));
  if (out.length !== Object.keys(fixes).length)
    throw new Error(`${loc}: found ${out.length} of ${Object.keys(fixes).length}`);
  fs.writeFileSync(`${DIR}/graded-refused-${loc}.json`, JSON.stringify(out, null, 1));
}
