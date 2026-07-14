/**
 * Universal gap-fill translator (#354 — Marko: "if you see anything
 * else not translated, translate them as well").
 *
 * Walks the i18n overlay tree under i18n-src/en-US/ and for
 * every JSON file missing from any of the 13 non-en-US locales, runs
 * a translation via the Anthropic Haiku API (bulk i18n tier, per AGENTS.md
 * §i18n) and writes the locale overlay. Each result is validated against the
 * same JSON schema validate-data enforces, with retry — invalid output (wrong
 * shape, dropped field, over-length) is never written.
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
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(import.meta.dirname, '..');
// i18n overlay source moved out of static/ (ADR-079 D2 / #377).
const I18N = path.join(ROOT, 'i18n-src');

// Validate each translation against the SAME JSON schema validate-data enforces,
// so we never write a schema-invalid overlay (wrong shape, dropped required
// field, or a translation that overflows a maxLength cap). Keyed by translator
// surface; `science-intro` is the `_intro.json` tab lead-in (a distinct shape).
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const SCHEMA_DIR = path.join(ROOT, 'static', 'data', 'schemas');
const SCHEMA_BY_SURFACE = {
  'earth-objects': 'earth-object-overlay.schema.json',
  planets: 'planet-overlay.schema.json',
  science: 'science-section-overlay.schema.json',
  'science-intro': 'science-tab-intro.schema.json',
  missions: 'mission-overlay.schema.json',
  fleet: 'fleet-overlay.schema.json',
  'moon-sites': 'surface-site-overlay.schema.json',
  'mars-sites': 'surface-site-overlay.schema.json',
};
const VALIDATORS = {};
const _validatorCache = {};
for (const [surface, file] of Object.entries(SCHEMA_BY_SURFACE)) {
  const p = path.join(SCHEMA_DIR, file);
  if (!fs.existsSync(p)) continue;
  // Compile each schema file once — moon-sites + mars-sites share one schema,
  // and ajv rejects registering the same $id twice.
  if (!_validatorCache[file])
    _validatorCache[file] = ajv.compile(JSON.parse(fs.readFileSync(p, 'utf8')));
  VALIDATORS[surface] = _validatorCache[file];
}

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
- "formula_caption", "see_also", "references" — pass through arrays verbatim where applicable.
- LENGTH: "intro_sentence" MUST stay under 240 characters — be concise, trim filler rather than overflow.`,
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
  'science-intro': {
    system:
      SYSTEM_BASE +
      `
- This is a /science TAB intro (the _intro.json lead-in): a "headline" plus a "paragraphs" array (1–5 items).
- Preserve inline link syntax exactly: [text](tab/section) and [text](app:/route) — translate only the bracket text, keep the (parenthesis) target verbatim.
- LENGTH: "headline" MUST stay under 160 characters — be concise.`,
    schema: {
      name: {
        name: 'submit_translation',
        description: 'Submit translated science tab intro (headline + paragraphs).',
        input_schema: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            paragraphs: { type: 'array', items: { type: 'string' } },
          },
          required: ['headline', 'paragraphs'],
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

// Moon/Mars surface-site overlays share one schema (surface-site-overlay).
const SITE_TOOL = {
  system:
    SYSTEM_BASE +
    `
- "name" — mission/site proper name; keep verbatim unless commonly localised.
- "mission_type" — a short kind label (e.g. "Uncrewed Soft Lander", "Active Orbiter"); translate the words.
- "site_name" — a surface location ("Jezero Crater") or, for orbiters, an orbit description; translate descriptive words, keep proper place names.
- "crew" (optional array) — astronaut/cosmonaut names; keep each name verbatim, preserve count + order.
- "left" (optional) — hardware left at the site; translate.
- "fact" + "capability" — editorial prose; translate fully.`,
  schema: {
    name: {
      name: 'submit_translation',
      description: 'Submit translated surface-site overlay.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          mission_type: { type: 'string' },
          site_name: { type: 'string' },
          crew: { type: 'array', items: { type: 'string' } },
          left: { type: 'string' },
          fact: { type: 'string' },
          capability: { type: 'string' },
        },
        required: ['name', 'mission_type', 'fact'],
      },
    },
  },
};
TOOLS['moon-sites'] = SITE_TOOL;
TOOLS['mars-sites'] = SITE_TOOL;

async function callModel(client, model, cfg, surface, locale, payload, corrections) {
  const r = await client.messages.create({
    model,
    max_tokens: 8192,
    system: cfg.system,
    tools: [withArrayCounts(cfg.schema.name, payload)],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [
      {
        role: 'user',
        content:
          `Translate the following ${surface} overlay into ${NAMES[locale]} (${locale}). Output via the submit_translation tool.` +
          (corrections
            ? `\n\nYour previous attempt was REJECTED. Fix exactly these problems and resubmit:\n${corrections}`
            : '') +
          `\n\nSource (en-US):\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use block');
  return block.input;
}

// Pin each array field's length to the source's, per call — this makes the tool
// schema prescriptive enough that the model reliably emits a real array of N
// items (instead of collapsing paragraphs into one joined string).
function withArrayCounts(tool, payload) {
  const t = JSON.parse(JSON.stringify(tool));
  const props = (t.input_schema && t.input_schema.properties) || {};
  for (const [k, v] of Object.entries(props)) {
    if (v.type === 'array' && Array.isArray(payload[k])) {
      v.minItems = payload[k].length;
      v.maxItems = payload[k].length;
    }
  }
  return t;
}

// Models sometimes return an array/object field as a JSON-encoded STRING
// (e.g. narrative_101: "[\"a\", \"b\"]") rather than a real array — the content
// is right, the shape is wrapped. Parse those back into real values so the
// output validates. Safe: only replaces strings that parse to array/object.
function coerceStringifiedJson(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.startsWith('[') || t.startsWith('{')) {
        try {
          const parsed = JSON.parse(t);
          if (parsed && typeof parsed === 'object') obj[k] = parsed;
        } catch {
          /* not JSON — leave as-is */
        }
      }
    }
  }
  return obj;
}

