/**
 * /lab prerender load — equation-HTML map (S3a · ADR-034 / B1).
 *
 * renderKatex runs here in Node at build time; the client receives static HTML.
 * The katex module never ships to the browser (ADR-034). The map covers all 8
 * registered formulas so Card.svelte looks up its HTML by formulaId — it never
 * calls renderKatex at runtime.
 */
import { renderKatex } from '$lib/katex';
import { REGISTRY } from '$lib/physics/registry';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
  // Build the equation-HTML map for every registered formula that has a latex string.
  // Formulas without latex get an empty string; the card omits the equation block in that case.
  const equationHtml: Record<string, string> = {};
  for (const [id, def] of REGISTRY) {
    equationHtml[id] = def.latex ? renderKatex(def.latex, true) : '';
  }
  return { equationHtml };
};
