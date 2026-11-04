// Term-drift misses (term-drift.mjs --misses=<misses.json>): read them, or turn them into keeps.
//   node scripts/i18n-tools/term-misses.mjs show <misses.json> [--no-en]
//   node scripts/i18n-tools/term-misses.mjs keeps <misses.json> <keeps.json> [term=reason …]
// show: "term | where | stale: <staleKeep>" with the EN / TR text (300 characters each).
// keeps: [{term, loc, rel, at, why}] for term-keep.mjs; why is the miss's staleKeep when it has
// one, else the reason given for its term; exit 1 when a miss has neither.
import fs from 'node:fs';
import { cut, isMain, readJson, writeJson } from './garble-lib.mjs';
import { enRegex } from './term-match.mjs';

export function showMisses(misses, { noEn = false } = {}) {
  return misses.flatMap((m) => [
    `${m.term} | ${m.where} | stale: ${m.staleKeep ?? '-'}`,
    ...(noEn ? [] : [`  EN: ${cut(m.en, 300)}`]),
    `  TR: ${cut(m.tr, 300)}`,
  ]);
}

const sentences = (s) => s.split(/(?<=[.!?。！？؟।])\s*/u).filter(Boolean);

/** --brief: only the English sentence that uses the term and the translation's sentence at the
 *  same position (with its neighbours when the sentence counts differ) — a fix round's reading
 *  at a fraction of the full fields. */
export function briefMisses(misses, terms) {
  return misses.flatMap((m) => {
    const re = enRegex(m.term, terms[m.term] ?? {});
    const en = sentences(m.en);
    const tr = sentences(m.tr);
    const i = Math.max(
      0,
      en.findIndex((s) => re.test(s)),
    );
    const j = en.length === tr.length ? i : Math.round((i * tr.length) / Math.max(1, en.length));
    const span = en.length === tr.length ? tr.slice(j, j + 1) : tr.slice(Math.max(0, j - 1), j + 2);
    return [
      `${m.term} | ${m.loc} | ${m.where}`,
      `  EN: ${cut(en[i] ?? m.en, 220)}`,
      `  TR: ${cut(span.join(' '), 320)}`,
    ];
  });
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
      const opt = (k) => rest.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
      const brief = rest.includes('--brief');
      const misses = readJson(file).filter(
        (m) => (!opt('loc') || m.loc === opt('loc')) && (!opt('term') || m.term === opt('term')),
      );
      const shown = brief
        ? briefMisses(
            misses,
            JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).term,
          )
        : showMisses(misses, { noEn: rest.includes('--no-en') });
      console.log(shown.join('\n'));
    } else if (cmd === 'keeps' && file && rest[0]) {
      const defaults = Object.fromEntries(
        rest.slice(1).map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]),
      );
      const keeps = missesToKeeps(readJson(file), defaults);
      writeJson(rest[0], keeps);
      console.log(keeps.length, 'keeps');
    } else {
      console.error(
        'usage: term-misses.mjs show <misses.json> [--no-en | --brief] [--loc=x] [--term=x]',
      );
      console.error('       term-misses.mjs keeps <misses.json> <keeps.json> [term=reason …]');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
