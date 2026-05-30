// Pipeline 2 (PRD-016 / RFC-019 §5.1) — TtsProvider audio generation.
// Reads content/episodes/{locale}/{id}.md → writes
//   static/audio/{locale}/{persona}/{id}.{hash8}.mp3 + .vtt + .txt
// via the TtsProvider selected by TTS_PROVIDER (default: google).
//
// Cache: SHA-256(provider + voiceId + ssml). Identical input never re-generates;
// the existing `.{hash8}.mp3` is reused and the cost-ledger gets a `cached` row.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';

import { GoogleTtsProvider } from './tts/google';
import { ElevenLabsTtsProvider } from './tts/elevenlabs';
import type { Persona, ProviderName, TtsProvider } from './tts/provider';
import { appendEntry, THRESHOLDS } from './cost-ledger';
import { recordProvenance, type TextAuthorship } from './provenance';

// Default text-authorship classification for the v0.7 corpus.
// The 8 Atmospheric Moves + Guide screen episodes en-US are first drafts
// by Claude (Opus 4.7), to be edited by Marko before final ship. Translated
// locales get 'claude-translated' downstream when S2 lands. Override via
// frontmatter `text_authorship` per-script if a piece is human-authored.
const DEFAULT_TEXT_AUTHORSHIP: TextAuthorship = 'claude-drafted';
const DEFAULT_TEXT_AUTHOR_MODEL = 'claude-opus-4-7';

const PROVIDER_MODELS: Record<ProviderName, string> = {
  google: 'neural2',
  elevenlabs: 'eleven_multilingual_v2',
  openai: 'tts-1',
  azure: 'neural',
  'coqui-local': 'xtts-v2',
};

const PROVIDER_NAMES: readonly ProviderName[] = [
  'google',
  'elevenlabs',
  'openai',
  'azure',
  'coqui-local',
];

function isProviderName(s: string): s is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(s);
}

// Node 20.6+ — load .env into process.env before anything reads it.
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    /* no .env — fall back to ambient */
  }
}

type EpisodeMeta = {
  id: string;
  persona: Persona;
  locale: string;
  route?: string;
  context?: string;
  title?: string;
  duration_target_sec?: number;
  text_authorship?: TextAuthorship;
  text_author_model?: string;
};

interface VoiceRef {
  voiceId: string;
  model: string;
}

type VoicesFile = {
  schema_version: 1;
  generated_at: string;
  providers: Partial<Record<ProviderName, Record<string, Record<Persona, VoiceRef>>>>;
};

