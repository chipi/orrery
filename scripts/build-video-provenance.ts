/**
 * build-video-provenance (PRD-031 / RFC-033, S0)
 *
 * Reads the curated author input `static/data/video-sources.json`, gates every
 * row against the channel allowlist (scripts/video-channel-allowlist.ts),
 * canonicalises the source URL, derives a stable id, and emits the manifest
 *   - static/data/video-provenance.json
 *
 * We LINK, we do not download: this is the video sibling of
 * build-link-provenance.ts. No bytes are fetched; the manifest is pure
 * transform + validation over the curated sources file. The manifest is the
 * single source of truth consumed by validate-data, $lib/video-provenance.ts,
 * the MediaPlayer facade, and /credits + /colophon.
 *
 * Fail-closed: an unknown channel, a malformed URL, or a duplicate id aborts
 * the build (non-zero exit) rather than emitting a partial manifest.
 *
 * Usage: npm run build-video-provenance
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

import { lookupChannel } from './video-channel-allowlist.ts';

const SCRIPT_VERSION = 'build-video-provenance@1.0.0';
const SOURCES_PATH = 'static/data/video-sources.json';
const MANIFEST_OUT = 'static/data/video-provenance.json';

const PROVIDERS = ['youtube', 'vimeo', 'agency-hls', 'agency-mp4'] as const;
const KINDS = [
  'launch',
  'landing',
  'edl',
  'milestone',
  'accident',
  'rollout',
  'broadcast-archive',
  'animation',
  'live',
] as const;
const ENTITY_KINDS = ['mission', 'launch-site', 'fleet', 'landing-site', 'live-pin'] as const;
const ADVISORIES = ['loss-of-life', 'graphic'] as const;

type Provider = (typeof PROVIDERS)[number];
type VideoKind = (typeof KINDS)[number];
type EntityKind = (typeof ENTITY_KINDS)[number];
type ContentAdvisory = (typeof ADVISORIES)[number] | null;

/** Author-facing row in video-sources.json (no derived fields). */
interface RawVideoSource {
  entity_id: string;
  entity_kind: EntityKind;
  provider: Provider;
  provider_ref: string;
  source_url: string;
  channel: string;
  agency: string;
  title: string;
  caption?: string | null;
  kind: VideoKind;
  poster?: string | null;
  duration_seconds?: number | null;
  start_seconds?: number;
  license_or_fair_use: string;
  content_advisory?: ContentAdvisory;
  last_verified?: string;
  notes?: string | null;
}

interface VideoEntry extends Required<Omit<RawVideoSource, never>> {
  id: string;
}

const TRACKER_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  '_ga',
  'feature',
]);

/**
 * Canonicalise the source (watch) URL — mirrors build-link-provenance so
 * credits dedupe cleanly. Strips tracker params + fragment. Deliberately does
 * NOT touch the video id in the path/query (that lives in provider_ref).
 */
function canonicaliseUrl(raw: string): string {
  const u = new URL(raw);
  const drop: string[] = [];
  for (const [k] of u.searchParams) {
    if (TRACKER_PARAMS.has(k.toLowerCase())) drop.push(k);
  }
  for (const k of drop) u.searchParams.delete(k);
  u.hash = '';
  return u.toString();
}

/** Stable id: vid-<sha256(provider|provider_ref)[:12]>. Same source dedupes. */
function makeId(provider: string, providerRef: string): string {
  const h = createHash('sha256').update(`${provider}|${providerRef}`).digest('hex').slice(0, 12);
  return `vid-${h}`;
}

