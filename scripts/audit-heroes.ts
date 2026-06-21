#!/usr/bin/env tsx
/**
 * Generalised hero auditor (#5 Phase 1).
 *
 * One script, runs over every detail-panel surface that uses the
 * `<surface>/<id>/01.jpg` convention established by Phase 0
 * (the unify-path commit). Per entity:
 *
 *   1. Confirm hero exists at `static/images/<surface>/<id>/01.jpg`.
 *      (Pre-existing gaps live in scripts/validate-hero-coverage.ts'
 *       per-surface KNOWN_HERO_GAPS allowlists; this script silently
 *       skips them so the audit output focuses on quality, not coverage.)
 *
 *   2. Pull existing vision score + category + subject + focal_point
 *      from static/data/image-vision.json. Pull source_url + agency
 *      from static/data/image-provenance.json.
 *
 *   3. Apply the rubric (locked in chat w/ Marko 2026-06-12):
 *      - URL deny-list (extended fleet TEXT/ARTWORK/PEOPLE/SCREENSHOT
 *        patterns)
 *      - Subject-text deny-list (test-stand, mockup, scale model,
 *        watermarked, ceremony — inferred from Marko's bad-fleet
 *        examples in chat)
 *      - Vision category rules (people → reject; diagram → reject;
 *        render → reject only on FLOWN/ACTIVE missions, agency-canonical
 *        overrides excluded)
 *      - Score threshold (< 6 → flag)
 *      - "Not scored" — entity has hero on disk but no vision-manifest
 *        entry (the 24 Slice A/B/C cohort post-migration)
 *
 *   4. If hero is bad, scan alternates 02.jpg, 03.jpg, … and pick the
 *      highest-scoring slot with zero rubric reasons. Output the
 *      proposed swap; do NOT apply it.
 *
 *   5. If all alternates also bad: mark "needs sourcing" + emit the
 *      strongest reason for review.
 *
 *   6. Override pass: if static/data/<surface>-hero-overrides.json
 *      exists and includes the id, the override wins over rubric output.
 *      (Manual curation surface — Marko's "we trust you" path.)
 *
 * Output (per surface): docs/provenance/<surface>-hero-audit.md with
 * four sections — auto-swap proposals, needs sourcing, accepted
 * overrides, clean count. Same format across surfaces so the operator
 * review is uniform.
 *
 * Run: `npx tsx scripts/audit-heroes.ts [--surface=<name>]`
 * No API calls. Re-reads existing manifests; does not write to them.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ─── Rubric ────────────────────────────────────────────────────────

const URL_DENYLIST = {
  text: /logo|patch|insignia|emblem|banner|wordmark|infographic|infograph|diagram|schematic|page1-|page-1|\.pdf|presentation|slides|chart|svg\.png/i,
  artwork:
    /illustration|artist|artwork|concept|rendering|render|drawing|impression|painting|scale_model|scale-model|model_in_|model_at_|in_museum|in_planetarium|computer.{0,3}graphic/i,
  people:
    /flight_suit|astronaut_at|cosmonaut_at|crew_portrait|press_conference|ceremony|smiling|exhibition|stamp|coin|memorial/i,
  screenshot: /\.webm\.jpg$|\.ogv\.jpg$|\.tiff\.jpg$|page1-960px|capture[_-]/i,
};

// Subject-text deny-list (new vision-side patterns, complement URL regex).
// Inferred from Marko's bad-fleet chat examples (TESS, Schiaparelli, Falcon 9
// Block 5, ATV, Beagle 2 — many were mock-ups, scale models, or news-org
// composites that the URL regex couldn't catch because the filename was clean).
const SUBJECT_DENYLIST: RegExp[] = [
  /test[-\s]?stand|test[-\s]?fixture|test[-\s]?article/i,
  // Allow modifier words between "scale" and "model" to catch e.g.
  // "1/2 scale physical model" (slim's manifest entry — caught Marko's
  // bad-mission flag during the Phase 1 sanity check).
  /mock[-\s]?up|mockup|scale\s+(?:\S+\s+){0,2}model|scale_model/i,
  /watermark|getty|reuters|\bap\b|associated press/i,
  /press release|press conference|press kit/i,
  /awards? ceremony|gala|stamp|coin/i,
  /unboxing|assembly hall|cleanroom workers/i,
  /\bon (?:museum )?display|exhibition|placards?\b/i,
];

const SCORE_THRESHOLD = 6;

// ─── Types ─────────────────────────────────────────────────────────

interface VisionEntry {
  score: number;
  subject: string;
  category: string;
  focal_point: { x: number; y: number };
  variants?: Record<string, string>;
  rejected_by: string | null;
  fallback: boolean;
}

interface ProvenanceEntry {
  path: string;
  source_url?: string;
  agency?: string;
  title?: string;
}

interface SurfaceConfig {
  label: string;
  imageDir: string;
  indexPath: string;
  extractIds: (json: unknown) => Array<{ id: string; status?: string }>;
  knownGapsPath?: string;
}

interface HeroVerdict {
  reasons: string[];
  score: number | null;
  category: string | null;
  subject: string | null;
  visionMissing: boolean;
}

interface AuditResult {
  id: string;
  status: 'clean' | 'swap-proposed' | 'needs-sourcing' | 'override' | 'no-hero';
  reasons: string[];
  proposedSlot?: string;
  proposedReason?: string;
}

// ─── Surface configs ───────────────────────────────────────────────

const SURFACES: SurfaceConfig[] = [
  {
    label: 'missions',
    imageDir: 'missions',
    indexPath: 'static/data/missions/index.json',
    extractIds: (j) =>
      (j as Array<{ id: string; status?: string }>).map((e) => ({ id: e.id, status: e.status })),
  },
  {
    label: 'fleet',
    imageDir: 'fleet-galleries',
    indexPath: 'static/data/fleet/index.json',
    extractIds: (j) =>
      (j as Array<{ id: string; status?: string }>).map((e) => ({ id: e.id, status: e.status })),
  },
  {
    label: 'moon-sites',
    imageDir: 'moon-sites',
    indexPath: 'static/data/moon-sites.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => ({ id: e.id })),
  },
  {
    label: 'mars-sites',
    imageDir: 'mars-sites',
    indexPath: 'static/data/mars-sites.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => ({ id: e.id })),
  },
  {
    label: 'earth-objects',
    imageDir: 'earth-objects',
    indexPath: 'static/data/earth-objects.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => ({ id: e.id })),
  },
  {
    label: 'planets',
    imageDir: 'planets',
    indexPath: 'static/data/planets.json',
    // planets.json shape: { planets: [{ name: "Mercury", ... }, ...] }.
    // Id is the lowercased name (matches the on-disk dir naming —
    // static/images/planets/mercury/, etc.).
    extractIds: (j) =>
      ((j as { planets?: Array<{ name: string }> }).planets ?? []).map((e) => ({
        id: e.name.toLowerCase(),
      })),
  },
  {
    label: 'small-bodies',
    imageDir: 'small-bodies',
    indexPath: 'static/data/small-body-galleries.json',
    // small-body-galleries.json is a flat {id: count} map; ids match
    // the on-disk dir names directly.
    extractIds: (j) => Object.keys(j as Record<string, number>).map((id) => ({ id })),
  },
  {
    label: 'satellites',
    imageDir: 'satellites',
    indexPath: 'static/data/satellites.json',
    // satellites.json shape: { satellites: [{ id, name, ... }, ...] }.
    extractIds: (j) =>
      ((j as { satellites?: Array<{ id: string }> }).satellites ?? []).map((e) => ({
        id: e.id,
      })),
  },
];

// ─── Load manifests ────────────────────────────────────────────────

let visionEntries: Record<string, VisionEntry> = {};
const provenanceEntries: Map<string, ProvenanceEntry> = new Map();
let OTHER_ENTITY_TOKENS: string[] = [];

function loadManifests(): void {
  const visionPath = resolve(ROOT, 'static/data/image-vision.json');
  const visionJson = JSON.parse(readFileSync(visionPath, 'utf-8'));
  visionEntries = (visionJson.entries ?? {}) as Record<string, VisionEntry>;
  const provPath = resolve(ROOT, 'static/data/image-provenance.json');
  const provJson = JSON.parse(readFileSync(provPath, 'utf-8'));
  const provEntries = provJson.entries ?? provJson;
  const provList: ProvenanceEntry[] = Array.isArray(provEntries)
    ? provEntries
    : Object.values(provEntries);
  for (const e of provList) provenanceEntries.set(e.path, e);

  // Build the global token watchlist for subject ↔ ID mismatch
  // detection. Pulls every distinctive mission + fleet id and reduces
  // to noun-tokens that are likely to appear in a subject description
  // (e.g. "curiosity", "perseverance", "apollo11" → "apollo11").
  const watchlist = new Set<string>();
  for (const spec of SURFACES) {
    const ip = resolve(ROOT, spec.indexPath);
    if (!existsSync(ip)) continue;
    const j = JSON.parse(readFileSync(ip, 'utf-8'));
    for (const e of spec.extractIds(j)) {
      for (const t of idTokens(e.id)) watchlist.add(t);
    }
  }
  OTHER_ENTITY_TOKENS = [...watchlist];
}

/** Lowercase the id + split on dash so "luna-21" matches "luna" + "21". */
function idTokens(id: string): string[] {
  const lower = id.toLowerCase();
  return [lower, ...lower.split('-').filter((t) => t.length >= 4)];
}

