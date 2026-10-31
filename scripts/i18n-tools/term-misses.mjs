// Term-drift misses (term-drift.mjs --misses=<misses.json>): read them, or turn them into keeps.
//   node scripts/i18n-tools/term-misses.mjs show <misses.json> [--no-en]
//   node scripts/i18n-tools/term-misses.mjs keeps <misses.json> <keeps.json> [term=reason …]
// show: "term | where | stale: <staleKeep>" with the EN / TR text (300 characters each).
// keeps: [{term, loc, rel, at, why}] for term-keep.mjs; why is the miss's staleKeep when it has
// one, else the reason given for its term; exit 1 when a miss has neither.
import { cut, isMain, readJson, writeJson } from './garble-lib.mjs';

export function showMisses(misses, { noEn = false } = {}) {
  return misses.flatMap((m) => [
    `${m.term} | ${m.where} | stale: ${m.staleKeep ?? '-'}`,
    ...(noEn ? [] : [`  EN: ${cut(m.en, 300)}`]),
    `  TR: ${cut(m.tr, 300)}`,
  ]);
}

export function missesToKeeps(misses, defaults = {}) {
  return misses.map((m) => {
    const i = m.where.indexOf(' :: ');
    const why = m.staleKeep || defaults[m.term];
    if (!why) throw new Error(`no reason for ${m.term} ${m.where}`);
    return {
      term: m.term,
      loc: m.loc,
      rel: m.where.slice(0, i).trim(),
      at: m.where.slice(i + 4).trim(),
      why,
    };
  });
}

if (isMain(import.meta.url)) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  try {
    if (cmd === 'show' && file) {
      console.log(showMisses(readJson(file), { noEn: rest.includes('--no-en') }).join('\n'));
    } else if (cmd === 'keeps' && file && rest[0]) {
      const defaults = Object.fromEntries(
        rest.slice(1).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]),
      );
      const keeps = missesToKeeps(readJson(file), defaults);
      writeJson(rest[0], keeps);
      console.log(keeps.length, 'keeps');
    } else {
      console.error('usage: term-misses.mjs show <misses.json> [--no-en]');
      console.error('       term-misses.mjs keeps <misses.json> <keeps.json> [term=reason …]');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
