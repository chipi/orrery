// The grader fixes the checker refused for Orion / Kepler / Galileo (2026-10-18), rebuilt against
// the text after the glossary pass: old = current string, new = the grader's version, with the
// glossary form kept where the grader dropped it. Writes graded-homonym-<loc>.json.
import fs from 'node:fs';

const DIR = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const TAKE = {
  ru: [
    'messages:lab_goal_g10_frozen',
    'missions/moon/apollo15.json:description',
    'universe/named-stars/mintaka.json:cultural',
  ],
  ja: ['universe/named-stars/mintaka.json:cultural'],
  'zh-CN': ['universe/named-stars/wezen.json:cultural'],
  ko: ['missions/moon/apollo15.json:description', 'universe/named-stars/mintaka.json:cultural'],
  hi: ['messages:lab_goal_g10_frozen'],
  ar: ['universe/named-stars/mintaka.json:cultural'],
  // it magellanic-clouds "SN 1987A" is not taken: it.wikipedia and the glossary write "SN 1987a"
  'pt-BR': ['universe/named-stars/mintaka.json:cultural'],
};
const KEEP = { 'zh-CN': [[/跟随猎户穿越/, '跟随猎户座穿越']] };
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const get = (o, at) => at.split('.').reduce((v, k) => v?.[k], o);
for (const [loc, keys] of Object.entries(TAKE)) {
  const out = read(`${DIR}/graded-2026-10-18/edits-${loc}.json`)
    .filter((e) => keys.includes(`${e.rel}:${e.at}`))
    .map((e) => ({
      rel: e.rel,
      at: e.at,
      old:
        e.rel === 'messages'
          ? read(`messages/${loc}.json`)[e.at]
          : get(read(`i18n-src/${loc}/${e.rel}`), e.at),
      new: (KEEP[loc] ?? []).reduce((s, [re, to]) => s.replace(re, to), e.new),
    }));
  if (out.length !== keys.length) throw new Error(`${loc}: found ${out.length} of ${keys.length}`);
  fs.writeFileSync(`${DIR}/graded-homonym-${loc}.json`, JSON.stringify(out, null, 1));
}
