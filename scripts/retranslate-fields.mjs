/**
 * Re-translate exact fields named in a manifest, for the translation-quality
 * audit (docs/wip/2026-10-17-post-v1-arc-plan.md, item 9b).
 *
 *   set -a; . ./.env; set +a
 *   node scripts/retranslate-fields.mjs --manifest=<file.json> [--concurrency=6] [--limits=tagline:140,…] [--dry-run]
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
import { translationClient, translationModel } from './lib/translate-model.mjs';
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
    let result = null;
    let lastProblems = [];
    for (let attempt = 0; attempt < 4 && !result; attempt++) {
      try {
        const r = await client.messages.create({
          model: translationModel(u.loc),
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
        lastProblems = [`API error: ${e.message.slice(0, 80)}`];
        await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
      }
    }
    perLoc[u.loc] ||= { ok: 0, failed: 0 };
    if (result) {
      (d.edits ||= []).push({ at: u.at, old: getKey(d.obj, u.file, u.at), nu: result });
      setKey(d.obj, u.file, u.at, result);
      d.changed++;
      perLoc[u.loc].ok++;
      d.done.push([u.src, result]);
    } else {
      failed.push(`${u.loc} ${u.file} :: ${u.at} — ${lastProblems.join('; ')}`);
      perLoc[u.loc].failed++;
    }
    if (--d.pending === 0 && d.changed) {
      // Re-reads the file and edits only these strings: keeps the layout and never
      // overwrites a change another run made meanwhile (those are reported).
      const w = writeJsonEdits(u.tgtPath, d.edits, { flat: u.file === 'messages' });
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
  // Files run in parallel; a file's fields run in order, each seeing that file's
  // earlier translations, so names stay consistent within an entry.
  const byFile = [...Map.groupBy(units, (u) => u.tgtPath).values()];
  let i = 0;
  await Promise.all(
    Array.from({ length: conc }, async () => {
      while (i < byFile.length) for (const u of byFile[i++]) await one(u);
    }),
  );
  for (const [loc, c] of Object.entries(perLoc))
    console.log(`  ${loc}: ${c.ok} translated, ${c.failed} failed`);
  if (failed.length) {
    console.log(`FAILED (${failed.length}), left unchanged:`);
    for (const f of failed) console.log(`  ✗ ${f}`);
  }
  console.log(`Done — ${units.length - failed.length}/${units.length}.`);
  process.exitCode = failed.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
