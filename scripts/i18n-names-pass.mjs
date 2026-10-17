/**
 * Names pass (operator ruling 2026-10-17, i18n style guide §2): put every name
 * back into its English form in existing translations, changing nothing else.
 * An EDIT of the current translation, not a re-translation.
 *
 *   set -a; . ./.env; set +a
 *   node scripts/i18n-names-pass.mjs --locales=ja,zh-CN [--trees=missions,fleet] [--messages] [--concurrency=6] [--dry-run]
 *
 * Only strings whose English contains a name candidate that is not already in the
 * translation verbatim are sent, one call per file. Each edited string must pass
 * problems() (lib/translate-quality.mjs) and stay close to the old translation
 * outside the names (a rewrite is rejected and the old string kept).
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { translationClient, translationModel } from './lib/translate-model.mjs';
import { LANGUAGE_NAMES, ORDINARY, nameCandidates, problems } from './lib/translate-quality.mjs';

export { nameCandidates };
import { SKIP_KEY } from './i18n-manifest.mjs';
import { writeJsonEdits } from './lib/json-surgical.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOCALES = [
  'ar',
  'de',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
];

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}
function strings(v, at, out) {
  if (typeof v === 'string') out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}.${i}`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) strings(x, at ? `${at}.${k}` : k, out);
  return out;
}
const get = (o, at) =>
  at.split('.').reduce((a, k) => (a == null ? a : a[/^\d+$/.test(k) ? Number(k) : k]), o);
function set(o, at, v) {
  const segs = at.split('.');
  const last = segs.pop();
  const parent = segs.reduce((a, k) => a[/^\d+$/.test(k) ? Number(k) : k], o);
  parent[/^\d+$/.test(last) ? Number(last) : last] = v;
}

/** Diff hunks [{del, ins}] between a and b by LCS over tokens: words (with the
 *  whitespace between them) for languages written with spaces, characters for
 *  ja/zh-CN. Very long inputs fall back to one hunk covering the changed middle. */
export function editHunks(a, b, mode = 'word') {
  const tok = (x) => (mode === 'char' ? [...x] : x.split(/(\s+)/).filter((t) => t !== ''));
  const ta = tok(a);
  const tb = tok(b);
  let p = 0;
  while (p < ta.length && p < tb.length && ta[p] === tb[p]) p++;
  let sa = ta.length;
  let sb = tb.length;
  while (sa > p && sb > p && ta[sa - 1] === tb[sb - 1]) {
    sa--;
    sb--;
  }
  const A = ta.slice(p, sa);
  const B = tb.slice(p, sb);
  if (!A.length && !B.length) return [];
  if (A.length * B.length > 4_000_000) return [{ del: A.join(''), ins: B.join('') }];
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hunks = [];
  let cur = null;
  let i = 0;
  let j = 0;
  const flush = () => {
    if (cur && (cur.del.trim() || cur.ins.trim())) hunks.push(cur);
    cur = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      // Whitespace between two changes belongs to one hunk ("Ozean der Stürme" →
      // "Ocean of Storms" is one replacement, not three).
      if (cur && /^\s+$/.test(A[i]) && i + 1 < n && j + 1 < m && A[i + 1] !== B[j + 1]) {
        cur.del += A[i];
        cur.ins += B[j];
      } else flush();
      i++;
      j++;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      (cur ||= { del: '', ins: '' }).ins += B[j++];
    } else {
      (cur ||= { del: '', ins: '' }).del += A[i++];
    }
  }
  flush();
  return hunks;
}

const CONNECT = new Set([
  'of',
  'the',
  'de',
  'la',
  'le',
  'du',
  'des',
  'von',
  'van',
  'der',
  'and',
  'for',
  'on',
]);

/**
 * Why a names edit changed more than names (empty = acceptable). Each hunk may
 * insert (a) Latin runs that are verbatim spans of the English source, start and
 * end on a capitalised word or number, and use only connecting words in lowercase
 * (Ocean of Storms, Kennedy Space Center) — and only by REPLACING something; and
 * (b) at most two other characters (a particle or case ending). No English
 * possessive may be added (German "Shepards" must not become "Shepard's").
 */