function readGitSha(): string | null {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fail(msg: string): never {
  console.error(`  ✗ ${msg}`);
  process.exit(1);
}

function main(): void {
  if (!existsSync(SOURCES_PATH)) {
    fail(`Missing ${SOURCES_PATH}. Author the curated video sources first.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'));
  } catch (e) {
    fail(`${SOURCES_PATH} is not valid JSON: ${(e as Error).message}`);
  }

  const rows = (parsed as { videos?: unknown })?.videos;
  if (!Array.isArray(rows)) {
    fail(`${SOURCES_PATH} must be an object with a "videos" array.`);
  }

  const errors: string[] = [];
  const seenIds = new Map<string, string>(); // id → entity_id (first seen)
  const entries: VideoEntry[] = [];
  const t = today();

  rows.forEach((rawUnknown, i) => {
    const raw = rawUnknown as RawVideoSource;
    const where = `videos[${i}] (${raw?.entity_id ?? '?'} / ${raw?.title ?? '?'})`;

    // Enum + presence gates (schema re-checks these on the emitted manifest;
    // we fail early here with a friendlier message).
    if (!raw?.entity_id) errors.push(`${where}: missing entity_id`);
    if (!ENTITY_KINDS.includes(raw?.entity_kind))
      errors.push(`${where}: bad entity_kind '${raw?.entity_kind}'`);
    if (!PROVIDERS.includes(raw?.provider))
      errors.push(`${where}: bad provider '${raw?.provider}'`);
    if (!raw?.provider_ref) errors.push(`${where}: missing provider_ref`);
    // provider_ref shape per provider — it lands in the embed URL, so a bad
    // value is an injection vector (review H2/N2). Fail-closed at build.
    if (raw?.provider_ref) {
      if (raw.provider === 'youtube' && !/^[A-Za-z0-9_-]{11}$/.test(raw.provider_ref)) {
        errors.push(
          `${where}: youtube provider_ref must be an 11-char video id ('${raw.provider_ref}')`,
        );
      } else if (raw.provider === 'vimeo' && !/^[0-9]+$/.test(raw.provider_ref)) {
        errors.push(`${where}: vimeo provider_ref must be a numeric id ('${raw.provider_ref}')`);
      } else if (raw.provider === 'agency-hls' || raw.provider === 'agency-mp4') {
        try {
          if (new URL(raw.provider_ref).protocol !== 'https:') throw new Error('not https');
        } catch {
          errors.push(
            `${where}: agency provider_ref must be an absolute https URL ('${raw.provider_ref}')`,
          );
        }
      }
    }
    if (!KINDS.includes(raw?.kind)) errors.push(`${where}: bad kind '${raw?.kind}'`);
    if (!raw?.title) errors.push(`${where}: missing title`);
    if (!raw?.license_or_fair_use) errors.push(`${where}: missing license_or_fair_use`);
    if (raw?.content_advisory != null && !ADVISORIES.includes(raw.content_advisory)) {
      errors.push(`${where}: bad content_advisory '${raw.content_advisory}'`);
    }

    // Channel allowlist gate (fail-closed).
    const chan = raw?.channel ? lookupChannel(raw.channel) : null;
    if (!chan) {
      errors.push(
        `${where}: channel '${raw?.channel}' not in the allowlist. Add it to scripts/video-channel-allowlist.ts (prefer an official channel) or fix the value.`,
      );
    } else if (chan.tier === 'trusted-third-party') {
      // Third-party clips must carry a real fair-use rationale, not a bare
      // license id (those are for first-party PD/CC uploads).
      const v = raw.license_or_fair_use ?? '';
      if (/^(PD-|CC-|CC0)/i.test(v.trim())) {
        errors.push(
          `${where}: trusted-third-party channel '${raw.channel}' requires a fair-use rationale in license_or_fair_use, not a license id ('${v}').`,
        );
      }
    } else if (chan.tier === 'archival-pd') {
      // Archival re-uploads are allowed ONLY for public-domain footage.
      if (!/public domain|PD-/i.test(raw.license_or_fair_use ?? '')) {
        errors.push(
          `${where}: archival-pd channel '${raw.channel}' is only for public-domain footage — license_or_fair_use must state public domain.`,
        );
      }
    }

    // URL canonicalisation.
    let url = raw?.source_url ?? '';
    try {
      url = canonicaliseUrl(url);
    } catch {
      errors.push(`${where}: source_url is not a valid URL ('${raw?.source_url}')`);
    }

    if (raw?.poster != null && !/^\/images\//.test(raw.poster)) {
      errors.push(`${where}: poster must start with /images/ or be null ('${raw.poster}')`);
    }

    const id = makeId(raw?.provider ?? '', raw?.provider_ref ?? '');
    const prev = seenIds.get(id);
    if (prev) {
      errors.push(`${where}: duplicate video (same provider+ref as entity '${prev}') → id ${id}`);
    }
    seenIds.set(id, raw?.entity_id ?? '?');

    entries.push({
      id,
      entity_id: raw.entity_id,
      entity_kind: raw.entity_kind,
      provider: raw.provider,
      provider_ref: raw.provider_ref,
      source_url: url,
      channel: raw.channel,
      agency: raw.agency,
      title: raw.title,
      caption: raw.caption ?? null,
      kind: raw.kind,
      poster: raw.poster ?? null,
      duration_seconds: raw.duration_seconds ?? null,
      start_seconds: raw.start_seconds ?? 0,
      license_or_fair_use: raw.license_or_fair_use,
      content_advisory: raw.content_advisory ?? null,
      last_verified: raw.last_verified ?? t,
      notes: raw.notes ?? null,
    });
  });

  if (errors.length > 0) {
    console.error(`\nbuild-video-provenance: ${errors.length} error(s):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  // Global-agency parity report (warn, not gate — PRD-031 principle 6).
  const byAgency = new Map<string, number>();
  for (const e of entries) byAgency.set(e.agency, (byAgency.get(e.agency) ?? 0) + 1);
  const total = entries.length;
  const top = [...byAgency.entries()].sort((a, b) => b[1] - a[1])[0];
  if (total >= 5 && top && top[1] / total > 0.6) {
    console.warn(
      `  ⚠ parity: ${top[0]} is ${Math.round((100 * top[1]) / total)}% of the curated set — surface more non-${top[0]} agencies (CNSA/ISRO/JAXA/Roscosmos/ESA).`,
    );
  }

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    script_version: SCRIPT_VERSION,
    commit_sha: readGitSha(),
    entries: entries.sort((a, b) => a.id.localeCompare(b.id)),
  };

  writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(
    `  ✓ ${MANIFEST_OUT} — ${entries.length} video(s) across ${byAgency.size} agency/agencies.`,
  );
}

main();
