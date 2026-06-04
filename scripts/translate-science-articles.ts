/**
 * Translate /science article en-US overlays to all other locales.
 *
 * Reads each `static/data/i18n/en-US/science/<tab>/<id>.json`,
 * translates to the 13 non-en-US locales via the Anthropic API, writes
 * the result to `static/data/i18n/<locale>/science/<tab>/<id>.json`.
 *
 * PRD-024 Slice 2 tool. Designed to be re-run idempotently: if a target
 * overlay file already exists, the script skips it (re-translate by
 * deleting the target first or passing --force).
 *
 * Usage:
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/translate-science-articles.ts
 *
 *   # Translate only a specific tab:
 *   npx tsx scripts/translate-science-articles.ts --tab planets
 *
 *   # Re-translate already-translated files:
 *   npx tsx scripts/translate-science-articles.ts --force
 *
 *   # Dry-run (print what would be translated, no API calls):
 *   npx tsx scripts/translate-science-articles.ts --dry-run
 *
 * Cost estimate (Sonnet 4.6 at 2026-05 pricing): ~$0.02 per article
 * per locale. 8 articles × 13 locales ≈ $2 for a full sweep. The
 * Anthropic API key must be provided by the operator — Claude Code
 * subscriptions do not cover the API; see `scripts/vision/anthropic.ts`
 * for the same disclaimer applied to the image-vision pipeline.
 */
import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
] as const;

const LOCALE_NAME: Record<(typeof LOCALES)[number], string> = {
  ar: 'Arabic (Modern Standard Arabic)',
  de: 'German',
  es: 'Spanish (Castilian / international)',
  fr: 'French (international)',
  hi: 'Hindi',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  'pt-BR': 'Brazilian Portuguese',
  ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic script)',
  'zh-CN': 'Simplified Chinese (Mainland)',
};

const I18N_ROOT = 'static/data/i18n';
const EN_US_ROOT = join(I18N_ROOT, 'en-US/science');

interface ArticleOverlay {
  title: string;
  intro_sentence?: string;
  narrative_101?: string[];
  body_paragraphs?: string[];
  diagram_caption?: string;
  headline?: string; // _intro.json
  paragraphs?: string[]; // _intro.json
}

interface CliArgs {
  tab: string | null;
  id: string | null;
  force: boolean;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const out: CliArgs = { tab: null, id: null, force: false, dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--force') out.force = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--tab') {
      out.tab = args[i + 1] ?? null;
      i++;
    } else if (a === '--id') {
      out.id = args[i + 1] ?? null;
      i++;
    }
  }
  return out;
}

function listTabs(): string[] {
  if (!existsSync(EN_US_ROOT)) return [];
  return readdirSync(EN_US_ROOT).filter((name) => {
    const p = join(EN_US_ROOT, name);
    try {
      return readdirSync(p).length > 0;
    } catch {
      return false;
    }
  });
}

function listArticleFiles(tab: string): string[] {
  const tabDir = join(EN_US_ROOT, tab);
  if (!existsSync(tabDir)) return [];
  return readdirSync(tabDir).filter((f) => f.endsWith('.json'));
}

function readArticle(path: string): ArticleOverlay {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as ArticleOverlay;
}

function targetPath(locale: string, tab: string, file: string): string {
  return join(I18N_ROOT, locale, 'science', tab, file);
}

const SYSTEM_PROMPT = `You translate Orrery's planetary-science encyclopedia articles from en-US into other languages.

Constraints — read carefully:

  • Preserve every JSON field exactly. Translate ONLY the human-readable string values.
  • Keep numbers, units, formulas (e.g. "r_H ≈ a × (1−e) × (m / 3M)^(1/3)"), and proper nouns (Saturn, Cassini, JWST, Mangalyaan) in their original form. Don't translate "MRO", "ESA", "NASA", etc.
  • Keep mission + body names in their canonical English form. "Mars Reconnaissance Orbiter" stays English in every language unless the target language has an established translation (e.g. Russian transliteration is fine).
  • Maintain the editorial register: third-person, accessible, scientifically accurate but not academic.
  • narrative_101 paragraphs are deliberately conversational — keep them so. body_paragraphs are denser — preserve their density.
  • Output VALID JSON ONLY. No code fences. No commentary. The output must parse with JSON.parse.
  • The output object must have the same keys as the input. Same array lengths. Same field types.

JSON QUOTE-ESCAPING — read this twice:

  • Inside a JSON string value, you MUST NOT include an unescaped double-quote (").
  • If your translation would naturally want a double-quote — e.g. quoting an English term in German prose, or a section title in Russian — use ONE of:
      a) Unicode typographic quotes for the target language: « » (French/Russian), „ " (German), 「 」 (Japanese / Chinese), ' ' (single typographic).
      b) Escape it: \\" (two characters: backslash + double-quote).
  • Same rule for backslashes — escape every \\ as \\\\.
  • Mentally walk the output: scan every string value for raw ". Each one is either part of the JSON syntax (delimiter) or it's a bug.

Common failures we've seen:

  • German: ' "Planet", stimmt das ' → INVALID. Use „Planet" or ‚Planet'.
  • Serbian: ' "планета", то је ' → INVALID. Use „планета" or «планета».
  • Chinese: ' "行星" ' → INVALID. Use 「行星」 or 「行星」.

Output JUST the JSON object. The first character must be { and the last character must be }.`;

