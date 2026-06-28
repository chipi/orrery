#!/usr/bin/env node
/**
 * translate-science-sections — Phase 3 of the science-cards sweep.
 *
 * Walks every en-US overlay file that contains `science_sections`,
 * extracts the per-card `why` strings, and translates them to all 13
 * target locales via the Anthropic Haiku 4.5 API. Writes the
 * translated `science_sections` arrays into each locale's overlay
 * file (creating it + the locale dir if missing).
 *
 * One API call per (body, target_locale) — translates all of that
 * body's why strings in a single call returning a JSON array.
 *
 * Run: ANTHROPIC_API_KEY=… node --env-file=.env scripts/translate-science-sections.mjs
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

const TARGET_LOCALES = [
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'zh-CN', name: 'Simplified Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pt-BR', name: 'Brazilian Portuguese' },
  { code: 'ko', name: 'Korean' },
  { code: 'sr-Cyrl', name: 'Serbian (Cyrillic)' },
];

const SURFACES = ['planets', 'satellites', 'small-bodies', 'belts'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function collectEnUS() {
  const out = [];
  for (const surface of SURFACES) {
    const dir = `static/data/i18n/en-US/${surface}`;
    if (!existsSync(dir)) continue;
    for (const fname of readdirSync(dir)) {
      if (!fname.endsWith('.json')) continue;
      const id = fname.slice(0, -5);
      const json = JSON.parse(readFileSync(`${dir}/${fname}`, 'utf8'));
      if (Array.isArray(json.science_sections) && json.science_sections.length > 0) {
        out.push({ surface, id, sections: json.science_sections });
      }
    }
  }
  const sunPath = 'static/data/i18n/en-US/sun.json';
  if (existsSync(sunPath)) {
    const json = JSON.parse(readFileSync(sunPath, 'utf8'));
    if (Array.isArray(json.science_sections) && json.science_sections.length > 0) {
      out.push({ surface: 'sun', id: null, sections: json.science_sections });
    }
  }
  return out;
}

async function translateBody(sections, targetLocale) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const whys = sections.map((s) => s.why).filter(Boolean);
  if (whys.length === 0) return sections.map((s) => ({ tab: s.tab, section: s.section }));

  const userPrompt = `Translate this JSON array of short astronomy / spaceflight context sentences from English into ${targetLocale.name}. These appear above science-card titles on a space-data website, so the tone should be precise and informative — not marketing. Preserve numbers, units, dates, body names, and acronyms (NASA, ESA, JAXA, ISRO, AU, K, km) verbatim. Keep each translation roughly the same length as the source. Output ONLY a JSON array of strings, same length and order as input. No prose, no markdown.

Input:
${JSON.stringify(whys, null, 2)}`;

  const body = {
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: userPrompt }],
  };

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'anthropic-version': '2023-06-01',
        'User-Agent': UA,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`  HTTP ${res.status}: ${text.slice(0, 100)}`);
      return null;
    }
    const json = await res.json();
    const reply = json?.content?.[0]?.text ?? '';
    const match = reply.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error(`  unparseable: ${reply.slice(0, 120)}`);
      return null;
    }
    const translated = JSON.parse(match[0]);
    if (!Array.isArray(translated) || translated.length !== whys.length) {
      console.error(`  length mismatch: got ${translated.length} expected ${whys.length}`);
      return null;
    }
    let i = 0;
    return sections.map((s) => {
      const out = { tab: s.tab, section: s.section };
      if (s.why) out.why = translated[i++];
      return out;
    });
  } catch (e) {
    console.error(`  error: ${e.message}`);
    return null;
  }
}

function writeLocaleOverlay(surface, id, locale, science_sections) {
  if (surface === 'sun') {
    const path = `static/data/i18n/${locale}/sun.json`;
    let json = {};
    if (existsSync(path)) json = JSON.parse(readFileSync(path, 'utf8'));
    json.science_sections = science_sections;
    writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
    return path;
  }
  const dir = `static/data/i18n/${locale}/${surface}`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = `${dir}/${id}.json`;
  let json = {};
  if (existsSync(path)) json = JSON.parse(readFileSync(path, 'utf8'));
  json.science_sections = science_sections;
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
  return path;
}

async function main() {
  const bodies = collectEnUS();
  console.log(`Found ${bodies.length} en-US overlays with science_sections`);
  console.log(
    `Translating to ${TARGET_LOCALES.length} locales — ${bodies.length * TARGET_LOCALES.length} API calls\n`,
  );

  const stats = { ok: 0, fail: 0 };
  const failures = [];
  const t0 = Date.now();

  for (const body of bodies) {
    const label = body.surface === 'sun' ? 'sun' : `${body.surface}/${body.id}`;
    console.log(`\n[${label}] ${body.sections.length} sections`);
    for (const locale of TARGET_LOCALES) {
      const translated = await translateBody(body.sections, locale);
      if (translated) {
        const path = writeLocaleOverlay(body.surface, body.id, locale.code, translated);
        console.log(`  OK ${locale.code.padEnd(8)} -> ${path}`);
        stats.ok++;
      } else {
        console.log(`  FAIL ${locale.code.padEnd(8)} -- translation failed`);
        stats.fail++;
        failures.push(`${label}/${locale.code}`);
      }
      await sleep(120);
    }
  }

  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\ndone in ${dur}s -- ${stats.ok} ok / ${stats.fail} failed`);
  if (failures.length) {
    console.log(`failures:`);
    failures.forEach((f) => console.log(`  ${f}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
