/**
 * Drift-catcher: every (tab, section) reference in the codebase points
 * to a real /science article file. PRD-024 audit follow-up.
 *
 * The audit surfaced that there's no compile-time check that strings
 * passed to WhyPopover (tab="orbits" section="vis-viva") or
 * ScienceLayersPanel (tab="planets" section="..."), or other deeplink
 * components, point to real articles. A typo or rename silently 404s
 * — the SvelteKit error page is the only signal.
 *
 * This test walks `src/` for `tab="..."` ... `section="..."` props and
 * for ScienceLayersPanel.metaFor's `learn: { tab: ..., section: ... }`
 * shape. For each pair found, it asserts the article exists at
 * `static/data/science/<tab>/<section>.json`.
 *
 * False positives are acceptable (an unrelated `section` prop on a
 * different component could trigger a spurious check); the matching
 * patterns are conservative.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCIENCE_ROOT = 'static/data/science';

interface DeeplinkRef {
  tab: string;
  section: string;
  source: string;
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  function walk(d: string) {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      const stat = statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (/\.(svelte|ts)$/.test(p) && !p.endsWith('.test.ts')) {
        out.push(p);
      }
    }
  }
  walk(dir);
  return out;
}

/**
 * Pattern A — Svelte component prop pair: `tab="X" ... section="Y"`
 * (commonly on a single multi-line component invocation). We match
 * within a 200-char window so the pair stays scoped to one element.
 */
function extractSvelteProps(text: string): { tab: string; section: string }[] {
  const out: { tab: string; section: string }[] = [];
  const re =
    /tab="([a-z][a-z0-9-]*)"[\s\S]{0,300}?section="([a-z][a-z0-9-]*)"|section="([a-z][a-z0-9-]*)"[\s\S]{0,300}?tab="([a-z][a-z0-9-]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1] && m[2]) out.push({ tab: m[1], section: m[2] });
    else if (m[3] && m[4]) out.push({ tab: m[4], section: m[3] });
  }
  return out;
}

/**
 * Pattern B — Object literal shape: `learn: { tab: 'X', section: 'Y' }`.
 * Used by ScienceLayersPanel.metaFor.
 */
function extractObjectLearnLinks(text: string): { tab: string; section: string }[] {
  const out: { tab: string; section: string }[] = [];
  const re = /tab:\s*['"]([a-z][a-z0-9-]*)['"][\s\S]{0,200}?section:\s*['"]([a-z][a-z0-9-]*)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ tab: m[1], section: m[2] });
  }
  return out;
}

function gatherRefs(): DeeplinkRef[] {
  const files = listSourceFiles('src');
  const refs: DeeplinkRef[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const r of extractSvelteProps(text)) {
      refs.push({ ...r, source: file });
    }
    for (const r of extractObjectLearnLinks(text)) {
      refs.push({ ...r, source: file });
    }
  }
  return refs;
}

describe('PRD-024 audit — code → /science deeplink coverage', () => {
  const refs = gatherRefs();

  it(`gathered at least one reference (smoke check; got ${refs.length})`, () => {
    expect(refs.length).toBeGreaterThan(0);
  });

  // Group by unique (tab, section) so the same article referenced from
  // multiple files only reports once. The source file list is included
  // in the error message for easy fix.
  const byKey = new Map<string, DeeplinkRef[]>();
  for (const r of refs) {
    const key = `${r.tab}/${r.section}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }

  for (const [key, group] of byKey) {
    const [tab, section] = key.split('/');
    it(`${tab}/${section} (article file exists, referenced by ${group.length} file${group.length === 1 ? '' : 's'})`, () => {
      const articlePath = join(SCIENCE_ROOT, tab, `${section}.json`);
      const exists = existsSync(articlePath);
      if (!exists) {
        const sources = group.map((g) => g.source).join('\n  ');
        throw new Error(
          `Code references /science/${tab}/${section} but ${articlePath} doesn't exist.\nReferenced from:\n  ${sources}`,
        );
      }
      expect(exists).toBe(true);
    });
  }
});
