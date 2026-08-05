/**
 * Provenance domain module (ADR-084). All image, audio, text, data, and
 * badge provenance types + loaders extracted from data.ts verbatim.
 */

import { get, type FetchLike } from './core';
import { base } from '$app/paths';
import type { Persona, ProviderName, TextAuthorship } from '../audio-types';

// The manifest may be absent (e.g. fresh checkout where the script
// hasn't run yet) — in that case the helpers return null and the UI
// falls back to the contextual gallery footer copy from Milestone A/B.
// ──────────────────────────────────────────────────────────────────────

export type ImageProvenanceSourceType =
  'wikimedia-commons' | 'nasa-images-api' | 'direct-agency' | 'direct-other' | 'derived-mosaic';

export interface ImageProvenanceEntry {
  id: string;
  path: string;
  source_type: ImageProvenanceSourceType;
  title: string;
  author: string | null;
  agency: string;
  source_url: string;
  image_url: string | null;
  license_short: string;
  license_url: string | null;
  license_rationale: string;
  modifications: string[];
  revid: number | null;
  pageid: number | null;
  nasa_id: string | null;
  fetched_at: string;
  /**
   * Capturing spacecraft + instrument for orbital surface imagery (#360 /
   * credits). HiRISE + CTX both ride on Mars Reconnaissance Orbiter, LROC on
   * Lunar Reconnaissance Orbiter, etc. Lets /credits link the image back to
   * the actual satellite that took it. Optional — absent for ground/archival
   * imagery. `spacecraft_id` resolves to a /mars or /moon surface-orbiter id.
   */
  spacecraft_id?: string;
  spacecraft_name?: string;
  instrument?: string;
}

export interface ImageProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: ImageProvenanceEntry[];
}

let provenanceIndex: Map<string, ImageProvenanceEntry> | null = null;
let provenanceManifest: ImageProvenanceManifest | null = null;

export async function getImageProvenanceManifest(): Promise<ImageProvenanceManifest | null> {
  if (provenanceManifest) return provenanceManifest;
  try {
    const m = await get<ImageProvenanceManifest>('image-provenance.json');
    provenanceManifest = m;
    provenanceIndex = new Map(m.entries.map((e) => [e.path, e]));
    return m;
  } catch {
    return null;
  }
}

/**
 * Returns the provenance entry for an image referenced by served path
 * (e.g. "/images/missions/curiosity/01.webp"). Strips the SvelteKit
 * `base` prefix so panel callers can pass the same `src` they bind to
 * <img>. Returns null when the manifest is absent or the path is not
 * recorded — caller renders the fallback gallery footer.
 */
/**
 * Normalise an image URL to its provenance-index key. Strips the stream origin
 * (mobile `assetOrigin` is the full CDN URL, e.g.
 * `https://chipi.github.io/orrery/images/...`), then the `${base}` prefix, then
 * query/hash, and treats a missing leading slash as relative — so a served
 * `<img src>` resolves to the same key on web and mobile (RFC-030). Pure +
 * unit-tested; `basePath` is injectable for tests.
 */