/** Extract candidate identity tokens from vision-generated subject text. */
function subjectMentionTokens(subject: string): string[] {
  return subject
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4);
}

// ─── Evaluation ────────────────────────────────────────────────────

function evaluateImage(
  imagePath: string,
  context: { missionStatus?: string; allowRender: boolean; entityId?: string },
): HeroVerdict {
  const reasons: string[] = [];
  const vision = visionEntries[imagePath];
  const provenance = provenanceEntries.get(imagePath);
  const sourceUrl = provenance?.source_url ?? '';

  // URL regex deny-list — first check, cheapest signal.
  if (URL_DENYLIST.text.test(sourceUrl))
    reasons.push('url: text/logo/PDF/infographic in source URL');
  if (URL_DENYLIST.artwork.test(sourceUrl))
    reasons.push('url: artwork/illustration/render/scale-model in source URL');
  if (URL_DENYLIST.people.test(sourceUrl))
    reasons.push('url: people-only / crew portrait / ceremony in source URL');
  if (URL_DENYLIST.screenshot.test(sourceUrl))
    reasons.push('url: video screenshot or article preview in source URL');

  // Vision-manifest fields — null if not scored.
  if (!vision) {
    return {
      reasons: [...reasons, 'not-scored'],
      score: null,
      category: null,
      subject: null,
      visionMissing: true,
    };
  }

  // Subject-text deny-list.
  const subject = vision.subject ?? '';
  for (const re of SUBJECT_DENYLIST) {
    if (re.test(subject)) {
      reasons.push(`subject: matches ${re.source}`);
      break; // one is enough; avoid noise from multi-matches
    }
  }

  // Category rules.
  const cat = vision.category;
  if (cat === 'people') reasons.push('category: people-only — no asset visible');
  else if (cat === 'diagram') reasons.push('category: diagram — not a hero candidate');
  else if (cat === 'render') {
    const isFlownOrActive = context.missionStatus === 'FLOWN' || context.missionStatus === 'ACTIVE';
    if (isFlownOrActive && !context.allowRender) {
      reasons.push('category: render on FLOWN/ACTIVE asset');
    }
  }

  // Score threshold.
  if (vision.score < SCORE_THRESHOLD) {
    reasons.push(`score: ${vision.score} < threshold ${SCORE_THRESHOLD}`);
  }

  // Vision's own rejected_by signal.
  if (vision.rejected_by) reasons.push(`vision-rejected: ${vision.rejected_by}`);

  // Subject ↔ ID mismatch — if vision's subject description names a
  // DIFFERENT well-known entity, the wrong image was sourced. Detected
  // perseverance/01.jpg = a Curiosity panorama during the Phase 1
  // sanity check. Heuristic: scan subject for any other index entry's
  // id (the watchlist is global, populated at load time) and flag when
  // a foreign id appears without ours.
  if (context.entityId) {
    const tokens = subjectMentionTokens(subject);
    const mine = idTokens(context.entityId);
    const matchesSelf = mine.some((t) => tokens.includes(t));
    const matchesOther = OTHER_ENTITY_TOKENS.some((t) => tokens.includes(t) && !mine.includes(t));
    if (matchesOther && !matchesSelf) {
      reasons.push(`subject names a different entity than ${context.entityId}`);
    }
  }

  return {
    reasons,
    score: vision.score,
    category: vision.category,
    subject: vision.subject,
    visionMissing: false,
  };
}

