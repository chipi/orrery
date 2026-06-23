/**
 * Final i18n gap-fill — fleet/* + missions/* overlays the universal
 * gap-fill missed (its TOOLS map only covered earth-objects, planets,
 * science). Closes the last 42 untranslated files across 13 locales.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-fleet-missions-gaps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const I18N = path.join(ROOT, 'static/data/i18n');
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

const SYSTEM_FLEET = `Translate Orrery fleet-entry editorial content.

CRITICAL:
- Keep proper nouns: spacecraft, mission, agency, company names (GPS, GLONASS, Galileo, BeiDou, Starlink, Hayabusa, etc.).
- Preserve numbers, units, dates, symbols (km, °, ≈, %, em-dash —).
- Keep universal acronyms untranslated: GNSS, LEO, MEO, GEO, HEO, L2, ISS, NASA, ESA, JAXA, CNSA, ISRO, ROSCOSMOS, SpaceX, USSF.
- Match the en-US tone: concise but precise.`;

const SYSTEM_MISSION = `Translate Orrery mission editorial content.

CRITICAL:
- Keep proper nouns: spacecraft, mission, agency, person, place names.
- Preserve numbers, units, dates, Unicode symbols.
- "events" is an array of timeline events with {met, label, note, type} — translate label + note ONLY; keep met + type verbatim.
- Match the en-US tone.`;

const FLEET_TOOL = {
  name: 'submit_fleet',
  description: 'Submit translated fleet entry. Same keys as input.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      tagline: { type: 'string' },
      description: { type: 'string' },
      best_known_for: { type: 'string' },
    },
    required: ['name', 'description'],
  },
};

const MISSION_TOOL = {
  name: 'submit_mission',
  description: 'Submit translated mission entry. Same keys + events shape as input.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      type: { type: 'string' },
      first: { type: 'string' },
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
          required: ['met', 'label', 'type'],
        },
      },
    },
    required: ['name', 'description'],
  },
};

async function translate(client, system, tool, locale, overlay) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
    messages: [
      {
        role: 'user',
        content: `Translate into ${NAMES[locale]} (${locale}). Output via the tool.\n\n${JSON.stringify(overlay, null, 2)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use block');
  return block.input;
}

function findGaps(prefix) {
  const enRoot = path.join(I18N, 'en-US', prefix);
  if (!fs.existsSync(enRoot)) return [];
  function walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(p));
      else if (e.name.endsWith('.json')) out.push(p);
    }
    return out;
  }
  const enFiles = walk(enRoot).map((p) => p.slice(path.join(I18N, 'en-US').length + 1));
  const gaps = [];
  for (const rel of enFiles) {
    for (const loc of LOCALES) {
      const dst = path.join(I18N, loc, rel);
      if (fs.existsSync(dst)) {
        try {
          const j = JSON.parse(fs.readFileSync(dst, 'utf8'));
          if (j && Object.keys(j).length > 0) continue;
        } catch {
          // existing overlay unreadable — treat as a gap to re-fill
        }
      }
      gaps.push({ rel, locale: loc, dst });
    }
  }
  return gaps;
}

async function runPrefix(client, prefix, system, tool) {
  const gaps = findGaps(prefix);
  console.log(`\n=== ${prefix} — ${gaps.length} gaps ===`);
  let ok = 0,
    fail = 0;
  for (const g of gaps) {
    const srcAbs = path.join(I18N, 'en-US', g.rel);
    const overlay = JSON.parse(fs.readFileSync(srcAbs, 'utf8'));
    process.stdout.write(`  [${g.locale}] ${g.rel}... `);
    try {
      const tr = await translate(client, system, tool, g.locale, overlay);
      fs.mkdirSync(path.dirname(g.dst), { recursive: true });
      fs.writeFileSync(g.dst, JSON.stringify(tr, null, 2) + '\n', 'utf8');
      process.stdout.write('ok\n');
      ok++;
    } catch (err) {
      process.stdout.write(`FAIL ${err.message}\n`);
      fail++;
    }
  }
  return [ok, fail];
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let totalOk = 0,
    totalFail = 0;
  for (const prefix of ['fleet']) {
    const [ok, fail] = await runPrefix(client, prefix, SYSTEM_FLEET, FLEET_TOOL);
    totalOk += ok;
    totalFail += fail;
  }
  for (const prefix of ['missions']) {
    const [ok, fail] = await runPrefix(client, prefix, SYSTEM_MISSION, MISSION_TOOL);
    totalOk += ok;
    totalFail += fail;
  }
  console.log(`\nDone: ok=${totalOk} fail=${totalFail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