// Turn ajv errors into concrete, actionable instructions the model can act on —
// especially length caps (give the exact limit) and array shape.
function summarizeErrors(errors) {
  return errors
    .slice(0, 8)
    .map((e) => {
      const field = e.instancePath || '(root)';
      if (e.keyword === 'maxLength')
        return `• "${field}" is too long — it MUST be ${e.params.limit} characters or fewer. Produce a shorter translation: drop a clause or a non-essential detail rather than exceed the cap.`;
      if (e.keyword === 'minLength') return `• "${field}" must not be empty.`;
      if (e.keyword === 'type' && e.params?.type === 'array')
        return `• "${field}" MUST be a JSON array of strings (one string per paragraph/item) — not a single joined string.`;
      if (e.keyword === 'required')
        return `• missing required field "${e.params.missingProperty}".`;
      if (e.keyword === 'additionalProperties')
        return `• remove the unexpected field "${e.params.additionalProperty}".`;
      return `• "${field}" ${e.message}.`;
    })
    .join('\n');
}

// Translate + validate against the real schema, retrying with concrete
// correction instructions. Haiku is the bulk workhorse; the retries ESCALATE to
// Sonnet for the hard cases Haiku can't satisfy (verbose-language length caps,
// array shape) — per AGENTS.md §i18n (Haiku default, Sonnet for the hard bits).
// Throws only if still invalid after the full ladder — caller skips the write.
const MODEL_LADDER = [
  'claude-haiku-4-5',
  'claude-haiku-4-5',
  'claude-sonnet-4-5',
  'claude-sonnet-4-5',
];

// Translate one string in isolation — the atomic unit the model never collapses.
async function translateString(client, text, locale) {
  const r = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: SYSTEM_BASE,
    tools: [
      {
        name: 'submit',
        description: 'Return the single translated string.',
        input_schema: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit' },
    messages: [
      {
        role: 'user',
        content: `Translate this single string into ${NAMES[locale]} (${locale}). Return it via the submit tool, translation only.\n\n${JSON.stringify(text)}`,
      },
    ],
  });
  const b = r.content.find((x) => x.type === 'tool_use');
  if (!b) throw new Error('no tool_use (string)');
  return b.input.text;
}

// A mission event object: translate label + note, pass met/type through verbatim.
async function translateEvent(client, ev, locale) {
  const out = { ...ev };
  if (typeof ev.label === 'string') out.label = await translateString(client, ev.label, locale);
  if (typeof ev.note === 'string') out.note = await translateString(client, ev.note, locale);
  return out;
}