function listGallerySlots(surfaceDir: string, id: string): string[] {
  const dirAbs = resolve(ROOT, 'static/images', surfaceDir, id);
  if (!existsSync(dirAbs)) return [];
  return readdirSync(dirAbs)
    .filter((f) => /^\d{2}\.jpg$/.test(f))
    .sort();
}

function auditSurface(spec: SurfaceConfig): AuditResult[] {
  const indexAbs = resolve(ROOT, spec.indexPath);
  if (!existsSync(indexAbs)) return [];
  const indexJson = JSON.parse(readFileSync(indexAbs, 'utf-8'));
  const ids = spec.extractIds(indexJson);

  // Optional overrides file.
  const overrideAbs = resolve(ROOT, `static/data/${spec.label}-hero-overrides.json`);
  let overrides: Record<string, { reason?: string }> = {};
  if (existsSync(overrideAbs)) {
    const j = JSON.parse(readFileSync(overrideAbs, 'utf-8'));
    overrides = j.overrides ?? {};
  }

  const results: AuditResult[] = [];
  for (const entry of ids) {
    const id = entry.id;
    const heroPath = `/images/${spec.imageDir}/${id}/01.jpg`;
    const heroAbs = resolve(ROOT, `static/images/${spec.imageDir}/${id}/01.jpg`);

    if (!existsSync(heroAbs)) {
      // Coverage is validated separately; just skip silently here.
      continue;
    }

    if (overrides[id]) {
      results.push({
        id,
        status: 'override',
        reasons: [overrides[id].reason ?? 'manual override (no reason given)'],
      });
      continue;
    }

    const heroVerdict = evaluateImage(heroPath, {
      missionStatus: entry.status,
      allowRender: false,
      entityId: id,
    });
    if (heroVerdict.reasons.length === 0) {
      results.push({ id, status: 'clean', reasons: [] });
      continue;
    }

    // Hero is bad — try alternates.
    const slots = listGallerySlots(spec.imageDir, id);
    let bestAlt: { slot: string; score: number; reasons: string[] } | null = null;
    for (const slot of slots) {
      if (slot === '01.jpg') continue;
      const altPath = `/images/${spec.imageDir}/${id}/${slot}`;
      const v = evaluateImage(altPath, {
        missionStatus: entry.status,
        allowRender: false,
        entityId: id,
      });
      if (v.reasons.length === 0 && v.score !== null) {
        if (!bestAlt || v.score > bestAlt.score) {
          bestAlt = { slot, score: v.score, reasons: [] };
        }
      }
    }
    if (bestAlt) {
      results.push({
        id,
        status: 'swap-proposed',
        reasons: heroVerdict.reasons,
        proposedSlot: bestAlt.slot,
        proposedReason: `score ${bestAlt.score} · zero rubric flags`,
      });
    } else {
      results.push({
        id,
        status: 'needs-sourcing',
        reasons: heroVerdict.reasons,
      });
    }
  }
  return results;
}

