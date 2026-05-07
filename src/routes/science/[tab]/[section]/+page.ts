import { error } from '@sveltejs/kit';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCIENCE_TABS, getScienceSection } from '$lib/data';
import { renderKatex } from '$lib/katex';
import type { ScienceTabId } from '$types/science';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

/**
 * Walk static/data/science/[tab]/ at build time and produce a
 * (tab, section) entry for every section JSON file present. New
 * sections added later are picked up automatically — the schema
 * validation in scripts/validate-data.ts is the contract that the
 * file is well-formed.
 */
export const entries: EntryGenerator = () => {
  const root = 'static/data/science';
  if (!existsSync(root)) return [];
  const out: { tab: string; section: string }[] = [];
  for (const tab of readdirSync(root)) {
    const tabDir = join(root, tab);
    if (!statSync(tabDir).isDirectory()) continue;
    for (const file of readdirSync(tabDir)) {
      if (!file.endsWith('.json') || file === '_index.json') continue;
      out.push({ tab, section: file.replace(/\.json$/, '') });
    }
  }
  return out;
};

export const load: PageLoad = async ({ params }) => {
  const tab = params.tab as ScienceTabId;
  if (!SCIENCE_TABS.includes(tab)) throw error(404, `Unknown science tab: ${tab}`);
  const section = await getScienceSection(tab, params.section, 'en-US');
  if (!section) throw error(404, `Unknown section: ${tab}/${params.section}`);
  // KaTeX is rendered at build time during prerender. Output is plain
  // HTML; client never loads the KaTeX library (ADR-034).
  const formulaHtml = section.formula_latex ? renderKatex(section.formula_latex) : null;
  return { section, formulaHtml };
};