export function normalizeImageKey(imagePath: string, basePath: string = base): string {
  let p = imagePath;
  p = p.replace(/^https?:\/\/[^/]+/, '');
  if (basePath && p.startsWith(basePath)) p = p.slice(basePath.length);
  p = p.replace(/[?#].*$/, '');
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

export async function getImageProvenance(imagePath: string): Promise<ImageProvenanceEntry | null> {
  const manifest = await getImageProvenanceManifest();
  if (!manifest || !provenanceIndex) return null;
  return provenanceIndex.get(normalizeImageKey(imagePath)) ?? null;
}

// ──────────────────────────────────────────────────────────────────────
// External audio-source provenance (#385) — third-party recordings under
// static/audio/atmosphere/ (the "atmosphere's voice" tiles). Parallel to
// image-provenance; distinct from the first-party TTS audio-provenance.
// ──────────────────────────────────────────────────────────────────────
export interface AudioSourceProvenanceEntry {
  id: string;
  path: string;
  body: 'moon' | 'mars' | 'earth';
  source_type: 'wikimedia-commons' | 'nasa-images-api' | 'direct-agency' | 'direct-other';
  title: string;
  author: string | null;
  agency: string;
  instrument: string | null;
  date_recorded: string | null;
  source_url: string;
  download_url: string | null;
  license_short: string;
  license_url: string | null;
  license_rationale: string;
  modifications: string[];
  duration_sec?: number;
  sha256: string;
  fetched_at: string;
}

export interface AudioSourceProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version?: string;
  commit_sha?: string | null;
  entries: AudioSourceProvenanceEntry[];
}

let audioSourceProvenanceManifest: AudioSourceProvenanceManifest | null = null;

export async function getAudioSourceProvenanceManifest(): Promise<AudioSourceProvenanceManifest | null> {
  if (audioSourceProvenanceManifest) return audioSourceProvenanceManifest;
  try {
    const m = await get<AudioSourceProvenanceManifest>('audio-source-provenance.json');
    audioSourceProvenanceManifest = m;
    return m;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Source logos + text sources (ADR-046 Milestone D)
//
// Both manifests power /credits. Source logos render the masthead
// blocks; text sources render the editorial bill of materials.
// ──────────────────────────────────────────────────────────────────────

export interface SourceLogo {
  id: string;
  name: string;
  kind:
    | 'space-agency'
    | 'private-operator'
    | 'research-institute'
    | 'media-platform'
    | 'encyclopedic'
    | 'publisher';
  url: string;
  logo_path?: string;
  license_summary: string;
}

export interface SourceLogosManifest {
  schema_version: number;
  sources: SourceLogo[];
}

export interface TextSourceLocation {
  file: string;
  json_path?: string;
  i18n_key?: string;
}

export interface TextSourceEntry {
  id: string;
  location: TextSourceLocation;
  category:
    | 'mission'
    | 'planet'
    | 'sun'
    | 'small-body'
    | 'moon-site'
    | 'earth-object'
    | 'iss-module'
    | 'rocket'
    | 'ui'
    | 'credits';
  relationship:
    'original' | 'paraphrased-from' | 'quoted-from' | 'translated-from' | 'adapted-from';
  snippet?: string;
  source_url?: string;
  source_publisher?: string;
  source_author?: string;
  license_short: string;
  license_url?: string;
  license_rationale: string;
  translation_status?: 'human' | 'mt-with-review' | 'mt' | 'n/a';
  translation_reviewer?: string;
}

export interface TextSourcesManifest {
  schema_version: number;
  entries: TextSourceEntry[];
}

export async function getSourceLogos(): Promise<SourceLogosManifest> {
  return get<SourceLogosManifest>('source-logos.json');
}

export async function getTextSources(): Promise<TextSourcesManifest> {
  return get<TextSourcesManifest>('text-sources.json');
}

// ─── Data & catalogues (PRD-030 / RFC-032 — public /credits data section) ──
// Curated provenance for the structured public datasets Orrery ingests (star
// catalogues, launch catalogues, …). Distinct from image-provenance (per-asset)
// and text-sources (editorial fragments).
export interface DataSourceEntry {
  id: string;
  name: string;
  catalog: string;
  version?: string;
  category: string;
  description: string;
  source_url: string;
  license_short: string;
  license_url: string;
  license_rationale: string;
  used_on: string[];
}

export interface DataSourcesManifest {
  schema_version: number;
  entries: DataSourceEntry[];
}

export async function getDataSources(): Promise<DataSourcesManifest> {
  return get<DataSourcesManifest>('data-sources.json');
}

// ─── Audio provenance (PRD-016 §transparency / RFC-019 §5.4) ─────────────
// Mirrors the image-provenance pattern. Read by /credits to surface every
// audio asset's text-author + voice-provider attribution.

export interface AudioProvenanceEntry {
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

export interface AudioProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: AudioProvenanceEntry[];
}

let audioProvenance: AudioProvenanceManifest | null = null;

export async function getAudioProvenanceManifest(): Promise<AudioProvenanceManifest | null> {
  if (audioProvenance) return audioProvenance;
  try {
    const m = await get<AudioProvenanceManifest>('audio/audio-provenance.json');
    audioProvenance = m;
    return m;
  } catch {
    return null;
  }
}

// ─── Episode sources sidecar (PRD-016 §S10 / RFC-019 §11.4) ──────────────
// Per-episode editorial citations, joined to audio-provenance by
// episode_id. Sidecar starts empty — populated incrementally per-
// episode as primary sources are identified for Claude-drafted scripts.

export type EpisodeSourceKind =
  | 'book-primary'
  | 'book-secondary'
  | 'agency-primary'
  | 'agency-secondary'
  | 'paper-primary'
  | 'interview'
  | 'documentary'
  | 'encyclopedia'
  | 'memoir';

export interface EpisodeSource {
  label: string;
  source_id: string;
  url?: string;
  kind: EpisodeSourceKind;
  language?: string;
  last_verified?: string;
}

export interface EpisodeSourcesEntry {
  episode_id: string;
  sources: EpisodeSource[];
}

export interface EpisodeSourcesManifest {
  schema_version: number;
  episodes: EpisodeSourcesEntry[];
}

let episodeSources: EpisodeSourcesManifest | null = null;

export async function getEpisodeSourcesManifest(): Promise<EpisodeSourcesManifest> {
  if (episodeSources) return episodeSources;
  try {
    const m = await get<EpisodeSourcesManifest>('audio/episode-sources.json');
    episodeSources = m;
    return m;
  } catch {
    return { schema_version: 1, episodes: [] };
  }
}

/**
 * Insignia/patch map (PRD-029) — `{ "mission:apollo11": "/images/badges/...webp" }`.
 * Keyed `${kind}:${id}` for kind ∈ {program, mission, fleet}. Browse grids gate
 * their badge <img> on this so a page with 250 fleet cards fires zero 404s for
 * the ones we haven't sourced a badge for yet. Built by scripts/fetch-badges.ts.
 */
export async function getBadges(fetchFn: FetchLike = fetch): Promise<Record<string, string>> {
  try {
    return await get<Record<string, string>>('badges.json', fetchFn);
  } catch {
    return {};
  }
}

/** Provenance rows for the sourced insignia (one per served badge webp).
 * Consumed by the /patches gallery for per-badge credit + licence. */
export interface BadgeProvenance {
  path: string;
  source_type: string;
  title: string;
  author: string;
  agency: string;
  source_url: string;
  image_url: string;
  license_short: string;
  license_url: string | null;
  artifact?: string;
}
export async function getBadgeProvenance(fetchFn: FetchLike = fetch): Promise<BadgeProvenance[]> {
  try {
    return await get<BadgeProvenance[]>('badge-provenance.json', fetchFn);
  } catch {
    return [];
  }
}

/** Reset this module's provenance caches (test isolation) — called by data.ts __resetCache. */
export function resetProvenanceCache(): void {
  provenanceIndex = null;
  provenanceManifest = null;
  audioSourceProvenanceManifest = null;
}
