import { error } from '@sveltejs/kit';
import { REGISTRY } from '$lib/physics/registry';
import { renderKatex } from '$lib/katex';
import { loadLabMessages, t } from '$lib/lab/t';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /lab/<formula> — one Lab calculator as an indexable page (0.9.8 SEO item 0):
 * its name, equation, the "in words" reading, and what goes in and comes out,
 * resolved here at build so the page ships none of the Lab's JavaScript. The
 * calculator itself stays in /lab.
 */
export const prerender = true;

export const entries: EntryGenerator = () => [...REGISTRY.keys()].map((id) => ({ id }));

export const load: PageServerLoad = async ({ params }) => {
  const def = REGISTRY.get(params.id);
  if (!def) throw error(404, `Unknown formula: ${params.id}`);
  await loadLabMessages();
  return {
    id: def.id,
    title: t(def.titleKey),
    inWords: def.inWordsKey ? t(def.inWordsKey) : null,
    equation: def.latex ? renderKatex(def.latex, true) : '',
    inputs: def.inputs.map((f) => t(f.labelKey)),
    outputs: def.outputs.map((o) => t(o.labelKey)),
    citation: def.citationKey ?? null,
    learnMore: def.learnMore ?? null,
  };
};
