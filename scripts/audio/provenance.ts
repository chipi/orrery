// audio-provenance.json append helper (PRD-016 / RFC-019 §5.4).
// Mirrors the image-provenance pattern (ADR-047); per-asset attribution
// surfaced on /credits + enforced by validate-data.

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const PATH = join('static', 'data', 'audio', 'audio-provenance.json');

// TextAuthorship / Persona / ProviderName literal unions live in
// src/lib/audio-types.ts as the single source of truth.
export type { TextAuthorship } from '../../src/lib/audio-types';
import type { TextAuthorship, Persona, ProviderName } from '../../src/lib/audio-types';

export interface ProvenanceEntry {
  episode_id: string;
  locale: string;
  persona: Persona;
  provider: ProviderName;
  voice_id: string;
  tts_model: string;
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
  // Atomic write — crash mid-write leaves the prior valid manifest
  // rather than truncating the file the runtime registry reads from.
  const tmp = `${PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2) + '\n');
  renameSync(tmp, PATH);
}

function isStructurallyEqual(a: ProvenanceEntry, b: ProvenanceEntry): boolean {
  // Compare every field except `generated_at` — re-running the same
  // provider on unchanged input is a no-op and shouldn't churn the
  // manifest's top-level generated_at timestamp (#35).
  return (
    a.episode_id === b.episode_id &&
    a.locale === b.locale &&
    a.persona === b.persona &&
    a.provider === b.provider &&
    a.voice_id === b.voice_id &&
    a.tts_model === b.tts_model &&
    a.route === b.route &&
    a.context === b.context &&
    a.title === b.title &&
    a.duration_target_sec === b.duration_target_sec &&
    a.path_mp3 === b.path_mp3 &&
    a.path_vtt === b.path_vtt &&
    a.path_txt === b.path_txt &&
    a.chars === b.chars &&
    a.text_authorship === b.text_authorship &&
    a.text_author_model === b.text_author_model
  );
}

export function recordProvenance(entry: ProvenanceEntry): void {
  const m = load();
  // Upsert by (episode_id, locale, persona, provider) so multi-provider
  // variants for A/B comparison coexist as separate rows. Re-running the
  // same provider overwrites in place; running a different provider adds
  // a sibling row.
  const idx = m.entries.findIndex(
    (e) =>
      e.episode_id === entry.episode_id &&
      e.locale === entry.locale &&
      e.persona === entry.persona &&
      e.provider === entry.provider,
  );
  if (idx >= 0) {
    if (isStructurallyEqual(m.entries[idx], entry)) {
      // No-op: identical input. Leave the file alone so re-running
      // generate.ts on a cached corpus doesn't churn git diffs.
      return;
    }
    m.entries[idx] = entry;
  } else {
    m.entries.push(entry);
  }
  m.generated_at = new Date().toISOString();
  m.script_version = SCRIPT_VERSION;
  save(m);
}