export function nonNameChanges(oldT, newT, src, mode = 'word') {
  const bad = [];
  const oldWords = new Set(oldT.match(/[A-Za-z0-9]+/g) || []);
  const srcWords = new Set(src.match(/[A-Za-z0-9]+/g) || []);
  if (/['’]s\b/.test(newT) && !/['’]s\b/.test(oldT)) bad.push("added an English possessive ('s)");
  for (const h of editHunks(oldT, newT, mode)) {
    const runs =
      h.ins.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*(?:\s+[A-Za-z0-9][A-Za-z0-9'’.-]*)*/g) || [];
    for (const run of runs) {
      // Words the old translation already had are the language's own (German
      // "Wostok-Kapsel" → "Vostok-Kapsel" keeps "Kapsel"); only new words are checked.
      const words = run.split(/[\s-]+/).filter((w) => w && !oldWords.has(w));
      if (!words.length) continue;
      const ordinary = words.filter((w) => ORDINARY.has(w.replace(/['’]s$/, '')));
      const notName = words.filter(
        (w) => !srcWords.has(w.replace(/['’]s$/, '')) || !(/^[A-Z0-9]/.test(w) || CONNECT.has(w)),
      );
      if (ordinary.length)
        bad.push(`anglicised an ordinary noun (translated under the rule): ${ordinary.join(' ')}`);
      else if (notName.length || words.length > 7)
        bad.push(`inserted text that is not a name from the source: "${notName.join(' ') || run}"`);
    }
    if (runs.length && !h.del.trim())
      bad.push(`added "${h.ins.trim()}" without replacing anything`);
    const otherChars = h.ins.replace(/[A-Za-z0-9\s'’.\-–—·,()]/g, '');
    const delNative = h.del.replace(/[A-Za-z0-9\s'’.\-–—·,()]/g, '');
    // Native text may be removed (the localised name) or have a particle/case ending
    // added, but not swapped for other native text without a name going in.
    if (!runs.length && otherChars.length && delNative.length)
      bad.push(`changed words outside the names: "${h.del}" → "${h.ins}"`);
    else if (otherChars.length > 2)
      bad.push(`changed words outside the names: "${h.del}" → "${h.ins}"`);
  }
  return [...new Set(bad)].slice(0, 3);
}

export function outsideNamesSimilarity(oldT, newT, names) {
  const strip = (s) => {
    let r = s;
    for (const n of names) r = r.split(n).join('');
    return r
      .replace(/[A-Za-z0-9'’.-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  const a = strip(oldT);
  const b = strip(newT);
  if (!a.length && !b.length) return 1;
  // bigram Dice coefficient
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++)
      m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) || 0) + 1);
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  for (const [g, c] of ga) inter += Math.min(c, gb.get(g) || 0);
  const total = Math.max(1, a.length - 1 + (b.length - 1));
  return (2 * inter) / total;
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=') || true];
    }),
  );
  const locales = args.locales ? String(args.locales).split(',') : LOCALES;
  const enRoot = path.join(ROOT, 'i18n-src', 'en-US');
  const trees = args.trees ? String(args.trees).split(',') : null;
  const conc = Number(args.concurrency || 6);

  // Work items: one per (locale, file) with the strings to send.
  const items = [];
  for (const loc of locales) {
    const files = walk(enRoot)
      .map((p) => path.relative(enRoot, p).replace(/\.json$/, ''))
      .filter((rel) => !trees || trees.includes(rel.split('/')[0]));
    const targets = files.map((rel) => ({
      rel,
      enPath: path.join(enRoot, `${rel}.json`),
      tgtPath: path.join(ROOT, 'i18n-src', loc, `${rel}.json`),
    }));
    if (args.messages)
      targets.push({
        rel: 'messages',
        enPath: path.join(ROOT, 'messages', 'en-US.json'),
        tgtPath: path.join(ROOT, 'messages', `${loc}.json`),
        flat: true,
      });
    for (const t of targets) {
      if (!fs.existsSync(t.tgtPath)) continue;
      const en = JSON.parse(fs.readFileSync(t.enPath, 'utf8'));
      const tgt = JSON.parse(fs.readFileSync(t.tgtPath, 'utf8'));
      const pairs = t.flat
        ? Object.entries(en).filter(([, v]) => typeof v === 'string')
        : strings(en, '', []).filter(([at]) => !SKIP_KEY.test(at));
      const send = [];
      for (const [at, e] of pairs) {
        const cur = t.flat ? tgt[at] : get(tgt, at);
        if (typeof cur !== 'string' || !cur.trim()) continue;
        if (cur.trim() === e.trim()) continue; // untranslated: handled by the gaps track, not here
        const apos = (x) => x.replace(/[’‘]/g, "'");
        const missing = nameCandidates(e).filter((n) => !apos(cur).includes(apos(n)));
        if (missing.length) send.push({ at, en: e, cur, names: nameCandidates(e) });
      }
      if (send.length) items.push({ loc, ...t, send });
    }
  }
  const total = items.reduce((a, i) => a + i.send.length, 0);
  console.log(
    `${total} string(s) in ${items.length} file(s) across ${locales.join(',')}${args['dry-run'] ? ' (dry run)' : ''}`,
  );
  if (args['dry-run']) {
    const byLoc = {};
    for (const i of items) byLoc[i.loc] = (byLoc[i.loc] || 0) + i.send.length;
    console.log(JSON.stringify(byLoc));
    return;
  }

  const client = translationClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
  const stats = {};
  const kept = [];
  const keptFields = new Map(); // `${loc}\u0000${file}` → paths, for --kept-out
  const keep = (item, at) => {
    const k = `${item.loc}\u0000${item.rel}`;
    if (!keptFields.has(k)) keptFields.set(k, []);
    keptFields.get(k).push(at);
  };
  async function one(item) {
    const s = (stats[item.loc] ||= { edited: 0, unchanged: 0, rejected: 0 });
    // Batches of 20 strings per call.
    const tgt = JSON.parse(fs.readFileSync(item.tgtPath, 'utf8'));
    const edits = [];
    const queue = [];
    for (let b = 0; b < item.send.length; b += 20) queue.push(item.send.slice(b, b + 20));
    while (queue.length) {
      const batch = queue.shift();
      let out = null;
      try {
        const r = await client.messages.create({
          model: translationModel(item.loc),
          _locale: item.loc,
          max_tokens: 16000,
          system: `You are editing existing ${LANGUAGE_NAMES[item.loc]} translations of a space-science app. Apply ONLY the NAMES rule: wherever a translation renders a name (mission, spacecraft, rocket, station, company, agency, instrument, person, place, sky feature) in a translated or transliterated form, replace it with the name exactly as the English source writes it. Keep every other word, the grammar and the punctuation as they are, except the minimum needed to fit the name in (a case ending after a hyphen where the language needs one). Countries, continents, oceans, regions and cities are ordinary geography: leave them translated. Replace the localised form; never keep both it and the English name, and never add English words other than the names. If a translation already keeps every name, return it unchanged. Return the same number of strings, in the same order, via the tool.`,
          tools: [
            {
              name: 'submit_edits',
              description: 'Submit the edited translations, same count and order.',
              input_schema: {
                type: 'object',
                properties: { edited: { type: 'array', items: { type: 'string' } } },
                required: ['edited'],
              },
            },
          ],
          tool_choice: { type: 'tool', name: 'submit_edits' },
          messages: [
            {
              role: 'user',
              content:
                (batch.some((x) => x.feedback)
                  ? 'Some items carry your previous edit and why it was rejected: start from "translation" again and avoid those problems.\n'
                  : '') +
                JSON.stringify(
                  batch.map((x) => ({
                    english: x.en,
                    translation: x.cur,
                    ...(x.feedback
                      ? { rejected_edit: x.feedback.prev, rejected_because: x.feedback.why }
                      : {}),
                  })),
                ),
            },
          ],
        });
        out = r.content.find((c) => c.type === 'tool_use')?.input?.edited;
      } catch (e) {
        console.error(`  ✗ ${item.loc} ${item.rel}: API error ${e.message.slice(0, 80)}`);
      }
      if (!Array.isArray(out) || out.length !== batch.length) {
        // A miscounted batch is retried one string at a time; a single string that
        // still comes back malformed is kept as it was.
        if (batch.length > 1) for (const x of batch) queue.push([x]);
        else {
          s.rejected++;
          kept.push(`${item.loc} ${item.rel} :: ${batch[0].at} — bad answer shape`);
          keep(item, batch[0].at);
        }
        continue;
      }
      batch.forEach((x, i) => {
        const nu = out[i];
        if (typeof nu !== 'string' || nu === x.cur) return void s.unchanged++;
        const why = problems(item.loc, x.en, nu);
        // An edit may add names, never English prose: lowercase Latin words new to
        // the string ("Atlas V 401 from Vandenberg AFB からのアトラス V 401").
        const had = new Set(x.cur.match(/[A-Za-z]+/g) || []);
        const addedEnglish = [...new Set(nu.match(/\b[a-z]{2,}\b/g) || [])].filter(
          (w) => !had.has(w),
        );
        if (addedEnglish.length)
          why.push(`added English words: ${addedEnglish.slice(0, 5).join(', ')}`);
        why.push(
          ...nonNameChanges(
            x.cur,
            nu,
            x.en,
            item.loc === 'ja' || item.loc === 'zh-CN' ? 'char' : 'word',
          ),
        );
        const sim = x.cur.length > 80 ? outsideNamesSimilarity(x.cur, nu, x.names) : 1;
        if (why.length || sim < 0.5) {
          if (sim < 0.5) why.push(`rewrote more than the names (similarity ${sim.toFixed(2)})`);
          // Up to two corrective retries, one string per call, with the reasons.
          if ((x.tries || 0) < 2) {
            queue.push([{ ...x, tries: (x.tries || 0) + 1, feedback: { prev: nu, why } }]);
            return;
          }
          s.rejected++;
          keep(item, x.at);
          kept.push(
            `${item.loc} ${item.rel} :: ${x.at} — ${why.join('; ') || `rewrote more than the names (similarity ${sim.toFixed(2)})`}`,
          );
          return;
        }
        if (item.flat) tgt[x.at] = nu;
        else set(tgt, x.at, nu);
        edits.push({ at: x.at, old: x.cur, nu });
        s.edited++;
      });
    }
    if (edits.length) {
      const w = writeJsonEdits(item.tgtPath, edits, { flat: !!item.flat });
      if (w.skipped.length) {
        s.edited -= w.skipped.length;
        s.rejected += w.skipped.length;
        for (const at of w.skipped) {
          keep(item, at);
          kept.push(
            `${item.loc} ${item.rel} :: ${at} — changed by someone else meanwhile; not overwritten`,
          );
        }
      }
    }
  }
  let i = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (i < items.length) {
        await one(items[i++]);
        if (++done % 50 === 0) console.log(`  … ${done}/${items.length} files`);
      }
    }),
  );
  for (const [loc, c] of Object.entries(stats))
    console.log(
      `  ${loc}: ${c.edited} edited, ${c.unchanged} unchanged, ${c.rejected} kept (rejected)`,
    );
  if (kept.length) {
    console.log(`KEPT OLD (${kept.length}):`);
    for (const k of kept) console.log(`  ✗ ${k}`);
  }
  if (args['kept-out']) {
    // Manifest for scripts/retranslate-fields.mjs: fields the names pass could not
    // edit safely get a full re-translation (with the names rule) instead.
    const m = [...keptFields].map(([k, paths]) => {
      const [loc, file] = k.split('\u0000');
      return { loc, file, paths };
    });
    fs.writeFileSync(String(args['kept-out']), JSON.stringify(m, null, 1) + '\n');
    console.log(
      `kept fields → ${args['kept-out']} (${m.reduce((a, x) => a + x.paths.length, 0)} fields)`,
    );
  }
  process.exitCode = kept.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
