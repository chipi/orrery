import { describe, it, expect } from 'vitest';
import * as m from '$lib/paraglide/messages';
import { overwriteGetLocale } from '$lib/paraglide/runtime';
import { loadLabMessages, t } from './t';

const cases: [string, string, (o: { locale: 'de' | 'ja' | 'ar' }) => string][] = [
  ['lab.ask.computing', 'lab_ask_computing', (o) => m.lab_ask_computing({}, o)],
  ['lab.ui.tle-age', 'lab_ui_tle_age', (o) => m.lab_ui_tle_age({ days: 5 }, o)],
  [
    'lab.canvas.promote-summary',
    'lab_canvas_promote_summary',
    (o) => m.lab_canvas_promote_summary({ total: 4, upstream: 2 }, o),
  ],
];
const params: Record<string, Record<string, number>> = {
  lab_ui_tle_age: { days: 5 },
  lab_canvas_promote_summary: { total: 4, upstream: 2 },
};

describe('lab t() matches the paraglide message functions', () => {
  for (const locale of ['de', 'ja', 'ar'] as const) {
    it(`${locale}`, async () => {
      overwriteGetLocale(() => locale);
      await loadLabMessages();
      for (const [key, id, ref] of cases) {
        expect(t(key, params[id]), key).toBe(ref({ locale }));
      }
    });
  }

  it('renders the raw key for an unknown message', async () => {
    await loadLabMessages();
    expect(t('lab.no.such-key')).toBe('lab.no.such-key');
  });
});
