/**
 * /lab prerender load — equation-HTML map (S3a · ADR-034 / B1).
 *
 * A SERVER-only load (`+page.server.ts`, ADR-034 §Implementation): renderKatex runs
 * here in Node at build time and the katex JS module is NEVER shipped to the browser
 * (a universal `+page.ts` would bundle it client-side). The client receives only the
 * static HTML map + katex CSS. The map covers all registered formulas so Card.svelte
 * looks up its HTML by formulaId — it never calls renderKatex at runtime.
 */
import { renderKatex } from '$lib/katex';
import { REGISTRY } from '$lib/physics/registry';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = () => {
  // Build the equation-HTML map for every registered formula that has a latex string.
  // Formulas without latex get an empty string; the card omits the equation block in that case.
  const equationHtml: Record<string, string> = {};
  for (const [id, def] of REGISTRY) {
    equationHtml[id] = def.latex ? renderKatex(def.latex, true) : '';
  }
  return { equationHtml };
};
