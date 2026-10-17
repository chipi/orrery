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
import {
  LANGUAGE_NAMES,
  designations,
  knownNamesIn,
  nameCandidates,
  problems,
} from './lib/translate-quality.mjs';

export { nameCandidates };
import { nonNameChanges, outsideNamesSimilarity } from './lib/name-diff.mjs';
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
  if (args.manifest) {
    // Exact list (i18n-manifest / guard-replay format): only these fields, and the
    // known names each must keep are named in the request (2026-10-17: 1,773 strings).
    for (const { loc, file, paths } of JSON.parse(fs.readFileSync(String(args.manifest), 'utf8'))) {
      const flat = file === 'messages';
      const t = flat
        ? {
            rel: 'messages',
            enPath: path.join(ROOT, 'messages', 'en-US.json'),
            tgtPath: path.join(ROOT, 'messages', `${loc}.json`),
            flat: true,
          }
        : {
            rel: file,
            enPath: path.join(enRoot, `${file}.json`),
            tgtPath: path.join(ROOT, 'i18n-src', loc, `${file}.json`),
          };
      if (!fs.existsSync(t.tgtPath)) continue;
      const en = JSON.parse(fs.readFileSync(t.enPath, 'utf8'));
      const tgt = JSON.parse(fs.readFileSync(t.tgtPath, 'utf8'));
      const send = [];
      for (const at of paths) {
        const e = flat ? en[at] : get(en, at);
        const cur = flat ? tgt[at] : get(tgt, at);
        if (typeof e !== 'string' || typeof cur !== 'string') continue;
        const must = [...new Set([...knownNamesIn(e), ...designations(e)])];
        send.push({ at, en: e, cur, names: [...new Set([...nameCandidates(e), ...must])], must });
      }
      if (send.length) items.push({ loc, ...t, send });
    }
  }
  for (const loc of args.manifest ? [] : locales) {
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
                    ...(x.must?.length ? { keep_these_names_exactly: x.must } : {}),
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
