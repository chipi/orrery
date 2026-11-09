import { error } from '@sveltejs/kit';
import { REGISTRY } from '$lib/physics/registry';
import type { FormulaDef } from '$lib/physics/spec';
import { renderKatex } from '$lib/katex';
import { loadLabMessages, t } from '$lib/lab/t';
import { getLocale } from '$lib/paraglide/runtime';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * /lab/<formula> — one Lab calculator as an indexable page (0.9.8 SEO item 0):
 * its name, equation, the "in words" reading, what goes in and comes out (the
 * dials with their defaults and ranges, the result at those defaults), the
 * assumptions and the formulas it builds on, resolved here at build so the page
 * ships none of the Lab's JavaScript. The calculator itself stays in /lab.
 */
export const prerender = true;

export const entries: EntryGenerator = () => [...REGISTRY.keys()].map((id) => ({ id }));

type Row = { label: string; value: string };

function readout(def: FormulaDef, num: (v: number) => string) {
  const defaults = Object.fromEntries(def.inputs.map((f) => [f.key, f.default]));
  try {
    const result = def.compute(defaults);
    if (!result.status.ok) return { results: [] as Row[], assumptions: [] as string[] };
    const results = def.outputs.flatMap((o) => {
      const q = result.values[o.key];
      return q
        ? [{ label: t(o.labelKey), value: `${num(q.value)}${q.units ? ` ${q.units}` : ''}` }]
        : [];
    });
    return { results, assumptions: result.assumptions.map((k) => t(k)) };
  } catch {
    return { results: [] as Row[], assumptions: [] as string[] };
  }
}

export const load: PageServerLoad = async ({ params }) => {
  const def = REGISTRY.get(params.id);
  if (!def) throw error(404, `Unknown formula: ${params.id}`);
  await loadLabMessages();
  const locale = getLocale();
  const nf = new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 });
  const num = (v: number) => nf.format(v);

  // Dials, as the calculator opens: label [units], its starting value and range, or its choices.
  const parameters: Row[] = def.inputs
    .filter((f) => !f.injected && !f.gravityInLabel)
    .map((f) => {
      const label = `${t(f.labelKey)}${f.units ? ` [${f.units}]` : ''}`;
      if (f.kind === 'enum')
        return { label, value: (f.enumValues ?? []).map((e) => t(e.labelKey)).join(' · ') };
      if (f.kind === 'body')
        return { label, value: (f.bodyIds ?? []).map((b) => t(`lab.body.${b}`)).join(' · ') };
      if (f.kind === 'date') return { label, value: String(f.default) };
      const range =
        f.min !== undefined && f.max !== undefined ? ` (${num(f.min)} – ${num(f.max)})` : '';
      return { label, value: `${num(Number(f.default))}${range}` };
    });

  const { results, assumptions } = readout(def, num);
  return {
    id: def.id,
    title: t(def.titleKey),
    inWords: def.inWordsKey ? t(def.inWordsKey) : null,
    equation: def.latex ? renderKatex(def.latex, true) : '',
    parameters,
    outputs: def.outputs.map((o) => t(o.labelKey)),
    results,
    assumptions,
    buildsOn: def.prereqs.flatMap((id) => {
      const p = REGISTRY.get(id);
      return p ? [{ id, title: t(p.titleKey) }] : [];
    }),
    sameDomain: [...REGISTRY.values()]
      .filter((x) => x.domain === def.domain && x.id !== def.id && !def.prereqs.includes(x.id))
      .sort((a, b) => Math.abs(a.tier - def.tier) - Math.abs(b.tier - def.tier))
      .slice(0, 6)
      .map((x) => ({ id: x.id, title: t(x.titleKey) })),
    citation: def.citationKey ?? null,
    learnMore: def.learnMore ?? null,
  };
};