// ─── Output ────────────────────────────────────────────────────────

function writeReport(spec: SurfaceConfig, results: AuditResult[]): string {
  const counts = {
    clean: results.filter((r) => r.status === 'clean').length,
    swap: results.filter((r) => r.status === 'swap-proposed').length,
    sourcing: results.filter((r) => r.status === 'needs-sourcing').length,
    override: results.filter((r) => r.status === 'override').length,
  };
  const lines: string[] = [];
  lines.push(`# ${spec.label} hero audit — ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(
    `Generated by \`scripts/audit-heroes.ts\` (#5 Phase 1). Rubric ` +
      `locked in chat 2026-06-12; see commit footer for the principles.`,
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- ✓ clean: **${counts.clean}**`);
  lines.push(`- ⇄ swap proposals: **${counts.swap}**`);
  lines.push(`- ⊘ needs sourcing: **${counts.sourcing}**`);
  lines.push(`- ✋ accepted overrides: **${counts.override}**`);
  lines.push('');

  lines.push('## ⇄ Swap proposals');
  lines.push('');
  if (counts.swap === 0) {
    lines.push('_None._');
  } else {
    lines.push(
      "Each entry's 01.jpg is currently flagged by the rubric AND an alternate slot in the same gallery scored cleanly. " +
        'Review then apply (script TBD in Phase 4).',
    );
    lines.push('');
    lines.push('| id | hero reasons | propose → | alt rationale |');
    lines.push('|---|---|---|---|');
    for (const r of results.filter((r) => r.status === 'swap-proposed')) {
      lines.push(
        `| ${r.id} | ${r.reasons.join('; ')} | ${r.proposedSlot} | ${r.proposedReason ?? ''} |`,
      );
    }
  }
  lines.push('');

  lines.push('## ⊘ Needs sourcing');
  lines.push('');
  if (counts.sourcing === 0) {
    lines.push('_None._');
  } else {
    lines.push(
      'Hero is flagged by the rubric and **no clean alternate exists in the gallery**. ' +
        'Either source a better image (agency-first fetcher pattern) or add an explicit ' +
        `entry to \`static/data/${spec.label}-hero-overrides.json\` if the current pick ` +
        'is genuinely the canonical option (Soviet-era / crashed-mission cohort).',
    );
    lines.push('');
    lines.push('| id | reasons |');
    lines.push('|---|---|');
    for (const r of results.filter((r) => r.status === 'needs-sourcing')) {
      lines.push(`| ${r.id} | ${r.reasons.join('; ')} |`);
    }
  }
  lines.push('');

  lines.push('## ✋ Accepted overrides');
  lines.push('');
  if (counts.override === 0) {
    lines.push(
      `_None._ When you decide a hero is the canonical pick despite the rubric ` +
        `flagging it, add it to \`static/data/${spec.label}-hero-overrides.json\` ` +
        `with a short reason. Overrides win over rubric output silently — the audit ` +
        `lists them here so the override list stays visible + reviewable.`,
    );
  } else {
    lines.push('| id | reason |');
    lines.push('|---|---|');
    for (const r of results.filter((r) => r.status === 'override')) {
      lines.push(`| ${r.id} | ${r.reasons.join('; ')} |`);
    }
  }
  lines.push('');

  lines.push('## ✓ Clean');
  lines.push('');
  lines.push(
    `${counts.clean} entries currently pass the rubric. Not enumerated here — ` +
      "they're the silent majority. Run with `--list-clean` if you want them.",
  );
  lines.push('');

  return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────

