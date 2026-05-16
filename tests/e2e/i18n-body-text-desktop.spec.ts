import { expect, test } from '@playwright/test';

/**
 * Desktop-only smoke confirming body-text translations actually render
 * (i.e. catch a Paraglide silent en-US fallback on a translated screen).
 *
 * Closes the coverage gap from v0.6.1's mobile-nav-overhaul fix: the
 * 14 i18n-*.spec.ts smoke specs migrated from fragile
 * `getByText('UNSER SONNENSYSTEM')` body assertions to
 * `html[lang]` attribute assertions so they'd pass on mobile (where the
 * desktop nav strip is `display: none`). That fix is correct — but it
 * removed the only assertion that proved Paraglide actually shipped the
 * translated bundle. `html[lang]` is set independently of the message
 * bundle (cf. `src/lib/locale.ts`), so a silent fallback to en-US strings
 * would still pass the smoke.
 *
 * This file restores body-text coverage by:
 *   1. Targeting a label rendered in **body content**, never inside
 *      `<nav>` — so the assertion doesn't break on mobile-collapse.
 *   2. Using `plan_empty_title` (the placeholder shown in the /plan
 *      results panel before the user picks a porkchop cell). It is
 *      idle-visible (no interaction needed) AND has a distinct
 *      translation in every Wave-1 locale — no false-positive pass if
 *      the en-US bundle leaks through. (NB: `plan_label_destination`
 *      and `plan_label_mission_type` collide with English in fr/nl;
 *      `plan_label_departure` is only visible AFTER a porkchop click.)
 *   3. Skipping on mobile-chromium. Mobile coverage already exists in
 *      the cross-viewport `i18n-*.spec.ts` smokes via `html[lang]`; this
 *      file is a desktop-only belt-and-braces check on top.
 *
 * Covered locales: de / es / fr / it / nl / pt-BR — the six EU-Latin
 * locales that hit the v0.6.0 → v0.6.1 mobile-nav regression. Wave-2/3
 * locales (CJK, RTL, Cyrillic) are already covered by the cross-viewport
 * specs' `html[lang]` + chip + URL assertions; adding them here would
 * be redundant.
 *
 * See:
 *   - AGENTS.md §"Spec-writing patterns — viewport-aware, locale-resilient"
 *   - v0.6.1 commit 81ab4d7b1 (test(e2e): replace fragile body-text checks…)
 *   - GH issue #131
 */

// Distinctive substrings from the `plan_empty_title` translation in
// each locale. Substring (not exact) match so the assertion is robust
// to future copy edits that keep the headline intact.
const LOCALES = [
  { code: 'de', expected: 'STARTFENSTER WÄHLEN' },
  { code: 'es', expected: 'ELIGE UNA VENTANA DE LANZAMIENTO' },
  { code: 'fr', expected: 'CHOISIR UNE FENÊTRE DE LANCEMENT' },
  { code: 'it', expected: 'SCEGLI UNA FINESTRA DI LANCIO' },
  { code: 'nl', expected: 'KIES EEN LANCEERVENSTER' },
  { code: 'pt-BR', expected: 'ESCOLHA UMA JANELA DE LANÇAMENTO' },
] as const;

test.describe('i18n body-text translations actually render (desktop-only)', () => {
  // `plan_label_departure` is rendered in the /plan HUD body panel, not
  // in the nav strip, so it survives both viewports — but we restrict
  // this suite to desktop because mobile coverage is the cross-viewport
  // `html[lang]` assertion. Two separate concerns, two separate suites.
  test.skip(
    ({ viewport }) => (viewport?.width ?? 1280) < 700,
    'desktop-only body-text coverage; mobile uses html[lang] cross-viewport smokes',
  );

  for (const { code, expected } of LOCALES) {
    test(`/plan?lang=${code} renders the ${code.toUpperCase()} plan_empty_title`, async ({
      page,
    }) => {
      await page.goto(`/plan?lang=${code}`, { waitUntil: 'networkidle' });

      // Sanity: locale attribute is the authoritative signal that
      // Paraglide swapped bundles. Without this passing, the body-text
      // assertion below could only fail (since the bundle didn't load).
      await expect(page.locator('html')).toHaveAttribute('lang', code);

      // Body-text proof: the locale-specific plan_empty_title is visible
      // in the results panel at idle. `getByText` scopes to text nodes;
      // the headline isn't repeated in the nav, so we don't have to
      // worry about the nav-link false-positive that bit the v0.6.0
      // specs.
      await expect(page.getByText(expected, { exact: false }).first()).toBeVisible({
        timeout: 10_000,
      });
    });
  }
});
