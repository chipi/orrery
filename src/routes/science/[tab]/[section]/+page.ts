import { error } from '@sveltejs/kit';
import { SCIENCE_TABS, getScienceSection } from '$lib/data';
import { get } from '$lib/data/core';
import { renderKatex } from '$lib/katex';
import { getLocale } from '$lib/paraglide/runtime';
import type { TermLink } from '$lib/science-inline';
import type { ScienceTabId } from '$types/science';
import type { PageLoad } from './$types';

// Every section is a prerender entry through scripts/site-routes.mjs
// (scienceRoutes reads each tab's _index.json), so no `entries` list here.
export const prerender = true;

/** Glossary term links per paragraph ("body_paragraphs.3" → [[id, at, text]]), PRD-038 §5. */
export type SectionTermLinks = Record<string, TermLink[]>;

export const load: PageLoad = async ({ params, fetch }) => {
  const tab = params.tab as ScienceTabId;
  if (!SCIENCE_TABS.includes(tab)) throw error(404, `Unknown science tab: ${tab}`);
  // getLocale() is bound to the request locale by the Paraglide server
  // middleware (hooks.server.ts), so each prerendered /<locale>/science/...
  // path loads its own localized overlay; getScienceSection falls back to
  // en-US when a locale overlay is missing (ADR-017). Pass SvelteKit's fetch
  // through so the data-layer get<T> resolves /data/science/... at prerender.
  const locale = getLocale();
  const [section, links] = await Promise.all([
    getScienceSection(tab, params.section, locale, fetch),
    // static/data/glossary/<locale>.links.json is written by scripts/build-glossary.mjs; an
    // article renders without term links when it is missing.
    get<Record<string, SectionTermLinks>>(`glossary/${locale}.links.json`, fetch).catch(
      (): Record<string, SectionTermLinks> => ({}),
    ),
  ]);
  if (!section) throw error(404, `Unknown section: ${tab}/${params.section}`);
  // KaTeX is rendered at build time during prerender. Output is plain HTML;
  // client never loads the KaTeX library (ADR-034).
  const formulaHtml = section.formula_latex ? renderKatex(section.formula_latex) : null;
  const termLinks: SectionTermLinks = links[`${tab}/${params.section}`] ?? {};
  return { section, formulaHtml, termLinks };
};