// Repair pass: for any array field the model kept collapsing into a joined
// string, rebuild it element-wise from the source — guarantees the right shape
// AND item count. Strings translate atomically; event objects keep met/type.
async function repairArrays(client, out, locale, payload) {
  const fixed = { ...out };
  for (const [k, srcVal] of Object.entries(payload)) {
    if (!Array.isArray(srcVal)) continue;
    if (Array.isArray(fixed[k]) && fixed[k].length === srcVal.length) continue; // already fine
    const items = [];
    for (const item of srcVal) {
      items.push(
        typeof item === 'string'
          ? await translateString(client, item, locale)
          : await translateEvent(client, item, locale),
      );
    }
    fixed[k] = items;
  }
  return fixed;
}

// Rewrite an over-length string field to fit its cap — same language, keep the
// key facts, drop a clause if needed. Sonnet, since concise-yet-faithful is hard.
async function shortenString(client, text, locale, limit) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: SYSTEM_BASE,
    tools: [
      {
        name: 'submit',
        description: 'Return the shortened string.',
        input_schema: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit' },
    messages: [
      {
        role: 'user',
        content: `Rewrite this ${NAMES[locale]} text so it is at most ${limit} characters (it is currently ${text.length}). Keep the essential meaning; drop a clause or a non-essential detail. Same language, no quotes added. Return via the submit tool.\n\n${JSON.stringify(text)}`,
      },
    ],
  });
  const b = r.content.find((x) => x.type === 'tool_use');
  const out = b && b.input && typeof b.input.text === 'string' ? b.input.text : text;
  return out.length <= limit ? out : out.slice(0, limit); // hard-cap as last resort
}

// Repair pass for maxLength violations on scalar string fields.
async function repairLengths(client, out, locale, errors) {
  const fixed = { ...out };
  for (const e of errors) {
    if (e.keyword !== 'maxLength' || !e.instancePath) continue;
    const field = e.instancePath.replace(/^\//, '');
    if (typeof fixed[field] !== 'string') continue;
    fixed[field] = await shortenString(client, fixed[field], locale, e.params.limit);
  }
  return fixed;
}

async function translate(client, surface, locale, payload) {
  const cfg = TOOLS[surface];
  const validate = VALIDATORS[surface];
  let corrections = null;
  let lastOut = null;
  for (let i = 0; i < MODEL_LADDER.length; i++) {
    lastOut = coerceStringifiedJson(
      await callModel(client, MODEL_LADDER[i], cfg, surface, locale, payload, corrections),
    );
    if (!validate || validate(lastOut)) return lastOut;
    corrections = summarizeErrors(validate.errors);
  }
  // Inline ladder exhausted — repair. First rebuild collapsed array fields
  // element-wise; then, if any string field still overflows its maxLength cap
  // (common for verbose target languages), rewrite that field shorter.
  let repaired = await repairArrays(client, lastOut, locale, payload);
  if (validate && !validate(repaired)) {
    repaired = await repairLengths(client, repaired, locale, validate.errors);
  }
  if (!validate || validate(repaired)) return repaired;
  throw new Error(`schema-invalid after ladder+repair: ${summarizeErrors(validate.errors)}`);
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
      // Determine surface from top-level dir; science/_intro.json is a distinct
      // shape (headline + paragraphs) validated by science-tab-intro.schema.
      const topSurface = relDir.split(path.sep)[0];
      if (!TOOLS[topSurface]) continue; // unsupported — skip silently
      const surface =
        topSurface === 'science' && entry.name === '_intro.json' ? 'science-intro' : topSurface;
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
    fail = 0,
    done = 0;
  const total = gaps.length;
  // Concurrency pool — the API tolerates parallel calls; sequential was ~30s/item
  // (≈14 h for 1600 gaps). 6-wide finishes in a fraction of that, same cost.
  const CONCURRENCY = 6;
  let cursor = 0;
  async function worker() {
    while (cursor < gaps.length) {
      const g = gaps[cursor++];
      try {
        const tr = await translate(client, g.surface, g.locale, g.payload);
        fs.mkdirSync(path.dirname(g.dst), { recursive: true });
        fs.writeFileSync(g.dst, JSON.stringify(tr, null, 2) + '\n', 'utf8');
        ok++;
        console.log(`  [${g.surface}] ${g.rel} → ${g.locale}... ok (${++done}/${total})`);
      } catch (err) {
        fail++;
        console.log(
          `  [${g.surface}] ${g.rel} → ${g.locale}... FAIL ${err.message} (${++done}/${total})`,
        );
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, gaps.length) }, worker));
  console.log(`\nDone: ok=${ok} fail=${fail}`);
}

main();
