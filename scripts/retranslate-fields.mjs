/**
 * Re-translate exact fields named in a manifest, for the translation-quality
 * audit (docs/wip/2026-10-17-post-v1-arc-plan.md, item 9b).
 *
 *   set -a; . ./.env; set +a
 *   node scripts/retranslate-fields.mjs --manifest=<file.json> [--concurrency=6] [--limits=tagline:140,…] [--chunk=15] [--batch] [--dry-run]
 *
 * Manifest: [{ "loc": "sr-Cyrl", "file": "missions/moon/apollo12", "paths": ["description", "events.3.note"] },
 *            { "loc": "de", "file": "messages", "paths": ["landing_card_mars_desc"] }]
 * `file` is relative to i18n-src/<loc>/ without `.json`, or the literal `messages`
 * for messages/<loc>.json (flat keys). The source text is always the en-US string
 * at the same path.
 *
 * - Model: translationModel(locale) — Haiku, Sonnet for problem locales (AGENTS.md).
 * - One field per call, returned through a tool, so prose can't corrupt JSON.
 * - No placeholder tokens: the sr-Cyrl `__АЦР0__` leak came from an acronym token
 *   that got transliterated and never restored.
 * - Each output is checked (wrong script, Russian letters in Serbian, Latin inside
 *   Cyrillic words, ijekavian, leftover English, empty) and retried with the reason,
 *   up to 4 attempts on the same model; a field that still fails is left unchanged and
 *   reported.
 * - Writes are serialised per file; the run ends with a per-locale summary.
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { isEditorial, translationClient, translationModel } from './lib/translate-model.mjs';
import { fixHomoglyphs, LANGUAGE_NAMES, problems } from './lib/translate-quality.mjs';
import { writeJsonEdits } from './lib/json-surgical.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
// Rules and checks live in lib/translate-quality.mjs (shared with every
// translate-*.mjs); translationClient appends them to the system prompt.
function system(locale) {
  return `You are a professional translator localising a premium space-science education app into ${LANGUAGE_NAMES[locale]}.
Translate the given English string into ${LANGUAGE_NAMES[locale]}.
Register: precise, evocative editorial prose for articles; short and plain for labels.
Return ONLY the translation via the tool.`;
}

export { problems };

const get = (o, at) =>
  at.split('.').reduce((a, k) => (a == null ? a : a[/^\d+$/.test(k) ? Number(k) : k]), o);
function set(o, at, v) {
  const segs = at.split('.');
  const last = segs.pop();
  const parent = segs.reduce((a, k) => a[/^\d+$/.test(k) ? Number(k) : k], o);
  parent[/^\d+$/.test(last) ? Number(last) : last] = v;
}
const fileOf = (loc, file) =>
  file === 'messages'
    ? path.join(ROOT, 'messages', `${loc}.json`)
    : path.join(ROOT, 'i18n-src', loc, `${file}.json`);
const getKey = (o, file, at) => (file === 'messages' ? o[at] : get(o, at));
const setKey = (o, file, at, v) => (file === 'messages' ? (o[at] = v) : set(o, at, v));

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=') || true];
    }),
  );
  if (!args.manifest) {
    console.error('usage: --manifest=<file.json> [--concurrency=6] [--dry-run]');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8'));
  const conc = Number(args.concurrency || 6);
  // Schema length limits (static/data/schemas/*.schema.json maxLength): a full
  // translation can run longer than the old, truncated one (2026-10-17: 111
  // taglines > 140, 65 intro sentences > 240). Override/extend with --limits=field:N,…
  const limits = { tagline: 140, intro_sentence: 240 };
  if (args.limits && args.limits !== true)
    for (const kv of String(args.limits).split(',')) {
      const [k, n] = kv.split(':');
      limits[k] = Number(n);
    }
  const limitFor = (at) =>
    limits[
      at
        .split('.')
        .filter((x) => !/^\d+$/.test(x))
        .pop()
    ];
  const client = translationClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

  // Load sources/targets once; results applied per file at the end of that file's units.
  const units = [];
  const docs = new Map();
  for (const { loc, file, paths } of manifest) {
    const tgtPath = fileOf(loc, file);
    const srcPath = fileOf('en-US', file);
    if (!fs.existsSync(tgtPath) || !fs.existsSync(srcPath)) {
      console.error(`  ✗ missing ${tgtPath} or its en-US source`);
      continue;
    }
    if (!docs.has(tgtPath))
      docs.set(tgtPath, {
        loc,
        file,
        en: JSON.parse(fs.readFileSync(srcPath, 'utf8')),
        obj: JSON.parse(fs.readFileSync(tgtPath, 'utf8')),
        pending: 0,
        changed: 0,
      });
    const d = docs.get(tgtPath);
    for (const at of paths) {
      const src = getKey(d.en, file, at);
      if (typeof src !== 'string') {
        console.error(`  ✗ ${loc} ${file} :: ${at} — not a string in en-US`);
        continue;
      }
      units.push({ tgtPath, loc, file, at, src });
      d.pending++;
    }
  }
  console.log(
    `${units.length} field(s) in ${docs.size} file(s); concurrency ${conc}${args['dry-run'] ? ' (dry run)' : ''}`,
  );
  if (args['dry-run']) return;

  // Every new kind of API error is printed once, so a log watcher sees it; an account
  // limit or empty balance ends the run at once (2026-10-18: a run hit the account's
  // usage limit and spent two hours failing every field silently, then reporting).
  const seenErrors = new Set();
  function apiError(e) {
    const msg = String(e?.message ?? e);
    const kind = msg.replace(/req_[A-Za-z0-9]+/g, '').slice(0, 160);
    if (!seenErrors.has(kind)) {
      seenErrors.add(kind);
      console.error(`  API error: ${msg.slice(0, 300)}`);
    }
    if (/usage limits|credit balance|billing/i.test(msg)) {
      console.error('FATAL: the API account is out of quota; stopping (written chunks are kept).');
      process.exit(3);
    }
  }
  const failed = [];
  const perLoc = {};
  let done = 0;
  async function one(u) {
    const d = docs.get(u.tgtPath);
    const ctxTitle = u.file === 'messages' ? 'UI string' : d.en.title || d.en.name || u.file;
    d.done ||= [];
    const prior =
      d.done.length && u.file !== 'messages'
        ? `\nAlready translated in this entry (keep names and terms consistent with these):\n${d.done
            .map(([e, t]) => `EN: ${e.slice(0, 300)}\n=> ${t.slice(0, 300)}`)
            .join('\n')
            .slice(-4000)}`
        : '';
    let feedback = '';
    // a field the batch call already translated and that passed the checks
    let result = u.preset ?? null;
    let lastProblems = [];
    for (let attempt = 0; attempt < 4 && !result; attempt++) {
      try {
        const r = await client.messages.create({
          model: translationModel(u.loc, { editorial: isEditorial(u.file, u.src) }),
          _locale: u.loc,
          max_tokens: 8000,
          system: system(u.loc),
          tools: [
            {
              name: 'submit_translation',
              description: 'Submit the single translated string.',
              input_schema: {
                type: 'object',
                properties: { translation: { type: 'string' } },
                required: ['translation'],
              },
            },
          ],
          tool_choice: { type: 'tool', name: 'submit_translation' },
          messages: [
            {
              role: 'user',
              content: `Context: "${ctxTitle}" — field \`${u.at}\` (${u.file}).${prior}${limitFor(u.at) ? `\nHard limit: at most ${limitFor(u.at)} characters (the UI and schema reject longer). Shorten the wording, never the names or numbers.` : ''}${feedback}\nTranslate into ${LANGUAGE_NAMES[u.loc]}:\n\n${JSON.stringify(u.src)}`,
            },
          ],
        });
        const t =
          r.content.find((c) => c.type === 'tool_use')?.input?.translation ??
          // A model answering in text despite the tool (tool_choice auto) still counts.
          (r.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('')
            .trim() ||
            undefined);
        const unq = fixHomoglyphs(
          u.loc,
          typeof t === 'string' && /^".*"$/s.test(t.trim()) && !/^".*"$/s.test(u.src.trim())
            ? t.trim().slice(1, -1)
            : t,
        );

        lastProblems = problems(u.loc, u.src, unq);
        const lim = limitFor(u.at);
        if (lim && typeof unq === 'string' && unq.length > lim)
          lastProblems.push(`${unq.length} characters, over the ${lim} limit — shorten it`);
        if (process.env.RETRANSLATE_DEBUG)
          console.log(
            `  [${u.loc} ${u.file} :: ${u.at} attempt ${attempt + 1}] ${lastProblems.join('; ') || 'ok'}`,
          );
        if (!lastProblems.length) result = unq;
        else
          // Retry as an EDIT of the previous answer: a fresh translation slips
          // somewhere else (observed: "savladivo", then "Letelica", on the same field).
          feedback = `\nYour previous translation was rejected: ${lastProblems.join('; ')}.\nPrevious translation:\n${JSON.stringify(unq ?? '')}\nReturn that same translation with ONLY those problems fixed; change nothing else.`;
      } catch (e) {
        apiError(e);
        lastProblems = [`API error: ${e.message.slice(0, 80)}`];
        await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
      }
    }
    perLoc[u.loc] ||= { ok: 0, failed: 0 };
    const c = u.chunk;
    if (result) {
      c.edits.push({ at: u.at, old: getKey(d.obj, u.file, u.at), nu: result });
      setKey(d.obj, u.file, u.at, result);
      d.changed++;
      perLoc[u.loc].ok++;
      d.done.push([u.src, result]);
    } else {
      failed.push(`${u.loc} ${u.file} :: ${u.at} — ${lastProblems.join('; ')}`);
      perLoc[u.loc].failed++;
    }
    if (--c.pending === 0 && c.edits.length) {
      // Each chunk writes its own edits: re-reads the file and edits only these
      // strings, so chunks of one file can run in parallel, the layout is kept, and
      // a change another run made meanwhile is never overwritten (it is reported).
      const w = writeJsonEdits(u.tgtPath, c.edits, { flat: u.file === 'messages' });
      for (const at of w.skipped) {
        failed.push(
          `${u.loc} ${u.file} :: ${at} — changed by someone else meanwhile; not overwritten`,
        );
        perLoc[u.loc].ok--;
        perLoc[u.loc].failed++;
      }
    }
    if (++done % 50 === 0) console.log(`  … ${done}/${units.length}`);
  }
  // Work items are chunks of one file's fields (--chunk, default 15). Chunks run in
  // parallel; a chunk's fields run in order, each seeing that file's earlier
  // translations, so names stay consistent within an entry. A UI bundle with 420
  // long strings as one sequential item made a 38k-field run crawl (2026-10-17).
  const chunkSize = Number(args.chunk || 15);
  const items = [];
  for (const group of Map.groupBy(units, (u) => u.tgtPath).values())
    for (let k = 0; k < group.length; k += chunkSize) {
      const part = group.slice(k, k + chunkSize);
      const chunk = { edits: [], pending: part.length };
      for (const u of part) u.chunk = chunk;
      items.push(part);
    }
  // --batch: one call per chunk for all its fields (the system prompt and context are
  // paid once, not once per field). Each answer is checked like a single-field one;
  // a field that fails, or a reply of the wrong length, falls back to the per-field
  // path below with its retries.
  async function batch(part) {
    const u0 = part[0];
    const d = docs.get(u0.tgtPath);
    const ctxTitle = u0.file === 'messages' ? 'UI strings' : d.en.title || d.en.name || u0.file;
    const list = part
      .map(
        (u, k) =>
          `${k + 1}. field \`${u.at}\`${limitFor(u.at) ? ` (at most ${limitFor(u.at)} characters)` : ''}:\n${JSON.stringify(u.src)}`,
      )
      .join('\n\n');
    try {
      const r = await client.messages.create({
        model: translationModel(u0.loc, {
          editorial: part.some((u) => isEditorial(u.file, u.src)),
        }),
        _locale: u0.loc,
        max_tokens: 16000,
        system: system(u0.loc),
        tools: [
          {
            name: 'submit_translations',
            description: 'Submit the translations, one per field, in the same order.',
            input_schema: {
              type: 'object',
              properties: { translations: { type: 'array', items: { type: 'string' } } },
              required: ['translations'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'submit_translations' },
        messages: [
          {
            role: 'user',
            content: `Context: "${ctxTitle}" (${u0.file}). Translate each of these ${part.length} fields into ${LANGUAGE_NAMES[u0.loc]}, keeping names and terms consistent across them. Return exactly ${part.length} translations, in order, one per field.\n\n${list}`,
          },
        ],
      });
      const arr = r.content.find((c) => c.type === 'tool_use')?.input?.translations;
      if (!Array.isArray(arr) || arr.length !== part.length) return;
      part.forEach((u, k) => {
        const t = arr[k];
        const unq = fixHomoglyphs(
          u.loc,
          typeof t === 'string' && /^".*"$/s.test(t.trim()) && !/^".*"$/s.test(u.src.trim())
            ? t.trim().slice(1, -1)
            : t,
        );
        const p = problems(u.loc, u.src, unq);
        const lim = limitFor(u.at);
        if (lim && typeof unq === 'string' && unq.length > lim) p.push('over the limit');
        if (!p.length) u.preset = unq;
      });
    } catch (e) {
      apiError(e);
      // the per-field path retries every field of this chunk
    }
  }
  let i = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (i < items.length) {
        const part = items[i++];
        if (args.batch) await batch(part);
        for (const u of part) await one(u);
      }
    }),
  );
  for (const [loc, c] of Object.entries(perLoc))
    console.log(`  ${loc}: ${c.ok} translated, ${c.failed} failed`);
  if (failed.length) {
    console.log(`FAILED (${failed.length}), left unchanged:`);
    for (const f of failed) console.log(`  ✗ ${f}`);
  }
  console.log(`Done — ${units.length - failed.length}/${units.length}.`);
  for (const [model, u] of Object.entries(client.usage))
    console.log(
      `  usage ${model}: ${u.calls} calls, ${u.input} input + ${u.cacheWrite} cache-write + ${u.cacheRead} cache-read tokens, ${u.output} output tokens`,
    );
  process.exitCode = failed.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
