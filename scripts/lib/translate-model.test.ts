import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_TRANSLATION_MODEL,
  NAME_POLICY,
  PROBLEM_LOCALE_MODEL,
  SONNET_LOCALES,
  translationClient,
  translationModel,
} from './translate-model.mjs';

type Params = Record<string, unknown> & {
  system?: Array<{ type: string; text: string; cache_control?: unknown }>;
  tool_choice?: unknown;
  messages: unknown[];
};

function fakeClient(answers: string[]) {
  const calls: Params[] = [];
  let i = 0;
  return {
    calls,
    messages: {
      async create(p: Params) {
        calls.push(p);
        const translation = answers[Math.min(i++, answers.length - 1)];
        return {
          content: [
            { type: 'tool_use', id: `t${i}`, name: 'submit_translation', input: { translation } },
          ],
        };
      },
    },
  };
}
const sysText = (p: Params) => (p.system ?? []).map((b) => b.text).join('');
const call = (model: string, locale: string) => ({
  model,
  _locale: locale,
  max_tokens: 100,
  system: 'Base prompt.',
  tool_choice: { type: 'tool', name: 'submit_translation' },
  messages: [{ role: 'user', content: 'x' }],
});

describe('translationModel', () => {
  it('is the latest Haiku for every locale not on the problem list', () => {
    for (const loc of [
      'ar',
      'de',
      'es',
      'fr',
      'hi',
      'it',
      'ja',
      'ko',
      'nl',
      'pt-BR',
      'ru',
      'zh-CN',
    ])
      expect(translationModel(loc)).toBe(DEFAULT_TRANSLATION_MODEL);
    expect(DEFAULT_TRANSLATION_MODEL).toBe('claude-haiku-4-5');
  });

  it('is the latest Sonnet for sr-Cyrl, and never Opus', () => {
    expect(SONNET_LOCALES.has('sr-Cyrl')).toBe(true);
    expect(translationModel('sr-Cyrl')).toBe(PROBLEM_LOCALE_MODEL);
    expect(PROBLEM_LOCALE_MODEL).toBe('claude-sonnet-5-5');
  });
});

describe('translationClient', () => {
  it('appends the shared rules, the name policy and the locale rules', async () => {
    const c = fakeClient(['Капсула улази у атмосферу.']);
    await translationClient(c).messages.create(call(DEFAULT_TRANSLATION_MODEL, 'sr-Cyrl'));
    const sys = sysText(c.calls[0]);
    expect(sys.startsWith('Base prompt.')).toBe(true);
    expect(sys).toContain(NAME_POLICY);
    expect(sys).toContain('never shorten');
    expect(sys).toContain('EKAVIAN');
    expect(c.calls[0]).not.toHaveProperty('_locale');
  });

  it('marks the system prompt cacheable', async () => {
    const c = fakeClient(['Die Kapsel tritt in die Atmosphäre ein.']);
    await translationClient(c).messages.create(call(DEFAULT_TRANSLATION_MODEL, 'de'));
    expect(c.calls[0].system).toHaveLength(1);
    expect(c.calls[0].system![0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('keeps a forced tool for Haiku, relaxes it for Sonnet 5.5', async () => {
    const h = fakeClient(['ok text here']);
    await translationClient(h).messages.create(call('claude-haiku-4-5', 'de'));
    expect(h.calls[0].tool_choice).toEqual({ type: 'tool', name: 'submit_translation' });
    const s = fakeClient(['Капсула улази у атмосферу.']);
    await translationClient(s).messages.create(call('claude-sonnet-5-5', 'sr-Cyrl'));
    expect(s.calls[0].tool_choice).toEqual({ type: 'auto' });
    expect(sysText(s.calls[0])).toContain('Answer ONLY by calling the submit_translation tool.');
  });

  it('retries a failing answer with the reason, on the same model', async () => {
    const c = fakeClient(['Это је урађено.', 'То је урађено.']);
    const r = (await translationClient(c).messages.create(
      call(PROBLEM_LOCALE_MODEL, 'sr-Cyrl'),
    )) as {
      content: { input: { translation: string } }[];
    };
    expect(c.calls).toHaveLength(2);
    expect(c.calls[1].model).toBe(PROBLEM_LOCALE_MODEL);
    expect(JSON.stringify(c.calls[1].messages)).toContain('Russian/Ukrainian letters');
    expect(r.content[0].input.translation).toBe('То је урађено.');
  });

  it('refuses a call without _locale', async () => {
    const c = fakeClient(['x']);
    const { _locale, ...noLocale } = call(DEFAULT_TRANSLATION_MODEL, 'de');
    void _locale;
    await expect(translationClient(c).messages.create(noLocale as never)).rejects.toThrow(
      /_locale/,
    );
  });
});

describe('every translation script', () => {
  const dir = join(process.cwd(), 'scripts');
  const scripts = readdirSync(dir).filter((f) => /^(re)?translate-.*\.mjs$/.test(f));

  it('uses translationModel + translationClient and passes _locale on every call', () => {
    expect(scripts.length).toBeGreaterThan(5);
    for (const f of scripts) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).toContain('translationClient(new Anthropic');
      expect(src, f).not.toMatch(/model:\s*['"]claude-/);
      expect(src, f).not.toMatch(/claude-(opus|sonnet)/);
      const creates = (src.match(/messages\.create\(/g) || []).length;
      const locales = (src.match(/_locale:/g) || []).length;
      expect(locales, `${f}: ${creates} create() calls, ${locales} _locale`).toBe(creates);
    }
  });
});

describe('editorial routing (operator ruling 2026-10-17)', () => {
  it('sends editorial content to Sonnet in every locale, short strings to Haiku', async () => {
    const { isEditorial } = await import('./translate-model.mjs');
    expect(translationModel('de', { editorial: true })).toBe(PROBLEM_LOCALE_MODEL);
    expect(translationModel('de')).toBe(DEFAULT_TRANSLATION_MODEL);
    expect(translationModel('sr-Cyrl')).toBe(PROBLEM_LOCALE_MODEL);
    expect(isEditorial('essays/comms')).toBe(true);
    expect(isEditorial('science/orbits/keplers-laws')).toBe(true);
    expect(isEditorial('programs/apollo')).toBe(true);
    expect(isEditorial('fleet/launcher/antares')).toBe(false);
    expect(isEditorial('messages', 'Launch')).toBe(false);
    expect(isEditorial('messages', 'x'.repeat(200))).toBe(true);
  });
});
