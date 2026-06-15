#!/usr/bin/env tsx
/**
 * Suggest audio-tour stages for an episode by parsing its SSML +
 * VTT and matching imperatives / name-drops against known patterns.
 *
 * Usage:
 *   npx tsx scripts/audio/suggest-stages.ts <episode-id>
 *
 * Examples:
 *   npx tsx scripts/audio/suggest-stages.ts guide-mars
 *   npx tsx scripts/audio/suggest-stages.ts saturn-rings
 *
 * Output: a TS object-literal block ready to paste into
 * `EPISODE_STAGES` in `src/lib/audio-tour.ts`. Every suggestion is
 * VTT-anchored (comment shows source line), so a human can refine
 * before committing.
 *
 * What it does (PRD-016 / RFC-019 §12 / #342 Phase 13):
 *
 *  1. Reads the episode's SSML frontmatter to learn its route.
 *  2. Reads the ElevenLabs VTT (canonical timing per PROVIDER_PRIORITY).
 *  3. For each VTT line, applies a small set of pattern matchers:
 *       click <Entity>           → click stage
 *       drag / rotate / spin     → drag stage
 *       look at / find / notice  → scroll-to + cue
 *       zoom in / zoom out       → zoom stage
 *       <named planet|mission>   → flash hook (if exists in the
 *                                  route's data-audio-stage inventory)
 *  4. Emits the suggestions sorted by at_sec.
 *
 * Limitations:
 *  - Entity-id resolution is heuristic (slugifies the word that
 *    follows the imperative). Author should verify the selector
 *    matches the real hook in `src/routes/<route>/+page.svelte`.
 *  - Cue text is the verbatim VTT line, truncated. The author
 *    should rewrite it as a directive ("Find Saturn — like this.")
 *    per AGENTS.md § Tour cue authoring.
 *  - Doesn't propose timing carve-outs (1 s cue→click etc.); that's
 *    the rhythm pass, not this tool.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface VttLine {
  start: number;
  end: number;
  text: string;
}

interface Suggestion {
  at_sec: number;
  action: 'click' | 'cue' | 'flash' | 'scroll-to' | 'drag' | 'zoom';
  target: string;
  duration_ms?: number;
  source_line: string;
  reason: string;
}

// Route → set of entity prefixes that have data-audio-stage hooks.
// Used to pick a selector for a name-drop. Driven by what was
// templated/added during the #342 structural pass.
const ROUTE_HOOK_PREFIXES: Record<string, string[]> = {
  '/': ['route-card-', 'hero-illustration', 'hero-earth-label', 'route-grid'],
  '/explore': ['explore-select-', 'explore-scene', 'explore-hud', 'explore-layer-paths', 'science-lens-toggle', 'planet-tab-technical'],
  '/earth': ['earth-select-', 'surface-hud'],
  '/moon': ['moon-select-', 'surface-hud', 'surface-stand-at-site', 'surface-exit-panorama', 'surface-panorama-tour-play'],
  '/mars': ['mars-select-', 'surface-hud', 'surface-stand-at-site', 'surface-exit-panorama', 'surface-panorama-tour-play'],
  '/iss': ['iss-select-', 'iss-module-list', 'iss-assembly-toggle'],
  '/tiangong': ['tiangong-select-', 'tiangong-module-list'],
  '/missions': ['missions-select-', 'missions-filters', 'missions-grid', 'missions-search-input'],
  '/fleet': ['fleet-select-', 'fleet-filters', 'fleet-filters-toggle', 'fleet-grid', 'fleet-epoch-timeline'],
  '/science': ['science-tab-', 'science-section-', 'science-tabs', 'science-search-button'],
  '/plan': ['plan-selector-bar', 'porkchop-plot'],
  '/fly': ['fly-hud'],
};

// Patterns that trigger imperative-style stage suggestions.
const PATTERNS = {
  // "Click Saturn" / "Click any planet" / "Click Pathfinder's marker"
  click: /\bclick\s+(?:any\s+)?(\w[\w-]*)/i,
  // "Drag to rotate" / "Rotate the view" / "Spin the model"
  drag: /\b(drag|rotate the|spin)\b/i,
  // "Look at the diagram" / "Find Earth" / "Notice the gaps"
  look: /\b(look at|find|notice)\b/i,
  // "Zoom in" / "Zoom out"
  zoom: /\b(zoom (in|out)|scroll to zoom)\b/i,
  // "Press Cmd-K" / "Try the search"
  search: /\b(press cmd-?k|search dialog)\b/i,
};

function parseVtt(text: string): VttLine[] {
  const lines: VttLine[] = [];
  const blocks = text.split(/\n\n+/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed === 'WEBVTT') continue;
    const ts = trimmed.match(/(\d+):(\d+):(\d+)\.(\d+)\s+-->\s+(\d+):(\d+):(\d+)\.(\d+)/);
    if (!ts) continue;
    const start = +ts[1] * 3600 + +ts[2] * 60 + +ts[3] + +ts[4] / 1000;
    const end = +ts[5] * 3600 + +ts[6] * 60 + +ts[7] + +ts[8] / 1000;
    const body = trimmed.split('\n').slice(1).join(' ').trim();
    if (!body) continue;
    lines.push({ start, end, text: body });
  }
  return lines;
}

function parseSsmlFrontmatter(md: string): { id?: string; route?: string; duration_target_sec?: number } {
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return {};
  const out: Record<string, string | number> = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^(\w+):\s*['"]?(.+?)['"]?$/);
    if (m) {
      const v = m[2];
      const n = parseFloat(v);
      out[m[1]] = !isNaN(n) && isFinite(n) && /^\d/.test(v) ? n : v;
    }
  }
  return out as { id?: string; route?: string; duration_target_sec?: number };
}

function suggestionsForLine(line: VttLine, route: string): Suggestion[] {
  const out: Suggestion[] = [];
  const text = line.text;
  const prefixes = ROUTE_HOOK_PREFIXES[route] ?? [];
  const selectPrefix = prefixes.find((p) => p.endsWith('select-'));

  // Imperative: click <entity>
  const click = text.match(PATTERNS.click);
  if (click && selectPrefix) {
    const entity = click[1].toLowerCase();
    // "any" is a generic — skip
    if (entity !== 'any' && entity !== 'the' && entity.length > 1) {
      const selector = `${selectPrefix}${entity}`;
      out.push({
        at_sec: Math.round(line.start),
        action: 'click',
        target: `[data-audio-stage="${selector}"]`,
        source_line: text,
        reason: `pattern: click <entity>`,
      });
    }
  }

  // Imperative: drag / rotate
  if (PATTERNS.drag.test(text)) {
    const dragTarget = prefixes.includes('surface-hud')
      ? '[data-audio-stage="surface-hud"]'
      : prefixes.includes('explore-scene')
        ? '[data-audio-stage="explore-scene"]'
        : null;
    if (dragTarget) {
      out.push({
        at_sec: Math.round(line.start),
        action: 'drag',
        target: dragTarget,
        duration_ms: 1800,
        source_line: text,
        reason: `pattern: drag/rotate`,
      });
    }
  }

  // Imperative: look at / find / notice → cue + scroll-to
  if (PATTERNS.look.test(text)) {
    const cueText = text.length > 80 ? text.slice(0, 77) + '…' : text;
    out.push({
      at_sec: Math.round(line.start),
      action: 'cue',
      target: cueText,
      duration_ms: 4500,
      source_line: text,
      reason: `pattern: look/find/notice — REWRITE cue text as directive`,
    });
  }

  // Imperative: zoom
  if (PATTERNS.zoom.test(text)) {
    const zoomTarget = prefixes.includes('surface-hud')
      ? '[data-audio-stage="surface-hud"]'
      : prefixes.includes('explore-scene')
        ? '[data-audio-stage="explore-scene"]'
        : null;
    if (zoomTarget) {
      out.push({
        at_sec: Math.round(line.start),
        action: 'zoom',
        target: zoomTarget,
        duration_ms: 1500,
        source_line: text,
        reason: `pattern: zoom — set params.factor (0.5 closer, 1.67 back out)`,
      });
    }
  }

  return out;
}

function findVttForEpisode(episodeId: string): string | null {
  const audioRoot = join(process.cwd(), 'static/audio/en-US');
  // Prefer ElevenLabs (per PROVIDER_PRIORITY).
  for (const tier of ['curator', 'guide', 'enthusiast']) {
    const dir = join(audioRoot, tier);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.startsWith(`${episodeId}.`) && f.endsWith('.vtt'));
    if (files.length > 0) return join(dir, files[0]);
  }
  return null;
}

function fmtSecToVtt(s: number): string {
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `00:${String(m).padStart(2, '0')}:${rest.toFixed(1).padStart(4, '0')}`;
}

function main(): void {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: tsx scripts/audio/suggest-stages.ts <episode-id>');
    process.exit(1);
  }

  const mdPath = join(process.cwd(), `content/episodes/en-US/${id}.md`);
  if (!existsSync(mdPath)) {
    console.error(`No SSML found at ${mdPath}`);
    process.exit(1);
  }
  const md = readFileSync(mdPath, 'utf-8');
  const fm = parseSsmlFrontmatter(md);
  const route = fm.route ?? '/';

  const vttPath = findVttForEpisode(id);
  if (!vttPath) {
    console.error(`No VTT found under static/audio/en-US/{curator,guide,enthusiast}/${id}.*.vtt`);
    process.exit(1);
  }
  const vtt = parseVtt(readFileSync(vttPath, 'utf-8'));

  const suggestions: Suggestion[] = [];
  for (const line of vtt) {
    suggestions.push(...suggestionsForLine(line, route));
  }
  suggestions.sort((a, b) => a.at_sec - b.at_sec);

  console.log(`// Suggestions for ${id} (route ${route}, VTT ${vttPath.split('/').pop()})`);
  console.log(`// ${vtt.length} VTT lines parsed, ${suggestions.length} suggestions emitted.`);
  console.log(`// All cue text marked REWRITE — author as directive, not subtitle.`);
  console.log(`// All selectors are heuristic — verify against +page.svelte hooks.`);
  console.log(`'${id}': [`);
  for (const s of suggestions) {
    console.log(`  // VTT § ${fmtSecToVtt(s.at_sec)} "${s.source_line.slice(0, 70)}${s.source_line.length > 70 ? '…' : ''}"`);
    console.log(`  // (${s.reason})`);
    if (s.action === 'cue') {
      console.log(`  { at_sec: ${s.at_sec}, action: 'cue', target: '${s.target.replace(/'/g, "\\'")}', duration_ms: ${s.duration_ms ?? 4000} },`);
    } else if (s.duration_ms !== undefined) {
      console.log(`  { at_sec: ${s.at_sec}, action: '${s.action}', target: '${s.target}', duration_ms: ${s.duration_ms} },`);
    } else {
      console.log(`  { at_sec: ${s.at_sec}, action: '${s.action}', target: '${s.target}' },`);
    }
  }
  console.log(`],`);
}

main();