function parseFrontmatter(raw: string): { meta: EpisodeMeta; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('episode script missing YAML frontmatter');
  const [, fm, body] = m;
  const meta = {} as Record<string, string | number>;
  for (const line of fm.split(/\r?\n/)) {
    // Ignore blanks + YAML comments.
    if (!line.trim() || line.trim().startsWith('#')) continue;
    // Reject the YAML edge cases we know we don't support — lists,
    // multi-line block scalars, nested maps — so a silently-dropped
    // field can't masquerade as "the parser accepted it". See
    // content/episodes/README.md for the supported frontmatter set.
    if (/^\s+/.test(line)) {
      throw new Error(
        `frontmatter contains indented line — multi-line scalars and nested maps are not supported by the lightweight parser. Use a flat key: value pair. Got: '${line}'`,
      );
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) continue;
    const k = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) continue;
    if (
      rest.startsWith('[') ||
      rest.startsWith('{') ||
      rest.startsWith('|') ||
      rest.startsWith('>')
    ) {
      throw new Error(`frontmatter key '${k}' uses an unsupported YAML form ('${rest[0]}')`);
    }
    // Strip surrounding matching quotes.
    let v = rest;
    const quoted = v.match(/^(['"])(.*)\1$/);
    if (quoted) v = quoted[2];
    // Numeric (incl. signed + decimals) when the whole token is numeric.
    if (/^-?\d+(\.\d+)?$/.test(v)) {
      meta[k] = Number(v);
    } else {
      meta[k] = v;
    }
  }
  return { meta: meta as unknown as EpisodeMeta, body: body.trim() };
}

function pickProvider(name: ProviderName): TtsProvider {
  switch (name) {
    case 'google':
      // GOOGLE_APPLICATION_CREDENTIALS env var is checked inside the
      // constructor; the SDK handles OAuth from the JSON automatically.
      return new GoogleTtsProvider();
    case 'elevenlabs': {
      const key = process.env.ELEVENLABS_API_KEY;
      if (!key) {
        throw new Error(
          'ELEVENLABS_API_KEY is not set; add it to .env. Get a key at https://elevenlabs.io/app/settings/api-keys.',
        );
      }
      return new ElevenLabsTtsProvider(key);
    }
    default:
      throw new Error(`provider '${name}' not implemented yet (see issues #153 / #219).`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      episode: { type: 'string' },
      locale: { type: 'string', default: 'en-US' },
      provider: { type: 'string' },
    },
  });

  if (!values.episode) {
    console.error(
      'usage: npm run audio:generate -- --episode <episode-id> [--locale <bcp47>] [--provider google|elevenlabs]',
    );
    process.exit(2);
  }
  const episodeId = values.episode;
  const locale = values.locale ?? 'en-US';

  const scriptPath = join('content', 'episodes', locale, `${episodeId}.md`);
  if (!existsSync(scriptPath)) {
    console.error(`script not found: ${scriptPath}`);
    process.exit(2);
  }

  const { meta, body } = parseFrontmatter(readFileSync(scriptPath, 'utf-8'));
  if (meta.id !== episodeId) {
    console.warn(`warning: frontmatter id '${meta.id}' does not match filename '${episodeId}'`);
  }
  const persona = meta.persona;
  if (!persona || !['curator', 'guide', 'enthusiast'].includes(persona)) {
    throw new Error(`frontmatter persona must be curator|guide|enthusiast (got: ${persona})`);
  }

  // Resolve provider + voice. CLI --provider beats TTS_PROVIDER env beats default.
  const providerArg = values.provider ?? process.env.TTS_PROVIDER ?? 'google';
  if (!isProviderName(providerArg)) {
    throw new Error(
      `unknown provider '${providerArg}'. Must be one of: ${PROVIDER_NAMES.join(', ')}.`,
    );
  }
  const providerName: ProviderName = providerArg;
  const voices = JSON.parse(
    readFileSync(join('static', 'data', 'audio', 'voices.json'), 'utf-8'),
  ) as VoicesFile;
  const voiceRef = voices.providers[providerName]?.[locale]?.[persona];
  if (!voiceRef) {
    throw new Error(
      `no voice mapping in voices.json for providers.${providerName}.${locale}.${persona}`,
    );
  }

  const ssml = body;
  const hash = createHash('sha256')
    .update(`${providerName}:${voiceRef.voiceId}:${ssml}`)
    .digest('hex')
    .slice(0, 8);

  const outDir = join('static', 'audio', locale, persona);
  const baseName = `${episodeId}.${hash}`;
  const mp3Path = join(outDir, `${baseName}.mp3`);
  const vttPath = join(outDir, `${baseName}.vtt`);
  const txtPath = join(outDir, `${baseName}.txt`);
  const publicMp3 = `/audio/${locale}/${persona}/${baseName}.mp3`;
  const publicVtt = `/audio/${locale}/${persona}/${baseName}.vtt`;
  const publicTxt = `/audio/${locale}/${persona}/${baseName}.txt`;

  const textAuthorship: TextAuthorship = meta.text_authorship ?? DEFAULT_TEXT_AUTHORSHIP;
  const textAuthorModel = meta.text_author_model ?? DEFAULT_TEXT_AUTHOR_MODEL;
  const ttsModel = PROVIDER_MODELS[providerName];
  if (!ttsModel) {
    throw new Error(`PROVIDER_MODELS missing model id for '${providerName}'`);
  }

  // Forward editorial metadata from frontmatter into the provenance record so
  // the runtime AudioOverlay can filter "episodes for this screen" + render
  // titles without re-parsing markdown.
  const provenanceMetaCommon = {
    route: meta.route,
    context: meta.context,
    title: meta.title,
    duration_target_sec: meta.duration_target_sec,
  };

  // Cache hit — skip generation, log a `cached` row in the ledger.
  if (existsSync(mp3Path) && existsSync(vttPath) && existsSync(txtPath)) {
    const txt = readFileSync(txtPath, 'utf-8');
    // Cached rows: zero billable_chars + zero cost. The point of the
    // ledger is to count what we actually paid for; cached re-uses
    // burn 0 chars.
    appendEntry({
      ts: new Date().toISOString(),
      provider: providerName,
      locale,
      persona,
      episode_id: episodeId,
      chars: 0,
      cost_usd: 0,
      voice_id: voiceRef.voiceId,
      status: 'cached',
    });
    recordProvenance({
      episode_id: episodeId,
      locale,
      persona,
      provider: providerName,
      voice_id: voiceRef.voiceId,
      tts_model: ttsModel,
      ...provenanceMetaCommon,
      path_mp3: publicMp3,
      path_vtt: publicVtt,
      path_txt: publicTxt,
      chars: txt.length,
      generated_at: new Date().toISOString(),
      text_authorship: textAuthorship,
      text_author_model: textAuthorModel,
    });
    console.log(`✓ ${baseName}.mp3 — cache hit (no API call, $0)`);
    return;
  }

  const provider = pickProvider(providerName);
  console.log(
    `generating ${episodeId} for ${locale}/${persona} via ${providerName} (${voiceRef.voiceId})…`,
  );
  const output = await provider.generate({
    ssml,
    voiceId: voiceRef.voiceId,
    locale,
    persona,
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(mp3Path, output.audio);
  writeFileSync(vttPath, output.captions);
  writeFileSync(txtPath, output.transcript);

  // Ledger gets billable_chars (provider-specific — Google counts SSML,
  // ElevenLabs counts transcript). Provenance gets transcript chars
  // (stable human-readable size, comparable across providers).
  const breach = appendEntry({
    ts: new Date().toISOString(),
    provider: providerName,
    locale,
    persona,
    episode_id: episodeId,
    chars: output.billable_chars,
    cost_usd: output.cost_usd,
    voice_id: voiceRef.voiceId,
    status: 'success',
  });

  recordProvenance({
    episode_id: episodeId,
    locale,
    persona,
    provider: providerName,
    voice_id: voiceRef.voiceId,
    tts_model: ttsModel,
    ...provenanceMetaCommon,
    path_mp3: publicMp3,
    path_vtt: publicVtt,
    path_txt: publicTxt,
    chars: output.chars,
    generated_at: new Date().toISOString(),
    text_authorship: textAuthorship,
    text_author_model: textAuthorModel,
  });

  const kb = (output.audio.byteLength / 1024).toFixed(1);
  console.log(
    `✓ ${baseName}.mp3 (${kb} KB · ${output.chars} transcript chars · ${output.billable_chars} billable chars · $${output.cost_usd.toFixed(4)})`,
  );
  console.log(
    `  month total: $${breach.monthTotal.toFixed(4)} / soft $${THRESHOLDS.soft} / hard $${THRESHOLDS.hard}`,
  );
  if (breach.hard) {
    console.error('✗ HARD threshold breached — pipeline halts.');
    process.exit(1);
  }
  if (breach.soft) {
    console.warn('⚠ soft threshold breached.');
  }
}

main().catch((err: unknown) => {
  console.error('✗', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
