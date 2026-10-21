/**
 * Which model translates into a locale, and the client every translation script
 * uses (AGENTS.md "Translation model tier"; docs/guides/i18n-style-guide.md).
 *
 * Haiku is the default for every translate-*.mjs call. A locale moves to Sonnet
 * only when its Haiku output has been shown to be broken, and the evidence is
 * recorded here. Operator rulings 2026-10-17: Sonnet override for problem
 * languages, Haiku stays the default; always the LATEST Haiku and Sonnet. Retry
 * ladders stay on the locale's own model; never Opus.
 */
import { problems, stringsIn, systemAddendum } from './translate-quality.mjs';

export { NAME_POLICY } from './translate-quality.mjs';

export const DEFAULT_TRANSLATION_MODEL = 'claude-haiku-5-5'; // latest Haiku (5.5 since 2026-10)
export const PROBLEM_LOCALE_MODEL = 'claude-sonnet-5-5'; // latest Sonnet

export const SONNET_LOCALES = new Map([
  // 2026-10-17: Haiku's sr-Cyrl output for skip-entry had "ушће" (river mouth)
  // for entry, "обала" (shore) for coast and an English "the" mid-word; the
  // corpus carries Russian words, Hangul and Cyrillic/Latin mixed words
  // (detector pass: 11.6% of strings, against 2.7–4.6% elsewhere), and a graded
  // sample put 8 of 11 segments at "re-translate".
  ['sr-Cyrl', '2026-10-17 detector pass + graded segment sample'],
]);

/**
 * `editorial`: long editorial content (essays, programs, science articles, long UI
 * text). Operator ruling 2026-10-17, after graded samples showed Haiku failing 8 of
 * 12 locales (7–22% broken), worst on long editorial: editorial goes to Sonnet in
 * every language; short strings stay on Haiku except for SONNET_LOCALES.
 */
export function translationModel(locale, { editorial = false } = {}) {
  return editorial || SONNET_LOCALES.has(locale) ? PROBLEM_LOCALE_MODEL : DEFAULT_TRANSLATION_MODEL;
}

/** Is this field editorial? `file` as in the manifests (overlay path or "messages"). */
export function isEditorial(file, src = '') {
  if (file === 'messages') return src.length > 120; // long UI text: help, panels, goal prose
  // site stories are chaptered narrative with long captions: editorial by that ruling
  return /^(essays|programs|science|site-stories)\//.test(file);
}

// Models that reject a forced tool_choice (400 "type tool and any are not
// supported for this model", probed 2026-10-17 on claude-sonnet-5-5).
const NO_FORCED_TOOL = /^claude-sonnet-5/;
const QUALITY_RETRIES = 2;

/**
 * Wrap an Anthropic client for translation calls. Callers pass `_locale` next to
 * `model` (stripped before the request). Every call then:
 * - gets the shared rules appended to its system prompt (no shortening, target
 *   script only, NAME_POLICY, the locale's own rules);
 * - for models that reject a forced tool, sends tool_choice "auto" plus an
 *   instruction to answer through the tool;
 * - has every string in the tool answer checked with problems(); a failing answer
 *   is retried up to QUALITY_RETRIES times on the same model with the reasons.
 *   If it still fails, the last answer is returned and a warning printed, so the
 *   caller's own validation decides (nothing is silently "fixed").
 */
export function translationClient(client) {
  // Token usage per model, every API call counted (quality retries included), so a
  // run can be sized from a measured sample before the rest is launched.
  const usage = {};
  const count = (model, r) => {
    const u = (usage[model] ??= { calls: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });
    u.calls++;
    u.input += r?.usage?.input_tokens ?? 0;
    u.cacheWrite += r?.usage?.cache_creation_input_tokens ?? 0;
    u.cacheRead += r?.usage?.cache_read_input_tokens ?? 0;
    u.output += r?.usage?.output_tokens ?? 0;
  };
  return {
    usage,
    messages: {
      async create(params) {
        const { _locale: locale, ...rest } = params;
        const p = { ...rest };
        if (!locale) throw new Error('translationClient: pass _locale with every call');
        p.system = `${p.system ? `${p.system}\n\n` : ''}${systemAddendum(locale)}`;
        if (p.tool_choice?.type === 'tool' && NO_FORCED_TOOL.test(p.model)) {
          p.system += `\n\nAnswer ONLY by calling the ${p.tool_choice.name} tool.`;
          p.tool_choice = { type: 'auto' };
        }
        // The system prompt is the same on every call of a run (one per field): cache it,
        // so repeated calls read it at the cache price (operator 2026-10-17, after a
        // measured run where it was ~90% of the input tokens). Below the model's minimum
        // cacheable length the API just does not cache it.
        p.system = [{ type: 'text', text: p.system, cache_control: { type: 'ephemeral' } }];
        let r;
        let why = [];
        for (let attempt = 0; attempt <= QUALITY_RETRIES; attempt++) {
          const call = why.length
            ? {
                ...p,
                messages: [
                  ...p.messages,
                  ...(r ? [{ role: 'assistant', content: r.content }] : []),
                  ...(r?.content.some((c) => c.type === 'tool_use')
                    ? [
                        {
                          role: 'user',
                          content: r.content
                            .filter((c) => c.type === 'tool_use')
                            .map((c) => ({
                              type: 'tool_result',
                              tool_use_id: c.id,
                              is_error: true,
                              content: `Rejected: ${why.join('; ')}. Call the tool again with a corrected answer.`,
                            })),
                        },
                      ]
                    : [
                        {
                          role: 'user',
                          content: `Rejected: ${why.join('; ')}. Answer again, corrected.`,
                        },
                      ]),
                ],
              }
            : p;
          r = await client.messages.create(call);
          count(call.model, r);
          const answer = r.content
            .filter((c) => c.type === 'tool_use')
            .flatMap((c) => stringsIn(c.input));
          why = [
            ...new Set(answer.flatMap((s) => problems(locale, '', s)).filter((x) => x !== 'empty')),
          ];
          if (!why.length) return r;
        }
        console.warn(
          `  ⚠ ${locale}: answer still has problems after ${QUALITY_RETRIES} retries: ${why.join('; ')}`,
        );
        return r;
      },
    },
  };
}
