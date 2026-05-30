// audio-provenance.json append helper (PRD-016 / RFC-019 §5.4).
// Mirrors the image-provenance pattern (ADR-047); per-asset attribution
// surfaced on /credits + enforced by validate-data.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PATH = join('static', 'data', 'audio', 'audio-provenance.json');

export type TextAuthorship =
  | 'claude-drafted'
  | 'claude-translated'
  | 'human-authored'
  | 'human-edited-claude-draft';

export interface ProvenanceEntry {
  episode_id: string;
  locale: string;
  persona: 'curator' | 'guide' | 'enthusiast';
  provider: 'google' | 'elevenlabs' | 'openai' | 'azure' | 'coqui-local';
  voice_id: string;
  tts_model?: string;
  route?: string;
  context?: string;
  title?: string;
  duration_target_sec?: number;
  path_mp3: string;
  path_vtt: string;
  path_txt: string;
  chars: number;
  generated_at: string;
  text_authorship: TextAuthorship;
  text_author_model?: string;
}

interface Manifest {
  schema_version: 1;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: ProvenanceEntry[];
}

const SCRIPT_VERSION = 'scripts/audio/generate@0.1.0';

function load(): Manifest {
  if (!existsSync(PATH)) {
    return {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      script_version: SCRIPT_VERSION,
      commit_sha: null,
      entries: [],
    };
  }
  return JSON.parse(readFileSync(PATH, 'utf-8')) as Manifest;
}

function save(m: Manifest): void {
  writeFileSync(PATH, JSON.stringify(m, null, 2) + '\n');
}

export function recordProvenance(entry: ProvenanceEntry): void {
  const m = load();
  // Replace any existing entry for the same (episode_id, locale, persona)
  // so re-generation overwrites rather than duplicates.
  const idx = m.entries.findIndex(
    (e) =>
      e.episode_id === entry.episode_id && e.locale === entry.locale && e.persona === entry.persona,
  );
  if (idx >= 0) {
    m.entries[idx] = entry;
  } else {
    m.entries.push(entry);
  }
  m.generated_at = new Date().toISOString();
  m.script_version = SCRIPT_VERSION;
  save(m);
}
