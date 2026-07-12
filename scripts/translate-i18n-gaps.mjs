/**
 * Universal gap-fill translator (#354 — Marko: "if you see anything
 * else not translated, translate them as well").
 *
 * Walks the i18n overlay tree under i18n-src/en-US/ and for
 * every JSON file missing from any of the 13 non-en-US locales, runs
 * a translation via the Anthropic Sonnet API and writes the locale
 * overlay.
 *
 * Surfaces are covered with bespoke tool schemas so the LLM preserves shape:
 *   - earth-objects (name, short, description, scale_fact)
 *   - planets       (name, type, fact, bio)
 *   - science/**    (title, intro_sentence, narrative_101, body_paragraphs, diagram_caption, plus optional `formula_caption`, `references`, `see_also`)
 *   - missions/**   (name, type, first, description, optional events[])
 *   - fleet/**      (name, tagline, description, best_known_for)
 *
 * Re-runs are safe — existing non-empty overlay files are skipped.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-i18n-gaps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
// i18n overlay source moved out of static/ (ADR-079 D2 / #377).
const I18N = path.join(ROOT, 'i18n-src');

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

const NAMES = {
  ar: 'Modern Standard Arabic',
  de: 'German',
  es: 'European Spanish',
  fr: 'French',
  hi: 'Hindi',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  'pt-BR': 'Brazilian Portuguese',
  ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic)',
  'zh-CN': 'Simplified Chinese',
};

const SYSTEM_BASE = `Translate Orrery editorial content from en-US.

CRITICAL CONSTRAINTS:
- Keep proper nouns: spacecraft, mission, agency, observatory, person, place names.
- Preserve numbers, units, dates, Unicode symbols (km, m, °, ≈, ×, %, em-dash —, AU).
- Keep universal space acronyms untranslated: LEO, MEO, GEO, HEO, L2, GNSS, GPS, ISS, JWST, SOHO, LRO.
- Match the en-US tone: accessible but precise.`;

const TOOLS = {
  'earth-objects': {
    system:
      SYSTEM_BASE +
      `
- "short" is usually an acronym (ISS, JWST, GOES, GPS) — keep verbatim. Translate only if it's a localised brand (rare).
- "name" — translate to native conventions if commonly localised (e.g. "International Space Station" ↔ "Internationale Raumstation"); else keep verbatim.`,
    schema: {
      name: {
        name: 'submit_translation',
        description: 'Submit translated earth-object overlay.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            short: { type: 'string' },
            description: { type: 'string' },
            scale_fact: { type: 'string' },
          },
          required: ['name', 'description'],
        },
      },
    },
  },
  planets: {
    system:
      SYSTEM_BASE +
      `
- "name" — translate to native conventions (Pluto ↔ Plutón, Arrokoth keep verbatim).
- "type" — translate the kind classification (Dwarf planet, Kuiper Belt) idiomatically.`,
    schema: {
      name: {
        name: 'submit_translation',
        description: 'Submit translated planet overlay.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            fact: { type: 'string' },
            bio: { type: 'string' },
          },
          required: ['name'],
        },
      },
    },
  },
  science: {
    system:
      SYSTEM_BASE +
      `
- "title" — section title (translate if a common physics term has a native rendering).
- narrative_101 + body_paragraphs are array fields — translate each paragraph, preserve count + order.
- diagram_caption — usually a short illustration label.
- Preserve LaTeX-ish math notation verbatim (r_H, ≈, ^(1/3), R_Earth, R_Jupiter, etc.).
- "formula_caption", "see_also", "references" — pass through arrays verbatim where applicable.`,
    schema: {
      name: {
        name: 'submit_translation',
        description: 'Submit translated science section.',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            intro_sentence: { type: 'string' },
            narrative_101: { type: 'array', items: { type: 'string' } },
            body_paragraphs: { type: 'array', items: { type: 'string' } },
            diagram_caption: { type: 'string' },
            formula_caption: { type: 'string' },
          },
          required: ['title', 'intro_sentence'],
        },
      },
    },
  },
  missions: {
    system:
      SYSTEM_BASE +
      `
- "type" — a short status/kind label (e.g. "CREWED LANDER · PLANNED"): translate the words, keep the · separators and any ALL-CAPS status convention.
- "first" — a one-line summary; translate.
- "dispatch" (optional) — a one-paragraph editorial lead in the field-historian voice; translate it fully, preserving the tone and any em-dashes.
- "events" (optional array) — translate each event's "label" + "note"; pass "met" (number) + "type" (enum) through verbatim; preserve count + order.`,
    schema: {
      name: {
        name: 'submit_translation',
        description: 'Submit translated mission overlay.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            first: { type: 'string' },
            dispatch: { type: 'string' },
            description: { type: 'string' },
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  met: { type: 'number' },
                  label: { type: 'string' },
                  note: { type: 'string' },
                  type: { type: 'string' },
                },
                required: ['met', 'label', 'note', 'type'],
              },
            },
          },
          required: ['name', 'type', 'first', 'description'],
        },
      },
    },
  },
  fleet: {
    system:
      SYSTEM_BASE +
      `
- "name" — vehicle/spacecraft proper name; keep verbatim unless commonly localised.
- "tagline" + "best_known_for" — short descriptors; translate.
- "dispatch" (optional) — a one-paragraph editorial lead in the field-historian voice; translate it fully, preserving the tone and any em-dashes.
- "description" — translate.`,
    schema: {
      name: {
        name: 'submit_translation',
        description: 'Submit translated fleet overlay.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            tagline: { type: 'string' },
            dispatch: { type: 'string' },
            description: { type: 'string' },
            best_known_for: { type: 'string' },
          },
          required: ['description'],
        },
      },
    },
  },
};

async function translate(client, surface, locale, payload) {
  const cfg = TOOLS[surface];
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: cfg.system,
    tools: [cfg.schema.name],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [
      {
        role: 'user',
        content: `Translate the following ${surface} overlay into ${NAMES[locale]} (${locale}). Output via the submit_translation tool.\n\nSource (en-US):\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use block');
  return block.input;
}

function findGaps() {
  // Returns flat list of {surface, relPath, srcAbs, payload}.
  const gaps = [];
  function walk(relDir) {
    const enAbs = path.join(I18N, 'en-US', relDir);
    if (!fs.existsSync(enAbs)) return;
    for (const entry of fs.readdirSync(enAbs, { withFileTypes: true })) {
      const rel = path.join(relDir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!entry.name.endsWith('.json')) continue;
      // Determine surface from top-level dir
      const surface = relDir.split(path.sep)[0];
      if (!TOOLS[surface]) continue; // unsupported — skip silently
      const srcAbs = path.join(enAbs, entry.name);
      // Source must be parseable
      let payload;
      try {
        payload = JSON.parse(fs.readFileSync(srcAbs, 'utf8'));
      } catch {
        continue;
      }
      // Check each locale
      for (const loc of LOCALES) {
        const dst = path.join(I18N, loc, rel);
        if (fs.existsSync(dst)) {
          try {
            const existing = JSON.parse(fs.readFileSync(dst, 'utf8'));
            if (existing && Object.keys(existing).length > 0) continue;
          } catch {
            // existing overlay unreadable — treat as a gap to re-fill
          }
        }
        gaps.push({ surface, locale: loc, rel, dst, payload });
      }
    }
  }
  for (const s of Object.keys(TOOLS)) walk(s);
  return gaps;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const gaps = findGaps();
  console.log(`Found ${gaps.length} translation gaps across ${LOCALES.length} locales.`);
  if (gaps.length === 0) {
    console.log('Nothing to do.');
    return;
  }
  let ok = 0,
    fail = 0;
  for (const g of gaps) {
    process.stdout.write(`  [${g.surface}] ${g.rel} → ${g.locale}... `);
    try {
      const tr = await translate(client, g.surface, g.locale, g.payload);
      fs.mkdirSync(path.dirname(g.dst), { recursive: true });
      fs.writeFileSync(g.dst, JSON.stringify(tr, null, 2) + '\n', 'utf8');
      process.stdout.write('ok\n');
      ok++;
    } catch (err) {
      process.stdout.write(`FAIL ${err.message}\n`);
      fail++;
    }
  }
  console.log(`\nDone: ok=${ok} fail=${fail}`);
}

main();