const args = parseArgs({
  args: process.argv.slice(2),
  options: { surface: { type: 'string' }, 'list-clean': { type: 'boolean' } },
  strict: false,
});

loadManifests();

const surfacesToAudit = args.values.surface
  ? SURFACES.filter((s) => s.label === args.values.surface)
  : SURFACES;

if (surfacesToAudit.length === 0) {
  console.error(
    `Unknown --surface=${args.values.surface}. Valid: ${SURFACES.map((s) => s.label).join(', ')}`,
  );
  process.exit(1);
}

mkdirSync(resolve(ROOT, 'docs/provenance'), { recursive: true });

for (const spec of surfacesToAudit) {
  console.log(`\n=== Auditing ${spec.label} ===`);
  const results = auditSurface(spec);
  const reportPath = `docs/provenance/${spec.label}-hero-audit.md`;
  writeFileSync(resolve(ROOT, reportPath), writeReport(spec, results));
  const counts = {
    clean: results.filter((r) => r.status === 'clean').length,
    swap: results.filter((r) => r.status === 'swap-proposed').length,
    sourcing: results.filter((r) => r.status === 'needs-sourcing').length,
    override: results.filter((r) => r.status === 'override').length,
  };
  console.log(
    `  ✓ ${counts.clean} clean · ⇄ ${counts.swap} swap · ⊘ ${counts.sourcing} sourcing · ✋ ${counts.override} override`,
  );
  console.log(`  → ${reportPath}`);
}

console.log('\nDone. Read the markdowns in docs/provenance/.');