function buildUserPrompt(locale: string, article: ArticleOverlay): string {
  const langName = LOCALE_NAME[locale as (typeof LOCALES)[number]];
  return `Translate the following JSON into ${langName} (${locale}). Output JSON only.

Source (en-US):

${JSON.stringify(article, null, 2)}`;
}

async function translate(
  client: Anthropic,
  locale: string,
  article: ArticleOverlay,
): Promise<ArticleOverlay> {
  // Opus-4-7 with tool_use for guaranteed structured output. Plain-text
  // Sonnet + Opus both repeatedly produced unescaped quotes in German
  // (' "Planet", stimmt das ' patterns) which broke JSON.parse on every
  // retry. Tool-use forces the model to emit input matching our schema,
  // and the Anthropic SDK validates / parses it for us. (#56 fix.)
  const tool = {
    name: 'submit_translation',
    description: 'Submit the translated article. Every field that was a string in the source is translated; every key is preserved exactly.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        intro_sentence: { type: 'string' },
        narrative_101: { type: 'array', items: { type: 'string' } },
        body_paragraphs: { type: 'array', items: { type: 'string' } },
        diagram_caption: { type: 'string' },
        headline: { type: 'string' },
        paragraphs: { type: 'array', items: { type: 'string' } },
      },
    },
  };
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [{ role: 'user', content: buildUserPrompt(locale, article) }],
  });
  const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error(`No tool_use block in response for locale ${locale}`);
  }
  const parsed = toolUseBlock.input as ArticleOverlay;
  // Sanity check: keys must match.
  const sourceKeys = new Set(Object.keys(article));
  const targetKeys = new Set(Object.keys(parsed));
  for (const k of sourceKeys) {
    if (!targetKeys.has(k)) {
      throw new Error(`Locale ${locale}: missing key "${k}" in translation output`);
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs();
  const tabs = args.tab ? [args.tab] : listTabs();
  if (tabs.length === 0) {
    console.error(`No tabs found under ${EN_US_ROOT}`);
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!args.dryRun && (!apiKey || apiKey.length < 10)) {
    console.error(
      'ANTHROPIC_API_KEY missing. Claude Code subscriptions do not cover API calls — operator must provide a key. ' +
        'Re-run with `--dry-run` to preview without making API calls.',
    );
    process.exit(2);
  }

  const client = args.dryRun ? null : new Anthropic({ apiKey });

  let translatedCount = 0;
  let skippedCount = 0;
  const errors: { locale: string; file: string; error: string }[] = [];

  for (const tab of tabs) {
    let files = listArticleFiles(tab);
    if (args.id) {
      const idFile = `${args.id}.json`;
      files = files.filter((f) => f === idFile);
      if (files.length === 0) {
        console.error(`No article found at ${tab}/${idFile}`);
        process.exit(1);
      }
    }
    for (const file of files) {
      const srcPath = join(EN_US_ROOT, tab, file);
      const article = readArticle(srcPath);

      for (const locale of LOCALES) {
        const dst = targetPath(locale, tab, file);
        if (existsSync(dst) && !args.force) {
          skippedCount++;
          continue;
        }
        if (args.dryRun) {
          console.log(`[dry-run] would translate ${tab}/${file} → ${locale}`);
          translatedCount++;
          continue;
        }
        try {
          process.stdout.write(`Translating ${tab}/${file} → ${locale}... `);
          const translated = await translate(client!, locale, article);
          mkdirSync(dirname(dst), { recursive: true });
          writeFileSync(dst, JSON.stringify(translated, null, 2) + '\n', 'utf8');
          translatedCount++;
          console.log('ok');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`FAIL ${msg}`);
          errors.push({ locale, file: `${tab}/${file}`, error: msg });
        }
      }
    }
  }

  console.log(
    `\nTranslated: ${translatedCount}. Skipped (exists): ${skippedCount}. Failed: ${errors.length}.`,
  );
  if (errors.length > 0) {
    console.log('\nFailures:');
    for (const e of errors) {
      console.log(`  ${e.locale}/${e.file}: ${e.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
